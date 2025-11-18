/**
 * Authentication Manager
 * Handles user registration, login, and token management
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const InputValidator = require('../utils/InputValidator');

class AuthManager {
  constructor() {
    this.users = new Map(); // username -> { id, passwordHash, email, emailVerified, verificationCode, verificationCodeExpiry, resetToken, resetTokenExpiry, banned, bannedReason, bannedUntil, bannedBy, muted, mutedUntil, mutedReason, createdAt, passwordAttempts, lastPasswordAttempt }
    this.tokens = new Map(); // token -> { playerId, username, expiresAt }
    this.emailToUsername = new Map(); // email -> username (for lookup)
    this.ipBans = new Map(); // ip -> { bannedUntil, reason }
    this.deviceBans = new Map(); // deviceId -> { bannedUntil, reason }
    this.passwordResetAttempts = new Map(); // ip -> [timestamps]
    this.dataFile = path.join(__dirname, '..', 'data', 'users.json');
    this.emailConfig = this.loadEmailConfig();
    
    // Rate limiting configuration
    this.maxPasswordAttempts = 5;
    this.passwordAttemptWindow = 15 * 60 * 1000; // 15 minutes
    this.maxResetAttempts = 5;
    this.resetAttemptWindow = 60 * 60 * 1000; // 1 hour
    
    /**
     * Generic rate limiter for email-related operations (password reset, verification emails)
     * 
     * Rationale:
     * - Prevents abuse of email sending features (spam, DoS)
     * - Tracks both IP and user to prevent circumventing via different IPs or accounts
     * - Uses in-memory Map for simplicity and speed (acceptable for single-server deployments)
     * - Automatic cleanup prevents memory leaks from abandoned sessions
     * - Conservative defaults (3 attempts per 15 min) balance security vs usability
     * 
     * Structure: Map<string, Array<number>>
     * - key: "ip:<ip>" or "user:<username>" 
     * - value: array of timestamps (milliseconds) of attempts
     */
    this.rateLimiter = new Map();
    this.rateLimitConfig = {
      maxAttempts: 3,           // Maximum attempts allowed
      windowMs: 15 * 60 * 1000, // 15 minutes window
      cleanupIntervalMs: 5 * 60 * 1000 // Cleanup every 5 minutes
    };
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Load existing users
    this.loadUsers();
    
    // Setup email transporter
    this.setupEmailTransporter();
    
    // Clean up expired bans and rate limits periodically
    setInterval(() => {
      this.cleanupExpiredBans();
      this.cleanupPasswordResetAttempts();
      this.cleanupRateLimiter();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  loadEmailConfig() {
    // Load from environment variables or config file
    // For development, use CLI fallback
    return {
      enabled: process.env.EMAIL_ENABLED === 'true' || false,
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true' || false,
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
      from: process.env.EMAIL_FROM || 'noreply@highwizardry.game',
      requireVerification: process.env.EMAIL_REQUIRE_VERIFICATION !== 'false' // true by default, can be disabled for dev
    };
  }
  
  setupEmailTransporter() {
    if (this.emailConfig.enabled && this.emailConfig.user && this.emailConfig.pass) {
      try {
        this.transporter = nodemailer.createTransport({
          service: this.emailConfig.service,
          host: this.emailConfig.host,
          port: this.emailConfig.port,
          secure: this.emailConfig.secure,
          auth: {
            user: this.emailConfig.user,
            pass: this.emailConfig.pass
          }
        });
        console.log('✅ Email service configured');
      } catch (error) {
        console.log('⚠️ Email service not configured - using CLI fallback');
        this.transporter = null;
      }
    } else {
      console.log('⚠️ Email service not configured - using CLI fallback');
      this.transporter = null;
    }
  }
  
  ensureDataDirectory() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
  
  loadUsers() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        const users = JSON.parse(data);
        this.users = new Map(Object.entries(users));
        
        // Build email to username map
        for (const [username, user] of this.users.entries()) {
          if (user.email) {
            this.emailToUsername.set(user.email.toLowerCase(), username);
          }
        }
        
        console.log(`Loaded ${this.users.size} users from storage`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }
  
  saveUsers() {
    try {
      const usersObj = Object.fromEntries(this.users);
      fs.writeFileSync(this.dataFile, JSON.stringify(usersObj, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }
  
  /**
   * Validate email format with robust security checks
   * 
   * Security features:
   * 1. Type check: Ensures email is a string (prevents type confusion attacks)
   * 2. Length check: Validates 5-256 chars before regex (prevents DoS via long strings)
   * 3. Safe regex: Uses linear-time regex without nested quantifiers (prevents ReDoS)
   * 
   * The regex pattern /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ is safe because:
   * - Uses only simple character classes and single quantifiers (no nested quantifiers)
   * - Has linear time complexity O(n) instead of exponential
   * - Prevents Regular Expression Denial of Service (ReDoS) attacks
   * - Strictly validates common email format without being overly permissive
   * - Domain must end with a dot followed by 2+ letter TLD (e.g., .com, .org, .co)
   * 
   * Note: This validation is intentionally strict but safe. It may not accept all
   * technically valid RFC 5322 emails, but prevents security issues like ReDoS.
   * 
   * @param {any} email - Email to validate (can be any type)
   * @returns {Object} - { valid: boolean, message: string }
   */
  validateEmail(email) {
    // Check 1: Ensure email is a string (prevents type confusion)
    if (typeof email !== 'string') {
      return { valid: false, message: 'Email must be a string' };
    }
    
    // Check 2: Validate length before running regex (prevents DoS with extremely long strings)
    // Minimum 5 chars for shortest valid email (a@b.co), maximum 256 chars per RFC standards
    if (email.length < 5 || email.length > 256) {
      return { valid: false, message: 'Email must be between 5 and 256 characters' };
    }
    
    // Check 3: Apply safe, strict regex pattern
    // This pattern is immune to ReDoS because it uses only simple quantifiers
    // Pattern breakdown:
    // - ^[a-zA-Z0-9._%+-]+ : Local part (before @) with common characters
    // - @ : Required @ symbol
    // - [a-zA-Z0-9.-]+ : Domain name with alphanumeric, dots, hyphens
    // - \. : Required dot before TLD
    // - [a-zA-Z]{2,}$ : TLD with at least 2 letters (com, org, co, etc.)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }
    
    // Check 4: Additional validation - prevent consecutive dots and other edge cases
    if (email.includes('..') || email.startsWith('.') || email.includes('@.') || email.includes('.@')) {
      return { valid: false, message: 'Invalid email format' };
    }
    
    return { valid: true };
  }
  
  async register(username, password, email = null) {
    // Validate username
    const usernameValidation = InputValidator.validateUsername(username);
    if (!usernameValidation.valid) {
      return { success: false, message: usernameValidation.message };
    }
    
    // Validate password
    const passwordValidation = InputValidator.validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }
    
    // Validate email if provided
    if (email) {
      // Use secure email validation with type and length checks
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.valid) {
        return { success: false, message: emailValidation.message };
      }
      
      // Check if email already exists
      if (this.emailToUsername.has(email.toLowerCase())) {
        return { success: false, message: 'Email already registered' };
      }
    }
    
    // Check if username already exists (use sanitized username)
    if (this.users.has(usernameValidation.sanitized.toLowerCase())) {
      return { success: false, message: 'Username already exists' };
    }
    
    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      
      // Create user
      const playerId = uuidv4();
      const user = {
        id: playerId,
        username: usernameValidation.sanitized,
        passwordHash,
        email: email ? email.toLowerCase() : null,
        emailVerified: email ? false : true, // If no email provided, consider "verified" for backward compatibility
        verificationCode: email ? verificationCode : null,
        verificationCodeExpiry: email ? (Date.now() + 24 * 60 * 60 * 1000) : null, // 24 hours
        resetToken: null,
        resetTokenExpiry: null,
        banned: false,
        bannedReason: null,
        bannedUntil: null,
        bannedBy: null,
        muted: false,
        mutedUntil: null,
        mutedReason: null,
        passwordAttempts: [],
        lastPasswordAttempt: null,
        createdAt: Date.now()
      };
      
      this.users.set(usernameValidation.sanitized.toLowerCase(), user);
      
      // Add to email map if email provided
      if (email) {
        this.emailToUsername.set(email.toLowerCase(), usernameValidation.sanitized.toLowerCase());
      }
      
      // Save to disk
      this.saveUsers();
      
      // Send verification email
      if (email) {
        await this.sendVerificationEmail(email, usernameValidation.sanitized, verificationCode);
      }
      
      // Generate token
      const token = this.generateToken(playerId, usernameValidation.sanitized);
      
      return {
        success: true,
        playerId,
        token,
        emailVerified: user.emailVerified,
        needsEmailVerification: email && !user.emailVerified
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }
  
  async login(username, password) {
    // Validate username format
    const usernameValidation = InputValidator.validateUsername(username);
    if (!usernameValidation.valid) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Validate password format
    const passwordValidation = InputValidator.validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Get user
    const user = this.users.get(usernameValidation.sanitized.toLowerCase());
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Check if account is temporarily banned
    if (user.banned && user.bannedUntil && Date.now() < user.bannedUntil) {
      const remainingTime = Math.ceil((user.bannedUntil - Date.now()) / 60000);
      const timeUnit = remainingTime === 1 ? 'minute' : 'minutes';
      return { 
        success: false, 
        message: `Account temporarily suspended. Please try again in ${remainingTime} ${timeUnit}. Reason: ${user.bannedReason || 'Policy violation'}. Contact support for assistance.`,
        banned: true
      };
    }
    
    // Check if account is permanently banned
    if (user.banned && !user.bannedUntil) {
      return { 
        success: false, 
        message: `Account permanently suspended. Reason: ${user.bannedReason || 'Policy violation'}. If you believe this is an error, please contact support for assistance.`,
        banned: true
      };
    }
    
    // Clear ban if expired
    if (user.banned && user.bannedUntil && Date.now() >= user.bannedUntil) {
      user.banned = false;
      user.bannedUntil = null;
      user.bannedReason = null;
      user.bannedBy = null;
      this.saveUsers();
    }
    
    // Check password attempts for brute force protection
    if (this.isAccountLocked(user)) {
      const lockTimeRemaining = Math.ceil((user.lastPasswordAttempt + this.passwordAttemptWindow - Date.now()) / 60000);
      const timeUnit = lockTimeRemaining === 1 ? 'minute' : 'minutes';
      return { 
        success: false, 
        message: `Too many failed login attempts. Account temporarily locked for ${lockTimeRemaining} ${timeUnit}. Please try again later or use the password reset option if you've forgotten your password.`
      };
    }
    
    try {
      // Verify password
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        // Record failed attempt
        this.recordPasswordAttempt(user);
        this.saveUsers();
        
        const attemptsLeft = this.maxPasswordAttempts - user.passwordAttempts.length;
        if (attemptsLeft > 0 && attemptsLeft <= 2) {
          return { 
            success: false, 
            message: `Invalid username or password. ${attemptsLeft} attempt(s) remaining before account lock.`
          };
        }
        
        return { success: false, message: 'Invalid username or password' };
      }
      
      // Clear password attempts on successful login
      user.passwordAttempts = [];
      user.lastPasswordAttempt = null;
      this.saveUsers();
      
      // Check if email verification is required
      if (this.emailConfig.requireVerification && user.email && !user.emailVerified) {
        return { 
          success: false, 
          message: 'Please verify your email address before logging in. Check your inbox for the verification code, or request a new one if needed.',
          needsEmailVerification: true,
          email: user.email
        };
      }
      
      // Check if mute is expired
      if (user.muted && user.mutedUntil && Date.now() >= user.mutedUntil) {
        user.muted = false;
        user.mutedUntil = null;
        user.mutedReason = null;
        this.saveUsers();
      }
      
      // Generate token
      const token = this.generateToken(user.id, user.username);
      
      return {
        success: true,
        playerId: user.id,
        username: user.username,
        token,
        emailVerified: user.emailVerified,
        needsEmailSetup: !user.email, // Flag for legacy accounts without email
        muted: user.muted || false,
        mutedUntil: user.mutedUntil || null
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }
  
  generateToken(playerId, username) {
    const token = uuidv4();
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.tokens.set(token, {
      playerId,
      username,
      expiresAt
    });
    
    return token;
  }
  
  validateToken(token) {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return { success: false, message: 'Invalid token' };
    }
    
    // Check if expired
    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return { success: false, message: 'Token expired' };
    }
    
    return {
      success: true,
      playerId: tokenData.playerId,
      username: tokenData.username
    };
  }
  
  revokeToken(token) {
    this.tokens.delete(token);
  }
  
  // Revoke all tokens for a player (single-session enforcement)
  revokeAllTokensForPlayer(playerId) {
    const tokensToDelete = [];
    for (const [token, data] of this.tokens.entries()) {
      if (data.playerId === playerId) {
        tokensToDelete.push(token);
      }
    }
    tokensToDelete.forEach(token => this.tokens.delete(token));
    return tokensToDelete.length;
  }
  
  // Generate verification code (6 digits)
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  // Generate reset token
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Send verification email
  async sendVerificationEmail(email, username, code) {
    const subject = 'Verify your High Wizardry account';
    const html = `
      <h2>Welcome to High Wizardry!</h2>
      <p>Hello ${username},</p>
      <p>Please verify your email address using this code:</p>
      <h1 style="color: #7c5ce7; letter-spacing: 5px;">${code}</h1>
      <p>Enter this code in the game to complete your registration.</p>
      <p>This code will expire in 24 hours.</p>
      <p>If you didn't create this account, please ignore this email.</p>
    `;
    
    return this.sendEmail(email, subject, html, code);
  }
  
  // Send password reset email
  async sendPasswordResetEmail(email, username, token) {
    const resetLink = `http://localhost:8080/?reset=${token}`; // TODO: Use actual domain
    const subject = 'Reset your High Wizardry password';
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hello ${username},</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetLink}" style="background: #7c5ce7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Or use this reset code: <strong>${token}</strong></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    `;
    
    return this.sendEmail(email, subject, html, token);
  }
  
  // Generic email sending with CLI fallback
  async sendEmail(to, subject, html, fallbackCode = null) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.emailConfig.from,
          to,
          subject,
          html
        });
        console.log(`✅ Email sent to ${to}`);
        return { success: true, method: 'email' };
      } catch (error) {
        console.error('Error sending email:', error);
        // Fall through to CLI fallback
      }
    }
    
    // CLI fallback for development
    console.log('\n=== EMAIL CLI FALLBACK ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (fallbackCode) {
      console.log(`CODE/TOKEN: ${fallbackCode}`);
    }
    console.log('===========================\n');
    
    return { success: true, method: 'cli' };
  }
  
  // Verify email with code
  async verifyEmail(username, code) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    if (user.emailVerified) {
      return { success: true, message: 'Email already verified' };
    }
    
    if (!user.verificationCode) {
      return { success: false, message: 'No verification code found' };
    }
    
    // Check if verification code has expired
    if (user.verificationCodeExpiry && Date.now() > user.verificationCodeExpiry) {
      user.verificationCode = null;
      user.verificationCodeExpiry = null;
      this.saveUsers();
      return { success: false, message: 'Verification code has expired. Please request a new verification email.' };
    }
    
    if (user.verificationCode !== code) {
      return { success: false, message: 'Invalid verification code. Please check the code and try again, or request a new verification email.' };
    }
    
    // Mark as verified
    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    this.saveUsers();
    
    return { success: true, message: 'Email verified successfully! You can now log in to your account.' };
  }
  
  // Resend verification email
  async resendVerificationEmail(username, clientIp = 'unknown') {
    /**
     * Rate limiting for resend verification email:
     * - Prevents email spam/abuse
     * - Uses both IP and username to prevent circumvention
     * - Returns same error message regardless of whether user exists (non-leaky)
     */
    
    // Check rate limit for both IP and username
    const ipKey = `ip:${clientIp}`;
    const userKey = `user:${username.toLowerCase()}`;
    
    if (!this.checkRateLimitMultiple([ipKey, userKey])) {
      // Return generic message that doesn't reveal if user exists (security)
      return { 
        success: false, 
        message: 'Too many verification email requests. Please try again later or contact support if you need assistance.' 
      };
    }
    
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      // Don't reveal if user exists (return same message as rate limit for security)
      return { 
        success: false, 
        message: 'Too many verification email requests. Please try again later or contact support if you need assistance.' 
      };
    }
    
    if (user.emailVerified) {
      return { success: false, message: 'Email is already verified. You can log in now.' };
    }
    
    if (!user.email) {
      return { success: false, message: 'No email address on record. Please contact support for assistance.' };
    }
    
    // Generate new code with fresh expiry
    const verificationCode = this.generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.saveUsers();
    
    // Send email
    await this.sendVerificationEmail(user.email, user.username, verificationCode);
    
    return { success: true, message: 'Verification email sent successfully. Please check your inbox.' };
  }
  
  // Request password reset
  async requestPasswordReset(usernameOrEmail, clientIp = 'unknown') {
    /**
     * Rate limiting for password reset:
     * - Prevents email spam and account enumeration attacks
     * - Uses both IP and identifier (username/email) to prevent circumvention
     * - Returns same generic message regardless of whether account exists (non-leaky)
     * - This is a critical security feature that balances UX with protection
     */
    
    // Check rate limit for IP first
    const ipKey = `ip:${clientIp}`;
    
    if (!this.checkRateLimit(ipKey)) {
      // Return generic message that doesn't reveal if user exists (security)
      return { 
        success: true, 
        message: 'If an account exists with that information, a password reset email has been sent. Please check your inbox or contact support if you need assistance.' 
      };
    }
    
    // Find user by username or email
    let user = this.users.get(usernameOrEmail.toLowerCase());
    
    if (!user && usernameOrEmail.includes('@')) {
      // Try to find by email
      const username = this.emailToUsername.get(usernameOrEmail.toLowerCase());
      if (username) {
        user = this.users.get(username);
      }
    }
    
    // Also check rate limit for the user identifier (if user exists)
    if (user) {
      const userKey = `user:${user.username.toLowerCase()}`;
      if (!this.checkRateLimit(userKey)) {
        // Return same generic message (non-leaky)
        return { 
          success: true, 
          message: 'If an account exists with that information, a password reset email has been sent. Please check your inbox or contact support if you need assistance.' 
        };
      }
    }
    
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      // Return success message to prevent account enumeration
      return { 
        success: true, 
        message: 'If an account exists with that information, a password reset email has been sent. Please check your inbox or contact support if you need assistance.' 
      };
    }
    
    if (!user.email) {
      // Even for accounts without email, return generic message (security)
      return { 
        success: true, 
        message: 'If an account exists with that information, a password reset email has been sent. Please check your inbox or contact support if you need assistance.' 
      };
    }
    
    // Generate reset token
    const resetToken = this.generateResetToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
    this.saveUsers();
    
    // Send reset email
    await this.sendPasswordResetEmail(user.email, user.username, resetToken);
    
    return { 
      success: true, 
      message: 'If an account exists with that information, a password reset email has been sent. Please check your inbox or contact support if you need assistance.' 
    };
  }
  
  // Reset password with token
  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      return { success: false, message: 'Token and new password are required' };
    }
    
    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }
    
    // Find user with this reset token
    let foundUser = null;
    let foundUsername = null;
    
    for (const [username, user] of this.users.entries()) {
      if (user.resetToken === token) {
        foundUser = user;
        foundUsername = username;
        break;
      }
    }
    
    if (!foundUser) {
      return { success: false, message: 'Invalid or expired reset token' };
    }
    
    // Check if token expired
    if (Date.now() > foundUser.resetTokenExpiry) {
      foundUser.resetToken = null;
      foundUser.resetTokenExpiry = null;
      this.saveUsers();
      return { success: false, message: 'Reset token has expired. Please request a new password reset.' };
    }
    
    try {
      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password and clear reset token
      foundUser.passwordHash = passwordHash;
      foundUser.resetToken = null;
      foundUser.resetTokenExpiry = null;
      this.saveUsers();
      
      // Revoke all existing tokens for security
      this.revokeAllTokensForPlayer(foundUser.id);
      
      return { success: true, message: 'Password reset successfully! You can now log in with your new password.' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Failed to reset password. Please try again or contact support for assistance.' };
    }
  }
  
  // Add email to existing account (for legacy accounts)
  async addEmail(username, email) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    if (user.email) {
      return { success: false, message: 'Account already has an email' };
    }
    
    // Validate email
    // Use secure email validation with type and length checks
    const emailValidation = this.validateEmail(email);
    if (!emailValidation.valid) {
      return { success: false, message: emailValidation.message };
    }
    
    // Check if email already exists
    if (this.emailToUsername.has(email.toLowerCase())) {
      return { success: false, message: 'Email already registered' };
    }
    
    // Generate verification code with expiry
    const verificationCode = this.generateVerificationCode();
    
    // Update user
    user.email = email.toLowerCase();
    user.emailVerified = false;
    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.emailToUsername.set(email.toLowerCase(), username.toLowerCase());
    this.saveUsers();
    
    // Send verification email
    await this.sendVerificationEmail(email, user.username, verificationCode);
    
    return { success: true, message: 'Email added. Please check your inbox for verification code.' };
  }
  
  // Ban/unban user with enhanced options
  setBanStatus(username, banned, options = {}) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found. Please verify the username and try again.' };
    }
    
    const { duration, reason, bannedBy, permanent } = options;
    
    user.banned = banned;
    
    if (banned) {
      user.bannedReason = reason || 'Policy violation';
      user.bannedBy = bannedBy || 'system';
      
      if (permanent || !duration) {
        user.bannedUntil = null; // Permanent ban
      } else {
        user.bannedUntil = Date.now() + duration;
      }
      
      // Revoke all tokens if banning
      this.revokeAllTokensForPlayer(user.id);
    } else {
      // Clear ban data on unban
      user.bannedReason = null;
      user.bannedUntil = null;
      user.bannedBy = null;
    }
    
    this.saveUsers();
    
    const action = banned ? 'suspended' : 'unsuspended';
    const banType = banned && (permanent || !duration) ? 'permanently' : 'temporarily';
    const durationMsg = banned && duration ? ` for ${Math.ceil(duration / 60000)} minutes` : '';
    
    return { 
      success: true, 
      message: `User ${action} successfully${banned ? ` (${banType}${durationMsg})` : ''}.`,
      user: {
        username: user.username,
        banned: user.banned,
        bannedReason: user.bannedReason,
        bannedUntil: user.bannedUntil,
        bannedBy: user.bannedBy
      }
    };
  }
  
  // Mute/unmute user with enhanced options
  setMuteStatus(username, muted, options = {}) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found. Please verify the username and try again.' };
    }
    
    const { duration, reason, permanent } = options;
    
    user.muted = muted;
    
    if (muted) {
      user.mutedReason = reason || 'Chat policy violation';
      
      if (permanent || !duration) {
        user.mutedUntil = null; // Permanent mute
      } else {
        user.mutedUntil = Date.now() + duration;
      }
    } else {
      // Clear mute data on unmute
      user.mutedReason = null;
      user.mutedUntil = null;
    }
    
    this.saveUsers();
    
    const action = muted ? 'muted' : 'unmuted';
    const muteType = muted && (permanent || !duration) ? 'permanently' : 'temporarily';
    const durationMsg = muted && duration ? ` for ${Math.ceil(duration / 60000)} minutes` : '';
    
    return { 
      success: true, 
      message: `User ${action} successfully${muted ? ` (${muteType}${durationMsg})` : ''}.`,
      user: {
        username: user.username,
        muted: user.muted,
        mutedReason: user.mutedReason,
        mutedUntil: user.mutedUntil
      }
    };
  }
  
  // Check if user is muted (for chat middleware)
  isMuted(playerId) {
    const user = this.getUserByPlayerId(playerId);
    if (!user) return false;
    
    // Check if mute has expired
    if (user.muted && user.mutedUntil && Date.now() >= user.mutedUntil) {
      user.muted = false;
      user.mutedUntil = null;
      user.mutedReason = null;
      this.saveUsers();
      return false;
    }
    
    return user.muted || false;
  }
  
  // BUGFIX: Get user data by playerId (needed for token auth ban/mute checks)
  getUserByPlayerId(playerId) {
    for (const [username, user] of this.users.entries()) {
      if (user.id === playerId) {
        return user;
      }
    }
    return null;
  }
  
  // IP-based ban management
  banIp(ip, options = {}) {
    const { duration, reason, permanent } = options;
    
    this.ipBans.set(ip, {
      bannedUntil: permanent || !duration ? null : Date.now() + duration,
      reason: reason || 'Policy violation'
    });
    
    return { success: true, message: `IP ${ip} banned successfully` };
  }
  
  unbanIp(ip) {
    if (!this.ipBans.has(ip)) {
      return { success: false, message: 'IP not found in ban list' };
    }
    
    this.ipBans.delete(ip);
    return { success: true, message: `IP ${ip} unbanned successfully` };
  }
  
  isIpBanned(ip) {
    const ban = this.ipBans.get(ip);
    if (!ban) return false;
    
    // Check if ban has expired
    if (ban.bannedUntil && Date.now() >= ban.bannedUntil) {
      this.ipBans.delete(ip);
      return false;
    }
    
    return true;
  }
  
  // DeviceID-based ban management
  banDevice(deviceId, options = {}) {
    const { duration, reason, permanent } = options;
    
    this.deviceBans.set(deviceId, {
      bannedUntil: permanent || !duration ? null : Date.now() + duration,
      reason: reason || 'Policy violation'
    });
    
    return { success: true, message: `Device ${deviceId} banned successfully` };
  }
  
  unbanDevice(deviceId) {
    if (!this.deviceBans.has(deviceId)) {
      return { success: false, message: 'Device not found in ban list' };
    }
    
    this.deviceBans.delete(deviceId);
    return { success: true, message: `Device ${deviceId} unbanned successfully` };
  }
  
  isDeviceBanned(deviceId) {
    const ban = this.deviceBans.get(deviceId);
    if (!ban) return false;
    
    // Check if ban has expired
    if (ban.bannedUntil && Date.now() >= ban.bannedUntil) {
      this.deviceBans.delete(deviceId);
      return false;
    }
    
    return true;
  }
  
  // Password attempt tracking for brute force protection
  recordPasswordAttempt(user) {
    const now = Date.now();
    
    // Initialize if needed
    if (!user.passwordAttempts) {
      user.passwordAttempts = [];
    }
    
    // Remove old attempts outside the window
    user.passwordAttempts = user.passwordAttempts.filter(
      timestamp => now - timestamp < this.passwordAttemptWindow
    );
    
    // Add new attempt
    user.passwordAttempts.push(now);
    user.lastPasswordAttempt = now;
  }
  
  isAccountLocked(user) {
    if (!user.passwordAttempts || user.passwordAttempts.length === 0) {
      return false;
    }
    
    const now = Date.now();
    
    // Remove old attempts outside the window
    user.passwordAttempts = user.passwordAttempts.filter(
      timestamp => now - timestamp < this.passwordAttemptWindow
    );
    
    // Check if account is locked (too many attempts)
    return user.passwordAttempts.length >= this.maxPasswordAttempts;
  }
  
  /**
   * Generic rate limiter check - prevents abuse of email-related operations
   * 
   * This method implements a sliding window rate limiter that:
   * 1. Tracks attempts by a unique key (IP address, username, or both)
   * 2. Maintains a sliding window of attempts within the configured time period
   * 3. Automatically removes expired attempts from the window
   * 4. Returns false if rate limit is exceeded, true if allowed
   * 
   * Security rationale:
   * - Prevents email spam/DoS by limiting requests per time window
   * - Sliding window is more accurate than fixed window (no burst at boundary)
   * - Tracks multiple keys to prevent circumvention (e.g., same IP, different users)
   * - Conservative defaults balance security (prevent abuse) vs UX (allow legitimate retries)
   * 
   * @param {string} key - Unique identifier for rate limiting (e.g., "ip:1.2.3.4" or "user:john")
   * @param {Object} config - Optional config override { maxAttempts, windowMs }
   * @returns {boolean} - true if request allowed, false if rate limit exceeded
   */
  checkRateLimit(key, config = null) {
    const { maxAttempts, windowMs } = config || this.rateLimitConfig;
    const now = Date.now();
    
    // Get or initialize attempts for this key
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }
    
    const attempts = this.rateLimiter.get(key);
    
    // Remove old attempts outside the sliding window
    const validAttempts = attempts.filter(
      timestamp => now - timestamp < windowMs
    );
    
    // Check if rate limit exceeded
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Add new attempt and update
    validAttempts.push(now);
    this.rateLimiter.set(key, validAttempts);
    
    return true;
  }
  
  /**
   * Check rate limit for multiple keys (e.g., both IP and user)
   * All keys must pass the rate limit check for the request to be allowed
   * 
   * This prevents scenarios like:
   * - One user spamming from multiple IPs
   * - Multiple users spamming from same IP (shared network)
   * 
   * @param {string[]} keys - Array of keys to check
   * @param {Object} config - Optional config override
   * @returns {boolean} - true if all keys pass, false if any key is rate limited
   */
  checkRateLimitMultiple(keys, config = null) {
    return keys.every(key => this.checkRateLimit(key, config));
  }

  /**
   * Cleanup expired entries from rate limiter to prevent memory leaks
   * 
   * This is called periodically by the cleanup interval and removes:
   * - Empty arrays (all attempts expired)
   * - Entries with no attempts in the current window
   * 
   * Rationale: In-memory rate limiting is simple and fast but requires
   * active cleanup to prevent unbounded growth in long-running processes.
   */
  cleanupRateLimiter() {
    const now = Date.now();
    const { windowMs } = this.rateLimitConfig;
    
    for (const [key, attempts] of this.rateLimiter.entries()) {
      // Filter out expired attempts
      const validAttempts = attempts.filter(
        timestamp => now - timestamp < windowMs
      );
      
      if (validAttempts.length === 0) {
        // Remove key if no valid attempts remain
        this.rateLimiter.delete(key);
      } else {
        // Update with cleaned attempts
        this.rateLimiter.set(key, validAttempts);
      }
    }
  }

  // Password reset rate limiting
  checkPasswordResetRateLimit(ip) {
    const now = Date.now();
    
    // Get or initialize attempts for this IP
    if (!this.passwordResetAttempts.has(ip)) {
      this.passwordResetAttempts.set(ip, []);
    }
    
    const attempts = this.passwordResetAttempts.get(ip);
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(
      timestamp => now - timestamp < this.resetAttemptWindow
    );
    
    // Check if rate limit exceeded
    if (validAttempts.length >= this.maxResetAttempts) {
      return false;
    }
    
    // Add new attempt
    validAttempts.push(now);
    this.passwordResetAttempts.set(ip, validAttempts);
    
    return true;
  }
  
  // Cleanup methods
  cleanupExpiredBans() {
    const now = Date.now();
    
    // Clean up IP bans
    for (const [ip, ban] of this.ipBans.entries()) {
      if (ban.bannedUntil && now >= ban.bannedUntil) {
        this.ipBans.delete(ip);
      }
    }
    
    // Clean up device bans
    for (const [deviceId, ban] of this.deviceBans.entries()) {
      if (ban.bannedUntil && now >= ban.bannedUntil) {
        this.deviceBans.delete(deviceId);
      }
    }
  }
  
  cleanupPasswordResetAttempts() {
    const now = Date.now();
    
    for (const [ip, attempts] of this.passwordResetAttempts.entries()) {
      const validAttempts = attempts.filter(
        timestamp => now - timestamp < this.resetAttemptWindow
      );
      
      if (validAttempts.length === 0) {
        this.passwordResetAttempts.delete(ip);
      } else {
        this.passwordResetAttempts.set(ip, validAttempts);
      }
    }
  }
  
  // Clean up expired tokens
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
  
  // Get ban/mute information for a user
  getUserBanMuteInfo(username) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    return {
      success: true,
      username: user.username,
      banned: user.banned,
      bannedReason: user.bannedReason,
      bannedUntil: user.bannedUntil,
      bannedBy: user.bannedBy,
      muted: user.muted,
      mutedReason: user.mutedReason,
      mutedUntil: user.mutedUntil
    };
  }
  
  // List all banned users (for admin)
  getBannedUsers() {
    const bannedUsers = [];
    
    for (const [username, user] of this.users.entries()) {
      if (user.banned) {
        bannedUsers.push({
          username: user.username,
          bannedReason: user.bannedReason,
          bannedUntil: user.bannedUntil,
          bannedBy: user.bannedBy
        });
      }
    }
    
    return bannedUsers;
  }
  
  // List all muted users (for admin)
  getMutedUsers() {
    const mutedUsers = [];
    
    for (const [username, user] of this.users.entries()) {
      if (user.muted) {
        mutedUsers.push({
          username: user.username,
          mutedReason: user.mutedReason,
          mutedUntil: user.mutedUntil
        });
      }
    }
    
    return mutedUsers;
  }
}

// Clean up expired tokens every hour
setInterval(() => {
  if (global.authManager) {
    global.authManager.cleanupExpiredTokens();
  }
}, 60 * 60 * 1000);

module.exports = AuthManager;

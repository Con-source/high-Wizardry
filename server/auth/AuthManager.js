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

class AuthManager {
  constructor() {
    this.users = new Map(); // username -> { id, passwordHash, email, emailVerified, verificationCode, resetToken, resetTokenExpiry, banned, muted, createdAt }
    this.tokens = new Map(); // token -> { playerId, username, expiresAt }
    this.emailToUsername = new Map(); // email -> username (for lookup)
    this.dataFile = path.join(__dirname, '..', 'data', 'users.json');
    this.emailConfig = this.loadEmailConfig();
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Load existing users
    this.loadUsers();
    
    // Setup email transporter
    this.setupEmailTransporter();
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
  
  async register(username, password, email = null) {
    // Validate input
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }
    
    if (username.length < 3 || username.length > 20) {
      return { success: false, message: 'Username must be 3-20 characters' };
    }
    
    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }
    
    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Invalid email format' };
      }
      
      // Check if email already exists
      if (this.emailToUsername.has(email.toLowerCase())) {
        return { success: false, message: 'Email already registered' };
      }
    }
    
    // Check if username already exists
    if (this.users.has(username.toLowerCase())) {
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
        username: username,
        passwordHash,
        email: email ? email.toLowerCase() : null,
        emailVerified: email ? false : true, // If no email provided, consider "verified" for backward compatibility
        verificationCode: email ? verificationCode : null,
        resetToken: null,
        resetTokenExpiry: null,
        banned: false,
        muted: false,
        createdAt: Date.now()
      };
      
      this.users.set(username.toLowerCase(), user);
      
      // Add to email map if email provided
      if (email) {
        this.emailToUsername.set(email.toLowerCase(), username.toLowerCase());
      }
      
      // Save to disk
      this.saveUsers();
      
      // Send verification email
      if (email) {
        await this.sendVerificationEmail(email, username, verificationCode);
      }
      
      // Generate token
      const token = this.generateToken(playerId, username);
      
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
    // Validate input
    if (!username || !password) {
      return { success: false, message: 'Username and password are required' };
    }
    
    // Get user
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Check if user is banned
    if (user.banned) {
      return { success: false, message: 'Account has been banned. Please contact support.' };
    }
    
    try {
      // Verify password
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return { success: false, message: 'Invalid username or password' };
      }
      
      // Check if email verification is required
      if (this.emailConfig.requireVerification && user.email && !user.emailVerified) {
        return { 
          success: false, 
          message: 'Please verify your email before logging in. Check your inbox for the verification code.',
          needsEmailVerification: true,
          email: user.email
        };
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
        muted: user.muted || false
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
    
    if (user.verificationCode !== code) {
      return { success: false, message: 'Invalid verification code' };
    }
    
    // Mark as verified
    user.emailVerified = true;
    user.verificationCode = null;
    this.saveUsers();
    
    return { success: true, message: 'Email verified successfully' };
  }
  
  // Resend verification email
  async resendVerificationEmail(username) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    if (user.emailVerified) {
      return { success: false, message: 'Email already verified' };
    }
    
    if (!user.email) {
      return { success: false, message: 'No email on record' };
    }
    
    // Generate new code
    const verificationCode = this.generateVerificationCode();
    user.verificationCode = verificationCode;
    this.saveUsers();
    
    // Send email
    await this.sendVerificationEmail(user.email, user.username, verificationCode);
    
    return { success: true, message: 'Verification email sent' };
  }
  
  // Request password reset
  async requestPasswordReset(usernameOrEmail) {
    // Find user by username or email
    let user = this.users.get(usernameOrEmail.toLowerCase());
    
    if (!user && usernameOrEmail.includes('@')) {
      // Try to find by email
      const username = this.emailToUsername.get(usernameOrEmail.toLowerCase());
      if (username) {
        user = this.users.get(username);
      }
    }
    
    if (!user) {
      // Don't reveal if user exists or not (security)
      return { success: true, message: 'If an account exists, a reset email has been sent' };
    }
    
    if (!user.email) {
      return { success: false, message: 'No email on record for this account. Please contact support.' };
    }
    
    // Generate reset token
    const resetToken = this.generateResetToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
    this.saveUsers();
    
    // Send reset email
    await this.sendPasswordResetEmail(user.email, user.username, resetToken);
    
    return { success: true, message: 'If an account exists, a reset email has been sent' };
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
      return { success: false, message: 'Reset token has expired. Please request a new one.' };
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
      
      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Failed to reset password' };
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Invalid email format' };
    }
    
    // Check if email already exists
    if (this.emailToUsername.has(email.toLowerCase())) {
      return { success: false, message: 'Email already registered' };
    }
    
    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    
    // Update user
    user.email = email.toLowerCase();
    user.emailVerified = false;
    user.verificationCode = verificationCode;
    this.emailToUsername.set(email.toLowerCase(), username.toLowerCase());
    this.saveUsers();
    
    // Send verification email
    await this.sendVerificationEmail(email, user.username, verificationCode);
    
    return { success: true, message: 'Email added. Please check your inbox for verification code.' };
  }
  
  // Ban/unban user
  setBanStatus(username, banned) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    user.banned = banned;
    this.saveUsers();
    
    // Revoke all tokens if banning
    if (banned) {
      this.revokeAllTokensForPlayer(user.id);
    }
    
    return { success: true, message: `User ${banned ? 'banned' : 'unbanned'} successfully` };
  }
  
  // Mute/unmute user
  setMuteStatus(username, muted) {
    const user = this.users.get(username.toLowerCase());
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    user.muted = muted;
    this.saveUsers();
    
    return { success: true, message: `User ${muted ? 'muted' : 'unmuted'} successfully` };
  }
  
  // Check if user is muted (for chat middleware)
  isMuted(playerId) {
    for (const [username, user] of this.users.entries()) {
      if (user.id === playerId) {
        return user.muted || false;
      }
    }
    return false;
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
  
  // Clean up expired tokens
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
}

// Clean up expired tokens every hour
setInterval(() => {
  if (global.authManager) {
    global.authManager.cleanupExpiredTokens();
  }
}, 60 * 60 * 1000);

module.exports = AuthManager;

/**
 * Authentication Manager
 * Handles user registration, login, and token management
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class AuthManager {
  constructor() {
    this.users = new Map(); // username -> { id, passwordHash, createdAt }
    this.tokens = new Map(); // token -> { playerId, username, expiresAt }
    this.dataFile = path.join(__dirname, '..', 'data', 'users.json');
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Load existing users
    this.loadUsers();
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
  
  async register(username, password) {
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
    
    // Check if username already exists
    if (this.users.has(username.toLowerCase())) {
      return { success: false, message: 'Username already exists' };
    }
    
    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const playerId = uuidv4();
      this.users.set(username.toLowerCase(), {
        id: playerId,
        username: username,
        passwordHash,
        createdAt: Date.now()
      });
      
      // Save to disk
      this.saveUsers();
      
      // Generate token
      const token = this.generateToken(playerId, username);
      
      return {
        success: true,
        playerId,
        token
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
    
    try {
      // Verify password
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return { success: false, message: 'Invalid username or password' };
      }
      
      // Generate token
      const token = this.generateToken(user.id, user.username);
      
      return {
        success: true,
        playerId: user.id,
        username: user.username,
        token
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

/**
 * JSON File Database Adapter
 * Implements DatabaseAdapter interface using JSON files for storage
 * 
 * This is the default adapter for development and small deployments.
 * It wraps the existing JSON file storage logic from AuthManager and PlayerManager.
 */

const fs = require('fs');
const path = require('path');
const DatabaseAdapter = require('./DatabaseAdapter');

class JsonFileAdapter extends DatabaseAdapter {
  constructor(options = {}) {
    super(options);
    
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data');
    this.usersFile = options.usersFile || path.join(this.dataDir, 'users.json');
    this.playersDir = options.playersDir || path.join(this.dataDir, 'players');
    
    // In-memory cache
    this.users = new Map();
    this.emailToUsername = new Map();
    this.players = new Map();
    
    // Auto-save configuration
    this.autoSave = options.autoSave !== false;
    this.saveDebounceMs = options.saveDebounceMs || 1000;
    this.usersSaveTimeout = null;
    this.playersSaveTimeouts = new Map();
  }
  
  /**
   * Initialize the adapter
   */
  async initialize() {
    // Ensure directories exist
    this.ensureDirectories();
    
    // Load users
    await this.loadUsers();
    
    // Load players (lazy load on demand, but we can pre-load for consistency)
    await this.loadAllPlayers();
    
    this.isConnected = true;
    console.log(`✅ JsonFileAdapter initialized (${this.users.size} users, ${this.players.size} players)`);
    
    return true;
  }
  
  /**
   * Close the adapter (save any pending changes)
   */
  async close() {
    // Cancel any pending saves and force immediate save
    if (this.usersSaveTimeout) {
      clearTimeout(this.usersSaveTimeout);
      this.usersSaveTimeout = null;
    }
    
    for (const [playerId, timeout] of this.playersSaveTimeouts.entries()) {
      clearTimeout(timeout);
      this.playersSaveTimeouts.delete(playerId);
    }
    
    // Save all data
    await this.saveUsers();
    await this.saveAllPlayers();
    
    this.isConnected = false;
  }
  
  /**
   * Ensure data directories exist
   */
  ensureDirectories() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.playersDir)) {
      fs.mkdirSync(this.playersDir, { recursive: true });
    }
  }
  
  // ===========================================================================
  // User Operations
  // ===========================================================================
  
  async loadUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const data = fs.readFileSync(this.usersFile, 'utf8');
        const users = JSON.parse(data);
        this.users = new Map(Object.entries(users));
        
        // Build email to username map
        for (const [username, user] of this.users.entries()) {
          if (user.email) {
            this.emailToUsername.set(user.email.toLowerCase(), username);
          }
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }
  
  async saveUsers() {
    try {
      const usersObj = Object.fromEntries(this.users);
      fs.writeFileSync(this.usersFile, JSON.stringify(usersObj, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }
  
  /**
   * Schedule a debounced save for users
   */
  scheduleSaveUsers() {
    if (!this.autoSave) return;
    
    if (this.usersSaveTimeout) {
      clearTimeout(this.usersSaveTimeout);
    }
    
    this.usersSaveTimeout = setTimeout(() => {
      this.saveUsers();
      this.usersSaveTimeout = null;
    }, this.saveDebounceMs);
  }
  
  async getUser(username) {
    return this.users.get(username.toLowerCase()) || null;
  }
  
  async getUserByEmail(email) {
    const username = this.emailToUsername.get(email.toLowerCase());
    if (!username) return null;
    return this.users.get(username) || null;
  }
  
  async getUserByPlayerId(playerId) {
    for (const [, user] of this.users.entries()) {
      if (user.id === playerId) {
        return user;
      }
    }
    return null;
  }
  
  async createUser(username, userData) {
    const lowerUsername = username.toLowerCase();
    
    if (this.users.has(lowerUsername)) {
      return false; // User already exists
    }
    
    this.users.set(lowerUsername, userData);
    
    // Update email map
    if (userData.email) {
      this.emailToUsername.set(userData.email.toLowerCase(), lowerUsername);
    }
    
    this.scheduleSaveUsers();
    return true;
  }
  
  async updateUser(username, updates) {
    const lowerUsername = username.toLowerCase();
    const user = this.users.get(lowerUsername);
    
    if (!user) {
      return false;
    }
    
    // Handle email change
    if (updates.email && updates.email !== user.email) {
      // Remove old email mapping
      if (user.email) {
        this.emailToUsername.delete(user.email.toLowerCase());
      }
      // Add new email mapping
      this.emailToUsername.set(updates.email.toLowerCase(), lowerUsername);
    }
    
    Object.assign(user, updates);
    this.scheduleSaveUsers();
    return true;
  }
  
  async deleteUser(username) {
    const lowerUsername = username.toLowerCase();
    const user = this.users.get(lowerUsername);
    
    if (!user) {
      return false;
    }
    
    // Remove email mapping
    if (user.email) {
      this.emailToUsername.delete(user.email.toLowerCase());
    }
    
    this.users.delete(lowerUsername);
    this.scheduleSaveUsers();
    return true;
  }
  
  async getAllUsers() {
    return new Map(this.users);
  }
  
  async getUserCount() {
    return this.users.size;
  }
  
  // ===========================================================================
  // Player Operations
  // ===========================================================================
  
  async loadAllPlayers() {
    try {
      if (!fs.existsSync(this.playersDir)) {
        return;
      }
      
      const files = fs.readdirSync(this.playersDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const playerId = path.basename(file, '.json');
        const playerData = await this.loadPlayer(playerId);
        if (playerData) {
          this.players.set(playerId, playerData);
        }
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }
  
  async loadPlayer(playerId) {
    try {
      const playerFile = path.join(this.playersDir, `${playerId}.json`);
      if (fs.existsSync(playerFile)) {
        const data = fs.readFileSync(playerFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error loading player ${playerId}:`, error);
    }
    return null;
  }
  
  async savePlayer(playerId) {
    try {
      const player = this.players.get(playerId);
      if (!player) return false;
      
      const playerFile = path.join(this.playersDir, `${playerId}.json`);
      fs.writeFileSync(playerFile, JSON.stringify(player, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving player ${playerId}:`, error);
      return false;
    }
  }
  
  async saveAllPlayers() {
    for (const playerId of this.players.keys()) {
      await this.savePlayer(playerId);
    }
  }
  
  /**
   * Schedule a debounced save for a player
   */
  scheduleSavePlayer(playerId) {
    if (!this.autoSave) return;
    
    if (this.playersSaveTimeouts.has(playerId)) {
      clearTimeout(this.playersSaveTimeouts.get(playerId));
    }
    
    const timeout = setTimeout(() => {
      this.savePlayer(playerId);
      this.playersSaveTimeouts.delete(playerId);
    }, this.saveDebounceMs);
    
    this.playersSaveTimeouts.set(playerId, timeout);
  }
  
  async getPlayer(playerId) {
    // Check in-memory cache first
    if (this.players.has(playerId)) {
      return this.players.get(playerId);
    }
    
    // Try to load from disk
    const playerData = await this.loadPlayer(playerId);
    if (playerData) {
      this.players.set(playerId, playerData);
      return playerData;
    }
    
    return null;
  }
  
  async createPlayer(playerId, playerData) {
    if (this.players.has(playerId)) {
      return false; // Player already exists
    }
    
    this.players.set(playerId, playerData);
    this.scheduleSavePlayer(playerId);
    return true;
  }
  
  async updatePlayer(playerId, updates) {
    let player = this.players.get(playerId);
    
    if (!player) {
      // Try to load from disk
      player = await this.loadPlayer(playerId);
      if (!player) {
        return false;
      }
      this.players.set(playerId, player);
    }
    
    Object.assign(player, updates);
    player.lastUpdate = Date.now();
    this.scheduleSavePlayer(playerId);
    return true;
  }
  
  async deletePlayer(playerId) {
    this.players.delete(playerId);
    
    // Also delete the file
    try {
      const playerFile = path.join(this.playersDir, `${playerId}.json`);
      if (fs.existsSync(playerFile)) {
        fs.unlinkSync(playerFile);
      }
    } catch (error) {
      console.error(`Error deleting player file ${playerId}:`, error);
    }
    
    return true;
  }
  
  async getAllPlayers() {
    return new Map(this.players);
  }
  
  async getPlayerCount() {
    return this.players.size;
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  getType() {
    return 'json';
  }
  
  async healthCheck() {
    return this.isConnected && fs.existsSync(this.dataDir);
  }
}

module.exports = JsonFileAdapter;

/**
 * SQLite Database Adapter
 * Implements DatabaseAdapter interface using SQLite for storage
 * 
 * This adapter is recommended for production deployments.
 * Uses better-sqlite3 for synchronous operations (simpler and faster than async).
 */

const path = require('path');
const fs = require('fs');
const DatabaseAdapter = require('./DatabaseAdapter');

class SQLiteAdapter extends DatabaseAdapter {
  constructor(options = {}) {
    super(options);
    
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data');
    this.dbPath = options.dbPath || path.join(this.dataDir, 'highwizardry.db');
    this.db = null;
  }
  
  /**
   * Initialize the SQLite database
   */
  async initialize() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    try {
      // Import better-sqlite3
      const Database = require('better-sqlite3');
      
      // Open database
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrent access
      this.db.pragma('journal_mode = WAL');
      
      // Create tables
      this.createTables();
      
      this.isConnected = true;
      
      // Get counts for logging
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const playerCount = this.db.prepare('SELECT COUNT(*) as count FROM players').get().count;
      
      console.log(`✅ SQLiteAdapter initialized (${userCount} users, ${playerCount} players)`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      this.isConnected = false;
      return false;
    }
  }
  
  /**
   * Create database tables
   */
  createTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY COLLATE NOCASE,
        id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE COLLATE NOCASE,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
    `);
    
    // Players table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
      
      CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
    `);
  }
  
  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isConnected = false;
    }
  }
  
  // ===========================================================================
  // User Operations
  // ===========================================================================
  
  async getUser(username) {
    try {
      const row = this.db.prepare('SELECT data FROM users WHERE username = ?').get(username.toLowerCase());
      if (!row) return null;
      return JSON.parse(row.data);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }
  
  async getUserByEmail(email) {
    try {
      const row = this.db.prepare('SELECT data FROM users WHERE email = ?').get(email.toLowerCase());
      if (!row) return null;
      return JSON.parse(row.data);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }
  
  async getUserByPlayerId(playerId) {
    try {
      const row = this.db.prepare('SELECT data FROM users WHERE id = ?').get(playerId);
      if (!row) return null;
      return JSON.parse(row.data);
    } catch (error) {
      console.error('Error getting user by player ID:', error);
      return null;
    }
  }
  
  async createUser(username, userData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (username, id, email, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const now = Date.now();
      stmt.run(
        username.toLowerCase(),
        userData.id,
        userData.email ? userData.email.toLowerCase() : null,
        JSON.stringify(userData),
        now,
        now
      );
      
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return false; // User already exists
      }
      console.error('Error creating user:', error);
      return false;
    }
  }
  
  async updateUser(username, updates) {
    try {
      // Get existing user data
      const user = await this.getUser(username);
      if (!user) return false;
      
      // Merge updates
      Object.assign(user, updates);
      
      const stmt = this.db.prepare(`
        UPDATE users 
        SET email = ?, data = ?, updated_at = ?
        WHERE username = ?
      `);
      
      const result = stmt.run(
        user.email ? user.email.toLowerCase() : null,
        JSON.stringify(user),
        Date.now(),
        username.toLowerCase()
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }
  
  async deleteUser(username) {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE username = ?');
      const result = stmt.run(username.toLowerCase());
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
  
  async getAllUsers() {
    try {
      const rows = this.db.prepare('SELECT username, data FROM users').all();
      const users = new Map();
      
      for (const row of rows) {
        users.set(row.username, JSON.parse(row.data));
      }
      
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      return new Map();
    }
  }
  
  async getUserCount() {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
      return row.count;
    } catch (error) {
      console.error('Error getting user count:', error);
      return 0;
    }
  }
  
  // ===========================================================================
  // Player Operations
  // ===========================================================================
  
  async getPlayer(playerId) {
    try {
      const row = this.db.prepare('SELECT data FROM players WHERE id = ?').get(playerId);
      if (!row) return null;
      return JSON.parse(row.data);
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  }
  
  async createPlayer(playerId, playerData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO players (id, username, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const now = Date.now();
      stmt.run(
        playerId,
        playerData.username,
        JSON.stringify(playerData),
        now,
        now
      );
      
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        return false; // Player already exists
      }
      console.error('Error creating player:', error);
      return false;
    }
  }
  
  async updatePlayer(playerId, updates) {
    try {
      // Get existing player data
      const player = await this.getPlayer(playerId);
      if (!player) return false;
      
      // Merge updates
      Object.assign(player, updates);
      player.lastUpdate = Date.now();
      
      const stmt = this.db.prepare(`
        UPDATE players 
        SET data = ?, updated_at = ?
        WHERE id = ?
      `);
      
      const result = stmt.run(
        JSON.stringify(player),
        Date.now(),
        playerId
      );
      
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating player:', error);
      return false;
    }
  }
  
  async deletePlayer(playerId) {
    try {
      const stmt = this.db.prepare('DELETE FROM players WHERE id = ?');
      const result = stmt.run(playerId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting player:', error);
      return false;
    }
  }
  
  async getAllPlayers() {
    try {
      const rows = this.db.prepare('SELECT id, data FROM players').all();
      const players = new Map();
      
      for (const row of rows) {
        players.set(row.id, JSON.parse(row.data));
      }
      
      return players;
    } catch (error) {
      console.error('Error getting all players:', error);
      return new Map();
    }
  }
  
  async getPlayerCount() {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as count FROM players').get();
      return row.count;
    } catch (error) {
      console.error('Error getting player count:', error);
      return 0;
    }
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  getType() {
    return 'sqlite';
  }
  
  async healthCheck() {
    if (!this.isConnected || !this.db) {
      return false;
    }
    
    try {
      // Simple query to check if database is responsive
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Run a raw SQL query (for migrations and maintenance)
   * @param {string} sql - SQL statement to execute
   * @param {Array} params - Optional parameters for parameterized query
   * @returns {Object} - Query result
   */
  runRaw(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return this.db.prepare(sql).run(...params);
  }
  
  /**
   * Get all rows from a raw SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Optional parameters
   * @returns {Array} - Array of result rows
   */
  queryRaw(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return this.db.prepare(sql).all(...params);
  }
  
  /**
   * Begin a transaction
   * @returns {Object} - Transaction object
   */
  beginTransaction() {
    return this.db.transaction((fn) => fn());
  }
}

module.exports = SQLiteAdapter;

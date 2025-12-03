/**
 * Database Adapter Interface
 * Abstract base class defining the interface for database adapters
 * 
 * Implementations must provide methods for storing and retrieving:
 * - Users (authentication data)
 * - Players (game state data)
 */

class DatabaseAdapter {
  constructor(options = {}) {
    this.options = options;
    this.isConnected = false;
  }
  
  /**
   * Initialize the database connection
   * @returns {Promise<boolean>} - True if initialization successful
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }
  
  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close() must be implemented by subclass');
  }
  
  // ===========================================================================
  // User Operations (for AuthManager)
  // ===========================================================================
  
  /**
   * Get a user by username
   * @param {string} username - Username to look up
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUser(username) {
    throw new Error('getUser() must be implemented by subclass');
  }
  
  /**
   * Get a user by email
   * @param {string} email - Email to look up
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserByEmail(email) {
    throw new Error('getUserByEmail() must be implemented by subclass');
  }
  
  /**
   * Get a user by player ID
   * @param {string} playerId - Player ID to look up
   * @returns {Promise<Object|null>} - User data or null if not found
   */
  async getUserByPlayerId(playerId) {
    throw new Error('getUserByPlayerId() must be implemented by subclass');
  }
  
  /**
   * Create a new user
   * @param {string} username - Username
   * @param {Object} userData - User data object
   * @returns {Promise<boolean>} - True if creation successful
   */
  async createUser(username, userData) {
    throw new Error('createUser() must be implemented by subclass');
  }
  
  /**
   * Update an existing user
   * @param {string} username - Username
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} - True if update successful
   */
  async updateUser(username, updates) {
    throw new Error('updateUser() must be implemented by subclass');
  }
  
  /**
   * Delete a user
   * @param {string} username - Username
   * @returns {Promise<boolean>} - True if deletion successful
   */
  async deleteUser(username) {
    throw new Error('deleteUser() must be implemented by subclass');
  }
  
  /**
   * Get all users
   * @returns {Promise<Map>} - Map of username -> userData
   */
  async getAllUsers() {
    throw new Error('getAllUsers() must be implemented by subclass');
  }
  
  /**
   * Get count of users
   * @returns {Promise<number>} - Number of users
   */
  async getUserCount() {
    throw new Error('getUserCount() must be implemented by subclass');
  }
  
  // ===========================================================================
  // Player Operations (for PlayerManager)
  // ===========================================================================
  
  /**
   * Get a player by ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Object|null>} - Player data or null if not found
   */
  async getPlayer(playerId) {
    throw new Error('getPlayer() must be implemented by subclass');
  }
  
  /**
   * Create a new player
   * @param {string} playerId - Player ID
   * @param {Object} playerData - Player data object
   * @returns {Promise<boolean>} - True if creation successful
   */
  async createPlayer(playerId, playerData) {
    throw new Error('createPlayer() must be implemented by subclass');
  }
  
  /**
   * Update an existing player
   * @param {string} playerId - Player ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>} - True if update successful
   */
  async updatePlayer(playerId, updates) {
    throw new Error('updatePlayer() must be implemented by subclass');
  }
  
  /**
   * Delete a player
   * @param {string} playerId - Player ID
   * @returns {Promise<boolean>} - True if deletion successful
   */
  async deletePlayer(playerId) {
    throw new Error('deletePlayer() must be implemented by subclass');
  }
  
  /**
   * Get all players
   * @returns {Promise<Map>} - Map of playerId -> playerData
   */
  async getAllPlayers() {
    throw new Error('getAllPlayers() must be implemented by subclass');
  }
  
  /**
   * Get count of players
   * @returns {Promise<number>} - Number of players
   */
  async getPlayerCount() {
    throw new Error('getPlayerCount() must be implemented by subclass');
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Check if the database is healthy and connected
   * @returns {Promise<boolean>} - True if database is healthy
   */
  async healthCheck() {
    return this.isConnected;
  }
  
  /**
   * Get database type name
   * @returns {string} - Database type identifier
   */
  getType() {
    throw new Error('getType() must be implemented by subclass');
  }
  
  /**
   * Export all data for backup
   * @returns {Promise<Object>} - Object with users and players data
   */
  async exportData() {
    const users = await this.getAllUsers();
    const players = await this.getAllPlayers();
    
    return {
      users: Object.fromEntries(users),
      players: Object.fromEntries(players),
      exportedAt: new Date().toISOString()
    };
  }
  
  /**
   * Import data from backup
   * @param {Object} data - Data object with users and players
   * @returns {Promise<Object>} - Import results
   */
  async importData(data) {
    const results = {
      usersImported: 0,
      playersImported: 0,
      errors: []
    };
    
    // Import users
    if (data.users) {
      for (const [username, userData] of Object.entries(data.users)) {
        try {
          const exists = await this.getUser(username);
          if (exists) {
            await this.updateUser(username, userData);
          } else {
            await this.createUser(username, userData);
          }
          results.usersImported++;
        } catch (error) {
          results.errors.push(`User ${username}: ${error.message}`);
        }
      }
    }
    
    // Import players
    if (data.players) {
      for (const [playerId, playerData] of Object.entries(data.players)) {
        try {
          const exists = await this.getPlayer(playerId);
          if (exists) {
            await this.updatePlayer(playerId, playerData);
          } else {
            await this.createPlayer(playerId, playerData);
          }
          results.playersImported++;
        } catch (error) {
          results.errors.push(`Player ${playerId}: ${error.message}`);
        }
      }
    }
    
    return results;
  }
}

module.exports = DatabaseAdapter;

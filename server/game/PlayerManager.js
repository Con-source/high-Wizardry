/**
 * Player Manager
 * Handles player state and data persistence
 */

const fs = require('fs');
const path = require('path');

class PlayerManager {
  constructor(options = {}) {
    this.players = new Map(); // playerId -> playerData
    this.dataDir = path.join(__dirname, '..', 'data', 'players');
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Optionally load existing players
    if (options.autoLoad !== false) {
      const loaded = this.loadPlayers();
      if (loaded > 0) {
        console.log(`Loaded ${loaded} players from storage`);
      }
    }
  }
  
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  createPlayer(playerId, username) {
    const playerData = {
      id: playerId,
      username: username,
      level: 1,
      xp: 0,
      shillings: 83,
      pennies: 4,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      mana: 100,
      maxMana: 100,
      location: 'town-square',
      stats: {
        intelligence: 10,
        endurance: 10,
        charisma: 10,
        dexterity: 10
      },
      inventory: [],
      equipment: {
        weapon: null,
        armor: null,
        accessory: null
      },
      questsCompleted: 0,
      craftedItems: {},
      guilds: {
        memberships: []
      },
      friends: [],
      lastLogin: Date.now(),
      createdAt: Date.now()
    };
    
    this.players.set(playerId, playerData);
    this.savePlayer(playerId);
    
    return playerData;
  }
  
  getPlayer(playerId) {
    // Try to get from memory
    if (this.players.has(playerId)) {
      return this.players.get(playerId);
    }
    
    // Try to load from disk
    const playerData = this.loadPlayer(playerId);
    if (playerData) {
      this.players.set(playerId, playerData);
      return playerData;
    }
    
    return null;
  }
  
  updatePlayer(playerId, updates) {
    const player = this.getPlayer(playerId);
    if (!player) {
      console.error(`Player ${playerId} not found`);
      return false;
    }
    
    // Merge updates
    Object.assign(player, updates);
    player.lastUpdate = Date.now();
    
    // Save to disk
    this.savePlayer(playerId);
    
    return true;
  }
  
  removePlayer(playerId) {
    if (!this.players.has(playerId)) {
      return false;
    }
    
    // Save before removing from memory
    this.savePlayer(playerId);
    this.players.delete(playerId);
    return true;
  }
  
  loadPlayer(playerId) {
    try {
      const playerFile = path.join(this.dataDir, `${playerId}.json`);
      if (fs.existsSync(playerFile)) {
        const data = fs.readFileSync(playerFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading player %s:', playerId, error);
    }
    return null;
  }
  
  savePlayer(playerId) {
    try {
      const player = this.players.get(playerId);
      if (!player) return false;
      
      const playerFile = path.join(this.dataDir, `${playerId}.json`);
      fs.writeFileSync(playerFile, JSON.stringify(player, null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving player ${playerId}:`, error);
      return false;
    }
  }
  
  getPlayerCount() {
    return this.players.size;
  }
  
  getAllPlayers() {
    return Array.from(this.players.values());
  }
  
  /**
   * Save all players to disk
   * @returns {boolean} True if all saves successful
   */
  savePlayers() {
    let allSuccess = true;
    for (const playerId of this.players.keys()) {
      if (!this.savePlayer(playerId)) {
        allSuccess = false;
      }
    }
    return allSuccess;
  }
  
  /**
   * Load all players from disk into memory
   * @returns {number} Number of players loaded
   */
  loadPlayers() {
    let count = 0;
    try {
      if (!fs.existsSync(this.dataDir)) {
        return count;
      }
      
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const playerId = file.replace('.json', '');
          const playerData = this.loadPlayer(playerId);
          if (playerData) {
            this.players.set(playerId, playerData);
            count++;
          }
        }
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
    return count;
  }
}

module.exports = PlayerManager;

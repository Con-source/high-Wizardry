// Game Configuration
const CONFIG = {
  // Game Settings
  VERSION: '1.0.0',
  DEBUG: true,
  
  // Player Defaults
  DEFAULT_PLAYER: {
    username: 'Player',
    level: 1,
    xp: 0,
    shillings: 8,  // Starting with 100 pennies = 8 shillings + 4 pennies
    pennies: 4,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    energy: 100,
    maxEnergy: 100,
    happiness: 50,
    crime: 0,
    
    // Stats
    intelligence: 10,
    endurance: 10,
    charisma: 10,
    dexterity: 10,
    speed: 0,  // New stat for travel speed
    
    // Inventory
    inventory: {
      potions: 3,
      herbs: 5,
      weapons: [],
      armor: [],
      items: []
    },
    
    // Game State
    lastLogin: Date.now(),
    playTime: 0,
    
    // Settings
    settings: {
      sound: true,
      music: true,
      notifications: true
    }
  },
  
  // Experience Requirements
  XP_TABLE: {
    BASE: 100,
    MULTIPLIER: 1.5
  },
  
  // Game Constants
  TICK_RATE: 1000, // 1 second
  SAVE_INTERVAL: 30000, // 30 seconds
  
  // Chat Settings
  CHAT: {
    MESSAGE_LIMIT: 100,
    COOLDOWN: 1000, // 1 second
    CHANNELS: ['global', 'guild', 'trade', 'help']
  },
  
  // API Endpoints
  API: {
    BASE_URL: 'https://api.highwizardry.com',
    ENDPOINTS: {
      PLAYER: '/player',
      CHAT: '/chat',
      MARKET: '/market',
      GUILD: '/guild'
    }
  },
  
  // UI Settings
  UI: {
    NOTIFICATION_DURATION: 5000, // 5 seconds
    TOAST_DURATION: 3000, // 3 seconds
    FADE_DURATION: 300 // milliseconds
  }
};

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = CONFIG;
}

/**
 * Game Configuration
 * Central configuration for all game constants and defaults
 * @module CONFIG
 */
const CONFIG = {
  /**
   * Game version
   * @type {string}
   */
  VERSION: '2.0.0', // Updated version
  
  /**
   * Debug mode flag
   * @type {boolean}
   */
  DEBUG: true,
  
  /**
   * Default player data structure
   * @typedef {Object} DefaultPlayer
   * @property {string} username - Default username
   * @property {number} level - Starting level
   * @property {number} xp - Starting experience points
   * @property {number} shillings - Starting shillings
   * @property {number} pennies - Starting pennies
   * @property {number} health - Starting health
   * @property {number} maxHealth - Starting max health
   * @property {number} mana - Starting mana
   * @property {number} maxMana - Starting max mana
   * @property {number} energy - Starting energy
   * @property {number} maxEnergy - Starting max energy
   * @property {number} happiness - Starting happiness
   * @property {number} crime - Starting crime level
   * @property {number} intelligence - Starting intelligence stat
   * @property {number} endurance - Starting endurance stat
   * @property {number} charisma - Starting charisma stat
   * @property {number} dexterity - Starting dexterity stat
   * @property {number} speed - Starting speed stat
   * @property {Object} inventory - Starting inventory
   * @property {number} lastLogin - Last login timestamp
   * @property {number} playTime - Total play time in milliseconds
   * @property {Object} settings - Game settings
   */
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
    HISTORY_LIMIT: 500, // Server-side history limit per channel
    COOLDOWN: 1000, // 1 second
    SLOWMODE_DELAY: 5000, // 5 seconds slowmode
    MAX_MESSAGE_LENGTH: 500,
    CHANNELS: ['global', 'local', 'guild', 'trade', 'help'],
    RATE_LIMIT: {
      MAX_MESSAGES: 10,
      TIME_WINDOW: 10000 // 10 seconds
    },
    MODERATION: {
      ENABLE_SPAM_FILTER: true,
      ENABLE_LINK_FILTER: true,
      ENABLE_PROFANITY_FILTER: true,
      MAX_CAPS_PERCENT: 70,
      MAX_REPEAT_CHARS: 5
    }
  },
  
  // Direct Messaging Settings
  DM: {
    MAX_UNREAD: 100,
    MAX_CONVERSATIONS: 50,
    MESSAGE_LIMIT: 200, // Per conversation
    MAX_MESSAGE_LENGTH: 1000
  },
  
  // Mail System Settings
  MAIL: {
    MAX_INBOX_SIZE: 200,
    MAX_SENT_SIZE: 100,
    MAX_SUBJECT_LENGTH: 100,
    MAX_BODY_LENGTH: 5000,
    RETENTION_DAYS: 30
  },
  
  // Forum Settings
  FORUM: {
    MAX_TOPICS_PER_PAGE: 20,
    MAX_REPLIES_PER_PAGE: 50,
    MAX_TITLE_LENGTH: 200,
    MAX_POST_LENGTH: 10000
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

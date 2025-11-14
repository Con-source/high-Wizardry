/**
 * Player Module
 * Handles all player-related data and operations
 */

const Player = (() => {
  // Player data structure
  let playerData = null;
  const STORAGE_KEY = 'highWizardryPlayer';
  
  // Initialize player module
  function init() {
    try {
      // Try to load saved player data
      const saved = loadFromStorage();
      
      if (saved && validatePlayerData(saved)) {
        playerData = saved;
        console.log('Player data loaded from storage');
      } else {
        // Create new player with defaults from CONFIG
        playerData = createNewPlayer();
        console.log('New player created');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing player module:', error);
      playerData = createNewPlayer();
      return false;
    }
  }
  
  // Create a new player with default values
  function createNewPlayer() {
    const defaults = typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_PLAYER 
      ? CONFIG.DEFAULT_PLAYER 
      : {
          username: 'Apprentice',
          level: 1,
          xp: 0,
          gold: 1000,
          silver: 0,
          health: 100,
          maxHealth: 100,
          mana: 50,
          maxMana: 50,
          energy: 100,
          maxEnergy: 100,
          happiness: 50,
          crime: 0,
          intelligence: 10,
          endurance: 10,
          charisma: 10,
          dexterity: 10,
          speed: 0,  // New stat for travel speed
          inventory: {
            potions: 3,
            herbs: 5,
            weapons: [],
            armor: [],
            items: []
          },
          lastLogin: Date.now(),
          playTime: 0,
          settings: {
            sound: true,
            music: true,
            notifications: true
          }
        };
    
    return { ...defaults };
  }
  
  // Validate player data structure
  function validatePlayerData(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Check for required fields
    const required = ['username', 'level', 'health', 'maxHealth'];
    for (const field of required) {
      if (!(field in data)) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }
    
    return true;
  }
  
  // Get player data
  function getData() {
    if (!playerData) {
      console.warn('Player data not initialized, creating new player');
      playerData = createNewPlayer();
    }
    return { ...playerData };
  }
  
  // Update player data
  function updateData(updates) {
    if (!playerData) {
      playerData = createNewPlayer();
    }
    
    playerData = {
      ...playerData,
      ...updates,
      lastUpdate: Date.now()
    };
    
    // Auto-save after updates
    saveToStorage();
    
    // Update UI if available
    if (typeof updateUI === 'function') {
      updateUI();
    }
    
    return playerData;
  }
  
  // Set player username
  function setUsername(name) {
    if (!name || typeof name !== 'string') {
      console.error('Invalid username');
      return false;
    }
    
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      console.error('Username cannot be empty');
      return false;
    }
    
    return updateData({ username: trimmed });
  }
  
  // Add experience points
  function addXP(amount) {
    if (!playerData) return false;
    
    const newXP = (playerData.xp || 0) + amount;
    const nextLevel = calculateNextLevelXP(playerData.level);
    
    if (newXP >= nextLevel) {
      // Level up!
      levelUp();
    } else {
      updateData({ xp: newXP });
    }
    
    return true;
  }
  
  // Calculate XP required for next level
  function calculateNextLevelXP(currentLevel) {
    const base = (typeof CONFIG !== 'undefined' && CONFIG.XP_TABLE?.BASE) || 100;
    const multiplier = (typeof CONFIG !== 'undefined' && CONFIG.XP_TABLE?.MULTIPLIER) || 1.5;
    return Math.floor(base * Math.pow(multiplier, currentLevel));
  }
  
  // Level up the player
  function levelUp() {
    if (!playerData) return false;
    
    const newLevel = (playerData.level || 1) + 1;
    const overflow = playerData.xp - calculateNextLevelXP(playerData.level);
    
    updateData({
      level: newLevel,
      xp: Math.max(0, overflow),
      maxHealth: (playerData.maxHealth || 100) + 10,
      health: (playerData.maxHealth || 100) + 10, // Restore health on level up
      maxMana: (playerData.maxMana || 50) + 5,
      mana: (playerData.maxMana || 50) + 5, // Restore mana on level up
      maxEnergy: (playerData.maxEnergy || 100) + 5,
      energy: (playerData.maxEnergy || 100) + 5 // Restore energy on level up
    });
    
    // Show notification if UI is available
    if (typeof UI !== 'undefined' && UI.showNotification) {
      UI.showNotification(`Level Up! You are now level ${newLevel}!`, 'success');
    }
    
    console.log(`Player leveled up to ${newLevel}`);
    return true;
  }
  
  // Add gold
  function addGold(amount) {
    if (!playerData || typeof amount !== 'number' || amount < 0) return false;
    
    return updateData({
      gold: (playerData.gold || 0) + amount
    });
  }
  
  // Remove gold
  function removeGold(amount) {
    if (!playerData || typeof amount !== 'number' || amount < 0) return false;
    
    const currentGold = playerData.gold || 0;
    if (currentGold < amount) {
      console.warn('Not enough gold');
      return false;
    }
    
    return updateData({
      gold: currentGold - amount
    });
  }
  
  // Update player stats in UI
  function updateUI() {
    if (!playerData) return;
    
    // Update name and level
    const nameEl = document.getElementById('player-name');
    const levelEl = document.getElementById('player-level');
    const goldEl = document.getElementById('gold-display');
    
    if (nameEl) nameEl.textContent = playerData.username || 'Apprentice';
    if (levelEl) levelEl.textContent = playerData.level || 1;
    if (goldEl) goldEl.textContent = (playerData.gold || 0).toLocaleString();
    
    // Update health bar
    updateStatBar('health', playerData.health, playerData.maxHealth);
    
    // Update energy bar
    updateStatBar('energy', playerData.energy, playerData.maxEnergy);
    
    // Update mana bar
    updateStatBar('mana', playerData.mana, playerData.maxMana);
  }
  
  // Update a stat bar (health, energy, mana)
  function updateStatBar(statName, current, max) {
    const bar = document.getElementById(`${statName}-bar`);
    const text = document.getElementById(`${statName}-text`);
    
    if (!bar || !text) return;
    
    const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
    bar.style.width = `${percentage}%`;
    text.textContent = `${Math.floor(current)}/${Math.floor(max)}`;
  }
  
  // Save to localStorage
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData));
      return true;
    } catch (error) {
      console.error('Error saving player data:', error);
      return false;
    }
  }
  
  // Load from localStorage
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading player data:', error);
      return null;
    }
  }
  
  // Reset player data (for testing or new game)
  function reset() {
    playerData = createNewPlayer();
    saveToStorage();
    updateUI();
    return playerData;
  }
  
  // Public API
  return {
    init,
    getData,
    updateData,
    setUsername,
    addXP,
    addGold,
    removeGold,
    levelUp,
    updateUI,
    reset,
    
    // For debugging
    _debug: {
      getRawData: () => playerData,
      setRawData: (data) => {
        playerData = data;
        saveToStorage();
        updateUI();
      }
    }
  };
})();

// Auto-initialize if CONFIG is available
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Player.init();
    });
  } else {
    Player.init();
  }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Player;
}

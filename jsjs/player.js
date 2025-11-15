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
        migrateGoldToCurrency(); // Migrate old saves
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
          shillings: 83,  // 1000 pennies = 83 shillings + 4 pennies
          pennies: 4,
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
  
  // Currency conversion: 1 shilling = 12 pennies
  const PENNIES_PER_SHILLING = 12;
  
  // Convert old gold to new currency (migration helper)
  function migrateGoldToCurrency() {
    if (playerData.gold !== undefined && playerData.shillings === undefined) {
      const totalPennies = playerData.gold;
      const shillings = Math.floor(totalPennies / PENNIES_PER_SHILLING);
      const pennies = totalPennies % PENNIES_PER_SHILLING;
      
      delete playerData.gold;
      playerData.shillings = shillings;
      playerData.pennies = pennies;
      
      saveToStorage();
      console.log(`Migrated ${totalPennies} old gold to ${shillings} shillings and ${pennies} pennies`);
    }
  }
  
  // Get total currency in pennies
  function getTotalPennies() {
    const shillings = playerData.shillings || 0;
    const pennies = playerData.pennies || 0;
    return (shillings * PENNIES_PER_SHILLING) + pennies;
  }
  
  // Add currency (amount in pennies)
  function addCurrency(amountInPennies) {
    if (!playerData || typeof amountInPennies !== 'number' || amountInPennies < 0) return false;
    
    const currentTotal = getTotalPennies();
    const newTotal = currentTotal + amountInPennies;
    const newShillings = Math.floor(newTotal / PENNIES_PER_SHILLING);
    const newPennies = newTotal % PENNIES_PER_SHILLING;
    
    return updateData({
      shillings: newShillings,
      pennies: newPennies
    });
  }
  
  // Remove currency (amount in pennies)
  function removeCurrency(amountInPennies) {
    if (!playerData || typeof amountInPennies !== 'number' || amountInPennies < 0) return false;
    
    const currentTotal = getTotalPennies();
    if (currentTotal < amountInPennies) {
      console.warn('Not enough currency');
      return false;
    }
    
    const newTotal = currentTotal - amountInPennies;
    const newShillings = Math.floor(newTotal / PENNIES_PER_SHILLING);
    const newPennies = newTotal % PENNIES_PER_SHILLING;
    
    return updateData({
      shillings: newShillings,
      pennies: newPennies
    });
  }
  
  // Legacy functions for backward compatibility
  function addGold(amount) {
    console.warn('addGold is deprecated, use addCurrency instead');
    return addCurrency(amount);
  }
  
  function removeGold(amount) {
    console.warn('removeGold is deprecated, use removeCurrency instead');
    return removeCurrency(amount);
  }
  
  // Format currency for display
  function formatCurrency(totalPennies) {
    if (totalPennies === undefined) {
      totalPennies = getTotalPennies();
    }
    const shillings = Math.floor(totalPennies / PENNIES_PER_SHILLING);
    const pennies = totalPennies % PENNIES_PER_SHILLING;
    
    if (shillings === 0) {
      return `${pennies} ${pennies === 1 ? 'penny' : 'pennies'}`;
    } else if (pennies === 0) {
      return `${shillings} ${shillings === 1 ? 'shilling' : 'shillings'}`;
    } else {
      return `${shillings} ${shillings === 1 ? 'shilling' : 'shillings'}, ${pennies} ${pennies === 1 ? 'penny' : 'pennies'}`;
    }
  }
  
  // Update player stats in UI
  function updateUI() {
    if (!playerData) return;
    
    // Migrate old gold currency if needed
    migrateGoldToCurrency();
    
    // Update name and level
    const nameEl = document.getElementById('player-name');
    const levelEl = document.getElementById('player-level');
    const currencyEl = document.getElementById('currency-display');
    
    if (nameEl) nameEl.textContent = playerData.username || 'Apprentice';
    if (levelEl) levelEl.textContent = playerData.level || 1;
    if (currencyEl) currencyEl.textContent = formatCurrency();
    
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
    addCurrency,
    removeCurrency,
    getTotalPennies,
    formatCurrency,
    addGold, // Legacy - deprecated
    removeGold, // Legacy - deprecated
    levelUp,
    updateUI,
    reset,
    
    // Currency constants
    PENNIES_PER_SHILLING,
    
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

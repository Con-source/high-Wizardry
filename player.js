// Player Module
const Player = (() => {
  let playerData = {...CONFIG.DEFAULT_PLAYER};
  
  // Initialize player data
  function init() {
    loadFromLocalStorage();
    updateLastLogin();
    startPlayTimeTracker();
    
    // Auto-save player data periodically
    setInterval(saveToLocalStorage, CONFIG.SAVE_INTERVAL);
    
    if (CONFIG.DEBUG) {
      console.log('Player initialized:', playerData);
    }
  }
  
  // Load player data from localStorage
  function loadFromLocalStorage() {
    const savedData = localStorage.getItem('highWizardryPlayer');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        playerData = {
          ...CONFIG.DEFAULT_PLAYER,
          ...parsedData,
          settings: {
            ...CONFIG.DEFAULT_PLAYER.settings,
            ...(parsedData.settings || {})
          },
          inventory: {
            ...CONFIG.DEFAULT_PLAYER.inventory,
            ...(parsedData.inventory || {})
          }
        };
      } catch (error) {
        console.error('Error loading player data:', error);
        resetPlayer();
      }
    }
    return playerData;
  }
  
  // Save player data to localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem('highWizardryPlayer', JSON.stringify(playerData));
      if (CONFIG.DEBUG) {
        console.log('Player data saved');
      }
      return true;
    } catch (error) {
      console.error('Error saving player data:', error);
      return false;
    }
  }
  
  // Reset player to default state
  function resetPlayer() {
    playerData = {...CONFIG.DEFAULT_PLAYER};
    saveToLocalStorage();
    return playerData;
  }
  
  // Update last login timestamp
  function updateLastLogin() {
    playerData.lastLogin = Date.now();
    saveToLocalStorage();
  }
  
  // Track play time
  function startPlayTimeTracker() {
    setInterval(() => {
      playerData.playTime += 1;
      // Auto-save every 5 minutes
      if (playerData.playTime % 300 === 0) {
        saveToLocalStorage();
      }
    }, 1000);
  }
  
  // Experience and Leveling
  function addXP(amount) {
    if (amount <= 0) return;
    
    playerData.xp += amount;
    const xpNeeded = getXPForNextLevel();
    
    if (playerData.xp >= xpNeeded) {
      levelUp();
    }
    
    updateUI();
    saveToLocalStorage();
    return playerData.xp;
  }
  
  function getXPForNextLevel() {
    return Math.floor(CONFIG.XP_TABLE.BASE * Math.pow(playerData.level, CONFIG.XP_TABLE.MULTIPLIER));
  }
  
  function levelUp() {
    playerData.level += 1;
    playerData.xp = 0;
    playerData.maxHealth += 10;
    playerData.health = playerData.maxHealth;
    playerData.maxMana += 5;
    playerData.mana = playerData.maxMana;
    
    // Notify the player
    UI.showNotification(`🎉 Level Up! You are now level ${playerData.level}`, 'success');
    
    if (CONFIG.DEBUG) {
      console.log(`Player leveled up to level ${playerData.level}`);
    }
    
    return playerData.level;
  }
  
  // Inventory Management
  function addItem(item, quantity = 1) {
    if (!playerData.inventory[item]) {
      playerData.inventory[item] = 0;
    }
    playerData.inventory[item] += quantity;
    saveToLocalStorage();
    return playerData.inventory[item];
  }
  
  function removeItem(item, quantity = 1) {
    if (!playerData.inventory[item] || playerData.inventory[item] < quantity) {
      return false;
    }
    playerData.inventory[item] -= quantity;
    saveToLocalStorage();
    return true;
  }
  
  function hasItem(item, quantity = 1) {
    return playerData.inventory[item] >= quantity;
  }
  
  // Currency Management
  function addGold(amount) {
    if (amount <= 0) return playerData.gold;
    
    playerData.gold += amount;
    updateUI();
    saveToLocalStorage();
    return playerData.gold;
  }
  
  function removeGold(amount) {
    if (amount <= 0 || playerData.gold < amount) return false;
    
    playerData.gold -= amount;
    updateUI();
    saveToLocalStorage();
    return true;
  }
  
  // Stats Management
  function updateStat(stat, amount) {
    if (typeof playerData[stat] === 'number') {
      playerData[stat] = Math.max(0, playerData[stat] + amount);
      updateUI();
      saveToLocalStorage();
      return playerData[stat];
    }
    return null;
  }
  
  // Update UI elements
  function updateUI() {
    // Update stats display
    document.getElementById('username').textContent = playerData.username;
    document.getElementById('level').textContent = playerData.level;
    document.getElementById('xp').textContent = playerData.xp;
    document.getElementById('gold').textContent = playerData.gold;
    document.getElementById('silver').textContent = playerData.silver;
    document.getElementById('health').textContent = `${playerData.health}/${playerData.maxHealth}`;
    document.getElementById('mana').textContent = `${playerData.mana}/${playerData.maxMana}`;
    document.getElementById('energy').textContent = playerData.energy;
    document.getElementById('happiness').textContent = playerData.happiness;
    document.getElementById('crime').textContent = playerData.crime;
    
    // Update stats
    document.getElementById('intelligence').textContent = playerData.intelligence;
    document.getElementById('endurance').textContent = playerData.endurance;
    document.getElementById('charisma').textContent = playerData.charisma;
    document.getElementById('dexterity').textContent = playerData.dexterity;
    
    // Update XP bar
    const xpPercent = (playerData.xp / getXPForNextLevel()) * 100;
    const xpBar = document.getElementById('xp-bar');
    if (xpBar) {
      xpBar.style.width = `${Math.min(100, xpPercent)}%`;
    }
    
    // Update XP display
    const xpDisplay = document.getElementById('xp-display');
    if (xpDisplay) {
      xpDisplay.textContent = playerData.xp;
    }
  }
  
  // Public API
  return {
    init,
    reset: resetPlayer,
    save: saveToLocalStorage,
    getData: () => ({...playerData}),
    updateUI,
    
    // Experience
    addXP,
    getXPForNextLevel,
    levelUp,
    
    // Inventory
    addItem,
    removeItem,
    hasItem,
    
    // Currency
    addGold,
    removeGold,
    
    // Stats
    updateStat,
    
    // Getters for specific stats
    getLevel: () => playerData.level,
    getGold: () => playerData.gold,
    getHealth: () => ({ current: playerData.health, max: playerData.maxHealth }),
    getMana: () => ({ current: playerData.mana, max: playerData.maxMana }),
    getEnergy: () => playerData.energy,
    getHappiness: () => playerData.happiness,
    getCrime: () => playerData.crime,
    
    // Setters for specific stats
    setUsername: (name) => {
      playerData.username = name.substring(0, 20);
      saveToLocalStorage();
      return playerData.username;
    },
    
    // Debug
    debug: {
      getState: () => ({...playerData}),
      setState: (newState) => {
        playerData = {...playerData, ...newState};
        saveToLocalStorage();
        return {...playerData};
      }
    }
  };
})();

// Initialize player when the script loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Player.init();
    Player.updateUI();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Player;
}

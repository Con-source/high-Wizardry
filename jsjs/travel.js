/**
 * Travel Module
 * Handles time-based travel mechanics between locations
 */

const Travel = (() => {
  // Travel state
  let travelState = {
    isTraveling: false,
    currentLocation: 'town-square',
    destination: null,
    method: null,
    startTime: null,
    endTime: null,
    energyCost: 0,
    goldCost: 0,
    timerInterval: null,
    events: []
  };
  
  // Travel methods configuration
  const travelMethods = {
    'walking': {
      name: 'Walking',
      icon: 'fa-walking',
      speedMultiplier: 1.0,
      energyMultiplier: 1.0,
      goldCost: 0,
      description: 'Default travel method. Slowest but free.',
      unlocked: true
    },
    'mount': {
      name: 'Mount',
      icon: 'fa-horse',
      speedMultiplier: 0.5,  // 50% faster (less time)
      energyMultiplier: 0.75,
      goldCost: 50,
      description: 'Faster travel on a magical mount.',
      unlocked: true,
      requiredLevel: 5
    },
    'portal': {
      name: 'Magic Portal',
      icon: 'fa-hat-wizard',
      speedMultiplier: 0,  // Instant
      energyMultiplier: 0,
      goldCost: 200,
      description: 'Instant teleportation via magical portal.',
      unlocked: true,
      requiredLevel: 10
    }
  };
  
  // Location data with distances and coordinates
  const locations = {
    'town-square': {
      name: 'Town Square',
      x: 0,
      y: 0,
      distancesFrom: {}
    },
    'home': {
      name: 'My Home',
      x: 2,
      y: 1,
      distancesFrom: { 'town-square': 3 }
    },
    'hospital': {
      name: 'Hospital',
      x: -3,
      y: 2,
      distancesFrom: { 'town-square': 5, 'home': 6 }
    },
    'education': {
      name: 'Education',
      x: 4,
      y: -1,
      distancesFrom: { 'town-square': 5, 'home': 4, 'hospital': 8 }
    },
    'property': {
      name: 'Property Management',
      x: -2,
      y: -3,
      distancesFrom: { 'town-square': 4, 'home': 5, 'hospital': 6, 'education': 7 }
    },
    'quests': {
      name: 'Quest Board',
      x: 1,
      y: 3,
      distancesFrom: { 'town-square': 4, 'home': 3, 'hospital': 6 }
    },
    'crimes': {
      name: 'Criminal Activities',
      x: -4,
      y: -2,
      distancesFrom: { 'town-square': 5, 'home': 7, 'hospital': 4 }
    },
    'jail': {
      name: 'Jail',
      x: -5,
      y: 0,
      distancesFrom: { 'town-square': 5, 'crimes': 3 }
    },
    'casino': {
      name: 'The Golden Dice Casino',
      x: 3,
      y: 3,
      distancesFrom: { 'town-square': 5, 'home': 3, 'quests': 3 }
    },
    'newspaper': {
      name: 'The Daily Wizard',
      x: -1,
      y: 4,
      distancesFrom: { 'town-square': 5, 'quests': 2 }
    },
    'friends': {
      name: 'Friends & Enemies',
      x: 2,
      y: -2,
      distancesFrom: { 'town-square': 3, 'home': 4, 'education': 2 }
    },
    'magic-shop': {
      name: 'Magic Shop',
      x: -2,
      y: 3,
      distancesFrom: { 'town-square': 4, 'hospital': 3, 'newspaper': 2 }
    },
    'tavern': {
      name: 'The Drunken Wizard',
      x: 1,
      y: -4,
      distancesFrom: { 'town-square': 5, 'home': 5, 'property': 3 }
    },
    'fair-alley': {
      name: 'Fair Alleyway',
      x: 5,
      y: 2,
      distancesFrom: { 'town-square': 6, 'education': 4, 'casino': 3 }
    },
    'guild-district': {
      name: 'Guild District',
      x: -3,
      y: -4,
      distancesFrom: { 'town-square': 6, 'crimes': 4, 'property': 3 }
    },
    'smuggling-routes': {
      name: 'Smuggling Routes',
      x: -6,
      y: -3,
      distancesFrom: { 'town-square': 8, 'crimes': 3, 'guild-district': 3 }
    }
  };
  
  // Base travel time per distance unit (in seconds)
  const BASE_TRAVEL_TIME = 10;
  
  // Initialize travel module
  function init() {
    loadTravelState();
    
    // Check if player is currently traveling
    if (travelState.isTraveling && travelState.endTime) {
      resumeTravel();
    }
    
    console.log('✅ Travel module initialized');
  }
  
  // Calculate distance between two locations
  function calculateDistance(from, to) {
    const fromLoc = locations[from];
    const toLoc = locations[to];
    
    if (!fromLoc || !toLoc) return 0;
    
    // Check if we have a pre-defined distance
    if (fromLoc.distancesFrom && fromLoc.distancesFrom[to]) {
      return fromLoc.distancesFrom[to];
    }
    
    if (toLoc.distancesFrom && toLoc.distancesFrom[from]) {
      return toLoc.distancesFrom[from];
    }
    
    // Calculate Euclidean distance
    const dx = toLoc.x - fromLoc.x;
    const dy = toLoc.y - fromLoc.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }
  
  // Calculate travel time in seconds
  function calculateTravelTime(from, to, method = 'walking', playerStats = {}) {
    const distance = calculateDistance(from, to);
    const methodData = travelMethods[method];
    
    if (!methodData || !distance) return 0;
    
    // Instant travel
    if (methodData.speedMultiplier === 0) return 0;
    
    // Base travel time
    let travelTime = distance * BASE_TRAVEL_TIME;
    
    // Apply method speed multiplier
    travelTime *= methodData.speedMultiplier;
    
    // Apply player speed stat (if available)
    if (playerStats.speed) {
      const speedBonus = 1 - (playerStats.speed * 0.01); // 1% faster per speed point
      travelTime *= Math.max(0.1, speedBonus); // Cap at 90% faster
    }
    
    // Apply player dexterity (minor effect)
    if (playerStats.dexterity) {
      const dexBonus = 1 - (playerStats.dexterity * 0.005); // 0.5% faster per dexterity point
      travelTime *= Math.max(0.5, dexBonus); // Cap at 50% faster
    }
    
    return Math.max(1, Math.round(travelTime));
  }
  
  // Calculate energy cost for travel
  function calculateEnergyCost(from, to, method = 'walking') {
    const distance = calculateDistance(from, to);
    const methodData = travelMethods[method];
    
    if (!methodData || !distance) return 0;
    
    // Base energy cost (2 energy per distance unit)
    let energyCost = distance * 2;
    
    // Apply method energy multiplier
    energyCost *= methodData.energyMultiplier;
    
    return Math.round(energyCost);
  }
  
  // Start traveling to a location
  function startTravel(destination, method = 'walking') {
    // Check if already traveling
    if (travelState.isTraveling) {
      showMessage('You are already traveling!', 'warning');
      return false;
    }
    
    // Check if player exists
    if (typeof Player === 'undefined') {
      console.error('Player module not available');
      return false;
    }
    
    const playerData = Player.getData();
    const currentLocation = travelState.currentLocation;
    
    // Check if destination exists
    if (!locations[destination]) {
      showMessage('Unknown destination!', 'error');
      return false;
    }
    
    // Check if already at destination
    if (currentLocation === destination) {
      showMessage('You are already at this location!', 'info');
      return false;
    }
    
    // Check if method is unlocked
    const methodData = travelMethods[method];
    if (!methodData || !methodData.unlocked) {
      showMessage('This travel method is not available!', 'error');
      return false;
    }
    
    // Check level requirement
    if (methodData.requiredLevel && playerData.level < methodData.requiredLevel) {
      showMessage(`You need to be level ${methodData.requiredLevel} to use ${methodData.name}!`, 'warning');
      return false;
    }
    
    // Calculate costs and time
    const travelTime = calculateTravelTime(currentLocation, destination, method, playerData);
    const energyCost = calculateEnergyCost(currentLocation, destination, method);
    const goldCost = methodData.goldCost;
    
    // Check if player has enough resources
    if (playerData.energy < energyCost) {
      showMessage('Not enough energy to travel!', 'warning');
      return false;
    }
    
    if (playerData.gold < goldCost) {
      showMessage(`Not enough gold! Need ${goldCost} gold for ${methodData.name}.`, 'warning');
      return false;
    }
    
    // Deduct costs
    Player.updateData({ energy: playerData.energy - energyCost });
    if (goldCost > 0) {
      Player.removeGold(goldCost);
    }
    
    // Set up travel state
    const now = Date.now();
    travelState = {
      isTraveling: true,
      currentLocation: currentLocation,
      destination: destination,
      method: method,
      startTime: now,
      endTime: now + (travelTime * 1000),
      energyCost: energyCost,
      goldCost: goldCost,
      timerInterval: null,
      events: []
    };
    
    // Save travel state
    saveTravelState();
    
    // Show travel UI
    showTravelUI();
    
    // Start travel timer
    if (travelTime > 0) {
      startTravelTimer();
      showMessage(`Traveling to ${locations[destination].name} via ${methodData.name}...`, 'info');
    } else {
      // Instant travel
      completeTravel();
    }
    
    return true;
  }
  
  // Start the travel timer
  function startTravelTimer() {
    if (travelState.timerInterval) {
      clearInterval(travelState.timerInterval);
    }
    
    travelState.timerInterval = setInterval(() => {
      const now = Date.now();
      const remaining = travelState.endTime - now;
      
      if (remaining <= 0) {
        completeTravel();
      } else {
        updateTravelUI(remaining);
        
        // Check for random events (10% chance per second)
        if (Math.random() < 0.1) {
          triggerTravelEvent();
        }
      }
    }, 1000);
  }
  
  // Resume travel after page reload
  function resumeTravel() {
    const now = Date.now();
    
    if (travelState.endTime <= now) {
      // Travel should have completed
      completeTravel();
    } else {
      // Still traveling
      showTravelUI();
      startTravelTimer();
      showMessage('Resuming your journey...', 'info');
    }
  }
  
  // Complete the travel
  function completeTravel() {
    if (travelState.timerInterval) {
      clearInterval(travelState.timerInterval);
      travelState.timerInterval = null;
    }
    
    // Update current location
    travelState.currentLocation = travelState.destination;
    
    // Navigate to destination
    if (typeof Locations !== 'undefined') {
      Locations.navigateToLocation(travelState.destination);
    }
    
    // Show completion message
    showMessage(`Arrived at ${locations[travelState.destination].name}!`, 'success');
    
    // Reset travel state
    travelState.isTraveling = false;
    travelState.destination = null;
    travelState.method = null;
    travelState.startTime = null;
    travelState.endTime = null;
    
    // Hide travel UI
    hideTravelUI();
    
    // Save state
    saveTravelState();
    
    // Add log entry
    if (typeof addGameLog === 'function') {
      addGameLog(`Arrived at ${locations[travelState.currentLocation].name}`);
    }
  }
  
  // Cancel travel
  function cancelTravel() {
    if (!travelState.isTraveling) {
      return false;
    }
    
    if (travelState.timerInterval) {
      clearInterval(travelState.timerInterval);
      travelState.timerInterval = null;
    }
    
    // Energy is already spent (forfeit)
    showMessage('Travel cancelled. Energy was not refunded.', 'warning');
    
    if (typeof addGameLog === 'function') {
      addGameLog('Cancelled travel');
    }
    
    // Reset travel state
    travelState.isTraveling = false;
    travelState.destination = null;
    travelState.method = null;
    travelState.startTime = null;
    travelState.endTime = null;
    
    // Hide travel UI
    hideTravelUI();
    
    // Save state
    saveTravelState();
    
    return true;
  }
  
  // Trigger a random travel event
  function triggerTravelEvent() {
    const eventTypes = [
      {
        type: 'encounter',
        weight: 30,
        handler: handleMonsterEncounter
      },
      {
        type: 'treasure',
        weight: 20,
        handler: handleTreasureFind
      },
      {
        type: 'weather',
        weight: 25,
        handler: handleWeatherEvent
      },
      {
        type: 'npc',
        weight: 25,
        handler: handleNPCEncounter
      }
    ];
    
    // Check if event already triggered recently
    const lastEventTime = travelState.events[travelState.events.length - 1]?.time || 0;
    if (Date.now() - lastEventTime < 5000) {
      return; // Cooldown between events
    }
    
    // Random selection based on weights
    const totalWeight = eventTypes.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const eventType of eventTypes) {
      random -= eventType.weight;
      if (random <= 0) {
        eventType.handler();
        travelState.events.push({ type: eventType.type, time: Date.now() });
        break;
      }
    }
  }
  
  // Handle monster encounter event
  function handleMonsterEncounter() {
    const monsters = ['Goblin', 'Wild Wolf', 'Rogue Wizard', 'Dark Spirit'];
    const monster = monsters[Math.floor(Math.random() * monsters.length)];
    
    showMessage(`⚔️ A wild ${monster} appeared! You fought it off.`, 'warning');
    
    if (typeof Player !== 'undefined') {
      const damage = Math.floor(Math.random() * 10) + 5;
      const playerData = Player.getData();
      Player.updateData({ health: Math.max(0, playerData.health - damage) });
      Player.addXP(15);
    }
  }
  
  // Handle treasure find event
  function handleTreasureFind() {
    const goldFound = Math.floor(Math.random() * 50) + 10;
    
    showMessage(`💰 You found ${goldFound} gold on the road!`, 'success');
    
    if (typeof Player !== 'undefined') {
      Player.addGold(goldFound);
    }
  }
  
  // Handle weather event
  function handleWeatherEvent() {
    const events = [
      { text: '🌧️ Heavy rain slows your travel.', timeChange: 5 },
      { text: '☀️ Clear weather speeds up your journey.', timeChange: -3 },
      { text: '🌫️ Thick fog makes navigation difficult.', timeChange: 3 }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    // Adjust end time
    travelState.endTime += event.timeChange * 1000;
    saveTravelState();
    
    showMessage(event.text, 'info');
  }
  
  // Handle NPC encounter event
  function handleNPCEncounter() {
    const npcs = [
      'traveling merchant',
      'wandering bard',
      'fellow wizard',
      'mysterious stranger'
    ];
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    
    showMessage(`👤 You met a ${npc} on the road and had a brief chat.`, 'info');
  }
  
  // Show travel UI
  function showTravelUI() {
    let travelUI = document.getElementById('travel-ui');
    
    if (!travelUI) {
      travelUI = document.createElement('div');
      travelUI.id = 'travel-ui';
      travelUI.className = 'travel-ui';
      travelUI.innerHTML = `
        <div class="travel-ui-content">
          <h4><i class="fas fa-map-marked-alt"></i> Traveling</h4>
          <div class="travel-info">
            <p><strong>Destination:</strong> <span id="travel-destination">-</span></p>
            <p><strong>Method:</strong> <span id="travel-method">-</span></p>
            <p><strong>Time Remaining:</strong> <span id="travel-timer">-</span></p>
          </div>
          <div class="progress mb-3">
            <div id="travel-progress-bar" class="progress-bar bg-primary" role="progressbar" style="width: 0%"></div>
          </div>
          <button id="cancel-travel-btn" class="btn btn-danger btn-sm">
            <i class="fas fa-times"></i> Cancel Travel
          </button>
        </div>
      `;
      
      document.body.appendChild(travelUI);
      
      // Add cancel button listener
      document.getElementById('cancel-travel-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel your travel? Energy will not be refunded.')) {
          cancelTravel();
        }
      });
    }
    
    // Update travel info
    if (travelState.destination && locations[travelState.destination]) {
      document.getElementById('travel-destination').textContent = locations[travelState.destination].name;
    }
    
    if (travelState.method && travelMethods[travelState.method]) {
      document.getElementById('travel-method').textContent = travelMethods[travelState.method].name;
    }
    
    travelUI.style.display = 'block';
  }
  
  // Hide travel UI
  function hideTravelUI() {
    const travelUI = document.getElementById('travel-ui');
    if (travelUI) {
      travelUI.style.display = 'none';
    }
  }
  
  // Update travel UI with remaining time
  function updateTravelUI(remainingMs) {
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    
    const timerEl = document.getElementById('travel-timer');
    if (timerEl) {
      timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update progress bar
    const progressBar = document.getElementById('travel-progress-bar');
    if (progressBar && travelState.startTime && travelState.endTime) {
      const totalTime = travelState.endTime - travelState.startTime;
      const elapsed = Date.now() - travelState.startTime;
      const progress = Math.min(100, (elapsed / totalTime) * 100);
      progressBar.style.width = `${progress}%`;
    }
  }
  
  // Show travel selection modal
  function showTravelModal(destination) {
    if (!locations[destination]) {
      showMessage('Unknown destination!', 'error');
      return;
    }
    
    const destName = locations[destination].name;
    const playerData = typeof Player !== 'undefined' ? Player.getData() : null;
    const currentLocation = travelState.currentLocation;
    
    // Build travel options HTML
    let optionsHTML = '';
    
    for (const [methodKey, methodData] of Object.entries(travelMethods)) {
      if (!methodData.unlocked) continue;
      
      const travelTime = calculateTravelTime(currentLocation, destination, methodKey, playerData || {});
      const energyCost = calculateEnergyCost(currentLocation, destination, methodKey);
      const goldCost = methodData.goldCost;
      
      const isLocked = methodData.requiredLevel && playerData && playerData.level < methodData.requiredLevel;
      const hasEnergy = !playerData || playerData.energy >= energyCost;
      const hasGold = !playerData || playerData.gold >= goldCost;
      const canUse = !isLocked && hasEnergy && hasGold;
      
      const timeDisplay = travelTime === 0 ? 'Instant' : `${Math.floor(travelTime / 60)}m ${travelTime % 60}s`;
      
      optionsHTML += `
        <div class="travel-option ${canUse ? '' : 'disabled'}" data-method="${methodKey}">
          <div class="travel-option-header">
            <i class="fas ${methodData.icon} me-2"></i>
            <strong>${methodData.name}</strong>
            ${isLocked ? `<span class="badge bg-warning ms-2">Lvl ${methodData.requiredLevel}</span>` : ''}
          </div>
          <p class="travel-option-description">${methodData.description}</p>
          <div class="travel-option-costs">
            <span class="cost-item ${hasEnergy ? '' : 'insufficient'}">
              <i class="fas fa-bolt"></i> ${energyCost} Energy
            </span>
            ${goldCost > 0 ? `
              <span class="cost-item ${hasGold ? '' : 'insufficient'}">
                <i class="fas fa-coins"></i> ${goldCost} Gold
              </span>
            ` : ''}
            <span class="cost-item">
              <i class="fas fa-clock"></i> ${timeDisplay}
            </span>
          </div>
          ${canUse ? `
            <button class="btn btn-primary btn-sm mt-2 travel-select-btn" data-method="${methodKey}">
              Select
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm mt-2" disabled>
              ${isLocked ? 'Locked' : 'Insufficient Resources'}
            </button>
          `}
        </div>
      `;
    }
    
    // Show modal using UI module if available
    if (typeof UI !== 'undefined' && typeof UI.showModal === 'function') {
      const modalId = UI.showModal({
        title: `Travel to ${destName}`,
        content: `
          <div class="travel-modal">
            <p>Choose your travel method:</p>
            <div class="travel-options">
              ${optionsHTML}
            </div>
          </div>
        `,
        className: 'travel-selection-modal',
        closeOnBackdrop: true
      });
      
      // Add event listeners for travel buttons
      setTimeout(() => {
        const travelBtns = document.querySelectorAll('.travel-select-btn');
        travelBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const method = btn.getAttribute('data-method');
            if (startTravel(destination, method)) {
              UI.closeModal(modalId);
            }
          });
        });
      }, 100);
    }
  }
  
  // Save travel state to localStorage
  function saveTravelState() {
    try {
      localStorage.setItem('highWizardryTravel', JSON.stringify(travelState));
    } catch (error) {
      console.error('Error saving travel state:', error);
    }
  }
  
  // Load travel state from localStorage
  function loadTravelState() {
    try {
      const saved = localStorage.getItem('highWizardryTravel');
      if (saved) {
        const parsed = JSON.parse(saved);
        travelState = { ...travelState, ...parsed, timerInterval: null };
      }
    } catch (error) {
      console.error('Error loading travel state:', error);
    }
  }
  
  // Show message utility
  function showMessage(message, type = 'info') {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }
  
  // Get available travel methods for player
  function getAvailableMethods(playerLevel = 1) {
    const available = [];
    for (const [key, method] of Object.entries(travelMethods)) {
      if (method.unlocked && (!method.requiredLevel || playerLevel >= method.requiredLevel)) {
        available.push({ key, ...method });
      }
    }
    return available;
  }
  
  // Get current location
  function getCurrentLocation() {
    return travelState.currentLocation;
  }
  
  // Set current location (used when navigating without travel system)
  function setCurrentLocation(locationId) {
    if (locations[locationId]) {
      travelState.currentLocation = locationId;
      saveTravelState();
    }
  }
  
  // Check if currently traveling
  function isTraveling() {
    return travelState.isTraveling;
  }
  
  // Public API
  return {
    init,
    startTravel,
    cancelTravel,
    showTravelModal,
    calculateTravelTime,
    calculateEnergyCost,
    getAvailableMethods,
    getCurrentLocation,
    setCurrentLocation,
    isTraveling,
    locations,
    travelMethods
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Travel.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Travel;
}

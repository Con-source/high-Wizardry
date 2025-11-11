// Game Module
const Game = (() => {
  let gameLoop;
  let isPaused = false;
  let lastTick = Date.now();
  
  // Game state
  const state = {
    isRunning: false,
    currentLocation: 'home',
    currentSection: 'home',
    gameTime: 0,
    dayNightCycle: 0, // 0-23 hours
    weather: 'clear',
    events: [],
    npcs: {},
    quests: {},
    guilds: {}
  };
  
  // Initialize the game
  function init() {
    if (CONFIG.DEBUG) {
      console.log('Initializing game...');
    }
    
    // Load saved game state
    loadGameState();
    
    // Initialize UI
    initUI();
    
    // Start the game loop
    startGameLoop();
    
    // Initialize game systems
    initWorld();
    initNPCs();
    initQuests();
    
    // Show welcome message
    UI.showNotification('Welcome to High Wizardry!', 'info');
    
    if (CONFIG.DEBUG) {
      console.log('Game initialized');
      console.log('Player data:', Player.getData());
    }
    
    return true;
  }
  
  // Start the main game loop
  function startGameLoop() {
    if (gameLoop) return;
    
    state.isRunning = true;
    lastTick = Date.now();
    
    gameLoop = setInterval(() => {
      if (isPaused) return;
      
      const now = Date.now();
      const deltaTime = (now - lastTick) / 1000; // in seconds
      lastTick = now;
      
      // Update game state
      update(deltaTime);
      
      // Render game
      render();
      
    }, 1000 / 30); // 30 FPS
    
    if (CONFIG.DEBUG) {
      console.log('Game loop started');
    }
  }
  
  // Stop the game loop
  function stopGameLoop() {
    if (!gameLoop) return;
    
    clearInterval(gameLoop);
    gameLoop = null;
    state.isRunning = false;
    
    if (CONFIG.DEBUG) {
      console.log('Game loop stopped');
    }
  }
  
  // Pause the game
  function pauseGame() {
    isPaused = true;
    UI.showNotification('Game Paused', 'warning');
  }
  
  // Resume the game
  function resumeGame() {
    isPaused = false;
    lastTick = Date.now();
    UI.showNotification('Game Resumed', 'success');
  }
  
  // Toggle pause state
  function togglePause() {
    isPaused ? resumeGame() : pauseGame();
  }
  
  // Update game state
  function update(deltaTime) {
    // Update game time (1 real second = 1 game minute)
    state.gameTime += deltaTime;
    
    // Update day/night cycle (24 minutes per day)
    state.dayNightCycle = Math.floor((state.gameTime / 60) % 24);
    
    // Update weather (changes every 30 minutes)
    if (Math.floor(state.gameTime) % (30 * 60) === 0) {
      updateWeather();
    }
    
    // Update NPCs
    updateNPCs(deltaTime);
    
    // Update quests
    updateQuests(deltaTime);
    
    // Update player stats (energy regen, etc.)
    updatePlayer(deltaTime);
    
    // Check for random events
    checkRandomEvents(deltaTime);
  }
  
  // Render game
  function render() {
    // Update UI elements
    updateUI();
    
    // Render current location/section
    renderCurrentSection();
  }
  
  // Initialize UI elements
  function initUI() {
    // Set up event listeners for menu buttons
    document.querySelectorAll('.menu-btn').forEach(button => {
      const section = button.getAttribute('data-section');
      if (section) {
        button.addEventListener('click', () => showSection(section));
      }
    });
    
    // Set up other UI event listeners
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize tooltips
    initTooltips();
    
    // Show initial section
    showSection('home');
  }
  
  // Show a specific section
  function showSection(sectionId) {
    if (state.currentSection === sectionId) return;
    
    // Hide all sections
    document.querySelectorAll('.content-box').forEach(section => {
      section.style.display = 'none';
    });
    
    // Remove active class from all menu buttons
    document.querySelectorAll('.menu-btn').forEach(button => {
      button.classList.remove('active');
    });
    
    // Show the selected section
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
      section.style.display = 'block';
      
      // Add active class to the clicked button
      const activeButton = document.querySelector(`.menu-btn[data-section="${sectionId}"]`);
      if (activeButton) {
        activeButton.classList.add('active');
      }
      
      // Update current section
      state.currentSection = sectionId;
      
      // Load section-specific content
      loadSectionContent(sectionId);
      
      if (CONFIG.DEBUG) {
        console.log(`Switched to section: ${sectionId}`);
      }
    } else {
      console.warn(`Section '${sectionId}' not found`);
    }
  }
  
  // Load content for a specific section
  function loadSectionContent(sectionId) {
    // This would be expanded to load dynamic content for each section
    switch (sectionId) {
      case 'town':
        loadTownSection();
        break;
      case 'guild':
        loadGuildSection();
        break;
      case 'market':
        loadMarketSection();
        break;
      case 'inventory':
        loadInventorySection();
        break;
      // Add more sections as needed
    }
  }
  
  // Load town section content
  function loadTownSection() {
    // This would be populated with dynamic town data
    const townContent = `
      <h2>🏙️ Town Center</h2>
      <p>Welcome to the town center. Where would you like to go?</p>
      <div class="town-grid">
        <!-- Town locations would be dynamically generated here -->
      </div>
    `;
    
    const section = document.getElementById('town-section');
    if (section) {
      section.innerHTML = townContent;
    }
  }
  
  // Handle keyboard input
  function handleKeyPress(event) {
    // Toggle pause with Escape key
    if (event.key === 'Escape') {
      togglePause();
    }
    
    // Add more keyboard shortcuts as needed
  }
  
  // Initialize tooltips
  function initTooltips() {
    // This would initialize tooltips for various UI elements
    // Using a library like Tippy.js or similar
  }
  
  // Update player stats
  function updatePlayer(deltaTime) {
    // Energy regeneration (1 per minute)
    const energyRegenRate = 1 / 60; // per second
    const playerData = Player.getData();
    
    if (playerData.energy < 100) {
      Player.updateStat('energy', energyRegenRate * deltaTime);
    }
    
    // Other player updates...
  }
  
  // Initialize the game world
  function initWorld() {
    // Set up the game world, locations, etc.
    // This would be expanded based on your game's needs
  }
  
  // Initialize NPCs
  function initNPCs() {
    // Load and initialize NPCs
    // This would be populated with your NPC data
  }
  
  // Update NPCs
  function updateNPCs(deltaTime) {
    // Update NPC states, behaviors, etc.
  }
  
  // Initialize quests
  function initQuests() {
    // Load and initialize quests
  }
  
  // Update quests
  function updateQuests(deltaTime) {
    // Update quest states, check for completion, etc.
  }
  
  // Update weather
  function updateWeather() {
    const weatherTypes = ['clear', 'rainy', 'cloudy', 'foggy', 'stormy'];
    state.weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    
    if (CONFIG.DEBUG) {
      console.log(`Weather changed to: ${state.weather}`);
    }
  }
  
  // Check for random events
  function checkRandomEvents(deltaTime) {
    // This would check for and trigger random events
  }
  
  // Update UI elements
  function updateUI() {
    // Update the UI based on game state
    updateClock();
    updatePlayerStats();
  }
  
  // Update in-game clock display
  function updateClock() {
    const hours = Math.floor(state.dayNightCycle);
    const minutes = Math.floor((state.dayNightCycle % 1) * 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const clockElement = document.getElementById('game-clock');
    if (clockElement) {
      clockElement.textContent = timeString;
    }
  }
  
  // Update player stats display
  function updatePlayerStats() {
    // This would update various UI elements with player stats
    Player.updateUI();
  }
  
  // Render the current section
  function renderCurrentSection() {
    // This would handle rendering for the current section
  }
  
  // Save game state
  function saveGameState() {
    try {
      const gameState = {
        version: CONFIG.VERSION,
        lastSaved: Date.now(),
        state: {
          currentLocation: state.currentLocation,
          currentSection: state.currentSection,
          gameTime: state.gameTime,
          dayNightCycle: state.dayNightCycle,
          weather: state.weather,
          // Add other state properties as needed
        }
      };
      
      localStorage.setItem('highWizardryGameState', JSON.stringify(gameState));
      
      if (CONFIG.DEBUG) {
        console.log('Game state saved');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving game state:', error);
      return false;
    }
  }
  
  // Load game state
  function loadGameState() {
    try {
      const savedState = localStorage.getItem('highWizardryGameState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Only load state if the version matches
        if (parsedState.version === CONFIG.VERSION) {
          Object.assign(state, parsedState.state);
          
          if (CONFIG.DEBUG) {
            console.log('Game state loaded:', state);
          }
          
          return true;
        } else {
          console.warn('Game version mismatch, using default state');
        }
      }
    } catch (error) {
      console.error('Error loading game state:', error);
    }
    
    return false;
  }
  
  // Public API
  return {
    init,
    start: startGameLoop,
    stop: stopGameLoop,
    pause: pauseGame,
    resume: resumeGame,
    togglePause,
    showSection,
    save: saveGameState,
    getState: () => ({...state}),
    
    // Debug
    debug: {
      getState: () => ({...state}),
      setState: (newState) => {
        Object.assign(state, newState);
        saveGameState();
        return {...state};
      },
      triggerEvent: (eventName, data) => {
        // This would trigger a specific game event
        console.log(`Debug: Triggering event '${eventName}' with data:`, data);
      }
    }
  };
})();

// Initialize game when the DOM is loaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Game.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Game;
}

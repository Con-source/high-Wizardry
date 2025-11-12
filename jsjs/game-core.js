/**
 * High Wizardry - Core Game Module
 * Handles all game state and logic with improved stability
 */

class GameError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

class GameState {
  constructor(initialState) {
    this._state = initialState;
    this._listeners = new Set();
    this._isUpdating = false;
  }

  get state() {
    return this._state;
  }

  update(updates) {
    if (this._isUpdating) {
      console.warn('State update already in progress');
      return;
    }

    try {
      this._isUpdating = true;
      this._state = {
        ...this._state,
        ...updates,
        lastUpdated: Date.now()
      };
      this._notifyListeners();
    } catch (error) {
      console.error('State update failed:', error);
      throw new GameError('Failed to update game state', 'STATE_UPDATE_ERROR');
    } finally {
      this._isUpdating = false;
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners() {
    for (const listener of this._listeners) {
      try {
        listener(this._state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    }
  }
}

class PerformanceMonitor {
  constructor() {
    this.frameTimes = [];
    this.fps = 0;
    this.lastFrameTime = performance.now();
    this.longFrames = 0;
  }

  beginFrame() {
    this.frameStart = performance.now();
    
    // Calculate FPS
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.fps = Math.round(1000 / delta);
    
    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    // Warn about long frames
    if (delta > 16) { // More than 16ms is bad (60fps target)
      this.longFrames++;
      if (this.longFrames > 5) {
        console.warn(`Performance warning: ${this.longFrames} long frames detected`);
      }
    } else {
      this.longFrames = 0;
    }
  }

  getAverageFPS() {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return Math.round(1000 / (sum / this.frameTimes.length));
  }
}

class GameCore {
    constructor() {
        // Initialize performance monitoring
        this.performance = new PerformanceMonitor();
        this._initialized = false;
        
        // Game settings with defaults
        this.settings = {
            autoSaveInterval: 60000, // 1 minute
            gameLoopInterval: 1000,  // 1 second
            energyRegenRate: 1,     // Energy points per second
            saveKey: 'highWizardrySave',
            maxSaveSize: 1024 * 1024, // 1MB max save size
            version: '1.0.0'
        };
        
        // Initialize game state with error handling
        try {
            this.state = new GameState({
                player: this.getInitialPlayerState(),
                locations: this.getLocationsConfig(),
                crimes: this.getCrimesConfig(),
                lastUpdate: Date.now(),
                isPaused: false,
                errors: []
            });
            
            // Initialize game systems
            this.setupEventListeners();
            this.loadGame();
            this._initialized = true;
            
            // Start auto-save
            this.setupAutoSave();
            
            console.log('GameCore initialized successfully');
        } catch (error) {
            const errorMsg = `Failed to initialize GameCore: ${error.message}`;
            console.error(errorMsg, error);
            this.handleFatalError(error);
        }
    }
    
    handleFatalError(error) {
        // Log to error tracking service in production
        if (typeof window !== 'undefined' && window.trackJs) {
            window.trackJs.track(error);
        }
        
        // Show error to user
        const errorEvent = new CustomEvent('game:error', {
            detail: {
                message: 'A critical error occurred',
                error: {
                    message: error.message,
                    stack: error.stack,
                    code: error.code || 'UNKNOWN_ERROR'
                },
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(errorEvent);
        
        // Try to recover if possible
        if (this._initialized) {
            this.state.update({
                errors: [...(this.state.state.errors || []), {
                    message: error.message,
                    timestamp: Date.now(),
                    code: error.code || 'UNKNOWN_ERROR'
                }]
            });
        }
    }
    
    setupAutoSave() {
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
        }
        
        this._autoSaveInterval = setInterval(() => {
            try {
                this.saveGame();
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, this.settings.autoSaveInterval);
        
        // Also save when page is being unloaded
        window.addEventListener('beforeunload', () => this.saveGame());
    }
    
    // Initialize a new player state with validation
    getInitialPlayerState(overrides = {}) {
        const defaultState = {
            name: 'Apprentice',
            level: 1,
            xp: 0,
            nextLevelXp: 1000,
            energy: 100,
            maxEnergy: 100,
            health: 100,
            maxHealth: 100,
            mana: 100,
            maxMana: 100,
            gold: 1000,
            silver: 0,
            copper: 0,
            location: 'town-square',
            inventory: [],
            equipment: {
                weapon: null,
                armor: null,
                accessory: null
            },
            stats: {
                strength: 10,
                intelligence: 10,
                dexterity: 10,
                luck: 10
            },
            crimes: {
                experience: 0,
                level: 1,
                nextLevelXp: 1000,
                successRate: 60
            },
            lastAction: Date.now(),
            createdAt: Date.now(),
            version: this.settings.version
        };
        
        // Validate and merge with overrides
        return this.validatePlayerState({
            ...defaultState,
            ...overrides,
            // Ensure these objects are properly merged
            equipment: { ...defaultState.equipment, ...(overrides.equipment || {}) },
            stats: { ...defaultState.stats, ...(overrides.stats || {}) },
            crimes: { ...defaultState.crimes, ...(overrides.crimes || {}) }
        });
    }
    
    validatePlayerState(state) {
        // Basic type checking and validation
        if (typeof state.health !== 'number' || state.health < 0) {
            console.warn('Invalid health value, resetting to max');
            state.health = state.maxHealth || 100;
        }
        
        if (state.energy < 0) state.energy = 0;
        if (state.mana < 0) state.mana = 0;
        
        // Ensure stats are within bounds
        const stats = ['strength', 'intelligence', 'dexterity', 'luck'];
        stats.forEach(stat => {
            if (typeof state.stats[stat] !== 'number' || state.stats[stat] < 1) {
                state.stats[stat] = 10; // Default value
            }
        });
        
        return state;
    }
    
    // Game locations configuration
    getLocationsConfig() {
        return {
            'town-square': {
                name: 'Town Square',
                description: 'The bustling heart of the magical city. Wizards and adventurers gather here.',
                actions: [
                    { id: 'talk', name: 'Talk to Locals', icon: 'fa-comments', energy: 5, xp: 5 },
                    { id: 'gossip', name: 'Hear Gossip', icon: 'fa-comment-dots', energy: 3, xp: 3 }
                ]
            },
            'magic-shop': {
                name: 'Magic Shop',
                description: 'A shop filled with magical artifacts and ingredients.',
                actions: [
                    { id: 'buy-potions', name: 'Buy Potions', icon: 'fa-flask', energy: 2 },
                    { id: 'sell-items', name: 'Sell Items', icon: 'fa-coins', energy: 1 }
                ]
            },
            'tavern': {
                name: 'The Drunken Wizard',
                description: 'A cozy tavern where adventurers share stories and drinks.',
                actions: [
                    { id: 'drink-ale', name: 'Drink Ale', icon: 'fa-beer', cost: 5, energy: -10, health: -5, happiness: 10 },
                    { id: 'play-darts', name: 'Play Darts', icon: 'fa-bullseye', energy: 5, xp: 8 }
                ]
            },
            'alley': {
                name: 'Dark Alley',
                description: 'A shadowy backstreet where not everything is as it seems...',
                actions: [
                    { id: 'pickpocket', name: 'Pickpocket', icon: 'fa-hand-holding', energy: 10, risk: 'low', crime: 'pickpocket' },
                    { id: 'mug', name: 'Mug Someone', icon: 'fa-mask', energy: 20, risk: 'medium', crime: 'mugging' }
                ]
            }
        };
    }
    
    // Crimes configuration
    getCrimesConfig() {
        return [
            { 
                id: 'pickpocket', 
                name: 'Pickpocket', 
                minLevel: 1, 
                baseXp: 10, 
                baseCash: 5, 
                energy: 5, 
                successRate: 80,
                jailTime: 5 // in minutes
            },
            { 
                id: 'mugging', 
                name: 'Mugging', 
                minLevel: 3, 
                baseXp: 25, 
                baseCash: 15, 
                energy: 10, 
                successRate: 65,
                jailTime: 15
            },
            { 
                id: 'burglary', 
                name: 'Burglary', 
                minLevel: 5, 
                baseXp: 50, 
                baseCash: 40, 
                energy: 20, 
                successRate: 50,
                jailTime: 60
            },
            { 
                id: 'heist', 
                name: 'Bank Heist', 
                minLevel: 10, 
                baseXp: 100, 
                baseCash: 100, 
                energy: 50, 
                successRate: 30,
                jailTime: 240
            }
        ];
    }
    
    // Start the game loop
    startGameLoop() {
        setInterval(() => this.gameLoop(), this.settings.gameLoopInterval);
    }
    
    // Main game loop
    gameLoop() {
        try {
            this.performance.beginFrame();
            
            const now = Date.now();
            const deltaTime = (now - (this.state.state.lastUpdate || now)) / 1000; // in seconds
            
            // Update last update time
            this.state.update({ lastUpdate: now });
            
            // Regenerate energy
            this.regenerateEnergy(deltaTime);
            
            // Update UI
            this.updateUI();
            
            // Auto-save periodically
            if (now - (this.lastSaveTime || 0) > this.settings.autoSaveInterval) {
                this.saveGame();
            }
        } catch (error) {
            console.error('Error in game loop:', error);
            // Don't let game loop errors crash the entire game
        }
    }
    
    // Regenerate player energy
    regenerateEnergy(deltaTime) {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player) return;
            
            const player = currentState.player;
            if (player.energy < player.maxEnergy) {
                const newEnergy = Math.min(
                    player.maxEnergy,
                    player.energy + (this.settings.energyRegenRate * deltaTime)
                );
                
                this.state.update({
                    player: {
                        ...player,
                        energy: newEnergy
                    }
                });
            }
        } catch (error) {
            console.error('Error regenerating energy:', error);
        }
    }
    
    // Change player location
    changeLocation(locationId) {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.locations) return false;
            
            if (currentState.locations[locationId]) {
                this.state.update({
                    player: {
                        ...currentState.player,
                        location: locationId
                    }
                });
                this.showMessage(`You moved to ${currentState.locations[locationId].name}.`);
                this.updateUI();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error changing location:', error);
            return false;
        }
    }
    
    // Perform an action
    performAction(actionId) {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player || !currentState.locations) return false;
            
            const location = currentState.locations[currentState.player.location];
            if (!location) return false;
            
            const action = location.actions.find(a => a.id === actionId);
            
            if (!action) {
                this.showMessage("That action isn't available here.", 'error');
                return false;
            }
            
            // Check energy
            if (action.energy && currentState.player.energy < action.energy) {
                this.showMessage("You're too tired to do that right now.", 'warning');
                return false;
            }
            
            // Handle the action
            const updatedPlayer = { ...currentState.player };
            if (action.energy) {
                updatedPlayer.energy = Math.max(0, updatedPlayer.energy - action.energy);
            }
            updatedPlayer.lastAction = Date.now();
            
            // Process different action types
            if (action.xp) {
                this.addXP(action.xp);
            }
            
            if (action.crime) {
                this.commitCrime(action.crime);
            }
            
            this.state.update({ player: updatedPlayer });
            this.showMessage(`You ${action.name.toLowerCase()}.`);
            this.updateUI();
            return true;
        } catch (error) {
            console.error('Error performing action:', error);
            return false;
        }
    }
    
    // Add XP to player
    addXP(amount) {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player) return;
            
            const player = { ...currentState.player };
            player.xp += amount;
            
            if (player.xp >= player.nextLevelXp) {
                this.levelUp();
            } else {
                this.state.update({ player });
            }
        } catch (error) {
            console.error('Error adding XP:', error);
        }
    }
    
    // Level up the player
    levelUp() {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player) return;
            
            const player = { ...currentState.player };
            player.level++;
            player.xp -= player.nextLevelXp;
            player.nextLevelXp = Math.floor(player.nextLevelXp * 1.5);
            player.maxHealth += 10;
            player.health = player.maxHealth;
            player.maxEnergy += 5;
            player.energy = player.maxEnergy;
            player.maxMana += 10;
            player.mana = player.maxMana;
            
            this.state.update({ player });
            this.showMessage(`Level up! You are now level ${player.level}!`, 'success');
        } catch (error) {
            console.error('Error leveling up:', error);
        }
    }
    
    // Commit a crime
    commitCrime(crimeId) {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player || !currentState.crimes) return false;
            
            const crime = currentState.crimes.find(c => c.id === crimeId);
            if (!crime) return false;
            
            // Check success
            const success = Math.random() * 100 < crime.successRate;
            
            const player = { ...currentState.player };
            
            if (success) {
                // Success
                const goldEarned = crime.baseCash * (0.8 + Math.random() * 0.4); // 80-120% of base
                player.gold += Math.floor(goldEarned);
                
                // Increase crime XP
                player.crimes.experience += crime.baseXp;
                
                this.state.update({ player });
                this.addXP(crime.baseXp);
                this.checkCrimeLevelUp();
                
                this.showMessage(`Success! You stole ${Math.floor(goldEarned)} gold.`, 'success');
            } else {
                // Failed - go to jail
                this.showMessage(`You were caught! Sentenced to ${crime.jailTime} minutes in jail.`, 'error');
                player.energy = 0;
                this.state.update({ player });
                // Implement jail time logic here
            }
            
            return success;
        } catch (error) {
            console.error('Error committing crime:', error);
            return false;
        }
    }
    
    // Check if player leveled up in crime
    checkCrimeLevelUp() {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player) return;
            
            const player = { ...currentState.player };
            if (player.crimes.experience >= player.crimes.nextLevelXp) {
                player.crimes.level++;
                player.crimes.experience -= player.crimes.nextLevelXp;
                player.crimes.nextLevelXp = Math.floor(player.crimes.nextLevelXp * 1.5);
                player.crimes.successRate = Math.min(95, player.crimes.successRate + 2);
                
                this.state.update({ player });
                this.showMessage(`Your criminal reputation increased to level ${player.crimes.level}!`, 'success');
            }
        } catch (error) {
            console.error('Error checking crime level up:', error);
        }
    }
    
    // Save game to localStorage
    saveGame() {
        try {
            const currentState = this.state.state;
            if (!currentState || !currentState.player) {
                console.warn('Cannot save: invalid game state');
                return false;
            }
            
            const saveData = {
                player: currentState.player,
                timestamp: Date.now(),
                version: this.settings.version
            };
            
            const saveString = JSON.stringify(saveData);
            if (saveString.length > this.settings.maxSaveSize) {
                console.error('Save data too large');
                return false;
            }
            
            localStorage.setItem(this.settings.saveKey, saveString);
            this.lastSaveTime = Date.now();
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }
    
    // Load game from localStorage
    loadGame() {
        try {
            const saveData = localStorage.getItem(this.settings.saveKey);
            if (saveData) {
                const parsed = JSON.parse(saveData);
                
                // Merge saved player data with initial state
                const savedPlayer = this.validatePlayerState(parsed.player);
                this.state.update({
                    player: { ...this.getInitialPlayerState(), ...savedPlayer }
                });
                
                this.lastSaveTime = parsed.timestamp || Date.now();
                this.showMessage('Game loaded successfully!', 'success');
                return true;
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
        this.lastSaveTime = Date.now();
        return false;
    }
    
    // Show a message in the game log
    showMessage(message, type = 'info') {
        // This will be implemented in the UI module
        if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
            // Use UI module if available but don't spam notifications
            if (type === 'error' || type === 'warning') {
                UI.showNotification(message, type);
            }
        }
        
        // Always log to console
        console.log(`[${type}] ${message}`);
    }
    
    // Update the UI
    updateUI() {
        try {
            // Update player UI if Player module exists
            if (typeof Player !== 'undefined' && typeof Player.updateUI === 'function') {
                Player.updateUI();
            }
            
            // Update game UI if available
            if (typeof GameUI !== 'undefined' && typeof GameUI.update === 'function') {
                GameUI.update(this.state.state);
            }
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Will be set up by the UI module
    }
}

// Error boundary for game initialization
function withErrorBoundary(gameInstance) {
    const originalMethods = {};
    const methodsToWrap = ['update', 'saveGame', 'loadGame'];
    
    methodsToWrap.forEach(methodName => {
        if (typeof gameInstance[methodName] === 'function') {
            originalMethods[methodName] = gameInstance[methodName].bind(gameInstance);
            gameInstance[methodName] = (...args) => {
                try {
                    return originalMethods[methodName](...args);
                } catch (error) {
                    console.error(`Error in ${methodName}:`, error);
                    gameInstance.handleFatalError(error);
                    throw error; // Re-throw to allow caller to handle if needed
                }
            };
        }
    });
    
    return gameInstance;
}

// Create a singleton instance with error boundary
const gameInstance = withErrorBoundary(new GameCore());

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        GameCore,
        game: gameInstance
    };
}

// For browser global
if (typeof window !== 'undefined') {
    window.WizardCity = window.WizardCity || {};
    window.WizardCity.Game = gameInstance;
}

// Add global error handler
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error);
        if (window.WizardCity?.Game) {
            window.WizardCity.Game.handleFatalError(event.error);
        }
        // Prevent the default error handler
        event.preventDefault();
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        if (window.WizardCity?.Game) {
            window.WizardCity.Game.handleFatalError(event.reason);
        }
        // Prevent the default handler
        event.preventDefault();
    });
}

// Make available globally
window.GameCore = GameCore;

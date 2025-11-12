/**
 * Game UI Integration Module
 * Connects the game core to the UI components
 */

class GameUI {
    constructor(gameCore) {
        this.game = gameCore;
        this.uiElements = {};
        this.isInitialized = false;
        this.stateSubscriptions = [];
        
        // Bind methods
        this.init = this.init.bind(this);
        this.update = this.update.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.cleanup = this.cleanup.bind(this);
    }
    
    /**
     * Initialize the game UI
     */
    init() {
        if (this.isInitialized) return;
        
        try {
            // Cache DOM elements
            this.cacheElements();
            
            // Set up initial UI state
            this.updateLoadingState(true);
            
            // Subscribe to game state changes
            this.setupStateSubscriptions();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize any UI components
            this.initializeComponents();
            
            // Initial UI update
            this.update(this.game.state.state);
            
            this.isInitialized = true;
            console.log('Game UI initialized');
            
            // Hide loading state after a short delay
            setTimeout(() => this.updateLoadingState(false), 500);
            
        } catch (error) {
            console.error('Failed to initialize Game UI:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.uiElements = {
            // Main containers
            gameContainer: document.getElementById('game-container'),
            loadingScreen: document.getElementById('loading-screen'),
            errorScreen: document.getElementById('error-screen'),
            
            // Player info
            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            healthBar: document.getElementById('health-bar'),
            manaBar: document.getElementById('mana-bar'),
            energyBar: document.getElementById('energy-bar'),
            xpBar: document.getElementById('xp-bar'),
            goldDisplay: document.getElementById('gold-display'),
            
            // Game areas
            locationName: document.getElementById('location-name'),
            locationDescription: document.getElementById('location-description'),
            actionButtons: document.getElementById('action-buttons'),
            gameLog: document.getElementById('game-log'),
            
            // Navigation
            locationList: document.getElementById('location-list'),
            
            // Modals
            inventoryModal: document.getElementById('inventory-modal'),
            statsModal: document.getElementById('stats-modal')
        };
    }
    
    /**
     * Set up subscriptions to game state changes
     */
    setupStateSubscriptions() {
        // Clear any existing subscriptions
        this.cleanup();
        
        // Subscribe to player state changes
        const playerUnsubscribe = this.game.state.subscribe((state) => {
            this.updatePlayerUI(state.player);
            this.updateLocationUI(state);
            this.updateGameLog(state);
        });
        
        // Store unsubscribe functions
        this.stateSubscriptions.push(playerUnsubscribe);
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Location navigation
        if (this.uiElements.locationList) {
            this.uiElements.locationList.addEventListener('click', (e) => {
                const locationBtn = e.target.closest('[data-location]');
                if (locationBtn) {
                    const locationId = locationBtn.dataset.location;
                    this.game.moveToLocation(locationId);
                }
            });
        }
        
        // Action buttons
        if (this.uiElements.actionButtons) {
            this.uiElements.actionButtons.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (actionBtn) {
                    const actionId = actionBtn.dataset.action;
                    this.game.performAction(actionId);
                }
            });
        }
        
        // Global error handling
        window.addEventListener('game:error', (e) => {
            this.handleError(e.detail.error);
        });
    }
    
    /**
     * Update the UI based on game state
     * @param {Object} state - The current game state
     */
    update(state) {
        if (!state) return;
        
        try {
            // Update player info
            if (state.player) {
                this.updatePlayerUI(state.player);
            }
            
            // Update location and actions
            if (state.locations && state.player?.location) {
                this.updateLocationUI(state);
            }
            
            // Update game log
            if (state.gameLog) {
                this.updateGameLog(state);
            }
            
        } catch (error) {
            console.error('Error updating UI:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Update player-related UI elements
     * @param {Object} player - The player state
     */
    updatePlayerUI(player) {
        const { playerName, playerLevel, healthBar, manaBar, energyBar, xpBar, goldDisplay } = this.uiElements;
        
        if (playerName) playerName.textContent = player.name;
        if (playerLevel) playerLevel.textContent = `Level ${player.level}`;
        
        // Update health bar
        if (healthBar) {
            const healthPercent = (player.health / player.maxHealth) * 100;
            healthBar.style.width = `${Math.max(0, Math.min(100, healthPercent))}%`;
            healthBar.setAttribute('aria-valuenow', player.health);
            healthBar.setAttribute('aria-valuemax', player.maxHealth);
        }
        
        // Update mana bar
        if (manaBar) {
            const manaPercent = (player.mana / player.maxMana) * 100;
            manaBar.style.width = `${Math.max(0, Math.min(100, manaPercent))}%`;
        }
        
        // Update energy bar
        if (energyBar) {
            const energyPercent = (player.energy / player.maxEnergy) * 100;
            energyBar.style.width = `${Math.max(0, Math.min(100, energyPercent))}%`;
        }
        
        // Update XP bar
        if (xpBar) {
            const xpPercent = (player.xp / player.nextLevelXp) * 100;
            xpBar.style.width = `${Math.max(0, Math.min(100, xpPercent))}%`;
        }
        
        // Update gold display
        if (goldDisplay) {
            goldDisplay.textContent = player.gold.toLocaleString();
        }
    }
    
    /**
     * Update location and action buttons
     * @param {Object} state - The current game state
     */
    updateLocationUI(state) {
        const { locationName, locationDescription, actionButtons } = this.uiElements;
        const currentLocation = state.locations[state.player.location];
        
        if (!currentLocation) return;
        
        // Update location info
        if (locationName) locationName.textContent = currentLocation.name;
        if (locationDescription) locationDescription.textContent = currentLocation.description;
        
        // Update action buttons
        if (actionButtons && Array.isArray(currentLocation.actions)) {
            actionButtons.innerHTML = currentLocation.actions
                .map(action => `
                    <button class="btn btn-action" data-action="${action.id}">
                        <i class="fas ${action.icon || 'fa-question'}"></i>
                        ${action.name}
                        ${action.energy ? `<span class="energy-cost">${action.energy}E</span>` : ''}
                    </button>
                `)
                .join('');
        }
    }
    
    /**
     * Update the game log
     * @param {Object} state - The current game state
     */
    updateGameLog(state) {
        const { gameLog } = this.uiElements;
        if (!gameLog || !Array.isArray(state.gameLog)) return;
        
        // Only update if there are new entries
        const currentLength = gameLog.children.length;
        if (currentLength === state.gameLog.length) return;
        
        // Add new entries
        for (let i = currentLength; i < state.gameLog.length; i++) {
            const entry = state.gameLog[i];
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${entry.type || 'info'}`;
            logEntry.innerHTML = `
                <span class="log-time">[${new Date(entry.timestamp).toLocaleTimeString()}]</span>
                <span class="log-message">${entry.message}</span>
            `;
            gameLog.appendChild(logEntry);
        }
        
        // Auto-scroll to bottom
        gameLog.scrollTop = gameLog.scrollHeight;
    }
    
    /**
     * Update loading state
     * @param {boolean} isLoading - Whether the game is loading
     */
    updateLoadingState(isLoading) {
        const { loadingScreen } = this.uiElements;
        if (!loadingScreen) return;
        
        if (isLoading) {
            loadingScreen.classList.remove('hidden');
        } else {
            loadingScreen.classList.add('hidden');
        }
    }
    
    /**
     * Handle errors in the UI
     * @param {Error} error - The error to handle
     */
    handleError(error) {
        console.error('UI Error:', error);
        
        // Show error notification
        if (window.WizardUI?.showNotification) {
            window.WizardUI.showNotification(
                error.message || 'An error occurred',
                { type: 'error', duration: 10000 }
            );
        }
        
        // Show error screen if available
        const { errorScreen } = this.uiElements;
        if (errorScreen) {
            errorScreen.innerHTML = `
                <div class="error-content">
                    <h2>Oops! Something went wrong</h2>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button id="reload-button" class="btn btn-primary">Reload Game</button>
                    <div class="error-details">
                        <button class="btn btn-link" onclick="this.nextElementSibling.classList.toggle('show')">
                            Show Details
                        </button>
                        <pre>${error.stack || 'No stack trace available'}</pre>
                    </div>
                </div>
            `;
            
            errorScreen.classList.remove('hidden');
            
            // Add reload button handler
            const reloadBtn = errorScreen.querySelector('#reload-button');
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => window.location.reload());
            }
        }
    }
    
    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Initialize any third-party components here
        if (window.WizardUI?.init) {
            window.WizardUI.init();
        }
        
        // Initialize tooltips
        if (window.bootstrap && window.bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new window.bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }
    
    /**
     * Clean up event listeners and subscriptions
     */
    cleanup() {
        // Unsubscribe from all state updates
        this.stateSubscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.stateSubscriptions = [];
        
        // Remove any other event listeners here
    }
}

// Initialize the game UI when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make sure the game core is available
    if (window.WizardCity?.Game) {
        // Create and initialize the game UI
        const gameUI = new GameUI(window.WizardCity.Game);
        gameUI.init();
        
        // Make it available globally
        window.GameUI = gameUI;
        
        // Notify that the game is ready
        console.log('Game UI ready');
        
        // Dispatch a custom event that the game is ready
        window.dispatchEvent(new CustomEvent('game:ready'));
    } else {
        console.error('Game core not found. Make sure game-core.js is loaded before game-ui.js');
    }
});


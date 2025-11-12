/**
 * High Wizardry - Main Game File
 * Handles UI and game initialization
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI if available
    if (typeof WizardUI !== 'undefined') {
        WizardUI.init();
    }
    
    // Initialize the game
    const game = new GameCore();
    window.game = game; // Make game globally available for debugging
    
    // Set up UI event listeners
    setupEventListeners(game);
    
    // Initial UI update
    game.updateUI();
    
    // Show welcome message
    game.showMessage('Welcome to High Wizardry!', 'success');
});

/**
 * Set up all UI event listeners
 */
function setupEventListeners(game) {
    // Handle location buttons
    document.addEventListener('click', (e) => {
        // Location buttons
        if (e.target.closest('.location-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.location-btn');
            const locationId = btn.getAttribute('data-location');
            game.changeLocation(locationId);
        }
        
        // Action buttons
        if (e.target.closest('.action-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.action-btn');
            const actionId = btn.getAttribute('data-action');
            if (actionId) {
                game.performAction(actionId);
            }
        }
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Example: Space to rest (regain energy)
        if (e.code === 'Space') {
            e.preventDefault();
            game.showMessage('You take a moment to rest and catch your breath.');
            // Add energy restoration logic here
        }
    });
}

/**
 * UI Module - Handles all UI updates
 */
const GameUI = {
    // Update the entire UI based on game state
    update: function(state) {
        this.updatePlayerStats(state.player);
        this.updateLocation(state);
        this.updateActions(state);
        this.updateInventory(state.player);
    },
    
    // Update player stats display
    updatePlayerStats: function(player) {
        // Update basic info
        document.getElementById('player-name').textContent = player.name;
        document.getElementById('player-level').textContent = player.level;
        document.getElementById('player-xp').textContent = `${player.xp}/${player.nextLevelXp}`;
        
        // Update resource bars
        this.updateResourceBar('health', player.health, player.maxHealth);
        this.updateResourceBar('energy', player.energy, player.maxEnergy);
        this.updateResourceBar('mana', player.mana, player.maxMana);
        
        // Update currency
        document.getElementById('player-gold').textContent = player.gold;
        document.getElementById('player-silver').textContent = player.silver;
        document.getElementById('player-copper').textContent = player.copper;
    },
    
    // Update resource bar (health, energy, mana)
    updateResourceBar: function(type, current, max) {
        const percent = (current / max) * 100;
        const bar = document.getElementById(`${type}-bar`);
        const text = document.getElementById(`${type}-text`);
        
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.textContent = `${Math.ceil(current)}/${max}`;
    },
    
    // Update current location display
    updateLocation: function(state) {
        const location = state.locations[state.player.location];
        if (!location) return;
        
        // Update location info
        document.getElementById('location-name').textContent = location.name;
        document.getElementById('location-description').textContent = location.description;
        
        // Update active location button
        document.querySelectorAll('.location-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-location') === state.player.location);
        });
    },
    
    // Update available actions
    updateActions: function(state) {
        const location = state.locations[state.player.location];
        const container = document.getElementById('location-actions');
        
        if (!container) return;
        
        // Clear existing actions
        container.innerHTML = '';
        
        // Add new actions
        location.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.setAttribute('data-action', action.id);
            btn.innerHTML = `
                <i class="${action.icon || 'fa-question'}"></i>
                <span>${action.name}</span>
                ${action.energy ? `<span class="action-cost">${action.energy} <i class="fas fa-bolt"></i></span>` : ''}
            `;
            
            // Disable if not enough energy
            if (action.energy && action.energy > state.player.energy) {
                btn.disabled = true;
                btn.title = 'Not enough energy';
            }
            
            container.appendChild(btn);
        });
    },
    
    // Update inventory display
    updateInventory: function(player) {
        const container = document.getElementById('inventory-items');
        if (!container) return;
        
        // Clear existing items
        container.innerHTML = '';
        
        // Add items
        player.inventory.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.innerHTML = `
                <i class="${item.icon || 'fa-question'}"></i>
                <span>${item.name}</span>
                <span class="item-count">x${item.quantity || 1}</span>
            `;
            container.appendChild(itemEl);
        });
    }
};

// Make UI available globally
window.GameUI = GameUI;

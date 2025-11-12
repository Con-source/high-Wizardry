/**
 * High Wizardry - Core Game Module
 * Handles all game state and logic
 */

class GameCore {
    constructor() {
        this.state = {
            player: this.getInitialPlayerState(),
            locations: this.getLocationsConfig(),
            crimes: this.getCrimesConfig(),
            lastUpdate: Date.now()
        };
        
        // Game settings
        this.settings = {
            autoSaveInterval: 60000, // 1 minute
            gameLoopInterval: 1000,  // 1 second
            energyRegenRate: 1,     // Energy points per second
            saveKey: 'highWizardrySave'
        };
        
        // Initialize game systems
        this.setupEventListeners();
        this.loadGame();
    }
    
    // Initialize a new player state
    getInitialPlayerState() {
        return {
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
            lastAction: Date.now()
        };
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
        const now = Date.now();
        const deltaTime = (now - this.state.lastUpdate) / 1000; // in seconds
        this.state.lastUpdate = now;
        
        // Regenerate energy
        this.regenerateEnergy(deltaTime);
        
        // Update UI
        this.updateUI();
        
        // Auto-save periodically
        if (now - this.lastSaveTime > this.settings.autoSaveInterval) {
            this.saveGame();
        }
    }
    
    // Regenerate player energy
    regenerateEnergy(deltaTime) {
        if (this.state.player.energy < this.state.player.maxEnergy) {
            this.state.player.energy = Math.min(
                this.state.player.maxEnergy,
                this.state.player.energy + (this.settings.energyRegenRate * deltaTime)
            );
        }
    }
    
    // Change player location
    changeLocation(locationId) {
        if (this.state.locations[locationId]) {
            this.state.player.location = locationId;
            this.showMessage(`You moved to ${this.state.locations[locationId].name}.`);
            this.updateUI();
            return true;
        }
        return false;
    }
    
    // Perform an action
    performAction(actionId) {
        const location = this.state.locations[this.state.player.location];
        const action = location.actions.find(a => a.id === actionId);
        
        if (!action) {
            this.showMessage("That action isn't available here.", 'error');
            return false;
        }
        
        // Check energy
        if (this.state.player.energy < action.energy) {
            this.showMessage("You're too tired to do that right now.", 'warning');
            return false;
        }
        
        // Handle the action
        this.state.player.energy -= action.energy;
        this.state.player.lastAction = Date.now();
        
        // Process different action types
        if (action.xp) {
            this.addXP(action.xp);
        }
        
        if (action.crime) {
            this.commitCrime(action.crime);
        }
        
        this.showMessage(`You ${action.name.toLowerCase()}.`);
        this.updateUI();
        return true;
    }
    
    // Add XP to player
    addXP(amount) {
        this.state.player.xp += amount;
        if (this.state.player.xp >= this.state.player.nextLevelXp) {
            this.levelUp();
        }
    }
    
    // Level up the player
    levelUp() {
        this.state.player.level++;
        this.state.player.xp -= this.state.player.nextLevelXp;
        this.state.player.nextLevelXp = Math.floor(this.state.player.nextLevelXp * 1.5);
        this.state.player.maxHealth += 10;
        this.state.player.health = this.state.player.maxHealth;
        this.state.player.maxEnergy += 5;
        this.state.player.energy = this.state.player.maxEnergy;
        this.state.player.maxMana += 10;
        this.state.player.mana = this.state.player.maxMana;
        
        this.showMessage(`Level up! You are now level ${this.state.player.level}!`, 'success');
    }
    
    // Commit a crime
    commitCrime(crimeId) {
        const crime = this.state.crimes.find(c => c.id === crimeId);
        if (!crime) return false;
        
        // Check success
        const success = Math.random() * 100 < crime.successRate;
        
        if (success) {
            // Success
            const goldEarned = crime.baseCash * (0.8 + Math.random() * 0.4); // 80-120% of base
            this.state.player.gold += Math.floor(goldEarned);
            this.addXP(crime.baseXp);
            
            // Increase crime XP
            this.state.player.crimes.experience += crime.baseXp;
            this.checkCrimeLevelUp();
            
            this.showMessage(`Success! You stole ${Math.floor(goldEarned)} gold.`, 'success');
        } else {
            // Failed - go to jail
            this.showMessage(`You were caught! Sentenced to ${crime.jailTime} minutes in jail.`, 'error');
            this.state.player.energy = 0;
            // Implement jail time logic here
        }
        
        return success;
    }
    
    // Check if player leveled up in crime
    checkCrimeLevelUp() {
        if (this.state.player.crimes.experience >= this.state.player.crimes.nextLevelXp) {
            this.state.player.crimes.level++;
            this.state.player.crimes.experience -= this.state.player.crimes.nextLevelXp;
            this.state.player.crimes.nextLevelXp = Math.floor(this.state.player.crimes.nextLevelXp * 1.5);
            this.state.player.crimes.successRate = Math.min(95, this.state.player.crimes.successRate + 2);
            
            this.showMessage(`Your criminal reputation increased to level ${this.state.player.crimes.level}!`, 'success');
        }
    }
    
    // Save game to localStorage
    saveGame() {
        try {
            const saveData = {
                player: this.state.player,
                timestamp: Date.now()
            };
            localStorage.setItem(this.settings.saveKey, JSON.stringify(saveData));
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
                this.state.player = { ...this.getInitialPlayerState(), ...parsed.player };
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
        if (window.WizardUI) {
            window.WizardUI.showNotification(message, { type });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    // Update the UI
    updateUI() {
        // This will be implemented in the UI module
        if (window.GameUI) {
            window.GameUI.update(this.state);
        }
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Will be set up by the UI module
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = GameCore;
}

// Make available globally
window.GameCore = GameCore;

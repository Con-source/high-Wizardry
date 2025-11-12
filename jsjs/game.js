// Game State
const gameState = {
    player: {
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
    },
    
    locations: {
        'town-square': {
            name: 'Town Square',
            description: 'The bustling heart of the magical city. Wizards and adventurers gather here.',
            actions: [
                { id: 'talk', name: 'Talk to Locals', icon: 'fa-comments', cost: 5, energy: 5 },
                { id: 'gossip', name: 'Hear Gossip', icon: 'fa-comment-dots', cost: 10, energy: 3 }
            ]
        },
        'magic-shop': {
            name: 'Magic Shop',
            description: 'A shop filled with magical artifacts and ingredients.',
            actions: [
                { id: 'buy', name: 'Buy Items', icon: 'fa-shopping-cart', cost: 0, energy: 0 },
                { id: 'sell', name: 'Sell Items', icon: 'fa-coins', cost: 0, energy: 0 }
            ]
        },
        'tavern': {
            name: 'The Drunken Wizard',
            description: 'A cozy tavern where magical brews are served.',
            actions: [
                { id: 'drink', name: 'Order Drink', icon: 'fa-beer', cost: 15, energy: 0 },
                { id: 'gamble', name: 'Play Dice', icon: 'fa-dice', cost: 25, energy: 0 }
            ]
        },
        'library': {
            name: 'Arcane Library',
            description: 'Ancient tomes of forgotten knowledge line the walls.',
            actions: [
                { id: 'study', name: 'Study Spells', icon: 'fa-book', cost: 20, energy: 15 },
                { id: 'research', name: 'Research', icon: 'fa-scroll', cost: 30, energy: 20 }
            ]
        },
        'arena': {
            name: 'Dueling Arena',
            description: 'Test your magical prowess against others.',
            actions: [
                { id: 'duel', name: 'Duel Players', icon: 'fa-swords', cost: 0, energy: 30 },
                { id: 'watch', name: 'Watch Duels', icon: 'fa-eye', cost: 5, energy: 0 }
            ]
        },
        'alley': {
            name: 'Dark Alley',
            description: 'A shadowy place where illegal activities happen.',
            actions: [
                { id: 'pickpocket', name: 'Pickpocket', icon: 'fa-hand-holding-usd', cost: 0, energy: 10, crime: true },
                { id: 'mugging', name: 'Mugging', icon: 'fa-mask', cost: 0, energy: 20, crime: true },
                { id: 'heist', name: 'Bank Heist', icon: 'fa-vault', cost: 0, energy: 50, crime: true }
            ]
        }
    },
    
    items: {
        weapons: [
            { id: 'beginner-staff', name: 'Apprentice\'s Staff', type: 'weapon', damage: '2-5', value: 50, level: 1 },
            { id: 'wand-of-sparks', name: 'Wand of Sparks', type: 'weapon', damage: '3-7', value: 120, level: 3 },
            { id: 'crystal-ball', name: 'Crystal Ball', type: 'weapon', damage: '1-3', value: 200, level: 5 },
            { id: 'elder-staff', name: 'Elder Staff', type: 'weapon', damage: '5-10', value: 500, level: 10 },
            { id: 'staff-of-fire', name: 'Staff of Fire', type: 'weapon', damage: '8-15', value: 1000, level: 15 }
        ],
        armor: [
            { id: 'robe', name: 'Wizard\'s Robe', type: 'armor', defense: 5, value: 100, level: 1 },
            { id: 'leather-vest', name: 'Leather Vest', type: 'armor', defense: 3, value: 75, level: 1 },
            { id: 'enchanted-robe', name: 'Enchanted Robe', type: 'armor', defense: 10, value: 300, level: 5 },
            { id: 'dragon-scale', name: 'Dragon Scale Armor', type: 'armor', defense: 20, value: 1000, level: 15 }
        ],
        potions: [
            { id: 'health-potion', name: 'Health Potion', type: 'potion', effect: 'heal', value: 20, amount: 25, cost: 30 },
            { id: 'mana-potion', name: 'Mana Potion', type: 'potion', effect: 'restore_mana', value: 30, amount: 25, cost: 25 },
            { id: 'energy-potion', name: 'Energy Potion', type: 'potion', effect: 'restore_energy', value: 40, amount: 25, cost: 20 }
        ]
    },
    
    crimes: [
        { id: 'pickpocket', name: 'Pickpocket', minLevel: 1, baseXp: 10, baseCash: 5, energy: 5, successRate: 80 },
        { id: 'mugging', name: 'Mugging', minLevel: 3, baseXp: 25, baseCash: 15, energy: 10, successRate: 65 },
        { id: 'burglary', name: 'Burglary', minLevel: 5, baseXp: 50, baseCash: 40, energy: 20, successRate: 50 },
        { id: 'heist', name: 'Bank Heist', minLevel: 10, baseXp: 100, baseCash: 100, energy: 50, successRate: 30 }
    ],
    
    // Game loop for passive income and energy regen
    startGameLoop: function() {
        setInterval(() => {
            // Energy regeneration (1 per minute)
            if (this.player.energy < this.player.maxEnergy) {
                this.player.energy = Math.min(this.player.energy + 1, this.player.maxEnergy);
                this.updatePlayerStats();
            }
            
            // Passive income (1 gold per 5 minutes)
            const now = Date.now();
            if (now - this.player.lastAction > 300000) { // 5 minutes in milliseconds
                this.addMoney(1, 0, 0);
                this.player.lastAction = now;
            }
            
            // Update time-based elements
            this.updateTime();
            
        }, 60000); // Run every minute
    },
    
    // Currency conversion (100 copper = 1 silver, 100 silver = 1 gold)
    addMoney: function(gold, silver, copper) {
        this.player.copper += copper || 0;
        this.player.silver += silver || 0;
        this.player.gold += gold || 0;
        
        // Convert excess copper to silver
        this.player.silver += Math.floor(this.player.copper / 100);
        this.player.copper = this.player.copper % 100;
        
        // Convert excess silver to gold
        this.player.gold += Math.floor(this.player.silver / 100);
        this.player.silver = this.player.silver % 100;
        
        this.updatePlayerStats();
    },
    
    // Format money for display
    formatMoney: function() {
        return `${this.player.gold}<i class="fas fa-coins text-warning"></i> ${this.player.silver}<i class="fas fa-coins text-secondary"></i> ${this.player.copper}<i class="fas fa-coins text-danger"></i>`;
    },
    
    // Update player stats display
    updatePlayerStats: function() {
        document.getElementById('player-energy').style.width = `${(this.player.energy / this.player.maxEnergy) * 100}%`;
        document.getElementById('player-health').style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        document.getElementById('player-mana').style.width = `${(this.player.mana / this.player.maxMana) * 100}%`;
        document.getElementById('crime-xp').style.width = `${(this.player.crimes.experience / this.player.crimes.nextLevelXp) * 100}%`;
        
        document.getElementById('energy-text').textContent = `${this.player.energy}/${this.player.maxEnergy}`;
        document.getElementById('health-text').textContent = `${this.player.health}/${this.player.maxHealth}`;
        document.getElementById('mana-text').textContent = `${this.player.mana}/${this.player.maxMana}`;
        document.getElementById('money-amount').innerHTML = this.formatMoney();
        document.getElementById('crime-level').textContent = `Crime Lv. ${this.player.crimes.level}`;
        document.getElementById('crime-xp-text').textContent = `${this.player.crimes.experience}/${this.player.crimes.nextLevelXp} XP`;
    },
    
    // Change location
    changeLocation: function(locationId) {
        console.log('Attempting to change to location:', locationId);
        
        // Validate location exists
        if (!this.locations[locationId]) {
            console.error('Location not found:', locationId);
            return;
        }
        
        // Update player's current location
        this.player.location = locationId;
        const location = this.locations[locationId];
        
        console.log('Updating UI for location:', location);
        
        // Update location display
        const locationName = document.getElementById('location-name');
        const locationDesc = document.getElementById('location-description');
        
        if (locationName) locationName.textContent = location.name;
        if (locationDesc) locationDesc.textContent = location.description;
        
        // Update active location button
        try {
            document.querySelectorAll('.location-btn').forEach(btn => {
                if (btn.getAttribute('data-location') === locationId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } catch (e) {
            console.error('Error updating location buttons:', e);
        }
        
        // Update actions
        const actionsContainer = document.getElementById('location-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = '';
            
            if (location.actions && location.actions.length > 0) {
                location.actions.forEach(action => {
                    try {
                        const button = document.createElement('button');
                        button.className = 'btn btn-primary me-2 mb-2';
                        button.innerHTML = `<i class="fas ${action.icon || 'fa-question'} me-1"></i> ${action.name || 'Action'}`;
                        button.onclick = (e) => {
                            e.preventDefault();
                            this.performAction(action);
                        };
                        
                        // Add energy cost if applicable
                        if (action.energy > 0) {
                            button.innerHTML += ` <span class="badge bg-warning text-dark">${action.energy} <i class="fas fa-bolt"></i></span>`;
                            if (action.energy > this.player.energy) {
                                button.disabled = true;
                            }
                        }
                        
                        actionsContainer.appendChild(button);
                    } catch (e) {
                        console.error('Error creating action button:', e);
                    }
                });
            } else {
                actionsContainer.innerHTML = '<p>No actions available here.</p>';
            }
        } else {
            console.error('Actions container not found');
        }
        
        // Log the location change
        this.showMessage(`You have entered the ${location.name}.`);
        console.log('Location changed to:', location.name);
    },
    
    // Perform an action
    performAction: function(action) {
        // Check energy
        if (action.energy && action.energy > this.player.energy) {
            this.showMessage("Not enough energy!");
            return;
        }
        
        // Deduct energy
        if (action.energy) {
            this.player.energy -= action.energy;
        }
        
        // Handle different actions
        switch(action.id) {
            case 'talk':
                const messages = [
                    "The townsfolk whisper about a hidden treasure in the mountains.",
                    "A merchant mentions a rare artifact in the Magic Shop.",
                    "You overhear rumors of a powerful wizard looking for an apprentice.",
                    "A guard warns you about increased crime in the Dark Alley."
                ];
                this.showMessage(messages[Math.floor(Math.random() * messages.length)]);
                break;
                
            case 'gossip':
                this.showMessage("The local gossip is that the Magic Shop got a new shipment of rare items.");
                break;
                
            case 'drink':
                this.player.energy = Math.min(this.player.energy + 20, this.player.maxEnergy);
                this.showMessage("You drink a refreshing potion. Energy restored!");
                break;
                
            case 'gamble':
                const win = Math.random() > 0.5;
                if (win) {
                    const winnings = Math.floor(Math.random() * 50) + 10;
                    this.addMoney(0, 0, winnings);
                    this.showMessage(`You won ${winnings} copper in a game of dice!`);
                } else {
                    this.showMessage("You lost your bet at the tavern. Better luck next time!");
                }
                break;
                
            // Add more action handlers here
            
            default:
                if (action.crime) {
                    this.commitCrime(action.id);
                } else {
                    this.showMessage("Nothing interesting happens.");
                }
        }
        
        // Update UI
        this.updatePlayerStats();
    },
    
    // Commit a crime
    commitCrime: function(crimeId) {
        const crime = this.crimes.find(c => c.id === crimeId);
        if (!crime) return;
        
        // Check if player meets level requirement
        if (this.player.level < crime.minLevel) {
            this.showMessage(`You need to be at least level ${crime.minLevel} to attempt this crime.`);
            return;
        }
        
        // Calculate success
        const success = Math.random() * 100 < crime.successRate;
        
        if (success) {
            // Calculate rewards
            const xpGain = crime.baseXp + Math.floor(Math.random() * 10);
            const cashGain = crime.baseCash + Math.floor(Math.random() * 20);
            
            // Update player stats
            this.player.crimes.experience += xpGain;
            this.addMoney(0, 0, cashGain);
            
            // Check for level up
            this.checkCrimeLevelUp();
            
            this.showMessage(`Success! You gained ${xpGain} crime XP and ${cashGain} copper.`);
        } else {
            // Failed crime - chance of getting caught
            if (Math.random() < 0.3) {
                const damage = Math.floor(Math.random() * 10) + 5;
                this.player.health = Math.max(1, this.player.health - damage);
                this.showMessage(`You were caught! Lost ${damage} health.`);
            } else {
                this.showMessage("You failed but managed to escape!");
            }
        }
    },
    
    // Check if player leveled up in crime
    checkCrimeLevelUp: function() {
        if (this.player.crimes.experience >= this.player.crimes.nextLevelXp) {
            this.player.crimes.level++;
            this.player.crimes.experience -= this.player.crimes.nextLevelXp;
            this.player.crimes.nextLevelXp = Math.floor(this.player.crimes.nextLevelXp * 1.5);
            this.showMessage(`Crime level up! You are now level ${this.player.crimes.level} in crime.`);
        }
    },
    
    // Show a message in the game log
    showMessage: function(message) {
        const log = document.getElementById('game-log');
        const messageElement = document.createElement('div');
        messageElement.className = 'log-message';
        messageElement.innerHTML = `[${this.getFormattedTime()}] ${message}`;
        log.insertBefore(messageElement, log.firstChild);
        
        // Limit log length
        if (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
    },
    
    // Get formatted time (HH:MM:SS)
    getFormattedTime: function() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false });
    },
    
    // Update time display
    updateTime: function() {
        document.getElementById('game-time').textContent = new Date().toLocaleTimeString();
    },
    
        // Initialize the game
    init: function() {
        // Set up event listeners
        document.querySelectorAll('.location-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const locationId = btn.getAttribute('data-location');
                console.log('Changing to location:', locationId);
                this.changeLocation(locationId);
            });
        });
        
        // Initialize player stats display
        this.updatePlayerStats();
        
        // Set initial location
        this.changeLocation('town-square');
        
        // Start game loop
        this.startGameLoop();
        
        // Welcome message
        this.showMessage("Welcome to High Wizardry! The game is now running in real-time.");
        this.showMessage("Click on different locations to explore and perform actions.");
        
        console.log('Game initialized');
    }
};

// Start the game when the page loads
window.onload = function() {
    gameState.init();
};

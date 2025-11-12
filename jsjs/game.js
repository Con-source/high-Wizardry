// Game State
const gameState = {
    // Player Stats
    player: {
        name: 'Apprentice',
        level: 1,
        xp: 0,
        xpToNext: 1000,
        energy: 100,
        maxEnergy: 100,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        gold: 1000,
        silver: 0,
        copper: 0,
        bank: {
            gold: 0,
            silver: 0,
            copper: 0,
            interestRate: 0.02, // 2% daily interest
            lastInterest: Date.now()
        },
        stats: {
            strength: 10,
            intelligence: 15,    // Primary for wizards
            dexterity: 12,
            constitution: 12,
            luck: 10,
            crimeXp: 0,
            crimeLevel: 1,
            crimeXpToNext: 1000,
            respect: 0,
            totalRespect: 0
        },
        inventory: [],
        equipment: {
            weapon: null,
            armor: null,
            accessory1: null,
            accessory2: null,
            spellbook: null
        },
        skills: {
            alchemy: { level: 1, xp: 0 },
            enchanting: { level: 1, xp: 0 },
            herbalism: { level: 1, xp: 0 },
            darkArts: { level: 1, xp: 0 },
            divination: { level: 1, xp: 0 }
        },
        lastAction: Date.now(),
        cooldowns: {},
        jailed: false,
        jailTime: 0
    },

    // Game Economy
    economy: {
        inflation: 1.0, // Multiplier for prices
        lastInflationUpdate: Date.now(),
        marketItems: {}, // Player market listings
        priceHistory: {}, // Track price changes
        globalMoneySupply: 1000000,
        lastEconomicUpdate: Date.now()
    },

    // Game Time
    gameTime: {
        lastUpdate: Date.now(),
        day: 1,
        hour: 0,
        minute: 0
    },

    // Initialize the game
    init: function() {
        this.setupEventListeners();
        this.startGameLoop();
        this.loadGame();
        this.updateUI();
        this.showMessage("Welcome to High Wizardry! The game is now running in real-time.");
    },

    // Game Loop
    gameLoop: null,
    startGameLoop: function() {
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, 1000); // Update every second
    },

    // Update game state
    updateGame: function() {
        const now = Date.now();
        const deltaTime = (now - this.gameTime.lastUpdate) / 1000; // in seconds
        this.gameTime.lastUpdate = now;

        // Update energy (1 per minute)
        if (now - this.player.lastEnergyUpdate >= 60000) {
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 1);
            this.player.lastEnergyUpdate = now;
        }

        // Update mana (regenerate 5% per minute)
        if (now - this.player.lastManaUpdate >= 60000) {
            this.player.mana = Math.min(this.player.maxMana, 
                this.player.mana + Math.ceil(this.player.maxMana * 0.05));
            this.player.lastManaUpdate = now;
        }

        // Update jail time
        if (this.player.jailed && this.player.jailTime > 0) {
            this.player.jailTime -= deltaTime;
            if (this.player.jailTime <= 0) {
                this.player.jailed = false;
                this.showMessage("You have been released from jail!");
            }
        }

        // Update economy (every hour)
        if (now - this.economy.lastEconomicUpdate >= 3600000) {
            this.updateEconomy();
            this.economy.lastEconomicUpdate = now;
        }

        // Calculate interest (once per day)
        if (now - this.player.bank.lastInterest >= 86400000) {
            this.calculateInterest();
            this.player.bank.lastInterest = now;
        }

        this.updateUI();
    },

    // Economic System
    updateEconomy: function() {
        // Adjust inflation based on money supply
        const targetInflation = 1.0 + (Math.random() * 0.02 - 0.01); // Small random change
        this.economy.inflation = this.economy.inflation * 0.9 + targetInflation * 0.1;
        
        // Update item prices based on demand
        for (const itemId in itemsDB) {
            if (!this.economy.priceHistory[itemId]) {
                this.economy.priceHistory[itemId] = [];
            }
            
            // Simulate price changes based on demand
            const basePrice = itemsDB[itemId].baseValue || 10;
            const demand = 0.8 + Math.random() * 0.4; // Random demand fluctuation
            const newPrice = Math.ceil(basePrice * this.economy.inflation * demand);
            
            this.economy.priceHistory[itemId].push(newPrice);
            if (this.economy.priceHistory[itemId].length > 24) {
                this.economy.priceHistory[itemId].shift();
            }
            
            itemsDB[itemId].currentPrice = newPrice;
        }
        
        // Update global money supply
        this.economy.globalMoneySupply *= 1.0001; // Slight increase over time
    },

    // Banking System
    calculateInterest: function() {
        const bankTotal = this.player.bank.gold * 10000 + this.player.bank.silver * 100 + this.player.bank.copper;
        const interest = Math.floor(bankTotal * this.player.bank.interestRate);
        
        if (interest > 0) {
            this.addMoney(0, 0, interest, 'bank');
            this.showMessage([You earned ${this.formatMoney(0, 0, interest)} in interest!](cci:1://file:///C:/Users/kirat/CascadeProjects/game.js:157:4-160:5));
        }
    },

    // Format money for display
    formatMoney: function(gold, silver, copper) {
        // Convert all to copper first
        let totalCopper = copper + (silver * 100) + (gold * 10000);
        
        // Convert back to gold, silver, copper
        const g = Math.floor(totalCopper / 10000);
        totalCopper %= 10000;
        const s = Math.floor(totalCopper / 100);
        const c = totalCopper % 100;
        
        return `${g}<i class="fas fa-coins text-warning"></i> ${s}<i class="fas fa-coins text-secondary"></i> ${c}<i class="fas fa-coins text-danger"></i>`;
    },

    // Add money to player (can specify where: 'hand' or 'bank')
    addMoney: function(gold, silver, copper, location = 'hand') {
        const target = location === 'bank' ? this.player.bank : this.player;
        
        // Add to the appropriate location
        target.copper += copper || 0;
        target.silver += silver || 0;
        target.gold += gold || 0;
        
        // Handle overflow
        this.normalizeCurrency(target);
        
        // Update UI
        this.updatePlayerStats();
        return true;
    },

    // Remove money from player (returns false if not enough)
    removeMoney: function(gold, silver, copper, location = 'hand') {
        const source = location === 'bank' ? this.player.bank : this.player;
        
        // Convert all to copper to check
        const totalNeeded = copper + (silver * 100) + (gold * 10000);
        const totalHave = source.copper + (source.silver * 100) + (source.gold * 10000);
        
        if (totalHave < totalNeeded) {
            return false; // Not enough money
        }
        
        // Convert all to copper and subtract
        let remaining = totalHave - totalNeeded;
        
        // Convert back to gold, silver, copper
        source.gold = Math.floor(remaining / 10000);
        remaining %= 10000;
        source.silver = Math.floor(remaining / 100);
        source.copper = remaining % 100;
        
        // Update UI
        this.updatePlayerStats();
        return true;
    },

    // Normalize currency (handle overflow)
    normalizeCurrency: function(currency) {
        // Convert excess copper to silver
        const extraSilver = Math.floor(currency.copper / 100);
        currency.silver += extraSilver;
        currency.copper %= 100;
        
        // Convert excess silver to gold
        const extraGold = Math.floor(currency.silver / 100);
        currency.gold += extraGold;
        currency.silver %= 100;
    },

    // Show message in game log
    showMessage: function(message, type = 'info') {
        const log = document.getElementById('game-log');
        const messageElement = document.createElement('div');
        messageElement.className = `log-message log-${type}`;
        messageElement.innerHTML = [[${this.getFormattedTime()}] ${message}](cci:1://file:///C:/Users/kirat/CascadeProjects/game.js:340:4-344:5);
        log.insertBefore(messageElement, log.firstChild);
        
        // Limit log length
        if (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
        
        // Auto-scroll to bottom
        log.scrollTop = log.scrollHeight;
    },

    // Get formatted time (HH:MM:SS)
    getFormattedTime: function() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // Update UI elements
    updateUI: function() {
        // Update player stats
        document.getElementById('energy-text').textContent = `${this.player.energy}/${this.player.maxEnergy}`;
        document.getElementById('health-text').textContent = `${this.player.health}/${this.player.maxHealth}`;
        document.getElementById('mana-text').textContent = `${this.player.mana}/${this.player.maxMana}`;
        
        // Update progress bars
        document.getElementById('player-energy').style.width = `${(this.player.energy / this.player.maxEnergy) * 100}%`;
        document.getElementById('player-health').style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        document.getElementById('player-mana').style.width = `${(this.player.mana / this.player.maxMana) * 100}%`;
        
        // Update money display
        document.getElementById('money-amount').innerHTML = this.formatMoney(
            this.player.gold, 
            this.player.silver, 
            this.player.copper
        );
        
        // Update bank display if bank tab is open
        if (document.getElementById('bank-tab')?.classList.contains('active')) {
            document.getElementById('bank-amount').innerHTML = this.formatMoney(
                this.player.bank.gold,
                this.player.bank.silver,
                this.player.bank.copper
            );
        }
        
        // Update crime XP
        const crimeXpPercent = (this.player.stats.crimeXp / this.player.stats.crimeXpToNext) * 100;
        document.getElementById('crime-xp').style.width = `${crimeXpPercent}%`;
        document.getElementById('crime-xp-text').textContent = 
            `${this.player.stats.crimeXp}/${this.player.stats.crimeXpToNext} XP`;
        document.getElementById('crime-level').textContent = `Crime Lv. ${this.player.stats.crimeLevel}`;
        
        // Update game time
        document.getElementById('game-time').textContent = this.getFormattedTime();
    },

    // Save game to localStorage
    saveGame: function() {
        try {
            const saveData = {
                player: this.player,
                economy: this.economy,
                gameTime: this.gameTime,
                lastSave: Date.now()
            };
            localStorage.setItem('highWizardrySave', JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    },

    // Load game from localStorage
    loadGame: function() {
        try {
            const saveData = JSON.parse(localStorage.getItem('highWizardrySave'));
            if (saveData) {
                // Merge saved data with current state
                this.player = { ...this.player, ...saveData.player };
                this.economy = { ...this.economy, ...saveData.economy };
                this.gameTime = { ...this.gameTime, ...saveData.gameTime };
                
                // Calculate time passed since last save
                const timePassed = Date.now() - (saveData.lastSave || Date.now());
                const minutesPassed = Math.floor(timePassed / 60000);
                
                if (minutesPassed > 0) {
                    // Restore some energy based on time passed
                    const energyRestored = Math.min(
                        Math.floor(minutesPassed / 2), // 1 energy per 2 minutes
                        this.player.maxEnergy - this.player.energy
                    );
                    
                    if (energyRestored > 0) {
                        this.player.energy += energyRestored;
                        this.showMessage(`While you were away, you recovered ${energyRestored} energy.`);
                    }
                }
                
                this.showMessage("Game loaded successfully!");
                return true;
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
        return false;
    },

    // Setup event listeners
    setupEventListeners: function() {
        // Auto-save every 5 minutes
        setInterval(() => {
            if (this.saveGame()) {
                console.log('Game auto-saved');
            }
        }, 300000);
        
        // Add beforeunload handler
        window.addEventListener('beforeunload', () => {
            this.saveGame();
        });
    }
};

// Items Database (expanded)
const itemsDB = {
    // Weapons
    'beginner_staff': {
        id: 'beginner_staff',
        name: "Apprentice's Staff",
        type: 'weapon',
        damage: '2-5',
        speed: 'slow',
        value: 50,
        level: 1,
        rarity: 'common',
        durability: 100,
        maxDurability: 100,
        enchantments: []
    },
    
    'wand_of_sparks': {
        id: 'wand_of_sparks',
        name: "Wand of Sparks",
        type: 'weapon',
        damage: '3-7',
        speed: 'fast',
        value: 120,
        level: 3,
        rarity: 'uncommon',
        durability: 80,
        maxDurability: 80,
        enchantments: ['fire_damage_5']
    },
    
    // Armor
    'robe': {
        id: 'robe',
        name: "Wizard's Robe",
        type: 'armor',
        defense: 5,
        magicDefense: 8,
        value: 100,
        level: 1,
        rarity: 'common',
        durability: 100,
        maxDurability: 100,
        slot: 'chest'
    },
    
    'enchanted_robe': {
        id: 'enchanted_robe',
        name: "Enchanted Robe",
        type: 'armor',
        defense: 8,
        magicDefense: 12,
        value: 300,
        level: 5,
        rarity: 'uncommon',
        durability: 120,
        maxDurability: 120,
        slot: 'chest',
        enchantments: ['mana_regen_1']
    },
    
    // Potions
    'health_potion': {
        id: 'health_potion',
        name: "Health Potion",
        type: 'potion',
        effect: 'heal',
        value: 25,
        price: 30,
        rarity: 'common'
    },
    
    'mana_potion': {
        id: 'mana_potion',
        name: "Mana Potion",
        type: 'potion',
        effect: 'restore_mana',
        value: 30,
        price: 25,
        rarity: 'common'
    },
    
    // Ingredients
    'moon_herb': {
        id: 'moon_herb',
        name: "Moon Herb",
        type: 'ingredient',
        value: 5,
        rarity: 'common',
        alchemy: true
    },
    
    'phoenix_feather': {
        id: 'phoenix_feather',
        name: "Phoenix Feather",
        type: 'ingredient',
        value: 100,
        rarity: 'rare',
        alchemy: true,
        enchanting: true
    }
};

// Initialize the game when the page loads
window.onload = function() {
    gameState.init();
};

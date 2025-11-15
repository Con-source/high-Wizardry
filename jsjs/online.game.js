// Online Game State
const onlineGame = {
    // Server connection
    socket: null,
    playerId: null,
    sessionToken: null,
    serverTimeOffset: 0,
    lastPing: 0,
    pingInterval: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    // Game state
    players: {}, // Other players in the same location
    npcs: {},    // NPCs in the current location
    chat: {
        global: [],
        local: [],
        trade: [],
        guild: []
    },
    market: {
        items: [],
        lastUpdate: 0
    },

    // Initialize the online game
    init: function() {
        this.setupSocket();
        this.setupEventListeners();
        this.startGameLoop();
        this.showMessage("Connecting to High Wizardry Online...");
    },

    // Setup WebSocket connection
    setupSocket: function() {
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        this.socket = new WebSocket(protocol + window.location.host + '/ws');
        
        this.socket.onopen = () => this.onSocketOpen();
        this.socket.onmessage = (e) => this.onSocketMessage(e);
        this.socket.onclose = () => this.onSocketClose();
        this.socket.onerror = (error) => this.onSocketError(error);
    },

    // Socket event handlers
    onSocketOpen: function() {
        this.reconnectAttempts = 0;
        this.showMessage("Connected to High Wizardry Online!");
        
        // Start ping interval (every 30 seconds)
        this.pingInterval = setInterval(() => this.sendPing(), 30000);
        
        // Authenticate if we have a session token
        if (this.sessionToken) {
            this.authenticate(this.sessionToken);
        } else {
            // Show login/register screen
            this.showLoginScreen();
        }
    },

    onSocketMessage: function(event) {
        try {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
        } catch (e) {
            console.error('Error parsing server message:', e);
        }
    },

    onSocketClose: function() {
        this.showMessage("Disconnected from server. Attempting to reconnect...");
        this.attemptReconnect();
    },

    onSocketError: function(error) {
        console.error('WebSocket error:', error);
    },

    // Reconnect logic
    attemptReconnect: function() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
            
            this.showMessage(`Reconnecting in ${delay/1000} seconds... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.setupSocket();
            }, delay);
        } else {
            this.showMessage("Failed to connect to server. Please check your connection and refresh the page.", 'error');
        }
    },

    // Send ping to server
    sendPing: function() {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.lastPing = Date.now();
            this.sendToServer({ type: 'ping' });
        }
    },

    // Send message to server
    sendToServer: function(message) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return true;
        }
        return false;
    },

    // Handle incoming server messages
    handleServerMessage: function(message) {
        switch (message.type) {
            case 'pong':
                this.serverTimeOffset = Date.now() - message.serverTime - ((Date.now() - this.lastPing) / 2);
                break;
                
            case 'auth_success':
                this.handleAuthSuccess(message);
                break;
                
            case 'player_update':
                this.handlePlayerUpdate(message);
                break;
                
            case 'location_update':
                this.handleLocationUpdate(message);
                break;
                
            case 'chat_message':
                this.handleChatMessage(message);
                break;
                
            case 'market_update':
                this.handleMarketUpdate(message);
                break;
                
            case 'error':
                this.showMessage(`Error: ${message.message}`, 'error');
                break;
        }
    },

    // Authentication
    authenticate: function(token) {
        this.sessionToken = token;
        this.sendToServer({
            type: 'authenticate',
            token: token
        });
    },

    handleAuthSuccess: function(message) {
        this.playerId = message.playerId;
        this.playerData = message.playerData;
        
        // Save session token to localStorage
        localStorage.setItem('wizardToken', this.sessionToken);
        
        // Update UI
        this.updatePlayerInfo();
        this.showGameScreen();
    },

    // Player actions
    moveToLocation: function(locationId) {
        this.sendToServer({
            type: 'move',
            locationId: locationId
        });
    },

    sendChatMessage: function(channel, message) {
        if (message.trim() === '') return;
        
        this.sendToServer({
            type: 'chat',
            channel: channel,
            message: message
        });
    },

    // Market functions
    listItemOnMarket: function(itemId, price, quantity = 1) {
        this.sendToServer({
            type: 'market_list',
            itemId: itemId,
            price: price,
            quantity: quantity
        });
    },

    buyFromMarket: function(listingId) {
        this.sendToServer({
            type: 'market_buy',
            listingId: listingId
        });
    },

    // Game loop
    gameLoop: null,
    startGameLoop: function() {
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, 1000 / 30); // 30 FPS
    },

    updateGame: function() {
        // Update animations, timers, etc.
        this.updateUI();
    },

    // UI functions
    showMessage: function(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        // Add to game log
        const log = document.getElementById('game-log');
        if (log) {
            const messageElement = document.createElement('div');
            messageElement.className = `log-message log-${type}`;
            messageElement.textContent = `[${this.getFormattedTime()}] ${message}`;
            log.appendChild(messageElement);
            log.scrollTop = log.scrollHeight;
        }
    },

    updatePlayerInfo: function() {
        if (!this.playerData) return;
        
        // Update player stats display
        document.getElementById('player-name').textContent = this.playerData.name;
        document.getElementById('player-level').textContent = `Level ${this.playerData.level}`;
        
        // Handle currency display
        const currencyEl = document.getElementById('player-currency');
        if (currencyEl) {
            const shillings = this.playerData.shillings || 0;
            const pennies = this.playerData.pennies || 0;
            currencyEl.textContent = `${shillings}/${pennies}`;
        }
        
        // Update health bar
        const healthPercent = (this.playerData.health / this.playerData.maxHealth) * 100;
        document.getElementById('health-bar').style.width = `${healthPercent}%`;
        document.getElementById('health-text').textContent = 
            `${Math.ceil(this.playerData.health)}/${this.playerData.maxHealth}`;
            
        // Update mana bar
        const manaPercent = (this.playerData.mana / this.playerData.maxMana) * 100;
        document.getElementById('mana-bar').style.width = `${manaPercent}%`;
        document.getElementById('mana-text').textContent = 
            `${Math.ceil(this.playerData.mana)}/${this.playerData.maxMana}`;
            
        // Update energy
        document.getElementById('energy-text').textContent = 
            `${this.playerData.energy}/${this.playerData.maxEnergy}`;
    },

    // Helper functions
    getFormattedTime: function() {
        const now = new Date(Date.now() + this.serverTimeOffset);
        return now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    },

    // UI screens
    showLoginScreen: function() {
        // Show login/register form
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('game-screen').style.display = 'none';
    },

    showGameScreen: function() {
        // Show main game screen
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
    },

    // Event handlers
    setupEventListeners: function() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const isLogin = document.getElementById('login-tab').classList.contains('active');
            
            this.sendToServer({
                type: isLogin ? 'login' : 'register',
                username: username,
                password: password
            });
        });
        
        // Chat input
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = e.target.value.trim();
                if (message) {
                    this.sendChatMessage('global', message);
                    e.target.value = '';
                }
            }
        });
    }
};

// Initialize the game when the page loads
window.onload = function() {
    onlineGame.init();
};

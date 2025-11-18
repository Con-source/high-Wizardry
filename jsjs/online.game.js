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
        this.updateConnectionStatus('connecting', 'connecting');
        this.setupSocket();
        this.setupEventListeners();
        this.startGameLoop();
        this.showMessage("Connecting to High Wizardry Online...");
    },

    // Setup WebSocket connection
    setupSocket: function() {
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const host = window.location.host || 'localhost:8080';
        this.socket = new WebSocket(protocol + host);
        
        this.socket.onopen = () => this.onSocketOpen();
        this.socket.onmessage = (e) => this.onSocketMessage(e);
        this.socket.onclose = () => this.onSocketClose();
        this.socket.onerror = (error) => this.onSocketError(error);
    },

    // Socket event handlers
    onSocketOpen: function() {
        this.reconnectAttempts = 0;
        this.showMessage("Connected to High Wizardry Online!");
        this.updateConnectionStatus('connected', 'connected');
        
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
        this.updateConnectionStatus('disconnected', 'disconnected');
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
            case 'connected':
                console.log('Connected to server');
                this.handleConnected(message);
                break;
            
            case 'ping':
                // Respond to server ping
                this.sendToServer({ type: 'pong', clientTime: Date.now() });
                break;
            
            case 'pong':
                this.serverTimeOffset = Date.now() - message.serverTime - ((Date.now() - this.lastPing) / 2);
                break;
                
            case 'auth_success':
                this.handleAuthSuccess(message);
                break;
            
            case 'auth_failed':
                this.handleAuthFailed(message);
                break;
                
            case 'player_updated':
                this.handlePlayerUpdate(message);
                break;
            
            case 'player_connected':
                this.handlePlayerConnected(message);
                break;
            
            case 'player_disconnected':
                this.handlePlayerDisconnected(message);
                break;
                
            case 'location_changed':
                this.handleLocationUpdate(message);
                break;
            
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
            
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
                
            case 'chat_message':
                this.handleChatMessage(message);
                break;
            
            case 'action_result':
                this.handleActionResult(message);
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
        if (message.token) {
            this.sessionToken = message.token;
            localStorage.setItem('wizardToken', this.sessionToken);
        }
        
        // Update UI
        this.updatePlayerInfo();
        this.showGameScreen();
        this.showMessage('Successfully logged in!', 'success');
    },
    
    handleAuthFailed: function(message) {
        this.showMessage(message.message || 'Authentication failed', 'error');
        this.showLoginScreen();
    },
    
    handleConnected: function(message) {
        // Try to authenticate with saved token
        const savedToken = localStorage.getItem('wizardToken');
        if (savedToken) {
            this.authenticate(savedToken);
        } else {
            this.showLoginScreen();
        }
    },
    
    handlePlayerConnected: function(message) {
        this.showMessage(`${message.username} joined the game`, 'info');
    },
    
    handlePlayerDisconnected: function(message) {
        // Remove player from local players list
        if (this.players[message.playerId]) {
            delete this.players[message.playerId];
        }
    },
    
    handlePlayerJoined: function(message) {
        this.players[message.playerId] = message.playerData;
        this.showMessage(`${message.playerData.username} entered the area`, 'info');
        this.updatePlayerList();
    },
    
    handlePlayerLeft: function(message) {
        if (this.players[message.playerId]) {
            this.showMessage(`${this.players[message.playerId].username} left the area`, 'info');
            delete this.players[message.playerId];
            this.updatePlayerList();
        }
    },
    
    handleActionResult: function(message) {
        if (message.success) {
            this.showMessage('Action completed successfully', 'success');
            if (message.result) {
                console.log('Action result:', message.result);
            }
        } else {
            this.showMessage(message.message || 'Action failed', 'error');
        }
    },
    
    updatePlayerList: function() {
        // Update the UI to show other players in the same location
        const playerListEl = document.getElementById('online-players-list');
        if (!playerListEl) return;
        
        const playersInLocation = Object.values(this.players);
        
        if (playersInLocation.length === 0) {
            playerListEl.innerHTML = '<p class="text-muted small">No other players nearby</p>';
        } else {
            playerListEl.innerHTML = playersInLocation.map(player => `
                <div class="online-player-item mb-2 p-2 border rounded" style="background: var(--bg-tertiary);">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${player.username}</strong>
                            <span class="badge bg-success ms-2">Online</span>
                            <p class="text-muted small mb-0">Level ${player.level || 1}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }
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
        const loginScreen = document.getElementById('login-screen');
        const gameContainer = document.getElementById('game-container');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (gameContainer) gameContainer.style.display = 'none';
    },

    showGameScreen: function() {
        // Show main game screen
        const loginScreen = document.getElementById('login-screen');
        const gameContainer = document.getElementById('game-container');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'flex';
    },

    // Event handlers
    setupEventListeners: function() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;
                
                this.sendToServer({
                    type: 'login',
                    username: username,
                    password: password
                });
            });
        }
        
        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('register-username').value;
                const password = document.getElementById('register-password').value;
                const passwordConfirm = document.getElementById('register-password-confirm').value;
                
                if (password !== passwordConfirm) {
                    this.showMessage('Passwords do not match', 'error');
                    return;
                }
                
                this.sendToServer({
                    type: 'register',
                    username: username,
                    password: password
                });
            });
        }
        
        // Chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const message = e.target.value.trim();
                    if (message) {
                        this.sendChatMessage('global', message);
                        e.target.value = '';
                    }
                }
            });
        }
    },
    
    updateConnectionStatus: function(status, color) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            const colors = {
                'connected': 'bg-success',
                'connecting': 'bg-warning',
                'disconnected': 'bg-danger'
            };
            
            // Remove all color classes
            statusEl.className = 'badge me-2 ' + (colors[color] || 'bg-secondary');
            
            const messages = {
                'connected': 'Connected',
                'connecting': 'Connecting...',
                'disconnected': 'Disconnected'
            };
            
            statusEl.innerHTML = `<i class="fas fa-circle"></i> ${messages[status] || status}`;
        }
    }
};

// Note: onlineGame is now initialized from main.js
// Do not auto-initialize here to avoid conflicts
// window.onload = function() {
//     onlineGame.init();
// };

/**
 * High Wizardry - Main Server
 * Handles WebSocket connections, authentication, and game state synchronization
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const AuthManager = require('./auth/AuthManager');
const GameManager = require('./game/GameManager');
const PlayerManager = require('./game/PlayerManager');
const LocationManager = require('./game/LocationManager');

class HighWizardryServer {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Initialize managers
    this.authManager = new AuthManager();
    this.playerManager = new PlayerManager();
    this.locationManager = new LocationManager();
    this.gameManager = new GameManager(this.playerManager, this.locationManager);
    
    this.setupExpress();
    this.setupWebSocket();
  }
  
  setupExpress() {
    // Serve static files from the root directory
    this.app.use(express.static(path.join(__dirname, '..')));
    this.app.use(express.json());
    
    // API endpoints
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        players: this.playerManager.getPlayerCount(),
        uptime: process.uptime()
      });
    });
    
    // Default route - serve index.html
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'index.html'));
    });
  }
  
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('New client connected');
      
      // Set up client
      const client = {
        ws,
        id: null,
        playerId: null,
        authenticated: false,
        lastPing: Date.now()
      };
      
      // Send welcome message
      this.send(ws, {
        type: 'connected',
        serverTime: Date.now()
      });
      
      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(client, data);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.send(ws, {
            type: 'error',
            message: 'Invalid message format'
          });
        }
      });
      
      // Handle disconnect
      ws.on('close', () => {
        console.log('Client disconnected');
        if (client.playerId) {
          this.playerManager.removePlayer(client.playerId);
          this.locationManager.removePlayer(client.playerId);
          
          // Notify other players
          this.broadcast({
            type: 'player_disconnected',
            playerId: client.playerId
          });
        }
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    // Set up heartbeat interval
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        this.send(ws, { type: 'ping', serverTime: Date.now() });
      });
    }, 30000);
  }
  
  handleMessage(client, data) {
    const { type } = data;
    
    // Handle pong response
    if (type === 'pong') {
      client.ws.isAlive = true;
      client.lastPing = Date.now();
      return;
    }
    
    // Handle authentication
    if (type === 'authenticate' || type === 'login' || type === 'register') {
      this.handleAuth(client, data);
      return;
    }
    
    // Require authentication for all other messages
    if (!client.authenticated) {
      this.send(client.ws, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }
    
    // Route authenticated messages
    switch (type) {
      case 'player_update':
        this.handlePlayerUpdate(client, data);
        break;
      case 'move':
      case 'change_location':
        this.handleLocationChange(client, data);
        break;
      case 'chat':
        this.handleChat(client, data);
        break;
      case 'action':
        this.handleAction(client, data);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }
  
  handleAuth(client, data) {
    const { type, username, password, token } = data;
    
    if (type === 'register') {
      // Register new user
      const result = this.authManager.register(username, password);
      if (result.success) {
        client.authenticated = true;
        client.playerId = result.playerId;
        
        // Create player state
        const playerData = this.playerManager.createPlayer(result.playerId, username);
        
        this.send(client.ws, {
          type: 'auth_success',
          playerId: result.playerId,
          token: result.token,
          playerData
        });
        
        // Notify other players
        this.broadcast({
          type: 'player_connected',
          playerId: result.playerId,
          username
        }, client.playerId);
      } else {
        this.send(client.ws, {
          type: 'auth_failed',
          message: result.message
        });
      }
    } else if (type === 'login') {
      // Login existing user
      const result = this.authManager.login(username, password);
      if (result.success) {
        client.authenticated = true;
        client.playerId = result.playerId;
        
        // Load or create player state
        let playerData = this.playerManager.getPlayer(result.playerId);
        if (!playerData) {
          playerData = this.playerManager.createPlayer(result.playerId, username);
        }
        
        this.send(client.ws, {
          type: 'auth_success',
          playerId: result.playerId,
          token: result.token,
          playerData
        });
        
        // Notify other players
        this.broadcast({
          type: 'player_connected',
          playerId: result.playerId,
          username
        }, client.playerId);
      } else {
        this.send(client.ws, {
          type: 'auth_failed',
          message: result.message
        });
      }
    } else if (type === 'authenticate' && token) {
      // Authenticate with token
      const result = this.authManager.validateToken(token);
      if (result.success) {
        client.authenticated = true;
        client.playerId = result.playerId;
        
        // Load player state
        let playerData = this.playerManager.getPlayer(result.playerId);
        if (!playerData) {
          playerData = this.playerManager.createPlayer(result.playerId, result.username);
        }
        
        this.send(client.ws, {
          type: 'auth_success',
          playerId: result.playerId,
          playerData
        });
        
        // Notify other players
        this.broadcast({
          type: 'player_connected',
          playerId: result.playerId,
          username: result.username
        }, client.playerId);
      } else {
        this.send(client.ws, {
          type: 'auth_failed',
          message: 'Invalid token'
        });
      }
    }
  }
  
  handlePlayerUpdate(client, data) {
    const { updates } = data;
    
    // Validate updates on server
    const validatedUpdates = this.gameManager.validatePlayerUpdate(client.playerId, updates);
    
    // Update player state
    this.playerManager.updatePlayer(client.playerId, validatedUpdates);
    
    // Broadcast to other players in same location
    const player = this.playerManager.getPlayer(client.playerId);
    if (player) {
      this.broadcastToLocation(player.location, {
        type: 'player_updated',
        playerId: client.playerId,
        updates: validatedUpdates
      }, client.playerId);
    }
  }
  
  handleLocationChange(client, data) {
    const { locationId } = data;
    
    // Validate location change
    if (!this.locationManager.isValidLocation(locationId)) {
      this.send(client.ws, {
        type: 'error',
        message: 'Invalid location'
      });
      return;
    }
    
    const player = this.playerManager.getPlayer(client.playerId);
    if (!player) return;
    
    const oldLocation = player.location;
    
    // Update player location
    this.playerManager.updatePlayer(client.playerId, { location: locationId });
    this.locationManager.movePlayer(client.playerId, oldLocation, locationId);
    
    // Notify player of successful move
    const playersInLocation = this.locationManager.getPlayersInLocation(locationId);
    this.send(client.ws, {
      type: 'location_changed',
      locationId,
      players: playersInLocation.map(pid => this.playerManager.getPlayer(pid))
    });
    
    // Notify old location
    this.broadcastToLocation(oldLocation, {
      type: 'player_left',
      playerId: client.playerId
    }, client.playerId);
    
    // Notify new location
    this.broadcastToLocation(locationId, {
      type: 'player_joined',
      playerId: client.playerId,
      playerData: this.playerManager.getPlayer(client.playerId)
    }, client.playerId);
  }
  
  handleChat(client, data) {
    const { channel, message } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const chatMessage = {
      type: 'chat_message',
      channel,
      from: player.username,
      playerId: client.playerId,
      message,
      timestamp: Date.now()
    };
    
    if (channel === 'global') {
      this.broadcast(chatMessage);
    } else if (channel === 'local') {
      this.broadcastToLocation(player.location, chatMessage);
    }
  }
  
  handleAction(client, data) {
    const { actionType, actionData } = data;
    
    // Process action on server and validate
    const result = this.gameManager.processAction(client.playerId, actionType, actionData);
    
    if (result.success) {
      // Send result to client
      this.send(client.ws, {
        type: 'action_result',
        success: true,
        result: result.data
      });
      
      // Update player state
      if (result.playerUpdates) {
        this.playerManager.updatePlayer(client.playerId, result.playerUpdates);
        
        // Notify player of updates
        this.send(client.ws, {
          type: 'player_updated',
          updates: result.playerUpdates
        });
      }
    } else {
      this.send(client.ws, {
        type: 'action_result',
        success: false,
        message: result.message
      });
    }
  }
  
  send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
  
  broadcast(data, excludePlayerId = null) {
    this.wss.clients.forEach((client) => {
      // Skip excluded player
      if (excludePlayerId && client.playerId === excludePlayerId) {
        return;
      }
      
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
  
  broadcastToLocation(locationId, data, excludePlayerId = null) {
    const playersInLocation = this.locationManager.getPlayersInLocation(locationId);
    
    this.wss.clients.forEach((client) => {
      if (client.playerId && 
          playersInLocation.includes(client.playerId) && 
          client.playerId !== excludePlayerId &&
          client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
  
  start() {
    this.server.listen(this.port, () => {
      console.log(`High Wizardry server running on port ${this.port}`);
      console.log(`Visit http://localhost:${this.port} to play`);
    });
  }
}

// Start server
const port = process.env.PORT || 8080;
const server = new HighWizardryServer(port);
server.start();

module.exports = HighWizardryServer;

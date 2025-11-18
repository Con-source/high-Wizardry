/**
 * High Wizardry - Main Server
 * Handles WebSocket connections, authentication, and game state synchronization
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const rateLimit = require('express-rate-limit');
const AuthManager = require('./auth/AuthManager');
const GameManager = require('./game/GameManager');
const PlayerManager = require('./game/PlayerManager');
const LocationManager = require('./game/LocationManager');
const RateLimiter = require('./utils/RateLimiter');

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
    
    // Initialize rate limiters
    this.authLimiter = new RateLimiter(5, 60000); // 5 auth attempts per minute
    this.actionLimiter = new RateLimiter(20, 10000); // 20 actions per 10 seconds
    this.chatLimiter = new RateLimiter(10, 10000); // 10 messages per 10 seconds
    
    // Clean up rate limiters every 5 minutes
    setInterval(() => {
      this.authLimiter.cleanup();
      this.actionLimiter.cleanup();
      this.chatLimiter.cleanup();
    }, 5 * 60 * 1000);
    
    this.setupExpress();
    this.setupWebSocket();
  }
  
  setupExpress() {
    // Serve static files from the root directory
    this.app.use(express.static(path.join(__dirname, '..')));
    this.app.use(express.json());
    
    // Rate limiter for HTTP endpoints
    this.httpLimiter = new RateLimiter(100, 60000); // 100 requests per minute per IP
    
    // Apply rate limiting middleware
    this.app.use((req, res, next) => {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!this.httpLimiter.isAllowed(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      next();
    });
    
    // Route-specific rate limiter for static file serving (addresses CodeQL alert)
    const staticFileLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests for static files. Please try again later.',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
    
    // API endpoints
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        players: this.playerManager.getPlayerCount(),
        uptime: process.uptime()
      });
    });
    
    // Default route - serve index.html with explicit rate limiting
    this.app.get('/', staticFileLimiter, (req, res) => {
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
    
    // Rate limit authentication attempts
    const clientKey = client.playerId || 'anon_' + Date.now();
    if (!this.authLimiter.isAllowed(clientKey)) {
      this.send(client.ws, {
        type: 'error',
        message: 'Too many authentication attempts. Please try again later.'
      });
      return;
    }
    
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
    // Rate limit chat messages
    if (!this.chatLimiter.isAllowed(client.playerId)) {
      this.send(client.ws, {
        type: 'error',
        message: 'You are sending messages too quickly. Please slow down.'
      });
      return;
    }
    
    const { channel, message } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    // Sanitize message (basic XSS prevention)
    const sanitizedMessage = message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .substring(0, 500); // Max 500 characters
    
    const chatMessage = {
      type: 'chat_message',
      channel,
      from: player.username,
      playerId: client.playerId,
      message: sanitizedMessage,
      timestamp: Date.now()
    };
    
    if (channel === 'global') {
      this.broadcast(chatMessage);
    } else if (channel === 'local') {
      this.broadcastToLocation(player.location, chatMessage);
    }
  }
  
  handleAction(client, data) {
    // Rate limit actions
    if (!this.actionLimiter.isAllowed(client.playerId)) {
      this.send(client.ws, {
        type: 'error',
        message: 'You are performing actions too quickly. Please slow down.'
      });
      return;
    }
    
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

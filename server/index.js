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
const EventDispatcher = require('./game/EventDispatcher');
const TradeManager = require('./game/TradeManager');
const AuctionManager = require('./game/AuctionManager');
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
    this.eventDispatcher = new EventDispatcher(this.playerManager, this.locationManager);
    this.tradeManager = new TradeManager(this.playerManager);
    this.auctionManager = new AuctionManager(this.playerManager);
    this.gameManager = new GameManager(this.playerManager, this.locationManager, this.eventDispatcher);
    
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
    
    // Clean up stale trades every 5 minutes
    setInterval(() => {
      this.tradeManager.cleanupStaleTrades();
    }, 5 * 60 * 1000);
    
    // Set up auction notification callback
    this.auctionManager.setNotificationCallback((notifications) => {
      notifications.forEach(notification => {
        if (notification.type === 'auction_closed' && notification.auction) {
          const auction = notification.auction;
          // Notify seller
          const sellerClient = this.getClientByPlayerId(auction.sellerId);
          if (sellerClient) {
            this.send(sellerClient.ws, {
              type: 'auction_closed',
              auction,
              role: 'seller'
            });
          }
          // Notify winner
          if (auction.winnerId) {
            const winnerClient = this.getClientByPlayerId(auction.winnerId);
            if (winnerClient) {
              this.send(winnerClient.ws, {
                type: 'auction_closed',
                auction,
                role: 'winner'
              });
            }
          }
        }
      });
    });
    
    // Set up event dispatcher handlers
    this.eventDispatcher.setHandlers(
      // Broadcast to all
      (data) => this.broadcast(data),
      // Broadcast to location
      (locationId, data) => this.broadcastToLocation(locationId, data),
      // Send to specific player
      (playerId, data) => {
        const client = this.getClientByPlayerId(playerId);
        if (client) {
          this.send(client.ws, data);
        }
      }
    );
    
    // Initialize demo events
    this.eventDispatcher.initializeDemoEvents();
    
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

    // Route-specific rate limiter for verify-email endpoint
    const verifyEmailLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 5, // Limit each IP to 5 requests per minute to avoid brute force
      message: 'Too many verification attempts. Please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    // API endpoints
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        players: this.playerManager.getPlayerCount(),
        uptime: process.uptime()
      });
    });
    
    // Password reset request endpoint
    this.app.post('/api/auth/request-reset', async (req, res) => {
      const { usernameOrEmail } = req.body;
      const result = await this.authManager.requestPasswordReset(usernameOrEmail);
      res.json(result);
    });
    
    // Password reset completion endpoint
    this.app.post('/api/auth/reset-password', async (req, res) => {
      const { token, newPassword } = req.body;
      const result = await this.authManager.resetPassword(token, newPassword);
      res.json(result);
    });
    
    // Email verification endpoint
    this.app.post('/api/auth/verify-email', verifyEmailLimiter, async (req, res) => {
      const { username, code } = req.body;
      const result = await this.authManager.verifyEmail(username, code);
      res.json(result);
    });
    
    // Resend verification endpoint
    this.app.post('/api/auth/resend-verification', async (req, res) => {
      const { username } = req.body;
      const result = await this.authManager.resendVerificationEmail(username);
      res.json(result);
    });
    
    // Event management endpoints (admin)
    this.app.get('/api/events/periodic', (req, res) => {
      const events = this.eventDispatcher.getPeriodicEvents();
      res.json({ success: true, events });
    });
    
    this.app.get('/api/events/history', (req, res) => {
      const limit = parseInt(req.query.limit) || 20;
      const history = this.eventDispatcher.getEventHistory(limit);
      res.json({ success: true, history });
    });
    
    this.app.post('/api/events/inject', (req, res) => {
      const { event } = req.body;
      if (!event || !event.name || !event.scope) {
        return res.status(400).json({ success: false, message: 'Invalid event data' });
      }
      const result = this.eventDispatcher.injectEvent(event);
      res.json(result);
    });
    
    // Trade endpoints
    this.app.get('/api/trades/history', (req, res) => {
      // TODO: Add authentication middleware
      const playerId = req.query.playerId;
      const limit = parseInt(req.query.limit) || 20;
      
      if (!playerId) {
        return res.status(400).json({ success: false, message: 'Player ID required' });
      }
      
      const history = this.tradeManager.getPlayerTradeHistory(playerId, limit);
      res.json({ success: true, history });
    });
    
    // Auction endpoints
    this.app.get('/api/auctions/active', (req, res) => {
      const filters = {
        scope: req.query.scope,
        locationId: req.query.locationId,
        guildId: req.query.guildId,
        itemType: req.query.itemType
      };
      
      const auctions = this.auctionManager.getActiveAuctions(filters);
      res.json({ success: true, auctions });
    });
    
    this.app.get('/api/auctions/player', (req, res) => {
      const playerId = req.query.playerId;
      
      if (!playerId) {
        return res.status(400).json({ success: false, message: 'Player ID required' });
      }
      
      const auctions = this.auctionManager.getPlayerAuctions(playerId);
      const bids = this.auctionManager.getPlayerBids(playerId);
      
      res.json({ success: true, auctions, bids });
    });
    
    this.app.get('/api/auctions/history', (req, res) => {
      const playerId = req.query.playerId;
      const limit = parseInt(req.query.limit) || 20;
      
      if (!playerId) {
        return res.status(400).json({ success: false, message: 'Player ID required' });
      }
      
      const history = this.auctionManager.getPlayerAuctionHistory(playerId, limit);
      res.json({ success: true, history });
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
    
    // Allow password reset requests without authentication
    if (type === 'request_password_reset' || type === 'reset_password') {
      if (type === 'request_password_reset') {
        this.handlePasswordResetRequest(client, data);
      } else {
        this.handlePasswordReset(client, data);
      }
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
      case 'verify_email':
        this.handleEmailVerification(client, data);
        break;
      case 'resend_verification':
        this.handleResendVerification(client, data);
        break;
      case 'add_email':
        this.handleAddEmail(client, data);
        break;
      case 'request_password_reset':
        this.handlePasswordResetRequest(client, data);
        break;
      case 'reset_password':
        this.handlePasswordReset(client, data);
        break;
      case 'subscribe_events':
        this.handleEventSubscription(client, data);
        break;
      case 'unsubscribe_events':
        this.handleEventUnsubscription(client, data);
        break;
      // Trade messages
      case 'trade_propose':
        this.handleTradePropose(client, data);
        break;
      case 'trade_update_offer':
        this.handleTradeUpdateOffer(client, data);
        break;
      case 'trade_confirm':
        this.handleTradeConfirm(client, data);
        break;
      case 'trade_cancel':
        this.handleTradeCancel(client, data);
        break;
      case 'trade_get':
        this.handleTradeGet(client, data);
        break;
      // Auction messages
      case 'auction_create':
        this.handleAuctionCreate(client, data);
        break;
      case 'auction_bid':
        this.handleAuctionBid(client, data);
        break;
      case 'auction_cancel':
        this.handleAuctionCancel(client, data);
        break;
      case 'auction_get':
        this.handleAuctionGet(client, data);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }
  
  // BUGFIX: Made async to properly await authentication calls and prevent race conditions
  async handleAuth(client, data) {
    const { type, username, password, token, email } = data;
    
    // Rate limit authentication attempts
    const clientKey = client.playerId || 'anon_' + Date.now();
    if (!this.authLimiter.isAllowed(clientKey)) {
      this.send(client.ws, {
        type: 'error',
        message: 'Too many authentication attempts. Please try again later.'
      });
      return;
    }
    
    try {
      if (type === 'register') {
        // Register new user - BUGFIX: Now using await for consistency
        const result = await this.authManager.register(username, password, email);
        
        if (result.success) {
          client.authenticated = true;
          client.playerId = result.playerId;
          
          // Create player state
          const playerData = this.playerManager.createPlayer(result.playerId, username);
          
          // BUGFIX: Standardized auth_success response with all required fields
          this.send(client.ws, {
            type: 'auth_success',
            playerId: result.playerId,
            username: username,
            token: result.token,
            playerData,
            emailVerified: result.emailVerified,
            needsEmailVerification: result.needsEmailVerification || false,
            needsEmailSetup: false, // New registrations always have email or explicitly no email
            muted: false,
            banned: false
          });
          
          // BUGFIX: Only broadcast player_connected AFTER successful auth AND when email verification
          // is not required or already complete (prevents race condition)
          if (!result.needsEmailVerification) {
            this.broadcast({
              type: 'player_connected',
              playerId: result.playerId,
              username
            }, client.playerId);
          }
        } else {
          // BUGFIX: Standardized auth_failed response
          this.send(client.ws, {
            type: 'auth_failed',
            playerId: null,
            username: null,
            playerData: null,
            token: null,
            needsEmailVerification: false,
            needsEmailSetup: false,
            muted: false,
            banned: false,
            message: result.message
          });
        }
      } else if (type === 'login') {
        // Login existing user - BUGFIX: Now using await for consistency
        const result = await this.authManager.login(username, password);
        
        if (result.success) {
          client.authenticated = true;
          client.playerId = result.playerId;
          
          // Load or create player state
          let playerData = this.playerManager.getPlayer(result.playerId);
          if (!playerData) {
            playerData = this.playerManager.createPlayer(result.playerId, result.username);
          }
          
          // BUGFIX: Standardized auth_success response with all required fields
          this.send(client.ws, {
            type: 'auth_success',
            playerId: result.playerId,
            username: result.username,
            token: result.token,
            playerData,
            emailVerified: result.emailVerified || false,
            needsEmailVerification: false, // Already checked in login()
            needsEmailSetup: result.needsEmailSetup || false,
            muted: result.muted || false,
            banned: false // If banned, login would have failed
          });
          
          // BUGFIX: Only broadcast player_connected AFTER successful login (no email verification needed)
          this.broadcast({
            type: 'player_connected',
            playerId: result.playerId,
            username: result.username
          }, client.playerId);
        } else {
          // BUGFIX: Standardized auth_failed response
          this.send(client.ws, {
            type: 'auth_failed',
            playerId: null,
            username: null,
            playerData: null,
            token: null,
            needsEmailVerification: result.needsEmailVerification || false,
            needsEmailSetup: false,
            muted: false,
            banned: result.message && result.message.includes('banned') || false,
            message: result.message
          });
        }
      } else if (type === 'authenticate' && token) {
        // Authenticate with token
        const result = this.authManager.validateToken(token);
        
        if (result.success) {
          // BUGFIX: Check user's current ban/mute status from user data
          const userData = this.authManager.getUserByPlayerId(result.playerId);
          
          if (!userData) {
            this.send(client.ws, {
              type: 'auth_failed',
              playerId: null,
              username: null,
              playerData: null,
              token: null,
              needsEmailVerification: false,
              needsEmailSetup: false,
              muted: false,
              banned: false,
              message: 'User not found'
            });
            return;
          }
          
          // BUGFIX: Check if user is banned
          if (userData.banned) {
            this.send(client.ws, {
              type: 'auth_failed',
              playerId: null,
              username: null,
              playerData: null,
              token: null,
              needsEmailVerification: false,
              needsEmailSetup: false,
              muted: false,
              banned: true,
              message: 'Account has been banned. Please contact support.'
            });
            return;
          }
          
          client.authenticated = true;
          client.playerId = result.playerId;
          
          // Load player state
          let playerData = this.playerManager.getPlayer(result.playerId);
          if (!playerData) {
            playerData = this.playerManager.createPlayer(result.playerId, result.username);
          }
          
          // BUGFIX: Standardized auth_success response with all required fields including ban/mute status
          this.send(client.ws, {
            type: 'auth_success',
            playerId: result.playerId,
            username: result.username,
            token: token,
            playerData,
            emailVerified: userData.emailVerified || false,
            needsEmailVerification: false, // Token auth means already verified
            needsEmailSetup: !userData.email,
            muted: userData.muted || false,
            banned: false // Already checked above
          });
          
          // BUGFIX: Only broadcast player_connected AFTER token validation and ban check
          this.broadcast({
            type: 'player_connected',
            playerId: result.playerId,
            username: result.username
          }, client.playerId);
        } else {
          // BUGFIX: Standardized auth_failed response
          this.send(client.ws, {
            type: 'auth_failed',
            playerId: null,
            username: null,
            playerData: null,
            token: null,
            needsEmailVerification: false,
            needsEmailSetup: false,
            muted: false,
            banned: false,
            message: result.message || 'Invalid token'
          });
        }
      }
    } catch (error) {
      // BUGFIX: Proper error handling for async operations
      console.error('Authentication error:', error);
      this.send(client.ws, {
        type: 'auth_failed',
        playerId: null,
        username: null,
        playerData: null,
        token: null,
        needsEmailVerification: false,
        needsEmailSetup: false,
        muted: false,
        banned: false,
        message: 'Authentication failed due to server error'
      });
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
    
    // Check if user is muted
    if (this.authManager.isMuted(client.playerId)) {
      this.send(client.ws, {
        type: 'error',
        message: 'You are muted and cannot send messages.'
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
  
  // BUGFIX: Made async for consistent async handling
  async handleEmailVerification(client, data) {
    const { username, code } = data;
    
    try {
      const result = await this.authManager.verifyEmail(username, code);
      
      this.send(client.ws, {
        type: 'email_verification_result',
        success: result.success,
        message: result.message
      });
      
      // BUGFIX: After successful email verification, if user is authenticated, broadcast player_connected
      // This fixes the race condition where registration completes but broadcast was skipped due to pending verification
      if (result.success && client.authenticated && client.playerId) {
        const userData = this.authManager.getUserByPlayerId(client.playerId);
        if (userData && !userData.banned) {
          this.broadcast({
            type: 'player_connected',
            playerId: client.playerId,
            username: userData.username
          }, client.playerId);
        }
      }
    } catch (error) {
      console.error('Email verification error:', error);
      this.send(client.ws, {
        type: 'email_verification_result',
        success: false,
        message: 'Verification failed due to server error'
      });
    }
  }
  
  // BUGFIX: Made async for consistent async handling
  async handleResendVerification(client, data) {
    const { username } = data;
    
    try {
      const result = await this.authManager.resendVerificationEmail(username);
      this.send(client.ws, {
        type: 'resend_verification_result',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      this.send(client.ws, {
        type: 'resend_verification_result',
        success: false,
        message: 'Failed to resend verification code'
      });
    }
  }
  
  // BUGFIX: Made async for consistent async handling
  async handleAddEmail(client, data) {
    const { username, email } = data;
    
    try {
      const result = await this.authManager.addEmail(username, email);
      this.send(client.ws, {
        type: 'add_email_result',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Add email error:', error);
      this.send(client.ws, {
        type: 'add_email_result',
        success: false,
        message: 'Failed to add email'
      });
    }
  }
  
  // BUGFIX: Made async for consistent async handling
  async handlePasswordResetRequest(client, data) {
    const { usernameOrEmail } = data;
    
    try {
      const result = await this.authManager.requestPasswordReset(usernameOrEmail);
      this.send(client.ws, {
        type: 'password_reset_request_result',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      this.send(client.ws, {
        type: 'password_reset_request_result',
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }
  
  // BUGFIX: Made async for consistent async handling
  async handlePasswordReset(client, data) {
    const { token, newPassword } = data;
    
    try {
      const result = await this.authManager.resetPassword(token, newPassword);
      this.send(client.ws, {
        type: 'password_reset_result',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset error:', error);
      this.send(client.ws, {
        type: 'password_reset_result',
        success: false,
        message: 'Failed to reset password'
      });
    }
  }
  
  handleEventSubscription(client, data) {
    const { channel } = data;
    
    // For now, all authenticated clients automatically receive events
    // This handler is for future expansion (e.g., selective event channels)
    
    this.send(client.ws, {
      type: 'event_subscription_result',
      success: true,
      channel: channel || 'all',
      message: 'Subscribed to event notifications'
    });
  }
  
  handleEventUnsubscription(client, data) {
    const { channel } = data;
    
    this.send(client.ws, {
      type: 'event_unsubscription_result',
      success: true,
      channel: channel || 'all',
      message: 'Unsubscribed from event notifications'
    });
  }
  
  /**
   * Trade Handlers
   */
  handleTradePropose(client, data) {
    const { toPlayerId, offer } = data;
    
    const result = this.tradeManager.proposeTrade(client.playerId, toPlayerId, offer);
    
    this.send(client.ws, {
      type: 'trade_propose_result',
      success: result.success,
      trade: result.trade,
      message: result.message
    });
    
    // If successful, notify the other player
    if (result.success) {
      const otherClient = this.getClientByPlayerId(toPlayerId);
      if (otherClient) {
        this.send(otherClient.ws, {
          type: 'trade_invitation',
          trade: result.trade
        });
      }
    }
  }
  
  handleTradeUpdateOffer(client, data) {
    const { tradeId, offer } = data;
    
    const result = this.tradeManager.updateOffer(client.playerId, tradeId, offer);
    
    this.send(client.ws, {
      type: 'trade_update_result',
      success: result.success,
      trade: result.trade,
      message: result.message
    });
    
    // If successful, notify the other player
    if (result.success && result.trade) {
      const otherPlayerId = result.trade.fromPlayerId === client.playerId ? 
        result.trade.toPlayerId : result.trade.fromPlayerId;
      
      const otherClient = this.getClientByPlayerId(otherPlayerId);
      if (otherClient) {
        this.send(otherClient.ws, {
          type: 'trade_updated',
          trade: result.trade
        });
      }
    }
  }
  
  handleTradeConfirm(client, data) {
    const { tradeId } = data;
    
    const result = this.tradeManager.confirmTrade(client.playerId, tradeId);
    
    this.send(client.ws, {
      type: 'trade_confirm_result',
      success: result.success,
      trade: result.trade,
      message: result.message
    });
    
    // If successful, notify the other player
    if (result.success && result.trade) {
      const otherPlayerId = result.trade.fromPlayerId === client.playerId ? 
        result.trade.toPlayerId : result.trade.fromPlayerId;
      
      const otherClient = this.getClientByPlayerId(otherPlayerId);
      if (otherClient) {
        this.send(otherClient.ws, {
          type: 'trade_confirmed',
          trade: result.trade
        });
        
        // If trade is completed, update player data for both
        if (result.trade.status === 'completed') {
          // Update both players
          const fromPlayer = this.playerManager.getPlayer(result.trade.fromPlayerId);
          const toPlayer = this.playerManager.getPlayer(result.trade.toPlayerId);
          
          if (fromPlayer) {
            const fromClient = this.getClientByPlayerId(result.trade.fromPlayerId);
            if (fromClient) {
              this.send(fromClient.ws, {
                type: 'player_updated',
                playerId: result.trade.fromPlayerId,
                updates: fromPlayer
              });
            }
          }
          
          if (toPlayer) {
            const toClient = this.getClientByPlayerId(result.trade.toPlayerId);
            if (toClient) {
              this.send(toClient.ws, {
                type: 'player_updated',
                playerId: result.trade.toPlayerId,
                updates: toPlayer
              });
            }
          }
        }
      }
    }
  }
  
  handleTradeCancel(client, data) {
    const { tradeId } = data;
    
    const trade = this.tradeManager.getTrade(tradeId);
    const result = this.tradeManager.cancelTrade(client.playerId, tradeId);
    
    this.send(client.ws, {
      type: 'trade_cancel_result',
      success: result.success,
      message: result.message
    });
    
    // If successful, notify the other player
    if (result.success && trade) {
      const otherPlayerId = trade.fromPlayerId === client.playerId ? 
        trade.toPlayerId : trade.fromPlayerId;
      
      const otherClient = this.getClientByPlayerId(otherPlayerId);
      if (otherClient) {
        this.send(otherClient.ws, {
          type: 'trade_cancelled',
          tradeId: tradeId
        });
      }
    }
  }
  
  handleTradeGet(client, data) {
    const { tradeId } = data;
    
    if (tradeId) {
      const trade = this.tradeManager.getTrade(tradeId);
      this.send(client.ws, {
        type: 'trade_data',
        success: !!trade,
        trade: trade
      });
    } else {
      // Get active trade for player
      const trade = this.tradeManager.getPlayerActiveTrade(client.playerId);
      this.send(client.ws, {
        type: 'trade_data',
        success: !!trade,
        trade: trade
      });
    }
  }
  
  /**
   * Auction Handlers
   */
  handleAuctionCreate(client, data) {
    const { item, startingBid, duration, options } = data;
    
    const result = this.auctionManager.createAuction(
      client.playerId, 
      item, 
      startingBid, 
      duration, 
      options
    );
    
    this.send(client.ws, {
      type: 'auction_create_result',
      success: result.success,
      auction: result.auction,
      message: result.message
    });
    
    // If successful, broadcast new auction to all players
    if (result.success && result.auction) {
      this.broadcast({
        type: 'auction_new',
        auction: result.auction
      }, client.playerId);
      
      // Update player data
      const player = this.playerManager.getPlayer(client.playerId);
      if (player) {
        this.send(client.ws, {
          type: 'player_updated',
          playerId: client.playerId,
          updates: player
        });
      }
    }
  }
  
  handleAuctionBid(client, data) {
    const { auctionId, bidAmount } = data;
    
    const result = this.auctionManager.placeBid(client.playerId, auctionId, bidAmount);
    
    this.send(client.ws, {
      type: 'auction_bid_result',
      success: result.success,
      auction: result.auction,
      message: result.message
    });
    
    // If successful, broadcast bid update
    if (result.success && result.auction) {
      this.broadcast({
        type: 'auction_bid_placed',
        auction: result.auction
      });
      
      // Update bidder's player data
      const player = this.playerManager.getPlayer(client.playerId);
      if (player) {
        this.send(client.ws, {
          type: 'player_updated',
          playerId: client.playerId,
          updates: player
        });
      }
      
      // Notify previous bidder if any
      if (result.auction.bids.length > 1) {
        const previousBid = result.auction.bids[result.auction.bids.length - 2];
        const previousBidderClient = this.getClientByPlayerId(previousBid.bidderId);
        if (previousBidderClient) {
          this.send(previousBidderClient.ws, {
            type: 'auction_outbid',
            auction: result.auction
          });
          
          // Update previous bidder's player data
          const previousBidder = this.playerManager.getPlayer(previousBid.bidderId);
          if (previousBidder) {
            this.send(previousBidderClient.ws, {
              type: 'player_updated',
              playerId: previousBid.bidderId,
              updates: previousBidder
            });
          }
        }
      }
    }
  }
  
  handleAuctionCancel(client, data) {
    const { auctionId } = data;
    
    const result = this.auctionManager.cancelAuction(client.playerId, auctionId);
    
    this.send(client.ws, {
      type: 'auction_cancel_result',
      success: result.success,
      message: result.message
    });
    
    // If successful, broadcast cancellation
    if (result.success) {
      this.broadcast({
        type: 'auction_cancelled',
        auctionId: auctionId
      });
      
      // Update player data
      const player = this.playerManager.getPlayer(client.playerId);
      if (player) {
        this.send(client.ws, {
          type: 'player_updated',
          playerId: client.playerId,
          updates: player
        });
      }
    }
  }
  
  handleAuctionGet(client, data) {
    const { auctionId } = data;
    
    if (auctionId) {
      const auction = this.auctionManager.getAuction(auctionId);
      this.send(client.ws, {
        type: 'auction_data',
        success: !!auction,
        auction: auction
      });
    } else {
      // Get all active auctions
      const auctions = this.auctionManager.getActiveAuctions();
      this.send(client.ws, {
        type: 'auction_list',
        success: true,
        auctions: auctions
      });
    }
  }
  
  /**
   * Helper method to find a client by player ID
   */
  getClientByPlayerId(playerId) {
    for (const client of this.wss.clients) {
      if (client.playerId === playerId) {
        return client;
      }
    }
    return null;
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

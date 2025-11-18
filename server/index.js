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
const MessagingManager = require('./game/MessagingManager');
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
    this.messagingManager = new MessagingManager();
    this.eventDispatcher = new EventDispatcher(this.playerManager, this.locationManager);
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
    
    // Clean up messaging data every 24 hours
    setInterval(() => {
      this.messagingManager.cleanup();
    }, 24 * 60 * 60 * 1000);
    
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
    
    // Messaging API endpoints
    this.app.get('/api/messaging/chat-history', (req, res) => {
      const { channel, locationId, limit, offset } = req.query;
      const history = this.messagingManager.getChatHistory(
        channel, 
        locationId, 
        parseInt(limit) || 50, 
        parseInt(offset) || 0
      );
      res.json({ success: true, messages: history });
    });
    
    this.app.get('/api/messaging/mailbox/:username', (req, res) => {
      const { username } = req.params;
      const mailbox = this.messagingManager.getMailbox(username);
      res.json({ success: true, mailbox });
    });
    
    this.app.get('/api/messaging/conversation', (req, res) => {
      const { user1, user2, limit } = req.query;
      const conversation = this.messagingManager.getConversation(
        user1, 
        user2, 
        parseInt(limit) || 50
      );
      res.json({ success: true, messages: conversation });
    });
    
    this.app.get('/api/messaging/forum/topics', (req, res) => {
      const { category, page, perPage } = req.query;
      const result = this.messagingManager.getForumTopics(
        category, 
        parseInt(page) || 1, 
        parseInt(perPage) || 20
      );
      res.json({ success: true, ...result });
    });
    
    this.app.get('/api/messaging/forum/topic/:topicId', (req, res) => {
      const { topicId } = req.params;
      const topic = this.messagingManager.getForumTopic(topicId);
      if (topic) {
        res.json({ success: true, topic });
      } else {
        res.status(404).json({ success: false, error: 'Topic not found' });
      }
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
      case 'chat_message':
        this.handleChat(client, data);
        break;
      case 'direct_message':
        this.handleDirectMessage(client, data);
        break;
      case 'send_mail':
        this.handleSendMail(client, data);
        break;
      case 'mark_mail_read':
        this.handleMarkMailRead(client, data);
        break;
      case 'delete_mail':
        this.handleDeleteMail(client, data);
        break;
      case 'create_forum_topic':
        this.handleCreateForumTopic(client, data);
        break;
      case 'forum_reply':
        this.handleForumReply(client, data);
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
    
    // Use MessagingManager for enhanced chat handling
    const result = this.messagingManager.handleChatMessage(
      { username: player.username, id: client.playerId, location: player.location },
      channel,
      message
    );
    
    if (!result.success) {
      this.send(client.ws, {
        type: 'error',
        message: result.error
      });
      return;
    }
    
    const chatMessage = {
      type: 'chat_message',
      ...result.message
    };
    
    if (channel === 'global' || channel === 'trade' || channel === 'help') {
      this.broadcast(chatMessage);
    } else if (channel === 'local') {
      this.broadcastToLocation(player.location, chatMessage);
    }
  }
  
  handleDirectMessage(client, data) {
    const { recipient, message } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const result = this.messagingManager.handleDirectMessage(
      player.username,
      recipient,
      message
    );
    
    if (!result.success) {
      this.send(client.ws, {
        type: 'error',
        message: result.error
      });
      return;
    }
    
    // Send confirmation to sender
    this.send(client.ws, {
      type: 'direct_message_sent',
      dm: result.dm
    });
    
    // Send to recipient if online
    const recipientClient = this.getClientByUsername(recipient);
    if (recipientClient) {
      this.send(recipientClient.ws, {
        type: 'direct_message_received',
        dm: result.dm
      });
    }
  }
  
  handleSendMail(client, data) {
    const { mail } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const result = this.messagingManager.handleSendMail(
      player.username,
      mail.to,
      mail.subject,
      mail.body
    );
    
    if (!result.success) {
      this.send(client.ws, {
        type: 'error',
        message: result.error
      });
      return;
    }
    
    // Notify sender
    this.send(client.ws, {
      type: 'mail_sent',
      mail: result.mail
    });
    
    // Notify recipient if online
    const recipientClient = this.getClientByUsername(mail.to);
    if (recipientClient) {
      this.send(recipientClient.ws, {
        type: 'mail_received',
        mail: result.mail
      });
    }
  }
  
  handleMarkMailRead(client, data) {
    const { mailId } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const success = this.messagingManager.markMailAsRead(mailId, player.username);
    
    this.send(client.ws, {
      type: 'mail_marked_read',
      success,
      mailId
    });
  }
  
  handleDeleteMail(client, data) {
    const { mailId, folder } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const success = this.messagingManager.deleteMail(mailId, player.username, folder);
    
    this.send(client.ws, {
      type: 'mail_deleted',
      success,
      mailId
    });
  }
  
  handleCreateForumTopic(client, data) {
    const { topic } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const result = this.messagingManager.createForumTopic(
      player.username,
      topic.category,
      topic.title,
      topic.content
    );
    
    if (!result.success) {
      this.send(client.ws, {
        type: 'error',
        message: result.error
      });
      return;
    }
    
    // Notify all clients
    this.broadcast({
      type: 'forum_topic_created',
      topic: result.topic
    });
  }
  
  handleForumReply(client, data) {
    const { topicId, reply } = data;
    const player = this.playerManager.getPlayer(client.playerId);
    
    if (!player) return;
    
    const result = this.messagingManager.replyToForumTopic(
      topicId,
      player.username,
      reply.content
    );
    
    if (!result.success) {
      this.send(client.ws, {
        type: 'error',
        message: result.error
      });
      return;
    }
    
    // Notify all clients viewing the topic
    this.broadcast({
      type: 'forum_reply_added',
      topicId,
      reply: result.reply
    });
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
  
  /**
   * Helper method to find a client by username
   */
  getClientByUsername(username) {
    for (const client of this.wss.clients) {
      if (client.playerId) {
        const player = this.playerManager.getPlayer(client.playerId);
        if (player && player.username === username) {
          return client;
        }
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

/**
 * WebSocket Connection Pool Manager
 * Manages WebSocket connections with pooling, backpressure handling, and resource limits
 * @module WebSocketPoolManager
 */

class WebSocketPoolManager {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 1000;
    this.maxConnectionsPerIP = options.maxConnectionsPerIP || 5;
    this.connectionTimeout = options.connectionTimeout || 30000; // 30 seconds
    this.heartbeatInterval = options.heartbeatInterval || 30000; // 30 seconds
    this.messageQueueLimit = options.messageQueueLimit || 100;
    
    this.connections = new Map(); // clientId -> connection info
    this.ipConnections = new Map(); // IP -> Set of clientIds
    this.messageQueues = new Map(); // clientId -> message queue
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      rejectedConnections: 0,
      messagesProcessed: 0,
      messagesDropped: 0
    };
    
    // Start heartbeat interval
    this.startHeartbeat();
  }

  /**
   * Add a new WebSocket connection
   * @param {string} clientId - Client identifier
   * @param {WebSocket} ws - WebSocket instance
   * @param {string} ip - Client IP address
   * @returns {boolean} True if connection accepted
   */
  addConnection(clientId, ws, ip) {
    // Check global connection limit
    if (this.connections.size >= this.maxConnections) {
      this.stats.rejectedConnections++;
      console.warn(`⚠️ Connection limit reached. Rejecting connection from ${ip}`);
      return false;
    }

    // Check per-IP connection limit
    const ipConns = this.ipConnections.get(ip) || new Set();
    if (ipConns.size >= this.maxConnectionsPerIP) {
      this.stats.rejectedConnections++;
      console.warn(`⚠️ Per-IP connection limit reached for ${ip}`);
      return false;
    }

    // Add connection
    this.connections.set(clientId, {
      ws,
      ip,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
      isAlive: true
    });

    ipConns.add(clientId);
    this.ipConnections.set(ip, ipConns);
    
    this.messageQueues.set(clientId, []);
    
    this.stats.totalConnections++;
    this.stats.activeConnections = this.connections.size;

    // Set up WebSocket event handlers
    this.setupWebSocketHandlers(clientId, ws);

    console.log(`✅ Connection added: ${clientId} from ${ip} (${this.stats.activeConnections}/${this.maxConnections})`);
    return true;
  }

  /**
   * Set up WebSocket event handlers
   * @param {string} clientId - Client identifier
   * @param {WebSocket} ws - WebSocket instance
   */
  setupWebSocketHandlers(clientId, ws) {
    ws.on('pong', () => {
      const conn = this.connections.get(clientId);
      if (conn) {
        conn.isAlive = true;
        conn.lastActivity = Date.now();
      }
    });

    ws.on('close', () => {
      this.removeConnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error.message);
      this.removeConnection(clientId);
    });
  }

  /**
   * Remove a WebSocket connection
   * @param {string} clientId - Client identifier
   */
  removeConnection(clientId) {
    const conn = this.connections.get(clientId);
    if (!conn) return;

    // Remove from IP tracking
    const ipConns = this.ipConnections.get(conn.ip);
    if (ipConns) {
      ipConns.delete(clientId);
      if (ipConns.size === 0) {
        this.ipConnections.delete(conn.ip);
      }
    }

    // Clean up
    this.connections.delete(clientId);
    this.messageQueues.delete(clientId);
    this.stats.activeConnections = this.connections.size;

    console.log(`🔌 Connection removed: ${clientId} (${this.stats.activeConnections}/${this.maxConnections})`);
  }

  /**
   * Send message to a client with backpressure handling
   * @param {string} clientId - Client identifier
   * @param {Object} message - Message to send
   * @returns {boolean} True if message sent or queued
   */
  sendMessage(clientId, message) {
    const conn = this.connections.get(clientId);
    if (!conn) {
      return false;
    }

    const { ws } = conn;
    
    // Check WebSocket readyState
    if (ws.readyState !== 1) { // 1 = OPEN
      // Queue message if not open yet
      return this.queueMessage(clientId, message);
    }

    // Check backpressure
    if (ws.bufferedAmount > 0) {
      // WebSocket has buffered data, queue this message
      return this.queueMessage(clientId, message);
    }

    // Send immediately
    try {
      ws.send(JSON.stringify(message));
      conn.messagesSent++;
      conn.lastActivity = Date.now();
      this.stats.messagesProcessed++;
      
      // Process queued messages if any
      this.processMessageQueue(clientId);
      
      return true;
    } catch (error) {
      console.error(`Failed to send message to ${clientId}:`, error.message);
      this.removeConnection(clientId);
      return false;
    }
  }

  /**
   * Queue message for later delivery
   * @param {string} clientId - Client identifier
   * @param {Object} message - Message to queue
   * @returns {boolean} True if queued
   */
  queueMessage(clientId, message) {
    const queue = this.messageQueues.get(clientId);
    if (!queue) return false;

    // Check queue limit
    if (queue.length >= this.messageQueueLimit) {
      // Drop oldest message
      queue.shift();
      this.stats.messagesDropped++;
    }

    queue.push(message);
    return true;
  }

  /**
   * Process queued messages for a client
   * @param {string} clientId - Client identifier
   */
  processMessageQueue(clientId) {
    const conn = this.connections.get(clientId);
    const queue = this.messageQueues.get(clientId);
    
    if (!conn || !queue || queue.length === 0) return;

    const { ws } = conn;
    
    // Process messages while connection is ready
    while (queue.length > 0 && ws.readyState === 1 && ws.bufferedAmount === 0) {
      const message = queue.shift();
      try {
        ws.send(JSON.stringify(message));
        conn.messagesSent++;
        this.stats.messagesProcessed++;
      } catch (error) {
        console.error(`Failed to send queued message to ${clientId}:`, error.message);
        break;
      }
    }
  }

  /**
   * Broadcast message to all connections
   * @param {Object} message - Message to broadcast
   * @param {Function} filter - Optional filter function (conn => boolean)
   */
  broadcast(message, filter = null) {
    let sent = 0;
    
    for (const [clientId, conn] of this.connections.entries()) {
      if (filter && !filter(conn)) continue;
      
      if (this.sendMessage(clientId, message)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.connectionTimeout;

      for (const [clientId, conn] of this.connections.entries()) {
        // Check if connection is alive
        if (!conn.isAlive || (now - conn.lastActivity > timeout)) {
          console.log(`💀 Dead connection detected: ${clientId}`);
          conn.ws.terminate();
          this.removeConnection(clientId);
          continue;
        }

        // Mark as dead until pong received
        conn.isAlive = false;
        
        try {
          conn.ws.ping();
        } catch (error) {
          this.removeConnection(clientId);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  /**
   * Get connection info
   * @param {string} clientId - Client identifier
   * @returns {Object|null} Connection info
   */
  getConnection(clientId) {
    return this.connections.get(clientId) || null;
  }

  /**
   * Get all connections for an IP
   * @param {string} ip - IP address
   * @returns {Array} Array of client IDs
   */
  getConnectionsByIP(ip) {
    const ipConns = this.ipConnections.get(ip);
    return ipConns ? Array.from(ipConns) : [];
  }

  /**
   * Get statistics
   * @returns {Object} Connection pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      queuedMessages: Array.from(this.messageQueues.values())
        .reduce((sum, queue) => sum + queue.length, 0)
    };
  }

  /**
   * Close all connections and cleanup
   */
  shutdown() {
    console.log('🔌 Shutting down WebSocket pool...');
    
    this.stopHeartbeat();
    
    // Close all connections
    for (const [clientId, conn] of this.connections.entries()) {
      try {
        conn.ws.close(1000, 'Server shutdown');
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
    
    this.connections.clear();
    this.ipConnections.clear();
    this.messageQueues.clear();
    
    console.log('✅ WebSocket pool shutdown complete');
  }

  /**
   * Get connection age in seconds
   * @param {string} clientId - Client identifier
   * @returns {number} Age in seconds
   */
  getConnectionAge(clientId) {
    const conn = this.connections.get(clientId);
    if (!conn) return 0;
    return Math.floor((Date.now() - conn.connectedAt) / 1000);
  }

  /**
   * Get connection idle time in seconds
   * @param {string} clientId - Client identifier
   * @returns {number} Idle time in seconds
   */
  getConnectionIdleTime(clientId) {
    const conn = this.connections.get(clientId);
    if (!conn) return 0;
    return Math.floor((Date.now() - conn.lastActivity) / 1000);
  }
}

module.exports = WebSocketPoolManager;

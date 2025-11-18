/**
 * Messaging Manager
 * Handles server-side messaging, DMs, mail, and forum systems
 */

class MessagingManager {
  constructor() {
    // Chat channels with history
    this.channels = {
      global: { messages: [], users: new Set() },
      local: {}, // location-based, keyed by locationId
      guild: {}, // guild-based, keyed by guildId
      trade: { messages: [], users: new Set() },
      help: { messages: [], users: new Set() }
    };
    
    // Direct message conversations
    this.conversations = new Map(); // key: sorted user pair, value: messages array
    
    // Mail system
    this.mailboxes = new Map(); // key: username, value: { inbox: [], sent: [] }
    
    // Forum system
    this.forumTopics = [];
    this.forumCategories = ['general', 'guides', 'trading', 'guilds', 'announcements'];
    
    // Moderation
    this.mutedUsers = new Set();
    this.slowModeChannels = new Set();
    this.bannedWords = new Set(['spam', 'scam', 'hack']); // expandable
    
    // Rate limiting
    this.messageCounts = new Map(); // username -> { count, lastReset }
    this.RATE_LIMIT = { MAX_MESSAGES: 10, TIME_WINDOW: 10000 };
    
    // Message history limits
    this.CHANNEL_HISTORY_LIMIT = 500;
    this.DM_HISTORY_LIMIT = 200;
    this.MAIL_INBOX_LIMIT = 200;
    
    console.log('✅ MessagingManager initialized');
  }
  
  /**
   * Handle chat message
   * @param {Object} player - Player object with username, id
   * @param {string} channel - Channel name
   * @param {string} message - Message content
   * @returns {Object} Result with success status and message
   */
  handleChatMessage(player, channel, message) {
    // Check if player is muted
    if (this.mutedUsers.has(player.username)) {
      return { success: false, error: 'You are muted' };
    }
    
    // Check rate limit
    if (!this.checkRateLimit(player.username)) {
      return { success: false, error: 'Rate limit exceeded. Please slow down.' };
    }
    
    // Validate message
    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 500) {
      return { success: false, error: 'Message too long (max 500 characters)' };
    }
    
    // Apply content filters
    const filteredMessage = this.applyContentFilters(message);
    
    // Create message object
    const messageObj = {
      id: this.generateId(),
      username: player.username,
      playerId: player.id,
      message: filteredMessage,
      channel: channel,
      timestamp: Date.now()
    };
    
    // Add to channel history
    if (channel === 'global' || channel === 'trade' || channel === 'help') {
      this.channels[channel].messages.push(messageObj);
      
      // Limit history
      if (this.channels[channel].messages.length > this.CHANNEL_HISTORY_LIMIT) {
        this.channels[channel].messages.shift();
      }
    } else if (channel === 'local') {
      // Location-based chat
      const locationId = player.location || 'unknown';
      if (!this.channels.local[locationId]) {
        this.channels.local[locationId] = { messages: [], users: new Set() };
      }
      this.channels.local[locationId].messages.push(messageObj);
      
      // Limit history
      if (this.channels.local[locationId].messages.length > this.CHANNEL_HISTORY_LIMIT) {
        this.channels.local[locationId].messages.shift();
      }
    }
    
    return { success: true, message: messageObj };
  }
  
  /**
   * Get chat history for a channel
   * @param {string} channel - Channel name
   * @param {string} locationId - Location ID for local chat
   * @param {number} limit - Number of messages to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Array} Array of messages
   */
  getChatHistory(channel, locationId = null, limit = 50, offset = 0) {
    let messages = [];
    
    if (channel === 'local' && locationId) {
      messages = this.channels.local[locationId]?.messages || [];
    } else if (this.channels[channel]) {
      messages = this.channels[channel].messages || [];
    }
    
    // Return with pagination
    return messages.slice(-limit - offset, messages.length - offset).reverse();
  }
  
  /**
   * Handle direct message
   * @param {string} fromUsername
   * @param {string} toUsername
   * @param {string} message
   * @returns {Object}
   */
  handleDirectMessage(fromUsername, toUsername, message) {
    // Check if sender is muted
    if (this.mutedUsers.has(fromUsername)) {
      return { success: false, error: 'You are muted' };
    }
    
    // Validate
    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }
    
    if (message.length > 1000) {
      return { success: false, error: 'Message too long (max 1000 characters)' };
    }
    
    // Check rate limit
    if (!this.checkRateLimit(fromUsername)) {
      return { success: false, error: 'Rate limit exceeded' };
    }
    
    // Apply filters
    const filteredMessage = this.applyContentFilters(message);
    
    // Create DM object
    const dm = {
      id: this.generateId(),
      from: fromUsername,
      to: toUsername,
      message: filteredMessage,
      timestamp: Date.now(),
      read: false
    };
    
    // Store in conversation
    const conversationKey = this.getConversationKey(fromUsername, toUsername);
    if (!this.conversations.has(conversationKey)) {
      this.conversations.set(conversationKey, []);
    }
    
    const conversation = this.conversations.get(conversationKey);
    conversation.push(dm);
    
    // Limit conversation history
    if (conversation.length > this.DM_HISTORY_LIMIT) {
      conversation.shift();
    }
    
    return { success: true, dm: dm };
  }
  
  /**
   * Get conversation between two users
   * @param {string} user1
   * @param {string} user2
   * @param {number} limit
   * @returns {Array}
   */
  getConversation(user1, user2, limit = 50) {
    const conversationKey = this.getConversationKey(user1, user2);
    const conversation = this.conversations.get(conversationKey) || [];
    return conversation.slice(-limit);
  }
  
  /**
   * Mark DM as read
   * @param {string} messageId
   * @param {string} username
   */
  markDMAsRead(messageId, username) {
    for (const [key, messages] of this.conversations.entries()) {
      const message = messages.find(m => m.id === messageId && m.to === username);
      if (message) {
        message.read = true;
        return true;
      }
    }
    return false;
  }
  
  /**
   * Handle mail sending
   * @param {string} fromUsername
   * @param {string} toUsername
   * @param {string} subject
   * @param {string} body
   * @returns {Object}
   */
  handleSendMail(fromUsername, toUsername, subject, body) {
    // Validate
    if (!subject || subject.trim().length === 0) {
      return { success: false, error: 'Subject is required' };
    }
    
    if (subject.length > 100) {
      return { success: false, error: 'Subject too long (max 100 characters)' };
    }
    
    if (body.length > 5000) {
      return { success: false, error: 'Body too long (max 5000 characters)' };
    }
    
    // Create mail object
    const mail = {
      id: this.generateId(),
      from: fromUsername,
      to: toUsername,
      subject: subject,
      body: body,
      timestamp: Date.now(),
      read: false,
      archived: false
    };
    
    // Add to recipient's inbox
    if (!this.mailboxes.has(toUsername)) {
      this.mailboxes.set(toUsername, { inbox: [], sent: [] });
    }
    
    const recipientMailbox = this.mailboxes.get(toUsername);
    recipientMailbox.inbox.push(mail);
    
    // Limit inbox size
    if (recipientMailbox.inbox.length > this.MAIL_INBOX_LIMIT) {
      recipientMailbox.inbox.shift();
    }
    
    // Add to sender's sent
    if (!this.mailboxes.has(fromUsername)) {
      this.mailboxes.set(fromUsername, { inbox: [], sent: [] });
    }
    
    const senderMailbox = this.mailboxes.get(fromUsername);
    senderMailbox.sent.push(mail);
    
    return { success: true, mail: mail };
  }
  
  /**
   * Send system mail
   * @param {string} toUsername
   * @param {string} subject
   * @param {string} body
   */
  sendSystemMail(toUsername, subject, body) {
    const mail = {
      id: this.generateId(),
      from: 'System',
      to: toUsername,
      subject: subject,
      body: body,
      timestamp: Date.now(),
      read: false,
      archived: false,
      system: true
    };
    
    if (!this.mailboxes.has(toUsername)) {
      this.mailboxes.set(toUsername, { inbox: [], sent: [] });
    }
    
    const mailbox = this.mailboxes.get(toUsername);
    mailbox.inbox.push(mail);
    
    return mail;
  }
  
  /**
   * Get mailbox for a user
   * @param {string} username
   * @returns {Object}
   */
  getMailbox(username) {
    if (!this.mailboxes.has(username)) {
      this.mailboxes.set(username, { inbox: [], sent: [] });
    }
    return this.mailboxes.get(username);
  }
  
  /**
   * Mark mail as read
   * @param {string} mailId
   * @param {string} username
   */
  markMailAsRead(mailId, username) {
    const mailbox = this.getMailbox(username);
    const mail = mailbox.inbox.find(m => m.id === mailId);
    if (mail) {
      mail.read = true;
      return true;
    }
    return false;
  }
  
  /**
   * Delete mail
   * @param {string} mailId
   * @param {string} username
   * @param {string} folder - 'inbox' or 'sent'
   */
  deleteMail(mailId, username, folder = 'inbox') {
    const mailbox = this.getMailbox(username);
    const index = mailbox[folder].findIndex(m => m.id === mailId);
    if (index !== -1) {
      mailbox[folder].splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Create forum topic
   * @param {string} author
   * @param {string} category
   * @param {string} title
   * @param {string} content
   * @returns {Object}
   */
  createForumTopic(author, category, title, content) {
    if (!this.forumCategories.includes(category)) {
      return { success: false, error: 'Invalid category' };
    }
    
    if (title.length > 200) {
      return { success: false, error: 'Title too long (max 200 characters)' };
    }
    
    if (content.length > 10000) {
      return { success: false, error: 'Content too long (max 10000 characters)' };
    }
    
    const topic = {
      id: this.generateId(),
      category: category,
      title: title,
      author: author,
      content: content,
      timestamp: Date.now(),
      replies: [],
      locked: false,
      pinned: false,
      views: 0
    };
    
    this.forumTopics.push(topic);
    
    return { success: true, topic: topic };
  }
  
  /**
   * Reply to forum topic
   * @param {string} topicId
   * @param {string} author
   * @param {string} content
   * @returns {Object}
   */
  replyToForumTopic(topicId, author, content) {
    const topic = this.forumTopics.find(t => t.id === topicId);
    
    if (!topic) {
      return { success: false, error: 'Topic not found' };
    }
    
    if (topic.locked) {
      return { success: false, error: 'Topic is locked' };
    }
    
    if (content.length > 10000) {
      return { success: false, error: 'Reply too long (max 10000 characters)' };
    }
    
    const reply = {
      id: this.generateId(),
      author: author,
      content: content,
      timestamp: Date.now()
    };
    
    topic.replies.push(reply);
    
    return { success: true, reply: reply };
  }
  
  /**
   * Get forum topics
   * @param {string} category - Optional category filter
   * @param {number} page
   * @param {number} perPage
   * @returns {Object}
   */
  getForumTopics(category = null, page = 1, perPage = 20) {
    let topics = this.forumTopics;
    
    if (category) {
      topics = topics.filter(t => t.category === category);
    }
    
    // Sort: pinned first, then by latest activity
    topics.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });
    
    const start = (page - 1) * perPage;
    const end = start + perPage;
    
    return {
      topics: topics.slice(start, end),
      total: topics.length,
      page: page,
      perPage: perPage,
      totalPages: Math.ceil(topics.length / perPage)
    };
  }
  
  /**
   * Get forum topic by ID
   * @param {string} topicId
   * @returns {Object}
   */
  getForumTopic(topicId) {
    const topic = this.forumTopics.find(t => t.id === topicId);
    if (topic) {
      topic.views++;
      return topic;
    }
    return null;
  }
  
  /**
   * Moderation: Lock topic
   * @param {string} topicId
   * @param {boolean} locked
   */
  lockForumTopic(topicId, locked = true) {
    const topic = this.forumTopics.find(t => t.id === topicId);
    if (topic) {
      topic.locked = locked;
      return true;
    }
    return false;
  }
  
  /**
   * Moderation: Pin topic
   * @param {string} topicId
   * @param {boolean} pinned
   */
  pinForumTopic(topicId, pinned = true) {
    const topic = this.forumTopics.find(t => t.id === topicId);
    if (topic) {
      topic.pinned = pinned;
      return true;
    }
    return false;
  }
  
  /**
   * Moderation: Delete topic
   * @param {string} topicId
   */
  deleteForumTopic(topicId) {
    const index = this.forumTopics.findIndex(t => t.id === topicId);
    if (index !== -1) {
      this.forumTopics.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Moderation: Mute user
   * @param {string} username
   */
  muteUser(username) {
    this.mutedUsers.add(username);
  }
  
  /**
   * Moderation: Unmute user
   * @param {string} username
   */
  unmuteUser(username) {
    this.mutedUsers.delete(username);
  }
  
  /**
   * Check if user is muted
   * @param {string} username
   * @returns {boolean}
   */
  isUserMuted(username) {
    return this.mutedUsers.has(username);
  }
  
  /**
   * Enable slow mode for channel
   * @param {string} channel
   */
  enableSlowMode(channel) {
    this.slowModeChannels.add(channel);
  }
  
  /**
   * Disable slow mode for channel
   * @param {string} channel
   */
  disableSlowMode(channel) {
    this.slowModeChannels.delete(channel);
  }
  
  /**
   * Check rate limit for user
   * @param {string} username
   * @returns {boolean}
   */
  checkRateLimit(username) {
    const now = Date.now();
    
    if (!this.messageCounts.has(username)) {
      this.messageCounts.set(username, { count: 1, lastReset: now });
      return true;
    }
    
    const userLimit = this.messageCounts.get(username);
    
    // Reset if time window passed
    if (now - userLimit.lastReset > this.RATE_LIMIT.TIME_WINDOW) {
      userLimit.count = 1;
      userLimit.lastReset = now;
      return true;
    }
    
    // Check limit
    if (userLimit.count >= this.RATE_LIMIT.MAX_MESSAGES) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }
  
  /**
   * Apply content filters
   * @param {string} message
   * @returns {string}
   */
  applyContentFilters(message) {
    let filtered = message;
    
    // Filter banned words
    this.bannedWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '***');
    });
    
    // Filter URLs
    filtered = filtered.replace(/(https?:\/\/[^\s]+)/gi, '[link removed]');
    
    // Limit repeated characters
    filtered = filtered.replace(/(.)\1{5,}/g, '$1$1$1$1$1');
    
    return filtered;
  }
  
  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  /**
   * Get conversation key for two users
   * @param {string} user1
   * @param {string} user2
   * @returns {string}
   */
  getConversationKey(user1, user2) {
    return [user1, user2].sort().join('_');
  }
  
  /**
   * Clean up old data periodically
   */
  cleanup() {
    const now = Date.now();
    const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    // Clean up old messages from channels
    Object.values(this.channels).forEach(channel => {
      if (channel.messages) {
        channel.messages = channel.messages.filter(m => now - m.timestamp < retentionPeriod);
      }
    });
    
    // Clean up old DMs
    for (const [key, messages] of this.conversations.entries()) {
      const filtered = messages.filter(m => now - m.timestamp < retentionPeriod);
      if (filtered.length === 0) {
        this.conversations.delete(key);
      } else {
        this.conversations.set(key, filtered);
      }
    }
    
    console.log('✅ MessagingManager cleanup completed');
  }
}

module.exports = MessagingManager;

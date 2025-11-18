/**
 * Messaging Module
 * Handles multi-channel chat, direct messages, mail system, and forums
 * @module Messaging
 */

const Messaging = (() => {
  // State
  let socket = null;
  let currentChannel = 'global';
  let channels = {};
  let conversations = {}; // DM conversations
  let mailbox = { inbox: [], sent: [] };
  let forumTopics = [];
  let unreadCounts = {
    dm: 0,
    mail: 0,
    channels: {}
  };
  let lastMessageTime = 0;
  let mutedUsers = new Set();
  let blockedUsers = new Set();
  let isSlowMode = false;
  let slowModeTimer = null;
  
  // Profanity filter (basic list - expandable)
  const profanityList = ['damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bastard', 'bitch'];
  
  /**
   * Initialize messaging system
   */
  function init() {
    console.log('✅ Messaging system initializing...');
    
    // Initialize channels
    CONFIG.CHAT.CHANNELS.forEach(channelName => {
      channels[channelName] = {
        name: channelName,
        messages: [],
        unread: 0,
        users: []
      };
    });
    
    // Load from localStorage
    loadLocalData();
    
    // Set up UI event listeners
    setupUIListeners();
    
    console.log('✅ Messaging system initialized');
    return true;
  }
  
  /**
   * Set WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   */
  function setSocket(ws) {
    socket = ws;
  }
  
  /**
   * Send message to a channel
   * @param {string} channel - Channel name
   * @param {string} message - Message text
   */
  function sendChannelMessage(channel, message) {
    if (!validateMessage(message)) {
      return false;
    }
    
    // Check rate limit
    const now = Date.now();
    if (now - lastMessageTime < CONFIG.CHAT.COOLDOWN) {
      showNotification('Please wait before sending another message', 'warning');
      return false;
    }
    
    // Check slow mode
    if (isSlowMode && now - lastMessageTime < CONFIG.CHAT.SLOWMODE_DELAY) {
      const waitTime = Math.ceil((CONFIG.CHAT.SLOWMODE_DELAY - (now - lastMessageTime)) / 1000);
      showNotification(`Slow mode active. Wait ${waitTime}s`, 'warning');
      return false;
    }
    
    lastMessageTime = now;
    
    // Apply filters
    const filteredMessage = applyFilters(message);
    
    // Send to server if socket available
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat_message',
        channel: channel,
        message: filteredMessage,
        timestamp: Date.now()
      }));
    } else {
      // Local mode - add directly
      addChannelMessage(channel, {
        username: getPlayerName(),
        message: filteredMessage,
        timestamp: Date.now(),
        channel: channel
      });
    }
    
    return true;
  }
  
  /**
   * Validate message
   * @param {string} message - Message to validate
   * @returns {boolean}
   */
  function validateMessage(message) {
    if (!message || message.trim().length === 0) {
      return false;
    }
    
    if (message.length > CONFIG.CHAT.MAX_MESSAGE_LENGTH) {
      showNotification(`Message too long (max ${CONFIG.CHAT.MAX_MESSAGE_LENGTH} chars)`, 'error');
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply content filters to message
   * @param {string} message - Original message
   * @returns {string} Filtered message
   */
  function applyFilters(message) {
    let filtered = message;
    
    if (CONFIG.CHAT.MODERATION.ENABLE_PROFANITY_FILTER) {
      filtered = filterProfanity(filtered);
    }
    
    if (CONFIG.CHAT.MODERATION.ENABLE_LINK_FILTER) {
      filtered = filterLinks(filtered);
    }
    
    if (CONFIG.CHAT.MODERATION.ENABLE_SPAM_FILTER) {
      filtered = filterSpam(filtered);
    }
    
    return filtered;
  }
  
  /**
   * Filter profanity from message
   * @param {string} message
   * @returns {string}
   */
  function filterProfanity(message) {
    let filtered = message;
    profanityList.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
  }
  
  /**
   * Filter links from message
   * @param {string} message
   * @returns {string}
   */
  function filterLinks(message) {
    // Remove http/https links
    return message.replace(/(https?:\/\/[^\s]+)/gi, '[link removed]');
  }
  
  /**
   * Filter spam patterns
   * @param {string} message
   * @returns {string}
   */
  function filterSpam(message) {
    let filtered = message;
    
    // Check caps
    const capsCount = (message.match(/[A-Z]/g) || []).length;
    const capsPercent = (capsCount / message.length) * 100;
    if (capsPercent > CONFIG.CHAT.MODERATION.MAX_CAPS_PERCENT) {
      filtered = filtered.toLowerCase();
    }
    
    // Check repeated characters
    const regex = new RegExp(`(.)\\1{${CONFIG.CHAT.MODERATION.MAX_REPEAT_CHARS},}`, 'g');
    filtered = filtered.replace(regex, (match) => match[0].repeat(CONFIG.CHAT.MODERATION.MAX_REPEAT_CHARS));
    
    return filtered;
  }
  
  /**
   * Add message to channel
   * @param {string} channel - Channel name
   * @param {Object} messageData - Message data
   */
  function addChannelMessage(channel, messageData) {
    if (!channels[channel]) {
      channels[channel] = { name: channel, messages: [], unread: 0, users: [] };
    }
    
    // Add to channel history
    channels[channel].messages.push(messageData);
    
    // Limit history size
    if (channels[channel].messages.length > CONFIG.CHAT.MESSAGE_LIMIT) {
      channels[channel].messages.shift();
    }
    
    // Increment unread if not current channel
    if (channel !== currentChannel) {
      channels[channel].unread++;
      unreadCounts.channels[channel] = channels[channel].unread;
    }
    
    // Update UI
    updateChannelUI(channel, messageData);
    saveLocalData();
  }
  
  /**
   * Switch to a different channel
   * @param {string} channel - Channel to switch to
   */
  function switchChannel(channel) {
    if (!channels[channel]) return;
    
    currentChannel = channel;
    channels[channel].unread = 0;
    unreadCounts.channels[channel] = 0;
    
    // Update UI to show channel messages
    updateChannelDisplay(channel);
    updateUnreadBadges();
  }
  
  /**
   * Send direct message
   * @param {string} recipient - Username of recipient
   * @param {string} message - Message text
   */
  function sendDirectMessage(recipient, message) {
    if (!validateMessage(message)) return false;
    
    if (blockedUsers.has(recipient)) {
      showNotification('Cannot send message to blocked user', 'error');
      return false;
    }
    
    const dm = {
      id: generateId(),
      from: getPlayerName(),
      to: recipient,
      message: applyFilters(message),
      timestamp: Date.now(),
      read: false,
      thread: []
    };
    
    // Add to conversations
    const conversationKey = getConversationKey(getPlayerName(), recipient);
    if (!conversations[conversationKey]) {
      conversations[conversationKey] = {
        participants: [getPlayerName(), recipient],
        messages: []
      };
    }
    conversations[conversationKey].messages.push(dm);
    
    // Send to server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'direct_message',
        recipient: recipient,
        message: dm.message,
        messageId: dm.id,
        timestamp: dm.timestamp
      }));
    }
    
    saveLocalData();
    updateDMUI();
    return true;
  }
  
  /**
   * Receive direct message
   * @param {Object} messageData
   */
  function receiveDirectMessage(messageData) {
    const conversationKey = getConversationKey(messageData.from, messageData.to);
    if (!conversations[conversationKey]) {
      conversations[conversationKey] = {
        participants: [messageData.from, messageData.to],
        messages: []
      };
    }
    
    const dm = {
      id: messageData.id || generateId(),
      from: messageData.from,
      to: messageData.to,
      message: messageData.message,
      timestamp: messageData.timestamp,
      read: false,
      thread: []
    };
    
    conversations[conversationKey].messages.push(dm);
    unreadCounts.dm++;
    
    // Show notification
    showNotification(`New message from ${messageData.from}`, 'info');
    
    saveLocalData();
    updateDMUI();
    updateUnreadBadges();
  }
  
  /**
   * Send mail message
   * @param {string} recipient - Recipient username
   * @param {string} subject - Mail subject
   * @param {string} body - Mail body
   */
  function sendMail(recipient, subject, body) {
    if (!subject || subject.trim().length === 0) {
      showNotification('Subject is required', 'error');
      return false;
    }
    
    if (subject.length > CONFIG.MAIL.MAX_SUBJECT_LENGTH) {
      showNotification(`Subject too long (max ${CONFIG.MAIL.MAX_SUBJECT_LENGTH} chars)`, 'error');
      return false;
    }
    
    if (body.length > CONFIG.MAIL.MAX_BODY_LENGTH) {
      showNotification(`Body too long (max ${CONFIG.MAIL.MAX_BODY_LENGTH} chars)`, 'error');
      return false;
    }
    
    const mail = {
      id: generateId(),
      from: getPlayerName(),
      to: recipient,
      subject: subject,
      body: body,
      timestamp: Date.now(),
      read: false,
      archived: false
    };
    
    mailbox.sent.push(mail);
    
    // Send to server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'send_mail',
        mail: mail
      }));
    }
    
    saveLocalData();
    showNotification('Mail sent successfully', 'success');
    return true;
  }
  
  /**
   * Receive mail message
   * @param {Object} mailData
   */
  function receiveMail(mailData) {
    mailbox.inbox.push(mailData);
    
    // Limit inbox size
    if (mailbox.inbox.length > CONFIG.MAIL.MAX_INBOX_SIZE) {
      mailbox.inbox.shift();
    }
    
    unreadCounts.mail++;
    
    showNotification(`New mail from ${mailData.from}: ${mailData.subject}`, 'info');
    
    saveLocalData();
    updateMailUI();
    updateUnreadBadges();
  }
  
  /**
   * Create system mail
   * @param {string} subject
   * @param {string} body
   */
  function sendSystemMail(subject, body) {
    const mail = {
      id: generateId(),
      from: 'System',
      to: getPlayerName(),
      subject: subject,
      body: body,
      timestamp: Date.now(),
      read: false,
      archived: false,
      system: true
    };
    
    mailbox.inbox.push(mail);
    unreadCounts.mail++;
    
    saveLocalData();
    updateMailUI();
    updateUnreadBadges();
  }
  
  /**
   * Create forum topic
   * @param {string} category
   * @param {string} title
   * @param {string} content
   */
  function createForumTopic(category, title, content) {
    if (title.length > CONFIG.FORUM.MAX_TITLE_LENGTH) {
      showNotification(`Title too long (max ${CONFIG.FORUM.MAX_TITLE_LENGTH} chars)`, 'error');
      return false;
    }
    
    if (content.length > CONFIG.FORUM.MAX_POST_LENGTH) {
      showNotification(`Post too long (max ${CONFIG.FORUM.MAX_POST_LENGTH} chars)`, 'error');
      return false;
    }
    
    const topic = {
      id: generateId(),
      category: category,
      title: title,
      author: getPlayerName(),
      content: content,
      timestamp: Date.now(),
      replies: [],
      locked: false,
      pinned: false,
      views: 0
    };
    
    forumTopics.push(topic);
    
    // Send to server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'create_forum_topic',
        topic: topic
      }));
    }
    
    saveLocalData();
    showNotification('Topic created successfully', 'success');
    return true;
  }
  
  /**
   * Reply to forum topic
   * @param {string} topicId
   * @param {string} content
   */
  function replyToForumTopic(topicId, content) {
    const topic = forumTopics.find(t => t.id === topicId);
    if (!topic) return false;
    
    if (topic.locked) {
      showNotification('This topic is locked', 'error');
      return false;
    }
    
    const reply = {
      id: generateId(),
      author: getPlayerName(),
      content: content,
      timestamp: Date.now()
    };
    
    topic.replies.push(reply);
    
    // Send to server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'forum_reply',
        topicId: topicId,
        reply: reply
      }));
    }
    
    saveLocalData();
    updateForumUI();
    return true;
  }
  
  // Helper functions
  
  function getPlayerName() {
    if (typeof Player !== 'undefined' && Player.getData) {
      return Player.getData().username || 'Player';
    }
    return 'Player';
  }
  
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  function getConversationKey(user1, user2) {
    return [user1, user2].sort().join('_');
  }
  
  function showNotification(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    // Could integrate with UI notification system
  }
  
  // UI Functions
  
  function setupUIListeners() {
    // Channel tab clicks
    document.querySelectorAll('.channel-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const channel = e.target.dataset.channel;
        if (channel) switchChannel(channel);
      });
    });
    
    // DM send button
    const dmSendBtn = document.getElementById('dm-send-btn');
    if (dmSendBtn) {
      dmSendBtn.addEventListener('click', () => {
        const recipient = document.getElementById('dm-recipient').value;
        const message = document.getElementById('dm-message').value;
        if (sendDirectMessage(recipient, message)) {
          document.getElementById('dm-message').value = '';
        }
      });
    }
    
    // Mail send button
    const mailSendBtn = document.getElementById('mail-send-btn');
    if (mailSendBtn) {
      mailSendBtn.addEventListener('click', () => {
        const recipient = document.getElementById('mail-recipient').value;
        const subject = document.getElementById('mail-subject').value;
        const body = document.getElementById('mail-body').value;
        if (sendMail(recipient, subject, body)) {
          document.getElementById('mail-recipient').value = '';
          document.getElementById('mail-subject').value = '';
          document.getElementById('mail-body').value = '';
        }
      });
    }
  }
  
  function updateChannelUI(channel, messageData) {
    const chatContainer = document.getElementById(`chat-${channel}`);
    if (!chatContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
      <span class="chat-username">${messageData.username}</span>
      <span class="chat-time">${new Date(messageData.timestamp).toLocaleTimeString()}</span>
      <div class="chat-text">${escapeHtml(messageData.message)}</div>
    `;
    chatContainer.appendChild(messageEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  function updateChannelDisplay(channel) {
    const chatContainer = document.getElementById(`chat-${channel}`);
    if (!chatContainer) return;
    
    chatContainer.innerHTML = '';
    channels[channel].messages.forEach(msg => {
      updateChannelUI(channel, msg);
    });
  }
  
  function updateDMUI() {
    // Update DM inbox UI
    const dmList = document.getElementById('dm-list');
    if (!dmList) return;
    
    dmList.innerHTML = '';
    Object.values(conversations).forEach(conv => {
      const lastMsg = conv.messages[conv.messages.length - 1];
      const unreadInConv = conv.messages.filter(m => !m.read && m.to === getPlayerName()).length;
      
      const convEl = document.createElement('div');
      convEl.className = 'dm-conversation' + (unreadInConv > 0 ? ' unread' : '');
      convEl.innerHTML = `
        <strong>${conv.participants.filter(p => p !== getPlayerName())[0]}</strong>
        ${unreadInConv > 0 ? `<span class="badge">${unreadInConv}</span>` : ''}
        <div class="dm-preview">${escapeHtml(lastMsg.message.substring(0, 50))}</div>
      `;
      dmList.appendChild(convEl);
    });
  }
  
  function updateMailUI() {
    // Update mail inbox UI
    const mailList = document.getElementById('mail-list');
    if (!mailList) return;
    
    mailList.innerHTML = '';
    mailbox.inbox.forEach(mail => {
      const mailEl = document.createElement('div');
      mailEl.className = 'mail-item' + (!mail.read ? ' unread' : '');
      mailEl.innerHTML = `
        <div class="mail-from">${mail.system ? '🔔 ' : ''}${mail.from}</div>
        <div class="mail-subject"><strong>${escapeHtml(mail.subject)}</strong></div>
        <div class="mail-time">${new Date(mail.timestamp).toLocaleString()}</div>
      `;
      mailList.appendChild(mailEl);
    });
  }
  
  function updateForumUI() {
    // Update forum topics list
    const forumList = document.getElementById('forum-list');
    if (!forumList) return;
    
    forumList.innerHTML = '';
    forumTopics.forEach(topic => {
      const topicEl = document.createElement('div');
      topicEl.className = 'forum-topic' + (topic.pinned ? ' pinned' : '') + (topic.locked ? ' locked' : '');
      topicEl.innerHTML = `
        ${topic.pinned ? '📌 ' : ''}${topic.locked ? '🔒 ' : ''}
        <strong>${escapeHtml(topic.title)}</strong>
        <div class="forum-meta">
          by ${topic.author} | ${topic.replies.length} replies | ${topic.views} views
        </div>
      `;
      forumList.appendChild(topicEl);
    });
  }
  
  function updateUnreadBadges() {
    // Update unread count badges
    const dmBadge = document.getElementById('dm-unread-badge');
    if (dmBadge) {
      dmBadge.textContent = unreadCounts.dm;
      dmBadge.style.display = unreadCounts.dm > 0 ? 'inline' : 'none';
    }
    
    const mailBadge = document.getElementById('mail-unread-badge');
    if (mailBadge) {
      mailBadge.textContent = unreadCounts.mail;
      mailBadge.style.display = unreadCounts.mail > 0 ? 'inline' : 'none';
    }
    
    // Channel badges
    CONFIG.CHAT.CHANNELS.forEach(channel => {
      const badge = document.getElementById(`channel-${channel}-badge`);
      if (badge && unreadCounts.channels[channel]) {
        badge.textContent = unreadCounts.channels[channel];
        badge.style.display = 'inline';
      }
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Storage functions
  
  function saveLocalData() {
    try {
      localStorage.setItem('messaging_channels', JSON.stringify(channels));
      localStorage.setItem('messaging_conversations', JSON.stringify(conversations));
      localStorage.setItem('messaging_mailbox', JSON.stringify(mailbox));
      localStorage.setItem('messaging_forum', JSON.stringify(forumTopics));
      localStorage.setItem('messaging_unread', JSON.stringify(unreadCounts));
    } catch (e) {
      console.error('Error saving messaging data:', e);
    }
  }
  
  function loadLocalData() {
    try {
      const savedChannels = localStorage.getItem('messaging_channels');
      if (savedChannels) {
        const parsed = JSON.parse(savedChannels);
        Object.keys(parsed).forEach(key => {
          if (channels[key]) {
            channels[key].messages = parsed[key].messages || [];
          }
        });
      }
      
      const savedConversations = localStorage.getItem('messaging_conversations');
      if (savedConversations) conversations = JSON.parse(savedConversations);
      
      const savedMailbox = localStorage.getItem('messaging_mailbox');
      if (savedMailbox) mailbox = JSON.parse(savedMailbox);
      
      const savedForum = localStorage.getItem('messaging_forum');
      if (savedForum) forumTopics = JSON.parse(savedForum);
      
      const savedUnread = localStorage.getItem('messaging_unread');
      if (savedUnread) unreadCounts = JSON.parse(savedUnread);
    } catch (e) {
      console.error('Error loading messaging data:', e);
    }
  }
  
  // Moderation functions
  
  function blockUser(username) {
    blockedUsers.add(username);
    showNotification(`Blocked ${username}`, 'success');
  }
  
  function unblockUser(username) {
    blockedUsers.delete(username);
    showNotification(`Unblocked ${username}`, 'success');
  }
  
  function muteUser(username) {
    mutedUsers.add(username);
    showNotification(`Muted ${username}`, 'success');
  }
  
  function unmuteUser(username) {
    mutedUsers.delete(username);
    showNotification(`Unmuted ${username}`, 'success');
  }
  
  function enableSlowMode() {
    isSlowMode = true;
    showNotification('Slow mode enabled', 'info');
  }
  
  function disableSlowMode() {
    isSlowMode = false;
    showNotification('Slow mode disabled', 'info');
  }
  
  // Public API
  return {
    init,
    setSocket,
    sendChannelMessage,
    switchChannel,
    sendDirectMessage,
    receiveDirectMessage,
    sendMail,
    receiveMail,
    sendSystemMail,
    createForumTopic,
    replyToForumTopic,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    enableSlowMode,
    disableSlowMode,
    getChannels: () => channels,
    getConversations: () => conversations,
    getMailbox: () => mailbox,
    getForumTopics: () => forumTopics,
    getUnreadCounts: () => unreadCounts
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Messaging.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Messaging;
}

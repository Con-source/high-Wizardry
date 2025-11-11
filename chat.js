// Chat Module
const Chat = (() => {
  let socket;
  let isConnected = false;
  let messageHistory = [];
  let onlineUsers = 0;
  
  // Initialize chat system
  function init() {
    // Initialize WebSocket connection
    initWebSocket();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load message history from localStorage
    loadMessageHistory();
    
    if (CONFIG.DEBUG) {
      console.log('Chat system initialized');
    }
    
    return true;
  }
  
  // Initialize WebSocket connection
  function initWebSocket() {
    try {
      // In a real application, you would connect to your WebSocket server
      // For this example, we'll simulate a connection
      if (CONFIG.DEBUG) {
        console.log('Connecting to chat server...');
      }
      
      // Simulate connection
      setTimeout(() => {
        isConnected = true;
        updateConnectionStatus(true);
        addSystemMessage('Connected to chat server');
        
        // Simulate online users
        updateOnlineUsers(Math.floor(Math.random() * 50) + 1);
        
        // Simulate welcome message
        setTimeout(() => {
          addChatMessage({
            username: 'System',
            message: 'Welcome to High Wizardry! Type /help for available commands.',
            timestamp: new Date().toISOString(),
            type: 'system'
          });
        }, 500);
        
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      addSystemMessage('Failed to connect to chat server', 'error');
    }
  }
  
  // Set up event listeners for chat UI
  function setupEventListeners() {
    // Send message on form submission
    const chatForms = document.querySelectorAll('.chat-form');
    chatForms.forEach(form => {
      form.addEventListener('submit', handleSendMessage);
    });
    
    // Toggle chat visibility
    const chatToggles = document.querySelectorAll('.chat-toggle');
    chatToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const chatId = toggle.getAttribute('onclick').match(/'([^']+)'/)[1];
        toggleChat(chatId);
      });
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Toggle chat with Enter key when chat input is focused
      if (e.key === 'Enter' && e.ctrlKey) {
        const activeChat = document.querySelector('.chat-box.active');
        if (activeChat) {
          e.preventDefault();
          const chatId = activeChat.id;
          toggleChat(chatId);
        }
      }
    });
  }
  
  // Toggle chat visibility
  function toggleChat(chatId) {
    const chatBox = document.getElementById(chatId);
    if (chatBox) {
      chatBox.classList.toggle('active');
      
      // Focus input when chat is opened
      if (chatBox.classList.contains('active')) {
        const input = chatBox.querySelector('input[type="text"]');
        if (input) {
          setTimeout(() => input.focus(), 100);
        }
      }
    }
  }
  
  // Handle sending a message
  function handleSendMessage(e) {
    e.preventDefault();
    
    const form = e.target;
    const input = form.querySelector('input[type="text"]');
    const chatId = form.closest('.chat-box').id;
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Handle commands
    if (message.startsWith('/')) {
      handleCommand(message, chatId);
      return;
    }
    
    // Create message object
    const messageObj = {
      username: Player.getData().username || 'Player',
      message: message,
      timestamp: new Date().toISOString(),
      type: 'player'
    };
    
    // In a real application, you would send this to the server
    if (isConnected) {
      // Simulate sending to server
      setTimeout(() => {
        // Simulate message received from server
        addChatMessage(messageObj);
        
        // Simulate response (for demo purposes)
        if (Math.random() > 0.7) {
          const responses = [
            'That\'s interesting!',
            'I see what you mean.',
            'Tell me more about that.',
            'I agree!',
            'What do you think about the latest update?',
            'Nice weather we\'re having in the game!',
            'Anyone want to team up for a quest?',
            'Check out my new gear!',
            'Has anyone seen the wizard?',
            'I need healing!'
          ];
          
          const randomUser = ['Wizard123', 'DragonSlayer', 'MagePro', 'Healer42', 'RogueNinja'][Math.floor(Math.random() * 5)];
          
          setTimeout(() => {
            addChatMessage({
              username: randomUser,
              message: responses[Math.floor(Math.random() * responses.length)],
              timestamp: new Date().toISOString(),
              type: 'other'
            });
          }, Math.random() * 2000 + 500);
        }
      }, 200);
    } else {
      addSystemMessage('Not connected to chat server', 'error');
    }
  }
  
  // Handle chat commands
  function handleCommand(command, chatId) {
    const args = command.slice(1).split(' ');
    const cmd = args[0].toLowerCase();
    
    switch (cmd) {
      case 'help':
        showHelp();
        break;
        
      case 'me':
        if (args.length > 1) {
          const action = args.slice(1).join(' ');
          addChatMessage({
            username: '* ' + (Player.getData().username || 'Player'),
            message: action,
            timestamp: new Date().toISOString(),
            type: 'emote'
          });
        } else {
          addSystemMessage('Usage: /me [action]', 'warning');
        }
        break;
        
      case 'whisper':
      case 'w':
        if (args.length > 2) {
          const target = args[1];
          const message = args.slice(2).join(' ');
          addChatMessage({
            username: `To ${target}`,
            message: message,
            timestamp: new Date().toISOString(),
            type: 'whisper'
          });
        } else {
          addSystemMessage('Usage: /whisper [username] [message]', 'warning');
        }
        break;
        
      case 'clear':
        clearChat(chatId);
        break;
        
      case 'online':
        addSystemMessage(`There are ${onlineUsers} players online.`);
        break;
        
      default:
        addSystemMessage(`Unknown command: ${cmd}. Type /help for a list of commands.`, 'error');
    }
  }
  
  // Show help message
  function showHelp() {
    const helpText = [
      'Available commands:',
      '/help - Show this help message',
      '/me [action] - Perform an action',
      '/whisper [user] [message] - Send a private message',
      '/clear - Clear the chat',
      '/online - Show online player count'
    ];
    
    helpText.forEach(line => {
      addSystemMessage(line);
    });
  }
  
  // Add a chat message to the UI
  function addChatMessage(message) {
    // Add to message history
    messageHistory.push(message);
    
    // Limit history size
    if (messageHistory.length > CONFIG.CHAT.MESSAGE_LIMIT) {
      messageHistory.shift();
    }
    
    // Update UI
    updateChatUI(message);
    
    // Save to localStorage
    saveMessageHistory();
  }
  
  // Add a system message to the chat
  function addSystemMessage(message, type = 'info') {
    const messageObj = {
      username: 'System',
      message: message,
      timestamp: new Date().toISOString(),
      type: type
    };
    
    addChatMessage(messageObj);
  }
  
  // Update the chat UI with a new message
  function updateChatUI(message) {
    const chatMessages = document.querySelectorAll('.chat-messages');
    
    chatMessages.forEach(container => {
      const messageElement = createMessageElement(message);
      container.appendChild(messageElement);
      
      // Auto-scroll to bottom
      container.scrollTop = container.scrollHeight;
    });
  }
  
  // Create a message element
  function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.type}`;
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let messageHTML = '';
    
    switch (message.type) {
      case 'system':
      case 'error':
      case 'warning':
      case 'info':
        messageHTML = `
          <div class="message-content ${message.type}">
            <span class="message-time">[${timeString}]</span>
            <span class="message-text">${message.message}</span>
          </div>
        `;
        break;
        
      case 'whisper':
        messageHTML = `
          <div class="message-header">
            <span class="message-username whisper">${message.username}</span>
            <span class="message-time">${timeString}</span>
          </div>
          <div class="message-content">${message.message}</div>
        `;
        break;
        
      case 'emote':
        messageHTML = `
          <div class="message-content emote">
            <span class="message-username">${message.username}</span>
            <span class="message-text">${message.message}</span>
            <span class="message-time">${timeString}</span>
          </div>
        `;
        break;
        
      case 'player':
      case 'other':
      default:
        messageHTML = `
          <div class="message-header">
            <span class="message-username">${message.username}</span>
            <span class="message-time">${timeString}</span>
          </div>
          <div class="message-content">${message.message}</div>
        `;
    }
    
    messageElement.innerHTML = messageHTML;
    return messageElement;
  }
  
  // Clear chat messages
  function clearChat(chatId) {
    const chatMessages = document.querySelector(`#${chatId} .chat-messages`);
    if (chatMessages) {
      chatMessages.innerHTML = '';
      addSystemMessage('Chat cleared.');
    }
  }
  
  // Update online users count
  function updateOnlineUsers(count) {
    onlineUsers = count;
    const onlineCountElements = document.querySelectorAll('#online-count');
    onlineCountElements.forEach(el => {
      el.textContent = count;
    });
  }
  
  // Update connection status indicator
  function updateConnectionStatus(connected) {
    const statusIndicators = document.querySelectorAll('.connection-status i');
    statusIndicators.forEach(indicator => {
      indicator.style.color = connected ? '#3fb950' : '#f85149';
      indicator.title = connected ? 'Connected' : 'Disconnected';
    });
  }
  
  // Load message history from localStorage
  function loadMessageHistory() {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        messageHistory = JSON.parse(savedHistory);
        
        // Only keep the most recent messages
        if (messageHistory.length > CONFIG.CHAT.MESSAGE_LIMIT) {
          messageHistory = messageHistory.slice(-CONFIG.CHAT.MESSAGE_LIMIT);
        }
        
        // Display loaded messages
        messageHistory.forEach(message => {
          updateChatUI(message);
        });
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }
  
  // Save message history to localStorage
  function saveMessageHistory() {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messageHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }
  
  // Public API
  return {
    init,
    sendMessage: handleSendMessage,
    addSystemMessage,
    updateOnlineUsers,
    
    // For testing/debugging
    _test: {
      simulateMessage: (message) => {
        addChatMessage({
          username: 'TestUser',
          message: message,
          timestamp: new Date().toISOString(),
          type: 'other'
        });
      }
    }
  };
})();

// Initialize chat when the DOM is loaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Chat.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Chat;
}


// Main Entry Point for High Wizardry

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize modules
  try {
    // Initialize UI first
    UI.init();
    
    // Initialize player data
    Player.init();
    
    // Initialize chat system
    Chat.init();
    
    // Initialize game systems
    Game.init();
    
    // Show welcome message
    UI.showNotification('Welcome to High Wizardry!', 'success');
    
    // Update UI with player data
    Player.updateUI();
    
    // Check for saved game state
    const savedPlayer = localStorage.getItem('highWizardryPlayer');
    if (!savedPlayer) {
      // First-time setup
      showWelcomeModal();
    }
    
    // Set up global error handling
    setupErrorHandling();
    
    if (CONFIG.DEBUG) {
      console.log('High Wizardry initialized successfully');
      // Expose modules to global scope for debugging
      window.Player = Player;
      window.Game = Game;
      window.Chat = Chat;
      window.UI = UI;
    }
  } catch (error) {
    console.error('Error initializing High Wizardry:', error);
    UI.showNotification('Failed to initialize the game. Please refresh the page.', 'error');
  }
});

// Show welcome modal for new players
function showWelcomeModal() {
  UI.showModal({
    title: 'Welcome to High Wizardry!',
    content: `
      <div class="welcome-modal">
        <p>Embark on a magical journey in the world of High Wizardry. 
        Train your skills, join guilds, trade with other players, and become the most powerful wizard!</p>
        <div class="wizard-image">
          <i class="fas fa-hat-wizard"></i>
        </div>
        <div class="form-group">
          <label for="player-name">Choose your wizard name:</label>
          <input type="text" id="player-name" class="form-control" placeholder="Enter your name" maxlength="20">
        </div>
      </div>
    `,
    buttons: [
      {
        text: 'Begin Adventure',
        className: 'btn-primary',
        action: 'startGame'
      }
    ],
    closeOnEsc: false,
    closeOnBackdrop: false
  });
}

// Global function to start the game
window.startGame = function() {
  const nameInput = document.getElementById('player-name');
  let playerName = nameInput ? nameInput.value.trim() : 'Wizard';
  
  // Validate name
  if (!playerName) {
    playerName = 'Wizard';
  }
  
  // Set player name
  Player.setUsername(playerName);
  
  // Close welcome modal
  UI.closeModal(document.querySelector('.modal').id);
  
  // Show tutorial or initial quest
  showTutorial();
};

// Show tutorial for new players
function showTutorial() {
  UI.showModal({
    title: 'Getting Started',
    content: `
      <div class="tutorial">
        <h3>Welcome, ${Player.getData().username}!</h3>
        <p>Here's how to get started:</p>
        <ol>
          <li>Use the menu on the left to navigate</li>
          <li>Check your stats and inventory in the sidebar</li>
          <li>Chat with other players using the chat box</li>
          <li>Complete quests to earn experience and gold</li>
          <li>Train your skills to become more powerful</li>
        </ol>
        <p>Good luck on your magical journey!</p>
      </div>
    `,
    buttons: [
      {
        text: 'Got it!',
        className: 'btn-primary'
      }
    ]
  });
}

// Set up global error handling
function setupErrorHandling() {
  // Handle uncaught errors
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMessage = `Error: ${message}\nSource: ${source}:${lineno}:${colno}`;
    console.error('Uncaught error:', error || errorMessage);
    
    // Show error to user
    UI.showNotification('An error occurred. Please refresh the page.', 'error');
    
    // Return true to prevent default error handling
    return true;
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show error to user
    UI.showNotification('An error occurred. Please try again.', 'error');
    
    // Prevent default handling
    event.preventDefault();
  });
}

// Handle offline/online status
window.addEventListener('online', () => {
  UI.showNotification('You are back online', 'success');
  // Attempt to reconnect to game services
  if (typeof Game.reconnect === 'function') {
    Game.reconnect();
  }
});

window.addEventListener('offline', () => {
  UI.showNotification('You are offline. Some features may not be available.', 'warning');
});

// Service Worker Registration (for PWA support)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      if (CONFIG.DEBUG) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }
    }).catch(error => {
      console.error('ServiceWorker registration failed: ', error);
    });
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    showWelcomeModal,
    showTutorial,
    setupErrorHandling
  };
}

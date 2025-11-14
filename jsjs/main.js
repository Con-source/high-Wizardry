// Main Entry Point for High Wizardry

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing High Wizardry...');
  
  // Set up global error handling first
  setupErrorHandling();
  
  // Initialize modules in the correct order
  try {
    // 1. Initialize UI first (needed for notifications)
    if (typeof UI !== 'undefined' && typeof UI.init === 'function') {
      UI.init();
      console.log('✅ UI initialized');
    } else {
      console.warn('⚠️ UI module not found');
    }
    
    // 2. Initialize Player data
    if (typeof Player !== 'undefined' && typeof Player.init === 'function') {
      Player.init();
      console.log('✅ Player initialized');
    } else {
      console.warn('⚠️ Player module not found');
    }
    
    // 3. Initialize Chat system
    if (typeof Chat !== 'undefined' && typeof Chat.init === 'function') {
      Chat.init();
      console.log('✅ Chat initialized');
    } else {
      console.warn('⚠️ Chat module not found');
    }
    
    // 4. Initialize Game Core (if using separate game.js)
    // Note: game-core.js initializes automatically via singleton pattern
    if (window.HighWizardry && window.HighWizardry.Game) {
      console.log('✅ GameCore initialized');
      
      // Start game loop
      if (typeof window.HighWizardry.Game.startGameLoop === 'function') {
        window.HighWizardry.Game.startGameLoop();
        console.log('✅ Game loop started');
      }
    } else {
      console.warn('⚠️ GameCore not found');
    }
    
    // Show welcome message
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification('Welcome to High Wizardry!', 'success');
    }
    
    // Update UI with player data
    if (typeof Player !== 'undefined' && typeof Player.updateUI === 'function') {
      Player.updateUI();
    }
    
    // Check for saved game state
    const savedPlayer = localStorage.getItem('highWizardryPlayer');
    if (!savedPlayer) {
      // First-time setup
      showWelcomeModal();
    }
    
    if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
      console.log('✅ High Wizardry initialized successfully');
      // Expose modules to global scope for debugging
      window.DebugModules = {
        Player: typeof Player !== 'undefined' ? Player : null,
        Game: window.HighWizardry?.Game || null,
        Chat: typeof Chat !== 'undefined' ? Chat : null,
        UI: typeof UI !== 'undefined' ? UI : null,
        CONFIG: typeof CONFIG !== 'undefined' ? CONFIG : null
      };
      console.log('Debug modules available at window.DebugModules');
    }
  } catch (error) {
    console.error('❌ Error initializing High Wizardry:', error);
    // Show error to user if UI is available
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification('Failed to initialize the game. Please refresh the page.', 'error');
    } else {
      alert('Failed to initialize the game. Please refresh the page.');
    }
  }
});

// Show welcome modal for new players
function showWelcomeModal() {
  // Only show if UI module is available
  if (typeof UI === 'undefined' || typeof UI.showModal !== 'function') {
    console.log('UI module not available for welcome modal');
    return;
  }
  
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
  let playerName = 'Wizard';
  
  // Safely get the input value
  if (nameInput && nameInput.value) {
    const trimmed = nameInput.value.trim();
    if (trimmed.length > 0) {
      playerName = trimmed;
    }
  }
  
  // Set player name if Player module exists
  if (typeof Player !== 'undefined' && typeof Player.setUsername === 'function') {
    Player.setUsername(playerName);
  }
  
  // Close welcome modal
  const modal = document.querySelector('.modal');
  if (modal && typeof UI !== 'undefined' && typeof UI.closeModal === 'function') {
    UI.closeModal(modal.id);
  }
  
  // Show tutorial or initial quest
  showTutorial();
};

// Show tutorial for new players
function showTutorial() {
  // Only show if UI module is available
  if (typeof UI === 'undefined' || typeof UI.showModal !== 'function') {
    return;
  }
  
  const playerName = (typeof Player !== 'undefined' && Player.getData) 
    ? Player.getData().username 
    : 'Wizard';
  
  UI.showModal({
    title: 'Getting Started',
    content: `
      <div class="tutorial">
        <h3>Welcome, ${playerName}!</h3>
        <p>Here's how to get started:</p>
        <ol>
          <li>Use the menu on the left to navigate</li>
          <li>Check your stats and inventory in the sidebar</li>
          <li>Chat with other players using the chat box</li>
          <li>Complete quests to earn experience and currency</li>
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
    
    // Show error to user if UI available
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification('An error occurred. Please refresh the page.', 'error');
    }
    
    // Return true to prevent default error handling
    return true;
  };
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show error to user if UI available
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification('An error occurred. Please try again.', 'error');
    }
    
    // Prevent default handling
    event.preventDefault();
  });
}

// Handle offline/online status
window.addEventListener('online', () => {
  if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
    UI.showNotification('You are back online', 'success');
  }
  
  // Attempt to reconnect to game services
  if (window.HighWizardry?.Game && typeof window.HighWizardry.Game.reconnect === 'function') {
    window.HighWizardry.Game.reconnect();
  }
});

window.addEventListener('offline', () => {
  if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
    UI.showNotification('You are offline. Some features may not be available.', 'warning');
  }
});

// Service Worker Registration (for PWA support)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }
    }).catch(error => {
      // Silent fail for service worker - it's optional
      if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
        console.log('ServiceWorker not available:', error.message);
      }
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

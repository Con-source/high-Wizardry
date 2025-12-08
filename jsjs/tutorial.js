/**
 * Tutorial/Onboarding Module
 * Provides interactive tutorials and guides for new players
 * @module Tutorial
 */
const Tutorial = (() => {
  /**
   * @typedef {Object} TutorialStep
   * @property {string} target - CSS selector for target element
   * @property {string} title - Step title
   * @property {string} content - Step content/description
   * @property {string} position - Tooltip position ('top', 'bottom', 'left', 'right')
   * @property {Function} [onShow] - Callback when step is shown
   * @property {Function} [onComplete] - Callback when step is completed
   */

  /**
   * @typedef {Object} TutorialState
   * @property {boolean} isActive - Whether tutorial is currently active
   * @property {number} currentStep - Current step index
   * @property {Array<TutorialStep>} steps - Tutorial steps
   * @property {boolean} completed - Whether tutorial has been completed
   */

  const state = {
    isActive: false,
    currentStep: 0,
    steps: [],
    completed: false,
    overlay: null,
    tooltip: null
  };

  /**
   * Tutorial sequences
   */
  const tutorials = {
    welcome: [
      {
        target: '.game-header',
        title: 'Welcome to High Wizardry!',
        content: 'Let\'s take a quick tour of the game. Click "Next" to continue.',
        position: 'bottom'
      },
      {
        target: '.player-card',
        title: 'Your Character',
        content: 'This shows your character\'s stats, health, energy, and currency. Keep an eye on these!',
        position: 'right'
      },
      {
        target: '.sidebar nav',
        title: 'Locations',
        content: 'Navigate between different locations by clicking these buttons. Each location offers unique activities.',
        position: 'right'
      },
      {
        target: '.main-content',
        title: 'Main Area',
        content: 'This is where you\'ll interact with the game. Actions, quests, and information appear here.',
        position: 'top'
      },
      {
        target: '.game-log',
        title: 'Game Log',
        content: 'Important events and actions are logged here. You can clear it anytime.',
        position: 'top'
      },
      {
        target: '.location-btn[data-location="home"]',
        title: 'Visit Your Home',
        content: 'Click here to visit your home and see your stats dashboard!',
        position: 'right',
        onShow: () => {
          const homeBtn = document.querySelector('.location-btn[data-location="home"]');
          if (homeBtn) {
            homeBtn.classList.add('pulse');
          }
        },
        onComplete: () => {
          const homeBtn = document.querySelector('.location-btn[data-location="home"]');
          if (homeBtn) {
            homeBtn.classList.remove('pulse');
            homeBtn.click();
          }
        }
      },
      {
        target: '#home-dashboard-stats',
        title: 'Your Progress',
        content: 'Track your experience, quests completed, items crafted, and guild memberships here.',
        position: 'bottom'
      },
      {
        target: '.location-btn[data-location="education"]',
        title: 'Training',
        content: 'Visit Education to train your stats and improve your abilities!',
        position: 'right'
      },
      {
        target: '.location-btn[data-location="workshop"]',
        title: 'Crafting',
        content: 'The Workshop lets you craft items using resources you\'ve gathered.',
        position: 'right'
      },
      {
        target: 'a[href*="manual"]',
        title: 'Need Help?',
        content: 'Check out the Player Manual for detailed information about all game features!',
        position: 'left'
      },
      {
        target: '.game-container',
        title: 'You\'re Ready!',
        content: 'That\'s it! You\'re ready to start your wizarding adventure. Have fun!',
        position: 'center'
      }
    ],
    combat: [
      {
        target: '.location-btn[data-location="crimes"]',
        title: 'Risky Business',
        content: 'Here you can attempt crimes for quick money, but beware - you might get caught!',
        position: 'right'
      }
    ],
    multiplayer: [
      {
        target: '#connection-status',
        title: 'Online Status',
        content: 'This shows your connection status. When online, you can interact with other players!',
        position: 'bottom'
      },
      {
        target: '#online-players-list',
        title: 'Nearby Players',
        content: 'See who else is at your current location. You can trade and chat with them!',
        position: 'right'
      }
    ]
  };

  /**
   * Initialize tutorial module
   * @returns {boolean} True if initialization successful
   */
  function init() {
    // Check if user has completed welcome tutorial
    const completed = localStorage.getItem('tutorial_welcome_completed');
    
    if (!completed) {
      // Show welcome tutorial after a short delay
      setTimeout(() => {
        start('welcome');
      }, 2000);
    }
    
    // Add tutorial restart button to UI
    addRestartButton();
    
    console.log('✅ Tutorial initialized');
    return true;
  }

  /**
   * Start a tutorial
   * @param {string} tutorialName - Name of tutorial to start
   */
  function start(tutorialName) {
    if (!tutorials[tutorialName]) {
      console.error(`Tutorial "${tutorialName}" not found`);
      return;
    }

    state.steps = tutorials[tutorialName];
    state.currentStep = 0;
    state.isActive = true;
    state.completed = false;

    createOverlay();
    showStep(0);

    // Announce to screen readers
    if (typeof Accessibility !== 'undefined') {
      Accessibility.announce('Tutorial started. Use arrow keys or click Next to continue.');
    }
  }

  /**
   * Create tutorial overlay
   */
  function createOverlay() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-backdrop"></div>
    `;
    document.body.appendChild(overlay);
    state.overlay = overlay;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.className = 'tutorial-tooltip';
    tooltip.innerHTML = `
      <div class="tutorial-content">
        <h3 class="tutorial-title"></h3>
        <p class="tutorial-text"></p>
        <div class="tutorial-progress">
          <span class="tutorial-step-indicator"></span>
        </div>
        <div class="tutorial-actions">
          <button class="btn btn-sm btn-outline-secondary" id="tutorial-skip">Skip Tutorial</button>
          <div class="tutorial-nav">
            <button class="btn btn-sm btn-outline-light" id="tutorial-prev" disabled>Previous</button>
            <button class="btn btn-sm btn-primary" id="tutorial-next">Next</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(tooltip);
    state.tooltip = tooltip;

    // Add event listeners
    document.getElementById('tutorial-skip').addEventListener('click', skip);
    document.getElementById('tutorial-prev').addEventListener('click', () => previous());
    document.getElementById('tutorial-next').addEventListener('click', () => next());

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
  }

  /**
   * Show specific tutorial step
   * @param {number} stepIndex - Step index to show
   */
  function showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= state.steps.length) return;

    const step = state.steps[stepIndex];
    state.currentStep = stepIndex;

    // Update tooltip content
    const tooltip = state.tooltip;
    tooltip.querySelector('.tutorial-title').textContent = step.title;
    tooltip.querySelector('.tutorial-text').textContent = step.content;
    tooltip.querySelector('.tutorial-step-indicator').textContent = 
      `Step ${stepIndex + 1} of ${state.steps.length}`;

    // Update navigation buttons
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');
    
    prevBtn.disabled = stepIndex === 0;
    nextBtn.textContent = stepIndex === state.steps.length - 1 ? 'Finish' : 'Next';

    // Position tooltip
    positionTooltip(step);

    // Highlight target element
    highlightElement(step.target);

    // Call onShow callback
    if (step.onShow) {
      step.onShow();
    }

    // Announce to screen readers
    if (typeof Accessibility !== 'undefined') {
      Accessibility.announce(`${step.title}. ${step.content}`);
    }
  }

  /**
   * Position tooltip relative to target
   * @param {TutorialStep} step - Tutorial step
   */
  function positionTooltip(step) {
    const tooltip = state.tooltip;
    const target = document.querySelector(step.target);

    if (!target) {
      // Center tooltip if target not found
      tooltip.style.position = 'fixed';
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = step.position || 'bottom';

    tooltip.style.position = 'fixed';

    switch (position) {
      case 'top':
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.transform = 'translateX(-50%)';
        break;
      case 'left':
        tooltip.style.left = `${rect.left - 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.transform = 'translateY(-50%)';
        break;
      case 'center':
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        break;
    }

    // Add animation
    tooltip.classList.remove('fade-in');
    void tooltip.offsetWidth; // Trigger reflow
    tooltip.classList.add('fade-in');
  }

  /**
   * Highlight target element
   * @param {string} selector - CSS selector
   */
  function highlightElement(selector) {
    // Remove previous highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Add highlight to target
    const target = document.querySelector(selector);
    if (target) {
      target.classList.add('tutorial-highlight');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Go to next step
   */
  function next() {
    const step = state.steps[state.currentStep];
    
    // Call onComplete callback
    if (step.onComplete) {
      step.onComplete();
    }

    if (state.currentStep < state.steps.length - 1) {
      showStep(state.currentStep + 1);
    } else {
      complete();
    }
  }

  /**
   * Go to previous step
   */
  function previous() {
    if (state.currentStep > 0) {
      showStep(state.currentStep - 1);
    }
  }

  /**
   * Skip tutorial
   */
  function skip() {
    if (confirm('Are you sure you want to skip the tutorial? You can restart it anytime from the help menu.')) {
      cleanup();
    }
  }

  /**
   * Complete tutorial
   */
  function complete() {
    // Mark as completed
    const tutorialName = Object.keys(tutorials).find(name => 
      tutorials[name] === state.steps
    );
    
    if (tutorialName) {
      localStorage.setItem(`tutorial_${tutorialName}_completed`, 'true');
    }

    state.completed = true;

    // Show completion message
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification('Tutorial completed! You\'re ready to play!', 'success');
    }

    cleanup();
  }

  /**
   * Clean up tutorial UI
   */
  function cleanup() {
    // Remove event listeners
    document.removeEventListener('keydown', handleKeyboard);

    // Remove highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Remove overlay and tooltip
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
    if (state.tooltip) {
      state.tooltip.remove();
      state.tooltip = null;
    }

    state.isActive = false;
    state.currentStep = 0;
    state.steps = [];
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyboard(e) {
    if (!state.isActive) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        previous();
        break;
      case 'Escape':
        e.preventDefault();
        skip();
        break;
    }
  }

  /**
   * Add restart tutorial button to UI
   */
  function addRestartButton() {
    // Add to quick actions if available
    const quickActions = document.querySelector('.card.player-card:has(h5:contains("Quick Actions"))');
    if (quickActions) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-outline-info w-100 mb-2';
      btn.innerHTML = '<i class="fas fa-question-circle"></i> Tutorial';
      btn.onclick = () => start('welcome');
      
      const firstButton = quickActions.querySelector('button');
      if (firstButton) {
        firstButton.parentNode.insertBefore(btn, firstButton);
      }
    }
  }

  /**
   * Restart tutorial
   * @param {string} tutorialName - Name of tutorial to restart
   */
  function restart(tutorialName = 'welcome') {
    localStorage.removeItem(`tutorial_${tutorialName}_completed`);
    start(tutorialName);
  }

  // Public API
  return {
    init,
    start,
    restart,
    skip,
    isActive: () => state.isActive
  };
})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Tutorial.init());
} else {
  setTimeout(() => Tutorial.init(), 100);
}

// UI Module
const UI = (() => {
  // UI State
  const state = {
    notifications: [],
    activeModals: [],
    tooltips: {},
    currentSection: 'home',
    theme: 'dark', // 'light' or 'dark'
    isMobile: window.innerWidth < 768,
    isSidebarCollapsed: false,
    isSettingsOpen: false
  };
  
  // Initialize UI
  function init() {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize tooltips
    initTooltips();
    
    // Check for saved theme preference
    loadThemePreference();
    
    // Handle mobile view
    handleResize();
    
    if (CONFIG.DEBUG) {
      console.log('UI initialized');
    }
    
    return true;
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', handleResize);
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('mobile-menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
      }
    });
    
    // Close notifications when clicking the close button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('notification-close')) {
        const notification = e.target.closest('.notification');
        if (notification) {
          removeNotification(notification.id);
        }
      }
    });
  }
  
  // Handle window resize
  function handleResize() {
    state.isMobile = window.innerWidth < 768;
    
    // Update UI based on screen size
    if (state.isMobile) {
      document.body.classList.add('mobile');
      // Collapse sidebar by default on mobile
      if (!state.isSidebarCollapsed) {
        toggleSidebar();
      }
    } else {
      document.body.classList.remove('mobile');
      // Expand sidebar by default on desktop
      if (state.isSidebarCollapsed) {
        toggleSidebar();
      }
    }
  }
  
  // Toggle mobile menu
  function toggleMobileMenu() {
    document.body.classList.toggle('menu-open');
  }
  
  // Toggle sidebar
  function toggleSidebar() {
    state.isSidebarCollapsed = !state.isSidebarCollapsed;
    document.body.classList.toggle('sidebar-collapsed', state.isSidebarCollapsed);
    
    // Save preference
    localStorage.setItem('sidebarCollapsed', state.isSidebarCollapsed);
  }
  
  // Toggle theme
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    
    // Save preference
    localStorage.setItem('theme', state.theme);
    
    // Update UI
    updateThemeUI();
  }
  
  // Load theme preference
  function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      state.theme = savedTheme;
    } else {
      // Default to dark theme if no preference is saved
      state.theme = 'dark';
    }
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeUI();
    
    // Load sidebar state
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
      state.isSidebarCollapsed = true;
      document.body.classList.add('sidebar-collapsed');
    }
  }
  
  // Update theme UI elements
  function updateThemeUI() {
    const themeIcons = document.querySelectorAll('.theme-icon');
    themeIcons.forEach(icon => {
      icon.className = `theme-icon fas fa-${state.theme === 'dark' ? 'sun' : 'moon'}`;
      icon.title = `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`;
    });
  }
  
  // Show a notification
  function showNotification(message, type = 'info', duration = CONFIG?.UI?.NOTIFICATION_DURATION || 5000) {
    const id = `notification-${Date.now()}`;
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-message">${message}</div>
        <button class="notification-close" aria-label="Close">&times;</button>
      </div>
    `;
    
    let container = document.querySelector('.notification-container');
    if (!container) {
      // Create notification container if it doesn't exist
      container = document.createElement('div');
      container.className = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }
    container.appendChild(notification);
    
    // Add to state
    state.notifications.push({
      id,
      element: notification,
      timeout: null
    });
    
    // Auto-remove after duration
    if (duration > 0) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, duration);
      
      // Store timeout ID
      const notif = state.notifications.find(n => n.id === id);
      if (notif) {
        notif.timeout = timeout;
      }
    }
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    return id;
  }
  
  // Remove a notification
  function removeNotification(id) {
    const index = state.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const notification = state.notifications[index];
      
      // Clear timeout if it exists
      if (notification.timeout) {
        clearTimeout(notification.timeout);
      }
      
      // Animate out
      notification.element.classList.remove('show');
      
      // Remove from DOM after animation
      setTimeout(() => {
        if (notification.element.parentNode) {
          notification.element.parentNode.removeChild(notification.element);
        }
      }, 300);
      
      // Remove from state
      state.notifications.splice(index, 1);
    }
  }
  
  // Show a modal
  function showModal(options) {
    const {
      id = `modal-${Date.now()}`,
      title = '',
      content = '',
      buttons = [],
      onClose = null,
      closeOnBackdrop = true,
      closeOnEsc = true,
      className = ''
    } = options;
    
    // Close if already open
    if (document.getElementById(id)) {
      closeModal(id);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = `modal ${className}`;
    modal.tabIndex = -1;
    
    // Modal content
    let buttonsHTML = '';
    if (buttons.length > 0) {
      buttonsHTML = `
        <div class="modal-footer">
          ${buttons.map(btn => 
            `<button class="btn ${btn.className || ''}" data-action="${btn.action || ''}">
              ${btn.text}
            </button>`
          ).join('')}
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${buttonsHTML}
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Focus modal for keyboard navigation
    modal.focus();
    
    // Add to state
    state.activeModals.push({
      id,
      element: modal,
      onClose
    });
    
    // Add event listeners
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(id));
    }
    
    // Handle button clicks
    const footerBtns = modal.querySelectorAll('.modal-footer .btn');
    footerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action && typeof window[action] === 'function') {
          window[action]();
        }
      });
    });
    
    // Close on ESC
    if (closeOnEsc) {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeModal(id);
        }
      });
    }
    
    // Close on backdrop click
    if (closeOnBackdrop) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(id);
        }
      });
    }
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Animate in
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    return id;
  }
  
  // Close a modal
  function closeModal(id) {
    const index = state.activeModals.findIndex(m => m.id === id);
    if (index !== -1) {
      const modal = state.activeModals[index];
      
      // Call onClose callback if provided
      if (typeof modal.onClose === 'function') {
        modal.onClose();
      }
      
      // Animate out
      modal.element.classList.remove('show');
      
      // Remove from DOM after animation
      setTimeout(() => {
        if (modal.element.parentNode) {
          modal.element.parentNode.removeChild(modal.element);
        }
        
        // Re-enable body scroll if no more modals
        if (state.activeModals.length === 1) {
          document.body.style.overflow = '';
        }
      }, 300);
      
      // Remove from state
      state.activeModals.splice(index, 1);
    }
  }
  
  // Initialize tooltips
  function initTooltips() {
    // This would initialize a tooltip library or set up event listeners
    // For now, we'll just log that tooltips are initialized
    if (CONFIG.DEBUG) {
      console.log('Tooltips initialized');
    }
  }
  
  // Show a tooltip
  function showTooltip(element, content, options = {}) {
    const { position = 'top', delay = 300 } = options;
    const tooltipId = `tooltip-${Date.now()}`;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = tooltipId;
    tooltip.className = `tooltip tooltip-${position}`;
    tooltip.textContent = content;
    
    // Add to DOM
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let top, left;
      
      switch (position) {
        case 'top':
          top = rect.top - tooltipRect.height - 8;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.right + 8;
          break;
      }
      
      // Keep tooltip in viewport
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };
    
    // Show tooltip
    const show = () => {
      tooltip.classList.add('show');
      updatePosition();
    };
    
    // Hide tooltip
    const hide = () => {
      tooltip.classList.remove('show');
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
        delete state.tooltips[tooltipId];
      }, 200);
    };
    
    // Add to state
    state.tooltips[tooltipId] = {
      element: tooltip,
      show,
      hide,
      updatePosition,
      timeout: null
    };
    
    // Set up event listeners
    let showTimeout;
    
    element.addEventListener('mouseenter', () => {
      showTimeout = setTimeout(() => {
        show();
      }, delay);
    });
    
    element.addEventListener('mouseleave', () => {
      clearTimeout(showTimeout);
      hide();
    });
    
    // Update position on window resize
    window.addEventListener('resize', updatePosition);
    
    return {
      id: tooltipId,
      show,
      hide,
      updatePosition
    };
  }
  
  // Toggle loading state
  function toggleLoading(show = true, element = document.body) {
    if (show) {
      element.classList.add('loading');
    } else {
      element.classList.remove('loading');
    }
  }
  
  // Update player stats in the UI
  function updatePlayerStats() {
    // This would update all player-related UI elements
    try {
      // Check if Player module exists and update UI
      if (typeof Player !== 'undefined' && typeof Player.updateUI === 'function') {
        Player.updateUI();
      }
      
      if (CONFIG?.DEBUG) {
        console.log('Updating player stats in UI');
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }
  
  // Public API
  return {
    init,
    showNotification,
    removeNotification,
    showModal,
    closeModal,
    showTooltip,
    toggleLoading,
    updatePlayerStats,
    
    // Getters
    getState: () => ({ ...state }),
    
    // Debug
    debug: {
      showAllTooltips: () => {
        Object.values(state.tooltips).forEach(tooltip => tooltip.show());
      },
      hideAllTooltips: () => {
        Object.values(state.tooltips).forEach(tooltip => tooltip.hide());
      }
    }
  };
})();

// Initialize UI when the DOM is loaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    UI.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = UI;
}

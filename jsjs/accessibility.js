/**
 * Accessibility Module
 * Handles keyboard navigation, ARIA labels, screen reader announcements, and focus management
 * @module Accessibility
 */
const Accessibility = (() => {
  /**
   * @typedef {Object} AccessibilityState
   * @property {boolean} keyboardNavigationEnabled - Keyboard navigation state
   * @property {Element|null} lastFocusedElement - Last focused element before modal
   * @property {Array} focusTrapStack - Stack of focus trap contexts
   */

  const state = {
    keyboardNavigationEnabled: true,
    lastFocusedElement: null,
    focusTrapStack: []
  };

  /**
   * Initialize accessibility features
   * @returns {boolean} True if initialization successful
   */
  function init() {
    setupKeyboardNavigation();
    setupAriaLiveRegion();
    enhanceAriaLabels();
    setupFocusManagement();
    
    console.log('✅ Accessibility initialized');
    return true;
  }

  /**
   * Set up keyboard navigation handlers
   */
  function setupKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Tab key navigation enhancement
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  /**
   * Handle keyboard navigation events
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyboardNavigation(e) {
    // Escape key - close modals, dropdowns, etc.
    if (e.key === 'Escape') {
      handleEscapeKey();
    }
    
    // Enter/Space on buttons
    if ((e.key === 'Enter' || e.key === ' ') && 
        (e.target.tagName === 'BUTTON' || e.target.hasAttribute('role') && e.target.getAttribute('role') === 'button')) {
      e.preventDefault();
      e.target.click();
    }
    
    // Arrow key navigation for lists and menus
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      handleArrowNavigation(e);
    }
    
    // Ctrl/Cmd + K for quick search/command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  }

  /**
   * Handle Escape key press
   */
  function handleEscapeKey() {
    // Close topmost modal
    const modals = document.querySelectorAll('.modal.show');
    if (modals.length > 0) {
      const topModal = modals[modals.length - 1];
      const closeBtn = topModal.querySelector('.modal-close');
      if (closeBtn) closeBtn.click();
      return;
    }
    
    // Close dropdowns
    const dropdowns = document.querySelectorAll('.dropdown-menu.show');
    dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
    
    // Clear search/filter inputs
    const activeSearch = document.querySelector('input[type="search"]:focus, input[type="text"]:focus');
    if (activeSearch && activeSearch.value) {
      activeSearch.value = '';
      activeSearch.dispatchEvent(new Event('input'));
    }
  }

  /**
   * Handle arrow key navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleArrowNavigation(e) {
    const focusable = e.target;
    
    // Check if we're in a list or menu context
    const list = focusable.closest('[role="menu"], [role="listbox"], [role="tablist"], .location-btn');
    if (!list) return;
    
    const items = Array.from(list.parentElement.querySelectorAll(
      '[role="menuitem"], [role="option"], [role="tab"], .location-btn'
    ));
    
    const currentIndex = items.indexOf(focusable);
    let nextIndex;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      default:
        return;
    }
    
    if (items[nextIndex]) {
      items[nextIndex].focus();
    }
  }

  /**
   * Open command palette (future feature)
   */
  function openCommandPalette() {
    // Future implementation for quick navigation
    announce('Command palette - Coming soon');
  }

  /**
   * Set up ARIA live region for announcements
   */
  function setupAriaLiveRegion() {
    let liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - Priority level ('polite' or 'assertive')
   */
  function announce(message, priority = 'polite') {
    const liveRegion = document.getElementById('aria-live-region');
    if (!liveRegion) {
      setupAriaLiveRegion();
      setTimeout(() => announce(message, priority), 100);
      return;
    }
    
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * Enhance ARIA labels throughout the application
   */
  function enhanceAriaLabels() {
    // Add labels to buttons without text
    document.querySelectorAll('button:not([aria-label])').forEach(btn => {
      const icon = btn.querySelector('i[class*="fa-"]');
      if (icon && !btn.textContent.trim()) {
        const iconClass = Array.from(icon.classList).find(c => c.startsWith('fa-'));
        if (iconClass) {
          const label = iconClass.replace('fa-', '').replace(/-/g, ' ');
          btn.setAttribute('aria-label', label);
        }
      }
    });
    
    // Add role to interactive elements
    document.querySelectorAll('.location-btn').forEach(btn => {
      if (!btn.hasAttribute('role')) {
        btn.setAttribute('role', 'button');
      }
      if (!btn.hasAttribute('tabindex')) {
        btn.setAttribute('tabindex', '0');
      }
    });
    
    // Add labels to progress bars
    document.querySelectorAll('.progress-bar').forEach(bar => {
      const label = bar.closest('.stat-bar')?.querySelector('small')?.textContent;
      if (label && !bar.hasAttribute('aria-label')) {
        bar.setAttribute('aria-label', `${label} progress`);
      }
    });
  }

  /**
   * Set up focus management for modals
   */
  function setupFocusManagement() {
    // Trap focus in modals
    document.addEventListener('focusin', (e) => {
      const modal = document.querySelector('.modal.show');
      if (modal && !modal.contains(e.target)) {
        const focusable = getFocusableElements(modal);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    });
  }

  /**
   * Get all focusable elements within a container
   * @param {Element} container - Container element
   * @returns {Array<Element>} Array of focusable elements
   */
  function getFocusableElements(container) {
    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector));
  }

  /**
   * Trap focus within a container
   * @param {Element} container - Container to trap focus in
   */
  function trapFocus(container) {
    state.lastFocusedElement = document.activeElement;
    
    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;
    
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    
    const trapHandler = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    
    container.addEventListener('keydown', trapHandler);
    state.focusTrapStack.push({ container, handler: trapHandler });
    
    // Focus first element
    firstFocusable.focus();
  }

  /**
   * Release focus trap and restore previous focus
   */
  function releaseFocusTrap() {
    const trap = state.focusTrapStack.pop();
    if (trap) {
      trap.container.removeEventListener('keydown', trap.handler);
    }
    
    if (state.lastFocusedElement) {
      state.lastFocusedElement.focus();
      state.lastFocusedElement = null;
    }
  }

  /**
   * Add loading state to button with screen reader announcement
   * @param {Element} button - Button element
   * @param {string} message - Loading message
   */
  function setButtonLoading(button, message = 'Loading') {
    button.classList.add('btn-loading');
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('disabled', 'true');
    announce(message);
  }

  /**
   * Remove loading state from button
   * @param {Element} button - Button element
   * @param {string} message - Completion message
   */
  function setButtonReady(button, message = 'Ready') {
    button.classList.remove('btn-loading');
    button.removeAttribute('aria-busy');
    button.removeAttribute('disabled');
    announce(message);
  }

  /**
   * Create accessible tooltip
   * @param {Element} element - Element to add tooltip to
   * @param {string} text - Tooltip text
   */
  function addTooltip(element, text) {
    element.setAttribute('data-tooltip', text);
    element.setAttribute('aria-label', text);
  }

  /**
   * Announce notification to screen readers
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, warning, error)
   */
  function announceNotification(message, type = 'info') {
    const priority = type === 'error' || type === 'warning' ? 'assertive' : 'polite';
    const prefix = {
      info: 'Info: ',
      success: 'Success: ',
      warning: 'Warning: ',
      error: 'Error: '
    }[type] || '';
    
    announce(prefix + message, priority);
  }

  // Public API
  return {
    init,
    announce,
    trapFocus,
    releaseFocusTrap,
    setButtonLoading,
    setButtonReady,
    addTooltip,
    announceNotification,
    enhanceAriaLabels
  };
})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Accessibility.init());
} else {
  Accessibility.init();
}

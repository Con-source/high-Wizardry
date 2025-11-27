/**
 * Admin Panel Module
 * Handles admin functionality for ban/mute management
 * @module AdminPanel
 */
const AdminPanel = (() => {
  /**
   * Check if current user is an admin
   * For now, this is a placeholder - in production this should be server-validated
   */
  function isAdmin() {
    // TODO: Implement proper admin check via server validation
    // For development, check localStorage for admin flag
    return localStorage.getItem('isAdmin') === 'true';
  }

  /**
   * Initialize admin panel
   */
  function init() {
    setupTabNavigation();
    setupForms();
    
    // Show admin panel button if user is admin
    if (isAdmin()) {
      const adminBtn = document.getElementById('admin-panel-btn');
      if (adminBtn) {
        adminBtn.style.display = 'block';
      }
      console.log('✅ Admin Panel initialized');
    }
  }

  /**
   * Set up tab navigation for admin panel
   */
  function setupTabNavigation() {
    document.querySelectorAll('[data-admin-tab]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.adminTab;
        
        // Update active tab button
        document.querySelectorAll('[data-admin-tab]').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Show corresponding tab content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        const tabContent = document.getElementById(`admin-tab-${tabId}`);
        if (tabContent) {
          tabContent.classList.add('active');
          
          // Load data for list tabs
          if (tabId === 'banned-list') {
            refreshBannedUsers();
          } else if (tabId === 'muted-list') {
            refreshMutedUsers();
          }
        }
      });
    });
  }

  /**
   * Set up admin forms
   */
  function setupForms() {
    // Ban user form
    const banUserForm = document.getElementById('admin-ban-user-form');
    if (banUserForm) {
      banUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await banUser();
      });
    }

    // Mute user form
    const muteUserForm = document.getElementById('admin-mute-user-form');
    if (muteUserForm) {
      muteUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await muteUser();
      });
    }

    // IP ban form
    const ipBanForm = document.getElementById('admin-ip-ban-form');
    if (ipBanForm) {
      ipBanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await banIp();
      });
    }
  }

  /**
   * Ban a user
   */
  async function banUser() {
    const username = document.getElementById('ban-username').value.trim();
    const duration = document.getElementById('ban-duration').value;
    const reason = document.getElementById('ban-reason').value.trim();
    const permanent = document.getElementById('ban-permanent').checked;

    if (!username) {
      showNotification('Please enter a username', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          duration: duration ? parseInt(duration) * 60000 : null, // Convert minutes to ms
          reason,
          permanent,
          bannedBy: 'admin' // TODO: Use actual admin username
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`User ${username} has been banned`, 'success');
        // Clear form
        document.getElementById('admin-ban-user-form').reset();
        refreshAdminStats();
      } else {
        showNotification(result.message || 'Failed to ban user', 'error');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      showNotification('Failed to ban user', 'error');
    }
  }

  /**
   * Unban a user
   */
  async function unbanUser(username) {
    try {
      const response = await fetch('/api/admin/unban-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`User ${username} has been unbanned`, 'success');
        refreshBannedUsers();
        refreshAdminStats();
      } else {
        showNotification(result.message || 'Failed to unban user', 'error');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      showNotification('Failed to unban user', 'error');
    }
  }

  /**
   * Mute a user
   */
  async function muteUser() {
    const username = document.getElementById('mute-username').value.trim();
    const duration = document.getElementById('mute-duration').value;
    const reason = document.getElementById('mute-reason').value.trim();
    const permanent = document.getElementById('mute-permanent').checked;

    if (!username) {
      showNotification('Please enter a username', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/mute-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          duration: duration ? parseInt(duration) * 60000 : null, // Convert minutes to ms
          reason,
          permanent
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`User ${username} has been muted`, 'success');
        // Clear form
        document.getElementById('admin-mute-user-form').reset();
        refreshAdminStats();
      } else {
        showNotification(result.message || 'Failed to mute user', 'error');
      }
    } catch (error) {
      console.error('Error muting user:', error);
      showNotification('Failed to mute user', 'error');
    }
  }

  /**
   * Unmute a user
   */
  async function unmuteUser(username) {
    try {
      const response = await fetch('/api/admin/unmute-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`User ${username} has been unmuted`, 'success');
        refreshMutedUsers();
        refreshAdminStats();
      } else {
        showNotification(result.message || 'Failed to unmute user', 'error');
      }
    } catch (error) {
      console.error('Error unmuting user:', error);
      showNotification('Failed to unmute user', 'error');
    }
  }

  /**
   * Ban an IP address
   */
  async function banIp() {
    const ip = document.getElementById('ban-ip').value.trim();
    const duration = document.getElementById('ip-ban-duration').value;
    const reason = document.getElementById('ip-ban-reason').value.trim();
    const permanent = document.getElementById('ip-ban-permanent').checked;

    if (!ip) {
      showNotification('Please enter an IP address', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/ban-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ip,
          duration: duration ? parseInt(duration) * 60000 : null, // Convert minutes to ms
          reason,
          permanent
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showNotification(`IP ${ip} has been banned`, 'success');
        // Clear form
        document.getElementById('admin-ip-ban-form').reset();
      } else {
        showNotification(result.message || 'Failed to ban IP', 'error');
      }
    } catch (error) {
      console.error('Error banning IP:', error);
      showNotification('Failed to ban IP', 'error');
    }
  }

  /**
   * Refresh the banned users list
   */
  async function refreshBannedUsers() {
    const listEl = document.getElementById('banned-users-list');
    if (!listEl) return;

    listEl.innerHTML = '<p class="text-muted">Loading...</p>';

    try {
      const response = await fetch('/api/admin/banned-users');
      const result = await response.json();
      
      if (result.success && result.bannedUsers) {
        if (result.bannedUsers.length === 0) {
          listEl.innerHTML = '<p class="text-muted">No banned users</p>';
        } else {
          listEl.innerHTML = result.bannedUsers.map(user => `
            <div class="admin-user-item">
              <div class="user-info">
                <div class="user-name">${escapeHtml(user.username)}</div>
                <div class="user-reason">${escapeHtml(user.bannedReason || 'No reason provided')}</div>
                <div class="user-expiry">${user.bannedUntil ? `Expires: ${new Date(user.bannedUntil).toLocaleString()}` : 'Permanent'}</div>
              </div>
              <button class="btn btn-sm btn-success" onclick="AdminPanel.unbanUser('${escapeHtml(user.username)}')">
                <i class="fas fa-check"></i> Unban
              </button>
            </div>
          `).join('');
        }
        
        // Update stat
        const statEl = document.getElementById('admin-stat-banned');
        if (statEl) statEl.textContent = result.bannedUsers.length;
      } else {
        listEl.innerHTML = '<p class="text-danger">Failed to load banned users</p>';
      }
    } catch (error) {
      console.error('Error loading banned users:', error);
      listEl.innerHTML = '<p class="text-danger">Error loading banned users</p>';
    }
  }

  /**
   * Refresh the muted users list
   */
  async function refreshMutedUsers() {
    const listEl = document.getElementById('muted-users-list');
    if (!listEl) return;

    listEl.innerHTML = '<p class="text-muted">Loading...</p>';

    try {
      const response = await fetch('/api/admin/muted-users');
      const result = await response.json();
      
      if (result.success && result.mutedUsers) {
        if (result.mutedUsers.length === 0) {
          listEl.innerHTML = '<p class="text-muted">No muted users</p>';
        } else {
          listEl.innerHTML = result.mutedUsers.map(user => `
            <div class="admin-user-item">
              <div class="user-info">
                <div class="user-name">${escapeHtml(user.username)}</div>
                <div class="user-reason">${escapeHtml(user.mutedReason || 'No reason provided')}</div>
                <div class="user-expiry">${user.mutedUntil ? `Expires: ${new Date(user.mutedUntil).toLocaleString()}` : 'Permanent'}</div>
              </div>
              <button class="btn btn-sm btn-success" onclick="AdminPanel.unmuteUser('${escapeHtml(user.username)}')">
                <i class="fas fa-volume-up"></i> Unmute
              </button>
            </div>
          `).join('');
        }
        
        // Update stat
        const statEl = document.getElementById('admin-stat-muted');
        if (statEl) statEl.textContent = result.mutedUsers.length;
      } else {
        listEl.innerHTML = '<p class="text-danger">Failed to load muted users</p>';
      }
    } catch (error) {
      console.error('Error loading muted users:', error);
      listEl.innerHTML = '<p class="text-danger">Error loading muted users</p>';
    }
  }

  /**
   * Refresh admin panel stats
   */
  async function refreshAdminStats() {
    try {
      // Fetch banned users count
      const bannedResponse = await fetch('/api/admin/banned-users');
      const bannedResult = await bannedResponse.json();
      if (bannedResult.success) {
        const statEl = document.getElementById('admin-stat-banned');
        if (statEl) statEl.textContent = bannedResult.bannedUsers.length;
      }

      // Fetch muted users count
      const mutedResponse = await fetch('/api/admin/muted-users');
      const mutedResult = await mutedResponse.json();
      if (mutedResult.success) {
        const statEl = document.getElementById('admin-stat-muted');
        if (statEl) statEl.textContent = mutedResult.mutedUsers.length;
      }

      // Fetch online players count from health endpoint
      const healthResponse = await fetch('/api/health');
      const healthResult = await healthResponse.json();
      if (healthResult.status === 'ok') {
        const statEl = document.getElementById('admin-stat-online');
        if (statEl) statEl.textContent = healthResult.players || 0;
      }
    } catch (error) {
      console.error('Error refreshing admin stats:', error);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show notification
   */
  function showNotification(message, type = 'info') {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification(message, type);
    } else if (typeof onlineGame !== 'undefined' && typeof onlineGame.showMessage === 'function') {
      onlineGame.showMessage(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  /**
   * Enable admin mode (for development/testing)
   */
  function enableAdmin() {
    localStorage.setItem('isAdmin', 'true');
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) {
      adminBtn.style.display = 'block';
    }
    showNotification('Admin mode enabled', 'success');
    console.log('✅ Admin mode enabled');
  }

  /**
   * Disable admin mode
   */
  function disableAdmin() {
    localStorage.removeItem('isAdmin');
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) {
      adminBtn.style.display = 'none';
    }
    showNotification('Admin mode disabled', 'info');
    console.log('Admin mode disabled');
  }

  // Public API
  return {
    init,
    isAdmin,
    enableAdmin,
    disableAdmin,
    banUser,
    unbanUser,
    muteUser,
    unmuteUser,
    banIp,
    refreshBannedUsers,
    refreshMutedUsers,
    refreshAdminStats
  };
})();

// Initialize admin panel when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AdminPanel.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = AdminPanel;
}

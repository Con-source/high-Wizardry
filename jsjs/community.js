/**
 * Community Module
 * Handles player search functionality and public player profiles
 * Designed for future server-side integration
 */

const Community = (() => {
  // Module state
  const state = {
    searchResults: [],
    currentProfile: null,
    isSearching: false,
    mockPlayers: [] // Simulated player database
  };
  
  // Helper function to escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Initialize the module
  function init() {
    console.log('✅ Community module initialized');
    
    // Generate mock player data for testing
    generateMockPlayers();
    
    // Set up event listeners
    setupEventListeners();
    
    return true;
  }
  
  // Set up event listeners for the community features
  function setupEventListeners() {
    // Search button
    const searchBtn = document.getElementById('player-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearch);
    }
    
    // Search input (Enter key)
    const searchInput = document.getElementById('player-search-input');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleSearch();
        }
      });
    }
  }
  
  // Generate mock player data for testing
  function generateMockPlayers() {
    // Create a simulated database of players
    // This will be replaced with actual API calls in the future
    state.mockPlayers = [
      {
        id: 'player-001',
        username: 'MerlinTheWise',
        level: 15,
        guild: 'Arcane Society',
        stats: {
          intelligence: 25,
          endurance: 18,
          charisma: 20,
          dexterity: 15
        },
        achievements: [
          { id: 'ach-001', name: 'First Steps', description: 'Complete your first quest' },
          { id: 'ach-002', name: 'Master Alchemist', description: 'Craft 100 potions' },
          { id: 'ach-003', name: 'Guild Leader', description: 'Lead a guild to victory' }
        ],
        questsCompleted: 42,
        itemsCrafted: 156,
        joinDate: '2025-01-15',
        online: true
      },
      {
        id: 'player-002',
        username: 'ShadowMage',
        level: 12,
        guild: 'Thieves\' Guild',
        stats: {
          intelligence: 20,
          endurance: 15,
          charisma: 16,
          dexterity: 22
        },
        achievements: [
          { id: 'ach-001', name: 'First Steps', description: 'Complete your first quest' },
          { id: 'ach-004', name: 'Shadow Walker', description: 'Complete 50 stealth missions' }
        ],
        questsCompleted: 35,
        itemsCrafted: 89,
        joinDate: '2025-02-20',
        online: false
      },
      {
        id: 'player-003',
        username: 'DarkLord',
        level: 20,
        guild: 'None',
        stats: {
          intelligence: 30,
          endurance: 28,
          charisma: 10,
          dexterity: 18
        },
        achievements: [
          { id: 'ach-001', name: 'First Steps', description: 'Complete your first quest' },
          { id: 'ach-005', name: 'Dark Master', description: 'Master the dark arts' },
          { id: 'ach-006', name: 'Legendary', description: 'Reach level 20' }
        ],
        questsCompleted: 89,
        itemsCrafted: 234,
        joinDate: '2024-12-01',
        online: false
      },
      {
        id: 'player-004',
        username: 'ElvenArcher',
        level: 10,
        guild: 'Explorer\'s Guild',
        stats: {
          intelligence: 18,
          endurance: 16,
          charisma: 19,
          dexterity: 24
        },
        achievements: [
          { id: 'ach-001', name: 'First Steps', description: 'Complete your first quest' },
          { id: 'ach-007', name: 'Explorer', description: 'Discover all locations' }
        ],
        questsCompleted: 28,
        itemsCrafted: 45,
        joinDate: '2025-03-10',
        online: true
      },
      {
        id: 'player-005',
        username: 'FireMage',
        level: 14,
        guild: 'Arcane Society',
        stats: {
          intelligence: 28,
          endurance: 14,
          charisma: 15,
          dexterity: 12
        },
        achievements: [
          { id: 'ach-001', name: 'First Steps', description: 'Complete your first quest' },
          { id: 'ach-008', name: 'Pyromancer', description: 'Master fire magic' }
        ],
        questsCompleted: 51,
        itemsCrafted: 112,
        joinDate: '2025-01-28',
        online: true
      }
    ];
    
    console.log(`Generated ${state.mockPlayers.length} mock players for testing`);
  }
  
  // Handle search action
  function handleSearch() {
    const searchInput = document.getElementById('player-search-input');
    if (!searchInput) {
      console.error('Search input not found');
      return;
    }
    
    const query = searchInput.value.trim();
    if (query.length === 0) {
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification('Please enter a username to search', 'warning');
      }
      return;
    }
    
    // Perform search
    searchPlayers(query);
  }
  
  // Search for players by username
  // In the future, this will make an API call to the server
  function searchPlayers(query) {
    state.isSearching = true;
    
    // Show loading state
    const resultsContainer = document.getElementById('player-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<p class="text-muted text-center"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';
    }
    
    // Simulate API delay
    setTimeout(() => {
      // Filter mock players by username (case-insensitive)
      const results = state.mockPlayers.filter(player => 
        player.username.toLowerCase().includes(query.toLowerCase())
      );
      
      state.searchResults = results;
      state.isSearching = false;
      
      // Display results
      displaySearchResults(results, query);
      
      console.log(`Found ${results.length} players matching "${query}"`);
    }, 500); // Simulate network delay
  }
  
  // Display search results
  function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('player-search-results');
    if (!resultsContainer) {
      console.error('Search results container not found');
      return;
    }
    
    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> No players found matching "${escapeHtml(query)}"
        </div>
      `;
      return;
    }
    
    // Build results HTML
    let html = `<div class="search-results-header mb-3">
      <h6>Found ${results.length} player${results.length !== 1 ? 's' : ''}</h6>
    </div>`;
    
    results.forEach(player => {
      const onlineStatus = player.online 
        ? '<span class="badge bg-success ms-2">Online</span>' 
        : '<span class="badge bg-secondary ms-2">Offline</span>';
      
      html += `
        <div class="player-search-result" data-player-id="${player.id}">
          <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-2" 
               style="cursor: pointer; transition: all 0.2s;"
               onmouseover="this.style.borderColor='var(--primary)'; this.style.backgroundColor='var(--bg-tertiary)';"
               onmouseout="this.style.borderColor='var(--border-color)'; this.style.backgroundColor='transparent';">
            <div>
              <strong style="color: var(--primary-light);">${player.username}</strong>
              ${onlineStatus}
              <p class="text-muted small mb-0">Level ${player.level} - ${player.guild || 'No Guild'}</p>
            </div>
            <button class="btn btn-sm btn-primary view-profile-btn" data-player-id="${player.id}">
              <i class="fas fa-user"></i> View Profile
            </button>
          </div>
        </div>
      `;
    });
    
    resultsContainer.innerHTML = html;
    
    // Add click handlers to view profile buttons
    const profileBtns = resultsContainer.querySelectorAll('.view-profile-btn');
    profileBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playerId = btn.getAttribute('data-player-id');
        showPlayerProfile(playerId);
      });
    });
    
    // Add click handlers to result items
    const resultItems = resultsContainer.querySelectorAll('.player-search-result > div');
    resultItems.forEach(item => {
      item.addEventListener('click', () => {
        const resultDiv = item.closest('.player-search-result');
        const playerId = resultDiv.getAttribute('data-player-id');
        showPlayerProfile(playerId);
      });
    });
  }
  
  // Show player profile modal
  function showPlayerProfile(playerId) {
    // Find player in mock data
    // In the future, this will make an API call
    const player = state.mockPlayers.find(p => p.id === playerId);
    
    if (!player) {
      console.error('Player not found:', playerId);
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification('Player not found', 'error');
      }
      return;
    }
    
    state.currentProfile = player;
    
    // Create profile HTML
    const profileHTML = createProfileHTML(player);
    
    // Show modal
    if (typeof UI !== 'undefined' && UI.showModal) {
      UI.showModal({
        id: 'player-profile-modal',
        title: `${player.username}'s Profile`,
        content: profileHTML,
        buttons: [
          {
            text: 'Close',
            className: 'btn-secondary'
          }
        ],
        className: 'player-profile-modal'
      });
    } else {
      // Fallback if UI module not available
      console.error('UI module not available for modal');
    }
    
    console.log('Showing profile for:', player.username);
  }
  
  // Create profile HTML
  function createProfileHTML(player) {
    const onlineStatus = player.online 
      ? '<span class="badge bg-success"><i class="fas fa-circle"></i> Online</span>' 
      : '<span class="badge bg-secondary"><i class="fas fa-circle"></i> Offline</span>';
    
    return `
      <div class="player-profile">
        <!-- Profile Header -->
        <div class="profile-header text-center mb-4" style="border-bottom: 2px solid var(--border-color); padding-bottom: 1rem;">
          <div class="player-avatar mb-3" style="font-size: 4rem; color: var(--primary);">
            <i class="fas fa-user-circle"></i>
          </div>
          <h3 style="color: var(--primary-light);">${player.username}</h3>
          ${onlineStatus}
          <p class="text-muted">Member since ${new Date(player.joinDate).toLocaleDateString()}</p>
        </div>
        
        <!-- Basic Info -->
        <div class="row mb-4">
          <div class="col-6">
            <div class="stat-box p-3 text-center" style="background: var(--bg-tertiary); border-radius: 8px;">
              <div style="font-size: 2rem; color: var(--warning);">
                <i class="fas fa-star"></i>
              </div>
              <div class="mt-2">
                <strong style="font-size: 1.5rem; color: var(--primary-light);">${player.level}</strong>
                <p class="text-muted small mb-0">Level</p>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="stat-box p-3 text-center" style="background: var(--bg-tertiary); border-radius: 8px;">
              <div style="font-size: 2rem; color: var(--info);">
                <i class="fas fa-users-cog"></i>
              </div>
              <div class="mt-2">
                <strong style="font-size: 1.2rem; color: var(--primary-light);">${player.guild || 'None'}</strong>
                <p class="text-muted small mb-0">Guild</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Stats -->
        <div class="profile-section mb-4">
          <h5 style="color: var(--primary-light); margin-bottom: 1rem;">
            <i class="fas fa-chart-bar me-2"></i>Stats
          </h5>
          <div class="row">
            <div class="col-6 mb-3">
              <div class="stat-item">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span><i class="fas fa-brain me-1"></i> Intelligence</span>
                  <strong style="color: var(--primary-light);">${player.stats.intelligence}</strong>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar" role="progressbar" 
                       style="width: ${(player.stats.intelligence / 30) * 100}%; background: var(--primary);"></div>
                </div>
              </div>
            </div>
            <div class="col-6 mb-3">
              <div class="stat-item">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span><i class="fas fa-dumbbell me-1"></i> Endurance</span>
                  <strong style="color: var(--primary-light);">${player.stats.endurance}</strong>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar" role="progressbar" 
                       style="width: ${(player.stats.endurance / 30) * 100}%; background: var(--success);"></div>
                </div>
              </div>
            </div>
            <div class="col-6 mb-3">
              <div class="stat-item">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span><i class="fas fa-comments me-1"></i> Charisma</span>
                  <strong style="color: var(--primary-light);">${player.stats.charisma}</strong>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar" role="progressbar" 
                       style="width: ${(player.stats.charisma / 30) * 100}%; background: var(--info);"></div>
                </div>
              </div>
            </div>
            <div class="col-6 mb-3">
              <div class="stat-item">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span><i class="fas fa-hand-sparkles me-1"></i> Dexterity</span>
                  <strong style="color: var(--primary-light);">${player.stats.dexterity}</strong>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar" role="progressbar" 
                       style="width: ${(player.stats.dexterity / 30) * 100}%; background: var(--warning);"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Activity -->
        <div class="profile-section mb-4">
          <h5 style="color: var(--primary-light); margin-bottom: 1rem;">
            <i class="fas fa-chart-line me-2"></i>Activity
          </h5>
          <div class="row">
            <div class="col-6">
              <div class="activity-stat p-3 text-center" style="background: var(--bg-tertiary); border-radius: 8px;">
                <strong style="font-size: 1.5rem; color: var(--success);">${player.questsCompleted}</strong>
                <p class="text-muted small mb-0">Quests Completed</p>
              </div>
            </div>
            <div class="col-6">
              <div class="activity-stat p-3 text-center" style="background: var(--bg-tertiary); border-radius: 8px;">
                <strong style="font-size: 1.5rem; color: var(--warning);">${player.itemsCrafted}</strong>
                <p class="text-muted small mb-0">Items Crafted</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Achievements -->
        <div class="profile-section">
          <h5 style="color: var(--primary-light); margin-bottom: 1rem;">
            <i class="fas fa-trophy me-2"></i>Achievements (${player.achievements.length})
          </h5>
          <div class="achievements-list">
            ${player.achievements.map(ach => `
              <div class="achievement-item mb-2 p-2" 
                   style="background: var(--bg-tertiary); border-left: 3px solid var(--warning); border-radius: 4px;">
                <div class="d-flex align-items-center">
                  <div class="achievement-icon me-3" style="font-size: 1.5rem; color: var(--warning);">
                    <i class="fas fa-trophy"></i>
                  </div>
                  <div>
                    <strong style="color: var(--primary-light);">${ach.name}</strong>
                    <p class="text-muted small mb-0">${ach.description}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  // API functions for future server integration
  // These functions define the interface that will be used when connecting to a real backend
  const API = {
    // Search players on the server
    async searchPlayers(query) {
      // Future implementation:
      // return await fetch(`${CONFIG.API.BASE_URL}/players/search?q=${query}`)
      //   .then(res => res.json());
      
      // For now, use mock data
      console.log('API.searchPlayers called with query:', query);
      return state.mockPlayers.filter(p => 
        p.username.toLowerCase().includes(query.toLowerCase())
      );
    },
    
    // Get player profile by ID
    async getPlayerProfile(playerId) {
      // Future implementation:
      // return await fetch(`${CONFIG.API.BASE_URL}/players/${playerId}`)
      //   .then(res => res.json());
      
      // For now, use mock data
      console.log('API.getPlayerProfile called with ID:', playerId);
      return state.mockPlayers.find(p => p.id === playerId);
    },
    
    // Add friend
    async addFriend(playerId) {
      // Future implementation:
      // return await fetch(`${CONFIG.API.BASE_URL}/friends/add`, {
      //   method: 'POST',
      //   body: JSON.stringify({ playerId })
      // }).then(res => res.json());
      
      console.log('API.addFriend called with ID:', playerId);
      return { success: true, message: 'Friend request sent!' };
    }
  };
  
  // Public API
  return {
    init,
    searchPlayers,
    showPlayerProfile,
    getSearchResults: () => [...state.searchResults],
    getCurrentProfile: () => state.currentProfile ? {...state.currentProfile} : null,
    
    // API interface for future use
    API,
    
    // For testing/debugging
    _debug: {
      getMockPlayers: () => [...state.mockPlayers],
      getState: () => ({...state})
    }
  };
})();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Community.init();
    });
  } else {
    Community.init();
  }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Community;
}

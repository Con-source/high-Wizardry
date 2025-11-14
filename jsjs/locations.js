/**
 * Locations Module
 * Handles all location-specific functionality and navigation
 */

const Locations = (() => {
  // Location state
  let currentLocation = 'town-square';
  
  // Location data
  const locationData = {
    'town-square': {
      name: 'Town Square',
      description: 'The bustling heart of the magical city. Wizards and adventurers gather here.',
      contentId: null,
      unlocked: true
    },
    'home': {
      name: 'My Home',
      description: 'Your personal sanctuary. A place to rest and manage your belongings.',
      contentId: 'location-content-home',
      unlocked: true
    },
    'hospital': {
      name: 'Hospital',
      description: 'Heal your wounds and restore your vitality.',
      contentId: 'location-content-hospital',
      unlocked: true
    },
    'education': {
      name: 'Education',
      description: 'Train your skills and improve your abilities.',
      contentId: 'location-content-education',
      unlocked: true
    },
    'property': {
      name: 'Property Management',
      description: 'View and manage your real estate investments.',
      contentId: 'location-content-property',
      unlocked: true
    },
    'quests': {
      name: 'Quest Board',
      description: 'Accept quests to earn rewards and experience.',
      contentId: 'location-content-quests',
      unlocked: true
    },
    'crimes': {
      name: 'Criminal Activities',
      description: 'Engage in illegal activities to earn quick money. Beware of consequences!',
      contentId: 'location-content-crimes',
      unlocked: true
    },
    'jail': {
      name: 'Jail',
      description: 'The city jail. Serve your time for your crimes.',
      contentId: 'location-content-jail',
      unlocked: true
    },
    'casino': {
      name: 'The Golden Dice Casino',
      description: 'Try your luck at various games of chance!',
      contentId: 'location-content-casino',
      unlocked: true
    },
    'newspaper': {
      name: 'The Daily Wizard',
      description: 'Stay informed about events in the magical world.',
      contentId: 'location-content-newspaper',
      unlocked: true
    },
    'friends': {
      name: 'Friends & Enemies',
      description: 'Manage your social relationships.',
      contentId: 'location-content-friends',
      unlocked: true
    },
    'magic-shop': {
      name: 'Magic Shop',
      description: 'A shop filled with magical artifacts and ingredients.',
      contentId: null,
      unlocked: true
    },
    'tavern': {
      name: 'The Drunken Wizard',
      description: 'A cozy tavern where adventurers share stories and drinks.',
      contentId: null,
      unlocked: true
    },
    'workshop': {
      name: 'Workshop',
      description: 'Craft powerful items and equipment using gathered resources.',
      contentId: 'location-content-workshop',
      unlocked: true
    },
    'guilds': {
      name: 'Guild Hall',
      description: 'Join guilds to gain special perks and benefits.',
      contentId: 'location-content-guilds',
      unlocked: true
    },
    // New expandable world areas
    'enchanted-forest': {
      name: 'Enchanted Forest',
      description: 'A mystical woodland filled with magical creatures and rare herbs.',
      contentId: 'location-content-enchanted-forest',
      unlocked: false,
      unlockRequirement: {
        type: 'quests',
        value: 5,
        message: 'Complete 5 quests to unlock'
      },
      icon: 'fa-tree'
    },
    'arcane-temple': {
      name: 'Arcane Temple',
      description: 'A ruined temple where arcane experiments went awry.',
      contentId: 'location-content-arcane-temple',
      unlocked: false,
      unlockRequirement: {
        type: 'level',
        value: 7,
        message: 'Reach Level 7 to unlock'
      },
      icon: 'fa-landmark'
    },
    'crystal-peak-mines': {
      name: 'Crystal Peak Mines',
      description: 'Hazardous mines filled with monsters yet rich in minerals.',
      contentId: 'location-content-crystal-peak-mines',
      unlocked: false,
      unlockRequirement: {
        type: 'item',
        value: 'mining-gear',
        message: 'Requires Mining Gear from Merchant Guild'
      },
      icon: 'fa-mountain'
    }
  };
  
  // Initialize locations module
  function init() {
    setupLocationButtons();
    console.log('✅ Locations module initialized');
  }
  
  // Setup location button event listeners
  function setupLocationButtons() {
    const locationButtons = document.querySelectorAll('.location-btn');
    locationButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const location = e.currentTarget.getAttribute('data-location');
        navigateToLocation(location);
      });
    });
  }
  
  // Check if location is unlocked
  function isLocationUnlocked(locationId) {
    const location = locationData[locationId];
    if (!location) return false;
    
    // If no unlock requirement, it's always unlocked
    if (location.unlocked === undefined) return true;
    if (location.unlocked === true) return true;
    
    // Check unlock requirements
    if (!location.unlockRequirement) return false;
    
    const req = location.unlockRequirement;
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    
    switch (req.type) {
      case 'quests':
        const questsCompleted = playerData.questsCompleted || 0;
        return questsCompleted >= req.value;
      
      case 'level':
        return playerData.level >= req.value;
      
      case 'item':
        const craftedItems = playerData.craftedItems || {};
        return craftedItems[req.value] > 0;
      
      default:
        return false;
    }
  }
  
  // Try to unlock location
  function tryUnlockLocation(locationId) {
    if (isLocationUnlocked(locationId)) {
      locationData[locationId].unlocked = true;
      return true;
    }
    return false;
  }
  
  // Navigate to a location
  function navigateToLocation(locationId) {
    if (!locationData[locationId]) {
      console.error(`Unknown location: ${locationId}`);
      return;
    }
    
    const location = locationData[locationId];
    
    // Check if location is unlocked
    if (!isLocationUnlocked(locationId)) {
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification(
          `Location locked: ${location.unlockRequirement.message}`,
          'warning'
        );
      }
      return;
    }
    
    currentLocation = locationId;
    
    // Show "New Resources Found" for new areas
    if (['enchanted-forest', 'arcane-temple', 'crystal-peak-mines'].includes(locationId)) {
      if (typeof Resources !== 'undefined') {
        const resources = Resources.getLocationResources(locationId);
        if (resources.length > 0 && typeof UI !== 'undefined' && UI.showNotification) {
          UI.showNotification('New resources available in this area!', 'info');
        }
      }
    }
    
    // Update active button
    document.querySelectorAll('.location-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-location="${locationId}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    
    // Update header
    const nameEl = document.getElementById('location-name');
    const descEl = document.getElementById('location-description');
    if (nameEl) nameEl.textContent = location.name;
    if (descEl) descEl.textContent = location.description;
    
    // Hide all location content
    document.querySelectorAll('.location-content').forEach(el => {
      el.style.display = 'none';
    });
    
    // Show relevant location content
    if (location.contentId) {
      const contentEl = document.getElementById(location.contentId);
      if (contentEl) {
        contentEl.style.display = 'block';
      }
    }
    
    // Update UI with current player stats
    if (typeof Player !== 'undefined' && typeof Player.updateUI === 'function') {
      Player.updateUI();
      updateLocationStats(locationId);
    }
    
    // Update location-specific UIs
    if (locationId === 'workshop' && typeof Workshop !== 'undefined' && Workshop.updateWorkshopUI) {
      Workshop.updateWorkshopUI();
    }
    if (locationId === 'guilds' && typeof Guilds !== 'undefined' && Guilds.updateGuildUI) {
      Guilds.updateGuildUI();
    }
    if (typeof Resources !== 'undefined' && Resources.updateResourceUI) {
      Resources.updateResourceUI();
    }
    
    console.log(`Navigated to: ${location.name}`);
  }
  
  // Update location-specific stats display
  function updateLocationStats(locationId) {
    if (locationId === 'education' && typeof Player !== 'undefined') {
      const playerData = Player.getData();
      if (playerData) {
        const statFields = ['intelligence', 'endurance', 'charisma', 'dexterity'];
        statFields.forEach(stat => {
          const el = document.getElementById(`${stat}-level`);
          if (el && playerData[stat]) {
            el.textContent = playerData[stat];
          }
        });
      }
    }
  }
  
  // Get current location
  function getCurrentLocation() {
    return currentLocation;
  }
  
  // Public API
  return {
    init,
    navigateToLocation,
    getCurrentLocation,
    isLocationUnlocked,
    tryUnlockLocation,
    getLocationData: (id) => locationData[id]
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Locations.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Locations;
}

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
      contentId: null
    },
    'home': {
      name: 'My Home',
      description: 'Your personal sanctuary. A place to rest and manage your belongings.',
      contentId: 'location-content-home'
    },
    'hospital': {
      name: 'Hospital',
      description: 'Heal your wounds and restore your vitality.',
      contentId: 'location-content-hospital'
    },
    'education': {
      name: 'Education',
      description: 'Train your skills and improve your abilities.',
      contentId: 'location-content-education'
    },
    'property': {
      name: 'Property Management',
      description: 'View and manage your real estate investments.',
      contentId: 'location-content-property'
    },
    'quests': {
      name: 'Quest Board',
      description: 'Accept quests to earn rewards and experience.',
      contentId: 'location-content-quests'
    },
    'crimes': {
      name: 'Criminal Activities',
      description: 'Engage in illegal activities to earn quick money. Beware of consequences!',
      contentId: 'location-content-crimes'
    },
    'jail': {
      name: 'Jail',
      description: 'The city jail. Serve your time for your crimes.',
      contentId: 'location-content-jail'
    },
    'casino': {
      name: 'The Golden Dice Casino',
      description: 'Try your luck at various games of chance!',
      contentId: 'location-content-casino'
    },
    'newspaper': {
      name: 'The Daily Wizard',
      description: 'Stay informed about events in the magical world.',
      contentId: 'location-content-newspaper'
    },
    'friends': {
      name: 'Friends & Enemies',
      description: 'Manage your social relationships.',
      contentId: 'location-content-friends'
    },
    'magic-shop': {
      name: 'Magic Shop',
      description: 'A shop filled with magical artifacts and ingredients.',
      contentId: null
    },
    'tavern': {
      name: 'The Drunken Wizard',
      description: 'A cozy tavern where adventurers share stories and drinks.',
      contentId: null
    },
    'fair-alley': {
      name: 'Fair Alleyway',
      description: 'A bustling marketplace with merchants selling exotic goods and rare items.',
      contentId: 'location-content-fair-alley'
    },
    'guild-district': {
      name: 'Guild District',
      description: 'Home to various guilds offering unique benefits and opportunities.',
      contentId: 'location-content-guild-district'
    },
    'smuggling-routes': {
      name: 'Smuggling Routes',
      description: 'Shadowy paths used by smugglers for risky but lucrative trade.',
      contentId: 'location-content-smuggling-routes'
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
  
  // Navigate to a location
  function navigateToLocation(locationId) {
    if (!locationData[locationId]) {
      console.error(`Unknown location: ${locationId}`);
      return;
    }
    
    // Check if Travel module exists and if we should use it
    const useTravel = typeof Travel !== 'undefined' && typeof Travel.isTraveling === 'function';
    
    // If not currently traveling and trying to change location, show travel modal
    if (useTravel && !Travel.isTraveling() && currentLocation !== locationId) {
      const travelCurrentLocation = Travel.getCurrentLocation();
      
      // Only trigger travel if we're not at the destination
      if (travelCurrentLocation !== locationId) {
        Travel.showTravelModal(locationId);
        return;
      }
    }
    
    const location = locationData[locationId];
    currentLocation = locationId;
    
    // Update Travel module's current location if available
    if (useTravel && typeof Travel.setCurrentLocation === 'function') {
      Travel.setCurrentLocation(locationId);
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
    getCurrentLocation
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

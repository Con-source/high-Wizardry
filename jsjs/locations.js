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
    'goblin-outpost': {
      name: 'Goblin Outpost',
      description: 'A hidden camp of goblin traders dealing in stolen goods and rare artifacts.',
      contentId: 'location-content-goblin-outpost'
    },
    'abandoned-warehouse': {
      name: 'Abandoned Warehouse',
      description: 'A decrepit warehouse on the docks where smugglers meet in secret.',
      contentId: 'location-content-abandoned-warehouse'
    },
    'shady-alley': {
      name: 'Shady Alley',
      description: 'A dark alley where the city\'s underground market thrives.',
      contentId: 'location-content-shady-alley'
    },
    'smuggled-goods': {
      name: 'Smuggled Goods',
      description: 'Manage your illegally acquired items and smuggling operations.',
      contentId: 'location-content-smuggled-goods'
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
    
    const location = locationData[locationId];
    currentLocation = locationId;
    
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
    
    // Update Black Market vendor UI if applicable
    if (typeof BlackMarket !== 'undefined' && 
        ['goblin-outpost', 'abandoned-warehouse', 'shady-alley'].includes(locationId)) {
      updateBlackMarketUI(locationId);
    }
    
    // Update smuggled goods UI
    if (locationId === 'smuggled-goods' && typeof BlackMarket !== 'undefined') {
      updateSmuggledGoodsUI();
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
  
  // Update Black Market vendor UI
  function updateBlackMarketUI(locationId) {
    if (typeof BlackMarket === 'undefined') return;
    
    const inventory = BlackMarket.getVendorInventory(locationId);
    const containerId = locationId === 'goblin-outpost' ? 'goblin-vendor-inventory' :
                        locationId === 'abandoned-warehouse' ? 'warehouse-vendor-inventory' :
                        'alley-vendor-inventory';
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (inventory.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No items available at the moment. Check back later!</div>';
      return;
    }
    
    container.innerHTML = inventory.map(item => `
      <div class="vendor-item">
        <div class="item-name">${item.name}</div>
        <span class="item-rarity ${item.rarity}">${item.rarity.toUpperCase()}</span>
        <div class="item-description">${item.description}</div>
        <div class="item-uses"><i class="fas fa-info-circle"></i> ${item.uses}</div>
        <div class="item-price"><i class="fas fa-coins"></i> ${item.price} Gold</div>
        <div class="item-stock">Stock: ${item.stock}</div>
        <button class="btn btn-danger btn-sm w-100 mt-2" onclick="purchaseBlackMarketItem('${locationId}', '${item.id}')">
          <i class="fas fa-shopping-cart"></i> Purchase
        </button>
      </div>
    `).join('');
  }
  
  // Update smuggled goods UI
  function updateSmuggledGoodsUI() {
    if (typeof BlackMarket === 'undefined') return;
    
    const goods = BlackMarket.getSmuggledGoods();
    const container = document.getElementById('smuggled-goods-inventory');
    
    if (!container) return;
    
    if (goods.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-box-open"></i> No smuggled goods. Visit Black Market vendors to acquire items!
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="card bg-dark">
        <div class="card-body">
          <h5 class="card-title">Your Smuggled Goods</h5>
          ${goods.map(item => `
            <div class="smuggled-item">
              <div class="item-info">
                <div>
                  <strong>${item.name}</strong> 
                  <span class="item-rarity ${item.rarity} ms-2">${item.rarity}</span>
                </div>
                <div class="text-muted small">${item.description}</div>
                <div class="text-info small"><i class="fas fa-box"></i> Quantity: ${item.quantity}</div>
                ${item.resaleValue ? `<div class="text-success small"><i class="fas fa-coins"></i> Resale Value: ${item.resaleValue} Gold</div>` : ''}
              </div>
              <div class="item-actions">
                <button class="btn btn-warning btn-sm" onclick="smuggleItem('${item.id}')" title="Attempt to smuggle this item">
                  <i class="fas fa-shipping-fast"></i> Smuggle
                </button>
                <button class="btn btn-info btn-sm" onclick="sellSmuggledItem('${item.id}')" title="Sell at 70% value">
                  <i class="fas fa-hand-holding-usd"></i> Sell
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Public API
  return {
    init,
    navigateToLocation,
    getCurrentLocation,
    updateBlackMarketUI,
    updateSmuggledGoodsUI
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

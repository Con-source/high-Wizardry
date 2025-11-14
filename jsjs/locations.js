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
    if (typeof BlackMarket !== 'undefined' && BlackMarket.isBlackMarketLocation(locationId)) {
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
    
    // Clear container
    container.innerHTML = '';
    
    if (inventory.length === 0) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-info';
      alert.textContent = 'No items available at the moment. Check back later!';
      container.appendChild(alert);
      return;
    }
    
    // Create vendor items using DOM manipulation
    inventory.forEach(item => {
      const itemCard = document.createElement('div');
      itemCard.className = 'vendor-item';
      
      const itemName = document.createElement('div');
      itemName.className = 'item-name';
      itemName.textContent = item.name;
      itemCard.appendChild(itemName);
      
      const rarityBadge = document.createElement('span');
      rarityBadge.className = `item-rarity ${item.rarity}`;
      rarityBadge.textContent = item.rarity.toUpperCase();
      itemCard.appendChild(rarityBadge);
      
      const itemDesc = document.createElement('div');
      itemDesc.className = 'item-description';
      itemDesc.textContent = item.description;
      itemCard.appendChild(itemDesc);
      
      const itemUses = document.createElement('div');
      itemUses.className = 'item-uses';
      const usesIcon = document.createElement('i');
      usesIcon.className = 'fas fa-info-circle';
      usesIcon.setAttribute('aria-hidden', 'true');
      itemUses.appendChild(usesIcon);
      itemUses.appendChild(document.createTextNode(' ' + item.uses));
      itemCard.appendChild(itemUses);
      
      const itemPrice = document.createElement('div');
      itemPrice.className = 'item-price';
      const priceIcon = document.createElement('i');
      priceIcon.className = 'fas fa-coins';
      priceIcon.setAttribute('aria-hidden', 'true');
      itemPrice.appendChild(priceIcon);
      itemPrice.appendChild(document.createTextNode(' ' + item.price + ' Shillings'));
      itemCard.appendChild(itemPrice);
      
      const itemStock = document.createElement('div');
      itemStock.className = 'item-stock';
      itemStock.textContent = 'Stock: ' + item.stock;
      itemCard.appendChild(itemStock);
      
      const purchaseBtn = document.createElement('button');
      purchaseBtn.className = 'btn btn-danger btn-sm w-100 mt-2';
      purchaseBtn.setAttribute('aria-label', `Purchase ${item.name} for ${item.price} shillings`);
      purchaseBtn.onclick = () => purchaseBlackMarketItem(locationId, item.id);
      const btnIcon = document.createElement('i');
      btnIcon.className = 'fas fa-shopping-cart';
      btnIcon.setAttribute('aria-hidden', 'true');
      purchaseBtn.appendChild(btnIcon);
      purchaseBtn.appendChild(document.createTextNode(' Purchase'));
      itemCard.appendChild(purchaseBtn);
      
      container.appendChild(itemCard);
    });
  }
  
  // Update smuggled goods UI
  function updateSmuggledGoodsUI() {
    if (typeof BlackMarket === 'undefined') return;
    
    const goods = BlackMarket.getSmuggledGoods();
    const container = document.getElementById('smuggled-goods-inventory');
    
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (goods.length === 0) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-info';
      const icon = document.createElement('i');
      icon.className = 'fas fa-box-open';
      icon.setAttribute('aria-hidden', 'true');
      alert.appendChild(icon);
      alert.appendChild(document.createTextNode(' No smuggled goods. Visit Black Market vendors to acquire items!'));
      container.appendChild(alert);
      return;
    }
    
    // Create card structure
    const card = document.createElement('div');
    card.className = 'card bg-dark';
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    const cardTitle = document.createElement('h5');
    cardTitle.className = 'card-title';
    cardTitle.textContent = 'Your Smuggled Goods';
    cardBody.appendChild(cardTitle);
    
    // Create smuggled items using DOM manipulation
    goods.forEach(item => {
      const smuggledItem = document.createElement('div');
      smuggledItem.className = 'smuggled-item';
      
      const itemInfo = document.createElement('div');
      itemInfo.className = 'item-info';
      
      const nameDiv = document.createElement('div');
      const itemName = document.createElement('strong');
      itemName.textContent = item.name;
      nameDiv.appendChild(itemName);
      nameDiv.appendChild(document.createTextNode(' '));
      
      const raritySpan = document.createElement('span');
      raritySpan.className = `item-rarity ${item.rarity} ms-2`;
      raritySpan.textContent = item.rarity;
      nameDiv.appendChild(raritySpan);
      itemInfo.appendChild(nameDiv);
      
      const descDiv = document.createElement('div');
      descDiv.className = 'text-muted small';
      descDiv.textContent = item.description;
      itemInfo.appendChild(descDiv);
      
      const quantityDiv = document.createElement('div');
      quantityDiv.className = 'text-info small';
      const qtyIcon = document.createElement('i');
      qtyIcon.className = 'fas fa-box';
      qtyIcon.setAttribute('aria-hidden', 'true');
      quantityDiv.appendChild(qtyIcon);
      quantityDiv.appendChild(document.createTextNode(' Quantity: ' + item.quantity));
      itemInfo.appendChild(quantityDiv);
      
      if (item.resaleValue) {
        const resaleDiv = document.createElement('div');
        resaleDiv.className = 'text-success small';
        const resaleIcon = document.createElement('i');
        resaleIcon.className = 'fas fa-coins';
        resaleIcon.setAttribute('aria-hidden', 'true');
        resaleDiv.appendChild(resaleIcon);
        resaleDiv.appendChild(document.createTextNode(' Resale Value: ' + item.resaleValue + ' Shillings'));
        itemInfo.appendChild(resaleDiv);
      }
      
      smuggledItem.appendChild(itemInfo);
      
      const itemActions = document.createElement('div');
      itemActions.className = 'item-actions';
      
      const smuggleBtn = document.createElement('button');
      smuggleBtn.className = 'btn btn-warning btn-sm';
      smuggleBtn.title = 'Attempt to smuggle this item';
      smuggleBtn.setAttribute('aria-label', `Smuggle ${item.name}`);
      smuggleBtn.onclick = () => smuggleItem(item.id);
      const smuggleIcon = document.createElement('i');
      smuggleIcon.className = 'fas fa-shipping-fast';
      smuggleIcon.setAttribute('aria-hidden', 'true');
      smuggleBtn.appendChild(smuggleIcon);
      smuggleBtn.appendChild(document.createTextNode(' Smuggle'));
      itemActions.appendChild(smuggleBtn);
      
      const sellBtn = document.createElement('button');
      sellBtn.className = 'btn btn-info btn-sm';
      sellBtn.title = 'Sell at 70% value';
      sellBtn.setAttribute('aria-label', `Sell ${item.name}`);
      sellBtn.onclick = () => sellSmuggledItem(item.id);
      const sellIcon = document.createElement('i');
      sellIcon.className = 'fas fa-hand-holding-usd';
      sellIcon.setAttribute('aria-hidden', 'true');
      sellBtn.appendChild(sellIcon);
      sellBtn.appendChild(document.createTextNode(' Sell'));
      itemActions.appendChild(sellBtn);
      
      smuggledItem.appendChild(itemActions);
      cardBody.appendChild(smuggledItem);
    });
    
    card.appendChild(cardBody);
    container.appendChild(card);
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

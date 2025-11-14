/**
 * Black Market Module
 * Handles Black Market vendors, smuggling mechanics, and contraband trading
 */

const BlackMarket = (() => {
  // Black Market state
  let state = {
    currentVendor: null,
    smuggledGoods: [],
    lastRotation: Date.now(),
    rotationInterval: 3600000, // 1 hour in milliseconds
    smugglingRisk: 30, // Base risk percentage
    guildDiscountActive: false
  };

  // Black Market locations with unique vendors
  const locations = {
    'goblin-outpost': {
      id: 'goblin-outpost',
      name: 'Goblin Outpost',
      description: 'A hidden camp of goblin traders dealing in stolen goods and rare artifacts.',
      icon: 'fa-campground',
      vendor: {
        name: 'Grizelda the Fence',
        greeting: 'Psst! Looking for something... special?',
        discount: 1.10, // 10% markup for dangerous location
        riskLevel: 'high'
      }
    },
    'abandoned-warehouse': {
      id: 'abandoned-warehouse',
      name: 'Abandoned Warehouse',
      description: 'A decrepit warehouse on the docks where smugglers meet in secret.',
      icon: 'fa-warehouse',
      vendor: {
        name: 'Marcus the Smuggler',
        greeting: 'Welcome, friend. I have goods from across the realm.',
        discount: 1.05, // 5% markup
        riskLevel: 'medium'
      }
    },
    'shady-alley': {
      id: 'shady-alley',
      name: 'Shady Alley',
      description: 'A dark alley where the city\'s underground market thrives.',
      icon: 'fa-mask',
      vendor: {
        name: 'The Shadow Broker',
        greeting: 'Looking to make a deal? Keep it quiet...',
        discount: 1.0, // No markup
        riskLevel: 'low'
      }
    }
  };

  // Black Market items catalog
  const itemsCatalog = {
    // Crafting Components
    'shadow-essence': {
      id: 'shadow-essence',
      name: 'Shadow Essence',
      category: 'crafting',
      description: 'A rare magical essence used in dark enchantments.',
      basePrice: 150,
      rarity: 'rare',
      weight: 1,
      uses: 'Alchemy Ingredient',
      seasonal: false
    },
    'phoenix-feather': {
      id: 'phoenix-feather',
      name: 'Phoenix Feather',
      category: 'crafting',
      description: 'A legendary feather with powerful fire magic properties.',
      basePrice: 500,
      rarity: 'legendary',
      weight: 1,
      uses: 'High-tier Crafting',
      seasonal: true
    },
    'void-crystal': {
      id: 'void-crystal',
      name: 'Void Crystal',
      category: 'crafting',
      description: 'A crystal pulsing with otherworldly energy.',
      basePrice: 300,
      rarity: 'epic',
      weight: 2,
      uses: 'Weapon Enhancement',
      seasonal: false
    },
    'dragons-blood': {
      id: 'dragons-blood',
      name: 'Dragon\'s Blood',
      category: 'crafting',
      description: 'Rare alchemical reagent from ancient dragons.',
      basePrice: 400,
      rarity: 'epic',
      weight: 1,
      uses: 'Potion Brewing',
      seasonal: false
    },
    
    // Rare Magical Resources
    'mana-pearl': {
      id: 'mana-pearl',
      name: 'Mana Pearl',
      category: 'resource',
      description: 'A pearl infused with pure magical energy.',
      basePrice: 200,
      rarity: 'rare',
      weight: 1,
      uses: 'Mana Restoration',
      seasonal: false
    },
    'cursed-rune': {
      id: 'cursed-rune',
      name: 'Cursed Rune',
      category: 'resource',
      description: 'A dangerous rune with unpredictable power.',
      basePrice: 250,
      rarity: 'rare',
      weight: 1,
      uses: 'Dark Magic',
      seasonal: false
    },
    'ethereal-dust': {
      id: 'ethereal-dust',
      name: 'Ethereal Dust',
      category: 'resource',
      description: 'Dust from the ethereal plane, highly sought after.',
      basePrice: 180,
      rarity: 'rare',
      weight: 1,
      uses: 'Enchanting',
      seasonal: false
    },
    
    // Contraband with high resale value
    'elven-wine': {
      id: 'elven-wine',
      name: 'Elven Wine',
      category: 'contraband',
      description: 'Illegally exported wine from the Elven kingdoms.',
      basePrice: 100,
      resaleValue: 180,
      rarity: 'uncommon',
      weight: 3,
      uses: 'Luxury Contraband',
      seasonal: false
    },
    'royal-jewels': {
      id: 'royal-jewels',
      name: 'Royal Jewels',
      category: 'contraband',
      description: 'Stolen jewels from a noble house. Very risky to possess.',
      basePrice: 600,
      resaleValue: 1200,
      rarity: 'legendary',
      weight: 2,
      uses: 'High-value Contraband',
      seasonal: false
    },
    'forbidden-tome': {
      id: 'forbidden-tome',
      name: 'Forbidden Tome',
      category: 'contraband',
      description: 'A banned spellbook containing forbidden knowledge.',
      basePrice: 350,
      resaleValue: 600,
      rarity: 'epic',
      weight: 2,
      uses: 'Knowledge Contraband',
      seasonal: false
    },
    'exotic-spices': {
      id: 'exotic-spices',
      name: 'Exotic Spices',
      category: 'contraband',
      description: 'Rare spices from distant lands, heavily taxed.',
      basePrice: 80,
      resaleValue: 150,
      rarity: 'common',
      weight: 2,
      uses: 'Trade Goods',
      seasonal: false
    }
  };

  // Vendor inventory management
  const vendorInventories = {
    'goblin-outpost': [],
    'abandoned-warehouse': [],
    'shady-alley': []
  };

  // Initialize the Black Market module
  function init() {
    try {
      // Load saved state
      loadState();
      
      // Generate initial inventories
      if (!state.lastRotation || Date.now() - state.lastRotation > state.rotationInterval) {
        rotateAllInventories();
      } else {
        // Load saved inventories
        loadInventories();
      }
      
      console.log('✅ Black Market module initialized');
      return true;
    } catch (error) {
      console.error('Error initializing Black Market module:', error);
      return false;
    }
  }

  // Generate inventory for a specific vendor
  function generateInventory(locationId) {
    const location = locations[locationId];
    if (!location) return [];

    const inventory = [];
    const itemsArray = Object.values(itemsCatalog);
    
    // Determine number of items based on vendor (5-8 items)
    const numItems = Math.floor(Math.random() * 4) + 5;
    
    // Select random items with appropriate rarity distribution
    const availableItems = [...itemsArray];
    while (inventory.length < numItems && availableItems.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      const item = availableItems.splice(randomIndex, 1)[0];
      
      // Skip seasonal items outside of rotation
      if (item.seasonal && Math.random() > 0.3) continue;
      
      // Calculate price with vendor markup
      const finalPrice = Math.floor(item.basePrice * location.vendor.discount);
      
      inventory.push({
        ...item,
        price: finalPrice,
        stock: Math.floor(Math.random() * 5) + 1 // 1-5 in stock
      });
    }
    
    vendorInventories[locationId] = inventory;
    return inventory;
  }

  // Rotate all vendor inventories
  function rotateAllInventories() {
    Object.keys(locations).forEach(locationId => {
      generateInventory(locationId);
    });
    
    state.lastRotation = Date.now();
    saveState();
    
    console.log('🔄 Black Market inventories rotated');
  }

  // Get vendor inventory for a location
  function getVendorInventory(locationId) {
    if (!vendorInventories[locationId] || vendorInventories[locationId].length === 0) {
      generateInventory(locationId);
    }
    return vendorInventories[locationId];
  }

  // Purchase item from vendor
  function purchaseItem(locationId, itemId) {
    if (typeof Player === 'undefined') {
      console.error('Player module not available');
      return false;
    }

    const playerData = Player.getData();
    const inventory = vendorInventories[locationId];
    const itemIndex = inventory.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
      showNotification('Item not available', 'error');
      return false;
    }
    
    const item = inventory[itemIndex];
    
    // Check if player has enough gold
    if (playerData.gold < item.price) {
      showNotification('Not enough shillings!', 'error');
      return false;
    }
    
    // Check if item is in stock
    if (item.stock <= 0) {
      showNotification('Item out of stock!', 'warning');
      return false;
    }
    
    // Purchase item
    if (!Player.removeGold(item.price)) {
      return false;
    }
    
    // Add to smuggled goods
    addToSmuggledGoods(item);
    
    // Decrease stock
    item.stock--;
    if (item.stock <= 0) {
      inventory.splice(itemIndex, 1);
    }
    
    saveInventories();
    saveState();
    
    showNotification(`Purchased ${item.name} for ${item.price} shillings`, 'success');
    addGameLog(`Bought ${item.name} from Black Market`);
    
    return true;
  }

  // Add item to smuggled goods inventory
  function addToSmuggledGoods(item) {
    const playerData = Player.getData();
    // Shallow copy inventory to avoid mutating playerData directly
    const inventory = { ...(playerData.inventory || {}) };
    
    // Shallow copy smuggledGoods array to avoid mutating original
    const smuggledGoods = Array.isArray(inventory.smuggledGoods)
      ? [...inventory.smuggledGoods]
      : [];
    
    // Check if item already exists
    const existingIndex = smuggledGoods.findIndex(i => i.id === item.id);
    if (existingIndex !== -1) {
      // Clone the item object to avoid mutating original
      const updatedItem = { ...smuggledGoods[existingIndex] };
      updatedItem.quantity = (updatedItem.quantity || 1) + 1;
      smuggledGoods[existingIndex] = updatedItem;
    } else {
      smuggledGoods.push({
        ...item,
        quantity: 1,
        purchaseDate: Date.now()
      });
    }
    
    inventory.smuggledGoods = smuggledGoods;
    Player.updateData({ inventory });
    state.smuggledGoods = smuggledGoods;
  }

  // Get player's smuggled goods
  function getSmuggledGoods() {
    if (typeof Player === 'undefined') return [];
    
    const playerData = Player.getData();
    return playerData.inventory?.smuggledGoods || [];
  }

  // Attempt to smuggle goods back
  function smuggleGoods(itemId) {
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    const smuggledGoods = playerData.inventory?.smuggledGoods || [];
    const itemIndex = smuggledGoods.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
      showNotification('Item not found in smuggled goods', 'error');
      return false;
    }
    
    const item = smuggledGoods[itemIndex];
    
    // Calculate risk based on item rarity and base risk
    const rarityRisk = {
      'common': 10,
      'uncommon': 20,
      'rare': 30,
      'epic': 40,
      'legendary': 50
    };
    
    const totalRisk = state.smugglingRisk + (rarityRisk[item.rarity] || 30);
    const adjustedRisk = state.guildDiscountActive ? totalRisk * 0.8 : totalRisk;
    
    // Determine if smuggling succeeds
    const success = Math.random() * 100 > adjustedRisk;
    
    if (success) {
      // Success - convert to inventory or sell
      let profit = 0;
      
      if (item.category === 'contraband' && item.resaleValue) {
        // Sell contraband for profit
        profit = item.resaleValue;
        Player.addGold(profit);
        showNotification(`Successfully smuggled ${item.name}! Sold for ${profit} shillings`, 'success');
      } else {
        // Add to regular inventory for crafting
        const inventory = { ...playerData.inventory };
        if (!inventory.craftingMaterials) {
          inventory.craftingMaterials = [];
        }
        inventory.craftingMaterials = [...inventory.craftingMaterials, item];
        Player.updateData({ inventory });
        showNotification(`Successfully smuggled ${item.name}! Added to inventory`, 'success');
      }
      
      // Remove from smuggled goods - work on a fresh copy
      const updatedSmuggledGoods = smuggledGoods.map(g => ({ ...g }));
      updatedSmuggledGoods[itemIndex].quantity--;
      if (updatedSmuggledGoods[itemIndex].quantity <= 0) {
        updatedSmuggledGoods.splice(itemIndex, 1);
      }
      
      Player.updateData({ inventory: { ...playerData.inventory, smuggledGoods: updatedSmuggledGoods } });
      Player.addXP(50);
      addGameLog(`Successfully smuggled ${item.name}`);
      
    } else {
      // Failed - item confiscated
      // Work on a fresh copy to avoid mutating original playerData
      const updatedSmuggledGoods = smuggledGoods.map(g => ({ ...g }));
      updatedSmuggledGoods[itemIndex].quantity--;
      if (updatedSmuggledGoods[itemIndex].quantity <= 0) {
        updatedSmuggledGoods.splice(itemIndex, 1);
      }
      
      Player.updateData({ inventory: { ...playerData.inventory, smuggledGoods: updatedSmuggledGoods } });
      
      showNotification(`${item.name} was confiscated!`, 'error');
      addGameLog(`Failed to smuggle ${item.name} - confiscated`);
      
      // Small chance of jail time for high-value items
      if (item.rarity === 'legendary' || item.rarity === 'epic') {
        if (Math.random() < 0.3) {
          if (typeof sendToJail === 'function') {
            sendToJail(5);
          }
        }
      }
    }
    
    saveState();
    return success;
  }

  // Smuggle all goods at once
  function smuggleAllGoods() {
    const goods = getSmuggledGoods();
    if (goods.length === 0) {
      showNotification('No items to smuggle', 'info');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Create a copy to iterate over
    const itemsToSmuggle = [...goods];
    
    itemsToSmuggle.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        if (smuggleGoods(item.id)) {
          successCount++;
        } else {
          failCount++;
        }
      }
    });
    
    showNotification(`Smuggling complete: ${successCount} success, ${failCount} confiscated`, 'info');
  }

  // Activate Smugglers' Guild perk
  function activateGuildDiscount() {
    state.guildDiscountActive = true;
    state.smugglingRisk = Math.max(10, state.smugglingRisk - 10);
    saveState();
    showNotification('Smugglers\' Guild perks activated!', 'success');
  }

  // Sell item from smuggled goods
  function sellSmuggledItem(itemId) {
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    const smuggledGoods = playerData.inventory?.smuggledGoods || [];
    const itemIndex = smuggledGoods.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
      showNotification('Item not found', 'error');
      return false;
    }
    
    const item = smuggledGoods[itemIndex];
    const sellPrice = Math.floor(item.price * 0.7); // Sell for 70% of purchase price
    
    Player.addGold(sellPrice);
    
    // Work on a fresh copy to avoid mutating original playerData
    const updatedSmuggledGoods = smuggledGoods.map(g => ({ ...g }));
    updatedSmuggledGoods[itemIndex].quantity--;
    if (updatedSmuggledGoods[itemIndex].quantity <= 0) {
      updatedSmuggledGoods.splice(itemIndex, 1);
    }
    
    Player.updateData({ inventory: { ...playerData.inventory, smuggledGoods: updatedSmuggledGoods } });
    saveState();
    
    showNotification(`Sold ${item.name} for ${sellPrice} shillings`, 'success');
    addGameLog(`Sold ${item.name} from smuggled goods`);
    
    return true;
  }

  // Save state to localStorage
  function saveState() {
    try {
      localStorage.setItem('blackMarketState', JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving Black Market state:', error);
      return false;
    }
  }

  // Load state from localStorage
  function loadState() {
    try {
      const saved = localStorage.getItem('blackMarketState');
      if (saved) {
        state = { ...state, ...JSON.parse(saved) };
      }
      return true;
    } catch (error) {
      console.error('Error loading Black Market state:', error);
      return false;
    }
  }

  // Save inventories to localStorage
  function saveInventories() {
    try {
      localStorage.setItem('blackMarketInventories', JSON.stringify(vendorInventories));
      return true;
    } catch (error) {
      console.error('Error saving inventories:', error);
      return false;
    }
  }

  // Load inventories from localStorage
  function loadInventories() {
    try {
      const saved = localStorage.getItem('blackMarketInventories');
      if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(vendorInventories, loaded);
      } else {
        rotateAllInventories();
      }
      return true;
    } catch (error) {
      console.error('Error loading inventories:', error);
      rotateAllInventories();
      return false;
    }
  }

  // Utility functions
  function showNotification(message, type = 'info') {
    if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
      UI.showNotification(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  function addGameLog(message) {
    const logEntries = document.getElementById('log-entries');
    if (!logEntries) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${timestamp}] ${message}`;
    
    logEntries.appendChild(entry);
    
    const gameLog = document.getElementById('game-log');
    if (gameLog) {
      gameLog.scrollTop = gameLog.scrollHeight;
    }
  }

  // Check if a location is a Black Market location
  function isBlackMarketLocation(locationId) {
    return ['goblin-outpost', 'abandoned-warehouse', 'shady-alley'].includes(locationId);
  }

  // Public API
  return {
    init,
    getLocations: () => locations,
    getVendorInventory,
    purchaseItem,
    getSmuggledGoods,
    smuggleGoods,
    smuggleAllGoods,
    sellSmuggledItem,
    rotateAllInventories,
    activateGuildDiscount,
    isBlackMarketLocation,
    getState: () => ({ ...state })
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    BlackMarket.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = BlackMarket;
}

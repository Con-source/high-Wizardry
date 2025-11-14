/**
 * Resources Module
 * Handles resource gathering, inventory, and management
 */

const Resources = (() => {
  // Resource definitions
  const RESOURCE_TYPES = {
    // Enchanted Forest Resources
    'glow-moss': {
      id: 'glow-moss',
      name: 'Glow Moss',
      description: 'A luminescent moss that glows with magical energy',
      rarity: 'common',
      icon: 'fa-leaf',
      location: 'enchanted-forest'
    },
    'mystic-berries': {
      id: 'mystic-berries',
      name: 'Mystic Berries',
      description: 'Magical berries with rejuvenating properties',
      rarity: 'common',
      icon: 'fa-apple-alt',
      location: 'enchanted-forest'
    },
    'elemental-water': {
      id: 'elemental-water',
      name: 'Elemental Water',
      description: 'Pure water infused with elemental magic',
      rarity: 'uncommon',
      icon: 'fa-tint',
      location: 'enchanted-forest'
    },
    
    // Arcane Temple Resources
    'arcane-crystals': {
      id: 'arcane-crystals',
      name: 'Arcane Crystals',
      description: 'Crystals pulsing with arcane power',
      rarity: 'rare',
      icon: 'fa-gem',
      location: 'arcane-temple'
    },
    'enchanted-scrolls': {
      id: 'enchanted-scrolls',
      name: 'Enchanted Scrolls',
      description: 'Ancient scrolls containing powerful spells',
      rarity: 'rare',
      icon: 'fa-scroll',
      location: 'arcane-temple'
    },
    
    // Crystal Peak Mines Resources
    'obsidian': {
      id: 'obsidian',
      name: 'Obsidian',
      description: 'Dark volcanic glass with protective properties',
      rarity: 'uncommon',
      icon: 'fa-circle',
      location: 'crystal-peak-mines'
    },
    'raw-gems': {
      id: 'raw-gems',
      name: 'Raw Gems',
      description: 'Unpolished gems of various types',
      rarity: 'uncommon',
      icon: 'fa-gem',
      location: 'crystal-peak-mines'
    },
    'lunar-powder': {
      id: 'lunar-powder',
      name: 'Lunar Powder',
      description: 'Mystical powder that glows under moonlight',
      rarity: 'rare',
      icon: 'fa-moon',
      location: 'crystal-peak-mines'
    }
  };
  
  // Initialize resources
  function init() {
    // Check if player has resources inventory
    if (typeof Player !== 'undefined') {
      const playerData = Player.getData();
      if (!playerData.resources) {
        Player.updateData({ resources: {} });
      }
    }
    
    console.log('✅ Resources module initialized');
    return true;
  }
  
  // Get player's resources
  function getPlayerResources() {
    if (typeof Player === 'undefined') return {};
    
    const playerData = Player.getData();
    return playerData.resources || {};
  }
  
  // Get resource details
  function getResourceInfo(resourceId) {
    return RESOURCE_TYPES[resourceId] || null;
  }
  
  // Get all resources for a location
  function getLocationResources(locationId) {
    return Object.values(RESOURCE_TYPES).filter(r => r.location === locationId);
  }
  
  // Add resource to player inventory
  function addResource(resourceId, amount = 1) {
    if (!RESOURCE_TYPES[resourceId]) {
      console.error(`Unknown resource: ${resourceId}`);
      return false;
    }
    
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    
    resources[resourceId] = (resources[resourceId] || 0) + amount;
    Player.updateData({ resources });
    
    const resource = RESOURCE_TYPES[resourceId];
    if (typeof UI !== 'undefined' && UI.showNotification) {
      UI.showNotification(`Found ${amount}x ${resource.name}!`, 'success');
    }
    
    updateResourceUI();
    return true;
  }
  
  // Remove resource from player inventory
  function removeResource(resourceId, amount = 1) {
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    
    const current = resources[resourceId] || 0;
    if (current < amount) {
      console.warn(`Not enough ${resourceId}`);
      return false;
    }
    
    resources[resourceId] = current - amount;
    Player.updateData({ resources });
    
    updateResourceUI();
    return true;
  }
  
  // Check if player has enough resources
  function hasResources(requirements) {
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    
    for (const [resourceId, amount] of Object.entries(requirements)) {
      if ((resources[resourceId] || 0) < amount) {
        return false;
      }
    }
    
    return true;
  }
  
  // Gather resources from current location
  function gatherResources(locationId) {
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    
    // Check energy
    let energyCost = 10;
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('explorer', 'faster-gathering')) {
        energyCost *= 0.75; // 25% reduction
      }
    }
    if (playerData.energy < energyCost) {
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification('Not enough energy to gather resources!', 'warning');
      }
      return false;
    }
    
    // Get available resources for location
    let availableResources = getLocationResources(locationId);
    if (availableResources.length === 0) {
      console.warn(`No resources available at ${locationId}`);
      return false;
    }
    
    // Explorer's Guild bonus-resources perk: Add extra resources to pool
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('explorer', 'bonus-resources')) {
        // 20% chance to gather double resources
        if (Math.random() < 0.2) {
          // Will gather 2 resources instead of 1 at the end
        }
      }
    }
    
    // Reduce energy
    Player.updateData({ energy: playerData.energy - energyCost });
    
    // Random resource with weighted rarity
    let weights = { common: 60, uncommon: 30, rare: 10 };
    
    // Explorer's Guild rare-finds perk: Increase rare drop rate
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('explorer', 'rare-finds')) {
        // Increase rare chance from 10% to 20%, reduce common from 60% to 50%
        weights = { common: 50, uncommon: 30, rare: 20 };
      }
    }
    
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const rand = Math.random() * totalWeight;
    
    let selectedRarity = 'common';
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }
    
    // Filter by rarity
    const possibleResources = availableResources.filter(r => r.rarity === selectedRarity);
    let resource;
    if (possibleResources.length === 0) {
      // Fallback to any resource
      resource = availableResources[Math.floor(Math.random() * availableResources.length)];
    } else {
      resource = possibleResources[Math.floor(Math.random() * possibleResources.length)];
    }
    
    // Determine amount (bonus-resources perk)
    let amount = 1;
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('explorer', 'bonus-resources') && Math.random() < 0.2) {
        amount = 2; // 20% chance to gather 2 resources
      }
    }
    
    addResource(resource.id, amount);
    
    // Add XP
    if (typeof Player !== 'undefined' && Player.addXP) {
      Player.addXP(5);
    }
    
    return true;
  }
  
  // Update resource display in UI
  function updateResourceUI() {
    const container = document.getElementById('resource-inventory');
    if (!container) return;
    
    const resources = getPlayerResources();
    const resourceEntries = Object.entries(resources)
      .filter(([id, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]); // Sort by amount
    
    if (resourceEntries.length === 0) {
      container.innerHTML = '<p class="text-muted small">No resources yet</p>';
      return;
    }
    
    container.innerHTML = resourceEntries.map(([resourceId, amount]) => {
      const resource = RESOURCE_TYPES[resourceId];
      if (!resource) return '';
      
      const rarityColors = {
        common: 'text-secondary',
        uncommon: 'text-info',
        rare: 'text-warning',
        legendary: 'text-danger'
      };
      
      return `
        <div class="resource-item mb-1 d-flex justify-content-between align-items-center">
          <div>
            <i class="fas ${resource.icon} ${rarityColors[resource.rarity]}"></i>
            <small>${resource.name}</small>
          </div>
          <span class="badge bg-secondary">${amount}</span>
        </div>
      `;
    }).join('');
  }
  
  // Public API
  return {
    init,
    getPlayerResources,
    getResourceInfo,
    getLocationResources,
    addResource,
    removeResource,
    hasResources,
    gatherResources,
    updateResourceUI,
    
    // Expose resource types for crafting
    RESOURCE_TYPES
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Resources.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Resources;
}

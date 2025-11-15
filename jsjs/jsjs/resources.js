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
    // Ensure Player has resources storage
    if (typeof Player !== 'undefined') {
      const playerData = Player.getData();
      if (!playerData.resources) {
        Player.updateData({ resources: {} });
      }
    }
    console.log('✅ Resources module initialized');
    return true;
  }
  
  function getPlayerResources() {
    if (typeof Player === 'undefined') return {};
    const playerData = Player.getData();
    return playerData.resources || {};
  }
  
  function getResourceInfo(resourceId) {
    return RESOURCE_TYPES[resourceId] || null;
  }
  
  function getLocationResources(locationId) {
    return Object.values(RESOURCE_TYPES).filter(r => r.location === locationId);
  }
  
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
  
  function hasResources(requirements) {
    if (typeof Player === 'undefined') return false;
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    for (const [resourceId, amount] of Object.entries(requirements)) {
      if ((resources[resourceId] || 0) < amount) return false;
    }
    return true;
  }
  
  function gatherResources(locationId) {
    if (typeof Player === 'undefined') return false;
    const playerData = Player.getData();
    const energyCost = 10;
    if (playerData.energy < energyCost) {
      if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Not enough energy to gather resources!', 'warning');
      return false;
    }
    const availableResources = getLocationResources(locationId);
    if (availableResources.length === 0) {
      console.warn(`No resources available at ${locationId}`);
      return false;
    }
    Player.updateData({ energy: playerData.energy - energyCost });
    const weights = { common: 60, uncommon: 30, rare: 10 };
    const totalWeight = Object.values(weights).reduce((a,b) => a + b, 0);
    const rand = Math.random() * totalWeight;
    let selectedRarity = 'common';
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand <= cumulative) { selectedRarity = rarity; break; }
    }
    const possibleResources = availableResources.filter(r => r.rarity === selectedRarity);
    if (possibleResources.length === 0) {
      const resource = availableResources[Math.floor(Math.random() * availableResources.length)];
      addResource(resource.id, 1);
    } else {
      const resource = possibleResources[Math.floor(Math.random() * possibleResources.length)];
      addResource(resource.id, 1);
    }
    if (typeof Player !== 'undefined' && Player.addXP) Player.addXP(5);
    return true;
  }
  
  function updateResourceUI() {
    const container = document.getElementById('resource-inventory');
    if (!container) return;
    const resources = getPlayerResources();
    const resourceEntries = Object.entries(resources).filter(([id, amount]) => amount > 0).sort((a,b) => b[1] - a[1]);
    if (resourceEntries.length === 0) {
      container.innerHTML = '<p class="text-muted small">No resources yet</p>';
      return;
    }
    container.innerHTML = resourceEntries.map(([resourceId, amount]) => {
      const resource = RESOURCE_TYPES[resourceId];
      if (!resource) return '';
      const rarityColors = { common: 'text-secondary', uncommon: 'text-info', rare: 'text-warning', legendary: 'text-danger' };
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
    RESOURCE_TYPES
  };
})();
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => { Resources.init(); });
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') { module.exports = Resources; }

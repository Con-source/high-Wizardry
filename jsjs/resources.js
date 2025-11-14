/* Resources Module
 * Handles resource gathering, inventory, and management
 */

const Resources = (() => {
  // Resource definitions
  const RESOURCE_TYPES = {
    'glow-moss': { id: 'glow-moss', name: 'Glow Moss', description: 'A luminescent moss that glows with magical energy', rarity: 'common', icon: 'fa-leaf', location: 'enchanted-forest' },
    'mystic-berries': { id: 'mystic-berries', name: 'Mystic Berries', description: 'Magical berries with rejuvenating properties', rarity: 'common', icon: 'fa-apple-alt', location: 'enchanted-forest' },
    'elemental-water': { id: 'elemental-water', name: 'Elemental Water', description: 'Pure water infused with elemental magic', rarity: 'uncommon', icon: 'fa-tint', location: 'enchanted-forest' },
    'arcane-crystals': { id: 'arcane-crystals', name: 'Arcane Crystals', description: 'Crystals pulsing with arcane power', rarity: 'rare', icon: 'fa-gem', location: 'arcane-temple' },
    'enchanted-scrolls': { id: 'enchanted-scrolls', name: 'Enchanted Scrolls', description: 'Ancient scrolls containing powerful spells', rarity: 'rare', icon: 'fa-scroll', location: 'arcane-temple' },
    'obsidian': { id: 'obsidian', name: 'Obsidian', description: 'Dark volcanic glass with protective properties', rarity: 'uncommon', icon: 'fa-circle', location: 'crystal-peak-mines' },
    'raw-gems': { id: 'raw-gems', name: 'Raw Gems', description: 'Unpolished gems of various types', rarity: 'uncommon', icon: 'fa-gem', location: 'crystal-peak-mines' },
    'lunar-powder': { id: 'lunar-powder', name: 'Lunar Powder', description: 'Mystical powder that glows under moonlight', rarity: 'rare', icon: 'fa-moon', location: 'crystal-peak-mines' }
  };

  function init() {
    if (typeof Player !== 'undefined' && typeof Player.getData === 'function') {
      const playerData = Player.getData();
      if (!playerData.resources) {
        if (typeof Player.updateData === 'function') Player.updateData({ resources: {} });
        else if (typeof Player.setData === 'function') Player.setData(Object.assign({}, playerData, { resources: {} }));
      }
    }
    console.log('✅ Resources module initialized');
    return true;
  }

  function getPlayerResources() { if (typeof Player === 'undefined') return {}; const playerData = Player.getData(); return playerData.resources || {}; }
  function getResourceInfo(resourceId) { return RESOURCE_TYPES[resourceId] || null; }
  function getLocationResources(locationId) { return Object.values(RESOURCE_TYPES).filter(r => r.location === locationId); }

  function addResource(resourceId, amount = 1) {
    if (!RESOURCE_TYPES[resourceId]) { console.error(`Unknown resource: ${resourceId}`); return false; }
    if (typeof Player === 'undefined' || typeof Player.getData !== 'function') return false;
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    resources[resourceId] = (resources[resourceId] || 0) + amount;
    if (typeof Player.updateData === 'function') Player.updateData({ resources });
    else if (typeof Player.setData === 'function') Player.setData(Object.assign({}, playerData, { resources }));
    const resource = RESOURCE_TYPES[resourceId];
    if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`Found ${amount}x ${resource.name}!`, 'success');
    updateResourceUI();
    return true;
  }

  function removeResource(resourceId, amount = 1) {
    if (typeof Player === 'undefined' || typeof Player.getData !== 'function') return false;
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    const current = resources[resourceId] || 0;
    if (current < amount) { console.warn(`Not enough ${resourceId}`); return false; }
    resources[resourceId] = current - amount;
    if (typeof Player.updateData === 'function') Player.updateData({ resources });
    else if (typeof Player.setData === 'function') Player.setData(Object.assign({}, playerData, { resources }));
    updateResourceUI();
    return true;
  }

  function hasResources(requirements) {
    if (typeof Player === 'undefined' || typeof Player.getData !== 'function') return false;
    const playerData = Player.getData();
    const resources = playerData.resources || {};
    for (const [resourceId, amount] of Object.entries(requirements)) {
      if ((resources[resourceId] || 0) < amount) return false;
    }
    return true;
  }

  function gatherResources(locationId) {
    if (typeof Player === 'undefined' || typeof Player.getData !== 'function') return false;
    const playerData = Player.getData();
    let energyCost = 10;
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('explorer', 'faster-gathering')) energyCost = Math.ceil(energyCost * 0.75);
    }
    if ((playerData.energy || 0) < energyCost) { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Not enough energy to gather resources!', 'warning'); return false; }
    const availableResources = getLocationResources(locationId);
    if (availableResources.length === 0) { console.warn(`No resources available at ${locationId}`); return false; }
    if (typeof Player.updateData === 'function') Player.updateData({ energy: (playerData.energy || 0) - energyCost });
    else if (typeof Player.setData === 'function') Player.setData(Object.assign({}, playerData, { energy: (playerData.energy || 0) - energyCost }));

    let weights = { common: 60, uncommon: 30, rare: 10 };
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('explorer', 'rare-finds')) weights = { common: 50, uncommon: 30, rare: 20 };
    }
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const rand = Math.random() * totalWeight;
    let selectedRarity = 'common'; let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) { cumulative += weight; if (rand <= cumulative) { selectedRarity = rarity; break; } }
    const possibleResources = availableResources.filter(r => r.rarity === selectedRarity);
    const resource = possibleResources.length === 0 ? availableResources[Math.floor(Math.random() * availableResources.length)] : possibleResources[Math.floor(Math.random() * possibleResources.length)];
    let amount = 1;
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk && Guilds.hasGuildPerk('explorer', 'bonus-resources') && Math.random() < 0.2) amount = 2;
    addResource(resource.id, amount);
    if (typeof Player.addXP === 'function') Player.addXP(5);
    return true;
  }

  function updateResourceUI() {
    const container = document.getElementById('resource-inventory'); if (!container) return;
    const resources = getPlayerResources();
    const resourceEntries = Object.entries(resources).filter(([id, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
    if (resourceEntries.length === 0) { container.innerHTML = '<p class="text-muted small">No resources yet</p>'; return; }
    container.innerHTML = resourceEntries.map(([resourceId, amount]) => {
      const resource = RESOURCE_TYPES[resourceId]; if (!resource) return '';
      const rarityColors = { common: 'text-secondary', uncommon: 'text-info', rare: 'text-warning', legendary: 'text-danger' };
      return `\n        <div class="resource-item mb-1 d-flex justify-content-between align-items-center">\n          <div>\n            <i class="fas ${resource.icon} ${rarityColors[resource.rarity]}"></i>\n            <small>${resource.name}</small>\n          </div>\n          <span class="badge bg-secondary">${amount}</span>\n        </div>\n      `;
    }).join('');
  }

  return { init, getPlayerResources, getResourceInfo, getLocationResources, addResource, removeResource, hasResources, gatherResources, updateResourceUI, RESOURCE_TYPES };
})();

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => { Resources.init(); });
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = Resources;
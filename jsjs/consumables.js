/**
 * Consumables Module - NEW
 * Manages potions, scrolls, and other consumable items
 * @module Consumables
 */

const Consumables = (() => {
  /**
   * @typedef {Object} Consumable
   * @property {string} id - Unique identifier
   * @property {string} name - Display name
   * @property {string} description - Item description
   * @property {string} type - Type (potion, scroll, food, elixir)
   * @property {string} icon - Font Awesome icon class
   * @property {number} cost - Purchase cost in pennies
   * @property {number} sellValue - Sell value in pennies
   * @property {string} rarity - Rarity (common, uncommon, rare, epic, legendary)
   * @property {Function} effect - Function that applies the item effect
   * @property {number} duration - Effect duration in milliseconds (0 for instant)
   * @property {number} cooldown - Cooldown in milliseconds
   */

  /**
   * Consumable item definitions - NEW FEATURE
   * @type {Object.<string, Consumable>}
   */
  const CONSUMABLES = {
    // Basic Potions
    'minor-health-potion': {
      id: 'minor-health-potion',
      name: 'Minor Health Potion',
      description: 'Restores 25 health instantly',
      type: 'potion',
      icon: 'fa-flask',
      cost: 120, // 10 shillings
      sellValue: 60,
      rarity: 'common',
      effect: (player) => {
        const healAmount = 25;
        const newHealth = Math.min(player.maxHealth, player.health + healAmount);
        return { health: newHealth };
      },
      duration: 0,
      cooldown: 10000 // 10 seconds
    },
    'health-potion': {
      id: 'health-potion',
      name: 'Health Potion',
      description: 'Restores 50 health instantly',
      type: 'potion',
      icon: 'fa-flask',
      cost: 240, // 20 shillings
      sellValue: 120,
      rarity: 'uncommon',
      effect: (player) => {
        const healAmount = 50;
        const newHealth = Math.min(player.maxHealth, player.health + healAmount);
        return { health: newHealth };
      },
      duration: 0,
      cooldown: 10000
    },
    'major-health-potion': {
      id: 'major-health-potion',
      name: 'Major Health Potion',
      description: 'Restores 100 health instantly',
      type: 'potion',
      icon: 'fa-flask',
      cost: 600, // 50 shillings
      sellValue: 300,
      rarity: 'rare',
      effect: (player) => {
        const healAmount = 100;
        const newHealth = Math.min(player.maxHealth, player.health + healAmount);
        return { health: newHealth };
      },
      duration: 0,
      cooldown: 10000
    },
    'full-health-potion': {
      id: 'full-health-potion',
      name: 'Full Health Potion',
      description: 'Restores all health instantly',
      type: 'potion',
      icon: 'fa-flask',
      cost: 1200, // 100 shillings
      sellValue: 600,
      rarity: 'epic',
      effect: (player) => {
        return { health: player.maxHealth };
      },
      duration: 0,
      cooldown: 30000 // 30 seconds
    },

    // Mana Potions
    'minor-mana-potion': {
      id: 'minor-mana-potion',
      name: 'Minor Mana Potion',
      description: 'Restores 20 mana instantly',
      type: 'potion',
      icon: 'fa-vial',
      cost: 120,
      sellValue: 60,
      rarity: 'common',
      effect: (player) => {
        const restoreAmount = 20;
        const newMana = Math.min(player.maxMana, player.mana + restoreAmount);
        return { mana: newMana };
      },
      duration: 0,
      cooldown: 10000
    },
    'mana-potion': {
      id: 'mana-potion',
      name: 'Mana Potion',
      description: 'Restores 40 mana instantly',
      type: 'potion',
      icon: 'fa-vial',
      cost: 240,
      sellValue: 120,
      rarity: 'uncommon',
      effect: (player) => {
        const restoreAmount = 40;
        const newMana = Math.min(player.maxMana, player.mana + restoreAmount);
        return { mana: newMana };
      },
      duration: 0,
      cooldown: 10000
    },

    // Energy Potions
    'energy-drink': {
      id: 'energy-drink',
      name: 'Energy Drink',
      description: 'Restores 30 energy instantly',
      type: 'potion',
      icon: 'fa-coffee',
      cost: 96, // 8 shillings
      sellValue: 48,
      rarity: 'common',
      effect: (player) => {
        const restoreAmount = 30;
        const newEnergy = Math.min(player.maxEnergy, player.energy + restoreAmount);
        return { energy: newEnergy };
      },
      duration: 0,
      cooldown: 15000
    },
    'stamina-elixir': {
      id: 'stamina-elixir',
      name: 'Stamina Elixir',
      description: 'Increases max energy by 20 for 5 minutes',
      type: 'elixir',
      icon: 'fa-bolt',
      cost: 480, // 40 shillings
      sellValue: 240,
      rarity: 'rare',
      effect: (player) => {
        return {
          maxEnergy: player.maxEnergy + 20,
          energy: Math.min(player.energy + 20, player.maxEnergy + 20)
        };
      },
      duration: 300000, // 5 minutes
      cooldown: 600000 // 10 minutes
    },

    // Buff Scrolls
    'scroll-of-intelligence': {
      id: 'scroll-of-intelligence',
      name: 'Scroll of Intelligence',
      description: 'Increases intelligence by 5 for 10 minutes',
      type: 'scroll',
      icon: 'fa-scroll',
      cost: 360, // 30 shillings
      sellValue: 180,
      rarity: 'uncommon',
      effect: (player) => {
        return { intelligence: player.intelligence + 5 };
      },
      duration: 600000, // 10 minutes
      cooldown: 1200000 // 20 minutes
    },
    'scroll-of-endurance': {
      id: 'scroll-of-endurance',
      name: 'Scroll of Endurance',
      description: 'Increases endurance by 5 for 10 minutes',
      type: 'scroll',
      icon: 'fa-scroll',
      cost: 360,
      sellValue: 180,
      rarity: 'uncommon',
      effect: (player) => {
        return { endurance: player.endurance + 5 };
      },
      duration: 600000,
      cooldown: 1200000
    },
    'scroll-of-charisma': {
      id: 'scroll-of-charisma',
      name: 'Scroll of Charisma',
      description: 'Increases charisma by 5 for 10 minutes',
      type: 'scroll',
      icon: 'fa-scroll',
      cost: 360,
      sellValue: 180,
      rarity: 'uncommon',
      effect: (player) => {
        return { charisma: player.charisma + 5 };
      },
      duration: 600000,
      cooldown: 1200000
    },
    'scroll-of-dexterity': {
      id: 'scroll-of-dexterity',
      name: 'Scroll of Dexterity',
      description: 'Increases dexterity by 5 for 10 minutes',
      type: 'scroll',
      icon: 'fa-scroll',
      cost: 360,
      sellValue: 180,
      rarity: 'uncommon',
      effect: (player) => {
        return { dexterity: player.dexterity + 5 };
      },
      duration: 600000,
      cooldown: 1200000
    },

    // Rare Food Items
    'wizards-bread': {
      id: 'wizards-bread',
      name: "Wizard's Bread",
      description: 'Restores 15 health and 15 energy',
      type: 'food',
      icon: 'fa-bread-slice',
      cost: 144, // 12 shillings
      sellValue: 72,
      rarity: 'common',
      effect: (player) => {
        return {
          health: Math.min(player.maxHealth, player.health + 15),
          energy: Math.min(player.maxEnergy, player.energy + 15)
        };
      },
      duration: 0,
      cooldown: 20000
    },
    'enchanted-cake': {
      id: 'enchanted-cake',
      name: 'Enchanted Cake',
      description: 'Restores 30 health, 30 mana, and increases happiness by 10',
      type: 'food',
      icon: 'fa-birthday-cake',
      cost: 480, // 40 shillings
      sellValue: 240,
      rarity: 'rare',
      effect: (player) => {
        return {
          health: Math.min(player.maxHealth, player.health + 30),
          mana: Math.min(player.maxMana, player.mana + 30),
          happiness: Math.min(100, player.happiness + 10)
        };
      },
      duration: 0,
      cooldown: 30000
    },

    // Legendary Items
    'elixir-of-life': {
      id: 'elixir-of-life',
      name: 'Elixir of Life',
      description: 'Fully restores health, mana, and energy. Increases max health by 10 permanently.',
      type: 'elixir',
      icon: 'fa-sun',
      cost: 12000, // 1000 shillings
      sellValue: 6000,
      rarity: 'legendary',
      effect: (player) => {
        return {
          health: player.maxHealth + 10,
          maxHealth: player.maxHealth + 10,
          mana: player.maxMana,
          energy: player.maxEnergy
        };
      },
      duration: 0,
      cooldown: 3600000 // 1 hour
    },
    'philosophers-stone': {
      id: 'philosophers-stone',
      name: "Philosopher's Stone",
      description: 'Grants +10 to all stats for 30 minutes',
      type: 'elixir',
      icon: 'fa-gem',
      cost: 24000, // 2000 shillings
      sellValue: 12000,
      rarity: 'legendary',
      effect: (player) => {
        return {
          intelligence: player.intelligence + 10,
          endurance: player.endurance + 10,
          charisma: player.charisma + 10,
          dexterity: player.dexterity + 10
        };
      },
      duration: 1800000, // 30 minutes
      cooldown: 7200000 // 2 hours
    }
  };

  /**
   * Active consumable effects
   * @type {Map<string, {consumableId: string, endTime: number, originalValues: Object}>}
   */
  const activeEffects = new Map();

  /**
   * Cooldowns for consumables
   * @type {Map<string, number>}
   */
  const cooldowns = new Map();

  /**
   * Initialize consumables module - NEW
   * @returns {boolean} Success status
   */
  function init() {
    try {
      // Load player's consumable inventory if it doesn't exist
      if (typeof Player !== 'undefined' && Player.getData) {
        const playerData = Player.getData();
        if (!playerData.consumables) {
          Player.updateData({ consumables: {} });
        }
      }

      // Start effect update loop
      setInterval(updateActiveEffects, 1000);

      console.log('✅ Consumables module initialized');
      return true;
    } catch (error) {
      console.error('Error initializing consumables:', error);
      return false;
    }
  }

  /**
   * Get consumable by ID - NEW
   * @param {string} consumableId - Consumable ID
   * @returns {Consumable|null} Consumable or null
   */
  function getConsumable(consumableId) {
    return CONSUMABLES[consumableId] || null;
  }

  /**
   * Get all consumables - NEW
   * @returns {Object.<string, Consumable>} All consumables
   */
  function getAllConsumables() {
    return { ...CONSUMABLES };
  }

  /**
   * Get consumables by type - NEW
   * @param {string} type - Type (potion, scroll, food, elixir)
   * @returns {Array<Consumable>} Consumables of type
   */
  function getConsumablesByType(type) {
    return Object.values(CONSUMABLES).filter(c => c.type === type);
  }

  /**
   * Get consumables by rarity - NEW
   * @param {string} rarity - Rarity level
   * @returns {Array<Consumable>} Consumables of rarity
   */
  function getConsumablesByRarity(rarity) {
    return Object.values(CONSUMABLES).filter(c => c.rarity === rarity);
  }

  /**
   * Check if consumable is on cooldown - NEW
   * @param {string} consumableId - Consumable ID
   * @returns {boolean} True if on cooldown
   */
  function isOnCooldown(consumableId) {
    const cooldownEnd = cooldowns.get(consumableId);
    if (!cooldownEnd) return false;
    return Date.now() < cooldownEnd;
  }

  /**
   * Get remaining cooldown time - NEW
   * @param {string} consumableId - Consumable ID
   * @returns {number} Remaining cooldown in milliseconds
   */
  function getCooldownRemaining(consumableId) {
    const cooldownEnd = cooldowns.get(consumableId);
    if (!cooldownEnd) return 0;
    const remaining = cooldownEnd - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Use a consumable item - NEW
   * @param {string} consumableId - Consumable ID
   * @returns {boolean} Success status
   */
  function useConsumable(consumableId) {
    const consumable = getConsumable(consumableId);
    if (!consumable) {
      console.error(`Unknown consumable: ${consumableId}`);
      return false;
    }

    // Check cooldown
    if (isOnCooldown(consumableId)) {
      const remaining = Math.ceil(getCooldownRemaining(consumableId) / 1000);
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification(`${consumable.name} is on cooldown (${remaining}s remaining)`, 'warning');
      }
      return false;
    }

    // Check if player has the item
    if (typeof Player === 'undefined' || !Player.getData) {
      return false;
    }

    const playerData = Player.getData();
    const inventory = playerData.consumables || {};
    const count = inventory[consumableId] || 0;

    if (count <= 0) {
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification(`You don't have any ${consumable.name}`, 'error');
      }
      return false;
    }

    // Apply effect
    try {
      const updates = consumable.effect(playerData);
      
      // If duration > 0, store original values for reverting later
      if (consumable.duration > 0) {
        const originalValues = {};
        for (const key of Object.keys(updates)) {
          originalValues[key] = playerData[key];
        }
        
        activeEffects.set(consumableId, {
          consumableId,
          endTime: Date.now() + consumable.duration,
          originalValues
        });
      }

      // Apply updates
      Player.updateData(updates);

      // Consume the item
      inventory[consumableId] = count - 1;
      Player.updateData({ consumables: inventory });

      // Set cooldown
      if (consumable.cooldown > 0) {
        cooldowns.set(consumableId, Date.now() + consumable.cooldown);
      }

      // Show notification
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification(`Used ${consumable.name}`, 'success');
      }

      // Add to game log
      if (typeof window.addGameLog === 'function') {
        window.addGameLog(`Used ${consumable.name}`);
      }

      console.log(`Used consumable: ${consumable.name}`);
      return true;
    } catch (error) {
      console.error('Error using consumable:', error);
      return false;
    }
  }

  /**
   * Update active effects (check for expiration) - NEW
   */
  function updateActiveEffects() {
    const now = Date.now();
    const expired = [];

    for (const [id, effect] of activeEffects.entries()) {
      if (now >= effect.endTime) {
        expired.push(id);
      }
    }

    // Remove expired effects and revert changes
    for (const id of expired) {
      const effect = activeEffects.get(id);
      const consumable = getConsumable(id);
      
      if (effect && typeof Player !== 'undefined' && Player.updateData) {
        Player.updateData(effect.originalValues);
        
        if (typeof UI !== 'undefined' && UI.showNotification && consumable) {
          UI.showNotification(`${consumable.name} effect expired`, 'info');
        }
      }
      
      activeEffects.delete(id);
    }
  }

  /**
   * Add consumable to player inventory - NEW
   * @param {string} consumableId - Consumable ID
   * @param {number} count - Number to add
   * @returns {boolean} Success status
   */
  function addConsumable(consumableId, count = 1) {
    if (typeof Player === 'undefined' || !Player.getData) {
      return false;
    }

    const consumable = getConsumable(consumableId);
    if (!consumable) {
      return false;
    }

    const playerData = Player.getData();
    const inventory = playerData.consumables || {};
    inventory[consumableId] = (inventory[consumableId] || 0) + count;
    
    Player.updateData({ consumables: inventory });
    return true;
  }

  /**
   * Remove consumable from player inventory - NEW
   * @param {string} consumableId - Consumable ID
   * @param {number} count - Number to remove
   * @returns {boolean} Success status
   */
  function removeConsumable(consumableId, count = 1) {
    if (typeof Player === 'undefined' || !Player.getData) {
      return false;
    }

    const playerData = Player.getData();
    const inventory = playerData.consumables || {};
    const currentCount = inventory[consumableId] || 0;

    if (currentCount < count) {
      return false;
    }

    inventory[consumableId] = currentCount - count;
    Player.updateData({ consumables: inventory });
    return true;
  }

  /**
   * Get player's consumable count - NEW
   * @param {string} consumableId - Consumable ID
   * @returns {number} Count
   */
  function getConsumableCount(consumableId) {
    if (typeof Player === 'undefined' || !Player.getData) {
      return 0;
    }

    const playerData = Player.getData();
    const inventory = playerData.consumables || {};
    return inventory[consumableId] || 0;
  }

  /**
   * Get all player's consumables - NEW
   * @returns {Object.<string, number>} Consumables inventory
   */
  function getPlayerConsumables() {
    if (typeof Player === 'undefined' || !Player.getData) {
      return {};
    }

    const playerData = Player.getData();
    return playerData.consumables || {};
  }

  /**
   * Update consumables UI - NEW
   */
  function updateConsumablesUI() {
    const container = document.getElementById('consumables-list');
    if (!container) return;

    const inventory = getPlayerConsumables();
    const types = ['potion', 'scroll', 'food', 'elixir'];

    let html = '<div class="consumables-container">';

    for (const type of types) {
      const items = getConsumablesByType(type);
      html += `
        <div class="consumable-type mb-3">
          <h4 class="text-capitalize">${type}s</h4>
          <div class="consumable-grid">
      `;

      for (const item of items) {
        const count = inventory[item.id] || 0;
        const onCooldown = isOnCooldown(item.id);
        const cooldownTime = Math.ceil(getCooldownRemaining(item.id) / 1000);

        html += `
          <div class="consumable-item rarity-${item.rarity} ${count === 0 ? 'out-of-stock' : ''}">
            <div class="consumable-icon">
              <i class="fas ${item.icon}"></i>
              ${count > 0 ? `<span class="item-count">${count}</span>` : ''}
            </div>
            <div class="consumable-info">
              <div class="consumable-name">${item.name}</div>
              <div class="consumable-description">${item.description}</div>
              <div class="consumable-cost">Cost: ${Player && Player.formatCurrency ? Player.formatCurrency(item.cost) : item.cost + ' pennies'}</div>
              ${onCooldown ? `<div class="cooldown-timer">Cooldown: ${cooldownTime}s</div>` : ''}
            </div>
            <div class="consumable-actions">
              <button class="btn btn-sm btn-primary" 
                      onclick="Consumables.useConsumable('${item.id}')"
                      ${count === 0 || onCooldown ? 'disabled' : ''}>
                Use
              </button>
            </div>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // Public API
  return {
    init,
    getConsumable,
    getAllConsumables,
    getConsumablesByType,
    getConsumablesByRarity,
    useConsumable,
    isOnCooldown,
    getCooldownRemaining,
    addConsumable,
    removeConsumable,
    getConsumableCount,
    getPlayerConsumables,
    updateConsumablesUI,
    CONSUMABLES
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Consumables.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Consumables;
}

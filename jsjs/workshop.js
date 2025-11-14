/**
 * Workshop Module
 * Handles crafting mechanics, recipes, and time-based crafting
 */

const Workshop = (() => {
  // Crafting recipes
  const RECIPES = {
    // Battle Items - Potions
    'health-potion': {
      id: 'health-potion',
      name: 'Health Potion',
      category: 'battle-items',
      description: 'Restores 50 health',
      requirements: {
        'glow-moss': 2,
        'mystic-berries': 3
      },
      craftTime: 60000, // 1 minute in milliseconds
      rarity: 'common',
      effect: { health: 50 },
      icon: 'fa-flask'
    },
    'energy-potion': {
      id: 'energy-potion',
      name: 'Energy Potion',
      category: 'battle-items',
      description: 'Restores 30 energy',
      requirements: {
        'mystic-berries': 2,
        'elemental-water': 1
      },
      craftTime: 90000, // 1.5 minutes
      rarity: 'common',
      effect: { energy: 30 },
      icon: 'fa-bolt'
    },
    'energy-crystal': {
      id: 'energy-crystal',
      name: 'Energy Crystal',
      category: 'battle-items',
      description: 'Provides instant battle boost',
      requirements: {
        'arcane-crystals': 1
      },
      craftTime: 120000, // 2 minutes
      rarity: 'uncommon',
      effect: { energy: 50, mana: 25 },
      icon: 'fa-gem'
    },
    
    // Weapons and Gear
    'arcane-staff': {
      id: 'arcane-staff',
      name: 'Arcane Staff',
      category: 'weapons',
      description: 'A powerful magical staff',
      requirements: {
        'enchanted-scrolls': 2,
        'arcane-crystals': 1
      },
      craftTime: 300000, // 5 minutes
      rarity: 'rare',
      stats: { intelligence: 5, mana: 20 },
      icon: 'fa-magic'
    },
    'crystal-wand': {
      id: 'crystal-wand',
      name: 'Crystal Wand',
      category: 'weapons',
      description: 'A wand tipped with raw crystal',
      requirements: {
        'raw-gems': 3,
        'elemental-water': 2
      },
      craftTime: 240000, // 4 minutes
      rarity: 'uncommon',
      stats: { intelligence: 3, mana: 15 },
      icon: 'fa-wand-magic'
    },
    'obsidian-shield': {
      id: 'obsidian-shield',
      name: 'Obsidian Shield',
      category: 'gear',
      description: 'A protective shield made of obsidian',
      requirements: {
        'obsidian': 4,
        'arcane-crystals': 1
      },
      craftTime: 360000, // 6 minutes
      rarity: 'rare',
      stats: { health: 30, endurance: 5 },
      icon: 'fa-shield-alt'
    },
    
    // Smuggling Contraband
    'moonlight-elixir': {
      id: 'moonlight-elixir',
      name: 'Moonlight Elixir',
      category: 'contraband',
      description: 'Illegal potion with powerful effects',
      requirements: {
        'lunar-powder': 2,
        'mystic-berries': 3
      },
      craftTime: 600000, // 10 minutes
      rarity: 'rare',
      sellValue: 500,
      icon: 'fa-vial'
    },
    'forbidden-scroll': {
      id: 'forbidden-scroll',
      name: 'Forbidden Scroll',
      category: 'contraband',
      description: 'Banned magical scroll',
      requirements: {
        'enchanted-scrolls': 3,
        'lunar-powder': 1
      },
      craftTime: 900000, // 15 minutes
      rarity: 'legendary',
      sellValue: 1000,
      icon: 'fa-scroll'
    },
    
    // Mining Gear - Required for Crystal Peak Mines
    'mining-gear': {
      id: 'mining-gear',
      name: 'Mining Gear',
      category: 'gear',
      description: 'Essential equipment for mining in hazardous areas',
      requirements: {
        'obsidian': 2,
        'raw-gems': 2
      },
      craftTime: 300000, // 5 minutes
      rarity: 'uncommon',
      stats: { endurance: 3 },
      icon: 'fa-hard-hat'
    }
  };
  
  // Active crafting queue
  let craftingQueue = [];
  let queueInterval = null;
  
  // Initialize workshop
  function init() {
    // Load crafting queue from storage
    loadCraftingQueue();
    
    // Start crafting timer
    startCraftingTimer();
    
    console.log('✅ Workshop module initialized');
    return true;
  }
  
  // Get all recipes
  function getAllRecipes() {
    return RECIPES;
  }
  
  // Get recipe by ID
  function getRecipe(recipeId) {
    return RECIPES[recipeId] || null;
  }
  
  // Get recipes by category
  function getRecipesByCategory(category) {
    return Object.values(RECIPES).filter(r => r.category === category);
  }
  
  // Check if player can craft recipe
  function canCraft(recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe) return false;
    
    // Check resources
    if (typeof Resources === 'undefined') return false;
    return Resources.hasResources(recipe.requirements);
  }
  
  // Start crafting an item
  function startCrafting(recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe) {
      console.error(`Unknown recipe: ${recipeId}`);
      return false;
    }
    
    // Check if can craft
    if (!canCraft(recipeId)) {
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification('Not enough resources to craft this item!', 'error');
      }
      return false;
    }
    
    // Consume resources
    for (const [resourceId, amount] of Object.entries(recipe.requirements)) {
      // Artisan Guild resource-efficiency perk: 10% chance to save resources
      let actualAmount = amount;
      if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
        if (Guilds.hasGuildPerk('artisan', 'resource-efficiency') && Math.random() < 0.1) {
          actualAmount = Math.max(1, amount - 1); // Save 1 resource (but use at least 1)
          if (typeof UI !== 'undefined' && UI.showNotification) {
            UI.showNotification(`Resource efficiency! Saved 1 ${resourceId}`, 'info');
          }
        }
      }
      Resources.removeResource(resourceId, actualAmount);
    }
    
    // Calculate craft time (with guild bonuses)
    let craftTime = recipe.craftTime;
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
      if (Guilds.hasGuildPerk('artisan', 'faster-crafting')) {
        craftTime *= 0.8; // 20% faster
      }
    }
    
    // Add to crafting queue
    const craftingItem = {
      id: `craft-${Date.now()}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      startTime: Date.now(),
      endTime: Date.now() + craftTime,
      craftTime: craftTime
    };
    
    craftingQueue.push(craftingItem);
    saveCraftingQueue();
    
    if (typeof UI !== 'undefined' && UI.showNotification) {
      const minutes = Math.floor(craftTime / 60000);
      const seconds = Math.floor((craftTime % 60000) / 1000);
      UI.showNotification(
        `Started crafting ${recipe.name}. Ready in ${minutes}m ${seconds}s`,
        'info'
      );
    }
    
    updateWorkshopUI();
    return true;
  }
  
  // Fast-track crafting (instant completion with cost)
  function fastTrackCrafting(craftingId) {
    const item = craftingQueue.find(c => c.id === craftingId);
    if (!item) return false;
    
    const recipe = RECIPES[item.recipeId];
    if (!recipe) return false;
    
    // Calculate fast-track cost (1 gold per minute remaining)
    const remaining = Math.max(0, item.endTime - Date.now());
    const cost = Math.ceil(remaining / 60000);
    
    if (typeof Player === 'undefined') return false;
    
    const playerData = Player.getData();
    if (playerData.gold < cost) {
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification('Not enough gold to fast-track crafting!', 'error');
      }
      return false;
    }
    
    // Charge gold
    Player.removeGold(cost);
    
    // Complete immediately
    item.endTime = Date.now();
    completeCrafting(craftingId);
    
    if (typeof UI !== 'undefined' && UI.showNotification) {
      UI.showNotification(`Fast-tracked ${recipe.name} for ${cost} gold!`, 'success');
    }
    
    return true;
  }
  
  // Complete a crafting item
  function completeCrafting(craftingId) {
    const index = craftingQueue.findIndex(c => c.id === craftingId);
    if (index === -1) return false;
    
    const item = craftingQueue[index];
    const recipe = RECIPES[item.recipeId];
    
    if (!recipe) {
      craftingQueue.splice(index, 1);
      return false;
    }
    
    // Remove from queue
    craftingQueue.splice(index, 1);
    saveCraftingQueue();
    
    // Add item to player inventory
    if (typeof Player !== 'undefined') {
      const playerData = Player.getData();
      const craftedItems = playerData.craftedItems || {};
      craftedItems[recipe.id] = (craftedItems[recipe.id] || 0) + 1;
      
      // Apply Smuggler's Guild contraband boost
      if (recipe.category === 'contraband' && recipe.sellValue) {
        let actualValue = recipe.sellValue;
        if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
          if (Guilds.hasGuildPerk('smuggler', 'contraband-boost')) {
            actualValue = Math.floor(recipe.sellValue * 1.25); // 25% boost
          }
        }
        // Store the boosted value with the item
        const contrabandValues = playerData.contrabandValues || {};
        contrabandValues[recipe.id] = actualValue;
        Player.updateData({ craftedItems, contrabandValues });
      } else {
        Player.updateData({ craftedItems });
      }
      
      // Add XP
      const xpReward = recipe.rarity === 'common' ? 10 : recipe.rarity === 'uncommon' ? 25 : recipe.rarity === 'rare' ? 50 : 100;
      Player.addXP(xpReward);
    }
    
    if (typeof UI !== 'undefined' && UI.showNotification) {
      UI.showNotification(`${recipe.name} crafted successfully!`, 'success');
    }
    
    updateWorkshopUI();
    return true;
  }
  
  // Start crafting timer
  function startCraftingTimer() {
    if (queueInterval) {
      clearInterval(queueInterval);
    }
    
    queueInterval = setInterval(() => {
      const now = Date.now();
      
      // Check for completed items
      const completed = craftingQueue.filter(c => c.endTime <= now);
      completed.forEach(c => completeCrafting(c.id));
      
      // Update UI
      if (craftingQueue.length > 0) {
        updateWorkshopUI();
      }
    }, 1000); // Check every second
  }
  
  // Save crafting queue to storage
  function saveCraftingQueue() {
    try {
      localStorage.setItem('highWizardry_craftingQueue', JSON.stringify(craftingQueue));
    } catch (error) {
      console.error('Failed to save crafting queue:', error);
    }
  }
  
  // Load crafting queue from storage
  function loadCraftingQueue() {
    try {
      const saved = localStorage.getItem('highWizardry_craftingQueue');
      if (saved) {
        craftingQueue = JSON.parse(saved);
        
        // Clean up expired items
        const now = Date.now();
        const expired = craftingQueue.filter(c => c.endTime <= now);
        
        // Complete expired items (without modifying queue during iteration)
        expired.forEach(c => {
          const recipe = RECIPES[c.recipeId];
          if (recipe) {
            // Add item to player inventory
            if (typeof Player !== 'undefined') {
              const playerData = Player.getData();
              const craftedItems = playerData.craftedItems || {};
              craftedItems[recipe.id] = (craftedItems[recipe.id] || 0) + 1;
              
              // Apply contraband boost if applicable
              if (recipe.category === 'contraband' && recipe.sellValue) {
                let actualValue = recipe.sellValue;
                if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk) {
                  if (Guilds.hasGuildPerk('smuggler', 'contraband-boost')) {
                    actualValue = Math.floor(recipe.sellValue * 1.25);
                  }
                }
                const contrabandValues = playerData.contrabandValues || {};
                contrabandValues[recipe.id] = actualValue;
                Player.updateData({ craftedItems, contrabandValues });
              } else {
                Player.updateData({ craftedItems });
              }
              
              // Add XP
              const xpReward = recipe.rarity === 'common' ? 10 : recipe.rarity === 'uncommon' ? 25 : recipe.rarity === 'rare' ? 50 : 100;
              Player.addXP(xpReward);
            }
            
            if (typeof UI !== 'undefined' && UI.showNotification) {
              UI.showNotification(`${recipe.name} crafted while you were away!`, 'success');
            }
          }
        });
        
        // Remove expired items from queue
        craftingQueue = craftingQueue.filter(c => c.endTime > now);
        saveCraftingQueue();
      }
    } catch (error) {
      console.error('Failed to load crafting queue:', error);
      craftingQueue = [];
    }
  }
  
  // Get crafting queue
  function getCraftingQueue() {
    return [...craftingQueue];
  }
  
  // Update workshop UI
  function updateWorkshopUI() {
    updateCraftingQueue();
    updateRecipeList();
  }
  
  // Update crafting queue display
  function updateCraftingQueue() {
    const container = document.getElementById('crafting-queue');
    if (!container) return;
    
    if (craftingQueue.length === 0) {
      container.innerHTML = '<p class="text-muted small">No items being crafted</p>';
      return;
    }
    
    const now = Date.now();
    container.innerHTML = craftingQueue.map(item => {
      const recipe = RECIPES[item.recipeId];
      if (!recipe) return '';
      
      const remaining = Math.max(0, item.endTime - now);
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      const progress = ((item.craftTime - remaining) / item.craftTime) * 100;
      
      return `
        <div class="crafting-item mb-2 p-2 border rounded">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong><i class="fas ${recipe.icon}"></i> ${recipe.name}</strong>
            <small class="text-info">${minutes}:${seconds.toString().padStart(2, '0')}</small>
          </div>
          <div class="progress mb-1" style="height: 6px;">
            <div class="progress-bar bg-info" style="width: ${progress}%"></div>
          </div>
          <button class="btn btn-warning btn-sm" onclick="Workshop.fastTrackCrafting('${item.id}')">
            <i class="fas fa-forward"></i> Fast Track (${Math.ceil(remaining / 60000)} gold)
          </button>
        </div>
      `;
    }).join('');
  }
  
  // Update recipe list display
  function updateRecipeList() {
    const container = document.getElementById('recipe-list');
    if (!container) return;
    
    const categories = {
      'battle-items': 'Battle Items',
      'weapons': 'Weapons',
      'gear': 'Gear',
      'contraband': 'Contraband'
    };
    
    let html = '';
    for (const [categoryId, categoryName] of Object.entries(categories)) {
      const recipes = getRecipesByCategory(categoryId);
      if (recipes.length === 0) continue;
      
      html += `<h5 class="mt-3 mb-2">${categoryName}</h5>`;
      html += recipes.map(recipe => {
        const canCraftNow = canCraft(recipe.id);
        const requirementsList = Object.entries(recipe.requirements)
          .map(([resourceId, amount]) => {
            const resource = Resources.RESOURCE_TYPES[resourceId];
            const playerResources = Resources.getPlayerResources();
            const hasAmount = playerResources[resourceId] || 0;
            const hasEnough = hasAmount >= amount;
            return `<small class="${hasEnough ? 'text-success' : 'text-danger'}">${resource.name}: ${hasAmount}/${amount}</small>`;
          }).join(', ');
        
        const craftTimeMin = Math.floor(recipe.craftTime / 60000);
        const craftTimeSec = Math.floor((recipe.craftTime % 60000) / 1000);
        
        return `
          <div class="recipe-card mb-2 p-2 border rounded ${canCraftNow ? '' : 'opacity-75'}">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <strong><i class="fas ${recipe.icon}"></i> ${recipe.name}</strong>
                <p class="text-muted small mb-1">${recipe.description}</p>
                <div class="small">${requirementsList}</div>
                <small class="text-info">Time: ${craftTimeMin}m ${craftTimeSec}s</small>
              </div>
              <button 
                class="btn btn-primary btn-sm" 
                onclick="Workshop.startCrafting('${recipe.id}')"
                ${canCraftNow ? '' : 'disabled'}>
                <i class="fas fa-hammer"></i> Craft
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    container.innerHTML = html;
  }
  
  // Public API
  return {
    init,
    getAllRecipes,
    getRecipe,
    getRecipesByCategory,
    canCraft,
    startCrafting,
    fastTrackCrafting,
    getCraftingQueue,
    updateWorkshopUI,
    
    // Expose recipes
    RECIPES
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Workshop.init();
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Workshop;
}

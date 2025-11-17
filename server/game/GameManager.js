/**
 * Game Manager
 * Handles game logic validation and processing
 */

class GameManager {
  constructor(playerManager, locationManager) {
    this.playerManager = playerManager;
    this.locationManager = locationManager;
  }
  
  validatePlayerUpdate(playerId, updates) {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) return {};
    
    const validatedUpdates = {};
    
    // Only allow certain fields to be updated
    const allowedFields = ['location', 'lastAction'];
    
    // Filter updates to only allowed fields
    for (const key of allowedFields) {
      if (key in updates) {
        validatedUpdates[key] = updates[key];
      }
    }
    
    // Prevent cheating: stats, currency, etc. must be calculated server-side
    return validatedUpdates;
  }
  
  processAction(playerId, actionType, actionData) {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    switch (actionType) {
      case 'gather_resources':
        return this.handleGatherResources(player, actionData);
      case 'craft_item':
        return this.handleCraftItem(player, actionData);
      case 'commit_crime':
        return this.handleCommitCrime(player, actionData);
      case 'heal':
        return this.handleHeal(player, actionData);
      case 'train':
        return this.handleTrain(player, actionData);
      default:
        return { success: false, message: 'Unknown action type' };
    }
  }
  
  handleGatherResources(player, actionData) {
    const { location } = actionData;
    
    // Check energy
    const energyCost = 10;
    if (player.energy < energyCost) {
      return { success: false, message: 'Not enough energy' };
    }
    
    // Calculate resources gained (server-side to prevent cheating)
    const resourceTypes = ['herbs', 'wood', 'stone', 'crystal'];
    const resourceGained = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
    const amount = Math.floor(Math.random() * 3) + 1;
    
    // Update player
    const updates = {
      energy: player.energy - energyCost
    };
    
    return {
      success: true,
      data: {
        resource: resourceGained,
        amount: amount
      },
      playerUpdates: updates
    };
  }
  
  handleCraftItem(player, actionData) {
    const { recipeId } = actionData;
    
    // Crafting recipes (simplified)
    const recipes = {
      'health_potion': {
        requires: { herbs: 3 },
        energyCost: 15,
        xpGain: 10
      },
      'mana_potion': {
        requires: { crystal: 2 },
        energyCost: 20,
        xpGain: 15
      }
    };
    
    const recipe = recipes[recipeId];
    if (!recipe) {
      return { success: false, message: 'Invalid recipe' };
    }
    
    // Check energy
    if (player.energy < recipe.energyCost) {
      return { success: false, message: 'Not enough energy' };
    }
    
    // Check resources (simplified - would need proper inventory system)
    // For now, just consume energy and give XP
    
    const updates = {
      energy: player.energy - recipe.energyCost,
      xp: player.xp + recipe.xpGain
    };
    
    // Update crafted items count
    if (!player.craftedItems) {
      player.craftedItems = {};
    }
    player.craftedItems[recipeId] = (player.craftedItems[recipeId] || 0) + 1;
    
    return {
      success: true,
      data: { item: recipeId },
      playerUpdates: updates
    };
  }
  
  handleCommitCrime(player, actionData) {
    const { crimeType } = actionData;
    
    // Crime definitions (server-side to prevent cheating)
    const crimes = {
      'pickpocket': {
        energyCost: 10,
        successRate: 80,
        minReward: 10,
        maxReward: 30,
        xpGain: 5,
        jailTime: 5 * 60 * 1000 // 5 minutes in ms
      },
      'burglary': {
        energyCost: 25,
        successRate: 60,
        minReward: 50,
        maxReward: 100,
        xpGain: 15,
        jailTime: 15 * 60 * 1000
      },
      'heist': {
        energyCost: 50,
        successRate: 40,
        minReward: 200,
        maxReward: 500,
        xpGain: 30,
        jailTime: 60 * 60 * 1000 // 1 hour
      }
    };
    
    const crime = crimes[crimeType];
    if (!crime) {
      return { success: false, message: 'Invalid crime type' };
    }
    
    // Check energy
    if (player.energy < crime.energyCost) {
      return { success: false, message: 'Not enough energy' };
    }
    
    // Calculate success (server-side)
    const success = Math.random() * 100 < crime.successRate;
    
    const updates = {
      energy: player.energy - crime.energyCost
    };
    
    if (success) {
      // Success - give rewards
      const reward = Math.floor(Math.random() * (crime.maxReward - crime.minReward + 1)) + crime.minReward;
      const totalPennies = (player.shillings * 12) + player.pennies + reward;
      
      updates.shillings = Math.floor(totalPennies / 12);
      updates.pennies = totalPennies % 12;
      updates.xp = player.xp + crime.xpGain;
      
      return {
        success: true,
        data: { 
          crimeSuccess: true, 
          reward: reward,
          xpGained: crime.xpGain
        },
        playerUpdates: updates
      };
    } else {
      // Failed - go to jail
      updates.inJail = true;
      updates.jailUntil = Date.now() + crime.jailTime;
      updates.location = 'jail';
      
      return {
        success: true,
        data: { 
          crimeSuccess: false, 
          jailTime: crime.jailTime 
        },
        playerUpdates: updates
      };
    }
  }
  
  handleHeal(player, actionData) {
    const { amount, cost } = actionData;
    
    // Check currency
    const totalPennies = (player.shillings * 12) + player.pennies;
    if (totalPennies < cost) {
      return { success: false, message: 'Not enough currency' };
    }
    
    // Calculate healing
    const healAmount = amount === 'full' ? player.maxHealth - player.health : amount;
    const newHealth = Math.min(player.maxHealth, player.health + healAmount);
    
    // Deduct cost
    const newTotal = totalPennies - cost;
    
    const updates = {
      health: newHealth,
      shillings: Math.floor(newTotal / 12),
      pennies: newTotal % 12
    };
    
    return {
      success: true,
      data: { healed: healAmount },
      playerUpdates: updates
    };
  }
  
  handleTrain(player, actionData) {
    const { stat, cost } = actionData;
    
    // Check currency
    const totalPennies = (player.shillings * 12) + player.pennies;
    if (totalPennies < cost) {
      return { success: false, message: 'Not enough currency' };
    }
    
    // Valid stats
    const validStats = ['intelligence', 'endurance', 'charisma', 'dexterity'];
    if (!validStats.includes(stat)) {
      return { success: false, message: 'Invalid stat' };
    }
    
    // Check energy
    const energyCost = 20;
    if (player.energy < energyCost) {
      return { success: false, message: 'Not enough energy' };
    }
    
    // Increase stat
    if (!player.stats) {
      player.stats = {
        intelligence: 10,
        endurance: 10,
        charisma: 10,
        dexterity: 10
      };
    }
    
    const newStatValue = (player.stats[stat] || 10) + 1;
    const newTotal = totalPennies - cost;
    
    const updates = {
      energy: player.energy - energyCost,
      shillings: Math.floor(newTotal / 12),
      pennies: newTotal % 12,
      stats: {
        ...player.stats,
        [stat]: newStatValue
      }
    };
    
    return {
      success: true,
      data: { stat: stat, newValue: newStatValue },
      playerUpdates: updates
    };
  }
}

module.exports = GameManager;

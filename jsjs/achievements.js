/**
 * Achievements Module - NEW
 * Tracks player milestones and progress achievements
 * @module Achievements
 */

const Achievements = (() => {
  /**
   * @typedef {Object} Achievement
   * @property {string} id - Unique achievement identifier
   * @property {string} name - Display name
   * @property {string} description - Achievement description
   * @property {string} category - Category (combat, social, wealth, exploration, crafting)
   * @property {string} icon - Font Awesome icon class
   * @property {number} tier - Achievement tier (1-3, bronze/silver/gold)
   * @property {Function} condition - Function to check if achievement is earned
   * @property {number} xpReward - XP reward for earning
   * @property {Object} currencyReward - Currency reward {shillings, pennies}
   */

  /**
   * Achievement definitions - NEW FEATURE
   * @type {Object.<string, Achievement>}
   */
  const ACHIEVEMENTS = {
    // Wealth achievements
    'first-shilling': {
      id: 'first-shilling',
      name: 'First Shilling',
      description: 'Earn your first shilling',
      category: 'wealth',
      icon: 'fa-coins',
      tier: 1,
      condition: (player) => player.shillings >= 1,
      xpReward: 10,
      currencyReward: { shillings: 1, pennies: 0 }
    },
    'wealthy-wizard': {
      id: 'wealthy-wizard',
      name: 'Wealthy Wizard',
      description: 'Accumulate 100 shillings',
      category: 'wealth',
      icon: 'fa-money-bill-wave',
      tier: 2,
      condition: (player) => player.shillings >= 100,
      xpReward: 50,
      currencyReward: { shillings: 10, pennies: 0 }
    },
    'fortune-500': {
      id: 'fortune-500',
      name: 'Fortune 500',
      description: 'Accumulate 500 shillings',
      category: 'wealth',
      icon: 'fa-gem',
      tier: 3,
      condition: (player) => player.shillings >= 500,
      xpReward: 200,
      currencyReward: { shillings: 50, pennies: 0 }
    },

    // Level achievements
    'novice-wizard': {
      id: 'novice-wizard',
      name: 'Novice Wizard',
      description: 'Reach level 5',
      category: 'progression',
      icon: 'fa-star',
      tier: 1,
      condition: (player) => player.level >= 5,
      xpReward: 25,
      currencyReward: { shillings: 5, pennies: 0 }
    },
    'adept-wizard': {
      id: 'adept-wizard',
      name: 'Adept Wizard',
      description: 'Reach level 10',
      category: 'progression',
      icon: 'fa-star-half-alt',
      tier: 2,
      condition: (player) => player.level >= 10,
      xpReward: 100,
      currencyReward: { shillings: 20, pennies: 0 }
    },
    'master-wizard': {
      id: 'master-wizard',
      name: 'Master Wizard',
      description: 'Reach level 25',
      category: 'progression',
      icon: 'fa-crown',
      tier: 3,
      condition: (player) => player.level >= 25,
      xpReward: 500,
      currencyReward: { shillings: 100, pennies: 0 }
    },

    // Stats achievements
    'brain-power': {
      id: 'brain-power',
      name: 'Brain Power',
      description: 'Train intelligence to 25',
      category: 'training',
      icon: 'fa-brain',
      tier: 2,
      condition: (player) => player.intelligence >= 25,
      xpReward: 75,
      currencyReward: { shillings: 15, pennies: 0 }
    },
    'marathon-runner': {
      id: 'marathon-runner',
      name: 'Marathon Runner',
      description: 'Train endurance to 25',
      category: 'training',
      icon: 'fa-running',
      tier: 2,
      condition: (player) => player.endurance >= 25,
      xpReward: 75,
      currencyReward: { shillings: 15, pennies: 0 }
    },
    'smooth-talker': {
      id: 'smooth-talker',
      name: 'Smooth Talker',
      description: 'Train charisma to 25',
      category: 'training',
      icon: 'fa-comments',
      tier: 2,
      condition: (player) => player.charisma >= 25,
      xpReward: 75,
      currencyReward: { shillings: 15, pennies: 0 }
    },
    'nimble-fingers': {
      id: 'nimble-fingers',
      name: 'Nimble Fingers',
      description: 'Train dexterity to 25',
      category: 'training',
      icon: 'fa-hand-sparkles',
      tier: 2,
      condition: (player) => player.dexterity >= 25,
      xpReward: 75,
      currencyReward: { shillings: 15, pennies: 0 }
    },

    // Social achievements
    'guild-member': {
      id: 'guild-member',
      name: 'Guild Member',
      description: 'Join your first guild',
      category: 'social',
      icon: 'fa-users',
      tier: 1,
      condition: (player) => player.guilds && player.guilds.memberships && player.guilds.memberships.length > 0,
      xpReward: 30,
      currencyReward: { shillings: 5, pennies: 0 }
    },
    'guild-collector': {
      id: 'guild-collector',
      name: 'Guild Collector',
      description: 'Join all three guilds',
      category: 'social',
      icon: 'fa-user-friends',
      tier: 3,
      condition: (player) => player.guilds && player.guilds.memberships && player.guilds.memberships.length >= 3,
      xpReward: 150,
      currencyReward: { shillings: 30, pennies: 0 }
    },

    // Crafting achievements
    'apprentice-crafter': {
      id: 'apprentice-crafter',
      name: 'Apprentice Crafter',
      description: 'Craft your first item',
      category: 'crafting',
      icon: 'fa-hammer',
      tier: 1,
      condition: (player) => player.craftingStats && player.craftingStats.totalCrafted >= 1,
      xpReward: 20,
      currencyReward: { shillings: 3, pennies: 0 }
    },
    'master-crafter': {
      id: 'master-crafter',
      name: 'Master Crafter',
      description: 'Craft 50 items',
      category: 'crafting',
      icon: 'fa-tools',
      tier: 3,
      condition: (player) => player.craftingStats && player.craftingStats.totalCrafted >= 50,
      xpReward: 250,
      currencyReward: { shillings: 50, pennies: 0 }
    },

    // Exploration achievements
    'explorer': {
      id: 'explorer',
      name: 'Explorer',
      description: 'Visit all locations',
      category: 'exploration',
      icon: 'fa-map-marked-alt',
      tier: 2,
      condition: (player) => player.visitedLocations && player.visitedLocations.length >= 10,
      xpReward: 100,
      currencyReward: { shillings: 20, pennies: 0 }
    },
    'world-traveler': {
      id: 'world-traveler',
      name: 'World Traveler',
      description: 'Travel 1000 kilometers',
      category: 'exploration',
      icon: 'fa-globe-americas',
      tier: 3,
      condition: (player) => player.travelDistance && player.travelDistance >= 1000,
      xpReward: 200,
      currencyReward: { shillings: 40, pennies: 0 }
    },

    // Time achievements
    'dedicated-player': {
      id: 'dedicated-player',
      name: 'Dedicated Player',
      description: 'Play for 1 hour total',
      category: 'dedication',
      icon: 'fa-clock',
      tier: 1,
      condition: (player) => player.playTime >= 3600000, // 1 hour in ms
      xpReward: 50,
      currencyReward: { shillings: 10, pennies: 0 }
    },
    'hardcore-player': {
      id: 'hardcore-player',
      name: 'Hardcore Player',
      description: 'Play for 10 hours total',
      category: 'dedication',
      icon: 'fa-hourglass-half',
      tier: 2,
      condition: (player) => player.playTime >= 36000000, // 10 hours in ms
      xpReward: 200,
      currencyReward: { shillings: 50, pennies: 0 }
    },
    'no-life-wizard': {
      id: 'no-life-wizard',
      name: 'No-Life Wizard',
      description: 'Play for 100 hours total',
      category: 'dedication',
      icon: 'fa-infinity',
      tier: 3,
      condition: (player) => player.playTime >= 360000000, // 100 hours in ms
      xpReward: 1000,
      currencyReward: { shillings: 500, pennies: 0 }
    }
  };

  /**
   * Storage key for achievements
   * @const {string}
   */
  const STORAGE_KEY = 'highWizardryAchievements';

  /**
   * Earned achievements cache
   * @type {Set<string>}
   */
  let earnedAchievements = new Set();

  /**
   * Initialize achievements module - NEW
   * @returns {boolean} Success status
   */
  function init() {
    try {
      loadAchievements();
      console.log('✅ Achievements module initialized');
      return true;
    } catch (error) {
      console.error('Error initializing achievements:', error);
      return false;
    }
  }

  /**
   * Load earned achievements from storage - NEW
   */
  function loadAchievements() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        earnedAchievements = new Set(parsed);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      earnedAchievements = new Set();
    }
  }

  /**
   * Save achievements to storage - NEW
   */
  function saveAchievements() {
    try {
      const data = Array.from(earnedAchievements);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving achievements:', error);
    }
  }

  /**
   * Check all achievements and award newly earned ones - NEW
   * @returns {Array<Achievement>} Newly earned achievements
   */
  function checkAchievements() {
    if (typeof Player === 'undefined' || !Player.getData) {
      return [];
    }

    const playerData = Player.getData();
    const newlyEarned = [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      // Skip if already earned
      if (earnedAchievements.has(id)) {
        continue;
      }

      // Check condition
      if (achievement.condition(playerData)) {
        earnAchievement(id);
        newlyEarned.push(achievement);
      }
    }

    return newlyEarned;
  }

  /**
   * Award an achievement to the player - NEW
   * @param {string} achievementId - Achievement ID
   */
  function earnAchievement(achievementId) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement || earnedAchievements.has(achievementId)) {
      return;
    }

    // Mark as earned
    earnedAchievements.add(achievementId);
    saveAchievements();

    // Award rewards
    if (typeof Player !== 'undefined') {
      if (achievement.xpReward > 0 && Player.addXP) {
        Player.addXP(achievement.xpReward);
      }
      if (achievement.currencyReward && Player.addCurrency) {
        const totalPennies = (achievement.currencyReward.shillings * 12) + achievement.currencyReward.pennies;
        Player.addCurrency(totalPennies);
      }
    }

    // Show notification
    if (typeof UI !== 'undefined' && UI.showNotification) {
      UI.showNotification(
        `🏆 Achievement Unlocked: ${achievement.name}!`,
        'success',
        { duration: 5000 }
      );
    }

    // Add to game log
    if (typeof window.addGameLog === 'function') {
      window.addGameLog(`🏆 Achievement earned: ${achievement.name}`);
    }

    console.log(`✨ Achievement earned: ${achievement.name}`);
  }

  /**
   * Check if an achievement has been earned - NEW
   * @param {string} achievementId - Achievement ID
   * @returns {boolean} True if earned
   */
  function hasAchievement(achievementId) {
    return earnedAchievements.has(achievementId);
  }

  /**
   * Get all achievements with earned status - NEW
   * @returns {Array<Achievement & {earned: boolean}>} All achievements with status
   */
  function getAllAchievements() {
    return Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      earned: earnedAchievements.has(achievement.id)
    }));
  }

  /**
   * Get achievements by category - NEW
   * @param {string} category - Category name
   * @returns {Array<Achievement & {earned: boolean}>} Achievements in category
   */
  function getAchievementsByCategory(category) {
    return getAllAchievements().filter(a => a.category === category);
  }

  /**
   * Get earned achievements count - NEW
   * @returns {number} Number of earned achievements
   */
  function getEarnedCount() {
    return earnedAchievements.size;
  }

  /**
   * Get total achievements count - NEW
   * @returns {number} Total number of achievements
   */
  function getTotalCount() {
    return Object.keys(ACHIEVEMENTS).length;
  }

  /**
   * Get completion percentage - NEW
   * @returns {number} Completion percentage (0-100)
   */
  function getCompletionPercentage() {
    const total = getTotalCount();
    if (total === 0) return 0;
    return Math.round((getEarnedCount() / total) * 100);
  }

  /**
   * Update achievements UI - NEW
   */
  function updateAchievementsUI() {
    const container = document.getElementById('achievements-list');
    if (!container) return;

    const categories = [...new Set(Object.values(ACHIEVEMENTS).map(a => a.category))];
    
    let html = `
      <div class="achievements-header mb-3">
        <h3>Achievements</h3>
        <div class="progress mb-2">
          <div class="progress-bar bg-success" role="progressbar" 
               style="width: ${getCompletionPercentage()}%"
               aria-valuenow="${getEarnedCount()}" 
               aria-valuemin="0" 
               aria-valuemax="${getTotalCount()}">
            ${getEarnedCount()}/${getTotalCount()} (${getCompletionPercentage()}%)
          </div>
        </div>
      </div>
    `;

    for (const category of categories) {
      const achievements = getAchievementsByCategory(category);
      html += `
        <div class="achievement-category mb-3">
          <h4 class="text-capitalize">${category}</h4>
          <div class="achievements-grid">
      `;

      for (const achievement of achievements) {
        const tierClass = ['bronze', 'silver', 'gold'][achievement.tier - 1];
        html += `
          <div class="achievement-card ${achievement.earned ? 'earned' : 'locked'} tier-${tierClass}">
            <div class="achievement-icon">
              <i class="fas ${achievement.icon} fa-2x"></i>
            </div>
            <div class="achievement-info">
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-description">${achievement.description}</div>
              ${achievement.earned ? '<div class="achievement-earned"><i class="fas fa-check"></i> Earned</div>' : ''}
            </div>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  /**
   * Reset all achievements (for testing) - NEW
   */
  function resetAchievements() {
    earnedAchievements.clear();
    saveAchievements();
    console.log('All achievements reset');
  }

  // Public API
  return {
    init,
    checkAchievements,
    earnAchievement,
    hasAchievement,
    getAllAchievements,
    getAchievementsByCategory,
    getEarnedCount,
    getTotalCount,
    getCompletionPercentage,
    updateAchievementsUI,
    resetAchievements,
    ACHIEVEMENTS
  };
})();

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    Achievements.init();
    
    // Check achievements periodically
    setInterval(() => {
      const newAchievements = Achievements.checkAchievements();
      if (newAchievements.length > 0) {
        Achievements.updateAchievementsUI();
      }
    }, 5000); // Check every 5 seconds
  });
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Achievements;
}

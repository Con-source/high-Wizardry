/**
 * Cache Manager
 * In-memory caching for frequently accessed data with TTL support
 * @module CacheManager
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map(); // Store expiration times
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(key) {
    // Check if key exists
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {boolean} True if set successfully
   */
  set(key, value, ttl = null) {
    this.cache.set(key, value);
    
    if (ttl) {
      this.ttls.set(key, Date.now() + ttl);
    }
    
    this.stats.sets++;
    return true;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.ttls.delete(key);
    
    if (deleted) {
      this.stats.deletes++;
    }
    
    return deleted;
  }

  /**
   * Check if key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, ttl] of this.ttls.entries()) {
      if (now > ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Get or set value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch value if not in cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<*>} Cached or fetched value
   */
  async getOrSet(key, fetchFn, ttl = null) {
    // Try to get from cache
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache by pattern
   * @param {RegExp|string} pattern - Pattern to match keys
   * @returns {number} Number of keys invalidated
   */
  invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Destroy cache manager and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Specialized cache for player data with automatic invalidation
 */
class PlayerCache extends CacheManager {
  constructor() {
    super();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get player data from cache
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player data
   */
  getPlayer(playerId) {
    return this.get(`player:${playerId}`);
  }

  /**
   * Set player data in cache
   * @param {string} playerId - Player ID
   * @param {Object} data - Player data
   * @param {number} ttl - Time to live (optional)
   */
  setPlayer(playerId, data, ttl = this.defaultTTL) {
    this.set(`player:${playerId}`, data, ttl);
  }

  /**
   * Invalidate player cache
   * @param {string} playerId - Player ID
   */
  invalidatePlayer(playerId) {
    this.delete(`player:${playerId}`);
    // Also invalidate related caches
    this.invalidatePattern(`player:${playerId}:.*`);
  }

  /**
   * Get player stats
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player stats
   */
  getPlayerStats(playerId) {
    return this.get(`player:${playerId}:stats`);
  }

  /**
   * Set player stats
   * @param {string} playerId - Player ID
   * @param {Object} stats - Player stats
   * @param {number} ttl - Time to live (optional)
   */
  setPlayerStats(playerId, stats, ttl = this.defaultTTL) {
    this.set(`player:${playerId}:stats`, stats, ttl);
  }
}

/**
 * Specialized cache for leaderboard data
 */
class LeaderboardCache extends CacheManager {
  constructor() {
    super();
    this.defaultTTL = 60 * 1000; // 1 minute
  }

  /**
   * Get leaderboard
   * @param {string} type - Leaderboard type
   * @returns {Array|null} Leaderboard data
   */
  getLeaderboard(type) {
    return this.get(`leaderboard:${type}`);
  }

  /**
   * Set leaderboard
   * @param {string} type - Leaderboard type
   * @param {Array} data - Leaderboard data
   * @param {number} ttl - Time to live (optional)
   */
  setLeaderboard(type, data, ttl = this.defaultTTL) {
    this.set(`leaderboard:${type}`, data, ttl);
  }

  /**
   * Invalidate all leaderboards
   */
  invalidateAll() {
    this.invalidatePattern(/^leaderboard:/);
  }
}

/**
 * Specialized cache for location data
 */
class LocationCache extends CacheManager {
  constructor() {
    super();
    this.defaultTTL = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get location players
   * @param {string} locationId - Location ID
   * @returns {Array|null} Players at location
   */
  getLocationPlayers(locationId) {
    return this.get(`location:${locationId}:players`);
  }

  /**
   * Set location players
   * @param {string} locationId - Location ID
   * @param {Array} players - Players at location
   * @param {number} ttl - Time to live (optional)
   */
  setLocationPlayers(locationId, players, ttl = 30000) { // 30 seconds for dynamic data
    this.set(`location:${locationId}:players`, players, ttl);
  }

  /**
   * Invalidate location cache
   * @param {string} locationId - Location ID
   */
  invalidateLocation(locationId) {
    // Escape special regex characters
    const escapedId = locationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.invalidatePattern(new RegExp(`^location:${escapedId}:`));
  }
}

module.exports = {
  CacheManager,
  PlayerCache,
  LeaderboardCache,
  LocationCache
};

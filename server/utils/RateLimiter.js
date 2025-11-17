/**
 * Rate Limiter
 * Prevents spam and abuse by limiting actions per time window
 */

class RateLimiter {
  constructor(maxAttempts = 10, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map(); // key -> [timestamps]
  }
  
  /**
   * Check if an action is allowed
   * @param {string} key - Unique identifier (e.g., playerId or IP)
   * @returns {boolean} - True if action is allowed
   */
  isAllowed(key) {
    const now = Date.now();
    
    // Get or create attempt history
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const timestamps = this.attempts.get(key);
    
    // Remove old attempts outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    this.attempts.set(key, validTimestamps);
    
    // Check if limit exceeded
    if (validTimestamps.length >= this.maxAttempts) {
      return false;
    }
    
    // Record this attempt
    validTimestamps.push(now);
    this.attempts.set(key, validTimestamps);
    
    return true;
  }
  
  /**
   * Get remaining attempts
   * @param {string} key - Unique identifier
   * @returns {number} - Remaining attempts in window
   */
  getRemaining(key) {
    const now = Date.now();
    
    if (!this.attempts.has(key)) {
      return this.maxAttempts;
    }
    
    const timestamps = this.attempts.get(key);
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    
    return Math.max(0, this.maxAttempts - validTimestamps.length);
  }
  
  /**
   * Reset attempts for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.attempts.delete(key);
  }
  
  /**
   * Clean up old entries (should be called periodically)
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, timestamps] of this.attempts.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      
      if (validTimestamps.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validTimestamps);
      }
    }
  }
}

module.exports = RateLimiter;

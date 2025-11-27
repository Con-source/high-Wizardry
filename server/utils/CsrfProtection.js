/**
 * CSRF Protection
 * Generates and validates CSRF tokens for state-changing operations
 */

const crypto = require('crypto');

class CsrfProtection {
  constructor() {
    this.tokens = new Map(); // sessionId -> { token, expiresAt }
    this.tokenExpiry = 60 * 60 * 1000; // 1 hour
    
    // Clean up expired tokens every 10 minutes
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 10 * 60 * 1000);
  }

  /**
   * Generate a CSRF token for a session
   * @param {string} sessionId - Unique session identifier
   * @returns {string} - CSRF token
   */
  generateToken(sessionId) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.tokenExpiry;

    this.tokens.set(sessionId, { token, expiresAt });

    return token;
  }

  /**
   * Validate a CSRF token for a session
   * @param {string} sessionId - Session identifier
   * @param {string} token - Token to validate
   * @returns {boolean} - True if token is valid
   */
  validateToken(sessionId, token) {
    if (!sessionId || !token) {
      return false;
    }

    const storedToken = this.tokens.get(sessionId);
    if (!storedToken) {
      return false;
    }

    // Check expiry
    if (Date.now() > storedToken.expiresAt) {
      this.tokens.delete(sessionId);
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    // Use try-catch to handle invalid hex tokens gracefully
    try {
      const tokenBuffer = Buffer.from(token, 'hex');
      const storedBuffer = Buffer.from(storedToken.token, 'hex');
      
      // Buffers must be same length for timing-safe comparison
      if (tokenBuffer.length !== storedBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
    } catch (error) {
      // Invalid hex string - token is invalid
      return false;
    }
  }

  /**
   * Invalidate token for a session
   * @param {string} sessionId - Session identifier
   */
  invalidateToken(sessionId) {
    this.tokens.delete(sessionId);
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.tokens.delete(sessionId);
      }
    }
  }

  /**
   * Middleware for Express to add CSRF token to response
   */
  generateTokenMiddleware() {
    return (req, res, next) => {
      const sessionId = req.session?.id || req.ip;
      const token = this.generateToken(sessionId);
      res.locals.csrfToken = token;
      res.setHeader('X-CSRF-Token', token);
      next();
    };
  }

  /**
   * Middleware for Express to validate CSRF token
   */
  validateTokenMiddleware() {
    return (req, res, next) => {
      // Skip validation for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const sessionId = req.session?.id || req.ip;
      const token = req.headers['x-csrf-token'] || req.body.csrfToken;

      if (!this.validateToken(sessionId, token)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing CSRF token'
        });
      }

      next();
    };
  }
}

module.exports = CsrfProtection;

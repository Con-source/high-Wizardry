/**
 * Admin Authentication Middleware
 * Protects admin endpoints with API key authentication, rate limiting, and audit logging
 */

const RateLimiter = require('./RateLimiter');
const fs = require('fs');
const path = require('path');

class AdminAuthMiddleware {
  constructor(options = {}) {
    // Load API key from environment variable
    this.apiKey = options.apiKey || process.env.ADMIN_API_KEY;
    
    // Rate limiter for admin endpoints (more restrictive than general endpoints)
    // Default: 30 requests per minute per IP
    this.rateLimiter = new RateLimiter(
      options.maxRequests || 30,
      options.windowMs || 60000
    );
    
    // Audit log configuration
    this.auditLogEnabled = options.auditLogEnabled !== false;
    this.auditLogFile = options.auditLogFile || path.join(__dirname, '..', 'data', 'admin-audit.log');
    
    // Ensure data directory exists for audit log
    this.ensureDataDirectory();
    
    // Warn if no API key is configured
    if (!this.apiKey) {
      console.warn('⚠️  ADMIN_API_KEY not configured - admin endpoints are UNPROTECTED');
    } else {
      console.log('✅ Admin authentication configured');
    }
  }
  
  /**
   * Ensure the data directory exists for audit logging
   */
  ensureDataDirectory() {
    const dataDir = path.dirname(this.auditLogFile);
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create data directory for audit log:', error.message);
      }
    }
  }
  
  /**
   * Get the API key from the request
   * Checks X-Admin-API-Key header first, then admin_api_key query parameter
   * @param {Object} req - Express request object
   * @returns {string|null} - API key or null if not found
   */
  getApiKeyFromRequest(req) {
    // Check header first (preferred method)
    const headerKey = req.headers['x-admin-api-key'];
    if (headerKey) {
      return headerKey;
    }
    
    // Fall back to query parameter
    const queryKey = req.query.admin_api_key;
    if (queryKey) {
      return queryKey;
    }
    
    return null;
  }
  
  /**
   * Log admin action for audit trail
   * @param {Object} logEntry - Log entry data
   */
  logAdminAction(logEntry) {
    if (!this.auditLogEnabled) {
      return;
    }
    
    const entry = {
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    
    // Log to console
    console.log(`📝 Admin Action: ${entry.action} from ${entry.ip}`);
    
    // Append to audit log file
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.auditLogFile, logLine);
    } catch (error) {
      console.error('Failed to write audit log:', error.message);
    }
  }
  
  /**
   * Express middleware for admin authentication
   * @returns {Function} - Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      const clientIp = req.ip || req.connection.remoteAddress;
      const endpoint = req.path;
      const method = req.method;
      
      // Rate limiting check
      if (!this.rateLimiter.isAllowed(clientIp)) {
        this.logAdminAction({
          action: 'rate_limit_exceeded',
          endpoint,
          method,
          ip: clientIp,
          success: false
        });
        
        return res.status(429).json({
          success: false,
          message: 'Too many admin requests. Please try again later.'
        });
      }
      
      // If no API key is configured, allow all requests (development mode)
      // This should never be the case in production
      if (!this.apiKey) {
        this.logAdminAction({
          action: 'admin_request_unprotected',
          endpoint,
          method,
          ip: clientIp,
          success: true,
          warning: 'No API key configured - request allowed without authentication'
        });
        return next();
      }
      
      // Get API key from request
      const providedKey = this.getApiKeyFromRequest(req);
      
      // Validate API key
      if (!providedKey) {
        this.logAdminAction({
          action: 'authentication_failed',
          reason: 'missing_api_key',
          endpoint,
          method,
          ip: clientIp,
          success: false
        });
        
        return res.status(401).json({
          success: false,
          message: 'Admin API key required. Provide via X-Admin-API-Key header or admin_api_key query parameter.'
        });
      }
      
      // Constant-time comparison to prevent timing attacks
      if (!this.secureCompare(providedKey, this.apiKey)) {
        this.logAdminAction({
          action: 'authentication_failed',
          reason: 'invalid_api_key',
          endpoint,
          method,
          ip: clientIp,
          success: false
        });
        
        return res.status(403).json({
          success: false,
          message: 'Invalid admin API key.'
        });
      }
      
      // Authentication successful - log and proceed
      this.logAdminAction({
        action: 'admin_request',
        endpoint,
        method,
        ip: clientIp,
        success: true
      });
      
      next();
    };
  }
  
  /**
   * Constant-time string comparison to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} - True if strings are equal
   */
  secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    
    // Use crypto.timingSafeEqual if available (Node.js 6.6+)
    try {
      const crypto = require('crypto');
      const aBuffer = Buffer.from(a);
      const bBuffer = Buffer.from(b);
      
      // If lengths differ, still do a constant-time comparison to prevent length timing attacks
      // Use the longer buffer's length for padding both
      if (aBuffer.length !== bBuffer.length) {
        // Do a constant-time comparison with a dummy buffer to consume same time
        // but return false since lengths differ
        const dummyBuffer = Buffer.alloc(aBuffer.length);
        crypto.timingSafeEqual(aBuffer, dummyBuffer);
        return false;
      }
      
      return crypto.timingSafeEqual(aBuffer, bBuffer);
    } catch {
      // Fallback to simple comparison (less secure but functional)
      if (a.length !== b.length) {
        return false;
      }
      
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    }
  }
  
  /**
   * Get recent audit log entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} - Array of log entries
   */
  getAuditLog(limit = 100) {
    try {
      if (!fs.existsSync(this.auditLogFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.auditLogFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      
      // Parse and return last N entries
      const entries = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      
      return entries.slice(-limit);
    } catch (error) {
      console.error('Failed to read audit log:', error.message);
      return [];
    }
  }
  
  /**
   * Clear the audit log
   */
  clearAuditLog() {
    try {
      if (fs.existsSync(this.auditLogFile)) {
        fs.writeFileSync(this.auditLogFile, '');
      }
    } catch (error) {
      console.error('Failed to clear audit log:', error.message);
    }
  }
}

module.exports = AdminAuthMiddleware;

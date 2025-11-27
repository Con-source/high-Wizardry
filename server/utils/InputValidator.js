/**
 * Input Validator
 * Provides comprehensive input validation and sanitization utilities
 * to prevent XSS, injection attacks, and malformed data
 */

class InputValidator {
  /**
   * Validate and sanitize a username
   * @param {any} username - Username to validate
   * @returns {Object} - { valid: boolean, sanitized: string|null, message: string }
   */
  static validateUsername(username) {
    // Type check
    if (typeof username !== 'string') {
      return { valid: false, sanitized: null, message: 'Username must be a string' };
    }

    // Trim whitespace
    const trimmed = username.trim();

    // Length check
    if (trimmed.length < 3 || trimmed.length > 20) {
      return { valid: false, sanitized: null, message: 'Username must be 3-20 characters' };
    }

    // Character validation: alphanumeric, underscore, hyphen only
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmed)) {
      return { valid: false, sanitized: null, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }

    // Prevent reserved names
    const reserved = ['admin', 'system', 'moderator', 'root', 'administrator', 'mod', 'staff'];
    if (reserved.includes(trimmed.toLowerCase())) {
      return { valid: false, sanitized: null, message: 'Username is reserved' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Validate and sanitize a password
   * @param {any} password - Password to validate
   * @returns {Object} - { valid: boolean, message: string }
   */
  static validatePassword(password) {
    // Type check
    if (typeof password !== 'string') {
      return { valid: false, message: 'Password must be a string' };
    }

    // Length check
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters' };
    }

    if (password.length > 128) {
      return { valid: false, message: 'Password must be less than 128 characters' };
    }

    return { valid: true };
  }

  /**
   * Sanitize chat message to prevent XSS
   * @param {any} message - Message to sanitize
   * @returns {Object} - { valid: boolean, sanitized: string|null, message: string }
   */
  static sanitizeChatMessage(message) {
    // Type check
    if (typeof message !== 'string') {
      return { valid: false, sanitized: null, message: 'Message must be a string' };
    }

    // Trim whitespace
    const trimmed = message.trim();

    // Length check
    if (trimmed.length === 0) {
      return { valid: false, sanitized: null, message: 'Message cannot be empty' };
    }

    if (trimmed.length > 500) {
      return { valid: false, sanitized: null, message: 'Message must be less than 500 characters' };
    }

    // HTML entity encoding to prevent XSS
    const sanitized = trimmed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return { valid: true, sanitized };
  }

  /**
   * Validate channel name
   * @param {any} channel - Channel name to validate
   * @returns {Object} - { valid: boolean, sanitized: string|null, message: string }
   */
  static validateChannel(channel) {
    // Type check
    if (typeof channel !== 'string') {
      return { valid: false, sanitized: null, message: 'Channel must be a string' };
    }

    const trimmed = channel.trim().toLowerCase();

    // Whitelist valid channels
    const validChannels = ['global', 'local', 'guild', 'party', 'whisper'];
    if (!validChannels.includes(trimmed)) {
      return { valid: false, sanitized: null, message: 'Invalid channel' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Validate location ID
   * @param {any} locationId - Location ID to validate
   * @returns {Object} - { valid: boolean, sanitized: string|null, message: string }
   */
  static validateLocationId(locationId) {
    // Type check
    if (typeof locationId !== 'string') {
      return { valid: false, sanitized: null, message: 'Location ID must be a string' };
    }

    const trimmed = locationId.trim();

    // Length check
    if (trimmed.length === 0 || trimmed.length > 50) {
      return { valid: false, sanitized: null, message: 'Invalid location ID' };
    }

    // Character validation: lowercase letters, numbers, underscores, hyphens
    const locationRegex = /^[a-z0-9_-]+$/;
    if (!locationRegex.test(trimmed)) {
      return { valid: false, sanitized: null, message: 'Invalid location ID format' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Validate numeric input
   * @param {any} value - Value to validate
   * @param {Object} options - Validation options (min, max, integer)
   * @returns {Object} - { valid: boolean, value: number|null, message: string }
   */
  static validateNumber(value, options = {}) {
    const { min = -Infinity, max = Infinity, integer = false } = options;

    // Type check and conversion
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, value: null, message: 'Value must be a valid number' };
    }

    // Integer check
    if (integer && !Number.isInteger(num)) {
      return { valid: false, value: null, message: 'Value must be an integer' };
    }

    // Range check
    if (num < min || num > max) {
      return { valid: false, value: null, message: `Value must be between ${min} and ${max}` };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate and sanitize JSON payload
   * @param {any} data - Data to validate
   * @param {number} maxSize - Maximum size in bytes
   * @returns {Object} - { valid: boolean, message: string }
   */
  static validatePayloadSize(data, maxSize = 10240) { // 10KB default
    try {
      const jsonString = JSON.stringify(data);
      const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
      
      if (sizeInBytes > maxSize) {
        return { valid: false, message: `Payload too large (${sizeInBytes} bytes, max ${maxSize})` };
      }

      return { valid: true, size: sizeInBytes };
    } catch (error) {
      return { valid: false, message: 'Invalid payload format' };
    }
  }

  /**
   * Sanitize object keys and values to prevent prototype pollution
   * @param {Object} obj - Object to sanitize
   * @param {Array} allowedKeys - Whitelist of allowed keys
   * @returns {Object} - Sanitized object
   */
  static sanitizeObject(obj, allowedKeys = null) {
    if (typeof obj !== 'object' || obj === null) {
      return {};
    }

    const sanitized = {};
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    // Use Object.keys() to only get own enumerable properties
    // This is safer than for...in which includes inherited properties
    const keys = Object.keys(obj);
    
    for (const key of keys) {
      // Skip dangerous keys (case-insensitive for extra safety)
      if (dangerousKeys.includes(key) || dangerousKeys.includes(key.toLowerCase())) {
        continue;
      }

      // Skip if not in whitelist (when provided)
      if (allowedKeys && !allowedKeys.includes(key)) {
        continue;
      }

      // Only copy own properties (double-check with hasOwnProperty)
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = obj[key];
      }
    }

    return sanitized;
  }

  /**
   * Validate UUID format
   * @param {any} uuid - UUID to validate
   * @returns {Object} - { valid: boolean, message: string }
   */
  static validateUUID(uuid) {
    if (typeof uuid !== 'string') {
      return { valid: false, message: 'UUID must be a string' };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      return { valid: false, message: 'Invalid UUID format' };
    }

    return { valid: true };
  }
}

module.exports = InputValidator;

/**
 * Backup Timestamp Validation Utilities
 * 
 * Provides strict validation for backup timestamps in the format YYYYMMDD-HHmmss
 */

/**
 * Check if a value is a valid backup timestamp
 * @param {unknown} ts - The value to validate
 * @returns {boolean} - True if ts is a valid timestamp string
 */
function isValidBackupTimestamp(ts) {
  return typeof ts === 'string' && /^\d{8}-\d{6}$/.test(ts);
}

/**
 * Validate a backup timestamp and throw if invalid
 * @param {unknown} ts - The value to validate
 * @returns {string} - The validated timestamp string
 * @throws {Error} - If the timestamp is invalid
 */
function validateBackupTimestampOrThrow(ts) {
  if (!isValidBackupTimestamp(ts)) {
    // Include invalid value in message; if undefined/empty, produce empty trailing text
    throw new Error(`Invalid backup timestamp: ${ts ?? ''}`);
  }
  return ts;
}

module.exports = {
  isValidBackupTimestamp,
  validateBackupTimestampOrThrow
};

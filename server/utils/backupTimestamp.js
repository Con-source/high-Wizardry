/**
 * Backup Timestamp Utilities
 * 
 * Provides validation functions for backup timestamps in YYYYMMDD-HHmmss format.
 */

/**
 * Regex pattern for valid backup timestamp format: YYYYMMDD-HHmmss
 * Examples: 20231118-143022, 20240101-000000
 */
const TIMESTAMP_PATTERN = /^\d{8}-\d{6}$/;

/**
 * Check if a timestamp string matches the valid backup timestamp format.
 * 
 * @param {string} timestamp - The timestamp string to validate
 * @returns {boolean} True if the timestamp is valid, false otherwise
 */
function isValidBackupTimestamp(timestamp) {
  if (typeof timestamp !== 'string') {
    return false;
  }
  return TIMESTAMP_PATTERN.test(timestamp);
}

/**
 * Validate a timestamp string and throw an error if invalid.
 * 
 * @param {string} timestamp - The timestamp string to validate
 * @throws {Error} If the timestamp is invalid (includes the invalid value in message)
 */
function validateBackupTimestampOrThrow(timestamp) {
  if (!isValidBackupTimestamp(timestamp)) {
    throw new Error(`Invalid backup timestamp: ${timestamp}`);
  }
}

module.exports = {
  TIMESTAMP_PATTERN,
  isValidBackupTimestamp,
  validateBackupTimestampOrThrow
};

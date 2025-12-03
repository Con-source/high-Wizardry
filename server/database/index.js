/**
 * Database Module
 * Provides a factory function to create the appropriate database adapter
 * based on configuration/environment variables.
 */

const JsonFileAdapter = require('./JsonFileAdapter');
const SQLiteAdapter = require('./SQLiteAdapter');

/**
 * Create a database adapter based on configuration
 * @param {Object} options - Configuration options
 * @param {string} options.type - Database type: 'json' or 'sqlite' (default: process.env.DATABASE_TYPE or 'json')
 * @param {string} options.dataDir - Data directory path
 * @param {Object} options.json - Options for JsonFileAdapter
 * @param {Object} options.sqlite - Options for SQLiteAdapter
 * @returns {DatabaseAdapter} - Database adapter instance
 */
function createDatabaseAdapter(options = {}) {
  const type = options.type || process.env.DATABASE_TYPE || 'json';
  
  switch (type.toLowerCase()) {
    case 'sqlite':
      return new SQLiteAdapter({
        dataDir: options.dataDir,
        ...options.sqlite
      });
      
    case 'json':
    default:
      return new JsonFileAdapter({
        dataDir: options.dataDir,
        ...options.json
      });
  }
}

/**
 * Get the database type from configuration
 * @returns {string} - Database type ('json' or 'sqlite')
 */
function getDatabaseType() {
  return process.env.DATABASE_TYPE || 'json';
}

module.exports = {
  createDatabaseAdapter,
  getDatabaseType,
  JsonFileAdapter,
  SQLiteAdapter
};

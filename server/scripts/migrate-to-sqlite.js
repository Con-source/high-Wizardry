#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates data from JSON file storage to SQLite database
 * 
 * Usage:
 *   node server/scripts/migrate-to-sqlite.js                 # Migrate data
 *   node server/scripts/migrate-to-sqlite.js --dry-run       # Preview migration without changes
 *   node server/scripts/migrate-to-sqlite.js --backup        # Create backup before migration
 *   node server/scripts/migrate-to-sqlite.js --force         # Overwrite existing SQLite database
 */

const path = require('path');
const fs = require('fs');
const { JsonFileAdapter, SQLiteAdapter } = require('../database');

async function migrate(options = {}) {
  const { dryRun = false, backup = false, force = false } = options;
  
  console.log('🔄 High Wizardry Database Migration');
  console.log('   JSON → SQLite');
  console.log('');
  
  if (dryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made\n');
  }
  
  const dataDir = path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'highwizardry.db');
  
  // Check if SQLite database already exists
  if (fs.existsSync(dbPath) && !force) {
    console.log('❌ SQLite database already exists at:', dbPath);
    console.log('   Use --force to overwrite, or delete the file manually.');
    return { success: false, message: 'Database already exists' };
  }
  
  // Create backup if requested
  if (backup && !dryRun) {
    console.log('📦 Creating backup before migration...');
    const BackupManager = require('./backup');
    const backupManager = new BackupManager();
    const backupResult = await backupManager.run({ silent: true });
    if (backupResult.success) {
      console.log(`✅ Backup created: ${backupResult.timestamp}`);
    } else {
      console.log('⚠️  Backup failed, but continuing with migration');
    }
    console.log('');
  }
  
  // Initialize JSON adapter (source)
  console.log('📂 Loading data from JSON files...');
  const jsonAdapter = new JsonFileAdapter({ dataDir });
  await jsonAdapter.initialize();
  
  // Get all data from JSON
  const users = await jsonAdapter.getAllUsers();
  const players = await jsonAdapter.getAllPlayers();
  
  console.log(`   Found ${users.size} users`);
  console.log(`   Found ${players.size} players`);
  console.log('');
  
  if (dryRun) {
    console.log('📋 DRY RUN - Would migrate:');
    console.log(`   - ${users.size} users`);
    console.log(`   - ${players.size} players`);
    console.log('');
    console.log('✅ Dry run complete. Run without --dry-run to perform migration.');
    await jsonAdapter.close();
    return { success: true, dryRun: true, users: users.size, players: players.size };
  }
  
  // Remove existing database if force mode
  if (force && fs.existsSync(dbPath)) {
    console.log('🗑️  Removing existing SQLite database...');
    fs.unlinkSync(dbPath);
  }
  
  // Initialize SQLite adapter (destination)
  console.log('🔧 Creating SQLite database...');
  const sqliteAdapter = new SQLiteAdapter({ dataDir, dbPath });
  await sqliteAdapter.initialize();
  
  // Migrate users
  console.log('');
  console.log('📤 Migrating users...');
  let usersMigrated = 0;
  let usersErrors = 0;
  
  for (const [username, userData] of users) {
    try {
      const success = await sqliteAdapter.createUser(username, userData);
      if (success) {
        usersMigrated++;
        if (usersMigrated % 100 === 0) {
          console.log(`   Migrated ${usersMigrated} users...`);
        }
      } else {
        console.log(`   ⚠️  User ${username} already exists in SQLite`);
        usersErrors++;
      }
    } catch (error) {
      console.log(`   ❌ Error migrating user ${username}: ${error.message}`);
      usersErrors++;
    }
  }
  console.log(`   ✅ Migrated ${usersMigrated} users (${usersErrors} errors)`);
  
  // Migrate players
  console.log('');
  console.log('📤 Migrating players...');
  let playersMigrated = 0;
  let playersErrors = 0;
  
  for (const [playerId, playerData] of players) {
    try {
      const success = await sqliteAdapter.createPlayer(playerId, playerData);
      if (success) {
        playersMigrated++;
        if (playersMigrated % 100 === 0) {
          console.log(`   Migrated ${playersMigrated} players...`);
        }
      } else {
        console.log(`   ⚠️  Player ${playerId} already exists in SQLite`);
        playersErrors++;
      }
    } catch (error) {
      console.log(`   ❌ Error migrating player ${playerId}: ${error.message}`);
      playersErrors++;
    }
  }
  console.log(`   ✅ Migrated ${playersMigrated} players (${playersErrors} errors)`);
  
  // Close adapters
  await jsonAdapter.close();
  await sqliteAdapter.close();
  
  // Summary
  console.log('');
  console.log('─'.repeat(50));
  console.log('📊 Migration Summary');
  console.log('─'.repeat(50));
  console.log(`Database Path: ${dbPath}`);
  console.log(`Users Migrated: ${usersMigrated}/${users.size}`);
  console.log(`Players Migrated: ${playersMigrated}/${players.size}`);
  console.log(`Total Errors: ${usersErrors + playersErrors}`);
  console.log('');
  
  if (usersErrors === 0 && playersErrors === 0) {
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update your .env file:');
    console.log('      DATABASE_TYPE=sqlite');
    console.log('');
    console.log('   2. Restart the server to use SQLite');
    console.log('');
    console.log('   3. (Optional) After verifying SQLite works,');
    console.log('      you can archive or delete the old JSON files:');
    console.log(`      - ${path.join(dataDir, 'users.json')}`);
    console.log(`      - ${path.join(dataDir, 'players')}/ directory`);
  } else {
    console.log('⚠️  Migration completed with errors.');
    console.log('   Please review the errors above and fix any issues.');
  }
  
  return {
    success: usersErrors === 0 && playersErrors === 0,
    usersMigrated,
    playersMigrated,
    usersErrors,
    playersErrors,
    dbPath
  };
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('High Wizardry Database Migration Tool');
    console.log('');
    console.log('Migrates data from JSON file storage to SQLite database.');
    console.log('');
    console.log('Usage: node server/scripts/migrate-to-sqlite.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run     Preview migration without making changes');
    console.log('  --backup      Create backup before migration');
    console.log('  --force       Overwrite existing SQLite database');
    console.log('  --help, -h    Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node server/scripts/migrate-to-sqlite.js --dry-run');
    console.log('  node server/scripts/migrate-to-sqlite.js --backup');
    console.log('  node server/scripts/migrate-to-sqlite.js --backup --force');
    process.exit(0);
  }
  
  const options = {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup'),
    force: args.includes('--force')
  };
  
  migrate(options)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;

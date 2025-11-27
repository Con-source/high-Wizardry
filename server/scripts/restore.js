#!/usr/bin/env node

/**
 * Restore Script for High Wizardry
 * 
 * Restores game data from a backup file into the 'data' directory.
 * Provides confirmation prompts before overwriting existing data.
 * 
 * Features:
 * - Point-in-time restore from any backup
 * - Backup integrity verification before restore
 * - Pre-restore backup of current data
 * - Detailed restore progress and notifications
 * - Test restore capability (dry run)
 * 
 * Usage:
 *   node server/scripts/restore.js <timestamp>
 *   node server/scripts/restore.js --list
 *   node server/scripts/restore.js --test <timestamp>  # Dry run
 *   node server/scripts/restore.js --latest            # Restore from latest backup
 *   npm run restore <timestamp>
 * 
 * Example:
 *   node server/scripts/restore.js 20231118-143022
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const BackupManager = require('./backup');

class RestoreManager {
  constructor(timestamp, options = {}) {
    if (!RestoreManager.isValidTimestamp(timestamp)) {
      throw new Error(`Invalid backup timestamp: ${timestamp}`);
    }
    this.timestamp = timestamp;
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data');
    this.backupDir = options.backupDir || path.join(__dirname, '..', '..', 'backups');
    
    // Configuration
    this.config = {
      // Create backup before restore
      preRestoreBackup: options.preRestoreBackup !== false,
      // Skip confirmation prompts
      force: options.force || false,
      // Notification callback
      notificationCallback: options.notificationCallback || null
    };
  }

  /**
   * Validate backup timestamp to prevent path traversal.
   * Accepts format YYYYMMDD-HHMMSS
   */
  static isValidTimestamp(ts) {
    // Only allow digits and dash in the expected position, exactly 15 chars: 8 digits, dash, 6 digits
    // Ex: 20231118-143022
    return typeof ts === 'string' && /^[0-9]{8}-[0-9]{6}$/.test(ts);
  }

  /**
   * Send notification about restore event
   */
  notify(event, data) {
    const notification = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (typeof this.config.notificationCallback === 'function') {
      try {
        this.config.notificationCallback(notification);
      } catch (error) {
        console.error('Notification callback error:', error.message);
      }
    }

    return notification;
  }

  /**
   * Calculate SHA-256 checksum of a file
   */
  calculateChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Create readline interface for user prompts
   */
  createInterface() {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Prompt user for confirmation
   */
  async confirm(message) {
    const rl = this.createInterface();
    
    return new Promise((resolve) => {
      rl.question(`${message} (yes/no): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * List available backups
   */
  listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      console.log('⚠️  No backups directory found.');
      return [];
    }

    const files = fs.readdirSync(this.backupDir);
    const manifests = files.filter(f => f.endsWith('-manifest.json'));
    
    const backups = manifests.map(manifestFile => {
      try {
        const manifestPath = path.join(this.backupDir, manifestFile);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return {
          timestamp: manifest.timestamp,
          date: manifest.date,
          totalSize: manifest.totalSize,
          files: manifest.files,
          version: manifest.version || '1.0',
          serverVersion: manifest.serverVersion || 'unknown'
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Sort by timestamp descending (newest first)
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return backups;
  }

  /**
   * Get the latest backup timestamp
   */
  getLatestBackupTimestamp() {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0].timestamp : null;
  }

  /**
   * Verify backup integrity before restore
   * @param {string} timestamp - Backup timestamp to verify
   * @returns {Object} - Verification result
   */
  verifyBackupIntegrity(timestamp) {
    const manifestFile = path.join(this.backupDir, `${timestamp}-manifest.json`);
    
    if (!fs.existsSync(manifestFile)) {
      return { 
        success: false, 
        message: `Backup manifest not found for timestamp: ${timestamp}`,
        verified: 0,
        failed: 0,
        errors: []
      };
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      const results = {
        success: true,
        timestamp: manifest.timestamp,
        date: manifest.date,
        version: manifest.version || '1.0',
        verified: 0,
        failed: 0,
        errors: []
      };

      for (const file of manifest.files) {
        // Skip manifest file itself
        if (file.name.endsWith('-manifest.json')) {
          continue;
        }

        const filePath = path.join(this.backupDir, file.name);
        
        if (!fs.existsSync(filePath)) {
          results.failed++;
          results.errors.push(`Missing file: ${file.name}`);
          continue;
        }

        // Verify checksum if available (v2.0 manifests)
        if (file.checksum) {
          const actualChecksum = this.calculateChecksum(filePath);
          if (actualChecksum !== file.checksum) {
            results.failed++;
            results.errors.push(`Checksum mismatch for ${file.name}`);
            continue;
          }
        }

        // Verify file size
        const actualSize = fs.statSync(filePath).size;
        if (actualSize !== file.size) {
          results.failed++;
          results.errors.push(`Size mismatch for ${file.name}`);
          continue;
        }

        // Verify JSON is valid
        try {
          JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
          results.failed++;
          results.errors.push(`Invalid JSON in file: ${file.name}`);
          continue;
        }

        results.verified++;
      }

      results.success = results.failed === 0;
      results.message = results.success 
        ? `All ${results.verified} file(s) verified successfully`
        : `Verification failed: ${results.failed} file(s) have issues`;

      return results;
    } catch (error) {
      return {
        success: false,
        message: `Error verifying backup: ${error.message}`,
        verified: 0,
        failed: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Create a pre-restore backup of current data
   * @returns {Object} - Backup result
   */
  createPreRestoreBackup() {
    const backup = new BackupManager({
      dataDir: this.dataDir,
      backupDir: this.backupDir
    });
    
    console.log('📦 Creating pre-restore backup of current data...');
    return backup.run({ silent: true });
  }

  /**
   * Test restore (dry run) - verify what would be restored without making changes
   * @returns {Object} - Test restore result
   */
  testRestore() {
    console.log('🧪 Running test restore (dry run)...');
    console.log(`📅 Timestamp: ${this.timestamp}`);
    console.log('');

    // Validate backup exists
    const backup = this.validateBackup();
    if (!backup) {
      return {
        success: false,
        message: `Backup not found: ${this.timestamp}`,
        wouldRestore: []
      };
    }

    // Verify integrity
    console.log('🔍 Verifying backup integrity...');
    const verification = this.verifyBackupIntegrity(this.timestamp);
    
    if (!verification.success) {
      console.log(`❌ Backup integrity check failed: ${verification.message}`);
      verification.errors.forEach(e => console.log(`   - ${e}`));
      return {
        success: false,
        message: verification.message,
        errors: verification.errors,
        wouldRestore: []
      };
    }
    
    console.log(`✅ Backup integrity verified: ${verification.verified} file(s)`);
    console.log('');

    // Load manifest
    const manifest = JSON.parse(fs.readFileSync(backup.manifest, 'utf8'));
    
    // Check what would be restored
    const wouldRestore = [];
    const existing = this.checkExistingData();

    if (backup.users) {
      wouldRestore.push({
        type: 'users',
        file: 'users.json',
        action: existing.users ? 'replace' : 'create'
      });
    }

    if (backup.players) {
      const playersData = JSON.parse(fs.readFileSync(backup.players, 'utf8'));
      const playerCount = Object.keys(playersData).length;
      wouldRestore.push({
        type: 'players',
        count: playerCount,
        action: existing.players ? `replace ${existing.playerCount} with ${playerCount}` : `create ${playerCount}`
      });
    }

    console.log('📋 Test restore summary:');
    console.log('─'.repeat(50));
    console.log(`Backup date: ${new Date(manifest.date).toLocaleString()}`);
    console.log(`Total size: ${this.formatBytes(manifest.totalSize)}`);
    console.log('');
    console.log('Would restore:');
    wouldRestore.forEach(item => {
      if (item.type === 'users') {
        console.log(`  ✓ Users database (${item.action})`);
      } else if (item.type === 'players') {
        console.log(`  ✓ Player data: ${item.count} player(s) (${item.action})`);
      }
    });
    console.log('');
    console.log('✅ Test restore completed - no changes made');

    return {
      success: true,
      message: 'Test restore completed successfully',
      timestamp: this.timestamp,
      backupDate: manifest.date,
      wouldRestore
    };
  }

  /**
   * Display available backups
   */
  displayAvailableBackups() {
    const backups = this.listBackups();
    
    if (backups.length === 0) {
      console.log('No backups found.');
      return;
    }

    console.log('\nAvailable backups:');
    console.log('─'.repeat(70));
    
    backups.forEach((backup, index) => {
      const date = new Date(backup.date);
      const formattedDate = date.toLocaleString();
      const size = this.formatBytes(backup.totalSize);
      const fileCount = backup.files.length;
      
      console.log(`${index + 1}. ${backup.timestamp}`);
      console.log(`   Date: ${formattedDate}`);
      console.log(`   Files: ${fileCount} (${size})`);
      console.log('');
    });
  }

  /**
   * Validate backup exists
   */
  validateBackup() {
    const usersBackup = path.join(this.backupDir, `${this.timestamp}-users.json`);
    const playersBackup = path.join(this.backupDir, `${this.timestamp}-players.json`);
    const manifestBackup = path.join(this.backupDir, `${this.timestamp}-manifest.json`);

    const backupExists = fs.existsSync(manifestBackup);
    
    if (!backupExists) {
      console.error(`❌ Backup not found: ${this.timestamp}`);
      console.log('\nRun this command to see available backups:');
      console.log('  node server/scripts/restore.js --list');
      return false;
    }

    return {
      users: fs.existsSync(usersBackup) ? usersBackup : null,
      players: fs.existsSync(playersBackup) ? playersBackup : null,
      manifest: manifestBackup
    };
  }

  /**
   * Check existing data
   */
  checkExistingData() {
    const existing = {
      users: false,
      players: false,
      playerCount: 0
    };

    const usersFile = path.join(this.dataDir, 'users.json');
    if (fs.existsSync(usersFile)) {
      existing.users = true;
    }

    const playersDir = path.join(this.dataDir, 'players');
    if (fs.existsSync(playersDir)) {
      const playerFiles = fs.readdirSync(playersDir).filter(f => f.endsWith('.json'));
      if (playerFiles.length > 0) {
        existing.players = true;
        existing.playerCount = playerFiles.length;
      }
    }

    return existing;
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`✅ Created data directory: ${this.dataDir}`);
    }

    const playersDir = path.join(this.dataDir, 'players');
    if (!fs.existsSync(playersDir)) {
      fs.mkdirSync(playersDir, { recursive: true });
      console.log(`✅ Created players directory: ${playersDir}`);
    }
  }

  /**
   * Restore users.json
   */
  restoreUsers(backupFile) {
    if (!backupFile) {
      console.log('⚠️  No users backup found in this backup set, skipping...');
      return false;
    }

    const targetFile = path.join(this.dataDir, 'users.json');

    try {
      fs.copyFileSync(backupFile, targetFile);
      const stats = fs.statSync(targetFile);
      console.log(`✅ Restored users.json (${this.formatBytes(stats.size)})`);
      return true;
    } catch (error) {
      console.error('❌ Error restoring users.json:', error.message);
      return false;
    }
  }

  /**
   * Restore player data
   */
  restorePlayers(backupFile) {
    if (!backupFile) {
      console.log('⚠️  No players backup found in this backup set, skipping...');
      return false;
    }

    const playersDir = path.join(this.dataDir, 'players');

    try {
      // Read the combined players backup
      const data = fs.readFileSync(backupFile, 'utf8');
      const players = JSON.parse(data);

      let restoredCount = 0;
      let totalSize = 0;

      // Write each player to individual files
      for (const [playerId, playerData] of Object.entries(players)) {
        const playerFile = path.join(playersDir, `${playerId}.json`);
        fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2));
        totalSize += fs.statSync(playerFile).size;
        restoredCount++;
      }

      console.log(`✅ Restored ${restoredCount} player(s) (${this.formatBytes(totalSize)})`);
      return true;
    } catch (error) {
      console.error('❌ Error restoring players:', error.message);
      return false;
    }
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Run the restore process
   * @param {Object} options - Restore options
   * @returns {Object} - Restore result
   */
  async run(options = {}) {
    const silent = options.silent || false;
    
    if (!silent) {
      console.log('🔄 Starting restore process...');
      console.log(`📅 Timestamp: ${this.timestamp}`);
      console.log('');
    }

    this.notify('restore_started', { timestamp: this.timestamp });

    // Validate backup exists
    const backup = this.validateBackup();
    if (!backup) {
      this.displayAvailableBackups();
      const result = {
        success: false,
        message: `Backup not found: ${this.timestamp}`
      };
      this.notify('restore_failed', result);
      if (!options.returnResult) {
        process.exit(1);
      }
      return result;
    }

    // Verify integrity before restore
    if (!silent) {
      console.log('🔍 Verifying backup integrity...');
    }
    const verification = this.verifyBackupIntegrity(this.timestamp);
    
    if (!verification.success) {
      if (!silent) {
        console.log(`❌ Backup integrity check failed: ${verification.message}`);
        verification.errors.forEach(e => console.log(`   - ${e}`));
      }
      const result = {
        success: false,
        message: verification.message,
        errors: verification.errors
      };
      this.notify('restore_failed', result);
      return result;
    }
    
    if (!silent) {
      console.log(`✅ Backup integrity verified: ${verification.verified} file(s)`);
      console.log('');
    }

    // Load manifest
    const manifest = JSON.parse(fs.readFileSync(backup.manifest, 'utf8'));
    if (!silent) {
      console.log(`📝 Backup date: ${new Date(manifest.date).toLocaleString()}`);
      console.log(`📁 Files in backup: ${manifest.files.length}`);
      console.log(`💾 Total size: ${this.formatBytes(manifest.totalSize)}`);
      console.log('');
    }

    // Check for existing data
    const existing = this.checkExistingData();
    
    if ((existing.users || existing.players) && !this.config.force) {
      if (!silent) {
        console.log('⚠️  WARNING: Existing data will be overwritten!');
        console.log('');
        
        if (existing.users) {
          console.log('   - users.json exists and will be replaced');
        }
        if (existing.players) {
          console.log(`   - ${existing.playerCount} player file(s) will be replaced`);
        }
        
        console.log('');
        console.log('This action cannot be undone. Consider backing up current data first.');
        console.log('');
      }

      const confirmed = await this.confirm('Do you want to proceed with the restore?');
      
      if (!confirmed) {
        if (!silent) {
          console.log('\n❌ Restore cancelled by user.');
        }
        const result = {
          success: false,
          message: 'Restore cancelled by user'
        };
        this.notify('restore_cancelled', result);
        if (!options.returnResult) {
          process.exit(0);
        }
        return result;
      }
      
      if (!silent) {
        console.log('');
      }
    }

    // Create pre-restore backup if configured and there's existing data
    if (this.config.preRestoreBackup && (existing.users || existing.players)) {
      try {
        await this.createPreRestoreBackup();
        if (!silent) {
          console.log('✅ Pre-restore backup created');
          console.log('');
        }
      } catch (error) {
        console.error('⚠️  Warning: Could not create pre-restore backup:', error.message);
      }
    }

    // Ensure data directory exists
    this.ensureDataDirectory();

    // Restore data
    if (!silent) {
      console.log('🔄 Restoring data...');
      console.log('');
    }

    const results = {
      users: this.restoreUsers(backup.users),
      players: this.restorePlayers(backup.players)
    };

    if (!silent) {
      console.log('');
    }
    
    if (results.users || results.players) {
      const result = {
        success: true,
        message: 'Restore completed successfully',
        timestamp: this.timestamp,
        restored: {
          users: results.users,
          players: results.players
        }
      };
      
      if (!silent) {
        console.log('✅ Restore completed successfully!');
        console.log(`📁 Data location: ${this.dataDir}`);
        console.log('');
        console.log('⚠️  Remember to restart the server for changes to take effect.');
      }
      
      this.notify('restore_completed', result);
      return result;
    } else {
      const result = {
        success: false,
        message: 'No data was restored'
      };
      
      if (!silent) {
        console.log('⚠️  No data was restored.');
      }
      
      this.notify('restore_failed', result);
      return result;
    }
  }
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('High Wizardry Restore Manager');
    console.log('');
    console.log('Usage: node server/scripts/restore.js <timestamp>');
    console.log('       node server/scripts/restore.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --list, -l          List available backups');
    console.log('  --latest            Restore from the latest backup');
    console.log('  --test <timestamp>  Test restore (dry run) without making changes');
    console.log('  --force             Skip confirmation prompts');
    console.log('  --no-pre-backup     Skip creating a backup before restore');
    console.log('  --help, -h          Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node server/scripts/restore.js 20231118-143022');
    console.log('  node server/scripts/restore.js --latest');
    console.log('  node server/scripts/restore.js --test 20231118-143022');
    console.log('  node server/scripts/restore.js --latest --force');
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    const manager = new RestoreManager('');
    manager.displayAvailableBackups();
    process.exit(0);
  }

  // Handle --test option
  if (args.includes('--test')) {
    const testIndex = args.indexOf('--test') + 1;
    let timestamp = args[testIndex];
    
    // If no timestamp provided, use latest
    if (!timestamp || timestamp.startsWith('-')) {
      const manager = new RestoreManager('');
      timestamp = manager.getLatestBackupTimestamp();
      if (!timestamp) {
        console.error('❌ No backups found for testing');
        process.exit(1);
      }
    }
    
    const restore = new RestoreManager(timestamp);
    const result = restore.testRestore();
    process.exit(result.success ? 0 : 1);
  }

  // Handle --latest option
  let timestamp;
  if (args.includes('--latest')) {
    const manager = new RestoreManager('');
    timestamp = manager.getLatestBackupTimestamp();
    if (!timestamp) {
      console.error('❌ No backups found');
      process.exit(1);
    }
    console.log(`Using latest backup: ${timestamp}`);
  } else if (args.length === 0) {
    console.log('Usage: node server/scripts/restore.js <timestamp>');
    console.log('       node server/scripts/restore.js --list');
    console.log('');
    console.log('Run with --help for more options.');
    process.exit(0);
  } else {
    // Find the first argument that's not an option
    timestamp = args.find(arg => !arg.startsWith('-'));
    if (!timestamp) {
      console.error('❌ Please provide a backup timestamp');
      process.exit(1);
    }
  }

  const options = {
    force: args.includes('--force'),
    preRestoreBackup: !args.includes('--no-pre-backup')
  };

  const restore = new RestoreManager(timestamp, options);
  restore.run({ returnResult: true }).then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  });
}

module.exports = RestoreManager;

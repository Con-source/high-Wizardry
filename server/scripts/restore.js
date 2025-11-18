#!/usr/bin/env node

/**
 * Restore Script for High Wizardry
 * 
 * Restores game data from a backup file into the 'data' directory.
 * Provides confirmation prompts before overwriting existing data.
 * 
 * Usage:
 *   node server/scripts/restore.js <timestamp>
 *   npm run restore <timestamp>
 * 
 * Example:
 *   node server/scripts/restore.js 20231118-143022
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class RestoreManager {
  constructor(timestamp) {
    this.timestamp = timestamp;
    this.dataDir = path.join(__dirname, '..', 'data');
    this.backupDir = path.join(__dirname, '..', '..', 'backups');
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
      const manifestPath = path.join(this.backupDir, manifestFile);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return {
        timestamp: manifest.timestamp,
        date: manifest.date,
        totalSize: manifest.totalSize,
        files: manifest.files
      };
    });

    // Sort by timestamp descending (newest first)
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return backups;
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
   */
  async run() {
    console.log('🔄 Starting restore process...');
    console.log(`📅 Timestamp: ${this.timestamp}`);
    console.log('');

    // Validate backup exists
    const backup = this.validateBackup();
    if (!backup) {
      this.displayAvailableBackups();
      process.exit(1);
    }

    // Load manifest
    const manifest = JSON.parse(fs.readFileSync(backup.manifest, 'utf8'));
    console.log(`📝 Backup date: ${new Date(manifest.date).toLocaleString()}`);
    console.log(`📁 Files in backup: ${manifest.files.length}`);
    console.log(`💾 Total size: ${this.formatBytes(manifest.totalSize)}`);
    console.log('');

    // Check for existing data
    const existing = this.checkExistingData();
    
    if (existing.users || existing.players) {
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

      const confirmed = await this.confirm('Do you want to proceed with the restore?');
      
      if (!confirmed) {
        console.log('\n❌ Restore cancelled by user.');
        process.exit(0);
      }
      
      console.log('');
    }

    // Ensure data directory exists
    this.ensureDataDirectory();

    // Restore data
    console.log('🔄 Restoring data...');
    console.log('');

    const results = {
      users: this.restoreUsers(backup.users),
      players: this.restorePlayers(backup.players)
    };

    console.log('');
    
    if (results.users || results.players) {
      console.log('✅ Restore completed successfully!');
      console.log(`📁 Data location: ${this.dataDir}`);
      console.log('');
      console.log('⚠️  Remember to restart the server for changes to take effect.');
    } else {
      console.log('⚠️  No data was restored.');
    }
  }
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node server/scripts/restore.js <timestamp>');
    console.log('       node server/scripts/restore.js --list');
    console.log('');
    console.log('Options:');
    console.log('  --list, -l    List available backups');
    console.log('  --help, -h    Show this help message');
    console.log('');
    console.log('Example:');
    console.log('  node server/scripts/restore.js 20231118-143022');
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    const manager = new RestoreManager('');
    manager.displayAvailableBackups();
    process.exit(0);
  }

  const timestamp = args[0];
  const restore = new RestoreManager(timestamp);
  restore.run().catch(error => {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  });
}

module.exports = RestoreManager;

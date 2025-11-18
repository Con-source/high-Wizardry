#!/usr/bin/env node

/**
 * Backup Script for High Wizardry
 * 
 * Exports all persistent game data (users, player stats, etc.) 
 * from the 'data' directory into timestamped backup files.
 * 
 * Usage:
 *   node server/scripts/backup.js
 *   npm run backup
 */

const fs = require('fs');
const path = require('path');

class BackupManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.backupDir = path.join(__dirname, '..', '..', 'backups');
    this.timestamp = this.generateTimestamp();
  }

  /**
   * Generate timestamp in YYYYMMDD-HHmmss format
   */
  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`✅ Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Backup users.json file
   */
  backupUsers() {
    const usersFile = path.join(this.dataDir, 'users.json');
    
    if (!fs.existsSync(usersFile)) {
      console.log('⚠️  No users.json file found, skipping...');
      return null;
    }

    const backupFile = path.join(this.backupDir, `${this.timestamp}-users.json`);
    
    try {
      fs.copyFileSync(usersFile, backupFile);
      const stats = fs.statSync(backupFile);
      console.log(`✅ Backed up users.json (${this.formatBytes(stats.size)})`);
      return backupFile;
    } catch (error) {
      console.error('❌ Error backing up users.json:', error.message);
      return null;
    }
  }

  /**
   * Backup all player data files
   */
  backupPlayers() {
    const playersDir = path.join(this.dataDir, 'players');
    
    if (!fs.existsSync(playersDir)) {
      console.log('⚠️  No players directory found, skipping...');
      return null;
    }

    const playerFiles = fs.readdirSync(playersDir).filter(f => f.endsWith('.json'));
    
    if (playerFiles.length === 0) {
      console.log('⚠️  No player files found, skipping...');
      return null;
    }

    const backupFile = path.join(this.backupDir, `${this.timestamp}-players.json`);
    
    try {
      // Combine all player files into a single backup
      const players = {};
      let totalSize = 0;

      for (const file of playerFiles) {
        const filePath = path.join(playersDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const playerId = path.basename(file, '.json');
        players[playerId] = JSON.parse(data);
        totalSize += fs.statSync(filePath).size;
      }

      fs.writeFileSync(backupFile, JSON.stringify(players, null, 2));
      console.log(`✅ Backed up ${playerFiles.length} player(s) (${this.formatBytes(totalSize)})`);
      return backupFile;
    } catch (error) {
      console.error('❌ Error backing up players:', error.message);
      return null;
    }
  }

  /**
   * Backup any additional data files in the data directory
   */
  backupAdditionalData() {
    if (!fs.existsSync(this.dataDir)) {
      return [];
    }

    const backedUpFiles = [];
    
    try {
      const files = fs.readdirSync(this.dataDir);
      
      for (const file of files) {
        const filePath = path.join(this.dataDir, file);
        const stat = fs.statSync(filePath);
        
        // Skip users.json (already backed up) and directories
        if (file === 'users.json' || stat.isDirectory()) {
          continue;
        }
        
        // Skip non-JSON files
        if (!file.endsWith('.json')) {
          continue;
        }
        
        // Backup this file
        const backupFile = path.join(this.backupDir, `${this.timestamp}-${file}`);
        fs.copyFileSync(filePath, backupFile);
        const fileStats = fs.statSync(backupFile);
        console.log(`✅ Backed up ${file} (${this.formatBytes(fileStats.size)})`);
        backedUpFiles.push(backupFile);
      }
    } catch (error) {
      console.error('❌ Error backing up additional data:', error.message);
    }
    
    return backedUpFiles;
  }

  /**
   * Create a manifest file with backup metadata
   */
  createManifest(backedUpFiles) {
    const manifest = {
      timestamp: this.timestamp,
      date: new Date().toISOString(),
      files: backedUpFiles.map(file => ({
        name: path.basename(file),
        path: file,
        size: fs.existsSync(file) ? fs.statSync(file).size : 0
      })),
      totalSize: backedUpFiles.reduce((total, file) => {
        return total + (fs.existsSync(file) ? fs.statSync(file).size : 0);
      }, 0)
    };

    const manifestFile = path.join(this.backupDir, `${this.timestamp}-manifest.json`);
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log(`✅ Created backup manifest`);
    
    return manifestFile;
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
   * Run the backup process
   */
  async run() {
    console.log('🔄 Starting backup process...');
    console.log(`📅 Timestamp: ${this.timestamp}`);
    console.log('');

    // Ensure backup directory exists
    this.ensureBackupDirectory();

    // Check if data directory exists
    if (!fs.existsSync(this.dataDir)) {
      console.log('⚠️  No data directory found. Nothing to backup.');
      console.log('   The data directory will be created when the server runs.');
      return;
    }

    const backedUpFiles = [];

    // Backup users
    const usersBackup = this.backupUsers();
    if (usersBackup) backedUpFiles.push(usersBackup);

    // Backup players
    const playersBackup = this.backupPlayers();
    if (playersBackup) backedUpFiles.push(playersBackup);

    // Backup any additional data
    const additionalBackups = this.backupAdditionalData();
    backedUpFiles.push(...additionalBackups);

    if (backedUpFiles.length === 0) {
      console.log('');
      console.log('⚠️  No data files found to backup.');
      console.log('   Run the server to generate game data first.');
      return;
    }

    // Create manifest
    const manifestFile = this.createManifest(backedUpFiles);
    backedUpFiles.push(manifestFile);

    console.log('');
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${this.backupDir}`);
    console.log(`📝 Backed up ${backedUpFiles.length} file(s)`);
    
    // Calculate total size
    const totalSize = backedUpFiles.reduce((total, file) => {
      return total + (fs.existsSync(file) ? fs.statSync(file).size : 0);
    }, 0);
    console.log(`💾 Total size: ${this.formatBytes(totalSize)}`);
  }
}

// Run the backup if this script is executed directly
if (require.main === module) {
  const backup = new BackupManager();
  backup.run().catch(error => {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  });
}

module.exports = BackupManager;

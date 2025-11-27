#!/usr/bin/env node

/**
 * Backup Script for High Wizardry
 * 
 * Exports all persistent game data (users, player stats, etc.) 
 * from the 'data' directory into timestamped backup files.
 * 
 * Features:
 * - Automatic scheduled backups (nightly at 3 AM by default)
 * - On-demand backup triggers
 * - Retention policies (configurable last N backups)
 * - Backup integrity verification with checksums
 * - Point-in-time restore support
 * - Backup notifications via callbacks
 * 
 * Usage:
 *   node server/scripts/backup.js                    # Run backup now
 *   node server/scripts/backup.js --schedule         # Start scheduled backups
 *   node server/scripts/backup.js --list             # List available backups
 *   node server/scripts/backup.js --verify <timestamp>  # Verify backup integrity
 *   node server/scripts/backup.js --cleanup          # Apply retention policy
 *   npm run backup
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load package.json version once at module load time
let packageVersion = '1.0.0';
try {
  packageVersion = require('../../package.json').version || '1.0.0';
} catch {
  // Use default version if package.json cannot be loaded
}

class BackupManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data');
    this.backupDir = options.backupDir || path.join(__dirname, '..', '..', 'backups');
    this.timestamp = this.generateTimestamp();
    this.serverVersion = packageVersion;
    
    // Configuration with defaults
    this.config = {
      // Retention policy: keep last N backups (default: 30 for ~1 month of daily backups)
      retentionCount: options.retentionCount || parseInt(process.env.BACKUP_RETENTION_COUNT || '30', 10),
      // Scheduled backup time (24-hour format, default: 3 AM)
      scheduledHour: options.scheduledHour || parseInt(process.env.BACKUP_SCHEDULED_HOUR || '3', 10),
      scheduledMinute: options.scheduledMinute || parseInt(process.env.BACKUP_SCHEDULED_MINUTE || '0', 10),
      // Enable/disable scheduled backups
      enableScheduled: options.enableScheduled !== false,
      // Notification callback for backup events
      notificationCallback: options.notificationCallback || null
    };
    
    // Scheduler reference
    this.schedulerInterval = null;
    this.lastScheduledBackup = null;
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
   * Calculate SHA-256 checksum of a file
   * @param {string} filePath - Path to the file
   * @returns {string} - Hex-encoded checksum
   */
  calculateChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Create a manifest file with backup metadata and checksums
   */
  createManifest(backedUpFiles) {
    const filesWithChecksums = backedUpFiles.map(file => {
      const stats = fs.existsSync(file) ? fs.statSync(file) : null;
      return {
        name: path.basename(file),
        path: file,
        size: stats ? stats.size : 0,
        checksum: stats ? this.calculateChecksum(file) : null
      };
    });

    const manifest = {
      version: '2.0',
      timestamp: this.timestamp,
      date: new Date().toISOString(),
      files: filesWithChecksums,
      totalSize: filesWithChecksums.reduce((total, file) => total + file.size, 0),
      serverVersion: this.serverVersion
    };

    const manifestFile = path.join(this.backupDir, `${this.timestamp}-manifest.json`);
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log(`✅ Created backup manifest with checksums`);
    
    return manifestFile;
  }

  /**
   * Verify backup integrity by checking checksums
   * @param {string} timestamp - Backup timestamp to verify
   * @returns {Object} - Verification result with details
   */
  verifyBackup(timestamp) {
    // Accept dashed (YYYYMMDD-HHMMSS) and undashed (YYYYMMDDHHMMSS) forms.
    // Normalize to dashed format used in manifest filenames.
    const tsStr = String(timestamp || '');
    let normalizedTs;
    if (/^[0-9]{8}-[0-9]{6}$/.test(tsStr)) {
      normalizedTs = tsStr;
    } else if (/^[0-9]{14}$/.test(tsStr)) {
      normalizedTs = tsStr.slice(0, 8) + '-' + tsStr.slice(8);
    } else {
      // Keep error message consistent with tests/logs
      return {
        success: false,
        message: `Invalid backup timestamp: ${tsStr}`,
        verified: 0,
        failed: 0,
        errors: []
      };
    }

    // Build absolute manifest file path using normalized timestamp
    const manifestFile = path.join(this.backupDir, `${normalizedTs}-manifest.json`);
    const manifestFileResolved = path.resolve(manifestFile);
    const backupDirResolved = path.resolve(this.backupDir);
    // Ensure file is under backup directory
    if (!manifestFileResolved.startsWith(backupDirResolved + path.sep)) {
      return {
        success: false,
        message: `Path traversal attempt detected`,
        verified: 0,
        failed: 0,
        errors: ['Manifest file must be located inside backup directory']
      };
    }
    if (!fs.existsSync(manifestFileResolved)) {
      return { 
        success: false, 
        message: `Backup manifest not found for timestamp: ${normalizedTs}`,
        verified: 0,
        failed: 0,
        errors: []
      };
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestFileResolved, 'utf8'));
      const results = {
        success: true,
        timestamp: manifest.timestamp,
        date: manifest.date,
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
        const filePathResolved = path.resolve(filePath);
        // Check containment for each file as it comes from manifest (defense-in-depth)
        if (!filePathResolved.startsWith(backupDirResolved + path.sep)) {
          results.errors.push(`Manifest file '${file.name}' points outside backup directory`);
          continue;
        }
        if (!fs.existsSync(filePathResolved)) {
          results.failed++;
          results.errors.push(`Missing file: ${file.name}`);
          continue;
        }

        // Verify checksum if available (v2.0 manifests)
        if (file.checksum) {
          const actualChecksum = this.calculateChecksum(filePathResolved);
          if (actualChecksum !== file.checksum) {
            results.failed++;
            results.errors.push(`Checksum mismatch for ${file.name}: expected ${file.checksum}, got ${actualChecksum}`);
            continue;
          }
        }

        // Verify file size
        const actualSize = fs.statSync(filePathResolved).size;
        if (actualSize !== file.size) {
          results.failed++;
          results.errors.push(`Size mismatch for ${file.name}: expected ${file.size}, got ${actualSize}`);
          continue;
        }

        // Verify JSON is valid
        try {
          JSON.parse(fs.readFileSync(filePathResolved, 'utf8'));
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
   * List all available backups with metadata
   * @returns {Array} - Array of backup info objects
   */
  listBackups() {
    if (!fs.existsSync(this.backupDir)) {
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
          fileCount: manifest.files.length,
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
   * Apply retention policy - keep only the last N backups
   * @param {number} keepCount - Number of backups to keep (default: config.retentionCount)
   * @returns {Object} - Cleanup result with deleted backup info
   */
  applyRetentionPolicy(keepCount = null) {
    const retainCount = keepCount || this.config.retentionCount;
    const backups = this.listBackups();
    
    if (backups.length <= retainCount) {
      return {
        success: true,
        message: `No cleanup needed. Have ${backups.length} backups, retention is ${retainCount}.`,
        deleted: 0,
        remaining: backups.length
      };
    }

    const toDelete = backups.slice(retainCount);
    const deleted = [];

    for (const backup of toDelete) {
      try {
        // Find and delete all files for this backup
        const files = fs.readdirSync(this.backupDir).filter(f => f.startsWith(backup.timestamp));
        for (const file of files) {
          fs.unlinkSync(path.join(this.backupDir, file));
        }
        deleted.push(backup.timestamp);
      } catch (error) {
        console.error(`Error deleting backup ${backup.timestamp}:`, error.message);
      }
    }

    return {
      success: true,
      message: `Deleted ${deleted.length} old backup(s). Kept ${retainCount} most recent.`,
      deleted: deleted.length,
      deletedTimestamps: deleted,
      remaining: backups.length - deleted.length
    };
  }

  /**
   * Get backup by timestamp
   * @param {string} timestamp - Backup timestamp
   * @returns {Object|null} - Backup info or null if not found
   */
  getBackup(timestamp) {
    // Accept dashed or undashed timestamps (YYYYMMDD-HHMMSS or YYYYMMDDHHMMSS)
    const tsStr = String(timestamp || '');
    let normalizedTs;
    if (/^[0-9]{8}-[0-9]{6}$/.test(tsStr)) {
      normalizedTs = tsStr;
    } else if (/^[0-9]{14}$/.test(tsStr)) {
      normalizedTs = tsStr.slice(0, 8) + '-' + tsStr.slice(8);
    } else {
      // Not a valid timestamp format
      return null;
    }

    const manifestFile = path.join(this.backupDir, `${normalizedTs}-manifest.json`);
    // Ensure manifestFile resolves *inside* backupDir (to prevent traversal)
    const resolvedManifestFile = path.resolve(manifestFile);
    const resolvedBackupDir = path.resolve(this.backupDir);
    if (!resolvedManifestFile.startsWith(resolvedBackupDir)) {
      return null;
    }
    if (!fs.existsSync(resolvedManifestFile)) {
      return null;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(resolvedManifestFile, 'utf8'));
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
  }

  /**
   * Get backup status and statistics
   * @returns {Object} - Backup status information
   */
  getStatus() {
    const backups = this.listBackups();
    const latestBackup = backups.length > 0 ? backups[0] : null;
    
    return {
      backupDirectory: this.backupDir,
      dataDirectory: this.dataDir,
      totalBackups: backups.length,
      retentionPolicy: this.config.retentionCount,
      latestBackup: latestBackup ? {
        timestamp: latestBackup.timestamp,
        date: latestBackup.date,
        size: latestBackup.totalSize
      } : null,
      scheduledBackup: {
        enabled: this.config.enableScheduled,
        time: `${String(this.config.scheduledHour).padStart(2, '0')}:${String(this.config.scheduledMinute).padStart(2, '0')}`,
        lastRun: this.lastScheduledBackup
      },
      diskUsage: backups.reduce((total, b) => total + b.totalSize, 0)
    };
  }

  /**
   * Send notification about backup event
   * @param {string} event - Event type ('backup_started', 'backup_completed', 'backup_failed', 'restore_completed', 'cleanup_completed')
   * @param {Object} data - Event data
   */
  notify(event, data) {
    const notification = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    };

    // Log to console
    const eventEmoji = {
      'backup_started': '🔄',
      'backup_completed': '✅',
      'backup_failed': '❌',
      'restore_completed': '🔄',
      'cleanup_completed': '🧹'
    };
    console.log(`${eventEmoji[event] || '📢'} Backup Event: ${event}`, JSON.stringify(data));

    // Call notification callback if configured
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
   * Start scheduled backup service
   * Checks every minute if it's time for backup
   */
  startScheduler() {
    if (this.schedulerInterval) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    console.log(`📅 Starting backup scheduler (daily at ${String(this.config.scheduledHour).padStart(2, '0')}:${String(this.config.scheduledMinute).padStart(2, '0')})`);
    
    // Check every minute
    this.schedulerInterval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if it's time for scheduled backup
      if (currentHour === this.config.scheduledHour && 
          currentMinute === this.config.scheduledMinute) {
        // Only run once per day (check if we already ran today)
        const today = now.toISOString().split('T')[0];
        if (this.lastScheduledBackup !== today) {
          this.lastScheduledBackup = today;
          console.log('🕐 Running scheduled backup...');
          this.run().then(() => {
            // Apply retention policy after backup
            this.applyRetentionPolicy();
          }).catch(error => {
            console.error('Scheduled backup failed:', error);
            this.notify('backup_failed', { error: error.message, scheduled: true });
          });
        }
      }
    }, 60000); // Check every minute

    return this.schedulerInterval;
  }

  /**
   * Stop scheduled backup service
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('🛑 Backup scheduler stopped');
    }
  }

  /**
   * Run the backup process
   * @param {Object} options - Backup options
   * @returns {Object} - Backup result
   */
  async run(options = {}) {
    // Generate fresh timestamp for this backup
    this.timestamp = this.generateTimestamp();
    
    const isScheduled = options.scheduled || false;
    const silent = options.silent || false;
    
    if (!silent) {
      console.log('🔄 Starting backup process...');
      console.log(`📅 Timestamp: ${this.timestamp}`);
      console.log('');
    }

    this.notify('backup_started', { timestamp: this.timestamp, scheduled: isScheduled });

    // Ensure backup directory exists
    this.ensureBackupDirectory();

    // Check if data directory exists
    if (!fs.existsSync(this.dataDir)) {
      const message = 'No data directory found. Nothing to backup.';
      if (!silent) {
        console.log(`⚠️  ${message}`);
        console.log('   The data directory will be created when the server runs.');
      }
      return {
        success: false,
        message,
        timestamp: this.timestamp,
        files: []
      };
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
      const message = 'No data files found to backup.';
      if (!silent) {
        console.log('');
        console.log(`⚠️  ${message}`);
        console.log('   Run the server to generate game data first.');
      }
      return {
        success: false,
        message,
        timestamp: this.timestamp,
        files: []
      };
    }

    // Create manifest with checksums
    const manifestFile = this.createManifest(backedUpFiles);
    backedUpFiles.push(manifestFile);

    // Calculate total size
    const totalSize = backedUpFiles.reduce((total, file) => {
      return total + (fs.existsSync(file) ? fs.statSync(file).size : 0);
    }, 0);

    if (!silent) {
      console.log('');
      console.log('✅ Backup completed successfully!');
      console.log(`📁 Backup location: ${this.backupDir}`);
      console.log(`📝 Backed up ${backedUpFiles.length} file(s)`);
      console.log(`💾 Total size: ${this.formatBytes(totalSize)}`);
    }

    const result = {
      success: true,
      message: 'Backup completed successfully',
      timestamp: this.timestamp,
      files: backedUpFiles.map(f => path.basename(f)),
      totalSize,
      formattedSize: this.formatBytes(totalSize)
    };

    this.notify('backup_completed', result);

    return result;
  }
}

// Run the backup if this script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const backup = new BackupManager();

  if (args.includes('--help') || args.includes('-h')) {
    console.log('High Wizardry Backup Manager');
    console.log('');
    console.log('Usage: node server/scripts/backup.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --list, -l              List all available backups');
    console.log('  --verify <timestamp>    Verify backup integrity');
    console.log('  --cleanup               Apply retention policy (delete old backups)');
    console.log('  --schedule              Start scheduled backup service');
    console.log('  --status                Show backup status and statistics');
    console.log('  --help, -h              Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  BACKUP_RETENTION_COUNT  Number of backups to keep (default: 30)');
    console.log('  BACKUP_SCHEDULED_HOUR   Hour for nightly backup (0-23, default: 3)');
    console.log('  BACKUP_SCHEDULED_MINUTE Minute for nightly backup (0-59, default: 0)');
    console.log('');
    console.log('Examples:');
    console.log('  node server/scripts/backup.js                    # Run backup now');
    console.log('  node server/scripts/backup.js --list             # List backups');
    console.log('  node server/scripts/backup.js --verify 20231118-143022');
    console.log('  node server/scripts/backup.js --cleanup          # Delete old backups');
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    const backups = backup.listBackups();
    if (backups.length === 0) {
      console.log('No backups found.');
    } else {
      console.log('Available backups:');
      console.log('─'.repeat(70));
      backups.forEach((b, i) => {
        const date = new Date(b.date);
        console.log(`${i + 1}. ${b.timestamp}`);
        console.log(`   Date: ${date.toLocaleString()}`);
        console.log(`   Files: ${b.fileCount} (${backup.formatBytes(b.totalSize)})`);
        console.log(`   Version: ${b.version}`);
        console.log('');
      });
    }
    process.exit(0);
  }

  if (args.includes('--verify')) {
    const timestampIndex = args.indexOf('--verify') + 1;
    const timestamp = args[timestampIndex];
    if (!timestamp) {
      console.error('❌ Please provide a backup timestamp to verify');
      console.log('Usage: node server/scripts/backup.js --verify <timestamp>');
      process.exit(1);
    }
    const result = backup.verifyBackup(timestamp);
    console.log('');
    console.log('Backup Verification Result:');
    console.log('─'.repeat(50));
    console.log(`Timestamp: ${result.timestamp || timestamp}`);
    console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Message: ${result.message}`);
    console.log(`Verified: ${result.verified} file(s)`);
    console.log(`Failed: ${result.failed} file(s)`);
    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach(e => console.log(`  - ${e}`));
    }
    process.exit(result.success ? 0 : 1);
  }

  if (args.includes('--cleanup')) {
    const result = backup.applyRetentionPolicy();
    console.log('');
    console.log('Retention Policy Applied:');
    console.log('─'.repeat(50));
    console.log(`Message: ${result.message}`);
    console.log(`Deleted: ${result.deleted} backup(s)`);
    console.log(`Remaining: ${result.remaining} backup(s)`);
    process.exit(0);
  }

  if (args.includes('--status')) {
    const status = backup.getStatus();
    console.log('');
    console.log('Backup System Status:');
    console.log('─'.repeat(50));
    console.log(`Backup Directory: ${status.backupDirectory}`);
    console.log(`Data Directory: ${status.dataDirectory}`);
    console.log(`Total Backups: ${status.totalBackups}`);
    console.log(`Retention Policy: Keep last ${status.retentionPolicy} backups`);
    console.log(`Disk Usage: ${backup.formatBytes(status.diskUsage)}`);
    console.log('');
    console.log('Latest Backup:');
    if (status.latestBackup) {
      console.log(`  Timestamp: ${status.latestBackup.timestamp}`);
      console.log(`  Date: ${new Date(status.latestBackup.date).toLocaleString()}`);
      console.log(`  Size: ${backup.formatBytes(status.latestBackup.size)}`);
    } else {
      console.log('  No backups found');
    }
    console.log('');
    console.log('Scheduled Backup:');
    console.log(`  Enabled: ${status.scheduledBackup.enabled ? 'Yes' : 'No'}`);
    console.log(`  Time: ${status.scheduledBackup.time}`);
    console.log(`  Last Run: ${status.scheduledBackup.lastRun || 'Never'}`);
    process.exit(0);
  }

  if (args.includes('--schedule')) {
    console.log('Starting backup scheduler...');
    console.log('Press Ctrl+C to stop.');
    backup.startScheduler();
    // Keep process running
    process.on('SIGINT', () => {
      backup.stopScheduler();
      process.exit(0);
    });
  } else {
    // Default: run backup now
    backup.run().catch(error => {
      console.error('❌ Backup failed:', error);
      backup.notify('backup_failed', { error: error.message });
      process.exit(1);
    });
  }
}

module.exports = BackupManager;
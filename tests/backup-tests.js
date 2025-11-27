#!/usr/bin/env node

/**
 * Backup & Restore Test Suite for High Wizardry
 * Tests backup creation, verification, retention policies, and restore functionality
 */

const fs = require('fs');
const path = require('path');
const BackupManager = require('../server/scripts/backup');
const RestoreManager = require('../server/scripts/restore');

console.log('💾 High Wizardry Backup & Restore Test Suite\n');

let passed = 0;
let failed = 0;

// Test directories
const testDataDir = path.join(__dirname, '..', 'test-data');
const testBackupDir = path.join(__dirname, '..', 'test-backups');

/**
 * Test helper
 */
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Setup test environment
 */
function setup() {
  // Create test directories
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  if (!fs.existsSync(testBackupDir)) {
    fs.mkdirSync(testBackupDir, { recursive: true });
  }
  
  // Create test data
  const testUsers = {
    testuser1: {
      id: 'test-uuid-1',
      username: 'TestUser1',
      passwordHash: '$2b$10$test...',
      email: 'test1@example.com',
      createdAt: Date.now()
    },
    testuser2: {
      id: 'test-uuid-2',
      username: 'TestUser2',
      passwordHash: '$2b$10$test...',
      email: 'test2@example.com',
      createdAt: Date.now()
    }
  };
  
  fs.writeFileSync(
    path.join(testDataDir, 'users.json'),
    JSON.stringify(testUsers, null, 2)
  );
  
  // Create players directory and test player files
  const playersDir = path.join(testDataDir, 'players');
  if (!fs.existsSync(playersDir)) {
    fs.mkdirSync(playersDir, { recursive: true });
  }
  
  const testPlayer1 = {
    id: 'test-uuid-1',
    username: 'TestUser1',
    level: 5,
    xp: 1500,
    shillings: 100,
    health: 85,
    location: 'town-square'
  };
  
  const testPlayer2 = {
    id: 'test-uuid-2',
    username: 'TestUser2',
    level: 3,
    xp: 800,
    shillings: 50,
    health: 100,
    location: 'enchanted-forest'
  };
  
  fs.writeFileSync(
    path.join(playersDir, 'test-uuid-1.json'),
    JSON.stringify(testPlayer1, null, 2)
  );
  
  fs.writeFileSync(
    path.join(playersDir, 'test-uuid-2.json'),
    JSON.stringify(testPlayer2, null, 2)
  );
}

/**
 * Cleanup test environment
 */
function cleanup() {
  // Remove test directories
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
  if (fs.existsSync(testBackupDir)) {
    fs.rmSync(testBackupDir, { recursive: true, force: true });
  }
}

// =============================================================================
// Run Tests
// =============================================================================

async function runTests() {
  console.log('📝 Setting up test environment...\n');
  cleanup(); // Clean any previous test artifacts
  setup();

  // =============================================================================
  // BackupManager Tests
  // =============================================================================
  
  console.log('📝 Testing BackupManager\n');
  
  let backupTimestamp = null;
  
  await asyncTest('BackupManager creates backup with checksums', async () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const result = await backup.run({ silent: true });
    
    assert(result.success, 'Backup should succeed');
    assert(result.timestamp, 'Backup should have timestamp');
    assert(result.files.length > 0, 'Backup should have files');
    assert(result.totalSize > 0, 'Backup should have size');
    
    backupTimestamp = result.timestamp;
    
    // Verify manifest has checksums
    const manifestFile = path.join(testBackupDir, `${result.timestamp}-manifest.json`);
    assert(fs.existsSync(manifestFile), 'Manifest file should exist');
    
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert(manifest.version === '2.0', 'Manifest should be version 2.0');
    assert(manifest.files.some(f => f.checksum), 'Files should have checksums');
  });
  
  test('BackupManager lists backups', () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const backups = backup.listBackups();
    
    assert(backups.length > 0, 'Should list at least one backup');
    assert(backups[0].timestamp, 'Backup should have timestamp');
    assert(backups[0].version, 'Backup should have version');
  });
  
  test('BackupManager verifies backup integrity', () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const result = backup.verifyBackup(backupTimestamp);
    
    assert(result.success, 'Verification should succeed');
    assert(result.verified > 0, 'Should have verified files');
    assert(result.failed === 0, 'Should have no failed files');
  });
  
  test('BackupManager detects corrupted backup', () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    // Corrupt a backup file
    const usersBackup = path.join(testBackupDir, `${backupTimestamp}-users.json`);
    const originalContent = fs.readFileSync(usersBackup, 'utf8');
    fs.writeFileSync(usersBackup, originalContent + 'CORRUPTED');
    
    const result = backup.verifyBackup(backupTimestamp);
    
    // Restore original for other tests
    fs.writeFileSync(usersBackup, originalContent);
    
    assert(!result.success, 'Verification should fail for corrupted backup');
    assert(result.failed > 0, 'Should have failed files');
  });
  
  test('BackupManager gets backup status', () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const status = backup.getStatus();
    
    assert(status.totalBackups > 0, 'Should have backups');
    assert(status.latestBackup, 'Should have latest backup');
    assert(status.retentionPolicy > 0, 'Should have retention policy');
  });
  
  await asyncTest('BackupManager applies retention policy', async () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    // Create multiple backups
    for (let i = 0; i < 3; i++) {
      await backup.run({ silent: true });
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    
    const backupsBefore = backup.listBackups();
    assert(backupsBefore.length >= 3, 'Should have at least 3 backups');
    
    // Apply retention to keep only 2
    const result = backup.applyRetentionPolicy(2);
    
    assert(result.success, 'Retention should succeed');
    assert(result.remaining === 2, 'Should have 2 backups remaining');
  });
  
  // =============================================================================
  // RestoreManager Tests
  // =============================================================================
  
  console.log('\n📝 Testing RestoreManager\n');
  
  // Create a fresh backup for restore tests
  let restoreBackupTimestamp = null;
  
  await asyncTest('Create backup for restore tests', async () => {
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const result = await backup.run({ silent: true });
    assert(result.success, 'Backup should succeed');
    restoreBackupTimestamp = result.timestamp;
  });
  
  test('RestoreManager lists available backups', () => {
    const restore = new RestoreManager('', {
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const backups = restore.listBackups();
    assert(backups.length > 0, 'Should list available backups');
  });
  
  test('RestoreManager gets latest backup timestamp', () => {
    const restore = new RestoreManager('', {
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const latest = restore.getLatestBackupTimestamp();
    assert(latest, 'Should return latest timestamp');
  });
  
  test('RestoreManager verifies backup integrity', () => {
    const restore = new RestoreManager(restoreBackupTimestamp, {
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const result = restore.verifyBackupIntegrity(restoreBackupTimestamp);
    
    assert(result.success, 'Verification should succeed');
    assert(result.verified > 0, 'Should have verified files');
  });
  
  test('RestoreManager performs test restore (dry run)', () => {
    const restore = new RestoreManager(restoreBackupTimestamp, {
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const result = restore.testRestore();
    
    assert(result.success, 'Test restore should succeed');
    assert(result.wouldRestore.length > 0, 'Should show what would be restored');
  });
  
  await asyncTest('RestoreManager restores data from backup', async () => {
    // First, modify the test data
    const usersFile = path.join(testDataDir, 'users.json');
    const originalData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    
    // Add a new user
    originalData.modifieduser = {
      id: 'modified-uuid',
      username: 'ModifiedUser',
      createdAt: Date.now()
    };
    fs.writeFileSync(usersFile, JSON.stringify(originalData, null, 2));
    
    // Verify modification
    const modifiedData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    assert(modifiedData.modifieduser, 'User should be modified');
    
    // Now restore
    const restore = new RestoreManager(restoreBackupTimestamp, {
      dataDir: testDataDir,
      backupDir: testBackupDir,
      force: true,
      preRestoreBackup: false
    });
    
    const result = await restore.run({ silent: true, returnResult: true });
    
    assert(result.success, 'Restore should succeed');
    
    // Verify data was restored
    const restoredData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    assert(!restoredData.modifieduser, 'Modified user should not exist after restore');
    assert(restoredData.testuser1, 'Original user should exist after restore');
  });
  
  // =============================================================================
  // Edge Case Tests
  // =============================================================================
  
  console.log('\n📝 Testing Edge Cases\n');
  
  test('BackupManager handles missing data directory gracefully', () => {
    const backup = new BackupManager({
      dataDir: '/nonexistent/path',
      backupDir: testBackupDir
    });
    
    // This should not throw, just return unsuccessful result
    const status = backup.getStatus();
    assert(status.dataDirectory === '/nonexistent/path', 'Should have correct data directory');
  });
  
  test('RestoreManager handles invalid timestamp', () => {
    const restore = new RestoreManager('invalid-timestamp', {
      dataDir: testDataDir,
      backupDir: testBackupDir
    });
    
    const result = restore.verifyBackupIntegrity('invalid-timestamp');
    assert(!result.success, 'Verification should fail for invalid timestamp');
  });
  
  test('BackupManager notification callback is called', async () => {
    let notificationReceived = false;
    
    const backup = new BackupManager({
      dataDir: testDataDir,
      backupDir: testBackupDir,
      notificationCallback: (notification) => {
        notificationReceived = true;
        assert(notification.event, 'Notification should have event');
        assert(notification.timestamp, 'Notification should have timestamp');
      }
    });
    
    await backup.run({ silent: true });
    
    assert(notificationReceived, 'Notification callback should be called');
  });
  
  // =============================================================================
  // Cleanup
  // =============================================================================
  
  console.log('\n📝 Cleaning up test environment...\n');
  cleanup();
  
  // =============================================================================
  // Summary
  // =============================================================================
  
  console.log('='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the failures above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All backup & restore tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  cleanup();
  process.exit(1);
});

#!/usr/bin/env node

/**
 * RestoreManager Timestamp Validation Tests
 * Tests for proper handling of valid and invalid backup timestamps
 */

const fs = require('fs');
const path = require('path');
const RestoreManager = require('../server/scripts/restore');
const { isValidBackupTimestamp, validateBackupTimestampOrThrow } = require('../server/scripts/restore');

console.log('🕐 RestoreManager Timestamp Validation Tests\n');

let passed = 0;
let failed = 0;

// Test directories
const testBackupDir = path.join(__dirname, '..', 'test-backup-timestamps');
const testDataDir = path.join(__dirname, '..', 'test-data-timestamps');

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
  if (!fs.existsSync(testBackupDir)) {
    fs.mkdirSync(testBackupDir, { recursive: true });
  }
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  // Create valid manifest files
  const validManifest1 = {
    timestamp: '20231118-143022',
    date: '2023-11-18T14:30:22.000Z',
    version: '2.0',
    totalSize: 1234,
    files: [{ name: '20231118-143022-users.json', size: 1234 }]
  };
  
  const validManifest2 = {
    timestamp: '20231119-100000',
    date: '2023-11-19T10:00:00.000Z',
    version: '2.0',
    totalSize: 2345,
    files: [{ name: '20231119-100000-users.json', size: 2345 }]
  };
  
  // Create manifest with empty timestamp
  const emptyTimestampManifest = {
    timestamp: '',
    date: '2023-11-17T12:00:00.000Z',
    version: '2.0',
    totalSize: 1000,
    files: [{ name: 'empty-timestamp-users.json', size: 1000 }]
  };
  
  // Create manifest with invalid timestamp
  const invalidTimestampManifest = {
    timestamp: 'not-a-timestamp',
    date: '2023-11-16T12:00:00.000Z',
    version: '2.0',
    totalSize: 1000,
    files: [{ name: 'invalid-timestamp-users.json', size: 1000 }]
  };
  
  // Create manifest with missing timestamp field
  const missingTimestampManifest = {
    date: '2023-11-15T12:00:00.000Z',
    version: '2.0',
    totalSize: 1000,
    files: [{ name: 'missing-timestamp-users.json', size: 1000 }]
  };
  
  // Write all manifest files
  fs.writeFileSync(
    path.join(testBackupDir, '20231118-143022-manifest.json'),
    JSON.stringify(validManifest1, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, '20231119-100000-manifest.json'),
    JSON.stringify(validManifest2, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, 'empty-timestamp-manifest.json'),
    JSON.stringify(emptyTimestampManifest, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, 'invalid-timestamp-manifest.json'),
    JSON.stringify(invalidTimestampManifest, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, 'missing-timestamp-manifest.json'),
    JSON.stringify(missingTimestampManifest, null, 2)
  );
  
  // Create associated backup files for valid manifests
  fs.writeFileSync(
    path.join(testBackupDir, '20231118-143022-users.json'),
    JSON.stringify({ user1: { name: 'User1' } }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, '20231119-100000-users.json'),
    JSON.stringify({ user2: { name: 'User2' } }, null, 2)
  );
}

/**
 * Cleanup test environment
 */
function cleanup() {
  if (fs.existsSync(testBackupDir)) {
    fs.rmSync(testBackupDir, { recursive: true, force: true });
  }
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
}

// =============================================================================
// Run Tests
// =============================================================================

console.log('📝 Setting up test environment...\n');
cleanup();
setup();

// =============================================================================
// isValidBackupTimestamp Tests
// =============================================================================

console.log('📝 Testing isValidBackupTimestamp utility\n');

test('isValidBackupTimestamp returns true for valid timestamp format', () => {
  assert(isValidBackupTimestamp('20231118-143022') === true, 'Should return true');
  assert(isValidBackupTimestamp('20251127-181614') === true, 'Should return true');
  assert(isValidBackupTimestamp('19990101-000000') === true, 'Should return true');
});

test('isValidBackupTimestamp returns false for empty string', () => {
  assert(isValidBackupTimestamp('') === false, 'Empty string should return false');
});

test('isValidBackupTimestamp returns false for invalid formats', () => {
  assert(isValidBackupTimestamp('invalid-timestamp') === false, 'Invalid format should return false');
  assert(isValidBackupTimestamp('2023-11-18') === false, 'Date only should return false');
  assert(isValidBackupTimestamp('20231118143022') === false, 'Missing hyphen should return false');
  assert(isValidBackupTimestamp('2023118-143022') === false, 'Wrong date format should return false');
  assert(isValidBackupTimestamp('20231118-14302') === false, 'Short time should return false');
});

test('isValidBackupTimestamp returns false for non-string types', () => {
  assert(isValidBackupTimestamp(null) === false, 'null should return false');
  assert(isValidBackupTimestamp(undefined) === false, 'undefined should return false');
  assert(isValidBackupTimestamp(12345678) === false, 'number should return false');
  assert(isValidBackupTimestamp({}) === false, 'object should return false');
});

// =============================================================================
// validateBackupTimestampOrThrow Tests
// =============================================================================

console.log('\n📝 Testing validateBackupTimestampOrThrow utility\n');

test('validateBackupTimestampOrThrow returns valid timestamp', () => {
  const result = validateBackupTimestampOrThrow('20231118-143022');
  assert(result === '20231118-143022', 'Should return the valid timestamp');
});

test('validateBackupTimestampOrThrow throws for invalid-timestamp with value in message', () => {
  let threw = false;
  let errorMessage = '';
  try {
    validateBackupTimestampOrThrow('invalid-timestamp');
  } catch (error) {
    threw = true;
    errorMessage = error.message;
  }
  assert(threw, 'Should throw an error');
  assert(errorMessage === 'Invalid backup timestamp: invalid-timestamp', `Should include invalid value in message, got: ${errorMessage}`);
});

test('validateBackupTimestampOrThrow throws for empty string with empty trailing text', () => {
  let threw = false;
  let errorMessage = '';
  try {
    validateBackupTimestampOrThrow('');
  } catch (error) {
    threw = true;
    errorMessage = error.message;
  }
  assert(threw, 'Should throw an error');
  assert(errorMessage === 'Invalid backup timestamp: ', `Should have empty trailing text, got: ${errorMessage}`);
});

// =============================================================================
// RestoreManager.listBackups Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager.listBackups\n');

test('RestoreManager lists available backups (skips malformed timestamps)', () => {
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  const backups = restore.listBackups();
  
  // Should only include the 2 valid backups
  assert(backups.length === 2, `Should have 2 valid backups, got ${backups.length}`);
  
  // All returned backups should have valid timestamps
  for (const backup of backups) {
    assert(isValidBackupTimestamp(backup.timestamp), `Timestamp ${backup.timestamp} should be valid`);
  }
  
  // Should be sorted newest first
  assert(backups[0].timestamp === '20231119-100000', 'First backup should be newest');
  assert(backups[1].timestamp === '20231118-143022', 'Second backup should be older');
});

test('RestoreManager listBackups skips manifests with empty timestamp', () => {
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  const backups = restore.listBackups();
  const timestamps = backups.map(b => b.timestamp);
  
  assert(!timestamps.includes(''), 'Should not include empty timestamp');
});

test('RestoreManager listBackups skips manifests with invalid timestamp', () => {
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  const backups = restore.listBackups();
  const timestamps = backups.map(b => b.timestamp);
  
  assert(!timestamps.includes('not-a-timestamp'), 'Should not include invalid timestamp');
});

// =============================================================================
// RestoreManager.getLatestBackupTimestamp Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager.getLatestBackupTimestamp\n');

test('RestoreManager gets latest backup timestamp', () => {
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  const latest = restore.getLatestBackupTimestamp();
  
  assert(latest === '20231119-100000', `Should return latest timestamp, got ${latest}`);
});

test('RestoreManager getLatestBackupTimestamp throws when no valid timestamps', () => {
  // Create a test directory with only invalid backups
  const onlyInvalidDir = path.join(__dirname, '..', 'test-only-invalid');
  fs.mkdirSync(onlyInvalidDir, { recursive: true });
  
  // Create only invalid manifests
  fs.writeFileSync(
    path.join(onlyInvalidDir, 'bad-manifest.json'),
    JSON.stringify({ timestamp: 'bad', date: '2023-11-18T00:00:00Z', files: [] }, null, 2)
  );
  
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: onlyInvalidDir
  });
  
  let threw = false;
  let errorMessage = '';
  try {
    restore.getLatestBackupTimestamp();
  } catch (error) {
    threw = true;
    errorMessage = error.message;
  }
  
  // Cleanup
  fs.rmSync(onlyInvalidDir, { recursive: true, force: true });
  
  assert(threw, 'Should throw an error');
  assert(errorMessage === 'Invalid backup timestamp:', `Should throw with empty trailing text, got: ${errorMessage}`);
});

// =============================================================================
// RestoreManager.validateTimestampInputOrThrow Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager.validateTimestampInputOrThrow\n');

test('RestoreManager handles invalid timestamp input explicitly', () => {
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  let threw = false;
  let errorMessage = '';
  try {
    restore.validateTimestampInputOrThrow('invalid-timestamp');
  } catch (error) {
    threw = true;
    errorMessage = error.message;
  }
  
  assert(threw, 'Should throw an error');
  assert(errorMessage === 'Invalid backup timestamp: invalid-timestamp', `Should include invalid value, got: ${errorMessage}`);
});

// =============================================================================
// RestoreManager.verifyBackupIntegrity Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager.verifyBackupIntegrity\n');

test('RestoreManager verifies backup integrity for valid timestamp', () => {
  const restore = new RestoreManager('20231118-143022', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  const result = restore.verifyBackupIntegrity('20231118-143022');
  
  assert(result.success, 'Verification should succeed');
  assert(result.verified > 0, 'Should have verified files');
});

test('RestoreManager verifyBackupIntegrity returns failure for invalid timestamp format', () => {
  const restore = new RestoreManager('', {
    dataDir: testDataDir,
    backupDir: testBackupDir
  });
  
  const result = restore.verifyBackupIntegrity('invalid-timestamp');
  
  assert(!result.success, 'Verification should fail');
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
  console.log('\n🎉 All RestoreManager timestamp tests passed!');
  process.exit(0);
}

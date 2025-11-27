/**
 * RestoreManager Test Suite
 * Tests backup timestamp validation, listing, and retrieval
 */

const fs = require('fs');
const path = require('path');
const RestoreManager = require('../server/scripts/restore');
const { isValidBackupTimestamp, validateBackupTimestampOrThrow } = require('../server/utils/backupTimestamp');

console.log('🔄 RestoreManager Test Suite\n');

let passed = 0;
let failed = 0;

// Store original backupDir for cleanup
const testBackupDir = path.join(__dirname, '..', 'test-backups-temp');

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
function setupTestBackups() {
  // Create test backup directory
  if (!fs.existsSync(testBackupDir)) {
    fs.mkdirSync(testBackupDir, { recursive: true });
  }
  
  // Create valid manifest files
  const validManifest1 = {
    timestamp: '20231118-143022',
    date: '2023-11-18T14:30:22.000Z',
    totalSize: 1024,
    files: [{ name: 'test.json', size: 1024 }]
  };
  
  const validManifest2 = {
    timestamp: '20231119-100000',
    date: '2023-11-19T10:00:00.000Z',
    totalSize: 2048,
    files: [{ name: 'test2.json', size: 2048 }]
  };
  
  // Create manifest with invalid timestamp
  const invalidManifest = {
    timestamp: 'invalid-timestamp',
    date: '2023-11-20T10:00:00.000Z',
    totalSize: 512,
    files: []
  };
  
  // Create manifest with missing timestamp
  const missingTimestampManifest = {
    date: '2023-11-21T10:00:00.000Z',
    totalSize: 256,
    files: []
  };
  
  // Write manifests
  fs.writeFileSync(
    path.join(testBackupDir, '20231118-143022-manifest.json'),
    JSON.stringify(validManifest1, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, '20231119-100000-manifest.json'),
    JSON.stringify(validManifest2, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, 'invalid-timestamp-manifest.json'),
    JSON.stringify(invalidManifest, null, 2)
  );
  
  fs.writeFileSync(
    path.join(testBackupDir, 'no-timestamp-manifest.json'),
    JSON.stringify(missingTimestampManifest, null, 2)
  );
}

/**
 * Cleanup test environment
 */
function cleanupTestBackups() {
  if (fs.existsSync(testBackupDir)) {
    const files = fs.readdirSync(testBackupDir);
    for (const file of files) {
      fs.unlinkSync(path.join(testBackupDir, file));
    }
    fs.rmdirSync(testBackupDir);
  }
}

// =============================================================================
// Backup Timestamp Utility Tests
// =============================================================================

console.log('📝 Testing Backup Timestamp Validation\n');

test('Valid timestamp format YYYYMMDD-HHmmss is accepted', () => {
  assert(isValidBackupTimestamp('20231118-143022'), 'Should accept valid format');
  assert(isValidBackupTimestamp('20240101-000000'), 'Should accept midnight timestamp');
  assert(isValidBackupTimestamp('99991231-235959'), 'Should accept max date values');
});

test('Invalid timestamp formats are rejected', () => {
  assert(!isValidBackupTimestamp('invalid-timestamp'), 'Should reject invalid text');
  assert(!isValidBackupTimestamp('2023-11-18-143022'), 'Should reject dashes in date part');
  assert(!isValidBackupTimestamp('20231118143022'), 'Should reject missing separator');
  assert(!isValidBackupTimestamp('2023118-143022'), 'Should reject short date');
  assert(!isValidBackupTimestamp('20231118-14302'), 'Should reject short time');
  assert(!isValidBackupTimestamp(''), 'Should reject empty string');
  assert(!isValidBackupTimestamp(null), 'Should reject null');
  assert(!isValidBackupTimestamp(undefined), 'Should reject undefined');
  assert(!isValidBackupTimestamp(12345678), 'Should reject number');
});

test('validateBackupTimestampOrThrow throws for invalid timestamp', () => {
  let threw = false;
  let errorMessage = '';
  
  try {
    validateBackupTimestampOrThrow('invalid-timestamp');
  } catch (error) {
    threw = true;
    errorMessage = error.message;
  }
  
  assert(threw, 'Should throw an error');
  assert(
    errorMessage === 'Invalid backup timestamp: invalid-timestamp',
    `Error message should include the invalid value, got: ${errorMessage}`
  );
});

test('validateBackupTimestampOrThrow does not throw for valid timestamp', () => {
  let threw = false;
  
  try {
    validateBackupTimestampOrThrow('20231118-143022');
  } catch (error) {
    threw = true;
  }
  
  assert(!threw, 'Should not throw for valid timestamp');
});

// =============================================================================
// RestoreManager Method Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager Methods\n');

test('extractTimestampFromEntry extracts valid timestamp from manifest object', () => {
  const manager = new RestoreManager('');
  const manifest = { timestamp: '20231118-143022' };
  
  const result = manager.extractTimestampFromEntry(manifest);
  assert(result === '20231118-143022', 'Should extract timestamp from object');
});

test('extractTimestampFromEntry returns undefined for invalid timestamp in object', () => {
  const manager = new RestoreManager('');
  const manifest = { timestamp: 'invalid-timestamp' };
  
  const result = manager.extractTimestampFromEntry(manifest);
  assert(result === undefined, 'Should return undefined for invalid timestamp');
});

test('extractTimestampFromEntry returns undefined for missing timestamp', () => {
  const manager = new RestoreManager('');
  const manifest = { date: '2023-11-18' };
  
  const result = manager.extractTimestampFromEntry(manifest);
  assert(result === undefined, 'Should return undefined for missing timestamp');
});

test('extractTimestampFromEntry extracts timestamp from filename string', () => {
  const manager = new RestoreManager('');
  
  const result = manager.extractTimestampFromEntry('20231118-143022-manifest.json');
  assert(result === '20231118-143022', 'Should extract timestamp from filename');
});

test('extractTimestampFromEntry returns undefined for invalid filename', () => {
  const manager = new RestoreManager('');
  
  const result = manager.extractTimestampFromEntry('invalid-manifest.json');
  assert(result === undefined, 'Should return undefined for invalid filename');
});

test('validateTimestampInputOrThrow throws for invalid timestamp', () => {
  const manager = new RestoreManager('');
  let threw = false;
  let errorMessage = '';
  
  try {
    manager.validateTimestampInputOrThrow('invalid-timestamp');
  } catch (error) {
    threw = true;
    errorMessage = error.message;
  }
  
  assert(threw, 'Should throw an error');
  assert(
    errorMessage === 'Invalid backup timestamp: invalid-timestamp',
    `Error message should include the invalid value, got: ${errorMessage}`
  );
});

// =============================================================================
// RestoreManager Integration Tests (with test backup files)
// =============================================================================

console.log('\n📝 Testing RestoreManager Integration\n');

// Setup test environment
setupTestBackups();

test('listBackups returns only entries with valid timestamps', () => {
  const manager = new RestoreManager('');
  // Override backupDir for testing
  manager.backupDir = testBackupDir;
  
  const backups = manager.listBackups();
  
  // Should only have 2 valid backups (skipping invalid and missing timestamp ones)
  assert(backups.length === 2, `Expected 2 valid backups, got ${backups.length}`);
  
  // Verify all returned backups have valid timestamps
  for (const backup of backups) {
    assert(isValidBackupTimestamp(backup.timestamp), `Backup timestamp ${backup.timestamp} should be valid`);
  }
});

test('listBackups sorts backups by timestamp descending (newest first)', () => {
  const manager = new RestoreManager('');
  manager.backupDir = testBackupDir;
  
  const backups = manager.listBackups();
  
  assert(backups.length >= 2, 'Should have at least 2 backups');
  assert(
    backups[0].timestamp > backups[1].timestamp,
    'First backup should have newer timestamp than second'
  );
  assert(
    backups[0].timestamp === '20231119-100000',
    `First backup should be newest, got ${backups[0].timestamp}`
  );
});

test('getLatestBackupTimestamp returns the latest valid timestamp', () => {
  const manager = new RestoreManager('');
  manager.backupDir = testBackupDir;
  
  const latest = manager.getLatestBackupTimestamp();
  
  assert(latest === '20231119-100000', `Expected 20231119-100000, got ${latest}`);
});

test('getLatestBackupTimestamp throws when no valid backups exist', () => {
  const manager = new RestoreManager('');
  // Create empty temp directory
  const emptyBackupDir = path.join(__dirname, '..', 'empty-backups-temp');
  
  try {
    if (!fs.existsSync(emptyBackupDir)) {
      fs.mkdirSync(emptyBackupDir, { recursive: true });
    }
    manager.backupDir = emptyBackupDir;
    
    let threw = false;
    let errorMessage = '';
    
    try {
      manager.getLatestBackupTimestamp();
    } catch (error) {
      threw = true;
      errorMessage = error.message;
    }
    
    assert(threw, 'Should throw when no valid backups exist');
    assert(
      errorMessage === 'Invalid backup timestamp:',
      `Error message should be 'Invalid backup timestamp:', got: ${errorMessage}`
    );
  } finally {
    // Cleanup - always runs even if test fails
    if (fs.existsSync(emptyBackupDir)) {
      fs.rmdirSync(emptyBackupDir);
    }
  }
});

test('getLatestBackupTimestamp throws when only invalid timestamps exist', () => {
  const manager = new RestoreManager('');
  
  // Create temp directory with only invalid timestamps
  const invalidBackupDir = path.join(__dirname, '..', 'invalid-backups-temp');
  
  try {
    if (!fs.existsSync(invalidBackupDir)) {
      fs.mkdirSync(invalidBackupDir, { recursive: true });
    }
    
    // Write manifest with invalid timestamp
    fs.writeFileSync(
      path.join(invalidBackupDir, 'bad-manifest.json'),
      JSON.stringify({ timestamp: 'invalid', date: '2023-01-01', totalSize: 0, files: [] })
    );
    
    manager.backupDir = invalidBackupDir;
    
    let threw = false;
    let errorMessage = '';
    
    try {
      manager.getLatestBackupTimestamp();
    } catch (error) {
      threw = true;
      errorMessage = error.message;
    }
    
    assert(threw, 'Should throw when only invalid timestamps exist');
    assert(
      errorMessage === 'Invalid backup timestamp:',
      `Error message should be 'Invalid backup timestamp:', got: ${errorMessage}`
    );
  } finally {
    // Cleanup - always runs even if test fails
    if (fs.existsSync(invalidBackupDir)) {
      const files = fs.readdirSync(invalidBackupDir);
      for (const file of files) {
        fs.unlinkSync(path.join(invalidBackupDir, file));
      }
      fs.rmdirSync(invalidBackupDir);
    }
  }
});

// Cleanup test environment
cleanupTestBackups();

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(50));
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
  console.log('\n🎉 All RestoreManager tests passed!');
  process.exit(0);
}

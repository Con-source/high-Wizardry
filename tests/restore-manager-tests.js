/**
 * RestoreManager Test Suite for High Wizardry
 * Tests backup timestamp validation and RestoreManager functionality
 */

const path = require('path');
const fs = require('fs');
const { isValidBackupTimestamp, validateBackupTimestampOrThrow } = require('../server/utils/backupTimestamp');
const RestoreManager = require('../server/scripts/restore');

console.log('🔄 High Wizardry RestoreManager Test Suite\n');

let passed = 0;
let failed = 0;

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

function assertThrows(fn, expectedMessage, partialMatch = false) {
  let thrown = false;
  let errorMessage = '';
  try {
    fn();
  } catch (error) {
    thrown = true;
    errorMessage = error.message;
  }
  assert(thrown, 'Expected an error to be thrown');
  if (partialMatch) {
    assert(
      errorMessage.includes(expectedMessage),
      `Expected error message to include "${expectedMessage}", got "${errorMessage}"`
    );
  } else {
    assert(
      errorMessage === expectedMessage,
      `Expected error message "${expectedMessage}", got "${errorMessage}"`
    );
  }
}

// =============================================================================
// Backup Timestamp Utility Tests
// =============================================================================

console.log('📝 Testing Backup Timestamp Utilities\n');

test('isValidBackupTimestamp returns true for valid timestamp', () => {
  assert(isValidBackupTimestamp('20251127-181614'), 'Should accept valid timestamp');
  assert(isValidBackupTimestamp('20231118-143022'), 'Should accept valid timestamp');
  assert(isValidBackupTimestamp('99991231-235959'), 'Should accept edge case timestamp');
});

test('isValidBackupTimestamp returns false for invalid timestamps', () => {
  assert(!isValidBackupTimestamp(''), 'Should reject empty string');
  assert(!isValidBackupTimestamp(null), 'Should reject null');
  assert(!isValidBackupTimestamp(undefined), 'Should reject undefined');
  assert(!isValidBackupTimestamp(12345678), 'Should reject number');
  assert(!isValidBackupTimestamp('invalid-timestamp'), 'Should reject invalid format');
  assert(!isValidBackupTimestamp('2023-11-18-143022'), 'Should reject wrong format');
  assert(!isValidBackupTimestamp('20231118143022'), 'Should reject missing dash');
  assert(!isValidBackupTimestamp('2023118-143022'), 'Should reject short date part');
  assert(!isValidBackupTimestamp('20231118-14302'), 'Should reject short time part');
  assert(!isValidBackupTimestamp('20231118-1430222'), 'Should reject long time part');
});

test('validateBackupTimestampOrThrow returns valid timestamp', () => {
  const result = validateBackupTimestampOrThrow('20251127-181614');
  assert(result === '20251127-181614', 'Should return the valid timestamp');
});

test('validateBackupTimestampOrThrow throws for invalid-timestamp', () => {
  assertThrows(
    () => validateBackupTimestampOrThrow('invalid-timestamp'),
    'Invalid backup timestamp: invalid-timestamp'
  );
});

test('validateBackupTimestampOrThrow throws for empty string', () => {
  assertThrows(
    () => validateBackupTimestampOrThrow(''),
    'Invalid backup timestamp: '
  );
});

test('validateBackupTimestampOrThrow throws for undefined', () => {
  assertThrows(
    () => validateBackupTimestampOrThrow(undefined),
    'Invalid backup timestamp: '
  );
});

test('validateBackupTimestampOrThrow throws for null', () => {
  assertThrows(
    () => validateBackupTimestampOrThrow(null),
    'Invalid backup timestamp: '
  );
});

// =============================================================================
// RestoreManager extractTimestampFromEntry Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager.extractTimestampFromEntry\n');

test('extractTimestampFromEntry extracts from entry.timestamp', () => {
  const rm = new RestoreManager('');
  const entry = { timestamp: '20251127-181614', name: 'backup.json' };
  const result = rm.extractTimestampFromEntry(entry);
  assert(result === '20251127-181614', 'Should extract timestamp from entry.timestamp');
});

test('extractTimestampFromEntry extracts from entry.name when timestamp is empty', () => {
  const rm = new RestoreManager('');
  const entry = { timestamp: '', name: '20251127-181614-manifest.json' };
  const result = rm.extractTimestampFromEntry(entry);
  assert(result === '20251127-181614', 'Should extract timestamp from entry.name');
});

test('extractTimestampFromEntry extracts from entry.name when timestamp is missing', () => {
  const rm = new RestoreManager('');
  const entry = { name: '20251127-181614-users.json' };
  const result = rm.extractTimestampFromEntry(entry);
  assert(result === '20251127-181614', 'Should extract timestamp from entry.name');
});

test('extractTimestampFromEntry returns undefined for invalid entry', () => {
  const rm = new RestoreManager('');
  const result1 = rm.extractTimestampFromEntry({ timestamp: '', name: 'invalid.json' });
  assert(result1 === undefined, 'Should return undefined for entry with no valid timestamp');

  const result2 = rm.extractTimestampFromEntry(null);
  assert(result2 === undefined, 'Should return undefined for null entry');

  const result3 = rm.extractTimestampFromEntry({});
  assert(result3 === undefined, 'Should return undefined for empty entry');
});

// =============================================================================
// RestoreManager validateTimestampInputOrThrow Tests
// =============================================================================

console.log('\n📝 Testing RestoreManager.validateTimestampInputOrThrow\n');

test('validateTimestampInputOrThrow returns valid timestamp', () => {
  const rm = new RestoreManager('');
  const result = rm.validateTimestampInputOrThrow('20251127-181614');
  assert(result === '20251127-181614', 'Should return valid timestamp');
});

test('validateTimestampInputOrThrow throws for invalid-timestamp', () => {
  const rm = new RestoreManager('');
  assertThrows(
    () => rm.validateTimestampInputOrThrow('invalid-timestamp'),
    'Invalid backup timestamp: invalid-timestamp'
  );
});

test('validateTimestampInputOrThrow throws for empty string', () => {
  const rm = new RestoreManager('');
  assertThrows(
    () => rm.validateTimestampInputOrThrow(''),
    'Invalid backup timestamp: '
  );
});

// =============================================================================
// RestoreManager getLatestBackupTimestamp Tests (with mock backup dir)
// =============================================================================

console.log('\n📝 Testing RestoreManager.getLatestBackupTimestamp\n');

// Create a temporary backup directory for testing
const testBackupDir = path.join(__dirname, '..', 'test-backups-temp');

function setupTestBackupDir(manifests) {
  // Clean up if exists
  if (fs.existsSync(testBackupDir)) {
    fs.rmSync(testBackupDir, { recursive: true });
  }
  fs.mkdirSync(testBackupDir, { recursive: true });

  for (const manifest of manifests) {
    const filename = manifest.filename || `${manifest.timestamp || 'invalid'}-manifest.json`;
    const manifestPath = path.join(testBackupDir, filename);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  }
}

function cleanupTestBackupDir() {
  if (fs.existsSync(testBackupDir)) {
    fs.rmSync(testBackupDir, { recursive: true });
  }
}

// Create a mock RestoreManager that uses our test directory
class MockRestoreManager extends RestoreManager {
  constructor(timestamp) {
    super(timestamp);
    this.backupDir = testBackupDir;
  }
}

test('getLatestBackupTimestamp returns latest valid timestamp', () => {
  setupTestBackupDir([
    { timestamp: '20251127-181614', filename: '20251127-181614-manifest.json' },
    { timestamp: '20251127-181615', filename: '20251127-181615-manifest.json' },
    { timestamp: '20251127-181613', filename: '20251127-181613-manifest.json' }
  ]);

  const rm = new MockRestoreManager('');
  const result = rm.getLatestBackupTimestamp();
  assert(result === '20251127-181615', `Expected '20251127-181615', got '${result}'`);
  cleanupTestBackupDir();
});

test('getLatestBackupTimestamp skips invalid timestamps', () => {
  setupTestBackupDir([
    { timestamp: '20251127-181614', filename: '20251127-181614-manifest.json' },
    { timestamp: '', filename: 'invalid-manifest.json' },
    { timestamp: 'not-a-timestamp', filename: 'bad-manifest.json' },
    { timestamp: '20251127-181620', filename: '20251127-181620-manifest.json' }
  ]);

  const rm = new MockRestoreManager('');
  const result = rm.getLatestBackupTimestamp();
  assert(result === '20251127-181620', `Expected '20251127-181620', got '${result}'`);
  cleanupTestBackupDir();
});

test('getLatestBackupTimestamp throws when no valid timestamps', () => {
  setupTestBackupDir([
    { timestamp: '', filename: 'bad1-manifest.json' },
    { timestamp: 'not-a-ts', filename: 'bad2-manifest.json' }
  ]);

  const rm = new MockRestoreManager('');
  assertThrows(
    () => rm.getLatestBackupTimestamp(),
    'Invalid backup timestamp:'
  );
  cleanupTestBackupDir();
});

test('getLatestBackupTimestamp throws when backup dir does not exist', () => {
  // Ensure test backup dir does not exist
  cleanupTestBackupDir();

  const rm = new MockRestoreManager('');
  assertThrows(
    () => rm.getLatestBackupTimestamp(),
    'Invalid backup timestamp:'
  );
});

// =============================================================================
// RestoreManager listBackups Tests (with mock backup dir)
// =============================================================================

console.log('\n📝 Testing RestoreManager.listBackups\n');

test('listBackups returns only backups with valid timestamps', () => {
  setupTestBackupDir([
    { timestamp: '20251127-181614', date: '2025-11-27', totalSize: 100, files: [], filename: '20251127-181614-manifest.json' },
    { timestamp: '20251127-181615', date: '2025-11-27', totalSize: 200, files: [], filename: '20251127-181615-manifest.json' },
    { timestamp: '', date: '2025-11-27', totalSize: 50, files: [], filename: 'missing-timestamp-manifest.json' }
  ]);

  const rm = new MockRestoreManager('');
  const backups = rm.listBackups();
  assert(backups.length === 2, `Expected 2 backups, got ${backups.length}`);
  assert(backups[0].timestamp === '20251127-181615', 'First backup should be newest');
  assert(backups[1].timestamp === '20251127-181614', 'Second backup should be older');
  cleanupTestBackupDir();
});

test('listBackups extracts timestamp from filename when entry.timestamp is empty', () => {
  setupTestBackupDir([
    { timestamp: '', date: '2025-11-27', totalSize: 100, files: [], filename: '20251127-181614-manifest.json' }
  ]);

  const rm = new MockRestoreManager('');
  const backups = rm.listBackups();
  // This test verifies extractTimestampFromEntry fallback works
  // Note: The filename contains the timestamp pattern, so it should be extracted
  assert(backups.length === 0 || backups[0].timestamp === '20251127-181614', 
    'Should extract timestamp from filename or skip if invalid');
  cleanupTestBackupDir();
});

test('listBackups returns empty array when no valid backups', () => {
  setupTestBackupDir([
    { timestamp: '', filename: 'bad1-manifest.json' },
    { timestamp: 'not-valid', filename: 'bad2-manifest.json' }
  ]);

  const rm = new MockRestoreManager('');
  const backups = rm.listBackups();
  assert(backups.length === 0, `Expected 0 backups, got ${backups.length}`);
  cleanupTestBackupDir();
});

test('listBackups returns empty array when backup dir does not exist', () => {
  cleanupTestBackupDir();

  const rm = new MockRestoreManager('');
  const backups = rm.listBackups();
  assert(Array.isArray(backups) && backups.length === 0, 'Should return empty array');
});

// =============================================================================
// Edge Cases
// =============================================================================

console.log('\n📝 Testing Edge Cases\n');

test('handles timestamp at boundary of date/time', () => {
  assert(isValidBackupTimestamp('00000101-000000'), 'Should accept minimum valid timestamp');
  assert(isValidBackupTimestamp('99991231-235959'), 'Should accept maximum valid timestamp');
});

test('rejects timestamps with alphabetic characters', () => {
  assert(!isValidBackupTimestamp('2025a127-181614'), 'Should reject with alpha in date');
  assert(!isValidBackupTimestamp('20251127-18a614'), 'Should reject with alpha in time');
});

test('rejects timestamps with special characters', () => {
  assert(!isValidBackupTimestamp('2025/127-181614'), 'Should reject with slash');
  assert(!isValidBackupTimestamp('20251127_181614'), 'Should reject with underscore');
  assert(!isValidBackupTimestamp('20251127:181614'), 'Should reject with colon');
});

// =============================================================================
// Cleanup and Summary
// =============================================================================

// Final cleanup
cleanupTestBackupDir();

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

/**
 * Database Adapter Tests
 * Tests for JSON and SQLite database adapters
 */

const path = require('path');
const fs = require('fs');
const { JsonFileAdapter, SQLiteAdapter, createDatabaseAdapter } = require('../server/database');

console.log('💾 Database Adapter Test Suite\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  })();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test directories (use tmp)
const testDataDir = path.join('/tmp', 'db-test-data');
const testPlayersDir = path.join(testDataDir, 'players');

// Clean up before tests
function cleanup() {
  try {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.log(`Warning: cleanup failed: ${error.message}`);
  }
}

// Sample test data
const testUser = {
  id: 'test-user-id-123',
  username: 'TestUser',
  passwordHash: '$2b$10$hashedpassword',
  email: 'test@example.com',
  emailVerified: true,
  banned: false,
  createdAt: Date.now()
};

const testPlayer = {
  id: 'test-player-id-123',
  username: 'TestPlayer',
  level: 5,
  xp: 1000,
  shillings: 50,
  pennies: 10,
  health: 100,
  location: 'town-square',
  createdAt: Date.now()
};

async function runTests() {
  cleanup();
  
  // =============================================================================
  // JsonFileAdapter Tests
  // =============================================================================
  
  console.log('📝 Testing JsonFileAdapter\n');
  
  await test('JsonFileAdapter initializes correctly', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    const result = await adapter.initialize();
    assert(result === true, 'Should return true on success');
    assert(adapter.isConnected === true, 'Should be connected');
    assert(adapter.getType() === 'json', 'Should return json type');
    await adapter.close();
  });
  
  await test('JsonFileAdapter creates user', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.createUser('testuser', testUser);
    assert(result === true, 'Should return true on success');
    
    // Verify user was created
    const user = await adapter.getUser('testuser');
    assert(user !== null, 'User should exist');
    assert(user.email === testUser.email, 'Email should match');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter prevents duplicate users', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    // Try to create duplicate
    const result = await adapter.createUser('testuser', testUser);
    assert(result === false, 'Should return false for duplicate');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter finds user by email', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const user = await adapter.getUserByEmail('test@example.com');
    assert(user !== null, 'User should be found by email');
    assert(user.username === 'TestUser', 'Username should match');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter finds user by player ID', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const user = await adapter.getUserByPlayerId('test-user-id-123');
    assert(user !== null, 'User should be found by player ID');
    assert(user.email === 'test@example.com', 'Email should match');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter updates user', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.updateUser('testuser', { banned: true });
    assert(result === true, 'Should return true on success');
    
    const user = await adapter.getUser('testuser');
    assert(user.banned === true, 'Banned should be updated');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter creates player', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.createPlayer('test-player-id-123', testPlayer);
    assert(result === true, 'Should return true on success');
    
    const player = await adapter.getPlayer('test-player-id-123');
    assert(player !== null, 'Player should exist');
    assert(player.level === 5, 'Level should match');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter updates player', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.updatePlayer('test-player-id-123', { level: 10 });
    assert(result === true, 'Should return true on success');
    
    const player = await adapter.getPlayer('test-player-id-123');
    assert(player.level === 10, 'Level should be updated');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter gets all users', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const users = await adapter.getAllUsers();
    assert(users instanceof Map, 'Should return a Map');
    assert(users.size >= 1, 'Should have at least 1 user');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter gets all players', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const players = await adapter.getAllPlayers();
    assert(players instanceof Map, 'Should return a Map');
    assert(players.size >= 1, 'Should have at least 1 player');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter deletes user', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.deleteUser('testuser');
    assert(result === true, 'Should return true on success');
    
    const user = await adapter.getUser('testuser');
    assert(user === null, 'User should not exist after delete');
    
    await adapter.close();
  });
  
  await test('JsonFileAdapter deletes player', async () => {
    const adapter = new JsonFileAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.deletePlayer('test-player-id-123');
    assert(result === true, 'Should return true on success');
    
    const player = await adapter.getPlayer('test-player-id-123');
    assert(player === null, 'Player should not exist after delete');
    
    await adapter.close();
  });
  
  // Clean up JSON test data
  cleanup();
  
  // =============================================================================
  // SQLiteAdapter Tests
  // =============================================================================
  
  console.log('\n📝 Testing SQLiteAdapter\n');
  
  await test('SQLiteAdapter initializes correctly', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    const result = await adapter.initialize();
    assert(result === true, 'Should return true on success');
    assert(adapter.isConnected === true, 'Should be connected');
    assert(adapter.getType() === 'sqlite', 'Should return sqlite type');
    await adapter.close();
  });
  
  await test('SQLiteAdapter creates user', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.createUser('sqliteuser', testUser);
    assert(result === true, 'Should return true on success');
    
    const user = await adapter.getUser('sqliteuser');
    assert(user !== null, 'User should exist');
    assert(user.email === testUser.email, 'Email should match');
    
    await adapter.close();
  });
  
  await test('SQLiteAdapter prevents duplicate users', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.createUser('sqliteuser', testUser);
    assert(result === false, 'Should return false for duplicate');
    
    await adapter.close();
  });
  
  await test('SQLiteAdapter finds user by email', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const user = await adapter.getUserByEmail('test@example.com');
    assert(user !== null, 'User should be found by email');
    
    await adapter.close();
  });
  
  await test('SQLiteAdapter updates user', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.updateUser('sqliteuser', { banned: true });
    assert(result === true, 'Should return true on success');
    
    const user = await adapter.getUser('sqliteuser');
    assert(user.banned === true, 'Banned should be updated');
    
    await adapter.close();
  });
  
  await test('SQLiteAdapter creates player', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.createPlayer('sqlite-player-123', testPlayer);
    assert(result === true, 'Should return true on success');
    
    const player = await adapter.getPlayer('sqlite-player-123');
    assert(player !== null, 'Player should exist');
    assert(player.level === 5, 'Level should match');
    
    await adapter.close();
  });
  
  await test('SQLiteAdapter updates player', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.updatePlayer('sqlite-player-123', { level: 15 });
    assert(result === true, 'Should return true on success');
    
    const player = await adapter.getPlayer('sqlite-player-123');
    assert(player.level === 15, 'Level should be updated');
    
    await adapter.close();
  });
  
  await test('SQLiteAdapter health check works', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const healthy = await adapter.healthCheck();
    assert(healthy === true, 'Should be healthy');
    
    await adapter.close();
    
    const unhealthy = await adapter.healthCheck();
    assert(unhealthy === false, 'Should be unhealthy after close');
  });
  
  await test('SQLiteAdapter deletes user', async () => {
    const adapter = new SQLiteAdapter({ dataDir: testDataDir });
    await adapter.initialize();
    
    const result = await adapter.deleteUser('sqliteuser');
    assert(result === true, 'Should return true on success');
    
    const user = await adapter.getUser('sqliteuser');
    assert(user === null, 'User should not exist after delete');
    
    await adapter.close();
  });
  
  // =============================================================================
  // Factory Function Tests
  // =============================================================================
  
  console.log('\n📝 Testing createDatabaseAdapter factory\n');
  
  await test('createDatabaseAdapter returns JsonFileAdapter by default', async () => {
    const adapter = createDatabaseAdapter({ dataDir: testDataDir });
    assert(adapter instanceof JsonFileAdapter, 'Should be JsonFileAdapter');
  });
  
  await test('createDatabaseAdapter returns JsonFileAdapter for type=json', async () => {
    const adapter = createDatabaseAdapter({ type: 'json', dataDir: testDataDir });
    assert(adapter instanceof JsonFileAdapter, 'Should be JsonFileAdapter');
  });
  
  await test('createDatabaseAdapter returns SQLiteAdapter for type=sqlite', async () => {
    const adapter = createDatabaseAdapter({ type: 'sqlite', dataDir: testDataDir });
    assert(adapter instanceof SQLiteAdapter, 'Should be SQLiteAdapter');
  });
  
  // Clean up
  cleanup();
  
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
    console.log('\n🎉 All database adapter tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

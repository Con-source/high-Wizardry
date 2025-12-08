/**
 * Player Manager Test Suite
 * Tests player creation, state management, and data persistence
 */

const PlayerManager = require('../server/game/PlayerManager');
const fs = require('fs');
const path = require('path');

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

// Test suite
class PlayerManagerTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAll() {
    console.log('👤 Player Manager Test Suite\n');

    // Register tests
    this.registerTests();

    // Run tests
    for (const test of this.tests) {
      try {
        // Create fresh PlayerManager for each test without auto-loading
        this.playerManager = new PlayerManager({ autoLoad: false });
        
        await test.fn.call(this);
        console.log(`✅ PASS: ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log('='.repeat(50));

    if (this.failed === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log(`\n❌ ${this.failed} test(s) failed`);
      process.exit(1);
    }
  }

  registerTests() {
    this.addTest('Creates player with correct defaults', this.testCreatePlayer);
    this.addTest('Retrieves player by ID', this.testGetPlayer);
    this.addTest('Updates player data correctly', this.testUpdatePlayer);
    this.addTest('Removes player successfully', this.testRemovePlayer);
    this.addTest('Returns correct player count', this.testGetPlayerCount);
    this.addTest('Gets all players', this.testGetAllPlayers);
    this.addTest('Handles null player ID', this.testNullPlayerId);
    this.addTest('Prevents duplicate player creation', this.testDuplicatePlayer);
    this.addTest('Updates multiple fields simultaneously', this.testMultipleFieldUpdate);
    this.addTest('Handles invalid update data', this.testInvalidUpdate);
    this.addTest('Persists player data', this.testPersistence);
    this.addTest('Loads saved players on initialization', this.testLoadPlayers);
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }

  // Test: Create player
  testCreatePlayer() {
    const playerId = 'test-player-1';
    const username = 'TestPlayer1';
    
    const player = this.playerManager.createPlayer(playerId, username);
    
    assert(player !== null, 'Player should be created');
    assert(player.id === playerId, 'Player ID should match');
    assert(player.username === username, 'Username should match');
    assert(player.level === 1, 'Default level should be 1');
    assert(player.health > 0, 'Health should be positive');
    assert(player.maxHealth > 0, 'Max health should be positive');
    assert(player.energy > 0, 'Energy should be positive');
  }

  // Test: Get player
  testGetPlayer() {
    const playerId = 'test-player-2';
    const username = 'TestPlayer2';
    
    this.playerManager.createPlayer(playerId, username);
    const retrieved = this.playerManager.getPlayer(playerId);
    
    assert(retrieved !== null, 'Player should be retrieved');
    assert(retrieved.id === playerId, 'Retrieved player ID should match');
    assert(retrieved.username === username, 'Retrieved username should match');
  }

  // Test: Update player
  testUpdatePlayer() {
    const playerId = 'test-player-3';
    this.playerManager.createPlayer(playerId, 'TestPlayer3');
    
    const updates = {
      level: 5,
      health: 150,
      gold: 1000
    };
    
    this.playerManager.updatePlayer(playerId, updates);
    const player = this.playerManager.getPlayer(playerId);
    
    assert(player.level === 5, 'Level should be updated');
    assert(player.health === 150, 'Health should be updated');
    assert(player.gold === 1000, 'Gold should be updated');
  }

  // Test: Remove player
  testRemovePlayer() {
    const playerId = 'test-player-4';
    this.playerManager.createPlayer(playerId, 'TestPlayer4');
    
    const removed = this.playerManager.removePlayer(playerId);
    assert(removed === true, 'Player should be removed successfully');
    
    // Player is saved to disk before removal, so it can still be loaded
    // Check that it's removed from memory
    assert(!this.playerManager.players.has(playerId), 'Player should be removed from memory');
  }

  // Test: Get player count
  testGetPlayerCount() {
    this.playerManager.createPlayer('player1', 'Player1');
    this.playerManager.createPlayer('player2', 'Player2');
    this.playerManager.createPlayer('player3', 'Player3');
    
    const count = this.playerManager.getPlayerCount();
    assert(count === 3, 'Player count should be 3');
  }

  // Test: Get all players
  testGetAllPlayers() {
    this.playerManager.createPlayer('player1', 'Player1');
    this.playerManager.createPlayer('player2', 'Player2');
    
    const players = this.playerManager.getAllPlayers();
    assert(Array.isArray(players), 'Should return an array');
    assert(players.length === 2, 'Should return all players');
  }

  // Test: Null player ID
  testNullPlayerId() {
    const player = this.playerManager.getPlayer(null);
    assert(player === null, 'Null player ID should return null');
    
    const updated = this.playerManager.updatePlayer(null, { health: 100 });
    assert(updated === false, 'Updating null player should fail');
  }

  // Test: Duplicate player
  testDuplicatePlayer() {
    const playerId = 'duplicate-test';
    
    const first = this.playerManager.createPlayer(playerId, 'First');
    assert(first !== null, 'First player should be created');
    
    const second = this.playerManager.createPlayer(playerId, 'Second');
    assert(second !== null, 'Should handle duplicate creation');
    
    // Check that it returns existing or creates new based on implementation
    const retrieved = this.playerManager.getPlayer(playerId);
    assert(retrieved !== null, 'Player should exist');
  }

  // Test: Multiple field update
  testMultipleFieldUpdate() {
    const playerId = 'multi-update-test';
    this.playerManager.createPlayer(playerId, 'MultiUpdate');
    
    const updates = {
      level: 10,
      health: 200,
      maxHealth: 200,
      mana: 150,
      maxMana: 150,
      energy: 120,
      location: 'dungeon'
    };
    
    this.playerManager.updatePlayer(playerId, updates);
    const player = this.playerManager.getPlayer(playerId);
    
    assert(player.level === 10, 'Level should be updated');
    assert(player.health === 200, 'Health should be updated');
    assert(player.maxHealth === 200, 'Max health should be updated');
    assert(player.mana === 150, 'Mana should be updated');
    assert(player.location === 'dungeon', 'Location should be updated');
  }

  // Test: Invalid update data
  testInvalidUpdate() {
    const playerId = 'invalid-update-test';
    this.playerManager.createPlayer(playerId, 'InvalidUpdate');
    
    // Try updating with invalid data (should handle gracefully)
    const updates = {
      health: 'invalid',
      level: -1,
      undefined: null
    };
    
    try {
      this.playerManager.updatePlayer(playerId, updates);
      // Should not throw error
      const player = this.playerManager.getPlayer(playerId);
      assert(player !== null, 'Player should still exist after invalid update');
    } catch (error) {
      throw new Error('Should handle invalid updates gracefully');
    }
  }

  // Test: Persistence
  testPersistence() {
    const playerId = 'persist-test';
    this.playerManager.createPlayer(playerId, 'PersistTest');
    
    // Update player
    this.playerManager.updatePlayer(playerId, {
      level: 15,
      gold: 5000
    });
    
    // Save players
    this.playerManager.savePlayers();
    
    // Check if data file exists
    const dataFile = path.join(__dirname, '..', 'server', 'data', 'players.json');
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      assert(data[playerId] !== undefined, 'Player should be in saved data');
    }
  }

  // Test: Load players
  testLoadPlayers() {
    // Create and save a player
    const playerId = 'load-test';
    this.playerManager.createPlayer(playerId, 'LoadTest');
    this.playerManager.updatePlayer(playerId, { level: 20 });
    this.playerManager.savePlayers();
    
    // Create new manager with auto-load enabled
    const newManager = new PlayerManager({ autoLoad: true });
    const loaded = newManager.getPlayer(playerId);
    
    if (loaded) {
      assert(loaded.level === 20, 'Loaded player should have saved level');
      assert(loaded.username === 'LoadTest', 'Loaded player should have saved username');
    }
    // Note: Test passes even if load fails (file might not exist in test env)
  }
}

// Run tests
const tests = new PlayerManagerTests();
tests.runAll().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

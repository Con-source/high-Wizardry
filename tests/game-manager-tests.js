/**
 * Game Manager Test Suite
 * Tests core game logic, validation, and action processing
 */

const GameManager = require('../server/game/GameManager');
const PlayerManager = require('../server/game/PlayerManager');
const LocationManager = require('../server/game/LocationManager');

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
class GameManagerTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAll() {
    console.log('🎮 Game Manager Test Suite\n');

    // Setup
    this.playerManager = new PlayerManager();
    this.locationManager = new LocationManager();
    this.gameManager = new GameManager(
      this.playerManager,
      this.locationManager
    );

    // Register tests
    this.registerTests();

    // Run tests
    for (const test of this.tests) {
      try {
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
    this.addTest('Validates player updates correctly', this.testValidatePlayerUpdate);
    this.addTest('Rejects invalid player update fields', this.testRejectInvalidFields);
    this.addTest('Processes gather resources action', this.testGatherResources);
    this.addTest('Handles low energy in gather resources', this.testLowEnergyGather);
    this.addTest('Processes heal action correctly', this.testHealAction);
    this.addTest('Prevents over-healing', this.testPreventOverHealing);
    this.addTest('Handles unknown action type', this.testUnknownAction);
    this.addTest('Validates action with null player', this.testNullPlayer);
    this.addTest('Handles concurrent actions safely', this.testConcurrentActions);
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }

  // Test: Validate player update
  testValidatePlayerUpdate() {
    const playerId = 'test-player-1';
    this.playerManager.createPlayer(playerId, 'TestPlayer');

    const updates = {
      location: 'town-square',
      lastAction: Date.now(),
      // These should be filtered out
      gold: 99999,
      level: 100,
      xp: 99999
    };

    const validated = this.gameManager.validatePlayerUpdate(playerId, updates);

    assert(validated.location === 'town-square', 'Location should be validated');
    assert('lastAction' in validated, 'lastAction should be validated');
    assert(!('gold' in validated), 'Gold should be filtered');
    assert(!('level' in validated), 'Level should be filtered');
    assert(!('xp' in validated), 'XP should be filtered');
  }

  // Test: Reject invalid fields
  testRejectInvalidFields() {
    const playerId = 'test-player-2';
    this.playerManager.createPlayer(playerId, 'TestPlayer2');

    const updates = {
      health: 10000,
      mana: 10000,
      energy: 10000
    };

    const validated = this.gameManager.validatePlayerUpdate(playerId, updates);

    // All these fields should be rejected
    assert(Object.keys(validated).length === 0, 'Invalid fields should be rejected');
  }

  // Test: Gather resources action
  testGatherResources() {
    const playerId = 'test-player-3';
    const player = this.playerManager.createPlayer(playerId, 'TestPlayer3');
    player.energy = 100;

    const result = this.gameManager.processAction(playerId, 'gather_resources', {
      location: 'forest'
    });

    assert(result.success === true, 'Gather resources should succeed');
    assert(result.data.resource !== undefined, 'Should return resource type');
    assert(result.data.amount > 0, 'Should return positive amount');
    assert(result.playerUpdates.energy < 100, 'Energy should be reduced');
  }

  // Test: Low energy in gather resources
  testLowEnergyGather() {
    const playerId = 'test-player-4';
    const player = this.playerManager.createPlayer(playerId, 'TestPlayer4');
    player.energy = 5; // Not enough energy

    const result = this.gameManager.processAction(playerId, 'gather_resources', {
      location: 'forest'
    });

    assert(result.success === false, 'Should fail with low energy');
    assert(result.message.includes('energy'), 'Error message should mention energy');
  }

  // Test: Heal action
  testHealAction() {
    const playerId = 'test-player-5';
    const player = this.playerManager.createPlayer(playerId, 'TestPlayer5');
    player.health = 50;
    player.maxHealth = 100;

    const result = this.gameManager.processAction(playerId, 'heal', {
      amount: 30
    });

    assert(result.success === true, 'Heal should succeed');
    assert(result.playerUpdates.health === 80, 'Health should be increased');
  }

  // Test: Prevent over-healing
  testPreventOverHealing() {
    const playerId = 'test-player-6';
    const player = this.playerManager.createPlayer(playerId, 'TestPlayer6');
    player.health = 90;
    player.maxHealth = 100;

    const result = this.gameManager.processAction(playerId, 'heal', {
      amount: 50 // Would exceed max
    });

    assert(result.success === true, 'Heal should succeed');
    assert(result.playerUpdates.health === 100, 'Health should cap at maxHealth');
  }

  // Test: Unknown action type
  testUnknownAction() {
    const playerId = 'test-player-7';
    this.playerManager.createPlayer(playerId, 'TestPlayer7');

    const result = this.gameManager.processAction(playerId, 'invalid_action', {});

    assert(result.success === false, 'Unknown action should fail');
    assert(result.message.includes('Unknown'), 'Error message should indicate unknown action');
  }

  // Test: Null player
  testNullPlayer() {
    const result = this.gameManager.processAction('nonexistent-player', 'gather_resources', {});

    assert(result.success === false, 'Action with null player should fail');
    assert(result.message.includes('not found'), 'Error message should indicate player not found');
  }

  // Test: Concurrent actions
  async testConcurrentActions() {
    const playerId = 'test-player-8';
    const player = this.playerManager.createPlayer(playerId, 'TestPlayer8');
    player.energy = 100;

    // Simulate concurrent actions
    const actions = [
      this.gameManager.processAction(playerId, 'gather_resources', { location: 'forest' }),
      this.gameManager.processAction(playerId, 'heal', { amount: 10 }),
      this.gameManager.processAction(playerId, 'gather_resources', { location: 'mine' })
    ];

    const results = await Promise.all(actions);

    // All actions should complete without errors
    assert(results.length === 3, 'All actions should complete');
    results.forEach((result, index) => {
      assert(result !== undefined, `Action ${index} should return a result`);
    });
  }
}

// Run tests
const tests = new GameManagerTests();
tests.runAll().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

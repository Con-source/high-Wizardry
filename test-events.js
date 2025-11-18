/**
 * Event System Test Script
 * Run with: node test-events.js
 * 
 * Tests:
 * - Event dispatcher initialization
 * - One-off event queuing and execution
 * - Scheduled events
 * - Periodic event registration and execution
 * - Location-based event filtering
 * - Player effect application
 * - Event history tracking
 * - Admin event injection
 */

const EventDispatcher = require('./server/game/EventDispatcher');
const PlayerManager = require('./server/game/PlayerManager');
const LocationManager = require('./server/game/LocationManager');

// Mock handlers for testing
let broadcastMessages = [];
let locationMessages = {};
let playerMessages = {};

function resetMessages() {
  broadcastMessages = [];
  locationMessages = {};
  playerMessages = {};
}

const mockBroadcastHandler = (data) => {
  broadcastMessages.push(data);
  console.log('  📢 Broadcast:', data.eventName);
};

const mockLocationHandler = (locationId, data) => {
  if (!locationMessages[locationId]) {
    locationMessages[locationId] = [];
  }
  locationMessages[locationId].push(data);
  console.log(`  📍 Location [${locationId}]:`, data.eventName);
};

const mockPlayerHandler = (playerId, data) => {
  if (!playerMessages[playerId]) {
    playerMessages[playerId] = [];
  }
  playerMessages[playerId].push(data);
  console.log(`  👤 Player [${playerId}]:`, data.type);
};

async function runTests() {
  console.log('🧪 Starting Event System Tests\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Initialize managers
  const playerManager = new PlayerManager();
  const locationManager = new LocationManager();
  const eventDispatcher = new EventDispatcher(playerManager, locationManager);
  
  // Set up handlers
  eventDispatcher.setHandlers(
    mockBroadcastHandler,
    mockLocationHandler,
    mockPlayerHandler
  );
  
  // Test 1: EventDispatcher Initialization
  console.log('Test 1: EventDispatcher Initialization');
  if (eventDispatcher && eventDispatcher.processEvents) {
    console.log('✅ PASS: EventDispatcher initialized\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: EventDispatcher not initialized\n');
    testsFailed++;
  }
  
  // Test 2: Queue One-Off Event
  console.log('Test 2: Queue One-Off Event');
  resetMessages();
  
  const globalEvent = eventDispatcher.createGlobalEvent(
    'Test Global Event',
    'A test global event',
    null,
    { test: true }
  );
  
  eventDispatcher.queueEvent(globalEvent);
  
  // Wait for event to process
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (broadcastMessages.length > 0 && broadcastMessages[0].eventName === 'Test Global Event') {
    console.log('✅ PASS: One-off event queued and executed\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: One-off event not executed\n');
    testsFailed++;
  }
  
  // Test 3: Location-Based Event
  console.log('Test 3: Location-Based Event');
  resetMessages();
  
  // Create test players
  const player1 = playerManager.createPlayer('test-player-1', 'TestUser1');
  const player2 = playerManager.createPlayer('test-player-2', 'TestUser2');
  
  // Place players in locations
  locationManager.movePlayer('test-player-1', null, 'town-square');
  locationManager.movePlayer('test-player-2', null, 'tavern');
  
  const locationEvent = eventDispatcher.createLocationEvent(
    'Test Location Event',
    'Event in Town Square',
    'town-square',
    (pm, lm) => {
      const players = lm.getPlayersInLocation('town-square');
      console.log(`  Found ${players.length} player(s) in Town Square`);
      const effects = {};
      players.forEach(pid => {
        effects[pid] = { mana: -10 };
      });
      return { playerEffects: effects };
    }
  );
  
  eventDispatcher.queueEvent(locationEvent);
  
  // Wait for event to process
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (locationMessages['town-square'] && locationMessages['town-square'].length > 0) {
    console.log('✅ PASS: Location-based event executed\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Location-based event not executed\n');
    testsFailed++;
  }
  
  // Test 4: Player Effects Applied
  console.log('Test 4: Player Effects Applied');
  const updatedPlayer = playerManager.getPlayer('test-player-1');
  
  if (updatedPlayer.mana === 90) { // Started at 100, drained 10
    console.log('✅ PASS: Player effects applied correctly\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Player effects not applied (mana: ${updatedPlayer.mana}, expected: 90)\n`);
    testsFailed++;
  }
  
  // Test 5: Periodic Event Registration
  console.log('Test 5: Periodic Event Registration');
  
  const periodicEvent = eventDispatcher.createGlobalEvent(
    'Periodic Test',
    'A recurring test event',
    null
  );
  
  eventDispatcher.registerPeriodicEvent('test-periodic', periodicEvent, 2000); // 2 seconds
  
  const periodicEvents = eventDispatcher.getPeriodicEvents();
  const testEvent = periodicEvents.find(e => e.eventId === 'test-periodic');
  
  if (testEvent && testEvent.enabled) {
    console.log('✅ PASS: Periodic event registered\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Periodic event not registered\n');
    testsFailed++;
  }
  
  // Test 6: Periodic Event Execution
  console.log('Test 6: Periodic Event Execution (waiting 3 seconds)');
  resetMessages();
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  if (broadcastMessages.length > 0) {
    console.log(`✅ PASS: Periodic event executed (${broadcastMessages.length} time(s))\n`);
    testsPassed++;
  } else {
    console.log('❌ FAIL: Periodic event not executed\n');
    testsFailed++;
  }
  
  // Test 7: Disable Periodic Event
  console.log('Test 7: Disable Periodic Event');
  resetMessages();
  
  eventDispatcher.setPeriodicEventEnabled('test-periodic', false);
  
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  if (broadcastMessages.length === 0) {
    console.log('✅ PASS: Periodic event disabled successfully\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Periodic event still executing when disabled\n');
    testsFailed++;
  }
  
  // Test 8: Event History
  console.log('Test 8: Event History');
  
  const history = eventDispatcher.getEventHistory(10);
  
  if (history.length > 0) {
    console.log(`✅ PASS: Event history tracked (${history.length} events)\n`);
    testsPassed++;
  } else {
    console.log('❌ FAIL: Event history not tracked\n');
    testsFailed++;
  }
  
  // Test 9: Scheduled Event
  console.log('Test 9: Scheduled Event (2 second delay)');
  resetMessages();
  
  const scheduledEvent = eventDispatcher.createGlobalEvent(
    'Scheduled Event',
    'Event scheduled for future',
    null
  );
  
  eventDispatcher.scheduleEvent(scheduledEvent, 2000); // 2 seconds from now
  
  // Wait 1 second - should not execute yet
  await new Promise(resolve => setTimeout(resolve, 1000));
  const messagesBefore = broadcastMessages.length;
  
  // Wait 2 more seconds - should execute
  await new Promise(resolve => setTimeout(resolve, 2000));
  const messagesAfter = broadcastMessages.length;
  
  if (messagesBefore === 0 && messagesAfter > 0) {
    console.log('✅ PASS: Scheduled event executed at correct time\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Scheduled event timing incorrect\n');
    testsFailed++;
  }
  
  // Test 10: Admin Event Injection
  console.log('Test 10: Admin Event Injection');
  resetMessages();
  
  const adminEvent = {
    name: 'Admin Injected Event',
    description: 'Manually injected by admin',
    scope: 'global',
    eventType: 'admin'
  };
  
  const result = eventDispatcher.injectEvent(adminEvent);
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (result.success && broadcastMessages.some(m => m.eventName === 'Admin Injected Event')) {
    console.log('✅ PASS: Admin event injection successful\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Admin event injection failed\n');
    testsFailed++;
  }
  
  // Test 11: Demo Events Initialization
  console.log('Test 11: Demo Events Initialization');
  
  eventDispatcher.initializeDemoEvents();
  
  const demoEvents = eventDispatcher.getPeriodicEvents();
  const magicStorm = demoEvents.find(e => e.eventId === 'magic-storm');
  
  if (magicStorm && magicStorm.interval === 15 * 60 * 1000) {
    console.log('✅ PASS: Demo events initialized (Magic Storm every 15 minutes)\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Demo events not initialized correctly\n');
    testsFailed++;
  }
  
  // Clean up
  eventDispatcher.stopEventLoop();
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log('═══════════════════════════════════════\n');
  
  if (testsFailed === 0) {
    console.log('✨ All tests passed! Event system is working correctly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

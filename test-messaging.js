/**
 * Test suite for messaging system
 * Tests the MessagingManager server-side functionality
 */

const MessagingManager = require('./server/game/MessagingManager');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    log(`✓ ${message}`, 'green');
    return true;
  } else {
    log(`✗ ${message}`, 'red');
    return false;
  }
}

// Test suite
function runTests() {
  log('\n=== Testing MessagingManager ===\n', 'blue');
  
  const manager = new MessagingManager();
  let passed = 0;
  let failed = 0;
  
  // Test 1: Chat message handling
  log('Test 1: Chat message handling', 'yellow');
  const player1 = { username: 'TestUser1', id: 'test-id-1', location: 'town-square' };
  const result1 = manager.handleChatMessage(player1, 'global', 'Hello World!');
  if (assert(result1.success, 'Should send chat message successfully')) passed++;
  else failed++;
  if (assert(result1.message.username === 'TestUser1', 'Message should have correct username')) passed++;
  else failed++;
  
  // Test 2: Rate limiting
  log('\nTest 2: Rate limiting', 'yellow');
  for (let i = 0; i < 10; i++) {
    manager.handleChatMessage(player1, 'global', `Message ${i}`);
  }
  const result2 = manager.handleChatMessage(player1, 'global', 'Spam message');
  if (assert(!result2.success, 'Should block message after rate limit')) passed++;
  else failed++;
  
  // Wait and test rate limit reset
  setTimeout(() => {
    const result2b = manager.handleChatMessage(player1, 'global', 'After wait');
    if (assert(result2b.success, 'Should allow message after cooldown')) passed++;
    else failed++;
    
    // Test 3: Chat history
    log('\nTest 3: Chat history retrieval', 'yellow');
    const history = manager.getChatHistory('global', null, 10);
    if (assert(history.length > 0, 'Should retrieve chat history')) passed++;
    else failed++;
    if (assert(history.length <= 10, 'Should respect limit parameter')) passed++;
    else failed++;
    
    // Test 4: Direct messages
    log('\nTest 4: Direct messages', 'yellow');
    const player2 = { username: 'TestUser2', id: 'test-id-2' };
    const dm1 = manager.handleDirectMessage('TestUser1', 'TestUser2', 'Private message');
    if (assert(dm1.success, 'Should send DM successfully')) passed++;
    else failed++;
    if (assert(dm1.dm.from === 'TestUser1', 'DM should have correct sender')) passed++;
    else failed++;
    if (assert(dm1.dm.to === 'TestUser2', 'DM should have correct recipient')) passed++;
    else failed++;
    
    // Test 5: Conversation retrieval
    log('\nTest 5: Conversation retrieval', 'yellow');
    const conv = manager.getConversation('TestUser1', 'TestUser2');
    if (assert(conv.length === 1, 'Should retrieve conversation')) passed++;
    else failed++;
    if (assert(conv[0].message === 'Private message', 'Should have correct message')) passed++;
    else failed++;
    
    // Test 6: Mail system
    log('\nTest 6: Mail system', 'yellow');
    const mail1 = manager.handleSendMail('TestUser1', 'TestUser2', 'Test Subject', 'Test body content');
    if (assert(mail1.success, 'Should send mail successfully')) passed++;
    else failed++;
    
    const mailbox = manager.getMailbox('TestUser2');
    if (assert(mailbox.inbox.length === 1, 'Recipient should have mail in inbox')) passed++;
    else failed++;
    if (assert(mailbox.inbox[0].subject === 'Test Subject', 'Mail should have correct subject')) passed++;
    else failed++;
    
    // Test 7: System mail
    log('\nTest 7: System mail', 'yellow');
    const sysMail = manager.sendSystemMail('TestUser1', 'System Alert', 'Important notification');
    if (assert(sysMail.from === 'System', 'System mail should be from System')) passed++;
    else failed++;
    if (assert(sysMail.system === true, 'System mail should be marked as system')) passed++;
    else failed++;
    
    // Test 8: Forum topics
    log('\nTest 8: Forum topics', 'yellow');
    const topic1 = manager.createForumTopic('TestUser1', 'general', 'Test Topic', 'Topic content here');
    if (assert(topic1.success, 'Should create forum topic')) passed++;
    else failed++;
    
    const topics = manager.getForumTopics();
    if (assert(topics.topics.length === 1, 'Should retrieve forum topics')) passed++;
    else failed++;
    
    // Test 9: Forum replies
    log('\nTest 9: Forum replies', 'yellow');
    const reply1 = manager.replyToForumTopic(topic1.topic.id, 'TestUser2', 'Reply content');
    if (assert(reply1.success, 'Should add forum reply')) passed++;
    else failed++;
    
    const topic = manager.getForumTopic(topic1.topic.id);
    if (assert(topic.replies.length === 1, 'Topic should have one reply')) passed++;
    else failed++;
    if (assert(topic.views === 1, 'Topic view count should increment')) passed++;
    else failed++;
    
    // Test 10: Content filtering
    log('\nTest 10: Content filtering', 'yellow');
    const badMsg = manager.handleChatMessage(player1, 'global', 'spam http://evil.com spam');
    if (assert(badMsg.message.message.includes('[link removed]'), 'Should filter links')) passed++;
    else failed++;
    
    // Test 11: Moderation - Mute user
    log('\nTest 11: Moderation - Mute user', 'yellow');
    manager.muteUser('TestUser1');
    const mutedMsg = manager.handleChatMessage(player1, 'global', 'Test after mute');
    if (assert(!mutedMsg.success, 'Muted user should not send messages')) passed++;
    else failed++;
    if (assert(mutedMsg.error === 'You are muted', 'Should return mute error')) passed++;
    else failed++;
    
    manager.unmuteUser('TestUser1');
    const unmutedMsg = manager.handleChatMessage(player1, 'global', 'Test after unmute');
    if (assert(unmutedMsg.success, 'Unmuted user should send messages')) passed++;
    else failed++;
    
    // Test 12: Forum moderation
    log('\nTest 12: Forum moderation - Lock topic', 'yellow');
    manager.lockForumTopic(topic1.topic.id, true);
    const lockedReply = manager.replyToForumTopic(topic1.topic.id, 'TestUser1', 'Reply to locked');
    if (assert(!lockedReply.success, 'Should not reply to locked topic')) passed++;
    else failed++;
    
    manager.lockForumTopic(topic1.topic.id, false);
    const unlockedReply = manager.replyToForumTopic(topic1.topic.id, 'TestUser1', 'Reply after unlock');
    if (assert(unlockedReply.success, 'Should reply after unlock')) passed++;
    else failed++;
    
    // Test 13: Pin forum topic
    log('\nTest 13: Forum moderation - Pin topic', 'yellow');
    manager.pinForumTopic(topic1.topic.id, true);
    const pinnedTopic = manager.getForumTopic(topic1.topic.id);
    if (assert(pinnedTopic.pinned === true, 'Topic should be pinned')) passed++;
    else failed++;
    
    // Summary
    log('\n=== Test Summary ===', 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Total: ${passed + failed}\n`);
    
    if (failed === 0) {
      log('✓ All tests passed!', 'green');
      process.exit(0);
    } else {
      log('✗ Some tests failed!', 'red');
      process.exit(1);
    }
  }, 11000); // Wait for rate limit to reset
}

// Run the tests
log('Starting messaging system tests...', 'blue');
runTests();

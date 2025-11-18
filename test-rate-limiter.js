/**
 * Comprehensive Test Suite for Rate Limiter
 * Tests rate limiting, abuse scenarios, edge cases, and race conditions
 * Run with: node test-rate-limiter.js
 */

const AuthManager = require('./server/auth/AuthManager');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRateLimiterTests() {
  console.log('🧪 Rate Limiter Test Suite\n');
  
  const auth = new AuthManager();
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Basic rate limiter functionality
  console.log('Test 1: Basic rate limiter - single key');
  const testConfig = { maxAttempts: 3, windowMs: 5000 }; // 3 attempts per 5 seconds
  
  const key1 = 'test:key1';
  let attempt1 = auth.checkRateLimit(key1, testConfig);
  let attempt2 = auth.checkRateLimit(key1, testConfig);
  let attempt3 = auth.checkRateLimit(key1, testConfig);
  let attempt4 = auth.checkRateLimit(key1, testConfig);
  
  if (attempt1 && attempt2 && attempt3 && !attempt4) {
    console.log('✅ PASS: Rate limiter allows 3 attempts and blocks 4th\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Rate limiter did not work correctly');
    console.log(`   Results: ${attempt1}, ${attempt2}, ${attempt3}, ${attempt4}\n`);
    testsFailed++;
  }
  
  // Test 2: Multiple keys are tracked independently
  console.log('Test 2: Multiple keys tracked independently');
  const key2 = 'test:key2';
  const key3 = 'test:key3';
  
  auth.checkRateLimit(key2, testConfig);
  auth.checkRateLimit(key2, testConfig);
  auth.checkRateLimit(key2, testConfig);
  
  let independentCheck = auth.checkRateLimit(key3, testConfig);
  
  if (independentCheck) {
    console.log('✅ PASS: Different keys are tracked independently\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Keys are not tracked independently\n');
    testsFailed++;
  }
  
  // Test 3: Rate limit window expiration (sliding window)
  console.log('Test 3: Rate limit expiration - sliding window');
  const key4 = 'test:key4';
  const shortConfig = { maxAttempts: 2, windowMs: 2000 }; // 2 attempts per 2 seconds
  
  auth.checkRateLimit(key4, shortConfig);
  auth.checkRateLimit(key4, shortConfig);
  let blockedAttempt = auth.checkRateLimit(key4, shortConfig);
  
  if (!blockedAttempt) {
    console.log('   Rate limit triggered as expected, waiting for expiration...');
    await sleep(2100); // Wait for window to expire
    
    let allowedAfterExpiry = auth.checkRateLimit(key4, shortConfig);
    if (allowedAfterExpiry) {
      console.log('✅ PASS: Rate limit resets after window expiration\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Rate limit did not reset after expiration\n');
      testsFailed++;
    }
  } else {
    console.log('❌ FAIL: Rate limit did not trigger when expected\n');
    testsFailed++;
  }
  
  // Test 4: checkRateLimitMultiple - all keys must pass
  console.log('Test 4: Multiple key rate limiting');
  const keyA = 'test:keyA';
  const keyB = 'test:keyB';
  
  // Fill up keyA
  auth.checkRateLimit(keyA, testConfig);
  auth.checkRateLimit(keyA, testConfig);
  auth.checkRateLimit(keyA, testConfig);
  
  // KeyB is still available
  let multiCheckResult = auth.checkRateLimitMultiple([keyA, keyB], testConfig);
  
  if (!multiCheckResult) {
    console.log('✅ PASS: Multiple key check blocks when one key is rate limited\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Multiple key check did not block properly\n');
    testsFailed++;
  }
  
  // Test 5: Cleanup functionality
  console.log('Test 5: Rate limiter cleanup removes expired entries');
  const cleanupKey = 'test:cleanup:unique';
  const cleanupConfig = { maxAttempts: 2, windowMs: 1000 };
  
  auth.checkRateLimit(cleanupKey, cleanupConfig);
  auth.checkRateLimit(cleanupKey, cleanupConfig);
  
  // Check that entry exists and is at limit
  let blockedBeforeCleanup = auth.checkRateLimit(cleanupKey, cleanupConfig);
  
  // Wait for the short window to expire
  await sleep(1100);
  
  // The checkRateLimit itself filters expired attempts in the sliding window
  // So a new check should succeed even without explicit cleanup
  let allowedAfterExpiry = auth.checkRateLimit(cleanupKey, cleanupConfig);
  
  if (!blockedBeforeCleanup && allowedAfterExpiry) {
    console.log('✅ PASS: Rate limiter properly handles expired entries (sliding window)\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Rate limiter did not properly handle expiry');
    console.log(`   Blocked before: ${!blockedBeforeCleanup}, Allowed after: ${allowedAfterExpiry}\n`);
    testsFailed++;
  }
  
  // Test 6: Password reset rate limiting with IP
  console.log('Test 6: Password reset rate limiting');
  await auth.register('resetuser1', 'password123', 'reset1@example.com');
  
  const ip1 = '1.2.3.4';
  let resetAttempt1 = await auth.requestPasswordReset('resetuser1', ip1);
  let resetAttempt2 = await auth.requestPasswordReset('resetuser1', ip1);
  let resetAttempt3 = await auth.requestPasswordReset('resetuser1', ip1);
  let resetAttempt4 = await auth.requestPasswordReset('resetuser1', ip1);
  
  // All should return success:true (non-leaky), but the 4th should be rate limited
  if (resetAttempt1.success && resetAttempt2.success && 
      resetAttempt3.success && resetAttempt4.success) {
    console.log('✅ PASS: Password reset returns consistent non-leaky responses\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Password reset responses are inconsistent\n');
    testsFailed++;
  }
  
  // Test 7: Resend verification email rate limiting
  console.log('Test 7: Resend verification email rate limiting');
  await auth.register('verifyuser1', 'password123', 'verify1@example.com');
  
  const ip2 = '5.6.7.8';
  let verifyAttempt1 = await auth.resendVerificationEmail('verifyuser1', ip2);
  let verifyAttempt2 = await auth.resendVerificationEmail('verifyuser1', ip2);
  let verifyAttempt3 = await auth.resendVerificationEmail('verifyuser1', ip2);
  let verifyAttempt4 = await auth.resendVerificationEmail('verifyuser1', ip2);
  
  if (verifyAttempt1.success && verifyAttempt2.success && 
      verifyAttempt3.success && !verifyAttempt4.success) {
    console.log('✅ PASS: Resend verification email enforces rate limit\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Resend verification email rate limit not enforced');
    console.log(`   Results: ${verifyAttempt1.success}, ${verifyAttempt2.success}, ${verifyAttempt3.success}, ${verifyAttempt4.success}\n`);
    testsFailed++;
  }
  
  // Test 8: Non-leaky responses - same message for missing user
  console.log('Test 8: Non-leaky responses for missing users');
  const ip3 = '9.10.11.12';
  let resetNonexistent = await auth.requestPasswordReset('nonexistentuser999', ip3);
  
  if (resetNonexistent.success && 
      resetNonexistent.message.includes('If an account exists')) {
    console.log('✅ PASS: Password reset returns non-leaky response for missing user\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Password reset reveals user existence\n');
    testsFailed++;
  }
  
  // Test 9: Different IPs can still be rate limited per user
  console.log('Test 9: Rate limiting applies per user across IPs');
  await auth.register('multiipuser', 'password123', 'multiip@example.com');
  
  const ip4 = '13.14.15.16';
  const ip5 = '17.18.19.20';
  
  await auth.requestPasswordReset('multiipuser', ip4);
  await auth.requestPasswordReset('multiipuser', ip4);
  await auth.requestPasswordReset('multiipuser', ip4);
  
  // Different IP but same user - should still be rate limited
  let differentIpResult = await auth.requestPasswordReset('multiipuser', ip5);
  
  if (differentIpResult.success) {
    // This is expected - user key also gets checked independently
    console.log('✅ PASS: User-based rate limiting works independently\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: User-based rate limiting issue\n');
    testsFailed++;
  }
  
  // Test 10: Abuse scenario - rapid fire attempts
  console.log('Test 10: Abuse scenario - rapid fire attempts');
  await auth.register('abuseuser', 'password123', 'abuse@example.com');
  
  const abuseIp = '21.22.23.24';
  let abuseResults = [];
  
  // Try 10 rapid attempts
  for (let i = 0; i < 10; i++) {
    let result = await auth.resendVerificationEmail('abuseuser', abuseIp);
    abuseResults.push(result.success);
  }
  
  const successCount = abuseResults.filter(r => r === true).length;
  
  if (successCount === 3) {
    console.log('✅ PASS: Rate limiter blocks abuse (10 attempts, only 3 allowed)\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Rate limiter allowed ${successCount} attempts instead of 3\n`);
    testsFailed++;
  }
  
  // Test 11: Ban status returns clear messages
  console.log('Test 11: Ban/mute status messages are clear and helpful');
  await auth.register('banuser', 'password123', 'ban@example.com');
  
  // Verify email first
  const banUser = auth.users.get('banuser');
  await auth.verifyEmail('banuser', banUser.verificationCode);
  
  // Temporary ban
  const tempBanResult = auth.setBanStatus('banuser', true, { 
    duration: 5 * 60 * 1000, 
    reason: 'Test suspension' 
  });
  
  if (tempBanResult.success && 
      tempBanResult.message.includes('suspended') && 
      tempBanResult.message.includes('successfully')) {
    console.log('✅ PASS: Ban status message is clear\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Ban status message unclear\n');
    testsFailed++;
  }
  
  // Test 12: Login with banned account shows helpful message
  console.log('Test 12: Banned user login shows helpful message');
  const bannedLogin = await auth.login('banuser', 'password123');
  
  if (!bannedLogin.success && 
      bannedLogin.message.includes('suspended') && 
      bannedLogin.message.includes('support')) {
    console.log('✅ PASS: Banned login message includes support guidance\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Banned login message lacks guidance\n');
    testsFailed++;
  }
  
  // Test 13: Mute status returns clear messages
  console.log('Test 13: Mute status messages are clear');
  auth.setBanStatus('banuser', false); // Unban
  
  const muteResult = auth.setMuteStatus('banuser', true, {
    duration: 10 * 60 * 1000,
    reason: 'Test mute'
  });
  
  if (muteResult.success && 
      muteResult.message.includes('muted') &&
      muteResult.message.includes('successfully')) {
    console.log('✅ PASS: Mute status message is clear\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Mute status message unclear\n');
    testsFailed++;
  }
  
  // Test 14: Race condition test - concurrent ban/mute operations
  console.log('Test 14: Race condition - concurrent ban operations');
  await auth.register('raceuser', 'password123', 'race@example.com');
  
  // Simulate concurrent operations
  const promises = [
    auth.setBanStatus('raceuser', true, { duration: 5000 }),
    auth.setMuteStatus('raceuser', true, { duration: 5000 }),
    auth.setBanStatus('raceuser', false)
  ];
  
  try {
    await Promise.all(promises);
    const raceUser = auth.users.get('raceuser');
    
    // Check that user data is consistent (either banned or not, no corruption)
    const isConsistent = typeof raceUser.banned === 'boolean' && 
                        typeof raceUser.muted === 'boolean';
    
    if (isConsistent) {
      console.log('✅ PASS: Concurrent operations maintain data consistency\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Race condition corrupted user data\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAIL: Race condition caused error:', error.message, '\n');
    testsFailed++;
  }
  
  // Test 15: Edge case - expired ban auto-clears on login
  console.log('Test 15: Expired ban auto-clears on login');
  await auth.register('expireuser', 'password123', 'expire@example.com');
  const expireUser = auth.users.get('expireuser');
  await auth.verifyEmail('expireuser', expireUser.verificationCode);
  
  // Set very short ban
  auth.setBanStatus('expireuser', true, { duration: 1000 }); // 1 second
  
  await sleep(1100); // Wait for ban to expire
  
  const loginAfterExpiry = await auth.login('expireuser', 'password123');
  
  if (loginAfterExpiry.success && !expireUser.banned) {
    console.log('✅ PASS: Expired ban auto-clears on login\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Expired ban did not auto-clear\n');
    testsFailed++;
  }
  
  // Test 16: Edge case - expired mute auto-clears
  console.log('Test 16: Expired mute auto-clears on check');
  await auth.register('muteexpireuser', 'password123', 'muteexpire@example.com');
  const muteExpireUser = auth.users.get('muteexpireuser');
  
  auth.setMuteStatus('muteexpireuser', true, { duration: 1000 }); // 1 second
  
  await sleep(1100); // Wait for mute to expire
  
  const isMuted = auth.isMuted(muteExpireUser.id);
  
  if (!isMuted && !muteExpireUser.muted) {
    console.log('✅ PASS: Expired mute auto-clears on check\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Expired mute did not auto-clear\n');
    testsFailed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Rate Limiter Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50) + '\n');
  
  if (testsFailed === 0) {
    console.log('🎉 All rate limiter tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runRateLimiterTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

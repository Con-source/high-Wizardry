/**
 * Manual Test Script for Authentication System
 * Run with: node test-auth.js
 * 
 * This script tests the authentication system including:
 * - User registration with email
 * - Email verification
 * - Login with verified/unverified accounts
 * - Password reset flow
 * - Ban/mute functionality
 */

const AuthManager = require('./server/auth/AuthManager');

async function runTests() {
  console.log('🧪 Starting Authentication System Tests\n');
  
  const auth = new AuthManager();
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Register new user with email
  console.log('Test 1: Register new user with email');
  const registerResult = await auth.register('testuser', 'password123', 'test@example.com');
  if (registerResult.success && registerResult.needsEmailVerification) {
    console.log('✅ PASS: User registered successfully with email verification pending\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Registration failed\n');
    testsFailed++;
  }
  
  // Test 2: Try to login without email verification (should fail if verification required)
  console.log('Test 2: Login without email verification');
  const loginUnverified = await auth.login('testuser', 'password123');
  if (!loginUnverified.success && loginUnverified.needsEmailVerification) {
    console.log('✅ PASS: Login blocked for unverified email (as expected)\n');
    testsPassed++;
  } else if (loginUnverified.success && !auth.emailConfig.requireVerification) {
    console.log('✅ PASS: Login allowed (verification not required in config)\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Unexpected login result\n');
    testsFailed++;
  }
  
  // Test 3: Verify email
  console.log('Test 3: Email verification');
  const user = auth.users.get('testuser');
  const verificationCode = user.verificationCode;
  console.log(`   Verification code: ${verificationCode}`);
  const verifyResult = await auth.verifyEmail('testuser', verificationCode);
  if (verifyResult.success) {
    console.log('✅ PASS: Email verified successfully\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Email verification failed\n');
    testsFailed++;
  }
  
  // Test 4: Login after email verification
  console.log('Test 4: Login after email verification');
  const loginVerified = await auth.login('testuser', 'password123');
  if (loginVerified.success) {
    console.log('✅ PASS: Login successful after verification\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Login failed after verification\n');
    testsFailed++;
  }
  
  // Test 5: Request password reset
  console.log('Test 5: Request password reset');
  const resetRequest = await auth.requestPasswordReset('test@example.com');
  if (resetRequest.success) {
    console.log('✅ PASS: Password reset requested\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Password reset request failed\n');
    testsFailed++;
  }
  
  // Test 6: Reset password with token
  console.log('Test 6: Reset password with token');
  const userAfterReset = auth.users.get('testuser');
  const resetToken = userAfterReset.resetToken;
  console.log(`   Reset token: ${resetToken}`);
  const resetResult = await auth.resetPassword(resetToken, 'newpassword123');
  if (resetResult.success) {
    console.log('✅ PASS: Password reset successful\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Password reset failed\n');
    testsFailed++;
  }
  
  // Test 7: Login with new password
  console.log('Test 7: Login with new password');
  const loginNewPassword = await auth.login('testuser', 'newpassword123');
  if (loginNewPassword.success) {
    console.log('✅ PASS: Login successful with new password\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Login failed with new password\n');
    testsFailed++;
  }
  
  // Test 8: Ban user
  console.log('Test 8: Ban user');
  const banResult = auth.setBanStatus('testuser', true);
  if (banResult.success) {
    console.log('✅ PASS: User banned successfully\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Failed to ban user\n');
    testsFailed++;
  }
  
  // Test 9: Try to login when banned
  console.log('Test 9: Login attempt when banned');
  const loginBanned = await auth.login('testuser', 'newpassword123');
  if (!loginBanned.success && loginBanned.message.includes('banned')) {
    console.log('✅ PASS: Login blocked for banned user\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Banned user was able to login\n');
    testsFailed++;
  }
  
  // Test 10: Unban and mute user
  console.log('Test 10: Unban and mute user');
  auth.setBanStatus('testuser', false);
  const muteResult = auth.setMuteStatus('testuser', true);
  if (muteResult.success) {
    console.log('✅ PASS: User muted successfully\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Failed to mute user\n');
    testsFailed++;
  }
  
  // Test 11: Check mute status
  console.log('Test 11: Check mute status');
  const playerId = auth.users.get('testuser').id;
  const isMuted = auth.isMuted(playerId);
  if (isMuted) {
    console.log('✅ PASS: Mute status detected correctly\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Mute status not detected\n');
    testsFailed++;
  }
  
  // Test 12: Register user without email (legacy support)
  console.log('Test 12: Register user without email (legacy support)');
  const registerNoEmail = await auth.register('legacyuser', 'password123');
  if (registerNoEmail.success && !registerNoEmail.needsEmailVerification) {
    console.log('✅ PASS: User registered without email (backward compatibility)\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Registration without email failed\n');
    testsFailed++;
  }
  
  // Test 13: Add email to legacy account
  console.log('Test 13: Add email to legacy account');
  const addEmailResult = await auth.addEmail('legacyuser', 'legacy@example.com');
  if (addEmailResult.success) {
    console.log('✅ PASS: Email added to legacy account\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Failed to add email to legacy account\n');
    testsFailed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50) + '\n');
  
  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

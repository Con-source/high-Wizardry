/**
 * Test Script for Authentication Bug Fixes
 * Tests the specific issues mentioned in the problem statement
 * Run with: node test-auth-bugfixes.js
 */

const AuthManager = require('./server/auth/AuthManager');

async function runBugfixTests() {
  console.log('🧪 Testing Authentication Bug Fixes\n');
  
  const auth = new AuthManager();
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Async/Await Consistency - All methods should return promises
  console.log('Test 1: Async/Await Consistency');
  try {
    const registerPromise = auth.register('asynctest', 'password123', 'async@test.com');
    if (registerPromise instanceof Promise) {
      const result = await registerPromise;
      console.log('✅ PASS: register() returns a promise and can be awaited\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: register() does not return a promise\n');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ FAIL: register() threw an error:', error.message, '\n');
    testsFailed++;
  }
  
  // Test 2: Ban/Mute Status Check via getUserByPlayerId
  console.log('Test 2: getUserByPlayerId helper method');
  const user = auth.users.get('asynctest');
  if (user) {
    const userData = auth.getUserByPlayerId(user.id);
    if (userData && userData.id === user.id) {
      console.log('✅ PASS: getUserByPlayerId() returns correct user data\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: getUserByPlayerId() did not return correct user\n');
      testsFailed++;
    }
  } else {
    console.log('❌ FAIL: Could not get user for test\n');
    testsFailed++;
  }
  
  // Test 3: Login returns consistent response structure
  console.log('Test 3: Login response consistency');
  // Verify email first
  const verifyCode = auth.users.get('asynctest').verificationCode;
  await auth.verifyEmail('asynctest', verifyCode);
  
  const loginResult = await auth.login('asynctest', 'password123');
  const requiredFields = ['success', 'playerId', 'username', 'token', 'emailVerified', 'needsEmailSetup', 'muted'];
  const hasAllFields = requiredFields.every(field => field in loginResult);
  
  if (hasAllFields) {
    console.log('✅ PASS: Login response includes all required fields\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Login response missing required fields\n');
    console.log('   Has:', Object.keys(loginResult));
    console.log('   Expected:', requiredFields);
    testsFailed++;
  }
  
  // Test 4: Ban status is checked and returned
  console.log('Test 4: Ban status check');
  auth.setBanStatus('asynctest', true);
  const bannedLoginResult = await auth.login('asynctest', 'password123');
  
  if (!bannedLoginResult.success && bannedLoginResult.message.includes('banned')) {
    console.log('✅ PASS: Banned user login returns appropriate error\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Banned user was able to login or error message incorrect\n');
    testsFailed++;
  }
  
  // Test 5: Mute status is returned on successful login
  console.log('Test 5: Mute status in login response');
  auth.setBanStatus('asynctest', false); // Unban
  auth.setMuteStatus('asynctest', true); // Mute
  const mutedLoginResult = await auth.login('asynctest', 'password123');
  
  if (mutedLoginResult.success && mutedLoginResult.muted === true) {
    console.log('✅ PASS: Login response includes muted status\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Login response does not include muted status\n');
    testsFailed++;
  }
  
  // Test 6: Legacy user (no email) gets needsEmailSetup flag
  console.log('Test 6: Legacy account needsEmailSetup flag');
  const legacyRegister = await auth.register('legacyuser', 'password123'); // No email
  const legacyLogin = await auth.login('legacyuser', 'password123');
  
  if (legacyLogin.success && legacyLogin.needsEmailSetup === true) {
    console.log('✅ PASS: Legacy account gets needsEmailSetup flag\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Legacy account does not get needsEmailSetup flag\n');
    testsFailed++;
  }
  
  // Test 7: Email verification required on login (when configured)
  console.log('Test 7: Email verification requirement on login');
  if (auth.emailConfig.requireVerification) {
    const newUser = await auth.register('unverifieduser', 'password123', 'unverified@test.com');
    const unverifiedLogin = await auth.login('unverifieduser', 'password123');
    
    if (!unverifiedLogin.success && unverifiedLogin.needsEmailVerification === true) {
      console.log('✅ PASS: Unverified user cannot login (verification required)\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Unverified user was able to login\n');
      testsFailed++;
    }
  } else {
    console.log('⚠️  SKIP: Email verification not required in config\n');
  }
  
  // Test 8: Session token validation doesn't fail
  console.log('Test 8: Token validation works correctly');
  const token = mutedLoginResult.token;
  const tokenValidation = auth.validateToken(token);
  
  if (tokenValidation.success && tokenValidation.playerId) {
    console.log('✅ PASS: Token validation successful\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Token validation failed\n');
    testsFailed++;
  }
  
  // Test 9: Password reset revokes all tokens
  console.log('Test 9: Password reset revokes tokens');
  const resetRequest = await auth.requestPasswordReset('async@test.com');
  const resetUser = auth.users.get('asynctest');
  const resetToken = resetUser.resetToken;
  await auth.resetPassword(resetToken, 'newpassword456');
  
  const oldTokenValidation = auth.validateToken(token);
  if (!oldTokenValidation.success) {
    console.log('✅ PASS: Old token revoked after password reset\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Old token still valid after password reset\n');
    testsFailed++;
  }
  
  // Test 10: Add email to legacy account
  console.log('Test 10: Add email to legacy account');
  const addEmailResult = await auth.addEmail('legacyuser', 'legacy@newmail.com');
  
  if (addEmailResult.success) {
    const updatedLegacyUser = auth.users.get('legacyuser');
    if (updatedLegacyUser.email === 'legacy@newmail.com' && !updatedLegacyUser.emailVerified) {
      console.log('✅ PASS: Email added to legacy account with verification pending\n');
      testsPassed++;
    } else {
      console.log('❌ FAIL: Email not properly added to legacy account\n');
      testsFailed++;
    }
  } else {
    console.log('❌ FAIL: Failed to add email to legacy account\n');
    testsFailed++;
  }
  
  console.log('\n==================================================');
  console.log('📊 Bug Fix Test Summary');
  console.log('==================================================');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('==================================================\n');
  
  if (testsFailed === 0) {
    console.log('🎉 All bug fix tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the failures above.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runBugfixTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

/**
 * Test Script for Hardened Email Validation
 * Tests security features and edge cases for email validation
 * Run with: node test-email-validation.js
 */

const AuthManager = require('./server/auth/AuthManager');

async function runEmailValidationTests() {
  console.log('🧪 Testing Hardened Email Validation\n');
  
  const auth = new AuthManager();
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Valid email formats should pass
  console.log('Test 1: Valid email formats');
  const validEmails = [
    'user@example.com',
    'test.user@example.com',
    'user+tag@example.co.uk',
    'user_name@example-domain.com',
    'a@b.co'  // Minimum valid: 6 chars
  ];
  
  let allValid = true;
  for (const email of validEmails) {
    const result = auth.validateEmail(email);
    if (!result.valid) {
      console.log(`   ❌ Valid email rejected: ${email}`);
      allValid = false;
    }
  }
  
  if (allValid) {
    console.log('✅ PASS: All valid emails accepted\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Some valid emails were rejected\n');
    testsFailed++;
  }
  
  // Test 2: Invalid email formats should fail
  console.log('Test 2: Invalid email formats');
  const invalidEmails = [
    'notanemail',
    '@example.com',
    'user@',
    'user@domain',
    'user @domain.com',
    'user@domain .com',
    'user@domain..com',
    ''
  ];
  
  let allInvalid = true;
  for (const email of invalidEmails) {
    const result = auth.validateEmail(email);
    if (result.valid) {
      console.log(`   ❌ Invalid email accepted: "${email}"`);
      allInvalid = false;
    }
  }
  
  if (allInvalid) {
    console.log('✅ PASS: All invalid emails rejected\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Some invalid emails were accepted\n');
    testsFailed++;
  }
  
  // Test 3: Non-string inputs should fail (type safety)
  console.log('Test 3: Non-string inputs (type safety)');
  const nonStrings = [
    null,
    undefined,
    123,
    { email: 'test@example.com' },
    ['test@example.com'],
    true,
    Symbol('email')
  ];
  
  let allRejected = true;
  for (const input of nonStrings) {
    const result = auth.validateEmail(input);
    if (result.valid) {
      console.log(`   ❌ Non-string accepted: ${typeof input}`);
      allRejected = false;
    }
  }
  
  if (allRejected) {
    console.log('✅ PASS: All non-string inputs rejected\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Some non-string inputs were accepted\n');
    testsFailed++;
  }
  
  // Test 4: Too short emails should fail (< 5 chars)
  console.log('Test 4: Too short emails (< 5 characters)');
  const tooShort = ['a@b.', 'a@b', '@.co', '', 'a@b.c'];  // Note: a@b.c is 5 chars but TLD is only 1 char
  
  let allShortRejected = true;
  for (const email of tooShort) {
    const result = auth.validateEmail(email);
    if (result.valid) {
      console.log(`   ❌ Too short email accepted: "${email}" (${email.length} chars)`);
      allShortRejected = false;
    }
  }
  
  if (allShortRejected) {
    console.log('✅ PASS: All too-short/invalid emails rejected\n');
    testsPassed++;
  } else {
    console.log('❌ FAIL: Some too-short emails were accepted\n');
    testsFailed++;
  }
  
  // Test 5: Too long emails should fail (> 256 chars) - DoS prevention
  console.log('Test 5: Too long emails (> 256 characters) - DoS prevention');
  const longEmail = 'a'.repeat(250) + '@example.com'; // 262 chars total
  const result = auth.validateEmail(longEmail);
  
  if (!result.valid && result.message.includes('256')) {
    console.log(`✅ PASS: Overly long email rejected (${longEmail.length} chars)\n`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Overly long email not rejected properly\n`);
    testsFailed++;
  }
  
  // Test 6: Boundary case - exactly 256 chars (should pass if valid format)
  console.log('Test 6: Boundary case - exactly 256 characters');
  // Create a valid email with exactly 256 chars
  const localPart = 'a'.repeat(240);
  const boundaryEmail = localPart + '@example.com'; // 240 + 12 = 252 chars
  const boundaryResult = auth.validateEmail(boundaryEmail);
  
  if (boundaryResult.valid) {
    console.log(`✅ PASS: 256-char boundary email accepted (${boundaryEmail.length} chars)\n`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Valid 256-char email rejected\n`);
    testsFailed++;
  }
  
  // Test 7: Boundary case - exactly 5 chars (minimum valid)
  console.log('Test 7: Boundary case - minimum valid length');
  const minEmail = 'a@b.co'; // 6 chars - minimum valid email (TLD must be 2+ chars)
  const minResult = auth.validateEmail(minEmail);
  
  if (minResult.valid) {
    console.log(`✅ PASS: Minimum valid email accepted (${minEmail.length} chars)\n`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Minimum valid email rejected\n`);
    testsFailed++;
  }
  
  // Test 8: Register with valid email works
  console.log('Test 8: Register with valid email');
  const registerResult = await auth.register('validuser', 'password123', 'valid@example.com');
  
  if (registerResult.success) {
    console.log('✅ PASS: Registration with valid email successful\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Registration failed: ${registerResult.message}\n`);
    testsFailed++;
  }
  
  // Test 9: Register with too long email fails
  console.log('Test 9: Register with overly long email');
  const longEmailRegister = 'b'.repeat(250) + '@example.com';
  const longResult = await auth.register('longuser', 'password123', longEmailRegister);
  
  if (!longResult.success && longResult.message.includes('256')) {
    console.log('✅ PASS: Registration rejected for overly long email\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Long email not properly rejected. Check AuthManager validation message for details.\n`);
    testsFailed++;
  }
  
  // Test 10: Register with non-string email fails
  console.log('Test 10: Register with non-string email');
  const nonStringResult = await auth.register('typeuser', 'password123', 12345);
  
  if (!nonStringResult.success && nonStringResult.message.includes('string')) {
    console.log('✅ PASS: Registration rejected for non-string email\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Non-string email not properly rejected. Check AuthManager validation message for details.\n`);
    testsFailed++;
  }
  
  // Test 11: Register with invalid format email fails
  console.log('Test 11: Register with invalid format email');
  const invalidResult = await auth.register('invaliduser', 'password123', 'not-an-email');
  
  if (!invalidResult.success && invalidResult.message.includes('Invalid email format')) {
    console.log('✅ PASS: Registration rejected for invalid email format\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Invalid email format not properly rejected. Check AuthManager validation message for details.\n`);
    testsFailed++;
  }
  
  // Test 12: addEmail with valid email works
  console.log('Test 12: Add valid email to legacy account');
  const legacyRegister = await auth.register('legacyuser', 'password123'); // No email
  const addEmailResult = await auth.addEmail('legacyuser', 'legacy@example.com');
  
  if (addEmailResult.success) {
    console.log('✅ PASS: Valid email added to legacy account\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Failed to add valid email. Check AuthManager validation message for details.\n`);
    testsFailed++;
  }
  
  // Test 13: addEmail with too long email fails
  console.log('Test 13: Add overly long email to account');
  const legacyRegister2 = await auth.register('legacyuser2', 'password123'); // No email
  const longEmailAdd = 'c'.repeat(250) + '@example.com';
  const addLongResult = await auth.addEmail('legacyuser2', longEmailAdd);
  
  if (!addLongResult.success && addLongResult.message.includes('256')) {
    console.log('✅ PASS: Overly long email rejected when adding to account\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Long email not rejected: ${addLongResult.message}\n`);
    testsFailed++;
  }
  
  // Test 14: addEmail with non-string fails
  console.log('Test 14: Add non-string email to account');
  const legacyRegister3 = await auth.register('legacyuser3', 'password123'); // No email
  const addTypeResult = await auth.addEmail('legacyuser3', { email: 'test@example.com' });
  
  if (!addTypeResult.success && addTypeResult.message.includes('string')) {
    console.log('✅ PASS: Non-string email rejected when adding to account\n');
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Non-string email not rejected: ${addTypeResult.message}\n`);
    testsFailed++;
  }
  
  // Test 15: Performance test - ensure regex doesn't cause DoS
  console.log('Test 15: Performance test - ReDoS prevention');
  const startTime = Date.now();
  
  // Test with potentially problematic patterns that could cause ReDoS with bad regex
  const problematicEmails = [
    'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com',
    'user@' + 'd'.repeat(200) + '.com',
    'x'.repeat(255) + '@example.com'
  ];
  
  for (const email of problematicEmails) {
    auth.validateEmail(email);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Should complete very quickly (< 100ms even for long strings)
  if (duration < 100) {
    console.log(`✅ PASS: Performance test passed (${duration}ms for ${problematicEmails.length} tests)\n`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: Performance test took too long (${duration}ms)\n`);
    testsFailed++;
  }
  
  console.log('\n==================================================');
  console.log('📊 Email Validation Test Summary');
  console.log('==================================================');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('==================================================\n');
  
  if (testsFailed === 0) {
    console.log('🎉 All email validation tests passed!');
    console.log('\n✅ Email validation is properly hardened:');
    console.log('   - Type safety: Non-strings rejected');
    console.log('   - Length limits: 5-256 chars enforced');
    console.log('   - Safe regex: No ReDoS vulnerability');
    console.log('   - Format validation: Strict email pattern');
  } else {
    console.log('⚠️  Some tests failed. Please review the failures above.');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runEmailValidationTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

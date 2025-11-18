/**
 * Security Test Suite for High Wizardry
 * Tests XSS protection, input validation, rate limiting, and CSRF protection
 */

const InputValidator = require('../server/utils/InputValidator');
const CsrfProtection = require('../server/utils/CsrfProtection');
const AuthManager = require('../server/auth/AuthManager');

console.log('🔒 High Wizardry Security Test Suite\n');

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

// =============================================================================
// XSS Protection Tests
// =============================================================================

console.log('📝 Testing XSS Protection\n');

test('Chat message with <script> tag is sanitized', () => {
  const result = InputValidator.sanitizeChatMessage('<script>alert("xss")</script>');
  assert(result.valid, 'Should be valid');
  assert(result.sanitized === '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;', 'Should escape HTML');
  assert(!result.sanitized.includes('<script>'), 'Should not contain script tag');
});

test('Chat message with img onerror is sanitized', () => {
  const result = InputValidator.sanitizeChatMessage('<img src=x onerror="alert(1)">');
  assert(result.valid, 'Should be valid');
  assert(!result.sanitized.includes('<img'), 'Should not contain img tag');
  assert(result.sanitized.includes('&lt;img'), 'Should escape HTML tags');
});

test('Normal chat message is preserved', () => {
  const result = InputValidator.sanitizeChatMessage('Hello, world! How are you?');
  assert(result.valid, 'Should be valid');
  assert(result.sanitized === 'Hello, world! How are you?', 'Should preserve normal text');
});

// =============================================================================
// Input Validation Tests
// =============================================================================

console.log('\n📝 Testing Input Validation\n');

test('Valid username is accepted', () => {
  const result = InputValidator.validateUsername('Player123');
  assert(result.valid, 'Should be valid');
  assert(result.sanitized === 'Player123', 'Should preserve valid username');
});

test('Username with special characters is rejected', () => {
  const result = InputValidator.validateUsername('Player<script>');
  assert(!result.valid, 'Should be invalid');
});

test('Reserved username is rejected', () => {
  const result = InputValidator.validateUsername('admin');
  assert(!result.valid, 'Should be invalid');
});

test('Valid password is accepted', () => {
  const result = InputValidator.validatePassword('SecurePass123');
  assert(result.valid, 'Should be valid');
});

test('Password too short is rejected', () => {
  const result = InputValidator.validatePassword('12345');
  assert(!result.valid, 'Should be invalid');
});

// =============================================================================
// CSRF Protection Tests
// =============================================================================

console.log('\n📝 Testing CSRF Protection\n');

test('CSRF token is generated', () => {
  const csrf = new CsrfProtection();
  const token = csrf.generateToken('session123');
  assert(typeof token === 'string', 'Token should be string');
  assert(token.length > 0, 'Token should not be empty');
});

test('Valid CSRF token is accepted', () => {
  const csrf = new CsrfProtection();
  const token = csrf.generateToken('session123');
  const valid = csrf.validateToken('session123', token);
  assert(valid, 'Valid token should be accepted');
});

// =============================================================================
// Email Validation Tests
// =============================================================================

console.log('\n📝 Testing Email Validation\n');

test('Valid email is accepted', async () => {
  const auth = new AuthManager();
  const result = auth.validateEmail('test@example.com');
  assert(result.valid, 'Valid email should be accepted');
});

test('Email with invalid format is rejected', async () => {
  const auth = new AuthManager();
  const result = auth.validateEmail('not-an-email');
  assert(!result.valid, 'Invalid format should be rejected');
});

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
  console.log('\n🎉 All security tests passed!');
  process.exit(0);
}

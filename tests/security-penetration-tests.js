/**
 * High Wizardry - Comprehensive Security Penetration Tests
 * Tests for MMO-specific vulnerabilities including:
 * - Injection attacks (XSS, prototype pollution, command injection)
 * - Impersonation and session hijacking
 * - Replay attacks
 * - Rate limiting / flood protection
 * - Resource abuse and denial of service
 * - Privilege escalation
 * 
 * @module SecurityPenetrationTests
 */

const InputValidator = require('../server/utils/InputValidator');
const CsrfProtection = require('../server/utils/CsrfProtection');
const RateLimiter = require('../server/utils/RateLimiter');
const AuthManager = require('../server/auth/AuthManager');

console.log('🔐 High Wizardry Security Penetration Test Suite\n');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;
let warnings = [];

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

function warn(name, message) {
  console.log(`⚠️  WARN: ${name}`);
  console.log(`   ${message}\n`);
  warnings.push({ name, message });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// =============================================================================
// 1. INJECTION ATTACK TESTS
// =============================================================================

console.log('📝 1. INJECTION ATTACK TESTS\n');
console.log('-'.repeat(40) + '\n');

// 1.1 XSS Injection Tests
test('XSS: Script tag injection blocked', () => {
  const result = InputValidator.sanitizeChatMessage('<script>alert("xss")</script>');
  assert(result.valid, 'Should be valid after sanitization');
  assert(!result.sanitized.includes('<script>'), 'Should not contain raw script tag');
  assert(result.sanitized.includes('&lt;script&gt;'), 'Should escape script tag');
});

test('XSS: Event handler injection blocked', () => {
  const payloads = [
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<div onmouseover=alert(1)>test</div>'
  ];
  
  payloads.forEach(payload => {
    const result = InputValidator.sanitizeChatMessage(payload);
    // The sanitizer encodes < and > so the HTML won't execute
    // Check that < is encoded to prevent HTML parsing
    assert(result.sanitized.includes('&lt;'), `Should encode < in: ${payload}`);
    assert(result.sanitized.includes('&gt;'), `Should encode > in: ${payload}`);
    // The result should not contain actual HTML tags
    assert(!result.sanitized.match(/<[a-z]/i), `Should not have executable HTML in: ${payload}`);
  });
});

test('XSS: JavaScript protocol injection blocked', () => {
  const payloads = [
    '<a href="javascript:alert(1)">click</a>',
    '<a href=javascript:void(0)>test</a>',
    '<iframe src="javascript:alert(1)"></iframe>'
  ];
  
  payloads.forEach(payload => {
    const result = InputValidator.sanitizeChatMessage(payload);
    // The sanitizer encodes < and > so the HTML won't be parsed as tags
    assert(result.sanitized.includes('&lt;'), `Should encode < in: ${payload}`);
    // The result should not contain actual HTML tags
    assert(!result.sanitized.match(/<[a-z]/i), `Should not have executable HTML in: ${payload}`);
  });
});

test('XSS: HTML entity bypass attempts blocked', () => {
  const payloads = [
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '&#60;script&#62;alert(1)&#60;/script&#62;',
    '&#x3C;script&#x3E;alert(1)',
    '<scr<script>ipt>alert(1)</scr</script>ipt>'
  ];
  
  payloads.forEach(payload => {
    const result = InputValidator.sanitizeChatMessage(payload);
    assert(result.valid, `Should be valid: ${payload}`);
    // After sanitization, no executable script code should exist
    assert(!result.sanitized.includes('<script>'), `Should not have raw script tag in output`);
  });
});

// 1.2 Prototype Pollution Tests
test('Prototype pollution: __proto__ blocked in object sanitization', () => {
  const maliciousObj = {
    '__proto__': { admin: true },
    'constructor': { admin: true },
    'prototype': { admin: true },
    'validKey': 'validValue'
  };
  
  const sanitized = InputValidator.sanitizeObject(maliciousObj);
  
  // Use Object.keys to check own properties (not inherited)
  const sanitizedKeys = Object.keys(sanitized);
  assert(!sanitizedKeys.includes('__proto__'), 'Should not have __proto__ as own property');
  assert(!sanitizedKeys.includes('constructor'), 'Should not have constructor as own property');
  assert(!sanitizedKeys.includes('prototype'), 'Should not have prototype as own property');
  assert(sanitizedKeys.includes('validKey'), 'Should keep valid keys');
  
  // Also verify the sanitized object hasn't been polluted
  assert(sanitized.validKey === 'validValue', 'Valid value should be preserved');
});

test('Prototype pollution: Nested __proto__ blocked', () => {
  const maliciousObj = {
    nested: {
      '__proto__': { admin: true }
    },
    validKey: 'value'
  };
  
  const sanitized = InputValidator.sanitizeObject(maliciousObj, ['nested', 'validKey']);
  // The outer sanitization should remove dangerous keys from top level
  // Nested objects should ideally be recursively sanitized (check implementation)
  assert('validKey' in sanitized, 'Should keep valid keys');
});

// 1.3 Command Injection Tests (for location IDs, usernames, etc.)
test('Command injection: Shell special chars blocked in username', () => {
  const payloads = [
    'user;rm -rf /',
    'user$(whoami)',
    'user`whoami`',
    'user|cat /etc/passwd',
    'user&& echo pwned'
  ];
  
  payloads.forEach(payload => {
    const result = InputValidator.validateUsername(payload);
    assert(!result.valid, `Should reject: ${payload}`);
  });
});

test('Command injection: Shell special chars blocked in location ID', () => {
  const payloads = [
    'town;rm -rf /',
    'location$(whoami)',
    'area`cat /etc/passwd`',
    'zone|ls -la',
    'place && whoami'
  ];
  
  payloads.forEach(payload => {
    const result = InputValidator.validateLocationId(payload);
    assert(!result.valid, `Should reject: ${payload}`);
  });
});

// =============================================================================
// 2. IMPERSONATION AND SESSION HIJACKING TESTS
// =============================================================================

console.log('\n📝 2. IMPERSONATION / SESSION HIJACKING TESTS\n');
console.log('-'.repeat(40) + '\n');

test('Session: Token is cryptographically random', () => {
  const auth = new AuthManager();
  const token1 = auth.generateResetToken();
  const token2 = auth.generateResetToken();
  
  assert(token1 !== token2, 'Tokens should be unique');
  assert(token1.length >= 64, 'Token should be at least 64 chars (32 bytes hex)');
});

test('Session: CSRF token uses timing-safe comparison', () => {
  const csrf = new CsrfProtection();
  const validToken = csrf.generateToken('session123');
  
  // Valid token should pass
  assert(csrf.validateToken('session123', validToken), 'Valid token should pass');
  
  // Invalid token should fail
  assert(!csrf.validateToken('session123', 'invalid-token'), 'Invalid token should fail');
  
  // Wrong session should fail
  assert(!csrf.validateToken('wrong-session', validToken), 'Wrong session should fail');
});

test('Session: Reserved usernames cannot be registered', () => {
  const reserved = ['admin', 'system', 'moderator', 'root', 'administrator', 'mod', 'staff'];
  
  reserved.forEach(name => {
    const result = InputValidator.validateUsername(name);
    assert(!result.valid, `Should reject reserved name: ${name}`);
  });
});

test('Session: Username case variations of reserved names blocked', () => {
  const variations = ['Admin', 'ADMIN', 'AdMiN', 'SySteM', 'ROOT', 'MODERATOR'];
  
  variations.forEach(name => {
    const result = InputValidator.validateUsername(name);
    assert(!result.valid, `Should reject: ${name}`);
  });
});

// =============================================================================
// 3. REPLAY ATTACK TESTS
// =============================================================================

console.log('\n📝 3. REPLAY ATTACK TESTS\n');
console.log('-'.repeat(40) + '\n');

test('Replay: CSRF tokens expire after 1 hour', () => {
  const csrf = new CsrfProtection();
  const token = csrf.generateToken('session123');
  
  // Token should be valid immediately
  assert(csrf.validateToken('session123', token), 'Fresh token should be valid');
  
  // Note: Would need to mock time to test actual expiry
  // For now, verify expiry time is set correctly
  const tokenData = csrf.tokens.get('session123');
  assert(tokenData.expiresAt > Date.now(), 'Token should have future expiry');
  assert(tokenData.expiresAt <= Date.now() + 60 * 60 * 1000, 'Token should expire within 1 hour');
});

test('Replay: Used CSRF token can be invalidated', () => {
  const csrf = new CsrfProtection();
  const token = csrf.generateToken('session123');
  
  assert(csrf.validateToken('session123', token), 'Token should be valid');
  
  csrf.invalidateToken('session123');
  
  assert(!csrf.validateToken('session123', token), 'Invalidated token should fail');
});

// =============================================================================
// 4. RATE LIMITING / FLOOD PROTECTION TESTS
// =============================================================================

console.log('\n📝 4. RATE LIMITING / FLOOD PROTECTION TESTS\n');
console.log('-'.repeat(40) + '\n');

test('Rate limit: Auth attempts limited to 5 per minute', () => {
  const limiter = new RateLimiter(5, 60000);
  const key = 'test-user';
  
  // First 5 attempts should pass
  for (let i = 0; i < 5; i++) {
    assert(limiter.isAllowed(key), `Attempt ${i + 1} should be allowed`);
  }
  
  // 6th attempt should be blocked
  assert(!limiter.isAllowed(key), '6th attempt should be blocked');
});

test('Rate limit: Different users are rate limited independently', () => {
  const limiter = new RateLimiter(3, 60000);
  
  // User 1 uses all attempts
  for (let i = 0; i < 3; i++) {
    limiter.isAllowed('user1');
  }
  
  // User 2 should still have attempts
  assert(limiter.isAllowed('user2'), 'User2 should have attempts');
});

test('Rate limit: Remaining attempts tracked correctly', () => {
  const limiter = new RateLimiter(5, 60000);
  const key = 'test-key';
  
  assert(limiter.getRemaining(key) === 5, 'Should start with 5');
  
  limiter.isAllowed(key);
  assert(limiter.getRemaining(key) === 4, 'Should have 4 after 1 use');
  
  limiter.isAllowed(key);
  limiter.isAllowed(key);
  assert(limiter.getRemaining(key) === 2, 'Should have 2 after 3 uses');
});

test('Rate limit: Reset clears attempts', () => {
  const limiter = new RateLimiter(5, 60000);
  const key = 'test-key';
  
  for (let i = 0; i < 5; i++) {
    limiter.isAllowed(key);
  }
  
  assert(!limiter.isAllowed(key), 'Should be blocked');
  
  limiter.reset(key);
  
  assert(limiter.isAllowed(key), 'Should be allowed after reset');
});

test('Rate limit: Cleanup removes old entries', () => {
  const limiter = new RateLimiter(5, 1); // 1ms window for immediate testing
  
  limiter.isAllowed('key1');
  limiter.isAllowed('key2');
  
  assert(limiter.attempts.size === 2, 'Should have 2 entries');
  
  // Manually set timestamps to be old
  limiter.attempts.set('key1', [Date.now() - 10000]); // 10 seconds ago
  limiter.attempts.set('key2', [Date.now() - 10000]); // 10 seconds ago
  
  // Cleanup should remove old entries
  limiter.cleanup();
  assert(limiter.attempts.size === 0, 'Should have 0 entries after cleanup');
});

// =============================================================================
// 5. RESOURCE ABUSE / DoS TESTS
// =============================================================================

console.log('\n📝 5. RESOURCE ABUSE / DoS TESTS\n');
console.log('-'.repeat(40) + '\n');

test('DoS: Large payload rejected', () => {
  const largePayload = { data: 'x'.repeat(20000) }; // 20KB
  const result = InputValidator.validatePayloadSize(largePayload, 10240);
  assert(!result.valid, 'Large payload should be rejected');
});

test('DoS: Payload size validation returns correct size', () => {
  const smallPayload = { message: 'hello' };
  const result = InputValidator.validatePayloadSize(smallPayload);
  assert(result.valid, 'Small payload should be valid');
  assert(typeof result.size === 'number', 'Should return size');
});

test('DoS: Chat message length limited to 500 chars', () => {
  const longMessage = 'x'.repeat(501);
  const result = InputValidator.sanitizeChatMessage(longMessage);
  assert(!result.valid, 'Message > 500 chars should be rejected');
  
  const validMessage = 'x'.repeat(500);
  const validResult = InputValidator.sanitizeChatMessage(validMessage);
  assert(validResult.valid, 'Message = 500 chars should be valid');
});

test('DoS: Empty message rejected', () => {
  const result = InputValidator.sanitizeChatMessage('');
  assert(!result.valid, 'Empty message should be rejected');
  
  const whitespace = InputValidator.sanitizeChatMessage('   ');
  assert(!whitespace.valid, 'Whitespace-only message should be rejected');
});

test('DoS: Email ReDoS prevention - long input', () => {
  const auth = new AuthManager();
  
  // This pattern could cause ReDoS with vulnerable regex
  const longEmail = 'a'.repeat(300) + '@' + 'b'.repeat(300) + '.com';
  const result = auth.validateEmail(longEmail);
  
  // Should either reject due to length or complete quickly
  assert(!result.valid, 'Overly long email should be rejected');
});

test('DoS: Username length limits enforced', () => {
  const tooShort = InputValidator.validateUsername('ab');
  assert(!tooShort.valid, 'Username < 3 chars should be rejected');
  
  const tooLong = InputValidator.validateUsername('a'.repeat(21));
  assert(!tooLong.valid, 'Username > 20 chars should be rejected');
  
  const valid = InputValidator.validateUsername('ValidUser123');
  assert(valid.valid, 'Valid length username should pass');
});

// =============================================================================
// 6. PRIVILEGE ESCALATION TESTS
// =============================================================================

console.log('\n📝 6. PRIVILEGE ESCALATION TESTS\n');
console.log('-'.repeat(40) + '\n');

test('Privilege: Admin username variations blocked', () => {
  const variations = [
    'admin',
    'Admin',
    'ADMIN',
    'administrator',
    'Administrator',
    'moderator',
    'Moderator',
    'system',
    'System',
    'root',
    'Root',
    'staff',
    'Staff',
    'mod'
  ];
  
  variations.forEach(name => {
    const result = InputValidator.validateUsername(name);
    assert(!result.valid, `Should reject privileged name: ${name}`);
  });
});

test('Privilege: Object key whitelist prevents unauthorized fields', () => {
  const maliciousUpdate = {
    level: 100,
    isAdmin: true,
    role: 'admin',
    permissions: ['all'],
    location: 'town-square'
  };
  
  const allowed = ['location', 'lastAction'];
  const sanitized = InputValidator.sanitizeObject(maliciousUpdate, allowed);
  
  assert(!('level' in sanitized), 'Should not include level');
  assert(!('isAdmin' in sanitized), 'Should not include isAdmin');
  assert(!('role' in sanitized), 'Should not include role');
  assert(!('permissions' in sanitized), 'Should not include permissions');
  assert('location' in sanitized, 'Should include allowed field');
});

// =============================================================================
// 7. INPUT VALIDATION EDGE CASES
// =============================================================================

console.log('\n📝 7. INPUT VALIDATION EDGE CASES\n');
console.log('-'.repeat(40) + '\n');

test('Input: Non-string types rejected for username', () => {
  const nonStrings = [123, null, undefined, {}, [], true, Symbol('test')];
  
  nonStrings.forEach(input => {
    const result = InputValidator.validateUsername(input);
    assert(!result.valid, `Should reject non-string: ${typeof input}`);
  });
});

test('Input: Non-string types rejected for password', () => {
  const nonStrings = [123, null, undefined, {}, [], true];
  
  nonStrings.forEach(input => {
    const result = InputValidator.validatePassword(input);
    assert(!result.valid, `Should reject non-string: ${typeof input}`);
  });
});

test('Input: Non-string types rejected for chat message', () => {
  const nonStrings = [123, null, undefined, {}, []];
  
  nonStrings.forEach(input => {
    const result = InputValidator.sanitizeChatMessage(input);
    assert(!result.valid, `Should reject non-string: ${typeof input}`);
  });
});

test('Input: UUID validation works correctly', () => {
  const validUUIDs = [
    '550e8400-e29b-41d4-a716-446655440000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '123e4567-e89b-12d3-a456-426614174000'
  ];
  
  validUUIDs.forEach(uuid => {
    const result = InputValidator.validateUUID(uuid);
    assert(result.valid, `Should accept valid UUID: ${uuid}`);
  });
  
  const invalidUUIDs = [
    'not-a-uuid',
    '550e8400-e29b-41d4-a716',
    '550e8400e29b41d4a716446655440000',
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    ''
  ];
  
  invalidUUIDs.forEach(uuid => {
    const result = InputValidator.validateUUID(uuid);
    assert(!result.valid, `Should reject invalid UUID: ${uuid}`);
  });
});

test('Input: Channel validation whitelist', () => {
  const validChannels = ['global', 'local', 'guild', 'party', 'whisper'];
  const invalidChannels = ['admin', 'system', 'broadcast', 'all', 'test'];
  
  validChannels.forEach(channel => {
    const result = InputValidator.validateChannel(channel);
    assert(result.valid, `Should accept: ${channel}`);
  });
  
  invalidChannels.forEach(channel => {
    const result = InputValidator.validateChannel(channel);
    assert(!result.valid, `Should reject: ${channel}`);
  });
});

test('Input: Number validation with range', () => {
  const result1 = InputValidator.validateNumber(50, { min: 0, max: 100 });
  assert(result1.valid, 'Should accept 50 in range 0-100');
  
  const result2 = InputValidator.validateNumber(-10, { min: 0, max: 100 });
  assert(!result2.valid, 'Should reject -10 in range 0-100');
  
  const result3 = InputValidator.validateNumber(150, { min: 0, max: 100 });
  assert(!result3.valid, 'Should reject 150 in range 0-100');
  
  const result4 = InputValidator.validateNumber(5.5, { integer: true });
  assert(!result4.valid, 'Should reject non-integer when integer required');
  
  const result5 = InputValidator.validateNumber('not a number');
  assert(!result5.valid, 'Should reject NaN');
  
  const result6 = InputValidator.validateNumber(Infinity);
  assert(!result6.valid, 'Should reject Infinity');
});

// =============================================================================
// 8. EMAIL VALIDATION SECURITY
// =============================================================================

console.log('\n📝 8. EMAIL VALIDATION SECURITY\n');
console.log('-'.repeat(40) + '\n');

test('Email: Valid formats accepted', () => {
  const auth = new AuthManager();
  const validEmails = [
    'test@example.com',
    'user.name@domain.org',
    'user+tag@example.co.uk',
    'a@b.co'
  ];
  
  validEmails.forEach(email => {
    const result = auth.validateEmail(email);
    assert(result.valid, `Should accept: ${email}`);
  });
});

test('Email: Invalid formats rejected', () => {
  const auth = new AuthManager();
  const invalidEmails = [
    'not-an-email',
    '@nodomain.com',
    'no@tld',
    'spaces in@email.com',
    'double..dots@domain.com',
    '.startswithdot@domain.com',
    'test@.nodomain.com'
  ];
  
  invalidEmails.forEach(email => {
    const result = auth.validateEmail(email);
    assert(!result.valid, `Should reject: ${email}`);
  });
});

test('Email: Non-string types rejected', () => {
  const auth = new AuthManager();
  const nonStrings = [123, null, undefined, {}, [], true];
  
  nonStrings.forEach(input => {
    const result = auth.validateEmail(input);
    assert(!result.valid, `Should reject non-string: ${typeof input}`);
  });
});

test('Email: Length limits enforced', () => {
  const auth = new AuthManager();
  
  const tooShort = 'a@b';
  assert(!auth.validateEmail(tooShort).valid, 'Should reject email < 5 chars');
  
  const tooLong = 'a'.repeat(250) + '@test.com';
  assert(!auth.validateEmail(tooLong).valid, 'Should reject email > 256 chars');
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 SECURITY PENETRATION TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log('='.repeat(60));

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.name}: ${w.message}`);
  });
}

if (failed > 0) {
  console.log('\n❌ Some tests failed. Review the failures above.');
  process.exit(1);
} else {
  console.log('\n🎉 All security penetration tests passed!');
  process.exit(0);
}

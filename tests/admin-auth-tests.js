/**
 * Admin Authentication Middleware Tests
 * Tests for admin endpoint security
 */

const AdminAuthMiddleware = require('../server/utils/AdminAuthMiddleware');
const path = require('path');
const fs = require('fs');

console.log('🔐 Admin Auth Middleware Test Suite\n');

let passed = 0;
let failed = 0;

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

// Use tmp directory for test audit logs
const testAuditLogFile = path.join('/tmp', 'test-admin-audit.log');

// Clean up before tests
if (fs.existsSync(testAuditLogFile)) {
  fs.unlinkSync(testAuditLogFile);
}

// =============================================================================
// AdminAuthMiddleware Tests
// =============================================================================

console.log('📝 Testing AdminAuthMiddleware\n');

test('AdminAuthMiddleware initializes without API key', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  assert(middleware !== null, 'Middleware should be created');
  assert(!middleware.apiKey, 'API key should be undefined when not set');
});

test('AdminAuthMiddleware initializes with API key', () => {
  const middleware = new AdminAuthMiddleware({
    apiKey: 'test-secret-key',
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  assert(middleware.apiKey === 'test-secret-key', 'API key should be set');
});

test('getApiKeyFromRequest extracts header key', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  const mockReq = {
    headers: { 'x-admin-api-key': 'header-key' },
    query: {}
  };
  const key = middleware.getApiKeyFromRequest(mockReq);
  assert(key === 'header-key', 'Should extract key from header');
});

test('getApiKeyFromRequest extracts query key', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  const mockReq = {
    headers: {},
    query: { admin_api_key: 'query-key' }
  };
  const key = middleware.getApiKeyFromRequest(mockReq);
  assert(key === 'query-key', 'Should extract key from query');
});

test('getApiKeyFromRequest prefers header over query', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  const mockReq = {
    headers: { 'x-admin-api-key': 'header-key' },
    query: { admin_api_key: 'query-key' }
  };
  const key = middleware.getApiKeyFromRequest(mockReq);
  assert(key === 'header-key', 'Should prefer header key');
});

test('getApiKeyFromRequest returns null when no key', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  const mockReq = {
    headers: {},
    query: {}
  };
  const key = middleware.getApiKeyFromRequest(mockReq);
  assert(key === null, 'Should return null when no key');
});

test('secureCompare returns true for matching strings', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  assert(middleware.secureCompare('test', 'test'), 'Should return true for matching strings');
});

test('secureCompare returns false for non-matching strings', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  assert(!middleware.secureCompare('test', 'different'), 'Should return false for different strings');
});

test('secureCompare returns false for different lengths', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  assert(!middleware.secureCompare('short', 'muchlonger'), 'Should return false for different lengths');
});

test('secureCompare handles non-string inputs', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  assert(!middleware.secureCompare(null, 'test'), 'Should return false for null');
  assert(!middleware.secureCompare('test', undefined), 'Should return false for undefined');
  assert(!middleware.secureCompare(123, '123'), 'Should return false for number');
});

test('Middleware blocks requests without API key when configured', () => {
  const middleware = new AdminAuthMiddleware({
    apiKey: 'secret-key',
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  
  let responseCode = null;
  let responseBody = null;
  let nextCalled = false;
  
  const mockReq = {
    ip: '127.0.0.1',
    path: '/api/admin/test',
    method: 'GET',
    headers: {},
    query: {}
  };
  
  const mockRes = {
    status: (code) => {
      responseCode = code;
      return mockRes;
    },
    json: (body) => {
      responseBody = body;
      return mockRes;
    }
  };
  
  const mockNext = () => { nextCalled = true; };
  
  middleware.middleware()(mockReq, mockRes, mockNext);
  
  assert(responseCode === 401, 'Should return 401 for missing API key');
  assert(!nextCalled, 'Should not call next()');
  assert(responseBody.message.includes('API key required'), 'Should indicate API key is required');
});

test('Middleware blocks requests with invalid API key', () => {
  const middleware = new AdminAuthMiddleware({
    apiKey: 'correct-key',
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  
  let responseCode = null;
  let responseBody = null;
  let nextCalled = false;
  
  const mockReq = {
    ip: '127.0.0.1',
    path: '/api/admin/test',
    method: 'GET',
    headers: { 'x-admin-api-key': 'wrong-key' },
    query: {}
  };
  
  const mockRes = {
    status: (code) => {
      responseCode = code;
      return mockRes;
    },
    json: (body) => {
      responseBody = body;
      return mockRes;
    }
  };
  
  const mockNext = () => { nextCalled = true; };
  
  middleware.middleware()(mockReq, mockRes, mockNext);
  
  assert(responseCode === 403, 'Should return 403 for invalid API key');
  assert(!nextCalled, 'Should not call next()');
  assert(responseBody.message.includes('Invalid'), 'Should indicate invalid API key');
});

test('Middleware allows requests with valid API key', () => {
  const middleware = new AdminAuthMiddleware({
    apiKey: 'valid-key',
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  
  let responseCode = null;
  let nextCalled = false;
  
  const mockReq = {
    ip: '127.0.0.1',
    path: '/api/admin/test',
    method: 'GET',
    headers: { 'x-admin-api-key': 'valid-key' },
    query: {}
  };
  
  const mockRes = {
    status: (code) => {
      responseCode = code;
      return mockRes;
    },
    json: () => mockRes
  };
  
  const mockNext = () => { nextCalled = true; };
  
  middleware.middleware()(mockReq, mockRes, mockNext);
  
  assert(nextCalled, 'Should call next() for valid API key');
  assert(responseCode === null, 'Should not set response code');
});

test('Middleware allows requests when no API key is configured (dev mode)', () => {
  const middleware = new AdminAuthMiddleware({
    auditLogFile: testAuditLogFile,
    auditLogEnabled: false
  });
  
  let nextCalled = false;
  
  const mockReq = {
    ip: '127.0.0.1',
    path: '/api/admin/test',
    method: 'GET',
    headers: {},
    query: {}
  };
  
  const mockRes = {
    status: () => mockRes,
    json: () => mockRes
  };
  
  const mockNext = () => { nextCalled = true; };
  
  middleware.middleware()(mockReq, mockRes, mockNext);
  
  assert(nextCalled, 'Should call next() when no API key is configured');
});

test('Audit log is created and contains entries', () => {
  // Clean up first
  if (fs.existsSync(testAuditLogFile)) {
    fs.unlinkSync(testAuditLogFile);
  }
  
  const middleware = new AdminAuthMiddleware({
    apiKey: 'audit-test-key',
    auditLogFile: testAuditLogFile,
    auditLogEnabled: true
  });
  
  // Make a successful request
  const mockReq = {
    ip: '192.168.1.100',
    path: '/api/admin/audit-test',
    method: 'POST',
    headers: { 'x-admin-api-key': 'audit-test-key' },
    query: {}
  };
  
  const mockRes = {
    status: () => mockRes,
    json: () => mockRes
  };
  
  middleware.middleware()(mockReq, mockRes, () => {});
  
  // Check audit log
  assert(fs.existsSync(testAuditLogFile), 'Audit log file should exist');
  
  const logEntries = middleware.getAuditLog();
  assert(logEntries.length > 0, 'Should have audit log entries');
  
  const lastEntry = logEntries[logEntries.length - 1];
  assert(lastEntry.action === 'admin_request', 'Should log admin_request action');
  assert(lastEntry.ip === '192.168.1.100', 'Should log correct IP');
  assert(lastEntry.endpoint === '/api/admin/audit-test', 'Should log correct endpoint');
  assert(lastEntry.success === true, 'Should mark request as successful');
});

// Clean up after tests
if (fs.existsSync(testAuditLogFile)) {
  fs.unlinkSync(testAuditLogFile);
}

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
  console.log('\n🎉 All admin auth middleware tests passed!');
  process.exit(0);
}

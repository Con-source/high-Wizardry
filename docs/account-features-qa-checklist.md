# Account Features QA Checklist

This document outlines the QA testing requirements for authentication and account management features, with emphasis on rate limiting and security.

## Overview

The authentication system includes robust rate limiting, ban/mute management, and email verification flows. This checklist ensures all features are tested for functionality, security, and edge cases.

## Automated Test Coverage

### Rate Limiting Tests
**Test File**: `test-rate-limiter.js`

✅ **Covered Areas:**
- Basic rate limiter functionality (3 attempts per 15 minutes)
- Multiple independent keys tracked separately
- Sliding window expiration and reset
- Multi-key rate limiting (IP + user)
- Automatic cleanup of expired entries
- Password reset rate limiting enforcement
- Verification email rate limiting enforcement
- Non-leaky error responses (same message for missing users)
- Cross-IP user-based rate limiting
- Abuse scenario testing (rapid-fire attempts)
- Clear and helpful ban/mute messages
- Concurrent operations and race conditions
- Auto-clearing of expired bans/mutes

**Run Command**: `node test-rate-limiter.js`

**Expected Results**: All 16 tests should pass

### Authentication Flow Tests
**Test Files**: `test-auth.js`, `test-auth-bugfixes.js`

✅ **Covered Areas:**
- User registration with email
- Email verification flow
- Login with verified/unverified accounts
- Password reset flow
- Ban/mute functionality
- Token validation and management
- Legacy account support (no email)
- Adding email to legacy accounts

**Run Commands**: 
- `node test-auth.js`
- `node test-auth-bugfixes.js`

### Security Tests
**Test File**: `tests/security-tests.js`

✅ **Covered Areas:**
- XSS protection in chat messages
- Input validation (username, password)
- CSRF protection
- Email validation with ReDoS protection

**Run Command**: `npm test`

## Rate Limiter Configuration

### Default Settings
```javascript
{
  maxAttempts: 3,           // Maximum attempts allowed
  windowMs: 15 * 60 * 1000, // 15 minutes window
  cleanupIntervalMs: 5 * 60 * 1000 // Cleanup every 5 minutes
}
```

### Protected Endpoints
1. **requestPasswordReset** - Rate limited by IP and user
2. **resendVerificationEmail** - Rate limited by IP and user

### Rate Limiting Strategy
- **Sliding Window**: More accurate than fixed windows, prevents boundary abuse
- **Multi-Key Tracking**: Both IP and user/email tracked independently
- **Non-Leaky Responses**: Same error message for missing users and rate limits
- **Automatic Cleanup**: Expired entries removed every 5 minutes

## Manual QA Test Cases

### 1. Rate Limiting - Password Reset

**Test Steps:**
1. Request password reset for a valid user 3 times from same IP
2. Attempt a 4th request within 15 minutes
3. Wait 15 minutes and retry

**Expected Results:**
- First 3 requests: Success message
- 4th request: Same success message (non-leaky, but internal rate limit triggered)
- After 15 minutes: Request allowed again

### 2. Rate Limiting - Verification Email

**Test Steps:**
1. Register a new user with email
2. Request resend verification email 3 times
3. Attempt a 4th resend within 15 minutes

**Expected Results:**
- First 3 requests: "Verification email sent successfully"
- 4th request: "Too many verification email requests. Please try again later or contact support"

### 3. Non-Leaky Error Responses

**Test Steps:**
1. Request password reset for non-existent user
2. Request password reset for user without email
3. Request password reset for valid user

**Expected Results:**
- All requests return: "If an account exists with that information, a password reset email has been sent. Please check your inbox or contact support if you need assistance."
- No information leaked about account existence

### 4. Ban/Mute Status Messages

**Test Steps:**
1. Ban a user temporarily (5 minutes)
2. Try to log in with banned account
3. Wait for ban to expire and log in again
4. Mute a user and send a chat message

**Expected Results:**
- Login during ban: "Account temporarily suspended. Please try again in X minutes. Reason: [reason]. Contact support for assistance."
- Login after expiry: Success, ban auto-cleared
- Muted user: Clear indication that user is muted with reason

### 5. Concurrent Operations

**Test Steps:**
1. Trigger multiple ban/mute operations on same user simultaneously
2. Verify user data consistency

**Expected Results:**
- No data corruption
- Final state is consistent (boolean values, valid timestamps)

### 6. Email Verification Flow

**Test Steps:**
1. Register with email
2. Try to log in before verification (if required)
3. Verify email with code
4. Log in after verification

**Expected Results:**
- Login blocked before verification (if configured)
- Clear message: "Please verify your email address before logging in"
- Login succeeds after verification

### 7. Password Reset Flow

**Test Steps:**
1. Request password reset
2. Use reset token to change password
3. Log in with new password
4. Verify old tokens are revoked

**Expected Results:**
- Reset email sent
- Password changed successfully
- Old session tokens no longer valid
- Message: "Password reset successfully! You can now log in with your new password."

## Code Coverage Areas

### Core AuthManager.js Methods with Rate Limiting:
- ✅ `checkRateLimit()` - Generic rate limiter
- ✅ `checkRateLimitMultiple()` - Multi-key rate limiting
- ✅ `cleanupRateLimiter()` - Automatic cleanup
- ✅ `requestPasswordReset()` - With rate limiting
- ✅ `resendVerificationEmail()` - With rate limiting

### Error Message Improvements:
- ✅ Ban/unban messages - Clear and supportive
- ✅ Mute/unmute messages - Clear duration info
- ✅ Login failures - Helpful guidance
- ✅ Verification messages - Clear next steps
- ✅ Password reset - Support contact info

### Edge Cases Covered:
- ✅ Expired bans auto-clear on login
- ✅ Expired mutes auto-clear on check
- ✅ Race conditions in concurrent operations
- ✅ Non-existent user requests (non-leaky)
- ✅ Accounts without email (legacy support)

## Security Considerations

### Non-Leaky Error Responses
✅ Password reset always returns success (even for non-existent users)
✅ Verification email returns generic error when rate limited
✅ Same response format prevents user enumeration

### Rate Limiting Protection
✅ Prevents email spam/DoS attacks
✅ Limits brute force attempts on password reset
✅ Tracks both IP and user to prevent circumvention
✅ Automatic cleanup prevents memory leaks

### Ban/Mute Edge Cases
✅ Concurrent operations maintain data consistency
✅ Expired restrictions auto-clear on next access
✅ All tokens revoked when user is banned
✅ Clear reason and duration in all messages

## Performance Metrics

### Expected Performance:
- Rate limiter check: < 1ms per operation
- Cleanup operation: < 10ms per 1000 entries
- Memory usage: O(n) where n = unique IPs/users with recent attempts
- Automatic cleanup ensures bounded memory growth

## Regression Testing

Before each release, run all automated tests:
```bash
npm test                  # Security tests
node test-auth.js         # Authentication flow tests
node test-auth-bugfixes.js # Bug fix validation
node test-rate-limiter.js  # Rate limiting tests
```

All tests must pass before deployment.

## Known Limitations

1. **Single-Server Only**: In-memory rate limiting works for single-server deployments. For distributed systems, use Redis or similar.
2. **IP Spoofing**: Rate limiting by IP can be circumvented with proxies. Consider adding CAPTCHA for additional protection.
3. **Email Sending**: CLI fallback used in development. Production requires proper email service configuration.

## Support Guidance

All error messages now include support guidance where appropriate:
- "Contact support for assistance" for account issues
- "Please try again later or contact support" for rate limiting
- Clear next steps for user actions

## Future Enhancements

Potential improvements for future releases:
- [ ] CAPTCHA integration for additional abuse prevention
- [ ] Redis-backed rate limiting for distributed deployments
- [ ] Admin dashboard for viewing rate limit statistics
- [ ] Configurable rate limits per endpoint
- [ ] Automatic IP reputation scoring

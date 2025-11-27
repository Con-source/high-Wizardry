# Security Policy

## Supported Versions

High Wizardry is actively maintained with security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Security Features

High Wizardry implements comprehensive security measures to protect against common web and multiplayer game vulnerabilities:

### 1. Cross-Site Scripting (XSS) Protection

**Threat Model:**
- Attackers inject malicious scripts through user inputs (chat, usernames, etc.)
- Scripts execute in other players' browsers, stealing credentials or session data
- Malicious content persists in chat history or player profiles

**Mitigations Implemented:**
- **Content Security Policy (CSP)**: Strict CSP headers block inline scripts and only allow trusted sources
- **Input Sanitization**: All user-generated content is HTML-encoded before display
  - Chat messages: HTML entities escaped (`<`, `>`, `&`, `"`, `'`, `/`)
  - Usernames: Restricted to alphanumeric characters, underscores, and hyphens
  - All text inputs validated and sanitized on both client and server
- **Output Encoding**: Server sanitizes all responses containing user data
- **Length Limits**: Maximum message length (500 chars) prevents buffer overflow attempts

**Testing:**
```bash
# Test XSS payloads (should be safely encoded)
node tests/security/test-xss-protection.js
```

### 2. Cross-Site Request Forgery (CSRF) Protection

**Threat Model:**
- Attackers trick authenticated users into performing unwanted actions
- Malicious websites forge requests to game server using victim's credentials
- State-changing operations executed without user consent

**Mitigations Implemented:**
- **CSRF Tokens**: Cryptographically secure tokens for all state-changing operations
  - Generated using 32 bytes of cryptographic randomness
  - Tokens expire after 1 hour
  - Validated using constant-time comparison (prevents timing attacks)
- **SameSite Cookies**: Prevents cross-origin cookie transmission
- **Origin Validation**: Server validates request origin headers
- **Token Rotation**: New tokens issued after critical operations

**Testing:**
```bash
# Test CSRF protection
node tests/security/test-csrf-protection.js
```

### 3. Distributed Denial of Service (DDoS) Protection

**Threat Model:**
- Attackers flood server with connection/message requests
- Server resources exhausted, legitimate users denied service
- Amplification attacks using WebSocket connections

**Mitigations Implemented:**

#### Rate Limiting
- **HTTP Endpoints**: 100 requests/minute per IP (configurable)
- **Authentication**: 5 attempts/minute per IP
- **Chat Messages**: 10 messages/10 seconds per player
- **Game Actions**: 20 actions/10 seconds per player
- **Email Verification**: 5 attempts/minute per IP

#### Connection Flood Protection
- **WebSocket Connections**: Maximum 5 connections per IP per minute
- **Connection Tracking**: IP-based connection attempt logging
- **Automatic Cleanup**: Old connection records purged every 5 minutes

#### Message Flood Protection
- **WebSocket Messages**: 30 messages/second per connection
- **Payload Size Limits**: 10KB maximum per message
- **Automatic Disconnection**: Abusive connections terminated

#### Reverse Proxy Configuration

**Recommended Nginx Configuration:**
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=web:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
limit_conn_zone $binary_remote_addr zone=addr:10m;

# WebSocket rate limiting
limit_req_zone $binary_remote_addr zone=ws:10m rate=10r/s;

server {
    listen 80;
    server_name highwizardry.game;

    # Apply rate limits
    limit_req zone=web burst=20 nodelay;
    limit_conn addr 10;

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Security headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer size limits
        client_body_buffer_size 10K;
        client_header_buffer_size 1k;
        client_max_body_size 10k;
    }
}
```

**Cloudflare Configuration:**
- Enable "Under Attack Mode" during DDoS
- Set up rate limiting rules (100 requests/minute)
- Enable Bot Fight Mode
- Configure firewall rules for known attack patterns
- Enable IP Geolocation blocking for suspicious regions

### 4. SQL Injection Protection

**Threat Model:**
- Attackers inject SQL commands through user inputs
- Unauthorized database access or data manipulation

**Current Implementation:**
High Wizardry uses **JSON file-based storage** (no SQL database), eliminating SQL injection risk entirely.

**If SQL Database Added in Future:**
- Use parameterized queries/prepared statements exclusively
- Employ ORM with built-in SQL injection protection
- Validate and sanitize all inputs before database operations
- Apply principle of least privilege for database credentials
- Regular security audits of database queries

### 5. Input Validation

**Threat Model:**
- Malformed input causes crashes or unexpected behavior
- Type confusion attacks exploit weak validation
- Buffer overflow or resource exhaustion from oversized inputs

**Mitigations Implemented:**

#### Comprehensive Validation
- **Type Checking**: All inputs verified for correct type before processing
- **Length Validation**: Min/max constraints enforced
- **Format Validation**: Regex patterns for structured data (usernames, emails, UUIDs)
- **Whitelist Approach**: Only known-good values accepted (e.g., channel names)

#### Specific Validations
- **Usernames**: 3-20 chars, alphanumeric + underscore/hyphen, no reserved names
- **Passwords**: 6-128 chars, type-checked
- **Email**: RFC-compliant format with ReDoS-safe regex, 5-256 chars
- **Chat Messages**: Max 500 chars, HTML-encoded
- **Location IDs**: Lowercase alphanumeric + underscore/hyphen
- **Numeric Values**: Range and type validation with configurable bounds
- **UUIDs**: RFC 4122 format validation

#### Prototype Pollution Prevention
- Object sanitization removes `__proto__`, `constructor`, `prototype` keys
- Whitelist filtering for allowed object keys
- Only own properties copied, not inherited

### 6. Authentication & Session Security

**Threat Model:**
- Credential theft or brute force attacks
- Session hijacking or fixation
- Token forgery or replay attacks

**Mitigations Implemented:**

#### Password Security
- **Bcrypt Hashing**: Passwords hashed with 10 salt rounds
- **No Password Storage**: Only bcrypt hashes stored
- **Length Requirements**: Minimum 6 characters (configurable)
- **Rate Limiting**: 5 login attempts per minute

#### Token Security
- **UUID v4 Tokens**: Cryptographically random session tokens
- **7-Day Expiration**: Tokens automatically expire
- **Token Revocation**: Single-session enforcement available
- **Secure Transmission**: Tokens sent over WSS (WebSocket Secure) in production

#### Email Verification
- **Required for New Accounts**: Prevents spam registrations
- **6-Digit Codes**: Time-limited verification codes
- **CLI Fallback**: Development mode prints codes to console

#### Password Reset
- **Secure Tokens**: 32-byte cryptographic random tokens
- **1-Hour Expiration**: Short-lived reset tokens
- **Email/Username Lookup**: Flexible recovery options
- **Timing Attack Prevention**: Constant-time responses regardless of user existence

#### Ban/Mute System
- **Server-Side Enforcement**: Bans checked on every action
- **Token Revocation**: All sessions terminated when user banned
- **Chat Mute**: Prevented at server level, not client

### 7. Security Headers

**Headers Applied to All Responses:**

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | (See CSP section) | Prevents XSS and code injection |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| X-XSS-Protection | 1; mode=block | Browser XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Privacy protection |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | Restricts API access |

**Content Security Policy Details:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com
style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com
img-src 'self' data: https: http:
connect-src 'self' ws: wss:
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

Note: `'unsafe-inline'` for scripts/styles is required for current architecture. Future improvement: migrate to external files and remove unsafe-inline.

### 8. WebSocket Security

**Threat Model:**
- Unauthenticated WebSocket connections
- Message flooding or payload attacks
- Connection hijacking

**Mitigations Implemented:**
- **Authentication Required**: Most operations require valid session
- **Message Size Limits**: 10KB maximum per message
- **Connection Limits**: 5 connections per IP per minute
- **Flood Protection**: 30 messages/second per connection
- **IP Tracking**: Connection attempts logged for abuse detection
- **Heartbeat System**: 30-second ping/pong to detect dead connections
- **Automatic Cleanup**: Stale connections terminated

### 9. Logging & Monitoring

**Security Events Logged:**
- Failed authentication attempts
- Rate limit violations
- Banned user login attempts
- Suspicious patterns (rapid connections, large payloads)
- Server errors and exceptions

**Recommended Monitoring:**
- Set up alerting for repeated failed logins
- Monitor rate limiter rejections
- Track unusual WebSocket connection patterns
- Log aggregation (ELK Stack, Splunk, etc.)
- Intrusion detection systems (fail2ban, OSSEC)

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability:

### Where to Report
**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, email security reports to: **[CONTACT EMAIL HERE]**

### What to Include
1. **Description**: Clear description of the vulnerability
2. **Impact**: Potential impact and attack scenario
3. **Reproduction**: Step-by-step reproduction instructions
4. **Proof of Concept**: Code or screenshots (if applicable)
5. **Suggested Fix**: Proposed mitigation (optional)

### Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Based on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### Disclosure Policy
- We follow coordinated disclosure
- Public disclosure after fix is deployed
- Security advisory published with credit to reporter (if desired)

## Security Testing

### Automated Tests
Run the security test suite:
```bash
npm run test:security
```

Run the comprehensive penetration test suite:
```bash
node tests/security-penetration-tests.js
```

### Manual Security Checklist
- [x] XSS payloads in chat rejected
- [x] Username with special chars rejected
- [x] CSRF token required for state changes
- [x] Rate limiting blocks rapid requests
- [x] Large payloads rejected
- [x] SQL injection attempts harmless (N/A - no SQL)
- [x] Authentication bypass attempts fail
- [x] Expired tokens rejected
- [x] Banned users cannot log in

### Penetration Testing
For production deployments, we recommend:
- Annual third-party security audit
- Penetration testing before major releases
- Bug bounty program for responsible disclosure

---

## MMO Security Audit Report

**Audit Date**: November 2025
**Auditor**: Security Review Team
**Status**: ✅ Complete

### Executive Summary

A comprehensive security audit was conducted focusing on MMO-specific vulnerabilities including injection attacks, impersonation, replay attacks, rate/flood protection, resource abuse, and privilege escalation. The audit includes both automated and manual test cases.

### 1. Injection Attack Testing

#### 1.1 Cross-Site Scripting (XSS)

| Test Case | Status | Notes |
|-----------|--------|-------|
| Script tag injection | ✅ Mitigated | HTML entities encoded |
| Event handler injection (onerror, onload, etc.) | ✅ Mitigated | HTML entities encoded |
| JavaScript protocol injection | ✅ Mitigated | HTML entities encoded |
| HTML entity bypass attempts | ✅ Mitigated | Properly handled |

**Implementation**: The `InputValidator.sanitizeChatMessage()` function encodes all HTML special characters (`<`, `>`, `&`, `"`, `'`, `/`) preventing script execution.

#### 1.2 Prototype Pollution

| Test Case | Status | Notes |
|-----------|--------|-------|
| __proto__ key injection | ✅ Mitigated | Blocked in object sanitization |
| constructor key injection | ✅ Mitigated | Blocked in object sanitization |
| prototype key injection | ✅ Mitigated | Blocked in object sanitization |
| Nested pollution attempts | ✅ Mitigated | Top-level keys blocked |

**Implementation**: The `InputValidator.sanitizeObject()` function uses `Object.keys()` and explicitly filters dangerous keys.

#### 1.3 Command Injection

| Test Case | Status | Notes |
|-----------|--------|-------|
| Shell special chars in username | ✅ Mitigated | Alphanumeric-only regex |
| Shell special chars in location ID | ✅ Mitigated | Alphanumeric-only regex |

**Implementation**: Username and location ID validation uses strict regex patterns allowing only alphanumeric characters.

### 2. Session Security & Impersonation

| Test Case | Status | Notes |
|-----------|--------|-------|
| Token cryptographic randomness | ✅ Secure | Uses crypto.randomBytes(32) |
| CSRF timing-safe comparison | ✅ Secure | Uses crypto.timingSafeEqual() |
| Reserved username blocking | ✅ Mitigated | admin, system, mod, etc. blocked |
| Case-insensitive reserved name check | ✅ Mitigated | All case variations blocked |

### 3. Replay Attack Prevention

| Test Case | Status | Notes |
|-----------|--------|-------|
| CSRF token expiration | ✅ Secure | 1-hour expiry enforced |
| Token invalidation | ✅ Secure | Can be revoked after use |
| Session token expiration | ✅ Secure | 7-day expiry for session tokens |

### 4. Rate Limiting & Flood Protection

| Test Case | Status | Notes |
|-----------|--------|-------|
| Authentication rate limiting | ✅ Implemented | 5 attempts/minute |
| Chat message rate limiting | ✅ Implemented | 10 messages/10 seconds |
| Game action rate limiting | ✅ Implemented | 20 actions/10 seconds |
| WebSocket connection limiting | ✅ Implemented | 5 connections/IP/minute |
| WebSocket message flooding | ✅ Implemented | 30 messages/second |
| HTTP endpoint rate limiting | ✅ Implemented | 100 requests/minute |
| Email verification rate limiting | ✅ Implemented | 5 attempts/minute |

### 5. Resource Abuse & DoS Prevention

| Test Case | Status | Notes |
|-----------|--------|-------|
| Large payload rejection | ✅ Mitigated | 10KB limit enforced |
| Chat message length | ✅ Mitigated | 500 character limit |
| Empty message rejection | ✅ Mitigated | Whitespace-only rejected |
| Email ReDoS prevention | ✅ Mitigated | Safe regex pattern, length limits |
| Username length limits | ✅ Mitigated | 3-20 characters enforced |
| Password length limits | ✅ Mitigated | 6-128 characters enforced |

### 6. Privilege Escalation

| Test Case | Status | Notes |
|-----------|--------|-------|
| Admin username registration | ✅ Blocked | All variations blocked |
| Unauthorized field updates | ✅ Mitigated | Whitelist filtering applied |
| Client-side stat manipulation | ✅ Mitigated | Server-side validation |

### 7. Known Issues & Recommendations

#### 7.1 Medium Priority

| Issue | Risk | Status | Recommendation |
|-------|------|--------|----------------|
| Admin endpoints lack authentication | Medium | ⚠️ Open | Add JWT/session-based admin auth |
| No HTTPS enforcement in code | Medium | ⚠️ Open | Deploy behind TLS-terminating proxy |
| CSP uses 'unsafe-inline' | Low | ⚠️ Open | Migrate to external scripts |

#### 7.2 Low Priority

| Issue | Risk | Status | Recommendation |
|-------|------|--------|----------------|
| WebSocket origin not validated | Low | ⚠️ Open | Add origin header validation |
| No request signing for trades | Low | ⚠️ Open | Consider request signing for high-value actions |

### 8. Remediation Timeline

| Priority | Issues | Target Resolution |
|----------|--------|-------------------|
| Critical | None identified | N/A |
| High | None identified | N/A |
| Medium | Admin auth, HTTPS | 30 days |
| Low | CSP, Origin validation | 90 days |

### 9. Security Test Coverage

```
Total Automated Tests: 49
├── Original Security Tests: 12
└── Penetration Tests: 37

Test Categories:
├── XSS Protection: 4 tests
├── Prototype Pollution: 2 tests
├── Command Injection: 2 tests
├── Session Security: 4 tests
├── Replay Prevention: 2 tests
├── Rate Limiting: 5 tests
├── DoS Protection: 6 tests
├── Privilege Escalation: 2 tests
├── Input Validation: 6 tests
└── Email Security: 4 tests
```

### 10. Ownership

| Area | Owner | Contact |
|------|-------|---------|
| Authentication | Backend Team | - |
| Rate Limiting | Backend Team | - |
| Input Validation | Backend Team | - |
| WebSocket Security | Backend Team | - |
| Client Security | Frontend Team | - |

---

## Security Best Practices for Deployment

### Production Environment
1. **HTTPS/WSS Only**: Use TLS certificates (Let's Encrypt)
2. **Firewall Rules**: Restrict ports to 80, 443
3. **Reverse Proxy**: Use Nginx/Cloudflare for additional protection
4. **Environment Variables**: Never commit credentials to git
5. **Regular Updates**: Keep dependencies updated (npm audit)
6. **Backup Strategy**: Regular backups of user data
7. **Monitoring**: Set up logging and alerting
8. **Separate Secrets**: Use secrets manager (AWS Secrets Manager, HashiCorp Vault)

### Email Security
1. **Use Dedicated Service**: SendGrid, Mailgun, or similar
2. **SPF/DKIM/DMARC**: Configure email authentication
3. **Rate Limits**: Prevent email bombing
4. **Verification Required**: Enforce email verification for production

### Database Security (Future)
When adding a database:
1. **Encrypted Connections**: Use TLS for database connections
2. **Least Privilege**: Database user with minimal permissions
3. **Regular Backups**: Automated with encryption
4. **Access Control**: Restrict database access to application server only
5. **Audit Logging**: Log all database operations

## Security Updates

Subscribe to security advisories:
- GitHub Security Advisories (Watch repository)
- npm audit notifications
- Node.js security mailing list
- Express.js security notifications

## Compliance

High Wizardry aims to comply with:
- **OWASP Top 10**: Mitigations for all top vulnerabilities
- **CWE/SANS Top 25**: Protection against most dangerous software weaknesses
- **GDPR**: Privacy by design (email verification, account deletion available)

## Additional Resources

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [WebSocket Security](https://www.websocket.org/echo.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Security Contact

For security-related questions or concerns: **[CONTACT EMAIL HERE]**

Last Updated: 2025-11-27

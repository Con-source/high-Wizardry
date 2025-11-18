# Security Quick Reference

This guide provides quick examples for developers working with High Wizardry's security features.

## Input Validation

Always validate user inputs using the InputValidator utility:

```javascript
const InputValidator = require('./server/utils/InputValidator');

// Validate username
const usernameResult = InputValidator.validateUsername(userInput);
if (!usernameResult.valid) {
  return res.status(400).json({ error: usernameResult.message });
}
const username = usernameResult.sanitized;

// Validate chat message
const messageResult = InputValidator.sanitizeChatMessage(chatInput);
if (!messageResult.valid) {
  return res.status(400).json({ error: messageResult.message });
}
const safeMessage = messageResult.sanitized;

// Validate numbers with constraints
const levelResult = InputValidator.validateNumber(level, { 
  min: 1, 
  max: 100, 
  integer: true 
});
if (!levelResult.valid) {
  return res.status(400).json({ error: levelResult.message });
}
```

## CSRF Protection

For state-changing HTTP endpoints:

```javascript
const CsrfProtection = require('./server/utils/CsrfProtection');
const csrf = new CsrfProtection();

// Generate token for client
app.get('/api/form', (req, res) => {
  const sessionId = req.ip;
  const token = csrf.generateToken(sessionId);
  res.json({ csrfToken: token });
});

// Validate token on POST
app.post('/api/action', (req, res) => {
  const sessionId = req.ip;
  const token = req.body.csrfToken || req.headers['x-csrf-token'];
  
  if (!csrf.validateToken(sessionId, token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Process request
});
```

## Rate Limiting

Rate limiting is automatically applied. To add custom limits:

```javascript
const RateLimiter = require('./server/utils/RateLimiter');

// Create custom rate limiter
const customLimiter = new RateLimiter(10, 60000); // 10 attempts per minute

// Check if action is allowed
if (!customLimiter.isAllowed(userId)) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

## WebSocket Security

WebSocket connections are automatically protected. Key features:

- Connection flood protection (5 connections/IP/minute)
- Message flood protection (30 messages/second per client)
- Payload size limits (10KB per message)
- Authentication required for most operations

## Common Patterns

### Validating User Registration

```javascript
// In AuthManager or registration endpoint
const usernameResult = InputValidator.validateUsername(username);
if (!usernameResult.valid) {
  return { success: false, message: usernameResult.message };
}

const passwordResult = InputValidator.validatePassword(password);
if (!passwordResult.valid) {
  return { success: false, message: passwordResult.message };
}

if (email) {
  const emailResult = this.validateEmail(email);
  if (!emailResult.valid) {
    return { success: false, message: emailResult.message };
  }
}

// Proceed with registration using sanitized values
const sanitizedUsername = usernameResult.sanitized;
```

### Handling Chat Messages

```javascript
// In chat handler
const channelResult = InputValidator.validateChannel(channel);
if (!channelResult.valid) {
  return sendError(channelResult.message);
}

const messageResult = InputValidator.sanitizeChatMessage(message);
if (!messageResult.valid) {
  return sendError(messageResult.message);
}

// Broadcast sanitized message
broadcast({
  type: 'chat',
  channel: channelResult.sanitized,
  message: messageResult.sanitized,
  from: player.username
});
```

### Preventing Prototype Pollution

```javascript
// When handling objects from clients
const safeData = InputValidator.sanitizeObject(clientData, [
  'name',
  'level',
  'health'
]);

// safeData now safe to use - dangerous keys removed
```

## Security Checklist for New Features

When adding new features:

- [ ] Validate all user inputs with InputValidator
- [ ] Sanitize output that displays user content
- [ ] Add rate limiting for expensive operations
- [ ] Use CSRF tokens for state-changing operations
- [ ] Check authentication before processing
- [ ] Limit payload sizes
- [ ] Add security tests
- [ ] Update SECURITY.md if introducing new attack surface

## Testing Security

Run the security test suite:

```bash
npm test
# or
npm run test:security
```

Create new security tests in `tests/security-tests.js`:

```javascript
test('New feature rejects malicious input', () => {
  const result = YourValidator.validate('<script>alert(1)</script>');
  assert(!result.valid, 'Should reject XSS attempt');
});
```

## Common Mistakes to Avoid

❌ **Don't trust client input:**
```javascript
// BAD
const level = req.body.level;
player.level = level; // Unvalidated!
```

✅ **Always validate:**
```javascript
// GOOD
const levelResult = InputValidator.validateNumber(req.body.level, {
  min: 1,
  max: 100,
  integer: true
});
if (!levelResult.valid) {
  return res.status(400).json({ error: levelResult.message });
}
player.level = levelResult.value;
```

❌ **Don't concatenate HTML:**
```javascript
// BAD
html = '<div>' + userMessage + '</div>'; // XSS risk!
```

✅ **Always sanitize:**
```javascript
// GOOD
const sanitized = InputValidator.sanitizeChatMessage(userMessage);
html = '<div>' + sanitized.sanitized + '</div>';
```

❌ **Don't skip rate limiting:**
```javascript
// BAD
app.post('/expensive-operation', handler); // No protection!
```

✅ **Add rate limiting:**
```javascript
// GOOD
const limiter = new RateLimiter(10, 60000);
app.post('/expensive-operation', (req, res) => {
  if (!limiter.isAllowed(req.ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  handler(req, res);
});
```

## Resources

- Full documentation: [SECURITY.md](./SECURITY.md)
- Test examples: [tests/security-tests.js](./tests/security-tests.js)
- InputValidator API: [server/utils/InputValidator.js](./server/utils/InputValidator.js)
- CSRF Protection: [server/utils/CsrfProtection.js](./server/utils/CsrfProtection.js)

## Getting Help

For security questions or concerns:
- Review SECURITY.md for detailed guidance
- Run `npm test` to verify security measures
- Check existing code for patterns and examples
- Report vulnerabilities privately (see SECURITY.md)

# Testing Guide for High Wizardry Authentication System

## Automated Tests

Run the authentication test suite:

```bash
node test-auth.js
```

This will test:
- User registration with email
- Email verification flow
- Login with verified/unverified accounts
- Password reset functionality
- Ban/mute features
- Legacy account support
- Adding email to existing accounts

## Manual Testing

### 1. Server Setup

Start the server:
```bash
npm start
```

The server will run on http://localhost:8080

### 2. Testing Registration

1. Open http://localhost:8080 in your browser
2. Click "Register" tab
3. Fill in:
   - Username (3-20 characters)
   - Email (valid email format)
   - Password (minimum 6 characters)
   - Confirm password
4. Submit the form
5. Check server console for verification code (CLI fallback)
6. Note: You should see a verification modal appear

### 3. Testing Email Verification

1. After registration, an email verification modal should appear
2. Enter the 6-digit code from the server console
3. Click "Verify"
4. Upon success, you should be logged into the game

### 4. Testing Login with Unverified Email

1. Register a new account (don't verify)
2. Refresh the page
3. Try to log in with the unregistered credentials
4. You should see an error about email verification
5. The verification modal should appear

### 5. Testing Password Reset

1. On login screen, click "Forgot password?"
2. Enter your username or email
3. Submit the form
4. Check server console for reset token
5. The token is also in the reset link: `?reset=TOKEN`
6. Enter the token in the URL: http://localhost:8080?reset=YOUR_TOKEN
7. A password reset modal should appear
8. Enter and confirm new password
9. Submit to reset
10. Try logging in with the new password

### 6. Testing Ban/Mute (Server-Side)

These features are server-side only and require direct manipulation of the user database or admin API.

To ban a user:
```javascript
// In server console or admin script
const auth = require('./server/auth/AuthManager');
const authManager = new auth();
authManager.loadUsers();
authManager.setBanStatus('username', true);
```

To mute a user:
```javascript
authManager.setMuteStatus('username', true);
```

**Testing Ban:**
1. Ban a user using the code above
2. Try to log in with that user
3. Should see "Account has been banned" error

**Testing Mute:**
1. Mute a user using the code above
2. Log in with that user (should succeed)
3. Try to send a chat message
4. Should see "You are muted" error

### 7. Testing Legacy Account Support

1. Create a user without email (modify test or old account)
2. Log in successfully
3. An "Add Email" modal should appear
4. Add an email address
5. Verify the email with the code from console
6. Email is now associated with the account

## Email Configuration Testing

To test with real email delivery:

1. Set up environment variables:
```bash
export EMAIL_ENABLED=true
export EMAIL_SERVICE=gmail
export EMAIL_USER=your-test-email@gmail.com
export EMAIL_PASS=your-app-password
export EMAIL_FROM=noreply@test.com
```

2. Start the server:
```bash
npm start
```

3. Register a new account - you should receive a real email
4. Test password reset - you should receive a real email

## Expected Behaviors

### Registration
- ✅ Username validated (3-20 chars)
- ✅ Email validated (proper format)
- ✅ Password validated (min 6 chars)
- ✅ Passwords must match
- ✅ Verification email sent (or CLI fallback)
- ✅ Can log in after verification
- ✅ Cannot log in before verification (if required)

### Login
- ✅ Invalid credentials show error
- ✅ Banned users cannot log in
- ✅ Unverified users prompted to verify
- ✅ Legacy users (no email) can log in
- ✅ Legacy users prompted to add email
- ✅ Successful login shows game screen

### Password Reset
- ✅ Can request reset by username or email
- ✅ Reset email sent (or CLI fallback)
- ✅ Reset token expires after 1 hour
- ✅ Can set new password with valid token
- ✅ Old password no longer works
- ✅ New password works for login
- ✅ All sessions revoked after reset

### Ban/Mute
- ✅ Banned users cannot log in
- ✅ Muted users can log in but cannot chat
- ✅ All tokens revoked when user is banned

### Email Verification
- ✅ 6-digit code generated
- ✅ Code can be resent
- ✅ Invalid code shows error
- ✅ Valid code marks email as verified
- ✅ Can add email to legacy account

## Troubleshooting

### Email not sending
- Check environment variables are set correctly
- For Gmail, use an App Password, not your regular password
- Check server console for CLI fallback output

### Cannot log in
- Check if email verification is required (`EMAIL_REQUIRE_VERIFICATION`)
- Verify the user is not banned
- Check server console for errors

### Password reset not working
- Check that token hasn't expired (1 hour limit)
- Verify email is associated with account
- Check server console for reset token in CLI mode

### Mute not working
- Verify mute status is set in database
- Check server logs for mute check
- Try refreshing connection

## Performance Testing

For load testing the authentication system:

```bash
# Install artillery if needed
npm install -g artillery

# Create artillery config for WebSocket testing
# Test login/register endpoints
artillery quick --count 10 --num 50 http://localhost:8080/api/health
```

## Security Testing

1. **SQL Injection**: Try malicious usernames/emails with SQL syntax
2. **XSS**: Try usernames with script tags
3. **Rate Limiting**: Try multiple rapid login attempts
4. **Token Expiry**: Wait 7 days and try using old token
5. **Password Reset**: Try using expired reset token
6. **Session Revocation**: Login, ban user, verify token is revoked

All of these should be properly handled and prevented by the system.

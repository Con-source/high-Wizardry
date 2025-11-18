# High Wizardry API Documentation

## WebSocket API

The server communicates with clients via WebSocket using JSON messages.

### Connection

Connect to: `ws://localhost:8080` (or your configured host/port)

### Message Format

All messages follow this format:
```json
{
  "type": "message_type",
  "...": "additional fields"
}
```

## Client → Server Messages

### Authentication

#### Register
```json
{
  "type": "register",
  "username": "string (3-20 chars)",
  "password": "string (min 6 chars)",
  "email": "string (optional, but recommended for account recovery)"
}
```

Response (success):
```json
{
  "type": "auth_success",
  "playerId": "uuid",
  "username": "string",
  "token": "session_token",
  "playerData": { /* player object */ },
  "emailVerified": true | false,
  "needsEmailVerification": true | false,
  "needsEmailSetup": true | false,
  "muted": true | false,
  "banned": false
}
```

Response (failure):
```json
{
  "type": "auth_failed",
  "playerId": null,
  "username": null,
  "playerData": null,
  "token": null,
  "needsEmailVerification": true | false,
  "needsEmailSetup": false,
  "muted": false,
  "banned": true | false,
  "message": "error description"
}
```

#### Login
```json
{
  "type": "login",
  "username": "string",
  "password": "string"
}
```

Response: Same as register

**Note:** 
- Login will fail if the user account is banned (with `banned: true` in response)
- Login will fail if email verification is required but not completed (with `needsEmailVerification: true`)
- Successful login will include `muted: true` if user is muted
- Successful login will include `needsEmailSetup: true` for legacy accounts without email

#### Authenticate with Token
```json
{
  "type": "authenticate",
  "token": "session_token"
}
```

Response: Same as register

### Email Verification

#### Verify Email
```json
{
  "type": "verify_email",
  "username": "string",
  "code": "string (6-digit code)"
}
```

Response:
```json
{
  "type": "email_verification_result",
  "success": true | false,
  "message": "verification status message"
}
```

#### Resend Verification Code
```json
{
  "type": "resend_verification",
  "username": "string"
}
```

Response:
```json
{
  "type": "resend_verification_result",
  "success": true | false,
  "message": "status message"
}
```

#### Add Email to Account (for legacy accounts)
```json
{
  "type": "add_email",
  "username": "string",
  "email": "string"
}
```

Response:
```json
{
  "type": "add_email_result",
  "success": true | false,
  "message": "status message"
}
```

### Password Reset

#### Request Password Reset
```json
{
  "type": "request_password_reset",
  "usernameOrEmail": "string"
}
```

Response:
```json
{
  "type": "password_reset_request_result",
  "success": true,
  "message": "If an account exists, a reset email has been sent"
}
```

**Note:** For security, this always returns success even if the account doesn't exist.

#### Reset Password
```json
{
  "type": "reset_password",
  "token": "string (reset token from email)",
  "newPassword": "string (min 6 chars)"
}
```

Response:
```json
{
  "type": "password_reset_result",
  "success": true | false,
  "message": "status message"
}
```

### Game Actions

#### Change Location
```json
{
  "type": "change_location",
  "locationId": "town-square"
}
```

Response:
```json
{
  "type": "location_changed",
  "locationId": "town-square",
  "players": [/* array of player objects in location */]
}
```

#### Send Chat Message
```json
{
  "type": "chat",
  "channel": "global" | "local",
  "message": "string (max 500 chars)"
}
```

#### Perform Action
```json
{
  "type": "action",
  "actionType": "gather_resources" | "craft_item" | "commit_crime" | "heal" | "train",
  "actionData": {
    /* action-specific data */
  }
}
```

Response:
```json
{
  "type": "action_result",
  "success": true | false,
  "result": { /* action results */ },
  "message": "error message (if failed)"
}
```

#### Update Player Data
```json
{
  "type": "player_update",
  "updates": {
    /* player fields to update */
  }
}
```

### Event Management

#### Subscribe to Events
```json
{
  "type": "subscribe_events",
  "channel": "all"
}
```

**Note:** Players are automatically subscribed to relevant events upon authentication. This message is for future event filtering features.

#### Unsubscribe from Events
```json
{
  "type": "unsubscribe_events",
  "channel": "all"
}
```

### Heartbeat

#### Pong (response to ping)
```json
{
  "type": "pong",
  "clientTime": 1234567890
}
```

## Server → Client Messages

### Event System Messages

#### Game Event Notification
```json
{
  "type": "game_event",
  "eventId": "magic-storm",
  "eventName": "Magic Storm",
  "eventType": "weather",
  "description": "A powerful magical storm erupts in the Town Square!",
  "timestamp": 1234567890,
  "data": {
    "manaDrain": 20,
    "severity": "moderate"
  }
}
```

**Event Scopes:**
- `global` - Affects all players
- `location` - Affects players in specific location
- `player` - Affects specific player only

#### Event Subscription Result
```json
{
  "type": "event_subscription_result",
  "success": true,
  "channel": "all",
  "message": "Subscribed to event notifications"
}
```

### Connection Events

#### Connected
```json
{
  "type": "connected",
  "serverTime": 1234567890
}
```

#### Ping (heartbeat)
```json
{
  "type": "ping",
  "serverTime": 1234567890
}
```

### Player Events

#### Player Connected
```json
{
  "type": "player_connected",
  "playerId": "uuid",
  "username": "string"
}
```

#### Player Disconnected
```json
{
  "type": "player_disconnected",
  "playerId": "uuid"
}
```

#### Player Joined Location
```json
{
  "type": "player_joined",
  "playerId": "uuid",
  "playerData": { /* player object */ }
}
```

#### Player Left Location
```json
{
  "type": "player_left",
  "playerId": "uuid"
}
```

#### Player Updated
```json
{
  "type": "player_updated",
  "playerId": "uuid",
  "updates": { /* updated fields */ }
}
```

### Chat Events

#### Chat Message
```json
{
  "type": "chat_message",
  "channel": "global" | "local",
  "from": "username",
  "playerId": "uuid",
  "message": "string",
  "timestamp": 1234567890
}
```

### Error Events

#### Error
```json
{
  "type": "error",
  "message": "error description"
}
```

## Player Object Structure

```json
{
  "id": "uuid",
  "username": "string",
  "level": 1,
  "xp": 0,
  "shillings": 83,
  "pennies": 4,
  "health": 100,
  "maxHealth": 100,
  "energy": 100,
  "maxEnergy": 100,
  "mana": 100,
  "maxMana": 100,
  "location": "town-square",
  "stats": {
    "intelligence": 10,
    "endurance": 10,
    "charisma": 10,
    "dexterity": 10
  },
  "inventory": [],
  "equipment": {
    "weapon": null,
    "armor": null,
    "accessory": null
  },
  "questsCompleted": 0,
  "craftedItems": {},
  "guilds": {
    "memberships": []
  },
  "friends": [],
  "lastLogin": 1234567890,
  "createdAt": 1234567890
}
```

## Action Types

### gather_resources
```json
{
  "actionType": "gather_resources",
  "actionData": {
    "location": "enchanted-forest"
  }
}
```

Result:
```json
{
  "resource": "herbs",
  "amount": 2
}
```

### craft_item
```json
{
  "actionType": "craft_item",
  "actionData": {
    "recipeId": "health_potion"
  }
}
```

Result:
```json
{
  "item": "health_potion"
}
```

### commit_crime
```json
{
  "actionType": "commit_crime",
  "actionData": {
    "crimeType": "pickpocket"
  }
}
```

Result:
```json
{
  "crimeSuccess": true,
  "reward": 25,
  "xpGained": 5
}
```

Or if caught:
```json
{
  "crimeSuccess": false,
  "jailTime": 300000
}
```

### heal
```json
{
  "actionType": "heal",
  "actionData": {
    "amount": 25,
    "cost": 600
  }
}
```

Result:
```json
{
  "healed": 25
}
```

### train
```json
{
  "actionType": "train",
  "actionData": {
    "stat": "intelligence",
    "cost": 1200
  }
}
```

Result:
```json
{
  "stat": "intelligence",
  "newValue": 11
}
```

## Rate Limits

- **Authentication**: 5 attempts per minute
- **Actions**: 20 per 10 seconds
- **Chat**: 10 messages per 10 seconds

Exceeding these limits will result in error messages and temporary blocks.

## Security Notes

1. **Passwords** are hashed using bcrypt with salt rounds of 10
2. **Session tokens** expire after 7 days and can be revoked
3. **Email verification** is required for new accounts (configurable via `EMAIL_REQUIRE_VERIFICATION` env var)
4. **Password reset tokens** expire after 1 hour
5. **Ban enforcement**: Banned users cannot log in and all their tokens are revoked
6. **Mute enforcement**: Muted users cannot send chat messages
7. All critical calculations (rewards, costs) are server-side
8. Chat messages are sanitized to prevent XSS
9. Player updates from clients are validated and filtered
10. **Email handling**: Emails can be sent via SMTP (production) or CLI fallback (development)
11. **Rate limiting**: Protection against brute force attacks on authentication endpoints

### Authentication Flow and Race Condition Prevention

**Important:** The server implements careful sequencing to prevent race conditions:

1. **Registration**: `player_connected` broadcast is **delayed** until after email verification is complete (if required). This prevents other players from seeing unverified accounts.

2. **Login**: `player_connected` broadcast only happens after successful login and when email verification is not required.

3. **Token Authentication**: Ban/mute status is checked from user data before broadcasting `player_connected`.

4. **Email Verification**: After successful email verification, if the user is already authenticated in the session, `player_connected` is broadcast at that time.

This ensures that players are only visible in the game world after completing all required authentication steps.

### Email Configuration

To enable email sending in production, set these environment variables:

```bash
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail  # or other nodemailer service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@highwizardry.game
EMAIL_REQUIRE_VERIFICATION=true  # Set to false to disable verification requirement
```

If email is not configured, verification codes and reset tokens will be printed to the server console (CLI fallback) for development purposes.

## HTTP Endpoints

### GET /api/health

Health check endpoint.

Response:
```json
{
  "status": "ok",
  "players": 5,
  "uptime": 1234.567
}
```

### POST /api/auth/request-reset

Request a password reset email.

Request body:
```json
{
  "usernameOrEmail": "string"
}
```

Response:
```json
{
  "success": true,
  "message": "If an account exists, a reset email has been sent"
}
```

### POST /api/auth/reset-password

Reset password with token.

Request body:
```json
{
  "token": "string (reset token)",
  "newPassword": "string (min 6 chars)"
}
```

Response:
```json
{
  "success": true | false,
  "message": "status message"
}
```

### POST /api/auth/verify-email

Verify email address with code.

Request body:
```json
{
  "username": "string",
  "code": "string (6-digit code)"
}
```

Response:
```json
{
  "success": true | false,
  "message": "status message"
}
```

### POST /api/auth/resend-verification

Resend email verification code.

Request body:
```json
{
  "username": "string"
}
```

Response:
```json
{
  "success": true | false,
  "message": "status message"
}
```

### GET /api/events/periodic

Get all registered periodic events.

Response:
```json
{
  "success": true,
  "events": [
    {
      "eventId": "magic-storm",
      "name": "Magic Storm",
      "interval": 900000,
      "enabled": true,
      "lastRun": 1234567890,
      "nextRun": 1234568790
    }
  ]
}
```

### GET /api/events/history

Get event execution history.

Query parameters:
- `limit` (optional, default: 20) - Number of recent events to return

Response:
```json
{
  "success": true,
  "history": [
    {
      "name": "Magic Storm",
      "eventType": "location",
      "scope": "location",
      "executedAt": 1234567890,
      "locationId": "town-square"
    }
  ]
}
```

### POST /api/events/inject

Manually inject an event (admin operation).

Request body:
```json
{
  "event": {
    "name": "Test Event",
    "description": "A test event for debugging",
    "scope": "global" | "location" | "player",
    "eventType": "custom",
    "locationId": "town-square",
    "eventData": {}
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Event Test Event queued"
}
```

**Note:** Admin authentication/authorization not yet implemented. Use with caution in production.

### GET /

Serves the game client (index.html)

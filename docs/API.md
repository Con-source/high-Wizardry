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

## Table of Contents

1. [Client → Server Messages](#client--server-messages)
   - [Authentication](#authentication)
   - [Email Verification](#email-verification)
   - [Password Reset](#password-reset)
   - [Game Actions](#game-actions)
   - [Messaging System](#messaging-system-new)
   - [Event Management](#event-management)
   - [Heartbeat](#heartbeat)
2. [Server → Client Messages](#server--client-messages)
3. [HTTP Endpoints](#http-endpoints)
4. [Data Structures](#data-structures)

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

### Messaging System (NEW)

#### Send Chat Message
```json
{
  "type": "chat_message",
  "channel": "global" | "local" | "guild" | "trade" | "help",
  "message": "string (max 500 chars)"
}
```

Response: Broadcast to relevant players
```json
{
  "type": "chat_message",
  "id": "message_id",
  "username": "sender",
  "playerId": "uuid",
  "message": "filtered_message",
  "channel": "channel_name",
  "timestamp": 1234567890
}
```

**Features:**
- Rate limiting: 10 messages per 10 seconds
- Content filtering: profanity, links, spam patterns
- Moderation: muted users cannot send messages
- History: Server stores last 500 messages per channel

#### Send Direct Message
```json
{
  "type": "direct_message",
  "recipient": "username",
  "message": "string (max 1000 chars)"
}
```

Response to sender:
```json
{
  "type": "direct_message_sent",
  "dm": {
    "id": "message_id",
    "from": "sender",
    "to": "recipient",
    "message": "message_text",
    "timestamp": 1234567890,
    "read": false
  }
}
```

Response to recipient (if online):
```json
{
  "type": "direct_message_received",
  "dm": {
    "id": "message_id",
    "from": "sender",
    "to": "recipient",
    "message": "message_text",
    "timestamp": 1234567890,
    "read": false
  }
}
```

**Features:**
- Persistent storage: Messages saved for offline delivery
- Conversation threads: Messages grouped by participants
- Block/report: Can block users from sending DMs
- Read status: Track read/unread messages

#### Send Mail
```json
{
  "type": "send_mail",
  "mail": {
    "to": "recipient_username",
    "subject": "string (max 100 chars)",
    "body": "string (max 5000 chars)"
  }
}
```

Response to sender:
```json
{
  "type": "mail_sent",
  "mail": {
    "id": "mail_id",
    "from": "sender",
    "to": "recipient",
    "subject": "subject",
    "body": "body",
    "timestamp": 1234567890,
    "read": false,
    "archived": false
  }
}
```

Response to recipient (if online):
```json
{
  "type": "mail_received",
  "mail": { /* mail object */ }
}
```

**Features:**
- Long-form messaging with subject and body
- Inbox/Sent folders (max 200/100 messages)
- System mail for important events
- 30-day retention period

#### Mark Mail as Read
```json
{
  "type": "mark_mail_read",
  "mailId": "mail_id"
}
```

Response:
```json
{
  "type": "mail_marked_read",
  "success": true,
  "mailId": "mail_id"
}
```

#### Delete Mail
```json
{
  "type": "delete_mail",
  "mailId": "mail_id",
  "folder": "inbox" | "sent"
}
```

Response:
```json
{
  "type": "mail_deleted",
  "success": true,
  "mailId": "mail_id"
}
```

#### Create Forum Topic
```json
{
  "type": "create_forum_topic",
  "topic": {
    "category": "general" | "guides" | "trading" | "guilds" | "announcements",
    "title": "string (max 200 chars)",
    "content": "string (max 10000 chars)"
  }
}
```

Response: Broadcast to all
```json
{
  "type": "forum_topic_created",
  "topic": {
    "id": "topic_id",
    "category": "category",
    "title": "title",
    "author": "username",
    "content": "content",
    "timestamp": 1234567890,
    "replies": [],
    "locked": false,
    "pinned": false,
    "views": 0
  }
}
```

**Features:**
- Categorized discussions
- Pin/lock topics (admin)
- View count tracking
- Pagination support

#### Reply to Forum Topic
```json
{
  "type": "forum_reply",
  "topicId": "topic_id",
  "reply": {
    "content": "string (max 10000 chars)"
  }
}
```

Response: Broadcast to all
```json
{
  "type": "forum_reply_added",
  "topicId": "topic_id",
  "reply": {
    "id": "reply_id",
    "author": "username",
    "content": "content",
    "timestamp": 1234567890
  }
}
```

**Features:**
- Threaded conversations
- Cannot reply to locked topics
- Admin moderation (delete, move)

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

### Messaging API Endpoints (NEW)

#### GET /api/messaging/chat-history

Get chat history for a channel.

Query parameters:
- `channel` (required) - Channel name (global, local, trade, help)
- `locationId` (optional) - For local chat, the location ID
- `limit` (optional, default: 50) - Number of messages to retrieve
- `offset` (optional, default: 0) - Offset for pagination

Response:
```json
{
  "success": true,
  "messages": [
    {
      "id": "message_id",
      "username": "sender",
      "playerId": "uuid",
      "message": "message_text",
      "channel": "channel_name",
      "timestamp": 1234567890
    }
  ]
}
```

#### GET /api/messaging/mailbox/:username

Get mailbox (inbox and sent folders) for a user.

Response:
```json
{
  "success": true,
  "mailbox": {
    "inbox": [
      {
        "id": "mail_id",
        "from": "sender",
        "to": "recipient",
        "subject": "subject",
        "body": "body",
        "timestamp": 1234567890,
        "read": false,
        "archived": false,
        "system": false
      }
    ],
    "sent": [ /* array of sent mail objects */ ]
  }
}
```

#### GET /api/messaging/conversation

Get direct message conversation between two users.

Query parameters:
- `user1` (required) - First username
- `user2` (required) - Second username
- `limit` (optional, default: 50) - Number of messages to retrieve

Response:
```json
{
  "success": true,
  "messages": [
    {
      "id": "message_id",
      "from": "sender",
      "to": "recipient",
      "message": "message_text",
      "timestamp": 1234567890,
      "read": false
    }
  ]
}
```

#### GET /api/messaging/forum/topics

Get forum topics with pagination.

Query parameters:
- `category` (optional) - Filter by category (general, guides, trading, guilds, announcements)
- `page` (optional, default: 1) - Page number
- `perPage` (optional, default: 20) - Results per page

Response:
```json
{
  "success": true,
  "topics": [
    {
      "id": "topic_id",
      "category": "category",
      "title": "title",
      "author": "username",
      "content": "content",
      "timestamp": 1234567890,
      "replies": [ /* array of reply objects */ ],
      "locked": false,
      "pinned": false,
      "views": 0
    }
  ],
  "total": 100,
  "page": 1,
  "perPage": 20,
  "totalPages": 5
}
```

#### GET /api/messaging/forum/topic/:topicId

Get a specific forum topic by ID. Increments view count.

Response:
```json
{
  "success": true,
  "topic": {
    "id": "topic_id",
    "category": "category",
    "title": "title",
    "author": "username",
    "content": "content",
    "timestamp": 1234567890,
    "replies": [
      {
        "id": "reply_id",
        "author": "username",
        "content": "content",
        "timestamp": 1234567890
      }
    ],
    "locked": false,
    "pinned": false,
    "views": 1
  }
}
```

**Error response (404):**
```json
{
  "success": false,
  "error": "Topic not found"
}
```

### Messaging System Features

#### Content Filtering
- **Profanity filter**: Replaces banned words with asterisks
- **Link filter**: Removes HTTP/HTTPS URLs
- **Spam detection**: Limits excessive caps and repeated characters
- **Rate limiting**: 10 messages per 10 seconds per user

#### Moderation Tools
- **Mute users**: Prevent specific users from sending messages
- **Slow mode**: Enforce delay between messages (5 seconds)
- **Block users**: Users can block others from sending DMs
- **Lock topics**: Admins can lock forum topics to prevent replies
- **Pin topics**: Admins can pin topics to top of list
- **Delete content**: Admins can delete topics and replies

#### Persistence
- **Chat history**: Last 500 messages per channel
- **DM conversations**: Last 200 messages per conversation
- **Mail retention**: 30 days, max 200 inbox / 100 sent
- **Forum topics**: No automatic deletion
- **Cleanup**: Runs every 24 hours to remove old data

#### Scalability Considerations
- In-memory storage (can be migrated to database)
- Message sharding by channel/location
- Efficient broadcast to specific groups (location, guild)
- Rate limiting prevents spam/DoS
- Automatic cleanup of old messages

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

---

## Trading API

### WebSocket Messages

#### Client → Server

##### Propose Trade
```json
{
  "type": "trade_propose",
  "toPlayerId": "uuid",
  "offer": {
    "items": ["item-id-1", "item-id-2"],
    "currency": 120
  }
}
```

##### Update Trade Offer
```json
{
  "type": "trade_update",
  "tradeId": "trade-uuid",
  "offer": {
    "items": ["item-id-1"],
    "currency": 240
  }
}
```

##### Confirm Trade
```json
{
  "type": "trade_confirm",
  "tradeId": "trade-uuid"
}
```

##### Cancel Trade
```json
{
  "type": "trade_cancel",
  "tradeId": "trade-uuid"
}
```

#### Server → Client

##### Trade Invitation
```json
{
  "type": "trade_invitation",
  "trade": {
    "id": "trade-uuid",
    "fromPlayerId": "uuid",
    "toPlayerId": "uuid",
    "fromUsername": "string",
    "toUsername": "string",
    "status": "proposed",
    "fromOffer": { "items": [], "currency": 0 },
    "toOffer": { "items": [], "currency": 0 },
    "fromConfirmed": false,
    "toConfirmed": false,
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

##### Trade Proposal Result
```json
{
  "type": "trade_propose_result",
  "success": true,
  "trade": { /* trade object */ },
  "message": "Trade invitation sent"
}
```

##### Trade Updated
```json
{
  "type": "trade_updated",
  "trade": { /* updated trade object */ }
}
```

##### Trade Confirmed
```json
{
  "type": "trade_confirmed",
  "trade": {
    "...": "trade object",
    "status": "completed"
  }
}
```

##### Trade Cancelled
```json
{
  "type": "trade_cancelled",
  "tradeId": "trade-uuid"
}
```

##### Trade Confirm Result
```json
{
  "type": "trade_confirm_result",
  "success": true,
  "trade": { /* trade object */ },
  "message": "Trade confirmed"
}
```

### Trade Object Structure

```json
{
  "id": "trade-uuid",
  "fromPlayerId": "uuid",
  "toPlayerId": "uuid",
  "fromUsername": "string",
  "toUsername": "string",
  "status": "proposed | negotiating | confirmed | completed | cancelled | failed",
  "fromOffer": {
    "items": ["item-id-1", "item-id-2"],
    "currency": 120
  },
  "toOffer": {
    "items": [],
    "currency": 0
  },
  "fromConfirmed": false,
  "toConfirmed": false,
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

### Trade Status Flow

```
proposed → negotiating → confirmed → completed
                ↓
            cancelled (either party)
                ↓
              failed (validation error)
```

---

## Auction API

### WebSocket Messages

#### Client → Server

##### Get Auctions
```json
{
  "type": "auction_get",
  "scope": "global | location",
  "locationId": "town-square"
}
```

##### Create Auction
```json
{
  "type": "auction_create",
  "item": {
    "type": "item | currency",
    "id": "item-id",
    "amount": 100
  },
  "startingBid": 120,
  "duration": 3600000,
  "options": {
    "scope": "global | location",
    "locationId": "town-square"
  }
}
```

##### Place Bid
```json
{
  "type": "auction_bid",
  "auctionId": "auction-uuid",
  "bidAmount": 150
}
```

##### Cancel Auction
```json
{
  "type": "auction_cancel",
  "auctionId": "auction-uuid"
}
```

#### Server → Client

##### Auction List
```json
{
  "type": "auction_list",
  "auctions": [
    {
      "id": "auction-uuid",
      "sellerId": "uuid",
      "sellerUsername": "string",
      "item": { "type": "item", "id": "health-potion" },
      "startingBid": 100,
      "currentBid": 150,
      "highestBidderId": "uuid",
      "highestBidderUsername": "string",
      "bids": [],
      "status": "active",
      "scope": "global",
      "createdAt": 1234567890,
      "endsAt": 1234571490
    }
  ]
}
```

##### Auction Create Result
```json
{
  "type": "auction_create_result",
  "success": true,
  "auction": { /* auction object */ },
  "message": "Auction created successfully"
}
```

##### Auction Bid Result
```json
{
  "type": "auction_bid_result",
  "success": true,
  "auction": { /* updated auction object */ },
  "message": "Bid placed successfully"
}
```

##### New Auction (Broadcast)
```json
{
  "type": "auction_new",
  "auction": { /* auction object */ }
}
```

##### Bid Placed (Broadcast)
```json
{
  "type": "auction_bid_placed",
  "auction": { /* updated auction object */ }
}
```

##### Outbid Notification
```json
{
  "type": "auction_outbid",
  "auction": { /* auction object */ }
}
```

##### Auction Closed
```json
{
  "type": "auction_closed",
  "auction": { /* final auction object */ },
  "role": "seller | winner"
}
```

##### Auction Cancelled
```json
{
  "type": "auction_cancelled",
  "auctionId": "auction-uuid"
}
```

### HTTP Endpoints

#### GET /api/auctions

Get all active auctions.

Query parameters:
- `scope` (optional) - Filter by scope: `global` or `location`
- `locationId` (optional) - Filter by location (when scope is `location`)

Response:
```json
{
  "success": true,
  "auctions": [ /* array of auction objects */ ]
}
```

#### GET /api/auctions/player

Get auctions and bids for a specific player.

Query parameters:
- `playerId` (required) - Player's unique identifier

Response:
```json
{
  "success": true,
  "auctions": [ /* player's active auctions */ ],
  "bids": [ /* auctions player has bid on */ ]
}
```

### Auction Object Structure

```json
{
  "id": "auction-uuid",
  "sellerId": "player-uuid",
  "sellerUsername": "string",
  "item": {
    "type": "item | currency",
    "id": "item-id",
    "amount": 1
  },
  "startingBid": 100,
  "currentBid": 150,
  "highestBidderId": "player-uuid | null",
  "highestBidderUsername": "string | null",
  "bids": [
    {
      "playerId": "uuid",
      "username": "string",
      "amount": 150,
      "timestamp": 1234567890
    }
  ],
  "status": "active | completed | cancelled",
  "scope": "global | location",
  "locationId": "town-square",
  "createdAt": 1234567890,
  "endsAt": 1234571490
}
```

### Auction Duration Options

| Duration | Milliseconds |
|----------|--------------|
| 5 minutes | 300000 |
| 30 minutes | 1800000 |
| 1 hour | 3600000 |
| 24 hours | 86400000 |
| 3 days | 259200000 |
| 7 days | 604800000 |

---

## Community API

### WebSocket Messages

#### Client → Server

##### Search Players
```json
{
  "type": "player_search",
  "query": "username query"
}
```

##### Get Player Profile
```json
{
  "type": "player_profile",
  "playerId": "player-uuid"
}
```

#### Server → Client

##### Search Results
```json
{
  "type": "player_search_result",
  "success": true,
  "players": [
    {
      "id": "player-uuid",
      "username": "string",
      "level": 15,
      "guild": "Guild Name",
      "online": true
    }
  ]
}
```

##### Player Profile
```json
{
  "type": "player_profile_result",
  "success": true,
  "player": {
    "id": "player-uuid",
    "username": "string",
    "level": 15,
    "guild": "Guild Name",
    "stats": {
      "intelligence": 25,
      "endurance": 18,
      "charisma": 20,
      "dexterity": 15
    },
    "achievements": [ /* achievement array */ ],
    "questsCompleted": 42,
    "itemsCrafted": 156,
    "joinDate": "2025-01-15",
    "online": true
  }
}
```

---

## Guild API

### WebSocket Messages

#### Client → Server

##### Get Guild Info
```json
{
  "type": "guild_get",
  "guildId": "artisan"
}
```

##### Join Guild
```json
{
  "type": "guild_join",
  "guildId": "artisan"
}
```

##### Leave Guild
```json
{
  "type": "guild_leave",
  "guildId": "artisan"
}
```

#### Server → Client

##### Guild Info
```json
{
  "type": "guild_info",
  "guild": {
    "id": "artisan",
    "name": "Artisan Guild",
    "description": "Masters of crafting and creation",
    "icon": "fa-hammer",
    "joinCost": 1000,
    "perks": { /* perk definitions */ }
  },
  "membership": {
    "isMember": true,
    "reputation": 250,
    "level": 3
  }
}
```

##### Guild Join Result
```json
{
  "type": "guild_join_result",
  "success": true,
  "guildId": "artisan",
  "message": "Joined Artisan Guild!"
}
```

##### Guild Leave Result
```json
{
  "type": "guild_leave_result",
  "success": true,
  "guildId": "artisan",
  "message": "Left Artisan Guild"
}
```

### Guild IDs

| ID | Name |
|----|------|
| `artisan` | Artisan Guild |
| `smuggler` | Smugglers' Guild |
| `explorer` | Explorer's Guild |

---

### GET /

Serves the game client (index.html)

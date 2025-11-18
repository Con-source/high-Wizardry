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
  "password": "string (min 6 chars)"
}
```

Response (success):
```json
{
  "type": "auth_success",
  "playerId": "uuid",
  "token": "session_token",
  "playerData": { /* player object */ }
}
```

Response (failure):
```json
{
  "type": "auth_failed",
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

#### Authenticate with Token
```json
{
  "type": "authenticate",
  "token": "session_token"
}
```

Response: Same as register

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

### Heartbeat

#### Pong (response to ping)
```json
{
  "type": "pong",
  "clientTime": 1234567890
}
```

## Server → Client Messages

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

1. Passwords are hashed using bcrypt
2. Session tokens expire after 7 days
3. All critical calculations (rewards, costs) are server-side
4. Chat messages are sanitized to prevent XSS
5. Player updates from clients are validated and filtered

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

### GET /

Serves the game client (index.html)

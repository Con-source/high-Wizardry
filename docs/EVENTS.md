# High Wizardry - Event System Documentation

## Overview

The Event System provides a robust, flexible framework for real-time and tick-based event handling in High Wizardry multiplayer. Events can be global, location-based, or player-specific, and can be one-off or recurring (periodic).

## Architecture

### Core Components

1. **EventDispatcher** (`server/game/EventDispatcher.js`)
   - Central event management system
   - Handles event queuing, scheduling, and execution
   - Manages periodic (recurring) events
   - Broadcasts notifications to clients
   - Maintains event history for debugging

2. **Server Integration** (`server/index.js`)
   - Initializes EventDispatcher with manager dependencies
   - Provides WebSocket and HTTP handlers for event operations
   - Routes event broadcasts to appropriate clients

3. **Client Handler** (`jsjs/online.game.js`)
   - Receives event notifications from server
   - Displays event messages and notifications to players
   - Updates player state based on event effects

## Event Types

### By Scope

#### Global Events
Affect all connected players simultaneously.

**Example:** Lunar Eclipse (mana boost for all players)

```javascript
{
  name: 'Lunar Eclipse',
  description: 'A rare celestial event boosts magical power worldwide!',
  scope: 'global',
  eventType: 'celestial',
  handler: (playerManager, locationManager) => {
    // Apply effects to all players
    const players = playerManager.getAllPlayers();
    const playerEffects = {};
    players.forEach(player => {
      playerEffects[player.id] = { mana: 30 };
    });
    return { playerEffects };
  }
}
```

#### Location-Based Events
Affect only players in a specific location.

**Example:** Magic Storm in Town Square

```javascript
{
  name: 'Magic Storm',
  description: 'A powerful storm drains mana from wizards in Town Square!',
  scope: 'location',
  locationId: 'town-square',
  eventType: 'weather',
  handler: (playerManager, locationManager) => {
    const playersInSquare = locationManager.getPlayersInLocation('town-square');
    const playerEffects = {};
    playersInSquare.forEach(playerId => {
      const player = playerManager.getPlayer(playerId);
      if (player) {
        playerEffects[playerId] = { mana: -20 };
      }
    });
    return { playerEffects };
  }
}
```

#### Player-Specific Events
Target individual players (buffs, debuffs, personal quests).

```javascript
{
  name: 'Level Up Bonus',
  description: 'You gained bonus stats from leveling up!',
  scope: 'player',
  playerId: 'player-uuid',
  eventType: 'personal',
  handler: (playerManager, locationManager) => {
    return {
      playerEffects: {
        'player-uuid': { health: 10, mana: 10 }
      }
    };
  }
}
```

### By Timing

#### One-Off Events
Execute immediately or at a scheduled time.

```javascript
// Immediate
eventDispatcher.queueEvent(event);

// Scheduled (5 minutes from now)
eventDispatcher.scheduleEvent(event, 5 * 60 * 1000);
```

#### Periodic Events
Recurring events that execute at regular intervals.

```javascript
// Magic Storm every 15 minutes
eventDispatcher.registerPeriodicEvent(
  'magic-storm',
  magicStormEvent,
  15 * 60 * 1000
);
```

## Usage Guide

### Creating Events

#### Using EventDispatcher Methods

```javascript
// Global event
const globalEvent = eventDispatcher.createGlobalEvent(
  'Gold Rain',
  'Gold coins fall from the sky!',
  (playerManager, locationManager) => {
    // Handler logic
    return { playerEffects: {...} };
  },
  { bonusAmount: 50 } // Optional event data
);

// Location event
const locationEvent = eventDispatcher.createLocationEvent(
  'Tavern Party',
  'A celebration grants energy to all!',
  'tavern',
  (playerManager, locationManager) => {
    // Handler logic
    return { playerEffects: {...} };
  }
);

// Player event
const playerEvent = eventDispatcher.createPlayerEvent(
  'Personal Quest',
  'You received a mysterious letter...',
  playerId,
  (playerManager, locationManager) => {
    // Handler logic
    return { playerEffects: {...} };
  }
);
```

### Queueing and Scheduling

```javascript
// Queue for immediate execution
eventDispatcher.queueEvent(myEvent);

// Schedule for future execution (1 hour)
eventDispatcher.scheduleEvent(myEvent, 60 * 60 * 1000);

// Register periodic event (every 30 minutes)
eventDispatcher.registerPeriodicEvent(
  'daily-bonus',
  dailyBonusEvent,
  30 * 60 * 1000
);
```

### Managing Periodic Events

```javascript
// Disable an event temporarily
eventDispatcher.setPeriodicEventEnabled('magic-storm', false);

// Re-enable
eventDispatcher.setPeriodicEventEnabled('magic-storm', true);

// Remove completely
eventDispatcher.unregisterPeriodicEvent('magic-storm');

// Get all registered events
const events = eventDispatcher.getPeriodicEvents();
```

### Event Handlers

Event handlers receive `playerManager` and `locationManager` and should return an object with player effects:

```javascript
handler: (playerManager, locationManager) => {
  // Get affected players
  const players = locationManager.getPlayersInLocation('town-square');
  
  // Calculate effects
  const playerEffects = {};
  players.forEach(playerId => {
    const player = playerManager.getPlayer(playerId);
    if (player) {
      // Define stat changes
      playerEffects[playerId] = {
        mana: -20,        // Decrease by 20
        health: 10,       // Increase by 10
        energy: { set: 100 } // Set to specific value
      };
    }
  });
  
  // Return effects to apply
  return { playerEffects };
}
```

## Admin Tools

### HTTP API Endpoints

#### Get Periodic Events
```http
GET /api/events/periodic

Response:
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

#### Get Event History
```http
GET /api/events/history?limit=20

Response:
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

#### Inject Event (Admin)
```http
POST /api/events/inject
Content-Type: application/json

{
  "event": {
    "name": "Test Event",
    "description": "A test event",
    "scope": "global",
    "eventType": "test",
    "eventData": {}
  }
}

Response:
{
  "success": true,
  "message": "Event Test Event queued"
}
```

### CLI Tool

Use the admin CLI tool for manual event injection:

```bash
# Show help
node admin-inject-event.js --help

# List predefined events
node admin-inject-event.js --list

# Inject a predefined event
node admin-inject-event.js --event magic-storm

# Inject a custom global event
node admin-inject-event.js --custom \
  --name "Gold Rain" \
  --scope global \
  --description "Bonus currency for all!"

# Inject a custom location event
node admin-inject-event.js --custom \
  --name "Tavern Party" \
  --scope location \
  --location tavern \
  --description "Party at the tavern!"
```

## Client-Side Integration

### Receiving Events

The client automatically receives event notifications via WebSocket:

```javascript
// Event message format
{
  type: 'game_event',
  eventId: 'magic-storm',
  eventName: 'Magic Storm',
  eventType: 'weather',
  description: 'A powerful storm erupts...',
  timestamp: 1234567890,
  data: {
    manaDrain: 20,
    severity: 'moderate'
  }
}
```

### Event Subscriptions

Players are automatically subscribed to events upon authentication. For future extensions:

```javascript
// Subscribe to event channel
onlineGame.subscribeToEvents('all');

// Unsubscribe
onlineGame.unsubscribeFromEvents('all');
```

## Demo Event: Magic Storm

The system includes a demo periodic event that showcases all features:

**Event Name:** Magic Storm  
**Location:** Town Square  
**Frequency:** Every 15 minutes  
**Effect:** Drains 20 mana from all players in Town Square

This event:
- ✅ Runs periodically on a timer
- ✅ Targets a specific location
- ✅ Affects player state (mana)
- ✅ Broadcasts notifications to affected players
- ✅ Logs execution in event history

## Extending the System

### Adding New Event Types

1. **Define the event:**
```javascript
const customEvent = eventDispatcher.createLocationEvent(
  'Merchant Visit',
  'A traveling merchant arrives with rare items!',
  'town-square',
  (playerManager, locationManager) => {
    // Custom handler logic
    return { playerEffects: {} };
  },
  { merchantName: 'Mysterious Trader' }
);
```

2. **Register if periodic:**
```javascript
eventDispatcher.registerPeriodicEvent(
  'merchant-visit',
  customEvent,
  2 * 60 * 60 * 1000 // Every 2 hours
);
```

3. **Or queue for one-time execution:**
```javascript
eventDispatcher.queueEvent(customEvent);
```

### Event Categories (eventType)

Suggested categories for organization:
- `weather` - Environmental events
- `celestial` - Astronomical events
- `celebration` - Festivals and parties
- `combat` - Enemy encounters
- `bonus` - Reward events
- `penalty` - Negative events
- `quest` - Story-driven events
- `personal` - Player-specific events
- `town` - Settlement-wide events
- `custom` - Admin-injected events

## Best Practices

1. **Keep handlers lightweight** - Event loop runs every second
2. **Validate player state** - Check if players still exist before applying effects
3. **Use meaningful descriptions** - Players should understand what's happening
4. **Log important events** - Use event history for debugging
5. **Test with admin tools** - Verify events work before going live
6. **Balance frequencies** - Don't overwhelm players with too many events
7. **Consider player location** - Location-based events are less disruptive than global ones
8. **Provide feedback** - Always notify players when events affect them

## Troubleshooting

### Events not firing
- Check if EventDispatcher is initialized in server
- Verify periodic event is enabled: `eventDispatcher.setPeriodicEventEnabled(id, true)`
- Check server console for error messages

### Players not receiving notifications
- Ensure handlers are set: `eventDispatcher.setHandlers(...)`
- Verify player is connected and authenticated
- Check browser console for WebSocket errors

### Effects not applying
- Verify player exists when effect is applied
- Check that stat names match player data structure
- Review event handler return format

## Performance Considerations

- Event loop runs every second (1000ms)
- Event history limited to last 100 events
- Handlers should complete in < 100ms
- Use location-based events over global when possible
- Batch player updates in handlers

## Future Enhancements

Potential additions to the event system:
- Event chains (one event triggers another)
- Conditional events (only fire if criteria met)
- Event categories for filtering
- Player event preferences
- Event rewards and loot tables
- Seasonal/time-based events
- Event analytics and metrics
- Event templates for common patterns

## Support

For questions or issues with the event system:
- Check server logs for error messages
- Use admin tools to inspect event state
- Review event history for execution patterns
- Open a GitHub issue for bugs or feature requests

#!/usr/bin/env node

/**
 * Admin CLI Tool - Event Injection
 * Manually inject events into the game for testing and live-ops
 * 
 * Usage:
 *   node admin-inject-event.js --help
 *   node admin-inject-event.js --event magic-storm
 *   node admin-inject-event.js --custom --name "Test Event" --scope global --description "A test event"
 */

const http = require('http');

const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 8080;

// Predefined events for easy injection
const PREDEFINED_EVENTS = {
  'magic-storm': {
    name: 'Magic Storm',
    description: 'A powerful magical storm erupts in the Town Square!',
    scope: 'location',
    locationId: 'town-square',
    eventType: 'weather',
    eventData: {
      manaDrain: 20,
      severity: 'moderate'
    }
  },
  'gold-rain': {
    name: 'Gold Rain',
    description: 'Gold coins rain from the sky! All players receive bonus currency.',
    scope: 'global',
    eventType: 'bonus',
    handler: function(playerManager, locationManager) {
      const players = playerManager.getAllPlayers();
      const playerEffects = {};
      players.forEach(player => {
        playerEffects[player.id] = { pennies: 50 };
      });
      return { playerEffects };
    }
  },
  'tavern-party': {
    name: 'Tavern Party',
    description: 'A celebration at the Tavern! All visitors gain energy.',
    scope: 'location',
    locationId: 'tavern',
    eventType: 'celebration',
    eventData: {
      energyBonus: 25
    }
  },
  'lunar-eclipse': {
    name: 'Lunar Eclipse',
    description: 'A rare lunar eclipse boosts magical power worldwide!',
    scope: 'global',
    eventType: 'celestial',
    eventData: {
      manaBonus: 30,
      duration: 300000 // 5 minutes
    }
  }
};

function printHelp() {
  console.log(`
Admin Event Injection Tool
==========================

Usage:
  node admin-inject-event.js [options]

Options:
  --help                    Show this help message
  --list                    List all predefined events
  --event <name>            Inject a predefined event
  --custom                  Inject a custom event (requires other options)
  --name <name>            Event name (for custom events)
  --description <desc>     Event description (for custom events)
  --scope <scope>          Event scope: global, location, player (for custom events)
  --location <id>          Location ID (for location-scoped events)
  --player <id>            Player ID (for player-scoped events)

Predefined Events:
${Object.keys(PREDEFINED_EVENTS).map(key => `  - ${key}`).join('\n')}

Examples:
  node admin-inject-event.js --list
  node admin-inject-event.js --event magic-storm
  node admin-inject-event.js --custom --name "Test" --scope global --description "A test event"
  node admin-inject-event.js --custom --name "Local Test" --scope location --location town-square --description "Test event"
  `);
}

function listPredefinedEvents() {
  console.log('\nPredefined Events:\n');
  Object.entries(PREDEFINED_EVENTS).forEach(([key, event]) => {
    console.log(`${key}:`);
    console.log(`  Name: ${event.name}`);
    console.log(`  Description: ${event.description}`);
    console.log(`  Scope: ${event.scope}${event.locationId ? ` (${event.locationId})` : ''}`);
    console.log('');
  });
}

function injectEvent(event) {
  const data = JSON.stringify({ event });
  
  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/events/inject',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  console.log(`\nInjecting event: ${event.name}`);
  console.log(`Target: ${SERVER_HOST}:${SERVER_PORT}\n`);
  
  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        if (result.success) {
          console.log('✅ Event injected successfully!');
          console.log(`Message: ${result.message}`);
        } else {
          console.log('❌ Event injection failed!');
          console.log(`Error: ${result.message}`);
        }
      } catch (e) {
        console.error('❌ Error parsing response:', e.message);
        console.error('Response:', responseData);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error connecting to server:', error.message);
    console.error('Make sure the server is running on', `${SERVER_HOST}:${SERVER_PORT}`);
  });
  
  req.write(data);
  req.end();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '--event') {
      options.event = args[++i];
    } else if (arg === '--custom') {
      options.custom = true;
    } else if (arg === '--name') {
      options.name = args[++i];
    } else if (arg === '--description') {
      options.description = args[++i];
    } else if (arg === '--scope') {
      options.scope = args[++i];
    } else if (arg === '--location') {
      options.location = args[++i];
    } else if (arg === '--player') {
      options.player = args[++i];
    }
  }
  
  return options;
}

function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  if (options.list) {
    listPredefinedEvents();
    return;
  }
  
  if (options.event) {
    const event = PREDEFINED_EVENTS[options.event];
    if (!event) {
      console.error(`❌ Unknown event: ${options.event}`);
      console.error('Use --list to see available events');
      process.exit(1);
    }
    injectEvent(event);
    return;
  }
  
  if (options.custom) {
    if (!options.name || !options.scope || !options.description) {
      console.error('❌ Custom events require --name, --scope, and --description');
      process.exit(1);
    }
    
    const event = {
      name: options.name,
      description: options.description,
      scope: options.scope,
      eventType: 'custom',
      eventData: {}
    };
    
    if (options.scope === 'location') {
      if (!options.location) {
        console.error('❌ Location-scoped events require --location');
        process.exit(1);
      }
      event.locationId = options.location;
    }
    
    if (options.scope === 'player') {
      if (!options.player) {
        console.error('❌ Player-scoped events require --player');
        process.exit(1);
      }
      event.playerId = options.player;
    }
    
    injectEvent(event);
    return;
  }
  
  // No valid options provided
  printHelp();
}

// Run the CLI
main();

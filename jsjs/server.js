// server.js
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const { v4: uuidv4 } = require('uuid');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Game state
const players = new Map(); // playerId -> { ws, data }
const locations = new Map(); // locationId -> Set(playerId)

// Handle new connections
wss.on('connection', (ws, req) => {
    const playerId = uuidv4();
    const ip = req.socket.remoteAddress;
    
    console.log(`New connection from ${ip} (${playerId})`);
    
    // Add to players map
    players.set(playerId, {
        ws,
        data: {
            id: playerId,
            name: `Wizard-${Math.floor(Math.random() * 1000)}`,
            location: 'town_square',
            lastPing: Date.now()
        }
    });
    
    // Add to location
    if (!locations.has('town_square')) {
        locations.set('town_square', new Set());
    }
    locations.get('town_square').add(playerId);
    
    // Send initial data
    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        serverTime: Date.now()
    }));
    
    // Handle messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(playerId, data);
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        console.log(`Player ${playerId} disconnected`);
        const player = players.get(playerId);
        if (player) {
            // Remove from location
            const location = locations.get(player.data.location);
            if (location) {
                location.delete(playerId);
            }
            // Remove from players
            players.delete(playerId);
            // Notify others
            broadcastPlayerLeft(playerId, player.data.location);
        }
    });
});

// Handle incoming messages
function handleMessage(playerId, message) {
    const player = players.get(playerId);
    if (!player) return;
    
    player.lastPing = Date.now();
    
    switch (message.type) {
        case 'ping':
            player.ws.send(JSON.stringify({
                type: 'pong',
                serverTime: Date.now()
            }));
            break;
            
        case 'move':
            handleMove(player, message.locationId);
            break;
            
        case 'chat':
            handleChat(player, message.channel, message.message);
            break;
            
        // Add more message handlers here
    }
}

// Handle player movement
function handleMove(player, locationId) {
    const oldLocation = player.data.location;
    
    // Remove from old location
    const oldLocationPlayers = locations.get(oldLocation);
    if (oldLocationPlayers) {
        oldLocationPlayers.delete(player.data.id);
        broadcastPlayerLeft(player.data.id, oldLocation);
    }
    
    // Add to new location
    if (!locations.has(locationId)) {
        locations.set(locationId, new Set());
    }
    locations.get(locationId).add(player.data.id);
    player.data.location = locationId;
    
    // Send location update to player
    player.ws.send(JSON.stringify({
        type: 'location_update',
        location: locationId,
        players: getPlayersInLocation(locationId)
    }));
    
    // Notify other players in new location
    broadcastPlayerJoined(player.data, locationId);
}

// Handle chat messages
function handleChat(player, channel, message) {
    if (channel === 'global') {
        // Broadcast to all players
        broadcastMessage({
            type: 'chat_message',
            channel: 'global',
            from: player.data.name,
            message: message,
            timestamp: Date.now()
        });
    } else if (channel === 'local') {
        // Broadcast to players in the same location
        broadcastToLocation(player.data.location, {
            type: 'chat_message',
            channel: 'local',
            from: player.data.name,
            message: message,
            timestamp: Date.now()
        });
    }
    // Add more channel types (guild, party, etc.)
}

// Helper functions
function getPlayersInLocation(locationId) {
    const playersInLocation = [];
    const playerIds = locations.get(locationId) || new Set();
    
    for (const playerId of playerIds) {
        const player = players.get(playerId);
        if (player) {
            playersInLocation.push(player.data);
        }
    }
    
    return playersInLocation;
}

function broadcastPlayerJoined(player, locationId) {
    broadcastToLocation(locationId, {
        type: 'player_joined',
        player: {
            id: player.id,
            name: player.name,
            level: player.level
            // Add more player data as needed
        }
    });
}

function broadcastPlayerLeft(playerId, locationId) {
    broadcastToLocation(locationId, {
        type: 'player_left',
        playerId: playerId
    });
}

function broadcastToLocation(locationId, message) {
    const playerIds = locations.get(locationId) || new Set();
    
    for (const playerId of playerIds) {
        const player = players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
}

function broadcastMessage(message) {
    for (const [_, player] of players) {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
}

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Clean up disconnected players
setInterval(() => {
    const now = Date.now();
    for (const [playerId, player] of players) {
        if (now - player.lastPing > 60000) { // 1 minute timeout
            console.log(`Player ${playerId} timed out`);
            player.ws.terminate();
        }
    }
}, 30000); // Check every 30 seconds

# Contributing to High Wizardry

Thank you for your interest in contributing to High Wizardry! This document provides guidelines for contributors and developers.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Project Architecture](#project-architecture)
4. [Code Style & Conventions](#code-style--conventions)
5. [Module Development](#module-development)
6. [API Development](#api-development)
7. [Event System](#event-system)
8. [Testing](#testing)
9. [Security](#security)
10. [Deployment](#deployment)
11. [Scaling](#scaling)
12. [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- **Node.js 16+** for running the server
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **Git** for version control
- **Code editor** (VS Code recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Con-source/high-Wizardry.git
cd high-Wizardry

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:8080
```

---

## Development Setup

### Directory Structure

```
high-Wizardry/
├── index.html              # Main game UI
├── jsjs/                   # Client-side JavaScript modules
│   ├── main.js             # Game initialization
│   ├── player.js           # Player state management
│   ├── ui.js               # UI components
│   ├── chat.js             # Chat system
│   ├── online.game.js      # Multiplayer client
│   ├── trade.js            # Trading system
│   ├── auction.js          # Auction house
│   ├── guilds.js           # Guild system
│   ├── workshop.js         # Crafting system
│   ├── black-market.js     # Black market
│   ├── achievements.js     # Achievement system
│   ├── consumables.js      # Consumables
│   ├── locations.js        # Location system
│   ├── community.js        # Player search/profiles
│   └── config.js           # Game configuration
├── server/                 # Backend server
│   ├── index.js            # Main server file
│   ├── auth/               # Authentication
│   │   └── AuthManager.js  # Auth logic
│   ├── game/               # Game logic
│   │   ├── GameManager.js
│   │   ├── PlayerManager.js
│   │   ├── LocationManager.js
│   │   ├── EventDispatcher.js
│   │   ├── TradeManager.js
│   │   └── AuctionManager.js
│   └── utils/              # Utilities
│       ├── RateLimiter.js
│       ├── InputValidator.js
│       └── CsrfProtection.js
├── docs/                   # Documentation
├── tests/                  # Test files
├── css/                    # Stylesheets (note: actual folder is named '{css')
└── package.json            # Dependencies
```

### Development Tools

**Recommended VS Code Extensions:**
- ESLint
- Prettier
- Live Server (for static file testing)
- GitLens

**Browser DevTools:**
- Console for debugging
- Network tab for WebSocket inspection
- Application tab for localStorage

---

## Project Architecture

### Client-Side Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  main   │ │  player │ │   ui    │ │  chat   │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ online  │ │  trade  │ │ auction │ │ guilds  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │workshop │ │  black  │ │ achieve │ │ consume │       │
│  │         │ │ market  │ │  ments  │ │  ables  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Server (Node.js)                      │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────────────┐   │
│  │   AuthManager     │  │      GameManager          │   │
│  └───────────────────┘  └───────────────────────────┘   │
│  ┌───────────────────┐  ┌───────────────────────────┐   │
│  │  PlayerManager    │  │     LocationManager       │   │
│  └───────────────────┘  └───────────────────────────┘   │
│  ┌───────────────────┐  ┌───────────────────────────┐   │
│  │   TradeManager    │  │     AuctionManager        │   │
│  └───────────────────┘  └───────────────────────────┘   │
│  ┌───────────────────┐                                  │
│  │  EventDispatcher  │                                  │
│  └───────────────────┘                                  │
└─────────────────────────────────────────────────────────┘
```

### Server-Side Architecture

```
Client Request → Rate Limiter → Input Validator → Handler → Response
                                      │
                                      ▼
                              Manager Classes
                              (PlayerManager,
                               TradeManager, etc.)
                                      │
                                      ▼
                              In-Memory Storage
                              (Future: Database)
```

---

## Code Style & Conventions

### JavaScript Style

```javascript
// Use modern ES6+ syntax
const myFunction = (param) => {
  // Use const/let, not var
  const value = param * 2;
  
  // Use template literals
  console.log(`Value is: ${value}`);
  
  return value;
};

// Use arrow functions for callbacks
array.map(item => item.id);

// Use async/await for promises
async function fetchData() {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}
```

### Module Pattern

All client-side modules follow this pattern:

```javascript
/**
 * Module Name
 * Brief description of module purpose
 */
const ModuleName = (() => {
  'use strict';
  
  // Private state
  const state = {
    initialized: false,
    data: []
  };
  
  // Private methods
  function privateHelper() {
    // Implementation
  }
  
  // Public methods
  function init() {
    if (state.initialized) return;
    
    console.log('✅ ModuleName initialized');
    state.initialized = true;
    return true;
  }
  
  function publicMethod(param) {
    // Implementation
  }
  
  // Public API
  return {
    init,
    publicMethod,
    getData: () => [...state.data] // Return copies
  };
})();

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ModuleName.init();
  });
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModuleName;
}
```

### Console Logging

Use emoji prefixes for easy identification:

```javascript
console.log('✅ Success message');     // Success/init
console.log('⚠️ Warning message');     // Warnings
console.log('❌ Error message');       // Errors
console.log('🔄 Processing...');       // In progress
console.log('📊 Data:', data);         // Data logging
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `playerData` |
| Functions | camelCase | `getUserById` |
| Classes | PascalCase | `PlayerManager` |
| Constants | UPPER_SNAKE | `MAX_PLAYERS` |
| Files | kebab-case | `player-manager.js` |
| CSS Classes | kebab-case | `.player-card` |

---

## Module Development

### Creating a New Client Module

1. Create file in `jsjs/` directory:

```javascript
// jsjs/my-feature.js

/**
 * My Feature Module
 * Description of what this module does
 */
const MyFeature = (() => {
  'use strict';
  
  const state = {
    initialized: false
  };
  
  function init() {
    if (state.initialized) return;
    
    setupUI();
    setupEventListeners();
    
    console.log('✅ MyFeature initialized');
    state.initialized = true;
    return true;
  }
  
  function setupUI() {
    // Create/find UI elements
  }
  
  function setupEventListeners() {
    // Add event listeners
  }
  
  // Public API
  return {
    init,
    // Add public methods
  };
})();

// Auto-init
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    MyFeature.init();
  });
}
```

2. Add script tag to `index.html`:

```html
<script src="jsjs/my-feature.js"></script>
```

3. Initialize in `main.js` if dependency order matters:

```javascript
// In main.js
MyFeature.init();
```

### Creating a Server Manager

```javascript
// server/game/MyManager.js

class MyManager {
  constructor(playerManager) {
    this.playerManager = playerManager;
    this.data = new Map();
  }
  
  processAction(playerId, actionData) {
    // Validate input
    if (!playerId || !actionData) {
      return { success: false, message: 'Invalid request' };
    }
    
    // Get player
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    // Process action
    // ...
    
    return { success: true, result: {} };
  }
}

module.exports = MyManager;
```

---

## API Development

### Adding WebSocket Message Handlers

In `server/index.js`:

```javascript
// In handleWebSocketMessage method
case 'my_action':
  this.handleMyAction(client, message);
  break;

// Add handler method
handleMyAction(client, message) {
  // Validate authentication
  if (!client.authenticated) {
    return this.send(client.ws, {
      type: 'my_action_result',
      success: false,
      message: 'Not authenticated'
    });
  }
  
  // Validate input
  const validation = InputValidator.validate(message.data);
  if (!validation.valid) {
    return this.send(client.ws, {
      type: 'my_action_result',
      success: false,
      message: validation.message
    });
  }
  
  // Process action
  const result = this.myManager.processAction(
    client.playerId,
    validation.sanitized
  );
  
  // Send response
  this.send(client.ws, {
    type: 'my_action_result',
    ...result
  });
}
```

### Adding HTTP Endpoints

```javascript
// In setupRoutes method
this.app.get('/api/my-endpoint', (req, res) => {
  // Rate limit check
  if (!this.httpLimiter.isAllowed(req.ip)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests'
    });
  }
  
  // Handle request
  const result = this.myManager.getData();
  
  res.json({
    success: true,
    data: result
  });
});
```

---

## Event System

### Creating New Events

See [docs/EVENTS.md](./EVENTS.md) for complete event system documentation.

**Quick Example:**

```javascript
// Create a global event
const myEvent = eventDispatcher.createGlobalEvent(
  'Treasure Hunt',
  'Hidden treasures appear across the land!',
  (playerManager, locationManager) => {
    const players = playerManager.getAllPlayers();
    const playerEffects = {};
    
    players.forEach(player => {
      playerEffects[player.id] = {
        currency: Math.floor(Math.random() * 100) + 50
      };
    });
    
    return { playerEffects };
  },
  { treasureAmount: 'random' }
);

// Queue for immediate execution
eventDispatcher.queueEvent(myEvent);

// Or register as periodic
eventDispatcher.registerPeriodicEvent(
  'treasure-hunt',
  myEvent,
  2 * 60 * 60 * 1000 // Every 2 hours
);
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test files
node test-auth.js
node test-rate-limiter.js
node test-events.js

# Run security tests
npm run test:security
```

### Writing Tests

```javascript
// test-my-feature.js

const assert = require('assert');
const MyFeature = require('./path/to/my-feature');

async function runTests() {
  console.log('Running MyFeature tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1
  try {
    const result = MyFeature.doSomething('input');
    assert.strictEqual(result.success, true);
    console.log('✓ Test 1 passed');
    passed++;
  } catch (error) {
    console.log('✗ Test 1 failed:', error.message);
    failed++;
  }
  
  // Summary
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
```

### Manual Testing

1. **Single Player Mode:**
   - Open `index.html` directly in browser
   - Test all features without server

2. **Multiplayer Mode:**
   ```bash
   npm run dev
   # Open multiple browser windows
   # Create different accounts
   # Test trading, chat, etc.
   ```

3. **Browser Console:**
   ```javascript
   // Access modules for testing
   console.log(Player.getData());
   console.log(Workshop.getCraftingQueue());
   
   // Trigger events manually
   Achievements.checkAchievements();
   ```

---

## Security

### Security Checklist

Before submitting a PR:

- [ ] All user inputs validated with `InputValidator`
- [ ] Outputs sanitized to prevent XSS
- [ ] Rate limiting on new endpoints
- [ ] CSRF protection on state-changing operations
- [ ] Authentication checked before processing
- [ ] Sensitive data not logged
- [ ] Security tests added/updated

### Common Security Patterns

```javascript
// Input validation
const validation = InputValidator.validateUsername(input);
if (!validation.valid) {
  return { success: false, message: validation.message };
}
const safeInput = validation.sanitized;

// Rate limiting
if (!this.rateLimiter.isAllowed(clientId)) {
  return { success: false, message: 'Too many requests' };
}

// Authentication check
if (!client.authenticated) {
  return { success: false, message: 'Not authenticated' };
}

// CSRF protection
if (!this.csrfProtection.validateToken(sessionId, token)) {
  return { success: false, message: 'Invalid token' };
}
```

See [docs/SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) for more details.

---

## Deployment

### Production Checklist

See [docs/DEPLOYMENT_SECURITY_CHECKLIST.md](./DEPLOYMENT_SECURITY_CHECKLIST.md) for complete checklist.

**Key Steps:**

1. **Environment Configuration:**
   ```bash
   # Required environment variables
   export PORT=8080
   export NODE_ENV=production
   
   # Email configuration
   export EMAIL_ENABLED=true
   export EMAIL_SERVICE=your-service
   export EMAIL_USER=your-email
   export EMAIL_PASS=your-password
   export EMAIL_FROM=noreply@yourdomain.com
   ```

2. **Build & Start:**
   ```bash
   npm ci --production
   npm start
   ```

3. **Reverse Proxy (nginx):**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 8080
CMD ["npm", "start"]
```

```bash
docker build -t high-wizardry .
docker run -p 8080:8080 high-wizardry
```

---

## Scaling

### Current Architecture

The current implementation uses in-memory storage, suitable for:
- Single server deployments
- Development and testing
- Small to medium player counts (100-500 concurrent)

### Scaling Strategies

#### Horizontal Scaling (Multiple Servers)

1. **Add Redis for session storage:**
   ```javascript
   const Redis = require('ioredis');
   const redis = new Redis();
   
   // Store session
   await redis.set(`session:${token}`, JSON.stringify(sessionData));
   
   // Retrieve session
   const session = JSON.parse(await redis.get(`session:${token}`));
   ```

2. **Add database for persistence:**
   ```javascript
   // Example with MongoDB
   const mongoose = require('mongoose');
   
   const PlayerSchema = new mongoose.Schema({
     username: String,
     level: Number,
     // ...
   });
   
   const Player = mongoose.model('Player', PlayerSchema);
   ```

3. **Use WebSocket adapter for broadcasting:**
   ```javascript
   const { createAdapter } = require('@socket.io/redis-adapter');
   
   // Share messages between server instances
   io.adapter(createAdapter(pubClient, subClient));
   ```

#### Load Balancing

```nginx
upstream high_wizardry {
    ip_hash;  # Sticky sessions for WebSocket
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    location / {
        proxy_pass http://high_wizardry;
    }
}
```

### Performance Optimization

1. **Client-side:**
   - Minimize DOM updates
   - Use requestAnimationFrame for animations
   - Lazy load non-critical modules

2. **Server-side:**
   - Use connection pooling
   - Implement caching
   - Optimize database queries
   - Use compression

---

## Pull Request Process

### Before Submitting

1. **Fork and branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes following conventions**

3. **Test thoroughly:**
   ```bash
   npm test
   node test-auth.js
   # Manual testing in browser
   ```

4. **Update documentation** if needed

5. **Commit with clear messages:**
   ```bash
   git commit -m "feat: add new trading feature"
   git commit -m "fix: resolve chat message escaping"
   git commit -m "docs: update API documentation"
   ```

### Commit Message Format

```
type: description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] All tests pass
- [ ] Manual testing completed
- [ ] Tested in multiple browsers

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No new security vulnerabilities
```

### Review Process

1. Maintainers review code and documentation
2. Automated tests run
3. Security scan performed
4. Changes requested or approved
5. Merged when approved

---

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check `/docs` folder
- **Code Examples**: Look at existing modules
- **Community**: Join in-game chat

---

Thank you for contributing to High Wizardry! 🧙‍♂️✨

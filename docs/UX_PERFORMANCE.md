# UX and Performance Enhancements

This document describes the UX improvements and performance optimizations added to High Wizardry.

## Table of Contents
- [Client-Side Enhancements](#client-side-enhancements)
- [Server-Side Optimizations](#server-side-optimizations)
- [Accessibility Features](#accessibility-features)
- [Tutorial System](#tutorial-system)
- [Performance Monitoring](#performance-monitoring)

## Client-Side Enhancements

### Loading States & Visual Feedback

The game now includes comprehensive loading indicators and visual feedback:

**Skeleton Screens**
- Used during initial load to show content structure
- Reduces perceived loading time
- Provides better user experience

```css
/* Usage */
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-card"></div>
```

**Loading Spinner**
- Available in multiple sizes (default, large)
- Consistent across all loading operations
- Uses CSS animations for smooth performance

```html
<div class="spinner"></div>
<div class="spinner spinner-large"></div>
```

**Button Loading States**
- Prevents double-clicks during operations
- Provides visual feedback for async actions
- Accessible to screen readers

```javascript
// Using Accessibility module
Accessibility.setButtonLoading(button, 'Processing...');
// ... perform operation ...
Accessibility.setButtonReady(button, 'Complete!');
```

### Smooth Transitions & Animations

All UI interactions include smooth transitions:

- **Fade In**: Content appears smoothly when loaded
- **Slide In**: Notifications and modals slide into view
- **Scale In**: Cards and popups scale elegantly
- **Hover Effects**: Interactive elements respond to hover
- **Ripple Effect**: Buttons show click feedback

**Reduced Motion Support**
The app respects user preferences for reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are disabled or minimized */
}
```

### Enhanced Focus States

All interactive elements have clear, visible focus indicators:

- 2px outline with offset for better visibility
- Custom focus styles for buttons, inputs, and links
- Keyboard navigation support throughout the app
- Skip-to-content link for screen reader users

## Server-Side Optimizations

### Caching System

The `CacheManager` module provides efficient in-memory caching:

**Features:**
- TTL (Time To Live) support for automatic expiration
- Pattern-based cache invalidation
- Specialized caches for different data types
- Cache statistics and hit rate tracking

**Usage Example:**
```javascript
const { PlayerCache } = require('./server/utils/CacheManager');
const playerCache = new PlayerCache();

// Cache player data
playerCache.setPlayer(playerId, playerData, 300000); // 5 minutes TTL

// Retrieve cached data
const cachedPlayer = playerCache.getPlayer(playerId);

// Invalidate when data changes
playerCache.invalidatePlayer(playerId);
```

**Available Caches:**
1. **PlayerCache**: Player data, stats, and profiles
2. **LeaderboardCache**: Leaderboard rankings
3. **LocationCache**: Location-based player lists

### WebSocket Connection Pool

The `WebSocketPoolManager` handles WebSocket connections efficiently:

**Features:**
- Connection limits (global and per-IP)
- Backpressure handling with message queuing
- Automatic heartbeat/ping-pong for dead connection detection
- Connection age and idle time tracking
- Graceful shutdown

**Configuration:**
```javascript
const pool = new WebSocketPoolManager({
  maxConnections: 1000,
  maxConnectionsPerIP: 5,
  connectionTimeout: 30000,
  heartbeatInterval: 30000,
  messageQueueLimit: 100
});
```

**Usage:**
```javascript
// Add connection
pool.addConnection(clientId, ws, ip);

// Send message with backpressure handling
pool.sendMessage(clientId, message);

// Broadcast to all or filtered connections
pool.broadcast(message, (conn) => conn.authenticated);

// Get statistics
const stats = pool.getStats();
```

### Performance Monitoring

The `PerformanceMonitor` tracks server health and performance:

**Metrics Tracked:**
- CPU and memory usage
- Request/response times
- WebSocket message processing
- Database query performance
- Cache hit/miss rates

**Usage:**
```javascript
const monitor = new PerformanceMonitor({
  sampleInterval: 60000, // 1 minute
  historySize: 60 // 1 hour of history
});

// Track operations
monitor.trackRequest(duration);
monitor.trackWebSocketMessage(duration);
monitor.trackDatabaseQuery('SELECT', duration);
monitor.trackCacheHit();

// Get current metrics
const metrics = monitor.getCurrentMetrics();

// Get health status
const health = monitor.healthCheck();

// Log report
monitor.logReport();
```

## Accessibility Features

The `Accessibility` module provides comprehensive accessibility support:

### Keyboard Navigation

**Supported Keys:**
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals, clear inputs
- **Arrow Keys**: Navigate lists and menus
- **Ctrl/Cmd + K**: Open command palette (future feature)

**Implementation:**
```javascript
// Automatic keyboard navigation setup
Accessibility.init();

// Trap focus in modal
Accessibility.trapFocus(modalElement);

// Release focus trap
Accessibility.releaseFocusTrap();
```

### Screen Reader Support

**ARIA Live Regions:**
- Polite announcements for non-critical updates
- Assertive announcements for errors and warnings
- Automatic announcement of notifications

**Usage:**
```javascript
// Announce to screen readers
Accessibility.announce('Achievement unlocked!', 'polite');

// Announce notification
Accessibility.announceNotification('Player joined', 'info');
```

**ARIA Label Enhancement:**
The module automatically enhances ARIA labels for:
- Buttons without visible text
- Progress bars and indicators
- Interactive controls
- Dynamic content updates

### Focus Management

**Focus Trap:**
Keeps focus within modals and dialogs:
```javascript
// When modal opens
Accessibility.trapFocus(modalElement);

// When modal closes
Accessibility.releaseFocusTrap();
```

**Skip to Content:**
Allows screen reader users to skip navigation:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

## Tutorial System

The `Tutorial` module provides interactive onboarding for new players:

### Features
- Step-by-step guided tours
- Spotlight highlighting of UI elements
- Keyboard navigation support
- Progress tracking
- Restartable tutorials

### Tutorial Types

**Welcome Tutorial:**
Introduces new players to core game features:
1. Game header and controls
2. Character stats panel
3. Location navigation
4. Main content area
5. Game log
6. Key features and help

### Usage

**Starting a Tutorial:**
```javascript
// Start welcome tutorial
Tutorial.start('welcome');

// Restart tutorial
Tutorial.restart('welcome');
```

**Custom Tutorials:**
```javascript
const customTutorial = [
  {
    target: '.my-element',
    title: 'My Feature',
    content: 'This is how to use this feature.',
    position: 'bottom',
    onShow: () => console.log('Step shown'),
    onComplete: () => console.log('Step completed')
  }
];

// Add custom tutorial
tutorials.myFeature = customTutorial;
Tutorial.start('myFeature');
```

### Keyboard Controls in Tutorial
- **Right Arrow / Enter**: Next step
- **Left Arrow**: Previous step
- **Escape**: Skip tutorial

## Performance Monitoring

### Client-Side Performance

The `Performance` module tracks client-side metrics:

**Features:**
- Page load time measurement
- Resource loading tracking
- First Input Delay (FID) monitoring
- Slow resource detection

**Usage:**
```javascript
// Get metrics
const metrics = Performance.getMetrics();

// Log report
Performance.logReport();

// Debounce functions
const debouncedSearch = Performance.debounce(searchFunction, 300);

// Throttle functions
const throttledScroll = Performance.throttle(scrollHandler, 100);
```

### Lazy Loading

Images and resources are loaded only when needed:

```html
<!-- Lazy load image -->
<img data-src="image.jpg" alt="Description" />

<!-- Lazy load background -->
<div data-bg="background.jpg"></div>

<!-- Lazy load iframe -->
<iframe data-src="https://example.com"></iframe>
```

### Virtual Scrolling

For large lists (1000+ items), use virtual scrolling:

```javascript
const virtualScroll = Performance.createVirtualScroll(
  containerElement,
  itemsArray,
  renderItemFunction,
  itemHeight
);

// Update list
virtualScroll.update();

// Cleanup
virtualScroll.destroy();
```

## Best Practices

### Client-Side
1. Use loading states for all async operations
2. Debounce search and filter inputs
3. Throttle scroll and resize handlers
4. Lazy load images and non-critical resources
5. Provide keyboard navigation for all features
6. Include ARIA labels for dynamic content

### Server-Side
1. Cache frequently accessed data (player stats, leaderboards)
2. Invalidate cache when data changes
3. Monitor WebSocket connection counts
4. Use connection pooling for scalability
5. Track performance metrics regularly
6. Set up alerts for performance degradation

### Accessibility
1. Always provide text alternatives for images
2. Use semantic HTML elements
3. Include skip links for navigation
4. Test with keyboard-only navigation
5. Test with screen readers
6. Respect user preferences (reduced motion, high contrast)

## Performance Targets

### Client-Side
- **Page Load**: < 3 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 3.5 seconds
- **First Input Delay**: < 100ms

### Server-Side
- **Request Response Time**: < 200ms (average)
- **WebSocket Message Processing**: < 50ms (average)
- **Database Query Time**: < 100ms (average)
- **Cache Hit Rate**: > 80%
- **Connection Pool Usage**: < 80% capacity

## Testing

### Accessibility Testing
```bash
# Install axe-core for accessibility testing
npm install --save-dev axe-core

# Run accessibility audit in browser console
axe.run(document, (err, results) => {
  console.log(results);
});
```

### Performance Testing
```bash
# Use Lighthouse for performance audits
npx lighthouse http://localhost:8080 --view

# Load testing with artillery
npm install -g artillery
artillery quick --count 10 --num 100 http://localhost:8080
```

## Troubleshooting

### High Memory Usage
```javascript
// Check cache size
const cacheStats = cache.getStats();
console.log('Cache size:', cacheStats.size);

// Clear cache if needed
cache.clear();
```

### Slow WebSocket Performance
```javascript
// Check connection pool stats
const poolStats = pool.getStats();
console.log('Active connections:', poolStats.activeConnections);
console.log('Queued messages:', poolStats.queuedMessages);

// Check for dead connections
pool.getStats(); // Shows connection health
```

### Performance Issues
```javascript
// Get server health check
const health = monitor.healthCheck();
if (!health.healthy) {
  console.warn('Performance issues:', health.issues);
}

// Get detailed report
monitor.logReport();
```

## Future Enhancements

Planned improvements include:
- Service Worker for offline support
- HTTP/2 server push
- WebAssembly for computationally intensive operations
- Redis integration for distributed caching
- GraphQL API for efficient data fetching
- Progressive Web App (PWA) features

## Contributing

When adding new features:
1. Include loading states and error handling
2. Add keyboard navigation support
3. Include ARIA labels and roles
4. Test with screen readers
5. Monitor performance impact
6. Update this documentation

## Resources

- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Web Performance Working Group](https://www.w3.org/webperf/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

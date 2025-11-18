/**
 * Event Dispatcher
 * Central event handling system for game world events, player-specific events,
 * and location-based broadcasts. Supports both one-off and periodic (tick-based) events.
 */

class EventDispatcher {
  constructor(playerManager, locationManager) {
    this.playerManager = playerManager;
    this.locationManager = locationManager;
    
    // Event queues
    this.oneOffEvents = []; // Events that execute once
    this.periodicEvents = new Map(); // eventId -> { interval, lastRun, handler, enabled }
    this.scheduledEvents = []; // Events scheduled for future execution
    
    // Event handlers (callbacks to send messages to clients)
    this.broadcastHandler = null; // Function to broadcast to all clients
    this.broadcastToLocationHandler = null; // Function to broadcast to location
    this.sendToPlayerHandler = null; // Function to send to specific player
    
    // Event history (for debugging/admin)
    this.eventHistory = [];
    this.maxHistorySize = 100;
    
    // Start event processing loop
    this.startEventLoop();
  }
  
  /**
   * Set handlers for sending messages to clients
   */
  setHandlers(broadcastHandler, broadcastToLocationHandler, sendToPlayerHandler) {
    this.broadcastHandler = broadcastHandler;
    this.broadcastToLocationHandler = broadcastToLocationHandler;
    this.sendToPlayerHandler = sendToPlayerHandler;
  }
  
  /**
   * Start the event processing loop (runs every second)
   */
  startEventLoop() {
    this.eventLoopInterval = setInterval(() => {
      this.processEvents();
    }, 1000);
    
    console.log('✅ EventDispatcher: Event loop started');
  }
  
  /**
   * Stop the event processing loop
   */
  stopEventLoop() {
    if (this.eventLoopInterval) {
      clearInterval(this.eventLoopInterval);
      console.log('🛑 EventDispatcher: Event loop stopped');
    }
  }
  
  /**
   * Process all pending events
   */
  processEvents() {
    const now = Date.now();
    
    // Process one-off events
    while (this.oneOffEvents.length > 0) {
      const event = this.oneOffEvents.shift();
      this.executeEvent(event);
    }
    
    // Process scheduled events
    this.scheduledEvents = this.scheduledEvents.filter(event => {
      if (event.executeAt <= now) {
        this.executeEvent(event);
        return false; // Remove from scheduled events
      }
      return true; // Keep in scheduled events
    });
    
    // Process periodic events
    this.periodicEvents.forEach((eventData, eventId) => {
      if (!eventData.enabled) return;
      
      const timeSinceLastRun = now - eventData.lastRun;
      if (timeSinceLastRun >= eventData.interval) {
        eventData.lastRun = now;
        this.executeEvent(eventData.event);
      }
    });
  }
  
  /**
   * Execute a single event
   */
  executeEvent(event) {
    try {
      // Add to history
      this.addToHistory({
        ...event,
        executedAt: Date.now()
      });
      
      // Execute the event handler
      if (event.handler) {
        const result = event.handler(this.playerManager, this.locationManager);
        
        // If handler returns effects, apply them
        if (result && result.playerEffects) {
          this.applyPlayerEffects(result.playerEffects);
        }
      }
      
      // Send notifications based on event scope
      this.notifyEvent(event);
      
      console.log(`⚡ Event executed: ${event.name} (${event.eventType})`);
    } catch (error) {
      console.error(`❌ Error executing event ${event.name}:`, error);
    }
  }
  
  /**
   * Apply effects to players
   */
  applyPlayerEffects(playerEffects) {
    for (const [playerId, effects] of Object.entries(playerEffects)) {
      const player = this.playerManager.getPlayer(playerId);
      if (!player) continue;
      
      // Apply each effect
      const updates = {};
      for (const [stat, change] of Object.entries(effects)) {
        if (stat in player) {
          if (typeof change === 'number') {
            updates[stat] = player[stat] + change;
          } else if (typeof change === 'object' && change.set !== undefined) {
            updates[stat] = change.set;
          }
        }
      }
      
      // Update player
      if (Object.keys(updates).length > 0) {
        this.playerManager.updatePlayer(playerId, updates);
        
        // Notify player of updates
        if (this.sendToPlayerHandler) {
          this.sendToPlayerHandler(playerId, {
            type: 'player_updated',
            updates: updates
          });
        }
      }
    }
  }
  
  /**
   * Notify clients about an event
   */
  notifyEvent(event) {
    const message = {
      type: 'game_event',
      eventId: event.eventId || event.name,
      eventName: event.name,
      eventType: event.eventType,
      description: event.description,
      timestamp: Date.now(),
      data: event.eventData || {}
    };
    
    switch (event.scope) {
      case 'global':
        if (this.broadcastHandler) {
          this.broadcastHandler(message);
        }
        break;
        
      case 'location':
        if (this.broadcastToLocationHandler && event.locationId) {
          this.broadcastToLocationHandler(event.locationId, message);
        }
        break;
        
      case 'player':
        if (this.sendToPlayerHandler && event.playerId) {
          this.sendToPlayerHandler(event.playerId, message);
        }
        break;
        
      case 'players':
        if (this.sendToPlayerHandler && event.playerIds) {
          event.playerIds.forEach(playerId => {
            this.sendToPlayerHandler(playerId, message);
          });
        }
        break;
    }
  }
  
  /**
   * Queue a one-off event for immediate execution
   */
  queueEvent(event) {
    this.oneOffEvents.push({
      ...event,
      queuedAt: Date.now()
    });
  }
  
  /**
   * Schedule an event for future execution
   */
  scheduleEvent(event, delayMs) {
    this.scheduledEvents.push({
      ...event,
      scheduledAt: Date.now(),
      executeAt: Date.now() + delayMs
    });
  }
  
  /**
   * Register a periodic (recurring) event
   */
  registerPeriodicEvent(eventId, event, intervalMs) {
    this.periodicEvents.set(eventId, {
      event: event,
      interval: intervalMs,
      lastRun: Date.now(),
      enabled: true
    });
    
    console.log(`📅 Periodic event registered: ${eventId} (every ${intervalMs}ms)`);
  }
  
  /**
   * Unregister a periodic event
   */
  unregisterPeriodicEvent(eventId) {
    this.periodicEvents.delete(eventId);
    console.log(`❌ Periodic event unregistered: ${eventId}`);
  }
  
  /**
   * Enable/disable a periodic event
   */
  setPeriodicEventEnabled(eventId, enabled) {
    const eventData = this.periodicEvents.get(eventId);
    if (eventData) {
      eventData.enabled = enabled;
      console.log(`${enabled ? '✅' : '⏸️'} Periodic event ${eventId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Create a location-based event that affects all players in a location
   */
  createLocationEvent(name, description, locationId, effectHandler, eventData = {}) {
    return {
      name,
      description,
      eventType: 'location',
      scope: 'location',
      locationId,
      handler: effectHandler,
      eventData
    };
  }
  
  /**
   * Create a global event that affects all players
   */
  createGlobalEvent(name, description, effectHandler, eventData = {}) {
    return {
      name,
      description,
      eventType: 'global',
      scope: 'global',
      handler: effectHandler,
      eventData
    };
  }
  
  /**
   * Create a player-specific event
   */
  createPlayerEvent(name, description, playerId, effectHandler, eventData = {}) {
    return {
      name,
      description,
      eventType: 'player',
      scope: 'player',
      playerId,
      handler: effectHandler,
      eventData
    };
  }
  
  /**
   * Admin: Manually inject an event
   */
  injectEvent(event) {
    console.log(`🔧 Admin: Injecting event - ${event.name}`);
    this.queueEvent(event);
    return { success: true, message: `Event ${event.name} queued` };
  }
  
  /**
   * Admin: Get all registered periodic events
   */
  getPeriodicEvents() {
    const events = [];
    this.periodicEvents.forEach((data, eventId) => {
      events.push({
        eventId,
        name: data.event.name,
        interval: data.interval,
        enabled: data.enabled,
        lastRun: data.lastRun,
        nextRun: data.lastRun + data.interval
      });
    });
    return events;
  }
  
  /**
   * Admin: Get event history
   */
  getEventHistory(limit = 20) {
    return this.eventHistory.slice(-limit);
  }
  
  /**
   * Add event to history (circular buffer)
   */
  addToHistory(event) {
    this.eventHistory.push({
      name: event.name,
      eventType: event.eventType,
      scope: event.scope,
      executedAt: event.executedAt,
      locationId: event.locationId,
      playerId: event.playerId
    });
    
    // Keep history size under limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
  
  /**
   * Initialize demo events
   */
  initializeDemoEvents() {
    // Magic Storm - periodic event every 15 minutes in Town Square
    const magicStormEvent = this.createLocationEvent(
      'Magic Storm',
      'A powerful magical storm erupts in the Town Square, draining mana from all wizards present!',
      'town-square',
      (playerManager, locationManager) => {
        const playersInSquare = locationManager.getPlayersInLocation('town-square');
        const playerEffects = {};
        
        playersInSquare.forEach(playerId => {
          const player = playerManager.getPlayer(playerId);
          if (player) {
            // Drain 20 mana (min 0)
            const manaDrain = 20;
            const newMana = Math.max(0, player.mana - manaDrain);
            playerEffects[playerId] = { mana: newMana - player.mana };
          }
        });
        
        return { playerEffects };
      },
      {
        manaDrain: 20,
        severity: 'moderate'
      }
    );
    
    // Register the Magic Storm to occur every 15 minutes
    this.registerPeriodicEvent('magic-storm', magicStormEvent, 15 * 60 * 1000);
    
    console.log('✨ Demo events initialized');
  }
}

module.exports = EventDispatcher;

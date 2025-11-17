/**
 * Location Manager
 * Handles player location tracking and validation
 */

class LocationManager {
  constructor() {
    this.locations = new Map(); // locationId -> Set(playerId)
    
    // Initialize valid locations
    this.validLocations = new Set([
      'town-square',
      'home',
      'hospital',
      'education',
      'workshop',
      'guilds',
      'property',
      'quests',
      'crimes',
      'jail',
      'casino',
      'newspaper',
      'friends',
      'magic-shop',
      'tavern',
      'fair-alley',
      'guild-district',
      'smuggling-routes'
    ]);
    
    // Initialize all locations
    this.validLocations.forEach(locationId => {
      this.locations.set(locationId, new Set());
    });
  }
  
  isValidLocation(locationId) {
    return this.validLocations.has(locationId);
  }
  
  movePlayer(playerId, fromLocation, toLocation) {
    // Remove from old location
    if (fromLocation && this.locations.has(fromLocation)) {
      this.locations.get(fromLocation).delete(playerId);
    }
    
    // Add to new location
    if (!this.locations.has(toLocation)) {
      this.locations.set(toLocation, new Set());
    }
    this.locations.get(toLocation).add(playerId);
    
    return true;
  }
  
  removePlayer(playerId) {
    // Remove player from all locations
    this.locations.forEach((players) => {
      players.delete(playerId);
    });
  }
  
  getPlayersInLocation(locationId) {
    if (!this.locations.has(locationId)) {
      return [];
    }
    return Array.from(this.locations.get(locationId));
  }
  
  getPlayerLocation(playerId) {
    for (const [locationId, players] of this.locations.entries()) {
      if (players.has(playerId)) {
        return locationId;
      }
    }
    return null;
  }
}

module.exports = LocationManager;

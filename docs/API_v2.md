# High Wizardry API Documentation

## Overview

This document provides API reference for the High Wizardry game modules, focusing on the new v2.0 features.

## Modules

### Achievements Module

The Achievements module tracks player progress and awards milestones.

#### Methods

##### `init()`
Initialize the achievements system.
- **Returns:** `boolean` - Success status

##### `checkAchievements()`
Check all achievements and award newly earned ones.
- **Returns:** `Array<Achievement>` - Newly earned achievements

##### `earnAchievement(achievementId)`
Award a specific achievement to the player.
- **Parameters:**
  - `achievementId` (string) - Achievement identifier
- **Returns:** `void`

##### `hasAchievement(achievementId)`
Check if player has earned an achievement.
- **Parameters:**
  - `achievementId` (string) - Achievement identifier
- **Returns:** `boolean` - True if earned

##### `getAllAchievements()`
Get all achievements with earned status.
- **Returns:** `Array<Achievement>` - All achievements

##### `getCompletionPercentage()`
Get overall achievement completion percentage.
- **Returns:** `number` - Percentage (0-100)

#### Example Usage

```javascript
// Check for new achievements
const newAchievements = Achievements.checkAchievements();
if (newAchievements.length > 0) {
  console.log('Earned achievements:', newAchievements);
}

// Check specific achievement
if (Achievements.hasAchievement('first-shilling')) {
  console.log('Player has earned their first shilling!');
}

// Get completion
const percent = Achievements.getCompletionPercentage();
console.log(`Achievements: ${percent}% complete`);
```

---

### Consumables Module

The Consumables module manages potions, scrolls, and other usable items.

#### Methods

##### `init()`
Initialize the consumables system.
- **Returns:** `boolean` - Success status

##### `useConsumable(consumableId)`
Use a consumable item from inventory.
- **Parameters:**
  - `consumableId` (string) - Consumable identifier
- **Returns:** `boolean` - Success status

##### `addConsumable(consumableId, count)`
Add consumable items to inventory.
- **Parameters:**
  - `consumableId` (string) - Consumable identifier
  - `count` (number) - Number to add (default: 1)
- **Returns:** `boolean` - Success status

##### `removeConsumable(consumableId, count)`
Remove consumable items from inventory.
- **Parameters:**
  - `consumableId` (string) - Consumable identifier
  - `count` (number) - Number to remove (default: 1)
- **Returns:** `boolean` - Success status

##### `getConsumableCount(consumableId)`
Get count of specific consumable in inventory.
- **Parameters:**
  - `consumableId` (string) - Consumable identifier
- **Returns:** `number` - Item count

##### `isOnCooldown(consumableId)`
Check if consumable is on cooldown.
- **Parameters:**
  - `consumableId` (string) - Consumable identifier
- **Returns:** `boolean` - True if on cooldown

##### `getCooldownRemaining(consumableId)`
Get remaining cooldown time in milliseconds.
- **Parameters:**
  - `consumableId` (string) - Consumable identifier
- **Returns:** `number` - Remaining time in milliseconds

#### Example Usage

```javascript
// Add potions to inventory
Consumables.addConsumable('health-potion', 5);

// Use a potion
if (Consumables.useConsumable('health-potion')) {
  console.log('Used health potion!');
}

// Check cooldown
if (Consumables.isOnCooldown('health-potion')) {
  const remaining = Consumables.getCooldownRemaining('health-potion');
  console.log(`Cooldown: ${Math.ceil(remaining / 1000)}s`);
}

// Check inventory
const count = Consumables.getConsumableCount('health-potion');
console.log(`Health potions: ${count}`);
```

---

### Player Module (Enhanced)

The Player module now includes additional tracking for achievements.

#### New Fields

- `consumables` (Object) - Consumable items inventory
- `guilds.memberships` (Array) - Joined guilds
- `guilds.reputation` (Object) - Reputation per guild
- `craftingStats.totalCrafted` (number) - Total items crafted
- `visitedLocations` (Array) - Visited location IDs
- `travelDistance` (number) - Total distance traveled

#### Key Methods

##### `getData()`
Get player data (returns copy).
- **Returns:** `PlayerData` - Player data object

##### `updateData(updates)`
Update player data with new values.
- **Parameters:**
  - `updates` (Object) - Fields to update
- **Returns:** `PlayerData` - Updated player data

##### `addXP(amount)`
Add experience points, handles level ups automatically.
- **Parameters:**
  - `amount` (number) - XP to add
- **Returns:** `boolean` - Success status

##### `addCurrency(amountInPennies)`
Add currency to player.
- **Parameters:**
  - `amountInPennies` (number) - Amount in pennies
- **Returns:** `PlayerData|false` - Updated data or false

##### `removeCurrency(amountInPennies)`
Remove currency from player.
- **Parameters:**
  - `amountInPennies` (number) - Amount in pennies
- **Returns:** `PlayerData|false` - Updated data or false

##### `getTotalPennies()`
Get total currency in pennies.
- **Returns:** `number` - Total pennies

#### Example Usage

```javascript
// Get player data
const player = Player.getData();
console.log(`Level ${player.level} - ${player.health}/${player.maxHealth} HP`);

// Add XP (auto level up)
Player.addXP(100);

// Manage currency (1 shilling = 12 pennies)
Player.addCurrency(120); // Add 10 shillings
Player.removeCurrency(60); // Remove 5 shillings

// Update stats
Player.updateData({
  health: player.maxHealth,
  mana: player.maxMana
});
```

---

## Data Types

### Achievement
```typescript
{
  id: string;
  name: string;
  description: string;
  category: 'wealth' | 'progression' | 'training' | 'social' | 'crafting' | 'exploration' | 'dedication';
  icon: string; // Font Awesome class
  tier: 1 | 2 | 3; // Bronze, Silver, Gold
  xpReward: number;
  currencyReward: { shillings: number, pennies: number };
  earned?: boolean; // Added when fetched
}
```

### Consumable
```typescript
{
  id: string;
  name: string;
  description: string;
  type: 'potion' | 'scroll' | 'food' | 'elixir';
  icon: string; // Font Awesome class
  cost: number; // In pennies
  sellValue: number; // In pennies
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  duration: number; // Effect duration in ms (0 for instant)
  cooldown: number; // Cooldown in ms
}
```

### PlayerData (Enhanced)
```typescript
{
  username: string;
  level: number;
  xp: number;
  shillings: number;
  pennies: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  energy: number;
  maxEnergy: number;
  happiness: number;
  crime: number;
  intelligence: number;
  endurance: number;
  charisma: number;
  dexterity: number;
  speed: number;
  inventory: Object;
  consumables: Object; // NEW
  guilds: { memberships: Array, reputation: Object }; // NEW
  craftingStats: { totalCrafted: number, recipes: Array }; // NEW
  visitedLocations: Array; // NEW
  travelDistance: number; // NEW
  lastLogin: number;
  playTime: number;
  settings: Object;
}
```

---

## Constants

### Currency
- 1 shilling = 12 pennies
- Use `Player.getTotalPennies()` for conversions

### Cooldowns
- Potions: 10-30 seconds
- Scrolls: 10-20 minutes
- Elixirs: 10 minutes - 2 hours

### Achievement Categories
- `wealth` - Currency milestones
- `progression` - Level achievements
- `training` - Stat training goals
- `social` - Guild and community
- `crafting` - Item creation
- `exploration` - Travel and discovery
- `dedication` - Time played

---

## Events

### Achievement Earned
When an achievement is earned:
1. XP is automatically awarded
2. Currency is automatically added
3. Notification is shown
4. Game log is updated
5. UI is refreshed

### Consumable Used
When a consumable is used:
1. Effect is applied immediately or starts
2. Item is consumed from inventory
3. Cooldown timer starts
4. Notification is shown
5. UI is updated

### Player Level Up
When player levels up:
1. All resources restored (health, mana, energy)
2. Max resources increased
3. Notification shown
4. Achievements checked

---

## Debugging

All modules are exposed in debug mode via `window.DebugModules`:

```javascript
// In browser console (when CONFIG.DEBUG = true)
console.log(window.DebugModules.Player.getData());
console.log(window.DebugModules.Achievements.getAllAchievements());
console.log(window.DebugModules.Consumables.getPlayerConsumables());
```

---

## Migration Guide

### From v1.0 to v2.0

**Save Data Changes:**
- Old saves automatically migrate
- New fields added with safe defaults
- Currency format unchanged (backward compatible)

**Manual Migration (if needed):**
```javascript
// Export save
const save = localStorage.getItem('highWizardryPlayer');
console.log(save); // Copy output

// Clear save
localStorage.removeItem('highWizardryPlayer');

// Reload game
location.reload();
```

---

For more information, see the main README.md file.

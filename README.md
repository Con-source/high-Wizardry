# High Wizardry

A web-based wizard/RPG game with online multiplayer support, achievements system, and consumable items.

## ✨ Features

### Core Systems
- **Single Player Mode**: Play offline with local saves
- **Online Multiplayer**: Connect with other wizards in real-time
- **Character Progression**: Level up, train stats, and complete quests
- **Crafting System**: Gather resources and craft powerful items
- **Guild System**: Join guilds for unique benefits
- **Location-based Gameplay**: Travel between various magical locations
- **Chat System**: Communicate with other players globally or locally

### 🎮 NEW Features (v2.0)
- **🏆 Achievements System**: Track your progress with 20+ achievements across 7 categories
  - Wealth, Progression, Training, Social, Crafting, Exploration, and Dedication achievements
  - Earn XP and currency rewards for unlocking achievements
  - Three-tier system (Bronze, Silver, Gold)
- **🧪 Consumables System**: Use potions, scrolls, food, and elixirs
  - Health, Mana, and Energy potions
  - Stat-boosting scrolls with temporary effects
  - Food items with multiple benefits
  - Legendary elixirs with powerful permanent effects
  - Cooldown and duration system for balanced gameplay
- **📊 Enhanced Player Stats**: New tracking for crafting, exploration, and more
- **🎨 Improved UI**: Better organization and user experience

## Getting Started

### Prerequisites

- Node.js 16 or higher (for multiplayer server)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Con-source/high-Wizardry.git
cd high-Wizardry
```

2. Install dependencies (for multiplayer):
```bash
npm install
```

### Running the Game

#### Single Player (Offline)

Simply open `index.html` in your web browser. Your progress will be saved locally.

#### Multiplayer (Online)

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:8080
```

3. Create an account or login to start playing!

### Configuration

The server runs on port 8080 by default. You can change this by setting the PORT environment variable:

```bash
PORT=3000 npm start
```

## How to Play

1. **Register/Login**: Create an account or login with existing credentials (for multiplayer) or just open the game (for single player)
2. **Explore Locations**: Use the sidebar to navigate between different magical areas
3. **Interact**: Click on actions and buttons to perform various activities
4. **Chat**: Use the chat system to communicate with other players (multiplayer mode)
5. **Progress**: Complete quests, train stats, and craft items to level up
6. **Earn Achievements**: Complete milestones to unlock rewards
7. **Use Consumables**: Collect and use potions, scrolls, and other items to boost your character

### Game Mechanics

#### Resources
- **Energy**: Required for most actions, regenerates over time
- **Health**: Your life points, restore at the hospital or with potions
- **Mana**: Magical energy for spells and abilities
- **Currency**: Shillings and pennies (1 shilling = 12 pennies) for purchasing items and services

#### Character Stats
- **Intelligence**: Affects spell power and learning ability
- **Endurance**: Increases max health and stamina
- **Charisma**: Improves social interactions and prices
- **Dexterity**: Increases crafting success and combat accuracy
- **Speed**: Reduces travel time between locations

#### Achievements (NEW!)
Track your progress across multiple categories:
- **Wealth**: Accumulate currency milestones
- **Progression**: Reach level goals
- **Training**: Master your stats
- **Social**: Join guilds and interact with players
- **Crafting**: Create items and master recipes
- **Exploration**: Visit all locations and travel far
- **Dedication**: Invest time in your journey

Each achievement rewards XP and currency!

#### Consumables (NEW!)
Use various items to enhance your gameplay:
- **Potions**: Restore health, mana, or energy instantly
- **Scrolls**: Temporarily boost your stats
- **Food**: Provide multiple benefits at once
- **Elixirs**: Grant powerful effects, some permanent

All consumables have cooldowns to maintain game balance.

## Development

### Project Structure

```
high-Wizardry/
├── index.html           # Main game UI
├── jsjs/               # Client-side JavaScript modules
│   ├── main.js         # Game initialization
│   ├── player.js       # Player state management
│   ├── achievements.js # Achievement system (NEW)
│   ├── consumables.js  # Consumable items system (NEW)
│   ├── online.game.js  # Multiplayer client
│   ├── locations.js    # Location system
│   ├── ui.js           # UI components
│   ├── chat.js         # Chat system
│   ├── guilds.js       # Guild management
│   ├── workshop.js     # Crafting system
│   ├── black-market.js # Black market trading
│   └── ...
├── server/             # Backend server
│   ├── index.js        # Main server file
│   ├── auth/           # Authentication system
│   └── game/           # Game logic managers
├── {css/               # Stylesheets
└── package.json        # Dependencies
```

### Module Architecture

All modules follow a consistent pattern:
- **Initialization**: `init()` function called on DOM ready
- **Public API**: Exposed through module pattern
- **JSDoc Documentation**: Comprehensive type annotations
- **Error Handling**: Graceful degradation if dependencies missing

### Running in Development

```bash
npm run dev
```

## Multiplayer Architecture

The game uses WebSocket connections for real-time communication:

1. **Authentication**: Secure login with bcrypt password hashing
2. **Player Sync**: Server-side player state management
3. **Location System**: Players can see others in the same location
4. **Action Validation**: Critical calculations happen server-side to prevent cheating
5. **Chat System**: Global and location-based messaging

## Save Data Migration

### v2.0 Save Format Changes

The v2.0 update adds new fields to player data:
- `consumables`: Object tracking consumable item inventory
- `guilds.memberships`: Array of joined guilds
- `guilds.reputation`: Object tracking reputation per guild
- `craftingStats.totalCrafted`: Number of items crafted
- `visitedLocations`: Array of visited location IDs
- `travelDistance`: Total kilometers traveled

**Old saves are automatically migrated** when loaded. No manual action required!

### Manual Migration (if needed)

If you experience issues with your save:

1. Export your current save:
```javascript
// In browser console:
const save = localStorage.getItem('highWizardryPlayer');
console.log(save);
// Copy the output
```

2. Clear your save:
```javascript
localStorage.removeItem('highWizardryPlayer');
```

3. Reload the game to start fresh, or restore with your backup.

## Security

- Passwords are hashed using bcrypt
- Critical game calculations (rewards, crafting) are server-side
- Input validation on both client and server
- Session tokens for authentication

## API Reference

### Achievements Module

```javascript
// Check and award new achievements
const newAchievements = Achievements.checkAchievements();

// Get all achievements with earned status
const all = Achievements.getAllAchievements();

// Check if specific achievement is earned
const hasIt = Achievements.hasAchievement('first-shilling');

// Get completion percentage
const percent = Achievements.getCompletionPercentage();
```

### Consumables Module

```javascript
// Use a consumable item
Consumables.useConsumable('health-potion');

// Add consumable to inventory
Consumables.addConsumable('mana-potion', 5);

// Check inventory count
const count = Consumables.getConsumableCount('health-potion');

// Check if on cooldown
const onCooldown = Consumables.isOnCooldown('health-potion');
```

### Player Module

```javascript
// Get player data
const playerData = Player.getData();

// Update player data
Player.updateData({ health: 100, mana: 50 });

// Add/remove currency
Player.addCurrency(120); // Add 120 pennies (10 shillings)
Player.removeCurrency(60); // Remove 60 pennies (5 shillings)

// Add experience
Player.addXP(100);
```

## Changelog

### v2.0.0 (Current)

**New Features:**
- 🏆 Achievement system with 20+ achievements
- 🧪 Consumables system with 15+ items
- 📊 Enhanced player tracking (crafting, exploration, etc.)
- 📝 Comprehensive JSDoc documentation across all modules
- 🎨 Improved save data structure with migration support

**Improvements:**
- Better module organization
- Enhanced error handling
- Consistent coding patterns
- Updated README with complete documentation

**Bug Fixes:**
- Fixed package.json duplicate dependency
- Removed duplicate nested jsjs/jsjs folder
- Improved player data initialization

### v1.0.0

- Initial release with core gameplay
- Single and multiplayer modes
- Crafting, guilds, chat, locations
- Black market trading

## Roadmap

### Planned Features
- [ ] Combat system with enemy encounters
- [ ] Quest system with storylines
- [ ] Equipment system (weapons, armor)
- [ ] Spell system with multiple magic schools
- [ ] Property ownership and upgrades
- [ ] Trading system between players
- [ ] More locations and areas to explore
- [ ] Mobile-responsive UI improvements
- [ ] Sound effects and background music
- [ ] Seasonal events and limited-time content

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

### Development Guidelines

1. Follow existing code patterns and conventions
2. Add JSDoc documentation to all public functions
3. Test your changes in both single and multiplayer modes
4. Ensure backwards compatibility with existing saves
5. Update README if adding new features

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Join our community chat (in-game)

## License

See LICENSE file for details.

---

**Made with ✨ magic and JavaScript**


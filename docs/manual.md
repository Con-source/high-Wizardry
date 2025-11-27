# High Wizardry Player Manual

Welcome to **High Wizardry**, a web-based wizard RPG with online multiplayer support! This manual covers all game features to help you master the magical arts.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Game Modes](#game-modes)
3. [Character & Stats](#character--stats)
4. [Locations](#locations)
5. [Chat System](#chat-system)
6. [Multiplayer Features](#multiplayer-features)
7. [Trading System](#trading-system)
8. [Auction House](#auction-house)
9. [Guilds](#guilds)
10. [Crafting & Workshop](#crafting--workshop)
11. [Black Market & Smuggling](#black-market--smuggling)
12. [Achievements](#achievements)
13. [Consumables](#consumables)
14. [Events](#events)
15. [Tips & Strategies](#tips--strategies)

---

## Getting Started

### Creating Your Character

1. **Single Player Mode**: Simply open the game in your browser. Your character is automatically created and progress is saved locally.

2. **Multiplayer Mode**: 
   - Click "Register" to create an account
   - Enter a username (3-20 characters)
   - Enter your email address (for account recovery)
   - Create a password (minimum 6 characters)
   - Verify your email with the code sent to you
   - Login and start playing!

### Basic Interface

The game interface consists of:

- **Sidebar**: Navigation between locations
- **Main Panel**: Current location content and actions
- **Stats Bar**: Your health, mana, energy, and currency
- **Chat**: Communicate with other players (multiplayer mode)

### Your First Steps

1. Explore the **Town Square** to meet other wizards
2. Visit the **Hospital** to restore health
3. Go to **Education** to train your stats
4. Check the **Quest Board** for missions
5. Try your hand at the **Workshop** for crafting

---

## Game Modes

### Single Player (Offline)

- No account required
- Progress saved in browser localStorage
- Full access to crafting, quests, and progression
- Simulated chat and NPC interactions

### Multiplayer (Online)

- Requires account registration
- Real-time interaction with other players
- Live chat with global and local channels
- Player-to-player trading
- Auction house participation
- Real-time game events
- Guild membership and community features

---

## Character & Stats

### Resources

| Resource | Description | Regeneration |
|----------|-------------|--------------|
| **Health** | Your life points. Reach 0 and you're incapacitated | Restore at Hospital or with potions |
| **Mana** | Magical energy for spells and abilities | Regenerates over time |
| **Energy** | Required for most actions | Regenerates slowly over time |

### Currency

High Wizardry uses a dual currency system:

- **Shillings** (s): Primary currency
- **Pennies** (p): Secondary currency
- **Exchange Rate**: 1 shilling = 12 pennies

*Example: 2s 6p = 30 pennies total*

### Character Stats

| Stat | Effect |
|------|--------|
| **Intelligence** | Affects spell power and learning ability |
| **Endurance** | Increases max health and stamina |
| **Charisma** | Improves social interactions and shop prices |
| **Dexterity** | Increases crafting success and combat accuracy |
| **Speed** | Reduces travel time between locations |

### Training Stats

Visit the **Education** location to train your stats. Training costs currency and energy but permanently improves your character.

---

## Locations

### Core Locations

| Location | Description | Activities |
|----------|-------------|------------|
| **Town Square** | Central gathering place | Meet players, view notices |
| **My Home** | Personal sanctuary | Rest, manage inventory |
| **Hospital** | Medical facility | Heal wounds (costs currency) |
| **Education** | Training grounds | Train stats |
| **Quest Board** | Mission center | Accept and complete quests |

### Commerce Locations

| Location | Description | Activities |
|----------|-------------|------------|
| **Magic Shop** | Magical artifacts store | Buy/sell items |
| **Fair Alleyway** | Bustling marketplace | Trade exotic goods |
| **The Drunken Wizard** | Cozy tavern | Social interactions |
| **The Golden Dice Casino** | Games of chance | Gambling |

### Special Locations

| Location | Description | Requirements |
|----------|-------------|--------------|
| **Guild District** | Guild headquarters | Join and manage guilds |
| **Smuggling Routes** | Underground trade | High risk, high reward |
| **Criminal Activities** | Illegal operations | Beware of jail time! |
| **Jail** | City prison | Automatic if caught |

---

## Chat System

### Chat Channels

- **Global Chat**: Messages visible to all online players
- **Local Chat**: Messages only visible to players in your location

### Chat Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show available commands | `/help` |
| `/me [action]` | Perform an emote action | `/me waves hello` |
| `/whisper [user] [msg]` | Private message to a player | `/whisper Merlin Hi there!` |
| `/w [user] [msg]` | Short form of whisper | `/w Merlin Hi!` |
| `/clear` | Clear your chat window | `/clear` |
| `/online` | Show online player count | `/online` |

### Chat Etiquette

- Be respectful to other players
- No spam or flooding
- Report abusive players to moderators
- Chat messages are rate-limited (10 per 10 seconds)

---

## Multiplayer Features

### Player Interactions

- **See Other Players**: View who's online in your location
- **View Profiles**: Check other players' stats and achievements
- **Friend Lists**: Add players as friends
- **Trading**: Exchange items and currency

### Online Indicators

- 🟢 Green dot: Player is online
- ⚪ Gray dot: Player is offline

### Player Search

Use the Community feature to search for players by username:

1. Navigate to the Friends/Community section
2. Enter a username in the search box
3. Click "Search" to find players
4. View their profile or add them as friends

---

## Trading System

### Initiating a Trade

1. Find a player in your location or search for them
2. Click "Trade" on their profile
3. Select items or currency to offer
4. Wait for them to review and respond

### Trade Process

```
Step 1: Propose Trade
  ↓
Step 2: Both Players Add Items/Currency
  ↓
Step 3: Review Offers
  ↓
Step 4: Both Players Confirm
  ↓
Step 5: Trade Completes (items exchanged)
```

### Trade Tips

- Always verify the items before confirming
- Check currency amounts carefully
- You can cancel anytime before both confirmations
- Trades expire if inactive for too long

### Trade Security

- Server validates all trades
- Items/currency are locked during trade
- Rollback protection if trade fails
- All trades are logged

---

## Auction House

### Accessing the Auction House

Click the Auction House icon or navigate to the marketplace location.

### Browsing Auctions

1. Open the **Browse** tab
2. Use the search bar to filter items
3. View current bid, time remaining, and seller info
4. Click "Place Bid" to participate

### Creating an Auction

1. Open the **Create Listing** tab
2. Select item type:
   - **Inventory Item**: Sell an item from your inventory
   - **Currency**: Auction currency for items
3. Set starting bid (in pennies)
4. Choose duration:
   - 5 minutes
   - 30 minutes
   - 1 hour
   - 24 hours
   - 3 days
   - 7 days
5. Select scope:
   - **Global**: Visible to all players
   - **Location**: Only visible to players in your area
6. Click "Create Auction"

### Bidding

- Enter bid amount (must exceed current bid)
- Your currency is held until auction ends
- If outbid, your currency is returned
- Winner receives item; seller receives currency

### Managing Auctions

- **My Listings**: View your active auctions
- **My Bids**: Track auctions you've bid on
- Cancel auctions with no bids
- Auctions auto-complete when timer ends

### Auction Notifications

You'll receive notifications when:
- Someone bids on your auction
- You're outbid
- You win an auction
- Your auction sells

---

## Guilds

### Available Guilds

> **Note:** Guild join costs are displayed in-game using the standard currency system (shillings and pennies).

#### Artisan Guild
- **Focus**: Crafting and creation
- **Join Cost**: ~83 shillings (1000 pennies)
- **Perks**:
  - Level 1: Faster Crafting (20% reduction on rare items)
  - Level 3: Better Quality (higher quality chance)
  - Level 5: Resource Efficiency (10% chance to save materials)

#### Smugglers' Guild
- **Focus**: Contraband and underground trade
- **Join Cost**: 125 shillings (1500 pennies)
- **Perks**:
  - Level 1: Contraband Boost (25% higher sell value)
  - Level 2: Vendor Discount (15% off Lunar Powder)
  - Level 4: Stealth Bonus (reduced detection chance)

#### Explorer's Guild
- **Focus**: Adventure and discovery
- **Join Cost**: 100 shillings (1200 pennies)
- **Perks**:
  - Level 1: Bonus Resources (extra gathering locations)
  - Level 2: Faster Gathering (25% less energy)
  - Level 4: Rare Finds (increased rare material chance)

### Joining a Guild

1. Navigate to the **Guild District**
2. Browse available guilds
3. Check requirements and benefits
4. Pay the joining fee
5. Start earning reputation!

### Guild Reputation

- Earn reputation through guild-related activities
- Every 100 reputation = 1 guild level
- Higher levels unlock more perks
- Leave and rejoin resets your reputation

---

## Crafting & Workshop

### Workshop Basics

Access the Workshop to craft items using gathered resources.

### Recipe Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Alchemy** | Potions and elixirs | Health Potion, Energy Potion |
| **Enchanting** | Magical items | Energy Crystal, Forbidden Scroll |
| **Crafting** | Equipment and tools | Arcane Staff, Obsidian Shield |

### Sample Recipes

| Recipe | Requirements | Time | Output |
|--------|--------------|------|--------|
| Health Potion | 5 Herb, 2 Crystal | 1 min | Restores health |
| Energy Potion | 3 Herb, 2 Essence | 1 min | Restores energy |
| Arcane Staff | 10 Wood, 5 Crystal, 2 Essence | 5 min | Weapon |
| Moonlight Elixir | 8 Herb, 2 Moonstone, 3 Essence | 3 min | Powerful potion |

### Crafting Process

1. Select a recipe
2. Check if you have required materials
3. Click "Craft" to start
4. Wait for crafting timer
5. Item is added to inventory when complete

### Fast-Track Crafting

- Pay currency to complete crafting instantly
- Cost = approximately 1 shilling per minute remaining
- Available on any in-progress item

### Guild Bonuses

Artisan Guild members get:
- 20% faster crafting time
- 10% chance to save resources
- Higher quality item chance

---

## Black Market & Smuggling

### Locations

| Location | Risk Level | Markup | Vendor |
|----------|------------|--------|--------|
| **Goblin Outpost** | High | 10% | Grizelda the Fence |
| **Abandoned Warehouse** | Medium | 5% | Marcus the Smuggler |
| **Shady Alley** | Low | None | The Shadow Broker |

### Item Categories

#### Crafting Components
- Shadow Essence, Phoenix Feather, Void Crystal, Dragon's Blood

#### Rare Magical Resources
- Mana Pearl, Cursed Rune, Ethereal Dust

#### Contraband
| Item | Buy Price | Resale Value | Risk |
|------|-----------|--------------|------|
| Elven Wine | 100g | 180g | Common |
| Exotic Spices | 80g | 150g | Common |
| Forbidden Tome | 350g | 600g | Rare |
| Royal Jewels | 600g | 1200g | Epic |

### Smuggling Mechanics

**Base Risk**: 30% chance of getting caught

**Risk Modifiers by Rarity**:
| Rarity | Additional Risk |
|--------|-----------------|
| Common | +10% |
| Uncommon | +20% |
| Rare | +30% |
| Epic | +40% |
| Legendary | +50% |

### Smuggling Outcomes

**Success**:
- Sell contraband at resale value
- Gain 50 XP
- Currency credited to your account

**Failure**:
- Item confiscated
- No payment received
- Epic/Legendary items: 30% chance of jail time (5 minutes)

### Guild Benefits

Smugglers' Guild members get:
- 20% risk reduction
- 25% higher contraband values
- Vendor discounts

---

## Achievements

### Achievement Categories

| Category | Focus |
|----------|-------|
| **Wealth** | Currency milestones |
| **Progression** | Level achievements |
| **Training** | Stat training goals |
| **Social** | Guild and community |
| **Crafting** | Item creation |
| **Exploration** | Travel and discovery |
| **Dedication** | Time played |

### Achievement Tiers

- 🥉 **Bronze**: Entry-level achievements
- 🥈 **Silver**: Intermediate goals
- 🥇 **Gold**: Master-level accomplishments

### Rewards

Each achievement grants:
- **XP**: Experience points for leveling
- **Currency**: Shillings and pennies
- **Recognition**: Displayed on your profile

### Tracking Progress

- View your achievements in the Achievements panel
- See completion percentage
- Check requirements for locked achievements
- Achievements are automatically awarded when conditions are met

---

## Consumables

### Types of Consumables

| Type | Effect | Duration |
|------|--------|----------|
| **Potions** | Instant restoration | Immediate |
| **Scrolls** | Temporary stat buffs | 10-20 minutes |
| **Food** | Multiple benefits | Varies |
| **Elixirs** | Powerful/permanent effects | Varies |

### Common Consumables

| Item | Effect | Cooldown |
|------|--------|----------|
| Health Potion | Restore health | 10-30 sec |
| Mana Potion | Restore mana | 10-30 sec |
| Energy Potion | Restore energy | 10-30 sec |
| Stat Scroll | +Stat for duration | 10-20 min |

### Using Consumables

1. Open your inventory
2. Find the consumable
3. Click "Use"
4. Effect applies immediately
5. Cooldown timer starts

### Cooldown System

- Each consumable type has its own cooldown
- Cannot use same type until cooldown expires
- Cooldown shown in inventory
- Helps maintain game balance

---

## Events

### Event Types

#### Global Events
Affect all connected players simultaneously.

*Example*: Lunar Eclipse (mana boost for everyone)

#### Location Events
Affect players in a specific area.

*Example*: Magic Storm in Town Square (mana drain)

#### Player Events
Target individual players.

*Example*: Level Up Bonus (personal buff)

### Demo Event: Magic Storm

- **Location**: Town Square
- **Frequency**: Every 15 minutes
- **Effect**: Drains 20 mana from all wizards
- **Notification**: You'll receive a warning

### Event Notifications

When an event occurs:
- Notification appears on screen
- Chat message with event details
- Effects applied automatically
- UI updates to reflect changes

### Upcoming Events

Check the **Newspaper** location for:
- Scheduled events
- Event history
- Special announcements

---

## Tips & Strategies

### Getting Started Tips

1. **Train Intelligence first** - It helps with everything
2. **Join a guild early** - Benefits compound over time
3. **Complete daily quests** - Steady income and XP
4. **Craft your own potions** - Cheaper than buying

### Money-Making Strategies

1. **Crafting and Selling**
   - Craft popular items
   - Sell on auction house
   - Watch market prices

2. **Smuggling** (Higher Risk)
   - Join Smugglers' Guild first
   - Start with low-risk items
   - Build up to rare contraband

3. **Quest Rewards**
   - Complete quests for guaranteed income
   - Higher level quests = better rewards

4. **Casino** (Luck-Based)
   - Only gamble what you can afford to lose
   - Set a budget and stick to it

### Combat Preparation

1. Stock up on healing potions
2. Buff your stats with scrolls
3. Full health before engaging
4. Know your opponent's weaknesses

### Social Tips

1. Join active guilds
2. Help new players
3. Participate in chat
4. Trade fairly - build reputation

### Efficiency Tips

1. **Batch crafting** - Queue multiple items
2. **Fast-track wisely** - Only when necessary
3. **Location planning** - Minimize travel time
4. **Resource gathering** - Do it while waiting for crafting

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send chat message |
| `Ctrl+Enter` | Toggle chat visibility |
| `Esc` | Close modals |

---

## Troubleshooting

### Connection Issues

- Check your internet connection
- Refresh the page
- Clear browser cache
- Try a different browser

### Lost Progress

**Single Player**:
- Progress saved in localStorage
- Don't clear browser data
- Export save if switching browsers

**Multiplayer**:
- Progress saved on server
- Log in to restore
- Contact support if issues persist

### Account Recovery

1. Click "Forgot Password"
2. Enter your username or email
3. Check email for reset code
4. Create new password
5. All sessions logged out automatically

---

## Support & Community

### Getting Help

- **In-Game**: Type `/help` in chat
- **Documentation**: Check `/docs` folder
- **GitHub Issues**: Report bugs and request features
- **Community Chat**: Ask other players

### Reporting Issues

When reporting bugs, include:
1. What happened
2. What you expected
3. Steps to reproduce
4. Browser/device info
5. Screenshots if possible

### Contributing

Want to help improve the game? See our [Contributing Guide](CONTRIBUTING.md).

---

**Happy adventuring, wizard!** ✨🧙‍♂️

*Last updated: November 2025*

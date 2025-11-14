# Black Market System

## Overview

The Black Market system allows players to purchase rare and illegal items from underground vendors, then smuggle them for profit or use in crafting.

## Features

### Black Market Locations

1. **Goblin Outpost** (High Risk)
   - Vendor: Grizelda the Fence
   - Risk Level: High
   - Markup: 10% (1.10x price modifier)
   - Best for: High-risk, high-reward items

2. **Abandoned Warehouse** (Medium Risk)
   - Vendor: Marcus the Smuggler
   - Risk Level: Medium
   - Markup: 5% (1.05x price modifier)
   - Best for: Balanced risk/reward

3. **Shady Alley** (Low Risk)
   - Vendor: The Shadow Broker
   - Risk Level: Low
   - Markup: None (1.0x price modifier)
   - Best for: Safe transactions

### Item Categories

#### Crafting Components
- **Shadow Essence** - Rare magical essence for dark enchantments
- **Phoenix Feather** - Legendary feather for high-tier crafting (Seasonal)
- **Void Crystal** - Epic crystal for weapon enhancement
- **Dragon's Blood** - Epic alchemical reagent for potion brewing

#### Rare Magical Resources
- **Mana Pearl** - Pearl infused with magical energy (Mana restoration)
- **Cursed Rune** - Dangerous rune with unpredictable power
- **Ethereal Dust** - Dust from the ethereal plane for enchanting

#### Contraband
- **Elven Wine** - Illegally exported wine (Buy: 100g, Resale: 180g)
- **Royal Jewels** - Stolen jewels from noble house (Buy: 600g, Resale: 1200g)
- **Forbidden Tome** - Banned spellbook (Buy: 350g, Resale: 600g)
- **Exotic Spices** - Heavily taxed trade goods (Buy: 80g, Resale: 150g)

### Rarity System

Items have different rarity levels affecting their smuggling risk:

| Rarity | Risk Modifier | Color Code |
|--------|--------------|------------|
| Common | +10% | Gray |
| Uncommon | +20% | Green |
| Rare | +30% | Blue |
| Epic | +40% | Purple |
| Legendary | +50% | Orange |

### Smuggling Mechanics

**Base Risk**: 30%

**Total Risk Formula**: 
```
Total Risk = Base Risk + Rarity Risk
Adjusted Risk = Total Risk * (Guild Discount ? 0.8 : 1.0)
```

**Success**:
- Contraband items are sold for their resale value
- Crafting materials are added to inventory
- Player gains 50 XP
- Gold is credited to player account

**Failure**:
- Item is confiscated
- No gold gained
- Epic/Legendary items: 30% chance of jail time (5 minutes)

### Vendor Rotation

Vendors rotate their inventory every **1 hour** (3600000ms). Each vendor stocks:
- 5-8 random items from the catalog
- Mix of all item categories
- 30% chance to include seasonal items
- Each item has 1-5 units in stock

### Guild Integration (Future)

**Smugglers' Guild Perks**:
- Reduce base smuggling risk by 10% (30% → 20%)
- Apply 20% risk reduction multiplier (Total Risk × 0.8)
- Unlock exclusive vendor locations
- Reduced vendor prices (5-10% discount)

### Workshop Integration (Future)

**Using Smuggled Materials**:
- Shadow Essence → Dark enchantments
- Phoenix Feather → Legendary weapons
- Void Crystal → Weapon upgrades
- Dragon's Blood → Master-tier potions
- Ethereal Dust → Advanced enchantments

## API Reference

### BlackMarket Module

```javascript
// Initialize the Black Market system
BlackMarket.init()

// Get all Black Market locations
const locations = BlackMarket.getLocations()

// Get vendor inventory for a location
const inventory = BlackMarket.getVendorInventory('goblin-outpost')

// Purchase an item from a vendor
BlackMarket.purchaseItem('goblin-outpost', 'shadow-essence')

// Get player's smuggled goods
const goods = BlackMarket.getSmuggledGoods()

// Smuggle a specific item
BlackMarket.smuggleGoods('exotic-spices')

// Smuggle all items at once
BlackMarket.smuggleAllGoods()

// Sell a smuggled item without smuggling
BlackMarket.sellSmuggledItem('elven-wine')

// Rotate all vendor inventories
BlackMarket.rotateAllInventories()

// Activate Smugglers' Guild discount
BlackMarket.activateGuildDiscount()

// Get current Black Market state
const state = BlackMarket.getState()
```

### Player Inventory Structure

```javascript
{
  inventory: {
    smuggledGoods: [
      {
        id: 'exotic-spices',
        name: 'Exotic Spices',
        category: 'contraband',
        rarity: 'common',
        price: 80,
        resaleValue: 150,
        quantity: 2,
        purchaseDate: 1234567890
      }
    ],
    craftingMaterials: [
      // Successfully smuggled crafting items
    ]
  }
}
```

## UI Integration

### Vendor Menu
- Grid layout showing available items
- Item cards with rarity badges
- Purchase buttons with stock display
- Risk level indicators

### Smuggled Goods Menu
- List of owned smuggled items
- Quantity and resale value display
- Individual smuggle/sell buttons
- Bulk "Smuggle All" action
- Risk assessment display

### Navigation
- Black Market section in sidebar
- 3 vendor location buttons
- Smuggled Goods management button

## Tips for Players

1. **Start Small**: Begin with common items to learn the system
2. **Risk vs Reward**: Higher rarity = higher risk but better profits
3. **Stock Up**: Visit all three vendors for best item selection
4. **Timing**: Check back hourly for new inventory rotations
5. **Guild Benefits**: Join Smugglers' Guild for reduced risks
6. **Crafting Materials**: Don't smuggle all crafting items - save some for workshops

## Future Enhancements

- [ ] Dynamic pricing based on supply/demand
- [ ] Player-to-player black market trading
- [ ] Reputation system with vendors
- [ ] Special missions for rare items
- [ ] Random events (raids, special sales)
- [ ] Black Market quests
- [ ] Faction relations affecting prices

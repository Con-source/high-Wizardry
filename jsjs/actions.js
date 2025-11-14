/**
 * Actions Module
 * Handles all player actions across different locations
 */

// Home Actions
function upgradeHome() {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const cost = 500;
  
  if (playerData.gold < cost) {
    showNotification('Not enough gold to upgrade your home!', 'error');
    return;
  }
  
  Player.removeGold(cost);
  showNotification('Home upgraded successfully!', 'success');
  addGameLog('You upgraded your home for 500 gold');
}

function restAtHome() {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const energyRestore = 50;
  
  if (playerData.energy >= playerData.maxEnergy) {
    showNotification('Your energy is already full!', 'info');
    return;
  }
  
  const newEnergy = Math.min(playerData.maxEnergy, playerData.energy + energyRestore);
  Player.updateData({ energy: newEnergy });
  showNotification(`Rested at home. Restored ${energyRestore} energy!`, 'success');
  addGameLog(`You rested at home and restored ${energyRestore} energy`);
}

// Hospital Actions
function heal(amount, cost) {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  
  if (playerData.gold < cost) {
    showNotification('Not enough gold for healing!', 'error');
    return;
  }
  
  if (playerData.health >= playerData.maxHealth) {
    showNotification('Your health is already full!', 'info');
    return;
  }
  
  let healAmount = amount;
  if (amount === 'full') {
    healAmount = playerData.maxHealth - playerData.health;
  }
  
  const newHealth = Math.min(playerData.maxHealth, playerData.health + healAmount);
  Player.updateData({ health: newHealth });
  Player.removeGold(cost);
  
  showNotification(`Healed for ${Math.floor(healAmount)} health!`, 'success');
  addGameLog(`You were healed at the hospital for ${cost} gold`);
}

// Education Actions
function trainStat(statName, cost) {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  
  if (playerData.gold < cost) {
    showNotification('Not enough gold for training!', 'error');
    return;
  }
  
  if (playerData.energy < 20) {
    showNotification('Not enough energy for training!', 'warning');
    return;
  }
  
  // Update stat
  const updates = { energy: playerData.energy - 20 };
  updates[statName] = (playerData[statName] || 10) + 1;
  
  Player.updateData(updates);
  Player.removeGold(cost);
  Player.addXP(25);
  
  // Update UI
  const statEl = document.getElementById(`${statName}-level`);
  if (statEl) {
    statEl.textContent = updates[statName];
  }
  
  showNotification(`${statName.charAt(0).toUpperCase() + statName.slice(1)} increased!`, 'success');
  addGameLog(`You trained your ${statName} stat`);
}

// Property Actions
function buyProperty(type, price, income) {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  
  if (playerData.gold < price) {
    showNotification('Not enough gold to buy this property!', 'error');
    return;
  }
  
  Player.removeGold(price);
  
  // Save property to player data
  const properties = playerData.properties || [];
  properties.push({ type, price, income, purchaseDate: Date.now() });
  Player.updateData({ properties });
  
  showNotification(`Purchased ${type} for ${price} gold!`, 'success');
  addGameLog(`You bought a ${type} property`);
  
  // Update property list
  updatePropertyList();
}

function updatePropertyList() {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const properties = playerData.properties || [];
  const listEl = document.getElementById('property-list');
  
  if (!listEl) return;
  
  if (properties.length === 0) {
    listEl.innerHTML = '<p class="text-muted">You don\'t own any properties yet.</p>';
    return;
  }
  
  listEl.innerHTML = properties.map(prop => `
    <div class="property-item mb-2 p-2 border rounded">
      <strong>${prop.type}</strong>
      <p class="text-muted small mb-0">Income: ${prop.income} Gold/day</p>
    </div>
  `).join('');
}

// Quest Actions
function acceptQuest(questId) {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const questsCompleted = (playerData.questsCompleted || 0) + 1;
  
  Player.updateData({ questsCompleted });
  Player.addXP(10);
  
  showNotification(`Quest "${questId}" accepted!`, 'success');
  addGameLog(`You accepted a quest: ${questId}`);
  
  // Check if this unlocks new locations
  if (typeof Locations !== 'undefined') {
    if (questsCompleted === 5) {
      if (Locations.tryUnlockLocation('enchanted-forest')) {
        showNotification('New location unlocked: Enchanted Forest!', 'success');
      }
    }
  }
}

// Crime Actions
function commitCrime(crimeType) {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  
  const crimes = {
    'pickpocket': { energy: 10, minReward: 10, maxReward: 20, successRate: 80, jailTime: 5 },
    'burglary': { energy: 25, minReward: 50, maxReward: 100, successRate: 60, jailTime: 15 },
    'heist': { energy: 50, minReward: 200, maxReward: 500, successRate: 40, jailTime: 30 }
  };
  
  const crime = crimes[crimeType];
  if (!crime) return;
  
  if (playerData.energy < crime.energy) {
    showNotification('Not enough energy to commit this crime!', 'warning');
    return;
  }
  
  // Reduce energy
  Player.updateData({ energy: playerData.energy - crime.energy });
  
  // Determine success
  const success = Math.random() * 100 < crime.successRate;
  
  if (success) {
    const reward = Math.floor(Math.random() * (crime.maxReward - crime.minReward) + crime.minReward);
    Player.addGold(reward);
    Player.addXP(20);
    showNotification(`Crime successful! Earned ${reward} gold!`, 'success');
    addGameLog(`You successfully committed ${crimeType} and earned ${reward} gold`);
  } else {
    showNotification(`Caught! Sent to jail for ${crime.jailTime} minutes!`, 'error');
    addGameLog(`You were caught committing ${crimeType}!`);
    sendToJail(crime.jailTime);
  }
}

// Jail Actions
function sendToJail(minutes) {
  if (typeof Player === 'undefined') return;
  
  const releaseTime = Date.now() + (minutes * 60 * 1000);
  Player.updateData({ 
    inJail: true, 
    jailReleaseTime: releaseTime,
    energy: 0
  });
  
  // Navigate to jail
  if (typeof Locations !== 'undefined') {
    Locations.navigateToLocation('jail');
  }
  
  updateJailUI();
  startJailTimer();
}

function updateJailUI() {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const statusEl = document.getElementById('jail-status');
  const timeEl = document.getElementById('jail-time-remaining');
  
  if (!statusEl || !timeEl) return;
  
  if (playerData.inJail && playerData.jailReleaseTime > Date.now()) {
    statusEl.style.display = 'none';
    timeEl.style.display = 'block';
  } else {
    statusEl.style.display = 'block';
    timeEl.style.display = 'none';
  }
}

function startJailTimer() {
  const interval = setInterval(() => {
    if (typeof Player === 'undefined') {
      clearInterval(interval);
      return;
    }
    
    const playerData = Player.getData();
    if (!playerData.inJail || !playerData.jailReleaseTime) {
      clearInterval(interval);
      return;
    }
    
    const remaining = playerData.jailReleaseTime - Date.now();
    
    if (remaining <= 0) {
      releaseFromJail();
      clearInterval(interval);
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const timerEl = document.getElementById('jail-timer');
    if (timerEl) {
      timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const progressEl = document.getElementById('jail-progress');
    if (progressEl && playerData.jailDuration) {
      const progress = 100 - ((remaining / playerData.jailDuration) * 100);
      progressEl.style.width = `${progress}%`;
    }
  }, 1000);
}

function releaseFromJail() {
  if (typeof Player === 'undefined') return;
  
  Player.updateData({ 
    inJail: false, 
    jailReleaseTime: null,
    energy: 50
  });
  
  showNotification('You have been released from jail!', 'success');
  addGameLog('You were released from jail');
  updateJailUI();
}

function bustOut() {
  if (typeof Player === 'undefined') return;
  
  const success = Math.random() < 0.25;
  
  if (success) {
    releaseFromJail();
    showNotification('Jailbreak successful!', 'success');
    addGameLog('You successfully escaped from jail!');
  } else {
    showNotification('Jailbreak failed! Sentence extended!', 'error');
    const playerData = Player.getData();
    Player.updateData({ 
      jailReleaseTime: playerData.jailReleaseTime + (10 * 60 * 1000)
    });
    addGameLog('Your jailbreak attempt failed');
  }
}

function payBail() {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const bailCost = 500;
  
  if (playerData.gold < bailCost) {
    showNotification('Not enough gold to pay bail!', 'error');
    return;
  }
  
  Player.removeGold(bailCost);
  releaseFromJail();
  showNotification('Bail paid. You are free!', 'success');
  addGameLog('You paid bail and were released from jail');
}

// Casino Actions
function playDice() {
  if (typeof Player === 'undefined') return;
  
  const betInput = document.getElementById('dice-bet');
  if (!betInput) return;
  
  const bet = parseInt(betInput.value);
  if (!bet || bet < 10) {
    showNotification('Minimum bet is 10 gold!', 'warning');
    return;
  }
  
  const playerData = Player.getData();
  if (playerData.gold < bet) {
    showNotification('Not enough gold!', 'error');
    return;
  }
  
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const total = dice1 + dice2;
  
  Player.removeGold(bet);
  
  if (total === 7 || total === 11) {
    const winnings = bet * 2;
    Player.addGold(winnings);
    showNotification(`🎲 Rolled ${dice1} and ${dice2} (${total})! Won ${winnings} gold!`, 'success');
    addGameLog(`Won ${winnings} gold at dice game`);
  } else {
    showNotification(`🎲 Rolled ${dice1} and ${dice2} (${total}). Better luck next time!`, 'error');
    addGameLog(`Lost ${bet} gold at dice game`);
  }
  
  betInput.value = '';
}

function playCoin(choice) {
  if (typeof Player === 'undefined') return;
  
  const betInput = document.getElementById('coin-bet');
  if (!betInput) return;
  
  const bet = parseInt(betInput.value);
  if (!bet || bet < 10) {
    showNotification('Minimum bet is 10 gold!', 'warning');
    return;
  }
  
  const playerData = Player.getData();
  if (playerData.gold < bet) {
    showNotification('Not enough gold!', 'error');
    return;
  }
  
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  Player.removeGold(bet);
  
  if (result === choice) {
    const winnings = bet * 2;
    Player.addGold(winnings);
    showNotification(`🪙 ${result.toUpperCase()}! Won ${winnings} gold!`, 'success');
    addGameLog(`Won ${winnings} gold at coin flip`);
  } else {
    showNotification(`🪙 ${result.toUpperCase()}! Better luck next time!`, 'error');
    addGameLog(`Lost ${bet} gold at coin flip`);
  }
  
  betInput.value = '';
}

function playHighCard() {
  if (typeof Player === 'undefined') return;
  
  const betInput = document.getElementById('card-bet');
  if (!betInput) return;
  
  const bet = parseInt(betInput.value);
  if (!bet || bet < 10) {
    showNotification('Minimum bet is 10 gold!', 'warning');
    return;
  }
  
  const playerData = Player.getData();
  if (playerData.gold < bet) {
    showNotification('Not enough gold!', 'error');
    return;
  }
  
  const playerCard = Math.floor(Math.random() * 13) + 1;
  const dealerCard = Math.floor(Math.random() * 13) + 1;
  
  Player.removeGold(bet);
  
  const cardNames = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  
  if (playerCard > dealerCard) {
    const winnings = bet * 2;
    Player.addGold(winnings);
    showNotification(`🃏 You: ${cardNames[playerCard]} vs Dealer: ${cardNames[dealerCard]}. Won ${winnings} gold!`, 'success');
    addGameLog(`Won ${winnings} gold at high card`);
  } else if (playerCard < dealerCard) {
    showNotification(`🃏 You: ${cardNames[playerCard]} vs Dealer: ${cardNames[dealerCard]}. Lost!`, 'error');
    addGameLog(`Lost ${bet} gold at high card`);
  } else {
    Player.addGold(bet);
    showNotification(`🃏 You: ${cardNames[playerCard]} vs Dealer: ${cardNames[dealerCard]}. Push! Bet returned.`, 'info');
    addGameLog(`Tied at high card - bet returned`);
  }
  
  betInput.value = '';
}

// Friends/Enemies Actions
function addFriend() {
  showNotification('Friend request sent!', 'success');
  addGameLog('Sent a friend request');
}

function removeFriend(name) {
  showNotification(`Removed ${name} from friends`, 'info');
  addGameLog(`Removed ${name} from friends list`);
}

function attackEnemy(name) {
  showNotification(`Attacked ${name}!`, 'warning');
  addGameLog(`Engaged in combat with ${name}`);
  
  if (typeof Player !== 'undefined') {
    Player.addXP(50);
  }
}

// Utility Functions
function showNotification(message, type = 'info') {
  if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
    UI.showNotification(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

function addGameLog(message) {
  const logEntries = document.getElementById('log-entries');
  if (!logEntries) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `[${timestamp}] ${message}`;
  
  logEntries.appendChild(entry);
  
  // Scroll to bottom
  const gameLog = document.getElementById('game-log');
  if (gameLog) {
    gameLog.scrollTop = gameLog.scrollHeight;
  }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    upgradeHome,
    restAtHome,
    heal,
    trainStat,
    buyProperty,
    acceptQuest,
    commitCrime,
    sendToJail,
    bustOut,
    payBail,
    playDice,
    playCoin,
    playHighCard,
    addFriend,
    removeFriend,
    attackEnemy
  };
}

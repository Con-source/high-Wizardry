/**
 * Actions Module
 * Handles all player actions across different locations
 */

// Home Actions
function upgradeHome() {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  const cost = 6000; // 500 gold equivalent = 6000 pennies = 500 shillings
  
  if (Player.getTotalPennies() < cost) {
    showNotification('Not enough currency to upgrade your home!', 'error');
    return;
  }
  
  Player.removeCurrency(cost);
  showNotification('Home upgraded successfully!', 'success');
  addGameLog(`You upgraded your home for ${Player.formatCurrency(cost)}`);
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
  
  if (Player.getTotalPennies() < cost) {
    showNotification('Not enough currency for healing!', 'error');
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
  Player.removeCurrency(cost);
  
  showNotification(`Healed for ${Math.floor(healAmount)} health!`, 'success');
  addGameLog(`You were healed at the hospital for ${Player.formatCurrency(cost)}`);
}

// Education Actions
function trainStat(statName, cost) {
  if (typeof Player === 'undefined') return;
  
  const playerData = Player.getData();
  
  if (Player.getTotalPennies() < cost) {
    showNotification('Not enough currency for training!', 'error');
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
  Player.removeCurrency(cost);
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
  
  if (Player.getTotalPennies() < price) {
    showNotification('Not enough currency to buy this property!', 'error');
    return;
  }
  
  Player.removeCurrency(price);
  
  // Save property to player data
  const properties = playerData.properties || [];
  properties.push({ type, price, income, purchaseDate: Date.now() });
  Player.updateData({ properties });
  
  showNotification(`Purchased ${type} for ${Player.formatCurrency(price)}!`, 'success');
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
      <p class="text-muted small mb-0">Income: ${Player.formatCurrency(prop.income)}/day</p>
    </div>
  `).join('');
}

// Quest Actions
function acceptQuest(questId) {
  if (typeof Player === 'undefined') return;
  
  showNotification(`Quest "${questId}" accepted!`, 'success');
  addGameLog(`You accepted a quest: ${questId}`);
  Player.addXP(10);
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
    Player.addCurrency(reward);
    Player.addXP(20);
    showNotification(`Crime successful! Earned ${Player.formatCurrency(reward)}!`, 'success');
    addGameLog(`You successfully committed ${crimeType} and earned ${Player.formatCurrency(reward)}`);
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

  // Safely increment persisted questsCompleted
  const playerData = Player.getData();
  const bailCost = 6000; // 500 gold equivalent = 6000 pennies
  
  if (Player.getTotalPennies() < bailCost) {
    showNotification('Not enough currency to pay bail!', 'error');
    return;
  }
  
  Player.removeCurrency(bailCost);
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
  if (!bet || bet < 120) { // 10 gold = 120 pennies
    showNotification('Minimum bet is 10 shillings (120 pennies)!', 'warning');
    return;
  }
  
  const playerData = Player.getData();
  if (Player.getTotalPennies() < bet) {
    showNotification('Not enough currency!', 'error');
    return;
  }
  
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const total = dice1 + dice2;
  
  Player.removeCurrency(bet);
  
  if (total === 7 || total === 11) {
    const winnings = bet * 2;
    Player.addCurrency(winnings);
    showNotification(`🎲 Rolled ${dice1} and ${dice2} (${total})! Won ${Player.formatCurrency(winnings)}!`, 'success');
    addGameLog(`Won ${Player.formatCurrency(winnings)} at dice game`);
  } else {
    showNotification(`🎲 Rolled ${dice1} and ${dice2} (${total}). Better luck next time!`, 'error');
    addGameLog(`Lost ${Player.formatCurrency(bet)} at dice game`);
  }
  
  betInput.value = '';
}

function playCoin(choice) {
  if (typeof Player === 'undefined') return;
  
  const betInput = document.getElementById('coin-bet');
  if (!betInput) return;
  
  const bet = parseInt(betInput.value);
  if (!bet || bet < 120) { // 10 gold = 120 pennies
    showNotification('Minimum bet is 10 shillings (120 pennies)!', 'warning');
    return;
  }
  
  const playerData = Player.getData();
  if (Player.getTotalPennies() < bet) {
    showNotification('Not enough currency!', 'error');
    return;
  }
  
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  Player.removeCurrency(bet);
  
  if (result === choice) {
    const winnings = bet * 2;
    Player.addCurrency(winnings);
    showNotification(`🪙 ${result.toUpperCase()}! Won ${Player.formatCurrency(winnings)}!`, 'success');
    addGameLog(`Won ${Player.formatCurrency(winnings)} at coin flip`);
  } else {
    showNotification(`🪙 ${result.toUpperCase()}! Better luck next time!`, 'error');
    addGameLog(`Lost ${Player.formatCurrency(bet)} at coin flip`);
  }
  
  betInput.value = '';
}

function playHighCard() {
  if (typeof Player === 'undefined') return;
  
  const betInput = document.getElementById('card-bet');
  if (!betInput) return;
  
  const bet = parseInt(betInput.value);
  if (!bet || bet < 120) { // 10 gold = 120 pennies
    showNotification('Minimum bet is 10 shillings (120 pennies)!', 'warning');
    return;
  }
  
  const playerData = Player.getData();
  if (Player.getTotalPennies() < bet) {
    showNotification('Not enough currency!', 'error');
    return;
  }
  
  const playerCard = Math.floor(Math.random() * 13) + 1;
  const dealerCard = Math.floor(Math.random() * 13) + 1;
  
  Player.removeCurrency(bet);
  
  const cardNames = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  
  if (playerCard > dealerCard) {
    const winnings = bet * 2;
    Player.addCurrency(winnings);
    showNotification(`🃏 You: ${cardNames[playerCard]} vs Dealer: ${cardNames[dealerCard]}. Won ${Player.formatCurrency(winnings)}!`, 'success');
    addGameLog(`Won ${Player.formatCurrency(winnings)} at high card`);
  } else if (playerCard < dealerCard) {
    showNotification(`🃏 You: ${cardNames[playerCard]} vs Dealer: ${cardNames[dealerCard]}. Lost!`, 'error');
    addGameLog(`Lost ${Player.formatCurrency(bet)} at high card`);
  } else {
    Player.addCurrency(bet);
    showNotification(`🃏 You: ${cardNames[playerCard]} vs Dealer: ${cardNames[dealerCard]}. Push! Bet returned.`, 'info');
    addGameLog(`Tied at high card - bet returned`);
  }
  
  betInput.value = '';
}

  // Notify player
  if (typeof showNotification === 'function') showNotification(`Quest "${questId}" completed!`, 'success');
  if (typeof addGameLog === 'function') addGameLog(`You completed a quest: ${questId}`);

  // Try to unlock any quest-based locations
  if (typeof Locations !== 'undefined' && typeof Locations.tryUnlockLocation === 'function') {
    // Example: enchanted forest unlocks at 5 quests
    if (questsCompleted >= 5) {
      if (Locations.tryUnlockLocation('enchanted-forest')) {
        if (typeof showNotification === 'function') showNotification('New location unlocked: Enchanted Forest!', 'success');
      }
    }
  }
}

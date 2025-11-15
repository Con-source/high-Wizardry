let player = {energy:100,maxEnergy:100,energyTimer:10,xp:0,level:1,magic:1,alchemy:1,health:10,mana:5,rep:0,herbs:0,potions:0,shillings:0,pennies:0,guildPoints:0,guildName:"None"};

if(localStorage.getItem('highWizardry')){
 player = JSON.parse(localStorage.getItem('highWizardry'));
 updateUI();
}

setInterval(()=>{
 if(player.energy < player.maxEnergy){
 player.energyTimer--;
 if(player.energyTimer <= 0){
 player.energy++;
 player.energyTimer = 10;
 }
 }
 document.getElementById('energy-timer').innerText = player.energyTimer;
 updateUI();
},1000);

function performAction(act){
 let cost = 0, xpGain = 0;
 switch(act){
 case 'grow': cost=10; xpGain=5; player.herbs++; break;
 case 'brew': cost=15; xpGain=10; if(player.herbs>0){player.herbs--;player.potions++;} break;
 case 'train': cost=20; xpGain=15; player.magic++; player.alchemy++; break;
 case 'quest': cost=25; xpGain=25; 
  const questReward = 10;
  const totalPennies = (player.shillings * 12) + player.pennies + questReward;
  player.shillings = Math.floor(totalPennies / 12);
  player.pennies = totalPennies % 12;
  break;
 }
 if(player.energy >= cost){
 player.energy -= cost;
 player.xp += xpGain;
 document.getElementById('action-timer').innerText = `Next action ready in ${cost/5}s`;
 checkLevelUp();
 updateUI();
 saveGame();
 } else {
 alert("Not enough energy!");
 }
}

function checkLevelUp(){
 let xpNeeded = player.level * 100;
 if(player.xp >= xpNeeded){
 player.level++;
 player.xp = 0;
 player.maxEnergy += 10;
 player.energy = player.maxEnergy;
 alert(`Level Up! You are now level ${player.level}`);
 }
}

function buyItem(item){
 if(item === 'potion'){
  const cost = 10;
  const totalPennies = (player.shillings * 12) + player.pennies;
  if(totalPennies >= cost){
   player.potions++;
   const newTotal = totalPennies - cost;
   player.shillings = Math.floor(newTotal / 12);
   player.pennies = newTotal % 12;
  }
 }
 if(item === 'herb'){
  const cost = 5;
  const totalPennies = (player.shillings * 12) + player.pennies;
  if(totalPennies >= cost){
   player.herbs++;
   const newTotal = totalPennies - cost;
   player.shillings = Math.floor(newTotal / 12);
   player.pennies = newTotal % 12;
  }
 }
 updateUI();
 saveGame();
}

function updateUI(){
 document.getElementById('energy').innerText = player.energy;
 document.getElementById('xp').innerText = player.xp;
 document.getElementById('level').innerText = player.level;
 document.getElementById('magic').innerText = player.magic;
 document.getElementById('alchemy').innerText = player.alchemy;
 document.getElementById('health').innerText = player.health;
 document.getElementById('mana').innerText = player.mana;
 document.getElementById('rep').innerText = player.rep;
 document.getElementById('herbs').innerText = player.herbs;
 document.getElementById('potions').innerText = player.potions;
 const currencyEl = document.getElementById('currency');
 if(currencyEl) currencyEl.innerText = `${player.shillings}/${player.pennies}`;
}

function saveGame(){
 localStorage.setItem('highWizardry', JSON.stringify(player));
}

let npcMessages = [" Buying herbs soon!", " Selling potions!", " Training magic!", " Going on a quest!"];

function addChatMessages(){
 let pChat = document.getElementById('player-chat');
 let tChat = document.getElementById('trade-chat');
 let gChat = document.getElementById('guild-chat');
 let msg = npcMessages[Math.floor(Math.random()*npcMessages.length)];
 pChat.innerHTML += `<p>${msg}</p>`;
 tChat.innerHTML += `<p>${msg}</p>`;
 gChat.innerHTML += `<p>${msg}</p>`;
 pChat.scrollTop = pChat.scrollHeight;
 tChat.scrollTop = tChat.scrollHeight;
 gChat.scrollTop = gChat.scrollHeight;
}
setInterval(addChatMessages, 5000);

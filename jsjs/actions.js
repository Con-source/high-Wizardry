function acceptQuest(questId) {
  if (typeof Player === 'undefined') return;

  // Safely increment persisted questsCompleted
  const playerData = Player.getData();
  const questsCompleted = (playerData.questsCompleted || 0) + 1;

  // Persist only the field we want to change (assumes updateData merges)
  if (typeof Player.updateData === 'function') {
    Player.updateData({ questsCompleted });
  } else if (typeof Player.setData === 'function') {
    const newData = Object.assign({}, playerData, { questsCompleted });
    Player.setData(newData);
  }

  // Reward XP
  if (typeof Player.addXP === 'function') Player.addXP(10);

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

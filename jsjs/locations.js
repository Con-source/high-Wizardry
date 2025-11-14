/* Locations module - updated unlock checks and UI refresh */
const Locations = (() => {
  const locationData = {
    'town-square': { name: 'Town Square', description: 'The bustling heart of the magical city. Wizards and adventurers gather here.', contentId: null, unlocked: true },
    'home': { name: 'My Home', description: 'Your personal sanctuary. A place to rest and manage your belongings.', contentId: 'location-content-home', unlocked: true },
    'hospital': { name: 'Hospital', description: 'Heal your wounds and restore your vitality.', contentId: 'location-content-hospital', unlocked: true },
    'education': { name: 'Education', description: 'Train your skills and improve your abilities.', contentId: 'location-content-education', unlocked: true },
    'property': { name: 'Property Management', description: 'View and manage your real estate investments.', contentId: 'location-content-property', unlocked: true },
    'quests': { name: 'Quest Board', description: 'Accept quests to earn rewards and experience.', contentId: 'location-content-quests', unlocked: true },
    'crimes': { name: 'Criminal Activities', description: 'Engage in illegal activities to earn quick money. Beware of consequences!', contentId: 'location-content-crimes', unlocked: true },
    'jail': { name: 'Jail', description: 'The city jail. Serve your time for your crimes.', contentId: 'location-content-jail', unlocked: true },
    'casino': { name: 'The Golden Dice Casino', description: 'Try your luck at various games of chance!', contentId: 'location-content-casino', unlocked: true },
    'newspaper': { name: 'The Daily Wizard', description: 'Stay informed about events in the magical world.', contentId: 'location-content-newspaper', unlocked: true },
    'friends': { name: 'Friends & Enemies', description: 'Manage your social relationships.', contentId: 'location-content-friends', unlocked: true },
    'magic-shop': { name: 'Magic Shop', description: 'A shop filled with magical artifacts and ingredients.', contentId: null, unlocked: true },
    'tavern': { name: 'The Drunken Wizard', description: 'A cozy tavern where adventurers share stories and drinks.', contentId: null, unlocked: true },
    'workshop': { name: 'Workshop', description: 'Craft powerful items and equipment using gathered resources.', contentId: 'location-content-workshop', unlocked: true },
    'guilds': { name: 'Guild Hall', description: 'Join guilds to gain special perks and benefits.', contentId: 'location-content-guilds', unlocked: true },
    'enchanted-forest': { name: 'Enchanted Forest', description: 'A mystical woodland filled with magical creatures and rare herbs.', contentId: 'location-content-enchanted-forest', unlocked: false, unlockRequirement: { type: 'quests', value: 5, message: 'Complete 5 quests to unlock' }, icon: 'fa-tree' },
    'arcane-temple': { name: 'Arcane Temple', description: 'A ruined temple where arcane experiments went awry.', contentId: 'location-content-arcane-temple', unlocked: false, unlockRequirement: { type: 'level', value: 7, message: 'Reach Level 7 to unlock' }, icon: 'fa-landmark' },
    'crystal-peak-mines': { name: 'Crystal Peak Mines', description: 'Hazardous mines filled with monsters yet rich in minerals.', contentId: 'location-content-crystal-peak-mines', unlocked: false, unlockRequirement: { type: 'level', value: 10, message: 'Reach Level 10 to unlock' }, icon: 'fa-mountain' }
  };

  let currentLocation = 'town-square';

  function init() {
    // no-op for now
    return true;
  }

  function isLocationUnlocked(locationId) {
    const location = locationData[locationId];
    if (!location) return false;
    if (location.unlocked === true) return true;
    if (!location.unlockRequirement) return Boolean(location.unlocked);
    if (typeof Player === 'undefined' || typeof Player.getData !== 'function') return false;
    const playerData = Player.getData();
    const req = location.unlockRequirement;
    switch (req.type) {
      case 'quests': return (playerData.questsCompleted || 0) >= req.value;
      case 'level': return (playerData.level || 0) >= req.value;
      case 'item': return ((playerData.craftedItems || {})[req.value] || 0) > 0;
      default: return false;
    }
  }

  function tryUnlockLocation(locationId) {
    const loc = locationData[locationId];
    if (!loc) return false;
    if (loc.unlocked === true) return false;
    if (isLocationUnlocked(locationId)) {
      loc.unlocked = true;
      if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`${loc.name} unlocked!`, 'success');
      return true;
    }
    return false;
  }

  function navigateToLocation(locationId) {
    const location = locationData[locationId];
    if (!location) { console.warn('Unknown location', locationId); return; }
    if (!isLocationUnlocked(locationId)) { if (typeof UI !== 'undefined' && UI.showNotification && location.unlockRequirement) UI.showNotification(`Location locked: ${location.unlockRequirement.message}`, 'warning'); return; }
    currentLocation = locationId;
    document.querySelectorAll('.location-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`.location-btn[data-location="${locationId}"]`);
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.location-content').forEach(el => el.style.display = 'none');
    if (location.contentId) { const content = document.getElementById(location.contentId); if (content) content.style.display = 'block'; }

    // Show notification about new resources if applicable
    if (['enchanted-forest','arcane-temple','crystal-peak-mines'].includes(locationId)) {
      if (typeof Resources !== 'undefined' && Resources.getLocationResources) {
        const res = Resources.getLocationResources(locationId);
        if (res.length > 0 && typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('New resources available in this area!', 'info');
      }
    }

    // Update UIs
    if (locationId === 'workshop' && typeof Workshop !== 'undefined' && Workshop.updateWorkshopUI) Workshop.updateWorkshopUI();
    if (locationId === 'guilds' && typeof Guilds !== 'undefined' && Guilds.updateGuildUI) Guilds.updateGuildUI();
    if (typeof Resources !== 'undefined' && Resources.updateResourceUI) Resources.updateResourceUI();

    updateLocationStats(locationId);
    console.log(`Navigated to: ${location.name}`);
  }

  function getCurrentLocation() { return currentLocation; }

  return { init, navigateToLocation, getCurrentLocation, isLocationUnlocked, tryUnlockLocation, getLocationData: (id) => locationData[id] };
})();

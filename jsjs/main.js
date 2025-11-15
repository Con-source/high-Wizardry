document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI first
  if (typeof UI !== 'undefined' && typeof UI.init === 'function') { UI.init(); console.log('✅ UI initialized'); }
  // Initialize UI first
  if (typeof UI !== 'undefined' && typeof UI.init === 'function') { UI.init(); console.log('✅ UI initialized'); }
  // Initialize Player if present
  if (typeof Player !== 'undefined' && typeof Player.init === 'function') Player.init();

  // Initialize Resources, Guilds, Workshop, Chat
  if (typeof Resources !== 'undefined' && typeof Resources.init === 'function') { Resources.init(); console.log('✅ Resources initialized'); }
  if (typeof Guilds !== 'undefined' && typeof Guilds.init === 'function') { Guilds.init(); console.log('✅ Guilds initialized'); }
  if (typeof Workshop !== 'undefined' && typeof Workshop.init === 'function') { Workshop.init(); console.log('✅ Workshop initialized'); }
  if (typeof Locations !== 'undefined' && typeof Locations.init === 'function') { Locations.init(); console.log('✅ Locations initialized'); }
  if (typeof Chat !== 'undefined' && typeof Chat.init === 'function') { Chat.init(); console.log('✅ Chat initialized'); }

  // Teleport event listener wiring
  if (typeof document !== 'undefined') {
    document.addEventListener('teleport:request', (ev) => {
      const loc = ev.detail && ev.detail.location;
      if (loc && typeof Locations !== 'undefined' && typeof Locations.navigateToLocation === 'function') {
        Locations.navigateToLocation(loc);
      }
    });
  }

  window.DebugModules = { Player: typeof Player !== 'undefined' ? Player : null, Game: window.HighWizardry?.Game || null, Chat: typeof Chat !== 'undefined' ? Chat : null, UI: typeof UI !== 'undefined' ? UI : null, Resources: typeof Resources !== 'undefined' ? Resources : null, Workshop: typeof Workshop !== 'undefined' ? Workshop : null, Guilds: typeof Guilds !== 'undefined' ? Guilds : null, Locations: typeof Locations !== 'undefined' ? Locations : null, CONFIG: typeof CONFIG !== 'undefined' ? CONFIG : null };
  console.log('Debug modules available at window.DebugModules');
});
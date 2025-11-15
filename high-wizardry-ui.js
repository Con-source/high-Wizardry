/**
 * High Wizardry - UI Bridge and Debug Overlay
 * Connects GameCore with HTML, handles notifications and live updates.
 */

(function() {
  // === CONFIG ===
  const SELECTORS = {
    playerName: '#player-name',
    playerLevel: '#player-level',
    gold: '#gold-display',
    locationName: '#location-name',
    locationDesc: '#location-description',
    actionButtons: '#action-buttons',
    gameLog: '#log-entries',
    clearLog: '#clear-log'
  };

  // === WIZARD UI ===
  const WizardUI = {
    log(message, type = 'info') {
      const logContainer = document.querySelector(SELECTORS.gameLog);
      if (!logContainer) return;
      const time = new Date().toLocaleTimeString();
      const entry = document.createElement('div');
      entry.className = `log-entry log-${type}`;
      entry.textContent = `[${time}] ${message}`;
      logContainer.prepend(entry);
    },

    showNotification(message, { type = 'info', duration = 2500 } = {}) {
      this.log(message, type);
      // Optional visual toast (Bootstrap)
      const toast = document.createElement('div');
      toast.className = `toast align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0 show position-fixed bottom-0 end-0 m-3`;
      toast.style.zIndex = 9999;
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), duration);
    },

    clearLog() {
      const logContainer = document.querySelector(SELECTORS.gameLog);
      if (logContainer) logContainer.innerHTML = '';
    }
  };

  window.WizardUI = WizardUI;

  // === GAME UI (live HUD updater) ===
  const GameUI = {
    update(state) {
      if (!state || !state.player) return;

      const p = state.player;
      const loc = state.locations[p.location];
      document.querySelector(SELECTORS.playerName).textContent = p.name;
      document.querySelector(SELECTORS.playerLevel).textContent = p.level;
      document.querySelector(SELECTORS.gold).textContent = p.gold.toLocaleString();
      document.querySelector(SELECTORS.locationName).textContent = loc?.name || 'Unknown';
      document.querySelector(SELECTORS.locationDesc).textContent = loc?.description || '';

      // Update actions
      const actionContainer = document.querySelector(SELECTORS.actionButtons);
      if (actionContainer && loc?.actions) {
        actionContainer.innerHTML = '';
        loc.actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-outline-light me-2 mb-2';
          btn.innerHTML = `<i class="fa-solid ${action.icon} me-1"></i> ${action.name}`;
          btn.addEventListener('click', () => {
            if (window.HighWizardry?.Game) {
              window.HighWizardry.Game.performAction(action.id);
            }
          });
          actionContainer.appendChild(btn);
        });
      }
    }
  };

  window.GameUI = GameUI;

  // === DEBUG OVERLAY ===
  const DebugOverlay = {
    init(gameInstance) {
      if (document.getElementById('debug-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'debug-overlay';
      overlay.style = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: #00ffcc;
        padding: 10px 15px;
        border-radius: 6px;
        font-size: 13px;
        font-family: monospace;
        z-index: 9999;
      `;
      overlay.innerHTML = `
        <div>⚙️ <b>High Wizardry Debug</b></div>
        <div>FPS: <span id="debug-fps">--</span></div>
        <div>Energy: <span id="debug-energy">--</span></div>
        <div>Location: <span id="debug-location">--</span></div>
        <div>Ver: ${gameInstance?.settings?.version || 'dev'}</div>
      `;
      document.body.appendChild(overlay);

      setInterval(() => {
        if (!window.HighWizardry?.Game) return;
        const game = window.HighWizardry.Game;
        const fps = game.performance.getAverageFPS();
        const energy = Math.round(game.state.player.energy);
        const loc = game.state.player.location;

        document.getElementById('debug-fps').textContent = fps;
        document.getElementById('debug-energy').textContent = energy;
        document.getElementById('debug-location').textContent = loc;
      }, 1000);
    }
  };

  // === INITIALIZE ===
  window.addEventListener('DOMContentLoaded', () => {
    if (window.HighWizardry?.Game) {
      WizardUI.showNotification('Welcome to High Wizardry!', { type: 'success' });
      GameUI.update(window.HighWizardry.Game.state.state || window.HighWizardry.Game.state);
      DebugOverlay.init(window.HighWizardry.Game);
    }

    const clearBtn = document.querySelector(SELECTORS.clearLog);
    if (clearBtn) clearBtn.addEventListener('click', () => WizardUI.clearLog());
  });

})();
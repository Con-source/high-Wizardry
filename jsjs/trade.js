/**
 * Trade Module
 * Handles player-to-player trading UI and logic
 */

(function() {
  'use strict';

  window.WizardCity = window.WizardCity || {};

  /**
   * @typedef {Object} TradeOffer
   * @property {string[]} items - Array of item IDs
   * @property {number} currency - Amount in pennies
   */

  /**
   * @typedef {Object} Trade
   * @property {string} id - Trade ID
   * @property {string} fromPlayerId - Initiating player ID
   * @property {string} toPlayerId - Receiving player ID
   * @property {string} fromUsername - Initiating player username
   * @property {string} toUsername - Receiving player username
   * @property {string} status - Trade status (proposed, negotiating, confirmed, completed, cancelled, failed)
   * @property {TradeOffer} fromOffer - Offer from initiating player
   * @property {TradeOffer} toOffer - Offer from receiving player
   * @property {boolean} fromConfirmed - Whether fromPlayer confirmed
   * @property {boolean} toConfirmed - Whether toPlayer confirmed
   * @property {number} createdAt - Timestamp
   * @property {number} updatedAt - Timestamp
   */

  const Trade = {
    currentTrade: null,
    tradeHistory: [],
    isInitialized: false,

    /**
     * Initialize the trade module
     */
    init() {
      if (this.isInitialized) return;
      
      console.log('🔄 Initializing Trade module...');
      
      this.setupUI();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Trade module initialized');
    },

    /**
     * Setup UI elements
     */
    setupUI() {
      // Check if trade modal already exists
      if (document.getElementById('trade-modal')) {
        return;
      }

      // Create trade modal HTML
      const modalHTML = `
        <div class="modal fade" id="trade-modal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content bg-dark">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="fas fa-exchange-alt"></i> Trade
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body" id="trade-modal-body">
                <!-- Trade content will be inserted here -->
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal fade" id="trade-initiate-modal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content bg-dark">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="fas fa-handshake"></i> Initiate Trade
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label for="trade-player-select" class="form-label">Select Player:</label>
                  <select class="form-select bg-dark text-light" id="trade-player-select">
                    <option value="">-- Select a player --</option>
                  </select>
                </div>
                <p class="text-muted small">
                  <i class="fas fa-info-circle"></i> You'll be able to add items and currency after sending the invitation.
                </p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="trade-send-invitation">
                  <i class="fas fa-paper-plane"></i> Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add modals to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Send invitation button
      const sendBtn = document.getElementById('trade-send-invitation');
      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendTradeInvitation());
      }

      // Listen for server messages
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        // Store original handler
        const originalHandler = onlineGame.handleServerMessage;
        
        // Wrap handler to intercept trade messages
        onlineGame.handleServerMessage = (message) => {
          this.handleServerMessage(message);
          if (originalHandler) {
            originalHandler.call(onlineGame, message);
          }
        };
      }
    },

    /**
     * Open trade initiation modal
     */
    openTradeInitiation() {
      // Populate player list
      const select = document.getElementById('trade-player-select');
      if (!select) return;

      select.innerHTML = '<option value="">-- Select a player --</option>';

      // Get online players (from onlineGame.players)
      if (typeof onlineGame !== 'undefined' && onlineGame.players) {
        Object.values(onlineGame.players).forEach(player => {
          const option = document.createElement('option');
          option.value = player.id;
          option.textContent = player.username;
          select.appendChild(option);
        });
      }

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('trade-initiate-modal'));
      modal.show();
    },

    /**
     * Send trade invitation
     */
    sendTradeInvitation() {
      const select = document.getElementById('trade-player-select');
      const toPlayerId = select.value;

      if (!toPlayerId) {
        this.showMessage('Please select a player', 'warning');
        return;
      }

      // Send to server
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'trade_propose',
          toPlayerId: toPlayerId,
          offer: { items: [], currency: 0 }
        }));
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('trade-initiate-modal'));
      if (modal) modal.hide();
    },

    /**
     * Show trade window
     */
    showTradeWindow(trade) {
      this.currentTrade = trade;
      
      const modal = new bootstrap.Modal(document.getElementById('trade-modal'));
      const body = document.getElementById('trade-modal-body');
      
      if (!body) return;

      const isFromPlayer = trade.fromPlayerId === (onlineGame?.playerId || '');
      const myOffer = isFromPlayer ? trade.fromOffer : trade.toOffer;
      const theirOffer = isFromPlayer ? trade.toOffer : trade.fromOffer;
      const theirUsername = isFromPlayer ? trade.toUsername : trade.fromUsername;

      body.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-exchange-alt"></i> Trading with <strong>${theirUsername}</strong>
        </div>

        <div class="row">
          <div class="col-md-6">
            <h6><i class="fas fa-user"></i> Your Offer</h6>
            <div id="my-offer" class="border rounded p-3 mb-3" style="min-height: 200px; background: rgba(0,0,0,0.2);">
              ${this.renderOffer(myOffer, true)}
            </div>
            <button class="btn btn-sm btn-outline-primary" id="trade-modify-offer">
              <i class="fas fa-edit"></i> Modify Offer
            </button>
          </div>

          <div class="col-md-6">
            <h6><i class="fas fa-user-friends"></i> ${theirUsername}'s Offer</h6>
            <div id="their-offer" class="border rounded p-3 mb-3" style="min-height: 200px; background: rgba(0,0,0,0.2);">
              ${this.renderOffer(theirOffer, false)}
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              ${trade.fromConfirmed ? '<span class="badge bg-success"><i class="fas fa-check"></i> ' + trade.fromUsername + ' confirmed</span>' : ''}
              ${trade.toConfirmed ? '<span class="badge bg-success"><i class="fas fa-check"></i> ' + trade.toUsername + ' confirmed</span>' : ''}
            </div>
            <div>
              <button class="btn btn-danger" id="trade-cancel">
                <i class="fas fa-times"></i> Cancel Trade
              </button>
              <button class="btn btn-success" id="trade-confirm">
                <i class="fas fa-check"></i> Confirm Trade
              </button>
            </div>
          </div>
        </div>
      `;

      // Add event listeners
      document.getElementById('trade-modify-offer')?.addEventListener('click', () => this.openOfferEditor());
      document.getElementById('trade-cancel')?.addEventListener('click', () => this.cancelTrade());
      document.getElementById('trade-confirm')?.addEventListener('click', () => this.confirmTrade());

      modal.show();
    },

    /**
     * Render offer content
     */
    renderOffer(offer, editable) {
      if (!offer || (!offer.items?.length && !offer.currency)) {
        return '<p class="text-muted"><em>No items or currency offered</em></p>';
      }

      let html = '';

      // Currency
      if (offer.currency > 0) {
        const shillings = Math.floor(offer.currency / 12);
        const pennies = offer.currency % 12;
        html += `<div class="mb-2">
          <i class="fas fa-coins text-warning"></i> 
          ${shillings}s ${pennies}p
        </div>`;
      }

      // Items
      if (offer.items && offer.items.length > 0) {
        html += '<div class="mb-2"><strong>Items:</strong></div>';
        offer.items.forEach(itemId => {
          html += `<div class="badge bg-secondary me-1 mb-1">${itemId}</div>`;
        });
      }

      return html;
    },

    /**
     * Open offer editor
     */
    openOfferEditor() {
      // TODO: Implement offer editor with item and currency selection
      this.showMessage('Offer editor coming soon!', 'info');
    },

    /**
     * Confirm trade
     */
    confirmTrade() {
      if (!this.currentTrade) return;

      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'trade_confirm',
          tradeId: this.currentTrade.id
        }));
      }
    },

    /**
     * Cancel trade
     */
    cancelTrade() {
      if (!this.currentTrade) return;

      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'trade_cancel',
          tradeId: this.currentTrade.id
        }));
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('trade-modal'));
      if (modal) modal.hide();
      
      this.currentTrade = null;
    },

    /**
     * Handle server messages
     */
    handleServerMessage(message) {
      switch (message.type) {
        case 'trade_invitation':
          this.handleTradeInvitation(message.trade);
          break;
        case 'trade_propose_result':
          this.handleTradeProposalResult(message);
          break;
        case 'trade_updated':
          this.handleTradeUpdated(message.trade);
          break;
        case 'trade_confirmed':
          this.handleTradeConfirmed(message.trade);
          break;
        case 'trade_cancelled':
          this.handleTradeCancelled(message.tradeId);
          break;
        case 'trade_confirm_result':
          this.handleTradeConfirmResult(message);
          break;
      }
    },

    /**
     * Handle trade invitation
     */
    handleTradeInvitation(trade) {
      this.showMessage(`${trade.fromUsername} has sent you a trade invitation!`, 'info');
      this.showTradeWindow(trade);
    },

    /**
     * Handle trade proposal result
     */
    handleTradeProposalResult(message) {
      if (message.success) {
        this.showMessage('Trade invitation sent!', 'success');
        this.showTradeWindow(message.trade);
      } else {
        this.showMessage(message.message || 'Failed to send trade invitation', 'danger');
      }
    },

    /**
     * Handle trade updated
     */
    handleTradeUpdated(trade) {
      this.currentTrade = trade;
      if (document.getElementById('trade-modal')?.classList.contains('show')) {
        this.showTradeWindow(trade);
      }
    },

    /**
     * Handle trade confirmed
     */
    handleTradeConfirmed(trade) {
      this.currentTrade = trade;
      
      if (trade.status === 'completed') {
        this.showMessage('Trade completed successfully!', 'success');
        
        // Close modal after a moment
        setTimeout(() => {
          const modal = bootstrap.Modal.getInstance(document.getElementById('trade-modal'));
          if (modal) modal.hide();
          this.currentTrade = null;
        }, 2000);
      } else {
        this.showMessage('Waiting for confirmation...', 'info');
        if (document.getElementById('trade-modal')?.classList.contains('show')) {
          this.showTradeWindow(trade);
        }
      }
    },

    /**
     * Handle trade cancelled
     */
    handleTradeCancelled(tradeId) {
      this.showMessage('Trade was cancelled', 'warning');
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('trade-modal'));
      if (modal) modal.hide();
      
      this.currentTrade = null;
    },

    /**
     * Handle trade confirm result
     */
    handleTradeConfirmResult(message) {
      if (message.success) {
        if (message.trade.status === 'completed') {
          this.showMessage('Trade completed!', 'success');
        } else {
          this.showMessage(message.message || 'Trade confirmed', 'success');
        }
      } else {
        this.showMessage(message.message || 'Failed to confirm trade', 'danger');
      }
    },

    /**
     * Show message to user
     */
    showMessage(text, type = 'info') {
      // Try to use existing message system
      if (typeof UI !== 'undefined' && UI.showNotification) {
        UI.showNotification(text, type);
      } else if (typeof onlineGame !== 'undefined' && onlineGame.showMessage) {
        onlineGame.showMessage(text);
      } else {
        console.log(`[Trade] ${text}`);
      }
    }
  };

  // Expose module
  window.WizardCity.Trade = Trade;

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Trade.init());
  } else {
    Trade.init();
  }
})();

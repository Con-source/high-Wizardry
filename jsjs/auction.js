/**
 * Auction Module
 * Handles auction house UI and logic
 */

(function() {
  'use strict';

  window.WizardCity = window.WizardCity || {};

  /**
   * @typedef {Object} Auction
   * @property {string} id - Auction ID
   * @property {string} sellerId - Seller player ID
   * @property {string} sellerUsername - Seller username
   * @property {Object} item - Item being auctioned
   * @property {number} startingBid - Starting bid in pennies
   * @property {number} currentBid - Current highest bid in pennies
   * @property {string|null} highestBidderId - Current highest bidder ID
   * @property {string|null} highestBidderUsername - Current highest bidder username
   * @property {Array} bids - Array of bids
   * @property {string} status - Auction status (active, completed, cancelled)
   * @property {string} scope - Auction scope (global, location, guild)
   * @property {number} createdAt - Timestamp
   * @property {number} endsAt - Timestamp when auction ends
   */

  const Auction = {
    activeAuctions: [],
    myAuctions: [],
    myBids: [],
    auctionHistory: [],
    isInitialized: false,
    refreshInterval: null,

    /**
     * Initialize the auction module
     */
    init() {
      if (this.isInitialized) return;
      
      console.log('🏛️ Initializing Auction module...');
      
      this.setupUI();
      this.setupEventListeners();
      this.startAutoRefresh();
      
      this.isInitialized = true;
      console.log('✅ Auction module initialized');
    },

    /**
     * Setup UI elements
     */
    setupUI() {
      // Check if auction modal already exists
      if (document.getElementById('auction-modal')) {
        return;
      }

      // Create auction modal HTML
      const modalHTML = `
        <div class="modal fade" id="auction-modal" tabindex="-1">
          <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="fas fa-gavel"></i> Auction House
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body" id="auction-modal-body">
                <ul class="nav nav-tabs mb-3" id="auction-tabs" role="tablist">
                  <li class="nav-item">
                    <button class="nav-link active" id="browse-tab" data-bs-toggle="tab" data-bs-target="#browse-auctions" type="button">
                      <i class="fas fa-search"></i> Browse
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link" id="my-auctions-tab" data-bs-toggle="tab" data-bs-target="#my-auctions-panel" type="button">
                      <i class="fas fa-tag"></i> My Listings
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link" id="my-bids-tab" data-bs-toggle="tab" data-bs-target="#my-bids-panel" type="button">
                      <i class="fas fa-hand-holding-usd"></i> My Bids
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link" id="create-auction-tab" data-bs-toggle="tab" data-bs-target="#create-auction" type="button">
                      <i class="fas fa-plus"></i> Create Listing
                    </button>
                  </li>
                </ul>

                <div class="tab-content" id="auction-tab-content">
                  <!-- Browse Tab -->
                  <div class="tab-pane fade show active" id="browse-auctions">
                    <div class="mb-3">
                      <input type="text" class="form-control bg-dark text-light" id="auction-search" placeholder="Search auctions...">
                    </div>
                    <div id="auction-list" style="max-height: 500px; overflow-y: auto;">
                      <!-- Auction listings will be inserted here -->
                    </div>
                  </div>

                  <!-- My Auctions Tab -->
                  <div class="tab-pane fade" id="my-auctions-panel">
                    <div id="my-auctions-list">
                      <!-- My auctions will be inserted here -->
                    </div>
                  </div>

                  <!-- My Bids Tab -->
                  <div class="tab-pane fade" id="my-bids-panel">
                    <div id="my-bids-list">
                      <!-- My bids will be inserted here -->
                    </div>
                  </div>

                  <!-- Create Auction Tab -->
                  <div class="tab-pane fade" id="create-auction">
                    <form id="create-auction-form">
                      <div class="mb-3">
                        <label class="form-label">Item Type:</label>
                        <div class="form-check">
                          <input class="form-check-input" type="radio" name="itemType" id="item-type-item" value="item" checked>
                          <label class="form-check-label" for="item-type-item">Inventory Item</label>
                        </div>
                        <div class="form-check">
                          <input class="form-check-input" type="radio" name="itemType" id="item-type-currency" value="currency">
                          <label class="form-check-label" for="item-type-currency">Currency</label>
                        </div>
                      </div>

                      <div id="item-selection" class="mb-3">
                        <label for="auction-item-select" class="form-label">Select Item:</label>
                        <select class="form-select bg-dark text-light" id="auction-item-select">
                          <option value="">-- Select an item --</option>
                        </select>
                      </div>

                      <div id="currency-selection" class="mb-3" style="display: none;">
                        <label for="auction-currency-amount" class="form-label">Currency Amount (in pennies):</label>
                        <input type="number" class="form-control bg-dark text-light" id="auction-currency-amount" min="1">
                      </div>

                      <div class="mb-3">
                        <label for="auction-starting-bid" class="form-label">Starting Bid (in pennies):</label>
                        <input type="number" class="form-control bg-dark text-light" id="auction-starting-bid" min="1" required>
                      </div>

                      <div class="mb-3">
                        <label for="auction-duration" class="form-label">Duration:</label>
                        <select class="form-select bg-dark text-light" id="auction-duration" required>
                          <option value="300000">5 minutes</option>
                          <option value="1800000">30 minutes</option>
                          <option value="3600000" selected>1 hour</option>
                          <option value="86400000">24 hours</option>
                          <option value="259200000">3 days</option>
                          <option value="604800000">7 days</option>
                        </select>
                      </div>

                      <div class="mb-3">
                        <label for="auction-scope" class="form-label">Auction Scope:</label>
                        <select class="form-select bg-dark text-light" id="auction-scope" required>
                          <option value="global" selected>Global (visible to all)</option>
                          <option value="location">Location (current location only)</option>
                        </select>
                      </div>

                      <button type="submit" class="btn btn-primary">
                        <i class="fas fa-gavel"></i> Create Auction
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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
      // Item type radio buttons
      document.querySelectorAll('input[name="itemType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const itemSelection = document.getElementById('item-selection');
          const currencySelection = document.getElementById('currency-selection');
          
          if (e.target.value === 'item') {
            itemSelection.style.display = 'block';
            currencySelection.style.display = 'none';
          } else {
            itemSelection.style.display = 'none';
            currencySelection.style.display = 'block';
          }
        });
      });

      // Create auction form
      const form = document.getElementById('create-auction-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.createAuction();
        });
      }

      // Listen for server messages
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        const originalHandler = onlineGame.handleServerMessage;
        
        onlineGame.handleServerMessage = (message) => {
          this.handleServerMessage(message);
          if (originalHandler) {
            originalHandler.call(onlineGame, message);
          }
        };
      }
    },

    /**
     * Open auction house
     */
    openAuctionHouse() {
      // Load auctions
      this.loadAuctions();
      this.loadMyAuctions();
      this.loadMyBids();
      this.loadPlayerInventory();

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('auction-modal'));
      modal.show();
    },

    /**
     * Load active auctions
     */
    loadAuctions() {
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'auction_get'
        }));
      }
    },

    /**
     * Load my auctions
     */
    loadMyAuctions() {
      // Request via HTTP API
      if (typeof onlineGame !== 'undefined' && onlineGame.playerId) {
        fetch(`/api/auctions/player?playerId=${onlineGame.playerId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              this.myAuctions = data.auctions || [];
              this.renderMyAuctions();
            }
          })
          .catch(err => console.error('Error loading my auctions:', err));
      }
    },

    /**
     * Load my bids
     */
    loadMyBids() {
      // Request via HTTP API
      if (typeof onlineGame !== 'undefined' && onlineGame.playerId) {
        fetch(`/api/auctions/player?playerId=${onlineGame.playerId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              this.myBids = data.bids || [];
              this.renderMyBids();
            }
          })
          .catch(err => console.error('Error loading my bids:', err));
      }
    },

    /**
     * Load player inventory for auction creation
     */
    loadPlayerInventory() {
      const select = document.getElementById('auction-item-select');
      if (!select) return;

      select.innerHTML = '<option value="">-- Select an item --</option>';

      // Get player inventory
      if (typeof Player !== 'undefined' && Player.getData) {
        const playerData = Player.getData();
        if (playerData.inventory && playerData.inventory.length > 0) {
          playerData.inventory.forEach(itemId => {
            const option = document.createElement('option');
            option.value = itemId;
            option.textContent = itemId;
            select.appendChild(option);
          });
        }
      }
    },

    /**
     * Create auction
     */
    createAuction() {
      const itemType = document.querySelector('input[name="itemType"]:checked').value;
      const startingBid = parseInt(document.getElementById('auction-starting-bid').value);
      const duration = parseInt(document.getElementById('auction-duration').value);
      const scope = document.getElementById('auction-scope').value;

      let item;
      if (itemType === 'item') {
        const itemId = document.getElementById('auction-item-select').value;
        if (!itemId) {
          this.showMessage('Please select an item', 'warning');
          return;
        }
        item = { type: 'item', id: itemId };
      } else {
        const amount = parseInt(document.getElementById('auction-currency-amount').value);
        if (!amount || amount < 1) {
          this.showMessage('Please enter a valid currency amount', 'warning');
          return;
        }
        item = { type: 'currency', amount: amount };
      }

      if (!startingBid || startingBid < 1) {
        this.showMessage('Please enter a valid starting bid', 'warning');
        return;
      }

      // Get location ID if scope is location
      let options = { scope };
      if (scope === 'location' && typeof Player !== 'undefined' && Player.getData) {
        const playerData = Player.getData();
        options.locationId = playerData.location;
      }

      // Send to server
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'auction_create',
          item,
          startingBid,
          duration,
          options
        }));
      }
    },

    /**
     * Place bid
     */
    placeBid(auctionId) {
      const bidAmount = prompt('Enter bid amount (in pennies):');
      if (!bidAmount) return;

      const amount = parseInt(bidAmount);
      if (isNaN(amount) || amount < 1) {
        this.showMessage('Invalid bid amount', 'warning');
        return;
      }

      // Send to server
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'auction_bid',
          auctionId,
          bidAmount: amount
        }));
      }
    },

    /**
     * Cancel auction
     */
    cancelAuction(auctionId) {
      if (!confirm('Are you sure you want to cancel this auction?')) {
        return;
      }

      // Send to server
      if (typeof onlineGame !== 'undefined' && onlineGame.socket) {
        onlineGame.socket.send(JSON.stringify({
          type: 'auction_cancel',
          auctionId
        }));
      }
    },

    /**
     * Render auction list
     */
    renderAuctionList() {
      const container = document.getElementById('auction-list');
      if (!container) return;

      if (this.activeAuctions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4"><em>No active auctions</em></p>';
        return;
      }

      container.innerHTML = this.activeAuctions.map(auction => {
        const timeRemaining = this.formatTimeRemaining(auction.endsAt - Date.now());
        const shillings = Math.floor(auction.currentBid / 12);
        const pennies = auction.currentBid % 12;

        return `
          <div class="card bg-secondary mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="card-title">
                    ${auction.item.type === 'item' ? 
                      `<i class="fas fa-box"></i> ${auction.item.id}` : 
                      `<i class="fas fa-coins"></i> ${auction.item.amount} pennies`
                    }
                  </h6>
                  <p class="card-text small mb-1">
                    <strong>Seller:</strong> ${auction.sellerUsername}
                  </p>
                  <p class="card-text small mb-1">
                    <strong>Current Bid:</strong> ${shillings}s ${pennies}p
                  </p>
                  ${auction.highestBidderUsername ? 
                    `<p class="card-text small mb-1">
                      <strong>Highest Bidder:</strong> ${auction.highestBidderUsername}
                    </p>` : ''
                  }
                  <p class="card-text small mb-1">
                    <strong>Time Remaining:</strong> ${timeRemaining}
                  </p>
                  <p class="card-text small mb-0">
                    <span class="badge bg-info">${auction.scope}</span>
                  </p>
                </div>
                <div>
                  ${auction.sellerId !== (onlineGame?.playerId || '') ? 
                    `<button class="btn btn-sm btn-primary" onclick="WizardCity.Auction.placeBid('${auction.id}')">
                      <i class="fas fa-gavel"></i> Place Bid
                    </button>` : 
                    '<span class="badge bg-warning">Your Auction</span>'
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    /**
     * Render my auctions
     */
    renderMyAuctions() {
      const container = document.getElementById('my-auctions-list');
      if (!container) return;

      if (this.myAuctions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4"><em>You have no active auctions</em></p>';
        return;
      }

      container.innerHTML = this.myAuctions.map(auction => {
        const timeRemaining = this.formatTimeRemaining(auction.endsAt - Date.now());
        const shillings = Math.floor(auction.currentBid / 12);
        const pennies = auction.currentBid % 12;

        return `
          <div class="card bg-secondary mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="card-title">
                    ${auction.item.type === 'item' ? 
                      `<i class="fas fa-box"></i> ${auction.item.id}` : 
                      `<i class="fas fa-coins"></i> ${auction.item.amount} pennies`
                    }
                  </h6>
                  <p class="card-text small mb-1">
                    <strong>Current Bid:</strong> ${shillings}s ${pennies}p
                  </p>
                  ${auction.highestBidderUsername ? 
                    `<p class="card-text small mb-1">
                      <strong>Highest Bidder:</strong> ${auction.highestBidderUsername}
                    </p>` : 
                    '<p class="card-text small mb-1 text-muted"><em>No bids yet</em></p>'
                  }
                  <p class="card-text small mb-1">
                    <strong>Time Remaining:</strong> ${timeRemaining}
                  </p>
                  <p class="card-text small mb-0">
                    <span class="badge bg-info">${auction.scope}</span>
                  </p>
                </div>
                <div>
                  ${!auction.highestBidderId ? 
                    `<button class="btn btn-sm btn-danger" onclick="WizardCity.Auction.cancelAuction('${auction.id}')">
                      <i class="fas fa-times"></i> Cancel
                    </button>` : ''
                  }
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    /**
     * Render my bids
     */
    renderMyBids() {
      const container = document.getElementById('my-bids-list');
      if (!container) return;

      if (this.myBids.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4"><em>You have no active bids</em></p>';
        return;
      }

      container.innerHTML = this.myBids.map(auction => {
        const timeRemaining = this.formatTimeRemaining(auction.endsAt - Date.now());
        const shillings = Math.floor(auction.currentBid / 12);
        const pennies = auction.currentBid % 12;
        const isWinning = auction.highestBidderId === (onlineGame?.playerId || '');

        return `
          <div class="card bg-secondary mb-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="card-title">
                    ${auction.item.type === 'item' ? 
                      `<i class="fas fa-box"></i> ${auction.item.id}` : 
                      `<i class="fas fa-coins"></i> ${auction.item.amount} pennies`
                    }
                  </h6>
                  <p class="card-text small mb-1">
                    <strong>Seller:</strong> ${auction.sellerUsername}
                  </p>
                  <p class="card-text small mb-1">
                    <strong>Current Bid:</strong> ${shillings}s ${pennies}p
                  </p>
                  <p class="card-text small mb-1">
                    <strong>Time Remaining:</strong> ${timeRemaining}
                  </p>
                  <p class="card-text small mb-0">
                    ${isWinning ? 
                      '<span class="badge bg-success"><i class="fas fa-check"></i> Winning</span>' : 
                      '<span class="badge bg-danger"><i class="fas fa-times"></i> Outbid</span>'
                    }
                  </p>
                </div>
                <div>
                  <button class="btn btn-sm btn-primary" onclick="WizardCity.Auction.placeBid('${auction.id}')">
                    <i class="fas fa-gavel"></i> Increase Bid
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    /**
     * Format time remaining
     */
    formatTimeRemaining(ms) {
      if (ms <= 0) return 'Ended';

      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
      return `${seconds}s`;
    },

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
      // Refresh auction list every 10 seconds
      this.refreshInterval = setInterval(() => {
        if (document.getElementById('auction-modal')?.classList.contains('show')) {
          this.loadAuctions();
        }
      }, 10000);
    },

    /**
     * Handle server messages
     */
    handleServerMessage(message) {
      switch (message.type) {
        case 'auction_list':
          this.handleAuctionList(message.auctions);
          break;
        case 'auction_create_result':
          this.handleAuctionCreateResult(message);
          break;
        case 'auction_bid_result':
          this.handleAuctionBidResult(message);
          break;
        case 'auction_new':
          this.handleNewAuction(message.auction);
          break;
        case 'auction_bid_placed':
          this.handleBidPlaced(message.auction);
          break;
        case 'auction_outbid':
          this.handleOutbid(message.auction);
          break;
        case 'auction_closed':
          this.handleAuctionClosed(message.auction, message.role);
          break;
        case 'auction_cancelled':
          this.handleAuctionCancelled(message.auctionId);
          break;
      }
    },

    /**
     * Handle auction list
     */
    handleAuctionList(auctions) {
      this.activeAuctions = auctions || [];
      this.renderAuctionList();
    },

    /**
     * Handle auction create result
     */
    handleAuctionCreateResult(message) {
      if (message.success) {
        this.showMessage('Auction created successfully!', 'success');
        // Reset form
        document.getElementById('create-auction-form')?.reset();
        // Switch to browse tab
        const browseTab = document.getElementById('browse-tab');
        if (browseTab) browseTab.click();
        // Reload auctions
        this.loadAuctions();
        this.loadMyAuctions();
      } else {
        this.showMessage(message.message || 'Failed to create auction', 'danger');
      }
    },

    /**
     * Handle auction bid result
     */
    handleAuctionBidResult(message) {
      if (message.success) {
        this.showMessage('Bid placed successfully!', 'success');
        this.loadMyBids();
      } else {
        this.showMessage(message.message || 'Failed to place bid', 'danger');
      }
    },

    /**
     * Handle new auction
     */
    handleNewAuction(auction) {
      // Add to list if not already there
      if (!this.activeAuctions.find(a => a.id === auction.id)) {
        this.activeAuctions.push(auction);
        this.renderAuctionList();
      }
    },

    /**
     * Handle bid placed
     */
    handleBidPlaced(auction) {
      // Update auction in list
      const index = this.activeAuctions.findIndex(a => a.id === auction.id);
      if (index >= 0) {
        this.activeAuctions[index] = auction;
        this.renderAuctionList();
      }
    },

    /**
     * Handle being outbid
     */
    handleOutbid(auction) {
      this.showMessage(`You've been outbid on ${auction.item.type === 'item' ? auction.item.id : 'currency'}!`, 'warning');
      this.loadMyBids();
    },

    /**
     * Handle auction closed
     */
    handleAuctionClosed(auction, role) {
      if (role === 'seller') {
        if (auction.winnerId) {
          this.showMessage(`Your auction sold for ${Math.floor(auction.currentBid / 12)}s ${auction.currentBid % 12}p!`, 'success');
        } else {
          this.showMessage('Your auction ended with no bids', 'info');
        }
      } else if (role === 'winner') {
        this.showMessage(`You won the auction for ${auction.item.type === 'item' ? auction.item.id : 'currency'}!`, 'success');
      }

      // Reload lists
      this.loadAuctions();
      this.loadMyAuctions();
      this.loadMyBids();
    },

    /**
     * Handle auction cancelled
     */
    handleAuctionCancelled(auctionId) {
      this.activeAuctions = this.activeAuctions.filter(a => a.id !== auctionId);
      this.renderAuctionList();
      this.loadMyAuctions();
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
        console.log(`[Auction] ${text}`);
      }
    }
  };

  // Expose module
  window.WizardCity.Auction = Auction;

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auction.init());
  } else {
    Auction.init();
  }
})();

/**
 * Auction Manager
 * Handles auction house system with bidding and automatic closure
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AuctionManager {
  constructor(playerManager) {
    this.playerManager = playerManager;
    this.activeAuctions = new Map(); // auctionId -> auctionData
    this.auctionHistory = [];
    this.playerAuctions = new Map(); // playerId -> [auctionIds]
    this.dataDir = path.join(__dirname, '..', 'data', 'auctions');
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Load auction data
    this.loadAuctionHistory();
    this.loadActiveAuctions();
    
    // Start auction monitoring
    this.startAuctionMonitoring();
  }
  
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  /**
   * Create a new auction listing
   */
  createAuction(sellerId, item, startingBid, duration, options = {}) {
    const seller = this.playerManager.getPlayer(sellerId);
    
    if (!seller) {
      return { success: false, message: 'Seller not found' };
    }
    
    // Validate item
    if (item.type === 'item') {
      if (!seller.inventory.includes(item.id)) {
        return { success: false, message: 'Item not in inventory' };
      }
    } else if (item.type === 'currency') {
      const totalPennies = (seller.shillings * 12) + seller.pennies;
      if (item.amount > totalPennies) {
        return { success: false, message: 'Insufficient currency' };
      }
    } else {
      return { success: false, message: 'Invalid item type' };
    }
    
    // Validate starting bid
    if (startingBid <= 0) {
      return { success: false, message: 'Starting bid must be positive' };
    }
    
    // Validate duration (minimum 5 minutes, maximum 7 days)
    if (duration < 5 * 60 * 1000 || duration > 7 * 24 * 60 * 60 * 1000) {
      return { success: false, message: 'Duration must be between 5 minutes and 7 days' };
    }
    
    // Remove item/currency from seller (held in escrow)
    try {
      if (item.type === 'item') {
        const index = seller.inventory.indexOf(item.id);
        if (index > -1) {
          seller.inventory.splice(index, 1);
        }
      } else if (item.type === 'currency') {
        const totalPennies = (seller.shillings * 12) + seller.pennies;
        const newTotal = totalPennies - item.amount;
        seller.shillings = Math.floor(newTotal / 12);
        seller.pennies = newTotal % 12;
      }
      
      this.playerManager.updatePlayer(sellerId, seller);
    } catch (error) {
      return { success: false, message: 'Failed to place item in escrow: ' + error.message };
    }
    
    // Create auction
    const auctionId = uuidv4();
    const auction = {
      id: auctionId,
      sellerId,
      sellerUsername: seller.username,
      item,
      startingBid,
      currentBid: startingBid,
      highestBidderId: null,
      highestBidderUsername: null,
      bids: [],
      status: 'active', // active, completed, cancelled
      scope: options.scope || 'global', // global, location, guild
      locationId: options.locationId || null,
      guildId: options.guildId || null,
      createdAt: Date.now(),
      endsAt: Date.now() + duration,
      bidSnipingWindow: options.bidSnipingWindow || 0, // Extension time in ms when bid placed near end
      completedAt: null
    };
    
    this.activeAuctions.set(auctionId, auction);
    
    // Track player's auctions
    if (!this.playerAuctions.has(sellerId)) {
      this.playerAuctions.set(sellerId, []);
    }
    this.playerAuctions.get(sellerId).push(auctionId);
    
    this.saveActiveAuctions();
    
    return { success: true, auctionId, auction };
  }
  
  /**
   * Place a bid on an auction
   */
  placeBid(bidderId, auctionId, bidAmount) {
    const auction = this.activeAuctions.get(auctionId);
    
    if (!auction) {
      return { success: false, message: 'Auction not found' };
    }
    
    if (auction.status !== 'active') {
      return { success: false, message: 'Auction is not active' };
    }
    
    // Check if auction has ended
    if (Date.now() >= auction.endsAt) {
      // Auction should be closed
      this.closeAuction(auctionId);
      return { success: false, message: 'Auction has ended' };
    }
    
    // Can't bid on own auction
    if (auction.sellerId === bidderId) {
      return { success: false, message: 'Cannot bid on your own auction' };
    }
    
    const bidder = this.playerManager.getPlayer(bidderId);
    
    if (!bidder) {
      return { success: false, message: 'Bidder not found' };
    }
    
    // Validate bid amount
    if (bidAmount <= auction.currentBid) {
      return { success: false, message: `Bid must be higher than current bid of ${auction.currentBid} pennies` };
    }
    
    // Check if bidder has enough currency
    const totalPennies = (bidder.shillings * 12) + bidder.pennies;
    if (bidAmount > totalPennies) {
      return { success: false, message: 'Insufficient currency for bid' };
    }
    
    // Return currency to previous highest bidder
    if (auction.highestBidderId && auction.highestBidderId !== bidderId) {
      const previousBidder = this.playerManager.getPlayer(auction.highestBidderId);
      if (previousBidder) {
        const prevTotalPennies = (previousBidder.shillings * 12) + previousBidder.pennies + auction.currentBid;
        previousBidder.shillings = Math.floor(prevTotalPennies / 12);
        previousBidder.pennies = prevTotalPennies % 12;
        this.playerManager.updatePlayer(auction.highestBidderId, previousBidder);
      }
    }
    
    // Hold new bidder's currency
    const newTotal = totalPennies - bidAmount;
    bidder.shillings = Math.floor(newTotal / 12);
    bidder.pennies = newTotal % 12;
    this.playerManager.updatePlayer(bidderId, bidder);
    
    // Update auction
    auction.currentBid = bidAmount;
    auction.highestBidderId = bidderId;
    auction.highestBidderUsername = bidder.username;
    auction.bids.push({
      bidderId,
      bidderUsername: bidder.username,
      amount: bidAmount,
      timestamp: Date.now()
    });
    
    // Bid sniping prevention: extend auction time if bid placed near end
    if (auction.bidSnipingWindow > 0) {
      const timeRemaining = auction.endsAt - Date.now();
      if (timeRemaining < auction.bidSnipingWindow) {
        auction.endsAt = Date.now() + auction.bidSnipingWindow;
      }
    }
    
    this.saveActiveAuctions();
    
    return { success: true, auction, message: 'Bid placed successfully' };
  }
  
  /**
   * Cancel an auction (only by seller before any bids)
   */
  cancelAuction(playerId, auctionId) {
    const auction = this.activeAuctions.get(auctionId);
    
    if (!auction) {
      return { success: false, message: 'Auction not found' };
    }
    
    // Only seller can cancel
    if (auction.sellerId !== playerId) {
      return { success: false, message: 'Only the seller can cancel the auction' };
    }
    
    // Can only cancel if no bids
    if (auction.bids.length > 0) {
      return { success: false, message: 'Cannot cancel auction with bids' };
    }
    
    // Return item to seller
    const seller = this.playerManager.getPlayer(auction.sellerId);
    if (seller) {
      if (auction.item.type === 'item') {
        seller.inventory.push(auction.item.id);
      } else if (auction.item.type === 'currency') {
        const totalPennies = (seller.shillings * 12) + seller.pennies + auction.item.amount;
        seller.shillings = Math.floor(totalPennies / 12);
        seller.pennies = totalPennies % 12;
      }
      this.playerManager.updatePlayer(auction.sellerId, seller);
    }
    
    auction.status = 'cancelled';
    auction.completedAt = Date.now();
    
    // Move to history
    this.auctionHistory.push(auction);
    this.saveAuctionHistory();
    
    // Clean up
    this.activeAuctions.delete(auctionId);
    this.removeFromPlayerAuctions(auction.sellerId, auctionId);
    this.saveActiveAuctions();
    
    return { success: true, message: 'Auction cancelled' };
  }
  
  /**
   * Close an auction (called when time expires)
   */
  closeAuction(auctionId) {
    const auction = this.activeAuctions.get(auctionId);
    
    if (!auction) {
      return { success: false, message: 'Auction not found' };
    }
    
    if (auction.status !== 'active') {
      return { success: false, message: 'Auction is not active' };
    }
    
    auction.status = 'completed';
    auction.completedAt = Date.now();
    
    // If there's a winner, transfer item and currency
    if (auction.highestBidderId) {
      const winner = this.playerManager.getPlayer(auction.highestBidderId);
      const seller = this.playerManager.getPlayer(auction.sellerId);
      
      if (winner && seller) {
        // Give item to winner
        if (auction.item.type === 'item') {
          winner.inventory.push(auction.item.id);
        } else if (auction.item.type === 'currency') {
          const totalPennies = (winner.shillings * 12) + winner.pennies + auction.item.amount;
          winner.shillings = Math.floor(totalPennies / 12);
          winner.pennies = totalPennies % 12;
        }
        this.playerManager.updatePlayer(auction.highestBidderId, winner);
        
        // Give currency to seller
        const sellerTotalPennies = (seller.shillings * 12) + seller.pennies + auction.currentBid;
        seller.shillings = Math.floor(sellerTotalPennies / 12);
        seller.pennies = sellerTotalPennies % 12;
        this.playerManager.updatePlayer(auction.sellerId, seller);
        
        auction.winnerId = auction.highestBidderId;
        auction.winnerUsername = auction.highestBidderUsername;
      } else {
        // Failsafe: return everything to original owners
        if (seller) {
          if (auction.item.type === 'item') {
            seller.inventory.push(auction.item.id);
          } else if (auction.item.type === 'currency') {
            const totalPennies = (seller.shillings * 12) + seller.pennies + auction.item.amount;
            seller.shillings = Math.floor(totalPennies / 12);
            seller.pennies = totalPennies % 12;
          }
          this.playerManager.updatePlayer(auction.sellerId, seller);
        }
        
        if (winner) {
          const totalPennies = (winner.shillings * 12) + winner.pennies + auction.currentBid;
          winner.shillings = Math.floor(totalPennies / 12);
          winner.pennies = totalPennies % 12;
          this.playerManager.updatePlayer(auction.highestBidderId, winner);
        }
        
        auction.status = 'failed';
        auction.failureReason = 'Player not found during completion';
      }
    } else {
      // No bids - return item to seller
      const seller = this.playerManager.getPlayer(auction.sellerId);
      if (seller) {
        if (auction.item.type === 'item') {
          seller.inventory.push(auction.item.id);
        } else if (auction.item.type === 'currency') {
          const totalPennies = (seller.shillings * 12) + seller.pennies + auction.item.amount;
          seller.shillings = Math.floor(totalPennies / 12);
          seller.pennies = totalPennies % 12;
        }
        this.playerManager.updatePlayer(auction.sellerId, seller);
      }
    }
    
    // Move to history
    this.auctionHistory.push(auction);
    this.saveAuctionHistory();
    
    // Clean up
    this.activeAuctions.delete(auctionId);
    this.removeFromPlayerAuctions(auction.sellerId, auctionId);
    if (auction.highestBidderId) {
      this.removeFromPlayerAuctions(auction.highestBidderId, auctionId);
    }
    this.saveActiveAuctions();
    
    return { success: true, auction, message: 'Auction closed' };
  }
  
  /**
   * Get auction by ID
   */
  getAuction(auctionId) {
    return this.activeAuctions.get(auctionId);
  }
  
  /**
   * Get all active auctions (with optional filtering)
   */
  getActiveAuctions(filters = {}) {
    let auctions = Array.from(this.activeAuctions.values());
    
    // Filter by scope
    if (filters.scope) {
      auctions = auctions.filter(a => a.scope === filters.scope);
    }
    
    // Filter by location
    if (filters.locationId) {
      auctions = auctions.filter(a => a.locationId === filters.locationId);
    }
    
    // Filter by guild
    if (filters.guildId) {
      auctions = auctions.filter(a => a.guildId === filters.guildId);
    }
    
    // Filter by item type
    if (filters.itemType) {
      auctions = auctions.filter(a => a.item.type === filters.itemType);
    }
    
    // Sort by ending time (soonest first)
    auctions.sort((a, b) => a.endsAt - b.endsAt);
    
    return auctions;
  }
  
  /**
   * Get player's active auctions (as seller)
   */
  getPlayerAuctions(playerId) {
    const auctionIds = this.playerAuctions.get(playerId) || [];
    return auctionIds
      .map(id => this.activeAuctions.get(id))
      .filter(a => a); // Filter out null values
  }
  
  /**
   * Get player's active bids
   */
  getPlayerBids(playerId) {
    return Array.from(this.activeAuctions.values())
      .filter(a => a.highestBidderId === playerId);
  }
  
  /**
   * Get auction history for a player
   */
  getPlayerAuctionHistory(playerId, limit = 20) {
    return this.auctionHistory
      .filter(a => a.sellerId === playerId || a.winnerId === playerId)
      .slice(-limit)
      .reverse();
  }
  
  /**
   * Monitor auctions and close expired ones
   */
  startAuctionMonitoring() {
    // Check every 10 seconds for expired auctions
    this.monitoringInterval = setInterval(() => {
      const now = Date.now();
      const notifications = [];
      
      for (const [auctionId, auction] of this.activeAuctions.entries()) {
        if (auction.status === 'active' && now >= auction.endsAt) {
          console.log(`Closing expired auction ${auctionId}`);
          const result = this.closeAuction(auctionId);
          
          if (result.success && result.auction) {
            notifications.push({
              type: 'auction_closed',
              auction: result.auction
            });
          }
        }
      }
      
      // Return notifications for the server to broadcast
      if (notifications.length > 0 && this.notificationCallback) {
        this.notificationCallback(notifications);
      }
    }, 10000);
  }
  
  /**
   * Set notification callback for auction events
   */
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }
  
  /**
   * Stop monitoring (cleanup)
   */
  stopAuctionMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
  
  /**
   * Helper: Remove auction from player's list
   */
  removeFromPlayerAuctions(playerId, auctionId) {
    const auctions = this.playerAuctions.get(playerId);
    if (auctions) {
      const index = auctions.indexOf(auctionId);
      if (index > -1) {
        auctions.splice(index, 1);
      }
      if (auctions.length === 0) {
        this.playerAuctions.delete(playerId);
      }
    }
  }
  
  /**
   * Persistence methods
   */
  saveActiveAuctions() {
    try {
      const data = Array.from(this.activeAuctions.values());
      fs.writeFileSync(
        path.join(this.dataDir, 'active-auctions.json'),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error('Error saving active auctions:', error);
    }
  }
  
  loadActiveAuctions() {
    try {
      const filePath = path.join(this.dataDir, 'active-auctions.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const auction of data) {
          this.activeAuctions.set(auction.id, auction);
          
          // Rebuild player auctions map
          if (!this.playerAuctions.has(auction.sellerId)) {
            this.playerAuctions.set(auction.sellerId, []);
          }
          this.playerAuctions.get(auction.sellerId).push(auction.id);
        }
        console.log(`Loaded ${data.length} active auctions`);
      }
    } catch (error) {
      console.error('Error loading active auctions:', error);
    }
  }
  
  saveAuctionHistory() {
    try {
      // Keep only last 1000 auctions in history
      const historyToSave = this.auctionHistory.slice(-1000);
      fs.writeFileSync(
        path.join(this.dataDir, 'auction-history.json'),
        JSON.stringify(historyToSave, null, 2)
      );
    } catch (error) {
      console.error('Error saving auction history:', error);
    }
  }
  
  loadAuctionHistory() {
    try {
      const filePath = path.join(this.dataDir, 'auction-history.json');
      if (fs.existsSync(filePath)) {
        this.auctionHistory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`Loaded ${this.auctionHistory.length} auction history entries`);
      }
    } catch (error) {
      console.error('Error loading auction history:', error);
    }
  }
}

module.exports = AuctionManager;

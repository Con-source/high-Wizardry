/**
 * Trade Manager
 * Handles player-to-player trading with validation and anti-exploit measures
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TradeManager {
  constructor(playerManager) {
    this.playerManager = playerManager;
    this.activeTrades = new Map(); // tradeId -> tradeData
    this.playerTrades = new Map(); // playerId -> tradeId
    this.tradeHistory = [];
    this.dataDir = path.join(__dirname, '..', 'data', 'trades');
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Load trade history and active trades
    this.loadTradeHistory();
    this.loadActiveTrades();
  }
  
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  /**
   * Create a new trade proposal
   */
  proposeTrade(fromPlayerId, toPlayerId, offer) {
    // Validate players exist
    const fromPlayer = this.playerManager.getPlayer(fromPlayerId);
    const toPlayer = this.playerManager.getPlayer(toPlayerId);
    
    if (!fromPlayer || !toPlayer) {
      return { success: false, message: 'Player not found' };
    }
    
    // Check if either player is already in a trade
    if (this.playerTrades.has(fromPlayerId)) {
      return { success: false, message: 'You are already in an active trade' };
    }
    
    if (this.playerTrades.has(toPlayerId)) {
      return { success: false, message: 'Target player is already in a trade' };
    }
    
    // Validate the offer
    const validation = this.validateOffer(fromPlayer, offer);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    // Create trade
    const tradeId = uuidv4();
    const trade = {
      id: tradeId,
      fromPlayerId,
      toPlayerId,
      fromUsername: fromPlayer.username,
      toUsername: toPlayer.username,
      status: 'proposed', // proposed, negotiating, confirmed, completed, cancelled, failed
      fromOffer: offer,
      toOffer: { items: [], currency: 0 },
      fromConfirmed: false,
      toConfirmed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    
    this.activeTrades.set(tradeId, trade);
    this.playerTrades.set(fromPlayerId, tradeId);
    this.playerTrades.set(toPlayerId, tradeId);
    
    this.saveActiveTrades();
    
    return { success: true, tradeId, trade };
  }
  
  /**
   * Update an offer (counter-offer or modify)
   */
  updateOffer(playerId, tradeId, offer) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }
    
    // Check if player is part of this trade
    if (trade.fromPlayerId !== playerId && trade.toPlayerId !== playerId) {
      return { success: false, message: 'You are not part of this trade' };
    }
    
    // Can't update if trade is completed or cancelled
    if (trade.status === 'completed' || trade.status === 'cancelled') {
      return { success: false, message: 'Trade is already ' + trade.status };
    }
    
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    // Validate the offer
    const validation = this.validateOffer(player, offer);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    // Update the appropriate offer
    if (trade.fromPlayerId === playerId) {
      trade.fromOffer = offer;
      trade.fromConfirmed = false;
    } else {
      trade.toOffer = offer;
      trade.toConfirmed = false;
    }
    
    // Reset both confirmations when offer changes
    trade.fromConfirmed = false;
    trade.toConfirmed = false;
    trade.status = 'negotiating';
    trade.updatedAt = Date.now();
    
    this.saveActiveTrades();
    
    return { success: true, trade };
  }
  
  /**
   * Confirm a trade
   */
  confirmTrade(playerId, tradeId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }
    
    // Check if player is part of this trade
    if (trade.fromPlayerId !== playerId && trade.toPlayerId !== playerId) {
      return { success: false, message: 'You are not part of this trade' };
    }
    
    // Can't confirm if already completed or cancelled
    if (trade.status === 'completed' || trade.status === 'cancelled') {
      return { success: false, message: 'Trade is already ' + trade.status };
    }
    
    // Set confirmation flag
    if (trade.fromPlayerId === playerId) {
      trade.fromConfirmed = true;
    } else {
      trade.toConfirmed = true;
    }
    
    trade.updatedAt = Date.now();
    
    // If both confirmed, execute trade
    if (trade.fromConfirmed && trade.toConfirmed) {
      return this.executeTrade(tradeId);
    } else {
      trade.status = 'confirmed';
      this.saveActiveTrades();
      return { success: true, trade, message: 'Waiting for other player to confirm' };
    }
  }
  
  /**
   * Cancel a trade
   */
  cancelTrade(playerId, tradeId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }
    
    // Check if player is part of this trade
    if (trade.fromPlayerId !== playerId && trade.toPlayerId !== playerId) {
      return { success: false, message: 'You are not part of this trade' };
    }
    
    // Can't cancel if already completed
    if (trade.status === 'completed') {
      return { success: false, message: 'Trade is already completed' };
    }
    
    trade.status = 'cancelled';
    trade.updatedAt = Date.now();
    trade.cancelledBy = playerId;
    
    // Move to history
    this.tradeHistory.push(trade);
    this.saveTradeHistory();
    
    // Clean up
    this.activeTrades.delete(tradeId);
    this.playerTrades.delete(trade.fromPlayerId);
    this.playerTrades.delete(trade.toPlayerId);
    this.saveActiveTrades();
    
    return { success: true, message: 'Trade cancelled' };
  }
  
  /**
   * Execute the trade (transfer items and currency)
   */
  executeTrade(tradeId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }
    
    const fromPlayer = this.playerManager.getPlayer(trade.fromPlayerId);
    const toPlayer = this.playerManager.getPlayer(trade.toPlayerId);
    
    if (!fromPlayer || !toPlayer) {
      trade.status = 'failed';
      trade.failureReason = 'Player not found';
      this.tradeHistory.push(trade);
      this.saveTradeHistory();
      this.activeTrades.delete(tradeId);
      this.playerTrades.delete(trade.fromPlayerId);
      this.playerTrades.delete(trade.toPlayerId);
      this.saveActiveTrades();
      return { success: false, message: 'Player not found' };
    }
    
    // Final validation of both offers
    const fromValidation = this.validateOffer(fromPlayer, trade.fromOffer);
    const toValidation = this.validateOffer(toPlayer, trade.toOffer);
    
    if (!fromValidation.valid || !toValidation.valid) {
      trade.status = 'failed';
      trade.failureReason = fromValidation.message || toValidation.message;
      this.tradeHistory.push(trade);
      this.saveTradeHistory();
      this.activeTrades.delete(tradeId);
      this.playerTrades.delete(trade.fromPlayerId);
      this.playerTrades.delete(trade.toPlayerId);
      this.saveActiveTrades();
      return { success: false, message: 'Validation failed: ' + trade.failureReason };
    }
    
    // Execute the exchange atomically
    try {
      // Remove items/currency from fromPlayer
      this.removeItems(fromPlayer, trade.fromOffer.items);
      this.removeCurrency(fromPlayer, trade.fromOffer.currency);
      
      // Remove items/currency from toPlayer
      this.removeItems(toPlayer, trade.toOffer.items);
      this.removeCurrency(toPlayer, trade.toOffer.currency);
      
      // Add items/currency to fromPlayer
      this.addItems(fromPlayer, trade.toOffer.items);
      this.addCurrency(fromPlayer, trade.toOffer.currency);
      
      // Add items/currency to toPlayer
      this.addItems(toPlayer, trade.fromOffer.items);
      this.addCurrency(toPlayer, trade.fromOffer.currency);
      
      // Save player states
      this.playerManager.updatePlayer(trade.fromPlayerId, fromPlayer);
      this.playerManager.updatePlayer(trade.toPlayerId, toPlayer);
      
      // Mark trade as completed
      trade.status = 'completed';
      trade.completedAt = Date.now();
      
      // Move to history
      this.tradeHistory.push(trade);
      this.saveTradeHistory();
      
      // Clean up
      this.activeTrades.delete(tradeId);
      this.playerTrades.delete(trade.fromPlayerId);
      this.playerTrades.delete(trade.toPlayerId);
      this.saveActiveTrades();
      
      return { success: true, message: 'Trade completed successfully', trade };
    } catch (error) {
      console.error('Error executing trade:', error);
      trade.status = 'failed';
      trade.failureReason = error.message;
      this.tradeHistory.push(trade);
      this.saveTradeHistory();
      this.activeTrades.delete(tradeId);
      this.playerTrades.delete(trade.fromPlayerId);
      this.playerTrades.delete(trade.toPlayerId);
      this.saveActiveTrades();
      return { success: false, message: 'Trade execution failed: ' + error.message };
    }
  }
  
  /**
   * Validate that a player has the items and currency they're offering
   */
  validateOffer(player, offer) {
    if (!offer) {
      return { valid: true }; // Empty offer is valid
    }
    
    // Validate currency
    if (offer.currency) {
      const totalPennies = (player.shillings * 12) + player.pennies;
      if (offer.currency > totalPennies) {
        return { valid: false, message: 'Insufficient currency' };
      }
      if (offer.currency < 0) {
        return { valid: false, message: 'Invalid currency amount' };
      }
    }
    
    // Validate items
    if (offer.items && offer.items.length > 0) {
      for (const itemId of offer.items) {
        if (!player.inventory.includes(itemId)) {
          return { valid: false, message: `Item ${itemId} not in inventory` };
        }
      }
      
      // Check for duplicates in offer
      const uniqueItems = new Set(offer.items);
      if (uniqueItems.size !== offer.items.length) {
        return { valid: false, message: 'Duplicate items in offer' };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Helper: Remove items from player inventory
   */
  removeItems(player, items) {
    if (!items || items.length === 0) return;
    
    for (const itemId of items) {
      const index = player.inventory.indexOf(itemId);
      if (index > -1) {
        player.inventory.splice(index, 1);
      }
    }
  }
  
  /**
   * Helper: Add items to player inventory
   */
  addItems(player, items) {
    if (!items || items.length === 0) return;
    
    player.inventory.push(...items);
  }
  
  /**
   * Helper: Remove currency from player
   */
  removeCurrency(player, amount) {
    if (!amount || amount === 0) return;
    
    const totalPennies = (player.shillings * 12) + player.pennies;
    const newTotal = totalPennies - amount;
    
    player.shillings = Math.floor(newTotal / 12);
    player.pennies = newTotal % 12;
  }
  
  /**
   * Helper: Add currency to player
   */
  addCurrency(player, amount) {
    if (!amount || amount === 0) return;
    
    const totalPennies = (player.shillings * 12) + player.pennies + amount;
    
    player.shillings = Math.floor(totalPennies / 12);
    player.pennies = totalPennies % 12;
  }
  
  /**
   * Get trade by ID
   */
  getTrade(tradeId) {
    return this.activeTrades.get(tradeId);
  }
  
  /**
   * Get active trade for a player
   */
  getPlayerActiveTrade(playerId) {
    const tradeId = this.playerTrades.get(playerId);
    if (tradeId) {
      return this.activeTrades.get(tradeId);
    }
    return null;
  }
  
  /**
   * Get trade history for a player
   */
  getPlayerTradeHistory(playerId, limit = 20) {
    return this.tradeHistory
      .filter(trade => trade.fromPlayerId === playerId || trade.toPlayerId === playerId)
      .slice(-limit)
      .reverse();
  }
  
  /**
   * Clean up stale trades (older than 30 minutes)
   */
  cleanupStaleTrades() {
    const now = Date.now();
    const staleTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [tradeId, trade] of this.activeTrades.entries()) {
      if (now - trade.updatedAt > staleTime) {
        trade.status = 'failed';
        trade.failureReason = 'Trade timeout';
        this.tradeHistory.push(trade);
        this.activeTrades.delete(tradeId);
        this.playerTrades.delete(trade.fromPlayerId);
        this.playerTrades.delete(trade.toPlayerId);
      }
    }
    
    this.saveActiveTrades();
    this.saveTradeHistory();
  }
  
  /**
   * Persistence methods
   */
  saveActiveTrades() {
    try {
      const data = Array.from(this.activeTrades.values());
      fs.writeFileSync(
        path.join(this.dataDir, 'active-trades.json'),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error('Error saving active trades:', error);
    }
  }
  
  loadActiveTrades() {
    try {
      const filePath = path.join(this.dataDir, 'active-trades.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        for (const trade of data) {
          this.activeTrades.set(trade.id, trade);
          this.playerTrades.set(trade.fromPlayerId, trade.id);
          this.playerTrades.set(trade.toPlayerId, trade.id);
        }
        console.log(`Loaded ${data.length} active trades`);
      }
    } catch (error) {
      console.error('Error loading active trades:', error);
    }
  }
  
  saveTradeHistory() {
    try {
      // Keep only last 1000 trades in history
      const historyToSave = this.tradeHistory.slice(-1000);
      fs.writeFileSync(
        path.join(this.dataDir, 'trade-history.json'),
        JSON.stringify(historyToSave, null, 2)
      );
    } catch (error) {
      console.error('Error saving trade history:', error);
    }
  }
  
  loadTradeHistory() {
    try {
      const filePath = path.join(this.dataDir, 'trade-history.json');
      if (fs.existsSync(filePath)) {
        this.tradeHistory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`Loaded ${this.tradeHistory.length} trade history entries`);
      }
    } catch (error) {
      console.error('Error loading trade history:', error);
    }
  }
}

module.exports = TradeManager;

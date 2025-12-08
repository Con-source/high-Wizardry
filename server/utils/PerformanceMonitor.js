/**
 * Performance Monitor
 * Tracks server performance metrics and provides monitoring capabilities
 * @module PerformanceMonitor
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.sampleInterval = options.sampleInterval || 60000; // 1 minute
    this.historySize = options.historySize || 60; // Keep 1 hour of history
    this.emaAlpha = options.emaAlpha || 0.1; // Exponential moving average smoothing factor
    
    this.metrics = {
      cpu: [],
      memory: [],
      requests: [],
      websockets: [],
      database: [],
      cache: []
    };
    
    this.counters = {
      totalRequests: 0,
      totalWebSocketMessages: 0,
      totalDatabaseQueries: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0
    };
    
    this.timings = {
      avgRequestTime: 0,
      avgWebSocketMessageTime: 0,
      avgDatabaseQueryTime: 0
    };
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    // Sample metrics at regular intervals
    this.monitoringInterval = setInterval(() => {
      this.sampleMetrics();
    }, this.sampleInterval);
    
    console.log('📊 Performance monitoring started');
  }

  /**
   * Sample current metrics
   */
  sampleMetrics() {
    const timestamp = Date.now();
    
    // CPU and Memory usage
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.addMetric('memory', {
      timestamp,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2)
    });
    
    this.addMetric('cpu', {
      timestamp,
      user: cpuUsage.user,
      system: cpuUsage.system
    });
  }

  /**
   * Add metric to history
   * @param {string} type - Metric type
   * @param {Object} data - Metric data
   */
  addMetric(type, data) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }
    
    this.metrics[type].push(data);
    
    // Keep only recent history
    if (this.metrics[type].length > this.historySize) {
      this.metrics[type].shift();
    }
  }

  /**
   * Track HTTP request
   * @param {number} duration - Request duration in ms
   */
  trackRequest(duration) {
    this.counters.totalRequests++;
    
    // Update average request time (exponential moving average)
    this.timings.avgRequestTime = 
      this.timings.avgRequestTime * (1 - this.emaAlpha) + duration * this.emaAlpha;
    
    this.addMetric('requests', {
      timestamp: Date.now(),
      duration
    });
  }

  /**
   * Track WebSocket message
   * @param {number} duration - Processing duration in ms
   */
  trackWebSocketMessage(duration) {
    this.counters.totalWebSocketMessages++;
    
    // Update average message processing time
    this.timings.avgWebSocketMessageTime = 
      this.timings.avgWebSocketMessageTime * (1 - this.emaAlpha) + duration * this.emaAlpha;
    
    this.addMetric('websockets', {
      timestamp: Date.now(),
      duration
    });
  }

  /**
   * Track database query
   * @param {string} query - Query type
   * @param {number} duration - Query duration in ms
   */
  trackDatabaseQuery(query, duration) {
    this.counters.totalDatabaseQueries++;
    
    // Update average query time
    this.timings.avgDatabaseQueryTime = 
      this.timings.avgDatabaseQueryTime * (1 - this.emaAlpha) + duration * this.emaAlpha;
    
    this.addMetric('database', {
      timestamp: Date.now(),
      query,
      duration
    });
  }

  /**
   * Track cache hit
   */
  trackCacheHit() {
    this.counters.totalCacheHits++;
  }

  /**
   * Track cache miss
   */
  trackCacheMiss() {
    this.counters.totalCacheMisses++;
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getCurrentMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      timestamp: Date.now(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: this.formatUptime(uptime)
      },
      memory: {
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        rss: (memUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        external: (memUsage.external / 1024 / 1024).toFixed(2) + ' MB'
      },
      counters: this.counters,
      timings: {
        avgRequestTime: this.timings.avgRequestTime.toFixed(2) + ' ms',
        avgWebSocketMessageTime: this.timings.avgWebSocketMessageTime.toFixed(2) + ' ms',
        avgDatabaseQueryTime: this.timings.avgDatabaseQueryTime.toFixed(2) + ' ms'
      },
      cache: {
        hitRate: this.getCacheHitRate()
      }
    };
  }

  /**
   * Get metric history
   * @param {string} type - Metric type
   * @param {number} count - Number of recent entries
   * @returns {Array} Metric history
   */
  getMetricHistory(type, count = 10) {
    const metrics = this.metrics[type] || [];
    return metrics.slice(-count);
  }

  /**
   * Get cache hit rate
   * @returns {string} Cache hit rate percentage
   */
  getCacheHitRate() {
    const total = this.counters.totalCacheHits + this.counters.totalCacheMisses;
    if (total === 0) return '0.00%';
    
    const rate = (this.counters.totalCacheHits / total * 100).toFixed(2);
    return rate + '%';
  }

  /**
   * Format uptime in human-readable format
   * @param {number} seconds - Uptime in seconds
   * @returns {string} Formatted uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  /**
   * Get performance report
   * @returns {string} Formatted performance report
   */
  getReport() {
    const metrics = this.getCurrentMetrics();
    
    return `
📊 Performance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱  Uptime: ${metrics.uptime.formatted}

💾 Memory Usage:
   Heap Used: ${metrics.memory.heapUsed}
   Heap Total: ${metrics.memory.heapTotal}
   RSS: ${metrics.memory.rss}

📈 Request Stats:
   Total Requests: ${metrics.counters.totalRequests}
   Avg Request Time: ${metrics.timings.avgRequestTime}
   WebSocket Messages: ${metrics.counters.totalWebSocketMessages}
   Avg Message Time: ${metrics.timings.avgWebSocketMessageTime}

💽 Database Stats:
   Total Queries: ${metrics.counters.totalDatabaseQueries}
   Avg Query Time: ${metrics.timings.avgDatabaseQueryTime}

🗄  Cache Stats:
   Hits: ${metrics.counters.totalCacheHits}
   Misses: ${metrics.counters.totalCacheMisses}
   Hit Rate: ${metrics.cache.hitRate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Log performance report
   */
  logReport() {
    console.log(this.getReport());
  }

  /**
   * Check if performance is healthy
   * @returns {Object} Health check result
   */
  healthCheck() {
    const metrics = this.getCurrentMetrics();
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    const issues = [];
    
    // Check memory usage
    if (heapPercent > 90) {
      issues.push('High memory usage (>90%)');
    }
    
    // Check average request time
    if (this.timings.avgRequestTime > 1000) {
      issues.push('Slow request times (>1s)');
    }
    
    // Check average WebSocket message time
    if (this.timings.avgWebSocketMessageTime > 100) {
      issues.push('Slow WebSocket message processing (>100ms)');
    }
    
    // Check cache hit rate
    const cacheHitRate = parseFloat(metrics.cache.hitRate);
    if (cacheHitRate < 50 && this.counters.totalCacheHits + this.counters.totalCacheMisses > 100) {
      issues.push('Low cache hit rate (<50%)');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics: this.getCurrentMetrics()
    };
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Reset counters
   */
  resetCounters() {
    this.counters = {
      totalRequests: 0,
      totalWebSocketMessages: 0,
      totalDatabaseQueries: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0
    };
    
    this.timings = {
      avgRequestTime: 0,
      avgWebSocketMessageTime: 0,
      avgDatabaseQueryTime: 0
    };
  }
}

module.exports = PerformanceMonitor;

/**
 * Performance Monitor
 * Tracks and logs performance metrics for the server
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.metricsInterval = options.metricsInterval || 60000; // 1 minute
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byStatus: new Map()
      },
      websocket: {
        connections: 0,
        messages: 0,
        errors: 0
      },
      performance: {
        requestTimes: [],
        memoryUsage: [],
        cpuUsage: []
      },
      errors: []
    };
    
    this.startTime = Date.now();
    
    if (this.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    // Collect metrics every interval
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
      this.logMetrics();
    }, this.metricsInterval);

    // Keep process alive but allow exit
    this.metricsTimer.unref();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  /**
   * Track an HTTP request
   */
  trackRequest(endpoint, statusCode, duration) {
    if (!this.enabled) return;

    this.metrics.requests.total++;

    // Track by endpoint
    const endpointCount = this.metrics.requests.byEndpoint.get(endpoint) || 0;
    this.metrics.requests.byEndpoint.set(endpoint, endpointCount + 1);

    // Track by status code
    const statusCount = this.metrics.requests.byStatus.get(statusCode) || 0;
    this.metrics.requests.byStatus.set(statusCode, statusCount + 1);

    // Track request duration
    if (duration !== undefined) {
      this.metrics.performance.requestTimes.push({
        endpoint,
        duration,
        timestamp: Date.now()
      });

      // Keep only last 1000 requests
      if (this.metrics.performance.requestTimes.length > 1000) {
        this.metrics.performance.requestTimes.shift();
      }
    }
  }

  /**
   * Track WebSocket events
   */
  trackWebSocket(event, data = {}) {
    if (!this.enabled) return;

    switch (event) {
      case 'connection':
        this.metrics.websocket.connections++;
        break;
      case 'message':
        this.metrics.websocket.messages++;
        break;
      case 'error':
        this.metrics.websocket.errors++;
        this.trackError(data.error || new Error('WebSocket error'));
        break;
    }
  }

  /**
   * Track an error
   */
  trackError(error, context = {}) {
    if (!this.enabled) return;

    this.metrics.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    if (!this.enabled) return;

    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.performance.memoryUsage.push({
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      timestamp: Date.now()
    });

    // Keep only last 60 samples (1 hour at 1 min intervals)
    if (this.metrics.performance.memoryUsage.length > 60) {
      this.metrics.performance.memoryUsage.shift();
    }

    // CPU usage
    const cpuUsage = process.cpuUsage();
    this.metrics.performance.cpuUsage.push({
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: Date.now()
    });

    if (this.metrics.performance.cpuUsage.length > 60) {
      this.metrics.performance.cpuUsage.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      ...this.metrics,
      summary: this.getSummary()
    };
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary = {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requests: {
        total: this.metrics.requests.total,
        avgDuration: 0,
        topEndpoints: []
      },
      websocket: {
        ...this.metrics.websocket
      },
      memory: {
        current: null,
        avg: 0,
        peak: 0
      },
      errors: {
        total: this.metrics.errors.length,
        recent: this.metrics.errors.slice(-5)
      }
    };

    // Calculate average request duration
    if (this.metrics.performance.requestTimes.length > 0) {
      const totalDuration = this.metrics.performance.requestTimes.reduce(
        (sum, req) => sum + req.duration,
        0
      );
      summary.requests.avgDuration = Math.round(
        totalDuration / this.metrics.performance.requestTimes.length
      );
    }

    // Top endpoints
    const sortedEndpoints = Array.from(this.metrics.requests.byEndpoint.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    summary.requests.topEndpoints = sortedEndpoints.map(([endpoint, count]) => ({
      endpoint,
      count
    }));

    // Memory stats
    if (this.metrics.performance.memoryUsage.length > 0) {
      const latest = this.metrics.performance.memoryUsage[
        this.metrics.performance.memoryUsage.length - 1
      ];
      summary.memory.current = {
        heapUsed: Math.round(latest.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(latest.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(latest.rss / 1024 / 1024) + ' MB'
      };

      const avgHeap = this.metrics.performance.memoryUsage.reduce(
        (sum, m) => sum + m.heapUsed,
        0
      ) / this.metrics.performance.memoryUsage.length;
      summary.memory.avg = Math.round(avgHeap / 1024 / 1024) + ' MB';

      const peakHeap = Math.max(
        ...this.metrics.performance.memoryUsage.map(m => m.heapUsed)
      );
      summary.memory.peak = Math.round(peakHeap / 1024 / 1024) + ' MB';
    }

    return summary;
  }

  /**
   * Log metrics to console
   */
  logMetrics() {
    if (!this.enabled) return;

    const summary = this.getSummary();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Performance Metrics');
    console.log('='.repeat(50));
    console.log(`⏱️  Uptime: ${Math.floor(summary.uptime / 60)} minutes`);
    console.log(`📨 Total Requests: ${summary.requests.total}`);
    console.log(`⚡ Avg Response Time: ${summary.requests.avgDuration}ms`);
    console.log(`🔌 WebSocket Connections: ${summary.websocket.connections}`);
    console.log(`💬 WebSocket Messages: ${summary.websocket.messages}`);
    
    if (summary.memory.current) {
      console.log(`💾 Memory (Current): ${summary.memory.current.heapUsed}`);
      console.log(`💾 Memory (Average): ${summary.memory.avg}`);
      console.log(`💾 Memory (Peak): ${summary.memory.peak}`);
    }
    
    if (summary.errors.total > 0) {
      console.log(`❌ Errors: ${summary.errors.total}`);
    }
    
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Create Express middleware for request tracking
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.trackRequest(req.path, res.statusCode, duration);
      });
      
      next();
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byStatus: new Map()
      },
      websocket: {
        connections: 0,
        messages: 0,
        errors: 0
      },
      performance: {
        requestTimes: [],
        memoryUsage: [],
        cpuUsage: []
      },
      errors: []
    };
    this.startTime = Date.now();
  }
}

module.exports = PerformanceMonitor;

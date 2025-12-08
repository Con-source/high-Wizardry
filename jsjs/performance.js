/**
 * Performance Optimization Module
 * Handles lazy loading, debouncing, throttling, and resource optimization
 * @module Performance
 */
const Performance = (() => {
  /**
   * @typedef {Object} PerformanceState
   * @property {Map} observers - Intersection observers
   * @property {Map} timers - Debounce/throttle timers
   * @property {Object} metrics - Performance metrics
   */

  const state = {
    observers: new Map(),
    timers: new Map(),
    metrics: {
      pageLoadTime: 0,
      resourcesLoaded: 0,
      interactionDelay: []
    }
  };

  /**
   * Initialize performance optimizations
   * @returns {boolean} True if initialization successful
   */
  function init() {
    setupLazyLoading();
    setupResourcePreloading();
    measurePerformance();
    optimizeAnimations();
    
    console.log('✅ Performance optimization initialized');
    return true;
  }

  /**
   * Set up lazy loading for images and iframes
   */
  function setupLazyLoading() {
    if (!('IntersectionObserver' in window)) {
      console.warn('⚠️ IntersectionObserver not supported, falling back to eager loading');
      return;
    }

    const lazyLoadObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          // Load image
          if (element.tagName === 'IMG' && element.dataset.src) {
            element.src = element.dataset.src;
            if (element.dataset.srcset) {
              element.srcset = element.dataset.srcset;
            }
            element.removeAttribute('data-src');
            element.removeAttribute('data-srcset');
            lazyLoadObserver.unobserve(element);
          }
          
          // Load iframe
          if (element.tagName === 'IFRAME' && element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
            lazyLoadObserver.unobserve(element);
          }
          
          // Load background image
          if (element.dataset.bg) {
            element.style.backgroundImage = `url(${element.dataset.bg})`;
            element.removeAttribute('data-bg');
            lazyLoadObserver.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before element enters viewport
    });

    // Observe all lazy-loadable elements
    document.querySelectorAll('img[data-src], iframe[data-src], [data-bg]').forEach(el => {
      lazyLoadObserver.observe(el);
    });

    state.observers.set('lazyLoad', lazyLoadObserver);
  }

  /**
   * Set up resource preloading for anticipated navigation
   */
  function setupResourcePreloading() {
    // Preload critical fonts
    const fonts = [
      'https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;700&display=swap'
    ];

    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = font;
      document.head.appendChild(link);
    });

    // Prefetch likely next pages on hover
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a[href]');
      if (link && link.origin === location.origin && !link.dataset.prefetched) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = link.href;
        document.head.appendChild(prefetchLink);
        link.dataset.prefetched = 'true';
      }
    }, { passive: true });
  }

  /**
   * Measure and track performance metrics
   */
  function measurePerformance() {
    if (!('performance' in window)) return;

    // Measure page load time
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      state.metrics.pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      if (CONFIG?.DEBUG) {
        console.log(`📊 Page loaded in ${state.metrics.pageLoadTime}ms`);
      }

      // Track resource loading
      const resources = performance.getEntriesByType('resource');
      state.metrics.resourcesLoaded = resources.length;

      // Log slow resources in debug mode
      if (CONFIG?.DEBUG) {
        const slowResources = resources.filter(r => r.duration > 1000);
        if (slowResources.length > 0) {
          console.warn('⚠️ Slow resources detected:', slowResources.map(r => ({
            name: r.name,
            duration: Math.round(r.duration) + 'ms'
          })));
        }
      }
    });

    // Measure First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            state.metrics.interactionDelay.push(entry.processingStart - entry.startTime);
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        // Browser doesn't support first-input observation
      }
    }
  }

  /**
   * Optimize animations based on device capabilities
   */
  function optimizeAnimations() {
    // Detect if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }

    // Disable expensive animations on low-end devices
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    if (isLowEndDevice) {
      document.documentElement.classList.add('low-end-device');
    }
  }

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {string} key - Unique key for this debounce
   * @returns {Function} Debounced function
   */
  function debounce(func, wait = 300, key = 'default') {
    return function(...args) {
      const timerId = state.timers.get(key);
      if (timerId) {
        clearTimeout(timerId);
      }
      
      const newTimerId = setTimeout(() => {
        func.apply(this, args);
        state.timers.delete(key);
      }, wait);
      
      state.timers.set(key, newTimerId);
    };
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit in milliseconds
   * @param {string} key - Unique key for this throttle
   * @returns {Function} Throttled function
   */
  function throttle(func, limit = 300, key = 'default') {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          state.timers.delete(key);
        }, limit);
      }
    };
  }

  /**
   * Request idle callback with fallback
   * @param {Function} callback - Callback function
   * @param {Object} options - Options
   */
  function whenIdle(callback, options = {}) {
    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback, options);
    } else {
      // Fallback for browsers without requestIdleCallback
      return setTimeout(callback, 1);
    }
  }

  /**
   * Batch DOM reads and writes for better performance
   * @param {Function} readCallback - Read operations
   * @param {Function} writeCallback - Write operations
   */
  function batchDOMOperations(readCallback, writeCallback) {
    requestAnimationFrame(() => {
      // Batch all reads
      const readResults = readCallback();
      
      // Then batch all writes
      requestAnimationFrame(() => {
        writeCallback(readResults);
      });
    });
  }

  /**
   * Create virtual scroll for large lists
   * @param {Element} container - Container element
   * @param {Array} items - Array of items
   * @param {Function} renderItem - Function to render each item
   * @param {number} itemHeight - Height of each item
   */
  function createVirtualScroll(container, items, renderItem, itemHeight = 50) {
    const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
    let scrollTop = 0;

    const update = throttle(() => {
      scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleItems, items.length);

      // Clear and render visible items
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i < endIndex; i++) {
        fragment.appendChild(renderItem(items[i], i));
      }

      // Use padding to maintain scroll position
      container.style.paddingTop = `${startIndex * itemHeight}px`;
      container.style.paddingBottom = `${(items.length - endIndex) * itemHeight}px`;
      
      // Replace content
      requestAnimationFrame(() => {
        container.innerHTML = '';
        container.appendChild(fragment);
      });
    }, 16, 'virtualScroll'); // ~60fps

    container.addEventListener('scroll', update, { passive: true });
    update();

    return {
      update,
      destroy: () => container.removeEventListener('scroll', update)
    };
  }

  /**
   * Optimize images by adding proper attributes
   * @param {Element} img - Image element
   */
  function optimizeImage(img) {
    // Add loading lazy if not already set
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }

    // Add decoding async
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }

    // Add dimensions if not set (prevents layout shift)
    if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
      img.addEventListener('load', function() {
        if (!this.hasAttribute('width')) {
          this.setAttribute('width', this.naturalWidth);
        }
        if (!this.hasAttribute('height')) {
          this.setAttribute('height', this.naturalHeight);
        }
      }, { once: true });
    }
  }

  /**
   * Preload critical resources
   * @param {Array} resources - Array of resource URLs
   * @param {string} type - Resource type (script, style, image, etc.)
   */
  function preloadResources(resources, type = 'script') {
    resources.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = type;
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  function getMetrics() {
    return {
      ...state.metrics,
      averageInteractionDelay: state.metrics.interactionDelay.length > 0
        ? state.metrics.interactionDelay.reduce((a, b) => a + b, 0) / state.metrics.interactionDelay.length
        : 0
    };
  }

  /**
   * Log performance report
   */
  function logReport() {
    const metrics = getMetrics();
    console.group('📊 Performance Report');
    console.log('Page Load Time:', metrics.pageLoadTime + 'ms');
    console.log('Resources Loaded:', metrics.resourcesLoaded);
    console.log('Average Interaction Delay:', Math.round(metrics.averageInteractionDelay) + 'ms');
    console.groupEnd();
  }

  // Public API
  return {
    init,
    debounce,
    throttle,
    whenIdle,
    batchDOMOperations,
    createVirtualScroll,
    optimizeImage,
    preloadResources,
    getMetrics,
    logReport
  };
})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Performance.init());
} else {
  Performance.init();
}

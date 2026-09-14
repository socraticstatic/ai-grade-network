// Performance optimization utilities

// Debounce utility for expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for frequent events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Optimize scroll performance
export const optimizeScrolling = () => {
  // Add passive event listeners for better scroll performance
  document.addEventListener('wheel', () => {}, { passive: true });
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('touchmove', () => {}, { passive: true });
};

// Memory management
export const setupMemoryManagement = () => {
  // Clear unused data periodically
  setInterval(() => {
    // Force garbage collection if available (Chrome DevTools)
    if (window.gc && import.meta.env.DEV) {
      window.gc();
    }
    
    // Clear old console entries in production
    if (import.meta.env.PROD) {
      console.clear();
    }
  }, 300000); // Every 5 minutes
};

// Image loading optimization
export const optimizeImages = () => {
  // Use intersection observer for lazy loading
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};

// Bundle size monitoring in development
export const monitorBundleSize = () => {
  if (import.meta.env.DEV) {
    // Monitor performance and bundle loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {

        }
        if (entry.entryType === 'resource' && entry.name.includes('.js')) {

        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }
};

// Initialize all optimizations
export const initializePerformanceOptimizations = () => {
  optimizeScrolling();
  setupMemoryManagement();
  optimizeImages();
  monitorBundleSize();
};

// Cleanup function
export const cleanupOptimizations = () => {
  // Clean up any intervals or observers if needed
};

// Declare global gc function for TypeScript
declare global {
  interface Window {
    gc?: () => void;
  }
}
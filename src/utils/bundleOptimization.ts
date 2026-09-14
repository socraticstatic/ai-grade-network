// Bundle size optimization utilities

// Remove unused CSS at runtime in production
export const removeUnusedCSS = () => {
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    // This would typically be handled by PurgeCSS in the build process
    // But we can also do some runtime cleanup for dynamic content
    
    // Remove unused CSS custom properties
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      try {
        // Only process our own stylesheets
        if (sheet.href && sheet.href.includes(window.location.origin)) {
          // Additional CSS optimization could go here
        }
      } catch (error) {
        // Ignore cross-origin stylesheets
      }
    });
  }
};

// Optimize images and assets
export const optimizeAssets = () => {
  // Lazy load images that are not in viewport
  const images = document.querySelectorAll('img[data-src]');
  
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
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
};

// Memory cleanup utilities
export const cleanupUnusedData = () => {
  // Clear any cached data that's no longer needed
  if (typeof window !== 'undefined') {
    // Clear old toast notifications
    const toastContainer = document.querySelector('[role="alert"]');
    if (toastContainer && toastContainer.children.length > 5) {
      // Remove old toasts if there are too many
      Array.from(toastContainer.children)
        .slice(0, -3)
        .forEach(child => child.remove());
    }
    
    // Clear console in production for security and performance
    if (import.meta.env.PROD) {
      console.clear();
    }
  }
};

// Module preloading strategy
export const preloadCriticalModules = () => {
  if (import.meta.env.PROD && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      // Preload modules likely to be needed next
      const criticalModules = [
        () => import('../components/ConnectionGrid'),
        () => import('../components/connection/ConnectionCard'),
        () => import('../components/navigation/MainNav')
      ];
      
      criticalModules.forEach(importFn => {
        importFn().catch(() => {
          // Silently fail - this is just optimization
        });
      });
    });
  }
};

// Initialize all optimizations
export const initializeBundleOptimizations = () => {
  if (typeof window !== 'undefined') {
    // Run after page load
    window.addEventListener('load', () => {
      removeUnusedCSS();
      optimizeAssets();
      preloadCriticalModules();
      
      // Periodic cleanup
      setInterval(cleanupUnusedData, 60000); // Every minute
    });
  }
};
// Advanced preloading strategies for optimal performance

interface PreloadConfig {
  routes: Record<string, () => Promise<any>>;
  components: Record<string, () => Promise<any>>;
  assets: string[];
}

// Route-based preloading
const routePreloadMap: Record<string, () => Promise<any>> = {
  '/monitor': () => import('../components/monitoring/monitoring/MonitoringDashboard'),
  '/create': () => import('../components/wizard/ConnectionWizard'),
  '/configure': () => import('../components/configure/ConfigureHub'),
};

// Component-based preloading
const componentPreloadMap: Record<string, () => Promise<any>> = {
  'charts': () => import('../components/charts/OptimizedCharts'),
  'network-designer': () => import('../components/network-designer/LazyNetworkDesigner'),
  'control-center': () => import('../components/control-center/ControlCenterManager'),
};

// Intelligent preloading based on user behavior
export class IntelligentPreloader {
  private preloadQueue: Set<string> = new Set();
  private preloadedModules: Set<string> = new Set();
  private preloadTimeout: number | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Preload on mouse hover with debouncing
    document.addEventListener('mouseover', this.handleMouseOver.bind(this), { passive: true });
    
    // Preload on focus (keyboard navigation)
    document.addEventListener('focusin', this.handleFocusIn.bind(this), { passive: true });
    
    // Preload on scroll near links
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  private handleMouseOver(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href^="/"]');
    
    if (link) {
      const href = link.getAttribute('href');
      if (href && routePreloadMap[href]) {
        this.queuePreload(href, 'route');
      }
    }
  }

  private handleFocusIn(event: FocusEvent) {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href^="/"]');
    
    if (link) {
      const href = link.getAttribute('href');
      if (href && routePreloadMap[href]) {
        this.queuePreload(href, 'route');
      }
    }
  }

  private handleScroll() {
    // Throttle scroll-based preloading
    if (this.preloadTimeout) return;
    
    this.preloadTimeout = window.setTimeout(() => {
      this.preloadTimeout = null;
      
      // Preload components that might be needed based on current route
      const currentPath = window.location.pathname;
      
      if (currentPath === '/manage' && !this.preloadedModules.has('charts')) {
        this.queuePreload('charts', 'component');
      }
      
      if (currentPath === '/monitor' && !this.preloadedModules.has('network-designer')) {
        this.queuePreload('network-designer', 'component');
      }
    }, 100);
  }

  private queuePreload(key: string, type: 'route' | 'component') {
    if (this.preloadedModules.has(key) || this.preloadQueue.has(key)) {
      return;
    }

    this.preloadQueue.add(key);
    
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => this.executePreload(key, type));
    } else {
      setTimeout(() => this.executePreload(key, type), 0);
    }
  }

  private async executePreload(key: string, type: 'route' | 'component') {
    try {
      const preloadMap = type === 'route' ? routePreloadMap : componentPreloadMap;
      const importFn = preloadMap[key];
      
      if (importFn) {
        await importFn();
        this.preloadedModules.add(key);
        this.preloadQueue.delete(key);
      }
    } catch (error) {
      console.warn(`Failed to preload ${type} ${key}:`, error);
      this.preloadQueue.delete(key);
    }
  }

  // Manual preload method for critical components
  public preloadCritical() {
    const critical = ['charts'];
    critical.forEach(key => this.queuePreload(key, 'component'));
  }

  // Cleanup method
  public cleanup() {
    document.removeEventListener('mouseover', this.handleMouseOver);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('scroll', this.handleScroll);
    
    if (this.preloadTimeout) {
      clearTimeout(this.preloadTimeout);
    }
  }
}

// Initialize the preloader
let preloader: IntelligentPreloader | null = null;

export const initializePreloader = () => {
  if (typeof window !== 'undefined' && !preloader) {
    preloader = new IntelligentPreloader();
    preloader.preloadCritical();
  }
  return preloader;
};

export const cleanupPreloader = () => {
  if (preloader) {
    preloader.cleanup();
    preloader = null;
  }
};
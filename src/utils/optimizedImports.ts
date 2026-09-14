// Centralized import optimization utilities

// Dynamic import helper with caching
const importCache = new Map<string, Promise<any>>();

export const cachedImport = <T>(
  importFn: () => Promise<T>,
  cacheKey: string
): Promise<T> => {
  if (!importCache.has(cacheKey)) {
    importCache.set(cacheKey, importFn());
  }
  return importCache.get(cacheKey)!;
};

// Optimized icon loader - only loads icons when needed
export const loadIcons = async (iconNames: string[]) => {
  const lucideModule = await cachedImport(
    () => import('lucide-react'),
    'lucide-react'
  );
  
  const icons: Record<string, any> = {};
  iconNames.forEach(name => {
    if (lucideModule[name]) {
      icons[name] = lucideModule[name];
    }
  });
  
  return icons;
};

// Batch load multiple components
export const loadComponents = async (componentPaths: Record<string, () => Promise<any>>) => {
  const results = await Promise.allSettled(
    Object.entries(componentPaths).map(async ([key, importFn]) => {
      try {
        const module = await importFn();
        return [key, module.default || module];
      } catch (error) {
        console.error(`Failed to load component ${key}:`, error);
        return [key, null];
      }
    })
  );
  
  const components: Record<string, any> = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      const [key, component] = result.value;
      components[key] = component;
    }
  });
  
  return components;
};

// Preload strategy based on user behavior
export const setupIntelligentPreloading = () => {
  // Only run in production
  if (import.meta.env.DEV) return;
  
  // Preload on user interaction
  const preloadOnHover = (selector: string, preloadFn: () => void) => {
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      if (target.matches(selector) || target.closest(selector)) {
        preloadFn();
      }
    }, { once: true });
  };
  
  // Preload monitoring when hovering over monitor nav
  preloadOnHover('[href="/monitor"]', () => {
    import('../components/monitoring/monitoring/MonitoringDashboard');
  });
  
  // Preload network designer when hovering over create nav
  preloadOnHover('[href="/create"]', () => {
    import('../components/network-designer/LazyNetworkDesigner');
  });
  
  // Preload configure when hovering over configure nav
  preloadOnHover('[href="/configure"]', () => {
    import('../components/configure/ConfigureHub');
  });
};
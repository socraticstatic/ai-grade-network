import { memo, Suspense, lazy } from 'react';

// Fallback icon component
const IconFallback = memo(() => (
  <div className="h-5 w-5 bg-fw-neutral rounded animate-pulse" />
));

// Dynamic icon loader
export const LazyIcon = memo<{ 
  name: string; 
  className?: string;
  size?: number;
}>(({ name, className = 'h-5 w-5', size }) => {
  const IconComponent = lazy(async () => {
    try {
      const lucideModule = await import('lucide-react');
      const Icon = (lucideModule as any)[name];
      
      if (!Icon) {
        console.warn(`Icon ${name} not found in lucide-react`);
        return { default: IconFallback };
      }
      
      return { 
        default: memo(() => <Icon className={className} size={size} />) 
      };
    } catch (error) {
      console.error(`Failed to load icon ${name}:`, error);
      return { default: IconFallback };
    }
  });

  return (
    <Suspense fallback={<IconFallback />}>
      <IconComponent />
    </Suspense>
  );
});

LazyIcon.displayName = 'LazyIcon';

// Preload common icons
export const preloadCommonIcons = () => {
  const commonIcons = [
    'Activity', 'Settings', 'ChevronDown', 'ChevronUp', 
    'ChevronRight', 'X', 'Plus', 'Edit2', 'Trash2'
  ];
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      import('lucide-react').then(module => {
        commonIcons.forEach(iconName => {
          if ((module as any)[iconName]) {
            // Cache the icon
          }
        });
      });
    });
  }
};
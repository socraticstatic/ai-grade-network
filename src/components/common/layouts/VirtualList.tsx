import { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
}

function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const hubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (hubRef.current) {
        setScrollTop(hubRef.current.scrollTop);
      }
    };

    const hub = hubRef.current;
    if (hub) {
      hub.addEventListener('scroll', handleScroll);
      return () => hub.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + height) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={hubRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, width: '100%' }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Z_INDEX } from '../../utils/designer-constants';

interface FloatingPanelProps {
  title: string;
  isVisible: boolean;
  onClose: () => void;
  anchorPosition: { x: number, y: number };
  children: ReactNode;
  hubRef?: React.RefObject<HTMLElement>;
}

export function FloatingPanel({
  title,
  isVisible,
  onClose,
  anchorPosition,
  children,
  hubRef
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [animateIn, setAnimateIn] = useState(false);
  const [panelDimensions, setPanelDimensions] = useState({ width: 0, height: 0 });

  // Calculate and update position when anchor position or visibility changes
  useEffect(() => {
    if (!isVisible) {
      setAnimateIn(false);
      return;
    }

    function calculatePosition() {
      const panel = panelRef.current;
      const content = contentRef.current;
      if (!panel || !content) return;

      // Get the panel dimensions
      const contentHeight = content.scrollHeight;
      const panelWidth = 380; // Fixed width for the panel
      setPanelDimensions({ width: panelWidth, height: contentHeight });

      // Default hub dimensions (fallback)
      const defaultHubRect = { 
        width: window.innerWidth, 
        height: window.innerHeight,
        left: 0,
        top: 0
      };

      // Try to get hub dimensions safely
      let hubRect = defaultHubRect;
      
      try {
        // Check if hub and getBoundingClientRect exist
        if (hubRef?.current && typeof hubRef.current.getBoundingClientRect === 'function') {
          const rect = hubRef.current.getBoundingClientRect();
          // Validate the rect has the properties we need
          if (rect && 
              typeof rect.width === 'number' && 
              typeof rect.height === 'number' && 
              typeof rect.left === 'number' && 
              typeof rect.top === 'number') {
            hubRect = rect;
          }
        }
      } catch (e) {
        console.warn('Error getting hub dimensions, using fallback', e);
      }
      
      // Default position is to the right of the node
      let x = anchorPosition.x + 70; // Node width + some spacing
      let y = anchorPosition.y;

      // Check if panel would go off the right edge
      if (x + panelWidth > hubRect.width) {
        // Position to the left of the node
        x = Math.max(20, anchorPosition.x - panelWidth - 20);
      }

      // Get the available height in the viewport
      const viewportHeight = window.innerHeight;
      const availableHeight = Math.min(hubRect.height, viewportHeight) - 40; // 20px padding top and bottom
      
      // Maximum height for panel
      const maxPanelHeight = Math.min(contentHeight, availableHeight);
      
      // If content is too tall, add scrolling
      if (contentHeight > availableHeight) {
        panel.style.maxHeight = `${availableHeight}px`;
        panel.style.overflowY = 'auto';
        
        // Center the panel vertically as much as possible
        let centerY = anchorPosition.y - (availableHeight / 2);
        
        // Ensure the panel doesn't go off the top or bottom of the screen
        centerY = Math.max(20, Math.min(viewportHeight - availableHeight - 20, centerY));
        y = centerY;
      } else {
        panel.style.maxHeight = '';
        panel.style.overflowY = '';
        
        // Position panel to avoid going off screen
        if (y + contentHeight > hubRect.height - 20) {
          y = Math.max(20, hubRect.height - contentHeight - 20);
        }
        
        // Also check against viewport
        if (y + contentHeight > viewportHeight - 20) {
          y = Math.max(20, viewportHeight - contentHeight - 20);
        }
      }
      
      // Update position based on hub's scroll position if available
      if (hubRef?.current) {
        const scrollLeft = hubRef.current.scrollLeft || 0;
        const scrollTop = hubRef.current.scrollTop || 0;
        x -= scrollLeft;
        y -= scrollTop;
      }

      setPosition({ x, y });
    }

    // Calculate position initially
    calculatePosition();

    // Trigger animation after position is set
    const animationTimer = setTimeout(() => {
      setAnimateIn(true);
    }, 50);

    // Recalculate on window resize or hub scroll
    window.addEventListener('resize', calculatePosition);
    if (hubRef?.current) {
      // Use try-catch to handle any potential issues with event listeners
      try {
        hubRef.current.addEventListener('scroll', calculatePosition);
      } catch (e) {
        console.warn('Error attaching scroll listener', e);
      }
    }
    
    return () => {
      window.removeEventListener('resize', calculatePosition);
      if (hubRef?.current) {
        try {
          hubRef.current.removeEventListener('scroll', calculatePosition);
        } catch (e) {
          console.warn('Error removing scroll listener', e);
        }
      }
      clearTimeout(animationTimer);
      setAnimateIn(false);
    };
  }, [anchorPosition, isVisible, hubRef]);

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300 custom-scrollbar ${
        animateIn 
          ? 'opacity-100 transform-gpu translate-y-0' 
          : 'opacity-0 transform-gpu translate-y-4'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '380px',
        zIndex: Z_INDEX.OVERLAY
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg sticky top-0 z-10">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-gray-400 hover:text-gray-500 focus:outline-none hover:bg-gray-100 p-1 rounded-full transition-colors"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div 
        ref={contentRef} 
        className="p-4 overflow-auto custom-scrollbar"
        style={{ maxHeight: '70vh' }}
      >
        {children}
      </div>
    </div>
  );
}
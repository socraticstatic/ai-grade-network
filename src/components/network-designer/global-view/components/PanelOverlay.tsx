import React, { Suspense } from 'react';

import { BusinessMetricsPanel } from '../BusinessMetricsPanel';
import { RegionalPerformance } from '../RegionalPerformance';

interface PanelOverlayProps {
  activePanel: 'none' | 'metrics' | 'performance';
  nodes: any[];
  edges: any[];
  onClose: () => void;
}

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export function PanelOverlay({ 
  activePanel, 
  nodes, 
  edges, 
  onClose 
}: PanelOverlayProps) {
  if (activePanel === 'none') return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/30 backdrop-blur-sm">
      <div className={`max-w-${activePanel === 'metrics' ? '3xl' : '4xl'} w-full mx-4 max-h-[90vh] overflow-auto`}>
        <React.Suspense fallback={<LoadingFallback />}>
          {activePanel === 'metrics' && (
            <BusinessMetricsPanel
              nodes={nodes}
              edges={edges}
              isVisible={true}
              onClose={onClose}
            />
          )}
          
          {activePanel === 'performance' && (
            <RegionalPerformance
              nodes={nodes}
              edges={edges}
              onClose={onClose}
            />
          )}
        </React.Suspense>
      </div>
    </div>
  );
}
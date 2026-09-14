import React from 'react';
import { Globe, BarChart3 } from 'lucide-react';

interface ActionButtonsProps {
  activePanel: 'none' | 'metrics' | 'performance';
  togglePanel: (panelType: 'metrics' | 'performance') => void;
  nodesLength: number;
}

export function ActionButtons({ 
  activePanel, 
  togglePanel, 
  nodesLength 
}: ActionButtonsProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex space-x-4">
      {/* Regional Performance Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePanel('performance');
        }}
        className={`px-3 py-2 rounded-lg shadow-sm flex items-center space-x-2 ${
          activePanel === 'performance' 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-800 hover:bg-gray-50'
        }`}
        disabled={nodesLength === 0}
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium text-sm">Regional Performance</span>
      </button>
      
      {/* Business Insights Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePanel('metrics');
        }}
        className={`px-3 py-2 rounded-lg shadow-sm flex items-center space-x-2 ${
          activePanel === 'metrics' 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-800 hover:bg-gray-50'
        }`}
        disabled={nodesLength === 0}
      >
        <BarChart3 className="h-4 w-4" />
        <span className="font-medium text-sm">Business Insights</span>
      </button>
    </div>
  );
}
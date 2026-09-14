import React from 'react';
import { BrainCircuit as Circuit } from 'lucide-react';
import { NetworkNode } from '../../../types';

interface EmptyViewProps {
  nodes: NetworkNode[];
  onSelectDevice: (deviceId: string) => void;
  onZoomOut: () => void;
}

export function EmptyView({ nodes, onSelectDevice, onZoomOut }: EmptyViewProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[600px]">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <Circuit className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Device Selected</h3>
        <p className="text-gray-600 mb-6">
          Select a device to view its physical interfaces and circuit details.
        </p>
        
        {nodes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {nodes.slice(0, 4).map(node => (
              <button
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDevice(node.id);
                }}
                className="flex items-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-left transition-colors"
                type="button"
              >
                <span className="text-sm font-medium text-gray-800 truncate">
                  {node.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomOut();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            type="button"
          >
            Create Network First
          </button>
        )}
      </div>
    </div>
  );
}
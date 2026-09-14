import React from 'react';
import { Router, Globe, Database, Move } from 'lucide-react';
import { NetworkNode } from '../../../types';
import { Circuit } from '../CircuitTypes';

interface DeviceCardProps {
  node: NetworkNode;
  circuit: Circuit | null;
  position: { x: number, y: number };
  isSelected: boolean;
  onSelect: () => void;
  onStartDragging: (e: React.MouseEvent) => void;
}

export function DeviceCard({
  node,
  circuit,
  position,
  isSelected,
  onSelect,
  onStartDragging
}: DeviceCardProps) {
  return (
    <div className="text-center">
      {/* Circuit Line */}
      {circuit && (
        <div 
          className={`h-20 w-1 mx-auto ${
            circuit.status === 'active' ? 'bg-green-400' :
            circuit.status === 'degraded' ? 'bg-yellow-400' :
            'bg-gray-300'
          }`}
        ></div>
      )}
      
      {/* Circuit Details */}
      {circuit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`mb-2 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 hover:bg-gray-200`}
          type="button"
        >
          {circuit.capacity} {circuit.type}
        </button>
      )}
      
      {/* Connected Device - Draggable */}
      <div
        className="draggable-panel relative bg-white rounded-lg shadow-md border border-gray-200 p-3 w-40 text-center hover:border-blue-300 hover:shadow-lg transition-all cursor-move"
        onMouseDown={onStartDragging}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(0, 0)', // Use transform for smoother performance
        }}
      >
        <div className="handle absolute top-0 right-0 p-1">
          <Move className="h-3 w-3 text-gray-400" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="block w-full h-full"
          type="button"
        >
          <div className="flex justify-center mb-1">
            {node.type === 'function' ? (
              <Router className="h-5 w-5 text-purple-500" />
            ) : node.type === 'destination' ? (
              <Globe className="h-5 w-5 text-blue-500" />
            ) : (
              <Database className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div className="text-sm font-medium text-gray-900 truncate">
            {node.name}
          </div>
        </button>
      </div>
    </div>
  );
}
import React from 'react';
import { NetworkNode } from '../../../types';
import { Router, Globe, Database, Move } from 'lucide-react';
import { Port } from '../CircuitTypes';
import { PortList } from './PortList';

interface DevicePanelProps {
  node: NetworkNode;
  position: { x: number, y: number };
  ports: Port[];
  selectedPort: string | null;
  onSelectPort: (portId: string | null) => void;
  onStartDragging: (e: React.MouseEvent) => void;
}

export function DevicePanel({
  node,
  position,
  ports,
  selectedPort,
  onSelectPort,
  onStartDragging
}: DevicePanelProps) {
  return (
    <div 
      className="draggable-panel bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 cursor-move"
      onMouseDown={onStartDragging}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(0, 0)', // Use transform for smoother performance
      }}
    >
      <div className="handle flex items-center justify-between mb-2">
        <div className="flex items-center">
          {node.type === 'function' ? (
            <Router className="h-6 w-6 text-purple-600" />
          ) : node.type === 'destination' ? (
            <Globe className="h-6 w-6 text-blue-600" />
          ) : (
            <Database className="h-6 w-6 text-gray-600" />
          )}
          <h3 className="text-lg font-medium text-gray-900 ml-2">{node.name}</h3>
        </div>
        <div className="flex items-center">
          <Move className="h-4 w-4 text-gray-400 mr-1" />
          <span className={`h-3 w-3 rounded-full ${
            node.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
          }`}></span>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-3">
        {node.type === 'function' ? node.functionType : 
         node.type === 'destination' ? `${node.config?.provider} Cloud` :
         node.type === 'datacenter' ? `${node.config?.provider} Datacenter` : 
         node.type}
      </div>
      
      {/* Port List */}
      <PortList 
        ports={ports.slice(0, 8)} 
        selectedPort={selectedPort}
        onSelectPort={onSelectPort}
        showMoreCount={ports.length > 8 ? ports.length - 8 : 0}
      />
    </div>
  );
}
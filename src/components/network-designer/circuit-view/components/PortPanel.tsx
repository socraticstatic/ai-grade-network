import React from 'react';
import { Cable, Move } from 'lucide-react';
import { Port } from '../CircuitTypes';

interface PortPanelProps {
  title: string;
  ports: Port[];
  selectedPort: string | null;
  onSelectPort: (portId: string | null) => void;
  onStartDragging: (e: React.MouseEvent) => void;
}

export function PortPanel({
  title,
  ports,
  selectedPort,
  onSelectPort,
  onStartDragging
}: PortPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900 flex items-center">
          <Cable className="h-5 w-5 mr-2 text-blue-600" />
          {title}
        </h3>
        <Move className="h-4 w-4 text-gray-400 cursor-move handle" onMouseDown={onStartDragging} />
      </div>
      
      <div className="grid grid-cols-8 gap-2">
        {ports.map((port, idx) => (
          <button
            key={port.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPort(port.id === selectedPort ? null : port.id);
            }}
            className={`relative flex flex-col items-center justify-center p-2 border ${
              port.id === selectedPort 
                ? 'border-blue-500 bg-blue-50' 
                : port.status === 'active'
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
            } rounded-md transition-colors`}
            type="button"
          >
            <div className="text-xs font-medium mb-1">
              {idx + 1}
            </div>
            <div className={`w-6 h-6 rounded-sm flex items-center justify-center ${
              port.type === 'copper' ? 'bg-amber-100' : 
              port.type === 'fiber' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              <Cable className={`h-4 w-4 ${
                port.type === 'copper' ? 'text-amber-600' : 
                port.type === 'fiber' ? 'text-blue-600' : 'text-purple-600'
              }`} />
            </div>
            <div className="text-[10px] mt-1 text-gray-500">
              {port.speed.split(' ')[0]}
            </div>
            
            <div className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
              port.status === 'active' ? 'bg-green-500' :
              port.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
          </button>
        ))}
      </div>
    </div>
  );
}
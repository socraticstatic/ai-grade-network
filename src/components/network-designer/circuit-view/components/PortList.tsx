import React from 'react';
import { Cable, BrainCircuit as Circuit } from 'lucide-react';
import { Port } from '../CircuitTypes';

interface PortListProps {
  ports: Port[];
  selectedPort: string | null;
  onSelectPort: (portId: string | null) => void;
  showMoreCount?: number;
}

export function PortList({
  ports,
  selectedPort,
  onSelectPort,
  showMoreCount = 0
}: PortListProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 flex items-center">
        <Cable className="h-4 w-4 mr-1.5 text-gray-500" />
        Physical Interfaces
      </h4>
      
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-48 overflow-y-auto custom-scrollbar">
        {ports.map(port => (
          <button
            key={port.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPort(port.id === selectedPort ? null : port.id);
            }}
            className={`w-full flex items-center justify-between p-2 text-left ${
              port.id === selectedPort ? 'bg-blue-50' : 
              port.connectedTo ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-500'
            }`}
            type="button"
          >
            <div className="flex items-center">
              <span className={`inline-flex h-2 w-2 rounded-full mr-2 ${
                port.status === 'active' ? 'bg-green-500' :
                port.status === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`}></span>
              <span className="text-sm">{port.name}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-xs mr-2">{port.speed}</span>
              {port.type === 'fiber' ? (
                <Cable className="h-4 w-4 text-blue-500" />
              ) : port.type === 'virtual' ? (
                <Circuit className="h-4 w-4 text-purple-500" />
              ) : (
                <Cable className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </button>
        ))}
        
        {showMoreCount > 0 && (
          <div className="p-2 text-center text-xs text-gray-500">
            + {showMoreCount} more interfaces
          </div>
        )}
      </div>
    </div>
  );
}
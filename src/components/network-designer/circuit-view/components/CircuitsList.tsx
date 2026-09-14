import React from 'react';
import { BrainCircuit as Circuit, Move } from 'lucide-react';
import { Circuit as CircuitType } from '../CircuitTypes';
import { NetworkNode } from '../../../types';

interface CircuitsListProps {
  circuits: CircuitType[];
  nodeId: string;
  nodes: NetworkNode[];
  selectedCircuit: string | null;
  onSelectCircuit: (circuitId: string | null) => void;
  onSelectDevice: (deviceId: string) => void;
  onStartDragging: (e: React.MouseEvent) => void;
}

export function CircuitsList({
  circuits,
  nodeId,
  nodes,
  selectedCircuit,
  onSelectCircuit,
  onSelectDevice,
  onStartDragging
}: CircuitsListProps) {
  // Filter circuits connected to this node
  const nodeCircuits = circuits.filter(c => 
    c.sourcePort.startsWith(nodeId) || 
    c.targetPort.startsWith(nodeId)
  );

  return (
    <div 
      className="draggable-panel bg-white rounded-lg shadow-md p-4 border border-gray-200"
      onMouseDown={onStartDragging}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900 flex items-center">
          <Circuit className="h-5 w-5 mr-2 text-purple-600" />
          Connected Circuits
        </h3>
        <Move className="h-4 w-4 text-gray-400 cursor-move handle" />
      </div>
      
      <div className="grid grid-cols-1 divide-y divide-gray-200">
        {nodeCircuits.length > 0 ? (
          nodeCircuits.map(circuit => {
            const isSource = circuit.sourcePort.startsWith(nodeId);
            const otherPortId = isSource ? circuit.targetPort : circuit.sourcePort;
            const otherNodeId = otherPortId.split('-port-')[0];
            const otherNode = nodes.find(n => n.id === otherNodeId);
            
            return (
              <button
                key={circuit.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCircuit(circuit.id === selectedCircuit ? null : circuit.id);
                }}
                className={`flex items-center justify-between py-3 px-2 ${
                  circuit.id === selectedCircuit ? 'bg-blue-50' : 'hover:bg-gray-50'
                } transition-colors rounded-md`}
                type="button"
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    circuit.status === 'active' ? 'bg-green-500' :
                    circuit.status === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{circuit.capacity} {circuit.type}</div>
                    <div className="text-xs text-gray-500">
                      {isSource ? 'to' : 'from'} {otherNode?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {circuit.status === 'active' && circuit.metrics && (
                    <div className="flex items-center mr-4 space-x-4">
                      <div className="text-xs">
                        <span className="text-gray-500">Latency:</span> <span className="font-medium">{circuit.metrics.latency.toFixed(2)}ms</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Loss:</span> <span className="font-medium">{circuit.metrics.loss.toFixed(2)}dB</span>
                      </div>
                    </div>
                  )}
                  <div className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {circuit.sourcePort.split('-port-')[1]?.split('-')[0] || '?'} → {circuit.targetPort.split('-port-')[1]?.split('-')[0] || '?'}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center text-gray-500">
            No circuits connected to this device
          </div>
        )}
      </div>
    </div>
  );
}
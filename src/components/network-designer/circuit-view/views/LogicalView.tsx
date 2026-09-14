import React from 'react';
import { BrainCircuit as Circuit } from 'lucide-react';
import { NetworkNode } from '../../../types';
import { DevicePanel } from '../components/DevicePanel';
import { DeviceCard } from '../components/DeviceCard';
import { DraggablePanelPosition, Port, Circuit as CircuitType } from '../CircuitTypes';

interface LogicalViewProps {
  nodes: NetworkNode[];
  selectedDevice: NetworkNode | null;
  devicePorts: Record<string, Port[]>;
  circuits: CircuitType[];
  zoomLevel: number;
  selectedPort: string | null;
  selectedCircuit: string | null;
  panelPositions: Record<string, DraggablePanelPosition>;
  onSelectDevice: (deviceId: string) => void;
  onSelectPort: (portId: string | null) => void;
  onSelectCircuit: (circuitId: string | null) => void;
  onStartDragging: (e: React.MouseEvent, panelId: string) => void;
  getConnectedNodes: (nodeId: string) => NetworkNode[];
  isDragging: boolean;
}

export function LogicalView({
  nodes,
  selectedDevice,
  devicePorts,
  circuits,
  zoomLevel,
  selectedPort,
  selectedCircuit,
  panelPositions,
  onSelectDevice,
  onSelectPort,
  onSelectCircuit,
  onStartDragging,
  getConnectedNodes,
  isDragging
}: LogicalViewProps) {
  if (!selectedDevice) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <Circuit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Device Selected</h3>
          <p className="text-gray-600 mb-4">
            Select a device from the network view or choose one below to see its circuit details.
          </p>
          
          {/* Quick select buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {nodes.slice(0, 4).map(node => (
              <button
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDevice(node.id);
                }}
                className="flex items-center px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-left"
                type="button"
              >
                <span className="text-sm font-medium text-gray-800 truncate">
                  {node.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get connected nodes for the selected device
  const connectedNodes = getConnectedNodes(selectedDevice.id);
  
  const primaryDeviceZIndex = isDragging && panelPositions["primary-device"] ? 60 : 40;
  
  return (
    <div 
      className="relative min-w-full min-h-full p-20"
      style={{ 
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'center',
        transition: 'transform 0.3s ease'
      }}
    >
      <div className="absolute left-1/2 top-1/3 transform -translate-x-1/2 -translate-y-1/2">
        {/* Primary Device Panel */}
        <div style={{ position: 'relative', zIndex: primaryDeviceZIndex }}>
          <DevicePanel
            node={selectedDevice}
            position={panelPositions["primary-device"] || { x: 0, y: 0 }}
            ports={devicePorts[selectedDevice.id] || []}
            selectedPort={selectedPort}
            onSelectPort={onSelectPort}
            onStartDragging={(e) => onStartDragging(e, "primary-device")}
          />
        </div>
        
        {/* Connected Devices */}
        <div className="flex flex-wrap justify-center gap-8 mt-8">
          {connectedNodes.map((connectedNode, index) => {
            // Find circuits connecting to this node
            const connectingCircuits = circuits.filter(circuit => {
              return (circuit.sourcePort.startsWith(selectedDevice.id) && circuit.targetPort.startsWith(connectedNode.id)) ||
                    (circuit.targetPort.startsWith(selectedDevice.id) && circuit.sourcePort.startsWith(connectedNode.id));
            });
            
            // Use the first circuit for display
            const circuit = connectingCircuits[0];
            
            const connectedDeviceZIndex = isDragging && panelPositions[`connected-device-${connectedNode.id}`] ? 50 : 30 + index;
            
            return (
              <div key={connectedNode.id} style={{ position: 'relative', zIndex: connectedDeviceZIndex }}>
                <DeviceCard
                  node={connectedNode}
                  circuit={circuit || null}
                  position={panelPositions[`connected-device-${connectedNode.id}`] || { x: 0, y: 0 }}
                  isSelected={false}
                  onSelect={() => onSelectDevice(connectedNode.id)}
                  onStartDragging={(e) => onStartDragging(e, `connected-device-${connectedNode.id}`)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
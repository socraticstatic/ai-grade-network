import React from 'react';
import { NetworkNode } from '../../../types';
import { DevicePortsMap, Port, Circuit, DraggablePanelPosition } from '../CircuitTypes';
import { PortPanel } from '../components/PortPanel';
import { CircuitsList } from '../components/CircuitsList';

interface PhysicalViewProps {
  selectedNode: NetworkNode;
  devicePorts: DevicePortsMap;
  circuits: Circuit[];
  nodes: NetworkNode[];
  selectedPort: string | null;
  selectedCircuit: string | null;
  panelPositions: Record<string, DraggablePanelPosition>;
  onSelectPort: (portId: string | null) => void;
  onSelectCircuit: (circuitId: string | null) => void;
  onSelectDevice: (deviceId: string) => void;
  onStartDragging: (e: React.MouseEvent, panelId: string) => void;
  isDragging: boolean;
}

export function PhysicalView({
  selectedNode,
  devicePorts,
  circuits,
  nodes,
  selectedPort,
  selectedCircuit,
  panelPositions,
  onSelectPort,
  onSelectCircuit,
  onSelectDevice,
  onStartDragging,
  isDragging
}: PhysicalViewProps) {
  // Sort ports by position
  const frontPorts = (devicePorts[selectedNode.id] || []).filter(p => p.position === 'front' || !p.position);
  const backPorts = (devicePorts[selectedNode.id] || []).filter(p => p.position === 'back');

  // Calculate z-indices based on dragging state
  const deviceZIndex = isDragging && panelPositions["physical-device"] ? 50 : 20;
  const portsZIndex = isDragging && panelPositions["physical-ports"] ? 50 : 30;
  const circuitsZIndex = isDragging && panelPositions["circuit-panel"] ? 50 : 40;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Device card - Draggable */}
        <div 
          className="draggable-panel col-span-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 cursor-move"
          onMouseDown={(e) => onStartDragging(e, "physical-device")}
          style={{
            position: 'relative',
            left: panelPositions["physical-device"]?.x || 0,
            top: panelPositions["physical-device"]?.y || 0,
            zIndex: deviceZIndex
          }}
        >
          <div className="text-center mb-4 p-4 border-b border-gray-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
              {selectedNode.icon && <selectedNode.icon className="h-8 w-8 text-gray-700" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900">{selectedNode.name}</h3>
            <div className="text-sm text-gray-500 mt-1">
              <div>Type: <span className="font-medium">{selectedNode.type}</span></div>
              {selectedNode.functionType && (
                <div>Function: <span className="font-medium">{selectedNode.functionType}</span></div>
              )}
              {selectedNode.config?.location && (
                <div>Location: <span className="font-medium">{selectedNode.config.location}</span></div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Physical Specifications</h4>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Form Factor:</span>
                  <span className="font-medium text-gray-900">
                    {selectedNode.type === 'function' 
                      ? (selectedNode.functionType === 'Router' ? '2U Rack Mount' : '1U Rack Mount') 
                      : selectedNode.type === 'destination' 
                        ? 'Cloud Service' 
                        : '4U Rack Mount'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Power:</span>
                  <span className="font-medium text-gray-900">
                    {selectedNode.type === 'function' ? 'Redundant AC' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Interfaces:</span>
                  <span className="font-medium text-gray-900">
                    {devicePorts[selectedNode.id]?.length || 0} ports
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Device Status</span>
                <div className="flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    selectedNode.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  } mr-1.5`}></span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedNode.status === 'active' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-700">
              Select ports on the right panels to see detailed connection information
            </p>
          </div>
        </div>
        
        {/* Ports panel - Draggable */}
        <div 
          className="draggable-panel col-span-8"
          style={{
            position: 'relative',
            left: panelPositions["physical-ports"]?.x || 0,
            top: panelPositions["physical-ports"]?.y || 0,
            zIndex: portsZIndex
          }}
        >
          {/* Front ports panel */}
          {frontPorts.length > 0 && (
            <PortPanel
              title="Front Panel Interfaces"
              ports={frontPorts.slice(0, 16)}
              selectedPort={selectedPort}
              onSelectPort={onSelectPort}
              onStartDragging={(e) => onStartDragging(e, "physical-ports")}
            />
          )}
          
          {/* Back ports panel */}
          {backPorts.length > 0 && (
            <PortPanel
              title="Back Panel Interfaces"
              ports={backPorts.slice(0, 16)}
              selectedPort={selectedPort}
              onSelectPort={onSelectPort}
              onStartDragging={(e) => onStartDragging(e, "physical-ports")}
            />
          )}
        </div>
        
        {/* Connected circuits panel - Draggable */}
        <div 
          className="draggable-panel col-span-12 mt-4"
          style={{
            position: 'relative',
            left: panelPositions["circuit-panel"]?.x || 0,
            top: panelPositions["circuit-panel"]?.y || 0,
            zIndex: circuitsZIndex
          }}
        >
          <CircuitsList 
            circuits={circuits}
            nodeId={selectedNode.id}
            nodes={nodes}
            selectedCircuit={selectedCircuit}
            onSelectCircuit={onSelectCircuit}
            onSelectDevice={onSelectDevice}
            onStartDragging={(e) => onStartDragging(e, "circuit-panel")}
          />
        </div>
      </div>
    </div>
  );
}
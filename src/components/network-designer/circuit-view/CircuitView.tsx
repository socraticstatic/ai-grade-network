import { useState, useEffect } from 'react';
import { BrainCircuit as Circuit } from 'lucide-react';
import type { NetworkNode, NetworkEdge } from '../../types';
import { Breadcrumb } from './components/Breadcrumb';
import { RightDetailPanel } from './components/RightDetailPanel';
import { CleanLogicalView } from './views/CleanLogicalView';
import {
  Port,
  Circuit as CircuitType,
  DevicePortsMap
} from './CircuitTypes';

interface CircuitViewProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selectedNode: string | null;
  onNodeSelect: (node: NetworkNode | null) => void;
  onZoomOut: () => void;
}

export function CircuitView({ 
  nodes, 
  edges, 
  selectedNode,
  onNodeSelect,
  onZoomOut
}: CircuitViewProps) {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(selectedNode);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  
  // Update selected device when selectedNode prop changes
  useEffect(() => {
    if (selectedNode) {
      setSelectedDevice(selectedNode);
    }
  }, [selectedNode]);
  
  // Generate ports for network devices based on connections
  const generatePorts = (nodeId: string): Port[] => {
    const nodeEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) return [];
    
    // Determine how many ports to generate based on node type
    const basePorts = node.type === 'function' ? 8 : 
                     node.type === 'destination' ? 4 : 6;
    
    // Generate connected ports
    const connectedPorts = nodeEdges.map((edge, index) => {
      const isSource = edge.source === nodeId;
      const connectedTo = isSource ? edge.target : edge.source;
      const portNumber = index % basePorts + 1;
      const slotNumber = Math.floor(index / basePorts) + 1;
      
      // Determine port type based on edge characteristics
      const portType = edge.type.toLowerCase().includes('fiber') || 
                     edge.bandwidth.includes('100') ? 'fiber' : 
                     edge.type.toLowerCase().includes('virtual') ? 'virtual' : 'copper';
      
      // Determine if it's a front or back port
      const position = node.type === 'function' ? 
                      (portType === 'fiber' ? 'back' : 'front') : 
                      'front';
                      
      return {
        id: `${nodeId}-port-${portNumber}-slot-${slotNumber}`,
        name: `Port ${portNumber}/${slotNumber}`,
        type: portType,
        speed: edge.bandwidth,
        status: edge.status as 'active' | 'inactive',
        connectedTo,
        position,
        slot: slotNumber,
        module: portType === 'fiber' ? 'SFP+' : 
               portType === 'virtual' ? 'Virtual' : 'RJ45'
      };
    });
    
    // Add some unused ports to fill out slots
    const totalPorts = Math.max(basePorts * 2, connectedPorts.length + 4);
    const unusedPorts: Port[] = [];
    
    for (let i = connectedPorts.length; i < totalPorts; i++) {
      const portNumber = i % basePorts + 1;
      const slotNumber = Math.floor(i / basePorts) + 1;
      const isFront = i % 2 === 0;
      
      unusedPorts.push({
        id: `${nodeId}-port-unused-${i + 1}`,
        name: `Port ${portNumber}/${slotNumber}`,
        type: isFront ? 'copper' : 'fiber',
        speed: isFront ? '1 Gbps' : '10 Gbps',
        status: 'unconfigured',
        position: isFront ? 'front' : 'back',
        slot: slotNumber,
        module: isFront ? 'RJ45' : 'SFP+'
      });
    }
    
    return [...connectedPorts, ...unusedPorts];
  };
  
  // Generate circuits between devices
  const generateCircuits = (): CircuitType[] => {
    return edges.map((edge, index) => {
      // Get the source and target nodes
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return null;
      
      // Create port IDs that match the format from generatePorts
      const sourcePortId = `${edge.source}-port-${(index % 8) + 1}-slot-${Math.floor(index / 8) + 1}`;
      const targetPortId = `${edge.target}-port-${(index % 8) + 1}-slot-${Math.floor(index / 8) + 1}`;
      
      // Create a circuit
      return {
        id: `circuit-${edge.id}`,
        sourcePort: sourcePortId,
        targetPort: targetPortId,
        type: edge.type.includes('Fiber') ? 'dark-fiber' : 
              edge.type.includes('MPLS') ? 'mpls' :
              edge.type.includes('Direct') ? 'ethernet' : 'wave',
        capacity: edge.bandwidth,
        status: edge.status as 'active' | 'inactive',
        metrics: edge.status === 'active' ? {
          light: -12.5 - Math.random() * 10,  // dBm
          loss: 0.2 + Math.random() * 0.3,    // dB
          latency: 0.8 + Math.random() * 0.4  // ms
        } : undefined
      };
    }).filter(Boolean) as CircuitType[];
  };

  // Find all nodes connected to the selected device
  const getConnectedNodes = (nodeId: string) => {
    if (!nodeId) return [];
    
    return nodes.filter(node => {
      return edges.some(edge => 
        (edge.source === nodeId && edge.target === node.id) ||
        (edge.target === nodeId && edge.source === node.id)
      );
    });
  };
  
  // Get all devices with their ports
  const devicePorts: DevicePortsMap = {};
  nodes.forEach(node => {
    devicePorts[node.id] = generatePorts(node.id);
  });
  
  const circuits = generateCircuits();
  
  // Find the selected node details
  const selectedNodeData = nodes.find(n => n.id === selectedDevice);
  
  // Find the circuit details if a circuit is selected
  const selectedCircuitData = selectedCircuit 
    ? circuits.find(c => c.id === selectedCircuit) 
    : null;
  
  // Find the port details if a port is selected
  const selectedPortData = selectedPort && selectedDevice
    ? devicePorts[selectedDevice]?.find(p => p.id === selectedPort)
    : null;
  
  const handleDeviceSelect = (deviceId: string) => {
    const node = nodes.find(n => n.id === deviceId);
    if (!node) return;

    setSelectedDevice(deviceId);
    onNodeSelect(node);
    setSelectedPort(null);
    setSelectedCircuit(null);
  };

  const handlePortSelect = (portId: string | null) => {
    setSelectedPort(portId);
    setSelectedCircuit(null);
  };

  const handleNavigate = (level: 'rack' | 'device' | 'port') => {
    if (level === 'rack') {
      setSelectedDevice(null);
      setSelectedPort(null);
      setSelectedCircuit(null);
      onNodeSelect(null);
    } else if (level === 'device') {
      setSelectedPort(null);
      setSelectedCircuit(null);
    }
  };

  const handleCloseDetail = () => {
    setSelectedDevice(null);
    setSelectedPort(null);
    setSelectedCircuit(null);
    onNodeSelect(null);
  };

  return (
    <div className="relative w-full h-full bg-gray-50">
      {/* Top bar with breadcrumb */}
      <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-4 z-40">
        <Breadcrumb
          selectedDevice={selectedDevice}
          selectedPort={selectedPort}
          selectedCircuit={selectedCircuit}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 top-16 overflow-auto" style={{ right: selectedDevice || selectedPort || selectedCircuit ? '384px' : '0' }}>
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
              <Circuit className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Network to Visualize</h3>
              <p className="text-gray-600 mb-6">
                Create your network in the Topo View first, then switch to Infra View to see detailed hardware information.
              </p>
              <button
                onClick={onZoomOut}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                type="button"
              >
                Switch to Topo View
              </button>
            </div>
          </div>
        ) : (
          <CleanLogicalView
            nodes={nodes}
            circuits={circuits}
            devicePorts={devicePorts}
            selectedDevice={selectedDevice}
            onSelectDevice={handleDeviceSelect}
          />
        )}
      </div>

      {/* Right detail panel */}
      <RightDetailPanel
        selectedDevice={selectedNodeData}
        selectedPort={selectedPortData}
        selectedCircuit={selectedCircuitData}
        devicePorts={devicePorts}
        circuits={circuits}
        nodes={nodes}
        onClose={handleCloseDetail}
        onSelectDevice={handleDeviceSelect}
        onSelectPort={handlePortSelect}
      />
    </div>
  );
}
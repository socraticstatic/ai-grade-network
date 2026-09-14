import { useState, useEffect } from 'react';
import { Server, Router, Database, Globe, Cable, BrainCircuit as Circuit, 
         Layers, Shield, Info, Cpu, HardDrive, Network, XOctagon } from 'lucide-react';
import { NetworkNode } from '../../types';

interface Port {
  id: string;
  name: string;
  type: 'fiber' | 'copper' | 'virtual';
  speed: string;
  status: 'active' | 'inactive' | 'error';
  connectedTo?: string;
  position?: 'front' | 'back';
  slot?: number;
  module?: string;
}

interface Circuit {
  id: string;
  sourcePort: string;
  targetPort: string;
  type: 'dark-fiber' | 'wave' | 'ethernet' | 'mpls';
  capacity: string;
  status: 'active' | 'inactive' | 'degraded';
  metrics?: {
    light: number;
    loss: number;
    latency: number;
  };
}

interface PhysicalRackViewProps {
  nodes: NetworkNode[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  devicePorts: Record<string, Port[]>;
  selectedPort: string | null;
  onSelectPort: (portId: string | null) => void;
  circuits: Circuit[];
  showPorts?: boolean;
}

// Helper functions moved outside component to ensure they're always in scope
function getDeviceColor(node: NetworkNode): string {
  if (node.type === 'function') {
    if (node.functionType === 'Router') return '#4c1d95'; // purple-900
    if (node.functionType === 'Firewall') return '#991b1b'; // red-900
    if (node.functionType === 'SDWAN') return '#1e40af'; // blue-900
    return '#374151'; // gray-800
  }
  if (node.type === 'network') return '#064e3b'; // green-900
  return '#1e293b'; // slate-800
}

function getDeviceIcon(node: NetworkNode) {
  if (node.type === 'function') {
    if (node.functionType === 'Router') return Router;
    if (node.functionType === 'Firewall') return Shield;
    if (node.functionType === 'SDWAN') return Network;
    return Server;
  }
  if (node.type === 'network') return Network;
  if (node.type === 'destination') return Globe;
  return Server;
}

export function PhysicalRackView({
  nodes,
  selectedDeviceId,
  onSelectDevice,
  devicePorts,
  selectedPort,
  onSelectPort,
  circuits,
  showPorts = false
}: PhysicalRackViewProps) {
  const [rackView, setRackView] = useState<'front' | 'back'>('front');
  const [highlightedDevice, setHighlightedDevice] = useState<string | null>(null);
  
  // Set highlighted device when selected device changes
  useEffect(() => {
    if (selectedDeviceId) {
      setHighlightedDevice(selectedDeviceId);
    }
  }, [selectedDeviceId]);
  
  // Get device count excluding cloud nodes
  const deviceCount = nodes.filter(n => n.type !== 'destination').length;
  
  // Assign rack unit positions to each device
  const deviceRackPositions = new Map<string, number>();
  let currentRackUnit = 1;
  
  // Place routers at the top
  nodes
    .filter(node => node.type === 'function' && node.functionType === 'Router')
    .forEach(node => {
      deviceRackPositions.set(node.id, currentRackUnit);
      currentRackUnit += 2; // Routers take 2U
    });
  
  // Place firewalls next
  nodes
    .filter(node => node.type === 'function' && node.functionType === 'Firewall')
    .forEach(node => {
      deviceRackPositions.set(node.id, currentRackUnit);
      currentRackUnit += 1; // Firewalls take 1U
    });
  
  // Place switches next
  nodes
    .filter(node => node.type === 'function' && (node.functionType === 'SDWAN' || node.functionType === 'VNF'))
    .forEach(node => {
      deviceRackPositions.set(node.id, currentRackUnit);
      currentRackUnit += 1; // Switches take 1U
    });
  
  // Place network devices next
  nodes
    .filter(node => node.type === 'network')
    .forEach(node => {
      deviceRackPositions.set(node.id, currentRackUnit);
      currentRackUnit += 1; // Network devices take 1U
    });
  
  // Place servers at the bottom
  nodes
    .filter(node => node.type === 'function' && !['Router', 'Firewall', 'SDWAN', 'VNF'].includes(node.functionType || ''))
    .forEach(node => {
      deviceRackPositions.set(node.id, currentRackUnit);
      currentRackUnit += 1; // Servers take 1U
    });
  
  // Make sure the rack has a reasonable size
  const rackUnits = Math.max(42, currentRackUnit + 2);
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Rack View Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <h2 className="text-white text-lg font-medium flex items-center">
          <Layers className="h-5 w-5 mr-2" />
          Data Center Rack View
        </h2>

        {showPorts && (
          <div className="flex space-x-4 items-center">
            <div className="bg-gray-700 rounded-lg flex">
              <button
                onClick={() => setRackView('front')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                  rackView === 'front'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                type="button"
              >
                Front View
              </button>
              <button
                onClick={() => setRackView('back')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                  rackView === 'back'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                type="button"
              >
                Back View
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-6 bg-gradient-to-b from-gray-100 to-gray-200">
        {/* Cloud devices */}
        {nodes.filter(n => n.type === 'destination').length > 0 && (
          <div className="mb-8 flex flex-col items-center">
            <div className="flex flex-wrap gap-4 justify-center">
              {nodes.filter(n => n.type === 'destination').map(node => (
                <button
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDevice(node.id);
                  }}
                  onMouseEnter={() => setHighlightedDevice(node.id)}
                  onMouseLeave={() => setHighlightedDevice(selectedDeviceId)}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                    node.id === selectedDeviceId 
                      ? 'bg-blue-100 border-2 border-blue-400 shadow-md' 
                      : node.id === highlightedDevice
                      ? 'bg-blue-50 border border-blue-300 shadow-sm' 
                      : 'bg-white border border-gray-200 hover:border-blue-300'
                  }`}
                  type="button"
                >
                  <Globe className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-gray-900">{node.name}</span>
                  <span className="text-xs text-gray-500">
                    {node.config?.provider || 'Cloud'} - {node.config?.region || 'Unknown region'}
                  </span>
                  
                  <div className="mt-2 flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${
                      node.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    <span className="text-xs text-gray-600">{node.status === 'active' ? 'Online' : 'Offline'}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="w-1/2 h-12 mx-auto mt-2 border-l border-r border-t border-dashed border-gray-400"></div>
          </div>
        )}
      
        {/* Rack visualization */}
        <div className="max-w-4xl mx-auto bg-gray-700 rounded-lg overflow-hidden shadow-xl border border-gray-800">
          {/* Rack header with model */}
          <div className="bg-gray-800 text-white p-2 flex justify-between items-center">
            <div className="flex items-center">
              <Server className="h-5 w-5 mr-1.5 text-gray-400" />
              <span className="text-sm font-medium">Enterprise Server Rack</span>
            </div>
            <span className="text-xs text-gray-400">42U Capacity</span>
          </div>
          
          {/* Rack body */}
          <div className="flex">
            {/* Rack unit numbers */}
            <div className="w-8 bg-gray-800 text-gray-400 py-1 flex flex-col">
              {Array.from({ length: rackUnits }).map((_, i) => (
                <div 
                  key={`ru-${i + 1}`}
                  className="h-10 flex items-center justify-center text-xs font-mono"
                >
                  {rackUnits - i}
                </div>
              ))}
            </div>
            
            {/* Devices */}
            <div className="flex-1 relative">
              {/* Rack grid lines */}
              <div 
                className="absolute inset-0" 
                style={{
                  backgroundImage: 'linear-gradient(to bottom, rgba(75, 85, 99, 0.3) 1px, transparent 1px)',
                  backgroundSize: '100% 40px',
                  pointerEvents: 'none'
                }}
              ></div>
              
              {/* Rack-mounted devices */}
              {nodes.filter(n => n.type !== 'destination').map(node => {
                const rackPosition = deviceRackPositions.get(node.id) || 0;
                const deviceHeight = node.type === 'function' && node.functionType === 'Router' ? 2 : 1; // Routers take 2U
                
                // Skip devices without assigned positions
                if (rackPosition === 0) return null;
                
                // Calculate position from top
                const topPosition = (rackPosition - 1) * 40; // 40px per rack unit
                
                // Get device ports for display
                const nodePorts = devicePorts[node.id] || [];
                const visiblePorts = nodePorts.filter(port => 
                  rackView === 'front' ? port.position !== 'back' : port.position === 'back'
                ).slice(0, 16);
                
                // Calculate device status - active if there are any active ports
                const isActive = node.status === 'active' || nodePorts.some(port => port.status === 'active');
                
                return (
                  <div 
                    key={node.id}
                    className={`absolute left-0 right-0 border-2 ${
                      node.id === selectedDeviceId 
                        ? 'border-blue-500 z-20 shadow-lg' 
                        : node.id === highlightedDevice
                        ? 'border-blue-300 z-10' 
                        : 'border-gray-500'
                    }`}
                    style={{
                      top: `${topPosition}px`,
                      height: `${deviceHeight * 40}px`, // 40px per rack unit
                      backgroundColor: getDeviceColor(node),
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDevice(node.id);
                      }}
                      onMouseEnter={() => setHighlightedDevice(node.id)}
                      onMouseLeave={() => setHighlightedDevice(selectedDeviceId)}
                      className="w-full h-full"
                      type="button"
                    >
                      <div className="h-full flex items-center px-3 relative">
                        {/* Front view */}
                        {rackView === 'front' && (
                          <>
                            {/* Device info */}
                            <div className="flex items-center space-x-2 z-10">
                              {/* Get the icon component */}
                              {(() => {
                                const IconComponent = getDeviceIcon(node);
                                return <IconComponent className="h-6 w-6" />;
                              })()}
                              <div>
                                <div className="text-sm font-medium text-gray-100">{node.name}</div>
                                <div className="text-xs text-gray-400">
                                  {node.type === 'function' && node.functionType ? node.functionType : node.type}
                                </div>
                              </div>
                              <div className={`ml-auto h-3 w-3 rounded-full ${
                                isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                            </div>
                            
                            {/* Front panel display/LEDs */}
                            <div className="absolute right-3 h-full flex items-center">
                              <div className="space-y-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <div 
                                    key={`led-${i}`} 
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      i === 0 ? 'bg-green-400' : 
                                      i === 1 ? (isActive ? 'bg-amber-400 animate-pulse' : 'bg-gray-500') : 
                                      'bg-blue-400'
                                    }`}
                                  ></div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Rear view with ports */}
                        {rackView === 'back' && showPorts && (
                          <div className="w-full grid grid-cols-8 gap-1">
                            {visiblePorts.map((port) => (
                              <button
                                key={port.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPort(port.id === selectedPort ? null : port.id);
                                }}
                                className={`flex items-center justify-center h-7 rounded ${
                                  port.id === selectedPort 
                                    ? 'ring-2 ring-offset-1 ring-blue-400 z-30' 
                                    : 'hover:ring-1 hover:ring-blue-200'
                                }`}
                                type="button"
                              >
                                <div className={`relative w-5 h-5 flex items-center justify-center rounded ${
                                  port.type === 'copper' 
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                                  port.type === 'fiber' 
                                    ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                                    'bg-gradient-to-r from-purple-400 to-purple-500'
                                }`}>
                                  {/* Port status indicator */}
                                  <div className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${
                                    port.status === 'active' ? 'bg-green-400' :
                                    port.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                                  }`}></div>
                                  
                                  {/* Port connector type indicator */}
                                  {port.type === 'copper' && (
                                    <div className="w-3 h-2 bg-gray-200 rounded-sm"></div>
                                  )}
                                  {port.type === 'fiber' && (
                                    <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                                  )}
                                </div>
                              </button>
                            ))}
                            
                            {/* Add empty port slots if needed */}
                            {Array.from({ length: Math.max(0, 16 - visiblePorts.length) }).map((_, i) => (
                              <div 
                                key={`empty-${i}`}
                                className="h-7 flex items-center justify-center"
                              >
                                <div className="w-5 h-5 rounded bg-gray-600"></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
              
              {/* Empty Rack Units */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  className="absolute left-0 right-0 border border-gray-600 bg-gray-800"
                  style={{
                    top: `${(rackUnits - i - 1) * 40}px`,
                    height: '40px'
                  }}
                >
                  <div className="h-full flex items-center px-3">
                    <div className="w-full border border-dashed border-gray-600 h-5 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Right side - power/management */}
            <div className="w-10 bg-gray-800 flex flex-col items-center py-2">
              {/* Power indicators */}
              <div className="flex flex-col items-center space-y-1 mb-4">
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center">
                  <div className="w-2 h-4 bg-green-200 rounded-sm"></div>
                </div>
                <div className="text-[10px] text-gray-400">PWR</div>
              </div>
              
              {/* Management port */}
              <div className="flex flex-col items-center mt-auto">
                <div className="w-6 h-6 bg-blue-900 rounded flex items-center justify-center mb-1">
                  <div className="w-4 h-2 bg-blue-200 rounded-sm"></div>
                </div>
                <div className="text-[10px] text-gray-400">MGMT</div>
              </div>
            </div>
          </div>
          
          {/* Rack bottom */}
          <div className="h-4 bg-gray-800"></div>
        </div>
      </div>
      
      {/* Selected port details */}
      {selectedPort && showPorts && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <h3 className="text-base font-medium text-gray-900 flex items-center mb-3">
            <Cable className="h-5 w-5 mr-2 text-blue-600" />
            Port Details
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {Object.values(devicePorts).flatMap(ports => 
              ports.filter(p => p.id === selectedPort)
            ).map(port => (
              <div key={port.id} className="col-span-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Interface</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      {port.name}
                      <span className={`ml-2 w-2 h-2 rounded-full ${
                        port.status === 'active' ? 'bg-green-500' :
                        port.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></span>
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      {port.type === 'fiber' ? (
                        <>
                          <Cable className="h-4 w-4 mr-1.5 text-blue-500" />
                          Fiber Optic
                        </>
                      ) : port.type === 'virtual' ? (
                        <>
                          <Circuit className="h-4 w-4 mr-1.5 text-purple-500" />
                          Virtual
                        </>
                      ) : (
                        <>
                          <Cable className="h-4 w-4 mr-1.5 text-amber-500" />
                          Copper
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Speed</p>
                    <p className="text-sm font-medium text-gray-900">{port.speed}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Module</p>
                    <p className="text-sm font-medium text-gray-900">{port.module || 'Standard'}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Slot/Position</p>
                    <p className="text-sm font-medium text-gray-900">
                      Slot {port.slot || '1'}, {port.position === 'front' ? 'Front' : 'Back'} Panel
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className={`text-sm font-medium ${
                      port.status === 'active' ? 'text-green-600' :
                      port.status === 'error' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {port.status === 'active' ? 'Active' :
                      port.status === 'error' ? 'Error' : 'Inactive'}
                    </p>
                  </div>
                </div>
                
                {/* Connected circuit info */}
                {port.connectedTo && (
                  <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                      <Circuit className="h-4 w-4 mr-1.5 text-blue-600" />
                      Connected Circuit
                    </h4>
                    
                    {circuits
                      .filter(c => 
                        (c.sourcePort === port.id || c.targetPort === port.id)
                      )
                      .map(circuit => {
                        const isSource = circuit.sourcePort === port.id;
                        const otherPortId = isSource ? circuit.targetPort : circuit.sourcePort;
                        const otherNodeId = otherPortId.split('-port-')[0];
                        const otherNode = nodes.find(n => n.id === otherNodeId);
                        
                        return (
                          <div key={circuit.id} className="flex items-center justify-between">
                            <div>
                              <div className="text-sm">{circuit.type} {circuit.capacity}</div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-1 ${
                                  circuit.status === 'active' ? 'bg-green-500' :
                                  circuit.status === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'
                                }`}></span>
                                {circuit.status === 'active' ? 'Active' :
                                circuit.status === 'degraded' ? 'Degraded' : 'Inactive'}
                                
                                {circuit.metrics && (
                                  <span className="ml-3 text-blue-600">
                                    {circuit.metrics.latency.toFixed(1)}ms, {circuit.metrics.loss.toFixed(2)}dB loss
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDevice(otherNodeId);
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                              type="button"
                            >
                              View {otherNode?.name || 'Other Device'} →
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex justify-between text-xs text-gray-600">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-amber-500 mr-1.5 rounded"></div>
            <span>Copper Port</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 mr-1.5 rounded"></div>
            <span>Fiber Port</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-500 mr-1.5 rounded"></div>
            <span>Virtual Port</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
            <span>Active</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
            <span>Error</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-gray-400 mr-1.5"></span>
            <span>Inactive</span>
          </div>
        </div>
      </div>
    </div>
  );
}
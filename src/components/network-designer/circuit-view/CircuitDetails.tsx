import { X, Cable, BrainCircuit as Circuit, ArrowRight, Activity, AlertTriangle, Settings } from 'lucide-react';

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

interface CircuitDetailsProps {
  port?: Port | null;
  circuit?: Circuit | null;
  onClose: () => void;
}

export function CircuitDetails({ port, circuit, onClose }: CircuitDetailsProps) {
  return (
    <div className="relative">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {port ? (
            <>
              <Cable className="h-5 w-5 mr-2 text-blue-600" />
              Port Details: {port.name}
            </>
          ) : circuit ? (
            <>
              <Circuit className="h-5 w-5 mr-2 text-purple-600" />
              Circuit Details: {circuit.capacity} {circuit.type}
            </>
          ) : (
            'Details'
          )}
        </h3>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-full hover:bg-gray-100"
          type="button"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Port Details */}
      {port && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Interface Type</p>
              <p className="text-sm font-medium text-gray-900 flex items-center">
                {port.type === 'fiber' ? (
                  <>
                    <Cable className="h-4 w-4 mr-1 text-blue-500" />
                    Fiber Optic
                  </>
                ) : port.type === 'virtual' ? (
                  <>
                    <Circuit className="h-4 w-4 mr-1 text-purple-500" />
                    Virtual
                  </>
                ) : (
                  <>
                    <Cable className="h-4 w-4 mr-1 text-amber-500" />
                    Copper
                  </>
                )}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Speed</p>
              <p className="text-sm font-medium text-gray-900">
                {port.speed}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className={`text-sm font-medium flex items-center ${
                port.status === 'active' ? 'text-green-600' :
                port.status === 'error' ? 'text-red-600' : 'text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${
                  port.status === 'active' ? 'bg-green-500' :
                  port.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></span>
                {port.status === 'active' ? 'Active' :
                 port.status === 'error' ? 'Error' : 'Inactive'}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Settings className="h-4 w-4 text-gray-500 mr-1.5" />
              Physical Configuration
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Connector Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {port.type === 'fiber' 
                    ? (port.speed.includes('100') ? 'QSFP28' : 'LC/UPC')
                    : port.type === 'copper' 
                      ? 'RJ45' 
                      : 'N/A'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Duplex Mode</p>
                <p className="text-sm font-medium text-gray-900">
                  {port.type === 'copper' && port.speed.includes('1') 
                    ? 'Auto-negotiation'
                    : 'Full Duplex'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Media Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {port.type === 'fiber' 
                    ? port.speed.includes('100') 
                      ? 'Single-mode Fiber'
                      : 'Multi-mode Fiber' 
                    : port.type === 'copper' 
                      ? 'Cat6A Twisted Pair'
                      : 'Virtual'
                  }
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Transceiver</p>
                <p className="text-sm font-medium text-gray-900">
                  {port.type === 'fiber'
                    ? port.speed.includes('100') 
                      ? 'QSFP28'
                      : port.speed.includes('10') 
                        ? 'SFP+'
                        : 'SFP'
                    : port.type === 'copper' 
                      ? 'Integrated PHY'
                      : 'Virtual NIC'
                  }
                </p>
              </div>
            </div>
          </div>

          {port.position && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Rack Location</h4>
              <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Physical Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {port.position === 'front' ? 'Front Panel' : 'Rear Panel'}, 
                    Slot {port.slot || 1}
                  </p>
                </div>
                <div className="px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-800">
                  {port.module}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Circuit Details */}
      {circuit && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Circuit Type</p>
              <p className="text-sm font-medium text-gray-900">
                {circuit.type === 'dark-fiber' ? 'Dark Fiber' :
                 circuit.type === 'wave' ? 'Wavelength' :
                 circuit.type === 'ethernet' ? 'Ethernet' : 'MPLS'}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Capacity</p>
              <p className="text-sm font-medium text-gray-900">
                {circuit.capacity}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className={`text-sm font-medium flex items-center ${
                circuit.status === 'active' ? 'text-green-600' :
                circuit.status === 'degraded' ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${
                  circuit.status === 'active' ? 'bg-green-500' :
                  circuit.status === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}></span>
                {circuit.status === 'active' ? 'Active' :
                 circuit.status === 'degraded' ? 'Degraded' : 'Inactive'}
              </p>
            </div>
          </div>
          
          {circuit.metrics && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Activity className="h-4 w-4 text-gray-500 mr-1.5" />
                Circuit Metrics
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Optical Power</p>
                    <p className={`text-xs font-medium ${
                      circuit.metrics.light < -20 ? 'text-red-600' :
                      circuit.metrics.light < -15 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {circuit.metrics.light.toFixed(1)} dBm
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        circuit.metrics.light < -20 ? 'bg-red-500' :
                        circuit.metrics.light < -15 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, (circuit.metrics.light + 30) * 5))}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Signal Loss</p>
                    <p className={`text-xs font-medium ${
                      circuit.metrics.loss > 1 ? 'text-red-600' :
                      circuit.metrics.loss > 0.5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {circuit.metrics.loss.toFixed(2)} dB
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        circuit.metrics.loss > 1 ? 'bg-red-500' :
                        circuit.metrics.loss > 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, circuit.metrics.loss * 50)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Latency</p>
                    <p className="text-xs font-medium text-blue-600">
                      {circuit.metrics.latency.toFixed(1)} ms
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, circuit.metrics.latency * 50)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Circuit Path</h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Source Port</p>
                  <p className="text-sm font-medium text-gray-900">
                    {circuit.sourcePort.split('-port-')[0]} - Port {circuit.sourcePort.split('-port-')[1]?.split('-')[0]}
                  </p>
                </div>
                
                <ArrowRight className="h-5 w-5 text-gray-400 mx-4 flex-shrink-0" />
                
                <div className="flex-1 text-right">
                  <p className="text-xs text-gray-500">Destination Port</p>
                  <p className="text-sm font-medium text-gray-900">
                    {circuit.targetPort.split('-port-')[0]} - Port {circuit.targetPort.split('-port-')[1]?.split('-')[0]}
                  </p>
                </div>
              </div>
              
              {/* Circuit monitoring visualization */}
              {circuit.status === 'active' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="relative h-12">
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-px bg-gray-300"></div>
                    
                    {/* Data flow animation */}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full">
                      <div className="animate-pulse flex items-center justify-between">
                        <Activity className="h-5 w-5 text-green-500" />
                        <div className="flex-1 mx-2 h-1 bg-green-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 animate-pulse"></div>
                        </div>
                        <Activity className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    
                    {circuit.status === 'degraded' && (
                      <div className="absolute right-4 bottom-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Specifications</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Transmission Medium</p>
                <p className="text-sm font-medium text-gray-900">
                  {circuit.type === 'dark-fiber' 
                    ? 'Single-mode Fiber' 
                    : circuit.type === 'wave' 
                      ? 'WDM Optical' 
                      : circuit.type === 'ethernet' 
                        ? 'Ethernet over Fiber' 
                        : 'MPLS over Fiber'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Protocol</p>
                <p className="text-sm font-medium text-gray-900">
                  {circuit.type === 'dark-fiber' 
                    ? 'None (Layer 1)' 
                    : circuit.type === 'wave' 
                      ? 'OTN' 
                      : circuit.type === 'ethernet' 
                        ? 'Ethernet (Layer 2)' 
                        : 'MPLS (Layer 2.5)'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Circuit Length</p>
                <p className="text-sm font-medium text-gray-900">
                  {Math.floor(Math.random() * 50) + 5} km
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Redundancy</p>
                <p className="text-sm font-medium text-gray-900">
                  {Math.random() > 0.5 ? 'Redundant Path Available' : 'Single Path'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
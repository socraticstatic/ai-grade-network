import { X, Server, Cable, Activity, Zap } from 'lucide-react';
import { NetworkNode } from '../../../types';
import { Port, Circuit } from '../CircuitTypes';
import { getNodeIcon } from '../../../../utils/nodeUtils';
import { resolveIcon } from '../../../../utils/iconRegistry';

interface RightDetailPanelProps {
  selectedDevice: NetworkNode | null;
  selectedPort: Port | null;
  selectedCircuit: Circuit | null;
  devicePorts: Record<string, Port[]>;
  circuits: Circuit[];
  nodes: NetworkNode[];
  onClose: () => void;
  onSelectDevice: (deviceId: string) => void;
  onSelectPort: (portId: string) => void;
}

export function RightDetailPanel({
  selectedDevice,
  selectedPort,
  selectedCircuit,
  devicePorts,
  circuits,
  nodes,
  onClose,
  onSelectDevice,
  onSelectPort
}: RightDetailPanelProps) {
  if (!selectedDevice && !selectedPort && !selectedCircuit) {
    return null;
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Details</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {selectedPort && renderPortDetails(selectedPort, selectedDevice, circuits, nodes, onSelectDevice)}
        {selectedCircuit && renderCircuitDetails(selectedCircuit, devicePorts, nodes, onSelectDevice)}
        {!selectedPort && !selectedCircuit && selectedDevice && renderDeviceDetails(selectedDevice, devicePorts, onSelectPort)}
      </div>
    </div>
  );
}

function renderDeviceDetails(device: NetworkNode, devicePorts: Record<string, Port[]>, onSelectPort: (portId: string) => void) {
  const IconComponent = resolveIcon(getNodeIcon(device.type, device.functionType, device.config?.networkType, device.config));
  const ports = devicePorts[device.id] || [];
  const activePorts = ports.filter(p => p.status === 'active');

  return (
    <>
      <div className="text-center pb-4 border-b border-gray-200">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-3">
          <IconComponent className="h-8 w-8 text-blue-600" />
        </div>
        <h4 className="text-xl font-semibold text-gray-900">{device.name}</h4>
        <p className="text-sm text-gray-500 mt-1">
          {device.type === 'function' && device.functionType
            ? device.functionType
            : device.type}
        </p>
      </div>

      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-3">Specifications</h5>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Type</span>
            <span className="text-sm font-medium text-gray-900">
              {device.type === 'function' && device.functionType ? device.functionType : device.type}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Form Factor</span>
            <span className="text-sm font-medium text-gray-900">
              {device.type === 'function'
                ? (device.functionType === 'Router' ? '2U Rack' : '1U Rack')
                : device.type === 'destination'
                  ? 'Cloud'
                  : '4U Rack'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Status</span>
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${
                device.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              <span className="text-sm font-medium text-gray-900">
                {device.status === 'active' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {device.config?.location && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Location</span>
              <span className="text-sm font-medium text-gray-900">{device.config.location}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Activity className="h-4 w-4 mr-1.5" />
          Port Summary
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{ports.length}</div>
            <div className="text-xs text-blue-700">Total Ports</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-600">{activePorts.length}</div>
            <div className="text-xs text-green-700">Active</div>
          </div>
        </div>
      </div>

      {ports.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">Ports</h5>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {ports.slice(0, 20).map(port => (
              <button
                key={port.id}
                onClick={() => onSelectPort(port.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                type="button"
              >
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    port.status === 'active' ? 'bg-green-500' :
                    port.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{port.name}</div>
                    <div className="text-xs text-gray-500">{port.type} - {port.speed}</div>
                  </div>
                </div>
                <Cable className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function renderPortDetails(port: Port, selectedDevice: NetworkNode | null, circuits: Circuit[], nodes: NetworkNode[], onSelectDevice: (deviceId: string) => void) {
  const relatedCircuits = circuits.filter(c =>
    c.sourcePort === port.id || c.targetPort === port.id
  );

  return (
    <>
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold text-gray-900">Port Information</h4>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            port.status === 'active' ? 'bg-green-100 text-green-700' :
            port.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {port.status === 'active' ? 'Active' : port.status === 'error' ? 'Error' : 'Inactive'}
          </div>
        </div>
        <p className="text-sm text-gray-600">{selectedDevice?.name}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Interface</span>
          <span className="text-sm font-medium text-gray-900">{port.name}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Type</span>
          <span className="text-sm font-medium text-gray-900 capitalize">{port.type}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Speed</span>
          <span className="text-sm font-medium text-gray-900">{port.speed}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Module</span>
          <span className="text-sm font-medium text-gray-900">{port.module || 'Standard'}</span>
        </div>
        {port.slot && (
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Location</span>
            <span className="text-sm font-medium text-gray-900">
              Slot {port.slot}, {port.position === 'front' ? 'Front' : 'Back'} Panel
            </span>
          </div>
        )}
      </div>

      {relatedCircuits.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-1.5" />
            Connected Circuits
          </h5>
          <div className="space-y-2">
            {relatedCircuits.map(circuit => {
              const isSource = circuit.sourcePort === port.id;
              const otherPortId = isSource ? circuit.targetPort : circuit.sourcePort;
              const otherNodeId = otherPortId.split('-port-')[0];
              const otherNode = nodes.find(n => n.id === otherNodeId);

              return (
                <div key={circuit.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{circuit.type}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      circuit.status === 'active' ? 'bg-green-500' :
                      circuit.status === 'degraded' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">{circuit.capacity}</div>
                  {circuit.metrics && (
                    <div className="text-xs text-blue-600 space-y-1">
                      <div>Latency: {circuit.metrics.latency.toFixed(1)}ms</div>
                      <div>Loss: {circuit.metrics.loss.toFixed(2)}dB</div>
                      <div>Light Level: {circuit.metrics.light.toFixed(1)}dBm</div>
                    </div>
                  )}
                  {otherNode && (
                    <button
                      onClick={() => onSelectDevice(otherNodeId)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      type="button"
                    >
                      View {otherNode.name} →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function renderCircuitDetails(circuit: Circuit, devicePorts: Record<string, Port[]>, nodes: NetworkNode[], onSelectDevice: (deviceId: string) => void) {
  const sourceNodeId = circuit.sourcePort.split('-port-')[0];
  const targetNodeId = circuit.targetPort.split('-port-')[0];
  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  const targetNode = nodes.find(n => n.id === targetNodeId);

  return (
    <>
      <div className="pb-4 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">Circuit Information</h4>
        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
          circuit.status === 'active' ? 'bg-green-100 text-green-700' :
          circuit.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {circuit.status === 'active' ? 'Active' : circuit.status === 'degraded' ? 'Degraded' : 'Inactive'}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Type</span>
          <span className="text-sm font-medium text-gray-900 capitalize">{circuit.type}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Capacity</span>
          <span className="text-sm font-medium text-gray-900">{circuit.capacity}</span>
        </div>
      </div>

      {circuit.metrics && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Activity className="h-4 w-4 mr-1.5" />
            Performance Metrics
          </h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Latency</span>
              <span className="text-sm font-medium text-gray-900">{circuit.metrics.latency.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Loss</span>
              <span className="text-sm font-medium text-gray-900">{circuit.metrics.loss.toFixed(2)}dB</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Light Level</span>
              <span className="text-sm font-medium text-gray-900">{circuit.metrics.light.toFixed(2)}dBm</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h5 className="text-sm font-medium text-gray-700 mb-3">Connected Devices</h5>
        <div className="space-y-2">
          {sourceNode && (
            <button
              onClick={() => onSelectDevice(sourceNodeId)}
              className="w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left border border-blue-100"
              type="button"
            >
              <div className="text-sm font-medium text-gray-900">{sourceNode.name}</div>
              <div className="text-xs text-gray-500">Source</div>
            </button>
          )}
          {targetNode && (
            <button
              onClick={() => onSelectDevice(targetNodeId)}
              className="w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left border border-blue-100"
              type="button"
            >
              <div className="text-sm font-medium text-gray-900">{targetNode.name}</div>
              <div className="text-xs text-gray-500">Target</div>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

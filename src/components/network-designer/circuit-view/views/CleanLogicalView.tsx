import { useState } from 'react';
import { Network, ArrowRight } from 'lucide-react';
import { NetworkNode } from '../../../types';
import { Circuit, Port } from '../CircuitTypes';
import { getNodeIcon } from '../../../../utils/nodeUtils';
import { resolveIcon } from '../../../../utils/iconRegistry';

interface CleanLogicalViewProps {
  nodes: NetworkNode[];
  circuits: Circuit[];
  devicePorts: Record<string, Port[]>;
  selectedDevice: string | null;
  onSelectDevice: (deviceId: string) => void;
}

export function CleanLogicalView({
  nodes,
  circuits,
  devicePorts,
  selectedDevice,
  onSelectDevice
}: CleanLogicalViewProps) {
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

  const cloudNodes = nodes.filter(n => n.type === 'destination');
  const networkNodes = nodes.filter(n => n.type === 'network');
  const functionNodes = nodes.filter(n => n.type === 'function');

  const getDeviceStats = (nodeId: string) => {
    const ports = devicePorts[nodeId] || [];
    const activePorts = ports.filter(p => p.status === 'active').length;
    const connectedCircuits = circuits.filter(c =>
      c.sourcePort.startsWith(nodeId) || c.targetPort.startsWith(nodeId)
    );
    const activeCircuits = connectedCircuits.filter(c => c.status === 'active').length;
    return {
      totalPorts: ports.length,
      activePorts,
      totalCircuits: connectedCircuits.length,
      activeCircuits
    };
  };

  const getConnectedDevices = (nodeId: string) => {
    const connected = new Set<string>();
    circuits.forEach(c => {
      const sourceId = c.sourcePort.split('-port-')[0];
      const targetId = c.targetPort.split('-port-')[0];
      if (sourceId === nodeId) connected.add(targetId);
      if (targetId === nodeId) connected.add(sourceId);
    });
    return Array.from(connected);
  };

  const isConnected = (nodeId: string, otherNodeId: string) => {
    const connectedIds = getConnectedDevices(nodeId);
    return connectedIds.includes(otherNodeId);
  };

  const renderDeviceCard = (node: NetworkNode) => {
    const IconComponent = resolveIcon(getNodeIcon(node.type, node.functionType, node.config?.networkType, node.config));
    const stats = getDeviceStats(node.id);
    const isSelected = selectedDevice === node.id;
    const isHovered = hoveredDevice === node.id;
    const isHighlighted = (selectedDevice && isConnected(node.id, selectedDevice)) ||
                         (hoveredDevice && isConnected(node.id, hoveredDevice));

    return (
      <button
        key={node.id}
        onClick={() => onSelectDevice(node.id)}
        onMouseEnter={() => setHoveredDevice(node.id)}
        onMouseLeave={() => setHoveredDevice(null)}
        className={`bg-white rounded-xl p-5 shadow-sm border-2 transition-all hover:shadow-md ${
          isSelected
            ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
            : isHighlighted
              ? 'border-blue-300 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
        }`}
        type="button"
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${
            node.type === 'destination' ? 'bg-blue-50' :
            node.type === 'network' ? 'bg-green-50' :
            'bg-gray-50'
          }`}>
            <IconComponent className={`h-6 w-6 ${
              node.type === 'destination' ? 'text-blue-600' :
              node.type === 'network' ? 'text-green-600' :
              'text-gray-700'
            }`} />
          </div>

          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-gray-900 truncate">{node.name}</h4>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${
                node.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>

            <p className="text-xs text-gray-500 mb-3 truncate">
              {node.type === 'function' && node.functionType
                ? node.functionType
                : node.type === 'destination'
                  ? `${node.config?.provider || 'Cloud'} - ${node.config?.region || 'Region'}`
                  : node.type}
            </p>

            {node.type !== 'destination' && (
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></div>
                  <span>{stats.activePorts}/{stats.totalPorts} ports</span>
                </div>
                {stats.totalCircuits > 0 && (
                  <div className="flex items-center">
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      stats.activeCircuits > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stats.activeCircuits}/{stats.totalCircuits} circuits
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  const getConnectionsBetweenNodes = (node1: NetworkNode, node2: NetworkNode) => {
    return circuits.filter(c => {
      const sourceId = c.sourcePort.split('-port-')[0];
      const targetId = c.targetPort.split('-port-')[0];
      return (sourceId === node1.id && targetId === node2.id) ||
             (targetId === node1.id && sourceId === node2.id);
    });
  };

  const renderConnectionSection = () => {
    if (!selectedDevice) return null;

    const connectedDeviceIds = getConnectedDevices(selectedDevice);
    if (connectedDeviceIds.length === 0) return null;

    const selectedNode = nodes.find(n => n.id === selectedDevice);
    if (!selectedNode) return null;

    return (
      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center mb-4">
          <Network className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-sm font-semibold text-gray-900">
            Connections for {selectedNode.name}
          </h3>
        </div>

        <div className="space-y-2">
          {connectedDeviceIds.map(connectedId => {
            const connectedNode = nodes.find(n => n.id === connectedId);
            if (!connectedNode) return null;

            const connections = getConnectionsBetweenNodes(selectedNode, connectedNode);
            const activeConnections = connections.filter(c => c.status === 'active').length;

            return (
              <button
                key={connectedId}
                onClick={() => onSelectDevice(connectedId)}
                onMouseEnter={() => setHoveredDevice(connectedId)}
                onMouseLeave={() => setHoveredDevice(null)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-blue-100"
                type="button"
              >
                <div className="flex items-center space-x-3">
                  <ArrowRight className="h-4 w-4 text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{connectedNode.name}</div>
                    <div className="text-xs text-gray-500">
                      {connectedNode.type === 'function' && connectedNode.functionType
                        ? connectedNode.functionType
                        : connectedNode.type}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  activeConnections > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {activeConnections}/{connections.length} active
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="space-y-8">
        {cloudNodes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Cloud Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cloudNodes.map(renderDeviceCard)}
            </div>
          </div>
        )}

        {networkNodes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Network Devices
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networkNodes.map(renderDeviceCard)}
            </div>
          </div>
        )}

        {functionNodes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Functions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {functionNodes.map(renderDeviceCard)}
            </div>
          </div>
        )}

        {renderConnectionSection()}
      </div>
    </div>
  );
}

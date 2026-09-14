import { FloatingPanel } from './FloatingPanel';
import { NetworkEdge, NetworkNode } from '../types';

interface EdgeConfigPanelProps {
  edge: NetworkEdge | null;
  nodes: NetworkNode[];
  isVisible: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<NetworkEdge>) => void;
  onDelete: () => void;
  hubRef: React.RefObject<HTMLElement>;
}

export function EdgeConfigPanel({
  edge,
  nodes,
  isVisible,
  onClose,
  onUpdate,
  onDelete,
  hubRef
}: EdgeConfigPanelProps) {
  if (!edge) return null;

  // Find the source and target nodes to determine position
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  // Calculate middle point between source and target for panel positioning
  const midX = (sourceNode.x + targetNode.x) / 2;
  const midY = (sourceNode.y + targetNode.y) / 2;

  // Helper function to update edge configuration
  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      config: {
        ...edge.config,
        [key]: value
      }
    });
  };

  return (
    <FloatingPanel
      title="Connection Configuration"
      isVisible={isVisible}
      onClose={onClose}
      anchorPosition={{ x: midX, y: midY }}
      hubRef={hubRef}
    >
      <div className="overflow-y-auto custom-scrollbar">
        <div className="form-group">
          <label htmlFor="connectionType">Connection Type</label>
          <select
            id="connectionType"
            value={edge.type}
            onChange={(e) => onUpdate({ type: e.target.value })}
            className="form-select"
          >
            <option value="Internet to Cloud">Internet to Cloud</option>
            <option value="Cloud to Cloud">Cloud to Cloud</option>
            <option value="Direct Connect">Interconnect – last mile (AWS)</option>
            <option value="ExpressRoute">ExpressRoute (Azure)</option>
            <option value="Cloud Interconnect">Cloud Interconnect (GCP)</option>
            <option value="FastConnect">FastConnect (Oracle)</option>
            <option value="MPLS">MPLS</option>
            <option value="SD-WAN">SD-WAN</option>
            <option value="VPN">VPN</option>
            <option value="AVPN">AVPN</option>
            <option value="Internet Direct">Internet Direct</option>
            <option value="Site to Cloud">Site to Cloud</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="bandwidth">Bandwidth</label>
          <select
            id="bandwidth"
            value={edge.bandwidth}
            onChange={(e) => onUpdate({ bandwidth: e.target.value })}
            className="form-select"
          >
            <option value="50 Mbps">50 Mbps</option>
            <option value="100 Mbps">100 Mbps</option>
            <option value="500 Mbps">500 Mbps</option>
            <option value="1 Gbps">1 Gbps</option>
            <option value="2 Gbps">2 Gbps</option>
            <option value="5 Gbps">5 Gbps</option>
            <option value="10 Gbps">10 Gbps</option>
            <option value="100 Gbps">100 Gbps</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="resilience">Connection Resilience</label>
          <select
            id="resilience"
            value={edge.config?.resilience || 'single'}
            onChange={(e) => handleConfigChange('resilience', e.target.value)}
            className="form-select"
          >
            <option value="single">Single Connection</option>
            <option value="redundant">Redundant</option>
            <option value="ha">High Availability</option>
            <option value="dualdiverse">Dual-Diverse</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Higher resilience levels provide better protection against failures
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="recoveryTime">Recovery Time Objective</label>
          <select
            id="recoveryTime"
            value={edge.config?.recoveryTime || 'standard'}
            onChange={(e) => handleConfigChange('recoveryTime', e.target.value)}
            className="form-select"
          >
            <option value="standard">Standard (Minutes)</option>
            <option value="fast">Fast (Seconds)</option>
            <option value="ultrafast">Ultra Fast (&lt;50ms)</option>
            <option value="none">None</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            How quickly service should be restored after a failure
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="vlanId">VLAN ID</label>
          <input
            id="vlanId"
            type="number"
            value={edge.vlan || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 4094) {
                onUpdate({ vlan: val });
              }
            }}
            placeholder="1-4094"
            min="1"
            max="4094"
            className="form-input"
          />
        </div>

        <div className="toggle-group">
          <input
            id="encrypted"
            type="checkbox"
            checked={edge.config?.encrypted || false}
            onChange={(e) => handleConfigChange('encrypted', e.target.checked)}
            className="toggle-input"
          />
          <label htmlFor="encrypted" className="toggle-label">
            <span className="toggle-text">Enable Encryption</span>
          </label>
        </div>
        
        <div className="toggle-group">
          <input
            id="bfd"
            type="checkbox"
            checked={edge.config?.bfd || false}
            onChange={(e) => handleConfigChange('bfd', e.target.checked)}
            className="toggle-input"
          />
          <label htmlFor="bfd" className="toggle-label">
            <span className="toggle-text">Enable BFD (Fast Failure Detection)</span>
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="qosProfile">QoS Profile</label>
          <select
            id="qosProfile"
            value={edge.config?.qosProfile || 'besteffort'}
            onChange={(e) => handleConfigChange('qosProfile', e.target.value)}
            className="form-select"
          >
            <option value="besteffort">Best Effort</option>
            <option value="voice">Voice</option>
            <option value="video">Video</option>
            <option value="critical">Mission Critical</option>
            <option value="bulk">Bulk Data</option>
          </select>
        </div>

        <div className="toggle-group">
          <input
            id="status"
            type="checkbox"
            checked={edge.status === 'active'}
            onChange={(e) => onUpdate({
              status: e.target.checked ? 'active' : 'inactive'
            })}
            className="toggle-input"
          />
          <label htmlFor="status" className="toggle-label">
            <span className="toggle-text">Connection Active</span>
          </label>
        </div>

        {edge.metrics && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(edge.metrics).map(([key, value]) => (
                <div key={key} className="flex flex-col bg-white p-2 rounded border border-gray-200">
                  <span className="text-xs text-gray-500 capitalize">{key}</span>
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Button */}
        <div className="pt-4 border-t border-gray-200 mt-4 sticky bottom-0 bg-white">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              onClose();
            }}
            className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
            type="button"
          >
            Delete Connection
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
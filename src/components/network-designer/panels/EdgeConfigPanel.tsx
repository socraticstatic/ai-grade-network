import { useMemo } from 'react';
import type { NetworkEdge } from '../types/designer';
import { EDGE_TYPE_OPTIONS, BANDWIDTH_OPTIONS } from '../constants/edgeTypes';
import { FloatingPanel } from './FloatingPanel';
import { useDesignerStore } from '../store/useDesignerStore';

interface EdgeConfigPanelProps {
  edge: NetworkEdge;
  onUpdate: (id: string, updates: Partial<NetworkEdge>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const FIELD_CLASS = 'h-9 px-3 rounded-lg border border-fw-secondary text-figma-base bg-fw-base w-full focus:outline-none focus:border-fw-link disabled:opacity-60 disabled:cursor-not-allowed';
const SELECT_CLASS = 'h-9 px-3 rounded-lg border border-fw-secondary text-figma-base bg-fw-base w-full focus:outline-none focus:border-fw-link disabled:opacity-60 disabled:cursor-not-allowed';
const LABEL_CLASS = 'block text-figma-sm text-fw-bodyLight mb-1';

const ALL_RESILIENCE_OPTIONS = [
  { value: 'single', label: 'Single Connection', minTier: 'standard' },
  { value: 'redundant', label: 'Redundant', minTier: 'standard' },
  { value: 'ha', label: 'High Availability', minTier: 'maximum' },
  { value: 'dual-diverse', label: 'Dual-Diverse', minTier: 'geodiversity' },
] as const;

const RTO_OPTIONS = [
  { value: 'standard', label: 'Standard (Minutes)' },
  { value: 'fast', label: 'Fast (Seconds)' },
  { value: 'immediate', label: 'Immediate (Subsecond)' },
] as const;

const TIER_RANK: Record<string, number> = { standard: 0, maximum: 1, geodiversity: 2 };

export function EdgeConfigPanel({ edge, onUpdate, onDelete, onClose, readOnly = false }: EdgeConfigPanelProps) {
  const resiliencyTier = useDesignerStore(s => s.resiliencyTier);

  const RESILIENCE_OPTIONS = useMemo(() => {
    const rank = TIER_RANK[resiliencyTier || 'standard'] ?? 0;
    return ALL_RESILIENCE_OPTIONS.map(opt => ({
      ...opt,
      recommended: opt.minTier === (resiliencyTier || 'standard'),
      disabled: TIER_RANK[opt.minTier] > rank,
    }));
  }, [resiliencyTier]);
  const updateConfig = (key: string, value: unknown) => {
    onUpdate(edge.id, { config: { ...edge.config, [key]: value } });
  };

  return (
    <FloatingPanel
      isOpen={true}
      onClose={onClose}
      title="Connection Configuration"
      onDelete={onDelete ? () => onDelete(edge.id) : undefined}
      deleteLabel="Delete connection"
      assetName={`${edge.type} (${edge.bandwidth})`}
    >
      <div className="space-y-4">
        {/* Connection Type */}
        <div>
          <label className={LABEL_CLASS}>Connection Type</label>
          <select
            className={SELECT_CLASS}
            value={edge.type}
            disabled={readOnly}
            onChange={(e) => onUpdate(edge.id, { type: e.target.value })}
          >
            {EDGE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Bandwidth */}
        <div>
          <label className={LABEL_CLASS}>Bandwidth</label>
          <select
            className={SELECT_CLASS}
            value={edge.bandwidth}
            disabled={readOnly}
            onChange={(e) => onUpdate(edge.id, { bandwidth: e.target.value })}
          >
            {BANDWIDTH_OPTIONS.map((bw) => (
              <option key={bw} value={bw}>{bw}</option>
            ))}
          </select>
        </div>

        {/* Resilience */}
        <div>
          <label className={LABEL_CLASS}>Resilience</label>
          <select
            className={SELECT_CLASS}
            value={edge.config?.resilience || 'single'}
            disabled={readOnly}
            onChange={(e) =>
              updateConfig('resilience', e.target.value as 'single' | 'redundant' | 'ha' | 'dual-diverse')
            }
          >
            {RESILIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}{opt.recommended ? ' (Recommended)' : ''}{opt.disabled ? ' (Higher tier required)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Recovery Time Objective */}
        <div>
          <label className={LABEL_CLASS}>Recovery Time Objective</label>
          <select
            className={SELECT_CLASS}
            value={edge.config?.rto || 'standard'}
            disabled={readOnly}
            onChange={(e) => updateConfig('rto', e.target.value)}
          >
            {RTO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-figma-xs text-fw-bodyLight mt-1">How quickly service should be restored after a failure</p>
        </div>

        {/* VLAN ID */}
        <div>
          <label className={LABEL_CLASS}>VLAN ID</label>
          <input
            type="number"
            className={FIELD_CLASS}
            placeholder="1-4094"
            value={edge.vlan ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              onUpdate(edge.id, { vlan: e.target.value ? parseInt(e.target.value, 10) : undefined })
            }
          />
        </div>

        {/* Encryption Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-figma-sm text-fw-body">Enable Encryption</span>
          <button
            onClick={() => updateConfig('encrypted', !edge.config?.encrypted)}
            disabled={readOnly}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              edge.config?.encrypted ? 'bg-fw-primary' : 'bg-fw-secondary'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                edge.config?.encrypted ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* BFD Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-figma-sm text-fw-body">Enable BFD (Fast Failure Detection)</span>
          <button
            onClick={() => updateConfig('bfd', !edge.config?.bfd)}
            disabled={readOnly}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              edge.config?.bfd ? 'bg-fw-primary' : 'bg-fw-secondary'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                edge.config?.bfd ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* QoS Profile */}
        <div>
          <label className={LABEL_CLASS}>QoS Profile</label>
          <select
            className={SELECT_CLASS}
            value={edge.config?.qosProfile || 'best-effort'}
            disabled={readOnly}
            onChange={(e) => updateConfig('qosProfile', e.target.value)}
          >
            <option value="best-effort">Best Effort</option>
            <option value="voice">Voice</option>
            <option value="video">Video</option>
            <option value="critical">Critical</option>
            <option value="bulk">Bulk</option>
          </select>
        </div>

        {/* Connection Active Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-figma-sm text-fw-body">Connection Active</span>
          <button
            onClick={() =>
              onUpdate(edge.id, { status: edge.status === 'active' ? 'inactive' : 'active' })
            }
            disabled={readOnly}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              edge.status === 'active' ? 'bg-fw-primary' : 'bg-fw-secondary'
            } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                edge.status === 'active' ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Metrics (read-only, mock) */}
        <div className="rounded-lg border border-fw-secondary p-3 bg-fw-wash space-y-2">
          <span className="text-figma-sm font-medium text-fw-heading block mb-2">Live Metrics</span>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Latency</span>
            <span className="text-fw-body font-medium">4.2 ms</span>
          </div>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Throughput</span>
            <span className="text-fw-body font-medium">8.7 Gbps</span>
          </div>
          <div className="flex justify-between text-figma-sm">
            <span className="text-fw-bodyLight">Packet Loss</span>
            <span className="text-fw-body font-medium">0.001%</span>
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

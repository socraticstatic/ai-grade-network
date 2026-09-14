import { useState } from 'react';
import type { NetworkNode } from '../types/designer';
import { FloatingPanel } from './FloatingPanel';

interface NodeConfigPanelProps {
  node: NetworkNode;
  onUpdate: (id: string, updates: Partial<NetworkNode>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

type Tab = 'overview' | 'routing' | 'security' | 'performance';

const FIELD_CLASS = 'h-9 px-3 rounded-lg border border-fw-secondary text-figma-base bg-fw-base w-full focus:outline-none focus:border-fw-link disabled:opacity-60 disabled:cursor-not-allowed';
const SELECT_CLASS = 'h-9 px-3 rounded-lg border border-fw-secondary text-figma-base bg-fw-base w-full focus:outline-none focus:border-fw-link disabled:opacity-60 disabled:cursor-not-allowed';
const LABEL_CLASS = 'block text-figma-sm text-fw-bodyLight mb-1';

function showRoutingTab(node: NetworkNode) {
  return ['router', 'vnf', 'sdwan'].includes(node.functionType);
}

function showSecurityTab(node: NetworkNode) {
  return ['firewall', 'vnf'].includes(node.functionType);
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose, readOnly = false }: NodeConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, { config: { ...node.config, [key]: value } });
  };

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'routing', label: 'Routing', show: showRoutingTab(node) },
    { id: 'security', label: 'Security', show: showSecurityTab(node) },
    { id: 'performance', label: 'Performance', show: true },
  ].filter((t) => t.show);

  return (
    <FloatingPanel
      isOpen={true}
      onClose={onClose}
      title={node.name}
      onDelete={onDelete ? () => onDelete(node.id) : undefined}
      deleteLabel="Delete node"
      assetName={node.name}
    >
      {/* Tabs */}
      <fieldset disabled={readOnly} className={readOnly ? 'opacity-80' : ''}>
      <div className="flex gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-figma-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-fw-wash text-fw-heading'
                : 'text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Name</label>
            <input
              type="text"
              className={FIELD_CLASS}
              value={node.name}
              onChange={(e) => onUpdate(node.id, { name: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={LABEL_CLASS}>Type</label>
              <div className="text-figma-sm text-fw-body">
                {node.type}
              </div>
            </div>
            {node.subType && (
              <div className="flex-1">
                <label className={LABEL_CLASS}>SubType</label>
                <div className="text-figma-sm text-fw-body">
                  {node.subType}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Location</label>
            <input
              type="text"
              className={FIELD_CLASS}
              placeholder="e.g., Dallas, TX"
              value={node.config?.location || ''}
              onChange={(e) => updateConfig('location', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-figma-sm text-fw-bodyLight">Status</span>
            <button
              onClick={() =>
                onUpdate(node.id, { status: node.status === 'active' ? 'inactive' : 'active' })
              }
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                node.status === 'active' ? 'bg-fw-primary' : 'bg-fw-secondary'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  node.status === 'active' ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Routing Tab */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>ASN</label>
            <input
              type="number"
              className={FIELD_CLASS}
              value={node.config?.asn || ''}
              onChange={(e) => updateConfig('asn', e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>BGP Neighbor</label>
            <input
              type="text"
              className={FIELD_CLASS}
              value={node.config?.bgpNeighbor || ''}
              onChange={(e) => updateConfig('bgpNeighbor', e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Routing Protocol</label>
            <select
              className={SELECT_CLASS}
              value={node.config?.routingProtocol || 'BGP'}
              onChange={(e) => updateConfig('routingProtocol', e.target.value)}
            >
              {['BGP', 'OSPF', 'EIGRP', 'IS-IS', 'Static'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-figma-sm text-fw-bodyLight">BFD</span>
            <button
              onClick={() => updateConfig('bfd', !node.config?.bfd)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                node.config?.bfd ? 'bg-fw-primary' : 'bg-fw-secondary'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  node.config?.bfd ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-figma-sm text-fw-bodyLight">Encryption</span>
            <button
              onClick={() => updateConfig('encrypted', !node.config?.encrypted)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                node.config?.encrypted ? 'bg-fw-primary' : 'bg-fw-secondary'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  node.config?.encrypted ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-figma-sm text-fw-bodyLight">DDoS Protection</span>
            <button
              onClick={() => updateConfig('ddosProtection', !node.config?.ddosProtection)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                node.config?.ddosProtection ? 'bg-fw-primary' : 'bg-fw-secondary'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  node.config?.ddosProtection ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className={LABEL_CLASS}>Inspection Mode</label>
            <select
              className={SELECT_CLASS}
              value={node.config?.inspectionMode || 'Transparent'}
              onChange={(e) => updateConfig('inspectionMode', e.target.value)}
            >
              {['Transparent', 'Routed', 'TAP'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Latency Target</label>
            <input
              type="text"
              className={FIELD_CLASS}
              placeholder="e.g., < 10ms"
              value={node.config?.latencyTarget || ''}
              onChange={(e) => updateConfig('latencyTarget', e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>QoS Profile</label>
            <select
              className={SELECT_CLASS}
              value={node.config?.qosProfile || 'Best Effort'}
              onChange={(e) => updateConfig('qosProfile', e.target.value)}
            >
              {['Best Effort', 'Voice', 'Video', 'Critical', 'Bulk'].map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Bandwidth Allocation</label>
            <input
              type="text"
              className={FIELD_CLASS}
              value={node.config?.bandwidthAllocation || ''}
              onChange={(e) => updateConfig('bandwidthAllocation', e.target.value)}
            />
          </div>
        </div>
      )}
      </fieldset>
    </FloatingPanel>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Activity,
  Settings,
  Network,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MetricCard } from '../common/MetricCard';
import { getVNFTypeIcon, getVNFTypeInfo } from '../../utils/vnfTypes';

export function VNFDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'performance'>('overview');
  const [vnf, setVNF] = useState<any>(null);
  const [parentConnection, setParentConnection] = useState<any>(null);

  useEffect(() => {
    setVNF({
      id,
      name: 'Edge Firewall',
      type: 'firewall',
      vendor: 'Palo Alto Networks',
      model: 'VM-Series',
      version: '10.2.3',
      status: 'active',
      throughput: '5 Gbps',
      licenseExpiry: '2025-06-30T00:00:00Z',
      description: 'Primary edge firewall for cloud connectivity',
      connectionId: 'conn-1',
      hubId: 'router-1',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'WAN1', type: 'wan', ipAddress: '203.0.113.10', status: 'up' },
          { id: 'if-2', name: 'LAN1', type: 'lan', ipAddress: '10.0.0.1', status: 'up' }
        ],
        routingProtocols: ['BGP', 'OSPF'],
        highAvailability: true,
        managementIP: '192.168.1.10'
      },
      performance: {
        cpuUsage: 45,
        memoryUsage: 62,
        activeSessions: 1250,
        maxSessions: 5000,
        throughput: '3.2 Gbps',
        latency: '2ms'
      },
      createdAt: '2024-01-10T12:00:00Z'
    });
  }, [id]);

  if (!vnf) {
    return null;
  }

  const vnfTypeInfo = getVNFTypeInfo(vnf.type);
  const VNFIcon = getVNFTypeIcon(vnf.type);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    navigate('/connections');
    window.addToast({
      type: 'success',
      title: 'VNF Deleted',
      message: 'VNF has been successfully deleted.',
      duration: 3000
    });
  };

  return (
    <div className="min-h-screen bg-fw-wash">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-figma-sm font-medium text-fw-bodyLight hover:text-fw-heading mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <VNFIcon className="h-8 w-8 text-fw-link" />
                <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">{vnf.name}</h1>
              </div>
              {vnf.description && (
                <p className="mt-2 text-figma-base font-medium text-fw-body">{vnf.description}</p>
              )}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <StatusBadge
                  status={vnf.status}
                  label={vnf.status.charAt(0).toUpperCase() + vnf.status.slice(1)}
                />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-accent text-fw-link">
                  {vnfTypeInfo.label}
                </span>
                <span className="text-figma-sm font-medium text-fw-bodyLight">Vendor: {vnf.vendor}</span>
                {vnf.model && <span className="text-figma-sm font-medium text-fw-bodyLight">Model: {vnf.model}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <IconButton
                icon={Edit2}
                label="Edit VNF"
                onClick={() => window.addToast?.({ type: 'info', title: 'Edit VNF', message: 'VNF editing is available in the full product.', duration: 3000 })}
              />
              <IconButton
                icon={Trash2}
                label="Delete VNF"
                onClick={() => setShowDeleteConfirm(true)}
                variant="danger"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="CPU Usage"
            value={`${vnf.performance?.cpuUsage || 0}%`}
            icon={Activity}
            trend={{
              value: vnf.performance?.cpuUsage > 75 ? 'High' : 'Normal',
              isPositive: vnf.performance?.cpuUsage <= 75
            }}
          />
          <MetricCard
            title="Memory Usage"
            value={`${vnf.performance?.memoryUsage || 0}%`}
            icon={Activity}
          />
          <MetricCard
            title="Active Sessions"
            value={vnf.performance?.activeSessions?.toLocaleString() || '0'}
            icon={Network}
            trend={vnf.performance?.maxSessions ? {
              value: `of ${vnf.performance.maxSessions.toLocaleString()}`,
              isPositive: true
            } : undefined}
          />
          <MetricCard
            title="Throughput"
            value={vnf.performance?.throughput || 'N/A'}
            icon={Activity}
          />
        </div>

        <div className="mb-6">
          <div className="border-b border-fw-secondary">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Settings },
                { id: 'configuration', label: 'Configuration', icon: Settings },
                { id: 'performance', label: 'Performance', icon: Activity }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-figma-base no-rounded tracking-[-0.03em]
                    ${activeTab === tab.id
                      ? 'border-fw-active text-fw-link'
                      : 'border-transparent text-fw-bodyLight hover:text-fw-body hover:border-fw-secondary'
                    }
                  `}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">VNF Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">VNF ID</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading font-mono">{vnf.id}</dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Type</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading">{vnfTypeInfo.label}</dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Vendor</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading">{vnf.vendor}</dd>
                  </div>
                  {vnf.model && (
                    <div>
                      <dt className="text-figma-sm font-medium text-fw-bodyLight">Model</dt>
                      <dd className="mt-1 text-figma-base font-medium text-fw-heading">{vnf.model}</dd>
                    </div>
                  )}
                  {vnf.version && (
                    <div>
                      <dt className="text-figma-sm font-medium text-fw-bodyLight">Version</dt>
                      <dd className="mt-1 text-figma-base font-medium text-fw-heading">{vnf.version}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Throughput Capacity</dt>
                    <dd className="mt-1 text-figma-base font-medium text-fw-heading">{vnf.throughput}</dd>
                  </div>
                  {vnf.licenseExpiry && (
                    <div>
                      <dt className="text-figma-sm font-medium text-fw-bodyLight">License Expiry</dt>
                      <dd className="mt-1 text-figma-base font-medium text-fw-heading">
                        {new Date(vnf.licenseExpiry).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Status</dt>
                    <dd className="mt-1">
                      <StatusBadge
                        status={vnf.status}
                        label={vnf.status.charAt(0).toUpperCase() + vnf.status.slice(1)}
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {vnfTypeInfo.commonFeatures.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-figma-sm font-medium bg-fw-accent text-fw-link"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="space-y-6">
            {vnf.configuration?.interfaces && (
              <Card>
                <div className="p-6">
                  <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Network Interfaces</h3>
                  <div className="space-y-4">
                    {vnf.configuration.interfaces.map((iface: any) => (
                      <div key={iface.id} className="border border-fw-secondary rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-fw-heading">{iface.name}</h4>
                          <StatusBadge
                            status={iface.status === 'up' ? 'active' : 'inactive'}
                            label={iface.status.toUpperCase()}
                          />
                        </div>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-figma-sm font-medium text-fw-bodyLight">Type</dt>
                            <dd className="mt-1 text-figma-base font-medium text-fw-heading uppercase">{iface.type}</dd>
                          </div>
                          {iface.ipAddress && (
                            <div>
                              <dt className="text-figma-sm font-medium text-fw-bodyLight">IP Address</dt>
                              <dd className="mt-1 text-figma-base font-medium text-fw-heading font-mono">{iface.ipAddress}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <div className="p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Settings</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vnf.configuration?.managementIP && (
                    <div>
                      <dt className="text-figma-sm font-medium text-fw-bodyLight">Management IP</dt>
                      <dd className="mt-1 text-figma-base font-medium text-fw-heading font-mono">
                        {vnf.configuration.managementIP}
                      </dd>
                    </div>
                  )}
                  {vnf.configuration?.highAvailability !== undefined && (
                    <div>
                      <dt className="text-figma-sm font-medium text-fw-bodyLight">High Availability</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-figma-sm font-medium ${
                          vnf.configuration.highAvailability ? 'bg-fw-successLight text-fw-success' : 'bg-fw-neutral text-fw-heading'
                        }`}>
                          {vnf.configuration.highAvailability ? 'Enabled' : 'Disabled'}
                        </span>
                      </dd>
                    </div>
                  )}
                  {vnf.configuration?.routingProtocols && (
                    <div className="md:col-span-2">
                      <dt className="text-figma-sm font-medium text-fw-bodyLight mb-2">Routing Protocols</dt>
                      <dd className="mt-1">
                        <div className="flex flex-wrap gap-2">
                          {vnf.configuration.routingProtocols.map((protocol: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-accent text-fw-link"
                            >
                              {protocol}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Current Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">CPU Usage</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {vnf.performance?.cpuUsage || 0}%
                    </dd>
                    <div className="mt-2 w-full bg-fw-neutral rounded-full h-2">
                      <div
                        className="bg-fw-cobalt-600 h-2 rounded-full"
                        style={{ width: `${vnf.performance?.cpuUsage || 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Memory Usage</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {vnf.performance?.memoryUsage || 0}%
                    </dd>
                    <div className="mt-2 w-full bg-fw-neutral rounded-full h-2">
                      <div
                        className="bg-fw-cobalt-600 h-2 rounded-full"
                        style={{ width: `${vnf.performance?.memoryUsage || 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Throughput</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {vnf.performance?.throughput || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Latency</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {vnf.performance?.latency || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Active Sessions</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {vnf.performance?.activeSessions?.toLocaleString() || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-figma-sm font-medium text-fw-bodyLight">Max Sessions</dt>
                    <dd className="mt-2 text-3xl font-semibold text-fw-heading">
                      {vnf.performance?.maxSessions?.toLocaleString() || 0}
                    </dd>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete VNF"
        message={`Are you sure you want to delete "${vnf.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}

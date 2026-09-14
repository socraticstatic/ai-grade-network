import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, MapPin, Network, Hash, Zap, Play, Pause, Cog, Trash2, Plus, Pencil } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { Button } from '../common/Button';
import { getHubUtilization, getHubPeakUtilization, getHubSla } from '../../utils/connectionFacts';
import { UtilizationMeter, SlaBadge } from '../connection/facts/FactBadges';
import { useStore } from '../../store/useStore';
import { SubNav } from '../navigation/SubNav';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { HubConnectionGroups } from '../connection/hub/HubConnectionGroups';
import { MiniTopology } from '../connection/MiniTopology';
import { CopyButton } from '../common/CopyButton';
import { AccessConfiguration } from '../connection/tabs/AccessConfiguration';
import { BillingConfiguration } from '../connection/tabs/BillingConfiguration';
import { VersioningConfiguration } from '../connection/tabs/VersioningConfiguration';
import { APIConfiguration } from '../connection/tabs/APIConfiguration';
import { ConnectionLogs } from '../configure/connections/ConnectionLogs';
import { VNFSection } from '../connection/vnf/VNFSection';
import { LinkSection } from '../connection/links/LinkSection';
import { PoliciesTab } from '../connection/tabs/PoliciesTab';
import { OverflowTabs } from '../common/OverflowTabs';
import { VNFModal } from '../connection/modals/VNFModal';
import { DeleteVNFModal } from '../connection/modals/DeleteVNFModal';
import { VNF } from '../../types/vnf';

// ── Tab types — mirrors ConnectionTabType but replaces 'hubs' with 'connections' ──
type HubTabType =
  | 'overview'
  | 'connections'
  | 'links'
  | 'vnfs'
  | 'policies'
  | 'api'
  | 'access'
  | 'billing'
  | 'versions'
  | 'logs';

const TABS: { id: HubTabType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',    icon: <AttIcon name="high-meter"   className="h-5 w-5" /> },
  { id: 'connections',  label: 'Connections', icon: <AttIcon name="cloud"        className="h-6 w-6" /> },
  { id: 'links',        label: 'Links',       icon: <AttIcon name="cable"        className="h-5 w-5" /> },
  { id: 'vnfs',         label: 'VNFs',        icon: <AttIcon name="check-shield" className="h-5 w-5" /> },
  { id: 'policies',     label: 'Policies',    icon: <AttIcon name="checklist"    className="h-5 w-5" /> },
  { id: 'api',          label: 'API',         icon: <AttIcon name="apis"         className="h-5 w-5" /> },
  { id: 'access',       label: 'Access',      icon: <AttIcon name="person-group" className="h-5 w-5" /> },
  { id: 'billing',      label: 'Billing',     icon: <AttIcon name="bill"         className="h-5 w-5" /> },
  { id: 'versions',     label: 'Versions',    icon: <AttIcon name="download"     className="h-5 w-5" /> },
  { id: 'logs',         label: 'Logs',        icon: <AttIcon name="grid"         className="h-5 w-5" /> },
];

// Key/value row matching the Connection detail aesthetic.
function Row({ label, value, copy, mono }: {
  label: string;
  value: string | number | React.ReactNode;
  copy?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-fw-secondary/50 last:border-b-0">
      <span className="text-figma-sm text-fw-bodyLight">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-figma-sm font-medium text-fw-heading truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        {copy && <CopyButton value={copy} />}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, action, children, className = '' }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-fw-base rounded-xl border border-fw-secondary p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-figma-base font-bold text-fw-heading">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-figma-xs font-semibold ${
      active ? 'bg-fw-successLight text-fw-success' : 'bg-fw-secondary text-fw-disabled'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-fw-success' : 'bg-current opacity-50'}`} />
      {label}
    </span>
  );
}

function HubTabs({ activeTab, onTabChange }: {
  activeTab: HubTabType;
  onTabChange: (tab: HubTabType) => void;
}) {
  return (
    <div className="border-b border-fw-secondary">
      <OverflowTabs
        items={TABS.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          active: activeTab === tab.id,
        }))}
        onSelect={(id) => onTabChange(id as HubTabType)}
      />
    </div>
  );
}

export function HubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hub = useStore(state => state.hubs.find(r => r.id === id));
  const parentConnections = useStore(state =>
    state.connections.filter(c => hub?.connectionIds?.includes(c.id))
  );
  const removeHub = useStore(state => state.removeHub);
  const updateHub = useStore(state => state.updateHub);

  const [activeTab, setActiveTab] = useState<HubTabType>('connections');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renamingHub, setRenamingHub] = useState(false);
  const [hubNameDraft, setHubNameDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // VNF management — store-backed, scoped to this hub (its routing node). VNFs created in
  // the guided setup wizard land here.
  const allVnfs = useStore(state => state.vnfs);
  const addVNFToStore = useStore(state => state.addVNF);
  const updateVNFInStore = useStore(state => state.updateVNF);
  const removeVNFFromStore = useStore(state => state.removeVNF);
  const vnfs = useMemo(() => allVnfs.filter(v => v.hubIds?.includes(id ?? '')), [allVnfs, id]);
  const [showVNFModal, setShowVNFModal] = useState(false);
  const [editingVNF, setEditingVNF] = useState<VNF | undefined>();
  const [deletingVNF, setDeletingVNF] = useState<VNF | undefined>();

  if (!hub) {
    return (
      <div className="min-h-screen bg-fw-wash flex items-center justify-center">
        <p className="text-fw-bodyLight">Hub not found.</p>
      </div>
    );
  }

  const routerLinks = hub.links || [];
  // Aggregate connection bandwidth for the Links status summary (Gbps sum).
  const hubBandwidth = (() => {
    const total = parentConnections.reduce(
      (s, c) => s + (parseFloat(c.bandwidth?.replace(/[^\d.]/g, '') || '0') || 0),
      0,
    );
    return total > 0 ? `${total} Gbps` : '10 Gbps';
  })();

  // VNF CRUD handlers
  const handleAddVNF = () => {
    setEditingVNF(undefined);
    setShowVNFModal(true);
  };
  const handleEditVNF = (vnf: VNF) => {
    setEditingVNF(vnf);
    setShowVNFModal(true);
  };
  const handleDeleteVNF = (vnf: VNF) => setDeletingVNF(vnf);
  const handleSaveVNF = (vnfData: VNF) => {
    if (editingVNF) {
      updateVNFInStore(vnfData.id, vnfData);
      window.addToast({ type: 'success', title: 'VNF Updated', message: `${vnfData.name} has been updated.`, duration: 3000 });
    } else {
      // Ensure a newly created VNF is attached to this hub so it appears here.
      const attached = vnfData.hubIds?.includes(hub.id)
        ? vnfData
        : { ...vnfData, hubIds: [...(vnfData.hubIds ?? []), hub.id] };
      addVNFToStore(attached);
      window.addToast({ type: 'success', title: 'VNF Created', message: `${vnfData.name} has been created.`, duration: 3000 });
    }
    setShowVNFModal(false);
    setEditingVNF(undefined);
  };
  const handleConfirmDeleteVNF = () => {
    if (deletingVNF) {
      removeVNFFromStore(deletingVNF.id);
      window.addToast({ type: 'success', title: 'VNF Deleted', message: `${deletingVNF.name} has been deleted.`, duration: 3000 });
      setDeletingVNF(undefined);
    }
  };

  const handleToggleStatus = () => {
    const next = hub.status === 'active' ? 'inactive' : 'active';
    updateHub(hub.id, { status: next });
    window.addToast({
      type: 'success',
      title: next === 'active' ? 'Hub Activated' : 'Hub Deactivated',
      message: `${hub.name} is now ${next}.`,
      duration: 3000
    });
  };

  const handleToggleEditing = () => {
    const next = !isEditing;
    setIsEditing(next);
    if (!next) {
      window.addToast({
        type: 'success',
        title: 'Settings Saved',
        message: `${hub.name} settings updated.`,
        duration: 3000
      });
    }
  };

  const handleDelete = async () => {
    removeHub(hub.id);
    setShowDeleteConfirm(false);
    navigate('/manage');
    window.addToast({
      type: 'success',
      title: 'Hub Deleted',
      message: `${hub.name} has been deleted.`,
      duration: 3000
    });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'connections':
        return parentConnections.length === 0 ? (
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-12 text-center">
            <Network className="mx-auto h-10 w-10 text-fw-bodyLight mb-3" />
            <p className="text-figma-base font-medium text-fw-heading">No connections</p>
          </div>
        ) : (
          <HubConnectionGroups connections={parentConnections} filterable />
        );

      case 'links':
        return (
          <div className="p-6">
            <LinkSection
              hubs={[hub]}
              ownerId={hub.id}
              bandwidth={hubBandwidth}
              allLinks={routerLinks.map((l: any) => ({
                ...l,
                hubId: hub.id,
                cloudRouterName: hub.name,
              }))}
            />
          </div>
        );

      case 'vnfs':
        return (
          <div className="p-6">
            <VNFSection
              vnfs={vnfs}
              hubs={[hub]}
              onAdd={handleAddVNF}
              onEdit={handleEditVNF}
              onDelete={handleDeleteVNF}
              connectionId={hub.id}
            />
          </div>
        );

      case 'policies':
        return (
          <div className="p-6">
            <PoliciesTab
              hubs={[hub]}
              vnfs={vnfs}
              allLinks={routerLinks}
              ownerName={hub.name}
            />
          </div>
        );

      case 'api':
        return <APIConfiguration />;

      case 'access':
        return <AccessConfiguration connectionId={hub.id} />;

      case 'billing':
        return <BillingConfiguration isEditing={isEditing} />;

      case 'versions':
        return <VersioningConfiguration connectionId={hub.id} currentVersion="1.0.0" />;

      case 'logs':
        return <ConnectionLogs connectionId={hub.id} />;

      case 'overview':
      default:
        return (
          <div className="space-y-6">
            {/* Hub Topology — the Hub's signature view */}
            {parentConnections.length > 0 && (
              <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
                <div className="px-5 py-3 border-b border-fw-secondary flex items-center gap-2">
                  <Network className="h-4 w-4 text-fw-bodyLight" />
                  <h3 className="text-figma-base font-bold text-fw-heading">Hub Topology</h3>
                </div>
                <div className="p-5">
                  <MiniTopology
                    router={hub}
                    connections={parentConnections}
                    onNodeClick={(node) => {
                      if (node.icon === 'cloud' && node.connectionId) navigate(`/connections/${node.connectionId}`);
                    }}
                  />
                  <p className="text-figma-xs text-fw-bodyLight text-center mt-3">
                    This Hub is the hub linking each cloud. Select a cloud to open its connection.
                  </p>
                </div>
              </div>
            )}

            {/* Headline performance metrics */}
            {hub.performance && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Throughput',        value: hub.performance.throughput },
                  { label: 'CPU',               value: hub.performance.cpuUsage != null ? `${hub.performance.cpuUsage}%` : undefined },
                  { label: 'Memory',            value: hub.performance.memoryUsage != null ? `${hub.performance.memoryUsage}%` : undefined },
                  { label: 'BGP Sessions',      value: hub.performance.bgpSessions ? `${hub.performance.bgpSessions.active}/${hub.performance.bgpSessions.total}` : undefined },
                  { label: 'Routing Table',     value: hub.performance.routingTableSize?.toLocaleString() },
                  { label: 'Packet Forwarding', value: hub.performance.packetForwardingRate != null ? `${hub.performance.packetForwardingRate} Mpps` : undefined },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-fw-base rounded-xl border border-fw-secondary p-4">
                    <p className="text-figma-xs font-medium text-fw-bodyLight mb-1.5">{label}</p>
                    <p className="text-figma-xl font-bold text-fw-heading tabular-nums tracking-[-0.03em]">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Two columns: Hub Details + Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SectionCard title="Hub Details" icon={<Network className="h-4 w-4 text-fw-bodyLight" />}>
                <Row label="Hub ID" value={hub.id} copy={hub.id} mono />
                <Row label="Status" value={<StatusPill active={hub.status === 'active'} label={hub.status.charAt(0).toUpperCase() + hub.status.slice(1)} />} />
                <Row label="Location" value={hub.location} />
                <Row label="Created" value={new Date(hub.createdAt).toLocaleDateString()} />
                {hub.pool && <Row label="Pool" value={hub.pool} />}
                {hub.ipeId && <Row label="IPE" value={hub.ipeId} copy={hub.ipeId} mono />}
                <Row label="Connections" value={parentConnections.length} />
              </SectionCard>

              <SectionCard title="Configuration" icon={<Zap className="h-4 w-4 text-fw-bodyLight" />}>
                {hub.configuration?.asn != null && <Row label="ASN" value={hub.configuration.asn} mono />}
                <Row
                  label="BGP"
                  value={<StatusPill active={!!hub.configuration?.bgpEnabled} label={hub.configuration?.bgpEnabled ? 'Enabled' : 'Disabled'} />}
                />
                {hub.configuration?.routeFilters && hub.configuration.routeFilters.length > 0 && (
                  <div className="pt-3">
                    <p className="text-figma-sm text-fw-bodyLight mb-2">Route Filters</p>
                    <div className="flex flex-wrap gap-2">
                      {hub.configuration.routeFilters.map((f: string, i: number) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full text-figma-xs font-medium bg-fw-accent text-fw-link border border-fw-active/20">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!hub.configuration && (
                  <p className="text-figma-sm text-fw-bodyLight py-2">No configuration details available.</p>
                )}
              </SectionCard>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-fw-wash">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       <div className="bg-fw-base border border-fw-secondary rounded-2xl shadow-sm overflow-hidden">
        {/* Header — top section of the framed container */}
        <div className="px-6 sm:px-8 py-6 border-b border-fw-secondary">
          <SubNav
            embedded
            icon={<AttIcon name="hub" className="h-10 w-10 text-fw-link" />}
            title={hub.name}
            description={hub.location}
            action={{
              label: 'Back to Connection Hubs',
              icon: <ArrowLeft className="h-5 w-5 mr-2 text-fw-link" />,
              onClick: () => navigate('/manage')
            }}
          />
          {/* Hubs group automatically; the name is the one thing that's yours. */}
          <div className="mt-3 flex items-center gap-3">
            {renamingHub ? (
              <>
                <input
                  autoFocus
                  value={hubNameDraft}
                  onChange={e => setHubNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && hubNameDraft.trim()) { updateHub(hub.id, { name: hubNameDraft.trim() }); setRenamingHub(false); }
                    if (e.key === 'Escape') setRenamingHub(false);
                  }}
                  className="h-9 px-3 rounded-lg border border-fw-primary text-figma-sm text-fw-heading focus:outline-none focus:border-fw-active w-72"
                />
                <button
                  onClick={() => { if (hubNameDraft.trim()) { updateHub(hub.id, { name: hubNameDraft.trim() }); setRenamingHub(false); } }}
                  className="px-3 h-9 rounded-lg bg-fw-primary text-white text-figma-sm font-medium hover:bg-fw-linkHover"
                >
                  Save
                </button>
                <button onClick={() => setRenamingHub(false)} className="px-3 h-9 rounded-lg border border-fw-secondary text-figma-sm text-fw-body hover:border-fw-active">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setHubNameDraft(hub.name); setRenamingHub(true); }}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-fw-secondary text-figma-xs font-medium text-fw-body hover:border-fw-active"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename hub
                </button>
                {hub.autoGrouped && (
                  <span className="text-figma-xs text-fw-bodyLight">
                    Grouped automatically by location — the name is yours to change.
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">
        {/* Quick Stats — flexible cards that size to content, matching ConnectionDetails */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4 mb-8">
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">ID</h3>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-figma-base font-bold text-fw-heading truncate" title={hub.id}>{hub.id}</p>
              <CopyButton value={hub.id} />
            </div>
          </div>

          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Status</h3>
            </div>
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${hub.status === 'active' ? 'bg-fw-success' : 'bg-fw-neutral'}`} />
              <span className="ml-2 text-figma-base font-bold text-fw-heading capitalize">{hub.status}</span>
            </div>
          </div>

          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Connections</h3>
            </div>
            <p className="text-figma-base font-bold text-fw-heading">{parentConnections.length}</p>
          </div>

          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Location</h3>
            </div>
            <p className="text-figma-base font-bold text-fw-heading">{hub.location}</p>
          </div>

          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">ASN</h3>
            </div>
            <p className="text-figma-base font-bold text-fw-heading tabular-nums">
              {hub.configuration?.asn ?? '—'}
            </p>
          </div>

          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Peak Utilization</h3>
            </div>
            <UtilizationMeter
              pct={getHubPeakUtilization(parentConnections)}
              title={`Peak ${getHubPeakUtilization(parentConnections)}% · avg ${getHubUtilization(parentConnections)}% across ${parentConnections.length} connections`}
            />
          </div>

          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">SLA this month</h3>
            </div>
            <SlaBadge value={getHubSla(parentConnections)} className="text-figma-base" />
          </div>
        </div>

        {/* Action Bar — parity with ConnectionDetails */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Add a connection straight into this hub — the wizard opens with this hub preset. */}
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => navigate('/create', { state: { mode: 'step-by-step', targetHubId: hub.id } })}
            >
              Add Connection
            </Button>
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center justify-center h-9 px-4 rounded-full text-figma-base font-medium gap-2 transition-colors ${
                hub.status === 'active'
                  ? 'border border-fw-success text-fw-success hover:bg-fw-successLight'
                  : 'border border-fw-secondary text-fw-body hover:bg-fw-wash'
              }`}
            >
              {hub.status === 'active' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {hub.status === 'active' ? 'Active' : 'Inactive'}
            </button>

            <Button
              variant="outline-danger"
              icon={Trash2}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </div>

          <Button
            variant={isEditing ? 'primary' : 'outline'}
            icon={Cog}
            onClick={handleToggleEditing}
            className={isEditing ? 'bg-fw-success hover:bg-fw-success' : ''}
          >
            {isEditing ? 'Save Changes' : 'Manage Settings'}
          </Button>
        </div>

        {/* Tab bar — same style as ConnectionDetails */}
        <div className="mb-6">
          <HubTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {renderTab()}
        </div>
       </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Hub"
        message={`Are you sure you want to delete "${hub.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />

      {/* VNF Modals */}
      <VNFModal
        isOpen={showVNFModal}
        onClose={() => {
          setShowVNFModal(false);
          setEditingVNF(undefined);
        }}
        onSave={handleSaveVNF}
        vnf={editingVNF}
        connectionId={hub.id}
        links={routerLinks}
      />

      <DeleteVNFModal
        isOpen={!!deletingVNF}
        onClose={() => setDeletingVNF(undefined)}
        onConfirm={handleConfirmDeleteVNF}
        vnfName={deletingVNF?.name || ''}
        vnfType={deletingVNF?.type || 'custom'}
      />
    </div>
  );
}

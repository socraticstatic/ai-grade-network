import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cog, Play, Pause, Trash2, Edit2, Activity, Network, Users, Globe, Cloud, AlertCircle, ExternalLink, Copy, Check, Hash } from 'lucide-react';
import { CopyButton } from '../common/CopyButton';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { SubNav } from '../navigation/SubNav';
import { ConnectionTabs, ConnectionTabType } from './tabs/ConnectionTabs';
import { ConnectionOverview } from './tabs/ConnectionOverview';
import { RoutingTab } from './tabs/RoutingTab';
import { AccessConfiguration } from './tabs/AccessConfiguration';
import { VersioningConfiguration } from './tabs/VersioningConfiguration';
import { BillingConfiguration } from './tabs/BillingConfiguration';
import { ConnectionLogs } from '../configure/connections/ConnectionLogs';
import { ActivityHistory } from './lmcc/ActivityHistory';
import { NetworkTab } from './tabs/NetworkTab';
import { LinksTab } from './tabs/LinksTab';
import { VNFTab } from './tabs/VNFTab';
import { PoliciesTab } from './tabs/PoliciesTab';
import { APIConfiguration } from './tabs/APIConfiguration';
import { IconButton } from '../common/IconButton';
import { Button } from '../common/Button';
import { usePermission } from '../../hooks/usePermission';
import { ResiliencyMap } from './tabs/ResiliencyMap';
import { FailoverTestModal } from './modals/FailoverTestModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CloudLegs } from './CloudLegs';
import { LegDetailDrawer } from './LegDetailDrawer';
import { isC2C, legSummary, getConnectionLegs, applyLegPatch } from '../../utils/connectionLegs';
import { getResiliency, getBgpStatus, getSlaThisMonth } from '../../utils/connectionFacts';
import { displayStatus, keyExpiryInfo } from '../../utils/lmccDisplay';
import { earlyTerminationCharge, formatUsd } from '../../utils/lmccBilling';
import { ResiliencyBadge, BgpPill, SlaBadge } from './facts/FactBadges';
import { ConnectionTypeIcon } from './icons/ConnectionTypeIcon';
import { AttIcon } from '../icons/AttIcon';
import { useEditableField } from '../../hooks/useEditableField';
import { VNF } from '../../types/vnf';
import { Hub } from '../../types/hub';
import { Link } from '../../types';
import { VNFModal } from './modals/VNFModal';
import { DeleteVNFModal } from './modals/DeleteVNFModal';
import { HubModal } from './hub/HubModal';
import { DeleteHubModal } from './hub/DeleteHubModal';
import { MobileConnectionDetails } from './MobileConnectionDetails';
import { useIsMobile } from '../../hooks/useMobileDetection';
import { getMetroById } from '../../data/lmccService';

/** Resolve a metro id like "metro-sj" to its friendly name "San Jose, CA". */
function friendlyLocation(loc: string | undefined): string {
  if (!loc) return '';
  if (loc.startsWith('metro-')) {
    return getMetroById(loc)?.name ?? loc;
  }
  return loc;
}

/** AWS Max location label per LMCC Bible.
 * San Jose → "San Jose - SJ", Ashburn → "Ashburn, VA". */
function maxLocationLabel(loc: string | undefined): string {
  if (!loc) return '';
  const friendly = friendlyLocation(loc);
  if (/san\s*jose/i.test(friendly)) return 'San Jose - SJ';
  if (/ashburn/i.test(friendly)) return 'Ashburn, VA';
  return friendly;
}
// ConnectionEditWarning replaced with inline specific messaging

// ── Pending LMCC: portal swivel screen ────────────────────────────────────────
function PendingLmccScreen({
  connection,
  activationKey,
  onBack,
}: {
  connection: import('../../types').Connection;
  activationKey: string;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activationKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-fw-wash">
      {/* Top bar */}
      <div className="bg-fw-base border-b border-fw-secondary px-6 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-figma-sm font-medium text-fw-bodyLight hover:text-fw-heading transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Connections
        </button>
        <span className="text-fw-secondary">·</span>
        <span className="text-figma-sm font-semibold text-fw-heading">{connection.name}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-fw-accent text-fw-link ml-1">
          Pending AWS activation
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Portal swivel animation */}
        <div className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-0 mb-8"
          >
            {/* AT&T portal */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-fw-accent border border-fw-link/20 flex items-center justify-center">
                <span className="text-[11px] font-black text-fw-link tracking-tight">AT&amp;T</span>
              </div>
              <span className="text-[10px] font-semibold text-fw-bodyLight tracking-wide uppercase">NetBond Portal</span>
            </div>

            {/* Animated flow */}
            <div className="flex items-center gap-0 mx-3 relative" style={{ width: 160 }}>
              {/* Track */}
              <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-fw-secondary" style={{ transform: 'translateY(-50%)' }} />
              {/* Animated dots */}
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-fw-link"
                  style={{ top: '50%', translateY: '-50%' }}
                  animate={{ left: ['0%', '100%'] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.6,
                  }}
                />
              ))}
              {/* Key label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-fw-base border border-fw-secondary rounded-lg px-2 py-1 text-[9px] font-semibold text-fw-bodyLight z-10">
                  ActivationKey
                </div>
              </div>
            </div>

            {/* AWS portal */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-[#fff3e0] border border-[#f5c07a] flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
                  alt="AWS"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <span className="text-[10px] font-semibold text-fw-bodyLight tracking-wide uppercase">AWS Console</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-center mb-2"
          >
            <h1 className="text-figma-2xl font-bold text-fw-heading tracking-tight mb-2">
              Take your key to AWS
            </h1>
            <p className="text-figma-base text-fw-body max-w-md mx-auto">
              AT&T has created your connection request and generated an ActivationKey.
              Carry it to AWS Interconnect – last mile to complete the handshake.
            </p>
          </motion.div>
        </div>

        {/* Key block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
          className="bg-fw-base rounded-2xl border border-fw-secondary p-6 space-y-5 mb-4"
        >
          <div>
            <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-widest mb-2">Your ActivationKey</p>
            <div className="flex items-start gap-3">
              <code className="flex-1 min-w-0 text-figma-xs font-mono text-fw-heading bg-fw-wash border border-fw-secondary rounded-xl p-3 break-all leading-relaxed">
                {activationKey}
              </code>
              <button
                onClick={handleCopy}
                className={`shrink-0 p-2.5 rounded-xl border transition-all ${
                  copied
                    ? 'border-fw-active bg-fw-accent text-fw-link'
                    : 'border-fw-secondary hover:border-fw-active text-fw-bodyLight hover:text-fw-heading'
                }`}
                title="Copy key"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && (
              <p className="text-figma-xs text-fw-link mt-1.5">Copied to clipboard</p>
            )}
          </div>

          {/* Steps */}
          <div className="rounded-xl bg-fw-wash border border-fw-secondary p-4 space-y-2">
            <p className="text-figma-xs font-semibold text-fw-heading mb-3">What to do in AWS Interconnect – last mile</p>
            {[
              'Copy the ActivationKey above',
              'Open AWS Interconnect Console → Connections',
              'Find the 4 pending AT&T hosted connections',
              'Accept each one and paste the key when prompted',
              'Provisioning begins automatically — there is no activate step back here',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-fw-accent border border-fw-link/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-fw-link">{i + 1}</span>
                </div>
                <p className="text-figma-xs text-fw-body leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* AWS link */}
          <a
            href="https://console.aws.amazon.com/directconnect/v2/home"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-fw-link text-white rounded-xl hover:bg-fw-linkHover transition-colors font-semibold text-figma-sm"
          >
            Open AWS Interconnect Console
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Demo stand-in for the customer's move in the AWS console. Once clicked, the
              lifecycle clock walks Provisioning → Live on its own. */}
          <button
            onClick={() => {
              const store = useStore.getState();
              store.updateConnection(connection.id.toString(), { status: 'Provisioning' } as any);
              store.logActivity?.({
                type: 'key-uploaded',
                connectionId: connection.id.toString(),
                message: 'Activation key confirmed by AWS — provisioning began.',
              });
            }}
            className="w-full px-5 py-2.5 rounded-xl border border-fw-secondary text-figma-sm font-medium text-fw-link hover:border-fw-active transition-colors"
          >
            Demo: key uploaded in AWS
          </button>
        </motion.div>

        <p className="text-center text-figma-xs text-fw-disabled">
          {connection.configuration?.lmccKeyCreatedAt
            ? keyExpiryInfo(connection.configuration.lmccKeyCreatedAt).label
            : 'Key valid for 7 days'} · {friendlyLocation(connection.configuration?.lmccMetro || connection.location)} · 4 diverse paths
        </p>
      </div>
    </div>
  );
}

export function ConnectionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const connection = useStore(state => state.connections.find(c => c.id === id));
  const updateConnection = useStore(state => state.updateConnection);
  const removeConnection = useStore(state => state.removeConnection);
  const deleteLmccConnection = useStore(state => state.deleteLmccConnection);
  const hubs = useStore(state => state.getRoutersForConnection(id ?? ''));
  const addHubToStore = useStore(state => state.addHub);
  const updateHubInStore = useStore(state => state.updateHub);
  const removeHubFromStore = useStore(state => state.removeHub);
  const isMobile = useIsMobile();
  const canDelete = usePermission('delete');
  const [activeTab, setActiveTab] = useState<ConnectionTabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [showFailoverTest, setShowFailoverTest] = useState(false);

  // VNF state — store-backed so VNFs created in the guided setup wizard (or anywhere)
  // show up here. Scoped to this connection.
  const [showAddVNFModal, setShowAddVNFModal] = useState(false);
  const [editingVNF, setEditingVNF] = useState<VNF | undefined>();
  const [deletingVNF, setDeletingVNF] = useState<VNF | undefined>();
  const allVnfs = useStore(state => state.vnfs);
  const addVNFToStore = useStore(state => state.addVNF);
  const updateVNFInStore = useStore(state => state.updateVNF);
  const removeVNFFromStore = useStore(state => state.removeVNF);
  const vnfs = useMemo(() => allVnfs.filter(v => v.connectionId === id), [allVnfs, id]);

  // Hub state management
  const [showAddHubModal, setShowAddHubModal] = useState(false);
  const [editingHub, setEditingHub] = useState<Hub | undefined>();
  const [deletingHub, setDeletingHub] = useState<Hub | undefined>();
  const [openLegIndex, setOpenLegIndex] = useState<number | null>(null);

  // Get all links from hubs
  const getAllLinks = (): Link[] => {
    return hubs.flatMap((router) => router.links || []);
  };

  const {
    isEditing: isEditingName,
    value: newName,
    error: nameError,
    setValue: setNewName,
    handleStartEdit: startEditingName,
    handleSave: handleSaveName,
    handleCancel: handleCancelEdit
  } = useEditableField({
    initialValue: connection?.name || '',
    onSave: (name) => {
      if (connection) {
        updateConnection(connection.id, { name });
        window.addToast({
          type: 'success',
          title: 'Name Updated',
          message: 'Connection name has been updated successfully.',
          duration: 3000
        });
      }
    },
    validate: (name) => {
      if (!name.trim()) return 'Connection name cannot be empty';
    }
  });

  useEffect(() => {
    if (!connection) {
      navigate('/manage');
    }
  }, [connection, navigate]);

  if (!connection) return null;

  // Use mobile view if on mobile device
  if (isMobile) {
    return <MobileConnectionDetails connection={connection} />;
  }

  // ── Pending LMCC: portal swivel screen ────────────────────────────────────────
  const isPendingLmcc = connection.status === 'Pending' && connection.configuration?.isLmcc && connection.configuration?.lmccPending;

  if (isPendingLmcc) {
    // Generate the ActivationKey deterministically (same logic as AWSPendingConfigModal)
    const metro = connection.configuration?.lmccMetro || connection.location || 'Unknown';
    const bandwidth = connection.bandwidth || '1 Gbps';
    const awsAccountId = connection.origin?.externalAccountId || connection.origin?.metadata?.externalAccountId || '—';
    const keyData = {
      sharedConnectionUuid: `lmcc-${connection.id.replace('conn-', '')}`,
      connectionSizeMbps: bandwidth.includes('Gbps') ? parseInt(bandwidth) * 1000 : parseInt(bandwidth),
      destinationAccountId: awsAccountId,
      destinationEnvironmentUri: `att://environments/${metro.toLowerCase().replace(/[^a-z]/g, '-')}`,
      version: 1,
    };
    const activationKey = btoa(JSON.stringify(keyData));

    return <PendingLmccScreen connection={connection} activationKey={activationKey} onBack={() => navigate('/manage')} />;
  }

  const handleToggleStatus = () => {
    const newStatus = connection.status === 'Active' ? 'Inactive' : 'Active';
    updateConnection(connection.id, { status: newStatus });

    window.addToast({
      type: 'success',
      title: 'Status Updated',
      message: `Connection is now ${newStatus}`,
      duration: 3000
    });
  };

  const handleDelete = () => {
    if (connection.configuration?.isLmcc) {
      // Commercial event: Deleting → Deleted; billing stops; charge from the system of record.
      deleteLmccConnection(connection.id.toString());
      setShowDeleteConfirm(false);
      navigate('/manage');
      window.addToast({
        type: 'info',
        title: 'Deleting connection',
        message: 'Service is ending. Recurring billing has stopped; any early-termination charge will appear on your invoice.',
        duration: 5000
      });
      return;
    }
    removeConnection(connection.id);
    navigate('/manage');

    window.addToast({
      type: 'success',
      title: 'Connection Deleted',
      message: 'Connection has been removed successfully.',
      duration: 3000
    });
  };

  // Hub handlers
  const handleAddHub = () => {
    setEditingHub(undefined);
    setShowAddHubModal(true);
  };

  const handleEditHub = (hub: Hub) => {
    setEditingHub(hub);
    setShowAddHubModal(true);
  };

  const handleDeleteHub = (hub: Hub) => {
    setDeletingHub(hub);
  };

  const handleSaveHub = (hub: Hub) => {
    if (editingHub) {
      updateHubInStore(hub.id, hub);
      window.addToast({
        type: 'success',
        title: 'Hub Updated',
        message: `${hub.name} has been updated successfully.`,
        duration: 3000
      });
    } else {
      const newRouter: Hub = {
        ...hub,
        connectionIds: [...(hub.connectionIds ?? []), ...(id && !hub.connectionIds?.includes(id) ? [id] : [])],
      };
      addHubToStore(newRouter);
      window.addToast({
        type: 'success',
        title: 'Hub Created',
        message: `${hub.name} has been created successfully.`,
        duration: 3000
      });
    }
    setShowAddHubModal(false);
    setEditingHub(undefined);
  };

  const handleConfirmDeleteHub = () => {
    if (deletingHub) {
      removeHubFromStore(deletingHub.id);
      window.addToast({
        type: 'success',
        title: 'Hub Deleted',
        message: `${deletingHub.name} has been deleted successfully.`,
        duration: 3000
      });
      setDeletingHub(undefined);
    }
  };

  // VNF handlers
  const handleAddVNF = () => {
    setEditingVNF(undefined);
    setShowAddVNFModal(true);
  };

  const handleEditVNF = (vnf: VNF) => {
    setEditingVNF(vnf);
    setShowAddVNFModal(true);
  };

  const handleDeleteVNF = (vnf: VNF) => {
    setDeletingVNF(vnf);
  };

  const handleSaveVNF = (vnfData: VNF) => {
    if (editingVNF) {
      updateVNFInStore(vnfData.id, vnfData);
      window.addToast({
        type: 'success',
        title: 'VNF Updated',
        message: `${vnfData.name} has been updated successfully.`,
        duration: 3000
      });
    } else {
      // Attach the new VNF to this connection and its parent hub so it's addressable everywhere.
      addVNFToStore({
        ...vnfData,
        connectionId: connection.id.toString(),
        hubIds: vnfData.hubIds?.length ? vnfData.hubIds : (hubs[0] ? [hubs[0].id] : []),
      });
      window.addToast({
        type: 'success',
        title: 'VNF Created',
        message: `${vnfData.name} has been created successfully.`,
        duration: 3000
      });
    }
    setShowAddVNFModal(false);
    setEditingVNF(undefined);
  };

  const handleConfirmDeleteVNF = () => {
    if (deletingVNF) {
      removeVNFFromStore(deletingVNF.id);
      window.addToast({
        type: 'success',
        title: 'VNF Deleted',
        message: `${deletingVNF.name} has been deleted successfully.`,
        duration: 3000
      });
      setDeletingVNF(undefined);
    }
  };

  const renderContent = () => {
    const hubsCount = hubs.length;
    const linksCount = getAllLinks().length;
    const vnfsCount = vnfs.length;

    switch (activeTab) {
      case 'overview':
        return <ConnectionOverview connection={connection} hubsCount={hubsCount} linksCount={linksCount} vnfsCount={vnfsCount} />;
      case 'hubs':
        return (
          <NetworkTab
            connection={connection}
            hubs={hubs}
            vnfs={vnfs}
            onAddHub={handleAddHub}
            onEditHub={handleEditHub}
            onDeleteHub={handleDeleteHub}
            isEditing={isEditing}
          />
        );
      case 'links':
        return (
          <LinksTab
            connection={connection}
            hubs={hubs}
            allLinks={getAllLinks()}
            isEditing={isEditing}
          />
        );
      case 'vnfs':
        return (
          <VNFTab
            connection={connection}
            vnfs={vnfs}
            hubs={hubs}
            onAdd={handleAddVNF}
            onEdit={handleEditVNF}
            onDelete={handleDeleteVNF}
          />
        );
      case 'policies':
        return (
          <PoliciesTab
            connection={connection}
            hubs={hubs}
            vnfs={vnfs}
            allLinks={getAllLinks()}
          />
        );
      case 'access':
        return <AccessConfiguration connectionId={connection.id.toString()} />;
      case 'versions':
        return <VersioningConfiguration connectionId={connection.id.toString()} currentVersion="1.0.0" />;
      case 'billing':
        return <BillingConfiguration isEditing={isEditing} />;
      case 'logs':
        return (
          <>
            <ActivityHistory connectionId={connection.id.toString()} />
            <ConnectionLogs connectionId={connection.id.toString()} />
          </>
        );
      case 'api':
        return <APIConfiguration />;
      default:
        return <ConnectionOverview connection={connection} hubsCount={hubsCount} linksCount={linksCount} vnfsCount={vnfsCount} />;
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
            icon={
              <ConnectionTypeIcon
                type={isC2C(connection) ? 'Cloud to Cloud' : connection.type}
                size={40}
              />
            }
        title={
          isEditingName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`fw-input w-auto text-2xl font-bold tracking-[-0.03em] bg-fw-base ${
                  nameError ? 'border-fw-error' : ''
                }`}
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <IconButton
                  icon={<Edit2 className="h-5 w-5" />}
                  onClick={handleSaveName}
                  variant="success"
                  title="Save"
                />
                <IconButton
                  icon={<Trash2 className="h-5 w-5" />}
                  onClick={handleCancelEdit}
                  variant="danger"
                  title="Cancel"
                />
              </div>
              {nameError && (
                <span className="text-figma-base text-fw-error">{nameError}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>{connection.name}</span>
              <IconButton
                icon={<Edit2 className="h-8 w-8 text-fw-bodyLight" />}
                onClick={startEditingName}
                variant="ghost"
                title="Edit Name"
              />
            </div>
          )
        }
        description={
          isC2C(connection)
            ? `${connection.type} · ${legSummary(connection)} via Hub`
            : `${connection.type} - ${friendlyLocation(connection.location)}`
        }
            action={{
              label: 'Back to Connections',
              icon: <ArrowLeft className="h-5 w-5 mr-2 text-fw-link" />,
              onClick: () => navigate('/manage')
            }}
          />
        </div>

        <div className="p-6 sm:p-8">
        {/* Quick Stats — flexible cards that size to content; wide facts span 2 tracks */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4 mb-8">
          {/* Unique ID Card — copyable */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Unique ID</h3>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <p
                className="text-figma-base font-bold text-fw-heading truncate"
                title={String(connection.id)}
              >
                {String(connection.id)}
              </p>
              <CopyButton value={String(connection.id)} />
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Status</h3>
            </div>
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${
                connection.status === 'Active' ? 'bg-fw-success' : 'bg-fw-neutral'
              }`} />
              <span className="ml-2 text-figma-base font-bold text-fw-heading">
                {displayStatus(connection)}
              </span>
            </div>
          </div>

          {/* Type Card — wider so long type names don't wrap */}
          <div className="bg-fw-wash p-5 rounded-xl sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Type</h3>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-fw-link shrink-0">
                <ConnectionTypeIcon
                  type={isC2C(connection) ? 'Cloud to Cloud' : connection.type}
                  size={26}
                />
              </span>
              <p className="text-figma-base font-bold text-fw-heading">{connection.type}</p>
            </div>
          </div>

          {/* Pool Card */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Pool</h3>
            </div>
            <p className="text-figma-base font-bold text-fw-heading">{connection.poolName || connection.pool || 'None'}</p>
          </div>

          {/* Resiliency Card */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Resiliency</h3>
            </div>
            <ResiliencyBadge level={getResiliency(connection)} />
          </div>

          {/* Parent Hub Card */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AttIcon name="hub" className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Hub</h3>
            </div>
            {hubs.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate(`/hubs/${hubs[0].id}`)}
                className="text-figma-base font-bold text-fw-link hover:underline text-left truncate"
                title={`Rolls up to ${hubs[0].name}`}
              >
                {hubs[0].name}{hubs.length > 1 ? ` +${hubs.length - 1}` : ''}
              </button>
            ) : (
              <p className="text-figma-base font-bold text-fw-disabled">—</p>
            )}
          </div>

          {/* SLA this month Card */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">SLA this month</h3>
            </div>
            <SlaBadge value={getSlaThisMonth(connection)} className="text-figma-base" />
          </div>

          {/* BGP Card */}
          <div className="bg-fw-wash p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">BGP</h3>
            </div>
            <BgpPill status={getBgpStatus(connection)} />
          </div>

          {/* Locations Card — one wrapping chip per location, no truncation */}
          <div className="bg-fw-wash p-5 rounded-xl sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-fw-bodyLight" />
              <h3 className="text-figma-base font-medium text-fw-bodyLight">Locations</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(isC2C(connection)
                  ? getConnectionLegs(connection).map(l => l.location).filter(Boolean)
                  : connection.provider === 'AWS'
                    ? ['San Jose - SJ']
                    : (connection.locations && connection.locations.length > 0
                        ? connection.locations.map(friendlyLocation)
                        : [friendlyLocation(connection.location)].filter(Boolean))
              ).map((loc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-figma-sm font-semibold bg-fw-accent text-fw-link border border-fw-active/20"
                >
                  {loc}
                </span>
              ))}
            </div>
          </div>

          {/* Cloud Legs Card — for C2C, the clouds linked through this connection's Hub hub */}
          {isC2C(connection) && (
            <div className="bg-fw-wash p-5 rounded-xl sm:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-5 w-5 text-fw-bodyLight" />
                <h3 className="text-figma-base font-medium text-fw-bodyLight">Cloud Legs</h3>
              </div>
              <CloudLegs connection={connection} className="text-figma-base" onLegClick={setOpenLegIndex} />
              <p className="text-figma-xs text-fw-bodyLight mt-1.5">Linked through one Hub hub · select a cloud to go deeper</p>
            </div>
          )}
        </div>

        {/* Connection Edit Warning — suppressed for AWS Max (no Inactive state). Cloud to
            Cloud is a normal connection even when AWS is its primary provider, so it keeps
            the Deactivate flow. */}
        {(connection.provider !== 'AWS' || isC2C(connection)) && connection.status === 'Active' && !['policies', 'access', 'billing', 'logs', 'api'].includes(activeTab) && (
          <div className="flex items-center gap-2 px-4 py-2 border border-fw-secondary rounded-lg mb-6 text-figma-sm text-fw-bodyLight">
            <AlertCircle className="h-4 w-4 text-fw-warn flex-shrink-0" />
            <span>Deactivate to modify topology. Policies, billing, and API keys can be changed while active.</span>
          </div>
        )}
        {/* Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Status Toggle Button — hidden for AWS Max (no Inactive state), shown for C2C */}
            {(connection.provider !== 'AWS' || isC2C(connection)) && (
              <button
                onClick={handleToggleStatus}
                className={`inline-flex items-center justify-center h-9 px-4 rounded-full text-figma-base font-medium gap-2 transition-colors ${
                  connection.status === 'Active'
                    ? 'border border-fw-success text-fw-success hover:bg-fw-successLight'
                    : 'border border-fw-secondary text-fw-body hover:bg-fw-wash'
                }`}
              >
                {connection.status === 'Active' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {connection.status === 'Active' ? 'Active' : 'Inactive'}
              </button>
            )}

            {/* Delete Button - hidden for User role */}
            {canDelete && (
              <Button
                variant="outline-danger"
                icon={Trash2}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            )}

            {/* Test Failover - only for Maximum/Geodiversity, never for AWS */}
            {connection.provider !== 'AWS' &&
              ((connection.configuration as any)?.resiliencyLevel === 'maximum' ||
                (connection.configuration as any)?.resiliencyLevel === 'geodiversity') && (
              <Button
                variant="outline"
                icon={Activity}
                onClick={() => setShowFailoverTest(true)}
              >
                Test Failover
              </Button>
            )}
          </div>

          <Button
            variant={isEditing ? 'primary' : 'outline'}
            icon={Cog}
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? 'bg-fw-success hover:bg-fw-success' : ''}
          >
            {isEditing ? 'Save Changes' : 'Manage Settings'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          {/* Every connection exposes the full tab set — Access, Links, VNFs, Policies, API,
              Billing, Versions, etc. — so any detail page is consistent regardless of
              provider or LMCC. Content components degrade gracefully when a facet is N/A. */}
          <ConnectionTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Content Area */}
        <div>
          {renderContent()}
        </div>
        </div>
       </div>
      </div>

      {/* Delete Confirmation — for LMCC this is a commercial event, not a clean teardown */}
      {connection.configuration?.isLmcc ? (
        showDeleteConfirm && (() => {
          const term = String(connection.configuration?.lmccContractTerm ?? 'monthly');
          const months = term.startsWith('fixed-') ? parseInt(term.replace('fixed-', ''), 10) : 0;
          const created = new Date(connection.createdAt ?? Date.now());
          const elapsed = Math.floor((Date.now() - created.getTime()) / (30 * 86400000));
          const remaining = Math.max(0, months - elapsed);
          const mbps = (() => { const m = String(connection.bandwidth ?? '1 Gbps').match(/([\d.]+)\s*(G|M)bps/i); if (!m) return 1000; return m[2].toUpperCase() === 'G' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]); })();
          const charge = earlyTerminationCharge(mbps, remaining);
          return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-fw-heading/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
              <div className="w-full max-w-lg rounded-2xl bg-fw-base border border-fw-secondary shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-5 h-5 text-fw-error" />
                  <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Delete this connection?</h2>
                </div>
                <p className="text-figma-sm text-fw-body mb-3">
                  Deleting <span className="font-semibold">ends your service</span> and tears down everything
                  underneath automatically. Recurring billing stops at delete.
                </p>
                {charge > 0 ? (
                  <div className="mb-4 p-3 rounded-lg bg-fw-errorLight/40 border border-fw-error/40">
                    <p className="text-figma-sm font-medium text-fw-heading mb-1">
                      Early-termination charge: {formatUsd(charge)}
                    </p>
                    <p className="text-figma-xs text-fw-body">
                      Your contract has about {remaining} month{remaining === 1 ? '' : 's'} remaining. Deleting
                      before term breaches it. The amount comes from the billing system of record.
                    </p>
                  </div>
                ) : (
                  <p className="text-figma-xs text-fw-bodyLight mb-4">
                    No early-termination charge applies — month-to-month, or the term has been served.
                  </p>
                )}
                <label className="flex items-start gap-2 text-figma-xs text-fw-body cursor-pointer mb-5">
                  <input type="checkbox" checked={deleteAcknowledged} onChange={e => setDeleteAcknowledged(e.target.checked)} className="mt-0.5" />
                  I understand this ends my service{charge > 0 ? ` and a ${formatUsd(charge)} charge applies` : ''}. This cannot be undone.
                </label>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="h-9 px-4 rounded-full border border-fw-secondary text-figma-sm text-fw-body hover:border-fw-bodyLight">Keep connection</button>
                  <button disabled={!deleteAcknowledged} onClick={handleDelete}
                    className="h-9 px-5 rounded-full bg-fw-error text-white text-figma-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                    Delete and end service
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Connection"
          message="Are you sure you want to delete this connection? This action cannot be undone."
          icon={<Trash2 className="w-6 h-6 text-fw-error" />}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}

      {/* Hub Modals */}
      <HubModal
        isOpen={showAddHubModal}
        onClose={() => {
          setShowAddHubModal(false);
          setEditingHub(undefined);
        }}
        onSave={handleSaveHub}
        hub={editingHub}
        connectionId={connection.id.toString()}
        links={getAllLinks()}
      />

      <DeleteHubModal
        isOpen={!!deletingHub}
        onClose={() => setDeletingHub(undefined)}
        onConfirm={handleConfirmDeleteHub}
        cloudRouterName={deletingHub?.name || ''}
      />

      {/* VNF Modals */}
      <VNFModal
        isOpen={showAddVNFModal}
        onClose={() => {
          setShowAddVNFModal(false);
          setEditingVNF(undefined);
        }}
        onSave={handleSaveVNF}
        vnf={editingVNF}
        connectionId={connection.id.toString()}
        links={getAllLinks()}
      />

      <DeleteVNFModal
        isOpen={!!deletingVNF}
        onClose={() => setDeletingVNF(undefined)}
        onConfirm={handleConfirmDeleteVNF}
        vnfName={deletingVNF?.name || ''}
      />

      <FailoverTestModal
        isOpen={showFailoverTest}
        onClose={() => setShowFailoverTest(false)}
        connectionName={connection.name}
      />

      <LegDetailDrawer
        connection={connection}
        legIndex={openLegIndex ?? 0}
        isOpen={openLegIndex !== null}
        onClose={() => setOpenLegIndex(null)}
        links={hubs.flatMap(g => g.links || [])}
        onUpdateLeg={(i, patch) => updateConnection(connection.id, { legs: applyLegPatch(connection, i, patch) })}
      />
    </div>
  );
}

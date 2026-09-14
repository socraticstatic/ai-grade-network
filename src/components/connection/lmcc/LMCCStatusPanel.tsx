/**
 * LMCCStatusPanel - 4-path health display for LMCC connections
 *
 * Shows the 4 hosted connections across 2 diverse datacenters
 * within a metro, with per-path BGP state, VLAN ID, and status.
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { LMCCConnection, LMCCPath, BGPState } from '../../../types/lmcc';
import { formatBandwidth, LMCC_PHASES, CURRENT_PHASE } from '../../../data/lmccService';
import { deriveCustomerState, STATUS_META, HEALTH_META } from '../../../data/lmccStatusEngine';
import { useStore } from '../../../store/useStore';
import { BandwidthChangeModal } from './BandwidthChangeModal';

interface LMCCStatusPanelProps {
  connection: LMCCConnection;
  /** Store connection id — commercial actions (bandwidth change) write to the store. */
  storeConnectionId?: string;
}

function getConnectionStatusBadge(status: LMCCConnection['status']) {
  const styles: Record<LMCCConnection['status'], string> = {
    'key-generated':  'bg-fw-accent text-fw-link',
    'key-accepted':   'bg-fw-accent text-fw-link',
    'negotiating':    'bg-fw-accent text-fw-link animate-pulse',
    'bgp-forming':    'bg-fw-accent text-fw-link animate-pulse',
    'live':           'bg-fw-cobalt-100 text-fw-link',
    'degraded':       'bg-fw-errorLight text-fw-error',
    'disconnected':   'bg-fw-errorLight text-fw-error',
  };
  const labels: Record<LMCCConnection['status'], string> = {
    'key-generated':  'Key Generated',
    'key-accepted':   'Key Accepted',
    'negotiating':    'Negotiating Parameters',
    'bgp-forming':    'BGP Forming',
    'live':           'Live',
    'degraded':       'Degraded',
    'disconnected':   'Disconnected',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-[8px] text-figma-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function LMCCStatusPanel({ connection, storeConnectionId }: LMCCStatusPanelProps) {
  // The STORE connection is the truth for this customer's lifecycle; the mock
  // supplies only path-level demo detail. Without this, a provisioning connection
  // would show the sample's "Live — billing has started", which is a lie.
  const storeConn = useStore(s => storeConnectionId
    ? s.connections.find(c => c.id.toString() === storeConnectionId)
    : undefined);

  const mockActivePaths = connection.paths.filter(p => p.status === 'active').length;
  const activePaths = storeConn?.status === 'Active'
    ? Number(storeConn.configuration?.lmccActivePaths ?? 4)
    : storeConn ? 0 : mockActivePaths;

  // Two-track GA model: status = can you use it; health = how well the promise is kept.
  const customer = deriveCustomerState(storeConn ? {
    provisioningStatus:
      storeConn.status === 'Deleted' ? 'deleted'
      : storeConn.status === 'Deleting' ? 'deleting'
      : storeConn.status === 'Inactive' ? 'failed'
      : storeConn.status === 'Pending' ? 'key-generated'
      : storeConn.status === 'Provisioning' ? 'negotiating'
      : 'live',
    pathsUp: activePaths,
    attConfirmed: storeConn.status === 'Active',
    awsConfirmed: storeConn.status === 'Active',
    keyCreatedAt: storeConn.configuration?.lmccKeyCreatedAt ?? storeConn.createdAt ?? new Date().toISOString(),
  } : {
    provisioningStatus: (['degraded', 'disconnected'].includes(connection.status)
      ? 'live'
      : connection.status === 'live' ? 'live'
      : connection.provisioningStatus as any) ?? 'live',
    pathsUp: connection.status === 'disconnected' ? 0 : mockActivePaths,
    attConfirmed: connection.status === 'live' || connection.status === 'degraded',
    awsConfirmed: connection.status === 'live' || connection.status === 'degraded',
    keyCreatedAt: connection.createdAt,
  });

  const [connectionType, setConnectionType]       = useState<'internet' | 'mpls'>('internet');
  const [showBandwidthModal, setShowBandwidthModal] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-8 h-4 object-contain" />
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">
              AWS Max - {connection.metro.name}
            </h3>
            {getConnectionStatusBadge(connection.status)}
          </div>
          <p className="text-figma-sm text-fw-bodyLight">
            {activePaths}/4 paths active{activePaths < 4 && customer.status === 'Live' ? ' · healing' : ''} · {formatBandwidth(connection.bandwidth)} per path · Internet, MPLS transport
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium bg-fw-accent text-fw-link"
            title="Survives the loss of paths, devices, or an entire datacenter in this metro. Covers the AT&T–AWS core; the last mile is protected separately.">
            Maximum Resiliency
          </span>
          <p className="text-figma-xs text-fw-bodyLight mt-1 max-w-[230px]">
            Survives device and datacenter loss in this metro. Covers the AT&T–AWS core, not the last mile.
          </p>
          <p className="text-figma-xs text-fw-bodyLight mt-1">
            Contract: {connection.contractType === 'trial' ? 'Trial' : connection.contractType === 'monthly' ? 'Month-to-month' : connection.contractType.replace('fixed-', '') + ' month'}
          </p>
        </div>
      </div>

      {/* Two-track: one clear status, and the health of the promise beside it — never merged. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
          <p className="text-figma-xs text-fw-bodyLight uppercase tracking-wider mb-1">Status</p>
          <p className="flex items-center gap-2 text-figma-base font-semibold text-fw-heading">
            <span className={`w-2 h-2 rounded-full inline-block ${STATUS_META[customer.status].dotClass}`} />
            {customer.status}
          </p>
          <p className="text-figma-xs text-fw-bodyLight mt-1">{STATUS_META[customer.status].blurb}</p>
        </div>
        <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
          <p className="text-figma-xs text-fw-bodyLight uppercase tracking-wider mb-1">Health</p>
          {customer.health ? (
            <>
              <p className="flex items-center gap-2 text-figma-base font-semibold text-fw-heading">
                <span className={`w-2 h-2 rounded-full inline-block ${
                  customer.health === 'full' ? 'bg-fw-success' : customer.health === 'reduced-healing' ? 'bg-fw-warn' : 'bg-fw-error'
                }`} />
                {HEALTH_META[customer.health].label}
              </p>
              <p className="text-figma-xs text-fw-bodyLight mt-1">{HEALTH_META[customer.health].blurb}</p>
            </>
          ) : (
            <p className="text-figma-sm text-fw-bodyLight">Health applies once the connection is Live.</p>
          )}
        </div>
      </div>

      {/* Bandwidth + Type — top-priority controls */}
      {(() => {
        const isTrial   = connection.contractType === 'trial';
        const isLive    = connection.status === 'live';
        // GA: bandwidth is the one technical attribute changeable on a LIVE connection —
        // upgrades carry no outage. Locked only for legacy trial contracts.
        const isLocked  = isTrial;
        const lockLabel = 'Locked — legacy trial contract';
        const allOptions = LMCC_PHASES.ga.bandwidthOptions;
        const availableNow = LMCC_PHASES[CURRENT_PHASE].bandwidthOptions;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bandwidth */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-fw-secondary bg-fw-base">
              <div className="flex items-center gap-3 min-w-0">
                <AttIcon name="high-meter" className="h-5 w-5 text-fw-link shrink-0" />
                <div className="min-w-0">
                  <p className="text-figma-xs text-fw-bodyLight mb-0.5">Bandwidth per path</p>
                  <div className="flex items-center gap-2">
                    <span className="text-figma-sm font-semibold text-fw-heading">{formatBandwidth(connection.bandwidth)}</span>
                    {storeConnectionId && !isLocked && (
                      <button
                        onClick={() => setShowBandwidthModal(true)}
                        className="text-figma-xs font-semibold text-fw-link hover:text-fw-linkHover"
                      >
                        Change bandwidth
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {isLocked && (
                <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight shrink-0">
                  <AttIcon name="lock" className="h-3.5 w-3.5" />
                  {lockLabel}
                </div>
              )}
            </div>

            {/* Type — always switchable */}
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-fw-secondary bg-fw-base">
              <div className="flex items-center gap-3 min-w-0">
                <AttIcon name="cloud" className="h-5 w-5 text-fw-link shrink-0" />
                <div className="min-w-0">
                  <p className="text-figma-xs text-fw-bodyLight mb-0.5">Type</p>
                  <select
                    value={connectionType}
                    onChange={e => setConnectionType(e.target.value as 'internet' | 'mpls')}
                    className="text-figma-sm font-semibold rounded-lg border px-2.5 py-1 bg-fw-base border-fw-secondary text-fw-heading hover:border-fw-active cursor-pointer transition-colors"
                  >
                    <option value="internet">Internet to Cloud</option>
                    <option value="mpls">MPLS to Cloud</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showBandwidthModal && storeConnectionId && (
        <BandwidthChangeModal
          connectionId={storeConnectionId}
          currentMbps={connection.bandwidth}
          onClose={() => setShowBandwidthModal(false)}
        />
      )}

      {/* Path protection — abstract by design: strength and self-healing without machinery.
          No device identity, datacenters, or channel ids (GA rule). */}
      <div className="p-4 rounded-xl border border-fw-secondary bg-fw-wash">
        <div className="flex items-center justify-between mb-2">
          <p className="text-figma-xs text-fw-bodyLight uppercase tracking-wider">Path protection</p>
          <span className="text-figma-xs text-fw-bodyLight">{activePaths} of 4 paths carrying traffic</span>
        </div>
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3 flex-1 rounded-full ${
                i < activePaths ? 'bg-fw-success' :
                customer.status === 'Live' ? 'bg-fw-warn animate-pulse' : 'bg-fw-secondary'
              }`}
            />
          ))}
        </div>
        {customer.health && (
          <p className="text-figma-xs text-fw-bodyLight mt-2">{HEALTH_META[customer.health].blurb}</p>
        )}
      </div>

      {/* BGP Summary — AT&T ASN + Amazon ASN, 50/50 split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
          <p className="text-figma-sm text-fw-bodyLight mb-1">AT&amp;T ASN</p>
          <p className="text-figma-base font-semibold text-fw-heading">{connection.bgp.partnerASN}</p>
        </div>
        <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
          <p className="text-figma-sm text-fw-bodyLight mb-1">Amazon ASN</p>
          <p className="text-figma-base font-semibold text-fw-heading">{connection.bgp.customerASN}</p>
        </div>
      </div>

      {/* Path detail drawer */}

    </div>
  );
}

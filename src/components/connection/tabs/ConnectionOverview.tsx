import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Lock, CalendarClock, Cable } from 'lucide-react';
import { CopyButton } from '../../common/CopyButton';
import { StatusBadge } from '../../common/StatusBadge';
import { Connection } from '../../../types';
import { MiniTopology } from '../MiniTopology';
import { LegDetailDrawer } from '../LegDetailDrawer';
import { isC2C, applyLegPatch } from '../../../utils/connectionLegs';
import { getConnectionRegions, getResiliency, getBgpStatus } from '../../../utils/connectionFacts';
import { ResiliencyBadge, BgpPill } from '../facts/FactBadges';
import { LMCCStatusPanel } from '../lmcc/LMCCStatusPanel';
import { PeeringSets } from '../lmcc/PeeringSets';
import { displayStatus, keyExpiryInfo } from '../../../utils/lmccDisplay';
import { MOCK_LMCC_CONNECTIONS } from '../../../data/lmccService';
import { ResiliencyMap } from './ResiliencyMap';
import { TrafficChart } from '../metrics/TrafficChart';
import { AttIcon } from '../../icons/AttIcon';
import type { Hub } from '../../../types/hub';
import { useStore } from '../../../store/useStore';

interface ConnectionOverviewProps {
  connection: Connection;
  hubsCount?: number;
  linksCount?: number;
  vnfsCount?: number;
}

function Row({ label, value, copy }: { label: string; value: string | React.ReactNode; copy?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-fw-secondary/50 last:border-b-0">
      <span className="text-figma-sm text-fw-bodyLight">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-figma-sm font-medium text-fw-heading">{value}</span>
        {copy && <CopyButton value={copy} />}
      </div>
    </div>
  );
}

export function ConnectionOverview({ connection, hubsCount = 0, linksCount = 0, vnfsCount = 0 }: ConnectionOverviewProps) {
  const navigate = useNavigate();
  const hubs = useStore(state => state.getRoutersForConnection(connection.id));
  const updateConnection = useStore(state => state.updateConnection);
  const isLmcc = connection.configuration?.isLmcc;
  // A Cloud to Cloud is a normal connection even when AWS is its primary provider, so it
  // must not trigger AWS Max display behavior (single AWS controls, hidden security/cost).
  const isAws = connection.provider === 'AWS' && !isC2C(connection);
  const lmccConnection = isLmcc ? MOCK_LMCC_CONNECTIONS.find(c => c.status === 'live') ?? MOCK_LMCC_CONNECTIONS[0] : null;
  const isActive = connection.status === 'Active';
  const isPending = connection.status === 'Pending' || connection.status === 'Provisioning';
  const providers = connection.providers?.join(', ') || connection.provider || 'N/A';
  const locations = connection.locations?.join(', ') || connection.location || 'N/A';
  const bandwidthOptions = ['100 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps'];
  const [awsBandwidth, setAwsBandwidth] = useState<string>(connection.bandwidth || '1 Gbps');
  const [awsType, setAwsType] = useState<'internet' | 'mpls'>(
    /mpls/i.test(connection.type || '') ? 'mpls' : 'internet'
  );
  const [openLegIndex, setOpenLegIndex] = useState<number | null>(null);

  const handleNodeClick = (node: { id: string; icon: string }) => {
    if (node.icon === 'hub') {
      if (hubs[0]) navigate(`/hubs/${hubs[0].id}`);
      return;
    }
    if (node.icon === 'cloud') {
      const match = node.id.match(/^cloud(\d+)$/);
      if (match) setOpenLegIndex(Number(match[1]));
    }
  };

  // Topology as a band in the page flow, not a boxed exhibit at the bottom. For LMCC
  // it carries the path story inline: the diagram and the promise read as one thing.
  const topologyBand = (
    <div className="rounded-2xl bg-gradient-to-b from-fw-wash/80 to-transparent px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-widest">Topology</p>
        <div className="flex items-center gap-4">
          {isLmcc && isActive && (
            <span className="inline-flex items-center gap-1.5 text-figma-xs text-fw-body">
              <span className={`h-1.5 w-1.5 rounded-full ${Number(connection.configuration?.lmccActivePaths ?? 4) >= 4 ? 'bg-fw-success' : 'bg-fw-warn animate-pulse'}`} />
              {Number(connection.configuration?.lmccActivePaths ?? 4) >= 4
                ? '4 independent paths · full protection'
                : `${connection.configuration?.lmccActivePaths}/4 paths · healing itself`}
            </span>
          )}
          <button
            onClick={() => navigate('/create', { state: { editMode: true, connectionId: connection.id, connectionName: connection.name, connectionStatus: connection.status } })}
            className="text-figma-xs font-medium text-fw-link hover:text-fw-linkHover transition-colors"
          >
            Edit topology
          </button>
        </div>
      </div>
      <MiniTopology
        connection={connection}
        hubs={hubs}
        linksCount={linksCount}
        vnfsCount={vnfsCount}
        onNodeClick={handleNodeClick}
      />
      <p className="text-figma-xs text-fw-disabled text-center mt-2">
        Select the Hub or a cloud to go deeper.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Non-LMCC: lead with the shape of the thing */}
      {!isLmcc && topologyBand}
      {/* AWS Bandwidth + Type — top-priority controls (shown for any AWS connection,
          even if not LMCC, so the customer can switch transport type). */}
      {isAws && !isLmcc && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-fw-secondary bg-fw-base">
            <div className="flex items-center gap-3 min-w-0">
              <AttIcon name="high-meter" className="h-5 w-5 text-fw-link shrink-0" />
              <div className="min-w-0">
                <p className="text-figma-xs text-fw-bodyLight mb-0.5">Bandwidth per path</p>
                <select
                  value={awsBandwidth}
                  onChange={e => setAwsBandwidth(e.target.value)}
                  className="text-figma-sm font-semibold rounded-lg border px-2.5 py-1 bg-fw-base border-fw-secondary text-fw-heading hover:border-fw-active cursor-pointer transition-colors"
                >
                  {bandwidthOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {!bandwidthOptions.includes(awsBandwidth) && (
                    <option value={awsBandwidth}>{awsBandwidth}</option>
                  )}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-fw-secondary bg-fw-base">
            <div className="flex items-center gap-3 min-w-0">
              <AttIcon name="cloud" className="h-5 w-5 text-fw-link shrink-0" />
              <div className="min-w-0">
                <p className="text-figma-xs text-fw-bodyLight mb-0.5">Type</p>
                <select
                  value={awsType}
                  onChange={e => setAwsType(e.target.value as 'internet' | 'mpls')}
                  className="text-figma-sm font-semibold rounded-lg border px-2.5 py-1 bg-fw-base border-fw-secondary text-fw-heading hover:border-fw-active cursor-pointer transition-colors"
                >
                  <option value="internet">Internet to Cloud</option>
                  <option value="mpls">MPLS to Cloud</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LMCC 4-path panel (only for LMCC connections) */}
      {isLmcc && lmccConnection && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          <LMCCStatusPanel connection={lmccConnection} storeConnectionId={connection.id.toString()} />
        </div>
      )}

      {/* Waiting on the key: the customer's move happens in the AWS console, not here.
          The demo button stands in for that upload; the lifecycle clock does the rest. */}
      {isLmcc && displayStatus(connection) === 'Pending' && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          <h3 className="text-figma-base font-bold text-fw-heading mb-1">Waiting for the activation key</h3>
          <p className="text-figma-sm text-fw-body mb-1">
            This connection starts provisioning the moment its key is uploaded in the AWS console —
            there is no activate step here. {connection.configuration?.lmccKeyCreatedAt
              ? keyExpiryInfo(connection.configuration.lmccKeyCreatedAt).label + '.'
              : ''}
          </p>
          <p className="text-figma-xs text-fw-bodyLight mb-3">
            Billing starts only when the connection goes Live, confirmed by both providers.
          </p>
          <button
            onClick={() => {
              updateConnection(connection.id.toString(), { status: 'Provisioning' } as any);
              useStore.getState().logActivity?.({
                type: 'key-uploaded',
                connectionId: connection.id.toString(),
                message: 'Activation key confirmed by AWS — provisioning began.',
              });
            }}
            className="px-3 py-1.5 rounded-lg border border-fw-secondary text-figma-xs font-medium text-fw-link hover:border-fw-active"
          >
            Demo: key uploaded in AWS
          </button>
        </div>
      )}

      {/* LMCC: the shape right after the state — diagram and promise read together */}
      {isLmcc && topologyBand}

      {/* Needs-attention explainer — plain language, what happened and what to do */}
      {isLmcc && displayStatus(connection) === 'Needs attention' && (
        <div className="bg-fw-errorLight/40 rounded-xl border border-fw-error/40 p-5">
          <h3 className="text-figma-base font-bold text-fw-heading mb-1">This connection needs attention</h3>
          <p className="text-figma-sm text-fw-body mb-2">
            Provisioning could not complete, or no path is currently passing traffic. Your
            configuration and contract are unchanged.
          </p>
          <p className="text-figma-sm text-fw-body">
            What to do next: retry the change if one was in flight, or raise a support request —
            AT&T and AWS coordinate the repair; no reconfiguration is needed on your side.
          </p>
        </div>
      )}

      {/* Traffic — bits in/out over 24h, drag-to-zoom, cumulative level */}
      {isActive && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          <TrafficChart
            connectionId={connection.id}
            bandwidthMbps={(() => {
              const m = String(connection.bandwidth ?? '').match(/([\d.]+)\s*(G|M)bps/i);
              return m ? (m[2].toUpperCase() === 'G' ? parseFloat(m[1]) * 1000 : parseFloat(m[1])) : 1000;
            })()}
          />
        </div>
      )}

      {/* GA assurance cards: MACsec · Contract · Last mile — last mile stays visually
          separate from tier/health (its resiliency is NOT covered by the tier). */}
      {isLmcc && lmccConnection && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="w-full h-full bg-fw-base rounded-xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-sm font-bold text-fw-heading">Encrypted core — MACsec</h3>
            </div>
            <p className="text-figma-xs text-fw-body leading-relaxed">
              On by default and cannot be disabled. Protects the AT&T↔AWS interconnect.
              It does not cover your last mile.
            </p>
          </div>
          <div className="w-full h-full bg-fw-base rounded-xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="h-4 w-4 text-fw-link" />
              <h3 className="text-figma-sm font-bold text-fw-heading">Contract</h3>
            </div>
            <p className="text-figma-xs text-fw-body">
              {lmccConnection.contractType === 'monthly' ? 'Month-to-month' : `${lmccConnection.contractType.replace('fixed-', '')}-month term`}
              {(() => {
                const months = lmccConnection.contractType.startsWith('fixed-') ? parseInt(lmccConnection.contractType.replace('fixed-', ''), 10) : 0;
                if (!months) return null;
                const renewal = new Date(lmccConnection.createdAt); renewal.setMonth(renewal.getMonth() + months);
                const remaining = Math.max(0, Math.ceil((renewal.getTime() - Date.now()) / (30 * 86400000)));
                return ` · ~${remaining} months remaining · renews ${renewal.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
              })()}
            </p>
            <p className="text-figma-xs text-fw-bodyLight mt-1.5">
              {lmccConnection.billing.startedAt
                ? `Billing started ${new Date(lmccConnection.billing.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — runs while Live.`
                : 'Billing starts when the connection is Live.'}
            </p>
          </div>
          <div className="w-full h-full bg-fw-base rounded-xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-2">
              <Cable className="h-4 w-4 text-fw-bodyLight" />
              <h3 className="text-figma-sm font-bold text-fw-heading">Last-mile access</h3>
            </div>
            <p className="flex items-center gap-1.5 text-figma-xs text-fw-body mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-fw-success inline-block" />
              {String(connection.configuration?.lmccTransport ?? 'mpls').toUpperCase()} circuit · Live
            </p>
            <p className="text-figma-xs text-fw-bodyLight leading-relaxed">
              Ordered and managed through AT&T outside this portal. View only — and note the
              resiliency tier does not cover this link.
            </p>
          </div>
        </div>
      )}

      {/* The one sanctioned four-path exposure: read-only peering sets for the engineer */}
      {isLmcc && lmccConnection && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          <PeeringSets connection={lmccConnection} />
        </div>
      )}

      {/* Area 1: Two columns - Details + Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Connection Details */}
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          <h3 className="text-figma-base font-bold text-fw-heading mb-3">Connection Details</h3>
          <Row label="Type" value={connection.type} />
          <Row label="Provider" value={providers} />
          <Row
            label="Location"
            value={isAws ? 'San Jose - SJ' : locations}
            copy={isAws ? 'San Jose - SJ' : locations}
          />
          {/* PRD: customers see metro names only — never colocation/datacenter names (LMCC). */}
          <Row label="Region / Metro" value={
            isLmcc
              ? `us-west-1 · ${connection.location || 'San Jose, CA'}`.replace('us-west-1', connection.location?.includes('Ashburn') ? 'us-east-1' : 'us-west-1')
              : getConnectionRegions(connection).join(' · ') || '—'
          } />
          <Row label="Bandwidth" value={connection.bandwidth} />
          <Row label="Resiliency" value={<ResiliencyBadge level={getResiliency(connection)} />} />
          <Row label="BGP" value={<BgpPill status={getBgpStatus(connection)} />} />
          <Row label="Plan" value={
            isLmcc && lmccConnection
              ? lmccConnection.contractType === 'monthly'
                ? 'Month-to-month'
                : lmccConnection.contractType === 'trial'
                  ? 'Trial (legacy)'
                  : `${lmccConnection.contractType.replace('fixed-', '')}-month term`
              : connection.billing?.planId?.replace(/-/g, ' ') || 'Pay as you go'
          } />
          {!isLmcc && connection.primaryIPE && connection.primaryIPE !== 'Not provisioned' && connection.primaryIPE !== 'Not configured' && (
            <Row label="Primary IPE" value={connection.primaryIPE} copy={connection.primaryIPE} />
          )}
          {!isLmcc && connection.secondaryIPE && (
            <Row label="Secondary IPE" value={connection.secondaryIPE} copy={connection.secondaryIPE} />
          )}
          {isLmcc && (
            <Row label="Transport" value="MPLS + Internet" />
          )}
          {/* Encryption / Firewall / DDoS suppressed for AWS — not surfaced on AWS Max */}
          {!isAws && !isLmcc && connection.security?.encryption && (
            <Row label="Encryption" value={connection.security.encryption} />
          )}
          {!isAws && !isLmcc && connection.security?.firewall !== undefined && (
            <Row label="Firewall" value={connection.security.firewall ? 'Enabled' : 'Disabled'} />
          )}
          {!isAws && !isLmcc && connection.security?.ddosProtection !== undefined && (
            <Row label="DDoS Protection" value={connection.security.ddosProtection ? 'Enabled' : 'Disabled'} />
          )}
        </div>

        {/* Right: Performance + Cost */}
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          {isActive && connection.performance ? (
            <>
              <h3 className="text-figma-base font-bold text-fw-heading mb-3">Performance</h3>
              <Row label="Latency" value={connection.performance.latency} />
              <Row label="Packet Loss" value={connection.performance.packetLoss} />
              <Row label="Uptime" value={connection.performance.uptime} />
              <Row label="Utilization" value={`${connection.performance.bandwidthUtilization}%`} />
              <Row label="Current Usage" value={connection.performance.currentUsage} />
              {!isLmcc && !isAws && (
                <div className="mt-4 pt-3 border-t border-fw-secondary">
                  <Row label="Monthly Cost" value={`$${connection.billing?.total?.toLocaleString() || '999'}/mo`} />
                </div>
              )}
            </>
          ) : isPending ? (
            <>
              <h3 className="text-figma-base font-bold text-fw-heading mb-3">Status</h3>
              <Row label="Status" value={<StatusBadge status={connection.status} size="sm" />} />
              {!isLmcc && !isAws && <Row label="Estimated Cost" value={`$${connection.billing?.total?.toLocaleString() || '999'}/mo`} />}
              <p className="text-figma-sm text-fw-bodyLight mt-4">Performance metrics available after activation.</p>
            </>
          ) : (
            <>
              <h3 className="text-figma-base font-bold text-fw-heading mb-3">Status</h3>
              <Row label="Status" value={<StatusBadge status={connection.status} size="sm" />} />
              {!isLmcc && !isAws && <Row label="Monthly Cost" value={`$${connection.billing?.total?.toLocaleString() || '999'}/mo`} />}
            </>
          )}
        </div>
      </div>

      {/* Area 2: IP Addresses & Subnets (LMCC only) */}
      {isLmcc && lmccConnection && lmccConnection.paths.some(p => p.subnet) && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
          <div className="px-5 py-3 border-b border-fw-secondary">
            <h3 className="text-figma-base font-bold text-fw-heading">IP Addresses &amp; Subnets</h3>
            <p className="text-figma-xs text-fw-bodyLight mt-0.5">Auto-assigned by AT&T · BGP peering addresses for all 4 paths</p>
          </div>
          <div className="divide-y divide-fw-secondary">
            {/* Column headers */}
            <div className="grid grid-cols-4 gap-4 px-5 py-2.5 bg-fw-wash">
              <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.07em]">Path</span>
              <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.07em]">/30 Subnet</span>
              <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.07em]">AT&T Peer IP</span>
              <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-[0.07em]">AWS Peer IP</span>
            </div>
            {lmccConnection.paths.map((path, i) => (
              <div key={path.id} className="grid grid-cols-4 gap-4 px-5 py-3 items-center hover:bg-fw-wash/60 transition-colors">
                {/* Path label */}
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    path.status === 'active' ? 'bg-fw-link' :
                    path.status === 'warning' ? 'bg-amber-400' :
                    'bg-fw-secondary'
                  }`} />
                  <span className="text-figma-sm font-semibold text-fw-heading font-mono">
                    VX-{path.awsConnectionId.replace('dxcon-', '').toUpperCase()}
                  </span>
                  <span className="text-figma-xs text-fw-bodyLight">{i < 2 ? 'Site A' : 'Site B'}</span>
                </div>
                {/* /30 subnet */}
                <div className="flex items-center gap-1">
                  <span className="text-figma-sm font-mono text-fw-heading">{path.subnet?.network ?? '—'}</span>
                  {path.subnet && <CopyButton value={path.subnet.network} />}
                </div>
                {/* AT&T peer IP */}
                <div className="flex items-center gap-1">
                  <span className="text-figma-sm font-mono text-fw-heading">{path.subnet?.attPeerIp ?? '—'}</span>
                  {path.subnet && <CopyButton value={path.subnet.attPeerIp} />}
                </div>
                {/* AWS peer IP */}
                <div className="flex items-center gap-1">
                  <span className="text-figma-sm font-mono text-fw-heading">{path.subnet?.awsPeerIp ?? '—'}</span>
                  {path.subnet && <CopyButton value={path.subnet.awsPeerIp} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <LegDetailDrawer
        connection={connection}
        legIndex={openLegIndex ?? 0}
        isOpen={openLegIndex !== null}
        onClose={() => setOpenLegIndex(null)}
        links={hubs.flatMap(g => g.links || [])}
        onUpdateLeg={(i, patch) => updateConnection(connection.id, { legs: applyLegPatch(connection, i, patch) })}
      />

      {/* Area 3: Resiliency (suppressed for LMCC — LMCCStatusPanel covers this) */}
      {!isLmcc && connection.status !== 'Pending' && connection.status !== 'Provisioning' && (
        <div className="bg-fw-base rounded-xl border border-fw-secondary p-5">
          <ResiliencyMap connection={connection} />
        </div>
      )}
    </div>
  );
}

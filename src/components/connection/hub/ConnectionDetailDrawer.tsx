import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight, AlertTriangle, ShieldCheck, Info, Network, Shield, Cable, Layers, MapPin, Server } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { CloudLegs } from '../CloudLegs';
import { ConnectionTypeIcon } from '../icons/ConnectionTypeIcon';
import { useStore } from '../../../store/useStore';
import { sampleVNFs } from '../../../data/sampleInfrastructure';
import { isC2C, getConnectionLegs } from '../../../utils/connectionLegs';
import { getResiliency, getSlaThisMonth, getUtilization, getFacility } from '../../../utils/connectionFacts';
import { getSharedObjects, type SharedPeerGroup, type InsightTone } from '../../../utils/connectionInsights';
import type { Connection } from '../../../types';

/**
 * Right-hand drawer for one connection. Beyond the connection's own (type-specific)
 * fields, it surfaces SHARED OBJECTS & INSIGHTS — what this connection shares with the
 * rest of the fleet (hub siblings, the IPE it rides, VNFs that protect it, co-tenant
 * VLANs, pool/provider/metro peers) plus derived risk/redundancy callouts. Peers are
 * clickable to pivot the drawer to that connection.
 */

interface ConnectionDetailDrawerProps {
  connection: Connection | null;
  onClose: () => void;
  /** Pivot the drawer to a related connection (clicking a shared peer). */
  onSelectPeer?: (connection: Connection) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-fw-secondary/60 last:border-0">
      <span className="text-figma-xs font-medium text-fw-bodyLight shrink-0">{label}</span>
      <span className="text-figma-sm text-fw-heading text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

function cfg(c: Connection, key: string): string | undefined {
  const v = c.configuration?.[key];
  return v == null || v === '' ? undefined : String(v);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight mb-2">{title}</h4>
      <div className="rounded-xl border border-fw-secondary bg-fw-wash px-4 py-1">{children}</div>
    </div>
  );
}

// Per-type attribute rows — the disparate fields, surfaced in the drawer not the table.
function TypeSpecific({ c }: { c: Connection }) {
  if (isC2C(c)) {
    const legs = getConnectionLegs(c);
    return (
      <Section title="Cloud-to-Cloud">
        <Row label="Endpoints">
          <span className="font-medium">{legs.map((l) => l.provider).join(' ⇄ ')}</span>
        </Row>
        {legs.map((l, i) => (
          <Row key={i} label={`${l.provider} leg`}>
            {l.location ?? '—'} · {l.bandwidth} · {l.status}
          </Row>
        ))}
        {cfg(c, 'peeringType') && <Row label="Peering">{cfg(c, 'peeringType')}</Row>}
        {cfg(c, 'encryptionMode') && <Row label="Encryption">{cfg(c, 'encryptionMode')}</Row>}
        {cfg(c, 'routeExchange') && <Row label="Route exchange">{cfg(c, 'routeExchange')}</Row>}
      </Section>
    );
  }
  if (c.type === 'VPN to Cloud') {
    return (
      <Section title="VPN to Cloud">
        {cfg(c, 'tunnelProtocol') && <Row label="Tunnel"><span className="uppercase">{cfg(c, 'tunnelProtocol')}</span></Row>}
        {cfg(c, 'peerIp') && <Row label="Peer IP"><span className="font-mono">{cfg(c, 'peerIp')}</span></Row>}
        <Row label="Encryption">{c.security?.encryption ?? '—'}</Row>
        <Row label="Tunnels">{c.performance?.tunnels ?? '—'}</Row>
      </Section>
    );
  }
  if (c.type === 'DataCenter/CoLocation to Cloud') {
    return (
      <Section title="DataCenter / CoLocation">
        <Row label="Facility">{getFacility(c.location) ?? '—'}</Row>
        <Row label="Dedicated">{c.features?.dedicatedConnection ? 'Yes' : 'No'}</Row>
      </Section>
    );
  }
  // Internet to Cloud (and variants)
  return (
    <Section title="Internet to Cloud">
      {cfg(c, 'vifType') && <Row label="VIF / Access">{cfg(c, 'vifType')}</Row>}
      {cfg(c, 'serviceAccessType') && <Row label="Service access">{cfg(c, 'serviceAccessType')}</Row>}
      <Row label="DDoS protection">{c.security?.ddosProtection ? 'On' : 'Off'}</Row>
    </Section>
  );
}

const INSIGHT_STYLE: Record<InsightTone, { cls: string; Icon: typeof Info }> = {
  risk: { cls: 'bg-fw-errorLight text-fw-error border-fw-error/30', Icon: AlertTriangle },
  warn: { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle },
  good: { cls: 'bg-fw-successLight text-fw-success border-fw-success/30', Icon: ShieldCheck },
  info: { cls: 'bg-fw-accent text-fw-link border-fw-active/20', Icon: Info },
};

function PeerGroup({ group, icon: Icon, onSelect }: { group: SharedPeerGroup; icon: typeof Info; onSelect?: (c: Connection) => void }) {
  return (
    <div className="rounded-xl border border-fw-secondary overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-fw-wash border-b border-fw-secondary">
        <Icon className="h-3.5 w-3.5 text-fw-bodyLight shrink-0" />
        <span className="text-figma-sm font-semibold text-fw-heading truncate">{group.label}</span>
        {group.sublabel && <span className="text-figma-xs text-fw-bodyLight ml-auto shrink-0">{group.sublabel}</span>}
      </div>
      {group.peers.length === 0 ? (
        <p className="px-3 py-2 text-figma-xs text-fw-disabled">No other connections</p>
      ) : (
        <ul className="divide-y divide-fw-secondary/60">
          {group.peers.slice(0, 6).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect?.(p)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-fw-wash transition-colors group"
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.status === 'Active' ? 'bg-fw-success' : p.status === 'Pending' || p.status === 'Provisioning' ? 'bg-fw-active' : 'bg-fw-disabled'}`} />
                <span className="text-figma-xs text-fw-body truncate flex-1">{p.name}</span>
                <span className="text-[10px] text-fw-bodyLight shrink-0">{(p.providers?.length ?? 0) > 1 ? 'C2C' : p.type.replace(' to Cloud', '')}</span>
                <ChevronRight className="h-3 w-3 text-fw-disabled group-hover:text-fw-link shrink-0" />
              </button>
            </li>
          ))}
          {group.peers.length > 6 && (
            <li className="px-3 py-1.5 text-[10px] text-fw-bodyLight">+{group.peers.length - 6} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

export function ConnectionDetailDrawer({ connection, onClose, onSelectPeer }: ConnectionDetailDrawerProps) {
  const navigate = useNavigate();
  const connections = useStore((s) => s.connections);
  const hubs = useStore((s) => s.hubs);
  const c = connection;
  const shared = c ? getSharedObjects(c, { connections, hubs, vnfs: sampleVNFs }) : null;

  return (
    <SideDrawer
      isOpen={!!c}
      onClose={onClose}
      title={c?.name ?? 'Connection'}
      size="md"
      footer={c && (
        <button
          onClick={() => navigate(`/connections/${c.id}`)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-fw-primary text-white text-figma-sm font-semibold hover:bg-fw-primaryHover transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open full connection
        </button>
      )}
    >
      {c && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-fw-link"><ConnectionTypeIcon type={isC2C(c) ? 'Cloud to Cloud' : c.type} size={20} /></span>
            <span className="text-figma-base font-bold text-fw-heading">{isC2C(c) ? 'Cloud to Cloud' : c.type}</span>
            {isC2C(c) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-lightBlue text-fw-link">C2C</span>}
          </div>

          <Section title="Overview">
            <Row label="Status">{c.status}</Row>
            <Row label="Provider(s)"><CloudLegs connection={c} withLogos logoSize={16} /></Row>
            <Row label="Location">{c.location || '—'}</Row>
            <Row label="Bandwidth">{c.bandwidth}</Row>
            <Row label="Resiliency">{getResiliency(c)}</Row>
            <Row label="SLA (this month)">{getSlaThisMonth(c)}</Row>
            <Row label="Utilization">{getUtilization(c)}%</Row>
          </Section>

          <TypeSpecific c={c} />

          <Section title="Performance">
            <Row label="Latency">{c.performance?.latency ?? '—'}</Row>
            <Row label="Packet loss">{c.performance?.packetLoss ?? '—'}</Row>
            <Row label="Uptime">{c.performance?.uptime ?? '—'}</Row>
            <Row label="Throughput">{c.performance?.throughput ?? '—'}</Row>
          </Section>

          {/* ── Shared objects & insights ── */}
          {shared && (
            <div className="mb-6">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight mb-2">Shared objects &amp; insights</h4>

              {/* Derived insights */}
              {shared.insights.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {shared.insights.map((ins, i) => {
                    const { cls, Icon } = INSIGHT_STYLE[ins.tone];
                    return (
                      <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-figma-xs ${cls}`}>
                        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="leading-snug">{ins.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Shared services (VNFs) + co-tenant VLANs */}
              {(shared.vnfs.length > 0 || shared.vlans.length > 0) && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl border border-fw-secondary bg-fw-wash px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5"><Shield className="h-3.5 w-3.5 text-fw-bodyLight" /><span className="text-figma-xs font-semibold text-fw-heading">VNFs serving this</span></div>
                    {shared.vnfs.length === 0 ? <p className="text-figma-xs text-fw-disabled">None</p> : (
                      <ul className="space-y-1">
                        {shared.vnfs.slice(0, 4).map(({ vnf, sharedWith }) => (
                          <li key={vnf.id} className="text-figma-xs text-fw-body truncate" title={`${vnf.name} (${vnf.vendor})`}>
                            {vnf.name}{sharedWith > 0 && <span className="text-fw-bodyLight"> · +{sharedWith} shared</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border border-fw-secondary bg-fw-wash px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5"><Cable className="h-3.5 w-3.5 text-fw-bodyLight" /><span className="text-figma-xs font-semibold text-fw-heading">Co-tenant VLANs</span></div>
                    {shared.vlans.length === 0 ? <p className="text-figma-xs text-fw-disabled">None</p> : (
                      <ul className="space-y-1">
                        {shared.vlans.slice(0, 4).map((l) => (
                          <li key={l.id} className="text-figma-xs text-fw-body truncate" title={l.name}>
                            VLAN {l.vlanId}{l.provider ? ` · ${l.provider}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Peer groups — clickable to pivot the drawer */}
              <div className="space-y-2">
                {shared.hubGroups.map((g) => <PeerGroup key={g.key} group={g} icon={Network} onSelect={onSelectPeer} />)}
                {shared.ipeGroup && <PeerGroup group={shared.ipeGroup} icon={Server} onSelect={onSelectPeer} />}
                {shared.poolGroup && <PeerGroup group={shared.poolGroup} icon={Layers} onSelect={onSelectPeer} />}
                {shared.providerGroups.map((g) => <PeerGroup key={g.key} group={g} icon={Network} onSelect={onSelectPeer} />)}
                {shared.metroGroup && <PeerGroup group={shared.metroGroup} icon={MapPin} onSelect={onSelectPeer} />}
              </div>
            </div>
          )}
        </div>
      )}
    </SideDrawer>
  );
}

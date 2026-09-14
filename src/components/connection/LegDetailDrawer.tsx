import { Cloud, MapPin, Gauge, Activity, Network, Server } from 'lucide-react';
import { SideDrawer } from '../common/SideDrawer';
import { getConnectionLegs } from '../../utils/connectionLegs';
import { getLegProviderContext } from '../../utils/legProviderContext';
import { providerColor } from '../../utils/providerColors';
import type { Connection, ConnectionLegConfig, Link } from '../../types/connection';

const BANDWIDTH_OPTIONS = ['100 Mbps', '500 Mbps', '1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '100 Gbps'];

interface LegDetailDrawerProps {
  connection: Connection;
  legIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Provider-tagged links so the drawer can list the VLANs on this leg. */
  links?: Link[];
  /** When provided, the leg becomes editable (e.g. per-leg bandwidth). */
  onUpdateLeg?: (legIndex: number, patch: Partial<ConnectionLegConfig>) => void;
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-fw-secondary last:border-b-0">
      <div className="text-fw-bodyLight mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-figma-xs text-fw-bodyLight">{label}</p>
        <p className="text-figma-sm font-medium text-fw-heading break-words">{value}</p>
      </div>
    </div>
  );
}

/**
 * Deep view of a single C2C leg: the one cloud destination, the provider-native
 * object it provisions, its BGP ASN and AT&T transport, plus the links on it. The
 * Hub remains the hub; this drawer is "go deeper" on one spoke.
 */
export function LegDetailDrawer({ connection, legIndex, isOpen, onClose, links, onUpdateLeg }: LegDetailDrawerProps) {
  const legs = getConnectionLegs(connection, links);
  const leg = legs[legIndex];

  if (!isOpen || !leg) return null;

  const ctx = getLegProviderContext(leg.provider);
  const legLinks = (links ?? []).filter((l) => l.provider === leg.provider);
  const dot = providerColor(leg.provider);
  const active = leg.status === 'Active';
  // Per the modify-active rule, leg config is only editable when the connection is not Active.
  const canEdit = !!onUpdateLeg && connection.status !== 'Active';

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title={`${leg.provider} leg`} size="md">
      <div className="space-y-6">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-fw-wash flex items-center justify-center relative">
            <Cloud className="w-6 h-6 text-fw-bodyLight" />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ backgroundColor: dot }} />
          </div>
          <div>
            <p className="text-figma-lg font-bold text-fw-heading">{leg.provider} Cloud</p>
            <p className="text-figma-sm text-fw-bodyLight">{ctx.c2cMechanism}</p>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-figma-xs font-medium ${
              active ? 'bg-fw-successLight text-fw-success' : 'bg-fw-secondary text-fw-disabled'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-fw-success' : 'bg-fw-disabled'}`} />
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* AT&T frame, provider detail */}
        <div className="bg-fw-base border border-fw-secondary rounded-xl px-4">
          <Row icon={<Server className="h-4 w-4" />} label="Provisions" value={ctx.nativeObject} />
          <Row icon={<MapPin className="h-4 w-4" />} label="Location" value={leg.location || '—'} />
          <Row
            icon={<Gauge className="h-4 w-4" />}
            label="Bandwidth"
            value={
              canEdit ? (
                <select
                  aria-label="Leg bandwidth"
                  value={leg.bandwidth}
                  onChange={(e) => onUpdateLeg!(legIndex, { bandwidth: e.target.value })}
                  className="mt-0.5 w-full max-w-[160px] h-8 px-2 rounded-lg border border-fw-primary text-figma-sm font-medium text-fw-heading bg-fw-base focus:border-fw-active focus:outline-none focus:ring-1 focus:ring-fw-active"
                >
                  {[...new Set([leg.bandwidth, ...BANDWIDTH_OPTIONS])].filter(Boolean).map((bw) => (
                    <option key={bw} value={bw}>{bw}</option>
                  ))}
                </select>
              ) : (
                <>
                  {leg.bandwidth}
                  {onUpdateLeg && active && (
                    <span className="block text-figma-xs text-fw-bodyLight font-normal">Deactivate the connection to modify</span>
                  )}
                </>
              )
            }
          />
          <Row icon={<Network className="h-4 w-4" />} label="AT&T transport" value={ctx.transport} />
          <Row
            icon={<Activity className="h-4 w-4" />}
            label="Provider BGP ASN"
            value={ctx.asn ? String(ctx.asn) : 'Customer-assigned'}
          />
        </div>

        {/* Links on this leg */}
        <div>
          <h4 className="text-figma-sm font-bold text-fw-heading mb-2">Links on this leg</h4>
          {legLinks.length === 0 ? (
            <p className="text-figma-sm text-fw-bodyLight">No links tagged to this leg yet.</p>
          ) : (
            <ul className="space-y-2">
              {legLinks.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between bg-fw-base border border-fw-secondary rounded-lg px-3 py-2"
                >
                  <span className="text-figma-sm font-medium text-fw-heading">{l.name}</span>
                  <span className="text-figma-xs text-fw-bodyLight tabular-nums">VLAN {l.vlanId}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SideDrawer>
  );
}

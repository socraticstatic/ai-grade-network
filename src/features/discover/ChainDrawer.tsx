import { X, Link2, Globe, Network, ArrowDown } from 'lucide-react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { attachmentChain, workloadsOnRamp, rampShort, bandwidthOf } from './attachmentModel';
import { managedNoun } from '../connect/managedVpcWizardModel';
import type { ManagedVpc } from '../../engine/types';

/**
 * The Attachment Map's detail drawer. A workload selection renders the chain
 * top-to-bottom — workload → gateways → circuit → AT&T site — each hop with
 * its details; the unattached variant ends at the public internet and offers
 * the SAME engine attach action the tree offers (`activateOnramp`), so the
 * map can close the gap it names. An on-ramp selection shows the inverse:
 * the circuit, and every workload riding it.
 */

export type MapSelection =
  | { kind: 'workload'; cloudId: string; regionId: string; vpcId: string }
  | { kind: 'onramp'; onrampId: string };

function Hop({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-fw-secondary bg-fw-base px-3 py-2">
      <div className="text-figma-sm font-medium text-fw-heading">{title}</div>
      {sub && <div className="text-[11px] text-fw-bodyLight">{sub}</div>}
      {children}
    </div>
  );
}

const Down = () => (
  <div className="flex justify-center py-0.5 text-fw-bodyLight">
    <ArrowDown size={13} aria-hidden="true" />
  </div>
);

/** The vSRX HA pair's live detail, rendered under the managed-hop node once
 *  the record has earned live: nodes with role + state, interfaces with
 *  toward + state, BGP sessions as state chips, throughput. */
function ManagedVpcDetail({ managedVpc }: { managedVpc: ManagedVpc }) {
  return (
    <div className="mt-1 space-y-1.5 rounded-lg border border-fw-secondary bg-fw-wash/60 px-2.5 py-2 text-[11px]">
      <div className="space-y-0.5">
        {managedVpc.vsrx.nodes.map(n => (
          <div key={n.id} className="flex items-center justify-between text-fw-bodyLight">
            <span>{`${n.id} · ${n.role}`}</span>
            <span className="font-medium text-fw-heading">{n.state}</span>
          </div>
        ))}
      </div>
      <div className="space-y-0.5 border-t border-fw-secondary/60 pt-1">
        {managedVpc.vsrx.interfaces.map(i => (
          <div key={i.name} className="flex items-center justify-between text-fw-bodyLight">
            <span>{`${i.name} → ${i.toward}`}</span>
            <span className="font-medium text-fw-heading">{i.state}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-fw-secondary/60 pt-1">
        {managedVpc.vsrx.bgp.map(b => (
          <div key={b.peer} className="flex items-center justify-between">
            <span className="text-fw-bodyLight">{b.label}</span>
            <span className={`inline-flex items-center rounded-full px-1.5 py-px font-medium ${
              b.state === 'established'
                ? 'border border-fw-success bg-fw-successLight text-fw-success'
                : 'border border-fw-secondary bg-fw-wash text-fw-bodyLight'
            }`}>
              {b.state}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-fw-secondary/60 pt-1 text-fw-bodyLight">
        {`Throughput ${managedVpc.vsrx.throughput}`}
      </div>
    </div>
  );
}

export function ChainDrawer({
  selection, onClose, onDeployManagedVpc,
}: {
  selection: MapSelection;
  onClose: () => void;
  /** Provided by the map when it hosts the wizard. The door itself only
   *  renders once the region has no managed-VPC record at any stage — a
   *  deploy in flight or already live owns the space instead. */
  onDeployManagedVpc?: (cloudId: string, regionId: string) => void;
}) {
  const cc = useCloudControl(c => c);
  const actions = useCloudControlActions();

  return (
    <aside
      role="dialog"
      aria-label="Attachment detail"
      data-testid="chain-drawer"
      className="w-full shrink-0 space-y-2 rounded-xl border border-fw-secondary bg-fw-wash/40 p-4 lg:w-[340px]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-figma-base font-semibold text-fw-heading">
          {selection.kind === 'workload' ? 'Attachment chain' : 'Circuit detail'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="rounded-md p-1 text-fw-bodyLight transition-colors hover:bg-fw-wash hover:text-fw-heading"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {selection.kind === 'workload' ? (() => {
        const chain = attachmentChain(cc, selection.cloudId, selection.regionId, selection.vpcId);
        if (!chain) return <p className="text-figma-sm text-fw-bodyLight">Workload not found.</p>;
        const ramp = chain.candidateOnrampId
          ? (cc as unknown as { onramps: { id: string; name: string; active?: boolean }[] }).onramps.find(o => o.id === chain.candidateOnrampId)
          : undefined;
        const canAttach = ramp && !ramp.active;
        const hasManagedRecord = !!cc.managedVpcFor?.(selection.cloudId, selection.regionId);
        const regionName = ((cc.regions?.[selection.cloudId] ?? []) as { id: string; name: string }[])
          .find(r => r.id === selection.regionId)?.name ?? selection.regionId;
        return (
          <div>
            <Hop title={chain.workload.name} sub={`${chain.workload.cidr} · ${chain.workload.role}`}>
              <div className="mt-1 text-[11px] text-fw-bodyLight">
                {chain.workload.endpoints.enis} endpoints · {chain.workload.endpoints.serviceEndpoints.join(', ') || 'no service endpoints'}
              </div>
            </Hop>
            {chain.gateways.map(g => (
              <div key={g.id}>
                <Down />
                <Hop title={g.name} sub={g.type} />
                {chain.managedVpc && g.id === chain.managedVpc.id && (
                  <ManagedVpcDetail managedVpc={chain.managedVpc} />
                )}
              </div>
            ))}
            {!hasManagedRecord && onDeployManagedVpc && (
              <button
                type="button"
                onClick={() => onDeployManagedVpc(selection.cloudId, selection.regionId)}
                className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-fw-secondary px-3 text-figma-xs font-semibold text-fw-body transition-colors hover:bg-fw-wash"
              >
                {`Deploy ${managedNoun(selection.cloudId).replace('Managed', 'managed')} in ${regionName}`}
              </button>
            )}
            <Down />
            {chain.circuit ? (
              <>
                <Hop title={chain.circuit.name} sub={`${chain.circuit.type} · ${chain.circuit.site} · ${chain.circuit.bandwidth}`}>
                  <div className="mt-1 space-y-0.5 text-[11px] text-fw-bodyLight">
                    <div>{`VLAN ${chain.circuit.vlan}`}</div>
                    <div>{`Routes exchanged (BGP) ${chain.circuit.bgp.customerAsn} ↔ ${chain.circuit.bgp.providerAsn}`}</div>
                  </div>
                </Hop>
                {chain.path.kind === 'private' ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-fw-success bg-fw-successLight px-2 py-0.5 text-[11px] font-medium text-fw-success">
                    <Link2 size={12} aria-hidden="true" />
                    {`Private path · ${chain.path.latencyMs} ms`}
                  </div>
                ) : (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-fw-secondary bg-fw-wash px-2 py-0.5 text-[11px] font-medium text-fw-bodyLight">
                    <Globe size={12} aria-hidden="true" />
                    {`Public path · ${chain.path.latencyMs} ms`}
                  </div>
                )}
              </>
            ) : (
              <>
                <Hop title="Public internet" sub={chain.internet?.egressNote} />
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-fw-secondary bg-fw-wash px-2 py-0.5 text-[11px] font-medium text-fw-bodyLight">
                  <Globe size={12} aria-hidden="true" />
                  {`Public path · ${chain.path.latencyMs} ms`}
                </div>
                {canAttach && (
                  <button
                    type="button"
                    onClick={() => actions.activateOnramp(ramp.id)}
                    className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg bg-fw-ctaPrimary px-3 text-figma-xs font-semibold text-white transition-colors hover:bg-fw-ctaPrimaryHover"
                  >
                    {`Attach via ${ramp.name}`}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })() : (() => {
        const ramp = (cc as unknown as { onramps: { id: string; name: string; type: string; sub: string; active?: boolean; site: { name: string } }[] })
          .onramps.find(o => o.id === selection.onrampId);
        if (!ramp) return <p className="text-figma-sm text-fw-bodyLight">Circuit not found.</p>;
        const riders = workloadsOnRamp(cc, ramp.id);
        return (
          <div className="space-y-2">
            <Hop title={ramp.name} sub={`${rampShort(ramp.type)} · ${ramp.site.name} · ${bandwidthOf(ramp.sub)}`}>
              <div className="mt-1 text-[11px] text-fw-bodyLight">{ramp.active ? 'Active' : 'Not active'}</div>
            </Hop>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fw-bodyLight">
                Workloads riding this circuit
              </div>
              <ul data-testid="ramp-workloads" className="space-y-1">
                {riders.map(w => (
                  <li key={w.vpc.id} className="flex items-center gap-2 rounded-lg border border-fw-secondary bg-fw-base px-3 py-1.5 text-figma-sm text-fw-heading">
                    <Network size={13} className="shrink-0 text-fw-bodyLight" aria-hidden="true" />
                    {w.vpc.name}
                    <span className="ml-auto font-mono text-[11px] text-fw-bodyLight">{w.vpc.cidr}</span>
                  </li>
                ))}
                {riders.length === 0 && (
                  <li className="text-figma-sm text-fw-bodyLight">No attached workloads yet.</li>
                )}
              </ul>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}

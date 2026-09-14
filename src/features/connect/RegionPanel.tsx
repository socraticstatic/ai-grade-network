import { useState } from 'react';
import { Gauge, ShieldCheck, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { ATTACH_TYPES } from './attachCatalog';
import { PathChoice } from './PathChoice';
import { DeployManagedVpcWizard } from './DeployManagedVpcWizard';
import { TIERS, MANAGED_CLOUDS, managedNoun } from './managedVpcWizardModel';
import type { FabricModel } from './FabricHero';
import type { FabricRegion } from '../../engine/types';

/* ------------------------------------------------------------------ *
 * Region panel — the selected region as a first-class object. Foregrounds
 * ONLY the three focuses (reliability / performance / private-public) and
 * hosts attach types as a per-region function (folded off the old top-level
 * AttachTypes block). A Provision button opens the wizard.
 * ------------------------------------------------------------------ */

function ReliabilityPill({ reliability }: { reliability: FabricRegion['reliability'] }) {
  const map = {
    dual: { t: 'Dual · resilient', cls: 'bg-fw-successLight text-fw-success' },
    single: { t: 'Single path', cls: 'bg-fw-ctaPrimary/[0.08] text-fw-link' },
    none: { t: 'Not attached', cls: 'bg-fw-neutral text-fw-bodyLight' },
  } as const;
  const m = map[reliability];
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium ${m.cls}`}>{m.t}</span>;
}

/** The attach type the region's on-ramp implies (badged "on this region"). */
function activeAttachId(region: FabricRegion, model: FabricModel): string {
  const type = model.onramps.find(o => region.onrampIds.includes(o.id) && o.active)?.type ?? '';
  if (/direct connect|expressroute|interconnect/i.test(type)) return 'dedicated';
  if (/netbond/i.test(type)) return 'ip';
  return '';
}

/** The "Managed VPC" block — an AT&T-managed gateway VPC/VNET door scoped to
 *  this region, folded in after the existing attach content. AWS/Azure only;
 *  other clouds render nothing. Deploying and live states read straight off
 *  `useCloudControl` so the block advances live as the engine's own clock
 *  ticks the record through its stages — no local "mode" state duplicated
 *  here. The wizard itself mounts fresh per open (never a long-lived
 *  instance) per the Task 3 review: it seeds its state from props at mount. */
function ManagedVpcBlock({ region }: { region: FabricRegion }) {
  const [open, setOpen] = useState(false);
  const record = useCloudControl(cc => cc.managedVpcFor(region.cloudId, region.regionId));

  if (!MANAGED_CLOUDS.includes(region.cloudId)) return null;

  const currentStage = record?.stages.find(s => s.key === record.stage);
  const tierLabel = record ? TIERS.find(t => t.id === record.tier)?.label ?? record.tier : '';
  const noun = managedNoun(region.cloudId);
  const gatewayNoun = region.cloudId === 'azure' ? 'VNET' : 'VPC';

  return (
    <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3 space-y-1.5">
      <h3 className="text-figma-sm font-semibold text-fw-heading">{noun}</h3>

      {!record && (
        <div className="space-y-2">
          <p className="text-figma-xs text-fw-bodyLight">An AT&amp;T-managed gateway {gatewayNoun} with a vSRX HA pair, plumbed to your workloads and to AT&amp;T.</p>
          <button
            type="button" onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-figma-xs font-semibold bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover transition-colors"
          >
            Deploy {noun.replace('Managed', 'managed')}
          </button>
        </div>
      )}

      {record && record.stage !== 'live' && currentStage && (
        <div>
          <div className="text-figma-sm font-medium text-fw-heading">{currentStage.label}</div>
          <div className="text-figma-xs text-fw-bodyLight">{currentStage.detail}</div>
        </div>
      )}

      {record && record.stage === 'live' && (
        <div>
          <div className="text-figma-sm font-semibold text-fw-heading">{record.name}</div>
          <div className="text-figma-xs text-fw-bodyLight">{tierLabel} · vSRX HA pair · routes exchanged both ways (BGP)</div>
        </div>
      )}

      {open && (
        <DeployManagedVpcWizard
          lockedRegion={{ cloudId: region.cloudId, regionId: region.regionId }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

interface RegionPanelProps {
  region: FabricRegion;
  model: FabricModel;
  onProvision: () => void;
  onProvisioned: (regionId: string) => void;
}

export function RegionPanel({ region, model, onProvision, onProvisioned }: RegionPanelProps) {
  const actions = useCloudControlActions();
  const activeAttach = activeAttachId(region, model);

  const makeDual = () => {
    actions.provisionRegion(region.regionId, { resilient: true });
    onProvisioned(region.regionId);
  };

  return (
    <section aria-label={`${region.cloudName} ${region.name}`} className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4">
      <header className="flex items-center gap-3">
        <ProviderLogo id={region.cloudId} size={34} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-fw-heading leading-tight">{region.name}</div>
          <div className="text-figma-xs text-fw-bodyLight leading-tight">{region.cloudName}</div>
        </div>
        <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium ${
          region.path === 'private' ? 'bg-fw-ctaPrimary/[0.08] text-fw-link' : 'bg-fw-neutral text-fw-bodyLight'
        }`}>{region.path === 'private' ? 'Private' : 'Public'}</span>
      </header>

      {/* the three focuses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight"><ShieldCheck size={13} /> Reliability</div>
          <div className="mt-1.5 flex items-center gap-2">
            <ReliabilityPill reliability={region.reliability} />
          </div>
          {region.reliability !== 'dual' && region.path === 'private' && (
            <button type="button" onClick={makeDual}
              className="mt-2 text-figma-xs font-medium text-fw-link hover:underline">Make dual →</button>
          )}
        </div>
        {/* Performance states the figure for the path this region is ON, and
            says which path that is. The headline used to be the fabric RTT
            regardless — 40ms under a "Public" pill 60px above it, beside a
            "View in Observe" link landing on a flow row reading 68ms for the
            same region. An unattached region now leads with what it costs
            today and names what the fabric would cost, which is the sentence
            the attach CTA below is arguing for. */}
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight"><Gauge size={13} /> Performance</div>
          <div data-testid="region-latency" className="mt-1.5 text-figma-lg font-semibold text-fw-heading tabular-nums">{region.latencyMs}<span className="text-figma-sm font-normal text-fw-bodyLight">ms</span></div>
          <div className="text-figma-xs text-fw-bodyLight">
            {region.path === 'private'
              ? 'on the AT&T fabric'
              : 'on the public internet today'}
          </div>
          {/* The figure is cobalt (the private/on-fabric encoding this screen
              uses everywhere); the words stay body colour so the line does not
              read as a second link above the real one. */}
          {region.path === 'public' && (
            <div data-testid="region-latency-fabric" className="text-figma-xs text-fw-bodyLight">
              <span className="font-semibold text-fw-link">{region.privateMs}ms</span> on the fabric
            </div>
          )}
          <Link to="/naas/observe" className="mt-1 inline-flex items-center gap-0.5 text-figma-xs font-medium text-fw-link hover:underline">View in Observe <ArrowRight size={12} /></Link>
        </div>
        <div className="rounded-xl border border-fw-secondary bg-fw-wash p-3">
          <div className="flex items-center gap-1.5 text-figma-xs text-fw-bodyLight"><Layers size={13} /> Reach</div>
          <div className="mt-1.5 text-figma-sm text-fw-body">
            {region.path === 'private'
              ? `On the fabric via ${region.onrampIds.map(id => model.onramps.find(o => o.id === id)?.name?.split(' · ')[0]).filter(Boolean).join(', ') || 'AT&T'}`
              : 'On the public internet — not yet attached'}
          </div>
        </div>
      </div>

      <PathChoice cloudId={region.cloudId} regionId={region.regionId} />

      {/* attach types — region-scoped (folded from the old top-level block) */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-figma-sm font-semibold text-fw-heading">Attach type</h3>
          <span className="text-figma-xs text-fw-bodyLight">how {region.name} rides the fabric</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ATTACH_TYPES.map(t => {
            const isActive = activeAttach === t.id;
            return (
              <div key={t.id} className={`rounded-lg border p-2.5 ${isActive ? 'border-fw-active bg-fw-ctaPrimary/[0.04]' : 'border-fw-secondary bg-fw-base'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-figma-sm font-medium ${isActive ? 'text-fw-link' : 'text-fw-heading'}`}>{t.label}</span>
                  {isActive && <span className="ml-auto inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium bg-fw-successLight text-fw-success shrink-0">On this region</span>}
                </div>
                <div className="mt-1 text-[11px] text-fw-bodyLight">{t.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <ManagedVpcBlock region={region} />

      <button
        type="button" data-testid="open-provision-wizard" onClick={onProvision}
        className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-figma-sm font-semibold bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover transition-colors"
      >
        {region.path === 'private' ? 'Reprovision connectivity' : 'Provision connectivity'} <ArrowRight size={15} />
      </button>
    </section>
  );
}

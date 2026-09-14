import { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { StationTrack } from '../../components/viz/kit';
import { servingRamp } from '../discover/attachmentModel';
import { WizardCanvas } from './WizardCanvas';
import type { WizardCanvasSpec, RibbonThickness } from './wizardCanvasModel';
import {
  WIZ_STEPS, type WizStep,
  eligibleRegions,
  TIERS,
  validCidr,
  confirmCopy,
  managedNoun,
} from './managedVpcWizardModel';
import type { ManagedVpc } from '../../engine/types';

/** Tier id -> ribbon thickness. Keyed by TIERS[].id ('500M'/'1G'/'5G'), not
 *  the display label, since that's what the wizard's `tier` state holds. */
const TIER_THICKNESS: Record<(typeof TIERS)[number]['id'], RibbonThickness> = {
  '500M': 'thin',
  '1G': 'medium',
  '5G': 'thick',
};

/* ------------------------------------------------------------------ *
 * Deploy Managed VPC wizard + live tracker (follows ProvisionWizard's
 * dialog idiom: overlay div, stopPropagation, step dots).
 *
 *   [region] -> tier -> cidr -> confirm --deploy--> tracker
 *
 * `lockedRegion` (opened from a region's own door) skips the region step
 * and pins cloud/region as a static header line instead of a picker.
 *
 * Deploying never closes the dialog — `actions.deployManagedVpc(...)`
 * creates the engine record, and `cc.managedVpcFor(cloudId, regionId)`
 * existing is the ONLY thing that decides whether this renders the wizard
 * or the tracker. That single check also covers the race the brief calls
 * out (both doors open, the other one wins) and — since it is read through
 * useCloudControl — the tracker keeps re-rendering live as the engine
 * advances the stages on its own clock, no local "mode" state required.
 * ------------------------------------------------------------------ */

const STEP_LABEL: Record<WizStep, string> = {
  region: 'Region',
  tier: 'Tier',
  cidr: 'CIDR',
  confirm: 'Confirm',
};

interface DeployManagedVpcWizardProps {
  lockedRegion?: { cloudId: string; regionId: string };
  onClose: () => void;
}

export function DeployManagedVpcWizard({ lockedRegion, onClose }: DeployManagedVpcWizardProps) {
  const actions = useCloudControlActions();
  const regions = useCloudControl(eligibleRegions);

  const [cloudId, setCloudId] = useState(lockedRegion?.cloudId ?? '');
  const [regionId, setRegionId] = useState(lockedRegion?.regionId ?? '');
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState<(typeof TIERS)[number]['id']>('1G');
  const [cidr, setCidr] = useState(() => actions.suggestManagedCidr());

  const record = useCloudControl(cc =>
    cloudId && regionId ? cc.managedVpcFor(cloudId, regionId) : null
  );
  const cloudName = useCloudControl(cc =>
    ((cc.clouds as { id: string; name: string }[]) || []).find(c => c.id === cloudId)?.name ?? cloudId
  );
  const regionName = useCloudControl(cc =>
    (((cc.regions as Record<string, { id: string; name: string }[]>) || {})[cloudId] || [])
      .find(r => r.id === regionId)?.name ?? regionId
  );
  const onrampName = useCloudControl(cc =>
    cloudId && regionId ? servingRamp(cc, cloudId, regionId)?.name ?? 'the nearest fabric on-ramp' : ''
  );

  if (record) {
    return <ManagedVpcTracker record={record} cloudName={cloudName} regionName={regionName} onClose={onClose} />;
  }

  const steps: WizStep[] = lockedRegion ? WIZ_STEPS.filter(s => s !== 'region') : [...WIZ_STEPS];
  const current = steps[step];

  const canNext =
    current === 'region' ? !!cloudId && !!regionId :
    current === 'cidr' ? validCidr(cidr) :
    true;

  const deploy = () => {
    actions.deployManagedVpc({ cloudId, regionId, tier, cidr });
  };

  // The picture the answers are building. The on-ramp side is a constant
  // ("AT&T on-ramp") until the wizard names one on deploy; the region side
  // only appears once a region is picked (either from the region step, or
  // pinned from the start via lockedRegion). The vSRX HA pair is always a
  // dual edge, and the tier answer thickens it as soon as it's chosen.
  const hasRegion = !!cloudId && !!regionId;
  const pastTier = steps.indexOf('tier') < step;
  const canvasSpec: WizardCanvasSpec = {
    left: { label: 'AT&T on-ramp', sub: onrampName || undefined },
    right: hasRegion
      ? { label: regionName, sub: cidr || cloudName }
      : null,
    edgeLabel: 'Managed vSRX pair',
    thickness: TIER_THICKNESS[tier] ?? 'medium',
    dual: true,
    edgeAnswered: pastTier,
    leftAnswered: true,
    rightAnswered: pastTier,
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Deploy ${managedNoun(cloudId)}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fw-heading/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-fw-secondary"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-fw-secondary">
          {cloudId && <ProviderLogo id={cloudId} size={30} />}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-fw-heading leading-tight">Deploy {managedNoun(cloudId)}</div>
            {lockedRegion && (
              <div className="text-figma-xs text-fw-bodyLight leading-tight">{cloudName} · {regionName}</div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-md text-fw-bodyLight hover:bg-fw-wash">
            <X size={18} />
          </button>
        </div>

        {/* step rail */}
        <ol className="flex items-center gap-1 px-5 pt-4 text-[11px] font-medium">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full ${
                i < step ? 'bg-fw-success text-white' : i === step ? 'bg-fw-ctaPrimary text-white' : 'bg-fw-neutral text-fw-bodyLight'
              }`}>{i < step ? <Check size={12} /> : i + 1}</span>
              <span className={i === step ? 'text-fw-heading' : 'text-fw-bodyLight'}>{STEP_LABEL[s]}</span>
              {i < steps.length - 1 && <span className="mx-0.5 text-fw-secondary">·</span>}
            </li>
          ))}
        </ol>

        <div className="px-5 pt-3">
          <WizardCanvas spec={canvasSpec} />
        </div>

        <div className="px-5 py-4 min-h-[172px]">
          {current === 'region' && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">Where the {managedNoun(cloudId).replace('Managed', 'managed')} deploys.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {regions.map(r => (
                  <button
                    key={`${r.cloudId}/${r.regionId}`} type="button"
                    aria-pressed={cloudId === r.cloudId && regionId === r.regionId}
                    onClick={() => { setCloudId(r.cloudId); setRegionId(r.regionId); }}
                    className={`flex items-center gap-2 text-left rounded-lg border p-2.5 transition-colors ${
                      cloudId === r.cloudId && regionId === r.regionId
                        ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link'
                        : 'border-fw-secondary hover:bg-fw-wash'
                    }`}
                  >
                    <ProviderLogo id={r.cloudId} size={22} />
                    <div className="min-w-0">
                      <div className="text-figma-sm font-medium text-fw-heading truncate">{r.regionName}</div>
                      <div className="text-[11px] text-fw-bodyLight truncate">{r.cloudName}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === 'tier' && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">Throughput tier for the vSRX HA pair.</p>
              {TIERS.map(t => (
                <button
                  key={t.id} type="button" aria-pressed={tier === t.id}
                  onClick={() => setTier(t.id)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    tier === t.id ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link' : 'border-fw-secondary hover:bg-fw-wash'
                  }`}
                >
                  <div className={`text-figma-sm font-medium ${tier === t.id ? 'text-fw-link' : 'text-fw-heading'}`}>{t.label}</div>
                  <div className="mt-0.5 text-[11px] text-fw-bodyLight">{t.blurb}</div>
                </button>
              ))}
            </div>
          )}

          {current === 'cidr' && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">Gateway CIDR — reserved on your VPC/VNet for the vSRX pair.</p>
              <label htmlFor="mv-cidr" className="block text-figma-xs font-medium text-fw-body">CIDR block</label>
              <input
                id="mv-cidr" value={cidr} onChange={e => setCidr(e.target.value)}
                className="w-full rounded-lg border border-fw-secondary px-3 py-2 text-figma-sm text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active"
              />
              {!validCidr(cidr) && (
                <div className="text-[11px] text-fw-error">Shape must be 10.255.x.0/24.</div>
              )}
            </div>
          )}

          {current === 'confirm' && (
            <div className="space-y-2 text-figma-sm">
              <p className="text-fw-body">{confirmCopy(cloudId, regionName, tier, onrampName)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-fw-secondary">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-figma-sm font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash"
          >
            {step === 0 ? 'Cancel' : (<><ArrowLeft size={15} /> Back</>)}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button" disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-semibold bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover disabled:opacity-40"
            >
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={deploy}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-semibold bg-fw-success text-white hover:bg-fw-success"
            >
              <Check size={15} /> Deploy {managedNoun(cloudId).replace('Managed', 'managed')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------- live tracker -------------------------- */

interface ManagedVpcTrackerProps {
  record: ManagedVpc;
  cloudName: string;
  regionName: string;
  onClose: () => void;
}

function ManagedVpcTracker({ record, cloudName, regionName, onClose }: ManagedVpcTrackerProps) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Deploy ${managedNoun(record.cloudId)}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fw-heading/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-fw-secondary"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-fw-secondary">
          <ProviderLogo id={record.cloudId} size={30} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-fw-heading leading-tight">{record.name}</div>
            <div className="text-figma-xs text-fw-bodyLight leading-tight">{cloudName} · {regionName} · {record.cidr}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-md text-fw-bodyLight hover:bg-fw-wash">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <StationTrack
            ariaLabel="Bring-up progress"
            stations={record.stages.map(s => ({
              key: s.key,
              label: s.label,
              detail: s.detail,
              state: s.done ? 'done' : s.key === record.stage ? 'current' : 'upcoming',
            }))}
          />

          <div className="mt-2 pt-2 border-t border-fw-secondary/60 space-y-1">
            <div className="text-figma-xs font-medium text-fw-body">Route exchange (BGP)</div>
            {record.vsrx.bgp.map(b => (
              <div key={b.peer} className="flex items-center justify-between text-[11px]">
                <span className="text-fw-bodyLight">{b.label}</span>
                <span className={b.state === 'established' ? 'font-medium text-fw-success' : 'text-fw-bodyLight'}>{b.state}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-fw-secondary">
          <span className="text-[11px] text-fw-bodyLight">Deployment continues in the engine — close anytime.</span>
          <button
            type="button" onClick={onClose}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

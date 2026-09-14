import { useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCloudControlActions } from '../../engine/react/useCloudControl';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { ATTACH_TYPES } from './attachCatalog';
import { WizardCanvas } from './WizardCanvas';
import type { WizardCanvasSpec } from './wizardCanvasModel';
import type { FabricModel } from './FabricHero';
import type { FabricRegion } from '../../engine/types';

/* ------------------------------------------------------------------ *
 * Provision wizard (simulated demo-real).
 *   attach type (region-specific) → on-ramp / PoP → resiliency → confirm
 * On confirm: CC.provisionRegion(...) activates the capturing on-ramp and
 * marks the region attached; the fabric edge animates in and the region
 * flips to connected. No backend — all against the seeded engine.
 * ------------------------------------------------------------------ */

/** The attach type the on-ramp reaching this region implies — pre-selected so
 * the common path is one confirm away, but any type stays pickable. */
function recommendedAttachId(region: FabricRegion, model: FabricModel): string {
  const type = model.onramps.find(o => region.onrampIds.includes(o.id))?.type ?? '';
  if (/direct connect|expressroute|interconnect/i.test(type)) return 'dedicated';
  return 'ip';
}

interface ProvisionWizardProps {
  region: FabricRegion;
  model: FabricModel;
  onClose: () => void;
  onProvisioned: (regionId: string) => void;
  /** Seeds the Resiliency step's answer - set when ANDI's "connect <region>
   *  with dual paths" drafted this wizard open already knowing the answer.
   *  Still a draft: the human walks the step and confirms it like any other. */
  initialResilient?: boolean;
}

export function ProvisionWizard({ region, model, onClose, onProvisioned, initialResilient = false }: ProvisionWizardProps) {
  const actions = useCloudControlActions();
  const [step, setStep] = useState(0);
  const [attachType, setAttachType] = useState(() => recommendedAttachId(region, model));
  const onrampChoices = region.onrampIds
    .map(id => model.onramps.find(o => o.id === id))
    .filter(Boolean) as FabricModel['onramps'];
  const [onrampId, setOnrampId] = useState(() => onrampChoices[0]?.id ?? '');
  const [resilient, setResilient] = useState(initialResilient);

  const attach = ATTACH_TYPES.find(t => t.id === attachType)!;
  const steps = ['Attach type', 'On-ramp / PoP', 'Resiliency', 'Confirm'];
  const canNext = step === 0 ? !!attachType : step === 1 ? !!onrampId || onrampChoices.length === 0 : true;

  const confirm = () => {
    actions.provisionRegion(region.regionId, { attachType: attach.label, onrampId: onrampId || undefined, resilient });
    onProvisioned(region.regionId);
    onClose();
  };

  // The picture the answers are building. A question is "answered" once the
  // user moves past its step; the current step's live selection previews as
  // a ghost until then. The region is known from mount.
  const chosenOnramp = onrampChoices.find(o => o.id === onrampId);
  const canvasSpec: WizardCanvasSpec = {
    left: chosenOnramp
      ? { label: chosenOnramp.name, sub: chosenOnramp.site }
      : { label: 'Nearest fabric PoP' },
    right: { label: region.name, sub: region.cloudName },
    edgeLabel: step > 0 ? attach.label : undefined,
    thickness: 'medium',
    dual: resilient && step > 2,
    edgeAnswered: step > 0,
    leftAnswered: step > 1,
    rightAnswered: true,
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Provision ${region.cloudName} ${region.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fw-heading/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-fw-secondary"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-fw-secondary">
          <ProviderLogo id={region.cloudId} size={30} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-fw-heading leading-tight">Provision · {region.name}</div>
            <div className="text-figma-xs text-fw-bodyLight leading-tight">{region.cloudName} · onto the AT&amp;T fabric</div>
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
              <span className={i === step ? 'text-fw-heading' : 'text-fw-bodyLight'}>{s}</span>
              {i < steps.length - 1 && <span className="mx-0.5 text-fw-secondary">·</span>}
            </li>
          ))}
        </ol>

        <div className="px-5 pt-3">
          <WizardCanvas spec={canvasSpec} />
        </div>

        <div className="px-5 py-4 min-h-[172px]">
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">How this region attaches to the fabric.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ATTACH_TYPES.map(t => (
                  <button
                    key={t.id} type="button" aria-pressed={attachType === t.id}
                    onClick={() => setAttachType(t.id)}
                    className={`text-left rounded-lg border p-2.5 transition-colors ${
                      attachType === t.id ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link' : 'border-fw-secondary hover:bg-fw-wash'
                    }`}
                  >
                    <div className={`text-figma-sm font-medium ${attachType === t.id ? 'text-fw-link' : 'text-fw-heading'}`}>{t.label}</div>
                    <div className="mt-0.5 text-[11px] text-fw-bodyLight">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">The on-ramp / PoP that reaches {region.name}.</p>
              {onrampChoices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-fw-secondary bg-fw-wash p-3 text-figma-xs text-fw-bodyLight">
                  No dedicated on-ramp reaches this region yet — provisioning will attach it over the nearest fabric PoP.
                </div>
              ) : onrampChoices.map(o => (
                <button
                  key={o.id} type="button" aria-pressed={onrampId === o.id}
                  onClick={() => setOnrampId(o.id)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    onrampId === o.id ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link' : 'border-fw-secondary hover:bg-fw-wash'
                  }`}
                >
                  <div className={`text-figma-sm font-medium ${onrampId === o.id ? 'text-fw-link' : 'text-fw-heading'}`}>{o.name}</div>
                  <div className="mt-0.5 text-[11px] text-fw-bodyLight">{o.site} · {o.active ? 'active' : 'available capacity'}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">Resiliency for this attachment.</p>
              {[
                { v: false, label: 'Single path', desc: 'One on-ramp. Fastest to stand up.' },
                { v: true, label: 'Dual · resilient', desc: 'Diverse second path so failover never drops to public.' },
              ].map(opt => (
                <button
                  key={String(opt.v)} type="button" aria-pressed={resilient === opt.v}
                  onClick={() => setResilient(opt.v)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    resilient === opt.v ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link' : 'border-fw-secondary hover:bg-fw-wash'
                  }`}
                >
                  <div className={`text-figma-sm font-medium ${resilient === opt.v ? 'text-fw-link' : 'text-fw-heading'}`}>{opt.label}</div>
                  <div className="mt-0.5 text-[11px] text-fw-bodyLight">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-figma-sm">
              <p className="text-figma-xs text-fw-bodyLight">Simulated attach — nothing is ordered; the seeded engine flips the region live.</p>
              <dl className="space-y-2">
                {[
                  ['Region', `${region.cloudName} ${region.name}`],
                  ['Attach type', attach.label],
                  ['On-ramp', onrampChoices.find(o => o.id === onrampId)?.name ?? 'nearest fabric PoP'],
                  ['Resiliency', resilient ? 'Dual · resilient' : 'Single path'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3 border-b border-fw-secondary/60 pb-1.5">
                    <dt className="text-fw-bodyLight">{k}</dt>
                    <dd className="text-right font-medium text-fw-heading">{v}</dd>
                  </div>
                ))}
              </dl>
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
              type="button" data-testid="provision-confirm"
              onClick={confirm}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-semibold bg-fw-success text-white hover:bg-fw-success"
            >
              <Check size={15} /> Provision &amp; attach
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { X, Check, ArrowRight, ArrowLeft, Loader2, ShieldCheck, Search, Link2 } from 'lucide-react';
import { useCloudControlActions } from '../../engine/react/useCloudControl';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import {
  WIZARD_PROVIDERS,
  validateCredential,
  scanSteps,
  scanSummary,
  type WizardProvider,
  type WizardStep,
  type ScanStep,
} from './wizardModel';

/* ------------------------------------------------------------------ *
 * DiscoveryWizard — the "+ Connect a cloud" workflow (simulated demo-real).
 *   provider → paste credential (shape-validated only) → simulated scan →
 *   reveal the provider's estate in the tree, marked "discovered just now".
 *
 * Nothing leaves the browser: the credential is shape-validated and never
 * stored or transmitted. The scan STEPS are deterministic CC derivations
 * (regions / VPCs / subnets for the chosen cloud); a timer only paces the
 * animation — it never generates the data.
 * ------------------------------------------------------------------ */

const STEP_LABELS: Record<WizardStep, string> = {
  provider: 'Provider',
  credentials: 'Credentials',
  scanning: 'Discover',
  done: 'Done',
};
const STEP_ORDER: WizardStep[] = ['provider', 'credentials', 'scanning'];

interface DiscoveryWizardProps {
  onClose: () => void;
  /** Called when discovery finishes for a cloud — the tree reveals + flashes it. */
  onDiscovered: (cloudId: string) => void;
}

export function DiscoveryWizard({ onClose, onDiscovered }: DiscoveryWizardProps) {
  const cc = useCloudControlActions();
  const [step, setStep] = useState<WizardStep>('provider');
  const [providerId, setProviderId] = useState<string>('');
  const [credential, setCredential] = useState('');
  const provider: WizardProvider | undefined = WIZARD_PROVIDERS.find(p => p.id === providerId);

  // Scan animation state — steps come from the engine, the interval only paces.
  const [steps, setSteps] = useState<ScanStep[]>([]);
  const [scanIdx, setScanIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const credValid = !!provider && validateCredential(provider, credential);

  // Kick the scan when entering the scanning step.
  useEffect(() => {
    if (step !== 'scanning' || !provider) return;
    const s = scanSteps(cc, provider.id);
    setSteps(s);
    setScanIdx(0);
    timer.current = setInterval(() => {
      setScanIdx(i => {
        const next = i + 1;
        if (next >= s.length) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
        }
        return next;
      });
    }, 620);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [step, provider, cc]);

  const scanDone = step === 'scanning' && steps.length > 0 && scanIdx >= steps.length;

  useEffect(() => {
    if (scanDone) setStep('done');
  }, [scanDone]);

  const finish = () => {
    if (provider) onDiscovered(provider.id);
    onClose();
  };

  const activeIdx = STEP_ORDER.indexOf(step === 'done' ? 'scanning' : step);

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Connect a cloud"
      className="fixed inset-0 z-50 flex items-center justify-center bg-fw-heading/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-fw-secondary"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-fw-secondary">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fw-accent text-fw-primary">
            <Link2 size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-fw-heading leading-tight">Connect a cloud</div>
            <div className="text-figma-xs text-fw-bodyLight leading-tight">Discover an account and browse its estate</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-md text-fw-bodyLight hover:bg-fw-wash">
            <X size={18} />
          </button>
        </div>

        {/* step rail */}
        <ol className="flex items-center gap-1 px-5 pt-4 text-[11px] font-medium">
          {STEP_ORDER.map((s, i) => (
            <li key={s} className="flex items-center gap-1">
              <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full ${
                i < activeIdx || step === 'done' ? 'bg-fw-success text-white' : i === activeIdx ? 'bg-fw-ctaPrimary text-white' : 'bg-fw-neutral text-fw-bodyLight'
              }`}>{(i < activeIdx || step === 'done') ? <Check size={12} /> : i + 1}</span>
              <span className={i === activeIdx && step !== 'done' ? 'text-fw-heading' : 'text-fw-bodyLight'}>{STEP_LABELS[s]}</span>
              {i < STEP_ORDER.length - 1 && <span className="mx-0.5 text-fw-secondary">·</span>}
            </li>
          ))}
        </ol>

        <div className="px-5 py-4 min-h-[200px]">
          {/* 1 — provider */}
          {step === 'provider' && (
            <div className="space-y-2">
              <p className="text-figma-xs text-fw-bodyLight">Which cloud do you want to discover?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {WIZARD_PROVIDERS.map(p => (
                  <button
                    key={p.id} type="button" aria-pressed={providerId === p.id}
                    onClick={() => setProviderId(p.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors ${
                      providerId === p.id ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link' : 'border-fw-secondary hover:bg-fw-wash'
                    }`}
                  >
                    <ProviderLogo id={p.id} size={30} />
                    <span className={`text-[11px] font-medium ${providerId === p.id ? 'text-fw-link' : 'text-fw-heading'}`}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2 — credentials */}
          {step === 'credentials' && provider && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <ProviderLogo id={provider.id} size={26} />
                <span className="text-figma-sm font-medium text-fw-heading">{provider.name}</span>
              </div>
              <label className="block text-figma-xs font-medium text-fw-body" htmlFor="cc-credential">
                {provider.credLabel}
              </label>
              <input
                id="cc-credential"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={credential}
                onChange={e => setCredential(e.target.value)}
                placeholder={provider.credPlaceholder}
                aria-invalid={credential.length > 0 && !credValid}
                className={`w-full rounded-lg border bg-fw-base px-3 py-2 font-mono text-figma-xs text-fw-heading outline-none transition-colors focus:ring-2 focus:ring-fw-link/40 ${
                  credential.length > 0 && !credValid ? 'border-fw-error' : 'border-fw-secondary'
                }`}
              />
              {credential.length > 0 && !credValid && (
                <p className="text-[11px] text-fw-error">
                  {provider.credKind === 'arn' ? 'Expected an IAM role ARN (arn:aws:iam::…:role/…).' : 'Enter a valid key or service principal.'}
                </p>
              )}
              <div className="flex items-start gap-2 rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-[11px] text-fw-bodyLight">
                <ShieldCheck size={14} className="mt-px shrink-0 text-fw-success" aria-hidden="true" />
                <span>Credentials stay in your browser — demo. Nothing is stored or transmitted.</span>
              </div>
            </div>
          )}

          {/* 3 — scanning */}
          {(step === 'scanning' || step === 'done') && provider && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                {step === 'done' ? (
                  <Check size={16} className="text-fw-success" aria-hidden="true" />
                ) : (
                  <Loader2 size={16} className="animate-spin text-fw-primary" aria-hidden="true" />
                )}
                <span className="text-figma-sm font-medium text-fw-heading">
                  {step === 'done' ? 'Discovery complete' : `Discovering ${provider.name}…`}
                </span>
              </div>
              <ul className="space-y-1.5" aria-live="polite" data-testid="scan-log">
                {steps.map((s, i) => {
                  const complete = i < scanIdx || step === 'done';
                  const active = i === scanIdx && step === 'scanning';
                  return (
                    <li
                      key={s.regionId}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                        complete ? 'border-fw-success/40 bg-fw-successLight text-fw-success'
                        : active ? 'border-fw-active bg-fw-ctaPrimary/[0.04] text-fw-heading'
                        : 'border-fw-secondary text-fw-bodyLight opacity-60'
                      }`}
                    >
                      {complete ? <Check size={13} className="shrink-0" aria-hidden="true" />
                        : active ? <Search size={13} className="shrink-0" aria-hidden="true" />
                        : <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-current" aria-hidden="true" />}
                      <span className="truncate">{s.label}</span>
                    </li>
                  );
                })}
              </ul>
              {step === 'done' && (
                <div className="rounded-lg border border-fw-success/40 bg-fw-successLight px-3 py-2 text-[11px] font-medium text-fw-success" data-testid="scan-summary">
                  {scanSummary(cc, provider.id)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-fw-secondary">
          <button
            type="button"
            onClick={() => {
              if (step === 'provider') onClose();
              else if (step === 'credentials') setStep('provider');
              else onClose();
            }}
            disabled={step === 'scanning'}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-figma-sm font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash disabled:opacity-40"
          >
            {step === 'provider' || step === 'scanning' ? 'Cancel' : (<><ArrowLeft size={15} /> Back</>)}
          </button>

          {step === 'provider' && (
            <button
              type="button" disabled={!providerId}
              onClick={() => setStep('credentials')}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-semibold bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover disabled:opacity-40"
            >
              Next <ArrowRight size={15} />
            </button>
          )}
          {step === 'credentials' && (
            <button
              type="button" disabled={!credValid} data-testid="discover-run"
              onClick={() => setStep('scanning')}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-semibold bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover disabled:opacity-40"
            >
              <Search size={15} /> Discover
            </button>
          )}
          {step === 'scanning' && (
            <span className="text-figma-xs text-fw-bodyLight">Scanning regions…</span>
          )}
          {step === 'done' && (
            <button
              type="button" data-testid="discover-finish"
              onClick={finish}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-figma-sm font-semibold bg-fw-success text-white hover:bg-fw-success"
            >
              <Check size={15} /> Browse the estate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

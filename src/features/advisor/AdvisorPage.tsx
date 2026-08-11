import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { resolveProfile } from '../../engine/estateProfile';
import { WIZARD_PROVIDERS, validateCredential, scanSteps, type ScanStep } from '../discover/wizardModel';
import { advisorFindings, advisorHeadline, headStart } from './advisorModel';
import { advance, markAdvisorDone, type AdvisorPhase } from './advisorPhase';
import { AdvisorCanvas } from './AdvisorCanvas';
import { AdvisorRail } from './AdvisorRail';

/**
 * `/discover/advisor` — the first-run flagship. An undiscovered tenant
 * lands here instead of the tree: observe (the AT&T head-start) → intake
 * (wizard-derived credential entry) → scanning (the scan theater) → ready
 * (headline + findings, each with a good/better/best offer ladder).
 *
 * This component owns the phase machine, the wizard state the intake step
 * needs, and the scan timer — all three are handed down as props so
 * AdvisorCanvas and AdvisorRail stay pure view layers (AdvisorCanvas in
 * particular has to render standalone with no rail; see its own doc
 * comment). Route registration is a later task — this module only exports
 * the component `<AdvisorPage />` renders under any router.
 */
export default function AdvisorPage() {
  const cc = useCloudControl(c => c);
  const navigate = useNavigate();
  // Which profile's done-flag this session writes. Read the same way the
  // engine's own boot swap resolves it (URL flag, else the persisted
  // choice) rather than inventing a second source of truth for "who is
  // this tenant".
  const profile = resolveProfile(window.location.search, window.localStorage);

  const [phase, setPhase] = useState<AdvisorPhase>('observe');
  const [providerId, setProviderId] = useState('');
  const [credential, setCredential] = useState('');
  const provider = WIZARD_PROVIDERS.find(p => p.id === providerId);
  const credValid = !!provider && validateCredential(provider, credential);

  // Scan pacing — same idiom as DiscoveryWizard.tsx: steps are a precomputed
  // CC derivation, the interval only advances an index into them.
  const [steps, setSteps] = useState<ScanStep[]>([]);
  const [scanIdx, setScanIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== 'scanning' || !provider) return;
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
  }, [phase, provider, cc]);

  const scanDone = phase === 'scanning' && steps.length > 0 && scanIdx >= steps.length;
  useEffect(() => {
    if (scanDone) setPhase(p => advance(p, { type: 'scan-complete' }));
  }, [scanDone]);

  const startIntake = () => setPhase(p => advance(p, { type: 'start' }));
  const submitCredential = () => {
    if (!credValid) return;
    setPhase(p => advance(p, { type: 'credential-valid' }));
  };
  const acceptTier = (route: string) => {
    markAdvisorDone(profile);
    navigate(route);
  };
  const skip = () => {
    markAdvisorDone(profile);
    navigate('/discover');
  };

  const hs = headStart(cc);
  const findings = advisorFindings(cc);
  const headline = advisorHeadline(cc);

  const statusChip =
    phase === 'scanning' ? 'Analyzing your estate…' : phase === 'ready' ? 'Recommendations ready' : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-figma-xl font-bold text-fw-heading">Advisor</h1>
          {statusChip && (
            <span
              data-testid="advisor-status-chip"
              className="inline-flex items-center rounded-full bg-fw-accent px-2.5 py-1 text-figma-xs font-medium text-fw-link"
            >
              {statusChip}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="advisor-skip"
          onClick={skip}
          className="text-figma-sm font-medium text-fw-link hover:underline"
        >
          Skip to the estate
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          aria-label="Advisor narration and chat"
          data-testid="advisor-rail"
          className="w-full shrink-0 space-y-4 lg:order-first lg:w-[360px] xl:w-[400px]"
        >
          <AdvisorRail phase={phase} steps={steps} scanIdx={scanIdx} findings={findings} />
        </aside>

        <div className="min-w-0 flex-1">
          <AdvisorCanvas
            phase={phase}
            headStart={hs}
            onStartIntake={startIntake}
            providers={WIZARD_PROVIDERS}
            providerId={providerId}
            onSelectProvider={setProviderId}
            provider={provider}
            credential={credential}
            onCredentialChange={setCredential}
            credValid={credValid}
            onSubmitCredential={submitCredential}
            steps={steps}
            scanIdx={scanIdx}
            headline={headline}
            findings={findings}
            onAcceptTier={acceptTier}
          />
        </div>
      </div>
    </div>
  );
}

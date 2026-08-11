import { ArrowRight, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { ProviderLogo } from '../../components/brand/ProviderLogo';
import { SITE_CLASS_PLURAL, type SiteClass } from '../discover/discoveryModel';
import { useRevealStagger } from '../discover/useRevealStagger';
import type { WizardProvider, ScanStep } from '../discover/wizardModel';
import type { Finding } from './advisorModel';
import { FindingCard } from './FindingCard';
import type { AdvisorPhase } from './advisorPhase';

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const nf = new Intl.NumberFormat('en-US');
const plural = (n: number, word: string, pluralWord = `${word}s`) => (n === 1 ? word : pluralWord);

export interface AdvisorCanvasProps {
  phase: AdvisorPhase;
  headStart: { total: number; onNet: number; byClass: { siteClass: SiteClass; count: number }[]; cloudsVisible: boolean };
  onStartIntake: () => void;

  providers: WizardProvider[];
  providerId: string;
  onSelectProvider: (id: string) => void;
  provider: WizardProvider | undefined;
  credential: string;
  onCredentialChange: (value: string) => void;
  credValid: boolean;
  onSubmitCredential: () => void;

  steps: ScanStep[];
  scanIdx: number;

  headline: { savingsMo: number; findings: number };
  findings: Finding[];
  onAcceptTier: (route: string) => void;
}

/**
 * The advisor's payload pane. Renders standalone — nothing here reads the
 * rail, so `<AdvisorCanvas phase="ready" .../>` with no sibling states the
 * full ready-phase payload on its own (task-4-report.md's
 * canvas-stands-alone requirement).
 *
 * One phase renders at a time; the phase itself is owned by AdvisorPage's
 * `advisorPhase` machine, not by this component.
 */
export function AdvisorCanvas({
  phase,
  headStart,
  onStartIntake,
  providers,
  providerId,
  onSelectProvider,
  provider,
  credential,
  onCredentialChange,
  credValid,
  onSubmitCredential,
  steps,
  scanIdx,
  headline,
  findings,
  onAcceptTier,
}: AdvisorCanvasProps) {
  const stagger = useRevealStagger(findings.length);

  return (
    <div data-testid="advisor-canvas" className="space-y-4">
      {phase === 'observe' && (
        <div
          data-testid="advisor-headstart"
          className="rounded-2xl border border-fw-secondary bg-fw-wash p-5 space-y-3"
        >
          <p className="text-figma-lg font-semibold text-fw-heading">
            Not sure what your cloud estate is costing you? AT&amp;T already sees {nf.format(headStart.total)}{' '}
            {plural(headStart.total, 'site')} in your estate.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-fw-secondary bg-fw-base px-3 py-1 text-figma-xs font-medium text-fw-body">
              {nf.format(headStart.onNet)} on an AT&amp;T circuit today
            </span>
            {headStart.byClass.map(row => (
              <span
                key={row.siteClass}
                className="inline-flex items-center rounded-full border border-fw-secondary bg-fw-base px-3 py-1 text-figma-xs font-medium text-fw-body"
              >
                {nf.format(row.count)} {SITE_CLASS_PLURAL[row.siteClass]}
              </span>
            ))}
            {headStart.cloudsVisible && (
              <span className="inline-flex items-center rounded-full border border-fw-secondary bg-fw-base px-3 py-1 text-figma-xs font-medium text-fw-body">
                at least one hyperscaler already attached
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="advisor-observe-cta"
            onClick={onStartIntake}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fw-ctaPrimary px-4 text-figma-sm font-semibold text-white transition-colors hover:bg-fw-ctaPrimaryHover"
          >
            Find out what else is out there <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {phase === 'intake' && (
        <div data-testid="advisor-intake" className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-3">
          <p className="text-figma-sm font-medium text-fw-heading">Which cloud do you want the advisor to read?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {providers.map(p => (
              <button
                key={p.id}
                type="button"
                aria-pressed={providerId === p.id}
                onClick={() => onSelectProvider(p.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors ${
                  providerId === p.id
                    ? 'border-fw-active bg-fw-ctaPrimary/[0.04] ring-1 ring-fw-link'
                    : 'border-fw-secondary hover:bg-fw-wash'
                }`}
              >
                <ProviderLogo id={p.id} size={30} />
                <span className={`text-[11px] font-medium ${providerId === p.id ? 'text-fw-link' : 'text-fw-heading'}`}>
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          {provider && (
            <div className="space-y-2.5 pt-1">
              <label className="block text-figma-xs font-medium text-fw-body" htmlFor="advisor-credential">
                {provider.credLabel}
              </label>
              <input
                id="advisor-credential"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={credential}
                onChange={e => onCredentialChange(e.target.value)}
                placeholder={provider.credPlaceholder}
                aria-invalid={credential.length > 0 && !credValid}
                className={`w-full rounded-lg border bg-fw-base px-3 py-2 font-mono text-figma-xs text-fw-heading outline-none transition-colors focus:ring-2 focus:ring-fw-link/40 ${
                  credential.length > 0 && !credValid ? 'border-fw-error' : 'border-fw-secondary'
                }`}
              />
              <div className="flex items-start gap-2 rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2 text-[11px] text-fw-bodyLight">
                <ShieldCheck size={14} className="mt-px shrink-0 text-fw-success" aria-hidden="true" />
                <span>Credentials stay in your browser — demo. Nothing is stored or transmitted.</span>
              </div>
              <button
                type="button"
                data-testid="advisor-intake-submit"
                disabled={!credValid}
                onClick={onSubmitCredential}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fw-ctaPrimary px-4 text-figma-sm font-semibold text-white transition-colors hover:bg-fw-ctaPrimaryHover disabled:opacity-40"
              >
                <Search size={15} aria-hidden="true" /> Scan the estate
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'scanning' && (
        <div data-testid="advisor-scan-skeleton" className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-2xl border border-fw-secondary bg-fw-base p-4 space-y-2 animate-pulse"
              aria-hidden="true"
            >
              <div className="h-4 w-2/3 rounded bg-fw-neutral" />
              <div className="h-3 w-full rounded bg-fw-neutral" />
              <div className="h-3 w-1/2 rounded bg-fw-neutral" />
            </div>
          ))}
          <p className="text-figma-xs text-fw-bodyLight">
            Scanning {steps.length ? steps[Math.min(scanIdx, steps.length - 1)]?.label : 'the estate…'}
          </p>
        </div>
      )}

      {phase === 'ready' && (
        <div className="space-y-4">
          <div
            data-testid="advisor-headline"
            className="sticky top-4 z-10 rounded-2xl border border-fw-active/30 bg-fw-accent p-4"
          >
            <p className="flex items-center gap-2 text-figma-lg font-bold text-fw-heading">
              <Sparkles size={18} className="text-fw-link" aria-hidden="true" />
              You could save {money(headline.savingsMo)}/mo across {headline.findings}{' '}
              {plural(headline.findings, 'finding')}
            </p>
          </div>

          <div className="space-y-3">
            {findings.map((f, i) => (
              <div key={f.kind} style={stagger(i)}>
                <FindingCard finding={f} onAcceptTier={onAcceptTier} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

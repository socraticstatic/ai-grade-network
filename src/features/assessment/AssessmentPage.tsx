import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { AttIcon } from '../../components/icons/AttIcon';
import { CC } from '../../engine';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import { aiSpendTotals, fmtTokens, fmtUsd, statesRealMoney } from '../ai-fabric/aiSpend';
import type { IntentScope } from '../../engine/types';

/**
 * The bridge from finding to promise. Each report finding names the
 * standing intent that would hold what the assessment measured, and
 * declares it in watch mode on click - the same declaration Andi's
 * grammar makes. Already-declared reads as the fact it is, with the
 * thread on Discover one link away.
 */
function DeclareIntentBridge({
  intentKey,
  scope,
  invitation,
}: {
  intentKey: string;
  scope: IntentScope;
  invitation: string;
}) {
  const declared = useCloudControlLive(cc =>
    cc.intentList().find(i => i.key === intentKey && i.scope.id === scope.id) ?? null,
  );
  if (declared) {
    return (
      <p className="mt-2 text-[13px] text-fw-body" data-testid={`bridge-declared-${intentKey}`}>
        Standing intent declared · {declared.mode} mode · {declared.reading.status}.{' '}
        <Link to="/discover" className="font-bold text-fw-link hover:underline">
          See its thread on Discover
        </Link>
      </p>
    );
  }
  return (
    <button
      type="button"
      data-testid={`bridge-declare-${intentKey}`}
      onClick={() => CC.declareIntent(intentKey, scope, 'watch')}
      className="as-no-print mt-2 rounded-full border border-fw-secondary px-4 py-1.5 text-[13px] font-bold text-fw-body hover:border-fw-active hover:text-fw-link"
    >
      {invitation}
    </button>
  );
}

/**
 * /assessment - the 14-day AI visibility assessment funnel.
 *
 * One route, four states, rendered by `CC.assessment().stage`:
 * Setup -> Measuring (day N) -> Report (day 14) -> Closed (day 15).
 *
 * Standalone like /stack: routed outside DashboardLayout, print-friendly,
 * its own header with a back-to-portal link. Unlike /stack it is app
 * surface, not a document, so it uses fw-* tokens rather than the deck's
 * literal palette.
 *
 * Every figure is a live `CC.assessmentReport()` derivation taken at render,
 * through `useCloudControlLive` so the counters move on engine ticks. The
 * funnel never states a number the portal's own screens would deny: each
 * report finding ends with a link into the portal screen that states the
 * same figure. Money claims pass through fmtUsd behind the statesRealMoney
 * gate; below a cent the claim becomes a sentence, never "$0.00".
 *
 * The demo clock (advanceAssessment) is the one honest way to compress 14
 * days into a demo beat - it lives in a box labelled "Demo control".
 */

type Stage = 'not-started' | 'measuring' | 'report' | 'closed';

const DAY_MS = 86_400_000;

/** Uppercase kicker, the /stack deck's SectionLabel scale. */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-4 text-fw-link">
      {children}
    </p>
  );
}

/** Big stat card, the /stack deck's BigStat scale on fw-* tokens. */
function BigStat({
  stat,
  label,
  description,
  testid,
}: {
  stat: string;
  label: string;
  description?: string;
  testid?: string;
}) {
  return (
    <div className="rounded-2xl p-8 flex flex-col gap-2 bg-fw-wash border border-fw-secondary">
      <div
        data-testid={testid}
        className="text-[44px] font-bold leading-none tracking-[-0.03em] text-fw-link"
      >
        {stat}
      </div>
      <div className="text-[14px] font-bold tracking-[-0.02em] mt-1 text-fw-heading">{label}</div>
      {description && (
        <div className="text-[13px] font-medium leading-relaxed text-fw-bodyLight">
          {description}
        </div>
      )}
    </div>
  );
}

/** A collapsible detection / finding row. */
function DetectionRow({
  summary,
  testid,
  children,
}: {
  summary: React.ReactNode;
  testid?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      data-testid={testid}
      className="group rounded-2xl bg-fw-base border border-fw-secondary px-6 py-4"
    >
      <summary className="flex items-center justify-between cursor-pointer list-none text-[15px] font-bold text-fw-heading">
        <span>{summary}</span>
        <ChevronDown
          size={16}
          className="text-fw-bodyLight transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-3 text-[13px] font-medium leading-relaxed text-fw-body">{children}</div>
    </details>
  );
}

export function AssessmentPage() {
  const navigate = useNavigate();

  // One live subscription: stage, report and spend re-derive on every engine
  // mutation AND on telemetry ticks, so the measuring counters move while a
  // viewer sits on the page.
  const view = useCloudControlLive(cc => ({
    assessment: cc.assessment(),
    report: cc.assessmentReport(),
    spend: aiSpendTotals(cc),
  }));

  const { stage, day, startedAt } = view.assessment;
  const r = view.report;
  const spend = view.spend;

  const recoverableLine = statesRealMoney(r.recoverableMo)
    ? `${fmtUsd(r.recoverableMo)}/mo`
    : null;

  const clouds = CC.clouds as { id: string; name: string }[];
  const regionsOf = (cloudId: string): number =>
    ((CC.regions as Record<string, unknown[]>)[cloudId] ?? []).length;

  const counterMeta: { key: keyof typeof r.counters; label: string; basis: string }[] = [
    { key: 'identities', label: 'Identities using AI', basis: 'token meters' },
    { key: 'requestsAnalyzed', label: 'Requests analyzed', basis: 'gateway decision log' },
    { key: 'toolsInUse', label: 'Tools in use', basis: 'model catalog' },
    { key: 'ungovernedTools', label: 'Ungoverned tools', basis: 'routes over the public internet' },
    { key: 'securityEvents', label: 'Security events', basis: 'denials plus violations' },
  ];

  const completedOn =
    startedAt !== null ? new Date(startedAt + 14 * DAY_MS).toLocaleDateString() : null;

  const headlineStats = (
    <div className="grid md:grid-cols-3 gap-4">
      {recoverableLine ? (
        <BigStat
          testid="report-recoverable"
          stat={recoverableLine}
          label="recoverable"
          description="Routing and egress savings the fabric can hold, plus what fabric-routed AI models save over external pricing."
        />
      ) : (
        <div className="rounded-2xl p-8 bg-fw-wash border border-fw-secondary text-[14px] font-medium text-fw-body">
          Recoverable spend has not reached a cent yet. The figure appears here the moment it does.
        </div>
      )}
      <BigStat
        testid="report-security"
        stat={String(r.securityEvents)}
        label="events went through unprotected"
        description={`${r.securityBreakdown.denials} gateway denials and ${r.securityBreakdown.violations} network violations. The assessment only watches; nothing was stopped.`}
      />
      <BigStat
        testid="report-latency"
        stat={`${r.msWasted}ms`}
        label="wasted on public transit"
        description="The fabric delta summed across every region still riding the public internet."
      />
    </div>
  );

  return (
    <div
      data-testid="assessment-page"
      data-stage={stage}
      className="min-h-screen bg-fw-wash"
      style={{ fontFamily: "'ATT Aleck Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @media print {
          .as-no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Header - the /stack idiom: standalone chrome, back to the portal. */}
      <header className="as-no-print sticky top-0 z-50 flex items-center justify-between px-8 h-14 bg-fw-base border-b border-fw-secondary">
        <div className="flex items-center gap-3">
          <span className="text-fw-info">
            <AttIcon name="hub" className="w-5 h-5" />
          </span>
          <span className="text-[13px] font-bold text-fw-heading">AT&amp;T AI-grade network</span>
          <span className="text-[12px] font-medium px-2 py-0.5 rounded bg-fw-accent text-fw-link">
            14-day AI visibility assessment
          </span>
          {stage === 'measuring' && (
            <span className="text-[12px] font-medium text-fw-bodyLight">Day {day} of 14</span>
          )}
        </div>
        <Link
          to="/discover"
          data-testid="assessment-back"
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium bg-fw-wash text-fw-body border border-fw-secondary hover:text-fw-link"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to portal
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12 flex flex-col gap-8">
        {/* ── Setup ─────────────────────────────────────────────────────── */}
        {stage === 'not-started' && (
          <>
            <section>
              <Kicker>The assessment</Kicker>
              <h1 className="text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-fw-heading max-w-2xl">
                In 14 days, find out what your AI traffic is costing and risking, before you
                commit to anything.
              </h1>
              <p className="mt-4 text-[15px] font-medium leading-relaxed text-fw-body max-w-2xl">
                The gateway watches. Nothing is blocked or routed. Every figure below is measured
                on this estate right now, and the day-14 report states nothing the portal&apos;s
                own screens would deny.
              </p>
            </section>

            {/* Three value props, each with the live engine figure. */}
            <section className="grid md:grid-cols-3 gap-4">
              <div
                data-testid="prop-recoverable"
                className="rounded-2xl p-6 bg-fw-base border border-fw-secondary"
              >
                <p className="text-[14px] font-bold text-fw-heading mb-2">
                  You may be overpaying
                </p>
                {recoverableLine ? (
                  <>
                    <p className="text-[28px] font-bold tracking-[-0.03em] text-fw-link">
                      {recoverableLine}
                    </p>
                    <p className="text-[13px] font-medium leading-relaxed text-fw-bodyLight mt-1">
                      recoverable across routing, egress and AI model pricing, as measured this
                      minute.
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] font-medium leading-relaxed text-fw-bodyLight">
                    Recoverable spend has not reached a cent yet. The assessment measures it as
                    the estate moves.
                  </p>
                )}
              </div>
              <div
                data-testid="prop-security"
                className="rounded-2xl p-6 bg-fw-base border border-fw-secondary"
              >
                <p className="text-[14px] font-bold text-fw-heading mb-2">
                  Events are getting through unprotected
                </p>
                <p className="text-[28px] font-bold tracking-[-0.03em] text-fw-link">
                  {r.securityEvents}
                </p>
                <p className="text-[13px] font-medium leading-relaxed text-fw-bodyLight mt-1">
                  security events already visible: gateway denials plus network violations.
                </p>
              </div>
              <div
                data-testid="prop-latency"
                className="rounded-2xl p-6 bg-fw-base border border-fw-secondary"
              >
                <p className="text-[14px] font-bold text-fw-heading mb-2">
                  Public transit is slowing every request
                </p>
                <p className="text-[28px] font-bold tracking-[-0.03em] text-fw-link">
                  {r.msWasted}ms
                </p>
                <p className="text-[13px] font-medium leading-relaxed text-fw-bodyLight mt-1">
                  wasted on public transit across regions not yet attached to the fabric.
                </p>
              </div>
            </section>

            {/* 3-step timeline. */}
            <section className="rounded-2xl p-6 bg-fw-base border border-fw-secondary">
              <Kicker>How it runs</Kicker>
              <ol className="grid md:grid-cols-3 gap-6">
                {[
                  ['Today', 'Start the assessment. Measurement begins immediately; nothing is blocked or routed.'],
                  ['Day 2-14', 'The gateway watches. Identities, requests, tools and events accrue as live counters.'],
                  ['Day 14', 'Your report: recoverable spend, unprotected events and wasted milliseconds, every figure live.'],
                ].map(([title, body], i) => (
                  <li key={title} className="flex flex-col gap-1">
                    <span className="w-7 h-7 rounded-full bg-fw-primary text-[13px] font-bold text-fw-linkPrimary flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-[14px] font-bold text-fw-heading mt-2">{title}</p>
                    <p className="text-[13px] font-medium leading-relaxed text-fw-bodyLight">
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Connectors - the demo estate is pre-connected and says so. */}
            <section className="rounded-2xl p-6 bg-fw-base border border-fw-secondary">
              <Kicker>Connectors</Kicker>
              <p className="text-[13px] font-medium leading-relaxed text-fw-body mb-4">
                The demo estate is pre-connected. Every cloud below is already feeding the
                assessment.
              </p>
              <ul className="divide-y divide-fw-secondary" data-testid="connectors-list">
                {clouds.map(c => {
                  const n = regionsOf(c.id);
                  return (
                    <li key={c.id} className="flex items-center justify-between py-3">
                      <span className="text-[14px] font-bold text-fw-heading">{c.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-fw-bodyLight">
                          {n} region{n === 1 ? '' : 's'}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-fw-successLight text-fw-success">
                          Included
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <button
              type="button"
              data-testid="assessment-start"
              onClick={() => CC.startAssessment()}
              className="self-start px-6 py-3 rounded-full text-[14px] font-bold bg-fw-ctaPrimary text-fw-linkPrimary hover:bg-fw-ctaPrimaryHover"
            >
              Start assessment
            </button>
          </>
        )}

        {/* ── Measuring ─────────────────────────────────────────────────── */}
        {stage === 'measuring' && (
          <>
            <section>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-bold bg-fw-accent text-fw-link">
                <span className="w-2 h-2 rounded-full bg-fw-active animate-pulse" aria-hidden="true" />
                Measuring. Nothing is blocked or routed.
              </span>
              <h1 className="mt-4 text-[32px] font-bold tracking-[-0.03em] text-fw-heading">
                Day {day} of 14
              </h1>
              <p className="mt-2 text-[13px] font-medium text-fw-bodyLight">
                Collecting data. The counters below move as the estate moves.
              </p>
            </section>

            {/* Five live counters. */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {counterMeta.map(({ key, label, basis }) => (
                <div key={key} className="rounded-2xl p-5 bg-fw-base border border-fw-secondary">
                  <div
                    data-testid={`counter-${key}`}
                    className="text-[28px] font-bold tracking-[-0.03em] text-fw-link"
                  >
                    {r.counters[key]}
                  </div>
                  <div className="text-[12px] font-bold text-fw-heading mt-1">{label}</div>
                  <div className="text-[11px] font-medium text-fw-bodyLight">{basis}</div>
                </div>
              ))}
            </section>

            {/* Four collapsible detection rows. */}
            <section className="flex flex-col gap-3">
              <DetectionRow
                testid="detect-invisible"
                summary={`Invisible AI traffic · ${r.invisibleSharePct}%`}
              >
                {r.invisibleSharePct}% of your AI traffic is invisible to governance, measured on{' '}
                {r.invisibleBasis === 'tokens'
                  ? "today's metered tokens: the share that rode the public internet"
                  : 'flow volume: the share of Gbps riding paths AT&T does not control'}
                . Basis: {r.invisibleBasis}.
              </DetectionRow>
              <DetectionRow
                testid="detect-security"
                summary={`Security events · ${r.securityEvents}`}
              >
                {r.securityBreakdown.denials} denials in the gateway decision log and{' '}
                {r.securityBreakdown.violations} violations on the network fabric. None were
                stopped: the assessment only watches.
              </DetectionRow>
              <DetectionRow testid="detect-spend" summary="AI spend">
                {statesRealMoney(spend.spendToday) ? (
                  <>
                    {fmtUsd(spend.spendToday)} metered today across {fmtTokens(spend.tokensToday)}{' '}
                    tokens.
                  </>
                ) : (
                  <>Token spend today has not reached a cent.</>
                )}{' '}
                {statesRealMoney(r.aiSavingMo)
                  ? `Routing the same tokens through fabric-attached models would save ${fmtUsd(r.aiSavingMo)}/mo over external pricing.`
                  : 'The saving from fabric routing has not reached a cent at this volume.'}
              </DetectionRow>
              <DetectionRow testid="detect-latency" summary={`Latency · ${r.msWasted}ms wasted`}>
                Requests to regions not attached to the fabric ride public transit. The
                private-path delta sums to {r.msWasted}ms across those regions.
              </DetectionRow>
            </section>

            {/* The demo clock - honestly labelled. */}
            <section
              data-testid="demo-control"
              className="rounded-2xl p-6 bg-fw-base border-2 border-dashed border-fw-primary"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fw-bodyLight mb-1">
                Demo control
              </p>
              <p className="text-[13px] font-medium leading-relaxed text-fw-body mb-4">
                Advance the clock. This lever compresses the 14 days into a demo beat; a real
                assessment simply waits.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  data-testid="assessment-advance"
                  onClick={() => CC.advanceAssessment(1)}
                  className="px-5 py-2 rounded-full text-[13px] font-bold bg-fw-ctaPrimary text-fw-linkPrimary hover:bg-fw-ctaPrimaryHover"
                >
                  Advance to day {Math.min(day + 1, 14)}
                </button>
                <button
                  type="button"
                  data-testid="assessment-skip"
                  onClick={() => CC.advanceAssessment(14)}
                  className="px-5 py-2 rounded-full text-[13px] font-bold bg-fw-ctaGhost text-fw-linkSecondary hover:text-fw-linkHover"
                >
                  Skip to day 14
                </button>
              </div>
            </section>
          </>
        )}

        {/* ── Report ────────────────────────────────────────────────────── */}
        {stage === 'report' && (
          <>
            <section>
              <Kicker>Day 14 · the report</Kicker>
              <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-fw-heading max-w-2xl">
                What 14 days of watching found, measured on the estate as it stands.
              </h1>
            </section>

            {headlineStats}

            <section className="flex flex-col gap-3">
              <DetectionRow
                testid="finding-invisible"
                summary={`${r.invisibleSharePct}% of your AI traffic is invisible`}
              >
                <p>
                  Measured on {r.invisibleBasis === 'tokens' ? 'metered tokens' : 'flow volume'}:{' '}
                  {r.invisibleSharePct}% moves without governance seeing it. Basis:{' '}
                  {r.invisibleBasis}.
                </p>
                <p className="mt-2">
                  <Link to="/ai/observe" className="font-bold text-fw-link hover:underline">
                    Insights states the same share
                  </Link>
                </p>
                <DeclareIntentBridge
                  intentKey="private-inference"
                  scope={{ kind: 'estate', id: 'ai', label: 'The token layer' }}
                  invitation="Declare the intent: keep AI inference off the public internet"
                />
              </DetectionRow>
              <DetectionRow testid="finding-spend" summary="Most of your AI spend is avoidable">
                {recoverableLine ? (
                  <p>
                    {recoverableLine} is recoverable in total.{' '}
                    {statesRealMoney(r.recoverableMo - r.aiSavingMo)
                      ? `${fmtUsd(r.recoverableMo - r.aiSavingMo)}/mo comes from routing and egress on the fabric`
                      : 'The routing and egress share has not reached a cent'}
                    {statesRealMoney(r.aiSavingMo)
                      ? `, and ${fmtUsd(r.aiSavingMo)}/mo from serving the same tokens on fabric-attached models instead of external pricing.`
                      : ', and the AI model routing share has not reached a cent at this volume.'}
                  </p>
                ) : (
                  <p>
                    Recoverable spend has not reached a cent as the estate stands. The Savings tab
                    shows the derivation either way.
                  </p>
                )}
                <p className="mt-2">
                  <Link
                    to="/ai/observe?tab=savings"
                    className="font-bold text-fw-link hover:underline"
                  >
                    The Savings tab states the same figure
                  </Link>
                </p>
                <DeclareIntentBridge
                  intentKey="route-by-cost"
                  scope={{ kind: 'estate', id: null, label: 'Every flow' }}
                  invitation="Declare the intent: route by cost"
                />
              </DetectionRow>
              <DetectionRow
                testid="finding-security"
                summary={`${r.securityEvents} security events happened. Zero were stopped.`}
              >
                <p>
                  Two sources, each counted once: {r.securityBreakdown.denials} denials in the
                  gateway decision log and {r.securityBreakdown.violations} violations on the
                  network fabric. The assessment only watches; nothing was blocked.
                </p>
                <p className="mt-2">
                  <Link to="/naas/observe" className="font-bold text-fw-link hover:underline">
                    NaaS Observe states the same violations
                  </Link>
                </p>
                <DeclareIntentBridge
                  intentKey="data-sensitivity"
                  scope={{ kind: 'tag', id: 'classified-helion', label: 'classified-helion' }}
                  invitation="Declare the intent: route classified traffic by sensitivity"
                />
              </DetectionRow>
            </section>

            <button
              type="button"
              data-testid="assessment-close"
              onClick={() => {
                CC.closeAssessment();
                navigate('/discover');
              }}
              className="as-no-print self-start px-6 py-3 rounded-full text-[14px] font-bold bg-fw-ctaPrimary text-fw-linkPrimary hover:bg-fw-ctaPrimaryHover"
            >
              Start the trial
            </button>
          </>
        )}

        {/* ── Closed ────────────────────────────────────────────────────── */}
        {stage === 'closed' && (
          <>
            <section>
              <Kicker>Assessment closed</Kicker>
              <h1
                data-testid="assessment-completed"
                className="text-[32px] font-bold tracking-[-0.03em] text-fw-heading"
              >
                {completedOn ? `Completed on ${completedOn}` : 'Completed'}
              </h1>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-fw-body max-w-2xl">
                The headline figures below are re-derived as the estate stands today, not frozen
                at day 14. What the portal states, this page states.
              </p>
            </section>

            {headlineStats}

            <Link
              to="/discover"
              className="self-start px-6 py-3 rounded-full text-[14px] font-bold bg-fw-ctaPrimary text-fw-linkPrimary hover:bg-fw-ctaPrimaryHover"
            >
              Open the portal
            </Link>
          </>
        )}
      </main>
    </div>
  );
}

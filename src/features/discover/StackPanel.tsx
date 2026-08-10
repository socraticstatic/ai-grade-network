import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Link2, Plus, Sparkles } from 'lucide-react';
import { AttIcon } from '../../components/icons/AttIcon';
import { IntentThreads, IntentThreadOverlay } from './IntentThreads';
import { STACK_LAYERS, type NavLayer } from '../../components/navigation/navItems';
import { useCloudControlLive } from '../../engine/react/useCloudControl';
import {
  naasStratum,
  attachOpportunities,
  steerOpportunities,
  stagedDeltas,
  commitMoves,
  isUndoCovered,
  advisorDraft,
  takePendingRuleSpec,
  takePendingPolicySpec,
  type StagedMove,
} from './stackFigures';
import { ruleProposals } from '../govern/ruleProposals';

/**
 * The living cross-section: the stack as Discover's front door, stating live
 * engine figures per stratum — and, in design mode, a twin you can stage
 * moves on. A staged delta and the committed state read the same getters
 * (stackFigures.ts), so the panel can never promise what the estate denies.
 * Vision strata stay honest: real counts or nothing numeric.
 */

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

function Fig({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'warn' }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className={`text-figma-sm font-bold tabular-nums ${tone === 'warn' ? 'text-fw-warn' : 'text-fw-heading'}`}>
        {value}
      </span>
      <span className="text-[11px] font-medium text-fw-bodyLight">{label}</span>
    </span>
  );
}

/* The one layout switch this panel makes. Every row below splits left/right
   at `sm:` — a VIEWPORT query — which is exactly wrong when the panel lives in
   a 360px rail inside a 1440px window: the media query says "wide", the column
   is not.
   `lg` is where the rail is actually a rail. DiscoverPage puts this panel
   beside the tree at lg and above, and stacks it full-width below that — so
   rail mode splits like normal up to lg, then stacks from lg on. Reading the
   two files together is the only way that reads; they share the breakpoint. */
const SPLIT_ROW = 'sm:flex sm:items-center sm:justify-between sm:gap-4';
const splitRow = (rail: boolean) => (rail ? `${SPLIT_ROW} lg:block` : SPLIT_ROW);
const splitTail = (rail: boolean) => (rail ? 'mt-2 sm:mt-0 lg:mt-2' : 'mt-2 sm:mt-0');

function LiveBand({
  layer,
  figures,
  rail,
  children,
}: {
  layer: NavLayer;
  figures: React.ReactNode;
  rail: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-testid={`stack-band-${layer.key}`}
      className="rounded-xl border border-fw-secondary bg-fw-base px-4 py-3"
    >
      <div className={splitRow(rail)}>
        <div className="min-w-0">
          <p className="text-figma-base font-bold text-fw-heading tracking-[-0.02em]">{layer.label}</p>
          <p className="text-figma-sm text-fw-bodyLight">{layer.blurb}</p>
        </div>
        {/* Four verbs, and once the rail narrows they are a 2x2 pad rather
            than a 3+1 wrap that leaves "Cost" orphaned on its own line. */}
        <div
          className={`${splitTail(rail)} flex flex-wrap items-center gap-1.5 flex-shrink-0 ${
            rail ? 'lg:grid lg:grid-cols-2' : ''
          }`}
        >
          {layer.items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-fw-secondary bg-fw-wash px-3 py-1.5 text-figma-sm font-medium text-fw-body hover:border-fw-active hover:text-fw-link transition-colors"
            >
              <AttIcon name={item.icon} className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {figures !== null && (
        <div
          data-testid={`stack-figures-${layer.key}`}
          className="mt-2.5 pt-2.5 border-t border-fw-secondary/50 flex flex-wrap items-baseline gap-x-5 gap-y-1"
        >
          {figures}
        </div>
      )}
      {children}
    </div>
  );
}

/** One stageable move, as a chip: stage it, unstage it. */
function MoveChip({
  staged,
  onToggle,
  children,
  testid,
}: {
  staged: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testid: string;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-pressed={staged}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-figma-sm font-medium transition-colors ${
        staged
          ? 'border-fw-active bg-fw-accent text-fw-link'
          : 'border-dashed border-fw-secondary bg-fw-base text-fw-body hover:border-fw-active hover:text-fw-link'
      }`}
    >
      {staged ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function StackPanel({ rail = false }: { rail?: boolean } = {}) {
  // The AI band states live token money, so this panel opts into `hits`
  // ticks (see useCloudControlLive's header). The selector returns the
  // engine handle itself; every derivation below re-runs on each engine
  // version, live ticks included.
  const cc = useCloudControlLive(c => c);
  const panelRef = useRef<HTMLElement>(null);
  const [ai, naas] = STACK_LAYERS;
  const [designing, setDesigning] = useState(false);
  const [staged, setStaged] = useState<StagedMove[]>([]);
  const [commitNote, setCommitNote] = useState<string | null>(null);
  const [proposalNote, setProposalNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Andi's "Draft in the twin": ?draft=andi stages the advisor's draft on
  // arrival; ?draft=intent-<id> stages a standing intent's compiled repair
  // (Synchronize); ?draft=policy-<tag> stages a token-policy enforce patch
  // (the layer-home dashboard's Enforce); ?draft=finding-<id> stages a
  // security finding's preventive rule as an enforce move. Either way the
  // param strips so a refresh cannot re-stage.
  useEffect(() => {
    const param = searchParams.get('draft');
    if (!param) return;
    if (param === 'andi') {
      const draft = advisorDraft(cc);
      if (draft.moves.length) {
        setStaged(draft.moves);
        setDesigning(true);
        setProposalNote(`Drafted by Andi · ${draft.moves.length} moves`);
      }
    } else if (param.startsWith('intent-')) {
      // ?draft=intent-int-3 -> the declared intent whose id is int-3.
      const it = cc.intentList().find(i => i.id === param.slice('intent-'.length));
      if (it && it.reading.moves.length) {
        setStaged(it.reading.moves as StagedMove[]);
        setDesigning(true);
        setProposalNote(`Synchronize · ${it.scope.label} · ${it.reading.moves.length} move${it.reading.moves.length === 1 ? '' : 's'}`);
      }
    } else if (param === 'policy-new') {
      /* ?draft=policy-new -> the token-policy builder's staged spec, handed
         over in memory rather than in the URL. Everything the builder can
         change rides one patch, so the tray states the whole policy. This
         exact-match branch MUST come before the policy-<tag> startsWith
         branch below, or 'policy-new' would be swallowed as tag "new". */
      const spec = takePendingPolicySpec();
      if (spec) {
        const { tag, ...patch } = spec;
        setStaged([{ kind: 'policy', tag, patch }]);
        setDesigning(true);
        setProposalNote(`Token policy · ${tag}`);
      }
    } else if (param.startsWith('policy-')) {
      // ?draft=policy-shared-services -> the layer-home dashboard's Enforce
      // action (TokenBudgetsWidget). setTokenPolicy pushes no undo entry, so
      // Enforce stages the same 'policy' move the engine's own repairs use
      // (stackFigures.moveLabel/commitMoves) rather than mutating directly.
      const tag = param.slice('policy-'.length);
      const known = (cc.tokenPolicyList?.() ?? []).some((p: { tag: string }) => p.tag === tag);
      if (known) {
        setStaged([{ kind: 'policy', tag, patch: { enforced: true } }]);
        setDesigning(true);
        setProposalNote(`Token policy · ${tag} · enforce`);
      }
    } else if (param.startsWith('finding-')) {
      /* ?draft=finding-gd-dns -> the behavioural finding whose id is gd-dns.
         A finding names an EXISTING preventive rule, so what stages is the
         enforce move the tray already understands. promote() would enforce it
         on the spot; the machine stages, never commits. */
      const proposal = ruleProposals(cc).find(p => p.id === param);
      if (proposal) {
        setStaged([{ kind: 'enforce', ruleId: proposal.ruleId }]);
        setDesigning(true);
        setProposalNote(`Proposed by Andi · ${proposal.title}`);
      }
    } else if (param === 'rule-new') {
      /* ?draft=rule-new -> the rule builder's "Stage this rule" (seeded from
         "Tighten it" on a security finding). The spec itself rides the
         read-once holder, not the URL — see setPendingRuleSpec/
         takePendingRuleSpec in stackFigures.ts. A direct or refreshed load
         of this URL with nothing pending stages nothing, same as every
         other token here once its source has gone stale. */
      const spec = takePendingRuleSpec();
      if (spec) {
        setStaged([{ kind: 'rule', spec }]);
        setDesigning(true);
        setProposalNote(`Rule · ${spec.name}`);
      }
    } else {
      return;
    }
    searchParams.delete('draft');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // A proposal link stages the tray it carried — same estate, same deltas,
  // Commit in front of the recipient. Valid means the move still exists in
  // the engine's own opportunity lists; the estate may have moved on since
  // the link was minted, and stale moves are counted, never guessed.
  useEffect(() => {
    const carried = cc.takeProposal?.();
    if (!carried?.length) return;
    const attaches = attachOpportunities(cc);
    const steers = steerOpportunities(cc);
    const valid = carried.filter(m => {
      switch (m.kind) {
        case 'attach':
          return attaches.some(o => o.regionId === m.regionId);
        case 'steer':
          return steers.some(o => o.flowId === m.flowId && o.pathId === m.pathId);
        // A fix still applies while unapplied; a policy while its tag is
        // known; an enforcement while the rule is not already enforced.
        case 'fix':
          return m.fixKey in cc.fixes && !cc.fixes[m.fixKey];
        case 'policy':
          return (cc.tokenPolicyList?.() ?? []).some((p: { tag: string }) => p.tag === m.tag);
        case 'enforce':
          return cc.ruleEnforced ? !cc.ruleEnforced(m.ruleId) : false;
        default:
          return false;
      }
    });
    const dropped = carried.length - valid.length;
    setProposalNote(
      `Opened from a proposal link · ${valid.length} move${valid.length === 1 ? '' : 's'}` +
        (dropped ? ` · ${dropped} no longer appl${dropped === 1 ? 'ies' : 'y'}` : ''),
    );
    if (valid.length) {
      setStaged(valid);
      setDesigning(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const naasFig = naasStratum(cc);

  const attaches = designing ? attachOpportunities(cc) : [];
  const steers = designing ? steerOpportunities(cc) : [];
  const deltas = stagedDeltas(cc, staged);

  // Identity by value: two moves are the same move when every field agrees.
  // Kind-specific comparisons stopped scaling at three kinds.
  const isStaged = (m: StagedMove) => staged.some(s => JSON.stringify(s) === JSON.stringify(m));
  const toggleMove = (m: StagedMove) =>
    setStaged(prev => (isStaged(m) ? prev.filter(s => JSON.stringify(s) !== JSON.stringify(m)) : [...prev, m]));

  const draft = advisorDraft(cc);

  const discard = () => {
    setStaged([]);
    setDesigning(false);
    setCommitNote(null);
    setProposalNote(null);
  };

  const reviewDraft = () => {
    setStaged(draft.moves);
    setDesigning(true);
    setCommitNote(null);
    setProposalNote(null);
  };

  const shareProposal = async () => {
    try {
      await navigator.clipboard?.writeText?.(cc.proposalUrl(staged));
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('clipboard write failed', e);
    }
  };

  const commit = () => {
    const failed = commitMoves(cc, staged);
    if (failed.length === 0) {
      // Some move kinds push no undo entry when they commit - setTokenPolicy
      // and steerFlow today, see isUndoCovered in stackFigures.ts for the
      // full per-kind table and how each entry was determined by reading the
      // engine mutation itself. Keying off that table (rather than a
      // hardcoded kind check) is what stops a future move kind from silently
      // inheriting the wrong claim: the banner states exactly what THIS
      // commit's Undo can and cannot revert, never a blanket promise.
      const covered = staged.filter(isUndoCovered).length;
      const uncovered = staged.length - covered;
      const base = `${staged.length} move${staged.length === 1 ? '' : 's'} committed to the estate.`;
      const undoNote =
        uncovered === 0
          ? ' Undo reverts them.'
          : covered === 0
          ? ' Undo will not revert this - re-edit to change it back.'
          : ' Undo reverts the other moves, not all of them - re-edit the rest to change them back.';
      setCommitNote(base + undoNote);
    } else {
      setCommitNote(`${staged.length - failed.length} committed · ${failed.length} refused by the engine.`);
    }
    setStaged([]);
    setDesigning(false);
    setProposalNote(null);
  };

  return (
    <section
      ref={panelRef}
      aria-label="The network stack"
      data-testid="stack-panel"
      className={`relative rounded-2xl border border-fw-secondary bg-fw-base p-4 sm:p-5 ${rail ? 'lg:p-4' : ''}`}
    >
      {/* The woven threads: each declared intent drawn into the strata it
          constrains. Renders above the padding gutter, under nothing. */}
      <IntentThreadOverlay containerRef={panelRef} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-3">
        <div>
          <h2 className="text-figma-base font-bold text-fw-heading tracking-[-0.02em]">The stack</h2>
          <p className="text-figma-sm text-fw-bodyLight">
            Pick the layer you work on. The four verbs are the same on every one.
          </p>
        </div>
        <div className={`flex items-center gap-4 ${rail ? 'lg:flex-wrap lg:gap-x-3 lg:gap-y-2' : ''}`}>
          {/* The advisor: a derivation with a chip. Its whole authority is a
              pre-filled tray — a human commits, or does not. */}
          {!designing && draft.moves.length > 0 && (
            <button
              type="button"
              data-testid="advisor-chip"
              onClick={reviewDraft}
              className="inline-flex items-center gap-1.5 rounded-full border border-fw-secondary bg-fw-wash px-3.5 py-1.5 text-figma-sm font-medium text-fw-body hover:border-fw-active hover:text-fw-link transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Advisor: {draft.moves.length} moves · {money(draft.deltas.egressSavingMo)}/mo · Review
            </button>
          )}
          <button
            type="button"
            data-testid="design-toggle"
            aria-pressed={designing}
            onClick={() => (designing ? discard() : (setDesigning(true), setCommitNote(null)))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-figma-sm font-medium transition-colors ${
              designing
                ? 'border-fw-active bg-fw-accent text-fw-link'
                : 'border-fw-secondary bg-fw-wash text-fw-body hover:border-fw-active hover:text-fw-link'
            }`}
          >
            Design on the twin
          </button>
          <Link
            to="/stack"
            className="inline-flex items-center gap-1 text-figma-sm font-medium text-fw-link hover:underline whitespace-nowrap"
          >
            Why it's organized this way <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* The estate's declared promises, threaded into the strata below.
          The picture only - the office (declare, mode, remove) is /work. */}
      <IntentThreads manage={false} />

      <div className="space-y-1.5">
        {/* Row 27 of the phase-0 metric audit: the four figures this band
            used to state (model endpoints ready, tokens today, public-
            internet exposure, spend + identities) demoted — a NaaS-shaped
            screen stacking four zeros read as a broken panel, and the AI
            layer home's own Estate at a glance already states them. The
            band stays for the stack diagram; only its numbers moved. */}
        <LiveBand
          layer={ai}
          rail={rail}
          figures={null}
        >
          {designing && (
            <p className="mt-2 text-[11px] font-medium text-fw-bodyLight">
              No band chips on this stratum — declare an intent above (try &ldquo;keep ai private&rdquo; in Andi) and its repair stages here, token policy moves included.
            </p>
          )}
        </LiveBand>

        {/* Cloud — a vision stratum; it states only what the estate contains. */}
        <div
          data-testid="stack-band-cloud"
          className={`rounded-xl border border-dashed border-fw-secondary bg-fw-wash/50 px-4 py-2.5 ${splitRow(rail)}`}
        >
          <div className="min-w-0">
            <p className="text-figma-base font-bold text-fw-bodyLight tracking-[-0.02em]">
              Cloud
              <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight">
                its own layer, next
              </span>
            </p>
            {/* Row 28 of the phase-0 metric audit: the "N clouds · N regions
                · N VPCs" count cut — a third rendering of the summary
                band's own tiles (rows 22, 24) on the same screen. This
                band's job is "its own layer, next", not another count. */}
          </div>
          <Link
            to="/naas/connect"
            className={`${splitTail(rail)} inline-flex items-center gap-1 text-figma-sm font-medium text-fw-link hover:underline flex-shrink-0 whitespace-nowrap ${rail ? 'lg:whitespace-normal' : ''}`}
          >
            Cloud attach lives in NaaS · Connect today <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <LiveBand
          layer={naas}
          rail={rail}
          figures={
            // Row 29a of the phase-0 metric audit: "regions on the fabric"
            // and "sites" cut — both restate figures shown better
            // elsewhere on the same page (rows 21/37, 20) and the sites
            // count here is wrong besides (row 5). Row 29b's pair — egress
            // and the savings on the table — is the band's whole argument
            // and stays.
            <>
              <Fig value={`${money(naasFig.egressPubMo)}/mo`} label="egress on public transit" tone={naasFig.egressPubMo > 0 ? 'warn' : 'plain'} />
              <Fig value={`${money(naasFig.availableSavingsMo)}/mo`} label="still on the table" />
            </>
          }
        >
          {designing && (attaches.length > 0 || steers.length > 0) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="naas-moves">
              {attaches.map(o => {
                const move: StagedMove = { kind: 'attach', regionId: o.regionId };
                return (
                  <MoveChip
                    key={o.regionId}
                    testid={`move-attach-${o.regionId}`}
                    staged={isStaged(move)}
                    onToggle={() => toggleMove(move)}
                  >
                    Attach {o.label} · {o.publicMs}→{o.privateMs} ms on the fabric
                    {o.bucketSavingMo !== null && ` · ${money(o.bucketSavingMo)}/mo`}
                  </MoveChip>
                );
              })}
              {steers.map(o => {
                const move: StagedMove = { kind: 'steer', flowId: o.flowId, pathId: o.pathId };
                return (
                  <MoveChip
                    key={`${o.flowId}:${o.pathId}`}
                    testid={`move-steer-${o.flowId}`}
                    staged={isStaged(move)}
                    onToggle={() => toggleMove(move)}
                  >
                    Steer {o.label} onto the fabric
                    {o.egressSavingMo !== null && ` · ${money(o.egressSavingMo)}/mo`}
                  </MoveChip>
                );
              })}
            </div>
          )}
        </LiveBand>

        {/* Transport & Access — media are siblings, not layers of each other. */}
        <div
          data-testid="stack-band-transport"
          className="rounded-xl border border-dashed border-fw-secondary bg-fw-wash/50 px-4 py-2.5"
        >
          <p className="text-figma-base font-bold text-fw-bodyLight tracking-[-0.02em]">
            Transport &amp; Access
            <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-[0.08em] text-fw-bodyLight">
              vision
            </span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {['Fiber', 'Dark fiber', 'Wireless · 5G · FirstNet', 'Satellite'].map(m => (
              <span
                key={m}
                className="rounded-full border border-dashed border-fw-secondary px-3 py-1 text-figma-sm font-medium text-fw-bodyLight select-none"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The tray: what the staged moves would do, in the engine's own figures. */}
      {(designing && staged.length > 0) || commitNote ? (
        <div
          data-testid="design-tray"
          className={`mt-3 rounded-xl border border-fw-active bg-fw-accent/60 px-4 py-3 ${splitRow(rail)}`}
        >
          <p aria-live="polite" className="text-figma-sm font-medium text-fw-heading">
            {commitNote ?? (
              <>
                {proposalNote && (
                  <span data-testid="proposal-note" className="block text-figma-xs font-semibold text-fw-link">
                    {proposalNote}
                  </span>
                )}
                {deltas.moves} move{deltas.moves === 1 ? '' : 's'} staged
                {deltas.worstPath &&
                  ` · ${deltas.worstPath.label} ${deltas.worstPath.publicMs}→${deltas.worstPath.privateMs} ms on the fabric`}
                {deltas.egressSavingMo > 0 && ` · keeps ${money(deltas.egressSavingMo)}/mo of egress`}
                {deltas.violationsCleared > 0 &&
                  ` · clears ${deltas.violationsCleared} violation${deltas.violationsCleared === 1 ? '' : 's'}`}
                {deltas.policyNotes.length > 0 && ` · ${deltas.policyNotes.join(' · ')}`}
                {deltas.unpricedMoves.length > 0 &&
                  ` · ${deltas.unpricedMoves.join(', ')}: the engine prices no saving yet`}
              </>
            )}
          </p>
          {!commitNote && (
            <div className={`${splitTail(rail)} flex items-center gap-2 flex-shrink-0 ${rail ? 'lg:flex-wrap' : ''}`}>
              <button
                type="button"
                data-testid="share-proposal"
                onClick={shareProposal}
                className="inline-flex items-center gap-1.5 rounded-full border border-fw-secondary bg-fw-base px-4 py-1.5 text-figma-sm font-medium text-fw-body hover:border-fw-active hover:text-fw-link"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                {copied ? 'Copied' : 'Share proposal'}
              </button>
              <button
                type="button"
                data-testid="design-discard"
                onClick={discard}
                className="rounded-full border border-fw-secondary bg-fw-base px-4 py-1.5 text-figma-sm font-medium text-fw-body hover:border-fw-primary"
              >
                Discard
              </button>
              <button
                type="button"
                data-testid="design-commit"
                onClick={commit}
                className="rounded-full bg-fw-ctaPrimary px-4 py-1.5 text-figma-sm font-medium text-white hover:bg-fw-ctaPrimaryHover"
              >
                Commit to the estate
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

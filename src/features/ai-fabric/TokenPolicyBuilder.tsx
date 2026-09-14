import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CC } from '../../engine';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { tokenPolicyPreview, type TokenPolicySpec } from './tokenPolicyPreview';
import { setPendingPolicySpec } from '../discover/stackFigures';

/* A group-scoped identity is encoded in the single Identity <select> as
   "group:<id>" so one control expresses both identity families - a tag or a
   group. Nothing downstream sees the prefix - spec() turns it back into
   {tag: id, group: id}, the exact shape state-console.groupPolicy.test.ts
   asserts for a group-scoped policy (the tag key and the group id are the
   SAME string). Same idiom as RuleBuilder's GROUP_DST_PREFIX. */
const GROUP_IDENTITY_PREFIX = 'group:';

/* id of the "budget must be a positive number" warning — shared between the
   <p> that renders it and the aria-describedby on the Budget input it
   concerns, same idiom as RuleBuilder's *_WARNING_ID constants. A budget
   that is not a positive number is not "an unusually permissive budget" -
   it is a spec the engine cannot meter. tokenPolicyPreview only proposes a
   percent when spec.budget > 0; a cleared field coerces to 0 via
   Number(''), and a committed budget of 0 makes the engine's own meter
   (today / budget * 100) read as 100% of budget immediately. Combined with
   an enforced policy and an enforce-mode cap-token-spend intent, that
   denies every request for the identity - reachable by clearing a field
   and pressing Stage, with nothing on screen to say so. */
const BUDGET_WARNING_ID = 'tpb-budget-warning';

/* id of the "Alert at must be a percent between 1 and 100" warning. Same
   idiom. softPct has no consumer in this preview today (nothing reads it
   to gate anything), but it has the identical Number('') === 0 coercion as
   Budget, and a percent outside 1-100 is meaningless regardless of whether
   anything downstream reads it yet. */
const SOFTPCT_WARNING_ID = 'tpb-softpct-warning';

/* id of the "edit the form before staging" reason. Same idiom as the two
   above - this is the fourth instance of the same shape of bug on this
   project (a disabled control's only stated reason living in a `title`,
   which a disabled element cannot receive focus for and no screen reader
   announces), so it gets the same role="alert" + aria-describedby fix
   rather than a fourth unannounced title. */
const UNTOUCHED_WARNING_ID = 'tpb-untouched-warning';

/* The closed set of four scope strings the engine understands. Only two of
   them gate anything - CC.scopeDenies returns a reason for 'no-external' and
   'self-hosted' only; 'external-allowed' and 'private-only' are the engine's
   own words for "descriptive, no enforcement semantics" (state-console.ts,
   the tokenPolicies comment above the seeds). Both live seeds
   (shared-services, west-workloads) use a descriptive scope, so this list
   keeps all four - it labels which two gate rather than dropping the ones
   that don't. */
const SCOPES: { value: string; label: string }[] = [
  { value: 'no-external', label: 'No external models (blocks a request to any external model)' },
  { value: 'self-hosted', label: 'Self-hosted only (blocks anything off the self-hosted allowlist)' },
  { value: 'external-allowed', label: 'External allowed (descriptive only - blocks nothing)' },
  { value: 'private-only', label: 'Private path only (descriptive only - blocks nothing)' },
];

const INITIAL_FORM = {
  identity: Object.keys(CC.TAGS)[0],
  scope: 'external-allowed',
  budget: 1_000_000_000,
  softPct: 80,
  guardrail: false,
};

interface Group {
  id: string;
  label: string;
}

/* The shape of an existing policy, as looked up for seeding. Mirrors
   TokenPolicySpec's fields rather than importing it wholesale - this
   component only ever reads what it re-encodes into form state. */
interface SeedPolicy {
  scope: string;
  budget: number;
  softPct?: number;
  guardrail: boolean;
  enforced: boolean;
  group?: string;
}

interface TokenPolicyBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when the builder edits an existing policy rather than
   *  authoring a new one. The identity is locked - a policy's tag (or
   *  group id) is how every other surface addresses it, so changing it
   *  here would silently orphan the policy being edited. */
  editTag?: string;
}

export function TokenPolicyBuilder({ open, onOpenChange, editTag }: TokenPolicyBuilderProps) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(INITIAL_FORM.identity);
  const [scope, setScope] = useState(INITIAL_FORM.scope);
  const [budget, setBudget] = useState(INITIAL_FORM.budget);
  const [softPct, setSoftPct] = useState(INITIAL_FORM.softPct);
  const [guardrail, setGuardrail] = useState(INITIAL_FORM.guardrail);
  // Not a form field - there is no control for it in this dialog (enforcing
  // a policy is a separate action elsewhere: the layer-home dashboard's
  // Enforce link, ?draft=policy-<tag>). Seeded from the existing policy in
  // edit mode so an edit here never silently flips a live policy back to
  // draft; false for a brand-new policy, matching the engine's own default
  // for an unseen tag (CC.setTokenPolicy's fallback).
  const [enforced, setEnforced] = useState(false);
  const identityRef = useRef<HTMLSelectElement | HTMLInputElement>(null);

  // Focus moves to the identity field the moment the dialog opens - the
  // trigger that opened it lives elsewhere on the page, so without this a
  // keyboard or screen-reader user lands nowhere in particular.
  useEffect(() => {
    if (open) identityRef.current?.focus();
  }, [open]);

  // Escape closes the dialog from anywhere in the document, not just while
  // a field inside it has focus. Bound on document and cleaned up on
  // unmount/close so a stray listener never outlives the dialog.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-derive every field from the named policy's OWN state, keyed to
  // editTag - not a plain mount-once effect, so a builder instance that
  // persists across renders re-seeds when it is pointed at a different
  // policy. A tag the engine no longer carries (removed out from under the
  // link) leaves the form untouched rather than seeding garbage - same
  // idiom as RuleBuilder's seed effect for a vanished rule id.
  useEffect(() => {
    if (!editTag) {
      setIdentity(INITIAL_FORM.identity);
      setScope(INITIAL_FORM.scope);
      setBudget(INITIAL_FORM.budget);
      setSoftPct(INITIAL_FORM.softPct);
      setGuardrail(INITIAL_FORM.guardrail);
      setEnforced(false);
      return;
    }
    const existing = CC.tokenPolicy(editTag) as SeedPolicy | null;
    if (!existing) return;
    setIdentity(existing.group ? `${GROUP_IDENTITY_PREFIX}${existing.group}` : editTag);
    setScope(existing.scope);
    setBudget(existing.budget);
    setSoftPct(existing.softPct ?? INITIAL_FORM.softPct);
    setGuardrail(existing.guardrail);
    setEnforced(existing.enforced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTag]);

  // Subscribed via useCloudControl (not a plain CC.groupList() read): a
  // group added or renamed in the estate while the builder is open shows up
  // here without needing an unrelated field edit to force a re-render.
  const groups = useCloudControl(cc => cc.groupList()) as Group[];

  /* group is decoded from the "group:<id>" identity encoding, never typed
     separately - the tag key and the group id a group-scoped policy carries
     are the SAME string (state-console.groupPolicy.test.ts). */
  const isGroupIdentity = identity.startsWith(GROUP_IDENTITY_PREFIX);
  const tag = isGroupIdentity ? identity.slice(GROUP_IDENTITY_PREFIX.length) : identity;

  /* What the identity control shows in edit mode. A <select> locked via
     `disabled` falls back to selectedIndex 0 whenever the seeded value is
     not among its rendered <option>s - reachable the moment a policy
     carries a group id groupList() no longer returns (the group was
     removed or renamed), which the policy table already renders as a live
     row with an Edit button. Reading the label straight off `groups`
     rather than off a <select>'s DOM value means what is displayed is
     always exactly what `tag` (and therefore spec()) already holds,
     whether or not that identity still has a live option to match. */
  const identityLabel = isGroupIdentity
    ? groups.find(g => g.id === tag)?.label ?? `${tag} (group not in the estate)`
    : identity;

  const spec = (): TokenPolicySpec => ({
    tag,
    scope,
    budget,
    softPct,
    guardrail,
    enforced,
    ...(isGroupIdentity ? { group: tag } : {}),
  });

  const resetForm = () => {
    setIdentity(INITIAL_FORM.identity);
    setScope(INITIAL_FORM.scope);
    setBudget(INITIAL_FORM.budget);
    setSoftPct(INITIAL_FORM.softPct);
    setGuardrail(INITIAL_FORM.guardrail);
    setEnforced(false);
  };

  const cancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Every field still at its INITIAL_FORM value: nothing has been authored
  // yet, so this is not "a policy on the first tag the person chose" - it's
  // the form nobody has touched. That default must never be stageable just
  // by opening the dialog and clicking Stage. In edit mode the seeded
  // values differ from INITIAL_FORM (unless a policy happens to already
  // match every default), so the button is enabled immediately - the same
  // "accept the seeded draft as-is" idiom RuleBuilder's seed prop uses.
  //
  // Deliberately compared against INITIAL_FORM rather than a per-instance
  // seed baseline (a candidate alternative would be "untouched since the
  // dialog opened"). Kept as-is because: (1) this guard itself makes the
  // coincidence self-limiting - a spec can only ever be staged through
  // this dialog while it differs from INITIAL_FORM in at least one field,
  // so nothing this dialog ever commits can be edited back to match every
  // default without re-disabling Stage first; (2) none of the engine's
  // seeded policies coincide with INITIAL_FORM on every field today; and
  // (3) editTag is only ever reached from a live policy link, never an
  // unseen tag. See "edit mode enables Stage immediately" in the test file.
  const untouched =
    identity === INITIAL_FORM.identity &&
    scope === INITIAL_FORM.scope &&
    budget === INITIAL_FORM.budget &&
    softPct === INITIAL_FORM.softPct &&
    guardrail === INITIAL_FORM.guardrail;

  // A budget that is not a positive number, or an alert percent outside
  // 1-100, is an impossible spec regardless of whether anything else on
  // the form has changed. `!(budget > 0)` (rather than `budget <= 0`)
  // also catches NaN from a non-numeric Number() coercion, the same way
  // `!(softPct >= 1 && softPct <= 100)` catches it for softPct.
  const budgetInvalid = !(budget > 0);
  const softPctInvalid = !(softPct >= 1 && softPct <= 100);
  const specInvalid = budgetInvalid || softPctInvalid;

  const submit = () => {
    // Defense in depth: the Stage button is disabled in this state, but a
    // disabled control is a UI affordance, not a contract.
    if (untouched || specInvalid) return;
    // The machine stages, never commits: the primary action hands the spec
    // to the review tray (via the read-once holder in stackFigures.ts) and
    // navigates there, rather than calling setTokenPolicy itself. A human
    // still has to press Commit on /discover before anything changes.
    setPendingPolicySpec(spec());
    resetForm();
    onOpenChange(false);
    navigate('/discover?draft=policy-new');
  };

  if (!open) return null;

  const selectClass =
    'w-full h-9 px-2 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm disabled:opacity-40';
  const inputClass =
    'w-full h-9 px-3 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm tabular-nums';
  /* The locked identity field in edit mode: readOnly, not disabled (Finding
     2 - `disabled` wins over `readOnly` when both are set, and a disabled
     control is unfocusable and skipped by most screen readers, so the field
     naming WHICH identity is being edited was unreachable to assistive
     tech). readOnly alone keeps it focusable and announced while still
     blocking edits. Carries its own locked look (text-fw-bodyLight,
     cursor-not-allowed) since it no longer qualifies for the select's
     `disabled:opacity-40` and would otherwise render indistinguishable from
     an editable field. */
  const lockedInputClass =
    'w-full h-9 px-3 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm tabular-nums text-fw-bodyLight cursor-not-allowed';

  /* The preview is derived, not stored: it describes exactly the spec on
     screen, so what a person reviews and what they stage cannot drift. */
  const preview = tokenPolicyPreview(CC, spec());

  return (
    <div role="dialog" aria-label={editTag ? `Edit token policy · ${editTag}` : 'New token policy'}
      data-testid="policy-builder">
      <form
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-figma-xs text-fw-bodyLight" htmlFor="tpb-identity">
              Identity
            </label>
            {editTag ? (
              // Locked text, not a locked <select>: a <select> whose value
              // is not among its rendered <option>s falls back to
              // selectedIndex 0 and displays a DIFFERENT identity than the
              // one actually staged (Finding 3). Rendering the identity as
              // plain text sidesteps that failure mode entirely - there is
              // no option list for the staged value to fall out of.
              <input
                id="tpb-identity"
                ref={identityRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={identityLabel}
                readOnly
                className={lockedInputClass}
              />
            ) : (
              <select
                id="tpb-identity"
                ref={identityRef as React.RefObject<HTMLSelectElement>}
                value={identity}
                onChange={e => setIdentity(e.target.value)}
                className={selectClass}
              >
                <optgroup label="Workloads">
                  {Object.keys(CC.TAGS).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
                <optgroup label="Groups">
                  {groups.map(g => (
                    <option key={g.id} value={`${GROUP_IDENTITY_PREFIX}${g.id}`}>{g.label}</option>
                  ))}
                </optgroup>
              </select>
            )}
            {/* A policy's identity is how every other surface addresses it -
                changing it here would orphan the policy being edited, so the
                lock is stated, not just silently enforced. */}
            {editTag && (
              <p className="mt-1 text-figma-xs text-fw-bodyLight">
                Identity is locked while editing an existing policy.
              </p>
            )}
          </div>

          <div>
            <label className="block text-figma-xs text-fw-bodyLight" htmlFor="tpb-scope">
              Scope
            </label>
            <select
              id="tpb-scope"
              value={scope}
              onChange={e => setScope(e.target.value)}
              className={selectClass}
            >
              {SCOPES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-figma-xs text-fw-bodyLight" htmlFor="tpb-budget">
              Budget (tokens per day)
            </label>
            <input
              id="tpb-budget"
              type="number"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              aria-describedby={budgetInvalid ? BUDGET_WARNING_ID : undefined}
              aria-invalid={budgetInvalid}
              className={inputClass}
            />
            {/* The engine hardcodes a daily window - it never meters a week
                or a month. Offering a window this form cannot honor would be
                a lie the meter would immediately contradict. */}
            <p className="mt-1 text-figma-xs text-fw-bodyLight">
              Measured against a fixed daily window - the engine does not offer a weekly or monthly one.
            </p>
          </div>

          <div>
            <label className="block text-figma-xs text-fw-bodyLight" htmlFor="tpb-softpct">
              Alert at (%)
            </label>
            <input
              id="tpb-softpct"
              type="number"
              value={softPct}
              onChange={e => setSoftPct(Number(e.target.value))}
              aria-describedby={softPctInvalid ? SOFTPCT_WARNING_ID : undefined}
              aria-invalid={softPctInvalid}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              id="tpb-guardrail"
              type="checkbox"
              checked={guardrail}
              onChange={e => setGuardrail(e.target.checked)}
              className="rounded border-fw-secondary"
            />
            <label className="text-figma-xs text-fw-bodyLight" htmlFor="tpb-guardrail">
              Guardrail (adds an inline inspection hop that flags prompt and completion - it never blocks a request)
            </label>
          </div>
        </div>

        {/* A budget that is not a positive number is not a permissive
            ceiling - it's a spec the engine cannot meter, and a committed
            0 reads as "at capacity" the instant the policy is enforced.
            Named explicitly rather than left for the preview to silently
            go blank over. */}
        {budgetInvalid && (
          <p id={BUDGET_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
            Budget must be a positive number of tokens. A cleared or zero budget is not a permissive
            ceiling - the engine reads it as fully spent the instant this policy is enforced, and an
            enforce-mode cap-token-spend intent would then deny every request for this identity.
          </p>
        )}

        {softPctInvalid && (
          <p id={SOFTPCT_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
            Alert at must be a percent between 1 and 100.
          </p>
        )}

        {/* Same aria-describedby idiom as the budget/softPct warnings above,
            but deliberately NOT role="alert" (Finding 3): this is the form's
            PRISTINE state on first paint, not something that became true in
            response to an action - role="alert" is for the latter, and on
            initial render it does not announce anyway, while visually it
            still reads as an error before anyone has typed anything. The
            Stage button's aria-describedby below still points at this
            paragraph's id, so the reason survives even though a disabled
            button cannot be focused - only the alert semantics are gone.
            untouched and specInvalid never hold at once (every INITIAL_FORM
            value is itself valid), so at most one of the three warnings
            below is visible at a time. */}
        {untouched && (
          <p id={UNTOUCHED_WARNING_ID} className="text-figma-xs text-fw-body">
            Edit the form before staging a token policy - nothing has changed from the default yet.
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            data-testid="policy-stage"
            disabled={untouched || specInvalid}
            aria-disabled={untouched || specInvalid}
            aria-describedby={
              [
                budgetInvalid ? BUDGET_WARNING_ID : null,
                softPctInvalid ? SOFTPCT_WARNING_ID : null,
                untouched ? UNTOUCHED_WARNING_ID : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className="h-9 px-4 rounded-full text-figma-sm font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-fw-active"
          >
            Stage this policy
          </button>
          <button
            type="button"
            onClick={cancel}
            className="h-9 px-4 rounded-full text-figma-sm font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* The preview: only the clauses whose data exists. An unmetered
            identity says so plainly instead of showing 0%; an empty replay
            window says there was nothing to replay rather than "0 would be
            denied", which would read as a safety claim the engine cannot
            back. */}
        <div
          data-testid="policy-preview"
          className="rounded-xl border border-fw-secondary bg-fw-wash overflow-hidden p-4 space-y-2"
        >
          <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">
            Preview · nothing has changed yet
          </div>

          {budgetInvalid ? (
            <p className="text-figma-sm text-fw-body">
              Budget is not a positive number, so there is nothing to project against today's usage -
              see the warning above before staging this policy.
            </p>
          ) : preview.unmetered ? (
            <p className="text-figma-sm text-fw-body">
              This identity is not metered, so a budget here is a ceiling with no gauge.
            </p>
          ) : preview.meter && preview.proposedPct !== null ? (
            <p className="text-figma-sm text-fw-body">
              {tag} is at {preview.meter.pct}% of {preview.meter.budget.toLocaleString()} today. At{' '}
              {budget.toLocaleString()} it would stand at {preview.proposedPct}%.
            </p>
          ) : null}

          {preview.wouldDeny.total > 0 ? (
            <p className="text-figma-sm text-fw-body">
              {preview.wouldDeny.count} of the last {preview.wouldDeny.total} requests would be denied
              under this scope.
              {preview.wouldDeny.reasons.length > 0 && ` Reasons: ${preview.wouldDeny.reasons.join(', ')}.`}
            </p>
          ) : (
            <p className="text-figma-sm text-fw-body">
              No requests for this identity in the window to replay.
            </p>
          )}

          {preview.boundAgents.length > 0 && (
            <p className="text-figma-sm text-fw-body">
              Binds {preview.boundAgents.join(', ')}.
            </p>
          )}

          {/* The single most important sentence in this dialog: the budget
              gate needs three conditions (enforced, meter at ceiling, AND an
              enforce-mode cap-token-spend intent for this identity) and a
              person is not told the third exists anywhere else. */}
          {!preview.capIntentEnforced && (
            <p className="text-figma-sm text-fw-body">
              Nothing is denied on budget until a cap-token-spend intent is enforce-mode for this
              identity.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

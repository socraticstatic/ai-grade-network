import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CC } from '../../engine';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { setPendingRuleSpec } from '../discover/stackFigures';

const ACTIONS = ['deny', 'inspect', 'route-private', 'allow'] as const;
const PORTS = ['any', '53', '443', '5432', '8443'] as const;

/* A structured group destination is encoded in the single <select> as
   "group:<id>" so one control expresses both destination families. Nothing
   downstream sees the prefix — spec() turns it back into {group}. */
const GROUP_DST_PREFIX = 'group:';

/* id of the "pick a source group" warning — shared between the <p> that
   renders it and the aria-describedby on the two controls it concerns
   (#rb-dst, #rb-group), so assistive tech gets the same signal a sighted
   user gets from reading the page. */
const GROUP_WARNING_ID = 'rb-group-warning';

/* id of the "source group resolves to branches only" warning — a branch
   carries no governance tag (srcTag is null on every branch flow, by
   design), so a rule combining a branch-only group with a tag can never
   match anything. Shared between the <p> that renders it and the
   aria-describedby on the two controls it concerns (#rb-group, #rb-tag). */
const TAG_GROUP_WARNING_ID = 'rb-tag-group-warning';

/* id of the "engine rejected this spec" warning. addRule returns null on an
   invalid spec (e.g. a destination naming a group that no longer exists)
   rather than throwing — same idiom as GroupBuilder's CREATE_FAILED_WARNING_ID
   for addGroup. Without this, a null return was discarded and the form reset
   and closed anyway: a failed author looked identical to a successful one. */
const AUTHOR_FAILED_WARNING_ID = 'rb-author-failed-warning';

/* How many matched flows the dry-run surface names before it summarises the
   rest. Enough to recognise the blast radius; not so many the form becomes
   a table. */
const NAMED_FLOW_LIMIT = 6;

const INITIAL_FORM = {
  name: '',
  tag: 'any',
  cloud: 'any',
  group: 'any',
  dst: 'any',
  ports: 'any',
  action: 'deny',
};

interface Group {
  id: string;
  label: string;
  kind: string;
}

/* The shape of an existing rule, as looked up for seeding. Mirrors
   RulesPanel's Rule/RuleSrc/RuleDst locally rather than importing them —
   this component only ever reads the four fields it re-encodes into form
   state, and the two files evolving their own minimal view is cheaper than
   a shared type neither fully needs. */
interface SeedRuleSrc {
  tag?: string;
  cloud?: string;
  group?: string;
}
type SeedRuleDst = string | { group?: string };
interface SeedRule {
  id: string;
  name: string;
  src: SeedRuleSrc;
  dst: SeedRuleDst;
  ports: string;
  action: string;
}

interface MatchedFlow {
  flow: {
    id: string;
    srcName?: string;
    srcVpc?: string;
    srcBranch?: string;
    dst: string;
    dstVpc?: string;
    gbps: number;
  };
  v: string;
  bad: boolean;
}

interface ShadowedMatch {
  flow: MatchedFlow['flow'];
  by: string;
}

interface Preview {
  matched: MatchedFlow[];
  gbps: number;
  blocked: number;
  pending: number;
  shadowed: ShadowedMatch[];
}

/* Names, resolved live from the engine — never a lookup table copied into
   the component. A workload renamed in the estate is renamed here. */
function vpcName(id?: string): string | null {
  if (!id) return null;
  const byRegion = (CC.vpcs || {}) as unknown as Record<string, { id: string; name: string }[]>;
  for (const list of Object.values(byRegion)) {
    const hit = list.find(v => v.id === id);
    if (hit) return hit.name;
  }
  return null;
}

/* What a matched flow is TALKING TO. A group flow carries a concrete
   dstVpc; a legacy flow only carries its destination class. Prefer the
   concrete workload, fall back to the human phrasing of the class. */
function flowDstLabel(flow: MatchedFlow['flow']): string {
  return vpcName(flow.dstVpc) || (CC.DSTS as Record<string, string>)[flow.dst] || flow.dst;
}

interface RuleBuilderProps {
  /** Controlled open state. When provided, the parent owns the trigger and
   *  this component renders only the form. Omit for the self-contained
   *  variant that renders its own "New rule" button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Present when the builder was opened from "Tighten it" on a security
   *  finding (ProposalBand → /naas/govern?rule=<ruleId>). The form seeds
   *  from that rule's spec rather than starting blank, and its primary
   *  action stages a spec for the tray instead of authoring in place —
   *  see the `seed` branch in `submit` below. */
  seed?: { ruleId: string };
}

export function RuleBuilder({ open: controlledOpen, onOpenChange, seed }: RuleBuilderProps = {}) {
  const actions = useCloudControlActions();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInternalOpen(v));
  const [name, setName] = useState(INITIAL_FORM.name);
  const [tag, setTag] = useState(INITIAL_FORM.tag);
  const [cloud, setCloud] = useState(INITIAL_FORM.cloud);
  const [group, setGroup] = useState(INITIAL_FORM.group);
  const [dst, setDst] = useState(INITIAL_FORM.dst);
  const [ports, setPorts] = useState<string>(INITIAL_FORM.ports);
  const [action, setAction] = useState<string>(INITIAL_FORM.action);
  const [failed, setFailed] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus moves to the name field the moment the dialog opens — the trigger
  // that opened it lives elsewhere on the page (in the card header), so
  // without this a keyboard or screen-reader user lands nowhere in
  // particular when the dialog appears.
  useEffect(() => {
    if (open) nameInputRef.current?.focus();
  }, [open]);

  // Escape closes the dialog from anywhere in the document, not just while
  // a field inside it has focus — the standard dismissal a modal dialog is
  // expected to support. Bound on document and cleaned up on unmount/close
  // so a stray listener never outlives the dialog that registered it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Seeding from "Tighten it": re-derive every field from the named rule's
  // OWN spec, keyed to seed.ruleId — not a plain mount-once effect, because
  // the same RuleBuilder instance persists across renders in RulesPanel (it
  // is the parent's controlled dialog). Keying on seed.ruleId means a SECOND
  // Tighten click on a DIFFERENT rule while the first is still open re-seeds
  // correctly; a second click on the SAME rule leaves seed.ruleId unchanged,
  // so the effect no-ops and the person's in-progress edits survive rather
  // than being clobbered by a re-seed they didn't ask for.
  // A rule id the engine no longer carries (removed out from under the
  // link) leaves the form untouched rather than seeding garbage.
  useEffect(() => {
    if (!seed) return;
    const rule = (CC.ruleList() as SeedRule[]).find(r => r.id === seed.ruleId);
    if (!rule) return;
    setName(`${rule.name} (tightened)`);
    setTag(rule.src.tag ?? 'any');
    setCloud(rule.src.cloud ?? 'any');
    setGroup(rule.src.group ?? 'any');
    // A structured dst re-enters the same "group:<id>" encoding the single
    // destination <select> expects (see GROUP_DST_PREFIX above) — this is
    // the mirror image of spec()'s own decode a few lines down.
    setDst(
      rule.dst && typeof rule.dst === 'object'
        ? rule.dst.group
          ? `${GROUP_DST_PREFIX}${rule.dst.group}`
          : 'any'
        : rule.dst,
    );
    setPorts(rule.ports);
    setAction(rule.action);
    setFailed(false);
    // setOpen routes through onOpenChange when the parent controls this
    // dialog (RulesPanel) and through internal state otherwise (this
    // component's own uncontrolled test) — either way, seeding opens it.
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.ruleId]);

  // Subscribed via useCloudControl (not useCloudControlActions, which hands
  // back the engine handle without wiring a re-render). A group added or
  // renamed in the estate while the builder is open shows up here without
  // needing an unrelated field edit to force a re-render first.
  const groups = useCloudControl(cc => cc.groupList()) as Group[];

  /* src.group is OMITTED rather than set to 'any' when no group is chosen:
     the engine treats any truthy src.group as a filter, so the literal
     string 'any' would match nothing at all. */
  const spec = () => ({
    name,
    src: group === 'any' ? { tag, cloud } : { tag, cloud, group },
    dst: dst.startsWith(GROUP_DST_PREFIX) ? { group: dst.slice(GROUP_DST_PREFIX.length) } : dst,
    ports,
    action,
    chain: [] as string[],
  });

  const resetForm = () => {
    setName(INITIAL_FORM.name);
    setTag(INITIAL_FORM.tag);
    setCloud(INITIAL_FORM.cloud);
    setGroup(INITIAL_FORM.group);
    setDst(INITIAL_FORM.dst);
    setPorts(INITIAL_FORM.ports);
    setAction(INITIAL_FORM.action);
    setFailed(false);
  };

  const cancel = () => {
    resetForm();
    setOpen(false);
  };

  // Every field still at its INITIAL_FORM value: nothing has been
  // authored yet, so this is not "a deny-any-to-any rule the person
  // chose" — it's the form nobody has touched. That default must never
  // be committable just by opening the dialog and clicking Add.
  const untouched =
    name === INITIAL_FORM.name &&
    tag === INITIAL_FORM.tag &&
    cloud === INITIAL_FORM.cloud &&
    group === INITIAL_FORM.group &&
    dst === INITIAL_FORM.dst &&
    ports === INITIAL_FORM.ports &&
    action === INITIAL_FORM.action;

  const submit = () => {
    // Defense in depth: the Add rule button is disabled in this state, but
    // a disabled control is a UI affordance, not a contract — refuse here
    // too so the silent-zero-match rule stays unreachable even if submit()
    // is ever reached some other way.
    if (groupNeeded || tagGroupMismatch || untouched) return;
    // The machine stages, never commits: a seeded builder's primary action
    // hands the spec to the review tray (via the read-once holder in
    // stackFigures.ts — encoding it in the URL would be long and fragile)
    // and navigates there, rather than calling addRule itself. A human
    // still has to press Commit on /discover before anything changes.
    if (seed) {
      setPendingRuleSpec(spec());
      resetForm();
      setOpen(false);
      navigate('/discover?draft=rule-new');
      return;
    }
    const created = actions.addRule({ ...spec(), enforceNow: false });
    // addRule returns null on an invalid spec (e.g. a destination naming a
    // group that no longer exists) rather than throwing. Discarding that
    // return and resetting/closing regardless made a failed author
    // indistinguishable from a success — stay open, keep the draft, say why.
    if (created === null) {
      setFailed(true);
      return;
    }
    resetForm();
    setOpen(false);
  };

  // A failed author is scoped to the spec that produced it — any further
  // edit means the person is trying something new, not repeating the
  // failure, so the warning should not linger past that edit.
  const onField = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setFailed(false);
  };

  if (!open) {
    // Controlled: the parent owns the trigger (it lives in the card header,
    // where a create action belongs — not trailing the table).
    if (isControlled) return null;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center h-9 px-4 rounded-full text-figma-sm font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
      >
        New rule
      </button>
    );
  }

  const selectClass =
    'w-full h-9 px-2 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm';

  const groupNeeded = (dst === 'intra-group' || dst === 'not-intra-group') && group === 'any';

  /* Precise condition: NOT "group and tag both set" in general — a group
     resolving to at least one VPC (e.g. west-workloads) can legitimately
     combine with a tag, since the tag still narrows the VPC side. Only a
     group that resolves to branches with zero VPCs guarantees a silent
     zero, because every branch flow carries srcTag: null. Mutually
     exclusive with groupNeeded above: this requires group !== 'any', that
     requires group === 'any'. */
  const groupInfo = group !== 'any' ? (CC.resolveGroup(group) as { vpcIds: string[]; branchIds: string[] }) : null;
  const tagGroupMismatch = !!groupInfo && tag !== 'any' && groupInfo.vpcIds.length === 0 && groupInfo.branchIds.length > 0;

  /* The preview is derived, not stored: it describes exactly the spec on
     screen, so what a person approved and what they commit cannot drift.
     The old flow cleared it on every keystroke, which meant the reviewed
     spec and the committed spec were never the same object. */
  const preview = !groupNeeded && !tagGroupMismatch
    ? (CC.dryRun(spec()) as Preview)
    : null;

  // Looked up fresh on every render rather than captured once in the seed
  // effect above: the provenance line names the rule Andi proposed, and
  // that name should track a live rename the same way every other engine
  // name in this component does (see vpcName/flowDstLabel further up).
  const seededRuleName = seed
    ? (CC.ruleList() as SeedRule[]).find(r => r.id === seed.ruleId)?.name ?? seed.ruleId
    : null;

  return (
    <div role="dialog" aria-label="New rule">
      <form
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-3"
      >
      <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-name">
        Rule name
      </label>
      <input
        id="rb-name"
        ref={nameInputRef}
        value={name}
        onChange={e => onField(setName)(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm"
      />

      {/* Where this draft came from — "Tighten it" pre-fills every field
          below from an existing rule's own spec, and a person editing that
          draft should never mistake it for one they started from scratch. */}
      {seed && (
        <p data-testid="rule-provenance" className="text-figma-xs text-fw-bodyLight">
          Proposed by Andi from: {seededRuleName}. Edit anything before you stage it.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Source group leads the source fields: naming a group is the
            expressive way to say who a policy is about; tag and cloud
            narrow it further rather than the other way round. */}
        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-group">Source group</label>
          <select id="rb-group" value={group} onChange={e => onField(setGroup)(e.target.value)}
            aria-describedby={groupNeeded ? GROUP_WARNING_ID : tagGroupMismatch ? TAG_GROUP_WARNING_ID : undefined}
            className={selectClass}>
            <option value="any">any source</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-tag">Source tag</label>
          <select id="rb-tag" value={tag} onChange={e => onField(setTag)(e.target.value)}
            aria-describedby={tagGroupMismatch ? TAG_GROUP_WARNING_ID : undefined}
            className={selectClass}>
            <option value="any">any workload</option>
            {Object.keys(CC.TAGS).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-cloud">Cloud</label>
          <select id="rb-cloud" value={cloud} onChange={e => onField(setCloud)(e.target.value)}
            className={selectClass}>
            <option value="any">any cloud</option>
            {CC.clouds.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          {/* Every destination the engine can match is offered here now,
              including the two group-relative ones. They used to be
              filtered out because the form had no way to name the source
              group they are relative to; it does. */}
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-dst">Destination</label>
          <select id="rb-dst" value={dst} onChange={e => onField(setDst)(e.target.value)}
            aria-describedby={groupNeeded ? GROUP_WARNING_ID : undefined}
            className={selectClass}>
            {Object.entries(CC.DSTS).map(([k, v]) => (
              <option key={k} value={k}>{v as string}</option>
            ))}
            <optgroup label="Groups">
              {groups.map(g => (
                <option key={g.id} value={`${GROUP_DST_PREFIX}${g.id}`}>{g.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-action">Action</label>
          <select id="rb-action" value={action} onChange={e => onField(setAction)(e.target.value)}
            className={selectClass}>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="rb-ports">Ports</label>
          <select id="rb-ports" value={ports} onChange={e => onField(setPorts)(e.target.value)}
            className={selectClass}>
            {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* "the same group" / "outside the group" are relative to a source
          group, and the engine deliberately matches nothing without one.
          Say that in the form rather than letting a person watch an empty
          dry run and guess why. */}
      {groupNeeded && (
        <p id={GROUP_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
          Pick a source group — “{(CC.DSTS as Record<string, string>)[dst]}” is relative to one, and
          matches nothing until this rule names which group it is about.
        </p>
      )}

      {/* A branch carries no governance tag — srcTag is null on every
          branch-originated flow, by design. A group that resolves to
          branches only (zero VPCs) combined with any tag other than "any"
          is therefore unsatisfiable, the same silent-zero-match failure the
          relative-destination warning above exists to prevent. */}
      {tagGroupMismatch && (
        <p id={TAG_GROUP_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
          “{groups.find(g => g.id === group)?.label ?? group}” resolves to branches only, and a branch
          carries no governance tag — combined with “{tag}” this rule matches nothing. Clear the tag or
          pick a group that includes a workload.
        </p>
      )}

      {/* addRule returned null: the spec was rejected at the instant it was
          submitted (e.g. the destination named a group removed out from
          under the selection). Stay open, keep the draft, say why — same
          idiom as GroupBuilder's create-failed warning for addGroup. */}
      {failed && (
        <p id={AUTHOR_FAILED_WARNING_ID} role="alert" className="text-figma-sm text-fw-warn">
          That rule could not be authored. Check the destination still names a live group.
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={groupNeeded || tagGroupMismatch || untouched}
          aria-disabled={groupNeeded || tagGroupMismatch || untouched}
          title={groupNeeded ? 'Pick a source group before adding this rule'
            : tagGroupMismatch ? 'This source group and tag combination matches nothing'
            : untouched ? 'Edit the form before adding a rule' : undefined}
          className="h-9 px-4 rounded-full text-figma-sm font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-fw-active">
          {seed ? 'Stage this rule' : 'Add rule'}
        </button>
        <button type="button" onClick={cancel}
          className="h-9 px-4 rounded-full text-figma-sm font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors">
          Cancel
        </button>
      </div>

      {/* The dry run is the most valuable moment in a governance product:
          the blast radius, before anything changes. It gets a result
          surface with the flows NAMED — a bare count is not something a
          person can check their intent against. rounded-xl, not
          rounded-full: this is a panel, not a chip. */}
      {preview && (
        <div
          data-testid="rule-preview"
          className="rounded-xl border border-fw-secondary bg-fw-wash overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-fw-secondary">
            <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">
              Dry run · nothing has changed yet
            </div>
            <div className="mt-0.5 text-figma-base font-medium text-fw-heading">
              {preview.matched.length} flow{preview.matched.length === 1 ? '' : 's'} matched
              {' · '}{preview.gbps} Gbps
              {' · '}{preview.blocked} blocked
              {preview.pending > 0 && ` · ${preview.pending} pending a private path`}
            </div>
            {/* A count alone ("N shadowed by a higher-priority rule") tells a
                person something is blocking their rule but not what to go look
                at. Naming the rule (or rules — de-duplicated, since the same
                rule can shadow more than one matched flow) turns it into
                something actionable. */}
            {preview.shadowed.length > 0 && (
              <p className="text-figma-xs text-fw-bodyLight mt-1">
                Shadowed by {Array.from(new Set(preview.shadowed.map(s => s.by))).join(', ')}
              </p>
            )}
          </div>

          {preview.matched.length === 0 ? (
            <p className="px-4 py-3 text-figma-sm text-fw-body">
              No flow in the estate matches this rule. Enforcing it would change nothing — widen the
              source or the destination before adding it.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-fw-secondary">
                {preview.matched.slice(0, NAMED_FLOW_LIMIT).map(m => (
                  <li key={m.flow.id} className="flex items-center gap-2 px-4 py-2 text-figma-sm">
                    <span className="font-medium text-fw-heading truncate">
                      {m.flow.srcName || m.flow.srcVpc || m.flow.srcBranch}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fw-bodyLight" aria-hidden="true" />
                    <span className="text-fw-body truncate">{flowDstLabel(m.flow)}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-figma-xs text-fw-bodyLight">
                      {m.flow.gbps} Gbps
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center h-5 px-2 rounded-full text-figma-xs font-medium ${
                        m.bad ? 'bg-fw-neutral text-fw-bodyLight' : 'bg-fw-successLight text-fw-success'
                      }`}
                    >
                      {m.v}
                    </span>
                  </li>
                ))}
              </ul>
              {preview.matched.length > NAMED_FLOW_LIMIT && (
                <div className="px-4 py-2 text-figma-xs text-fw-bodyLight border-t border-fw-secondary">
                  + {preview.matched.length - NAMED_FLOW_LIMIT} more flow
                  {preview.matched.length - NAMED_FLOW_LIMIT === 1 ? '' : 's'}
                </div>
              )}
            </>
          )}
        </div>
      )}
      </form>
    </div>
  );
}

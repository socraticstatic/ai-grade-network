import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CC } from '../../engine';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { ROLLUP_THRESHOLD } from '../discover/discoveryModel';
import {
  ID_RENAME_WARNING,
  groupIdFromName,
  definitionSentences,
  emptyResolutionHints,
  KIND_LABEL,
  KIND_SCOPE,
  type GroupKind,
} from './groupLanguage';
import {
  allBranches,
  allVpcs,
  cloudTagKeys,
  cloudTagValues,
  estateName,
  governanceTagValues,
} from './estate';

/* id of the "this rule can never resolve" warning — shared between the <p>
   that renders it and the aria-describedby on the two controls it concerns
   (the kind select and the rule's source select), so assistive tech gets
   the same signal a sighted person gets from reading the page. Same idiom
   as RuleBuilder's relative-destination warning; deliberately not a second
   invention. */
const IMPOSSIBLE_WARNING_ID = 'gb-impossible-warning';

/* id of the "that id is already taken" warning. addGroup returns null on a
   duplicate id rather than throwing, so without this the failure would be
   a button that silently does nothing. */
const ID_TAKEN_WARNING_ID = 'gb-id-taken-warning';

/* id of the "create failed" warning. The idTaken check above is a reactive
   guard, not a lock — it reads `existing` as of the last render, and
   addGroup itself is the only thing that checks at the instant of the
   write. If another actor creates the same id between this render and the
   click, addGroup returns null instead of throwing, and reset()+close()
   running unconditionally after it would make the group the person just
   described vanish with no explanation. Not reachable through this form
   today (the reactive guard already disables Create for a known-taken id),
   but a null return must still fail loud, not silent, if that guard is ever
   wrong or the check window is ever missed. */
const CREATE_FAILED_WARNING_ID = 'gb-create-failed-warning';

/* How many resolved objects the preview NAMES before summarising the rest.
   Enough to recognise one and confirm the group means what you think; not
   so many the form becomes a table. */
const NAMED_LIMIT = 8;

const KINDS: GroupKind[] = ['workload', 'site', 'mixed'];

interface DraftPredicate {
  source: 'cloudTag' | 'governanceTag';
  key: string;
  /** Free text, comma-separated. Not a closed <select>: a value the estate
   *  does not carry yet is a legitimate thing to express, and a typo must
   *  land in the designed empty-resolution state rather than be unreachable. */
  values: string;
}

function splitValues(raw: string): string[] {
  return raw
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

interface GroupBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupBuilder({ open, onOpenChange }: GroupBuilderProps) {
  const actions = useCloudControlActions();
  // Subscribing hook, not useCloudControlActions: a group created elsewhere
  // while this form is open has to appear in the id-collision check.
  const existing = useCloudControl(cc => cc.groupList()) as { id: string; label: string }[];

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  /* No default kind. kind decides which estate the rules are evaluated
     against, and defaulting it to the permissive 'mixed' is exactly how a
     Region:west rule once swept three branch offices into a group called
     "workloads". The choice is made, visibly, or the group is not created. */
  const [kind, setKind] = useState<'' | GroupKind>('');
  const [members, setMembers] = useState<string[]>([]);
  const [predicates, setPredicates] = useState<DraftPredicate[]>([]);
  const [createFailed, setCreateFailed] = useState(false);

  if (!open) return null;

  const branches = allBranches();
  const vpcs = allVpcs();

  // What kind admits as a literal member. An unchosen kind shows the whole
  // estate; choosing one prunes anything the group could no longer hold.
  const pickable =
    kind === 'workload'
      ? vpcs.map(v => ({ id: v.id, name: v.name, what: 'Cloud workload' }))
      : kind === 'site'
        ? branches.map(b => ({ id: b.id, name: b.name, what: 'Branch site' }))
        : [
            ...branches.map(b => ({ id: b.id, name: b.name, what: 'Branch site' })),
            ...vpcs.map(v => ({ id: v.id, name: v.name, what: 'Cloud workload' })),
          ];

  // Global Constraint: no component renders a per-entity row for a
  // collection larger than ROLLUP_THRESHOLD. Under meridian, `pickable` is
  // every branch + VPC in the estate (4,213 for 'mixed') - a checkbox per
  // row would be 4,213 DOM nodes. Cap the rendered list and name what's
  // hidden rather than build search/virtualization here; picking a member
  // outside the shown set still works via the tag-rule predicates below.
  const pickableShown = pickable.slice(0, ROLLUP_THRESHOLD);
  const pickableOverflow = pickable.length - ROLLUP_THRESHOLD;

  const changeKind = (next: '' | GroupKind) => {
    setKind(next);
    // Prune rather than silently drop at resolution time: resolveGroup
    // enforces kind against members too, so a member the new kind cannot
    // hold would vanish from the resolution with nothing on screen saying
    // why. Remove it here, where the person can see it go.
    const allowed = new Set(
      next === 'workload'
        ? vpcs.map(v => v.id)
        : next === 'site'
          ? branches.map(b => b.id)
          : [...vpcs.map(v => v.id), ...branches.map(b => b.id)],
    );
    setMembers(prev => prev.filter(m => allowed.has(m)));
  };

  const toggleMember = (id: string) =>
    setMembers(prev => (prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]));

  const addPredicate = () =>
    setPredicates(prev => [...prev, { source: 'cloudTag', key: cloudTagKeys()[0] || '', values: '' }]);

  const patchPredicate = (i: number, patch: Partial<DraftPredicate>) =>
    setPredicates(prev => prev.map((p, n) => (n === i ? { ...p, ...patch } : p)));

  const removePredicate = (i: number) => setPredicates(prev => prev.filter((_, n) => n !== i));

  // A rule with no value yet is half-typed, not a definition. It is excluded
  // from the spec so the preview never claims a resolution the rule has not
  // actually asked for.
  const completePredicates = predicates
    .filter(p => splitValues(p.values).length > 0 && (p.source === 'governanceTag' || !!p.key))
    .map(p =>
      p.source === 'governanceTag'
        ? { source: 'governanceTag' as const, values: splitValues(p.values) }
        : { source: 'cloudTag' as const, key: p.key, values: splitValues(p.values) },
    );

  const id = groupIdFromName(name);
  const idTaken = !!id && existing.some(g => g.id === id);

  /* Branches carry cloudTags but no `tags` array — the governance taxonomy
     is a cloud-workload concept by design. So a governanceTag rule on a
     branch-site group is not "empty today", it is unsatisfiable forever.
     Say it at the point of choice rather than letting a person build a
     group that can never resolve and meet it later as a silent zero. */
  const impossible =
    kind === 'site' && completePredicates.some(p => p.source === 'governanceTag');

  const hasDefinition = members.length > 0 || completePredicates.length > 0;
  const canCreate = !!id && !idTaken && kind !== '' && hasDefinition && !impossible;

  // Resolved from the SAME engine function the saved group will use, so the
  // preview and the committed membership cannot disagree. Computed in the
  // render body rather than through useCloudControl, whose memo is keyed on
  // the engine version and would not re-run as the draft is edited.
  const draft = { kind: kind || 'mixed', members, predicates: completePredicates };
  const resolved = CC.resolveGroupSpec(draft) as {
    vpcIds: string[];
    branchIds: string[];
    count: number;
  };
  const resolvedIds = [...resolved.branchIds, ...resolved.vpcIds];

  // What to say when the resolution above comes back empty. Named live
  // values, not just "check for a typo": matching is case-sensitive while
  // the tag-value <datalist> below filters case-insensitively, so someone
  // who types "Region is West" sees "west" offered back in the suggestions
  // and reads that as confirmation they typed the right thing.
  const tagValueHints = emptyResolutionHints(completePredicates, cloudTagKeys(), cloudTagValues);

  const reset = () => {
    setName('');
    setDesc('');
    setKind('');
    setMembers([]);
    setPredicates([]);
    setCreateFailed(false);
  };

  const cancel = () => {
    reset();
    onOpenChange(false);
  };

  const create = () => {
    // Defense in depth: the button is disabled in this state, but a disabled
    // control is an affordance, not a contract.
    if (!canCreate) return;
    const created = actions.addGroup({
      id,
      label: name.trim(),
      kind,
      members,
      predicates: completePredicates,
      desc,
    });
    // addGroup returns null on a duplicate id. idTaken above should already
    // have caught that and disabled this button — but if the id was claimed
    // by someone else in the gap between that check and this click, closing
    // and resetting anyway would make the group the person just described
    // vanish with no explanation. Stay open, keep the draft, say why.
    if (!created) {
      setCreateFailed(true);
      return;
    }
    reset();
    onOpenChange(false);
  };

  const selectClass =
    'w-full h-9 px-2 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm';
  const inputClass =
    'w-full h-9 px-3 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm';

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="gb-name">
            Group name
          </label>
          <input
            id="gb-name"
            value={name}
            onChange={e => setName(e.target.value)}
            aria-describedby={idTaken ? ID_TAKEN_WARNING_ID : 'gb-id-note'}
            className={inputClass}
          />
          {/* The id — not the label — is what every policy stores. Showing it
              only after saving would be showing it too late: renaming the
              group later does NOT rewrite the policies already pointing at
              the old id. */}
          <p id="gb-id-note" className="mt-1 text-figma-xs text-fw-bodyLight">
            Policies will store this group as{' '}
            <code
              data-testid="group-id-preview"
              className="px-1.5 py-0.5 rounded bg-fw-neutral font-mono text-fw-heading"
            >
              {id || '—'}
            </code>
          </p>
          <p data-testid="group-id-warning" className="mt-1 text-figma-xs text-fw-bodyLight">
            {ID_RENAME_WARNING}
          </p>
        </div>

        <div>
          <label className="block text-figma-xs text-fw-bodyLight" htmlFor="gb-kind">
            This group contains
          </label>
          <select
            id="gb-kind"
            value={kind}
            onChange={e => changeKind(e.target.value as '' | GroupKind)}
            aria-describedby={impossible ? IMPOSSIBLE_WARNING_ID : 'gb-kind-scope'}
            className={selectClass}
          >
            <option value="">Choose what this group contains…</option>
            {KINDS.map(k => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <p
            id="gb-kind-scope"
            data-testid="group-kind-scope"
            className="mt-1 text-figma-xs text-fw-bodyLight"
          >
            {kind ? KIND_SCOPE[kind] : 'Decides which estate the tag rules below are evaluated against.'}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-figma-xs text-fw-bodyLight" htmlFor="gb-desc">
          Description (optional)
        </label>
        <input id="gb-desc" value={desc} onChange={e => setDesc(e.target.value)} className={inputClass} />
      </div>

      {/* --- literal members --- */}
      <fieldset>
        <legend className="text-figma-xs text-fw-bodyLight">
          Members ({members.length} picked)
        </legend>
        <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-fw-secondary bg-fw-wash p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {pickableShown.map(o => (
            <label
              key={o.id}
              data-testid="member-row"
              className="flex items-center gap-2 px-1 py-0.5 text-figma-xs text-fw-body"
            >
              <input
                type="checkbox"
                checked={members.includes(o.id)}
                onChange={() => toggleMember(o.id)}
                className="rounded border-fw-secondary"
              />
              <span className="truncate text-fw-heading">{o.name}</span>
              <span className="ml-auto shrink-0 text-fw-bodyLight">{o.what}</span>
            </label>
          ))}
          {pickableOverflow > 0 && (
            <div
              data-testid="member-row-more"
              className="col-span-full flex items-center px-1 py-0.5 text-figma-xs text-fw-bodyLight"
            >
              + {pickableOverflow.toLocaleString()} more — narrow by class or region
            </div>
          )}
        </div>
      </fieldset>

      {/* --- predicates --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-figma-xs text-fw-bodyLight">
            Tag rules ({completePredicates.length} active)
          </span>
          <button
            type="button"
            onClick={addPredicate}
            className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-figma-xs font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add a tag rule
          </button>
        </div>

        {predicates.map((p, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-figma-xs text-fw-bodyLight" htmlFor={`gb-p${i}-source`}>
                Tag source
              </label>
              <select
                id={`gb-p${i}-source`}
                value={p.source}
                onChange={e =>
                  patchPredicate(i, { source: e.target.value as DraftPredicate['source'] })
                }
                aria-describedby={impossible ? IMPOSSIBLE_WARNING_ID : undefined}
                className={selectClass}
              >
                <option value="cloudTag">Cloud tag (key and value)</option>
                <option value="governanceTag">Governance tag</option>
              </select>
            </div>

            <div>
              <label className="block text-figma-xs text-fw-bodyLight" htmlFor={`gb-p${i}-key`}>
                Tag key
              </label>
              <select
                id={`gb-p${i}-key`}
                value={p.source === 'governanceTag' ? '' : p.key}
                disabled={p.source === 'governanceTag'}
                onChange={e => patchPredicate(i, { key: e.target.value })}
                className={`${selectClass} disabled:opacity-40`}
              >
                {p.source === 'governanceTag' ? (
                  <option value="">not used</option>
                ) : (
                  cloudTagKeys().map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-figma-xs text-fw-bodyLight" htmlFor={`gb-p${i}-value`}>
                Tag value
              </label>
              <input
                id={`gb-p${i}-value`}
                value={p.values}
                list={`gb-p${i}-values`}
                onChange={e => patchPredicate(i, { values: e.target.value })}
                className={inputClass}
              />
              <datalist id={`gb-p${i}-values`}>
                {(p.source === 'governanceTag' ? governanceTagValues() : cloudTagValues(p.key)).map(
                  v => (
                    <option key={v} value={v} />
                  ),
                )}
              </datalist>
            </div>

            <button
              type="button"
              onClick={() => removePredicate(i)}
              aria-label={`Remove tag rule ${i + 1}`}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-fw-secondary text-fw-bodyLight hover:bg-fw-wash transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {idTaken && (
        <p id={ID_TAKEN_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
          “{id}” is already taken by “{existing.find(g => g.id === id)?.label}”. Policies reference
          this id, so it has to be unique — pick a different name.
        </p>
      )}

      {createFailed && (
        <p id={CREATE_FAILED_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
          Could not create “{id}” — that id was already taken the instant this was submitted. Nothing
          was lost; pick a different name and try again.
        </p>
      )}

      {impossible && (
        <p id={IMPOSSIBLE_WARNING_ID} role="alert" className="text-figma-xs text-fw-body">
          A branch site carries no governance tag — the taxonomy is a cloud-workload concept, so this
          group would resolve to nothing, and would never resolve to anything. Switch it to cloud
          workloads, or use a cloud tag rule instead.
        </p>
      )}

      {/* --- live resolution --- */}
      <div
        data-testid="group-preview"
        className="rounded-xl border border-fw-secondary bg-fw-wash overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-fw-secondary">
          <div className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">
            Resolves to · nothing has been created yet
          </div>
          <div className="mt-0.5 text-figma-base font-medium text-fw-heading">
            {resolved.count} object{resolved.count === 1 ? '' : 's'} right now
          </div>
          <div className="mt-0.5 text-figma-xs text-fw-body">
            {definitionSentences({ kind: kind || 'mixed', members, predicates: completePredicates }).join(' · ')}
          </div>
        </div>

        {/* An empty resolution is a designed state, not a bare zero — and it
            is NOT a policy violation, so it stays in slate. Red is reserved
            for real violations. This is the state a typo produces, so it
            says what to check rather than just reporting the number. */}
        {resolvedIds.length === 0 ? (
          <p className="px-4 py-3 text-figma-sm text-fw-body">
            {!hasDefinition
              ? 'Pick a member or add a tag rule, and what this group resolves to appears here.'
              : impossible
                ? 'This definition matches nothing, and never will — see the warning above. A typo is not the problem here; the rule is asking branch sites for a tag they do not carry.'
                : tagValueHints.length > 0
                ? `This definition matches nothing in the estate. ${tagValueHints.join('; ')} — matching is case-sensitive, so check the value against exactly what's there.`
                : 'This definition matches nothing in the estate. Check the tag key and value for a typo — a group that resolves to nothing will make every policy naming it match nothing too.'}
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-1.5 px-4 py-3">
              {resolvedIds.slice(0, NAMED_LIMIT).map(oid => (
                <li
                  key={oid}
                  className="inline-flex items-center h-6 px-2.5 rounded-full bg-fw-base border border-fw-secondary text-figma-xs text-fw-heading"
                >
                  {estateName(oid)}
                </li>
              ))}
            </ul>
            {resolvedIds.length > NAMED_LIMIT && (
              <div className="px-4 pb-3 text-figma-xs text-fw-bodyLight">
                + {resolvedIds.length - NAMED_LIMIT} more
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={create}
          disabled={!canCreate}
          aria-disabled={!canCreate}
          title={
            impossible
              ? 'This group can never resolve to anything'
              : kind === ''
                ? 'Choose what this group contains'
                : !hasDefinition
                  ? 'Pick a member or add a tag rule'
                  : undefined
          }
          className="h-9 px-4 rounded-full text-figma-sm font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-fw-active"
        >
          Create group
        </button>
        <button
          type="button"
          onClick={cancel}
          className="h-9 px-4 rounded-full text-figma-sm font-medium border border-fw-secondary text-fw-body hover:bg-fw-wash transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

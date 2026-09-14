import { useState } from 'react';
import { Boxes } from 'lucide-react';
import { useCloudControl } from '../../engine/react/useCloudControl';
import { GroupBuilder } from './GroupBuilder';
import { definitionSentences, KIND_LABEL, type GroupKind } from './groupLanguage';
import { estateName } from './estate';

/* How many resolved objects a row NAMES before summarising the rest. A
   count is the least interesting form of the answer — someone has to be
   able to recognise a specific VPC or branch and confirm the group means
   what they think it means. */
const NAMED_LIMIT = 4;

interface Group {
  id: string;
  label: string;
  kind: string;
  members: string[];
  predicates: { source: 'cloudTag' | 'governanceTag'; key?: string; values: string[] }[];
  desc?: string;
  custom?: boolean;
}

interface Resolution {
  vpcIds: string[];
  branchIds: string[];
  count: number;
}

function kindLabel(kind: string): string {
  return KIND_LABEL[(kind as GroupKind) in KIND_LABEL ? (kind as GroupKind) : 'mixed'];
}

export function GroupsPanel() {
  const [builderOpen, setBuilderOpen] = useState(false);

  /* One subscribing selector for both the groups and their resolutions, so
     every figure on this screen is a CC derivation taken at the same
     moment — and so creating a group re-renders the list without a reload.
     useCloudControl, not useCloudControlActions: the latter hands back the
     engine without wiring a re-render, and this list must react. */
  const groups = useCloudControl(cc =>
    (cc.groupList() as Group[]).map(g => ({ group: g, resolved: cc.resolveGroup(g.id) as Resolution })),
  );

  return (
    <div className="space-y-4" data-tour="govern-groups">
      <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
          <Boxes className="h-5 w-5 text-fw-body" aria-hidden="true" />
          <span className="font-medium text-fw-heading">Groups</span>
          <span className="text-figma-xs text-fw-bodyLight">
            {groups.length} group{groups.length === 1 ? '' : 's'}
          </span>
          <span className="text-fw-bodyLight">·</span>
          <span className="text-figma-xs text-fw-bodyLight">
            {/* Deduplicated across groups, not summed — an object that
                belongs to two groups is one estate object, and summing
                resolved.count per group would count it twice under a label
                that reads as a distinct-estate figure. */}
            {new Set(groups.flatMap(({ resolved }) => [...resolved.branchIds, ...resolved.vpcIds])).size}{' '}
            objects resolved
          </span>
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="ml-auto inline-flex items-center h-8 px-3.5 rounded-full text-figma-xs font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
          >
            New group
          </button>
        </div>

        {groups.length === 0 ? (
          /* Zero groups is a designed state, not a blank table. A group is
             the thing a policy names, so the empty state says what a group
             is FOR rather than reporting that there are none. */
          <div className="px-5 py-10 text-center">
            <Boxes className="mx-auto h-8 w-8 text-fw-disabled" aria-hidden="true" />
            <p className="mt-3 text-figma-base font-medium text-fw-heading">No groups yet</p>
            <p className="mx-auto mt-1 max-w-md text-figma-sm text-fw-body">
              A group is a named set of workloads and branch sites that policies can point at — “allow
              west-branches to talk to west-workloads”. Define one by picking members, by tag rules
              that re-evaluate as the estate changes, or both.
            </p>
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="mt-4 inline-flex items-center h-9 px-4 rounded-full text-figma-sm font-medium bg-fw-active text-white hover:bg-fw-linkHover transition-colors"
            >
              New group
            </button>
          </div>
        ) : (
          <table className="w-full text-figma-sm" aria-label="Groups">
            <thead>
              <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
                <th className="px-5 py-2 font-medium">Group</th>
                <th className="px-5 py-2 font-medium">Resolves to right now</th>
                <th className="px-5 py-2 font-medium">Defined by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fw-secondary">
              {groups.map(({ group, resolved }) => {
                const named = [...resolved.branchIds, ...resolved.vpcIds];
                return (
                  <tr key={group.id} className="align-top">
                    <td className="px-5 py-3">
                      <div className="font-medium text-fw-heading">{group.label}</div>
                      {/* The id, shown plainly: it is what every policy
                          stores, and it is not the label. */}
                      <div className="mt-0.5 font-mono text-figma-xs text-fw-bodyLight">{group.id}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center h-5 px-2 rounded-full bg-fw-neutral text-figma-xs font-medium text-fw-bodyLight">
                          {kindLabel(group.kind)}
                        </span>
                        {group.custom && (
                          <span className="inline-flex items-center h-5 px-2 rounded-full bg-fw-ctaGhost text-figma-xs font-medium text-fw-link">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      {resolved.count === 0 ? (
                        /* The state a typo produces. Designed, slate, and
                           explicitly NOT red — an empty resolution is not a
                           policy violation, and dressing it as one would
                           spend the one colour reserved for real ones. */
                        <div className="rounded-lg border border-fw-secondary bg-fw-wash px-3 py-2">
                          <div className="font-medium text-fw-bodyLight text-figma-sm">
                            Nothing right now
                          </div>
                          <p className="mt-0.5 text-figma-xs text-fw-bodyLight">
                            No workload or site in the estate matches this definition, so every policy
                            naming this group matches nothing either.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-fw-heading">
                            {resolved.count} object{resolved.count === 1 ? '' : 's'}
                          </div>
                          {/* Named, not just counted. */}
                          <ul className="mt-1.5 flex flex-wrap gap-1.5">
                            {named.slice(0, NAMED_LIMIT).map(id => (
                              <li
                                key={id}
                                className="inline-flex items-center h-6 px-2.5 rounded-full bg-fw-wash border border-fw-secondary text-figma-xs text-fw-heading"
                              >
                                {estateName(id)}
                              </li>
                            ))}
                            {named.length > NAMED_LIMIT && (
                              <li className="inline-flex items-center h-6 px-2 text-figma-xs text-fw-bodyLight">
                                + {named.length - NAMED_LIMIT} more
                              </li>
                            )}
                          </ul>
                        </>
                      )}
                    </td>

                    <td className="px-5 py-3 text-fw-body">
                      {/* Language, not a data structure. */}
                      <ul className="space-y-0.5">
                        {definitionSentences(group).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      {group.desc && (
                        <p className="mt-1 text-figma-xs text-fw-bodyLight">{group.desc}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <GroupBuilder open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}

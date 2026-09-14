/* The language layer for groups.
 *
 * A group's definition is the thing a person checks their intent against,
 * and the engine's shape — {source:'cloudTag',key:'Region',values:['west']} —
 * is not checkable by reading. Everything here turns a definition into a
 * clause of English. Kept pure and separate from the components so the
 * sentences are unit-testable without a DOM. */

export type GroupKind = 'workload' | 'site' | 'mixed';

export interface GroupPredicate {
  source: 'cloudTag' | 'governanceTag';
  key?: string;
  values: string[];
}

export interface GroupDefinition {
  kind?: GroupKind | string;
  members?: string[];
  predicates?: GroupPredicate[];
}

/** What each kind is called on screen. Never the engine's own token — a
 *  person choosing between "workload", "site" and "mixed" is being asked to
 *  read source code. */
export const KIND_LABEL: Record<GroupKind, string> = {
  workload: 'Cloud workloads',
  site: 'Branch sites',
  mixed: 'Both',
};

/** What each kind actually DOES, which is the part that bites: kind decides
 *  which estate the predicates are evaluated against. A Region:west
 *  predicate on a "Both" group is what once swept three offices into a group
 *  called "workloads". */
export const KIND_SCOPE: Record<GroupKind, string> = {
  workload: 'Matches cloud VPCs only. Branch sites are never included.',
  site: 'Matches customer branch sites only. Cloud VPCs are never included.',
  mixed: 'Matches both cloud VPCs and branch sites — a tag rule here sweeps up everything carrying that tag.',
};

/** Singular/plural nouns for the things a kind resolves to. */
const KIND_NOUN: Record<GroupKind, [string, string]> = {
  workload: ['cloud workload', 'cloud workloads'],
  site: ['branch site', 'branch sites'],
  mixed: ['estate object', 'estate objects'],
};

function kindOf(kind?: string): GroupKind {
  return kind === 'workload' || kind === 'site' ? kind : 'mixed';
}

export function kindNoun(kind: string | undefined, count: number): string {
  const [one, many] = KIND_NOUN[kindOf(kind)];
  return count === 1 ? one : many;
}

/* The id — not the label — is what every policy stores. It is derived from
 * the name here, and the form shows the result BEFORE the group is
 * committed, because renaming the group afterwards does not rewrite the
 * policies that already reference the old id. */
/* Said wherever an id is minted — Govern's builder and Discover's selection
 * bar alike. One sentence, one place: two surfaces that create groups must
 * not warn about the same consequence in two different wordings, or the
 * weaker wording reads as the lesser risk. */
export const ID_RENAME_WARNING =
  'Renaming the group later will not update policies that already reference this id.';

export function groupIdFromName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "west or east" — an or-list, because predicate values are a union. */
function orList(values: string[]): string {
  const v = (values || []).filter(Boolean);
  if (v.length === 0) return 'anything';
  if (v.length === 1) return v[0];
  return `${v.slice(0, -1).join(', ')} or ${v[v.length - 1]}`;
}

/** One predicate, as one clause. The two sources are genuinely different
 *  vocabularies and must not be phrased alike: a cloud tag is a key/value
 *  pair on the hyperscaler object, a governance tag is a flat label in the
 *  AT&T taxonomy. Saying both as "where X is Y" would hide that. */
export function predicateSentence(p: GroupPredicate): string {
  if (p.source === 'governanceTag') return `anything tagged ${orList(p.values)}`;
  return `anything where ${p.key || 'a tag'} is ${orList(p.values)}`;
}

/** Literal members: how many, and of what kind. */
export function memberSentence(count: number, kind?: string): string {
  return `${count} ${kindNoun(kind, count)} picked by hand`;
}

/** For a rule that resolved to nothing, what the estate actually carries for
 *  each cloudTag predicate whose KEY the estate knows — never "check for a
 *  typo" alone, which accuses without giving anything to check against.
 *
 *  Two deliberate exclusions:
 *  - governanceTag predicates: there is no live cloud-tag value list for
 *    the AT&T taxonomy, and offering one would imply cloud-tag vocabulary
 *    for a governance-tag rule, which groupLanguage keeps distinct on
 *    purpose (see predicateSentence).
 *  - a key the estate does not carry at all: naming values for a key
 *    nothing has would be nonsense, not a hint. */
export function emptyResolutionHints(
  predicates: GroupPredicate[],
  knownCloudTagKeys: string[],
  cloudTagValuesFor: (key: string) => string[],
): string[] {
  return predicates
    .filter(
      (p): p is GroupPredicate & { key: string } =>
        p.source === 'cloudTag' && !!p.key && knownCloudTagKeys.includes(p.key),
    )
    .map(p => `${p.key} carries: ${cloudTagValuesFor(p.key).join(', ')}`);
}

/** The whole definition, as a list of clauses — members first (they are the
 *  concrete part), then each predicate. A group defined by nothing says so
 *  in words rather than rendering as a blank cell. */
export function definitionSentences(g: GroupDefinition): string[] {
  const members = g.members || [];
  const predicates = g.predicates || [];
  const out: string[] = [];
  if (members.length) out.push(memberSentence(members.length, g.kind));
  predicates.forEach(p => out.push(predicateSentence(p)));
  if (!out.length) return ['nothing yet — no members and no rules'];
  return out;
}

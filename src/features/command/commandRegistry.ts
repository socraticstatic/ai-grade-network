import type { CloudControl } from '../../engine';
import { NAV_DISCOVER, NAV_TASKS, NAV_LAYERS } from '../../components/navigation/navItems';
import { attachOpportunities, steerOpportunities } from '../discover/stackFigures';
import { fmtTokens } from '../ai-fabric/aiSpend';

export type CommandKind =
  | 'nav'
  | 'attach'
  | 'enforce'
  | 'undo'
  | 'attach-region'
  | 'steer'
  | 'cap'
  | 'declare';

export interface Command {
  id: string;
  label: string;
  kind: CommandKind;
  run: () => void;
}

interface Section {
  path: string;
  label: string;
}

/**
 * Every routed section of the curated nav, derived from NAV_LAYERS so the
 * palette cannot drift from the nav.
 *
 * NaaS and the AI Fabric carry the SAME four verb labels, so a bare "Go to
 * Connect" would appear twice with two different destinations and no way to
 * tell them apart in a flat list. Each verb command is therefore qualified by
 * its domain; Discover, which belongs to neither, is not.
 */
const SECTIONS: Section[] = [
  { path: NAV_DISCOVER.to, label: NAV_DISCOVER.label },
  { path: NAV_TASKS.to, label: NAV_TASKS.label },
  ...NAV_LAYERS.flatMap(domain =>
    domain.items.map(item => ({
      path: item.to,
      label: `${domain.label} · ${item.label}`,
    })),
  ),
];

interface Onramp {
  id: string;
  name: string;
  active?: boolean;
}

interface Rule {
  id: string;
  name: string;
}

/**
 * Builds the ⌘K command list from live engine state: nav to every curated
 * section, "Attach ..." for every inactive on-ramp, "Enforce ..." for every
 * unenforced rule, and "Undo" when the engine has something to undo. Called
 * fresh each time the palette opens/filters so it always reflects current
 * CC state (no stale commands after a mutation).
 */
export function commandRegistry(
  cc: CloudControl,
  navigate: (path: string) => void
): Command[] {
  const commands: Command[] = [];

  for (const section of SECTIONS) {
    commands.push({
      id: `nav:${section.path}`,
      label: `Go to ${section.label}`,
      kind: 'nav',
      run: () => navigate(section.path),
    });
  }

  const onramps: Onramp[] = cc.onramps ?? [];
  for (const onramp of onramps) {
    if (onramp.active) continue;
    commands.push({
      id: `attach:${onramp.id}`,
      label: `Attach ${onramp.name}`,
      kind: 'attach',
      run: () => cc.activateOnramp(onramp.id),
    });
  }

  const rules: Rule[] = typeof cc.ruleList === 'function' ? cc.ruleList() : [];
  for (const rule of rules) {
    if (cc.ruleEnforced(rule)) continue;
    commands.push({
      id: `enforce:${rule.id}`,
      label: `Enforce ${rule.name}`,
      kind: 'enforce',
      run: () => cc.enforceAny(rule.id),
    });
  }

  const undoLabel = cc.canUndo();
  if (undoLabel) {
    commands.push({
      id: 'undo',
      label: `Undo ${undoLabel}`,
      kind: 'undo',
      run: () => cc.undo(),
    });
  }

  // Priced intents. Every figure below comes from stackFigures — the same
  // arithmetic the cross-section and /naas/cost state — never restated here.
  for (const opp of attachOpportunities(cc)) {
    const price =
      opp.bucketSavingMo !== null
        ? ` · $${opp.bucketSavingMo.toLocaleString()}/mo`
        : '';
    commands.push({
      id: `attach-region:${opp.regionId}`,
      label: `Attach ${opp.label} · ${opp.publicMs}→${opp.privateMs} ms on the fabric${price}`,
      kind: 'attach-region',
      run: () => cc.provisionRegion(opp.regionId),
    });
  }

  for (const opp of steerOpportunities(cc)) {
    const price =
      opp.egressSavingMo !== null
        ? ` · $${opp.egressSavingMo.toLocaleString()}/mo`
        : '';
    commands.push({
      id: `steer:${opp.flowId}`,
      label: `Steer ${opp.label} onto the fabric${price}`,
      kind: 'steer',
      run: () => cc.steerFlow(opp.flowId, opp.pathId),
    });
  }

  return commands;
}

/** `cap <tag> [at] <n>[k|m] [tokens][/day]` — nothing else parses. */
const CAP_GRAMMAR =
  /^cap\s+(\S+)\s+(?:at\s+)?([\d.]+)\s*([km])?\s*(?:tokens?)?\s*(?:\/?\s*day)?$/i;

/* Declare grammars for standing intents. Same law as CAP: every capture
   must resolve against an engine-known name via intentCatalog().scopes(),
   or nothing parses - free text never reaches a mutation. Declarations
   land in WATCH mode; enforcement is a separate, visible decision. */
const KEEP_PRIVATE_GRAMMAR = /^keep\s+(.+?)\s+private$/i;
const DIVERSIFY_GRAMMAR = /^diversify\s+(.+)$/i;
const MIN_LATENCY_GRAMMAR = /^minimi[sz]e\s+latency\s+(?:for\s+)?(.+)$/i;

/** The one scope whose label (or id) uniquely matches `name`, or null.
 *  Ambiguity is a non-match: a grammar must never guess between two scopes. */
function uniqueScope(
  cc: CloudControl,
  key: string,
  name: string,
): { kind: string; id: string | null; label: string } | null {
  const entry = cc.intentCatalog?.().find(c => c.key === key);
  if (!entry) return null;
  const n = name.trim().toLowerCase();
  const scopes = entry.scopes();
  const exact = scopes.filter(s => s.label.toLowerCase() === n || (s.id ?? '').toLowerCase() === n);
  if (exact.length === 1) return exact[0];
  const partial = scopes.filter(s => s.label.toLowerCase().includes(n));
  return partial.length === 1 ? partial[0] : null;
}

function declareCommand(cc: CloudControl, key: string, scope: { kind: string; id: string | null; label: string }): Command {
  return {
    id: `declare:${key}:${scope.id ?? 'estate'}`,
    label: `Declare intent · ${key.replace(/-/g, ' ')} · ${scope.label} (watch mode)`,
    kind: 'declare',
    run: () => cc.declareIntent(key, scope as never, 'watch'),
  };
}

/**
 * Typed intent parser for the palette. A query that names an engine-known
 * policy tag and a positive budget yields exactly one runnable command;
 * anything else yields none, so free text cannot mutate the engine.
 */
export function parseIntent(query: string, cc: CloudControl): Command[] {
  const q = query.trim();

  const keep = q.match(KEEP_PRIVATE_GRAMMAR);
  if (keep) {
    const name = keep[1];
    // "keep ai private" / "keep inference private" is the token layer's
    // estate intent; a sensitivity tag binds data-sensitivity instead.
    if (/^(ai|inference|ai inference)$/i.test(name)) {
      const scope = uniqueScope(cc, 'private-inference', 'the token layer');
      return scope ? [declareCommand(cc, 'private-inference', scope)] : [];
    }
    const scope = uniqueScope(cc, 'data-sensitivity', name);
    return scope ? [declareCommand(cc, 'data-sensitivity', scope)] : [];
  }

  const div = q.match(DIVERSIFY_GRAMMAR);
  if (div) {
    const scope = uniqueScope(cc, 'path-diversity', div[1]);
    return scope ? [declareCommand(cc, 'path-diversity', scope)] : [];
  }

  const minLat = q.match(MIN_LATENCY_GRAMMAR);
  if (minLat) {
    const scope = uniqueScope(cc, 'minimize-latency', minLat[1]);
    return scope ? [declareCommand(cc, 'minimize-latency', scope)] : [];
  }

  const match = q.match(CAP_GRAMMAR);
  if (!match) return [];

  const rows: { tag: string }[] =
    typeof cc.tokenPolicyList === 'function' ? cc.tokenPolicyList() : [];
  const row = rows.find(r => r.tag.toLowerCase() === match[1].toLowerCase());
  if (!row) return [];

  const unit = match[3] ? (match[3].toLowerCase() === 'k' ? 1e3 : 1e6) : 1;
  const budget = parseFloat(match[2]) * unit;
  if (!(budget > 0)) return [];

  const tag = row.tag;
  return [
    {
      id: `cap:${tag}:${budget}`,
      label: `Cap ${tag} at ${fmtTokens(budget)} tokens/day · token policy`,
      kind: 'cap',
      run: () => cc.setTokenPolicy(tag, { budget }),
    },
  ];
}

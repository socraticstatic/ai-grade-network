import type { CloudControl } from '../../engine/types';
import { branchesOf, siteRollup, type Region, type SiteClass, type Vpc } from '../discover/discoveryModel';
import { advisorDraft, attachOpportunities, steerOpportunities } from '../discover/stackFigures';

/**
 * Pure derivations for the advisor's grounded findings, headline chip, and
 * head-start observation. Every number here reads the SAME engine getters
 * and Discover/StackPanel derivations the rest of the estate already
 * states — `siteRollup`/`branchesOf` for the site count, `advisorDraft`/
 * `attachOpportunities`/`steerOpportunities` for the staged-move figures —
 * so a claim made here can be checked against those screens. No React, no
 * DOM: this module is read by the advisor card, not the other way round.
 *
 * `title`/`evidence`/`why` are rendered VERBATIM by the card — unlike
 * stackFigures, which states raw numbers for its panel to format, this
 * module owns its own copy end to end.
 */

export type FindingKind = 'untracked-ai' | 'unattached-regions' | 'egress-bleed' | 'exposed-spof';

export interface Finding {
  kind: FindingKind;
  /** Customer language, savings/risk-first — the card's headline. */
  title: string;
  /** One sentence with engine-derived numbers — what the card states. */
  evidence: string;
  /** Popover body: the same values again, plus why they matter. */
  why: string;
  /** null for risk-framed findings (untracked-ai, exposed-spof) — a number
   *  the engine cannot price is never invented for the sake of a dollar sign. */
  savingsMo: number | null;
  /** Entities involved — vpcs, regions, or flows, per finding kind. */
  count: number;
}

/* A vpc as the engine seeds it — discoveryModel's `Vpc` has no `cloudTags`
 * (it never needed one), but the exposure predicate below reads the same
 * hyperscaler key/value map `state-groups.ts`'s GroupBuilder predicates do
 * (state.ts:88-104), so it is added here rather than widening the shared
 * type for one caller. */
type SeededVpc = Vpc & { cloudTags?: Record<string, string> };

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const plural = (n: number, word: string, pluralWord = `${word}s`) => (n === 1 ? word : pluralWord);

/** Every vpc across every region, region id attached. Reads `cc.vpcs`
 *  directly — the same record `vpcsOf` (discoveryModel.ts) indexes, just
 *  flattened rather than scoped to one region at a time. */
function allVpcs(cc: CloudControl): { regionId: string; vpc: SeededVpc }[] {
  const vpcs = (cc as unknown as { vpcs: Record<string, SeededVpc[]> }).vpcs;
  return Object.entries(vpcs).flatMap(([regionId, list]) => list.map(vpc => ({ regionId, vpc })));
}

/** Every region across every cloud, cloud id attached. */
function allRegions(cc: CloudControl): { cloudId: string; region: Region }[] {
  const regions = (cc as unknown as { regions: Record<string, Region[]> }).regions;
  return Object.entries(regions).flatMap(([cloudId, list]) => list.map(region => ({ cloudId, region })));
}

/** ai:true and no governance tag — an empty or absent `tags` array. The
 *  governance taxonomy (rd-helion, pci, internet-facing, …) is what Govern
 *  scopes a boundary around; a workload the taxonomy has never touched is
 *  exactly the gap this finding names. */
function untrackedAiVpcs(cc: CloudControl): { regionId: string; vpc: SeededVpc }[] {
  return allVpcs(cc).filter(({ vpc }) => !!vpc.ai && (!vpc.tags || vpc.tags.length === 0));
}

/** Regions the raw seed marks single-path (`spof`) — the same flag
 *  `state.ts`'s own region seeds carry (`uks` under acme, `eus2` under
 *  meridian), read off `cc.regions` rather than `fabricModel()`'s derived
 *  reliability, which states a different (attach-conditioned) fact. */
function spofRegions(cc: CloudControl): { cloudId: string; region: Region }[] {
  return allRegions(cc).filter(({ region }) => !!region.spof);
}

/** A vpc marked internet-exposed either by its governance tag
 *  (`internet-facing`) or by a hyperscaler cloudTag naming the exposure
 *  directly (`exposure: 'public'`, case-insensitive on both key and value —
 *  no seed carries the cloudTag form today, but the predicate reads for it
 *  so a future estate profile that tags exposure at the cloud layer is
 *  caught without a code change). */
function isExposedVpc(vpc: SeededVpc): boolean {
  if (vpc.tags?.includes('internet-facing')) return true;
  const cloudTags = vpc.cloudTags;
  if (!cloudTags) return false;
  return Object.entries(cloudTags).some(
    ([key, value]) => key.toLowerCase() === 'exposure' && String(value).toLowerCase() === 'public',
  );
}

function exposedVpcs(cc: CloudControl): { regionId: string; vpc: SeededVpc }[] {
  return allVpcs(cc).filter(({ vpc }) => isExposedVpc(vpc));
}

function untrackedAiFinding(cc: CloudControl): Finding | null {
  const untracked = untrackedAiVpcs(cc);
  if (untracked.length === 0) return null;
  const count = untracked.length;
  const regionCount = new Set(untracked.map(u => u.regionId)).size;
  const names = untracked.slice(0, 2).map(u => u.vpc.name).join(', ');
  return {
    kind: 'untracked-ai',
    title: `${count} AI ${plural(count, 'workload')} running with no governance tag`,
    evidence: `${count} AI ${plural(count, 'workload')} across ${regionCount} ${plural(regionCount, 'region')} — including ${names} — carry no governance tag, so nothing scopes a boundary around them or meters what they spend.`,
    why: `An untagged workload is invisible to every policy engine downstream of it — Govern can't fence a boundary it can't see, and Observe can't meter spend it doesn't know exists. Peer estates tag AI workloads at intake, before the first token flows, so a list like this one stays empty by default rather than by audit.`,
    savingsMo: null,
    count,
  };
}

function unattachedRegionsFinding(cc: CloudControl): Finding | null {
  const attach = attachOpportunities(cc);
  if (attach.length === 0) return null;
  const count = attach.length;
  const priced = attach.filter(o => o.bucketSavingMo !== null);
  const savingsMo = priced.reduce((sum, o) => sum + (o.bucketSavingMo ?? 0), 0);
  const cloudCount = new Set(attach.map(o => o.cloudName)).size;
  return {
    kind: 'unattached-regions',
    title:
      savingsMo > 0
        ? `Save ${money(savingsMo)}/mo by attaching ${count} unattached ${plural(count, 'region')}`
        : `${count} unattached ${plural(count, 'region')} still ride public transit`,
    evidence: `${count} ${plural(count, 'region')} across ${cloudCount} ${plural(cloudCount, 'cloud')} sit off the fabric today${
      priced.length > 0
        ? `; attaching the ${priced.length} that the arbitrage table prices keeps ${money(savingsMo)}/mo off hyperscaler egress`
        : ''
    }.`,
    why: `Every unattached region pays the public transit rate and the public transit latency on traffic a private on-ramp already reaches cheaper and faster. The arbitrage table prices what each attach is worth before you commit to it — nothing here stages itself; a human reviews the tray.`,
    savingsMo,
    count,
  };
}

function egressBleedFinding(cc: CloudControl): Finding | null {
  const steer = steerOpportunities(cc);
  if (steer.length === 0) return null;
  const count = steer.length;
  const priced = steer.filter(o => o.egressSavingMo !== null);
  const savingsMo = priced.reduce((sum, o) => sum + (o.egressSavingMo ?? 0), 0);
  return {
    kind: 'egress-bleed',
    title:
      savingsMo > 0
        ? `Save ${money(savingsMo)}/mo by steering ${count} ${plural(count, 'flow')} off the public internet`
        : `${count} ${plural(count, 'flow')} still cross the public internet`,
    evidence: `${count} ${plural(count, 'flow')} — ${steer[0].label} among them — bleed ${money(savingsMo)}/mo in public egress that AT&T's own path already prices lower.`,
    why: `Every Gb that crosses the public internet instead of AT&T's mid-mile pays the public per-GB rate and carries the public path's own latency for the same traffic. The routing advisor only recommends a steer where the fabric already has a cheaper, faster path built to carry it.`,
    savingsMo,
    count,
  };
}

function exposedSpofFinding(cc: CloudControl): Finding | null {
  const spof = spofRegions(cc);
  const exposed = exposedVpcs(cc);
  const count = spof.length + exposed.length;
  if (count === 0) return null;

  const titleParts: string[] = [];
  if (spof.length > 0) titleParts.push(`${spof.length} single-path ${plural(spof.length, 'region')}`);
  if (exposed.length > 0) titleParts.push(`${exposed.length} internet-facing ${plural(exposed.length, 'workload')}`);
  const verb = count === 1 ? 'carries' : 'carry';

  const evidenceParts: string[] = [];
  if (spof.length > 0) {
    evidenceParts.push(
      `${spof.map(s => s.region.name).join(', ')} ${spof.length === 1 ? 'runs' : 'run'} on a single path with no failover`,
    );
  }
  if (exposed.length > 0) {
    evidenceParts.push(
      `${exposed.length} ${plural(exposed.length, 'workload')} — ${exposed.map(e => e.vpc.name).join(', ')} — ${exposed.length === 1 ? 'sits' : 'sit'} open to the public internet`,
    );
  }

  return {
    kind: 'exposed-spof',
    title: `${titleParts.join(' and ')} ${verb} the estate's biggest blast radius`,
    evidence: `${evidenceParts.join(', and ')}.`,
    why: `A single-path region and an internet-facing workload are different failure modes that compound: lose the one path serving a region and any exposed workload behind it has nowhere private to fail over to. Peers with this footprint dual-home the region and pull the exposed workload behind inspection before either shows up in an incident review.`,
    savingsMo: null,
    count,
  };
}

/**
 * The advisor's four grounded findings, fixed order (untracked-ai,
 * unattached-regions, egress-bleed, exposed-spof), absent findings
 * omitted rather than zero-filled — a customer with no exposed workload
 * sees no exposed-spof card, not one that reads 0.
 */
export function advisorFindings(cc: CloudControl): Finding[] {
  return [untrackedAiFinding(cc), unattachedRegionsFinding(cc), egressBleedFinding(cc), exposedSpofFinding(cc)].filter(
    (f): f is Finding => f !== null,
  );
}

/**
 * The advisor chip's headline: the same $/mo StackPanel's own advisor chip
 * states (`advisorDraft(cc).deltas.egressSavingMo` — verified against
 * `StackPanel.tsx`'s `Advisor: {draft.moves.length} moves · {money(draft.deltas.egressSavingMo)}/mo`
 * line, so this headline can never disagree with that chip), plus how many
 * of the four findings above are live right now.
 */
export function advisorHeadline(cc: CloudControl): { savingsMo: number; findings: number } {
  return {
    savingsMo: advisorDraft(cc).deltas.egressSavingMo,
    findings: advisorFindings(cc).length,
  };
}

/**
 * The head-start observation — what AT&T already sees before the scan
 * theater reveals the cloud estate: every site already inventoried, how
 * many already ride an AT&T circuit, and whether at least one hyperscaler
 * is already attached (a teaser for the scan to come, not the scan itself).
 */
export function headStart(
  cc: CloudControl,
): { total: number; onNet: number; byClass: { siteClass: SiteClass; count: number }[]; cloudsVisible: boolean } {
  const rollup = siteRollup(cc);
  const clouds = (cc as unknown as { clouds: { attached?: boolean }[] }).clouds;
  return {
    total: branchesOf(cc).length,
    onNet: rollup.reduce((sum, r) => sum + r.onNet, 0),
    byClass: rollup.map(r => ({ siteClass: r.siteClass, count: r.count })),
    cloudsVisible: clouds.some(c => c.attached === true),
  };
}

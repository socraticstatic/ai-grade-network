/* Boot-time estate profile swap. Lets the same seeded engine present
 * either the small hand-authored "acme" demo estate (state.ts) or the
 * deterministic bank-scale "meridian" estate (meridianEstate.ts), chosen
 * by a URL flag that persists in localStorage.
 *
 * Engine files don't import from src/features/**, so EngineSeeds below is
 * a minimal structural view of window.CC - just the seed containers this
 * module swaps - rather than the real CloudControl type. */
import { meridianEstate } from './meridianEstate';

export type EstateProfile = 'acme' | 'meridian';

interface OnrampSeed {
  id: string;
  [key: string]: unknown;
}

export interface EngineSeeds {
  branches: unknown[];
  clouds: unknown[];
  regions: Record<string, unknown[]>;
  vpcs: Record<string, unknown[]>;
  onramps: OnrampSeed[];
}

export function resolveProfile(search: string, ls: Pick<Storage, 'getItem' | 'setItem'>): EstateProfile {
  const url = new URLSearchParams(search).get('estate');
  if (url === 'meridian' || url === 'acme') { ls.setItem('estateProfile', url); return url; }
  return ls.getItem('estateProfile') === 'meridian' ? 'meridian' : 'acme';
}

const swap = <T>(target: T[], next: T[]) => { target.length = 0; target.push(...next); };
const swapRecord = (target: Record<string, unknown[]>, next: Record<string, unknown[]>) => {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, next);
};

/* Meridian only models aws + azure (a bank-scale ENTERPRISE cloud estate; it
 * makes no claim about CoreWeave/Nebius, gcp or oci). A wholesale swap() /
 * swapRecord() DELETES every OTHER cloud's entries first, and half a dozen
 * engine consumers (state.ts:475 gpuPrivate, state-billing.ts:61-113,
 * state-actions.ts:214, state-console.ts:127 modelCatalog) unconditionally
 * index CC.regions.cw.find(...) / CC.regions.neb.find(...) with no null
 * guard — deleting the cw/neb keys crashes the instant anything touches the
 * AI domain while meridian is active (discovered rendering UnifiedDiscovery
 * under meridian: estateDomains() -> modelCatalog() -> `CC.regions.cw.find`
 * on undefined). Merging by id/key instead only touches the clouds meridian
 * actually names, leaving gcp/oci/cw/neb exactly as acme's live state left
 * them — meridian is silent about the AI clouds, not claiming they vanish. */
/* Order-preserving: an id `next` also names REPLACES in its ORIGINAL
 * position in `target` (so acme's [aws,azure,gcp,oci,cw,neb] stays exactly
 * that order under meridian, meridian's aws/azure swapped in place); an id
 * `next` names that `target` doesn't already have is APPENDED. A naive
 * "keep the untouched ones, then push every `next` entry" (the first cut of
 * this fix) instead reordered the array to [gcp,oci,cw,neb,aws,azure] on
 * every meridian swap - same membership, wrong position. */
const mergeArrayById = (target: { id: string }[], next: { id: string }[]) => {
  const nextById = new Map(next.map(n => [n.id, n]));
  const targetIds = new Set(target.map(t => t.id));
  const merged = target.map(t => nextById.get(t.id) ?? t);
  const appended = next.filter(n => !targetIds.has(n.id));
  target.length = 0;
  target.push(...merged, ...appended);
};
const mergeRecord = (target: Record<string, unknown[]>, next: Record<string, unknown[]>) => {
  Object.assign(target, next); // only overwrites/adds keys `next` names; every other key untouched
};

/* Meridian's on-ramp: branches carry onrampId:'mt-nb1' (meridianEstate.ts),
 * but that estate doesn't define the onramp record itself - state.ts's
 * onramps[] literal shape (id/name/type/sub/ic/active/site/targets) is
 * where every on-ramp record lives, so this literal matches that shape
 * and targets the two regions meridianEstate() actually seeds. */
const MERIDIAN_ONRAMP: OnrampSeed = {
  id: 'mt-nb1', name: 'NetBond · PE-DAL-01', type: 'NetBond',
  sub: 'PE-DAL-01 · Dallas · 100Gbps', ic: 'nb', active: true,
  site: { name: 'PE-DAL-01 · Dallas', lat: 32.78, lon: -96.8 },
  targets: [['aws', 'use1'], ['azure', 'scus']],
};

type Snapshot = ReturnType<typeof snapshot>;
let acmeSnapshot: Snapshot | null = null;
// Deep-clone, not a shallow spread: a shallow `[...cc.branches]` /
// `{...cc.regions}` copies the CONTAINER but keeps the same element
// objects, and engine actions mutate those elements in place
// (state.ts:181-183 activateOnramp sets o.active/cl.attached/r.attached
// on the SAME objects; state.ts:258-260 restore() does too). A shallow
// snapshot taken before a mutate -> swap-to-meridian -> swap-back-to-acme
// round trip would silently hand back the mutated objects, not the
// original acme seed values. structuredClone is safe here: every seed
// container is plain JSON-safe data (no functions, no class instances).
// This only deep-copies the SNAPSHOT's own storage - cc.branches etc.
// keep their original array/object identity via swap()/swapRecord()
// below, unaffected by how the snapshot itself is stored.
function snapshot(cc: EngineSeeds) {
  return structuredClone({
    branches: cc.branches, clouds: cc.clouds,
    regions: cc.regions, vpcs: cc.vpcs,
  });
}

export function applyEstateProfile(cc: EngineSeeds, profile: EstateProfile): void {
  acmeSnapshot ??= snapshot(cc);
  // Re-clone acmeSnapshot on EVERY acme application, not just at capture:
  // swap()/swapRecord() below hand `next`'s own arrays/objects to cc by
  // reference (push(...next), Object.assign(target, next)), so if `next`
  // were acmeSnapshot itself, cc.regions.aws etc. would BECOME the
  // snapshot's own arrays - the next in-place engine mutation (activateOnramp,
  // restore(), ...) would corrupt the stored snapshot along with live state,
  // and the snapshot would no longer be restorable. meridianEstate() needs
  // no such clone - it already returns fresh objects on every call.
  const next = profile === 'meridian' ? meridianEstate() : structuredClone(acmeSnapshot);
  swap(cc.branches, next.branches as unknown[]);

  if (profile === 'meridian') {
    // Merge — see mergeArrayById/mergeRecord above. gcp/oci/cw/neb survive
    // untouched; only aws + azure (meridian's own clouds) get replaced.
    mergeArrayById(cc.clouds as { id: string }[], next.clouds as { id: string }[]);
    mergeRecord(cc.regions, next.regions as Record<string, unknown[]>);
    mergeRecord(cc.vpcs, next.vpcs as Record<string, unknown[]>);
  } else {
    // Acme restore stays the hard guarantee: a full wholesale replace from
    // the complete snapshot, so any key a meridian merge left behind (e.g.
    // meridian's own 'scus'/'eus2' azure region ids, which acme never had)
    // is cleared rather than left as orphaned dead data.
    swap(cc.clouds, next.clouds as unknown[]);
    swapRecord(cc.regions, next.regions as Record<string, unknown[]>);
    swapRecord(cc.vpcs, next.vpcs as Record<string, unknown[]>);
  }

  // On-ramps aren't swapped wholesale: acme's seed on-ramps (nb1/dx1/er1/nb2)
  // are untouched either way. Meridian only ADDS mt-nb1 on top of them (its
  // branches reference nothing else), and swapping back to acme removes it -
  // filter-then-push keeps cc.onramps's own array identity, matching the
  // in-place-swap constraint on every other seed container here.
  const withoutMtNb1 = cc.onramps.filter(o => o.id !== 'mt-nb1');
  swap(cc.onramps, profile === 'meridian' ? [...withoutMtNb1, MERIDIAN_ONRAMP] : withoutMtNb1);
}

// Boot side effect - must run immediately after ./state creates window.CC,
// before any other state-* module loads (see src/engine/index.ts), because
// those modules freeze derivations from the seed arrays at import time
// (state-billing freezes its steer baseline at load). In the vitest/jsdom
// environment `location.search` is always '' and localStorage starts empty,
// so resolveProfile defaults to 'acme' and this call only takes the acme
// snapshot and swaps acme's own content back onto itself - a no-op beyond
// that snapshot capture. Importing this module in a test therefore never
// requires a flag to stay inert.
const cc = (window as unknown as { CC: EngineSeeds }).CC;
if (cc && typeof location !== 'undefined') {
  applyEstateProfile(cc, resolveProfile(location.search, localStorage));
}

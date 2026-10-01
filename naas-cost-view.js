/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-cost-view.js: how Cost is sliced, coloured and forecast (Micah, 2026-09-30:
// "on cost spend, what does the 51k even mean - make the forecast make sense";
// "cost by leg is good - numbers just are confusing"; "by region, by csp";
// "filters"; "color scheme is really weird - cost by region bar chart is wrong
// and colors don't make sense"; "cost by region needs love").
//
// Pure: it reads the one cost model (R.costLegs, whose every row carries the
// parts it counts) and the estate, and never prices anything itself. A slice is
// the model's own parts regrouped, so By leg, By region and By cloud add up to
// the same whole on every estate.
import { regionOf, fmt } from './naas-logic.js';
import * as S from './naas-sites.js';
import * as LC from './naas-lifecycle.js';

// ---------- One colour vocabulary for Cost ----------
// One meaning per colour on Spend, By leg, By region and the Traffic Cost view.
// Nothing here means two things, and every colour is a theme token, so the dark
// skin restates them without touching this file.
//   att     var(--viz-1)          On AT&T: AT&T charges at catalog price, and egress already at your AT&T rate
//                                 (only where the bucket's cloud has a region attached; nothing else is on AT&T).
//   public  var(--warning)        Outside AT&T: egress at the cloud provider's public rates. The savings live here.
//   list    var(--viz-2)          A public list price we apply for someone else (a cloud port, a VPN tunnel, a colo
//                                 cross-connect). Always modelled, so always hatched.
//   saved   var(--success)        Savings: banked is solid, still open is the same green as a tint.
//   other   var(--text-disabled)  Not priced here: billed by another carrier, or on no public price list. An outline, never a fill.
//   asis    var(--text-light)     The forecast if nothing changes: a dashed line.
//   act     var(--text-heading)   The forecast if you act on the open moves: a solid line.
// Hatching means modelled: a list price, a rate or a share applied to your estate, not a bill.
// A split that is only a model and says nothing about who is paid (destination classes, first
// miles) wears MODELLED, the hatched neutral the legend's Modelled swatch already shows.
export const COST_INK = {
  att: { color: 'var(--viz-1)', word: 'AT&T price' },
  public: { color: 'var(--warning)', word: 'Outside AT&T' },
  list: { color: 'var(--viz-2)', word: 'Public list price' },
  saved: { color: 'var(--success)', word: 'Saved' },
  other: { color: 'var(--text-disabled)', word: 'Not priced here' },
  asis: { color: 'var(--text-light)', word: 'As is' },
  act: { color: 'var(--text-heading)', word: 'If you act' },
};
/** A modelled fill: the ink, striped with a tint of itself, so the block still reads as its colour. */
export const hatch = (color) => `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in srgb, ${color} 28%, transparent) 3px 6px)`;
/** The fill for a part: solid, or hatched when it is modelled. */
export const fillOf = (ink, modelled) => { const c = (COST_INK[ink] || COST_INK.other).color; return modelled ? hatch(c) : c; };
/** The Modelled swatch: a hatched neutral that claims no payee. */
export const MODELLED = { color: 'var(--text-body)', word: 'Modelled' };
export const modelledFill = () => hatch(MODELLED.color);

// ---------- Who is paid for a bucket ----------
/**
 * A bucket is On AT&T only when it already pays your AT&T rate and its cloud has a
 * region attached (the skeptic, 2026-09-30: Small business has nothing attached, yet
 * its base bucket read On AT&T). Anything else bills outside AT&T. It lives with the
 * regional split in naas-lifecycle.js, so the Savings list and Cost read one rule.
 */
export const bucketInk = LC.bucketInk;

// ---------- Places ----------
// By region groups by the place a buyer names (the skeptic, 2026-09-30: "a buyer
// reads Frankfurt missing from Europe"; guidance: Europe groups every European
// region). A cloud region goes by its provider's own name first, so AWS us-east-2
// (Ohio) is US East, as AWS calls it; then by its metro, the way the site side
// places a site. A site keeps the site side's place, except that International
// resolves to its continent, so Frankfurt DC sits in Europe beside eu-central-1.
// REGION_METRO is naas-app.js REGION_GEO's twin for Compose; keep the two in step.
export const REGION_METRO = { 'us-east-1': 'Ashburn', 'us-east-2': 'Chicago', 'us-west-2': 'Seattle', 'eu-central-1': 'Frankfurt', 'eu-west-1': 'London', 'ap-southeast-1': 'Singapore', eastus: 'Ashburn', westeurope: 'Amsterdam', centralus: 'Dallas', 'us-central1': 'Chicago', 'us-east-04': 'New York', 'uk-south': 'London', 'europe-west1': 'Amsterdam', 'us-ashburn-1': 'Ashburn', 'eu-frankfurt-1': 'Frankfurt' };
const METRO_WORD = [[/ashburn|virginia/, 'Ashburn'], [/frankfurt/, 'Frankfurt'], [/london/, 'London'], [/amsterdam/, 'Amsterdam'], [/singapore/, 'Singapore'], [/chicago/, 'Chicago'], [/dallas/, 'Dallas'], [/phoenix/, 'Phoenix'], [/san-?jose/, 'San Jose'], [/seattle/, 'Seattle'], [/tokyo/, 'Tokyo'], [/sydney/, 'Sydney'], [/mumbai/, 'Mumbai'], [/seoul/, 'Seoul'], [/paris/, 'Paris'], [/dublin/, 'Dublin'], [/madrid/, 'Madrid']];
// The continent of a metro the site side calls International.
const METRO_CONTINENT = { Frankfurt: 'Europe', London: 'Europe', Amsterdam: 'Europe', Paris: 'Europe', Dublin: 'Europe', Madrid: 'Europe', Singapore: 'Asia Pacific', Tokyo: 'Asia Pacific', Sydney: 'Asia Pacific', Mumbai: 'Asia Pacific', Seoul: 'Asia Pacific', Manila: 'Asia Pacific' };
const settle = (place, metro) => (place === 'International' && METRO_CONTINENT[metro]) || place;
/** The place a cloud region sits in: US East, US Central, US West, Europe, Asia Pacific. */
export function geoOfRegion(region) {
  const r = String(region || '').toLowerCase();
  // The provider's own words first: us-east-*, eastus, us-central1, centralus, us-west-*, westus.
  if (/^us-?east|^eastus|^us-ashburn|^us-new-?york/.test(r)) return 'US East';
  if (/^us-?west|^westus|^us-phoenix|^us-sanjose|^us-san-jose/.test(r)) return 'US West';
  if (/^us-?central|^centralus|^(north|south)centralus|^us-chicago/.test(r)) return 'US Central';
  if (/^(eu|europe|uk|france|germany|switzerland|norway|sweden|italy|spain|poland)|europe/.test(r)) return 'Europe';
  if (/^(ap|asia|japan|australia|korea|india|southeastasia|eastasia)/.test(r)) return 'Asia Pacific';
  const metro = REGION_METRO[region] || (METRO_WORD.find(([re]) => re.test(r)) || [])[1];
  if (metro) return settle(regionOf({ metro, name: '' }), metro);
  if (/^(us|na)\b|^us-|us$|^(east|west|central|north|south)us/.test(r)) return /east/.test(r) ? 'US East' : /west/.test(r) ? 'US West' : 'US Central';
  return 'International';
}
/** The place a site sits in: the site side's region, with International resolved to its continent. */
export function placeOfSite(st) { return settle(regionOf(st), (st || {}).metro); }

// ---------- Slicing the one cost model ----------
/** The By cloud member for everything a site buys (access, SD-WAN, its tunnels). */
export const SITES = 'sites';
const SITES_LABEL = 'Your sites';
export const BY = ['all', 'region', 'cloud'];
export const byOf = (k) => (BY.includes(k) ? k : 'all');

/**
 * This month's egress by cloud region (the skeptic, 2026-09-30: pooled across the
 * estate, GCP's $84,000 landed in AWS and Azure regions and By region disagreed with
 * By cloud). Each bucket lands only in its own cloud's regions, by workloads
 * (LC.bucketWeights): at your AT&T rate in the attached ones, outside AT&T in the
 * public ones, or the attached ones where its cloud has none public. So By region
 * summed by cloud is By cloud, to the dollar. A share is a model, so every part is
 * modelled; a bucket whose cloud has no region here stays a bucket.
 */
export function regionalEgress(est, row) {
  const regs = est.regionsList || [];
  if (!regs.length) return row.parts || [];
  const bks = est.buckets || [], out = [];
  for (const ink of ['public', 'att']) {
    const mine = bks.filter(b => bucketInk(est, b) === ink);
    const dollars = LC.egressByRegion(est, ink).byRegion;
    regs.forEach((r, i) => { if (!(dollars[i] > 0)) return;
      // The pool this region's share comes from: its own cloud's buckets of this kind.
      const pool = mine.find(b => b.cloud === r.cloud && LC.bucketWeights(est, b)[i] > 0);
      const w = pool ? LC.bucketWeights(est, pool) : regs.map(() => 0), poolWl = w.reduce((a, x) => a + x, 0) || 1;
      out.push({ key: r.region + ':' + ink, kind: 'region', egress: true, region: r.region, cloud: r.cloud, n: 1, v: dollars[i], ink, modelled: true, share: (r.wl || 1) / poolWl, wl: r.wl || 1, poolWl,
        poolWord: r.priv ? 'attached' : 'public' }); });
    for (const b of mine.filter(x => !LC.bucketWeights(est, x).some(w => w > 0))) out.push(...(row.parts || []).filter(p => p.bucket === b.id));
  }
  return out;
}
/** A row's parts as a slice sees them: by region, egress is split across cloud regions; otherwise the row's own parts. */
export function partsFor(est, row, by) {
  return by === 'region' && row.key === 'egress' ? regionalEgress(est, row) : (row.parts || []);
}
/**
 * Where a part lands under a slice, as [member, share] pairs whose shares sum to 1.
 * A site sits in its place or, by cloud, with your sites (an IPsec tunnel with the
 * cloud that bills it); a cloud region in its place or its cloud; a bucket in its cloud.
 */
export function sharesOf(est, part, by) {
  const regs = est.regionsList || [];
  if (part.kind === 'site') {
    if (by === 'cloud') return [[part.cloud || SITES, 1]];
    const st = (est.sites || []).find(x => x.name === part.site) || { name: part.site, metro: '' };
    return [[placeOfSite(st), 1]];
  }
  if (part.kind === 'region') {
    const r = regs.find(x => x.region === part.region);
    return [[by === 'cloud' ? (r ? r.cloud : part.cloud || 'Other') : geoOfRegion(part.region), 1]];
  }
  if (part.kind === 'bucket') return [[by === 'cloud' ? part.cloud || 'Other' : 'International', 1]];
  return [['Other', 1]];
}
const labelOf = (key) => (key === SITES ? SITES_LABEL : key);
const LEGS = ['access', 'connect', 'cloud'];

/**
 * Whole numbers that add to `target` (by default the sum, rounded): each value floored,
 * then the largest remainders take the rest (the skeptic, 2026-09-30: Growing's five
 * regions each held one $36.50 tunnel, each rounded up, and the bars read $2 over the
 * head; the leg tiles read 99% and 101%).
 */
export function roundTo(values, target) {
  const t = target == null ? Math.round(values.reduce((a, x) => a + x, 0)) : target;
  const floor = values.map(Math.floor);
  let left = t - floor.reduce((a, x) => a + x, 0);
  values.map((x, i) => [x - floor[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { floor[i] += 1; left -= 1; } });
  return floor;
}
/**
 * The members of a slice with what each costs a month, largest first. Their sum is
 * the estate's total; vR is each one's whole dollars, and those add to the total's.
 * A member with parts but no price (CoreWeave's two ports, on no public price list) is
 * still a member: it holds things, it just costs $0 here.
 */
export function costMembers(est, L, by) {
  if (by !== 'region' && by !== 'cloud') return [];
  const m = {};
  for (const leg of LEGS) for (const row of (L[leg] || {}).rows || []) for (const p of partsFor(est, row, by)) {
    for (const [k, sh] of sharesOf(est, p, by)) { const g = m[k] = m[k] || { key: k, label: labelOf(k), v: 0, sites: new Set(), regions: new Set(), buckets: new Set() };
      g.v += p.v * sh;
      if (p.kind === 'site') g.sites.add(p.site); else if (p.kind === 'region') g.regions.add(p.region); else if (p.kind === 'bucket') g.buckets.add(p.bucket); }
  }
  const out = Object.values(m).map(g => ({ key: g.key, label: g.label, v: g.v, sites: [...g.sites], regions: [...g.regions], buckets: [...g.buckets] }))
    .sort((a, b) => b.v - a.v || a.label.localeCompare(b.label));
  const vR = roundTo(out.map(g => g.v));
  return out.map((g, i) => ({ ...g, vR: vR[i] }));
}

/** One row, cut to a member: its parts that land there, at their share. */
function sliceRow(est, row, by, key) {
  const parts = [];
  for (const p of partsFor(est, row, by)) for (const [k, sh] of sharesOf(est, p, by)) if (k === key && sh > 0) parts.push({ ...p, v: p.v * sh, share: p.share != null ? p.share : sh });
  const n = row.key === 'egress' ? parts.length : parts.reduce((a, p) => a + p.n, 0);
  return { ...row, parts, n, v: parts.reduce((a, p) => a + p.v, 0) };
}
/** The three legs, cut to one member of a slice. The whole estate when by is 'all'. */
export function sliceLegs(est, L, by, key) {
  if ((by !== 'region' && by !== 'cloud') || key == null) return L;
  const out = {};
  for (const leg of LEGS) {
    const src = L[leg] || { key: leg, label: '', rows: [] };
    const rows = src.rows.map(r => sliceRow(est, r, by, key)).filter(r => r.parts.length);
    out[leg] = { ...src, rows, total: rows.reduce((a, r) => a + r.v, 0) };
  }
  return { ...out, total: out.access.total + out.connect.total + out.cloud.total };
}

/** What a member holds, counted from the estate, not from what is priced: sites, cloud regions and buckets. */
export function memberCounts(est, by, key) {
  const sites = (est.sites || []), regs = (est.regionsList || []), bks = (est.buckets || []);
  if (by === 'cloud') {
    if (key === SITES) return { sites: sites.reduce((a, x) => a + S.countOf(x.name), 0), regions: 0, buckets: 0 };
    return { sites: 0, regions: regs.filter(r => r.cloud === key).length, buckets: bks.filter(b => b.cloud === key).length };
  }
  return { sites: sites.filter(x => placeOfSite(x) === key).reduce((a, x) => a + S.countOf(x.name), 0), regions: regs.filter(r => geoOfRegion(r.region) === key).length, buckets: 0 };
}

// The order a bar stacks in: what AT&T carries, then list prices, then egress outside AT&T.
const SEG_ORDER = [['att', false], ['att', true], ['list', true], ['list', false], ['public', false], ['public', true], ['other', false], ['other', true]];
/** A set of rows as colour segments: how much of it is each ink, and whether modelled. */
export function inkSegs(rows) {
  const acc = {};
  for (const r of rows) for (const p of r.parts || []) { const ink = COST_INK[p.ink] ? p.ink : 'other', k = ink + (p.modelled ? ':m' : ''); acc[k] = (acc[k] || 0) + p.v; }
  return SEG_ORDER.map(([ink, m]) => ({ key: ink + (m ? ':m' : ''), ink, modelled: m, v: acc[ink + (m ? ':m' : '')] || 0 })).filter(x => x.v > 0.005);
}

/** By region (or By cloud): one bar per member, its segments by ink, its egress apart. */
export function memberBars(est, L, by) {
  const b = by === 'cloud' ? 'cloud' : 'region';
  return costMembers(est, L, b).map(m => {
    const sl = sliceLegs(est, L, b, m.key);
    const rows = [...sl.access.rows, ...sl.connect.rows, ...sl.cloud.rows];
    const egressV = rows.filter(r => r.key === 'egress').reduce((a, r) => a + r.v, 0);
    return { ...m, v: sl.total, egressV, legs: { access: sl.access.total, connect: sl.connect.total, cloud: sl.cloud.total }, segs: inkSegs(rows) };
  });
}

// ---------- Words ----------
const nf = (n) => Math.round(n).toLocaleString('en-US');
export const each = (v) => (Number.isInteger(v) ? fmt(v) : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const noun = (n, one, many) => `${nf(n)} ${Math.round(n) === 1 ? one : many}`;
/** A row in words a buyer reads: count × unit, then what the price is. Recounted from its parts, so a slice reads true. */
export function rowWords(row) {
  const n = row.n, parts = row.parts || [];
  if (row.key === 'egress') {
    // The figure leads, so a narrow column cuts the words, never the figure (the skeptic, 2026-09-30).
    const out = parts.filter(p => p.ink === 'public').reduce((a, p) => a + p.v, 0), att = parts.filter(p => p.ink === 'att').reduce((a, p) => a + p.v, 0);
    // When it is all one kind, the row's value already says the figure, so the words do not repeat it.
    const lead = out > 0.5 && att > 0.5 ? `${fmt(Math.round(out))} outside AT&T` : out > 0.5 ? 'All outside AT&T' : 'All at your AT&T rate';
    // Cut by region, egress is a share of the buckets by workloads, named by the cloud regions that carry it.
    if (parts.some(p => p.kind === 'region')) return `${lead} · ${noun(n, 'cloud region', 'cloud regions')}, by workloads`;
    return `${lead} · ${noun(n, 'bucket', 'buckets')}, measured`; }
  const [one, many] = row.nouns || ['item', 'items'];
  if (row.carrier) return `${noun(n, one, many)} · billed by another carrier, not priced here`;
  if (!row.unit) return `${noun(n, one, many)} · not on a public price list`;
  const backup = parts.filter(p => p.role === 'backup').reduce((a, p) => a + p.n, 0);
  const regions = new Set(parts.filter(p => p.kind === 'region').map(p => p.region)).size;
  const vlan = row.perRegion ? ` + ${fmt(row.perRegion)} for ${noun(regions, 'region', 'regions')}` : '';
  return `${noun(n, one, many)} × ${each(row.unit)}${row.eachWord ? ' each' : ''}${vlan}${row.rateWords ? ', ' + row.rateWords : ''}${backup ? ` · ${nf(backup)} of them backup` : ''}`;
}
/** A leg in words: what its figure covers. */
export function legCovers(leg) {
  const rows = leg.rows || [];
  if (leg.key === 'access') { const c = rows.reduce((a, r) => a + r.n, 0), sites = new Set(rows.flatMap(r => (r.parts || []).map(p => p.site)));
    const nSites = [...sites].reduce((a, nm) => a + S.countOf(nm), 0);
    return c ? `${noun(c, 'circuit', 'circuits')} at ${noun(nSites, 'site', 'sites')}` : 'No site access priced'; }
  if (leg.key === 'connect') { const W = { nb: ['NetBond region', 'NetBond regions'], hv: ['hosted VPC', 'hosted VPCs'], l3: ['L3 attach', 'L3 attaches'], sdwan: ['SD-WAN site', 'SD-WAN sites'], xc: ['cross-connect', 'cross-connects'], ipsec: ['IPsec tunnel', 'IPsec tunnels'] };
    const bits = rows.filter(r => W[r.key]).map(r => noun(r.n, ...W[r.key]));
    return bits.length ? bits.slice(0, 3).join(' · ') : 'Nothing into the clouds priced'; }
  const ports = rows.filter(r => r.key !== 'egress'), eg = rows.find(r => r.key === 'egress');
  const clouds = new Set(ports.map(r => r.cloud).filter(Boolean));
  const pN = ports.reduce((a, r) => a + r.n, 0);
  const egWords = !eg || !eg.n ? '' : (eg.parts || []).some(p => p.kind === 'region') ? `egress in ${noun(eg.n, 'cloud region', 'cloud regions')}` : `egress from ${noun(eg.n, 'bucket', 'buckets')}`;
  return [pN ? `${noun(pN, 'port', 'ports')} in ${noun(clouds.size, 'cloud', 'clouds')}` : '', egWords].filter(Boolean).join(' · ') || 'Nothing billed by a cloud yet';
}

// ---------- Doors ----------
/** A bucket of egress, explained down to its records: the cut By bucket and By leg share. */
export function bucketExplain(b) {
  const nm = b.name || b.id || '';
  return { label: nm, value: fmt(b.today) + '/mo', sub: `${fmt(b.today)}/mo on the hyperscaler against ${fmt(b.fabric)}/mo on AT&T.`, cut: 'The flow records in this bucket.',
    pattern: /internet|saas/i.test(nm) ? 'internet' : /cross-cloud|inter/i.test(nm) ? 'clouds' : /gpu|inference/i.test(nm) ? 'internet' : null, parts: [] };
}

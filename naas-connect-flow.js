/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The connect flow (Micah, 2026-09-30: "ways to connect doesn't work - take
// from netbond advanced's flow", and "when i attach things that aren't
// attached, why does the flow show already all green on steps?").
//
// Transcribed, not re-invented, from the NetBond Advanced app in
// ~/Developer/att-netbond-sdci:
//   src/components/connection/CreateConnectionMenu.tsx  the connection types
//   src/utils/wizardDoor.ts                             step words, step orders
//   src/components/wizard/screens/ResiliencySelection.tsx  the three tiers
//   src/components/wizard/standard/*.tsx                the words on each step
//   src/components/wizard/PhaseIndicator.tsx            done = passed, never pre-filled
//   src/components/wizard/wizardTopologyBuilder.ts      the order-in-progress picture
//
// Every price here is the storefront's own model (CATALOG list prices, the
// resiliency multipliers composeOrder always used, the term discounts on
// Review), never NetBond Advanced's rate card, and it says Modelled.
// Pure data and functions; naas-app.js binds them.
import { CATALOG } from './naas-data.js';
import { PATHS } from './naas-round2.js';
import { countOf } from './naas-sites.js';
import { fmt, plural, siteModeOf, regionOf } from './naas-logic.js';

// ---------- The connection types (CreateConnectionMenu.tsx OPTIONS) ----------
export const CONNECTION_TYPES = [
  { key: 'internet', label: 'Internet to Cloud', description: 'Public internet on-ramp with DDoS protection' },
  { key: 'c2c', label: 'Cloud to Cloud', description: 'Private backbone linking two clouds through one Hub' },
  { key: 'dc', label: 'DataCenter / CoLocation to Cloud', description: 'Direct fiber cross-connect from your data center' },
  { key: 'vpn', label: 'VPN to Cloud', description: 'Encrypted IPSec / IKEv2 tunnel over the internet' },
  { key: 'iot', label: 'IoT to Cloud', description: 'Private APN connectivity for your 4G/5G IoT devices' },
  { key: 'layer2', label: 'Layer 2 to Cloud', description: 'ASEoD Ethernet from your Layer 2 branch offices' },
  { key: 'colo', label: 'Colo to Colo', description: "Bridge two colo cages over AT&T's private network" },
  { key: 'site', label: 'Site to Cloud', description: 'Branch / SD-WAN connectivity - coming soon', disabled: true },
];
// LMCC_OPTION: a product, not a type, so the menu files it in its own category.
export const LAST_MILE = { key: 'lmcc', label: 'Interconnect - Last Mile', description: 'Maximum-resiliency AWS interconnect · 4 paths across 2 sites in one metro', category: 'AWS Interconnect' };
export const ALL_TYPES = [...CONNECTION_TYPES, LAST_MILE];
/** A type by its label; NetBond Advanced's own value spells DataCenter/CoLocation without spaces. */
export function typeOf(label) {
  if (!label) return null;
  const want = String(label).replace(/\s*\/\s*/g, '/').toLowerCase();
  return ALL_TYPES.find(t => t.label.replace(/\s*\/\s*/g, '/').toLowerCase() === want || t.key === label) || null;
}

// ---------- The steps (wizardDoor.ts) ----------
export const STEP_META = {
  type: { title: 'Connection Type', description: 'Select how you want to connect' },
  provider: { title: 'Choose Provider', description: 'Select your cloud service provider' },
  basic: { title: 'Connection Profile', description: 'Set resiliency, bandwidth, and location' },
  advanced: { title: 'Advanced Settings', description: 'Configure network settings' },
  review: { title: 'Review', description: 'Name it (optional) and place your order' },
  terms: { title: 'Terms', description: 'Choose your contract term' },
  confirm: { title: 'Confirm', description: 'Review and place your order' },
  endpoints: { title: 'Colo Endpoints', description: 'Choose your two colo endpoints' },
};
export const STD_STEP_KEYS = ['type', 'provider', 'basic', 'advanced', 'terms', 'review'];
export const STD_STEP_KEYS_LMCC = ['type', 'provider', 'basic', 'terms', 'confirm'];
export const STD_STEP_KEYS_COLO = ['type', 'endpoints', 'basic', 'terms', 'confirm'];
export const STD_STEP_KEYS_LMCC_EXPRESS = ['basic', 'terms', 'confirm'];

// ---------- Resiliency (ResiliencySelection.tsx TIER_META, ColoProfileStep.tsx) ----------
// Colo's Standard line says "colo sites" where ColoProfileStep says "fabric sites":
// the storefront never calls anything but AI Fabric and Equinix Fabric a fabric.
export const TIERS = ['Standard', 'Maximum', 'Geodiversity'];
export const TIER_PROTECTS = {
  Standard: 'Protects against a single router failing at one datacenter.',
  Maximum: 'Protects against the loss of an entire datacenter in the metro.',
  Geodiversity: 'Protects against the loss of an entire metro.',
};
export const COLO_TIER_PROTECTS = {
  Standard: 'Single path between your colo sites. Protects against port and device faults.',
  Maximum: 'Protected pair on diverse long-haul routes. Survives a fiber cut between metros.',
};
// wizardDoor.ts MAXIMUM_ELIGIBLE_PROVIDERS / MAXIMUM_LIVE_PROVIDERS; Google is GCP here.
export const MAXIMUM_ELIGIBLE = ['AWS', 'Azure', 'Oracle', 'GCP'];
export const MAXIMUM_LIVE = ['AWS', 'Azure'];
// composeOrder's resiliency multipliers (naas-app.js), the storefront's one tier price model.
export const TIER_MULT = { Standard: 1, Geodiversity: 1.6, Maximum: 2.2 };

// ---------- Bandwidth (BasicSettingsStep.tsx, lmccService.ts GA, coloBilling.ts) ----------
export const BANDWIDTHS = ['100 Mbps', '500 Mbps', '1 Gbps', '10 Gbps', '100 Gbps'];
export const LMCC_BANDWIDTHS = ['1 Gbps', '2 Gbps', '5 Gbps', '10 Gbps', '20 Gbps', '40 Gbps', '100 Gbps'];
export const COLO_BANDWIDTHS = ['1 Gbps', '10 Gbps', '50 Gbps', '100 Gbps'];
// lmccService.ts GA availableMetros: San Jose and Ashburn.
export const LMCC_METROS = ['San Jose', 'Ashburn'];

// ---------- Advanced Settings (AdvancedSettingsStep.tsx) ----------
export const QOS_OPTIONS = ['Standard', 'Best Effort', 'Out of Contract'];

// ---------- Colo endpoints (coloFabric.ts FABRIC_PRODUCT) ----------
export const FABRICS = [{ key: 'Equinix', product: 'Equinix Fabric' }, { key: 'Digital Realty', product: 'ServiceFabric' }];

// ---------- Terms (ContractTermSelect.tsx titles; the storefront's discounts) ----------
// The discounts are Review's (naas-app.js termDisc), never NetBond Advanced's.
export const TERM_DISC = { 0: 0, 12: 15, 24: 30, 36: 50 };
export const TERMS = [
  { m: 0, title: 'Month-to-month', note: 'No commitment' },
  { m: 12, title: '12-month', note: `${TERM_DISC[12]}% off` },
  { m: 24, title: '24-month', note: `${TERM_DISC[24]}% off` },
  { m: 36, title: '36-month', note: `${TERM_DISC[36]}% off`, best: true },
];
export const termTitle = (m) => (TERMS.find(t => t.m === m) || {}).title || '';

// The stage an order placed from this storefront is in: Review's own words.
export const ORDER_STAGE = 'Submitted for approval';
export const MODELLED = 'Modelled · list price';
export const PRICE_NOTE = 'Priced by AT&T after review';

// ---------- Places (moved from naas-app.js) ----------
// The metro nearest a cloud region, the storefront's one table of it.
export const REGION_GEO = { 'us-east-1': 'Ashburn', 'us-east-2': 'Chicago', 'us-west-2': 'Seattle', 'eu-central-1': 'Frankfurt', 'eu-west-1': 'London', 'ap-southeast-1': 'Singapore', eastus: 'Ashburn', westeurope: 'Amsterdam', centralus: 'Dallas', 'us-central1': 'Chicago', 'us-east-04': 'New York', 'uk-south': 'London' };
// The policy a control ships as, in Govern's words (moved from naas-app.js).
export const POLICY_FOR_CONTROL = { 'Private path required': { match: 'tag PCI', req: 'Private path required' }, 'No direct internet path': { match: 'tag Prod', req: 'No direct internet path' }, 'Inline inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Inline security inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Segment by tag': { match: 'branch Finance', req: 'Segment intra-tag only' }, 'Latency SLO': { match: 'tag GPU', req: 'Latency SLO 15 ms' }, 'Cost-aware routing': { match: 'region *', req: 'Cost-aware routing' } };
const AREA_ORDER = ['US East', 'US Central', 'US West', 'Europe', 'Asia Pacific', 'International', 'Nationwide'];

// ---------- What each type applies to, in this estate ----------
const sitesOf = (est) => (est && est.sites) || [];
const regionsOf = (est) => (est && est.regionsList) || [];
export const regionName = (r) => `${r.cloud} ${r.region}`;
export const cloudOfName = (name) => String(name || '').split(' ')[0];
const metroOk = (m) => !!m && m !== 'Various';
const SITE_TEST = {
  dc: (x) => x.cls === 'Data center',
  colo: (x) => x.cls === 'Data center',
  vpn: (x) => siteModeOf(x) === 'ipsec',
  iot: (x) => /mobility/i.test(x.access || '') || /^(Mobility|Edge)$/.test(x.cls || ''),
  layer2: (x) => /\bASE\b/.test(x.access || ''),
  site: (x) => x.cls === 'Branch',
};
const SITE_NOUN = { dc: ['data center', 'data centers'], colo: ['data center', 'data centers'], vpn: ['site on IPsec', 'sites on IPsec'], iot: ['wireless or IoT site', 'wireless and IoT sites'], layer2: ['site on Switched Ethernet', 'sites on Switched Ethernet'], site: ['branch site', 'branch sites'] };
/** A site as the flow names it: its name, its class and its metro. */
export const siteLine = (x) => `${x.name} (${x.cls})${metroOk(x.metro) ? ' · ' + x.metro : ''}`;
/**
 * Which of THIS estate's sites or cloud regions a type applies to: the set,
 * how many (rollups count their sites) and the words. The count opens exactly
 * this set.
 */
export function appliesTo(est, key) {
  const t = ALL_TYPES.find(x => x.key === key);
  if (!t) return null;
  if (SITE_TEST[key]) {
    const items = sitesOf(est).filter(SITE_TEST[key]);
    const n = items.reduce((a, x) => a + countOf(x.name), 0);
    const [one, many] = SITE_NOUN[key];
    return { key, kind: 'sites', items, n, phrase: n ? plural(n, one, many) : '', none: n ? '' : `No ${many} in your estate` };
  }
  const rs = regionsOf(est);
  if (key === 'internet') {
    const items = rs.filter(r => !r.priv);
    return { key, kind: 'regions', items, n: items.length, phrase: items.length ? plural(items.length, 'region on the public internet', 'regions on the public internet') : '', none: items.length ? '' : 'No region on the public internet' };
  }
  if (key === 'lmcc') {
    const items = rs.filter(r => r.cloud === 'AWS');
    return { key, kind: 'regions', items, n: items.length, phrase: items.length ? plural(items.length, 'AWS region', 'AWS regions') : '', none: items.length ? '' : 'No AWS region in your estate' };
  }
  // Cloud to Cloud links two clouds; one cloud is a link to nothing (wizardDoor.ts canProceedStandard).
  const clouds = [...new Set(rs.map(r => r.cloud))];
  const items = clouds.length >= 2 ? rs : [];
  return { key, kind: 'regions', items, n: items.length, phrase: items.length ? plural(items.length, 'region across your clouds', 'regions across your clouds') : '', none: items.length ? '' : (rs.length ? 'Needs a second cloud' : 'No cloud region in your estate') };
}
/** One row per member of a type's set: what it is and how it reaches the cloud today. No figures. */
export function appliesRows(est, set, rampWord) {
  if (!set) return [];
  return set.items.map(x => set.kind === 'sites'
    ? { key: 's:' + x.name, name: x.name, sub: [x.cls, metroOk(x.metro) ? x.metro : '', x.access].filter(Boolean).join(' · ') }
    : { key: 'r:' + regionName(x), name: regionName(x), sub: [x.priv ? (rampWord ? rampWord(x) : 'Private') : 'Public internet', REGION_GEO[x.region] || ''].filter(Boolean).join(' · ') });
}

// ---------- Resolving what an entry attached ----------
export function resolveRegion(est, name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const r = regionsOf(est).find(x => regionName(x) === n || x.region === n);
  return r ? regionName(r) : null;
}
export function resolveSite(est, name) {
  return sitesOf(est).find(x => x.name === name) || null;
}
const normTier = (t) => { const k = String(t || '').toLowerCase(); return k === 'maximum' ? 'Maximum' : k === 'geodiversity' ? 'Geodiversity' : k === 'standard' ? 'Standard' : null; };
const uniq = (xs) => [...new Set(xs.filter(Boolean))];
/** The contract with the options builder: one set, or several, in one order. */
export function normSets(prefillSets) {
  if (!prefillSets) return [];
  return (Array.isArray(prefillSets) ? prefillSets : [prefillSets]).filter(Boolean);
}
const joinNames = (xs) => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

// ---------- The flow, read from a compose ----------
/**
 * The order as the flow sees it. A compose carries two kinds of field: what
 * an entry route wrote (prefillSets from Options, or the older outcome,
 * source, metros, resiliency and control), and what the person chose in the
 * flow (ctype, regions, sites, loc, bandwidth, tier, policy, term, name, qos,
 * colo). A value the person chose reads "you"; a value an entry filled from
 * the estate reads "estate"; anything else is not chosen yet. A step is done
 * only when the person passed it (compose.passed).
 */
export function flowOf(cp, est) {
  cp = cp || {};
  const from = { ...(cp.from || {}) };
  const f = {
    ctype: null, regions: [], sites: [], loc: [], bandwidth: null, tier: null, policy: [], term: null, name: cp.name || '', qos: { ...(cp.qos || {}) },
    colo: { a: { site: null, fabric: null, ...((cp.colo || {}).a || {}) }, b: { site: null, fabric: null, ...((cp.colo || {}).b || {}) } },
    passed: [...(cp.passed || [])], fk: cp.fk || null, lmccExpress: !!cp.lmccExpress, bulk: cp.bulk || null, qty: cp.qty || 1,
    note: cp.note || null, noteTitle: cp.sourceLabel || (cp.byText ? 'From what you typed' : 'From the drawer'), noteKey: cp.noteKey || null, from: {}, byText: !!cp.byText,
  };
  const est_ = (k, v) => { if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return; f[k] = v; f.from[k] = 'estate'; };
  const sets = normSets(cp.prefillSets);
  if (sets.length) {
    const sites = uniq(sets.flatMap(x => x.sites || []));
    const regions = uniq(sets.flatMap(x => (x.regions || []).map(r => resolveRegion(est, r) || r)));
    est_('sites', sites);
    est_('regions', regions);
    const t = sets.map(x => typeOf(x.connectionType)).find(Boolean);
    est_('ctype', t ? t.label : null);
    est_('tier', sets.map(x => normTier(x.tier)).find(Boolean) || null);
    // A port an entry sized (Signals' Add a port, third round 2026-09-30): the size of the ports beside it.
    const bw = sets.map(x => x.bandwidth).find(Boolean);
    if (bw && bandwidthsFor(f).includes(bw)) est_('bandwidth', bw);
    const label = sets.map(x => x.sourceLabel).find(Boolean);
    f.noteTitle = label || cp.sourceLabel || 'From Options';
    // Past two, the banner names two and says there are others; the panel's "All N" opens every one.
    const siteNamed = sites.map(n => { const x = resolveSite(est, n); return x ? `${x.name} (${[x.cls, metroOk(x.metro) ? x.metro : ''].filter(Boolean).join(' · ')})` : n; });
    const named = [...(siteNamed.length > 2 ? [...siteNamed.slice(0, 2), 'other sites'] : siteNamed), ...(regions.length > 2 ? [...regions.slice(0, 2), 'other regions'] : regions)];
    if (!cp.note && named.length) f.note = named.length === 1 ? `Attach ${named[0]}.` : `Attach ${joinNames(named)} in one order.`;
  } else if (cp.outcome) {
    const src = cp.source || [];
    const t = cp.outcome === 'u3' ? 'Cloud to Cloud' : cp.outcome === 'u2' ? 'Internet to Cloud' : src.includes('Data center') ? 'DataCenter / CoLocation to Cloud' : src.includes('Internet') ? 'Internet to Cloud' : null;
    est_('ctype', t);
    const r = resolveRegion(est, cp.prefillRegion);
    est_('regions', r ? [r] : null);
    if (cp.resiliencyChosen || cp.prefilled || (cp.byText && cp.resiliency !== 'Standard')) est_('tier', normTier(cp.resiliency));
    est_('policy', (cp.control || []).slice());
    // Two metros an entry derived for a second path are its location. A single
    // metro most entries wrote is a default ('Ashburn' whatever the order), not
    // your estate, so it waits for you; one you typed is yours.
    const m = cp.metros || [];
    if (m.length >= 2 && ['Geodiversity', 'Maximum'].includes(cp.resiliency)) est_('loc', m.slice());
    else if (m.length && cp.byText) est_('loc', m.slice());
    if (cp.byText) Object.keys(f.from).forEach(k => { f.from[k] = 'you'; });
  }
  // What a sentence typed on Connection Type filled: yours, not yet passed.
  const typed = new Set(cp.byText ? Object.keys(f.from) : []);
  // The person's own choices win, field by field.
  for (const k of ['ctype', 'regions', 'sites', 'loc', 'bandwidth', 'tier', 'policy', 'term']) {
    if (cp[k] !== undefined && cp[k] !== null) { f[k] = Array.isArray(cp[k]) ? cp[k].slice() : cp[k]; f.from[k] = from[k] || 'you'; typed.delete(k); }
  }
  if (cp.colo) f.from.colo = from.colo || 'you';
  f.typed = [...typed];
  // Interconnect - Last Mile IS Maximum resiliency on AWS.
  if (f.ctype === LAST_MILE.label) { f.tier = 'Maximum'; f.from.tier = f.from.ctype; }
  // Where the path enters the AT&T network, when an entry named it only through its sites or regions.
  // The flow filled it (the metro of the site, or nearest the region), so it
  // reads From your estate until you pick one yourself: you never chose it.
  if (!f.loc.length && cp.loc == null) {
    const siteMetros = uniq(f.sites.map(n => (resolveSite(est, n) || {}).metro).filter(metroOk));
    const regionMetros = uniq(f.regions.map(n => REGION_GEO[(regionsOf(est).find(x => regionName(x) === n) || {}).region]));
    const pick = siteMetros.length ? siteMetros : f.sites.length ? [] : regionMetros;
    const geo = f.tier === 'Geodiversity';
    if (pick.length === 1 || (geo && pick.length >= 2)) {
      const lm = isLmcc(f) ? pick.filter(x => LMCC_METROS.includes(x)) : pick;
      if (lm.length) { f.loc = lm; f.from.loc = 'estate'; }
    }
  }
  return f;
}

export const cloudsOf = (f) => uniq((f.regions || []).map(cloudOfName));
export const tierOf = (f) => f.tier || 'Standard';
/** wizardDoor.ts isLmccPath + tierForkArmed: Internet or VPN to Cloud, AWS alone, Maximum. */
export function isLmcc(f) {
  if (f.ctype === LAST_MILE.label) return true;
  if (f.ctype !== 'Internet to Cloud' && f.ctype !== 'VPN to Cloud') return false;
  const c = cloudsOf(f);
  return c.length === 1 && c[0] === 'AWS' && tierOf(f) === 'Maximum';
}
export const isColo = (f) => f.ctype === 'Colo to Colo';
/** Internet to Cloud, still itself: the internet is its far end (the tier fork to Last Mile makes it an AWS interconnect). */
export const isInternet = (f) => f.ctype === 'Internet to Cloud' && !isLmcc(f);
/** wizardDoor.ts stepKeysForState. */
export function stepKeysFor(f) {
  if (isColo(f)) return STD_STEP_KEYS_COLO;
  if (isLmcc(f)) return f.lmccExpress && f.regions.length ? STD_STEP_KEYS_LMCC_EXPRESS : STD_STEP_KEYS_LMCC;
  return STD_STEP_KEYS;
}
export const bandwidthsFor = (f) => (isColo(f) ? COLO_BANDWIDTHS : isLmcc(f) ? LMCC_BANDWIDTHS : BANDWIDTHS);
export const tiersFor = (f) => (isColo(f) ? ['Standard', 'Maximum'] : f.ctype === LAST_MILE.label ? ['Maximum'] : TIERS.filter(t => t !== 'Maximum' || !cloudsOf(f).length || cloudsOf(f).every(c => MAXIMUM_ELIGIBLE.includes(c))));
/** Maximum is shown for AWS, Azure, Oracle and Google; live only for AWS and Azure. */
export const maximumSoon = (f) => { const c = cloudsOf(f); return !isColo(f) && c.length > 0 && !c.every(x => MAXIMUM_LIVE.includes(x)); };

/** Why a step cannot be passed yet, in the person's words; '' when it can. */
export function blockOf(key, f) {
  const clouds = cloudsOf(f);
  switch (key) {
    case 'type': { const t = typeOf(f.ctype); return !t ? 'Pick a connection type.' : t.disabled ? `${t.label} is coming soon. Pick another type.` : ''; }
    case 'provider':
      if (!f.regions.length) return 'Pick a cloud region.';
      if (f.ctype === 'Cloud to Cloud') return clouds.length >= 2 ? '' : 'Cloud to Cloud links two clouds. Pick a region in a second cloud.';
      if (f.ctype === LAST_MILE.label || isLmcc(f)) return clouds.every(c => c === 'AWS') ? '' : 'Interconnect - Last Mile reaches AWS only.';
      return clouds.length === 1 ? '' : `${f.ctype || 'This type'} carries one cloud. Keep one, or pick Cloud to Cloud.`;
    case 'endpoints': {
      const { a, b } = f.colo;
      if (!a.site || !b.site) return 'Pick a data center for each side.';
      if (a.site === b.site) return 'Pick two different data centers.';
      return a.fabric && b.fabric ? '' : 'Pick what each cage connects through.';
    }
    case 'basic': {
      if (!isColo(f)) {
        if (tierOf(f) === 'Maximum' && maximumSoon(f)) return 'Maximum is live for AWS and Azure. Coming soon for this provider.';
        const need = tierOf(f) === 'Geodiversity' ? 2 : 1;
        if (f.loc.length < need) return need === 2 ? 'Geodiversity lands your paths in two metros. Pick two.' : 'Pick a location.';
        if (isLmcc(f) && !f.loc.every(m => LMCC_METROS.includes(m))) return 'Interconnect - Last Mile is live in San Jose and Ashburn.';
      }
      if (!f.bandwidth || !bandwidthsFor(f).includes(f.bandwidth)) return 'Pick a bandwidth.';
      return '';
    }
    case 'advanced': return f.policy.length ? '' : 'Pick what must always be true.';
    case 'terms': return f.term === null || f.term === undefined ? 'Pick a contract term.' : '';
    case 'review': case 'confirm': {
      const before = stepKeysFor(f).filter(k => k !== key).map(k => blockOf(k, f)).find(Boolean);
      return before || (f.policy.length ? '' : 'Pick what must always be true.');
    }
    default: return '';
  }
}
export const canProceed = (key, f) => !blockOf(key, f);
/** "Start on the first step that needs a decision." */
export function landingKey(f) {
  const keys = stepKeysFor(f);
  return keys.find(k => !f.passed.includes(k) && !canProceed(k, f)) || keys.find(k => !f.passed.includes(k)) || keys[keys.length - 1];
}
export function currentKey(f) {
  const keys = stepKeysFor(f);
  return f.fk && keys.includes(f.fk) ? f.fk : landingKey(f);
}
// Which of the order's fields each step decides.
const STEP_FIELDS = { type: ['ctype'], provider: ['regions'], endpoints: ['colo'], basic: ['loc', 'tier', 'bandwidth'], advanced: ['policy'], terms: ['term'], review: [], confirm: [] };
const locWords = (f) => f.loc.join(' + ');
// Words never count what they do not open (2026-09-30): past two, a list
// names two and says there are others; the panel's "All N" opens every one.
const someOf = (xs) => xs.length <= 2 ? xs.join(', ') : `${xs[0]}, ${xs[1]} and others`;
const regionsWords = (f) => someOf(f.regions);
const coloWords = (f) => [f.colo.a.site, f.colo.b.site].filter(Boolean).join(' and ');
/** What a step decided, in a few words, for the stepper and the panel. */
export function stepValue(key, f) {
  switch (key) {
    case 'type': return f.ctype || '';
    case 'provider': return regionsWords(f);
    case 'endpoints': return coloWords(f);
    case 'basic': return [locWords(f), f.tier || '', f.bandwidth || ''].filter(Boolean).join(' · ');
    case 'advanced': return f.policy.length ? (f.policy.length === 1 ? f.policy[0] : `${f.policy[0]} and others`) : '';
    case 'terms': return f.term === null || f.term === undefined ? '' : termTitle(f.term);
    default: return '';
  }
}
/**
 * The stepper, honestly (PhaseIndicator.tsx: completed only when passed).
 * current: where you are. done: you passed it. filled: an entry filled it
 * from your estate, or a sentence you typed did, and you have not passed it;
 * it shows the value and where it came from, never a done mark. todo:
 * nothing yet.
 */
export function stepStates(f) {
  const keys = stepKeysFor(f), cur = currentKey(f);
  return keys.map((k, i) => {
    const fields = STEP_FIELDS[k] || [];
    const fromEstate = fields.some(x => f.from[x] === 'estate');
    const typed = fields.some(x => f.typed.includes(x));
    const state = k === cur ? 'current' : f.passed.includes(k) ? 'done' : (fromEstate || typed) && canProceed(k, f) ? 'filled' : 'todo';
    return { key: k, n: i + 1, ...STEP_META[k], state, value: stepValue(k, f), filledFrom: fromEstate ? 'From your estate' : typed ? 'From what you typed' : '' };
  });
}
/** A step you can go back to: one you passed, one filled from your estate, or any before where you are. */
export function reachable(key, f) {
  const keys = stepKeysFor(f), i = keys.indexOf(key), ci = keys.indexOf(currentKey(f));
  return i >= 0 && (i <= ci || f.passed.includes(key) || stepStates(f)[i].state === 'filled');
}

// ---------- What each tier gets you ----------
const TYPE_PRODUCT = { 'Internet to Cloud': 'i2c', 'VPN to Cloud': 'i2c', 'Cloud to Cloud': 'c2c', 'DataCenter / CoLocation to Cloud': 'netbond', 'IoT to Cloud': 'netbond', 'Layer 2 to Cloud': 'netbond', 'Colo to Colo': 'colo', 'Interconnect - Last Mile': 'lmcc' };
const productOf = (id) => CATALOG.find(p => p.id === id);
/** The path a type rides, from R.PATHS: the internet types ride Internet attach, the rest the AT&T network. */
export const pathOf = (f) => PATHS.find(p => p.id === (['Internet to Cloud', 'VPN to Cloud'].includes(f.ctype) && !isLmcc(f) ? 'internet' : 'netbond'));
/** The region a latency reads from: the first one chosen, else the estate's first on the public internet. */
export function sampleRegion(f, est) {
  const rs = regionsOf(est);
  return rs.find(r => regionName(r) === f.regions[0]) || rs.find(r => !r.priv) || rs[0] || null;
}
/**
 * What you'd get, path by path (the comparison that left Ways to connect,
 * 2026-09-30): R.PATHS read for the region this order reaches, so the table
 * and the tiers beside it quote one latency. The row this order rides is marked.
 */
export function pathTable(f, est) {
  const r = sampleRegion(f, est), rides = pathOf(f).id;
  const two = (s) => { const [a, ...b] = String(s).split(' · '); return [a, b.join(' · ')]; };
  return PATHS.map(p => {
    const [security, securitySub] = two(p.sec), [reliability, reliabilitySub] = two(p.relLabel), [perf, performanceSub] = r ? two(p.latLabel(r)) : ['Pick a region', ''];
    return { key: p.id, short: p.short, tone: p.tone, rides: p.id === rides, security, securitySub, performance: perf, performanceSub, reliability, reliabilitySub, cost: `$${p.egress.toFixed(2)}/GB`, costSub: 'egress, every GB out', setup: p.setup };
  });
}
/** The region the path table and the tiers read, and whether you picked it. */
export function pathsFor(f, est) {
  const r = sampleRegion(f, est);
  if (!r) return '';
  return f.regions[0] === regionName(r) ? regionName(r) : `${regionName(r)}, until you pick a region`;
}

// ---------- The order ----------
const END_MAX = 22;
const fits = (x) => x && x.length <= END_MAX;
/**
 * The order the flow builds, priced from CATALOG with composeOrder's tier
 * multipliers. One connection per cloud region (NetBond Advanced counts
 * connections per provider); a site-attach entry's count prices per site,
 * as composeOrder always has. Interconnect - Last Mile is Maximum by itself,
 * so its list price is not multiplied again.
 */
export function flowOrder(f, est, tierOverride) {
  const tier = tierOverride || tierOf(f);
  const mult = isLmcc(f) || f.ctype === LAST_MILE.label ? 1 : TIER_MULT[tier] || 1;
  const lines = [];
  const add = (p, qty, note, perSite) => { if (!p) return; const unitPrice = Math.round((p.price || 0) * mult); lines.push({ line: lines.length + 1, product: note ? `${p.name} (${note})` : p.name, qty, unitPrice, perSite: !!perSite, monthly: unitPrice * qty, unpriced: p.price === null }); };
  const pid = isLmcc(f) ? 'lmcc' : TYPE_PRODUCT[f.ctype];
  if (pid) {
    const siteQty = f.bulk && f.qty > 1 ? f.qty : 0;
    const conns = isColo(f) || isLmcc(f) || f.ctype === 'Cloud to Cloud' ? 1 : Math.max(1, f.regions.length);
    add(productOf(pid), siteQty || conns, null, !!siteQty);
    if (f.ctype === 'Cloud to Cloud') add(productOf('hub'), Math.max(1, f.loc.length));
  }
  if (f.policy.includes('Inline inspection')) add(productOf('ngfw'), 1);
  add(productOf('policy'), 1); add(productOf('observability'), 1);
  const priced = lines.filter(l => !l.unpriced);
  const monthly = priced.reduce((a, l) => a + l.monthly, 0);
  const policies = f.policy.map(k => POLICY_FOR_CONTROL[k]).filter(Boolean).map(p => ({ ...p, state: 'will be enforced on delivery' }));
  const sites = orderSites(f, est);
  const siteEnd = f.bulk ? (fits(f.bulk.split(' · ')[0]) ? f.bulk.split(' · ')[0] : 'Your sites') : sites.length === 1 && fits(sites[0].name) ? sites[0].name : sites.length === 2 && fits(`${sites[0].name} and ${sites[1].name}`) ? `${sites[0].name} and ${sites[1].name}` : sites.length ? `${sites.length} sites` : f.ctype === 'DataCenter / CoLocation to Cloud' ? 'Your data centers' : 'Your sites';
  const regionEnd = (rs) => rs.length === 1 ? rs[0] : rs.length > 1 ? (cloudsOf({ regions: rs }).length === 1 ? `${rs.length} ${cloudOfName(rs[0])} regions` : `${rs.length} cloud regions`) : 'Your clouds';
  const ends = isColo(f) ? [f.colo.a.site || 'Colo A', f.colo.b.site || 'Colo B']
    : f.ctype === 'Cloud to Cloud' ? [f.regions[0] || 'Your cloud region', regionEnd(f.regions.slice(1)) === 'Your clouds' ? 'Your other clouds' : regionEnd(f.regions.slice(1))]
    : [isInternet(f) && !sites.length && !f.bulk ? 'The internet' : siteEnd, regionEnd(f.regions)];
  const pathSrc = fits(ends[0]) ? ends[0] : 'Your sites', pathDst = fits(ends[1]) ? ends[1] : 'Your clouds';
  return { lines, policies, monthly, priced: monthly > 0, tier, title: f.name.trim() || defaultName(f), pathSrc, pathDst, pathDesc: [f.ctype, regionsWords(f), locWords(f)].filter(Boolean).join(' · '), shield: f.policy.includes('Inline inspection') || f.policy.includes('No direct internet path'), wires: tier === 'Standard' ? 1 : 2, savings: 0, days: 10 };
}
/** StandardWizard.tsx deriveStandardName: type, providers, location. */
export function defaultName(f) {
  if (isColo(f)) return f.colo.a.site && f.colo.b.site ? `${f.colo.a.site} to ${f.colo.b.site} colo bridge` : 'Colo to Colo';
  return [f.ctype || 'New connection', cloudsOf(f).join(' + '), locWords(f)].filter(Boolean).join(' - ');
}
/** The monthly price on a term: Review's discount off the priced lines. */
export function termPrice(monthly, term) {
  const d = TERM_DISC[term] || 0;
  return Math.round(monthly * (1 - d / 100));
}
/** A priceable order: the type and what it reaches are chosen. A number with nothing chosen is a fabrication (CostSummaryPill.tsx). */
export const priceable = (f) => !!f.ctype && (isColo(f) ? !!(f.colo.a.site && f.colo.b.site) : f.regions.length > 0);

/**
 * What a tier gets you, from the path the type rides (R.PATHS: security,
 * latency for the chosen region) and the order at that tier (CATALOG x the
 * tier multiplier). Modelled, and it says so.
 */
export function tierGets(f, est, tier) {
  // Priced as the order it would be once picked: on AWS alone, Internet or VPN
  // to Cloud at Maximum is Interconnect - Last Mile (wizardDoor.ts tierForkArmed).
  const g = { ...f, tier };
  const p = pathOf(g), r = sampleRegion(g, est);
  const o = flowOrder(g, est);
  return {
    tier,
    becomes: isLmcc(g) && f.ctype !== LAST_MILE.label ? 'Becomes Interconnect - Last Mile' : '',
    protects: (isColo(f) ? COLO_TIER_PROTECTS : TIER_PROTECTS)[tier] || '',
    security: p.sec.split(' · ')[0],
    securitySub: p.sec.split(' · ').slice(1).join(' · '),
    performance: r ? p.latLabel(r) : 'Pick a region for its latency',
    cost: priceable(f) && o.priced ? `${fmt(o.monthly)}/mo` : 'Priced once the type and region are chosen',
    costSub: priceable(f) && o.priced ? MODELLED : '',
  };
}

// ---------- Location ----------
/** This estate's metros (where its sites are, and nearest its cloud regions), by area. */
export function metroOptions(f, est) {
  const opt = (m) => ({ metro: m, area: regionOf({ metro: m }), near: nearWords(m, est), nearAll: nearAll(m, est).join(', ') });
  if (isLmcc(f)) return LMCC_METROS.map(opt);
  const sm = sitesOf(est).map(x => x.metro).filter(metroOk);
  const rm = regionsOf(est).map(r => REGION_GEO[r.region]);
  const all = uniq([...sm, ...rm]);
  return all.map(opt)
    .sort((a, b) => AREA_ORDER.indexOf(a.area) - AREA_ORDER.indexOf(b.area) || a.metro.localeCompare(b.metro));
}
/** What of yours is at a metro: every name (a chip's title), and two of them with "and others" on the chip. */
export function nearAll(m, est) {
  return [...sitesOf(est).filter(x => x.metro === m).map(x => x.name), ...regionsOf(est).filter(x => REGION_GEO[x.region] === m).map(regionName)];
}
function nearWords(m, est) { return someOf(nearAll(m, est)); }
/**
 * The sites an order carries: the ones attached, else the type's sites at the
 * chosen location. Internet to Cloud is the public internet reaching a cloud
 * region (CreateConnectionMenu.tsx: "Public internet on-ramp"), so it finds
 * none of its own; Colo to Colo and Cloud to Cloud join cages and clouds.
 */
export function orderSites(f, est) {
  if (f.sites.length) return f.sites.map(n => resolveSite(est, n) || { name: n, cls: '', metro: '' });
  if (!f.loc.length || isInternet(f) || isColo(f) || f.ctype === 'Cloud to Cloud') return [];
  const t = typeOf(f.ctype);
  const test = t && SITE_TEST[t.key];
  return sitesOf(est).filter(x => f.loc.includes(x.metro) && (!test || test(x)));
}

// ---------- The order, in progress (WizardTopology.tsx, in the storefront's words) ----------
const say = (st) => (st === 'you' ? 'You picked' : st === 'estate' ? 'From your estate' : 'Not chosen yet');
const c2c = (f) => f.ctype === 'Cloud to Cloud';
/** Whether an order carries sites at all: Colo to Colo joins two cages, Cloud to Cloud two clouds. */
export const carriesSites = (f) => !isColo(f) && !c2c(f) && !(isInternet(f) && !f.sites.length && !f.bulk);
const siteNoun = (f) => { const t = typeOf(f.ctype); return (t && SITE_NOUN[t.key]) || ['site', 'sites']; };
/**
 * The rows of "Your order, in progress": each value marked picked by you,
 * filled from your estate, or not chosen yet, and the step that sets it. A
 * row naming more than two sites or regions carries "All N", which opens
 * exactly those (wipList).
 */
export function wipRows(f, est) {
  const colo = isColo(f);
  const sites = orderSites(f, est);
  const siteVal = f.bulk || (sites.length ? (sites.length <= 2 ? sites.map(siteLine).join('; ') : someOf(sites.map(x => x.name))) : f.loc.length ? `No ${siteNoun(f)[1]} in ${locWords(f)}` : '');
  // Attached sites keep where they came from; sites the flow found at the location are your estate's.
  const siteFrom = f.bulk || f.sites.length ? (f.from.sites || 'estate') : sites.length || f.loc.length ? 'estate' : null;
  const rows = [
    ['type', 'Connection type', f.ctype, f.from.ctype, 'type', null],
    colo ? ['cloud', 'Colo endpoints', coloWords(f), f.colo.a.site || f.colo.b.site ? f.from.colo : null, 'endpoints', null]
      : ['cloud', c2c(f) ? 'Clouds and regions' : 'Cloud and region', regionsWords(f), f.regions.length ? f.from.regions : null, 'provider', f.regions.length > 2 ? 'regions' : null],
    ['sites', 'Sites', siteVal, siteFrom, 'basic', !f.bulk && sites.length > 2 ? 'sites' : null],
    ['loc', 'Location', colo ? [f.colo.a.site, f.colo.b.site].map(n => (resolveSite(est, n) || {}).metro).filter(metroOk).join(' + ') : locWords(f), colo ? (f.colo.a.site ? f.from.colo : null) : f.loc.length ? f.from.loc : null, colo ? 'endpoints' : 'basic', null],
    ['bandwidth', 'Bandwidth', f.bandwidth, f.bandwidth ? f.from.bandwidth : null, 'basic', null],
    ['tier', 'Resiliency', f.tier || 'Standard until you pick', f.tier ? f.from.tier : null, 'basic', null],
    ['term', 'Contract term', f.term === null || f.term === undefined ? '' : termTitle(f.term), f.term === null || f.term === undefined ? null : f.from.term, 'terms', null],
    ['policy', 'Policy', f.policy.join(', '), f.policy.length ? f.from.policy : null, stepKeysFor(f).includes('advanced') ? 'advanced' : 'confirm', null],
  ];
  return rows.filter(r => r[0] !== 'sites' || carriesSites(f)).map(([key, label, value, st, step, more]) => {
    const has = !!value && !!st;
    const state = has ? st : 'none';
    const n = more === 'sites' ? sites.length : more === 'regions' ? f.regions.length : 0;
    return { key, label, value: has ? value : (key === 'tier' || (key === 'sites' && value) ? value : 'Not chosen yet'), state, word: say(state), step, more, hasMore: !!more, moreLabel: more ? `All ${n} ${more}` : '' };
  });
}
/** What "All N sites" or "All N regions" opens: exactly the members the row counted. */
export function wipList(f, est, kind) {
  if (kind === 'sites') return { kind, title: 'Sites in this order', all: orderSites(f, est).map(x => ({ key: 's:' + x.name, name: x.name, sub: [x.cls, metroOk(x.metro) ? x.metro : '', x.access].filter(Boolean).join(' · ') })) };
  const regionRow = (n) => { const r = regionsOf(est).find(x => regionName(x) === n) || {}; return { key: 'r:' + n, name: n, sub: [r.priv === undefined ? '' : r.priv ? 'Private today' : 'Public internet today', REGION_GEO[r.region] || ''].filter(Boolean).join(' · ') }; };
  if (kind === 'others') return { kind, title: `Linked to ${f.regions[0]}`, all: f.regions.slice(1).map(regionRow) };
  if (kind === 'regions') return { kind, title: 'Cloud regions in this order', all: f.regions.map(regionRow) };
  return { kind: null, title: '', all: [] };
}
/** The order's running monthly price, or why there is none yet. */
export function wipPrice(f, est) {
  if (!priceable(f)) return { has: false, big: '', line: isColo(f) ? 'Priced once both colo endpoints are chosen' : 'Priced once the type and cloud are chosen', sub: '' };
  const o = flowOrder(f, est);
  if (!o.priced) return { has: false, big: '', line: PRICE_NOTE, sub: '' };
  const hasTerm = f.term !== null && f.term !== undefined;
  const now = hasTerm ? termPrice(o.monthly, f.term) : o.monthly;
  return { has: true, big: fmt(now), line: hasTerm ? `${termTitle(f.term)}${TERM_DISC[f.term] ? `, ${TERM_DISC[f.term]}% off ${fmt(o.monthly)}/mo` : ''}` : 'Month-to-month until you pick a term', sub: MODELLED };
}
/**
 * The path picture's three ends (wizardTopologyBuilder.ts: set or ghost,
 * filling in as steps are made). An end that counts ("3 sites", "2 regions")
 * opens the same list its panel row does.
 */
export function wipDiagram(f, est) {
  const o = flowOrder(f, est);
  const sites = orderSites(f, est);
  const many = (xs, noun) => xs.length === 1 ? xs[0] : xs.length ? `${xs.length} ${noun}` : '';
  let left, right, leftKind = null, rightKind = null;
  if (isColo(f)) { left = f.colo.a.site || ''; right = f.colo.b.site || ''; }
  else if (c2c(f)) { left = f.regions[0] || ''; right = many(f.regions.slice(1), 'regions'); rightKind = f.regions.length > 2 ? 'others' : null; }
  else if (!carriesSites(f)) { left = 'The internet'; right = many(f.regions, 'regions'); rightKind = f.regions.length > 1 ? 'regions' : null; }
  else {
    left = f.bulk ? f.bulk.split(' · ')[0] : many(sites.map(x => x.name), 'sites'); leftKind = !f.bulk && sites.length > 1 ? 'sites' : null;
    right = many(f.regions, 'regions'); rightKind = f.regions.length > 1 ? 'regions' : null;
  }
  return {
    left: left || (isColo(f) ? 'Colo A' : c2c(f) ? 'Cloud region' : 'Your sites'), leftSet: !!left, leftOpens: !!leftKind, leftKind,
    right: right || (isColo(f) ? 'Colo B' : c2c(f) ? 'Second cloud' : 'Cloud region'), rightSet: !!right, rightOpens: !!rightKind, rightKind,
    mid: f.loc.length ? locWords(f) : 'Location not chosen', midSet: f.loc.length > 0,
    bw: f.bandwidth || '', dual: tierOf(f) !== 'Standard' && !!f.tier, shield: o.shield,
  };
}

// ---------- The policy, in Govern's words ----------
/**
 * "When <match> reaches <scope>, require <req>": the order's own ends, named
 * rather than counted, and the verb agreeing with them.
 */
export function policySentence(f, est) {
  const req = f.policy.map(x => x.toLowerCase()).join(' and ') || 'what you pick below';
  const scopeOf = (rs) => rs.length === 1 ? rs[0] : rs.length === 2 ? `${rs[0]} and ${rs[1]}` : rs.length ? 'the cloud regions in this order' : 'the cloud';
  if (isColo(f)) return { match: f.colo.a.site || 'Colo A', verb: 'reaches', scope: f.colo.b.site || 'Colo B', req };
  if (c2c(f)) return { match: f.regions[0] || 'your first cloud', verb: 'reaches', scope: f.regions.length > 1 ? scopeOf(f.regions.slice(1)) : 'your second cloud', req };
  // Internet to Cloud: the region is what the policy guards, and the internet is its far end.
  if (!carriesSites(f)) return { match: f.regions.length ? scopeOf(f.regions) : 'the cloud region', verb: f.regions.length > 1 ? 'reach' : 'reaches', scope: 'the internet', req };
  const sites = orderSites(f, est);
  let match, one;
  if (f.bulk) { match = f.bulk.split(' · ')[0]; one = (f.qty || 1) === 1; }
  else if (sites.length === 1) { match = sites[0].name; one = true; }
  else if (sites.length === 2) { match = `${sites[0].name} and ${sites[1].name}`; one = false; }
  else if (sites.length) { match = 'the sites in this order'; one = false; }
  else { match = f.loc.length ? `your sites in ${locWords(f)}` : 'your sites'; one = false; }
  return { match, verb: one ? 'reaches' : 'reach', scope: scopeOf(f.regions), req };
}

// ---------- Which types fit what an order already carries ----------
/** "Fits Charlotte branch": the attached sites and regions a type applies to, by name. */
export function fitsOf(est, key, f) {
  const a = appliesTo(est, key);
  if (!a || (!f.sites.length && !f.regions.length)) return '';
  const names = new Set(a.items.map(x => a.kind === 'sites' ? x.name : regionName(x)));
  const hit = (a.kind === 'sites' ? f.sites : f.regions).filter(n => names.has(n));
  return hit.length ? `Fits ${hit.length <= 2 ? hit.join(' and ') : 'what you attached'}` : '';
}

// ---------- A placed order ----------
/** What the Orders page keeps of a placed order: its words, its price, its stage, and the region it reaches. Never invented history. */
export function placedRecord(f, est, at, n) {
  const o = flowOrder(f, est);
  const hasTerm = f.term !== null && f.term !== undefined;
  const r = regionsOf(est).find(x => regionName(x) === f.regions[0]);
  return {
    id: `o${n}`, title: o.title, type: f.ctype || '', what: [f.regions.join(', ') || coloWords(f), locWords(f), f.bandwidth || '', tierOf(f)].filter(Boolean).join(' · '),
    monthly: o.priced ? `${fmt(hasTerm ? termPrice(o.monthly, f.term) : o.monthly)}/mo · Modelled` : PRICE_NOTE,
    term: hasTerm ? termTitle(f.term) : '', policy: f.policy.join(', '), at, stage: ORDER_STAGE, region: r ? r.region : null, fromFlow: true,
  };
}

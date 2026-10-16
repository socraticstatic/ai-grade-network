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
import * as W from './naas-ways.js';
import { PATHS } from './naas-round2.js';
import { countOf, servicesOf } from './naas-sites.js';
import { fmt, plural, siteModeOf, regionOf, filterSites, tunnelOf } from './naas-logic.js';
import { gbps } from './naas-paths.js';

// ---------- The connection types (CreateConnectionMenu.tsx OPTIONS) ----------
export const CONNECTION_TYPES = [
  { key: 'internet', label: 'Internet to Cloud', description: 'Public internet on-ramp with DDoS protection' },
  { key: 'c2c', label: 'Cloud to Cloud', description: 'Private backbone linking two clouds through one Hub' },
  { key: 'dc', label: 'DataCenter / CoLocation to Cloud', description: 'Direct fiber cross-connect from your data center' },
  { key: 'vpn', label: 'AVPN to Cloud', description: 'Private connectivity over AT&T MPLS' },
  { key: 'iot', label: 'IoT to Cloud', description: 'Private APN connectivity for your 4G/5G IoT devices' },
  { key: 'layer2', label: 'Layer 2 to Cloud', description: 'ASEoD Ethernet from your Layer 2 branch offices' },
  { key: 'colo', label: 'Colo to Colo', description: "Bridge two colo cages over AT&T's private network" },
  { key: 'site', label: 'Site to Cloud', description: 'Branch / SD-WAN connectivity - coming soon', disabled: true },
];
// LMCC_OPTION: a product, not a type, so the menu files it in its own category.
export const LAST_MILE = { key: 'lmcc', label: 'Interconnect - Last Mile', description: 'Maximum-resiliency AWS interconnect · 4 paths across 2 sites in one metro', category: 'AWS Interconnect' };
export const ALL_TYPES = [...CONNECTION_TYPES, LAST_MILE];
// Which clouds carry which types (providerConnectionTypes.ts): the majors carry six, IBM two, and a cloud outside the
// table carries Internet to Cloud alone. Interconnect - Last Mile is AWS. Colo to Colo picks fabrics, not clouds.
const MAJOR_TYPES = ['Internet to Cloud', 'AVPN to Cloud', 'Cloud to Cloud', 'DataCenter / CoLocation to Cloud', 'IoT to Cloud', 'Layer 2 to Cloud'];
export const TYPE_CLOUDS = { AWS: MAJOR_TYPES, Azure: MAJOR_TYPES, GCP: MAJOR_TYPES, 'Google Cloud': MAJOR_TYPES, Oracle: MAJOR_TYPES, IBM: ['Internet to Cloud', 'AVPN to Cloud'] };
export const cloudCarries = (cloud, ctype) => !ctype ? true : ctype === LAST_MILE.label ? cloud === 'AWS' : (TYPE_CLOUDS[cloud] || ['Internet to Cloud']).includes(ctype);
// The inventories NetBond Advanced's profile step reads (serviceInventories.ts, its demo data): IoT rides a private
// APN into a VPN, so the mapping is the access side; Layer 2 rides an ASEoD EVC whose committed rate caps the bandwidth.
export const APN_VPN = [
  { id: 'apn-carparts-tx', apn: 'CarpartsAPN', vpn: 'TXwarehouseVPN', region: 'Texas', devices: 4200, status: 'Active' },
  { id: 'apn-acparts-ok', apn: 'ACpartsAPN', vpn: 'OKwarehouseVPN', region: 'Oklahoma', devices: 1850, status: 'Active' },
  { id: 'apn-fleettrack', apn: 'FleetTrackAPN', vpn: 'NationalFleetVPN', region: 'National', devices: 12600, status: 'Active' },
  { id: 'apn-meternet', apn: 'MeterNetAPN', vpn: 'GulfCoastVPN', region: 'Gulf Coast', devices: 7300, status: 'Provisioning' },
];
export const EVCS = [
  { id: 'Dalsales-EVC-11152', uni: 'Dallas, TX', cir: 1000, status: 'Active' },
  { id: 'Houmkt-EVC-11153', uni: 'Houston, TX', cir: 500, status: 'Active' },
  { id: 'Auseng-EVC-11154', uni: 'Austin, TX', cir: 10000, status: 'Active' },
  { id: 'Chiops-EVC-11201', uni: 'Chicago, IL', cir: 1000, status: 'Provisioning' },
];
export const apnOf = (id) => APN_VPN.find(m => m.id === id) || null;
export const evcOf = (id) => EVCS.find(e => e.id === id) || null;
export const apnWords = (m) => `${m.apn} → ${m.vpn}`;
export const cirWords = (mbps) => (mbps >= 1000 ? `${mbps / 1000} Gbps` : `${mbps} Mbps`);
export const bwMbps = (bw) => (/gbps/i.test(bw || '') ? (parseFloat(bw) || 0) * 1000 : parseFloat(bw) || 0);
export const isIot = (f) => f.ctype === 'IoT to Cloud';
export const isL2 = (f) => f.ctype === 'Layer 2 to Cloud';
/** The bandwidth ceiling: the chosen EVC's CIR on Layer 2, none elsewhere. */
export const cirOf = (f) => (isL2(f) && evcOf(f.evc) ? evcOf(f.evc).cir : Infinity);
/** Service access type per cloud (serviceAccessTypes.ts); IoT is pinned to L3VPN. */
export const SERVICE_ACCESS = ['L3VPN', 'Internet', 'Ethernet', 'Layer2', 'Restricted'];
/** Subnets are advertised over every routed order; VPN is tunnel-addressed, IoT addresses from the APN pool, Layer 2 carries Ethernet. */
export const showSubnets = (f) => !isHosted(f) && !isColo(f) && !isLmcc(f) && !['AVPN to Cloud', 'IoT to Cloud', 'Layer 2 to Cloud'].includes(f.ctype);
/** Last Mile's key fork: a key pasted from AWS already holds the metro, the bandwidth and the account. */
export const keyPasted = (f) => isLmcc(f) && f.keySource === 'aws';
export const isValidAwsAccount = (id) => /^\d{12}$/.test(String(id || '').trim());
/** Colo to Colo's transport, derived from bandwidth and metro pair (coloBilling.ts coloTransportLabel). */
export const coloTransport = (mbps, sameMetro) => `${mbps >= 10000 ? 'Wavelength' : 'Ethernet (ASE)'} ${sameMetro ? 'Metro' : 'LH'}`;
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
// One price rule for the bandwidth a catalog price covers (skeptic, 2026-09-30): a product's
// "Up to N Gbps" line (NetBond Advanced: Up to 10 Gbps, a connection or a port). Past it, AT&T
// prices it after review, here and in Modify bandwidth (naas-bandwidth.js PORT_CEIL_MBPS).
const UNIT_MBPS = { M: 1, G: 1000 };
/** '100 Gbps' is 100000; '500 Mbps' is 500; anything else is 0. */
export const mbpsOf = (label) => { const m = /^(\d+(?:\.\d+)?) (M|G)bps$/.exec(String(label || '')); return m ? +m[1] * UNIT_MBPS[m[2]] : 0; };
/** The bandwidth a product's catalog price covers, in Mbps; Infinity where the catalog names none. */
export const ceilMbpsOf = (p) => [...((p && p.included) || []), ...((p && p.limits) || [])].map(x => /^Up to (\d+(?:\.\d+)?) (M|G)bps$/.exec(x)).filter(Boolean).map(m => +m[1] * UNIT_MBPS[m[2]])[0] ?? Infinity;

// ---------- Places (moved from naas-app.js) ----------
// The metro nearest a cloud region, the storefront's one table of it. GCP europe-west1 is in Belgium; Amsterdam is
// the nearest metro Compose offers (the skeptic, 2026-09-30: missing, its Attach door opened US East, no location).
export const REGION_GEO = { 'us-east-1': 'Ashburn', 'us-east-2': 'Chicago', 'us-west-2': 'Seattle', 'eu-central-1': 'Frankfurt', 'eu-west-1': 'London', 'ap-southeast-1': 'Singapore', eastus: 'Ashburn', westeurope: 'Amsterdam', centralus: 'Dallas', 'us-central1': 'Chicago', 'us-east-04': 'New York', 'uk-south': 'London', 'europe-west1': 'Amsterdam', 'us-ashburn-1': 'Ashburn', 'eu-frankfurt-1': 'Frankfurt' };
// The policy a control ships as, in Govern's words (moved from naas-app.js).
export const POLICY_FOR_CONTROL = { 'Private path required': { match: 'tag PCI', req: 'Private path required' }, 'No direct internet path': { match: 'tag Prod', req: 'No direct internet path' }, 'Inline inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Inline security inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Segment by tag': { match: 'branch Finance', req: 'Segment intra-tag only' }, 'Priority traffic': { match: 'tag GPU', req: 'Priority traffic' }, 'Cost-aware routing': { match: 'region *', req: 'Cost-aware routing' } };
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
  vpn: (x) => servicesOf(x).some(v => v.key === 'avpn'),
  iot: (x) => /mobility/i.test(x.access || '') || /^(Mobility|Edge)$/.test(x.cls || ''),
  layer2: (x) => /\bASE\b/.test(x.access || ''),
  site: (x) => x.cls === 'Branch',
};
const SITE_NOUN = { dc: ['data center', 'data centers'], colo: ['data center', 'data centers'], vpn: ['site on AVPN', 'sites on AVPN'], iot: ['wireless or IoT site', 'wireless and IoT sites'], layer2: ['site on Switched Ethernet', 'sites on Switched Ethernet'], site: ['branch site', 'branch sites'] };
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
/**
 * The estate by how it connects to its clouds today (the 2026-10-06 session: "four or five boxes showing what the
 * connection summary looks like ... 214 sites on the VPN, 5 data centers ... internet sites connected to 4 clouds").
 * Each box counts with the map's own site filter, so its door opens exactly what it counted, and says how many
 * clouds those sites reach (a stated tunnel its one cloud, otherwise every cloud it sends to).
 */
export function connectSummary(est) {
  const sites = sitesOf(est), rs = regionsOf(est);
  if (!sites.length && !rs.length) return [];
  const reached = (xs) => { const cl = new Set(); xs.forEach(x => { const t = tunnelOf(x); if (t) { cl.add(t.cloud); return; } rs.forEach(r => { if (gbps(est, x, r) > 0) cl.add(r.cloud); }); }); return cl.size; };
  const box = (key, icon, filter, one, many, short) => { const xs = filterSites(sites, filter), n = xs.reduce((a, x) => a + countOf(x.name), 0);
    return { key, icon, kind: 'sites', filter, n, noun: n === 1 ? one : many, short, clouds: reached(xs) }; };
  const clouds = new Set(rs.map(r => r.cloud)).size;
  return [
    box('vpn', 'hub', { svc: ['avpn'] }, 'site on AVPN', 'sites on AVPN', 'on AVPN'),
    box('internet', 'globe', { reach: 'internet' }, 'site over the internet', 'sites over the internet', 'on internet'),
    box('dc', 'large-building', { cls: 'Data center' }, 'data center', 'data centers', 'data centers'),
    box('iot', 'wireless-network', { kind: 'iot' }, 'wireless or IoT site', 'wireless and IoT sites', 'IoT'),
    { key: 'clouds', icon: 'cloud', kind: 'regions', filter: null, n: rs.length, noun: rs.length === 1 ? 'cloud region' : 'cloud regions', short: 'regions', clouds },
  ].map(b => ({ ...b, cloudWord: b.kind === 'regions' ? `across ${plural(b.clouds, 'cloud', 'clouds')}` : b.n ? `to ${plural(b.clouds, 'cloud', 'clouds')}` : 'None yet' }));
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
    // A move on Recommended names what must always be true for its set (its tags' policies); the order starts with it,
    // filled from your estate, so Advanced Settings shows it rather than "Not chosen yet" (2026-10-06 notes, C9).
    if (cp.origin === 'options') est_('policy', (cp.control || []).slice());
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
  // A hosted order (the storyboards, 2026-10-16): the cloud picked alone, the way's intake, the grant.
  f.intake = { ...(cp.intake || {}) }; f.grant = !!cp.grant;
  // NetBond Advanced's branches (2026-10-16): Last Mile's account, key source and routed networks; IoT's APN-VPN; Layer 2's EVC;
  // the subnets and the service access of Advanced Settings.
  f.awsAccount = cp.awsAccount || ''; f.keySource = cp.keySource === 'aws' ? 'aws' : 'att'; f.actKey = cp.actKey || ''; f.routed = cp.routed || '';
  f.apn = cp.apn || null; f.evc = cp.evc || null; f.subnets = cp.subnets || ''; f.access = { ...(cp.access || {}) };
  for (const k of ['ctype', 'regions', 'sites', 'loc', 'bandwidth', 'tier', 'policy', 'term']) {
    if (cp[k] !== undefined && cp[k] !== null) { f[k] = Array.isArray(cp[k]) ? cp[k].slice() : cp[k]; f.from[k] = from[k] || 'you'; typed.delete(k); }
  }
  // The clouds are Choose Provider's own field (the storyboards, 2026-10-16: the cloud first, the region once, on
  // Connection Profile). Picked, they are yours; regions an entry or a sentence filled name their clouds, from the same source.
  const picked = cp.clouds ? cp.clouds.slice() : cp.cloud ? [cp.cloud] : [];
  f.clouds = picked.length ? picked : uniq(f.regions.map(cloudOfName));
  if (picked.length) f.from.clouds = from.clouds || from.cloud || 'you';
  else if (f.clouds.length) { f.from.clouds = f.from.regions; if (typed.has('regions')) typed.add('clouds'); }
  f.cloud = f.clouds[0] || null;
  if (cp.colo) f.from.colo = from.colo || 'you';
  f.typed = [...typed];
  // The way into the cloud (2026-10-06): picked on a Recommended option or a Ways to connect card, carried by the order.
  const setWay = sets.map(x => x.way).find(Boolean) || null;
  f.way = cp.way || setWay;
  if (f.way) f.from.way = cp.way ? (from.way || 'you') : 'estate';
  f.origin = cp.origin || null;
  // Interconnect - Last Mile IS Maximum resiliency on AWS.
  if (f.ctype === LAST_MILE.label) { f.tier = 'Maximum'; f.from.tier = f.from.ctype; }
  // Where the path enters the AT&T network, when an entry named it only through its sites or regions.
  // The flow filled it (the metro of the site, or nearest the region), so it
  // reads From your estate until you pick one yourself: you never chose it.
  if (!f.loc.length && cp.loc == null && !isHosted(f) && !isIot(f)) {
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

export const cloudsOf = (f) => ((f.clouds || []).length ? f.clouds.slice() : uniq((f.regions || []).map(cloudOfName)));
export const tierOf = (f) => f.tier || 'Standard';
/** wizardDoor.ts isLmccPath + tierForkArmed: Internet to Cloud, AWS alone, Maximum (AVPN is private already). */
export function isLmcc(f) {
  if (f.ctype === LAST_MILE.label) return true;
  if (f.ctype !== 'Internet to Cloud') return false;
  const c = cloudsOf(f);
  return c.length === 1 && c[0] === 'AWS' && tierOf(f) === 'Maximum';
}
export const isColo = (f) => f.ctype === 'Colo to Colo';
/** A hosted way's order: AT&T's hub in the region, peered or linked to your network; no customer site end. */
export const isHosted = (f) => !!(f.way && W.wayHosted(f.way));
/** The types an order may carry: a hosted order only those whose far end is a cloud (the storyboards struck Layer 2,
 *  Colo to Colo and Interconnect); any other order all nine. */
export const typesFor = (f) => (isHosted(f) ? CONNECTION_TYPES.filter(t => ['internet', 'c2c', 'dc', 'vpn', 'iot'].includes(t.key)) : ALL_TYPES);

// ---------- A hosted order's intake and grant (the storyboards, 2026-10-16) ----------
// The deck's own fields: peering wants the network and its address space (checked against the hub's IPAM, then AT&T
// assigns the peering and you accept it in your console); a Private Link Service wants the link service and both ends
// (AT&T builds the endpoint in your resource group, the link service in your account and the endpoint in its hub).
// Each field: key, label, example, and how a block asks for it.
const NET_ID = { Azure: [['subscriptionId', 'Subscription ID', '7f3a1c2e-9b4d-4e8f-a1b2-3c4d5e6f7a8b', 'subscription ID'], ['vnetName', 'VNet name', 'prod-vnet-eastus', 'VNet name']],
  AWS: [['accountId', 'Account ID', '123456789012', 'account ID'], ['vpcId', 'VPC ID', 'vpc-0a1b2c3d4e5f', 'VPC ID']],
  GCP: [['projectId', 'Project ID', 'calloway-prod', 'project ID'], ['vpcName', 'VPC network', 'prod-vpc', 'VPC network']] };
const CIDRS = ['cidrs', 'Address space', '10.20.0.0/16, 10.21.0.0/16', 'address space'];
const PLS_ENDS = [['attDestIp', 'Destination on the AT&T network', '10.12.4.31', 'destination on the AT&T network'], ['workloadIp', 'Your workload IP', '10.20.1.15', 'workload IP']];
export const INTAKE = {
  peer: { title: (cloud) => `Your ${cloud === 'AWS' ? 'VPC' : cloud === 'GCP' ? 'VPC network' : 'VNet'}`, overlap: true,
    line: "AT&T peers its hub to this network. Once your address space clears AT&T's IPAM for this cloud, AT&T assigns the peering and you accept it in your console.",
    fields: (cloud) => [...(NET_ID[cloud] || NET_ID.Azure), CIDRS] },
  privatelink: { title: () => 'Your link service', overlap: false,
    line: 'AT&T creates a private endpoint in your resource group targeting AT&T Private Link, a link service in your account on a Standard SKU load balancer in this region, and an endpoint in its hub. Overlapping address space is fine.',
    fields: (cloud) => cloud === 'AWS' ? [NET_ID.AWS[0], ['nlbArn', 'Network Load Balancer ARN', 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/pls/abc', 'load balancer ARN'], ...PLS_ENDS]
      : cloud === 'GCP' ? [NET_ID.GCP[0], ['attachment', 'Service attachment', 'projects/calloway-prod/regions/us-central1/serviceAttachments/pls', 'service attachment'], ...PLS_ENDS]
      : [['plsAlias', 'Link service alias', 'calloway-pls', 'link service alias'], ['lbFrontend', 'Frontend IP config: name, VNet, subnet', 'fe-1, prod-vnet, snet-pls', 'frontend IP config'],
        ['lbBackend', 'Backend pool: name, NIC', 'be-1, nic-app-01', 'backend pool'], ['lbProtocol', 'Inbound protocol', 'TCP', 'inbound protocol'], ...PLS_ENDS] },
  transit: { title: (cloud) => `Your ${cloud === 'AWS' ? 'VPC' : 'VNet'}`, overlap: false, line: "AT&T shares its transit gateway with this network; you attach it and update its route table.", fields: (cloud) => NET_ID[cloud] || NET_ID.Azure },
  cloudwan: { title: (cloud) => `Your ${cloud === 'AWS' ? 'VPC' : 'VNet'}`, overlap: false, line: "AT&T's core network edge takes this network as an attachment; you join it to a segment.", fields: (cloud) => NET_ID[cloud] || NET_ID.Azure },
};
/** What the customer grants so AT&T can provision on their behalf. Azure's is the deck's; the others are AT&T's to confirm. */
export const GRANT = { Azure: 'A service principal with Lighthouse Network Write on the resource group', AWS: "A cross-account role scoped to the VPC; its permissions are AT&T's to confirm", GCP: "A service account with network admin on the project; AT&T's to confirm" };
const hostedCloud = (f) => f.cloud || cloudsOf(f)[0] || null;
/** A hosted order's intake: its title, its line and its fields with their values. */
export function intakeOf(f) {
  const spec = isHosted(f) && INTAKE[f.way]; const cloud = hostedCloud(f);
  if (!spec || !cloud) return null;
  return { title: spec.title(cloud), line: spec.line, overlap: spec.overlap, fields: spec.fields(cloud).map(([key, label, example, ask]) => ({ key, label, example, ask, value: f.intake[key] || '' })) };
}
/** The first field still empty, as a block asks for it; '' when all are in. */
export const intakeMissing = (f) => { const it = intakeOf(f); const m = it && it.fields.find(x => !x.value.trim()); return m ? `Enter your ${m.ask}.` : ''; };
/** An IPv4 CIDR as [first, last], or null. */
const cidrRange = (s) => { const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(String(s || '').trim()); if (!m) return null;
  const oct = m.slice(1, 5).map(Number), bits = +m[5]; if (oct.some(o => o > 255) || bits > 32) return null;
  const ip = ((oct[0] << 24) >>> 0) + (oct[1] << 16) + (oct[2] << 8) + oct[3], size = 2 ** (32 - bits), first = Math.floor(ip / size) * size; return [first, first + size - 1]; };
/** Your address space against the hub's: AT&T keeps an IPAM per cloud, and an overlap stops a peering. */
export function overlapOf(cidrs, cloud, region) {
  const hub = W.HUB_CIDR[`${cloud} ${region}`] || null, hr = hub ? cidrRange(hub) : null;
  const parts = String(cidrs || '').split(/[,;\s]+/).filter(Boolean);
  if (!parts.length) return { ok: false, text: '' };
  for (const p of parts) { const r = cidrRange(p); if (!r) return { ok: false, text: `Enter address space as CIDR ranges, like 10.20.0.0/16; ${p} is not one.` };
    if (hr && r[0] <= hr[1] && r[1] >= hr[0]) return { ok: false, text: `${p} overlaps AT&T's hub (${hub}). Change it.` }; }
  return { ok: true, text: hub ? `No overlap with AT&T's hub (${hub})` : 'No AT&T hub range on record for this region yet' };
}
/** The regions of the chosen cloud, each saying whether AT&T has a hub there. */
export function hubRegionsOf(f, est) {
  const cloud = f.cloud; if (!cloud) return [];
  return regionsOf(est).filter(r => r.cloud === cloud).map(r => { const hub = W.hubIn(r.cloud, r.region);
    return { name: regionName(r), region: r.region, cloud: r.cloud, hub, why: hub ? 'AT&T hub in this region' : 'No AT&T hub in this region yet', sub: r.priv ? 'Private today' : 'Public internet today' }; });
}
/** Connection Profile's regions (the storyboards, 2026-10-16): the chosen clouds' regions from discovery, by cloud; a hosted order offers only those with an AT&T hub. */
export function regionChoicesOf(f, est) {
  const hosted = isHosted(f);
  return cloudsOf(f).map(cloud => ({ cloud, regions: regionsOf(est).filter(r => r.cloud === cloud).map(r => { const hub = W.hubIn(r.cloud, r.region), off = hosted && !hub;
    return { name: regionName(r), region: r.region, cloud: r.cloud, hub, off, why: hosted ? (hub ? 'AT&T hub in this region' : 'No AT&T hub in this region yet') : '', sub: r.priv ? 'Private today' : 'Public internet today', priv: !!r.priv }; }) }));
}
/** The grant as the row and the step read it. */
export const grantWords = (f) => GRANT[hostedCloud(f)] || GRANT.Azure;
/** Internet to Cloud, still itself: the internet is its far end (the tier fork to Last Mile makes it an AWS interconnect). */
export const isInternet = (f) => f.ctype === 'Internet to Cloud' && !isLmcc(f);
/** wizardDoor.ts stepKeysForState. */
export function stepKeysFor(f) {
  if (isColo(f)) return STD_STEP_KEYS_COLO;
  if (isLmcc(f)) return f.lmccExpress && f.regions.length ? STD_STEP_KEYS_LMCC_EXPRESS : STD_STEP_KEYS_LMCC;
  return STD_STEP_KEYS;
}
export const bandwidthsFor = (f) => (isHosted(f) ? W.HOSTED_BANDWIDTHS : isColo(f) ? COLO_BANDWIDTHS : isLmcc(f) ? LMCC_BANDWIDTHS : BANDWIDTHS);
export const tiersFor = (f) => (isHosted(f) ? ['Standard'] : isIot(f) ? [] : isColo(f) ? ['Standard', 'Maximum'] : f.ctype === LAST_MILE.label ? ['Maximum'] : TIERS.filter(t => t !== 'Maximum' || !cloudsOf(f).length || cloudsOf(f).every(c => MAXIMUM_ELIGIBLE.includes(c))));
/** Maximum is shown for AWS, Azure, Oracle and Google; live only for AWS and Azure. */
export const maximumSoon = (f) => { const c = cloudsOf(f); return !isColo(f) && c.length > 0 && !c.every(x => MAXIMUM_LIVE.includes(x)); };

/** Why a step cannot be passed yet, in the person's words; '' when it can. */
export function blockOf(key, f) {
  const clouds = cloudsOf(f);
  switch (key) {
    case 'type': { const t = typeOf(f.ctype); return !t ? 'Pick a connection type.' : t.disabled ? `${t.label} is coming soon. Pick another type.` : ''; }
    case 'provider':
      if (!clouds.length) return 'Pick a cloud.';
      if (f.ctype === 'Cloud to Cloud') return clouds.length >= 2 ? '' : 'Cloud to Cloud links two clouds. Pick a second cloud.';
      if (f.ctype === LAST_MILE.label || isLmcc(f)) return clouds.every(c => c === 'AWS') ? '' : 'Interconnect - Last Mile reaches AWS only.';
      return clouds.length === 1 ? '' : `${f.ctype || 'This type'} carries one cloud. Keep one, or pick Cloud to Cloud.`;
    case 'endpoints': {
      const { a, b } = f.colo;
      if (!a.site || !b.site) return 'Pick a data center for each side.';
      if (a.site === b.site) return 'Pick two different data centers.';
      return a.fabric && b.fabric ? '' : 'Pick what each cage connects through.';
    }
    case 'basic': {
      // The region, once, here (the storyboards, 2026-10-16): one in the chosen cloud, one in each for Cloud to Cloud.
      if (!isColo(f)) {
        if (isHosted(f) && !f.regions.length) return 'Pick a region with an AT&T hub.';
        if (f.ctype === 'Cloud to Cloud' ? clouds.some(c => !f.regions.some(r => cloudOfName(r) === c)) : !f.regions.length) return f.ctype === 'Cloud to Cloud' ? 'Pick a region in each cloud.' : 'Pick a region.';
      }
      if (isHosted(f)) {
        if (!f.bandwidth || !bandwidthsFor(f).includes(f.bandwidth)) return 'Pick a bandwidth.';
        const miss = intakeMissing(f); if (miss) return miss;
        const it = intakeOf(f); if (it && it.overlap) { const ov = overlapOf(f.intake.cidrs, f.cloud, (f.regions[0] || '').split(' ')[1]); if (!ov.ok) return ov.text; }
        return f.grant ? '' : 'Grant AT&T access to provision.';
      }
      if (!isColo(f)) {
        if (keyPasted(f)) return f.actKey.trim().length >= 8 ? '' : 'Paste the activation key from AWS.';
        if (tierOf(f) === 'Maximum' && maximumSoon(f)) return 'Maximum is live for AWS and Azure. Coming soon for this provider.';
        if (isIot(f)) { if (!f.apn) return 'Pick the APN-VPN mapping.'; }
        else {
          if (isL2(f) && !f.evc) return 'Pick the EVC this order rides.';
          const need = tierOf(f) === 'Geodiversity' ? 2 : 1;
          if (f.loc.length < need) return need === 2 ? 'Geodiversity lands your paths in two metros. Pick two.' : 'Pick a location.';
          if (isLmcc(f) && !f.loc.every(m => LMCC_METROS.includes(m))) return 'Interconnect - Last Mile is live in San Jose and Ashburn.';
        }
      }
      if (!f.bandwidth || !bandwidthsFor(f).includes(f.bandwidth)) return 'Pick a bandwidth.';
      if (bwMbps(f.bandwidth) > cirOf(f)) return "Pick a bandwidth within the EVC's CIR.";
      if (isLmcc(f) && !isValidAwsAccount(f.awsAccount)) return 'Enter your 12-digit AWS account ID.';
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
const STEP_FIELDS = { type: ['ctype'], provider: ['clouds'], endpoints: ['colo'], basic: ['regions', 'loc', 'tier', 'bandwidth'], advanced: ['policy'], terms: ['term'], review: [], confirm: [] };
const locWords = (f) => f.loc.join(' + ');
// Words never count what they do not open (2026-09-30): past two, a list
// names two and says there are others; the panel's "All N" opens every one.
const someOf = (xs) => xs.length <= 2 ? xs.join(', ') : `${xs[0]}, ${xs[1]} and others`;
const regionsWords = (f) => someOf(f.regions);
/** The way an order rides, named as its cloud names the port ("Your ExpressRoute"); before a cloud is chosen, the way's own title. */
export const wayWords = (f) => (!f.way ? '' : cloudsOf(f).length ? W.wayLabel(f.way, cloudsOf(f)[0]) : (W.wayOf(f.way) || {}).title || '');
const coloWords = (f) => [f.colo.a.site, f.colo.b.site].filter(Boolean).join(' and ');
/** What a step decided, in a few words, for the stepper and the panel. */
export function stepValue(key, f) {
  switch (key) {
    case 'type': return f.ctype || '';
    case 'provider': return cloudsOf(f).join(' and ');
    case 'endpoints': return coloWords(f);
    case 'basic': return isHosted(f) ? [regionsWords(f), f.bandwidth || ''].filter(Boolean).join(' · ')
      : keyPasted(f) ? [regionsWords(f), f.actKey.trim() ? 'Activation key from AWS' : ''].filter(Boolean).join(' · ')
      : [regionsWords(f), isIot(f) && apnOf(f.apn) ? apnWords(apnOf(f.apn)) : locWords(f), f.tier || '', f.bandwidth ? (isLmcc(f) ? `${f.bandwidth} × 4 paths` : f.bandwidth) : ''].filter(Boolean).join(' · ');
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
const TYPE_PRODUCT = { 'Internet to Cloud': 'i2c', 'AVPN to Cloud': 'netbond', 'Cloud to Cloud': 'c2c', 'DataCenter / CoLocation to Cloud': 'netbond', 'IoT to Cloud': 'netbond', 'Layer 2 to Cloud': 'netbond', 'Colo to Colo': 'colo', 'Interconnect - Last Mile': 'lmcc' };
const productOf = (id) => CATALOG.find(p => p.id === id);
/** The path a type rides, from R.PATHS: the internet types ride Internet attach, the rest the AT&T network. */
export const pathOf = (f) => PATHS.find(p => p.id === (f.ctype === 'Internet to Cloud' && !isLmcc(f) ? 'internet' : 'netbond'));
/** The region the path table reads: the first one chosen, else the estate's first on the public internet. */
export function sampleRegion(f, est) {
  const rs = regionsOf(est);
  return rs.find(r => regionName(r) === f.regions[0]) || rs.find(r => !r.priv) || rs[0] || null;
}
/**
 * What you'd get, path by path (the comparison that left Ways to connect,
 * 2026-09-30): R.PATHS read for the region this order reaches. The row this
 * order rides is marked.
 */
export function pathTable(f, est) {
  const r = sampleRegion(f, est), rides = pathOf(f).id;
  const two = (s) => { const [a, ...b] = String(s).split(' · '); return [a, b.join(' · ')]; };
  return PATHS.map(p => {
    const [security, securitySub] = two(p.sec), [reliability, reliabilitySub] = two(p.relLabel);
    return { key: p.id, short: p.short, tone: p.tone, rides: p.id === rides, region: r ? regionName(r) : '', security, securitySub, reliability, reliabilitySub, cost: `$${p.egress.toFixed(2)}/GB`, costSub: 'egress, every GB out', setup: p.setup };
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
  const mult = isLmcc(f) || f.ctype === LAST_MILE.label || isHosted(f) ? 1 : TIER_MULT[tier] || 1;
  const lines = [];
  const add = (p, qty, note, perSite, past) => { if (!p) return; const unpriced = p.price === null || !!past, unitPrice = unpriced ? 0 : Math.round(p.price * mult); lines.push({ line: lines.length + 1, product: note ? `${p.name} (${note})` : p.name, qty, unitPrice, perSite: !!perSite, monthly: unitPrice * qty, unpriced }); };
  const pid = isLmcc(f) ? 'lmcc' : TYPE_PRODUCT[f.ctype];
  // A bandwidth past what the connection's catalog price covers is priced after review, and so is the order.
  // A hosted way (the deck, 2026-10-08) replaces NetBond with AT&T's on-ramp into its hub, the last hop into your VPC
  // and the hub itself, priced at review; NetBond's own ways keep the connection and add the AT&T-provided port.
  const hostedWay = !!f.way && pid === 'netbond' && W.wayHosted(f.way);
  const past = !!pid && !hostedWay && mbpsOf(f.bandwidth) > ceilMbpsOf(productOf(pid));
  if (pid) {
    const siteQty = f.bulk && f.qty > 1 ? f.qty : 0;
    const conns = isColo(f) || isLmcc(f) || f.ctype === 'Cloud to Cloud' ? 1 : Math.max(1, f.regions.length);
    if (!hostedWay) add(productOf(pid), siteQty || conns, past ? f.bandwidth : null, !!siteQty, past);
    // The hosted lines price by the reviewer's ladder at the order's bandwidth (the storyboards, 2026-10-16).
    if (hostedWay) W.hostedLines(f.way, f.bandwidth).forEach(p => add(p, p.id === 'hub-att' ? 1 : conns));
    else if (f.way && pid === 'netbond') W.wayExtras(f.way, cloudsOf(f)[0] || 'AWS').forEach(p => add(p, p.id === 'hub-att' ? 1 : conns));
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
  const ends = isHosted(f) ? ["AT&T's hub", regionEnd(f.regions)] : isColo(f) ? [f.colo.a.site || 'Colo A', f.colo.b.site || 'Colo B']
    : f.ctype === 'Cloud to Cloud' ? [f.regions[0] || 'Your cloud region', regionEnd(f.regions.slice(1)) === 'Your clouds' ? 'Your other clouds' : regionEnd(f.regions.slice(1))]
    : [isInternet(f) && !sites.length && !f.bulk ? 'The internet' : siteEnd, regionEnd(f.regions)];
  const pathSrc = fits(ends[0]) ? ends[0] : 'Your sites', pathDst = fits(ends[1]) ? ends[1] : 'Your clouds';
  return { lines, policies, monthly, priced: monthly > 0 && !past, tier, title: f.name.trim() || defaultName(f), pathSrc, pathDst, pathDesc: [f.ctype, regionsWords(f), locWords(f)].filter(Boolean).join(' · '), shield: f.policy.includes('Inline inspection') || f.policy.includes('No direct internet path'), wires: tier === 'Standard' ? 1 : 2, savings: 0, days: 10 };
}
/** StandardWizard.tsx deriveStandardName: type, providers, location. */
export function defaultName(f) {
  if (isHosted(f)) return [wayWords(f) || 'Hosted connection', f.regions[0] || f.cloud || ''].filter(Boolean).join(' - ');
  if (isColo(f)) return f.colo.a.site && f.colo.b.site ? `${f.colo.a.site} to ${f.colo.b.site} colo bridge` : 'Colo to Colo';
  if (isLmcc(f)) return ['AWS Interconnect - Last Mile', f.loc[0] || ''].filter(Boolean).join(' - ');
  if (isIot(f)) return ['IoT to Cloud', apnOf(f.apn) ? apnOf(f.apn).apn : '', cloudsOf(f).join(' + ')].filter(Boolean).join(' - ');
  return [f.ctype || 'New connection', cloudsOf(f).join(' + '), locWords(f)].filter(Boolean).join(' - ');
}
/** The monthly price on a term: Review's discount off the priced lines. */
export function termPrice(monthly, term) {
  const d = TERM_DISC[term] || 0;
  return Math.round(monthly * (1 - d / 100));
}
/** A priceable order: the type and what it reaches are chosen. A number with nothing chosen is a fabrication (CostSummaryPill.tsx). */
export const priceable = (f) => !!f.ctype && !keyPasted(f) && (isColo(f) ? !!(f.colo.a.site && f.colo.b.site) : f.regions.length > 0);

/**
 * What a tier gets you, from the path the type rides (R.PATHS: security and
 * uptime) and the order at that tier (CATALOG x the
 * tier multiplier). Modelled, and it says so.
 */
export function tierGets(f, est, tier) {
  // Priced as the order it would be once picked: on AWS alone, Internet or VPN
  // to Cloud at Maximum is Interconnect - Last Mile (wizardDoor.ts tierForkArmed).
  const g = { ...f, tier };
  const p = pathOf(g);
  const o = flowOrder(g, est);
  return {
    tier,
    becomes: isLmcc(g) && f.ctype !== LAST_MILE.label ? 'Becomes Interconnect - Last Mile' : '',
    protects: (isColo(f) ? COLO_TIER_PROTECTS : TIER_PROTECTS)[tier] || '',
    security: p.sec.split(' · ')[0],
    securitySub: p.sec.split(' · ').slice(1).join(' · '),
    reliability: p.relLabel.split(' · ')[0],
    reliabilitySub: p.relLabel.split(' · ').slice(1).join(' · '),
    // Chosen but past what the catalog price covers reads AT&T's words, not "once chosen" (2026-09-30).
    cost: !priceable(f) ? 'Priced once the type and region are chosen' : o.priced ? `${fmt(o.monthly)}/mo` : PRICE_NOTE,
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
// IoT's access side is the private APN, not a site of yours at a metro (BasicSettingsStep: "an APN has no metro").
export const carriesSites = (f) => !isHosted(f) && !isColo(f) && !c2c(f) && !isLmcc(f) && !isIot(f) && !(isInternet(f) && !f.sites.length && !f.bulk);
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
  if (isHosted(f)) {
    const it = intakeOf(f), idv = it ? it.fields.filter(x => x.value.trim() && x.key !== 'cidrs').slice(-1).map(x => x.value.trim()) : [];
    const intakeVal = it ? [...idv, (f.intake.cidrs || '').trim()].filter(Boolean).join(' · ') : '';
    const hostedRows = [
      ['way', 'Way to connect', wayWords(f), f.way ? f.from.way : null, 'type', null],
      ['type', 'Connection type', f.ctype, f.from.ctype, 'type', null],
      ['cloud', 'Cloud and region', f.regions.length ? regionsWords(f) : f.cloud ? `${f.cloud}, region not chosen yet` : '', f.regions.length ? f.from.regions : f.cloud ? f.from.clouds : null, f.regions.length ? 'basic' : 'provider', null],
      ['bandwidth', 'Bandwidth', f.bandwidth, f.bandwidth ? f.from.bandwidth : null, 'basic', null],
      ['intake', it ? it.title : 'Your network', intakeVal, intakeVal ? 'you' : null, 'basic', null],
      ['grant', 'Access', f.grant ? `Granted: AT&T may provision in your ${hostedCloud(f) === 'AWS' ? 'account' : hostedCloud(f) === 'GCP' ? 'project' : 'subscription'}` : '', f.grant ? 'you' : null, 'basic', null],
      ['term', 'Contract term', f.term === null || f.term === undefined ? '' : termTitle(f.term), f.term === null || f.term === undefined ? null : f.from.term, 'terms', null],
      ['policy', 'Policy', f.policy.join(', '), f.policy.length ? f.from.policy : null, 'advanced', null],
    ];
    return hostedRows.filter(r => r[0] !== 'way' || f.way).map(([key, label, value, st, step, more]) => { const has = !!value && !!st, state = has ? st : 'none';
      return { key, label, value: has ? value : 'Not chosen yet', state, word: say(state), step, more, hasMore: false, moreLabel: '' }; });
  }
  const lm = isLmcc(f), pasted = keyPasted(f), apn = apnOf(f.apn), evc = evcOf(f.evc);
  const rows = [
    ['way', 'Way to connect', wayWords(f), f.way ? f.from.way : null, 'type', null],
    // The order IS AWS Interconnect - Last Mile once the armed fork commits to Maximum (wizardDoor.ts isLmccPath).
    ['type', 'Connection type', lm ? 'AWS Interconnect - Last Mile' : f.ctype, f.from.ctype, 'type', null],
    colo ? ['cloud', 'Colo endpoints', coloWords(f), f.colo.a.site || f.colo.b.site ? f.from.colo : null, 'endpoints', null]
      : ['cloud', c2c(f) ? 'Clouds and regions' : 'Cloud and region', f.regions.length ? regionsWords(f) : cloudsOf(f).length ? `${cloudsOf(f).join(' and ')}, region not chosen yet` : '', f.regions.length ? f.from.regions : cloudsOf(f).length ? f.from.clouds : null, f.regions.length ? 'basic' : 'provider', f.regions.length > 2 ? 'regions' : null],
    ['sites', 'Sites', siteVal, siteFrom, 'basic', !f.bulk && sites.length > 2 ? 'sites' : null],
    ...(pasted ? [['key', 'Activation key', f.actKey.trim(), f.actKey.trim() ? 'you' : null, 'basic', null]] : []),
    ...(isIot(f) ? [['apn', 'APN-VPN', apn ? apnWords(apn) : '', apn ? 'you' : null, 'basic', null]] : []),
    ...(isL2(f) ? [['evc', 'EVC', evc ? `${evc.id} · CIR ${cirWords(evc.cir)}` : '', evc ? 'you' : null, 'basic', null]] : []),
    ['loc', lm ? 'Metro' : 'Location', colo ? [f.colo.a.site, f.colo.b.site].map(n => (resolveSite(est, n) || {}).metro).filter(metroOk).join(' + ') : locWords(f), colo ? (f.colo.a.site ? f.from.colo : null) : f.loc.length ? f.from.loc : null, colo ? 'endpoints' : 'basic', null],
    ['bandwidth', 'Bandwidth', f.bandwidth ? (lm ? `${f.bandwidth} × 4 paths` : f.bandwidth) : '', f.bandwidth ? f.from.bandwidth : null, 'basic', null],
    ['tier', 'Resiliency', f.tier || 'Standard until you pick', f.tier ? f.from.tier : null, 'basic', null],
    ...(lm && !pasted ? [['account', 'AWS account', f.awsAccount.trim(), isValidAwsAccount(f.awsAccount) ? 'you' : null, 'basic', null]] : []),
    ['term', 'Contract term', f.term === null || f.term === undefined ? '' : termTitle(f.term), f.term === null || f.term === undefined ? null : f.from.term, 'terms', null],
    ...(lm && f.routed.trim() ? [['routed', 'Routed networks', f.routed.trim(), 'you', 'terms', null]] : []),
    ...(showSubnets(f) && f.subnets.trim() ? [['subnets', 'Subnets', f.subnets.trim(), 'you', 'advanced', null]] : []),
    ['policy', 'Policy', f.policy.join(', '), f.policy.length ? f.from.policy : null, stepKeysFor(f).includes('advanced') ? 'advanced' : 'confirm', null],
  ];
  // IoT has no metro and no tier of its own (the APN is the access side, the cellular core owns redundancy); a pasted key holds the metro and the bandwidth.
  const hide = new Set([...(isIot(f) || pasted ? ['loc'] : []), ...(isIot(f) ? ['tier'] : []), ...(pasted ? ['bandwidth'] : [])]);
  // Last Mile is AT&T's interconnect, not a port of yours: the way row goes with it.
  return rows.filter(r => !hide.has(r[0]) && (r[0] !== 'sites' || carriesSites(f)) && (r[0] !== 'way' || (f.way && !lm))).map(([key, label, value, st, step, more]) => {
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
  if (!priceable(f)) return { has: false, big: '', line: keyPasted(f) ? 'Priced from the key at provisioning' : isColo(f) ? 'Priced once both colo endpoints are chosen' : 'Priced once the type and region are chosen', sub: '' };
  // A number with no bandwidth chosen is a fabrication (CostSummaryPill): the pill waits for one.
  if (!f.bandwidth) return { has: false, big: '', line: 'Priced once a bandwidth is picked', sub: '' };
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
  if (isHosted(f)) { left = f.cloud ? "AT&T's hub" : ''; right = many(f.regions, 'regions'); }
  else if (isColo(f)) { left = f.colo.a.site || ''; right = f.colo.b.site || ''; }
  else if (c2c(f)) { left = f.regions[0] || ''; right = many(f.regions.slice(1), 'regions'); rightKind = f.regions.length > 2 ? 'others' : null; }
  else if (!carriesSites(f)) { left = 'The internet'; right = many(f.regions, 'regions'); rightKind = f.regions.length > 1 ? 'regions' : null; }
  else {
    left = f.bulk ? f.bulk.split(' · ')[0] : many(sites.map(x => x.name), 'sites'); leftKind = !f.bulk && sites.length > 1 ? 'sites' : null;
    right = many(f.regions, 'regions'); rightKind = f.regions.length > 1 ? 'regions' : null;
  }
  return {
    left: left || (isHosted(f) ? "AT&T's hub" : isColo(f) ? 'Colo A' : c2c(f) ? 'Cloud region' : 'Your sites'), leftSet: !!left, leftOpens: !!leftKind, leftKind,
    right: right || (isColo(f) ? 'Colo B' : c2c(f) ? 'Second cloud' : 'Cloud region'), rightSet: !!right, rightOpens: !!rightKind, rightKind,
    mid: isHosted(f) ? (f.cloud ? `${f.cloud} hub` : 'Cloud not chosen') : f.loc.length ? locWords(f) : 'Location not chosen', midSet: isHosted(f) ? !!f.cloud : f.loc.length > 0,
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
  if (isHosted(f)) return { match: f.regions[0] || 'your cloud region', verb: 'reaches', scope: "AT&T's hub", req };
  if (isColo(f)) return { match: f.colo.a.site || 'Colo A', verb: 'reaches', scope: f.colo.b.site || 'Colo B', req };
  if (c2c(f)) return { match: f.regions[0] || 'your first cloud', verb: 'reaches', scope: f.regions.length > 1 ? scopeOf(f.regions.slice(1)) : 'your second cloud', req };
  // IoT: the APN to VPN mapping is what reaches the cloud.
  if (isIot(f)) return { match: apnOf(f.apn) ? apnWords(apnOf(f.apn)) : 'your APN', verb: 'reaches', scope: f.regions[0] || 'the cloud region', req };
  // Last Mile: the region reaches AT&T's network at the metro, over the interconnect.
  if (isLmcc(f)) return { match: f.regions[0] || 'AWS', verb: 'reaches', scope: f.loc.length ? `AT&T's network in ${f.loc[0]}` : "AT&T's network", req };
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
  const monthlyN = o.priced ? (hasTerm ? termPrice(o.monthly, f.term) : o.monthly) : null;
  return {
    // The card's name (2026-10-13): yours if you gave one, else the way or type alone; the path strip names its ends.
    id: `o${n}`, title: o.title, short: f.name.trim() || wayWords(f) || f.ctype || o.title, type: f.ctype || '', way: f.way || null, what: (isHosted(f) ? [wayWords(f), f.regions.join(', '), f.bandwidth || ''] : [wayWords(f), f.regions.join(', ') || coloWords(f), locWords(f), f.bandwidth || '', tierOf(f)]).filter(Boolean).join(' · '),
    // The catalog product its price starts from, so Orders' figure opens where the price comes from (2026-10-13).
    monthly: o.priced ? `${fmt(monthlyN)}/mo · Modelled` : PRICE_NOTE, monthlyN, product: isLmcc(f) ? 'lmcc' : TYPE_PRODUCT[f.ctype] || 'netbond',
    term: hasTerm ? termTitle(f.term) : '', policy: f.policy.join(', '), at, stage: ORDER_STAGE, region: r ? r.region : null, fromFlow: true,
    // A hosted order keeps what AT&T provisions from (the storyboards, 2026-10-16): the cloud, the intake and the grant.
    hosted: isHosted(f), cloud: f.cloud || null, clouds: cloudsOf(f), intake: { ...f.intake }, grant: !!f.grant,
    // NetBond Advanced's branches (2026-10-16): what Last Mile, IoT, Layer 2 and Advanced Settings asked.
    awsAccount: f.awsAccount.trim(), keySource: f.keySource, actKey: f.actKey.trim(), routed: f.routed.trim(), apn: f.apn, evc: f.evc, subnets: f.subnets.trim(), access: { ...f.access },
    // What it carries, end to end (Orders as a story, 2026-10-13): plain data, kept at placing, so Orders draws the order's
    // own path long after the flow that built it is gone.
    path: orderPath(f, est).map(({ state, ...nd }) => nd),
  };
}

// ---------- The order's path, end to end (Orders as a story, 2026-10-13) ----------
/** A wizard step's glyph, for the order in progress drawn as the steps it has walked. */
export const STEP_ICON = { type: 'grid', provider: 'cloud', endpoints: 'large-building', basic: 'gear', advanced: 'shuffle', terms: 'history', review: 'checklist', confirm: 'check-circle' };
/** A region's name short enough for a station: the cloud is its mark, so the station says the region. */
const regionShort = (name) => String(name || '').split(' ').slice(1).join(' ') || String(name || '');
/**
 * One order's path as Govern draws a policy's and the ways draw theirs (W.wayStrip): where it starts, the AT&T edge it
 * lands on, the core at its resiliency, where its way joins the cloud (when it rides one), and the cloud region it
 * reaches. Each station names the order's own end; nothing it has not chosen is named ('any').
 */
export function orderPath(f, est) {
  const dg = wipDiagram(f, est), w = f.way ? W.wayOf(f.way) : null, clouds = cloudsOf(f), tier = tierOf(f);
  const colo = isColo(f), cc = c2c(f), inet = !colo && !cc && !carriesSites(f);
  const node = (key, icon, cloud, label, title, set) => ({ key, icon: cloud ? '' : icon, cloud: cloud || '', label, title, state: set ? 'set' : 'any' });
  // A hosted order (the storyboards, 2026-10-16) has no site end and no tier: AT&T's hub, the link at its bandwidth,
  // your network, the region.
  if (isHosted(f) && w) {
    const spec = INTAKE[f.way], it = f.intake || {}, net = it.vnetName || it.vpcId || it.plsAlias || '', netTitle = spec ? spec.title(f.cloud || clouds[0] || 'AWS') : 'Your network';
    return [node('from', 'hub', '', "AT&T's hub", `AT&T's hub in ${f.regions[0] || 'your region'}`, true),
      node('join', w.join[0], '', f.bandwidth ? `${w.join[1]} · ${f.bandwidth}` : w.join[1], w.join[3], !!f.bandwidth),
      node('net', 'cloud', '', netTitle, net ? `${netTitle}: ${net}` : `${netTitle}: not entered yet`, !!net),
      node('to', 'cloud', dg.rightSet ? clouds[0] || '' : '', f.regions.length === 1 ? regionShort(f.regions[0]) : dg.right, `Cloud region: ${dg.right}`, dg.rightSet)];
  }
  const from = cc && f.regions[0] ? node('from', 'cloud', cloudOfName(f.regions[0]), regionShort(f.regions[0]), `From ${f.regions[0]}`, true)
    : node('from', colo ? 'large-building' : inet ? 'globe' : 'large-building', '', dg.left, `${colo ? 'Colo A' : inet ? 'From' : 'Your sites'}: ${dg.left}`, dg.leftSet);
  const edge = node('edge', 'router', '', f.loc.length === 1 ? f.loc[0] : f.loc.length ? `${f.loc.length} metros` : 'Edge',
    `AT&T edge: ${f.loc.length ? locWords(f) : 'metro not chosen'}${f.bandwidth ? ` · ${f.bandwidth}` : ''}`, f.loc.length > 0);
  const core = node('core', 'hub', '', f.tier ? tier : 'Core', f.tier ? `AT&T core: ${tier} · ${dg.dual ? '2 paths' : '1 path'}` : 'AT&T core: resiliency not chosen', !!f.tier);
  const join = w ? [{ ...node('join', w.join[0], '', w.join[1], w.join[3], true), state: w.join[2] === 'nodata' ? 'filled' : 'set' }] : [];
  const toCloud = cc ? cloudOfName(f.regions[1] || '') : clouds[0] || '';
  const toLabel = colo ? dg.right : (cc ? f.regions.length === 2 : f.regions.length === 1) ? regionShort(cc ? f.regions[1] : f.regions[0]) : dg.right;
  const to = colo ? node('to', 'large-building', '', toLabel, `Colo B: ${dg.right}`, dg.rightSet)
    : node('to', 'cloud', dg.rightSet ? toCloud : '', toLabel, `${cc ? 'To' : 'Cloud region'}: ${dg.right}`, dg.rightSet);
  return [from, edge, core, ...join, to];
}

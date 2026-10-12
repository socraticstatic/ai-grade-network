/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The ways to connect into a cloud (the connect options session with the product stakeholder, 2026-10-06).
// One list read by two doors: Connect > Ways to connect shows every way (a new customer, "greenfield"), and
// Connect > Recommended shows the best ones for the cloud a move reaches, in the session's order of priority
// ("NetBond Advanced bring your own, NetBond Advanced AT&T provided, and then peering"; Azure has all three,
// Google two). After either door the order runs the same flow.
//
// The stakeholder's deck landed 2026-10-08 ("NaaS: Cloud Connectivity Options", the Cloud Connectivity Decision Matrix,
// AT&T internal) and replaces the session's estimates: its prices at 1 Gbps (us-east-1 / Azure East US list rates, 30%
// utilisation), its setup levels (Click & connect, Click + approve, Guided reconfig) and times, transit gateway as a real
// option, peering split into same-AZ and cross-AZ, and its weighted criteria (Cost 30 · Performance 20 · Security 20 ·
// Effort & time 15 · Scale 15). Every hosted option rides one AT&T cloud on-ramp into AT&T's hub ($2,190 a month at
// 1 Gbps) and only the last hop into the customer's VPC changes. The deck's hosted figures are cloud pass-through: they
// leave out the vSRX licence, hub compute and AT&T's margin, so an order adds the hub as a line priced at review. Only
// NetBond Advanced's provisioning time is proven in market; the rest are proof-of-concept targets and say so.
import { CATALOG } from './naas-data.js';
import { fmt, connModeOf } from './naas-logic.js';

/** What the cloud calls its private port, the thing a customer brings or AT&T provides. */
export const PORT_NAME = { AWS: 'Direct Connect', Azure: 'ExpressRoute', GCP: 'Interconnect', 'Google Cloud': 'Interconnect', Oracle: 'FastConnect' };
const isGoogle = (cloud) => cloud === 'GCP' || cloud === 'Google Cloud';
export const hostedWord = (cloud) => (cloud === 'Azure' ? 'VNet' : 'VPC');
/** The provider marks NetBond Advanced shows on its provider step (brand/providers). */
export const MARK = { AWS: 'brand/providers/aws.svg', Azure: 'brand/providers/azure.svg', GCP: 'brand/providers/google-icon.svg', 'Google Cloud': 'brand/providers/google-icon.svg', Oracle: 'brand/providers/oracle.svg' };
/** The mark for a theme: AWS's dark wordmark disappears on a dark card, so dark reads its light-ink file. */
export const markFor = (cloud, theme) => (theme === 'dark' && cloud === 'AWS' ? 'brand/providers/aws-dark.svg' : MARK[cloud] || '');
export const CLOUD_NAME = { AWS: 'AWS', Azure: 'Microsoft Azure', GCP: 'Google Cloud', 'Google Cloud': 'Google Cloud', Oracle: 'Oracle Cloud' };

/**
 * What a way adds to an order beyond the catalog. The AT&T-provided port is the session's estimate (the deck prices
 * NetBond Advanced alone). The rest are the deck's: the on-ramp every hosted option shares and each last hop at 1 Gbps
 * (its slide "Five ways out of the AT&T hosted hub"), and the hub itself, priced with engineering.
 */
export const EXTRA = {
  'port-att': { id: 'port-att', name: 'Cloud port, AT&T-provided', price: 300 },
  'onramp-att': { id: 'onramp-att', name: 'AT&T cloud on-ramp into the hosted hub, 1 Gbps', price: 2190 },
  'lh-intra': { id: 'lh-intra', name: 'Same-AZ peering into your VPC', price: 0 },
  'lh-cross': { id: 'lh-cross', name: 'Cross-AZ peering into your VPC or VNet', price: 1971 },
  'lh-tgw': { id: 'lh-tgw', name: 'Shared transit gateway attachment', price: 2044 },
  'lh-cwan': { id: 'lh-cwan', name: 'Cloud WAN or Virtual WAN attachment', price: 2409 },
  'lh-pl': { id: 'lh-pl', name: 'PrivateLink endpoints, 40 services', price: 2518 },
  'hub-att': { id: 'hub-att', name: 'AT&T hosted hub: vSRX and compute', price: null },
};
export const productOf = (id) => CATALOG.find(p => p.id === id) || EXTRA[id] || null;

/** The deck's five criteria and their weights (slide "From Discovery to the Right Connection"), each with its glyph. */
export const CRITERIA = [
  { key: 'cost', label: 'Cost', icon: 'bill', weight: 30 },
  { key: 'perf', label: 'Performance', icon: 'high-meter', weight: 20 },
  { key: 'sec', label: 'Security', icon: 'check-shield', weight: 20 },
  { key: 'setup', label: 'Effort and time', icon: 'wrench', weight: 15 },
  { key: 'scale', label: 'Scale', icon: 'trending-up', weight: 15 },
];
/** How much the customer touches (the deck's setup levels). */
export const SETUP_LEVEL = {
  click: ['Click & connect', 'AT&T automation runs every step, once a delegated role is granted'],
  approve: ['Click + approve', 'One action in your cloud console: accept the peering, share or endpoint'],
  guided: ['Guided reconfig', 'You change a gateway, BGP, routes or DNS; the portal hands you the config'],
};

/**
 * The ways, the deck's columns plus the session's AT&T-provided port. `products` are one region's order; `zones` is
 * peering's choice of last hop (same AZ, AWS only and free; across AZs, zone-redundant). `youDo` is the deck's
 * "Customer does", `level` its setup level, `time` its estimate (`proven` only for NetBond Advanced).
 */
export const WAYS = [
  { key: 'byo', title: 'Bring your own port', kicker: 'NetBond Advanced', icon: 'cable', path: 'netbond',
    line: 'Your Direct Connect, ExpressRoute or Interconnect, carried on the AT&T network. NetBond Advanced as it runs today.',
    join: ['cable', 'Your port', 'nodata', 'Yours: you order the port from the cloud'], who: 'you', level: 'guided', time: '<15 min', proven: true,
    youDo: ['Accept + gateway', 'Accept the connection, attach your cloud gateway, confirm BGP'],
    clouds: ['AWS', 'Azure', 'GCP', 'Oracle'], products: ['netbond'],
    score: { perf: [5, '99.99% SLA'], sec: [5, 'Never internet'], setup: [4, 'Guided · <15 min'], scale: [5, 'By tier'] } },
  { key: 'att', title: 'AT&T provides the port', kicker: 'NetBond Advanced', icon: 'hub', path: 'netbond',
    line: "AT&T orders the cloud's Direct Connect or ExpressRoute and holds it. One order, one bill.",
    join: ['hub', 'AT&T port', 'set', "AT&T's: AT&T orders and holds the port"], who: 'att', level: 'guided', time: '<15 min', proven: true,
    youDo: ['Accept + gateway', 'Accept the hosted connection, attach your cloud gateway, confirm BGP'],
    clouds: ['AWS', 'Azure'], products: ['netbond', 'port-att'],
    score: { perf: [5, '99.99% SLA'], sec: [5, 'Never internet'], setup: [4, 'Guided · <15 min'], scale: [5, 'By tier'] } },
  { key: 'peer', title: 'Hosted peering', kicker: 'AT&T-hosted', icon: 'check-shield', path: 'netbond', inspect: true, hosted: true,
    line: "AT&T's hub VPC or VNet, with the vSRX in path, peered to yours. L3 to L7 policy in AT&T's hub.",
    join: ['check-shield', 'Peering', 'set', "AT&T's hub peered to your VPC or VNet, the vSRX in path"], who: 'att', level: 'approve', time: '15-30 min',
    youDo: ['Accept + route', 'Accept the peering and add one route'],
    clouds: ['AWS', 'Azure'],
    zones: { intra: { label: 'Same AZ', clouds: ['AWS'], hop: 'lh-intra', perf: [4, 'One zone'], scale: [1, 'One AZ'] },
      inter: { label: 'Across AZs', clouds: ['AWS', 'Azure'], hop: 'lh-cross', perf: [4, 'Zone-redundant'], scale: [2, 'Per VPC'], costNote: '' } },
    score: { perf: [4, 'Zone-redundant'], sec: [5, 'Inspected'], setup: [4, 'Approve · 15-30 min'], scale: [2, 'Per VPC'] } },
  { key: 'transit', title: 'Transit gateway', kicker: 'AT&T-hosted', icon: 'merge', path: 'netbond', inspect: true, hosted: true, hop: 'lh-tgw',
    line: 'AT&T runs a transit gateway in its hub and shares it; your VPCs attach. Transitive routing, central inspection.',
    join: ['merge', 'TGW', 'set', "AT&T's transit gateway, shared with you"], who: 'att', level: 'approve', time: '30-60 min',
    youDo: ['Attach + routes', 'Accept the share, attach your VPC and update its route table'],
    clouds: ['AWS', 'Azure'],
    score: { perf: [4, 'Transitive'], sec: [5, 'Inspected'], setup: [4, 'Approve · 30-60 min'], scale: [5, 'Many VPCs'] } },
  { key: 'cloudwan', title: 'Cloud WAN', kicker: 'AT&T-hosted', icon: 'global-network', path: 'netbond', inspect: true, hosted: true, hop: 'lh-cwan',
    line: "AT&T runs the core network across regions; your VPC attaches to its edge and joins a segment.",
    join: ['global-network', 'Cloud WAN', 'set', "AT&T's core network edge, segments decide reach"], who: 'att', level: 'guided', time: '1-2 hrs',
    youDo: ['Attach + segment', 'Attach your VPC to the edge and join a segment'],
    clouds: ['AWS', 'Azure'],
    score: { perf: [5, 'Multi-region'], sec: [5, 'Segments'], setup: [3, 'Guided · 1-2 hrs'], scale: [5, 'Multi-region'] } },
  { key: 'privatelink', title: 'PrivateLink', kicker: 'AT&T-hosted', icon: 'padlock', path: 'netbond', inspect: true, hosted: true, hop: 'lh-pl', perService: true,
    line: 'AT&T publishes each service; you create one private endpoint per service. Overlapping CIDRs are fine.',
    join: ['padlock', 'Endpoint', 'set', 'A private endpoint per service'], who: 'att', level: 'approve', time: '15-30 min each',
    youDo: ['Endpoint + DNS', 'Create an endpoint per service, approve it, set up DNS'],
    clouds: ['AWS', 'Azure', 'GCP'],
    score: { perf: [4, '10 Gbps per AZ'], sec: [5, 'Per service'], setup: [3, 'Approve · per service'], scale: [2, 'Per service'] } },
];
/**
 * A way's path, as Govern draws a policy's (2026-10-07, Micah: "less words, more icons"): your sites, AT&T's edge and
 * core, where the way joins the cloud, the cloud. The join is AT&T's (solid) or yours (dashed).
 */
export const wayStrip = (key) => { const w = wayOf(key); if (!w) return [];
  const node = (k, icon, short, state, title) => ({ key: k, icon, short, state, title });
  return [node('site', 'large-building', 'Sites', 'set', 'Your sites'), node('edge', 'router', 'Edge', 'set', "AT&T's edge"), node('core', 'hub', 'Core', 'set', "AT&T's core"),
    node('join', w.join[0], w.join[1], w.join[2], w.join[3]), node('cloud', 'cloud', 'Cloud', w.soon ? 'none' : 'set', 'Your cloud')]; };
export const wayOf = (key) => WAYS.find(w => w.key === key) || null;
/** One region's products for a way: NetBond's own, or for a hosted way the shared on-ramp and its last hop (peering's
 *  by zone; Azure has no same-AZ rung, so it peers across AZs). */
const zoneOf = (w, cloud, zone) => { if (!w.zones) return null; const z = w.zones[zone] && w.zones[zone].clouds.includes(isGoogle(cloud) ? 'GCP' : cloud) ? zone : 'inter'; return { key: z, ...w.zones[z] }; };
const productIds = (w, cloud, zone) => (w.hosted ? ['onramp-att', w.hop || (zoneOf(w, cloud, zone || 'inter') || {}).hop] : w.products.slice());

/** One region's monthly for a way on a cloud: the sum of its products, null when any waits on a survey. */
export function wayMonthly(key, cloud, zone) {
  const w = wayOf(key);
  if (!w || w.soon) return null;
  const ps = productIds(w, cloud, zone).map(productOf);
  return ps.every(p => p && typeof p.price === 'number') ? ps.reduce((a, p) => a + p.price, 0) : null;
}
/** Cost's score: the cheapest 5, the dearest 1, by the monthly at 1 Gbps on the deck's reference rates. */
const costScoreOf = (m) => (m === null ? null : m <= 2000 ? 5 : m <= 2500 ? 4 : m <= 4200 ? 3 : m <= 4500 ? 2 : 1);
/** A way's products, named for a cloud and a quantity of regions: [[id, n]] for the moves model. */
export const wayProducts = (key, cloud, n = 1, zone) => { const w = wayOf(key); return w ? productIds(w, cloud, zone).map(id => [id, n]) : []; };
/** The order lines a way adds beyond the connection the type already prices (NetBond is that connection). A hosted
 *  way replaces NetBond: its lines are the on-ramp, the last hop and the hub, priced at review. */
export const wayExtras = (key, cloud, zone) => { const w = wayOf(key); if (!w) return [];
  return w.hosted ? [...productIds(w, cloud, zone), 'hub-att'].map(productOf).filter(Boolean) : productIds(w, cloud, zone).filter(id => id !== 'netbond').map(productOf).filter(Boolean); };
export const wayHosted = (key) => !!(wayOf(key) || {}).hosted;

// ---- Landings, per estate (2026-10-09: "Make landed regions honest per estate") ----
// A landing is { est, region, order }: the region an order delivered, on the estate it was placed on. A bare region id
// (older state, and tests that set one) still lands on whichever estate is shown, as every landing once did.
export const landedEntries = (s) => (Array.isArray(s && s.landed) ? s.landed : s && s.landed ? [s.landed] : []).filter(Boolean);
const onEst = (e, estId) => typeof e === 'string' || !e.est || !estId || e.est === estId;
const idOf = (e) => (typeof e === 'string' ? e : e.region);
/** The regions landed on one estate. */
export const landedIdsOn = (s, estId) => [...new Set(landedEntries(s).filter(e => onEst(e, estId)).map(idOf))];
/** One region's landing on one estate, or null. */
export const landingOf = (s, estId, region) => landedEntries(s).find(e => onEst(e, estId) && idOf(e) === region) || null;
/** The regions one order has landed on an estate. A landing records its order, so a later order for the same region is
 *  not Live until its own Go live; a bare id or a landing with no order on record counts for every order. */
export const landedIdsFor = (s, estId, orderId) => [...new Set(landedEntries(s).filter(e => onEst(e, estId) && (typeof e === 'string' || !e.order || e.order === orderId)).map(idOf))];
/** Land regions for an order on an estate: the set only grows, one landing per region and order. */
export function landWith(s, regions, estId, orderId) {
  const have = new Set(landedIdsFor(s, estId, orderId || null)), add = [];
  for (const region of (regions || []).filter(Boolean)) if (!have.has(region)) { have.add(region); add.push({ est: estId || null, region, order: orderId || null }); }
  return [...landedEntries(s), ...add];
}
/** The order a region's landing delivered. Of several landed orders the latest that attaches something private wins (a
 *  NetBond order after an Internet to Cloud one makes the region private); an older landing with no order on record reads
 *  the last order this estate placed for it. */
export function landingOrder(s, estId, region) {
  const es = landedEntries(s).filter(e => onEst(e, estId) && idOf(e) === region); if (!es.length) return null;
  const mine = ((s && s.orders) || []).filter(o => o && o.kind !== 'bandwidth' && (!o.est || !estId || o.est === estId) && (o.regions || [o.region]).includes(region));
  const named = es.map(e => (typeof e === 'object' && e.order ? mine.find(o => o.id === e.order) : null)).filter(Boolean);
  const pool = named.length ? named : es.some(e => typeof e === 'string' || !e.order) ? mine.slice(-1) : [];
  return [...pool].reverse().find(o => landingKind(o) !== 'internet') || pool[pool.length - 1] || null;
}
// The types NetBond carries (TYPE_PRODUCT in naas-connect-flow.js): only on these does an order's way price, and land.
const NETBOND_TYPES = new Set(['AVPN to Cloud', 'DataCenter/CoLocation to Cloud', 'DataCenter / CoLocation to Cloud', 'IoT to Cloud', 'Layer 2 to Cloud']);
/** Whether an order's way is the one it lands: a known way, on a type NetBond carries (or a journey order, which has no type). */
export const wayCarried = (o) => !!(o && o.way && wayOf(o.way) && !o.lmcc && !/last mile/i.test(o.type || '') && (!o.type || NETBOND_TYPES.has(o.type)));
/** What an order attaches when it lands. Its type comes first: Interconnect - Last Mile (AWS only) is the cloud's own
 *  port; Internet to Cloud goes live over the internet and attaches nothing private. A way counts only where NetBond
 *  carries the type (flowOrder adds the way's products only then): a hosted way is the hub, else NetBond. A catalog order
 *  that bought a hosted VPC is the hub; every other type, and a landing with no order on record, is NetBond. */
export function landingKind(o) {
  if (!o) return 'netbond';
  if (o.lmcc || /last mile/i.test(o.type || '')) return 'direct';
  if (o.type === 'Internet to Cloud') return 'internet';
  if (wayCarried(o)) return wayHosted(o.way) ? 'hosted' : 'netbond';
  if (o.hosted) return 'hosted';
  return 'netbond';
}
const CLOUD_RAMP = { AWS: 'DX', Azure: 'ER', GCP: 'Interconnect', Google: 'Interconnect' };
/** A region as its landing leaves it. A region already attached stays as it was (a landing never re-stamps a ramp or counts
 *  twice). A public one: NetBond for a NetBond type (the hub's own on-ramp, for a hosted way); Last Mile is the cloud's own
 *  port; Internet to Cloud changes nothing. */
export function landedRegion(r, o) {
  const k = landingKind(o);
  if (!r || r.priv || k === 'internet') return r;
  if (k === 'direct') return { ...r, priv: true, ramp: CLOUD_RAMP[r.cloud] || 'DX', rel: 'ok', landed: true };
  return { ...r, priv: true, ramp: 'NetBond', rel: 'ok', landed: true };
}

// ---- What sits at the AT&T edge for one region (2026-10-09, the policy engine's slice 2) ----
// The engine compiles an intent to the enforcement point a region really has: NetBond's route sheet, the vSRX in AT&T's
// hosted hub, or nothing of AT&T's (the cloud's own port, a third party's fabric). Never invented: a landed order that
// names its way says it; else the region as its landing leaves it (landedRegion, the same stamp the app's estate uses);
// else the estate's stated ramp; else nothing is on record. Another estate's landing or order never counts.
/** A region's way and where that is stated: {cls: 'hosted'|'netbond'|'direct'|'third'|null, key, from, ref}. */
export function regionWay(r, s = {}, estId = null) {
  if (!r) return { cls: null, key: null, from: 'none', ref: null };
  // A region attached before any landing (private, never stamped landed) stays as the estate states it.
  const landing = r.priv && !r.landed ? null : landingOf(s, estId, r.region), placed = landing ? landingOrder(s, estId, r.region) : null;
  if (placed && wayCarried(placed)) return { cls: wayHosted(placed.way) ? 'hosted' : 'netbond', key: placed.way, from: 'order', ref: placed.id || null };
  if (placed && landingKind(placed) === 'hosted') return { cls: 'hosted', key: null, from: 'order', ref: placed.id || null };
  const eff = landing && !r.landed ? landedRegion(r, placed) : r;
  const mode = connModeOf(eff), from = placed ? 'order' : landing ? 'landed' : 'ramp', ref = placed ? placed.id || null : eff.ramp || null;
  if (mode === 'direct' || mode === 'third') return { cls: mode, key: null, from, ref };
  if (mode === 'netbond') return { cls: 'netbond', key: null, from, ref: ref || 'NetBond' };
  return { cls: null, key: null, from: placed ? 'order' : 'public', ref: placed ? placed.id || null : null };
}

/** A way's label for one cloud: the port named as that cloud names it. */
export function wayLabel(key, cloud, zone) {
  const port = PORT_NAME[cloud] || 'port';
  return ({ byo: `Your ${port}`, att: `AT&T's ${port}`, peer: `Hosted ${hostedWord(cloud)} peering${zone === 'intra' ? ', same AZ' : ''}`, privatelink: 'Hosted PrivateLink', cloudwan: 'Hosted Cloud WAN', transit: 'Hosted transit gateway' })[key] || '';
}
/** The setup level and time, in words (the flow's banner, a card's title); an unproven time says it is a target. */
export const waySetup = (key) => { const w = wayOf(key); if (!w) return ''; const lv = SETUP_LEVEL[w.level] || ['', ''];
  return `${lv[0]} · ${w.time}${w.proven ? (w.key === 'byo' ? ' on AT&T\'s side; the first time needs your cloud gateway' : ' on AT&T\'s side') : ', a proof-of-concept target'}`; };
/** Who sets it up as a glyph and how long, short enough for a card's row: [icon, time, words]. */
export const wayWho = (key) => { const w = wayOf(key); if (!w || w.soon) return null; return { icon: w.who === 'att' ? 'hub' : 'user-access', who: w.who === 'att' ? 'AT&T' : 'You', time: w.time, words: waySetup(key), level: (SETUP_LEVEL[w.level] || [''])[0] }; };
/** What the customer does, short for a card's row and whole for its title (the deck's "Customer does"). */
export const wayYouDo = (key) => { const w = wayOf(key); return w && w.youDo ? { short: w.youDo[0], words: w.youDo[1] } : null; };
export const wayAvailable = (key, cloud) => { const w = wayOf(key); return !!w && !w.soon && w.clouds.includes(isGoogle(cloud) ? 'GCP' : cloud); };

/**
 * The best ways for a cloud, in the session's order of priority. Azure and AWS have three; Google has two, so
 * its third is the way it cannot have, said as such. Oracle rides NetBond on its own port alone. The deck
 * (2026-10-08) offers hosted peering on AWS and Azure only; Google's hosted option is PrivateLink (its PSC).
 */
export function recommendedFor(cloud) {
  if (cloud === 'Azure' || cloud === 'AWS') return ['byo', 'att', 'peer'].map(key => ({ key }));
  if (isGoogle(cloud)) return [{ key: 'byo' }, { key: 'privatelink' }, { key: 'att', unavailable: `Not on Google Cloud: AT&T cannot provide its Interconnect` }];
  if (cloud === 'Oracle') return [{ key: 'byo' }];
  return [];
}

/** A score as five segments, lit up to the score; null reads as unscored. */
export const segs = (n) => [1, 2, 3, 4, 5].map(i => ({ key: 's' + i, on: n !== null && n !== undefined && i <= n }));

/** A way's five criteria for a cloud and zone, [score, value] each: cost from its monthly, the rest the deck's. */
export function wayScores(key, cloud = 'AWS', zone = 'inter') {
  const w = wayOf(key); if (!w) return {};
  const z = zoneOf(w, cloud, zone), m = wayMonthly(key, cloud, zone);
  return { cost: [costScoreOf(m), m === null ? 'By survey' : `${fmt(m)}${w.perService ? ' · 40 svc' : ''}${w.hosted ? ' + hub' : ''}`], ...w.score, ...(z ? { perf: z.perf, scale: z.scale } : {}) };
}
/** The weighted score out of 100 (Cost 30 · Performance 20 · Security 20 · Effort and time 15 · Scale 15). */
export function wayScore(key, cloud = 'AWS', zone = 'inter') {
  const sc = wayScores(key, cloud, zone);
  if (CRITERIA.some(c => !sc[c.key] || sc[c.key][0] === null || sc[c.key][0] === undefined)) return null;
  return Math.round(CRITERIA.reduce((a, c) => a + c.weight * sc[c.key][0] / 5, 0));
}

/**
 * The ways as Ways to connect draws them: each with its five criteria scored, its clouds, its price and its score, on
 * the deck's reference rates (us-east-1). zone picks peering's last hop ('intra' or 'inter').
 */
export function wayCards(zone = 'intra', answers = {}) {
  // Scored as Recommended scores them (2026-10-09): the deck's criteria re-weighted by the estate's answers, the hard rules
  // marking a way that cannot do what was asked. With no answers, the defaults: the deck's weights and your BGP.
  const it = { ...INTENT_DEFAULT, ...answers };
  return WAYS.map(w => {
    const z = zoneOf(w, 'AWS', zone);
    const monthly = wayMonthly(w.key, 'AWS', zone), score = wayScores(w.key, 'AWS', zone), misses = wayWhy(w.key, 'AWS', it, z ? z.key : zone).filter(x => x.miss);
    return { ...w, monthly, zone: z ? z.key : null, zoneLabel: z ? z.label : '', points: wayScoreFor(w.key, 'AWS', it, z ? z.key : zone), misses: misses.length, missWords: misses.map(x => x.words).join('; '), answers: it, strip: wayStrip(w.key), rows: CRITERIA.map(c => { const sc = score[c.key] || [null, ''];
      return { ...c, score: sc[0], value: sc[1], segs: segs(sc[0]), title: `${c.label}: ${sc[1] || 'not scored yet'}${sc[0] ? ` (${sc[0]} of 5, weighs ${c.weight})` : ''}${c.key === 'cost' && w.hosted ? '. Cloud pass-through at 1 Gbps; the hub\'s vSRX, compute and AT&T margin are priced at review' : ''}${c.key === 'setup' ? `. ${waySetup(w.key)}` : ''}` }; }) };
  });
}

/**
 * What the connection is for (the journey's Intent beat; Micah, 2026-10-08: "we need to understand intent in the flow -
 * is it business critical? Is it a lab? Does it need priority traffic? Do you care about security? ... need to impact
 * choices, and policy options", then "preferred routing (layer 3)? preferred security?"). Four questions, each a few
 * glyph answers. The answers are the deck's own discovery step (slide 6, "From Discovery to the Right Connection"): hard
 * rules remove the ways that cannot do what was asked, the five criteria are re-weighted ("Weighted; customer adjusts"),
 * and the top pick and two alternatives each say why.
 */
export const INTENT = [
  { key: 'purpose', label: 'Purpose', icon: 'target', opts: [
    ['critical', 'Critical', 'verified', 'Business critical: zone-redundant, SLA-backed, two paths'],
    ['prod', 'Production', 'apps', 'Production: the deck\'s weights as they stand'],
    ['lab', 'Lab', 'gear', 'A lab: cost and speed first; one zone is fine'] ] },
  { key: 'traffic', label: 'Traffic', icon: 'arrows-horizontal', opts: [
    ['priority', 'Priority', 'high-meter', 'Priority traffic: deterministic latency, held to an SLO'],
    ['standard', 'Standard', 'smart-meter', 'Standard traffic: best path, no SLO of its own'] ] },
  { key: 'security', label: 'Security', icon: 'check-shield', opts: [
    ['private', 'Private', 'padlock', 'A private path: never the public internet, route policy at L3'],
    ['inspected', 'Inspected', 'firewall', 'Inspected in path: L3 to L7 on the vSRX in AT&T\'s hub'],
    ['service', 'Per service', 'restricted', 'Per service: expose named services only, no routed reach'] ] },
  { key: 'routing', label: 'Routing · L3', icon: 'shuffle', opts: [
    ['bgp', 'Your BGP', 'router', 'You peer BGP with AT&T, as your sites already do: routed both ways'],
    ['hub', 'AT&T\'s hub', 'hub', 'AT&T runs the routing in its hub; no gateway in your VPC'],
    ['transitive', 'Transitive', 'merge', 'Many VPCs reach each other through one hub'] ] },
].map(q => ({ ...q, opts: q.opts.map(([key, label, icon, title]) => ({ key, label, icon, title })) }));
export const INTENT_DEFAULT = { purpose: 'prod', traffic: 'standard', security: 'private', routing: 'bgp' };
/** The answers your tags suggest: a Dev or Lab tag reads as a lab, a GPU or AI tag as priority traffic. */
export function intentFromTags(tags = []) {
  const t = new Set(tags.map(x => String(x).toLowerCase()));
  return { ...INTENT_DEFAULT, ...(t.has('dev') || t.has('lab') ? { purpose: 'lab' } : {}), ...(t.has('gpu') || t.has('ai') ? { traffic: 'priority' } : {}) };
}
/** Each answer as the deck's rules: weight deltas on the five criteria, a hard rule with its miss, a soft preference. */
/** The answers' rules (exported 2026-10-12 so the portal export can write them in words). */
export const RULE = {
  critical: { w: { perf: 10, sec: 5, cost: -10, scale: 5 }, must: (w, z) => z !== 'intra', miss: ['One zone only', 'an outage takes it down'] },
  lab: { w: { cost: 20, setup: 10, perf: -10, sec: -10, scale: -10 } },
  priority: { w: { perf: 15, cost: -5, setup: -5 } },
  inspected: { w: { sec: 10, cost: -5 }, must: (w) => !!w.inspect, miss: ['No inspection in path', 'L3 route policy only'] },
  service: { w: { sec: 10 }, must: (w) => w.key === 'privatelink', miss: ['Routed, not per service', 'reaches the whole VPC'] },
  bgp: { prefer: (w) => !w.hosted },
  hub: { w: { setup: 5 }, must: (w) => !!w.hosted, miss: ['You run the gateway', 'and BGP, in your VPC'] },
  transitive: { w: { scale: 10 }, must: (w) => !['peer', 'privatelink'].includes(w.key), prefer: (w) => w.key === 'transit', miss: ['Not transitive', 'one peering per VPC'] },
};
const answersOf = (intent) => INTENT.map(q => (intent || {})[q.key] || INTENT_DEFAULT[q.key]);
/** The five weights an intent sets, each kept at 5 or more, summing to 100. */
export function intentWeights(intent) {
  const raw = Object.fromEntries(CRITERIA.map(c => [c.key, c.weight]));
  for (const a of answersOf(intent)) for (const [k, d] of Object.entries((RULE[a] || {}).w || {})) raw[k] += d;
  for (const k of Object.keys(raw)) raw[k] = Math.max(5, raw[k]);
  const sum = Object.values(raw).reduce((x, y) => x + y, 0);
  const out = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round(v / sum * 100)]));
  const drift = 100 - Object.values(out).reduce((x, y) => x + y, 0);
  const top = Object.keys(out).sort((a, b) => out[b] - out[a])[0]; out[top] += drift;
  return out;
}
/** Peering's last hop for an intent: a lab on AWS accepts one zone, so its free same-AZ rung is on offer. */
export const intentZone = (key, cloud, intent) => (key === 'peer' && cloud === 'AWS' && answersOf(intent)[0] === 'lab' ? 'intra' : 'inter');
/** Why a way, for an intent: each answer's reason in the deck's words, ok, a caution (warn) or a hard rule it misses. */
export function wayWhy(key, cloud, intent, zone) {
  const w = wayOf(key); if (!w) return [];
  const z = zone || intentZone(key, cloud, intent), sc = wayScores(key, cloud, z), out = [];
  // Each reason names the question that asked for it (q), so the Why can pair every answer with what it got.
  const r = (kind, icon, short, words, q = '') => out.push({ key: `${kind}:${short}`, kind, icon, short, words, q, ok: kind === 'ok', warn: kind === 'warn', miss: kind === 'miss' });
  const [purpose, traffic, security, routing] = answersOf(intent);
  if (purpose === 'critical') { if (!w.hosted) r('ok', 'verified', '99.99% SLA', 'redundancy included', 'purpose'); else if (z !== 'intra') r('ok', 'merge', 'Zone-redundant', 'across AZs', 'purpose'); }
  if (purpose === 'lab') { if (z === 'intra') r('ok', 'bill', '$0 last hop', 'free inside one AZ', 'purpose'); else if ((sc.cost || [])[0] >= 5) r('ok', 'bill', 'Lowest monthly', 'at 1 Gbps', 'purpose'); if (w.level === 'approve') r('ok', 'clock', 'Click + approve', `one action, ${w.time}`, 'purpose'); }
  if (traffic === 'priority') { if ((sc.perf || [])[0] >= 5) r('ok', 'high-meter', w.hosted ? 'Multi-region' : 'Deterministic', w.hosted ? 'policy-driven' : 'private MPLS path', 'traffic'); else r('warn', 'high-meter', 'One more hop', 'through AT&T\'s hub', 'traffic'); }
  if (security === 'private') r('ok', 'padlock', w.hosted ? 'Private IP' : 'Never the internet', w.hosted ? 'end to end' : 'private, end to end', 'security');
  if (security === 'inspected' && w.inspect) r('ok', 'firewall', 'L3 to L7', 'vSRX in AT&T\'s hub', 'security');
  if (security === 'service' && key === 'privatelink') r('ok', 'restricted', 'Per-service allow-list', 'one endpoint each', 'security');
  if (routing === 'bgp') { if (!w.hosted) r('ok', 'router', 'Your BGP', 'as your sites run it', 'routing'); else r('warn', 'router', 'Static route', 'no BGP, one route', 'routing'); }
  if (routing === 'hub' && w.hosted) r('ok', 'hub', 'AT&T runs it', 'no gateway in your VPC', 'routing');
  if (routing === 'transitive') { if (key === 'transit') r('ok', 'merge', 'Transitive', 'one route table', 'routing'); else if (key === 'cloudwan') r('ok', 'global-network', 'Segments', 'reach across regions', 'routing'); else if (!w.hosted) r('ok', 'router', 'Any to any', 'every VPC, every site', 'routing'); }
  if (!w.hosted && purpose !== 'lab') r('ok', 'bill', 'Flat bill', '308.99 TB included');
  // Each way's own best fit, the deck's row of that name.
  const FIT = { att: ['shopping-bag', 'One order', 'AT&T holds the port'], peer: ['check-circle', 'Accept + one route', 'nothing else to run'],
    transit: ['merge', 'Many VPCs', 'inspected centrally'], cloudwan: ['global-network', 'Multi-region', 'policy-driven routing'],
    privatelink: ['restricted', 'Overlap is fine', 'NAT on both sides'] }[key];
  if (FIT && !out.some(x => x.short === FIT[1])) r('ok', FIT[0], FIT[1], FIT[2]);
  answersOf(intent).forEach((a, i) => { const R = RULE[a]; if (R && R.must && !R.must(w, z)) r('miss', 'not-available', R.miss[0], R.miss[1], INTENT[i].key); });
  return out;
}
/** A way's score for an intent: the re-weighted criteria out of 100, five more for each soft preference it meets. */
export function wayScoreFor(key, cloud, intent, zone) {
  const z = zone || intentZone(key, cloud, intent), sc = wayScores(key, cloud, z), wt = intentWeights(intent);
  if (CRITERIA.some(c => !sc[c.key] || sc[c.key][0] === null || sc[c.key][0] === undefined)) return null;
  const base = CRITERIA.reduce((a, c) => a + wt[c.key] * sc[c.key][0] / 5, 0);
  const pref = answersOf(intent).filter(a => RULE[a] && RULE[a].prefer && RULE[a].prefer(wayOf(key), z)).length * 5;
  return Math.min(100, Math.round(base + pref));
}
/**
 * The deck's recommendation for an intent: every way the cloud offers, the ones a hard rule removes put behind the rest
 * (fewest misses first, so a conflict still shows the closest), then by score, then the cheaper. Top pick and two more.
 */
export function rankWays(cloud, intent, n = 3) {
  const all = WAYS.filter(w => wayAvailable(w.key, cloud)).map(w => { const zone = intentZone(w.key, cloud, intent), why = wayWhy(w.key, cloud, intent, zone);
    return { key: w.key, zone, pts: wayScoreFor(w.key, cloud, intent, zone), why, misses: why.filter(x => x.miss).length, monthly: wayMonthly(w.key, cloud, zone) }; });
  return all.filter(x => x.pts !== null).sort((a, b) => a.misses - b.misses || b.pts - a.pts || (a.monthly ?? 1e9) - (b.monthly ?? 1e9)).slice(0, n);
}

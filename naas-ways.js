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
import { fmt } from './naas-logic.js';

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

/** A way's label for one cloud: the port named as that cloud names it. */
export function wayLabel(key, cloud) {
  const port = PORT_NAME[cloud] || 'port';
  return ({ byo: `Your ${port}`, att: `AT&T's ${port}`, peer: `Hosted ${hostedWord(cloud)} peering`, privatelink: 'Hosted PrivateLink', cloudwan: 'Hosted Cloud WAN', transit: 'Hosted transit gateway' })[key] || '';
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
export function wayCards(zone = 'intra') {
  return WAYS.map(w => {
    const z = zoneOf(w, 'AWS', zone);
    const monthly = wayMonthly(w.key, 'AWS', zone), score = wayScores(w.key, 'AWS', zone);
    return { ...w, monthly, zone: z ? z.key : null, zoneLabel: z ? z.label : '', points: wayScore(w.key, 'AWS', zone), strip: wayStrip(w.key), rows: CRITERIA.map(c => { const sc = score[c.key] || [null, ''];
      return { ...c, score: sc[0], value: sc[1], segs: segs(sc[0]), title: `${c.label}: ${sc[1] || 'not scored yet'}${sc[0] ? ` (${sc[0]} of 5, weighs ${c.weight})` : ''}${c.key === 'cost' && w.hosted ? '. Cloud pass-through at 1 Gbps; the hub\'s vSRX, compute and AT&T margin are priced at review' : ''}${c.key === 'setup' ? `. ${waySetup(w.key)}` : ''}` }; }) };
  });
}

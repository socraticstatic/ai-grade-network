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
// Each way is scored 1 to 5 on the session's five criteria (cost, performance, security, setup effort, time to
// stand up), 5 the most favourable. The scores and prices are estimates until the stakeholder's deck lands; every
// price is the storefront's own catalog, so Review and Cost read the same figure.
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
 * What a way adds to an order beyond the catalog: the cloud port AT&T orders and holds, the hosted PrivateLink
 * service, and a Cloud WAN attachment (priced after a survey). The marketplace does not sell these on their own.
 */
export const EXTRA = {
  'port-att': { id: 'port-att', name: 'Cloud port, AT&T-provided', price: 300 },
  'privatelink': { id: 'privatelink', name: 'AT&T-hosted PrivateLink service', price: 2700 },
  'cloud-wan': { id: 'cloud-wan', name: 'Cloud WAN attachment', price: null },
};
export const productOf = (id) => CATALOG.find(p => p.id === id) || EXTRA[id] || null;

/** The five criteria, each with the glyph its row wears. */
export const CRITERIA = [
  { key: 'cost', label: 'Cost', icon: 'bill' },
  { key: 'perf', label: 'Performance', icon: 'high-meter' },
  { key: 'sec', label: 'Security', icon: 'check-shield' },
  { key: 'effort', label: 'Setup effort', icon: 'wrench' },
  { key: 'time', label: 'Time to stand up', icon: 'clock' },
];

/**
 * The ways, in the order the session drew them. `products` are what one region's order carries (the hosted
 * product is the cloud's VNet or VPC). `zones` is peering's choice: inside one availability zone, or across
 * them, where the cloud bills the transfer between zones.
 */
export const WAYS = [
  { key: 'byo', title: 'Bring your own port', kicker: 'NetBond Advanced', icon: 'cable', path: 'netbond',
    line: 'Your Direct Connect, ExpressRoute or Interconnect, carried on the AT&T network. NetBond Advanced as it runs today.',
    clouds: ['AWS', 'Azure', 'GCP', 'Oracle'], products: ['netbond'],
    score: { perf: [5, 'Private, steady'], sec: [4, 'Off the internet'], effort: [3, 'You order the port'], time: [3, 'About 2 weeks'] } },
  { key: 'att', title: 'AT&T provides the port', kicker: 'NetBond Advanced', icon: 'hub', path: 'netbond',
    line: "AT&T orders the cloud's Direct Connect or ExpressRoute and holds it. One order, one bill.",
    clouds: ['AWS', 'Azure'], products: ['netbond', 'port-att'],
    score: { perf: [5, 'Private, steady'], sec: [4, 'Off the internet'], effort: [5, 'AT&T does it'], time: [4, '10 business days'] } },
  { key: 'peer', title: 'Hosted VNet or VPC', kicker: 'AT&T-hosted', icon: 'check-shield', path: 'netbond', inspect: true,
    line: 'AT&T runs a VNet or VPC with the vSRX pair in your region and peers it to yours. Inspected in path.',
    clouds: ['AWS', 'Azure', 'GCP'], products: ['netbond', 'hosted'],
    zones: { intra: { label: 'Same zone', perf: [4, 'One zone, no hop'] }, inter: { label: 'Across zones', perf: [3, 'Crosses zones'], costNote: 'plus zone transfer' } },
    score: { perf: [4, 'One zone, no hop'], sec: [5, 'Inspected, segmented'], effort: [4, 'AT&T builds it'], time: [2, '3 to 4 weeks'] } },
  { key: 'privatelink', title: 'Hosted PrivateLink', kicker: 'AT&T-hosted', icon: 'padlock', path: 'netbond',
    line: 'Each service you expose gets its own private endpoint. Private, and set up once per service.',
    clouds: ['AWS', 'Azure'], products: ['netbond', 'privatelink'], perService: true,
    score: { perf: [4, 'Private'], sec: [5, 'Private per service'], effort: [1, 'Once per service'], time: [2, '3 to 4 weeks'] } },
  { key: 'cloudwan', title: 'AT&T to Cloud WAN', kicker: 'Cloud WAN', icon: 'global-network', path: 'netbond',
    line: "The AT&T network joins the cloud's own global WAN: AWS Cloud WAN or Azure Virtual WAN.",
    clouds: ['AWS', 'Azure'], products: ['netbond', 'cloud-wan'],
    score: { perf: [4, 'Across regions'], sec: [4, 'Off the internet'], effort: [3, 'You run the WAN'], time: [3, '2 to 3 weeks'] } },
  // A placeholder the session agreed to keep ("for now you can just put a placeholder here"); deleted if it does not apply.
  { key: 'transit', title: 'Transit gateway', kicker: 'Transit', icon: 'merge', path: 'netbond', soon: true,
    line: "Attach to your cloud's transit gateway or Virtual WAN hub.",
    clouds: [], products: [], score: {} },
];
export const wayOf = (key) => WAYS.find(w => w.key === key) || null;
/** The hosted product a peering way buys for a cloud: a VNet on Azure, a VPC elsewhere. */
const productIds = (w, cloud) => w.products.map(id => (id === 'hosted' ? (cloud === 'Azure' ? 'hosted-vnet' : 'hosted-vpc') : id));

/** One region's monthly for a way on a cloud: the sum of its products, null when any waits on a survey. */
export function wayMonthly(key, cloud) {
  const w = wayOf(key);
  if (!w || w.soon) return null;
  const ps = productIds(w, cloud).map(productOf);
  return ps.every(p => p && typeof p.price === 'number') ? ps.reduce((a, p) => a + p.price, 0) : null;
}
/** Cost's score: the cheapest way 5, the dearest 1, by the monthly on a reference cloud (Azure, the session's). */
function costScore(key) {
  const m = wayMonthly(key, 'Azure');
  if (m === null) return null;
  return m <= 1800 ? 5 : m <= 2400 ? 4 : m <= 3600 ? 3 : m <= 4200 ? 2 : 1;
}
/** A way's products, named for a cloud and a quantity of regions: [[id, n]] for the moves model. */
export const wayProducts = (key, cloud, n = 1) => { const w = wayOf(key); return w ? productIds(w, cloud).map(id => [id, n]) : []; };
/** The order lines a way adds beyond the connection the type already prices (NetBond is that connection). */
export const wayExtras = (key, cloud) => { const w = wayOf(key); return w ? productIds(w, cloud).filter(id => id !== 'netbond').map(productOf).filter(Boolean) : []; };

/** A way's label for one cloud: the port named as that cloud names it. */
export function wayLabel(key, cloud) {
  const port = PORT_NAME[cloud] || 'port';
  return ({ byo: `Your ${port}`, att: `AT&T's ${port}`, peer: `Hosted ${hostedWord(cloud)} peering`, privatelink: 'Hosted PrivateLink', cloudwan: 'AT&T to Cloud WAN', transit: 'Transit gateway' })[key] || '';
}
/** Who sets it up and how long, short enough for a card's row. */
export const waySetup = (key) => { const w = wayOf(key); return w && w.score.effort ? `${w.score.effort[1]} · ${w.score.time[1]}` : ''; };
export const wayAvailable = (key, cloud) => { const w = wayOf(key); return !!w && !w.soon && w.clouds.includes(isGoogle(cloud) ? 'GCP' : cloud); };

/**
 * The best ways for a cloud, in the session's order of priority. Azure and AWS have three; Google has two, so
 * its third is the way it cannot have, said as such. Oracle rides NetBond on its own port alone.
 */
export function recommendedFor(cloud) {
  if (cloud === 'Azure' || cloud === 'AWS') return ['byo', 'att', 'peer'].map(key => ({ key }));
  if (isGoogle(cloud)) return [{ key: 'byo' }, { key: 'peer' }, { key: 'att', unavailable: `Not on Google Cloud: AT&T cannot provide its Interconnect` }];
  if (cloud === 'Oracle') return [{ key: 'byo' }];
  return [];
}

/** A score as five segments, lit up to the score; null reads as unscored. */
export const segs = (n) => [1, 2, 3, 4, 5].map(i => ({ key: 's' + i, on: n !== null && n !== undefined && i <= n }));

/**
 * The ways as Ways to connect draws them: each with its five criteria scored, its clouds and its price.
 * zone picks peering's variant ('intra' or 'inter').
 */
export function wayCards(zone = 'intra') {
  return WAYS.map(w => {
    const z = w.zones ? (w.zones[zone] || w.zones.intra) : null;
    const monthly = wayMonthly(w.key, 'Azure');
    const cost = w.soon ? [null, ''] : [costScore(w.key), monthly === null ? 'Priced after survey' : `${fmt(monthly)}/mo${w.perService ? ' a service' : ''}${z && z.costNote ? ` ${z.costNote}` : ''}`];
    const score = { cost, ...w.score, ...(z ? { perf: z.perf } : {}) };
    return { ...w, monthly, zone: z ? zone : null, rows: CRITERIA.map(c => { const sc = score[c.key] || [null, ''];
      return { ...c, score: sc[0], value: sc[1], segs: segs(sc[0]), title: `${c.label}: ${sc[1] || 'not scored yet'}${sc[0] ? ` (${sc[0]} of 5)` : ''}` }; }) };
  });
}

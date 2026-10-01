/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-drill.js: every figure on Discover opens what it counts (Micah, 2026-09-30:
// "the small pills beside discover ... should be clickable"; "it would be good to
// click on pie charts - it all should be drillable"; "discover estate should be
// more drillable"; "on all of the at a glance drills, what's the point? actions
// may help"; "discover - estate - integrate costs").
//
// Pure data: the sets behind Discover's figures, the lists they land on, and what
// each cloud, region and site costs a month as Cost v2 reads it. Two lists take a
// figure. Your clouds takes a filter (a unit, and what the things must be) and
// lists those things flat at the scope of its trail: "54 exposed workloads" lists
// the 54. Your sites takes a site filter and keeps drilling by place, region >
// state > sites, never flat: every level holds only the sites the figure counted.
import * as S from './naas-sites.js';
import { onAtt, siteModeOf, connModeOf, CONN_LABEL } from './naas-logic.js';
import * as CV from './naas-cost-view.js';

const nf = (x) => Number(x || 0).toLocaleString('en-US');
const nn = (n, one, many) => `${nf(n)} ${n === 1 ? one : many}`;

// ---------- Your clouds ----------

/** The scope a Your clouds trail names: ['cloud:AWS', 'region:us-east-1', 'vpc:<id>', 'sn:<id>']. */
export function scopeOf(trail = []) {
  const at = (i, p) => (trail[i] ? String(trail[i]).replace(p, '') : null);
  return { cloud: at(0, /^cloud:/), region: at(1, /^region:/), vpcId: at(2, /^vpc:/), snId: at(3, /^sn:/) };
}

/** Everything under a trail's scope, flattened by unit, each carrying where it sits and its region as the estate holds it. */
export function unitsOf(est, inv, trail = []) {
  const sc = scopeOf(trail);
  const top = (name) => (est.regionsList || []).find(r => r.region === name) || { priv: false, region: name };
  const regs = (inv || []).flatMap(c => (c.regions || []).map(r => ({ r, cloud: r.cloud || c.name, top: top(r.region) })))
    .filter(x => (!sc.cloud || x.cloud === sc.cloud) && (!sc.region || x.r.region === sc.region));
  const vpcs = regs.flatMap(x => (x.r.vpcs || []).map(v => ({ ...x, v }))).filter(x => !sc.vpcId || x.v.id === sc.vpcId);
  const sns = vpcs.flatMap(x => (x.v.subnets || []).map(sn => ({ ...x, sn }))).filter(x => !sc.snId || x.sn.id === sc.snId);
  const wls = sns.flatMap(x => (x.sn.workloads || []).map(w => ({ ...x, w })));
  return { regs, vpcs, sns, wls, scope: sc };
}

// On AT&T means the workload's region is attached: the count the Workloads ring,
// Attach and the apps table already use (naas-apps.js).
const tagOf = (w) => w.tag || 'untagged';
const WL_STATE = { exposed: (x) => !!x.w.exposed, att: (x) => !!x.top.priv, internet: (x) => !x.top.priv };
const REG_STATE = { priv: (x) => !!x.top.priv, pub: (x) => !x.top.priv };
const vpcMode = (x) => (x.v.priv ? connModeOf(x.top) : 'internet');
const isNewOf = (days) => (x) => !!x && x.since != null && x.since <= days;

/** Does a workload (as unitsOf carries it) belong to the filter's set. */
export function wlPass(f = {}) {
  return (x) => (!f.tag || tagOf(x.w) === f.tag)
    && (!f.state || (WL_STATE[f.state] ? WL_STATE[f.state](x) : true))
    && (!f.regions || f.regions.includes(x.r.region));
}

const where = (f) => (f.regions && f.regions.length ? ` in ${f.regions.join(', ')}` : '');
/** What a filter is called where it lands: the chip names it. */
export function cloudFilterLabel(f = {}) {
  if (f.unit === 'region') {
    if (f.state === 'priv') return 'Private regions';
    if (f.state === 'pub') return 'Regions on the internet';
    if (f.tag) return `Regions ${f.tag} runs in`;
    return f.regions ? `Regions${where(f)}` : 'All regions';
  }
  if (f.unit === 'vpc') {
    if (f.state === 'attached') return 'Attached VPCs and VNets';
    if (/^mode:/.test(f.state || '')) return `VPCs and VNets on ${(CONN_LABEL[f.state.slice(5)] || { short: f.state.slice(5) }).short}`;
    return `VPCs and VNets${where(f)}`;
  }
  if (f.unit === 'subnet') return 'All subnets';
  if (f.unit === 'app') return 'All apps';
  if (f.unit === 'new') return `New in the last ${f.label || `${f.days} days`}`;
  if (f.unit === 'workload') {
    const tag = f.tag ? `${f.tag} ` : '';
    if (f.state === 'exposed') return `Exposed ${tag}workloads${where(f)}`;
    if (f.state === 'att') return `${f.tag ? `${f.tag} workloads` : 'Workloads'} on AT&T${where(f)}`;
    if (f.state === 'internet') return `${f.tag ? `${f.tag} workloads` : 'Workloads'} on the internet${where(f)}`;
    return f.tag ? `${f.tag} workloads${where(f)}` : where(f) ? `Workloads${where(f)}` : 'All workloads';
  }
  return '';
}

export const UNIT_NOUN = { region: ['region', 'regions'], vpc: ['VPC or VNet', 'VPCs and VNets'], subnet: ['subnet', 'subnets'], workload: ['workload', 'workloads'], app: ['app', 'apps'], new: ['new thing', 'new things'] };

/**
 * The things a Your clouds filter counts, at the trail's scope: each item is one
 * thing the figure counted, so `total` is the figure. An item carries where it
 * sits (cloud, region as the estate holds it, VPC, subnet) so the list can say so
 * and open it.
 */
export function cloudSet(est, inv, trail = [], f = {}) {
  const U = unitsOf(est, inv, trail);
  let items = [];
  if (f.unit === 'region') {
    const tagged = f.tag ? new Set(U.wls.filter(x => tagOf(x.w) === f.tag).map(x => x.r.region)) : null;
    items = U.regs.filter(x => (!f.state || REG_STATE[f.state](x)) && (!tagged || tagged.has(x.r.region)) && (!f.regions || f.regions.includes(x.r.region)))
      .map(x => ({ kind: 'region', key: 'region:' + x.r.region, ...x }));
  } else if (f.unit === 'vpc') {
    const pass = (x) => !f.state || (f.state === 'attached' ? !!x.v.priv : /^mode:/.test(f.state) ? vpcMode(x) === f.state.slice(5) : true);
    items = U.vpcs.filter(x => pass(x) && (!f.regions || f.regions.includes(x.r.region))).map(x => ({ kind: 'vpc', key: 'vpc:' + x.v.id, ...x }));
  } else if (f.unit === 'subnet') {
    items = U.sns.map(x => ({ kind: 'subnet', key: 'sn:' + x.sn.id, ...x }));
  } else if (f.unit === 'app') {
    const by = {};
    U.wls.forEach(x => { const k = tagOf(x.w); const g = by[k] = by[k] || { kind: 'app', key: 'app:' + k, tag: k, wl: 0, exposed: 0, internet: 0, regions: new Set() }; g.wl++; if (x.w.exposed) g.exposed++; if (!x.top.priv) g.internet++; g.regions.add(x.r.region); });
    items = Object.values(by).sort((a, b) => b.wl - a.wl || a.tag.localeCompare(b.tag)).map(g => ({ ...g, regions: [...g.regions] }));
  } else if (f.unit === 'workload') {
    items = U.wls.filter(wlPass(f)).sort((a, b) => (b.w.exposed - a.w.exposed) || tagOf(a.w).localeCompare(tagOf(b.w)) || String(a.w.name).localeCompare(String(b.w.name)))
      .map(x => ({ kind: 'workload', key: 'wl:' + x.w.id, ...x }));
  } else if (f.unit === 'new') {
    // What discovery found inside the window: the VPCs, then the workloads, the same things the pill counts.
    const fresh = isNewOf(f.days);
    items = [...U.vpcs.filter(x => fresh(x.v)).map(x => ({ kind: 'vpc', key: 'vpc:' + x.v.id, ...x })),
      ...U.wls.filter(x => fresh(x.w)).map(x => ({ kind: 'workload', key: 'wl:' + x.w.id, ...x }))];
  }
  const noun = UNIT_NOUN[f.unit] || ['row', 'rows'];
  const vN = items.filter(x => x.kind === 'vpc').length, wN = items.filter(x => x.kind === 'workload').length;
  const line = f.unit === 'new' ? `${nf(items.length)} new · ${nn(vN, 'VPC', 'VPCs')} and ${nn(wN, 'workload', 'workloads')}` : nn(items.length, noun[0], noun[1]);
  return { unit: f.unit, items, total: items.length, noun, label: cloudFilterLabel(f), line };
}

/** The public regions a set of cloud items touches: the ones Attach would bring onto AT&T. */
export function publicRegionsOf(items) {
  const out = [];
  for (const x of items || []) {
    if (x.kind === 'app') continue;
    if (x.top && !x.top.priv && !out.includes(x.top.region || x.r.region)) out.push(x.top.region || x.r.region);
  }
  return out;
}

// ---------- Your sites ----------

/**
 * Site filters, by key. Each is a predicate on a site as the estate holds it, so a
 * rollup ("Remote sites (212)") passes or fails whole and counts as its number, the
 * way every site figure on Discover already counts it.
 *   att | outside          on AT&T, or not (onAtt: the pill, the ring, the rows)
 *   prim:<service key>     the site's primary service (the Sites ring's segments)
 *   mode:<ipsec|sdwan>     how it reaches the cloud (How they connect)
 *   bu:<unit>              its business unit, by the customer's tags
 *   single                 on AT&T with one service: no backup path
 */
export function sitePass(key, tags = {}) {
  const k = String(key || '');
  if (k === 'att') return (x) => onAtt(x);
  if (k === 'outside') return (x) => !onAtt(x);
  if (k === 'single') return (x) => onAtt(x) && Array.isArray(x.services) && S.servicesOf(x).length === 1;
  if (k.startsWith('prim:')) return (x) => ((S.servicesOf(x)[0] || {}).key || 'other') === k.slice(5);
  if (k.startsWith('mode:')) return (x) => siteModeOf(x) === k.slice(5);
  if (k.startsWith('bu:')) return (x) => S.buOf(x, tags) === k.slice(3);
  return () => true;
}

/** What a site filter is called where it lands. */
export function siteFilterLabel(key, est) {
  const k = String(key || '');
  if (k === 'att') return 'Sites on AT&T';
  if (k === 'outside') return 'Sites outside AT&T';
  if (k === 'single') return 'Sites on one path';
  if (k.startsWith('prim:')) {
    const v = S.SERVICE[k.slice(5)] || ((est && est.sites) || []).map(x => S.servicesOf(x)[0]).find(s0 => s0 && s0.key === k.slice(5));
    return `Sites on ${(v || { label: k.slice(5) }).label}`;
  }
  if (k.startsWith('mode:')) return `${(CONN_LABEL[k.slice(5)] || { short: k.slice(5) }).short} sites`;
  if (k.startsWith('bu:')) return k.slice(3);
  return '';
}

/** The keys a placeFilter holds ('att&bu:HQ' is two). */
export const siteKeysOf = (pf) => (pf ? [...new Set(String(pf).split('&').filter(Boolean))] : []);

/** The sites a set of filter keys keeps, and how many sites that is (a rollup counts as its number). */
export function siteSet(est, keys, tags = {}) {
  const ks = Array.isArray(keys) ? keys : siteKeysOf(keys);
  const sites = (est.sites || []).filter(x => ks.every(k => sitePass(k, tags)(x)));
  return { sites, total: sites.reduce((a, x) => a + S.countOf(x.name), 0), label: ks.map(k => siteFilterLabel(k, est)).join(' · ') };
}

// ---------- the ring ----------

/**
 * Which segment of a conic ring a click landed in: the centre (the hole, or a
 * keyboard press, which has no point) or the segment whose arc holds the angle.
 * `segs` are [{ from, to }] in percent of the turn, clockwise from twelve.
 * Returns -1 for the centre, else the segment's index.
 */
export function ringHit(segs, dx, dy, radius, hole) {
  const r = Math.hypot(dx, dy);
  if (r < hole || r > radius + 1) return -1;
  let deg = Math.atan2(dx, -dy) * 180 / Math.PI; if (deg < 0) deg += 360;
  const pct = deg / 360 * 100;
  const i = segs.findIndex(s => pct >= s.from && pct < s.to);
  return i >= 0 ? i : segs.length - 1;
}

// ---------- What it costs (Cost v2's own figures) ----------

const PAGE = 6; // By leg's rows per page (naas-app.js PAGE_SIZE legAccessRows/legCloudRows)
const byV = (label) => (a, b) => b.v - a.v || label(a).localeCompare(label(b));

/**
 * Each cloud's egress, each cloud region's egress and each site's access a month,
 * read from the one cost model (R.costLegs) through Cost v2's own slices, with the
 * Cost view that shows the same number:
 *   cloud   By leg, By cloud, the cloud picked, Egress open: its head reads the figure.
 *   region  By leg, By region, its place picked, Egress open: its row reads the figure.
 *   site    By leg, By region, its place picked, its service's row open: its row
 *           reads the figure. A site that buys two services (a backup) has a row in
 *           each, so its figure is their sum and opens its services, each priced.
 * A cloud with no egress bucket has no egress figure: it is not measured.
 */
export function costIndex(est, L) {
  const cloud = {}, region = {}, site = {};
  if (!L) return { cloud, region, site };
  const regs = est.regionsList || [];
  const egressOf = (sl) => (((sl.cloud || {}).rows || []).find(r => r.key === 'egress') || null);
  for (const cl of [...new Set(regs.map(r => r.cloud))]) {
    const row = egressOf(CV.sliceLegs(est, L, 'cloud', cl));
    if (row && row.parts.length) cloud[cl] = { v: row.v, view: { costPanel: 'legs', costBy: 'cloud', costPick: cl, legDrill: { leg: 'cloud', row: 'egress' }, legPPage: 0 } };
  }
  const geos = [...new Set(regs.map(r => CV.geoOfRegion(r.region)))];
  for (const geo of geos) {
    const row = egressOf(CV.sliceLegs(est, L, 'region', geo));
    if (!row) continue;
    const label = (p) => p.kind === 'region' ? `${(regs.find(x => x.region === p.region) || {}).cloud || ''} ${p.region}`.trim() : (p.label || p.bucket || '');
    const sorted = [...row.parts].sort(byV(label));
    sorted.forEach((p, i) => { if (p.kind !== 'region') return;
      const g = region[p.region] = region[p.region] || { v: 0, geo, view: { costPanel: 'legs', costBy: 'region', costPick: geo, legDrill: { leg: 'cloud', row: 'egress' }, legPPage: Math.floor(i / PAGE) } };
      g.v += p.v; });
  }
  // Site access: a part per service a site buys.
  const placeOf = (name) => CV.placeOfSite((est.sites || []).find(x => x.name === name) || { name, metro: '' });
  const parts = {};
  for (const row of ((L.access || {}).rows || [])) for (const p of row.parts || []) { if (p.kind !== 'site') continue; (parts[p.site] = parts[p.site] || []).push({ row, p }); }
  for (const [name, ps] of Object.entries(parts)) {
    const place = placeOf(name);
    const sl = CV.sliceLegs(est, L, 'region', place);
    const svc = ps.map(({ row, p }) => {
      const mine = ((sl.access || {}).rows || []).find(r => r.key === row.key);
      const sorted = mine ? [...mine.parts].sort(byV(x => x.site || '')) : [];
      const i = Math.max(0, sorted.findIndex(x => x.site === name));
      return { key: row.key, svc: String(row.key).replace(/:remote$/, ''), label: row.label, v: p.v, carrier: !!row.carrier, role: p.role,
        view: { costPanel: 'legs', costBy: 'region', costPick: place, legDrill: { leg: 'access', row: row.key }, legAPage: Math.floor(i / PAGE) } };
    });
    site[name] = { v: svc.reduce((a, x) => a + x.v, 0), place, carrier: svc.every(x => x.carrier), svc, view: svc.length === 1 ? svc[0].view : null };
  }
  return { cloud, region, site };
}

// ---------- Findings that name a set ----------

/** The first of `keys` that is an open finding, so "Open its finding" opens the one about this set. */
export function findingFor(findings, keys) {
  for (const k of keys || []) { const f = (findings || []).find(x => x.key === k); if (f) return f; }
  return null;
}

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
import { onAtt, siteModeOf, connModeOf, CONN_LABEL, regionOf } from './naas-logic.js';
import * as CV from './naas-cost-view.js';

const nf = (x) => Number(x || 0).toLocaleString('en-US');
const nn = (n, one, many) => `${nf(n)} ${n === 1 ? one : many}`;
/** A list's words, joined the way a sentence joins them ("a, b and c"). */
export const listOf = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** Names past three read as a count ("a, b, c and 2 more"). */
const someOf = (xs) => (xs.length <= 3 ? listOf(xs) : `${xs.slice(0, 3).join(', ')} and ${xs.length - 3} more`);

/**
 * "New in the last 30 days", "New in the last hour": a Since window's words read
 * once (skeptic, 2026-10-01: the hour's label already says "the last hour", and the
 * chip read "New in the last the last hour").
 */
export const inTheLast = (label) => (/^the /.test(String(label)) ? `in ${label}` : `in the last ${label}`);
export const newWords = (label) => `New ${inTheLast(label)}`;

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
    && (!f.tags || f.tags.includes(tagOf(x.w)))
    && (!f.state || (WL_STATE[f.state] ? WL_STATE[f.state](x) : true))
    && (!f.regions || f.regions.includes(x.r.region));
}

const where = (f) => (f.regions && f.regions.length ? ` in ${f.regions.join(', ')}` : '');
const NOUN_CAP = { cloud: 'Clouds', region: 'Regions', vpc: 'VPCs and VNets', subnet: 'Subnets', workload: 'Workloads', app: 'Apps' };
/** What a filter is called where it lands: the chip names it. */
export function cloudFilterLabel(f = {}) {
  // A tile under a filter opens its own unit of that set (2026-10-01): "Regions of exposed workloads".
  if (f.of && f.of.unit) {
    const parent = cloudFilterLabel(f.of);
    const head = f.state === 'exposed' ? 'Exposed workloads' : /^mode:/.test(f.state || '') ? `VPCs and VNets on ${(CONN_LABEL[f.state.slice(5)] || { short: f.state.slice(5) }).short}` : NOUN_CAP[f.unit] || 'Things';
    return f.of.unit === 'new' ? `${head} with something new` : `${head} of ${parent.charAt(0).toLowerCase()}${parent.slice(1)}`;
  }
  if (f.unit === 'cloud') return 'Clouds';
  if (f.unit === 'region') {
    if (f.state === 'priv') return 'Private regions';
    if (f.state === 'pub') return 'Regions on the internet';
    if (f.tag) return `Regions ${f.tag} runs in`;
    if (f.clouds && f.clouds.length) return `Regions in ${listOf(f.clouds)}`;
    return f.regions ? `Regions${where(f)}` : 'All regions';
  }
  if (f.unit === 'vpc') {
    if (f.state === 'attached') return 'Attached VPCs and VNets';
    if (/^mode:/.test(f.state || '')) return `VPCs and VNets on ${(CONN_LABEL[f.state.slice(5)] || { short: f.state.slice(5) }).short}`;
    return `VPCs and VNets${where(f)}`;
  }
  if (f.unit === 'subnet') return 'All subnets';
  if (f.unit === 'app') return 'All apps';
  if (f.unit === 'new') return newWords(f.label || `${f.days} days`);
  if (f.unit === 'workload') {
    if (f.tags && f.tags.length) return `Workloads in ${someOf(f.tags)}`;
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
  // A unit of another set: the same filter, on the inventory that set sits in.
  if (f.of && f.of.unit) { const inner = cloudSet(est, pruneInv(est, inv, trail, f.of), trail, { ...f, of: null }); return { ...inner, label: cloudFilterLabel(f) }; }
  const U = unitsOf(est, inv, trail);
  let items = [];
  if (f.unit === 'cloud') {
    items = [...new Set(U.regs.map(x => x.cloud))].map(cl => ({ kind: 'cloud', key: 'cloud:' + cl, cloud: cl }));
  } else if (f.unit === 'region') {
    const tagged = f.tag ? new Set(U.wls.filter(x => tagOf(x.w) === f.tag).map(x => x.r.region)) : null;
    items = U.regs.filter(x => (!f.state || REG_STATE[f.state](x)) && (!tagged || tagged.has(x.r.region)) && (!f.regions || f.regions.includes(x.r.region)) && (!f.clouds || f.clouds.includes(x.cloud)))
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
  // The latency an app's p95 reads, on the path that sets it (2026-10-01): the region's own, as the app reads it.
  const p95 = f.p95 && f.regions && f.regions.length ? (() => { const r = (est.regionsList || []).find(x => x.region === f.regions[0]); return r ? (r.priv ? r.fab : r.pub) : null; })() : null;
  const line = f.unit === 'new' ? `${nf(items.length)} new · ${nn(vN, 'VPC', 'VPCs')} and ${nn(wN, 'workload', 'workloads')}`
    : `${nn(items.length, noun[0], noun[1])}${p95 != null ? ` · p95 ${p95} ms` : ''}`;
  return { unit: f.unit, items, total: items.length, noun, label: cloudFilterLabel(f), line, p95 };
}

/**
 * The inventory a filter's set sits in, at the trail's scope: the regions, VPCs,
 * subnets and workloads it touches. A region or a VPC in the set comes whole; a
 * subnet or a workload brings only itself and what holds it. Your clouds' tiles
 * read it, so beside a filter they count the set, not the estate (skeptic,
 * 2026-10-01: "CLOUDS 4, VPCs 20 beside '53 new'").
 */
export function pruneInv(est, inv, trail = [], f = null) {
  if (!f || !f.unit || f.unit === 'app') return inv;
  const set = cloudSet(est, inv, trail, f);
  // A set of clouds sits in those clouds, whole ("Clouds of pci workloads" counts AWS, not three).
  if (f.unit === 'cloud') { const cls = new Set(set.items.map(x => x.cloud)); return (inv || []).map(c => ({ ...c, regions: (c.regions || []).filter(r => cls.has(r.cloud || c.name)) })).filter(c => c.regions.length); }
  const regs = new Set(), vpcs = new Set(), sns = new Set(), wls = new Set();
  const kv = (x) => `${x.r.region}|${x.v.id}`, ks = (x) => `${kv(x)}|${x.sn.id}`, kw = (x) => `${ks(x)}|${x.w.id}`;
  for (const x of set.items) {
    if (x.kind === 'region') regs.add(x.r.region);
    else if (x.kind === 'vpc') vpcs.add(kv(x));
    else if (x.kind === 'subnet') sns.add(ks(x));
    else if (x.kind === 'workload') wls.add(kw(x));
  }
  return (inv || []).map(c => ({ ...c, regions: (c.regions || []).map(r => {
    if (regs.has(r.region)) return r;
    const vs = (r.vpcs || []).map(v => {
      const at = { r, v };
      if (vpcs.has(kv(at))) return v;
      const ss = (v.subnets || []).map(sn => {
        if (sns.has(ks({ ...at, sn }))) return sn;
        const w = (sn.workloads || []).filter(w0 => wls.has(kw({ ...at, sn, w: w0 })));
        return w.length ? { ...sn, workloads: w } : null;
      }).filter(Boolean);
      return ss.length ? { ...v, subnets: ss } : null;
    }).filter(Boolean);
    return vs.length ? { ...r, vpcs: vs } : null;
  }).filter(Boolean) })).filter(c => c.regions.length);
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
  // 'prim:aiab,other,adi' is any of them: a ring's smallest segments open together (2026-10-01).
  if (k.startsWith('prim:')) { const want = k.slice(5).split(','); return (x) => want.includes((S.servicesOf(x)[0] || {}).key || 'other'); }
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
    const labelOf = (key) => (S.SERVICE[key] || ((est && est.sites) || []).map(x => S.servicesOf(x)[0]).find(s0 => s0 && s0.key === key) || { label: key }).label;
    return `Sites on ${someOf(k.slice(5).split(',').map(labelOf)).replace(/ and (?!\d)/, ' or ')}`;
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

/**
 * The sites a place holds, each as its share there (skeptic, 2026-10-01: Florida,
 * 709 sites, offered "Move 1,640 sites to AT&T"). A named site counts whole where
 * it sits; a rollup ("Remote sites, East (1,640)") counts the metros of it the
 * trail keeps, split as the whole estate splits it, and a site picked inside it
 * is one. `trail` is Your sites': ['region:X', 'state:YY', 'metro:Z', 'site:N'].
 * Each share: { site, n, whole, metros }.
 */
export function placeShares(est, sites, trail = []) {
  const tree = S.siteTree(est);
  const [tRg, tSt, tMe, tSi] = (trail || []).map(k => String(k).replace(/^(region|state|metro|site):/, ''));
  const stateOf = (m) => S.stateOf(m) || '—';
  const named = (sites || []).filter(x => !S.rollupKeyOf(est, x));
  const pickedNamed = !!tSi && named.some(x => x.name === tSi);
  let onePicked = false;
  const out = [];
  for (const x of sites || []) {
    if (tRg && regionOf(x) !== tRg) continue;
    const key = S.rollupKeyOf(est, x);
    if (!key) {
      if (tSt && stateOf(x.metro) !== tSt) continue;
      if (tMe && x.metro !== tMe) continue;
      if (tSi && x.name !== tSi) continue;
      out.push({ site: x, n: S.countOf(x.name), whole: true, metros: [x.metro] });
      continue;
    }
    const [cls, ix] = key.split('#');
    const node = tree.find(c => c.cls === cls);
    const ms = (node ? node.children : []).filter(ch => ch.kind === 'metro' && String(ch.key).startsWith(`${cls}:${ix}:`))
      .filter(m => (!tSt || stateOf(m.name) === tSt) && (!tMe || m.name === tMe));
    if (!ms.length) continue;
    if (tSi) { if (pickedNamed || onePicked) continue; onePicked = true; out.push({ site: x, n: 1, whole: S.countOf(x.name) === 1, metros: ms.map(m => m.name) }); continue; }
    const n = ms.reduce((a, m) => a + m.count, 0);
    out.push({ site: x, n, whole: n === S.countOf(x.name), metros: ms.map(m => m.name) });
  }
  return out;
}

// ---------- Attach, one cloud an order ----------

/**
 * An order carries one cloud (the connect flow: "DataCenter / CoLocation to Cloud
 * carries one cloud"). A set across clouds attaches the cloud with the most
 * workloads on the internet first, then the next (skeptic, 2026-10-01: Attach 5
 * across AWS, Azure and GCP opened an order whose Next was off).
 * Returns { cloud, regions, label, rest: [{ cloud, regions }] } or null.
 */
export function attachPlan(est, regions) {
  const regs = (regions || []).map(id => (est.regionsList || []).find(r => r.region === id)).filter(Boolean);
  if (!regs.length) return null;
  const by = {};
  regs.forEach(r => { const g = by[r.cloud] = by[r.cloud] || { cloud: r.cloud, regions: [], wl: 0 }; g.regions.push(r.region); g.wl += r.wl || 0; });
  const order = Object.values(by).sort((a, b) => b.wl - a.wl || b.regions.length - a.regions.length || a.cloud.localeCompare(b.cloud));
  const first = order[0];
  const label = first.regions.length === 1 ? `Attach ${first.cloud} ${first.regions[0]}` : `Attach ${first.regions.length} ${first.cloud} regions`;
  return { cloud: first.cloud, regions: first.regions, label, rest: order.slice(1).map(g => ({ cloud: g.cloud, regions: g.regions })) };
}

// ---------- the ring ----------

/**
 * A ring's segments as the legend and the pointer reach them (skeptic, 2026-10-01:
 * Established's seven services had three with no legend row and arcs of 1px).
 * Past `max` segments, the smallest open together as one ("3 more"); every arc is
 * drawn at least `minPct` of the turn, taken from the largest, so each is a target.
 * `rows` are [{ key, label, v, color, door }] largest first; `merge(rows)` returns
 * the door for the merged rest. The figures stay exact: only the arcs are widened.
 */
export function ringSegs(rows, { max = 4, minPct = 2.5, merge = null, otherLabel = (rest) => `${rest.length} more`, otherColor = 'var(--text-disabled)' } = {}) {
  const live = (rows || []).filter(r => r.v > 0);
  let shown = live;
  if (live.length > max) {
    const rest = live.slice(max - 1);
    shown = [...live.slice(0, max - 1), { key: 'rest:' + rest.map(r => r.key).join(','), label: otherLabel(rest), v: rest.reduce((a, r) => a + r.v, 0), color: otherColor, door: merge ? merge(rest) : null, rest }];
  }
  const tot = shown.reduce((a, r) => a + r.v, 0) || 1;
  const pct = shown.map(r => r.v / tot * 100);
  const lift = pct.map(p => Math.max(p, minPct));
  const over = lift.reduce((a, p) => a + p, 0) - 100;
  const big = pct.indexOf(Math.max(...pct));
  if (over > 0 && big >= 0) lift[big] = Math.max(minPct, lift[big] - over);
  let acc = 0;
  return shown.map((r, i) => { const from = acc; acc += lift[i]; return { ...r, from, to: i === shown.length - 1 ? 100 : acc, pct: pct[i] }; });
}
/** The conic gradient that draws ringSegs. */
export const ringOf = (segs) => (segs.length ? `conic-gradient(${segs.map(s => `${s.color} ${s.from.toFixed(2)}% ${s.to.toFixed(2)}%`).join(',')})` : 'var(--bg-neutral)');

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
  // A place's access (2026-10-01: Your sites' regions carried no cost): Cost > By region, the place
  // picked, its Site access tile, rounded as that tile rounds it (its share of the place's whole dollars).
  const place = {};
  for (const m of CV.costMembers(est, L, 'region')) {
    const sl = CV.sliceLegs(est, L, 'region', m.key);
    const legR = CV.roundTo(['access', 'connect', 'cloud'].map(k => (sl[k] || {}).total || 0), m.vR);
    const sites = (est.sites || []).filter(x => CV.placeOfSite(x) === m.key).map(x => x.name);
    if (sites.length) place[m.key] = { v: legR[0], sites, view: { costPanel: 'legs', costBy: 'region', costPick: m.key, legDrill: null } };
  }
  return { cloud, region, site, place };
}
/** The Cost place whose sites are exactly these (a Your sites region or country), or null. */
export function placeCostOf(ix, est, names) {
  const want = [...new Set(names || [])];
  if (!want.length || !ix || !ix.place) return null;
  const places = [...new Set(want.map(n => CV.placeOfSite((est.sites || []).find(x => x.name === n) || { name: n, metro: '' })))];
  if (places.length !== 1) return null;
  const p = ix.place[places[0]];
  if (!p || p.sites.length !== want.length || !p.sites.every(n => want.includes(n))) return null;
  return { key: places[0], ...p };
}

// ---------- Findings that name a set ----------

/**
 * The first of `keys` that is an open finding, so "Open its finding" opens the one about this set.
 * `findings` are { key, open }: a snoozed, resolved or dismissed finding is nobody's (skeptic,
 * 2026-10-01: the exposed workloads opened a snoozed finding about 7 others in eu-west-1).
 */
export function findingFor(findings, keys) {
  for (const k of keys || []) { const f = (findings || []).find(x => x.key === k && x.open !== false); if (f) return f; }
  return null;
}

/**
 * Which finding is about a set, by what the finding says (naas-data.js): the
 * findings are written about a set, so a set opens one only when it is that set
 * or inside it. Cloud sets: PCI-tagged workloads ('pci'); internet-facing ones
 * exposed ('uninspected'). Sites outside AT&T: every one on IPsec ('ipsec'),
 * or every one a branch rollup off the hub ('nothub').
 */
export function cloudFindingKeys(f) {
  if (!f) return [];
  if (f.tag === 'pci') return ['pci'];
  if (f.tag === 'internet-facing' && f.state === 'exposed') return ['uninspected'];
  return [];
}
export function siteFindingKeys(outsideSites) {
  const xs = outsideSites || [];
  if (!xs.length) return [];
  if (xs.every(x => siteModeOf(x) === 'ipsec')) return ['ipsec'];
  if (xs.every(x => S.countOf(x.name) > 1 && S.classOf(x) === 'Branch')) return ['nothub'];
  return [];
}

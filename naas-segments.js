// Who answers for each piece of a path (notes, 2026-09-30). The stakeholder's
// nine-row table (segment, owner, what to show, where the data comes from) and
// the seven grid columns of the Health tab (Site, Edge, Backbone, On-ramp,
// Cloud link, Hub, App), read from data the product already holds: the
// connection rows, the one latency rule, the sites' own state, the regions
// without flow logs, and each app's traffic by region. What the product cannot
// see yet reads "Not yet measured". Nothing here invents a live number.
import { accessThing, cloudEdgeThing, cloudAccessThing, entersAtt } from './naas-things.js';
import { attHolds, connModeOf, siteModeOf, RAMP_EDGE, regionOf, regionRows } from './naas-logic.js';
import { regionState, healthOf, SLO, SLO_PRIVATE } from './naas-flowmap.js';
import { countOf, stateOf, placeName } from './naas-sites.js';
import { siteState } from './naas-volume.js';
import { appsOf } from './naas-apps.js';
import { path as hopsOf, regionSites } from './naas-paths.js';

/** The grid's columns, left to right. Headers are the stakeholder's; titles name the house segment. */
export const SEGMENTS = [
  { key: 'site', label: 'Site', title: 'Access: the site\'s circuit into a network' },
  { key: 'edge', label: 'Edge', title: 'Edge: the AT&T PE the circuit lands on' },
  { key: 'backbone', label: 'Backbone', title: 'Core: the AT&T backbone' },
  { key: 'onramp', label: 'On-ramp', title: 'Edge: NetBond, or a third party\'s on-ramp' },
  { key: 'cloudlink', label: 'Cloud link', title: 'Access: the cloud\'s own port and gateway' },
  { key: 'hub', label: 'Hub', title: 'The cloud routing hub' },
  { key: 'app', label: 'App', title: 'The VPC and the app' },
];

/** Who holds the SLA, in words. */
export const OWNERS = { att: 'AT&T', third: 'Third party', cloud: 'Cloud provider', customer: 'You', public: 'Public internet' };

/** Each cloud's own routing hub. */
export const HUB_NAME = { AWS: 'Transit Gateway', Azure: 'Virtual WAN hub', GCP: 'NCC hub', Oracle: 'DRG', CoreWeave: 'VPC router' };

/** The stakeholder's nine rows, in his order. */
export const TABLE = [
  { key: 'access', label: 'Site access (AVPN, ADI, ASE on Demand, broadband)', owner: 'att', show: 'Up or down, usage, errors, drops, delay to the AT&T edge', source: 'AT&T access systems', limited: false },
  { key: 'access3p', label: 'Other carrier access', owner: 'third', show: 'Reachability and delay only', source: 'Tests from the AT&T side', limited: true },
  { key: 'backbone', label: 'AT&T edge and backbone', owner: 'att', show: 'Delay, loss, jitter between points, maintenance windows', source: 'AT&T backbone data', limited: false },
  { key: 'onramp', label: 'Cloud on-ramp (IPE, NetBond port)', owner: 'att', show: 'Port usage, drops, errors, BGP to the cloud', source: 'NetBond Advanced data', limited: false },
  { key: 'cloudlink', label: 'Cloud connection', owner: 'cloud', show: 'Link state, BGP state, bits in and out, optical levels', source: 'AWS Direct Connect, Azure ExpressRoute, Google Cloud Interconnect metrics', limited: false },
  { key: 'ipsec', label: 'IPsec tunnels', owner: 'customer', show: 'Tunnel up or down, flaps, throughput', source: 'Cloud VPN metrics', limited: false },
  { key: 'hub', label: 'Cloud routing hub (Transit Gateway, Virtual WAN, NCC)', owner: 'customer', show: 'Attachment state, drops from missing or dead routes', source: 'Hub metrics and route tables', limited: false },
  { key: 'exit', label: 'Cloud exit (NAT, internet gateway)', owner: 'customer', show: 'Port exhaustion, dropped packets, exit volume', source: 'NAT gateway metrics', limited: false },
  { key: 'app', label: 'VPC and app', owner: 'customer', show: 'Rejected flows, delay to app, DNS failures', source: 'Flow logs, security rules, DNS logs', limited: false, gap: 'DNS not yet measured' },
];

const NOT_YET = 'Not yet measured';
const RANK = { ok: 0, risk: 1, slo: 2, down: 3 };

/** Everything the segment model reads, built once from the whole estate. */
export function segCtxOf(est, { inv, ob, conns }) {
  return { est, ob, conns, apps: appsOf(est, inv, (ob && ob.flows) || []), blind: new Set(((ob && ob.blind) || []).map(r => r.region)) };
}

const rowOf = (ctx, region) => (ctx.conns.rows || []).find(r => r.region === region) || null;
const slowWhy = (r) => { const ms = r.priv ? r.fab : r.pub, slo = r.priv ? SLO_PRIVATE : SLO; return `p95 ${ms} ms against ${slo} ms`; };
const C = (state, thing, owner, why, limited = false) => ({ state, thing, owner, why, limited });

// One region's state in one column.
function part(key, r, ctx, app) {
  const row = rowOf(ctx, r.region), mode = connModeOf(r);
  if (key === 'onramp' || key === 'cloudlink') {
    if (!r.priv) { const st = regionState(r); return C(st, 'Public internet', 'public', st === 'ok' ? 'Healthy' : slowWhy(r), true); }
    if (key === 'onramp') {
      if (mode === 'third') return C(row && row.degraded ? 'down' : row && row.hot ? 'risk' : 'ok', 'Equinix Fabric', 'third', row && row.hot ? `${row.pct}% of ${row.bw || row.ports + ' × 10 Gbps'} purchased` : 'Healthy', true);
      if (!attHolds(r)) return C('none', '', '', '');
      if (row && row.degraded && mode === 'netbond') return C('down', 'NetBond', 'att', `BGP flapping · ${row.drops} drops`);
      if (row && row.hot) return C('risk', 'NetBond', 'att', `${row.pct}% of ${row.bw || row.ports + ' × 10 Gbps'} purchased`);
      return C('ok', 'NetBond', 'att', 'Healthy');
    }
    if (mode === 'direct') {
      const t = cloudEdgeThing(r);
      if (row && row.degraded) return C('down', t.label, 'cloud', `BGP flapping · ${row.drops} drops`);
      const st = regionState({ ...r, link: null });
      return C(st, t.label, 'cloud', st === 'ok' ? 'Healthy' : slowWhy(r));
    }
    const t = cloudAccessThing(r);
    return C('nodata', t.label, 'cloud', NOT_YET);
  }
  if (key === 'hub') return C('nodata', HUB_NAME[r.cloud] || 'Routing hub', 'customer', NOT_YET);
  if (key === 'app') {
    if (ctx.blind.has(r.region)) return C('nodata', `${r.cloud} ${r.region}`, 'customer', `${NOT_YET}: no flow logs`);
    const down = row && row.degraded;
    if (down) return (r.paths || 1) < 2 ? C('down', `${r.cloud} ${r.region}`, 'customer', 'One path, and it is down') : C('risk', `${r.cloud} ${r.region}`, 'customer', 'The second path holds');
    const st = (app && app.health) || 'ok';
    return C(st, `${r.cloud} ${r.region}`, 'customer', st === 'ok' ? 'Healthy' : `p95 ${app.p95} ms against ${app.slo} ms`);
  }
  return C('none', '', '', '');
}

// The sites whose traffic reaches a set of regions: every site today, by geography.
function siteCell(key, ctx) {
  const sites = ctx.est.sites || [];
  const att = sites.filter(s => entersAtt(s));
  if (key === 'site') {
    if (!sites.length) return C('none', '', '', '');
    const bad = sites.map((s, i) => ({ s, st: siteState(s, i) })).find(x => x.st === 'degraded');
    if (!att.length) return C(bad ? 'risk' : 'ok', 'Third Party Access', 'third', bad ? `${bad.s.name} access degraded` : 'Reachability only', true);
    return C(bad ? 'risk' : 'ok', 'AT&T access', 'att', bad ? `${bad.s.name} access degraded` : 'Healthy');
  }
  if (!att.length) return C('none', '', '', '');
  return key === 'edge' ? C('ok', 'AT&T PE', 'att', 'Healthy') : C('ok', 'AT&T backbone', 'att', 'Healthy');
}

// Worst of the parts: down wins from any part; otherwise the worst material one.
function worst(parts) {
  const down = parts.find(p => p.c.state === 'down');
  if (down) return down.c;
  const live = parts.filter(p => p.material && RANK[p.c.state] != null);
  if (live.length) return live.reduce((w, p) => (RANK[p.c.state] > RANK[w.state] ? p.c : w), live[0].c);
  const nd = parts.find(p => p.c.state === 'nodata');
  return nd ? nd.c : C('none', '', '', '');
}

/** One grid row: the seven cells of an app group's paths. */
export function cellsFor(tag, ctx) {
  const app = (ctx.apps || []).find(a => a.tag === tag);
  if (!app) return SEGMENTS.map(() => C('none', '', '', ''));
  const regs = (app.parts || []).map(p => ({ r: (ctx.est.regionsList || []).find(x => x.region === p.region), material: p.share >= 0.05 })).filter(x => x.r);
  return SEGMENTS.map(seg => {
    if (seg.key === 'site' || seg.key === 'edge' || seg.key === 'backbone') return siteCell(seg.key, ctx);
    return worst(regs.map(x => ({ c: part(seg.key, x.r, ctx, app), material: x.material })));
  });
}

// Every instance behind each of the nine rows, with the site or region it is.
function itemsOf(est, ctx) {
  const sites = est.sites || [], regs = est.regionsList || [];
  const siteItems = (pick) => sites.map((s, i) => ({ s, i })).filter(({ s }) => pick(s)).map(({ s, i }) => { const bad = siteState(s, i) === 'degraded'; return { site: s, n: countOf(s.name), state: bad ? 'risk' : 'ok', where: s.name, thing: s.access, why: bad ? 'Access degraded' : 'Healthy' }; });
  const isAttAccess = (s) => entersAtt(s) && (accessThing(s) || {}).owner === 'att';
  const regItem = (r, c) => ({ region: r, state: c.state, where: `${r.cloud} ${r.region} · ${c.thing}`, thing: c.thing, why: c.why });
  return {
    access: siteItems(isAttAccess),
    access3p: siteItems(s => !isAttAccess(s)),
    backbone: sites.some(entersAtt) ? [{ state: 'ok', where: 'AT&T backbone', thing: 'AT&T backbone', why: 'Healthy' }] : [],
    onramp: regs.filter(r => r.priv && (attHolds(r) || RAMP_EDGE[r.ramp] === 'third')).map(r => regItem(r, part('onramp', r, ctx))),
    cloudlink: regs.filter(r => r.priv && connModeOf(r) === 'direct').map(r => regItem(r, part('cloudlink', r, ctx))),
    ipsec: siteItems(s => siteModeOf(s) === 'ipsec').map(x => ({ ...x, state: 'nodata', why: `${NOT_YET}: cloud VPN metrics are not connected` })),
    hub: regs.map(r => ({ region: r, state: 'nodata', where: `${r.cloud} ${r.region} · ${HUB_NAME[r.cloud] || 'Routing hub'}`, thing: HUB_NAME[r.cloud] || 'Routing hub', why: `${NOT_YET}: hub metrics are not connected` })),
    exit: regs.map(r => ({ region: r, state: 'nodata', where: `${r.cloud} ${r.region}`, thing: 'NAT gateway', why: `${NOT_YET}: NAT gateway metrics are not connected` })),
    app: regs.map(r => ctx.blind.has(r.region) ? { region: r, state: 'nodata', where: `${r.cloud} ${r.region}`, thing: 'Flow logs', why: `${NOT_YET}: no flow logs` } : { region: r, state: 'ok', where: `${r.cloud} ${r.region}`, thing: 'Flow logs', why: 'Flow logs arrive' }),
  };
}
function tally(items) {
  const counts = { n: 0, ok: 0, risk: 0, slo: 0, down: 0, nodata: 0 };
  let now = null;
  for (const it of items) {
    counts.n += it.n || 1; counts[it.state] = (counts[it.state] || 0) + (it.n || 1);
    if (!now || (RANK[it.state] ?? -1) > (RANK[now.state] ?? -1)) now = { state: it.state, where: it.where, why: it.why };
  }
  return { counts, now };
}
const UNMEASURED = { ipsec: true, hub: true, exit: true };

/** The nine rows: how many instances, how they stand, the worst one, and whether we can see them. */
export function segmentTable(est, ctx) {
  const items = itemsOf(est, ctx);
  return TABLE.map(t => { const { counts, now } = tally(items[t.key]);
    return { ...t, ownerLabel: OWNERS[t.owner], counts, now, measured: UNMEASURED[t.key] ? false : counts.nodata < counts.n || counts.n === 0 }; });
}

export const SITE_ROWS = new Set(['access', 'access3p', 'ipsec']);
const bySeen = (items, keyOf) => { const m = new Map(); items.forEach(it => { const k = keyOf(it); if (!m.has(k)) m.set(k, []); m.get(k).push(it); }); return [...m.entries()]; };
const group = (key, name, its, drillKey) => { const t = tally(its); return { key, name, n: t.counts.n, counts: t.counts, state: t.now ? t.now.state : 'none', worst: t.now, drillKey, leaf: false }; };

/**
 * One row's instances, drilled in place. The site rows go by place (region,
 * state, then the state's sites, the way Your sites reads); the cloud rows go
 * cloud, then region. Backbone is one thing.
 */
export function segmentDrill(est, ctx, key, trail = []) {
  const items = itemsOf(est, ctx)[key];
  if (!items) return null;
  if (SITE_ROWS.has(key)) {
    if (!trail.length) {
      const order = regionRows({ ...est, sites: items.map(x => x.site) }).map(r => r.name);
      const by = Object.fromEntries(bySeen(items, x => regionOf(x.site)));
      return { level: 'region', rows: order.map(name => group('region:' + name, name, by[name], 'region:' + name)) };
    }
    const region = String(trail[0]).replace(/^region:/, '');
    const inRegion = items.filter(x => regionOf(x.site) === region);
    if (trail.length === 1) return { level: 'state', rows: bySeen(inRegion, x => stateOf(x.site.metro) || '—').map(([code, its]) => group('state:' + code, placeName(code === '—' ? '' : code), its, 'state:' + code)).sort((a, b) => a.name.localeCompare(b.name)) };
    const code = String(trail[1]).replace(/^state:/, '');
    const inState = inRegion.filter(x => (stateOf(x.site.metro) || '—') === code);
    return { level: 'site', rows: inState.map(x => ({ key: 'site:' + x.site.name, name: x.site.name, n: x.n || 1, state: x.state, worst: x, sub: [x.site.metro, x.thing, x.why].filter(Boolean).join(' · '), leaf: true })).sort((a, b) => (RANK[b.state] ?? -1) - (RANK[a.state] ?? -1) || a.name.localeCompare(b.name)) };
  }
  if (key === 'backbone') return { level: 'segment', rows: items.map(x => ({ key: 'backbone', name: x.thing, n: 1, state: x.state, worst: x, sub: x.why, leaf: true })) };
  if (!trail.length) return { level: 'cloud', rows: bySeen(items, x => x.region.cloud).map(([cloud, its]) => group('cloud:' + cloud, cloud, its, 'cloud:' + cloud)) };
  const cloud = String(trail[0]).replace(/^cloud:/, '');
  return { level: 'region', rows: items.filter(x => x.region.cloud === cloud).map(x => ({ key: 'region:' + x.region.region, name: `${x.region.cloud} ${x.region.region}`, n: 1, state: x.state, worst: x, sub: `${x.thing} · ${x.why}`, leaf: true })) };
}

/** The Health grid: one row per app group, worst first, then by workloads. */
export function pathFlow(ctx) {
  const R = { none: -2, nodata: -1, ok: 0, risk: 1, slo: 2, down: 3 };
  return (ctx.apps || []).map(a => {
    const cells = cellsFor(a.tag, ctx);
    const state = cells.reduce((w, c) => (R[c.state] > R[w] ? c.state : w), 'ok');
    const top = (a.topApps || [])[0];
    return { tag: a.tag, label: top ? `${a.tag} → ${top}` : a.tag, cells, state, wl: a.wl };
  }).sort((x, y) => R[y.state] - R[x.state] || y.wl - x.wl);
}

/**
 * Is it fast (notes, 2026-09-30, B2): one row per app group, on its worst
 * material region, from the site that sends it the most. The hops are the ones
 * the product already draws (naas-paths path()), placed in the seven columns;
 * they add up to Site to app. Loss shows only where a source reports it: the
 * connection's own drops, or 0.3% on a public path already marked warn.
 */
export function pathTimes(ctx) {
  const regs = ctx.est.regionsList || [];
  const RW = { down: 4, slo: 3, risk: 2, ok: 1 };
  return (ctx.apps || []).map(a => {
    const parts = (a.parts || []).filter(p => p.share >= 0.05).map(p => ({ p, r: regs.find(x => x.region === p.region) })).filter(x => x.r);
    if (!parts.length) return null;
    const weight = ({ r, p }) => { const row = rowOf(ctx, r.region); return (row && row.degraded ? RW.down : RW[regionState(r)] || 1) * 10 + p.share; };
    const { r } = parts.reduce((w, x) => (weight(x) > weight(w) ? x : w), parts[0]);
    const top = regionSites(ctx.est, r, 1).rows[0];
    if (!top) return null;
    const site = top.site, drawn = hopsOf(site, r), row = rowOf(ctx, r.region), mode = connModeOf(r);
    const step = (i) => drawn.hops[i].ms - drawn.hops[i - 1].ms;
    const cells = SEGMENTS.map(seg => ({ key: seg.key, label: seg.label, ms: null, names: [], loss: null, why: '' }));
    const put = (key, i) => { const c = cells.find(x => x.key === key); c.ms = (c.ms || 0) + step(i); c.names.push(drawn.hops[i].name); };
    drawn.hops.forEach((h, i) => {
      if (!i) return;
      if (h.kind === 'access' || h.kind === 'hub') put('site', i);
      else if (h.kind === 'pop') put('edge', i);
      else if (h.kind === 'fabric' || h.kind === 'public') put('backbone', i);
      else if (h.kind === 'ramp') put(mode === 'direct' ? 'cloudlink' : 'onramp', i);
      else if (h.kind === 'region') put('app', i);
    });
    if (row && r.priv) cells.find(x => x.key === (mode === 'direct' ? 'cloudlink' : 'onramp')).loss = row.drops;
    if (!r.priv && r.rel === 'warn') cells.find(x => x.key === 'backbone').loss = '0.30%';
    const out = cells.map(c => {
      const why = c.ms != null ? '' : c.key === 'hub' ? NOT_YET : c.key === 'cloudlink' && r.priv && mode !== 'direct' ? `Inside the ${mode === 'third' ? 'Equinix' : 'NetBond'} on-ramp` : 'Not on this path';
      const title = c.ms != null ? `${c.label} · ${c.names.join(', ')} · ${c.ms} ms · loss ${c.loss || NOT_YET.toLowerCase()}` : `${c.label} · ${why}`;
      return { key: c.key, ms: c.ms, msF: c.ms != null ? `${c.ms} ms` : '', loss: c.loss, lossF: c.loss || '', title };
    });
    const slo = r.priv ? SLO_PRIVATE : SLO, topApp = (a.topApps || [])[0];
    return { key: `${a.tag}|${r.region}`, tag: a.tag, label: topApp ? `${a.tag} → ${topApp}` : a.tag, region: r.region, where: `${r.cloud} ${r.region}`, site: site.name,
      aggHub: drawn.hops.some(h => h.kind === 'hub'), cells: out, total: drawn.ms, totalF: `${drawn.ms} ms`, slo, state: row && row.degraded ? 'down' : healthOf(drawn.ms, slo), hops: drawn.hops, wl: a.wl };
  }).filter(Boolean).sort((x, y) => (RW[y.state] || 0) - (RW[x.state] || 0) || y.wl - x.wl);
}

// Who answers for each piece of a path (notes, 2026-09-30). The stakeholder's
// nine-row table (segment, owner, what to show, where the data comes from) and
// the seven grid columns of the Health tab (Site, Edge, Backbone, On-ramp,
// Cloud link, Hub, App), read from data the product already holds: the
// connection rows, the one latency rule, the sites' own state, the regions
// without flow logs, and each app's traffic by region. What the product cannot
// see yet reads "Not yet measured". Nothing here invents a live number.
import { accessThing, cloudEdgeThing, cloudAccessThing, entersAtt } from './naas-things.js';
import { attHolds, connModeOf, siteModeOf, RAMP_EDGE } from './naas-logic.js';
import { regionState, SLO, SLO_PRIVATE } from './naas-flowmap.js';
import { countOf } from './naas-sites.js';
import { siteState } from './naas-volume.js';
import { appsOf } from './naas-apps.js';

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
  { key: 'app', label: 'VPC and app', owner: 'customer', show: 'Rejected flows, delay to app, DNS failures', source: 'Flow logs, security rules, DNS logs', limited: false },
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

/** The nine rows: how many instances, how they stand, the worst one, and whether we can see them. */
export function segmentTable(est, ctx) {
  const sites = est.sites || [], regs = est.regionsList || [];
  const tally = (items) => {
    const counts = { n: 0, ok: 0, risk: 0, slo: 0, down: 0, nodata: 0 };
    let now = null;
    for (const it of items) {
      counts.n += it.n || 1; counts[it.state] = (counts[it.state] || 0) + (it.n || 1);
      if (!now || (RANK[it.state] ?? -1) > (RANK[now.state] ?? -1)) now = { state: it.state, where: it.where, why: it.why };
    }
    return { counts, now };
  };
  const siteItems = (pick) => sites.map((s, i) => ({ s, i })).filter(({ s }) => pick(s)).map(({ s, i }) => { const bad = siteState(s, i) === 'degraded'; return { n: countOf(s.name), state: bad ? 'risk' : 'ok', where: s.name, why: bad ? 'Access degraded' : 'Healthy' }; });
  const isAttAccess = (s) => entersAtt(s) && (accessThing(s) || {}).owner === 'att';
  const rows = {
    access: tally(siteItems(isAttAccess)),
    access3p: tally(siteItems(s => !isAttAccess(s))),
    backbone: tally(sites.some(entersAtt) ? [{ state: 'ok', where: 'AT&T backbone', why: 'Healthy' }] : []),
    onramp: tally(regs.filter(r => r.priv && (attHolds(r) || RAMP_EDGE[r.ramp] === 'third')).map(r => part('onramp', r, ctx)).map((c, i, a) => ({ state: c.state, where: c.thing, why: c.why }))),
    cloudlink: tally(regs.filter(r => r.priv && connModeOf(r) === 'direct').map(r => { const c = part('cloudlink', r, ctx); return { state: c.state, where: `${r.cloud} ${r.region} · ${c.thing}`, why: c.why }; })),
    ipsec: tally(siteItems(s => siteModeOf(s) === 'ipsec').map(x => ({ ...x, state: 'nodata', why: `${NOT_YET}: cloud VPN metrics are not connected` }))),
    hub: tally(regs.map(r => ({ state: 'nodata', where: `${r.cloud} ${r.region} · ${HUB_NAME[r.cloud] || 'Routing hub'}`, why: `${NOT_YET}: hub metrics are not connected` }))),
    exit: tally(regs.map(r => ({ state: 'nodata', where: `${r.cloud} ${r.region}`, why: `${NOT_YET}: NAT gateway metrics are not connected` }))),
    app: tally(regs.map(r => ctx.blind.has(r.region) ? { state: 'nodata', where: `${r.cloud} ${r.region}`, why: `${NOT_YET}: no flow logs` } : { state: 'ok', where: `${r.cloud} ${r.region}`, why: 'Flow logs arrive' })),
  };
  const measured = { ipsec: false, hub: false, exit: false };
  return TABLE.map(t => ({ ...t, ownerLabel: OWNERS[t.owner], counts: rows[t.key].counts, now: rows[t.key].now, measured: measured[t.key] === false ? false : rows[t.key].counts.nodata < rows[t.key].counts.n || rows[t.key].counts.n === 0 }));
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

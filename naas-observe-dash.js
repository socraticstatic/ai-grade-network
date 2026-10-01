/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-observe-dash.js — gauges, the alert queue and the detail panel for the
// Observe dashboard. Pure data. Added 2026-09-09.
import * as F from './naas-flowmap.js';
import { impacted, records, resolveDest, utilSeries } from './naas-connections.js';
import { growthOf } from './naas-round2.js';
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';
import { agoOf, startOf, INCIDENT_MIN } from './naas-schedule.js';
import { FIRST_ATTACH } from './naas-lifecycle.js';
import { cloudEdgeThing, rampName } from './naas-things.js';
import { sells } from './naas-bandwidth.js';

// Modify bandwidth (2026-09-30) leads the actions wherever AT&T sells the connection's bandwidth.
// Only on the connection's own panel: a Traffic map region node counts the region's flows, not the connection's port counters.
const bwActs = (row) => (row && sells(row) ? [{ key: 'bandwidth', label: 'Modify bandwidth', id: row.id }] : []);

const n = (x) => Number(x).toLocaleString('en-US');
const R = 22, C = 2 * Math.PI * R;

/** One ring per connection: used against purchased, the 24h line inside, a state dot. */
export function gauges(conns) {
  return conns.rows.map(r => ({ id: r.id, region: r.region, cloud: r.cloud, label: `${r.cloud} ${r.region}`, ramp: r.ramp, pct: r.pct, pctF: r.pct + '%', purchased: `${r.bw || r.ports + ' × 10 Gbps'}`, used: `${r.gbps} Gbps`, dash: `${(C * r.pct / 100).toFixed(1)} ${C.toFixed(1)}`, circ: C.toFixed(1), r: R, state: r.state, bgp: r.bgp, drops: r.drops, inD: r.inD, outD: r.outD, degraded: r.degraded, hot: r.hot, wl: r.wl, color: r.state === 'Degraded' ? 'var(--error)' : r.state === 'Saturating' ? '#e5a100' : '#009fdb' }));
}

/** Who holds the SLA, in words (2026-09-30). */
export const OWNER_LABEL = { att: 'AT&T', third: 'Third party', cloud: 'Cloud provider', customer: 'You', public: 'Public internet' };

/**
 * The one incident list (2026-09-30): a degraded link, a port near full, a
 * latency spike. Each says where, on which thing, who holds the SLA, which
 * apps ride it, when it started and what changed just before. Home, the
 * Alerts count, the Health tab and the findings events all read it. Blind
 * regions and flow-level Over SLO are findings, not alerts. Ranked by apps
 * affected, then severity (1 is worst), then workloads.
 */
export function problems(est, conns, ob, apps = [], chg = [], now = Date.now()) {
  const regs = est.regionsList || [];
  const appsOn = (region) => (apps || []).filter(a => (a.parts || []).some(p => p.region === region && p.share >= 0.05)).map(a => a.tag);
  const changeFor = (key) => { const c = (chg || []).filter(x => x.linedUp === key); return c.length ? { at: Math.max(...c.map(x => x.at)), text: `${c.length} ${c.length === 1 ? (c[0].kind === 'route' ? 'route change' : 'change') : 'changes'}` } : null; };
  const out = [];
  (conns.rows || []).filter(r => r.degraded).forEach(r => {
    const t = cloudEdgeThing(regs.find(x => x.region === r.region) || r), key = 'an-link-' + r.region;
    out.push({ key, kind: 'link', region: r.region, cloud: r.cloud, where: `${r.cloud} ${r.region}`, thing: t.label, what: `BGP flapping · ${r.drops} drops`, owner: t.owner, ownerLabel: OWNER_LABEL[t.owner] || t.owner, state: 'down', sev: 1, apps: appsOn(r.region), wl: r.wl, startedAt: startOf('flap', now, INCIDENT_MIN.flap), change: changeFor(key), connId: r.id, action: 'impact', actionLabel: 'See impact' });
  });
  (conns.rows || []).filter(r => r.hot && !r.degraded).forEach(r => {
    const t = cloudEdgeThing(regs.find(x => x.region === r.region) || r), key = 'an-sat-' + r.region;
    out.push({ key, kind: 'sat', region: r.region, cloud: r.cloud, where: `${r.cloud} ${r.region}`, thing: t.label, what: `${r.pct}% of ${r.bw || r.ports + ' × 10 Gbps'} purchased`, owner: t.owner, ownerLabel: OWNER_LABEL[t.owner] || t.owner, state: 'risk', sev: 2, apps: appsOn(r.region), wl: r.wl, startedAt: startOf('sat', now, INCIDENT_MIN.sat), change: changeFor(key), connId: r.id, action: 'port', actionLabel: 'Add a port' });
  });
  // A spike is as bad as the one latency rule says (review, 2026-09-30): 86 ms
  // at peak is At risk, 100 ms is not over 100, and a peak within it is no problem.
  regs.filter(r => r.rel === 'warn').forEach(r => {
    const key = 'an-' + r.region, peak = r.pub + 40, state = F.healthOf(peak, F.SLO);
    if (state === 'ok') return;
    out.push({ key, kind: 'spike', region: r.region, cloud: r.cloud, where: `${r.cloud} ${r.region}`, thing: 'Public internet', what: `Latency spike · p95 ${peak} ms at peak, 0.3% loss`, owner: 'public', ownerLabel: OWNER_LABEL.public, state, sev: 3, apps: appsOn(r.region), wl: r.wl, startedAt: startOf('spike', now, INCIDENT_MIN.spike), change: changeFor(key), connId: null, action: 'impact', actionLabel: 'See impact' });
  });
  return out.sort((a, b) => b.apps.length - a.apps.length || a.sev - b.sev || b.wl - a.wl);
}

/** The Alerts rows: the incident list in the queue's words. */
export function queue(probs, now = Date.now()) {
  const WORD = { link: 'Degraded', sat: 'Saturating', spike: 'Latency spike' };
  return probs.map(p => ({ key: p.key, sev: p.sev, state: WORD[p.kind], health: p.state, what: p.kind === 'link' ? `${p.what.replace(/^BGP flapping/, 'BGP flapping on ' + p.thing)}` : p.what, where: p.where, age: agoOf(p.startedAt, now), wl: p.wl, action: p.action, actionLabel: p.actionLabel, connId: p.connId, region: p.region }));
}

/** What the panel shows for a selection: a map node key or a connection id. */
export function panelFor(sel, ctx) {
  const { est, inv, flows, map, conns } = ctx;
  if (!sel) return null;
  if (sel.startsWith('cx-')) {
    const row = conns.rows.find(r => r.id === sel); if (!row) return null;
    const imp = impacted(est, inv, row);
    const recs = records(est, inv, { flows }, 'all').filter(r => (r.srcSub + ' ' + r.dstSub).includes(row.region)).slice(0, 8);
    return { kind: 'connection', title: `${row.cloud} ${row.region}`, sub: `${rampName(row)} · ${row.bw || row.ports + ' × 10 Gbps'} purchased`, trail: [{ key: sel, name: `${row.cloud} ${row.region}` }],
      overview: [['Current · in / out', `${row.gbps} / ${(row.gbps * 0.62).toFixed(1)} Gbps`], ['Average · in / out', `${row.avg} / ${(row.avg * 0.62).toFixed(1)} Gbps`], ['Purchased', `${row.bw || row.ports + ' × 10 Gbps'}`], ['Utilization', `${row.pct}% of ${row.cap} Gbps`], ['State', row.state], ['BGP', row.bgp], ['Drops', row.drops], ['Workloads behind it', n(row.wl)]],
      impact: imp, records: recs, actions: [...bwActs(row), ...(row.hot ? [{ key: 'port', label: 'Add a port', region: row.region, id: row.id }] : []), { key: 'policy', label: 'Author a policy for these workloads', region: row.region }, { key: 'logs', label: 'All records for this connection', region: row.region }] };
  }
  // An opened node is replaced by its children on the map; its trail still knows it.
  if (sel.startsWith('asset:')) return sitePanel(sel.slice(6), ctx);
  if (sel.startsWith('wl:')) return workloadPanel(sel, ctx);
  if (sel.startsWith('vpc:')) return vpcPanel(sel, ctx);
  if (sel.startsWith('sn:')) return subnetPanel(sel, ctx);
  const tr = F.trail(sel, est, inv, flows);
  const node = map.nodes.find(x => x.key === sel) || (tr.length && tr[tr.length - 1].key === sel ? { ...tr[tr.length - 1].node, delta: F.deltaOf(sel), opened: true } : null); if (!node) return null;
  if (node.kind === 'sitename' && node.siteName) { const sp = sitePanel(node.siteName, ctx); if (sp) return { ...sp, trail: tr.map(t => ({ key: t.key, name: t.name })) }; }
  const region = node.region || node.regionName || (node.kind === 'c2c' ? node.name.split(' ')[1] : null) || (node.kind === 'endpoint' && /^[A-Z]/.test(node.name) ? node.name.split(' ')[1] : null);
  const row = region ? conns.rows.find(r => r.region === region) : null;
  const imp = row ? impacted(est, inv, row) : null;
  const share = map.total ? Math.round(node.v / map.total * 100) : 0;
  const recs = records(est, inv, { flows }, 'all').filter(r => region ? (r.srcSub + ' ' + r.dstSub).includes(region) : true).slice(0, 8);
  const resolved = node.kind === 'workload' ? { name: node.resource, sub: node.ip } : node.unresolved ? { name: node.name, sub: 'unresolved · public' } : null;
  const kids = (() => {
    if (!node.hasChildren) return null;
    let ch = [];
    try { ch = F.childrenOf(node, est, inv, flows) || []; } catch (e) { ch = []; }
    ch = ch.filter(c => c.kind !== 'rollup' && c.kind !== 'more' && c.kind !== 'wlmore');
    if (!ch.length) return null;
    const noun = { placestate: 'states', metro: 'metros', sitename: 'sites', service: 'services', tagregion: 'regions', vpc: 'VPCs', subnet: 'subnets', workload: 'workloads', endpoint: 'endpoints' }[ch[0].kind] || 'items';
    const shown = ch.slice(0, 12);
    return {
      title: `${n(ch.length)} ${ch.length === 1 ? noun.replace(/s$/, '') : noun}${ch.length > shown.length ? ` · showing ${shown.length}` : ''}`,
      rows: shown.map(c => ({
        key: c.panelSel || c.wlSel || (c.kind === 'metro' ? `vol:${c.siteCls || c.cls}|${c.metro}` : '') || (c.kind === 'sitename' ? `asset:${c.siteName}` : ''),
        name: c.kind === 'metro' ? `${n(c.count || 0) || c.metro} · ${c.metro}` : c.name,
        sub: c.sub || `${c.v >= 1 ? c.v.toFixed(1) + ' Gbps' : Math.round(c.v * 1000) + ' Mbps'}`,
        warn: c.state === 'slo' || c.state === 'degraded',
        note: c.state === 'degraded' ? 'degraded' : c.state === 'slo' ? 'outside AT&T' : '',
      })),
    };
  })();
  return { kind: node.kind, title: node.name, sub: node.sub || '', trail: tr, children: kids,
    overview: [...(node.opened ? [['Opened', 'children shown in place']] : []), ['Traffic', `${node.v.toFixed(2)} Gbps`], ['On AT&T', `${node.v ? Math.round(node.fabV / node.v * 100) : 0}%`], ['Share of all traffic', `${share}%`], ['Change vs prior window', (node.delta >= 0 ? '+' : '') + node.delta + '%'], ['State', node.state === 'ok' ? 'Healthy' : node.state === 'degraded' ? 'Degraded' : 'Over SLO or public'], ...(resolved ? [['Resource', resolved.name], ['Address', resolved.sub]] : [])],
    impact: imp, records: recs, actions: [...(node.state !== 'ok' && node.fabV < node.v ? [{ key: 'steer', label: 'Steer onto the AT&T network' }] : []), ...(region && !(row) ? [{ key: 'attach', label: `Attach ${region}`, region }] : []), ...(row && row.hot ? [{ key: 'port', label: 'Add a port', region }] : []), { key: 'policy', label: 'Author a policy here', region }] };
}

/** Find a site by id or name: a named site of the estate, or one generated inside a metro. */
export function findSite(est, id) {
  const named = P.allSites(est).find(x => x.id === id || x.name === id);
  if (named) return { ...named, clsLabel: named.clsLabel || (S.CLASS[named.cls] || {}).label, trail: [(S.CLASS[named.cls] || { label: named.cls }).label, named.metro, named.name] };
  for (const c of S.siteTree(est)) for (const ch of c.children) if (ch.kind === 'metro') { const hit = S.metroSites(ch).find(x => x.id === id); if (hit) return { ...hit, cls: c.cls, clsLabel: c.label, access: ch.access, ramp: ch.ramp, popMs: ch.ms, trail: [c.label, ch.name, hit.id] }; }
  return null;
}

/** The detail of one site (a branch, an ATM, a data center): identity, access, state, paths, what it talks to, records, actions. */
export function sitePanel(id, ctx) {
  const { est, inv, flows } = ctx;
  const site = findSite(est, id); if (!site) return null;
  const sr = P.siteRegions(est, site, 6);
  // Each path's state is the one rule Paths reads (review round 2, 2026-09-30):
  // Down on a degraded link, else its end-to-end ms against its SLO, so a 66 ms
  // public path is Healthy and a path over its SLO is Over SLO, never Down's red.
  const paths = sr.rows.map(x => { const pth = P.path(site, x.region); const bad = pth.hops.find(h => h.state !== 'ok'); return { key: x.region.region, region: `${x.region.cloud} ${x.region.region}`, ms: pth.ms, gbps: x.gbps, priv: !!x.region.priv, via: pth.hops.filter(h => h.kind !== 'site' && h.kind !== 'region').map(h => h.name).join(' → '), state: x.region.link === 'degraded' ? 'down' : F.healthOf(pth.ms, x.region.priv ? F.SLO_PRIVATE : F.SLO), worst: bad ? `${bad.name}: ${bad.sub}` : 'clean' }; });
  const regionsOf = inv.flatMap(c => c.regions);
  const talks = sr.rows.slice(0, 3).map(x => { const r = regionsOf.find(z => z.region === x.region.region); const v = r && r.vpcs[0]; const w = v && v.subnets.flatMap(sn => sn.workloads || [])[0]; return { key: x.region.region, label: `${x.region.cloud} ${x.region.region}`, what: v ? `${v.name}${w ? ' · ' + (w.tag || v.name) + '/' + w.name : ''}` : 'workloads', gbps: x.gbps }; });
  const recs = records(est, inv, { flows }, 'inbound').filter(r => r.srcName === site.name || r.srcName === site.id).slice(0, 8);
  const pub = !site.priv;
  const state = site.state === 'degraded' ? 'Degraded' : pub ? 'Public first mile' : 'On AT&T';
  return { kind: 'site', title: site.name || site.id, sub: `${site.clsLabel || site.cls} · ${site.metro}${site.address ? ' · ' + site.address : ''}`, trail: site.trail.map((t, i) => ({ key: 'st' + i, name: t })),
    overview: [['Class', site.clsLabel || site.cls], ['Metro', site.metro], ...(site.address ? [['Address', site.address]] : []), ['Access', S.servicesOf(site).map(v => `${v.label} ${v.bwF}${v.role === 'backup' ? ' backup' : ''}`).join(' + ') || site.access || 'Access'], ['First mile', pub ? 'Public internet' : 'AT&T private'], ['PoP', `${site.metro === 'Various' ? 'nearest' : site.metro} PoP · ${site.popMs || site.ms || 4} ms`], ['State', state], ['Traffic', (() => { const g = sr.rows.reduce((a, x) => a + x.gbps, 0); return g >= 1 ? g.toFixed(1) + ' Gbps' : Math.max(1, Math.round(g * 1000)) + ' Mbps'; })()], ['Reaches', `${sr.total} regions`], ['Discovered', `${site.since || 0} days ago`]],
    paths, talks, impact: null, records: recs,
    actions: [...(pub ? [{ key: 'attach', label: `Attach ${site.id || site.name}`, site: site.id || site.name }] : [{ key: 'path', label: 'Add a second path', site: site.id || site.name }]), { key: 'failover', label: 'Run a failover test' }, { key: 'policy', label: `Author a policy for ${(site.clsLabel || site.cls || 'this class').toLowerCase()}` }] };
}

/**
 * What is inside one workload — app-b12, cache-b08, whichever leaf you land on.
 *
 * The leaf was the one thing with no detail: every level above it opens a
 * panel, and the last one just sat there. It is reachable from three places,
 * like every other detail on this product: the map node, the drawer row, and
 * the column.
 *
 * Honest to the data. A private workload resolves to a name because we
 * created the mapping; its partners are the flows we can see. Nothing here
 * claims layer 7.
 */
export function workloadPanel(sel, ctx) {
  const { est, inv, flows, conns } = ctx;
  const [region, vpcId, wid] = sel.slice(3).split('|');
  const reg = inv.flatMap(c => c.regions).find(r => r.region === region);
  const top = est.regionsList.find(r => r.region === region);
  const vpc = reg && reg.vpcs.find(v => v.id === vpcId);
  if (!reg || !top || !vpc) return null;
  let sn = null, w = null;
  for (const x of vpc.subnets) { const hit = (x.workloads || []).find(y => y.id === wid || y.name === wid); if (hit) { sn = x; w = hit; break; } }
  if (!w) return null;

  const app = w.tag || 'untagged';
  const row = conns && conns.rows.find(r => r.region === region);
  const ms = top.priv ? top.fab : top.pub;
  // Its neighbours: the other workloads carrying the same app tag. That is
  // what "who does this talk to" can honestly mean from tags and flow logs.
  const peers = reg.vpcs.flatMap(v => v.subnets.flatMap(x => (x.workloads || []).map(y => ({ ...y, vpc: v.name, sn: x.name }))))
    .filter(y => (y.tag || 'untagged') === app && y.id !== w.id);
  const talks = peers.slice(0, 4).map(y => ({ key: y.id, label: `${y.vpc} · ${y.sn}`, what: `${y.name} · ${y.ip}`, gbps: 0.04 }));
  const recs = records(est, inv, { flows }, 'all').filter(r => (r.srcSub + ' ' + r.dstSub).includes(region)).slice(0, 6);

  return {
    kind: 'workload',
    title: w.name,
    sub: `${w.type} · ${app} · ${top.cloud} ${top.region}`,
    trail: [
      { key: 'cx-' + top.region, name: top.cloud },
      { key: 'cx-' + top.region, name: top.region },
      { key: `vpc:${region}|${vpc.id}`, name: vpc.name },
      { key: `sn:${region}|${vpc.id}|${sn.id}`, name: sn.name },
      { key: sel, name: w.name },
    ],
    overview: [
      ['Resource', `${app}/${w.name}`],
      ['Address', w.ip],
      ['Type', w.type],
      ['App tag', app],
      ['VPC / VNet', `${vpc.name} · ${vpc.purpose || 'workload'}`],
      ['Subnet', `${sn.name} · ${sn.cidr}`],
      ['Availability zone', sn.az],
      ['Reachability', w.exposed ? 'Exposed to the internet' : 'Private'],
      ['Path', top.priv ? `AT&T network · ${rampName(top)}` : 'Public internet'],
      ['Latency to the on-ramp', `${ms} ms`],
      ...(row ? [['Connection', `${rampName(row)} · ${row.state}`]] : []),
      ['First seen', w.since === 0 ? 'today' : w.since === 1 ? '1 day ago' : `${w.since} days ago`],
      ['Instances sharing this app', `${peers.length + 1}`],
    ],
    children: (w.endpoints || []).length ? {
      title: `${n(w.endpoints.length)} ${w.endpoints.length === 1 ? 'application' : 'applications'} on ${w.name}`,
      note: `Volume is this workload's ${n(Math.round(top.gbPerWl || 42))} GB/mo split across its listeners. Cost prices egress with the same figure.`,
      // Internet-reachable first: that one is a finding, the rest is
      // inventory.
      rows: w.endpoints.map((e, k) => {
        const open = !!w.exposed && /^(443|80|22)\//.test(e.port || '');
        // Volume, not a fabricated rate. The first cut multiplied a made-up
        // 420 Mbps by a made-up share and reconciled with nothing; the second
        // divided region throughput that this screen does not carry and
        // floored at 1 Kbps. This is the same per-workload monthly volume the
        // Cost page prices its egress with, split across the workload's
        // listeners — so an application's number rolls up to the bill.
        const gbMo = (top.gbPerWl || 42) * ([0.62, 0.28, 0.10][k] ?? 0.05);
        // Latency is the region's own measured path, plus the queueing a
        // listener behind the load balancer actually adds.
        const p95 = (top.priv ? top.fab : top.pub) + (k * 3) + (open ? 6 : 0);
        return { key: '', port: e.port || 'no listener', name: e.app, ver: e.ver, sub: e.note, warn: open,
          rate: gbMo >= 10 ? Math.round(gbMo) + ' GB/mo' : gbMo.toFixed(1) + ' GB/mo',
          lat: p95 + ' ms p95',
          note: open ? 'reachable from the internet' : 'private to the VPC' };
      }).sort((a, b) => (b.warn - a.warn)),
    } : null,
    paths: [{ key: 'p0', region: `${top.cloud} ${top.region}`, ms, gbps: 0.04, priv: !!top.priv, via: top.priv ? rampName(top) : 'hyperscaler edge', state: F.regionState(top), worst: w.exposed ? 'reachable from the internet' : 'clean' }],
    talks, impact: null, records: recs,
    actions: [
      ...(w.exposed ? [{ key: 'attach', label: `Isolate ${w.name}`, site: `${w.name} · ${w.ip}` }] : []),
      { key: 'policy', label: `Author a policy for ${app}`, region },
      { key: 'logs', label: 'All records for this workload', region },
    ],
  };
}

/**
 * The levels between a region and a workload — a VPC and a subnet — had no
 * detail of their own, so the workload panel's trail was decorative: its hops
 * carried made-up keys, clicking one selected nothing, and the drawer closed.
 * Climbing a trail should move you up a level, not throw the level away.
 *
 * Selectors: vpc:<region>|<vpcId> and sn:<region>|<vpcId>|<subnetId>.
 */
function placeCtx(sel, ctx, want) {
  const { est, inv } = ctx;
  const parts = sel.slice(sel.indexOf(':') + 1).split('|');
  const [region, vpcId, snId] = parts;
  const reg = inv.flatMap(c => c.regions).find(r => r.region === region);
  const top = est.regionsList.find(r => r.region === region);
  if (!reg || !top) return null;
  const vpc = reg.vpcs.find(v => v.id === vpcId);
  if (!vpc) return null;
  const sn = want === 'sn' ? vpc.subnets.find(x => x.id === snId) : null;
  if (want === 'sn' && !sn) return null;
  return { top, reg, vpc, sn, region, vpcId, snId };
}

/** The trail every one of these panels shares, cloud first, each hop live. */
function placeTrail(c, depth) {
  const t = [
    { key: 'cx-' + c.top.region, name: c.top.cloud },
    { key: 'cx-' + c.top.region, name: c.top.region },
    { key: `vpc:${c.region}|${c.vpc.id}`, name: c.vpc.name },
  ];
  if (depth >= 3 && c.sn) t.push({ key: `sn:${c.region}|${c.vpc.id}|${c.sn.id}`, name: c.sn.name });
  return t;
}

export function vpcPanel(sel, ctx) {
  const c = placeCtx(sel, ctx, 'vpc'); if (!c) return null;
  const { top, vpc } = c;
  const wls = vpc.subnets.flatMap(x => x.workloads || []);
  const exposed = wls.filter(w => w.exposed).length;
  const apps = [...new Set(wls.map(w => w.tag || 'untagged'))];
  const azs = [...new Set(vpc.subnets.map(x => x.az))];
  return {
    kind: 'vpc', title: vpc.name,
    sub: `${vpc.purpose || 'workload'} · ${top.cloud} ${top.region}`,
    trail: placeTrail(c, 2),
    overview: [
      ['Resource', vpc.name],
      ['Purpose', vpc.purpose || 'workload'],
      ['VPC / VNet', `${vpc.subnets.length} ${vpc.subnets.length === 1 ? 'subnet' : 'subnets'} across ${azs.length} ${azs.length === 1 ? 'zone' : 'zones'}`],
      ['Availability zone', azs.join(', ')],
      ['Traffic', `${n(wls.length)} workloads`],
      ['Instances sharing this app', `${n(apps.length)} ${apps.length === 1 ? 'app' : 'apps'}: ${apps.slice(0, 3).join(', ')}`],
      ['Reachability', exposed ? `${n(exposed)} exposed to the internet` : 'All private'],
      ['Path', top.priv ? `AT&T network · ${rampName(top)}` : 'Public internet'],
      ['Latency to the on-ramp', `${top.priv ? top.fab : top.pub} ms`],
    ],
    children: { title: `${n(vpc.subnets.length)} ${vpc.subnets.length === 1 ? 'subnet' : 'subnets'}`, rows: vpc.subnets.map(x => {
      const ws = x.workloads || [], ex = ws.filter(y => y.exposed).length;
      return { key: `sn:${c.region}|${vpc.id}|${x.id}`, name: x.name, sub: `${x.cidr} · ${x.az} · ${n(ws.length)} workloads`, warn: ex > 0, note: ex ? `${n(ex)} exposed` : '' };
    }) },
    paths: [], talks: [], impact: null, records: [],
    actions: [
      ...(exposed ? [{ key: 'attach', label: `Isolate ${n(exposed)} exposed`, site: vpc.name }] : []),
      { key: 'policy', label: `Author a policy for ${vpc.name}`, region: c.region },
      { key: 'logs', label: 'All records for this VPC', region: c.region },
    ],
  };
}

export function subnetPanel(sel, ctx) {
  const c = placeCtx(sel, ctx, 'sn'); if (!c) return null;
  const { top, vpc, sn } = c;
  const wls = sn.workloads || [];
  const exposed = wls.filter(w => w.exposed).length;
  const apps = [...new Set(wls.map(w => w.tag || 'untagged'))];
  return {
    kind: 'subnet', title: sn.name,
    sub: `${sn.cidr} · ${sn.az} · ${vpc.name}`,
    trail: placeTrail(c, 3),
    overview: [
      ['Resource', `${vpc.name}/${sn.name}`],
      ['Address', sn.cidr],
      ['Availability zone', sn.az],
      ['VPC / VNet', vpc.name],
      ['Traffic', `${n(wls.length)} workloads`],
      ['Instances sharing this app', apps.join(', ')],
      ['Reachability', sn.pub ? (exposed ? `Public subnet · ${n(exposed)} exposed` : 'Public subnet') : 'Private subnet'],
      ['Path', top.priv ? `AT&T network · ${rampName(top)}` : 'Public internet'],
    ],
    children: { title: `${n(wls.length)} ${wls.length === 1 ? 'workload' : 'workloads'}`, rows: wls.slice(0, 40).map(y => ({
      key: `wl:${c.region}|${vpc.id}|${y.id}`, name: y.name, sub: `${y.ip} · ${y.type} · ${y.tag || 'untagged'}`, warn: !!y.exposed, note: y.exposed ? 'exposed' : '',
    })) },
    paths: [], talks: [], impact: null, records: [],
    actions: [
      ...(exposed ? [{ key: 'attach', label: `Isolate ${n(exposed)} exposed`, site: sn.name }] : []),
      { key: 'policy', label: `Author a policy for ${sn.name}`, region: c.region },
      { key: 'logs', label: 'All records for this subnet', region: c.region },
    ],
  };
}

// ---------- What changed (2026-09-30) ----------
// One list of what people and systems did, dated from the estate's first
// attach to now, so a 24-hour window and a 90-day window see different
// histories. User activity renders it; changes() reads the rows that change
// the network, adds route and maintenance events, and lines them up with the
// problems they came before.
const MIN = 60000, HR = 3600000, DAYMS = 86400000;
const WHO = ['m.boswell', 'j.alvarez', 'p.nakamura', 'svc-terraform'];

export function activityOf(est, { customPolicies = [], steered = [], conns = { rows: [] }, runs = [], orders = [], now = Date.now() } = {}) {
  const out = [];
  const push = (key, at, who, verb, target, detail, ok, change, region = null, result = null) => out.push({ key, at, who, verb, target, detail, ok, change, region, ...(result ? { result } : {}) });
  const first = FIRST_ATTACH[est.id] ? Date.parse(FIRST_ATTACH[est.id] + '-01T00:00:00Z') : now - 60 * DAYMS;
  const priv = (est.regionsList || []).filter(r => r.priv);
  priv.forEach((r, i) => {
    // Attaches spread from the first one to a couple of days ago; one landed in this session is minutes old.
    const at = r.landed ? now - 2 * MIN : Math.round(first + (now - 2 * DAYMS - first) * i / Math.max(1, priv.length));
    push('att:' + r.region, at, WHO[i % 3], 'Attached to the AT&T network', `${r.cloud} ${r.region}`, `${F.RAMP_NAME[r.ramp] || 'NetBond'} · ${r.wl} workloads behind it`, true, true, r.region);
  });
  (est.policies || []).forEach((pl, i) => push('pol:' + i, now - (5 + i * 11) * DAYMS - i * 37 * MIN, WHO[(i + 1) % 3], pl.state === 'enforced' || i % 2 === 0 ? 'Enforced policy' : 'Simulated policy', pl.name || 'Private path required', `${pl.viol || 0} ${(pl.viol || 0) === 1 ? 'violation' : 'violations'} at the time`, true, true));
  customPolicies.forEach((pl, i) => push('cpol:' + i, now - (i + 1) * 6 * MIN, WHO[0], pl.state === 'enforced' ? 'Enforced policy' : 'Simulated policy', pl.name || 'Private path required', `${pl.viol || 0} ${(pl.viol || 0) === 1 ? 'violation' : 'violations'} at the time`, true, true));
  [...new Set((est.regionsList || []).map(r => r.cloud))].slice(0, 3).forEach((nm, i) => {
    const cred = /azure/i.test(nm) ? 'Service principal' : /google/i.test(nm) ? 'Service account' : 'Cross-account role';
    push('cred:' + nm, first - (3 + i) * DAYMS, WHO[i % 3], 'Added a credential', `${nm} account`, `${cred} · read-only, all regions`, true, false);
  });
  (conns.rows || []).filter(r => r.hot || r.degraded).forEach((r, i) => {
    if (r.degraded) push('impact:' + r.region, now - (18 + i * 7) * MIN, WHO[i % 3], 'Opened an impact view', `${r.cloud} ${r.region}`, `${r.wl} workloads behind a degraded link`, true, false, r.region);
    else push('port:' + r.region, now - (2 + i * 6) * DAYMS, WHO[i % 3], 'Ordered a port', `${r.cloud} ${r.region}`, `${r.bw || r.ports + ' × 10 Gbps'} in place, ${r.pct}% used`, true, true, r.region);
  });
  steered.forEach((f, i) => push('steer:' + f, now - (i + 1) * 3 * MIN, WHO[i % 3], 'Steered a flow', String(f), 'moved off the public path', true, true));
  // Modify bandwidth (2026-09-30): what the person did is submit it for approval. The
  // submission changes nothing on the network, so it is not a change; the day it lands is (changes()).
  orders.filter(o => o.kind === 'bandwidth' && o.est === est.id).forEach(o => push('bw:' + o.id, o.atMs, WHO[0], 'Submitted a bandwidth change', o.where, `${o.from} to ${o.to}, for ${o.approver} to approve`, true, false, o.region, 'Submitted'));
  runs.forEach(r => push('run:' + r.at, r.at, r.trigger === 'manual' ? WHO[0] : 'svc-terraform', 'Ran re-discovery', r.accounts === 1 ? 'One account' : 'Whole estate', r.detail || '', r.ok, false));
  push('scope', now - 12 * DAYMS, WHO[1], 'Changed a scope', 'AWS account 4102-8837-5510', 'read-only, all regions', true, true);
  push('export', now - 4 * HR, WHO[2], 'Export denied', 'Flow records, last 30 days', 'no export role on this account', false, false);
  return out.sort((a, b) => b.at - a.at);
}

export function changes(est, conns, activity, now = Date.now(), orders = []) {
  // Problem starts come from the same seeds problems() uses, so the two agree without calling each other.
  const flap = startOf('flap', now, INCIDENT_MIN.flap), spike = startOf('spike', now, INCIDENT_MIN.spike);
  const probs = [
    ...(conns.rows || []).filter(r => r.degraded).map(r => ({ key: 'an-link-' + r.region, region: r.region, at: flap })),
    ...(est.regionsList || []).filter(r => r.rel === 'warn').map(r => ({ key: 'an-' + r.region, region: r.region, at: spike })),
  ];
  const lined = (region, at) => { const p = region && probs.find(q => q.region === region && at <= q.at && q.at - at <= 15 * MIN); return p ? p.key : null; };
  const rows = [
    ...activity.filter(a => a.change).map(a => ({ key: a.key, at: a.at, kind: 'config', text: `${a.verb}: ${a.target}`, region: a.region, source: a.who, linedUp: lined(a.region, a.at), upcoming: false })),
    ...(conns.rows || []).filter(r => r.degraded).map(r => ({ key: 'route:' + r.region, at: flap - 3 * MIN, kind: 'route', text: `Routes withdrawn toward ${r.cloud} ${r.region}`, region: r.region, source: 'BGP session', linedUp: 'an-link-' + r.region, upcoming: false })),
    // AT&T announces maintenance only on what AT&T holds (2026-09-30: an Equinix port read "AT&T planned maintenance").
    ...(conns.rows || []).filter(r => r.terminated === 'att' && ((est.regionsList || []).find(x => x.region === r.region) || {}).slaHolder === 'att').flatMap((r, i) => [
      { key: 'mnt:' + r.region + ':done', at: now - (9 + i) * DAYMS, kind: 'maintenance', text: `AT&T planned maintenance on the ${r.cloud} ${r.region} on-ramp`, region: r.region, source: 'AT&T', linedUp: null, upcoming: false },
      { key: 'mnt:' + r.region + ':next', at: now + (4 + i) * DAYMS, kind: 'maintenance', text: `AT&T planned maintenance on the ${r.cloud} ${r.region} on-ramp`, region: r.region, source: 'AT&T', linedUp: null, upcoming: true },
    ]),
    // A bandwidth change (Modify bandwidth, 2026-09-30) lands on its business day: planned
    // like maintenance until then, a change on the day after. The connection is its own column.
    ...orders.filter(o => o.kind === 'bandwidth' && o.est === est.id).map(o => ({ key: 'bw:' + o.id + ':on', at: o.effectiveAt, kind: 'config', text: `Bandwidth ${o.from} to ${o.to}`, region: o.region, source: 'AT&T', linedUp: null, upcoming: o.effectiveAt > now })),
  ];
  return rows.sort((a, b) => b.at - a.at);
}

// ---------- Is it full? (2026-09-30) ----------
// One capacity function for Observe's Capacity tab and Cost > Optimize: what was
// bought, the peak and the 6-month average, the headroom, when it fills at the
// window's growth, and whether one fewer port would still hold the peak.
const WIN_DAYS = { '1h': 1 / 24, '24h': 1, '7d': 7, '30d': 30, '90d': 90, '6m': 182, '12m': 365 };
export function capacity(conns, win = '30d') {
  const grow = growthOf(win) || 0, days = WIN_DAYS[win] || 30, perDay = grow > 0 ? Math.log(1 + grow) / days : 0;
  return (conns.rows || []).map(r => {
    const capG = r.cap || 10, ports = r.ports || 1, portG = capG / ports, peakPct = r.pct;
    const peakG = +(capG * peakPct / 100).toFixed(1), avgG = +(peakG * 0.82).toFixed(1);
    const toFull = peakG >= capG * 0.99 ? 0 : perDay > 0 ? Math.log(capG / peakG) / perDay : Infinity;
    const fullIn = toFull === 0 ? 'Now' : !isFinite(toFull) || toFull > 365 ? 'Over a year' : toFull < 63 ? `in ${Math.max(1, Math.round(toFull / 7))} ${Math.round(toFull / 7) === 1 ? 'week' : 'weeks'}` : `in ${Math.round(toFull / 30)} months`;
    const s6 = utilSeries(r.id + ':6m', 24, peakPct, growthOf('6m') || 0);
    const avg6mPct = Math.round(s6.reduce((a, v) => a + v, 0) / s6.length);
    const state = r.degraded ? 'down' : r.hot ? 'risk' : 'ok';
    const resizePct = ports > 1 ? Math.round(peakG / (capG - portG) * 100) : null;
    const oversized = state === 'ok' && ports > 1 && peakPct <= 50 && resizePct <= 80;
    return { id: r.id, region: r.region, cloud: r.cloud, ramp: r.ramp, ports, portG, capG, peakG, avgG, peakPct, avg6mPct, headroomG: +(capG - peakG).toFixed(1), toFull, fullIn, state, oversized, resizeTo: oversized ? ports - 1 : null, resizePct };
  });
}

// ---------- Operations (notes, 2026-09-30, C1) ----------
// Closed tickets, as a sample relative to now: there is no ticket store yet, and
// the page says so. Growing's seven fixes in the last 30 days average 1,231
// minutes (20h 31m); the windows hold 1 (24h), 3 (7d), 7 (30d) and 15 (90d).
const H = (ago, fix, sev, what) => ({ ago, fix, sev, what });
const GROWING_HISTORY = [
  H(0.4, 190, 2, 'Port errors on the on-ramp'), H(3, 845, 2, 'Latency over SLO'), H(6, 2295, 2, 'BGP session reset'),
  H(11, 1560, 2, 'Route leak from a branch'), H(17, 582, 1, 'Link down'), H(23, 2069, 2, 'Packet loss at peak'), H(28, 1076, 3, 'Flow logs stopped'),
  H(34, 1320, 2, 'Latency over SLO'), H(41, 640, 3, 'Tag drift on a VPC'), H(48, 1880, 2, 'Port errors on the on-ramp'), H(55, 930, 3, 'Certificate renewal'),
  H(62, 2410, 2, 'BGP flapping'), H(70, 715, 3, 'Flow logs stopped'), H(77, 1150, 2, 'Packet loss at peak'), H(85, 1705, 2, 'Route leak from a branch'),
  H(120, 2600, 1, 'Link down'), H(190, 980, 2, 'Latency over SLO'), H(260, 1430, 3, 'Tag drift on a VPC'), H(330, 1210, 2, 'BGP session reset'),
];
const scaled = (hs, k) => hs.map(h => ({ ...h, fix: Math.round(h.fix * k) }));
export const HISTORY = {
  partial: GROWING_HISTORY,
  mature: scaled(GROWING_HISTORY, 0.85),
  trust: [...scaled(GROWING_HISTORY, 0.7), ...GROWING_HISTORY.map(h => ({ ...h, ago: +(h.ago * 0.5 + 0.2).toFixed(2), fix: Math.round(h.fix * 0.6), sev: Math.max(2, h.sev) }))],
  small: scaled(GROWING_HISTORY.filter((h, i) => i % 2 === 0), 1.4),
  empty: [],
};
/** 1,231 minutes reads 20h 31m; two days or more reads in days and hours. */
export function durF(min) {
  const m = Math.round(min || 0);
  if (m < 60) return `${m}m`;
  if (m < 2880) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
}
const HOLDER = { att: 'AT&T', cloud: 'Cloud provider', third: 'Third party', public: 'Public internet' };
const TARGET = { att: 99.99, cloud: 99.9, third: 99.9, public: 99.5 };
// A sample Sev 1 lands on the connection the estate already shows in trouble (a
// degraded link, else a public region marked warn), never on a healthy one; the
// rest spread over the private connections.
const closedOf = (est, now) => { const regs = est.regionsList || []; const pool = regs.filter(r => r.priv).length ? regs.filter(r => r.priv) : regs;
  const trouble = regs.find(r => r.link === 'degraded') || regs.find(r => r.rel === 'warn') || null;
  return (HISTORY[est.id] || []).map((h, i) => { const r = h.sev === 1 ? trouble : pool.length ? pool[(i * 3) % pool.length] : null;
    if (h.sev === 1 && !r) return null;
    return { key: `hist-${i}`, closedAt: now - h.ago * DAYMS, fixMin: h.fix, sev: h.sev, what: h.what, region: r ? r.region : null, where: r ? `${r.cloud} ${r.region}` : '', owner: HOLDER[(r && r.slaHolder) || 'att'] }; }).filter(Boolean); };

/**
 * Tickets: every open problem, every finding in progress with a ticket, and the
 * sample history. Open counts ignore the window; fixes and time to fix follow it.
 */
export function ticketStats(est, { probs = [], tickets = [], now = Date.now(), days = 30 } = {}) {
  const from = now - days * DAYMS;
  const seen = new Set(probs.map(p => p.key));
  const open = [
    ...probs.map(p => ({ key: p.key, kind: 'problem', sev: p.sev, where: p.where, thing: p.thing, what: p.what, owner: p.ownerLabel, openedAt: p.startedAt })),
    ...tickets.filter(t => !seen.has(t.key)).map(t => ({ ...t, kind: 'finding' })),
  ];
  const closed = closedOf(est, now).filter(c => c.closedAt >= from).sort((a, b) => b.closedAt - a.closedAt);
  const mttr = closed.length ? closed.reduce((a, c) => a + c.fixMin, 0) / closed.length : null;
  return { open, closed, sev1Open: open.filter(t => t.sev === 1).length, openN: open.length, fixedN: closed.length, mttrMin: mttr, mttrF: mttr == null ? '' : durF(mttr), hasHistory: (HISTORY[est.id] || []).length > 0 };
}

/** Availability per connection over the window: 1 - Sev 1 outage minutes / window, against the holder's target. */
export function availability(est, { probs = [], now = Date.now(), days = 30 } = {}) {
  const from = now - days * DAYMS, winMin = days * 1440;
  const closed = closedOf(est, now).filter(c => c.sev === 1 && c.closedAt >= from);
  return (est.regionsList || []).map(r => {
    const past = closed.filter(c => c.region === r.region).reduce((a, c) => a + Math.min(c.fixMin, winMin), 0);
    const live = probs.filter(p => p.sev === 1 && p.region === r.region && p.startedAt).reduce((a, p) => a + Math.max(0, (now - Math.max(from, p.startedAt)) / 60000), 0);
    const outage = Math.min(winMin, past + live), uptime = Math.max(0, Math.min(1, 1 - outage / winMin));
    const holder = r.slaHolder || 'public', target = TARGET[holder];
    return { key: r.region, where: `${r.cloud} ${r.region}`, owner: HOLDER[holder], holder, target, uptime, outageMin: Math.round(outage), met: uptime * 100 >= target };
  }).sort((a, b) => a.uptime - b.uptime || b.target - a.target);
}

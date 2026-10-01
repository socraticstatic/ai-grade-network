/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-connections.js — the network layer on Observe and what it means for
// the workloads behind it. Pure data. Added 2026-09-09 after Ramesh's review:
// "you had five connections of which one is experiencing this problem. Here
// are the workloads that are impacted. These workloads are also talking to
// these other workloads."
import * as P from './naas-paths.js';
import { regionRows, rollupLine, linesOf, onAtt, serviceSites, accessRows, buRows, regionCard, connModeOf, siteModeOf, CONN_LABEL } from './naas-logic.js';

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
const ATT_TERMINATED = new Set(['NetBond', 'EQX', 'hosted']);
const FAB = '#0057b8', PUB = '#8a949c';
const n = (x) => x.toLocaleString('en-US');

/** 24-point utilization line in a 100x24 box, seeded so it never jitters between renders. */
/** A connection's utilization across the Since window, one value per step
 *  (2026-09-29): it grows by the window's growth to where it is now, with
 *  seeded day-to-day noise, and its highest point is the peak the row reports. */
export function utilSeries(seed, points, peakPct, growth) {
  const r = rnd(hash(seed) || 1), start = peakPct / (1 + Math.max(0, growth || 0));
  const raw = Array.from({ length: points }, (_, i) => Math.max(1, (start + (peakPct - start) * i / Math.max(1, points - 1)) * (0.86 + r() * 0.14)));
  const mx = Math.max(...raw) || 1;
  return raw.map(v => Math.max(1, Math.min(99, v / mx * peakPct)));
}
export function sparkline(seed, points = 24, base = 50, amp = 20) {
  const r = rnd(hash(seed) || 1); let v = base;
  const pts = Array.from({ length: points }, (_, i) => { v = Math.max(2, Math.min(98, v + (r() - 0.5) * amp)); return [i / (points - 1) * 100, 24 - v / 100 * 22 - 1]; });
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
}

const ORDER = { Degraded: 0, Saturating: 1, Up: 2 };

/** One row per attached region: what NetBond Advanced's monitor shows, plus what was purchased. */
export function connections(est, ob) {
  const util = ob.utilRows || [];
  const rows = est.regionsList.filter(r => r.priv).map(r => {
    const u = util.find(x => x.region === r.region) || { gbps: 0, ports: 1, cap: 1, pct: 0, bw: '1 × 1 Gbps', bwShort: '1G' };
    const degraded = r.link === 'degraded';
    // The peak is traffic (skeptic, 2026-09-30): a landed resize (BW.landUtil's was) changes the
    // port it fills, never the Gbps. Its share is that same peak over the new size, and may pass 100%.
    const was = u.was || u, pct0 = degraded ? Math.max(was.pct, 62) : was.pct;
    const peakG = +((was.cap || 0) * pct0 / 100).toFixed(1), pct = u.was ? Math.round(peakG / u.cap * 100) : pct0;
    const state = degraded ? 'Degraded' : pct >= 80 ? 'Saturating' : 'Up';
    const ramp = r.ramp || 'NetBond';
    return { id: 'cx-' + r.region, cloud: r.cloud, region: r.region, ramp, ports: u.ports, cap: u.cap, bw: u.bw || `${u.ports} × 10 Gbps`, bwShort: u.bwShort || '10G', gbps: u.gbps, peakG, pct, state, bgp: degraded ? 'Flapping' : 'Established', drops: degraded ? '0.31%' : state === 'Saturating' ? '0.04%' : '0.00%', inD: sparkline(r.region + ':in', 24, pct, degraded ? 34 : 12), outD: sparkline(r.region + ':out', 24, Math.max(4, pct - 18), degraded ? 30 : 10), wl: r.wl, terminated: ATT_TERMINATED.has(ramp) ? 'att' : 'own', paths: r.paths || 1, acct: r.acct || null, hot: pct >= 80, degraded };
  }).sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.pct - a.pct);
  return { rows, degraded: rows.filter(r => r.degraded).length, total: rows.length };
}

/** What a connection's state means for the workloads behind it, with the honesty the data allows (Dev, 10:05). */
export function impacted(est, inv, row) {
  if (!row) return { kind: 'none', certainty: '', resilience: '', vpcs: [], downstream: [], wl: 0 };
  const regionsOf = inv.flatMap(c => c.regions);
  const reg = regionsOf.find(r => r.region === row.region);
  const vpcs = (reg ? reg.vpcs : []).map(v => ({ name: v.name, wl: v.wl, tags: v.tags.slice(0, 2) }));
  const partners = (est.arcs || []).filter(a => a.from === row.region || a.to === row.region).map(a => a.from === row.region ? a.to : a.from);
  const downstream = partners.map(p => { const pr = est.regionsList.find(r => r.region === p); const pi = regionsOf.find(r => r.region === p); return pr ? { label: `${pr.cloud} ${pr.region}`, vpcs: (pi ? pi.vpcs : []).slice(0, 2).map(v => ({ name: v.name, wl: v.wl })) } : null; }).filter(Boolean);
  const wl = vpcs.reduce((a, v) => a + v.wl, 0);
  if (!row.degraded) return { kind: 'none', certainty: `No impact. ${n(wl)} workloads reach the AT&T network through this connection at ${row.pct}% utilization.`, resilience: '', vpcs, downstream, wl };
  const direct = row.terminated === 'att';
  const certainty = direct ? 'Directly impacted. AT&T terminates this connection in your VPC.' : `Possible impact. Visibility ends at your gateway. ${row.cloud} ${row.acct || 'account'}.`;
  const resilience = row.paths >= 2 ? `Access holds: a second path carries ${row.gbps} Gbps at ${Math.min(99, row.pct * 2)}% while this one degrades.` : 'Single path. Access to these workloads is lost if this link fails.';
  return { kind: direct ? 'direct' : 'possible', certainty, resilience, vpcs, downstream, wl };
}

const bar = (rows) => { const m = Math.max(0.001, ...rows.map(r => r.gbps)); return rows.map(r => ({ ...r, w: Math.round(r.gbps / m * 100) + '%' })); };
const G = (x) => x.toFixed(1) + ' Gbps';

/** The five patterns most cloud conversations center on (Ramesh, 19:04). Each row is a door into Logs. */
export function patterns(est, ob, inv) {
  const rs = est.regionsList, flows = ob.flows || [];
  const legend = [{ label: 'On AT&T', fill: FAB }, { label: 'Public internet', fill: PUB }];
  const pathWord = (c) => c ? 'on AT&T' : 'public internet';
  const region = bar(rs.map(r => ({ key: r.region, name: `${r.cloud} ${r.region}`, sub: `${n(r.wl)} workloads · between VPCs`, gbps: +(r.wl * 0.14 * 0.6).toFixed(1), priv: r.priv, fill: r.priv ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const regions = bar(flows.filter(f => f.to === 'object storage').map(f => ({ key: f.id, name: `${f.from} → object storage`, sub: `${f.region} · ${pathWord(f.controlled)} · ${f.latency} ms`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const clouds = bar(flows.filter(f => f.kind !== 'App').map(f => ({ key: f.id, name: f.name, sub: `${pathWord(f.controlled)} · ${f.latency} ms`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const internet = bar(flows.filter(f => f.kind === 'App' && f.to !== 'object storage').map(f => ({ key: f.id, name: f.name, sub: `${f.region} · ${f.controlled ? 'AT&T egress' : 'hyperscaler exit'} · $${f.perGb.toFixed(2)}/GB`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const sites = P.allSites(est);
  const inbound = bar(sites.map(st => ({ key: st.id || st.name, name: st.name, sub: `${st.access || 'Access'} · ${st.priv ? 'private first mile' : 'public first mile'}`, gbps: +rs.reduce((a, r) => a + P.gbps(est, st, r), 0).toFixed(2), priv: !!st.priv, fill: st.priv ? FAB : PUB })).filter(x => x.gbps > 0).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: r.gbps >= 1 ? G(r.gbps) : Math.round(r.gbps * 1000) + ' Mbps' }));
  // Each pattern answers the three questions Ramesh named (19:18): connectivity, security, cost.
  const mk = (key, title, rows, word) => {
    const onFab = rows.filter(r => r.priv).length, pub = rows.length - onFab;
    const gb = rows.reduce((a, r) => a + r.gbps, 0), pubGb = rows.filter(r => !r.priv).reduce((a, r) => a + r.gbps, 0);
    const perGb = gb ? ((pubGb * 0.09 + (gb - pubGb) * 0.02) / gb) : 0;
    return { key, title, rows, legend, total: gb, sub: rows.length ? `${onFab} of ${rows.length} ${word} on AT&T · ${pub ? pub + ' uninspected' : 'all inspected'} · $${perGb.toFixed(2)}/GB` : 'Nothing in this window', connectivity: `${onFab} of ${rows.length} on AT&T`, security: pub ? `${pub} with no inspection point` : 'every path has an inspection point', cost: `$${perGb.toFixed(2)}/GB blended` };
  };
  return [mk('region', 'Stays in the region', region, 'regions'), mk('regions', 'Across regions', regions, 'flows'), mk('clouds', 'Across clouds', clouds, 'paths'), mk('internet', 'Out to the internet', internet, 'flows'), mk('inbound', 'Coming in', inbound, 'sites')];
}

/** Private ip → resource name through the discovery tree; public stays null (Santosh, 19:51). */
export function resolveDest(inv, ip) {
  for (const c of inv) for (const r of c.regions) for (const v of r.vpcs) for (const s of v.subnets) for (const w of s.workloads || []) if (w.ip === ip) return { name: `${w.tag || v.name}/${w.name}`, sub: `${ip} · ${w.type} · ${r.region}` };
  return null;
}

const money = (x) => '$' + Math.round(x).toLocaleString('en-US');

/** The four launch-off points (Ramesh, 23:09). New customers start at Connect; everyone else at Observe. */
export function launchCards({ est, ob, conns, totalSave, violations, isEmpty }) {
  const rs = est.regionsList, pub = rs.filter(r => !r.priv).length;
  // "Cold" is an estate with nothing on AT&T, discovered or not. It has
  // no connections, no telemetry and no savings, so Observe cannot be the
  // start-here card and must not claim "you are connected".
  const cold = isEmpty || rs.filter(r => r.priv).length === 0;
  const degRow = conns.rows.find(r => r.degraded);
  return [
    { key: 'connect', label: 'Connect', value: isEmpty ? 'Nothing connected yet' : `${pub} of ${rs.length} regions`, sub: isEmpty ? 'Start here' : pub ? 'still ride the public internet' : 'every region on AT&T', bar: isEmpty ? null : Math.round((rs.length - pub) / (rs.length || 1) * 100) },
    { key: 'observe', label: 'Observe', value: isEmpty ? 'No telemetry yet' : cold ? 'Public paths only' : `${conns.degraded} of ${conns.total} connections`, sub: isEmpty ? 'starts with the first attach' : cold ? 'nothing attached yet' : degRow ? `degraded · ${n(degRow.wl)} workloads impacted` : `healthy · ${(ob.fab || 0).toFixed(1)} Gbps on AT&T`, bar: null },
    { key: 'govern', label: 'Govern', value: isEmpty ? 'No policies yet' : n(violations), sub: isEmpty ? 'three starting points' : `policy violations across ${(est.policies || []).length} policies`, bar: null },
    { key: 'cost', label: 'Cost', value: isEmpty ? 'No egress seen yet' : cold ? money(ob.egressMo || 0) + '/mo' : totalSave ? money(totalSave) + '/mo' : money(ob.savingsMo || 0) + '/mo', sub: isEmpty ? 'priced after the scan' : cold ? 'of egress, every byte on public rates' : totalSave ? `on the table across ${est.findings.filter(f => f.priced).length} ${est.findings.filter(f => f.priced).length === 1 ? 'finding' : 'findings'}` : 'already saved on AT&T', bar: null },
  ].map(c => {
    // A dashboard tile is a label and a number. The eyebrow, the sentence and
    // the link under each one were four fragments of copy per tile, sixteen
    // across the row, above every chart on every page.
    const primary = cold ? c.key === 'connect' : c.key === 'observe';
    const door = { connect: isEmpty ? 'Connect a cloud' : pub ? `Attach the ${pub === 1 ? 'region' : pub + ' regions'}` : 'See the AT&T network', observe: cold ? 'Open Observe' : degRow ? 'What is impacted' : 'See the traffic', govern: isEmpty ? 'Start a policy' : violations ? 'Review violations' : 'Review policies', cost: cold ? 'Open Cost' : 'See the savings' }[c.key];
    return { ...c, primary, door, eyebrow: '' };
  });
}

const PROTO = ['tcp/443', 'tcp/5432', 'tcp/8080', 'udp/53', 'tcp/6379', 'tcp/22'];
const PUBLIC_DST = [['52.94.236.248', 's3 · public'], ['104.18.32.7', 'unresolved · public'], ['20.60.132.10', 'blob · public'], ['142.250.72.14', 'unresolved · public'], ['3.5.140.2', 'unresolved · public']];
const PATTERN_OF = { region: 'region', regions: 'regions', clouds: 'clouds', internet: 'internet', inbound: 'inbound' };

/** Per-flow records for Logs, one pattern each; private destinations carry the resource name, public ones stay an ip. */
export function records(est, inv, ob, pattern = 'all') {
  const regionsOf = inv.flatMap(c => c.regions);
  if (!regionsOf.length) return [];
  const wls = regionsOf.flatMap(r => r.vpcs.flatMap(v => v.subnets.flatMap(s => (s.workloads || []).map(w => ({ ...w, region: r.region, cloud: r.cloud, priv: r.priv, vpc: v.name })))));
  const pick = (seed, arr) => arr[hash(seed) % arr.length];
  const sites = P.allSites(est);
  const out = [];
  const push = (id, pat, src, dst, path, action, seed) => out.push({ id, pattern: pat, time: `14:0${hash(seed) % 10}:${String(10 + hash(seed + 'x') % 50)}`, srcName: src.name, srcSub: src.sub, dstName: dst.name, dstSub: dst.sub, proto: pick(seed + 'p', PROTO), bytes: (0.2 + (hash(seed + 'b') % 900) / 100).toFixed(1) + ' GB', path, action, deny: action === 'deny' });
  const wlRef = (w) => ({ name: `${w.tag || w.vpc}/${w.name}`, sub: `${w.ip} · ${w.region}` });
  const hit = (ip) => resolveDest(inv, ip);
  regionsOf.slice(0, 4).forEach((r, i) => {
    const mine = wls.filter(w => w.region === r.region); if (mine.length < 2) return;
    const a = mine[0], b = mine[Math.min(3, mine.length - 1)];
    push(`rec-region-${i}`, 'region', wlRef(a), hit(b.ip) || { name: b.ip, sub: 'unresolved' }, r.priv ? 'private' : 'public', 'allow', `r${i}`);
    const other = wls.find(w => w.cloud === r.cloud && w.region !== r.region);
    if (other) push(`rec-regions-${i}`, 'regions', wlRef(a), hit(other.ip) || { name: other.ip, sub: 'unresolved' }, r.priv && other.priv ? 'private' : 'public', 'allow', `x${i}`);
    const xc = wls.find(w => w.cloud !== r.cloud);
    if (xc) push(`rec-clouds-${i}`, 'clouds', wlRef(a), hit(xc.ip) || { name: xc.ip, sub: 'unresolved' }, r.priv && xc.priv ? 'private' : 'public', 'allow', `c${i}`);
    const pd = PUBLIC_DST[i % PUBLIC_DST.length];
    push(`rec-internet-${i}`, 'internet', wlRef(mine[1]), { name: pd[0], sub: pd[1] }, 'public', r.priv && (a.tag === 'pci' || a.tag === 'prod') ? 'deny' : 'allow', `n${i}`);
  });
  sites.slice(0, 4).forEach((st, i) => {
    const target = wls.find(w => w.priv) || wls[0]; if (!target) return;
    push(`rec-inbound-${i}`, 'inbound', { name: st.name, sub: `${st.access || 'Access'} · ${st.metro || ''}`.trim() }, wlRef(target), st.priv && target.priv ? 'private' : 'public', 'allow', `s${i}`);
  });
  const filtered = pattern === 'all' ? out : out.filter(r => r.pattern === PATTERN_OF[pattern]);
  return filtered.sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- Drills in place (Santosh, 16:02: "I don't want to lose the context") ----------
import * as S from './naas-sites.js';

// A third-party-core site does not ride the AT&T network, so it reaches the
// clouds over its own carrier and only where that carrier has an on-ramp. The
// generic rows below read privacy off the cloud region and printed "AT&T
// network" for every attached region, which drew Phoenix, Lumen end to end, as
// six paths handing off to AT&T.
function pathsOfSite(est, site) {
  if (site.core === 'third') {
    const r = est.regionsList.find(x => x.region === site.via);
    const carrier = site.carrier || site.viaRamp || 'third party';
    return { level: 'path', label: `${site.name || site.id} · paths`, rows: r ? [{ key: 'path:' + r.region, name: `${r.cloud} ${r.region}`,
      access: `${site.access} · ${P.path(site, r).ms} ms · ${carrier} network`, priv: true, core: 'third', via: r.region, viaRamp: site.viaRamp, accessSla: site.accessSla, carrier: site.carrier, circuit: site.access, xc: site.xc,
      leaf: true, region: r.region }] : [] };
  }
  return pathsOfAttSite(est, site);
}
function pathsOfAttSite(est, site) { const sr = P.siteRegions(est, site, 6); return { level: 'path', label: `${site.name || site.id} · paths`, rows: sr.rows.map(x => ({ key: 'path:' + x.region.region, name: `${x.region.cloud} ${x.region.region}`, access: `${site.access || 'Access'} · ${P.path(site, x.region).ms} ms · ${x.region.priv ? 'AT&T network' : 'public internet'}`, priv: !!x.region.priv, accessSla: site.accessSla, carrier: site.carrier, circuit: site.access, xc: site.xc, gbps: x.gbps, leaf: true, region: x.region.region })) }; }

const byName = (a, b) => a.name.localeCompare(b.name);
const groupRow = (key, name, sites) => ({ key, name, access: rollupLine(sites), priv: sites.some(onAtt), drillKey: key, rollup: true, lines: linesOf(sites), cursor: 'pointer' });
const svcLineOf = (x) => S.servicesOf(x).map(v => `${v.label} ${v.bwF}${v.role === 'backup' ? ' backup' : ''}`).join(' + ');
const siteCard = (x) => ({ key: 'site:' + x.name, name: x.name, access: S.servicesOf(x).map(v => v.label).join(' + '), svcLine: svcLineOf(x), bwF: (S.servicesOf(x)[0] || {}).bwF || '', place: [x.metro, x.cls].filter(Boolean).join(' · '), metro: x.metro, priv: !!x.priv, drillKey: 'site:' + x.name,
  // A site that declares its services fans one line per service; one that does not is its own line, as it always was.
  ...(Array.isArray(x.services) && x.services.length ? { lines: linesOf([x]) } : {}), circuit: x.access, accessSla: x.accessSla, carrier: x.carrier, core: x.core, via: x.via, viaRamp: x.viaRamp, xc: x.xc, rollup: false, cursor: 'pointer' });
/**
 * The places a set of sites sits in. A named site is one unit at its metro; a
 * rollup ("Remote sites, East (1,640)") has no metro of its own, so it splits
 * into the metros siteTree already gives it, each carrying a sample of sites.
 */
function placeUnits(est, sites) {
  const tree = S.siteTree(est);
  return sites.flatMap(x => {
    const count = S.countOf(x.name);
    if (count > 1 || !x.metro || x.metro === 'Various') {
      const cls = S.classOf(x), node = tree.find(c => c.cls === cls);
      const ix = String(S.rollupKeyOf(est, x) || '').split('#')[1];
      const kids = node ? node.children.filter(ch => ch.kind === 'metro' && (ix == null || String(ch.key).startsWith(`${cls}:${ix}:`))) : [];
      if (kids.length) return kids.map(m => ({ metro: m.name, count: m.count, att: onAtt(x) ? m.count : 0, from: x, sample: m.sites, more: m.more || 0, node: m }));
    }
    return [{ metro: x.metro, count, att: onAtt(x) ? count : 0, from: x, site: x }];
  });
}
const unitRow = (key, name, units) => {
  const total = units.reduce((a, u) => a + u.count, 0), att = units.reduce((a, u) => a + u.att, 0);
  const from = [...new Set(units.map(u => u.from))];
  return { key, name, access: `${total.toLocaleString('en-US')} ${total === 1 ? 'site' : 'sites'} · ${att.toLocaleString('en-US')} AT&T · ${(total - att).toLocaleString('en-US')} non-AT&T`,
    priv: att > 0, drillKey: key, rollup: true, lines: linesOf(from), count: total, att, cursor: 'pointer' };
};
/** A place trail that stops on a metro holding a rollup: the class and metro key the volume list pages through. */
export function placeMetroScope(est, trail) {
  if (!trail || trail.length !== 3 || !String(trail[0]).startsWith('region:')) return null;
  const region = regionRows(est).find(r => 'region:' + r.name === trail[0]); if (!region) return null;
  const metro = String(trail[2]).replace(/^metro:/, ''), code = String(trail[1]).replace(/^state:/, '');
  const units = placeUnits(est, region.sites).filter(u => u.metro === metro && (S.stateOf(u.metro) || '—') === code);
  const roll = units.find(u => u.sample);
  if (!roll) return null;
  const cls = S.classOf(roll.from), ix = String(S.rollupKeyOf(est, roll.from) || '').split('#')[1];
  return { cls, metroKey: `${cls}:${ix}:${metro}`, name: metro, count: units.reduce((a, u) => a + u.count, 0), onFabric: units.reduce((a, u) => a + u.att, 0) };
}
/**
 * The site side of every picture drills by place (Micah, 2026-09-28 and again
 * 2026-09-29: "regions to states then to metros then to sites"): region, state,
 * metro, site, then the site's services. It never turns into clouds; clouds are
 * where the traffic goes, on the right.
 */
export function placeDrill(est, regionName, sites, rest, opts = {}) {
  const units = placeUnits(est, sites);
  if (!rest.length) {
    const by = {}; units.forEach(u => { const k = S.stateOf(u.metro) || '—'; (by[k] = by[k] || []).push(u); });
    // Two named sites or fewer: the row names them, so the region alone shows every site (2026-09-30).
    const named = (us) => opts.full && us.length <= 2 && us.every(u => u.site) ? { access: us.map(u => { const sv = S.servicesOf(u.site)[0] || {}; return `${u.site.name} · ${sv.label} · ${sv.bwF}`; }).join(', ') } : {};
    return { level: 'state', label: regionName, rows: Object.entries(by).map(([code, us]) => ({ ...unitRow('state:' + code, S.placeName(code === '—' ? '' : code), us), ...named(us) })).sort(byName) };
  }
  const code = String(rest[0]).replace(/^state:/, '');
  const inState = units.filter(u => (S.stateOf(u.metro) || '—') === code);
  if (!inState.length) return null;
  if (rest.length === 1) {
    const by = {}; inState.forEach(u => { (by[u.metro] = by[u.metro] || []).push(u); });
    return { level: 'metro', label: S.placeName(code === '—' ? '' : code), rows: Object.entries(by).map(([m, us]) => unitRow('metro:' + m, m, us)).sort(byName) };
  }
  const metro = String(rest[1]).replace(/^metro:/, '');
  const inMetro = inState.filter(u => u.metro === metro);
  if (!inMetro.length) return null;
  const named = inMetro.filter(u => u.site).map(u => u.site);
  // Asked for the whole metro (Your sites, 2026-09-30), a rollup lists every site and the list pages in place.
  const sampled = inMetro.filter(u => u.sample).flatMap(u => (opts.full && u.node ? S.metroSites(u.node) : u.sample).map(sx => ({ ...sx, name: sx.name || sx.id, access: u.from.access, accessSla: u.from.accessSla, carrier: u.from.carrier, core: u.from.core, via: u.from.via, viaRamp: u.from.viaRamp, metro })));
  const more = opts.full ? 0 : inMetro.reduce((a, u) => a + (u.more || 0), 0);
  if (rest.length === 2) return { level: 'site', label: metro, rows: [...named.map(siteCard).sort(byName), ...sampled.map(siteCard), ...(more ? [{ key: 'more:' + metro, name: `+${more.toLocaleString('en-US')} more`, access: 'open the list ›', more: true, rollup: false, count: more }] : [])] };
  const want = String(rest[2]).replace(/^site:/, '');
  // A site from the full list of a rolled-up metro is one of the rollup's own sites.
  const roll = inMetro.find(u => u.sample);
  const site = named.find(x => x.name === want) || sampled.find(x => x.name === want)
    || (roll && new RegExp(`^[A-Z]+-${String(metro).slice(0, 3).toUpperCase()}|^[A-Z]+-`).test(want) ? { name: want, metro, access: roll.from.access, accessSla: roll.from.accessSla, carrier: roll.from.carrier, core: roll.from.core, priv: roll.from.priv } : null);
  if (!site || rest.length > 3) return null;
  return { level: 'service', label: site.name, rows: serviceSites(site).map((v, i) => {
    const sv = S.servicesOf(site)[i] || S.servicesOf(site)[0];
    return { key: 'svc:' + sv.key, name: sv.label, access: `${sv.role} · ${sv.bwF} · ${sv.onAtt ? 'AT&T core' : 'outside the AT&T network'}`, priv: sv.onAtt, leaf: true, rollup: false,
      lines: [{ key: 'svc:' + sv.key, ...v }], title: sv.name };
  }) };
}

/** Left column of the hero for a drill trail: [] → the estate's sites; [class] → metros or named sites; [class, metro] → sites; [class, metro, site] → the site's paths. */
export function siteDrillRows(est, trail, opts = {}) {
  if (!trail || !trail.length) return null;
  // Group: Access type, then region (notes, 2026-09-29). An access group opens to
  // the regions its sites sit in; past that it is the region drill, on those sites only.
  if (String(trail[0]).startsWith('access:') || String(trail[0]).startsWith('bu:')) {
    const g = String(trail[0]).startsWith('bu:') ? buRows(est, opts.tags).find(r => 'bu:' + r.name === trail[0]) : accessRows(est).find(r => 'access:' + r.key === trail[0]);
    if (!g) return null;
    const sub = { ...est, sites: g.sites };
    if (trail.length === 1) return { level: 'region', label: g.name, rows: regionRows(sub).map(regionCard) };
    return siteDrillRows(sub, trail.slice(1), opts);
  }
  // The root is regions. A region opens to its sites, each drawn on its own path
  // (so Denver and Phoenix show Lumen), and past that the site drill is the one
  // that already exists, rooted at the site that was chosen.
  if (String(trail[0]).startsWith('region:')) {
    const name = String(trail[0]).slice('region:'.length);
    const region = regionRows(est).find(r => r.name === name);
    if (!region) return null;
    return placeDrill(est, name, region.sites, trail.slice(1), opts);
  }
  const tree = S.siteTree(est);
  const all = P.allSites(est);
  const [clsKey, grpIx] = String(trail[0]).split('#');
  const cls = tree.find(c => c.cls === clsKey || c.label === clsKey);
  if (!cls) { const named = all.find(x => x.name === trail[0]); return named && trail.length === 1 ? pathsOfSite(est, named) : null; }
  const kids = grpIx == null ? cls.children : cls.children.filter(ch => String(ch.key).startsWith(`${cls.cls}:${grpIx}:`));
  const clsLabel = S.labelOfKey(est, trail[0]);
  const siteRowOf = (x) => ({ key: 'site:' + x.id, name: x.id, access: x.address || `${x.metro} · ${x.access || ''}`, priv: !!x.priv, drillKey: x.id, rollup: false, cursor: 'pointer' });
  const pathsOf = (site) => pathsOfSite(est, site);
  const _unused = (site) => { const sr = P.siteRegions(est, site, 6); return { level: 'path', label: `${site.name || site.id} · paths`, rows: sr.rows.map(x => ({ key: 'path:' + x.region.region, name: `${x.region.cloud} ${x.region.region}`, access: `${site.access || 'Access'} · ${P.path(site, x.region).ms} ms · ${x.region.priv ? 'AT&T network' : 'public internet'}`, priv: !!x.region.priv, gbps: x.gbps, leaf: true, region: x.region.region })) }; };
  if (trail.length === 1) {
    const rows = kids.map(ch => ch.kind === 'metro'
      ? { key: 'metro:' + ch.key, name: `${ch.name} (${ch.count.toLocaleString('en-US')})`, access: `${ch.onFabric.toLocaleString('en-US')} of ${ch.count.toLocaleString('en-US')} on AT&T · ${ch.access}`, priv: ch.onFabric >= ch.count / 2, drillKey: ch.key, rollup: true, cursor: 'pointer' }
      : { key: 'site:' + ch.name, name: ch.name, access: ch.address || ch.access, priv: !!ch.priv, drillKey: ch.name, rollup: false, cursor: 'pointer' });
    return { level: kids[0] && kids[0].kind === 'metro' ? 'metro' : 'site', label: clsLabel, rows };
  }
  const second = kids.find(ch => ch.name === trail[1] || ch.key === trail[1]);
  if (!second) return null;
  if (second.kind === 'site') return pathsOf(all.find(x => x.name === second.name) || { ...second, cls: cls.cls, clsLabel: cls.label });
  if (trail.length === 2) {
    let rows = second.sites.map(siteRowOf);
    // A site pinned from the drawer leads the sample.
    if (opts.pin && !rows.some(r => r.drillKey === opts.pin)) { const pinned = S.metroSites(second).find(x => x.id === opts.pin); if (pinned) rows = [siteRowOf(pinned), ...rows.slice(0, 5)]; }
    if (second.more) rows.push({ key: 'more', name: `+${second.more.toLocaleString('en-US')} more in ${second.name}`, access: 'open the list ›', more: true, rollup: false, cursor: 'pointer' });
    return { level: 'site', label: `${clsLabel} · ${second.name}`, rows };
  }
  const site = all.find(x => x.id === trail[2] || x.name === trail[2]) || (second.kind === 'metro' ? S.metroSites(second).find(x => x.id === trail[2]) : null);
  return site ? pathsOf({ ...site, cls: cls.cls, clsLabel: cls.label, access: site.access || second.access }) : null;
}

/** Right column of the hero for a cloud drill: [region] → its VPCs; [region, vpc] → subnets; [region, vpc, subnet] → workloads. Other regions fold into one row. */
export function regionDrillRows(est, inv, trail) {
  if (!trail || !trail.length) return null;
  const top = est.regionsList.find(r => r.region === trail[0]); if (!top) return null;
  const reg = inv.flatMap(c => c.regions).find(r => r.region === trail[0]); if (!reg) return null;
  const pinned = { ...top, pinned: true, drillUp: true };
  const child = (o) => ({ cloud: top.cloud, region: o.name, wl: o.wl, priv: o.priv, ramp: null, child: true, noEdge: true, indent: 14, drill: o.drill || null, leaf: !!o.leaf, wlLabel: o.wlLabel || null, sub: o.sub || '' });
  let children, level, label;
  if (trail.length === 1) { level = 'vpc'; label = `${top.cloud} ${top.region}`; children = reg.vpcs.map(v => child({ name: v.name, wl: v.wl, priv: v.priv, drill: v.id, sub: v.purpose })); }
  else {
    const vpc = reg.vpcs.find(v => v.id === trail[1]); if (!vpc) return null;
    if (trail.length === 2) { level = 'subnet'; label = `${top.region} › ${vpc.name}`; children = vpc.subnets.map(sn => child({ name: `${sn.name} · ${sn.cidr}`, wl: sn.wl, priv: !sn.pub, drill: sn.id, sub: sn.az })); children.push({ ...child({ name: `See all ${vpc.subnets.reduce((t, x) => t + (x.workloads || []).length, 0)} workloads`, wl: 0, priv: true, leaf: true, sub: 'every app in this VPC' }), seeAll: true, wlScope: { region: trail[0], vpcId: trail[1], snId: null } }); }
    else {
      const sn = vpc.subnets.find(x => x.id === trail[2]); if (!sn) return null; level = 'workload'; label = `${vpc.name} › ${sn.name}`;
      const wls = sn.workloads || [];
      // The column samples; it never lies about the rest. Workloads are the
      // first level with volume, so this is where the drawer takes over.
      children = wls.slice(0, 6).map(w => ({ ...child({ name: w.name, wl: 1, priv: !w.exposed, leaf: true, wlLabel: w.ip, sub: `${w.type} · ${w.tag || 'untagged'}` }), wlSel: `wl:${trail[0]}|${trail[1]}|${w.id}` }));
      if (wls.length > children.length) children.push({ ...child({ name: `See all ${wls.length} workloads`, wl: 0, priv: true, leaf: true, sub: 'every app in this subnet' }), seeAll: true, wlScope: { region: trail[0], vpcId: trail[1], snId: trail[2] } });
    }
  }
  const others = est.regionsList.length - 1 + (est.regionsExtra || 0);
  const rows = [pinned, ...children, ...(others > 0 ? [{ cloud: '', region: `Back to ${top.cloud}`, rollup: true, other: true, toRoot: true, toProvider: true, wl: 0, priv: false }] : [])];
  // Every hop by name, cloud first. The crumb used to be built from `label`,
  // which already carried the region, so it read "Clouds › AWS › us-east-1 ›
  // AWS us-east-1". This is the trail; nothing derives it twice.
  const vpcOf = trail.length > 1 ? reg.vpcs.find(v => v.id === trail[1]) : null;
  const snOf = vpcOf && trail.length > 2 ? vpcOf.subnets.find(x => x.id === trail[2]) : null;
  const crumb = [top.cloud, top.region, vpcOf ? vpcOf.name : null, snOf ? snOf.name : null].filter(Boolean);
  return { level, label, crumb, rows, top };
}

/** The provider level on the right: that provider's regions, each with its own wire, and a way back to every provider. */
export function providerRows(est, cloud) {
  const rows = est.regionsList.filter(r => r.cloud === cloud);
  if (!rows.length) return null;
  const n = new Set(est.regionsList.map(r => r.cloud)).size;
  return { level: 'region', label: cloud, crumb: [cloud], rows: [...rows, { cloud: '', region: `Back to ${n} providers`, rollup: true, other: true, toRoot: true, wl: 0, priv: false }] };
}

/** Sankey split: 'site:<class>' splits a site class by metro; 'tag:<group>' splits a workload group by region. */
export function splitSources(est, flows, split) {
  if (!split) return null;
  const [kind, name] = split.split(':');
  const perSite = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.04, Edge: 0.005, Field: 0.3 };
  if (kind === 'site') {
    const cls = S.siteTree(est).find(c => c.cls === name); if (!cls) return null;
    const per = perSite[name] || 0.5;
    return { kind, name, nodes: cls.children.map(ch => ch.kind === 'metro'
      ? { kind: 'sitemetro', key: `site:${name}/${ch.name}`, cls: name, name: `${ch.name} · ${ch.count.toLocaleString('en-US')}`, v: per * ch.count, fabV: per * ch.onFabric }
      : { kind: 'sitemetro', key: `site:${name}/${ch.name}`, cls: name, name: ch.name, v: per, fabV: ch.priv ? per : per * 0.1 }).sort((a, b) => b.v - a.v) };
  }
  if (kind === 'tag') {
    const m = {};
    flows.filter(f => f.kind === 'App' && f.from === name).forEach(f => { const g = m[f.region] = m[f.region] || { kind: 'tagregion', key: `tag:${name}/${f.region}`, name: `${name} · ${f.region}`, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; });
    const nodes = Object.values(m).sort((a, b) => b.v - a.v);
    return nodes.length ? { kind, name, nodes } : null;
  }
  return null;
}

/** Pattern a Sankey destination belongs to, for the Logs door. */
export const destPattern = (name) => /object storage/.test(name) ? 'regions' : /inter-cloud/.test(name) ? 'clouds' : /from sites/.test(name) ? 'inbound' : 'internet';

// ---------- Your clouds (notes, 2026-09-30) ----------
// What the tiles count at each level of the cloud drill, and how the VPCs there
// attach. The unit of the mix is the VPC or VNet, the thing that attaches, so
// what is attached equals the header's "attached" pill. IPsec and SD-WAN are
// properties of sites, so they are counted from the sites, not seeded on regions.
const VPC_NOUN = { Azure: ['VNet', 'VNets'], Oracle: ['VCN', 'VCNs'] };
const MIX_ORDER = ['netbond', 'direct', 'third', 'internet'];
const MIX_INK = { netbond: 'var(--viz-1)', direct: 'var(--viz-2)', third: 'var(--viz-5)', internet: 'var(--viz-6)' };
export function cloudScope(est, inv, trail = []) {
  const at = (i, p) => (trail[i] ? String(trail[i]).replace(p, '') : null);
  const cloud = at(0, /^cloud:/), region = at(1, /^region:/), vpcId = at(2, /^vpc:/), snId = at(3, /^sn:/);
  const level = ['root', 'cloud', 'region', 'vpc', 'subnet'][Math.min(trail.length, 4)];
  const regs = (inv || []).flatMap(c => (c.regions || []).map(r => ({ ...r, cloud: r.cloud || c.name }))).filter(r => (!cloud || r.cloud === cloud) && (!region || r.region === region));
  const vpcs = regs.flatMap(r => (r.vpcs || []).map(v => ({ v, r }))).filter(x => !vpcId || x.v.id === vpcId);
  const subnets = vpcs.flatMap(x => (x.v.subnets || []).map(sn => ({ sn, ...x }))).filter(x => !snId || x.sn.id === snId);
  const wls = subnets.flatMap(x => x.sn.workloads || []);
  const counts = { clouds: new Set(regs.map(r => r.cloud)).size, regions: regs.length, vpcs: vpcs.length, subnets: subnets.length, workloads: wls.length, apps: new Set(wls.map(w => w.tag || 'untagged')).size, exposed: wls.filter(w => w.exposed).length };
  const noun = cloud ? (VPC_NOUN[cloud] || ['VPC', 'VPCs'])[1] : 'VPCs & VNets';
  const T = (l, v) => ({ key: l, l, v: Number(v || 0).toLocaleString('en-US') });
  const tiles = {
    root: [T('Clouds', counts.clouds), T('Regions', counts.regions), T(noun, counts.vpcs), T('Apps', counts.apps)],
    cloud: [T('Regions', counts.regions), T(noun, counts.vpcs), T('Apps', counts.apps), T('Workloads', counts.workloads)],
    region: [T(noun, counts.vpcs), T('Subnets', counts.subnets), T('Apps', counts.apps), T('Workloads', counts.workloads)],
    vpc: [T('Subnets', counts.subnets), T('Workloads', counts.workloads), T('Apps', counts.apps), T('Exposed', counts.exposed)],
    subnet: [T('Workloads', counts.workloads), T('Exposed', counts.exposed), T('Apps', counts.apps), { key: 'AZ', l: 'Zone', v: (subnets[0] && subnets[0].sn.az) || '' }],
  }[level];
  const regionOf = (name) => (est.regionsList || []).find(r => r.region === name) || { priv: false };
  const modeOf = (x) => (x.v.priv ? connModeOf(regionOf(x.r.region)) : 'internet');
  const n = Object.fromEntries(MIX_ORDER.map(m => [m, 0])); vpcs.forEach(x => { n[modeOf(x)] += 1; });
  const total = vpcs.length || 1;
  const mix = MIX_ORDER.map(mode => ({ key: mode, mode, n: n[mode], label: CONN_LABEL[mode].short, title: `${CONN_LABEL[mode].long} · ${n[mode]} ${n[mode] === 1 ? 'VPC' : 'VPCs'}`, pct: +(n[mode] / total * 100).toFixed(1), ink: MIX_INK[mode] }));
  const sitesBy = (m) => (est.sites || []).filter(x => siteModeOf(x) === m).reduce((a, x) => a + S.countOf(x.name), 0);
  const ip = sitesBy('ipsec'), sd = sitesBy('sdwan');
  const siteLine = `${ip.toLocaleString('en-US')} IPsec ${ip === 1 ? 'site' : 'sites'} · ${sd.toLocaleString('en-US')} SD-WAN ${sd === 1 ? 'site' : 'sites'}`;
  return { level, counts, tiles, mix, siteLine, noun };
}

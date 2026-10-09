/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-policy-model.js — the policy engine, honest (2026-10-09, Micah: "The Policy Engine needs real help - do
// best-practices research on it - we need a robust policy engine per layer. right now, it's a bit too simple yet
// convoluted."). Slice 1 of the research plan, and pure:
//
//   One matcher. A policy's sides are read by Govern's own matcher (GV.members, GV.regionGlob), so a residency
//   rule `region eu-*` reaches westeurope and europe-west1 in the engine as it already did in Govern.
//   One intent catalog. Every phrase an estate, the composer or the journey writes resolves to a typed intent.
//   One evaluator per layer. A flow is read against the path it really takes (the site's access, whether the
//   region is attached privately, whether a tunnel rides the internet), and each layer is stamped:
//     holds          the layer does what the intent asks, with the reason
//     violated       the layer is on the path and breaks the intent, with a reason code
//     unenforceable  no AT&T enforcement point on that layer can express it (a third party's access or core)
//     undetermined   the estate has no data to say (segments, the region's way, encryption)
//     blocks         the layer that drops a denied flow
//     notonpath      the flow never crosses that layer (a public region skips the AT&T edge and core)
//   Precedence is the one sort (precedenceOf). The first matching policy decides the verdict unless a matching one
//   denies; a later match that demands nothing new Agrees, never "Overridden"; a staged policy (simulated or
//   authored) is read and never decides until it is enforced, unless the engine is asked what staging would do.
import * as GV from './naas-govern.js';
import { entersAtt, rampName } from './naas-things.js';
import { POLICY_LAYERS, ROUTE_RULES, ROUTE_SECTIONS, routeRulesOf, precedenceOf } from './naas-policy-layers.js';
import { INTENTS, intentOf, intentsOf, sameIntent, compilePolicy, actionOf, BASELINE, DEFAULTS, COMBINE, PEPS, POLICY_TIERS, publishErrors } from './naas-policy-compile.js';
import { regionWay } from './naas-ways.js';
// The catalog lives with the compile table since slice 2 (naas-policy-compile.js); the engine re-exports it.
export { INTENTS, intentOf, POLICY_TIERS, PEPS, DEFAULTS, COMBINE, publishErrors };

export const LAYER_KEYS = POLICY_LAYERS.map(l => l.key);
export const STAGED = new Set(['simulated', 'authored']);
const CLOUD_LABEL = /^(AWS|Azure|GCP|Oracle|CoreWeave) /;
export const pcLabel = (st) => `Private cloud · ${st.colo.provider} ${st.colo.facility}, ${st.metro}`;

const same = sameIntent;

/** A policy in the engine's terms: its sides, its typed intents, whether it denies routes, and whether it is staged. */
export function normalizePolicy(p) {
  const intents = intentsOf(p);
  const rt = routeRulesOf(p), v = rt['deny:matching-routes'] || {};
  return { name: p.name || p.match, a: p.match || '', b: p.scope || 'any cloud', intents, denies: !!(v.o2p || v.p2o) || actionOf(p) === 'deny',
    // A sheet of its own: the routes an intent implies are the intent's, so they never stop a later one agreeing.
    routes: !!p.route && Object.values(p.route).some(x => x && (x.o2p || x.p2o)), state: p.state || 'enforced', staged: STAGED.has(p.state), p };
}
const forbids = (n) => n.intents.some(i => i.forbids);
const speaksInternet = (n) => n.intents.some(i => i.forbids || ['inspect', 'egress', 'allow-list'].includes(i.key));

// ---- Matching: Govern's matcher, read for one flow ----
/** The site a flow starts from (a site's name, or a private cloud's label) and the region it goes to. */
export function resolveFlow(est, f) {
  const sites = est.sites || [];
  const site = sites.find(st => st.name === f.from) || sites.find(st => st.colo && st.colo.kind === 'Private cloud' && pcLabel(st) === f.from) || null;
  const region = (est.regionsList || []).find(r => `${r.cloud} ${r.region}` === f.to) || null;
  return { site, region, internet: f.to === 'the Internet' };
}
/** Whether a policy matches a flow, and if not, the side that missed: Tag, From or To. */
export function matchFlow(est, n, f, ctx = {}) {
  const m = n.a, toRegion = CLOUD_LABEL.test(f.to) ? f.to.split(' ').slice(1).join(' ') : null;
  let a = false, missA = 'From', x;
  if (m === f.from) a = true;
  else if ((x = /^tag\s+(.+)$/i.exec(m))) {
    missA = 'Tag';
    if (GV.tagKey(x[1]) === 'remotesite') a = !!ctx.site && ctx.site.cls === 'Branch';
    else a = !!f.tag && GV.tagKey(x[1]) === GV.tagKey(f.tag);
  } else if ((x = /^region\s+(.+)$/i.exec(m))) { missA = 'To'; a = !!toRegion && GV.regionGlob(x[1]).test(toRegion); }
  else if (/^(remote-site|branch|site)\s+/i.test(m)) {
    const rows = (GV.members(est, ctx.inv || [], n.p, ctx.opts) || {}).rows || [];
    a = !!ctx.site && rows.some(st => st.name === ctx.site.name);
  }
  const sc = n.b;
  const b = sc === f.to || (sc === 'any cloud' && (CLOUD_LABEL.test(f.to) || (f.to === 'the Internet' && speaksInternet(n)))) || (sc === 'the Internet' && f.to === 'the Internet');
  return { ok: a && b, missed: !a && !b ? `${missA} and To` : !a ? missA : !b ? 'To' : '' };
}

// ---- The path a flow really takes, and what each intent finds on each layer ----
function pathFacts(est, f, inv) {
  const { site, region, internet } = resolveFlow(est, f);
  const third = !!site && site.core === 'third';
  const thirdAccess = !!site && (site.accessSla === 'third' || third);
  const tunnelPublic = !!site && !site.priv && !!site.tunnel;
  const onAtt = !!site && entersAtt(site);
  // The AT&T edge and core carry the flow only on a private attachment the site reaches without a public tunnel.
  const crosses = !internet && !!region && !!region.priv && onAtt && !tunnelPublic;
  const wl = region ? GV.workloadsOf(inv).filter(r => r.cloud === region.cloud && r.region === region.region && (!f.tag || GV.tagKey(r.w.tag || 'untagged') === GV.tagKey(f.tag))) : [];
  // What sits at the region's AT&T edge (slice 2): the estate stamps it (est0 in the app), or it is read from the ramp.
  const way = region ? (region.way !== undefined ? region.way : regionWay(region).cls) : null;
  return { site, region, internet, third, thirdAccess, tunnelPublic, onAtt, crosses, wl, way, carrier: site && (site.carrier || site.viaRamp) };
}
/** Whether a layer is on the flow's path at all: AT&T's edge and core only on a NetBond or hosted way (the cloud's own
 *  port or a third party's fabric is no AT&T edge or core, 2026-10-09 review). */
const PRIVATE_WAY = new Set(['netbond', 'hosted']);
const onPath = (k, x) => k === 'site' ? true : k === 'cloud' ? !x.internet : x.crosses && !x.third && PRIVATE_WAY.has(x.way);
const H = (code, text) => ({ stamp: 'holds', code, text });
const V = (code, text) => ({ stamp: 'violated', code, text });
const U = (code, text) => ({ stamp: 'unenforceable', code, text });
const Q = (text) => ({ stamp: 'undetermined', code: 'NO_DATA', text });
function siteAssess(x) {
  if (!x.site) return Q('Site unknown');
  if (x.tunnelPublic) return V('SITE_TUNNEL_PUBLIC', `${x.site.tunnel} on internet`);
  if (!x.onAtt) return U('SITE_NO_ATT_PEP', 'Not on AT&T');
  if (x.thirdAccess) return U('SITE_NO_ATT_PEP', `${x.carrier || 'Third-party'} access`);
  return x.site.priv ? H('SITE_PRIVATE', 'Private access') : H('SITE_ON_ATT', 'AT&T access');
}
function cloudAssess(x) {
  if (!x.region.priv) return V('CLOUD_PUBLIC_EXIT', 'Public attach');
  const pub = x.wl.filter(r => !r.vpc.priv).length, exp = x.wl.filter(r => r.w.exposed).length;
  if (pub) return V('CLOUD_PUBLIC_EXIT', `${pub} public`);
  if (exp) return V('CLOUD_EXPOSED', `${exp} exposed`);
  return H('CLOUD_PRIVATE', 'Private subnets');
}
function coreAssess(x) {
  if (!x.region.priv) return V('CORE_NOT_ON_PATH', 'Public internet');
  if (x.tunnelPublic) return V('CORE_NOT_ON_PATH', 'Tunnel, not core');
  if (x.third) return U('CORE_THIRD_PARTY', `${x.carrier || 'Third-party'} core`);
  if (!x.onAtt) return Q('Route unknown');
  if (x.way && !PRIVATE_WAY.has(x.way)) return U('CORE_NO_ATT_PEP', `${rampName(x.region)} direct`);
  return H('CORE_PRIVATE', 'AT&T core');
}
function edgeAssess(x) {
  if (!x.region.priv || x.tunnelPublic || !x.onAtt) return V('EDGE_NOT_ON_PATH', 'No on-ramp');
  if (x.third) return U('EDGE_THIRD_PARTY', `${x.carrier || 'Third-party'} edge`);
  return H('EDGE_ONRAMP', `${rampName(x.region)}`);
}
/** What one intent finds on one layer of one flow; null where the intent says nothing there. */
export function assess(it, k, x) {
  if (!it.layers.includes(k) && !(x.internet && it.forbids && k === 'site')) return null;
  if (x.internet) {
    // To the Internet: a forbidding intent is enforced where the site would break out (the walk below stamps the block);
    // a site AT&T does not reach has no enforcement point, so nothing can block it there.
    if (it.forbids) return k === 'site' && !(x.site && x.onAtt && !x.thirdAccess) ? U('SITE_NO_ATT_PEP', 'Not on AT&T') : null;
    if (it.key === 'no-breakout') return k === 'site' ? (x.site && x.onAtt && !x.thirdAccess ? H('SITE_NO_BREAKOUT', 'No breakout') : U('SITE_NO_ATT_PEP', 'Not on AT&T')) : null;
    if (it.key === 'inspect') return V('EDGE_NOT_INSPECTED', 'Not inspected');
    return k === 'cloud' ? null : Q('No data');
  }
  if (!x.region) return Q('Region unknown');
  switch (it.key) {
    case 'private': return k === 'site' ? siteAssess(x) : k === 'edge' ? edgeAssess(x) : k === 'core' ? coreAssess(x) : cloudAssess(x);
    case 'no-internet': return k === 'site' ? siteAssess(x) : k === 'core' ? coreAssess(x) : cloudAssess(x);
    case 'no-breakout': return siteAssess(x);
    case 'inspect':
      if (!x.crosses) return V('EDGE_NOT_INSPECTED', 'Not inspected');
      // Only the vSRX in AT&T's hosted hub inspects. NetBond tags CVs and cannot; the cloud's own port or a third party's
      // fabric is no AT&T enforcement point at all. A way nobody stated reads Undetermined.
      return x.way === 'hosted' ? H('EDGE_INSPECTED', 'vSRX in path') : x.way === 'netbond' ? U('EDGE_NO_FW', 'NetBond only')
        : x.way === 'direct' ? U('EDGE_NO_ATT_PEP', `${rampName(x.region)} port`) : x.way === 'third' ? U('EDGE_THIRD_PARTY', rampName(x.region)) : Q('Way unknown');
    case 'slo': { if (it.param == null) return Q('No target');
      const ms = x.crosses ? x.region.fab : x.region.pub;
      return ms == null ? Q('Not measured') : ms <= it.param ? H('SLA_MET', `${ms} ms`) : V('SLA_UNMET', `${ms} ms > ${it.param}`); }
    case 'two-paths': return !x.crosses ? V('EDGE_NOT_ON_PATH', 'No on-ramp') : (x.region.paths || 1) >= 2 ? H('EDGE_TWO_PATHS', 'Two paths') : V('EDGE_SINGLE_PATH', 'One path');
    case 'segment': return Q('No segments');
    default: return Q('No data');
  }
}
const SEVERITY = { violated: 5, unenforceable: 4, undetermined: 3, holds: 2 };

// ---- The precedence walk, per layer (slice 2) ----
// At each layer a flow crosses, the rows its counted policies compile to (plus AT&T's baseline) are read top to bottom:
// tier, then priority, then a deny before an allow, then the order written. The first row that decides ends the layer
// (Deny, Allow, Always); Pass hands the rest of its tier down; a row that only shapes or obliges (a CV tag, a class of
// service, blocking a default route) rides on whatever decides. Nothing decided means the layer's default, and a default
// that would deny is in Audit, so it never flips a verdict. Across layers, the first that denies, in path order, drops it.
const LAYER_ORDER = { o2p: ['site', 'edge', 'core', 'cloud'], p2o: ['cloud', 'core', 'edge', 'site'] };
const DENY_CODE = { cpe: 'SITE_BREAKOUT_BLOCKED', netbond: 'EDGE_ROUTE_DENIED', vsrx: 'EDGE_FW_DENY', vrf: 'CORE_VRF_ISOLATED', cos: 'CORE_VRF_ISOLATED', rt: 'CLOUD_NO_ROUTE', sg: 'CLOUD_SG_NO_MATCH' };
const DENY_TEXT = { cpe: 'No breakout', netbond: 'Routes denied', vsrx: 'Firewall denies', vrf: 'VRF isolated', cos: 'VRF isolated', rt: 'No route', sg: 'Not allowed' };
const tierNum = (k) => (POLICY_TIERS.find(t => t.key === k) || POLICY_TIERS[1]).n;
/** Whether a row's enforcement point is on this flow's path. */
export function pepOnPath(pep, x) {
  switch (pep) {
    case 'cpe': return !!x.site && x.onAtt && !x.thirdAccess;
    case 'netbond': return x.crosses && !x.third && x.way === 'netbond';
    case 'onramp': return x.crosses && !x.third && x.way === 'hosted';
    case 'vsrx': return x.crosses && !x.third && x.way === 'hosted';
    case 'vrf': case 'cos': return x.crosses && !x.third && PRIVATE_WAY.has(x.way);
    default: return !x.internet && !!x.region;
  }
}
const toMatches = (r, x) => r.to === 'any' || (x.internet ? r.to === 'internet' : r.to === 'cloud');
// A NetBond row's direction is its routes', and a route row governs the session both ways (naas-policy-compile.js).
const dirMatches = (r, dir) => r.pep === 'netbond' || r.dir === 'both' || r.dir === dir;
/** A policy's rows as the walk reads them: a stated action (Pass, Always, Deny) recasts every row it compiles to. */
function rowsOf(p) {
  const act = actionOf(p);
  return compilePolicy(p, ROUTE_RULES).map(r => act === 'pass' ? { ...r, verb: 'pass', ends: false } : act === 'always' ? { ...r, verb: 'always', ends: true } : act === 'deny' ? { ...r, verb: 'deny', ends: true } : r);
}
const baselineRows = () => BASELINE.flatMap(b => b.rows.map((r, ri) => ({ r: { ...r, layer: PEPS[r.pep].layer }, n: { name: b.name, baseline: true }, tier: b.tier, priority: b.priority, pi: 1e6, ri })));
function walkLayer(key, counted, x, dir) {
  const cs = [];
  counted.forEach((n, pi) => rowsOf(n.p).forEach((r, ri) => cs.push({ r, n, tier: n.tier, priority: n.priority, pi, ri })));
  cs.push(...baselineRows());
  // On a hosted way the hub's on-ramp carries a private path's matching routes in NetBond's place.
  const here = (r) => pepOnPath(r.pep, x) || (r.pep === 'netbond' && r.intent === 'private' && pepOnPath('onramp', x));
  const on = cs.filter(c => c.r.layer === key && toMatches(c.r, x) && dirMatches(c.r, dir) && here(c.r))
    .sort((a, b) => tierNum(a.tier) - tierNum(b.tier) || a.priority - b.priority || ((b.r.verb === 'deny') - (a.r.verb === 'deny')) || a.pi - b.pi || a.ri - b.ri);
  const obligations = []; let skip = -1, decided = null;
  for (const c of on) {
    if (tierNum(c.tier) <= skip) continue;
    if (c.r.verb === 'pass') { skip = tierNum(c.tier); continue; }
    if (!c.r.ends) { obligations.push(c); continue; }
    if (!decided) decided = c;
  }
  return { decided, obligations: decided && decided.r.verb === 'deny' ? [] : obligations };
}
const ruleOf = (w, key, x, dir) => {
  if (w.decided) { const c = w.decided, T = POLICY_TIERS.find(t => t.key === c.tier) || POLICY_TIERS[1];
    return { byDefault: false, tier: c.tier, tierLabel: T.label, priority: c.priority, verb: c.r.verb, text: c.r.text, pep: c.r.pep, policy: c.n.name, baseline: !!c.n.baseline }; }
  if (!onPath(key, x)) return null;
  const d = DEFAULTS[key][dir];
  return { byDefault: true, tier: '', tierLabel: 'Default', priority: null, verb: d.verb, text: d.text, audit: !!d.audit, policy: '' };
};

// ---- The decision: one record per flow ----
/** The engine for one flow. `opts.staged` reads staged policies as if enforced; `opts.inv` the inventory; `opts.dir`
 *  the direction ('o2p' site to cloud, the default; 'p2o' cloud to site). */
export function decide(est, policies, flow, opts = {}) {
  const inv = opts.inv || [], live = (policies || []).filter(p => p.state !== 'draft'), dir = opts.dir === 'p2o' ? 'p2o' : 'o2p';
  const x = pathFacts(est, flow, inv), ctx = { site: x.site, inv, opts: opts.match };
  const ordered = precedenceOf(live).map(({ p, tier, priority }) => ({ ...normalizePolicy(p), tier, priority }));
  const rungs = [], counted = [];
  for (const n of ordered) {
    const m = matchFlow(est, n, flow, ctx);
    if (!m.ok) { rungs.push({ name: n.name, n, state: 'skip', missed: m.missed }); continue; }
    const counts = !n.staged || !!opts.staged;
    // Agrees: a later match that asks nothing the earlier ones do not (and pushes no routes of its own).
    const earlier = (it) => counted.find(c => c.intents.some(y => same(y, it)));
    const agrees = n.intents.length > 0 && !n.denies && !n.routes && n.intents.every(earlier);
    const rel = agrees ? { rel: 'agrees', with: earlier(n.intents[0]).name } : { rel: 'adds' };
    if (counts) counted.push(n);
    rungs.push({ name: n.name, n, state: counts ? rel.rel : 'staged', ...rel });
  }
  // Each layer walks its rows; the first layer in path order whose deciding row denies drops the flow.
  const walks = Object.fromEntries(POLICY_LAYERS.map(l => [l.key, walkLayer(l.key, counted, x, dir)]));
  const blockAt = LAYER_ORDER[dir].find(k => walks[k].decided && walks[k].decided.r.verb === 'deny') || null;
  const blockRow = blockAt ? walks[blockAt].decided : null;
  const verdict = blockRow ? 'Denied' : 'Allowed';
  // The decider: the policy that dropped it; else the first in precedence that matches (each layer's own deciding row is
  // on that layer's rule), passing over a route deny that dropped nothing because its connection is not on the path.
  const decider = (blockRow && !blockRow.n.baseline ? blockRow.n : null) || counted.find(n => !(n.denies && !n.intents.length)) || counted[0] || null;
  for (const r of rungs) if (decider && r.name === decider.name) r.state = 'decides';
  // Each layer: the worst any counted intent finds there, and the policy that asks it; the blocking layer says so.
  const layers = POLICY_LAYERS.map(l => {
    let best = null;
    for (const n of counted) for (const it of n.intents) {
      const a = assess(it, l.key, x); if (!a) continue;
      const rank = SEVERITY[a.stamp] || 0;
      if (!best || rank > best.rank) best = { ...a, rank, by: n.name, intent: it };
    }
    if (blockAt === l.key) best = { stamp: 'blocks', code: DENY_CODE[blockRow.r.pep], text: DENY_TEXT[blockRow.r.pep], rank: 9, by: blockRow.n.name, intent: null };
    const rule = ruleOf(walks[l.key], l.key, x, dir), obligations = walks[l.key].obligations.map(c => ({ verb: c.r.verb, text: c.r.text, pep: c.r.pep, policy: c.n.name }));
    if (best) return { key: l.key, label: l.label, stamp: best.stamp, code: best.code, text: best.text, by: best.by, intent: best.intent ? best.intent.word : '', rule, obligations };
    return onPath(l.key, x) ? { key: l.key, label: l.label, stamp: 'any', code: '', text: 'Any', by: '', intent: '', rule, obligations }
      : { key: l.key, label: l.label, stamp: 'notonpath', code: 'NOT_ON_PATH', text: 'Not on path', by: '', intent: '', rule, obligations };
  });
  const has = (s) => layers.some(l => l.stamp === s);
  const compliance = has('violated') ? 'Violated' : has('unenforceable') ? 'Unenforceable' : has('undetermined') ? 'Undetermined' : (has('holds') || has('blocks')) ? 'Holds' : 'None';
  // The class: whether any workload is there to carry it (a flow no workload makes is a what-if). A tag the journey had you
  // apply to a region's workloads (estateFor keeps the region's own tags as baseTags) makes its class real too.
  const applied = x.region && x.region.baseTags ? (x.region.tags || []).filter(tg => !x.region.baseTags.includes(tg)) : [];
  const empty = !x.internet && (!x.region || (!x.wl.length && !(flow.tag && applied.some(tg => GV.tagKey(tg) === GV.tagKey(flow.tag)))));
  return { flow, dir, verdict, decidedBy: decider ? decider.name : '', blocker: blockAt, compliance, layers, rungs, empty,
    path: { crosses: x.crosses, internet: x.internet, way: x.way, netbond: pepOnPath('netbond', x) } };
}

/** The flows the engine checks: every private cloud and data center against every region and the Internet, plain or carrying a policy's tag. */
export function engineFlows(est, policies = []) {
  const sites = est.sites || [];
  const froms = [...sites.filter(st => st.colo && st.colo.kind === 'Private cloud').map(pcLabel),
    ...sites.filter(st => /\bDC\b|data cent/i.test(st.name) && !(st.colo && st.colo.kind === 'Private cloud')).map(st => st.name)];
  const tags = [...new Set(policies.map(p => p.match || '').filter(m => /^tag /.test(m)).map(m => m.slice(4)))];
  const tos = [...(est.regionsList || []).map(r => `${r.cloud} ${r.region}`), 'the Internet'];
  const out = [];
  for (const from of froms) for (const to of tos) for (const tag of ['', ...tags]) out.push({ from, to, tag });
  return out;
}

/** A policy that matches nothing in the estate today: its tag, region pattern or site group names no one, or its asset is gone. */
export function deadPolicies(est, inv, policies = [], opts = {}) {
  const sites = est.sites || [], labels = new Set([...sites.map(st => st.name), ...sites.filter(st => st.colo && st.colo.kind === 'Private cloud').map(pcLabel)]);
  const regions = new Set((est.regionsList || []).map(r => `${r.cloud} ${r.region}`));
  return policies.filter(p => p.state !== 'draft').map(p => {
    const m = String(p.match || ''), sc = p.scope || 'any cloud';
    if (/^(tag|region|remote-site|branch|site)\s+/i.test(m)) {
      const rows = (GV.members(est, inv, p, opts) || {}).rows;
      if (!rows || !rows.length) return { name: p.name, why: /^tag /i.test(m) ? `no workload is tagged ${m.slice(4)}` : /^region /i.test(m) ? `no region matches ${m.slice(7)}` : `no site is in ${m.replace(/^\S+\s+/, '')}` };
    } else if (!labels.has(m)) return { name: p.name, why: `${m} is not in this estate` };
    if (CLOUD_LABEL.test(sc) && !regions.has(sc)) return { name: p.name, why: `${sc} is not in this estate` };
    return null;
  }).filter(Boolean);
}

/** The estate at a glance: every flow decided once (memoised per estate object, policy set and mode). */
const SWEEPS = new WeakMap();
export function sweep(est, policies = [], opts = {}) {
  const key = `${(policies || []).map(p => `${p.name}:${p.state}:${p.match}:${p.scope}:${p.req}:${(p.path || []).join('+')}:${p.priority ?? ''}`).join('|')}|${opts.staged ? 1 : 0}|${JSON.stringify(opts.match || {})}`;
  let per = SWEEPS.get(est); if (!per) { per = new Map(); SWEEPS.set(est, per); }
  if (per.has(key)) return per.get(key);
  const flows = engineFlows(est, policies), rows = flows.map(f => ({ f, d: decide(est, policies, f, opts) }));
  // A policy is violated where it decides or adds to a real class (workloads there) and some layer it asks is violated.
  const violated = new Map();
  for (const { f, d } of rows) {
    if (d.empty) continue;
    for (const l of d.layers) if (l.stamp === 'violated' && l.by) {
      const v = violated.get(l.by) || { name: l.by, codes: new Set(), layers: new Set(), flows: 0, first: null };
      v.codes.add(l.code); v.layers.add(l.key); v.flows += 1; v.first = v.first || f; violated.set(l.by, v);
    }
  }
  const out = { rows, violated: [...violated.values()].map(v => ({ ...v, codes: [...v.codes], layers: [...v.layers] })), dead: deadPolicies(est, opts.inv || [], policies, opts.match) };
  per.set(key, out);
  return out;
}

/** NetBond Advanced's Configure > Policies sheet, read for one flow: every rule, per direction, on when a counted policy
 *  that matches the flow pushes it (or NetBond's own baseline does), naming the first in precedence. A flow that never
 *  crosses a NetBond connection (the Internet, a public region, the cloud's own port, a hosted hub) pushes nothing: NetBond
 *  shows no Internet route rules. `can` is the direction NetBond offers. */
export function flowSheet(est, policies, flow, opts = {}) {
  const d = decide(est, policies, flow, opts);
  const hits = d.path.netbond ? [...d.rungs.filter(r => ['decides', 'adds', 'agrees'].includes(r.state)).map(r => r.n.p),
    ...BASELINE.map(b => ({ name: b.name, route: Object.assign({}, ...b.rows.map(r => r.nb || {})) }))] : [];
  return ROUTE_SECTIONS.map(([sk, sl]) => ({ key: sk, label: sl, rules: ROUTE_RULES.filter(r => r.section === sk).map(r => {
    const k = `${sk}:${r.id}`;
    const dir = (dd) => { const by = hits.find(p => (routeRulesOf(p)[k] || {})[dd]); return { on: !!by, by: by ? by.name : '' }; };
    return { key: k, id: r.id, label: r.label, nb: r.nb, can: { o2p: r.o2p, p2o: r.p2o }, o2p: dir('o2p'), p2o: dir('p2o') }; }) }));
}

/** Policies that match flows and never ask anything an earlier one does not (always Agrees): redundant, with the one they echo. */
export function redundantPolicies(est, policies, opts = {}) {
  const seen = {};
  for (const { d } of sweep(est, policies, opts).rows) for (const r of d.rungs) {
    if (!['decides', 'adds', 'agrees'].includes(r.state)) continue;
    const s = seen[r.name] = seen[r.name] || { own: 0, with: {} };
    if (r.state === 'agrees') s.with[r.with] = (s.with[r.with] || 0) + 1; else s.own += 1;
  }
  return Object.entries(seen).filter(([, s]) => !s.own).map(([name, s]) => ({ name, with: Object.entries(s.with).sort((a, b) => b[1] - a[1])[0][0] }));
}

// ---- The rulebase: every policy compiled to every layer (slice 2, the Layers tab) ----
// Four columns in the path's order, each row a policy's compiled rule on that layer's enforcement point, in precedence
// order (tier, priority, deny first, the order written), each column ending in its default per direction. A row says
// whether its enforcement point is really there for the regions the policy reaches: enforced, unenforceable (no such
// point on any of them), not on the path (every region it reaches rides the internet), asserted (a customer VPC AT&T
// only reads), or dead (the policy matches nothing).
export function rulebase(est, policies = [], opts = {}) {
  const inv = opts.inv || [], live = (policies || []).filter(p => p.state !== 'draft');
  const dead = new Map(deadPolicies(est, inv, live, opts.match).map(d => [d.name, d.why]));
  const regions = (est.regionsList || []).map(r => ({ r, label: `${r.cloud} ${r.region}`, way: r.way !== undefined ? r.way : regionWay(r).cls }));
  const sites = est.sites || [], capSites = sites.filter(st => entersAtt(st) && st.accessSla !== 'third' && st.core !== 'third');
  const hostedAny = regions.some(g => g.way === 'hosted');
  // The sites a policy's source side names: one site or private cloud, a site group, or (a tag, a region pattern) any.
  const labelOf = (st) => (st.colo && st.colo.kind === 'Private cloud' ? pcLabel(st) : st.name);
  const sourcesOf = (p) => { const m = String(p.match || '');
    const one = sites.filter(st => st.name === m || labelOf(st) === m); if (one.length) return one;
    if (/^(remote-site|branch|site)\s+/i.test(m)) return ((GV.members(est, inv, p, opts.match) || {}).rows || []).filter(st => st && st.name);
    return sites; };
  const isCap = (st) => entersAtt(st) && st.accessSla !== 'third' && st.core !== 'third';
  const crossesAtt = (st) => entersAtt(st) && st.core !== 'third' && !(!st.priv && st.tunnel);
  // The regions a policy reaches: the one it names, the ones its pattern matches, the ones holding its tag's workloads.
  const reachOf = (p) => {
    const sc = p.scope || 'any cloud', m = String(p.match || ''); let x;
    if (CLOUD_LABEL.test(sc)) return regions.filter(g => g.label === sc);
    if (sc === 'the Internet' || sc === 'the WAN') return [];
    if ((x = /^region\s+(.+)$/i.exec(m))) { const re = GV.regionGlob(x[1]); return regions.filter(g => re.test(g.r.region)); }
    if ((x = /^tag\s+(.+)$/i.exec(m)) && GV.tagKey(x[1]) !== 'remotesite') { const on = new Set(GV.tagSet(inv, x[1]).regions.map(v => `${v.cloud} ${v.region}`)); return regions.filter(g => on.has(g.label)); }
    return regions;
  };
  const n = (k, xs) => `${xs.length} ${xs.length === 1 ? k : k + 's'}`;
  const capOf = (row, p, reach) => {
    if (dead.has(p.name)) return { cap: 'dead', why: `Matches nothing today: ${dead.get(p.name)}` };
    const priv = reach.filter(g => g.r.priv), src = p.baseline ? sites : sourcesOf(p);
    // Sources AT&T cannot carry (a third party's access or core) leave every AT&T point off their path.
    if (row.pep !== 'cpe' && row.layer !== 'cloud' && src.length && !src.some(crossesAtt)) return { cap: 'unenforceable', why: 'Its sites reach the cloud over a third party or the internet' };
    switch (row.pep) {
      case 'cpe': { const on = src.filter(isCap);
        return !src.length ? { cap: 'undetermined', why: 'No sites on record' } : on.length ? { cap: 'ok', why: `${on.length} of ${src.length} of its site rows enter AT&T on AT&T access` }
          : { cap: 'unenforceable', why: 'None of its sites enters AT&T on AT&T access' }; }
      case 'netbond': { const on = reach.filter(g => g.way === 'netbond' || (g.way === 'hosted' && row.intent === 'private'));
        return on.length ? { cap: 'ok', why: `On NetBond, or the hosted hub's on-ramp, for ${on.map(g => g.label).join(', ')}` } : priv.length ? { cap: 'unenforceable', why: `None of its ${n('region', priv)} rides NetBond` }
          : { cap: 'notonpath', why: reach.length ? 'Every region it reaches rides the internet' : 'It reaches no attached region' }; }
      case 'vsrx': { const on = row.to === 'internet' ? regions.filter(g => g.way === 'hosted') : reach.filter(g => g.way === 'hosted');
        return on.length ? { cap: 'ok', why: `The vSRX for ${on.map(g => g.label).join(', ')}` } : (priv.length || row.to === 'internet') ? { cap: 'unenforceable', why: hostedAny ? 'Its regions have no hosted hub' : 'No hosted hub on record' }
          : { cap: 'notonpath', why: 'Every region it reaches rides the internet' }; }
      case 'vrf': case 'cos': { const on = priv.filter(g => PRIVATE_WAY.has(g.way));
        return on.length ? { cap: 'ok', why: `Your VRF to ${on.map(g => g.label).join(', ')}` } : priv.length ? { cap: 'unenforceable', why: "Its regions are the cloud's own port or a third party's" }
          : { cap: 'notonpath', why: 'Every region it reaches rides the internet' }; }
      default: { const on = reach.filter(g => g.way === 'hosted');
        return on.length ? { cap: 'ok', why: `AT&T writes the hosted VPC in ${on.map(g => g.label).join(', ')}` } : { cap: 'asserted', why: "A customer VPC: AT&T reads it from discovery and never writes it" }; }
    }
  };
  const cols = POLICY_LAYERS.map(l => ({ key: l.key, label: l.label, combine: COMBINE[l.key], defaults: DEFAULTS[l.key], rows: [],
    peps: Object.entries(PEPS).filter(([, v]) => v.layer === l.key).map(([k, v]) => ({ key: k, ...v })) }));
  const at = Object.fromEntries(cols.map(c => [c.key, c]));
  precedenceOf(live).forEach(({ p, tier, priority, i }, pi) => {
    const reach = reachOf(p), act = actionOf(p);
    rowsOf(p).forEach((r, ri) => { const c = capOf(r, p, reach);
      at[r.layer].rows.push({ id: `${p.name}#${i}:${r.layer}:${ri}`, pid: `${p.name}#${i}`, name: p.name, match: p.match || '', scope: p.scope || 'any cloud', tier, priority, ...r,
        state: p.state || 'enforced', staged: STAGED.has(p.state), action: act, cap: c.cap, why: c.why, pi, ri }); });
  });
  for (const b of BASELINE) b.rows.forEach((r, ri) => { const reach = regions.filter(g => g.r.priv), c = capOf({ ...r, layer: PEPS[r.pep].layer }, { name: b.name, baseline: true }, reach);
    at[PEPS[r.pep].layer].rows.push({ id: `${b.name}:${ri}`, pid: b.name, name: b.name, match: 'any site', scope: 'any cloud', tier: b.tier, priority: b.priority, ...r, layer: PEPS[r.pep].layer,
      state: 'enforced', staged: false, baseline: true, cap: c.cap, why: c.why, pi: 1e6, ri }); });
  for (const c of cols) c.rows.sort((a, b) => tierNum(a.tier) - tierNum(b.tier) || a.priority - b.priority || ((b.verb === 'deny') - (a.verb === 'deny')) || a.pi - b.pi || a.ri - b.ri);
  const all = cols.flatMap(c => c.rows);
  return { cols, errors: publishErrors(live), counts: { rows: all.length, unenforceable: all.filter(r => r.cap === 'unenforceable').length, asserted: all.filter(r => r.cap === 'asserted').length,
    dead: new Set(all.filter(r => r.cap === 'dead').map(r => r.pid)).size, staged: new Set(all.filter(r => r.staged).map(r => r.pid)).size }, ways: regions.map(g => ({ label: g.label, way: g.way })) };
}

// ---- Words and glyphs for the screen ----
export const STAMP = {
  holds: { icon: 'check-circle', word: 'Holds', ps: 'set' },
  violated: { icon: 'close-circle', word: 'Violated', ps: 'broken' },
  blocks: { icon: 'stop-sign', word: 'Blocks', ps: 'down' },
  unenforceable: { icon: 'lock-off', word: 'Unenforceable', ps: 'risk' },
  undetermined: { icon: 'question-circle', word: 'Undetermined', ps: 'nodata' },
  notonpath: { icon: 'minus-circle', word: 'Not on path', ps: 'none' },
  any: { icon: '', word: 'Any', ps: 'any' },
};
export const RUNG = {
  decides: { icon: 'check-circle', word: 'Decides', ink: 'var(--link)' },
  adds: { icon: 'plus-circle', word: 'Adds', ink: 'var(--text-heading)' },
  agrees: { icon: 'merge', word: 'Agrees', ink: 'var(--text-light)' },
  staged: { icon: 'clock', word: 'Staged', ink: 'var(--text-light)' },
  skip: { icon: 'minus-circle', word: 'No match', ink: 'var(--text-disabled)' },
};
export const COMPLIANCE = {
  Holds: { icon: 'check-circle', word: 'Holds', ink: 'var(--link)' },
  Violated: { icon: 'close-circle', word: 'Violated', ink: 'var(--error)' },
  Unenforceable: { icon: 'lock-off', word: 'Unenforceable', ink: 'var(--warning)' },
  Undetermined: { icon: 'question-circle', word: 'Undetermined', ink: 'var(--text-light)' },
  None: { icon: 'minus-circle', word: 'Nothing asked', ink: 'var(--text-light)' },
};

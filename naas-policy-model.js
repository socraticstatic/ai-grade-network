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
import { POLICY_LAYERS, ROUTE_RULES, ROUTE_SECTIONS, routeRulesOf, layerOfReq, precedenceOf } from './naas-policy-layers.js';

export const LAYER_KEYS = POLICY_LAYERS.map(l => l.key);
export const STAGED = new Set(['simulated', 'authored']);
const CLOUD_LABEL = /^(AWS|Azure|GCP|Oracle|CoreWeave) /;
export const pcLabel = (st) => `Private cloud · ${st.colo.provider} ${st.colo.facility}, ${st.metro}`;

// ---- The intent catalog: every phrase in use, typed ----
// `forbids`: the intent keeps traffic off the public internet, so a flow to the Internet it matches is Denied.
// `layers`: the layers it asserts something on. Aliases are the strings the estates, the composer's path picks, the
// multi-layer templates and the journey's intent card write today.
export const INTENTS = [
  { key: 'private', word: 'Private path', icon: 'padlock', layers: ['site', 'edge', 'core', 'cloud'], forbids: true,
    alias: /private path|via the at&t network|never the internet|private on-ramp|private access only|regions on a private path/i },
  { key: 'no-internet', word: 'No direct internet', icon: 'restricted', layers: ['site', 'core', 'cloud'], forbids: true,
    alias: /no direct internet|no (local )?internet breakout/i },
  { key: 'egress', word: 'Egress via AT&T', icon: 'export', layers: ['core'], alias: /egress (only )?through at&t|internet egress only/i },
  { key: 'inspect', word: 'Inspected', icon: 'firewall', layers: ['edge'], alias: /inspect|ngfw|ids\/ips|web proxy|ddos|firewall/i },
  { key: 'segment', word: 'Segmented', icon: 'grid', layers: ['core'], alias: /segment/i },
  { key: 'slo', word: 'Latency SLO', icon: 'clock', layers: ['core'], alias: /latency slo\s*(\d+)/i, param: (m) => +m[1] },
  { key: 'two-paths', word: 'Two paths', icon: 'merge', layers: ['edge'], alias: /two paths|active\/active|fail over/i },
  { key: 'encrypt', word: 'Encrypted', icon: 'lock', layers: ['edge'], alias: /encrypt|decrypt/i },
  { key: 'zero-trust', word: 'Zero-trust access', icon: 'user-access', layers: ['site'], alias: /zero-trust/i },
  { key: 'allow-list', word: 'Allow-listed', icon: 'filter', layers: ['edge'], alias: /allow-list/i },
];
/** One phrase as a typed intent; a phrase the catalog does not know keeps its words on the layer it names. */
export function intentOf(phrase) {
  const ph = String(phrase || '').trim();
  for (const it of INTENTS) { const m = it.alias.exec(ph); if (m) return { key: it.key, word: it.word, icon: it.icon, layers: it.layers, forbids: !!it.forbids, param: it.param ? it.param(m) : null, text: ph }; }
  return { key: 'other:' + ph.toLowerCase(), word: ph, icon: 'check-shield', layers: [layerOfReq(ph)], forbids: false, param: null, text: ph };
}
const same = (a, b) => a.key === b.key && a.param === b.param;

/** A policy in the engine's terms: its sides, its typed intents, whether it denies routes, and whether it is staged. */
export function normalizePolicy(p) {
  const phrases = [...String(p.req || '').split(/\s+and\s+/i), ...(p.path || []), ...Object.values(p.layers || {})].map(x => String(x).trim()).filter(Boolean);
  const intents = [];
  for (const ph of phrases) { const it = intentOf(ph); if (!intents.some(x => same(x, it))) intents.push(it); }
  const rt = routeRulesOf(p), v = rt['deny:matching-routes'] || {};
  return { name: p.name || p.match, a: p.match || '', b: p.scope || 'any cloud', intents, denies: !!(v.o2p || v.p2o),
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
  return { site, region, internet, third, thirdAccess, tunnelPublic, onAtt, crosses, wl, carrier: site && (site.carrier || site.viaRamp) };
}
/** Whether a layer is on the flow's path at all. */
const onPath = (k, x) => k === 'site' ? true : k === 'cloud' ? !x.internet : x.crosses && !x.third;
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
    // To the Internet: a forbidding intent is enforced where the site would break out; nothing else is on the path.
    if (it.forbids) return k === 'site' ? (x.site && x.onAtt && !x.thirdAccess ? { stamp: 'blocks', code: 'SITE_BREAKOUT_BLOCKED', text: 'No breakout' } : U('SITE_NO_ATT_PEP', 'Not on AT&T')) : null;
    if (it.key === 'inspect') return V('EDGE_NOT_INSPECTED', 'Not inspected');
    return k === 'cloud' ? null : Q('No data');
  }
  if (!x.region) return Q('Region unknown');
  switch (it.key) {
    case 'private': return k === 'site' ? siteAssess(x) : k === 'edge' ? edgeAssess(x) : k === 'core' ? coreAssess(x) : cloudAssess(x);
    case 'no-internet': return k === 'site' ? siteAssess(x) : k === 'core' ? coreAssess(x) : cloudAssess(x);
    case 'inspect':
      if (!x.crosses) return V('EDGE_NOT_INSPECTED', 'Not inspected');
      // Whether the region's way puts a firewall in path (a hosted vSRX) is slice 2's data; until then, say so.
      return x.region.way === 'hosted' ? H('EDGE_INSPECTED', 'vSRX in path') : x.region.way === 'netbond' ? U('EDGE_NO_FW', 'NetBond only') : Q('Way unknown');
    case 'slo': { const ms = x.crosses ? x.region.fab : x.region.pub;
      return ms == null ? Q('Not measured') : ms <= it.param ? H('SLA_MET', `${ms} ms`) : V('SLA_UNMET', `${ms} ms > ${it.param}`); }
    case 'two-paths': return !x.crosses ? V('EDGE_NOT_ON_PATH', 'No on-ramp') : (x.region.paths || 1) >= 2 ? H('EDGE_TWO_PATHS', 'Two paths') : V('EDGE_SINGLE_PATH', 'One path');
    case 'segment': return Q('No segments');
    default: return Q('No data');
  }
}
const SEVERITY = { violated: 5, unenforceable: 4, undetermined: 3, holds: 2 };

// ---- The decision: one record per flow ----
/** The engine for one flow. `opts.staged` reads staged policies as if enforced; `opts.inv` the inventory. */
export function decide(est, policies, flow, opts = {}) {
  const inv = opts.inv || [], live = (policies || []).filter(p => p.state !== 'draft');
  const x = pathFacts(est, flow, inv), ctx = { site: x.site, inv, opts: opts.match };
  const ordered = precedenceOf(live).map(({ p }) => normalizePolicy(p));
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
  // The verdict: a matching deny wins; then an intent that forbids the internet, for a flow to it.
  const denier = counted.find(n => n.denies) || (x.internet ? counted.find(forbids) : null);
  const verdict = denier ? 'Denied' : 'Allowed';
  const decider = denier || counted[0] || null;
  for (const r of rungs) if (decider && r.name === decider.name) r.state = 'decides';
  // Each layer: the worst any counted intent finds there, and the policy that asks it.
  const layers = POLICY_LAYERS.map(l => {
    let best = null;
    for (const n of counted) for (const it of n.intents) {
      const a = assess(it, l.key, x); if (!a) continue;
      if (a.stamp === 'blocks' && !denier) continue;
      const rank = a.stamp === 'blocks' ? 9 : SEVERITY[a.stamp];
      if (!best || rank > best.rank) best = { ...a, rank, by: n.name, intent: it };
    }
    if (denier && denier.denies && l.key === 'edge') best = { stamp: 'blocks', code: 'EDGE_ROUTE_DENIED', text: 'Routes denied', rank: 9, by: denier.name, intent: null };
    if (best) return { key: l.key, label: l.label, stamp: best.stamp, code: best.code, text: best.text, by: best.by, intent: best.intent ? best.intent.word : '' };
    return onPath(l.key, x) ? { key: l.key, label: l.label, stamp: 'any', code: '', text: 'Any', by: '', intent: '' }
      : { key: l.key, label: l.label, stamp: 'notonpath', code: 'NOT_ON_PATH', text: 'Not on path', by: '', intent: '' };
  });
  const has = (s) => layers.some(l => l.stamp === s);
  const compliance = has('violated') ? 'Violated' : has('unenforceable') ? 'Unenforceable' : has('undetermined') ? 'Undetermined' : (has('holds') || has('blocks')) ? 'Holds' : 'None';
  // The class: whether any workload is there to carry it (a flow no workload makes is a what-if).
  const empty = !x.internet && (!x.region || !x.wl.length);
  return { flow, verdict, decidedBy: decider ? decider.name : '', compliance, layers, rungs, empty, path: { crosses: x.crosses, internet: x.internet } };
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
      const v = violated.get(l.by) || { name: l.by, codes: new Set(), flows: 0, first: null };
      v.codes.add(l.code); v.flows += 1; v.first = v.first || f; violated.set(l.by, v);
    }
  }
  const out = { rows, violated: [...violated.values()].map(v => ({ ...v, codes: [...v.codes] })), dead: deadPolicies(est, opts.inv || [], policies, opts.match) };
  per.set(key, out);
  return out;
}

/** NetBond Advanced's Configure > Policies sheet, read for one flow: every rule, per direction, on when a counted
 *  policy that matches the flow pushes it, naming the policy first in precedence. `can` is the direction NetBond offers. */
export function flowSheet(est, policies, flow, opts = {}) {
  const d = decide(est, policies, flow, opts);
  const hits = d.rungs.filter(r => ['decides', 'adds', 'agrees'].includes(r.state)).map(r => r.n.p);
  return ROUTE_SECTIONS.map(([sk, sl]) => ({ key: sk, label: sl, rules: ROUTE_RULES.filter(r => r.section === sk).map(r => {
    // A policy that forbids the internet allows its routes on the private path only: a flow to the Internet gets its deny alone.
    const k = `${sk}:${r.id}`, pushes = (p) => !(sk === 'allow' && flow.to === 'the Internet' && forbids(normalizePolicy(p)));
    const dir = (dd) => { const by = hits.find(p => pushes(p) && (routeRulesOf(p)[k] || {})[dd]); return { on: !!by, by: by ? by.name : '' }; };
    return { key: k, id: r.id, label: r.label, can: { o2p: r.o2p, p2o: r.p2o }, o2p: dir('o2p'), p2o: dir('p2o') }; }) }));
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

// ---- Words and glyphs for the screen ----
export const STAMP = {
  holds: { icon: 'check-circle', word: 'Holds', ps: 'set' },
  violated: { icon: 'close-circle', word: 'Violated', ps: 'broken' },
  blocks: { icon: 'stop-sign', word: 'Blocks', ps: 'down' },
  unenforceable: { icon: 'not-available', word: 'Unenforceable', ps: 'risk' },
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
  Unenforceable: { icon: 'not-available', word: 'Unenforceable', ink: 'var(--warning)' },
  Undetermined: { icon: 'question-circle', word: 'Undetermined', ink: 'var(--text-light)' },
  None: { icon: 'minus-circle', word: 'Nothing asked', ink: 'var(--text-light)' },
};

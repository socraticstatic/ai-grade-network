/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-policy-compile.js — an intent, written once, compiled to every layer's enforcement point (2026-10-09, slice 2
// of the policy engine research: "a robust policy engine per layer"). Pure data and functions, no estate: the engine
// (naas-policy-model.js) decides which of these rows a region's path really has.
//
//   Site   CPE or SD-WAN edge          local breakout, a VLAN per segment, DSCP and the app-aware path
//   Edge   NetBond route sheet         the rows NetBond Advanced shows (Configure > Policies), named as it names them
//          vSRX in AT&T's hosted hub   zone policy, IDP, send-to the internet (ours: NetBond's repo has no firewall model)
//   Core   your VRF, the CoS class     the region's route target, a VRF per segment, the SLA class
//   Cloud  route table, security group what AT&T can only assert on a customer VPC, and writes on a hosted one
//
// The NetBond mappings are corrected here: a private path allows the matching routes (the default-route block is
// NetBond's own baseline row, not the policy's); inspection needs the vSRX and only tags CVs on NetBond so the return
// path stays symmetric; egress advertises a static 0/0 On Premise → Partner (it was backwards); priority traffic pushes no
// route row (it is a class of service on the AT&T core, never a timed promise); two paths prefers by community, never by prepending.

// ---- The typed intent catalog: every phrase in use (estates, the composer, templates, the journey) ----
// `home`: the layer a phrase lands on when it stands alone (the composer's strip, Govern's broken cell). `layers`: where the engine checks the intent as an assertion on the path. `forbids`: the intent keeps traffic off the
// public internet, so a flow to the Internet it matches is Denied. Order matters: the first alias that matches types it.
export const INTENTS = [
  { key: 'private', home: 'core', word: 'Private path', icon: 'padlock', layers: ['site', 'edge', 'core', 'cloud'], forbids: true,
    alias: /private path|via the at&t network|never the internet|private on-ramp|private access only|regions on a private path/i },
  { key: 'no-internet', home: 'core', word: 'No direct internet', icon: 'restricted', layers: ['site', 'core', 'cloud'], forbids: true, alias: /no direct internet/i },
  // A site rule (the Internet-facing template's site slot): no breakout at the site, so internet traffic leaves through
  // AT&T. It does not forbid the internet: that was the template denying the very traffic it was written for.
  { key: 'no-breakout', home: 'site', word: 'No local breakout', icon: 'large-building', layers: ['site'], alias: /no (local )?internet breakout/i },
  { key: 'egress', home: 'core', word: 'Egress via AT&T', icon: 'export', layers: ['core'], alias: /egress (only )?(through|via)|internet egress only/i },
  // Before inspection: "Segment-aware firewall" asks for segments, it is not an inspection policy.
  { key: 'segment', home: 'core', word: 'Segmented', icon: 'grid', layers: ['core'], alias: /segment/i },
  { key: 'inspect', home: 'edge', word: 'Inspected', icon: 'firewall', layers: ['edge'], alias: /inspect|ngfw|ids\/ips|web proxy|ddos|firewall/i },
  // Priority traffic is a class of service (2026-10-15): the CPE marks it and the AT&T core carries it in its class. It is
  // never a timed promise ("we can't measure that").
  { key: 'priority', home: 'core', word: 'Priority traffic', icon: 'high-meter', layers: ['core'], alias: /priority traffic|class of service/i },
  { key: 'two-paths', home: 'edge', word: 'Two paths', icon: 'merge', layers: ['edge'], alias: /two paths|active\/active/i },
  { key: 'encrypt', home: 'edge', word: 'Encrypted', icon: 'lock', layers: ['edge'], alias: /encrypt|decrypt/i },
  { key: 'zero-trust', home: 'site', word: 'Zero-trust access', icon: 'user-access', layers: ['site'], alias: /zero-trust/i },
  { key: 'allow-list', home: 'edge', word: 'Allow-listed', icon: 'filter', layers: ['edge'], alias: /allow-list/i },
];
// A phrase the catalog does not know keeps its words, on the layer its words name (what layerOfReq did, once).
const OTHER_LAYER = [[/inspect|firewall|terminate|hand off|on-ramp port|port\b/i, 'edge'], [/breakout|first mile|avpn|switched ethernet|sd-wan|third party access|site|data cent/i, 'site'],
  [/subnet|vpc|vnet|workload|endpoint|region/i, 'cloud']];
export const otherLayer = (ph) => (OTHER_LAYER.find(([re]) => re.test(ph)) || [null, 'core'])[1];
/** One phrase as a typed intent; a phrase the catalog does not know keeps its words on the layer it names. */
export function intentOf(phrase) {
  const ph = String(phrase || '').trim();
  for (const it of INTENTS) { const m = it.alias.exec(ph); if (m) return { key: it.key, word: it.word, icon: it.icon, layers: it.layers, forbids: !!it.forbids, param: it.param ? it.param(m) : null, text: ph }; }
  return { key: 'other:' + ph.toLowerCase(), word: ph, icon: 'check-shield', layers: [otherLayer(ph)], forbids: false, param: null, text: ph };
}
export const sameIntent = (a, b) => a.key === b.key && a.param === b.param;
/** The layer one phrase lands on: its intent's home, or for a phrase the catalog does not know, the layer its words name. */
export const homeLayer = (ph) => { const it = intentOf(ph); return (INTENTS.find(x => x.key === it.key) || {}).home || it.layers[0]; };
/** A policy's phrases, typed and each once: its rule, its path picks and the words a template wrote at each layer. */
export function intentsOf(p) {
  const phrases = [...String((p && p.req) || '').split(/\s+and\s+/i), ...((p && p.path) || []), ...Object.values((p && p.layers) || {})].map(x => String(x).trim()).filter(Boolean);
  const out = [];
  for (const ph of phrases) { const it = intentOf(ph); if (!out.some(x => sameIntent(x, it))) out.push(it); }
  return out;
}

// ---- Tiers and precedence ----
// Every layer walks the same tiers top to bottom; inside a tier a visible integer priority, a deny before an allow at
// the same priority, then the order written. AT&T's platform rows (T0) are the NetBond team's to state: none are yet.
export const POLICY_TIERS = [
  { key: 'T0', n: 0, label: 'AT&T', icon: 'padlock', who: 'AT&T platform, read-only' },
  { key: 'T1', n: 1, label: 'Estate', icon: 'check-shield', who: "the estate's guardrails" },
  { key: 'T2', n: 2, label: 'Owners', icon: 'person', who: 'network and cloud owners, authored here' },
  { key: 'T3', n: 3, label: 'Baseline', icon: 'gear', who: "AT&T's defaults you may override" },
];
export const tierOf = (p) => (p && p.tier) || (p && (p.custom || p.journey) ? 'T2' : 'T1');
export const tierN = (key) => (POLICY_TIERS.find(t => t.key === key) || POLICY_TIERS[1]).n;
/** Each policy's priority: its own when it states one, else ten apart in the order written within its tier. */
export function priorities(ps) {
  const seen = {};
  return ps.map(p => { const t = tierOf(p); seen[t] = (seen[t] || 0) + 1; return Number.isFinite(p && p.priority) ? p.priority : seen[t] * 10; });
}
/** What a policy's verb is when it says one (Pass hands down, Always ends and cannot be overridden). */
export const actionOf = (p) => (p && ['allow', 'deny', 'pass', 'always'].includes(p.action) ? p.action : null);
/** Two policies in one tier at the same stated priority: the walk cannot order them, so publishing refuses. */
export function publishErrors(ps) {
  const out = [], at = {};
  for (const p of ps.filter(x => x && x.state !== 'draft' && Number.isFinite(x.priority))) {
    const k = `${tierOf(p)}:${p.priority}`;
    if (at[k]) out.push({ key: k, a: at[k].name, b: p.name, text: `${at[k].name} and ${p.name} share priority ${p.priority} in ${(POLICY_TIERS.find(t => t.key === tierOf(p)) || {}).label}` });
    else at[k] = p;
  }
  return out;
}

// ---- NetBond Advanced's sheet (Configure > Policies), and the enforcement points ----
export const PEPS = {
  cpe: { layer: 'site', icon: 'router', word: 'CPE or SD-WAN' },
  netbond: { layer: 'edge', icon: 'cable', word: 'NetBond route sheet' },
  vsrx: { layer: 'edge', icon: 'firewall', word: 'vSRX, hosted hub' },
  vrf: { layer: 'core', icon: 'network-folder', word: 'Your VRF' },
  cos: { layer: 'core', icon: 'high-meter', word: 'Class of service' },
  rt: { layer: 'cloud', icon: 'list', word: 'Route table' },
  sg: { layer: 'cloud', icon: 'personal-security', word: 'Security group' },
};
// A row: { pep, verb ('deny'|'allow'|'manip'|'adv'|'always'|'pass'), dir, to ('cloud'|'internet'|'any'), ends (it decides
// the layer for a flow it matches, or only shapes or obliges), text (the object of its verb: "Deny local breakout"), nb
// (the NetBond sheet keys it turns on) }. `dir` is the traffic's direction ('o2p' site to cloud, 'p2o' cloud to site,
// 'both') on every enforcement point but NetBond, where it is the ROUTES' direction as NetBond names it (On Premise →
// Partner advertises your routes to the cloud). A route row governs the BGP session, so it reads for traffic both ways:
// denying the matching routes either way leaves no route, and the flow drops whichever way it runs (2026-10-09 review).
const R = (pep, verb, dir, to, ends, text, nb) => ({ pep, verb, dir, to, ends, text, ...(nb ? { nb } : {}) });
const BREAKOUT = R('cpe', 'deny', 'o2p', 'internet', true, 'Local breakout');
const COMPILE = {
  // On a hosted way the hub's own on-ramp carries the matching routes in NetBond's place (the rulebase reads it so).
  private: [BREAKOUT, R('netbond', 'allow', 'both', 'cloud', true, 'Matching routes', { 'allow:matching-routes': { o2p: true, p2o: true } }),
    R('vrf', 'allow', 'both', 'cloud', true, "Region's route target"), R('rt', 'deny', 'p2o', 'internet', true, '0/0 to the internet')],
  'no-internet': [BREAKOUT, R('vsrx', 'allow', 'o2p', 'internet', true, 'Internet via send-to only'), R('rt', 'allow', 'p2o', 'internet', true, '0/0 via AT&T')],
  'no-breakout': [{ ...BREAKOUT, ends: false }],
  egress: [R('netbond', 'adv', 'o2p', 'cloud', false, 'Static 0/0', { 'advanced:advertise-static-routes': { o2p: true } }), R('vsrx', 'allow', 'o2p', 'internet', true, 'Send-to, with NAT'),
    R('rt', 'allow', 'p2o', 'internet', true, '0/0 to the gateway')],
  inspect: [R('vsrx', 'allow', 'both', 'any', true, 'Zone policy and IDP'),
    R('netbond', 'manip', 'both', 'cloud', false, 'CV tags, return path', { 'manip:selective-cv-tagging': { o2p: true }, 'manip:community-value-tag': { p2o: true } }),
    R('rt', 'allow', 'p2o', 'any', false, 'Next hop is the hub')],
  // A segment keeps traffic in its VLAN: an obligation on the way to the cloud, never a decision about the internet.
  segment: [R('cpe', 'allow', 'both', 'cloud', false, 'A VLAN per segment'),
    R('netbond', 'allow', 'both', 'cloud', false, 'Your CVs', { 'allow:community-value-filter-customer': { o2p: true, p2o: true } }),
    R('netbond', 'deny', 'p2o', 'cloud', false, "AT&T's CVs", { 'deny:community-value-filter-att': { p2o: true } }),
    R('vsrx', 'allow', 'both', 'any', false, 'A zone per segment'), R('vrf', 'allow', 'both', 'cloud', true, 'A VRF per segment'), R('rt', 'allow', 'both', 'cloud', false, 'A table per segment')],
  priority: [R('cpe', 'manip', 'o2p', 'any', false, 'DSCP, app-aware path'), R('cos', 'manip', 'both', 'cloud', false, 'Priority class')],
  'two-paths': [R('netbond', 'manip', 'both', 'cloud', false, 'Local preference by CV', { 'manip:selective-cv-tagging': { o2p: true }, 'manip:community-value-tag': { p2o: true } })],
};
/** The rows one intent compiles to (none for an intent the table does not cover yet: it reads Undetermined). */
export const compileIntent = (it) => (COMPILE[it.key] || []).map(r => ({ ...r, layer: PEPS[r.pep].layer, intent: it.key, intentWord: it.word }));
/** A policy's NetBond sheet as it would push it: its own when any toggle is on, else what its intents compile to. */
export function netbondOf(p, ROUTE_RULES) {
  const own = p && p.route && Object.values(p.route).some(v => v && (v.o2p || v.p2o));
  if (own) return p.route;
  const out = {};
  for (const it of intentsOf(p)) for (const r of compileIntent(it)) for (const [k, v] of Object.entries(r.nb || {})) out[k] = { ...(out[k] || {}), ...v };
  return out;
}
/** Every row a policy compiles to. An explicit NetBond sheet replaces the NetBond rows its intents would derive. */
export function compilePolicy(p, ROUTE_RULES) {
  const rows = intentsOf(p).flatMap(compileIntent);
  const own = p && p.route && Object.values(p.route).some(v => v && (v.o2p || v.p2o));
  if (!own) return rows;
  const sheet = [];
  for (const rr of ROUTE_RULES) { const v = p.route[`${rr.section}:${rr.id}`] || {}; if (!(v.o2p || v.p2o)) continue;
    const dir = v.o2p && v.p2o ? 'both' : v.o2p ? 'o2p' : 'p2o';
    sheet.push({ pep: 'netbond', layer: 'edge', verb: { deny: 'deny', allow: 'allow', manip: 'manip', advanced: 'adv' }[rr.section], dir, to: 'cloud',
      ends: (rr.section === 'deny' || rr.section === 'allow') && rr.id === 'matching-routes', text: rr.label, nb: { [`${rr.section}:${rr.id}`]: { ...(v.o2p ? { o2p: true } : {}), ...(v.p2o ? { p2o: true } : {}) } }, intent: 'route', intentWord: 'Route sheet' }); }
  return [...rows.filter(r => r.pep !== 'netbond'), ...sheet];
}
// AT&T's baseline (T3), the one row NetBond's own default sheet and sample state: Block Default Routes, On Premise →
// Partner (att-netbond-sdci RestrictedIPv4Policy.tsx, the override sample 0.0.0.0/0 o2p). You may override it.
export const BASELINE = [{ name: 'NetBond default sheet', tier: 'T3', priority: 10, rows: [R('netbond', 'deny', 'o2p', 'cloud', false, 'Default routes', { 'deny:block-default-routes': { o2p: true } })] }];
// What each layer does when nothing matched, per direction. A default that would deny starts in Audit (brownfield:
// today's AVPN any-to-any traffic must not break), and Audit never flips a verdict.
export const DEFAULTS = {
  site: { o2p: { verb: 'allow', text: 'Your LAN', title: 'Allow: the site polices only what a policy selects' }, p2o: { verb: 'allow', text: 'Your LAN', title: 'Allow: the site polices only what a policy selects' } },
  edge: { o2p: { verb: 'allow', text: 'Permit all routes', title: "Allow: the connection's route filter permits all routes (NetBond's wizard default). The vSRX, where a hosted hub is on record, denies between zones in Audit" },
    p2o: { verb: 'allow', text: 'Permit all routes', title: "Allow: the connection's route filter permits all routes (NetBond's wizard default)" } },
  core: { o2p: { verb: 'allow', text: 'Any to any in your VRF', title: 'Allow: your VRF is any to any, as AVPN is' }, p2o: { verb: 'allow', text: 'Any to any in your VRF', title: 'Allow: your VRF is any to any, as AVPN is' } },
  cloud: { o2p: { verb: 'deny', audit: true, text: 'Ingress, unless allowed', title: 'Deny, in Audit: a security group denies ingress it does not allow. Asserted from discovery, never pushed to a customer VPC' },
    p2o: { verb: 'allow', text: 'Egress', title: 'Allow: a security group allows egress' } },
};
// How each column combines its rows, in its own words.
export const COMBINE = { site: 'First match', edge: 'First match', core: 'Share, then filter', cloud: 'Most specific route' };

// Policies across the layers of the path (Micah, 2026-09-29: "give me policies
// that are multi-layer"). A policy says what it requires at each layer a flow
// crosses: the site and its first mile, the AT&T edge, the AT&T core, the cloud
// and its workloads. Pure data and functions; the view reads them. Since slice 2 of
// the policy engine (2026-10-09) every per-layer word comes from one compile table
// (naas-policy-compile.js): RANK, ROUTE_OF, layerOfReq, ACROSS and contributions are gone.
import { intentsOf, compilePolicy, netbondOf, homeLayer, tierOf, tierN, priorities, actionOf } from './naas-policy-compile.js';

export const POLICY_LAYERS = [
  { key: 'site', label: 'Sites & first mile' },
  { key: 'edge', label: 'AT&T edge' },
  { key: 'core', label: 'AT&T core' },
  { key: 'cloud', label: 'Cloud & workload' },
];

/** A policy's rule at each layer ('' where it says nothing there): what a template wrote, else each phrase on its home
 *  layer in the words written, and every other layer its compile reaches in that row's words. */
export function policyLayers(p) {
  const out = Object.fromEntries(POLICY_LAYERS.map(l => [l.key, '']));
  if (p && p.layers) return { ...out, ...p.layers };
  if (!p) return out;
  // A path pick sits on the layer the composer and the templates give it (SERVICE_GROUPS); a rule on its intent's home.
  // Several on one layer read together, as the composer's strip does (2026-10-09 review).
  const put = (L, ph) => { out[L] = out[L] ? `${out[L]} · ${ph}` : ph; };
  for (const q of String(p.req || '').split(/\s+and\s+/i).map(x => x.trim()).filter(Boolean)) put(homeLayer(q), q);
  for (const ph of (p.path || []).map(x => String(x).trim()).filter(Boolean)) { const o = SERVICE_GROUPS.flatMap(g => g.opts).find(x => x.label === ph); put(o ? o.layer : homeLayer(ph), ph); }
  // A deny row's words are the object of its verb ("Deny local breakout"); on its own in a cell it reads "No local breakout".
  for (const r of compilePolicy(p, ROUTE_RULES)) if (!out[r.layer]) out[r.layer] = r.verb === 'deny' ? `No ${r.text.replace(/^\w/, ch => ch.toLowerCase())}` : r.text;
  return out;
}

/** Starting points that set a rule at every layer. */
export const MULTI_LAYER = [
  { icon: 'padlock', key: 'pci', name: 'PCI, end to end', match: 'tag PCI', why: 'Card data never touches the internet, from the store to the subnet.',
    layers: { site: 'AVPN or Switched Ethernet, no internet breakout', edge: 'Inspect at the AT&T edge', core: 'Private path required', cloud: 'PCI subnets only' },
    short: { site: 'AVPN or Ethernet', edge: 'Edge inspection', core: 'Private path', cloud: 'PCI subnets' } },
  { icon: 'large-building', key: 'remote', name: 'Remote sites to cloud', match: 'remote-site any', why: 'Remote sites reach the cloud through AT&T, not around it.',
    layers: { site: 'SD-WAN or Third Party Access tunnels to the AT&T edge', edge: 'Terminate tunnels at the AT&T edge', core: 'No direct internet path', cloud: 'Private on-ramp into the region' },
    short: { site: 'Tunnels to AT&T', edge: 'Tunnels end at edge', core: 'No direct internet', cloud: 'Private on-ramp' } },
  { icon: 'ai', key: 'gpu', name: 'AI and GPU traffic', match: 'tag AI', why: 'Training data moves on capacity that is sized and measured for it.',
    layers: { site: 'Data centers on 10G Switched Ethernet', edge: 'Dedicated 10G on-ramp port', core: 'Latency SLO 15 ms', cloud: 'GPU regions on a private path' },
    short: { site: 'DCs on 10G', edge: 'Dedicated 10G port', core: '15 ms SLO', cloud: 'Private GPU regions' } },
  { icon: 'globe', key: 'inet', name: 'Internet-facing apps', match: 'tag Internet-facing', why: 'What faces the internet is inspected once, at the edge, for every cloud.',
    layers: { site: 'No local internet breakout', edge: 'DDoS protection and inline inspection', core: 'Egress through AT&T, never direct', cloud: 'Public subnets behind the edge' },
    short: { site: 'No local breakout', edge: 'DDoS + inspection', core: 'Egress via AT&T', cloud: 'Behind the edge' } },
  { icon: 'bill', key: 'fin', name: 'Finance stays segmented', match: 'branch Finance', why: 'Finance traffic has its own lane at every hop.',
    layers: { site: 'Finance sites in their own segment', edge: 'Segment-aware firewall', core: 'Segment intra-tag only', cloud: 'Finance VPCs only' },
    short: { site: 'Own segment', edge: 'Segment firewall', core: 'Intra-tag only', cloud: 'Finance VPCs' } },
];

// NetBond Advanced's route policy (Configure > Policies, RestrictedIPv4Policy.tsx), rule by rule and
// direction by direction: o2p is On Premise → Partner, p2o is Partner → On Premise (2026-10-01). `o2p`/`p2o` are the
// directions NetBond offers (only hideOnPremiseToPartner hides one; 2026-10-09 Block Default Routes and Selective CV
// Tagging offer both, as NetBond does), and `nb` is the label exactly as NetBond shows it.
export const ROUTE_SECTIONS = [['deny', 'Deny actions'], ['manip', 'Manipulations'], ['allow', 'Allow actions'], ['advanced', 'Advanced']];
export const ROUTE_RULES = [
  { section: 'deny', id: 'matching-routes', label: 'Matching routes', nb: 'Matching Routes', o2p: true, p2o: true },
  { section: 'deny', id: 'block-default-routes', label: 'Block default routes', nb: 'Block Default Routes', o2p: true, p2o: true },
  { section: 'deny', id: 'community-value-filter-customer', label: 'Community value filter, your BGP CVs', nb: 'Community Value Filter with Customer-Provided BGP CVs', o2p: true, p2o: true },
  { section: 'deny', id: 'community-value-filter-att', label: 'Community value filter, AT&T BGP CVs', nb: 'Community Value Filter with AT&T-Provided BGP CVs', o2p: false, p2o: true },
  { section: 'manip', id: 'prepend-advertisements', label: 'Prepend extra BGP ASNs', nb: 'Prepend Advertisements With Extra BGP ASNs', o2p: true, p2o: true },
  { section: 'manip', id: 'selective-cv-tagging', label: 'Selective CV tagging', nb: 'Selective CV Tagging to Routes/Prefixes', o2p: true, p2o: true },
  { section: 'manip', id: 'community-value-tag', label: 'Community value to tag routes', nb: 'Community Value to Tag Routes', o2p: false, p2o: true },
  { section: 'allow', id: 'matching-routes', label: 'Matching routes', nb: 'Matching routes', o2p: true, p2o: true },
  { section: 'allow', id: 'community-value-filter-customer', label: 'Community value filter, your BGP CVs', nb: 'Community Value Filter with Customer-Provided BGP CVs', o2p: true, p2o: true },
  { section: 'allow', id: 'community-value-filter-att', label: 'Community value filter, AT&T BGP CVs', nb: 'Community Value Filter with AT&T-Provided BGP CVs', o2p: false, p2o: true },
  { section: 'advanced', id: 'advertise-static-routes', label: 'Advertise static routes', nb: 'Advertise Static Routes', o2p: true, p2o: true },
];
/** A policy's NetBond route sheet: its own when any toggle is on, else what its intents compile to (naas-policy-compile.js).
 *  {'section:id': {o2p, p2o}}. A composer policy that toggled nothing (route: {}) now derives its sheet like any other. */
export const routeRulesOf = (p) => netbondOf(p, ROUTE_RULES);
// What the path between two assets must do (Micah, 2026-10-01: "multi-path routing with diversity to from between
// cloud assets, inline service insertion, access, encrypt/decrypt, controlled egress"), each on the layer that enforces it.
export const SERVICE_GROUPS = [
  { key: 'multipath', label: 'Multi-path', opts: [['Via the AT&T network', 'core'], ['Two paths, diverse metros', 'edge'], ['Two paths, diverse carriers', 'site'], ['Active/active', 'core'], ['Fail over to Equinix Fabric', 'core'], ['Never the internet', 'core']] },
  { key: 'inline', label: 'Inline services', opts: [['NGFW inline', 'edge'], ['IDS/IPS inline', 'edge'], ['Web proxy inline', 'edge']] },
  { key: 'access', label: 'Access', opts: [['Private access only', 'site'], ['Zero-trust access for users', 'site']] },
  { key: 'crypto', label: 'Encrypt / decrypt', opts: [['Encrypt in transit', 'edge'], ['Decrypt only at the AT&T edge, for inspection', 'edge']] },
  { key: 'egress', label: 'Controlled egress', opts: [['Internet egress only through AT&T', 'core'], ['Egress only via named regions', 'cloud'], ['Allow-listed destinations only', 'edge']] },
].map(g => ({ ...g, opts: g.opts.map(([label, layer]) => ({ label, layer })) }));
export const ROUTE_PATHS = SERVICE_GROUPS.flatMap(g => g.opts.map(o => o.label));

// Simulate the pair (step 3, 2026-10-01): today's path between the two sides, the path with the policy,
// what it pushes on each layer, what is missing, the price change and one tip. Pure: prices come in.
const PRIVATE_PICKS = ['Via the AT&T network', 'Never the internet', 'Two paths, diverse metros', 'Active/active'];
export function pairOutcome(est, au, price = {}) {
  if (!au || !au.match || !au.scope) return null;
  const regs = est.regionsList || [], sites = est.sites || [];
  const r = regs.find(x => au.scope === `${x.cloud} ${x.region}`) || null;
  const pc = sites.find(st => st.colo && st.colo.kind === 'Private cloud' && au.match === `Private cloud · ${st.colo.provider} ${st.colo.facility}, ${st.metro}`) || null;
  const picks = au.path || [], req = au.req || [];
  const wantsPrivate = picks.some(p => PRIVATE_PICKS.includes(p)) || req.some(q => /private path|no direct internet/i.test(q));
  const fmt$ = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  const today = r ? { path: r.priv ? 'Private on the AT&T network' : 'Public internet', ms: r.priv ? r.fab : r.pub } : { path: 'Not measured', ms: null };
  const after = r && (r.priv || wantsPrivate) ? { path: 'Private on the AT&T network', ms: r.fab } : today;
  const lines = [];
  if (r && wantsPrivate && !r.priv) lines.push({ key: 'nb', text: `NetBond to ${r.cloud} ${r.region}`, v: price.netbond || 0 });
  if (r && picks.includes('Two paths, diverse metros')) lines.push({ key: 'nb2', text: 'A second NetBond port, another metro', v: price.netbond || 0 });
  if (picks.some(p => /NGFW|IDS\/IPS/.test(p))) lines.push({ key: 'fw', text: 'NGFW in path', v: price.ngfw || 0 });
  if (pc && wantsPrivate) lines.push({ key: 'xc', text: `Cross-connect at ${pc.colo.provider} ${pc.colo.facility}`, v: price.xc || 0 });
  const delta = lines.reduce((a, x) => a + x.v, 0);
  const missing = [];
  if (pc && wantsPrivate) missing.push({ key: 'xc', text: `Needs a cross-connect at ${pc.colo.provider} ${pc.colo.facility}`, order: 'colo' });
  if (r && wantsPrivate && !r.priv) missing.push({ key: 'nb', text: `Needs NetBond to ${r.cloud} ${r.region}`, order: 'netbond' });
  // What it pushes, layer by layer, in the order a flow crosses them.
  const pushed = [];
  for (const g of SERVICE_GROUPS) for (const o of g.opts) if (picks.includes(o.label)) pushed.push({ layer: o.layer, text: o.label });
  for (const q of req) pushed.push({ layer: homeLayer(q), text: q });
  for (const rr of ROUTE_RULES) { const v = (au.route || {})[`${rr.section}:${rr.id}`] || {}; const ds = [v.o2p && 'on premise → partner', v.p2o && 'partner → on premise'].filter(Boolean);
    if (ds.length) pushed.push({ layer: 'edge', text: `${({ deny: 'Deny', manip: 'Apply', allow: 'Allow', advanced: 'Apply' })[rr.section]} ${rr.label.toLowerCase()} (${ds.join(', ')})` }); }
  const ORDER = ['site', 'edge', 'core', 'cloud'];
  pushed.sort((x, y) => ORDER.indexOf(x.layer) - ORDER.indexOf(y.layer));
  const tip = today.ms == null ? 'Pick a cloud region on the other side to see the path.'
    : `Today this pair rides ${today.path === 'Public internet' ? 'the public internet' : 'the AT&T network'} at ${today.ms} ms. With this policy: ${after.path === 'Public internet' ? 'still public' : 'private'}, ${after.ms} ms, ${delta ? `+${fmt$(delta)}/mo` : 'no added cost'}.${missing.length ? ` ${missing[0].text}.` : ''}`;
  return { today, after, lines, delta, deltaF: delta ? `+${fmt$(delta)}/mo` : '$0', missing, pushed, tip };
}

// Templates between two assets (2026-10-01): each names its sides by kind, and resolves to the estate's own.
export const BETWEEN_TEMPLATES = [
  { icon: 'hybrid-cloud', key: 'pc-hsp', name: 'Private cloud to a hyperscaler, private and inspected', why: 'Your colo private cloud reaches a cloud region over the AT&T network only, through a firewall, encrypted.',
    a: 'private-cloud', b: 'public-region', path: ['Via the AT&T network', 'Never the internet', 'NGFW inline', 'Encrypt in transit'], route: { 'deny:block-default-routes': { o2p: true, p2o: false } } },
  { icon: 'cloud-transfer', key: 'c2c', name: 'Cloud to cloud over AT&T, two paths', why: 'Two clouds talk over the AT&T network on diverse metros, active/active, never the internet.',
    a: 'region', b: 'other-cloud-region', path: ['Via the AT&T network', 'Two paths, diverse metros', 'Active/active', 'Never the internet'], route: {} },
  { icon: 'export', key: 'egress', name: 'Controlled egress for internet-facing apps', why: 'Internet-bound traffic leaves only through AT&T, to allow-listed destinations, inspected.',
    a: 'tag Internet-facing', b: 'the Internet', path: ['Internet egress only through AT&T', 'Allow-listed destinations only', 'NGFW inline'], route: {} },
  { icon: 'user-access', key: 'branch-zt', name: 'Branches to cloud, zero-trust', why: 'Users at branches reach the clouds through zero-trust access, encrypted, over the AT&T network.',
    a: 'bu', b: 'any cloud', path: ['Zero-trust access for users', 'Encrypt in transit', 'Via the AT&T network'], route: {} },
  { icon: 'router', key: 'advertise', name: 'Advertise only what the partner needs', why: 'The cloud learns only your matching routes, tagged for its route table; no default route leaks.',
    a: 'private-cloud', b: 'public-region', path: [], route: { 'allow:matching-routes': { o2p: true, p2o: false }, 'deny:block-default-routes': { o2p: true, p2o: false }, 'manip:selective-cv-tagging': { o2p: true, p2o: false } } },
];
/** A template's sides, named from this estate: its first private cloud, its first public region, a region on another cloud. */
export function resolveTemplate(est, t) {
  const regs = est.regionsList || [], sites = est.sites || [];
  const pcSite = sites.find(st => st.colo && st.colo.kind === 'Private cloud');
  const pc = pcSite ? `Private cloud · ${pcSite.colo.provider} ${pcSite.colo.facility}, ${pcSite.metro}` : (sites.find(st => /DC\b/.test(st.name)) || {}).name;
  const pub = regs.find(r => !r.priv) || regs[0] || {}, any = regs[0] || {};
  const other = regs.find(r => r.cloud !== any.cloud) || regs[1] || any;
  const side = (k) => k === 'private-cloud' ? pc : k === 'public-region' ? `${pub.cloud} ${pub.region}` : k === 'region' ? `${any.cloud} ${any.region}`
    : k === 'other-cloud-region' ? `${other.cloud} ${other.region}` : k === 'bu' ? 'branch Finance' : k;
  return { match: side(t.a), scope: side(t.b), path: t.path.slice(), route: JSON.parse(JSON.stringify(t.route)), req: [], templateName: t.name };
}

// The policy engine (2026-10-01): every policy in precedence order, the rules each compiles onto the connection that
// carries it, and the conflicts between them (one allows what another denies, for the same pair and direction).
/** Precedence, the one sort (2026-10-09, slice 2): the tier (AT&T, Estate, Owners, Baseline), then the visible integer
 *  priority (a policy's own, else ten apart in the order written within its tier), then a deny before an allow at the
 *  same priority, then the order written. Specificity is no longer a sort key. Govern's numbering, the connections below
 *  and the engine (naas-policy-model.js) all read it. Ours, not NetBond's: NetBond states no evaluation order. */
const deniesRoutes = (p) => { const v = routeRulesOf(p)['deny:matching-routes'] || {}; return !!(v.o2p || v.p2o) || actionOf(p) === 'deny'; };
export const precedenceOf = (ps) => { const pr = priorities(ps);
  return ps.map((p, i) => ({ p, i, tier: tierOf(p), priority: pr[i], deny: deniesRoutes(p) }))
    .sort((x, y) => tierN(x.tier) - tierN(y.tier) || x.priority - y.priority || (y.deny - x.deny) || x.i - y.i); };
export function evalPolicies(est, policies = []) {
  const live = policies.filter(p => p.state !== 'draft');
  const ordered = precedenceOf(live).map(({ p, tier, priority, i }) => ({ ...p, tier, priority, i }));
  const byConn = new Map(), conflicts = [];
  for (const p of ordered) {
    const r = (est.regionsList || []).find(x => p.scope === `${x.cloud} ${x.region}`);
    if (!r) continue;
    const k = r.region, c = byConn.get(k) || { key: k, region: r.region, label: `${r.cloud} ${r.region}`, rules: [] };
    for (const pick of p.path || []) c.rules.push({ text: pick, from: p.name });
    for (const rr of ROUTE_RULES) { const v = routeRulesOf(p)[`${rr.section}:${rr.id}`] || {};
      for (const [dir, word] of [['o2p', 'on premise → partner'], ['p2o', 'partner → on premise']]) if (v[dir])
        c.rules.push({ text: `${({ deny: 'Deny', manip: 'Apply', allow: 'Allow', advanced: 'Apply' })[rr.section]} ${rr.label.toLowerCase()} (${word})`, from: p.name, sec: rr.section, id: rr.id, dir, word, pair: `${p.match}→${p.scope}` }); }
    byConn.set(k, c);
  }
  for (const c of byConn.values()) {
    const denies = c.rules.filter(x => x.sec === 'deny'), allows = c.rules.filter(x => x.sec === 'allow');
    for (const d of denies) for (const a of allows) if (d.id === a.id && d.dir === a.dir && d.pair === a.pair && d.from !== a.from)
      conflicts.push({ key: `${c.key}:${d.id}:${d.dir}`, text: `${d.from} denies and ${a.from} allows ${ROUTE_RULES.find(x => x.id === d.id).label.toLowerCase()}, ${d.word}, on ${c.label}`, conn: c.label });
  }
  const connections = [...byConn.values()], ruleN = connections.reduce((s, c) => s + c.rules.length, 0);
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  return { ordered, connections, conflicts, summary: `${pl(ordered.length, 'policy', 'policies')} · ${pl(connections.length, 'connection', 'connections')} · ${pl(ruleN, 'rule', 'rules')} pushed · ${pl(conflicts.length, 'conflict', 'conflicts')}` };
}

// ---- The policy engine, evaluated: moved to naas-policy-model.js (2026-10-09, slice 1 of the research plan) ----
// The internet in the engine (2026-10-07, the engine could only ever say Allowed): an intent that keeps traffic private
// (a private path, no direct internet) forbids the public internet outright, so a flow to the Internet that it matches is
// Denied. The engine reads its intent catalog; this test of the words stays for the composer and the tests.
const CLOUD_LABEL = /^(AWS|Azure|GCP|Oracle|CoreWeave) /;
const FORBIDS_INTERNET = /no direct internet|private path|never the internet/i;
export const forbidsInternet = (p) => FORBIDS_INTERNET.test(String(p.req || '')) || (p.path || []).includes('Never the internet');
/** Per connection: what the policies intend, what the connection has today, and whether they agree. */
export function intendedVsConfigured(est, policies) {
  const byReg = new Map();
  for (const p of policies.filter(x => x.state !== 'draft')) {
    const r = (est.regionsList || []).find(x => p.scope === `${x.cloud} ${x.region}`); if (!r) continue;
    const c = byReg.get(r.region) || { key: r.region, region: r.region, label: `${r.cloud} ${r.region}`, rows: [] };
    // What it intends: its phrases, and its own NetBond sheet as authored (a derived row restates an intent already listed).
    const own = [...String(p.req || '').split(/\s+and\s+/i), ...(p.path || [])].map(x => String(x).trim()).filter(Boolean).map(q => ({ layer: homeLayer(q), text: q }));
    if (p.route) for (const rr of ROUTE_RULES) { const v = p.route[`${rr.section}:${rr.id}`] || {};
      for (const [dir, word] of [['o2p', 'on premise → partner'], ['p2o', 'partner → on premise']]) if (v[dir])
        own.push({ layer: 'edge', text: `${({ deny: 'Deny', manip: 'Apply', allow: 'Allow', advanced: 'Apply' })[rr.section]} ${rr.label.toLowerCase()} (${word})` }); }
    for (const x of own) {
      const privateIntent = ['Via the AT&T network', 'Never the internet'].includes(x.text);
      const row = privateIntent
        ? (r.priv ? { configured: 'Private on the AT&T network', status: 'In sync' } : { configured: 'Rides the public internet today', status: 'Drift' })
        : p.state === 'enforced' ? { configured: 'On the connection', status: 'In sync' } : { configured: 'Not on the connection', status: 'Not pushed' };
      c.rows.push({ key: `${p.name}:${x.text}`, rule: x.text, layer: x.layer, from: p.name, ...row });
    }
    byReg.set(r.region, c);
  }
  return [...byReg.values()];
}

// ---- Icons and badges (2026-10-02: "more icon and flywheel beauty") ----
// Each layer's glyph on the path strip, and the short word its column head uses.
export const LAYER_ICON = { site: 'large-building', edge: 'firewall', core: 'hub', cloud: 'cloud' };
export const LAYER_SHORT = { site: 'Sites', edge: 'Edge', core: 'Core', cloud: 'Cloud' };
/** The glyph for a side of a policy, by what the label names. */
export function assetIcon(label) {
  const s = String(label || '');
  if (/^Private cloud/.test(s)) return 'hybrid-cloud';
  if (/^tag /.test(s)) return 'tag';
  if (/^(branch|remote-site|site) /.test(s) || /\bDC\b|data cent|HQ\b|yard\b|plant\b/i.test(s)) return 'large-building';
  if (/^the Internet$/i.test(s)) return 'globe';
  if (/^the WAN$/i.test(s)) return 'global-network';
  if (/^region /.test(s) || /^any cloud$/i.test(s) || CLOUD_LABEL.test(s)) return 'cloud';
  return 'target';
}
// The verbs a policy compiles to across its layers (Deny, Allow, Manipulate, Advertise, in NetBond's colors), then what
// the path asks for, in neutral: three at most. A verb carries the directions its rows run (2026-10-09, from the compile
// table, so an SLO is a Manipulate of the class of service and never a prepend).
const INTENT_BADGE = { private: ['path', 'Path'], 'no-internet': ['path', 'Path'], 'two-paths': ['path', 'Path'], 'no-breakout': ['path', 'Path'], inspect: ['inspect', 'Inspect'],
  segment: ['segment', 'Segment'], slo: ['slo', 'SLO'], egress: ['egress', 'Egress'], encrypt: ['encrypt', 'Encrypt'], 'zero-trust': ['access', 'Access'], 'allow-list': ['inspect', 'Inspect'] };
export function verbBadges(p) {
  const out = [], seen = new Set(), add = (key, label, cls) => { if (!seen.has(key)) { seen.add(key); out.push({ key, label, cls }); } };
  const rows = compilePolicy(p || {}, ROUTE_RULES), dirs = {};
  for (const r of rows) { const d = dirs[r.verb] = dirs[r.verb] || { o2p: false, p2o: false }; if (r.dir !== 'p2o') d.o2p = true; if (r.dir !== 'o2p') d.p2o = true; }
  for (const [v, key, label] of [['deny', 'deny', 'Deny'], ['allow', 'allow', 'Allow'], ['manip', 'manip', 'Manipulate'], ['adv', 'adv', 'Advertise']]) if (dirs[v]) add(key, label, key);
  for (const it of intentsOf(p || {})) { const b = INTENT_BADGE[it.key] || (/cost-aware/.test(it.key) ? ['cost', 'Cost'] : null); if (b) add(b[0], b[1], ''); }
  const arrow = (v) => { const d = dirs[v]; return !d ? '' : d.o2p && d.p2o ? '⇄' : d.o2p ? '→' : '←'; };
  const dirWord = (v) => { const d = dirs[v]; return !d ? '' : d.o2p && d.p2o ? 'both ways' : d.o2p ? 'on prem to partner' : 'partner to on prem'; };
  return out.slice(0, 3).map(b => { const dir = ['deny', 'allow', 'manip', 'adv'].includes(b.key) ? arrow(b.key) : '';
    return { ...b, dir, hasDir: !!dir, title: dir ? `${b.label}, ${dirWord(b.key)}` : b.label }; });
}
/** Every glyph the app binds by name; tests/icons.test.mjs checks each is on disk. */
export const ICON_NAMES = [...new Set([...Object.values(LAYER_ICON), 'hybrid-cloud', 'tag', 'large-building', 'globe', 'global-network', 'cloud', 'target'])];

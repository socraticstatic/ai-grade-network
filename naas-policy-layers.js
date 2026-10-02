// Policies across the layers of the path (Micah, 2026-09-29: "give me policies
// that are multi-layer"). A policy says what it requires at each layer a flow
// crosses: the site and its first mile, the AT&T edge, the AT&T core, the cloud
// and its workloads. Pure data and functions; the view reads them.

export const POLICY_LAYERS = [
  { key: 'site', label: 'Sites & first mile' },
  { key: 'edge', label: 'AT&T edge' },
  { key: 'core', label: 'AT&T core' },
  { key: 'cloud', label: 'Cloud & workload' },
];

/** The layer a single rule constrains, by what it asks for. */
export function layerOfReq(req) {
  const r = String(req || '').toLowerCase();
  if (/inspect|firewall|ngfw|ddos|terminate|hand off|on-ramp port/.test(r)) return 'edge';
  if (/breakout|first mile|avpn|switched ethernet|sd-wan|third party access|site/.test(r)) return 'site';
  if (/subnet|vpc|vnet|workload|endpoint|region only/.test(r)) return 'cloud';
  return 'core';
}

// What the estate's own policies already imply at the other layers. Each keeps
// its own rule on its own layer; the rest is what enforcing it takes end to end.
const ACROSS = {
  'Private path required': { site: 'No internet breakout at the site', edge: 'Private on-ramp at the AT&T edge', cloud: 'Private subnets only' },
  'Inline security inspection': { core: 'Egress through AT&T, never direct', cloud: 'Public subnets behind the edge' },
  'Segment intra-tag only': { site: 'Its own segment at the site', edge: 'Segment-aware firewall', cloud: 'Its own VPCs only' },
  'No direct internet path': { site: 'No local internet breakout', edge: 'Inspect what leaves at the AT&T edge' },
  'Latency SLO 15 ms': { site: 'Data centers on 10G first miles', edge: 'Dedicated on-ramp port', cloud: 'Regions on a private path' },
};

/** A policy's rule at each layer ('' where it says nothing there). */
export function policyLayers(p) {
  const out = Object.fromEntries(POLICY_LAYERS.map(l => [l.key, '']));
  if (p && p.layers) return { ...out, ...p.layers };
  if (!p || !p.req) return out;
  const own = layerOfReq(p.req);
  const across = p.custom ? {} : (ACROSS[p.req] || {});
  return { ...out, ...across, [own]: p.req };
}

/** Starting points that set a rule at every layer. */
export const MULTI_LAYER = [
  { icon: 'padlock', key: 'pci', name: 'PCI, end to end', match: 'tag PCI', why: 'Card data never touches the internet, from the store to the subnet.',
    layers: { site: 'AVPN or Switched Ethernet, no internet breakout', edge: 'Inspect at the AT&T edge', core: 'Private path required', cloud: 'PCI subnets only' } },
  { icon: 'large-building', key: 'remote', name: 'Remote sites to cloud', match: 'remote-site any', why: 'Remote sites reach the cloud through AT&T, not around it.',
    layers: { site: 'SD-WAN or Third Party Access tunnels to the AT&T edge', edge: 'Terminate tunnels at the AT&T edge', core: 'No direct internet path', cloud: 'Private on-ramp into the region' } },
  { icon: 'ai', key: 'gpu', name: 'AI and GPU traffic', match: 'tag AI', why: 'Training data moves on capacity that is sized and measured for it.',
    layers: { site: 'Data centers on 10G Switched Ethernet', edge: 'Dedicated 10G on-ramp port', core: 'Latency SLO 15 ms', cloud: 'GPU regions on a private path' } },
  { icon: 'globe', key: 'inet', name: 'Internet-facing apps', match: 'tag Internet-facing', why: 'What faces the internet is inspected once, at the edge, for every cloud.',
    layers: { site: 'No local internet breakout', edge: 'DDoS protection and inline inspection', core: 'Egress through AT&T, never direct', cloud: 'Public subnets behind the edge' } },
  { icon: 'bill', key: 'fin', name: 'Finance stays segmented', match: 'branch Finance', why: 'Finance traffic has its own lane at every hop.',
    layers: { site: 'Finance sites in their own segment', edge: 'Segment-aware firewall', core: 'Segment intra-tag only', cloud: 'Finance VPCs only' } },
];

// NetBond Advanced's route policy (Configure > Policies, RestrictedIPv4Policy.tsx), rule by rule and
// direction by direction: o2p is On Premise → Partner, p2o is Partner → On Premise (2026-10-01).
export const ROUTE_SECTIONS = [['deny', 'Deny actions'], ['manip', 'Manipulations'], ['allow', 'Allow actions'], ['advanced', 'Advanced']];
export const ROUTE_RULES = [
  { section: 'deny', id: 'matching-routes', label: 'Matching routes', o2p: true, p2o: true },
  { section: 'deny', id: 'block-default-routes', label: 'Block default routes', o2p: true, p2o: false },
  { section: 'deny', id: 'community-value-filter-customer', label: 'Community value filter, your BGP CVs', o2p: true, p2o: true },
  { section: 'deny', id: 'community-value-filter-att', label: 'Community value filter, AT&T BGP CVs', o2p: false, p2o: true },
  { section: 'manip', id: 'prepend-advertisements', label: 'Prepend extra BGP ASNs', o2p: true, p2o: true },
  { section: 'manip', id: 'selective-cv-tagging', label: 'Selective CV tagging', o2p: true, p2o: false },
  { section: 'manip', id: 'community-value-tag', label: 'Community value to tag routes', o2p: false, p2o: true },
  { section: 'allow', id: 'matching-routes', label: 'Matching routes', o2p: true, p2o: true },
  { section: 'allow', id: 'community-value-filter-customer', label: 'Community value filter, your BGP CVs', o2p: true, p2o: true },
  { section: 'allow', id: 'community-value-filter-att', label: 'Community value filter, AT&T BGP CVs', o2p: false, p2o: true },
  { section: 'advanced', id: 'advertise-static-routes', label: 'Advertise static routes', o2p: true, p2o: true },
];
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
  for (const q of req) pushed.push({ layer: layerOfReq(q), text: q });
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

// The policy engine (2026-10-01): every policy in precedence order (an asset pair beats a tag or branch,
// which beats a region pattern, which beats any), the rules each compiles onto the connection that carries
// it, and the conflicts between them (one allows what another denies, for the same pair and direction).
const RANK = (p) => /^Private cloud · |^site /.test(p.match || '') && /^(AWS|Azure|GCP|Oracle|CoreWeave) /.test(p.scope || '') ? 0
  : /^(AWS|Azure|GCP|Oracle|CoreWeave) /.test(p.scope || '') ? 1 : /^(tag|branch|remote-site) /.test(p.match || '') ? 2 : /\*/.test(p.match || '') ? 3 : 4;
export function evalPolicies(est, policies = []) {
  const live = policies.filter(p => p.state !== 'draft');
  const ordered = live.map((p, i) => ({ ...p, rank: RANK(p), i })).sort((x, y) => x.rank - y.rank || x.i - y.i);
  const byConn = new Map(), conflicts = [];
  for (const p of ordered) {
    const r = (est.regionsList || []).find(x => p.scope === `${x.cloud} ${x.region}`);
    if (!r) continue;
    const k = r.region, c = byConn.get(k) || { key: k, region: r.region, label: `${r.cloud} ${r.region}`, rules: [] };
    for (const pick of p.path || []) c.rules.push({ text: pick, from: p.name });
    for (const rr of ROUTE_RULES) { const v = (p.route || {})[`${rr.section}:${rr.id}`] || {};
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

// ---- The policy engine, evaluated (2026-10-01: "not a real policy engine") ----
// A flow is { from, to, tag }: from a private cloud, a site or a tag; to a cloud region (its label) or 'the Internet'.
const CLOUD_LABEL = /^(AWS|Azure|GCP|Oracle|CoreWeave) /;
const glob = (pat, s) => new RegExp('^' + String(pat).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(s);
function sideA(p, f) {
  const m = p.match || '';
  if (m === f.from) return true;
  if (/^tag /.test(m)) return !!f.tag && m.slice(4) === f.tag;
  if (/^region /.test(m)) return CLOUD_LABEL.test(f.to) && glob(m.slice(7), f.to.split(' ').slice(1).join(' '));
  return false;
}
function sideB(p, f) {
  const sc = p.scope || 'any cloud';
  if (sc === f.to) return true;
  if (sc === 'any cloud') return CLOUD_LABEL.test(f.to);
  if (sc === 'the Internet') return f.to === 'the Internet';
  return false;
}
/** What a policy sets, layer by layer, and whether it denies or allows routes. */
function contributions(p) {
  const out = [];
  for (const q of String(p.req || '').split(' and ').map(x => x.trim()).filter(Boolean)) out.push({ layer: layerOfReq(q), text: q });
  for (const g of SERVICE_GROUPS) for (const o of g.opts) if ((p.path || []).includes(o.label)) out.push({ layer: o.layer, text: o.label });
  let deny = false, allow = false;
  for (const rr of ROUTE_RULES) { const v = (p.route || {})[`${rr.section}:${rr.id}`] || {};
    for (const [dir, word] of [['o2p', 'on premise → partner'], ['p2o', 'partner → on premise']]) if (v[dir]) {
      // Only denying the matching routes stops the flow; blocking a default route or filtering CVs shapes it.
      if (rr.section === 'deny' && rr.id === 'matching-routes') deny = true; if (rr.section === 'allow' && rr.id === 'matching-routes') allow = true;
      out.push({ layer: 'edge', text: `${({ deny: 'Deny', manip: 'Apply', allow: 'Allow', advanced: 'Apply' })[rr.section]} ${rr.label.toLowerCase()} (${word})` }); } }
  return { out, deny, allow };
}
/** Precedence: an explicit priority, then the most specific, then deny before allow, then the order written. */
const precedence = (ps) => ps.map((p, i) => ({ p, i, c: contributions(p), rank: RANK(p) }))
  .sort((x, y) => (x.p.priority ?? 99) - (y.p.priority ?? 99) || x.rank - y.rank || (y.c.deny - x.c.deny) || x.i - y.i);
export function effectivePolicy(est, policies, flow) {
  const live = policies.filter(p => p.state !== 'draft');
  const ranked = precedence(live), layers = {}, trace = [];
  let verdict = 'Allowed', decidedBy = '';
  for (const { p, c } of ranked) {
    if (!(sideA(p, flow) && sideB(p, flow))) { trace.push({ name: p.name, result: 'Does not match' }); continue; }
    let won = false, blocker = '';
    if (c.deny && verdict !== 'Denied') { verdict = 'Denied'; decidedBy = p.name; won = true; }
    for (const x of c.out) { if (!layers[x.layer]) { layers[x.layer] = { text: x.text, by: p.name }; won = true; } else if (layers[x.layer].by !== p.name && !blocker) blocker = layers[x.layer].by; }
    if (won && !decidedBy) decidedBy = p.name;
    trace.push({ name: p.name, result: won ? 'Won' : `Overridden by ${blocker || decidedBy}` });
  }
  return { verdict, decidedBy: decidedBy || 'No policy: the default path', trace,
    layers: POLICY_LAYERS.map(l => ({ key: l.key, label: l.label, text: (layers[l.key] || {}).text || 'Default', by: (layers[l.key] || {}).by || '' })) };
}
/** The flows the engine checks: every private cloud, data center and tag against every region and the Internet. */
export function engineFlows(est, policies = []) {
  const sites = est.sites || [];
  const froms = [...sites.filter(st => st.colo && st.colo.kind === 'Private cloud').map(st => `Private cloud · ${st.colo.provider} ${st.colo.facility}, ${st.metro}`),
    ...sites.filter(st => /\bDC\b|data cent/i.test(st.name) && !(st.colo && st.colo.kind === 'Private cloud')).map(st => st.name)];
  const tags = [...new Set(policies.map(p => p.match || '').filter(m => /^tag /.test(m)).map(m => m.slice(4)))];
  const tos = [...(est.regionsList || []).map(r => `${r.cloud} ${r.region}`), 'the Internet'];
  const out = [];
  for (const from of froms) for (const to of tos) for (const tag of ['', ...tags]) out.push({ from, to, tag });
  return out;
}
/** Policies that match some flow and never decide anything, with the policy that most often beats them. */
export function shadowedPolicies(est, policies) {
  const live = policies.filter(p => p.state !== 'draft'), seen = {};
  for (const f of engineFlows(est, live)) for (const t of effectivePolicy(est, live, f).trace) {
    if (t.result === 'Does not match') continue;
    const s = seen[t.name] = seen[t.name] || { won: 0, by: {} };
    if (t.result === 'Won') s.won += 1; else { const b = t.result.replace(/^Overridden by /, ''); s.by[b] = (s.by[b] || 0) + 1; }
  }
  return Object.entries(seen).filter(([, s]) => !s.won).map(([name, s]) => ({ name, by: Object.entries(s.by).sort((a, b) => b[1] - a[1])[0][0] }));
}
/** Per connection: what the policies intend, what the connection has today, and whether they agree. */
export function intendedVsConfigured(est, policies) {
  const byReg = new Map();
  for (const p of policies.filter(x => x.state !== 'draft')) {
    const r = (est.regionsList || []).find(x => p.scope === `${x.cloud} ${x.region}`); if (!r) continue;
    const c = byReg.get(r.region) || { key: r.region, region: r.region, label: `${r.cloud} ${r.region}`, rows: [] };
    for (const x of contributions(p).out) {
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
// NetBond Advanced's four verbs (Allow, Deny, Manipulate, Advertise) in its colors, then what the path asks for, in neutral: three at most.
export function verbBadges(p) {
  const out = [], seen = new Set(), add = (key, label, cls) => { if (!seen.has(key)) { seen.add(key); out.push({ key, label, cls }); } };
  const rt = (p && p.route) || {};
  for (const rr of ROUTE_RULES) { const v = rt[`${rr.section}:${rr.id}`] || {}; if (!(v.o2p || v.p2o)) continue;
    if (rr.section === 'deny') add('deny', 'Deny', 'deny'); else if (rr.section === 'allow') add('allow', 'Allow', 'allow'); else if (rr.section === 'manip') add('manip', 'Manipulate', 'manip'); else add('adv', 'Advertise', 'adv'); }
  const words = [String((p && p.req) || ''), ...((p && p.path) || []), ...Object.values(policyLayers(p))].join(' · ').toLowerCase();
  if (/private path|never the internet|via the at&t|no direct internet|two paths|active\/active|fail over|private on-ramp/.test(words)) add('path', 'Path', '');
  if (/inspect|ngfw|ids\/ips|proxy|firewall|ddos/.test(words)) add('inspect', 'Inspect', '');
  if (/segment/.test(words)) add('segment', 'Segment', '');
  if (/latency slo/.test(words)) add('slo', 'SLO', '');
  if (/egress/.test(words)) add('egress', 'Egress', '');
  if (/encrypt/.test(words)) add('encrypt', 'Encrypt', '');
  if (/zero-trust|private access/.test(words)) add('access', 'Access', '');
  if (/cost-aware/.test(words)) add('cost', 'Cost', '');
  return out.slice(0, 3);
}
/** Every glyph the app binds by name; tests/icons.test.mjs checks each is on disk. */
export const ICON_NAMES = [...new Set([...Object.values(LAYER_ICON), 'hybrid-cloud', 'tag', 'large-building', 'globe', 'global-network', 'cloud', 'target'])];

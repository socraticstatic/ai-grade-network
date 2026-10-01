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
  { key: 'pci', name: 'PCI, end to end', match: 'tag PCI', why: 'Card data never touches the internet, from the store to the subnet.',
    layers: { site: 'AVPN or Switched Ethernet, no internet breakout', edge: 'Inspect at the AT&T edge', core: 'Private path required', cloud: 'PCI subnets only' } },
  { key: 'remote', name: 'Remote sites to cloud', match: 'remote-site any', why: 'Remote sites reach the cloud through AT&T, not around it.',
    layers: { site: 'SD-WAN or Third Party Access tunnels to the AT&T edge', edge: 'Terminate tunnels at the AT&T edge', core: 'No direct internet path', cloud: 'Private on-ramp into the region' } },
  { key: 'gpu', name: 'AI and GPU traffic', match: 'tag AI', why: 'Training data moves on capacity that is sized and measured for it.',
    layers: { site: 'Data centers on 10G Switched Ethernet', edge: 'Dedicated 10G on-ramp port', core: 'Latency SLO 15 ms', cloud: 'GPU regions on a private path' } },
  { key: 'inet', name: 'Internet-facing apps', match: 'tag Internet-facing', why: 'What faces the internet is inspected once, at the edge, for every cloud.',
    layers: { site: 'No local internet breakout', edge: 'DDoS protection and inline inspection', core: 'Egress through AT&T, never direct', cloud: 'Public subnets behind the edge' } },
  { key: 'fin', name: 'Finance stays segmented', match: 'branch Finance', why: 'Finance traffic has its own lane at every hop.',
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

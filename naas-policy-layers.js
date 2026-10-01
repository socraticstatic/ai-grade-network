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

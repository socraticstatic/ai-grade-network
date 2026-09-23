/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The things a path passes through, one per segment: Access | Edge | Core | Edge | Access.
// Each thing has an owner - whoever holds its SLA - and a path is the chain of
// things it uses. Paths that use the same thing meet at it, so shared kit shows.
// Pure functions, no DOM.
//
// Owners: 'att', 'third' (another carrier or an exchange), 'cloud' (the
// hyperscaler's own kit). A customer's own cross-connect is not a thing in a
// segment; it is a cable on a handoff between two of them (see heroLayout).

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const T = (id, label, owner, name) => ({ id, label, owner, name: name || label });

/** Site-side Access: the circuit from the site into a network. Null for a site on the public internet. */
export function accessThing(site) {
  if (!site || !site.priv) return null;
  const a = site.circuit || site.access || '';
  if (site.accessSla === 'third') return T('a:' + slug(a), a, 'third', `${a}, bought from ${site.carrier || 'a third party'}`);
  if (site.carrier) return T('a:offnet-' + slug(site.carrier), `${site.carrier} off-net`, 'att', `${site.carrier} circuit ordered by AT&T (off-net)`);
  if (/ASE/.test(a)) return T('a:ase', 'ASE access', 'att', 'AT&T Switched Ethernet access');
  if (/AVPN/.test(a)) return T('a:avpn', 'AVPN access', 'att', 'AT&T VPN access circuit');
  if (/ABF|Business Fiber/.test(a)) return T('a:abf', 'Business Fiber', 'att', 'AT&T Business Fiber');
  if (/Mobility|wireless/i.test(a)) return T('a:wireless', 'AT&T wireless', 'att', 'AT&T wireless (Private Mobile Connection)');
  if (/ADI|Dedicated Internet/.test(a)) return T('a:adi', 'Dedicated Internet', 'att', 'AT&T Dedicated Internet');
  return T('a:' + slug(a), a || 'AT&T access', 'att');
}

/** Site-side Edge: where the circuit lands and the traffic gets its service. */
export function edgeThing(site) {
  if (!site || !site.priv) return null;
  if (site.core === 'third') { const c = site.carrier || site.viaRamp || 'Third-party'; return T('e:' + slug(c), `${c} edge`, 'third', `${c} provider edge`); }
  if (site.carrier && site.accessSla !== 'third') return T('e:enni', 'ENNI', 'att', 'AT&T ENNI (where another carrier hands off to AT&T)');
  return T('e:pe', 'AT&T PE', 'att', 'AT&T provider edge router');
}

/** Core: the backbone between edges. */
export function coreThing(site) {
  if (site && site.core === 'third') { const c = site.carrier || site.viaRamp || 'Third-party'; return T('c:' + slug(c), `${c} core`, 'third', `${c} backbone`); }
  return T('c:att', 'AT&T backbone', 'att', 'AT&T MPLS backbone');
}

const RAMP_THING = {
  NetBond: ['NetBond', 'att', 'AT&T NetBond (the IPE)'],
  DX: ['Direct Connect', 'cloud', 'AWS Direct Connect'],
  ER: ['ExpressRoute', 'cloud', 'Azure ExpressRoute'],
  Interconnect: ['Interconnect', 'cloud', 'Google Cloud Interconnect'],
  EQX: ['Equinix Fabric', 'third'],
};
/** Cloud-side Edge: the on-ramp into the cloud. A third-party core reaches it over its carrier's own on-ramp. */
export function cloudEdgeThing(region, viaCarrier) {
  if (viaCarrier) return T('ce:' + slug(viaCarrier), `${viaCarrier} on-ramp`, 'third', `${viaCarrier} Cloud Connect, ${viaCarrier}'s own cloud on-ramp`);
  const r = RAMP_THING[region && region.ramp];
  if (!r) return T('ce:private', 'Private on-ramp', 'cloud');
  return { ...T('ce:' + slug(region.ramp), r[0], r[1], r[2]), cloud: r[1] === 'cloud' ? region.cloud : undefined };
}

const CLOUD_THING = {
  AWS: ['AWS gateway', 'AWS Direct Connect gateway'],
  Azure: ['Azure gateway', 'Azure ExpressRoute virtual network gateway'],
  GCP: ['GCP router', 'Google Cloud Router'],
  Oracle: ['Oracle DRG', 'Oracle dynamic routing gateway'],
};
/** Cloud-side Access: the cloud's own port into its network. One per cloud. */
export function cloudAccessThing(region) {
  const c = (region && region.cloud) || 'Cloud';
  const t = CLOUD_THING[c];
  return { ...T('ca:' + slug(c), t ? t[0] : c, 'cloud', t ? t[1] : `${c}'s own network`), cloud: c };
}

/** The chain of things a site's traffic takes to Core. */
export const siteChain = (site) => (site && site.priv ? [accessThing(site), edgeThing(site), coreThing(site)] : null);

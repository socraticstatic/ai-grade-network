/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The existing customer's journey on the portal's data (drop 2, 2026-10-12; Micah: "There's no task flow in the mvp.
// No journey. No visuals."). Six beats over the contract's three lists: what AT&T carries today (circuits by service),
// a cloud read read-only, what it found (regions with the AT&T join, VPCs, subnets, bytes when sent), what it needs,
// how to connect, the request. Pure: words and numbers only; naas-portal-app.js draws the stage and holds the state.
import * as P from './naas-portal.js';
import * as S from './naas-sites.js';
import * as W from './naas-ways.js';

export const BEATS = [
  { key: 'today', label: 'Today', short: 'Today', icon: 'home', title: 'Your network on AT&T' },
  { key: 'source', label: 'Add a source', short: 'Source', icon: 'plus', title: 'Read a cloud account' },
  { key: 'found', label: 'What it found', short: 'Found', icon: 'search', title: 'What it found' },
  { key: 'intent', label: 'Intent', short: 'Intent', icon: 'target', title: 'What it needs' },
  { key: 'recommend', label: 'Recommendation', short: 'Recommend', icon: 'lightbulb', title: 'How to connect' },
  { key: 'request', label: 'Request', short: 'Request', icon: 'shopping-bag', title: 'The request' },
];
/** The portal's service codes on the storefront's service table (glyph, ink, words). */
export const SERVICE_KEY = { AVPN: 'avpn', ASEoD: 'aseod', ADI: 'adi', ABF: 'abf' };
const GLYPHS = 20;
/** What AT&T carries today: circuits by service, with a sample of glyphs (largest remainder, so 20 add up) and the exact count. */
export function todayOf(circuits = []) {
  const order = Object.keys(SERVICE_KEY);
  // A code the contract does not name (a feed's "ASE", say) groups as Other, so the count never sits over an empty grid.
  const other = circuits.filter(c => !order.includes(c.service)).length, tpa = S.SERVICE.tpa;
  const groups = order.map(key => { const v = S.SERVICE[SERVICE_KEY[key]], n = circuits.filter(c => c.service === key).length;
    return { key, label: v.short, full: v.name, icon: v.icon, ink: v.ink, n, nF: n.toLocaleString('en-US') }; })
    .concat(other ? [{ key: 'Other', label: 'Other', full: 'A service the portal did not name', icon: tpa.icon, ink: tpa.ink, n: other, nF: other.toLocaleString('en-US') }] : []).filter(g => g.n > 0);
  const total = circuits.length || 1, want = Math.min(GLYPHS, circuits.length);
  const raw = groups.map(g => ({ g, exact: want * g.n / total }));
  const base = raw.map(x => ({ ...x, k: Math.floor(x.exact), rem: x.exact - Math.floor(x.exact) }));
  let left = want - base.reduce((a, x) => a + x.k, 0);
  for (const x of [...base].sort((a, b) => b.rem - a.rem)) { if (left <= 0) break; x.k += 1; left -= 1; }
  const cells = base.flatMap(x => Array.from({ length: x.k }, (_, i) => ({ key: `${x.g.key}-${i}`, group: x.g.key, icon: x.g.icon, ink: x.g.ink, title: `${x.g.full}: ${x.g.nF} circuits`, d: `${(i * 25) % 400}ms` })));
  return { circuits: circuits.length, sites: new Set(circuits.map(c => c.siteId)).size, networks: P.networksOf(circuits).filter(n => n.id).length, groups, cells };
}
/** The clouds a source can read. */
export const PROVIDERS = [
  { key: 'Azure', name: 'Microsoft Azure', cred: 'Reader role on the subscription' },
  { key: 'AWS', name: 'AWS', cred: 'Read-only IAM role' },
  { key: 'GCP', name: 'Google Cloud', cred: 'Viewer role on the project' },
  { key: 'Oracle', name: 'Oracle Cloud', cred: 'Read-only policy on the tenancy' },
];
export const providersOf = (discovery = [], theme = 'light') => PROVIDERS.map(p => ({ ...p, mark: W.markFor(p.key, theme), live: discovery.some(d => P.cspOf(d.csp) === p.key) }));
const attWord = (j) => (j.on ? `On AT&T · ${j.via.pop ? `${j.via.pop.provider} ${j.via.pop.facility}` : P.regionName(j.via.region)}` : j.cspOnly ? `AT&T · ${P.cspOf(j.cspLink.csp)} at ${j.cspLink.pop ? j.cspLink.pop.metro : 'a POP'}` : 'Not on AT&T');
/** What the read found on one cloud: its regions with the AT&T join, VPCs, subnets, bytes out when sent. */
export function foundOf(data, cloud, theme = 'light') {
  const key = P.cspOf(cloud), join = P.attJoin(data.cloudLinks || [], data.discovery || []);
  const regs = (data.discovery || []).filter(d => P.cspOf(d.csp) === key);
  const regions = regs.map(r => { const j = join.get(`${r.csp}/${r.region}`) || { on: false, cspOnly: false };
    return { key: `${r.csp}/${r.region}`, csp: r.csp, region: r.region, label: P.regionName(r.region), vpcs: r.vpcs.length, subnets: r.vpcs.reduce((a, v) => a + v.subnets.length, 0), on: j.on, att: attWord(j), bytesOut: r.bytesOut, bytesIn: r.bytesIn }; });
  const bytes = regions.some(r => typeof r.bytesOut === 'number') ? regions.reduce((a, r) => a + (r.bytesOut || 0), 0) : undefined;
  return { has: regions.length > 0, key, name: W.CLOUD_NAME[key] || cloud, mark: W.markFor(key, theme), hosted: W.hostedWord(key), regions, vpcs: regions.reduce((a, r) => a + r.vpcs, 0), subnets: regions.reduce((a, r) => a + r.subnets, 0), bytesOut: bytes, notOn: regions.filter(r => !r.on).length };
}
const n = (x) => Number(x || 0).toLocaleString('en-US');
/** One sentence a beat, nine words or fewer. */
export function lineOf(beat, ctx = {}) {
  const r = ctx.region, f = ctx.found;
  switch (beat) {
    case 'today': return `AT&T already carries your ${n(ctx.today ? ctx.today.circuits : 0)} circuits.`;
    case 'source': return 'Read a cloud account. Read only.';
    case 'found': return f && f.has ? `${f.key}: ${n(f.regions.length)} ${f.regions.length === 1 ? 'region' : 'regions'}, ${n(f.vpcs)} ${f.hosted}s, ${n(f.subnets)} subnets.` : `Nothing found on ${ctx.cloud || (f && f.key) || 'that cloud'} yet.`;
    case 'intent': return r ? `What ${r.label} needs.` : 'What it needs.';
    case 'recommend': return r ? `How to connect ${r.label}.` : 'How to connect it.';
    case 'request': return r && ctx.way ? `Requested ${ctx.way} for ${r.label}.` : 'Request it.';
    default: return '';
  }
}

/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The portal MVP page's logic (2026-10-12): state to view values for portal.dc.html, the way naas-app.js does for the
// storefront, for four pages on the data the portal has (naas-portal.js). Nothing here reads the concept app.
// Spec: docs/superpowers/specs/2026-10-12-portal-mvp-design.md.
import * as P from './naas-portal.js';

export const PAGES = [
  { key: 'lastmile', label: 'Last mile', icon: 'router' },
  { key: 'links', label: 'Cloud connections', icon: 'cable' },
  { key: 'discovery', label: 'Cloud discovery', icon: 'cloud' },
  { key: 'recommended', label: 'Recommended', icon: 'lightbulb' },
];
export function defaults() {
  return { page: 'lastmile', fixture: 'calloway', stateB: false, theme: 'light', drawer: null, trail: [], pick: null, answers: {}, requests: [], region: null };
}
/** URL to state: ?fixture=calloway|scale, ?state=a|b, ?page=<key>, ?theme=light|dark. `search` is for tests. */
export function init(c, search) {
  const q = new URLSearchParams(search !== undefined ? search : (typeof window !== 'undefined' && window.location ? window.location.search : ''));
  const patch = {};
  if (q.get('fixture') && P.FIXTURES[q.get('fixture')]) patch.fixture = q.get('fixture');
  if (q.get('state') === 'b') patch.stateB = true;
  if (q.get('state') === 'a') patch.stateB = false;
  if (q.get('page') && PAGES.some(p => p.key === q.get('page'))) patch.page = q.get('page');
  if (q.get('theme') === 'dark' || q.get('theme') === 'light') patch.theme = q.get('theme');
  c.setState(patch);
}
export const fixtureOf = (s) => P.FIXTURES[s.fixture] || P.FIXTURES.calloway;
/** State B is the note's "maybe" fields; state A strips them so the page proves it stands without them. */
export function dataOf(s) {
  const f = fixtureOf(s);
  if (s.stateB) return f;
  const strip = (o, keys) => { const x = { ...o }; for (const k of keys) delete x[k]; return x; };
  return { ...f,
    circuits: f.circuits.map(c => strip(c, ['health', 'peakMbps', 'p95Mbps'])),
    cloudLinks: f.cloudLinks.map(l => strip(l, ['region', 'service', 'network'])),
    discovery: f.discovery.map(d => ({ ...strip(d, ['bytesIn', 'bytesOut']), vpcs: d.vpcs.map(v => ({ ...v, subnets: v.subnets.map(sn => strip(sn, ['affinity', 'bytesIn', 'bytesOut'])) })) })) };
}
const n = (x) => Number(x || 0).toLocaleString('en-US');
export function vals(c) {
  const s = c.state, set = (p) => c.setState(p), f = fixtureOf(s), d = dataOf(s), dark = s.theme === 'dark';
  const iconDir = dark ? 'brand/icons-dark' : 'brand/icons-light', iconLink = dark ? 'brand/icons-linkdark' : 'brand/icons-link';
  const rail = PAGES.map(p => { const cur = s.page === p.key; return { key: p.key, label: p.label, cur, icon: `${cur ? iconLink : iconDir}/${p.icon}.svg`,
    bg: cur ? 'var(--sidebar-accent)' : 'transparent', color: cur ? 'var(--sidebar-fg)' : 'var(--sidebar-muted)', radius: cur ? '8px' : '4px', go: () => set({ page: p.key, drawer: null, trail: [] }) }; });
  const nets = P.networksOf(d.circuits);
  const join = P.attJoin(d.cloudLinks, d.discovery);
  const page = PAGES.find(p => p.key === s.page) || PAGES[0];
  return {
    theme: s.theme, themeIsLight: !dark, themeIsDark: dark, themeTitle: dark ? 'Light mode' : 'Dark mode', toggleTheme: () => set({ theme: dark ? 'light' : 'dark' }),
    iconDir, rail, pageTitle: page.label, pgLastmile: s.page === 'lastmile', pgLinks: s.page === 'links', pgDiscovery: s.page === 'discovery', pgRecommended: s.page === 'recommended',
    fixture: s.fixture, fixtureName: f.name, synthetic: !!f.synthetic, stateB: !!s.stateB, stateValue: s.stateB ? 'b' : 'a',
    setFixture: (e) => set({ fixture: P.FIXTURES[e.target.value] ? e.target.value : 'calloway', drawer: null, trail: [], region: null, pick: null }),
    setStateB: (e) => set({ stateB: e.target.value === 'b' }),
    counts: { circuits: n(d.circuits.length), networks: n(nets.filter(x => x.id).length), sites: n(new Set(d.circuits.map(x => x.siteId)).size), links: n(d.cloudLinks.length), regions: n(d.discovery.length),
      onAtt: n([...join.values()].filter(j => j.on).length) },
    data: d, nets, join,
  };
}

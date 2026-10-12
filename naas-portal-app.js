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
import * as W from './naas-ways.js';

export const PAGES = [
  { key: 'lastmile', label: 'Last mile', icon: 'router' },
  { key: 'links', label: 'Cloud connections', icon: 'cable' },
  { key: 'discovery', label: 'Cloud discovery', icon: 'cloud' },
  { key: 'recommended', label: 'Recommended', icon: 'lightbulb' },
];
export function defaults() {
  return { page: 'lastmile', fixture: 'calloway', stateB: false, theme: 'light', drawer: null, trail: [], lmPage: 0, clPage: 0, dtrail: [], dPage: 0, pick: null, answers: {}, requests: [], region: null };
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
const DASH = '–';
/** Mbps as the storefront says it: 1 Gbps, 500 Mbps. */
export const bw = (mbps) => (mbps === undefined || mbps === null ? DASH : mbps >= 1000 ? `${Math.round(mbps / 100) / 10} Gbps` : `${n(mbps)} Mbps`);
const HEALTH_WORD = { ok: 'OK', down: 'Down' };
// Rows a page holds at 1440x900: header 64, page padding 16, head row 40 + 16, table header 42, pager 36, bottom 16;
// a row is 42 (12px padding, 18px line). (900 - 230) / 42 = 15.
export const PAGE_ROWS = 15;
const pageOf = (rows, page, size, set, key) => {
  const pages = Math.max(1, Math.ceil(rows.length / size)), p = Math.max(0, Math.min(pages - 1, page || 0)), from = p * size;
  return { rows: rows.slice(from, from + size), pageRows: size, page: p, pages, pager: rows.length ? `${from + 1}–${Math.min(rows.length, from + size)} of ${rows.length}` : 'None',
    hasPrev: p > 0, hasNext: p < pages - 1, hasPrevOff: !(p > 0), hasNextOff: !(p < pages - 1), prev: () => set({ [key]: Math.max(0, p - 1) }), next: () => set({ [key]: Math.min(pages - 1, p + 1) }) };
};
const cellsOf = (row, cols, text) => cols.filter(c => c.present).map(c => ({ key: c.key, text: text(c.key, row), cls: c.cls || '', ink: c.ink ? c.ink(row) : '', isCloud: c.key === 'cloud' }));
/** Last mile: the networks (level one), or one network's circuits grouped by state (level two). Pure: data in, view out. */
export function lastmile(d, s, set) {
  const nets = P.networksOf(d.circuits);
  const netId = s.trail && s.trail.length ? s.trail[0] : undefined;
  const back = () => set({ trail: [], lmPage: 0 });
  if (netId === undefined) {
    const rows = nets.map(x => { const down = x.circuits.filter(c => c.health === 'down').length, p95 = x.circuits.filter(c => typeof c.p95Mbps === 'number');
      return { key: String(x.id), id: x.id, name: x.name, service: [...new Set(x.circuits.map(c => c.service))].sort().join(' · '), circuits: x.circuits.length, sites: x.sites, states: x.states.length,
        bandwidthMbps: x.circuits.reduce((a, c) => a + c.bandwidthMbps, 0), down: x.circuits.some(c => c.health !== undefined) ? down : undefined,
        p95: p95.length ? Math.round(100 * p95.reduce((a, c) => a + c.p95Mbps / c.bandwidthMbps, 0) / p95.length) : undefined, go: () => set({ trail: [x.id], lmPage: 0 }) }; });
    const cols = P.columnsFor(rows, [['name', 'Network'], ['service', 'Service'], ['circuits', 'Circuits'], ['sites', 'Sites'], ['states', 'States'], ['bandwidthMbps', 'Bandwidth'], ['down', 'Down'], ['p95', 'p95']])
      .map(c => ({ ...c, cls: ['circuits', 'sites', 'states', 'bandwidthMbps', 'down', 'p95'].includes(c.key) ? 'num' : c.key === 'name' ? 'dt-name' : '', ink: c.key === 'down' ? (r) => (r.down ? 'var(--error)' : '') : null }));
    const text = (k, r) => k === 'bandwidthMbps' ? bw(r.bandwidthMbps) : k === 'p95' ? (r.p95 === undefined ? DASH : `${r.p95}%`) : k === 'down' ? (r.down === undefined ? DASH : r.down ? n(r.down) : 'None') : ['circuits', 'sites', 'states'].includes(k) ? n(r[k]) : String(r[k]);
    const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text), click: true })), s.lmPage, PAGE_ROWS, set, 'lmPage');
    return { level: 'networks', trail: [{ key: 'root', label: 'Last mile', go: back, last: true }], hasTrail: false, cols, ...pg };
  }
  const net = nets.find(x => String(x.id) === String(netId)) || { id: null, name: 'No network', circuits: [] };
  const sorted = [...net.circuits].sort((a, b) => a.address.state.localeCompare(b.address.state) || a.address.city.localeCompare(b.address.city) || a.siteId.localeCompare(b.siteId));
  const rows = sorted.map((c, i) => ({ key: c.siteId + ':' + i, state: c.address.state, stateText: i === 0 || sorted[i - 1].address.state !== c.address.state ? c.address.state : '', siteId: c.siteId, address: `${c.address.city}, ${c.address.state}`,
    service: c.service, bandwidthMbps: c.bandwidthMbps, health: c.health, peakMbps: c.peakMbps, p95Mbps: c.p95Mbps }));
  const cols = P.columnsFor(rows, [['state', 'State'], ['siteId', 'Site'], ['address', 'Address'], ['service', 'Service'], ['bandwidthMbps', 'Bandwidth'], ['health', 'Health'], ['peakMbps', 'Peak'], ['p95Mbps', 'p95']])
    .map(c => ({ ...c, cls: ['bandwidthMbps', 'peakMbps', 'p95Mbps'].includes(c.key) ? 'num' : c.key === 'siteId' ? 'mono' : c.key === 'state' ? 'dt-name' : '', ink: c.key === 'health' ? (r) => (r.health === 'down' ? 'var(--error)' : '') : null }));
  const text = (k, r) => k === 'state' ? r.stateText : ['bandwidthMbps', 'peakMbps', 'p95Mbps'].includes(k) ? bw(r[k]) : k === 'health' ? (r.health === undefined ? DASH : HEALTH_WORD[r.health] || r.health) : (r[k] === undefined || r[k] === null ? DASH : String(r[k]));
  // The state is named once per group, so the page break re-names it on the next page.
  const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text), click: false })), s.lmPage, PAGE_ROWS, set, 'lmPage');
  if (pg.rows.length && !pg.rows[0].stateText) { pg.rows[0] = { ...pg.rows[0], cells: pg.rows[0].cells.map(x => (x.key === 'state' ? { ...x, text: pg.rows[0].state } : x)) }; }
  return { level: 'circuits', trail: [{ key: 'root', label: 'Last mile', go: back, last: false }, { key: 'net', label: net.name, go: () => {}, last: true }], hasTrail: true, cols, ...pg };
}
/** Cloud connections: one row per AT&T cloud connection. Region comes from the lookup (or the link's own), else Unmapped. */
export function links(d, s, set) {
  const dark = s.theme === 'dark';
  const popWord = (pop) => pop ? [pop.provider, pop.facility].filter(Boolean).join(' ') + (pop.metro ? ` · ${pop.metro}` : '') : DASH;
  const rows = d.cloudLinks.map((l, i) => { const regions = l.region ? [P.regionName(l.region)] : P.regionsOfPop(l.csp, l.pop);
    return { key: `${l.csp}-${i}`, csp: l.csp, cloud: W.CLOUD_NAME[l.csp] || l.csp, mark: W.markFor(l.csp, dark ? 'dark' : 'light'), pop: popWord(l.pop), regions, region: regions.length ? regions.join(', ') : 'Unmapped', unmapped: !regions.length,
      bandwidthMbps: l.bandwidthMbps, service: l.service, network: l.network ? `${l.network.id} · ${l.network.name}` : undefined }; })
    .sort((a, b) => a.csp.localeCompare(b.csp) || a.pop.localeCompare(b.pop));
  const cols = P.columnsFor(rows, [['cloud', 'Cloud'], ['pop', 'POP'], ['region', 'Region'], ['bandwidthMbps', 'Bandwidth'], ['service', 'Service'], ['network', 'Network']])
    .map(c => ({ ...c, cls: c.key === 'bandwidthMbps' ? 'num' : c.key === 'cloud' ? 'dt-name' : '', ink: c.key === 'region' ? (r) => (r.unmapped ? 'var(--text-light)' : '') : null }));
  const text = (k, r) => k === 'bandwidthMbps' ? bw(r.bandwidthMbps) : (r[k] === undefined || r[k] === null ? DASH : String(r[k]));
  const reached = new Set(rows.flatMap(r => r.regions));
  const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text), click: false })), s.clPage, PAGE_ROWS, set, 'clPage');
  return { counts: { links: n(rows.length), clouds: n(new Set(rows.map(r => r.csp)).size), regions: n(reached.size) }, cols, ...pg, empty: !rows.length, hasRows: rows.length > 0, emptyLine: 'No AT&T cloud connection yet.' };
}
/** Bytes in the unit that fits: 500 MB, 7.5 GB, 3.2 TB. */
export function fmtBytes(b) {
  if (b === undefined || b === null) return DASH;
  const u = [['TB', 1e12], ['GB', 1e9], ['MB', 1e6], ['KB', 1e3]].find(([, k]) => b >= k);
  if (!u) return `${n(b)} B`;
  const v = b / u[1]; return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10} ${u[0]}`;
}
const AFFINITY_WORD = (a, csp) => (a === 'att' ? 'AT&T' : a === 'csp' ? (W.CLOUD_NAME[csp] || csp).replace('Microsoft ', '') : a === 'other' ? 'Other telco' : DASH);
/** Cloud discovery: regions (level one, each saying how it reaches AT&T), a region's VPCs, a VPC's subnets. */
export function discovery(d, s, set) {
  const dark = s.theme === 'dark', trail = s.dtrail || [], join = P.attJoin(d.cloudLinks, d.discovery);
  const regionLabel = (r) => `${r.csp} · ${P.regionName(r.region)}`;
  const root = { key: 'root', label: 'Cloud discovery', go: () => set({ dtrail: [], dPage: 0 }), last: trail.length === 0 };
  const attWord = (j) => j.on ? `On AT&T · ${j.via.pop ? `${j.via.pop.provider} ${j.via.pop.facility}` : P.regionName(j.via.region)}` : j.cspOnly ? `AT&T · ${j.cspLink.csp} at ${j.cspLink.pop ? j.cspLink.pop.metro : 'a POP'}` : 'Not on AT&T';
  if (!trail.length) {
    const rows = d.discovery.map(r => { const j = join.get(`${r.csp}/${r.region}`), key = `${r.csp}/${r.region}`;
      return { key, csp: r.csp, regionKey: r.region, cloud: W.CLOUD_NAME[r.csp] || r.csp, mark: W.markFor(r.csp, dark ? 'dark' : 'light'), region: P.regionName(r.region), vpcs: r.vpcs.length, subnets: r.vpcs.reduce((a, v) => a + v.subnets.length, 0),
        att: attWord(j), on: j.on, canConnect: !j.on && !j.cspOnly, bytesIn: r.bytesIn, bytesOut: r.bytesOut,
        go: () => set({ dtrail: [key], dPage: 0 }), connect: () => set({ page: 'recommended', region: { csp: r.csp, region: r.region }, trail: [], dtrail: [] }) }; })
      .sort((a, b) => a.csp.localeCompare(b.csp) || a.region.localeCompare(b.region));
    const cols = P.columnsFor(rows, [['cloud', 'Cloud'], ['region', 'Region'], ['vpcs', 'VPCs'], ['subnets', 'Subnets'], ['att', 'AT&T'], ['bytesIn', 'Bytes in'], ['bytesOut', 'Bytes out']])
      .map(c => ({ ...c, cls: ['vpcs', 'subnets', 'bytesIn', 'bytesOut'].includes(c.key) ? 'num' : c.key === 'cloud' ? 'dt-name' : '', ink: c.key === 'att' ? (r) => (r.on ? '' : 'var(--text-light)') : null }));
    if (rows.some(r => r.canConnect)) cols.push({ key: 'act', label: '', present: true, cls: 'num' });
    const text = (k, r) => ['bytesIn', 'bytesOut'].includes(k) ? fmtBytes(r[k]) : ['vpcs', 'subnets'].includes(k) ? n(r[k]) : k === 'act' ? '' : String(r[k]);
    const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text).map(x => ({ ...x, isAct: x.key === 'act' })), click: true })), s.dPage, PAGE_ROWS, set, 'dPage');
    return { level: 'regions', trail: [root], hasTrail: false, cols, ...pg, counts: { regions: n(rows.length), onAtt: n(rows.filter(r => r.on).length), vpcs: n(rows.reduce((a, r) => a + r.vpcs, 0)), subnets: n(rows.reduce((a, r) => a + r.subnets, 0)) } };
  }
  const reg = d.discovery.find(r => `${r.csp}/${r.region}` === trail[0]) || { csp: '', region: '', vpcs: [] };
  const regCrumb = { key: 'reg', label: regionLabel(reg), go: () => set({ dtrail: [trail[0]], dPage: 0 }), last: trail.length === 1 };
  if (trail.length === 1) {
    const rows = reg.vpcs.map(v => ({ key: v.id, id: v.id, name: v.name, subnets: v.subnets.length, bytesIn: v.subnets.some(x => x.bytesIn !== undefined) ? v.subnets.reduce((a, x) => a + (x.bytesIn || 0), 0) : undefined,
      bytesOut: v.subnets.some(x => x.bytesOut !== undefined) ? v.subnets.reduce((a, x) => a + (x.bytesOut || 0), 0) : undefined, go: () => set({ dtrail: [trail[0], v.id], dPage: 0 }) }));
    const cols = P.columnsFor(rows, [['id', 'VPC'], ['name', 'Name'], ['subnets', 'Subnets'], ['bytesIn', 'Bytes in'], ['bytesOut', 'Bytes out']]).map(c => ({ ...c, cls: ['subnets', 'bytesIn', 'bytesOut'].includes(c.key) ? 'num' : c.key === 'id' ? 'mono' : c.key === 'name' ? 'dt-name' : '' }));
    const text = (k, r) => ['bytesIn', 'bytesOut'].includes(k) ? fmtBytes(r[k]) : k === 'subnets' ? n(r[k]) : String(r[k]);
    const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text), click: true })), s.dPage, PAGE_ROWS, set, 'dPage');
    return { level: 'vpcs', trail: [{ ...root, last: false }, regCrumb], hasTrail: true, cols, ...pg, counts: { regions: n(d.discovery.length), onAtt: n([...join.values()].filter(j => j.on).length), vpcs: n(reg.vpcs.length), subnets: n(rows.reduce((a, r) => a + r.subnets, 0)) } };
  }
  const vpc = reg.vpcs.find(v => v.id === trail[1]) || { id: trail[1], name: '', subnets: [] };
  const rows = vpc.subnets.map(x => ({ key: x.id, id: x.id, cidr: x.cidr, affinity: x.affinity === undefined ? undefined : AFFINITY_WORD(x.affinity, reg.csp), bytesIn: x.bytesIn, bytesOut: x.bytesOut }));
  const cols = P.columnsFor(rows, [['id', 'Subnet'], ['cidr', 'CIDR'], ['affinity', 'Reaches'], ['bytesIn', 'Bytes in'], ['bytesOut', 'Bytes out']]).map(c => ({ ...c, cls: ['bytesIn', 'bytesOut'].includes(c.key) ? 'num' : ['id', 'cidr'].includes(c.key) ? 'mono' : '' }));
  const text = (k, r) => ['bytesIn', 'bytesOut'].includes(k) ? fmtBytes(r[k]) : (r[k] === undefined ? DASH : String(r[k]));
  const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text), click: false })), s.dPage, PAGE_ROWS, set, 'dPage');
  return { level: 'subnets', trail: [{ ...root, last: false }, { ...regCrumb, last: false }, { key: 'vpc', label: vpc.name || vpc.id, go: () => {}, last: true }], hasTrail: true, cols, ...pg,
    counts: { regions: n(d.discovery.length), onAtt: n([...join.values()].filter(j => j.on).length), vpcs: n(reg.vpcs.length), subnets: n(rows.length) } };
}
export function vals(c) {
  const s = c.state, set = (p) => c.setState(p), f = fixtureOf(s), d = dataOf(s), dark = s.theme === 'dark';
  const iconDir = dark ? 'brand/icons-dark' : 'brand/icons-light', iconLink = dark ? 'brand/icons-linkdark' : 'brand/icons-link';
  const rail = PAGES.map(p => { const cur = s.page === p.key; return { key: p.key, label: p.label, cur, icon: `${cur ? iconLink : iconDir}/${p.icon}.svg`,
    bg: cur ? 'var(--sidebar-accent)' : 'transparent', color: cur ? 'var(--sidebar-fg)' : 'var(--sidebar-muted)', radius: cur ? '8px' : '4px', go: () => set({ page: p.key, drawer: null, trail: [], lmPage: 0, dtrail: [], dPage: 0 }) }; });
  const nets = P.networksOf(d.circuits);
  const join = P.attJoin(d.cloudLinks, d.discovery);
  const page = PAGES.find(p => p.key === s.page) || PAGES[0];
  return {
    theme: s.theme, themeIsLight: !dark, themeIsDark: dark, themeTitle: dark ? 'Light mode' : 'Dark mode', toggleTheme: () => set({ theme: dark ? 'light' : 'dark' }),
    iconDir, rail, pageTitle: page.label, pgLastmile: s.page === 'lastmile', pgLinks: s.page === 'links', pgDiscovery: s.page === 'discovery', pgRecommended: s.page === 'recommended',
    fixture: s.fixture, fixtureName: f.name, synthetic: !!f.synthetic, stateB: !!s.stateB, stateValue: s.stateB ? 'b' : 'a',
    setFixture: (e) => set({ fixture: P.FIXTURES[e.target.value] ? e.target.value : 'calloway', drawer: null, trail: [], lmPage: 0, dtrail: [], dPage: 0, region: null, pick: null }),
    setStateB: (e) => set({ stateB: e.target.value === 'b' }),
    counts: { circuits: n(d.circuits.length), networks: n(nets.filter(x => x.id).length), sites: n(new Set(d.circuits.map(x => x.siteId)).size), links: n(d.cloudLinks.length), regions: n(d.discovery.length),
      onAtt: n([...join.values()].filter(j => j.on).length) },
    data: d, nets, join,
    lm: lastmile(d, s, set),
    cl: links(d, s, set),
    dv: discovery(d, s, set),
  };
}

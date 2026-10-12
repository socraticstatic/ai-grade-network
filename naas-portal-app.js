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
  return { page: 'lastmile', fixture: 'calloway', stateB: false, theme: 'light', drawer: null, trail: [], lmPage: 0, clPage: 0, dtrail: [], dPage: 0, rcPage: 0, pick: null, answers: {}, requests: [], region: null, dataNote: '', dataError: '' };
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
  // ?data=<url>: a JSON in the contract's shape, same origin or CORS-open, becomes the estate on screen.
  const url = q.get('data');
  if (url && typeof fetch === 'function') fetch(url, { cache: 'no-store' })
    .then(r => (r.ok ? r.json().then(j => useData(c, j)) : c.setState({ dataError: `Could not load ${url} (${r.status}).` })))
    .catch(e => c.setState({ dataError: `Could not load ${url} (${/JSON/i.test(String(e)) ? 'not JSON' : 'network'}).` }));
}
/** The team's own JSON, in the contract's shape, installed as the fixture the page reads (`?data=<url>`, or this). */
export function useData(c, json, name) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const obj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const circuitsIn = arr(json && json.circuits), linksIn = arr(json && json.cloudLinks), discIn = arr(json && json.discovery);
  // A row the page cannot draw is skipped and counted, never a crash: a circuit needs a site and a city and state; a link a cloud; a region a cloud and a name.
  const circuits = circuitsIn.filter(x => obj(x) && x.siteId && obj(x.address) && x.address.city && x.address.state && typeof x.bandwidthMbps === 'number').map(x => ({ ...x, network: obj(x.network) && x.network.id ? x.network : null, service: String(x.service || '') }));
  const cloudLinks = linksIn.filter(x => obj(x) && x.csp).map(x => ({ ...x, pop: obj(x.pop) ? x.pop : null, bandwidthMbps: typeof x.bandwidthMbps === 'number' ? x.bandwidthMbps : undefined }));
  const discovery = discIn.filter(x => obj(x) && x.csp && x.region).map(x => ({ ...x, vpcs: arr(x.vpcs).filter(obj).map(v => ({ ...v, id: String(v.id || v.name || ''), name: String(v.name || v.id || ''), subnets: arr(v.subnets).filter(obj) })) }));
  const nm = (json && typeof json.name === 'string' && json.name) || name || 'Your data';
  P.FIXTURES.remote = { name: nm, synthetic: false, circuits, cloudLinks, discovery };
  c.setState({ fixture: 'remote', trail: [], lmPage: 0, clPage: 0, dtrail: [], dPage: 0, rcPage: 0, region: null, pick: null, dataError: '',
    dataNote: `Loaded ${nm}: ${circuits.length} of ${circuitsIn.length} circuits, ${cloudLinks.length} of ${linksIn.length} connections, ${discovery.length} of ${discIn.length} regions read.` });
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
    const ck = P.cspOf(l.csp); return { key: `${l.csp}-${i}`, csp: ck, cloud: W.CLOUD_NAME[ck] || l.csp, mark: W.markFor(ck, dark ? 'dark' : 'light'), pop: popWord(l.pop), regions, region: regions.length ? regions.join(', ') : 'Unmapped', unmapped: !regions.length,
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
  const regionLabel = (r) => `${P.cspOf(r.csp)} · ${P.regionName(r.region)}`;
  const root = { key: 'root', label: 'Cloud discovery', go: () => set({ dtrail: [], dPage: 0 }), last: trail.length === 0 };
  const attWord = (j) => j.on ? `On AT&T · ${j.via.pop ? `${j.via.pop.provider} ${j.via.pop.facility}` : P.regionName(j.via.region)}` : j.cspOnly ? `AT&T · ${P.cspOf(j.cspLink.csp)} at ${j.cspLink.pop ? j.cspLink.pop.metro : 'a POP'}` : 'Not on AT&T';
  if (!trail.length) {
    const rows = d.discovery.map(r => { const j = join.get(`${r.csp}/${r.region}`), key = `${r.csp}/${r.region}`;
      const ck = P.cspOf(r.csp); return { key, csp: ck, regionKey: r.region, cloud: W.CLOUD_NAME[ck] || r.csp, mark: W.markFor(ck, dark ? 'dark' : 'light'), region: P.regionName(r.region), vpcs: r.vpcs.length, subnets: r.vpcs.reduce((a, v) => a + v.subnets.length, 0),
        att: attWord(j), on: j.on, canConnect: !j.on && !j.cspOnly, bytesIn: r.bytesIn, bytesOut: r.bytesOut,
        go: () => set({ dtrail: [key], dPage: 0 }), connect: () => set({ page: 'recommended', region: { csp: r.csp, region: r.region }, trail: [], dtrail: [] }) }; })
      .sort((a, b) => a.csp.localeCompare(b.csp) || a.region.localeCompare(b.region));
    const cols = P.columnsFor(rows, [['cloud', 'Cloud'], ['region', 'Region'], ['vpcs', 'VPCs'], ['subnets', 'Subnets'], ['att', 'AT&T'], ['bytesIn', 'Bytes in'], ['bytesOut', 'Bytes out']])
      .map(c => ({ ...c, cls: ['vpcs', 'subnets', 'bytesIn', 'bytesOut'].includes(c.key) ? 'num' : c.key === 'cloud' ? 'dt-name' : '', ink: c.key === 'att' ? (r) => (r.on ? '' : 'var(--text-light)') : null }));
    if (rows.some(r => r.canConnect)) cols.push({ key: 'act', label: '', present: true, cls: 'num' });
    const text = (k, r) => ['bytesIn', 'bytesOut'].includes(k) ? fmtBytes(r[k]) : ['vpcs', 'subnets'].includes(k) ? n(r[k]) : k === 'act' ? '' : String(r[k]);
    const pg = pageOf(rows.map(r => ({ ...r, cells: cellsOf(r, cols, text).map(x => ({ ...x, isAct: x.key === 'act', cls: x.key === 'act' ? `${x.cls} po-actc` : x.cls })), click: true })), s.dPage, PAGE_ROWS, set, 'dPage');
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
const money = (v) => (v === null || v === undefined ? 'At review' : `$${n(v)}/mo`);
/** The hard rules the answers apply, in words; nothing for the defaults. */
export function rulesOf(answers) {
  return Object.entries(answers || {}).map(([q, a]) => { const r = W.RULE[a], opt = (W.INTENT.find(x => x.key === q) || { opts: [] }).opts.find(o => o.key === a);
    return r && r.miss && opt ? { key: a, text: `${opt.label} removes any way that reads "${r.miss[0]}"` } : null; }).filter(Boolean);
}
/** Recommended: pick a region, answer the four questions, read the ranked options and request one. */
export function recommended(d, s, set) {
  const dark = s.theme === 'dark', iconDir = dark ? 'brand/icons-dark' : 'brand/icons-light', iconLink = dark ? 'brand/icons-linkdark' : 'brand/icons-link';
  const join = P.attJoin(d.cloudLinks, d.discovery), answers = s.answers || {};
  const regionTitle = (r) => `${P.cspOf(r.csp)} · ${P.regionName(r.region)}`;
  const root = { key: 'root', label: 'Recommended', go: () => set({ region: null }), last: !s.region };
  const pickRows = d.discovery.map(r => { const j = join.get(`${r.csp}/${r.region}`);
      const ck = P.cspOf(r.csp); return { key: `${r.csp}/${r.region}`, csp: ck, cloud: W.CLOUD_NAME[ck] || r.csp, mark: W.markFor(ck, dark ? 'dark' : 'light'), region: P.regionName(r.region), on: j.on, att: j.on ? 'On AT&T' : j.cspOnly ? `AT&T · ${ck} at ${j.cspLink.pop ? j.cspLink.pop.metro : 'a POP'}` : 'Not on AT&T',
        go: () => set({ region: { csp: r.csp, region: r.region } }) }; })
    .sort((a, b) => (a.on - b.on) || a.csp.localeCompare(b.csp) || a.region.localeCompare(b.region));
  const pickCols = [{ key: 'cloud', label: 'Cloud', present: true, cls: 'dt-name' }, { key: 'region', label: 'Region', present: true }, { key: 'att', label: 'AT&T', present: true, ink: (r) => (r.on ? '' : 'var(--text-light)') }];
  // One row fewer than a plain table: the "Pick a region" line sits above it.
  const pick = { ...pageOf(pickRows.map(r => ({ ...r, cells: cellsOf(r, pickCols, (k, x) => String(x[k])), click: true })), s.rcPage, PAGE_ROWS - 1, set, 'rcPage'), cols: pickCols };
  if (!s.region) return { hasRegion: false, noRegion: true, trail: [root], hasTrail: false, pick, intent: [], options: [], cols: [], weights: [], rules: [], requested: false, requestedLine: '', placeholder: true, placeholderLine: '' };
  const reg = s.region, cloud = P.cspOf(reg.csp), title = regionTitle(reg);
  const intent = W.INTENT.map(q => ({ key: q.key, label: q.label, icon: q.icon, opts: q.opts.map(o => { const on = answers[q.key] === o.key;
    return { key: o.key, label: o.label, title: o.title, on, icon: o.icon, go: () => { const next = { ...answers }; if (on) delete next[q.key]; else next[q.key] = o.key; set({ answers: next }); } }; }) }));
  const full = { ...W.INTENT_DEFAULT, ...answers };
  const requested = (s.requests || []).find(r => r.csp === reg.csp && r.region === reg.region) || null;
  const options = W.rankWays(cloud, answers, 99).map((r, i) => { const w = W.wayOf(r.key), who = W.wayWho(r.key) || { who: '', level: '', time: '' }, oks = r.why.filter(x => x.ok).map(x => x.short);
    return { key: r.key, rank: String(i + 1), label: W.wayLabel(r.key, cloud, r.zone), kicker: w.kicker, monthly: money(r.monthly), setup: `${who.level} · ${who.time}`, who: who.who, fit: oks.slice(0, 2).join(' · '),
      misses: r.misses, missWords: r.why.filter(x => x.miss).map(x => x.short).join('; '), score: String(r.pts), recommended: i === 0 && r.misses === 0, isRequested: !!requested && requested.option === r.key,
      request: () => set({ requests: [...(s.requests || []), { at: new Date().toISOString(), csp: reg.csp, region: reg.region, option: r.key, answers: full, defaulted: Object.keys(answers).length === 0 }] }) }; });
  const cols = [{ key: 'label', label: 'Option', present: true, cls: 'dt-name', w: '30%' }, { key: 'monthly', label: 'Monthly', present: true, cls: 'num', w: '9%' }, { key: 'setup', label: 'Setup', present: true, w: '17%' }, { key: 'who', label: 'Who', present: true, w: '6%' }, { key: 'fit', label: 'Fit', present: true, w: '21%' }, { key: 'score', label: 'Score', present: true, cls: 'num', w: '6%' }, { key: 'act', label: '', present: true, cls: 'num', w: '11%' }];
  const text = (k, r) => k === 'act' ? '' : k === 'fit' && r.misses ? `${r.missWords}` : k === 'score' && r.misses ? DASH : String(r[k]);
  const rows = options.map(r => ({ ...r, cells: cellsOf(r, cols, text).map(x => ({ ...x, isAct: x.key === 'act', isOption: x.key === 'label', cls: x.key === 'act' ? `${x.cls} po-actc` : x.cls, ink: ['fit', 'score'].includes(x.key) && r.misses ? 'var(--text-light)' : x.ink })), click: false }));
  const wt = W.intentWeights(answers);
  return { hasRegion: true, noRegion: false, title, cloud, trail: [{ ...root, last: false }, { key: 'reg', label: title, go: () => {}, last: true }], hasTrail: true, pick, intent, options: rows, cols,
    weights: W.CRITERIA.map(c => ({ key: c.key, label: c.label, icon: c.icon, w: wt[c.key], text: `${wt[c.key]}%` })), rules: rulesOf(answers), hasRules: rulesOf(answers).length > 0,
    placeholder: true, placeholderLine: "AT&T's modeled ways stand in until the team's option list arrives.",
    requested: !!requested, notRequested: !requested, requestedLine: requested ? `Requested ${W.wayLabel(requested.option, cloud)} for ${title}${requested.defaulted ? ' with the default answers' : ''}.` : '' };
}
export function vals(c) {
  const s = c.state, set = (p) => c.setState(p), f = fixtureOf(s), d = dataOf(s), dark = s.theme === 'dark';
  const iconDir = dark ? 'brand/icons-dark' : 'brand/icons-light', iconLink = dark ? 'brand/icons-linkdark' : 'brand/icons-link';
  const rail = PAGES.map(p => { const cur = s.page === p.key; return { key: p.key, label: p.label, cur, icon: `${cur ? iconLink : iconDir}/${p.icon}.svg`,
    bg: cur ? 'var(--sidebar-accent)' : 'transparent', color: cur ? 'var(--sidebar-fg)' : 'var(--sidebar-muted)', radius: cur ? '8px' : '4px', go: () => set({ page: p.key, drawer: null, trail: [], lmPage: 0, dtrail: [], dPage: 0, rcPage: 0, region: null }) }; });
  const nets = P.networksOf(d.circuits);
  const join = P.attJoin(d.cloudLinks, d.discovery);
  const page = PAGES.find(p => p.key === s.page) || PAGES[0];
  return {
    theme: s.theme, themeIsLight: !dark, themeIsDark: dark, themeTitle: dark ? 'Light mode' : 'Dark mode', toggleTheme: () => set({ theme: dark ? 'light' : 'dark' }),
    iconDir, rail, pageTitle: page.label, pgLastmile: s.page === 'lastmile', pgLinks: s.page === 'links', pgDiscovery: s.page === 'discovery', pgRecommended: s.page === 'recommended',
    fixture: s.fixture, fixtureName: f.name, synthetic: !!f.synthetic, stateB: !!s.stateB, stateValue: s.stateB ? 'b' : 'a',
    dataNote: s.dataNote || '', hasDataNote: !!s.dataNote, dataError: s.dataError || '', hasDataError: !!s.dataError,
    setFixture: (e) => set({ fixture: P.FIXTURES[e.target.value] ? e.target.value : 'calloway', drawer: null, trail: [], lmPage: 0, dtrail: [], dPage: 0, region: null, pick: null }),
    setStateB: (e) => set({ stateB: e.target.value === 'b' }),
    counts: { circuits: n(d.circuits.length), networks: n(nets.filter(x => x.id).length), sites: n(new Set(d.circuits.map(x => x.siteId)).size), links: n(d.cloudLinks.length), regions: n(d.discovery.length),
      onAtt: n([...join.values()].filter(j => j.on).length) },
    data: d, nets, join,
    lm: lastmile(d, s, set),
    cl: links(d, s, set),
    dv: discovery(d, s, set),
    rc: recommended(d, s, set),
  };
}

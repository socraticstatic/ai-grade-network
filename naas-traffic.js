// Observe > Traffic as seven stories (2026-10-13, Micah: "Do this for more pages! Great space, great layout, calls to action
// on all widgets, go forth!"; "Each page should be its own gorgeous, extremely beautiful story, with calls to action on each";
// "Elevate this enterprise experience to pure actionable story ... tell the story with less words, and more visualizations,
// animations and icons").
//
// Each tab reads top to bottom as verdict, evidence, moves. The verdict is one strip of glyph tiles that holds its place as
// the tabs change (the map's six rollups, four on every other tab), each tile a figure and a door. The evidence is the tab's
// own picture (the flow map, the days as columns, the destinations' split, the seven stations, the latency against its SLO,
// the ports as rings, the window as a timeline). The moves are a verb on every card and a glyph verb on every row.
//
// Pure view models over what vals() already counted: every figure here is one the page printed before (flowTiles, otTiles,
// healthTiles, bwTiles, the Paths and Changes lists), recut, never recomputed from new numbers. Green is the saving's alone:
// a delta, a healthy state and a spend read in the house inks. The actions are the page's own doors (the map's filters, a
// problem's Trace, a port's move, Logs' explain) or navigations to the page where you act.

import { SLO, SLO_PRIVATE } from './naas-flowmap.js';
import { markFor, MARK } from './naas-ways.js';

export const TRF_PANELS = ['map', 'time', 'where', 'health', 'paths', 'conn', 'changes'];

/** A figure's count-up, read from what it prints (Cost's cstCu rule): whole numbers with their commas count, a rate does not. */
export function cuOf(v) {
  const m = /^([+−-]?\$?)(\d{1,3}(?:,\d{3})*)(%?)$/.exec(String(v == null ? '' : v));
  if (!m) return { kOn: 'off', m: 0, k: 0, r: 0, preCss: "''", sufCss: "''" };
  const n = +m[2].replace(/,/g, ''), pre = m[1], suf = m[3], kOn = n >= 1e6 ? 'm' : n >= 1000 ? 'k' : 'r';
  return { kOn, m: Math.floor(n / 1e6), k: kOn === 'm' ? Math.floor(n / 1000) % 1000 : Math.floor(n / 1000), r: kOn === 'r' ? n : n % 1000, preCss: `'${pre}'`, sufCss: `'${suf}'` };
}

/** A ring's fill: each part's ink in turn, the rest of the circle bare (Cost's cstRing). */
export function ringOf(segs, whole) {
  const t = whole != null ? whole : segs.reduce((a, x) => a + x.v, 0);
  if (!(t > 0)) return 'conic-gradient(transparent 0 100%)';
  let acc = 0;
  const parts = segs.filter(x => x.v > 0).map(x => { const a = acc / t * 100; acc += x.v; return `${x.c} ${a.toFixed(2)}% ${Math.min(100, acc / t * 100).toFixed(2)}%`; });
  return `conic-gradient(${[...parts, `transparent ${Math.min(100, acc / t * 100).toFixed(2)}% 100%`].join(',')})`;
}

const HEAD = 'var(--text-heading)';
const HEALTHY = 'var(--viz-1)';
// Health in Traffic's inks: healthy is the calm blue (green is the saving's alone), the rest keep their house tokens.
export const TRF_INK = { ok: HEALTHY, risk: 'var(--warning)', slo: 'var(--viz-5)', down: 'var(--error)', nodata: 'var(--text-disabled)', none: 'var(--border-secondary)' };
// A tile: its glyph, name and figure (counting up), a door; a ratio rides its foot as a meter, a trend as a delta or a spark.
const tile = (t, i) => ({ u: '', tone: HEAD, on: false, lead: i === 0, hasRing: false, ring: '', ringLabel: '', hasDelta: false, delta: '', deltaIcon: 'trending-up', deltaInk: 'var(--text-body)', deltaTitle: '', hasSpark: false, spark: [], ...t, i, cu: cuOf(t.v),
  hasMeter: t.meter != null && isFinite(t.meter), meterW: `${Math.max(0, Math.min(100, +t.meter || 0)).toFixed(2)}%`, noAside: !t.hasDelta && !t.hasSpark });
const act = (label, icon, go, title, extra = {}) => ({ label, icon, go, title: title || label, aria: title ? `${label}: ${title}` : label, primary: false, ...extra });
const unitOf = (s) => { const m = /^(.*?)\s+(Tbps|Gbps|Mbps|Kbps|ms)$/.exec(String(s || '')); return m ? [m[1], m[2]] : [String(s || ''), '']; };
const dollars = (v) => { const m = /\$([\d,]+)/.exec(String(v || '')); return m ? +m[1].replace(/,/g, '') : 0; };
const ofParts = (v) => { const m = /^([\d,]+) of ([\d,]+)$/.exec(String(v || '')); return m ? [+m[1].replace(/,/g, ''), +m[2].replace(/,/g, '')] : null; };
const plural = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * The seven stories. `out` is vals() so far (before pageLists pages its lists); ctx carries the page's doors:
 * go (a navigation), attach(region) (the compose flow for a region), regionOf(region), nowMs, winMs, winLabel, theme.
 */
export function trafficStory(out, s, set, ctx) {
  const { go, attach, regionOf = () => null, nowMs = Date.now(), winMs = 30 * 864e5, winLabel = '30 days', theme = 'light' } = ctx;
  const panel = TRF_PANELS.includes(s.obPanel) ? s.obPanel : 'map';
  const probs = out.problemRows || [];
  const worst = probs[0] || null;
  const toPanel = (k, extra = {}) => () => set({ obPanel: k, ...extra });
  const toOptimize = go('s3', { layer: 'cloud', tab: 'cost', costPanel: 'optimize', sub: null });
  const toCost = (costPanel) => go('s3', { layer: 'cloud', tab: 'cost', costPanel, sub: null });
  const toLogs = (logTab = 'flow') => () => set({ obPage: 'logs', logTab, sub: null });
  const toOps = (opsPanel) => () => set({ obPage: 'insights', insPanel: 'ops', opsPanel, sub: null });
  const toConnections = go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'connections', mapSel: null, mapRegion: null });
  const toWays = go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'ways', mapSel: null, mapRegion: null });
  const toSources = go('s1', { discoverView: 'sources' });

  // ---- Traffic, the flow map: six rollups that filter it, and the move the view it is in points at.
  const ft = Object.fromEntries((out.flowTiles || []).map(t => [t.key, t]));
  const mode = ((out.flowViews || []).find(x => x.on) || {}).key || 'state';
  const could = dollars((ft.could || {}).v), sloN = +((ft.slo || {}).v) || 0, onAtt = ofParts((ft.onatt || {}).v);
  const MAP_ICON = { traffic: 'global-network', p95: 'smart-meter', onatt: 'large-building', cost: 'bill', could: 'trending-down', slo: 'clock' };
  const mapTiles = (out.flowTiles || []).map((t, i) => tile({ lead: false, key: t.key, icon: MAP_ICON[t.key] || 'pie-chart', l: t.l, v: t.v, u: t.u, go: t.go, on: !!t.on, title: t.title,
    tone: t.key === 'could' && could > 0 ? 'var(--success)' : t.key === 'slo' && sloN > 0 ? TRF_INK.slo : HEAD,
    ...(t.hasD ? { hasDelta: true, delta: t.dShort, deltaIcon: /^[-−]/.test(t.dShort) ? 'trending-down' : 'trending-up', deltaTitle: t.d } : {}),
    ...(t.key === 'onatt' && onAtt && onAtt[1] ? { hasRing: true, ring: ringOf([{ v: onAtt[0], c: HEALTHY }], onAtt[1]), ringLabel: t.title, meter: onAtt[0] / onAtt[1] * 100 } : {}) }, i));
  const trace0 = worst ? worst.trace : toPanel('paths');
  const trfMap = { mode,
    cta: mode === 'cost' ? act('Optimize', 'trending-down', toOptimize, `${(ft.cost || {}).v || ''}/mo rides this map; the moves that lower it are on Optimize`, { primary: true })
      : mode === 'slo' ? (sloN > 0 ? act('Trace', 'target', trace0, `${plural(sloN, 'link', 'links')} over SLO: trace the worst, hop by hop`, { primary: true }) : act('Paths', 'shuffle', toPanel('paths'), 'Each app on its slowest path, hop by hop'))
        : could > 0 ? act('Move to AT&T', 'trending-down', toOptimize, `Your sites' traffic outside AT&T would save ${ft.could.v}/mo on the AT&T network: the moves on Optimize`, { primary: true })
          : sloN > 0 ? act('Trace', 'target', trace0, `${plural(sloN, 'link', 'links')} over SLO: trace the worst, hop by hop`, { primary: true })
            : act('Records', 'list', toLogs('flow'), 'The flow records behind this map') };

  // ---- Over time: the days as columns, the peak marked, the average drawn; the moves are capacity and the replay.
  const otBars = out.otBars || [];
  out.otBars = otBars.map((b, i) => ({ ...b, d: i }));
  const totOf = (b) => (b.fabGbps || 0) + (b.outGbps || 0);
  const series = s.otSeries === 'fab' || s.otSeries === 'out' ? s.otSeries : 'both';
  const valOf = (b) => (series === 'fab' ? b.fabGbps || 0 : series === 'out' ? b.outGbps || 0 : totOf(b));
  const otMax = Math.max(0.001, ...otBars.map(valOf));
  const peakI = otBars.reduce((best, b, i) => (valOf(b) > valOf(otBars[best] || b) ? i : best), 0);
  const gw = (g) => (g >= 1 ? `${g.toFixed(g >= 100 ? 0 : 1)} Gbps` : `${Math.round(g * 1000)} Mbps`);
  const ot = Object.fromEntries((out.otTiles || []).map(t => [t.key, t]));
  const trendUp = !/^[-−]/.test((ot.Trend || {}).v || '');
  const sparkOf = (vs) => { const mx = Math.max(0.001, ...vs); return vs.map((v, i) => ({ key: 'k' + i, h: Math.max(6, v / mx * 100).toFixed(1) + '%', d: i })); };
  const otTotals = otBars.map(totOf);
  const grain = ['daily', 'weekly', 'monthly'].includes(s.otGrain) ? s.otGrain : 'daily';
  const timeTiles = [
    { key: 'peak', icon: 'high-meter', l: 'Peak', src: ot.Peak, go: toPanel('conn'), title: `The busiest ${grain === 'daily' ? 'day' : grain === 'weekly' ? 'week' : 'month'} in the chart, ${(ot.Peak || {}).v}: Capacity reads it against your ports` },
    { key: 'avg', icon: 'global-network', l: 'Average', src: ot.Average, go: toPanel('map'), title: `${(ot.Average || {}).v} on average across the chart: the flow map draws where it goes` },
    { key: 'trend', icon: trendUp ? 'trending-up' : 'trending-down', l: 'Trend', src: ot.Trend, go: toCost('spend'), title: `${(ot.Trend || {}).v} from the first bar to the last: Spend reads where it takes the bill`, spark: true },
    { key: 'egress', icon: 'bill', l: 'Egress', src: ot.Egress, go: toCost('dest'), title: `${(ot.Egress || {}).v} of egress outside AT&T across the chart: By destination steers it` },
  ].map((t, i) => { const [v, u] = unitOf((t.src || {}).v || '0');
    return tile({ key: t.key, icon: t.icon, l: t.l, v, u, go: t.go, title: t.title, ...(t.spark && otTotals.length ? { hasSpark: true, spark: sparkOf(otTotals.slice(-12)) } : {}) }, i); });
  // The axis tops out at a round figure above the peak, so the peak's marker sits inside the plot (the bars keep otMax's scale,
  // drawn in a frame otMax / axisMax of the plot's height).
  const step = (() => { const raw = otMax * 1.15 / 2, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))); return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(k => k * mag).find(x => x >= raw) || raw; })();
  const axisMax = step * 2, frame = otMax / axisMax;
  const gwAxis = (g) => (g >= 1 ? `${+g.toFixed(g >= 10 ? 0 : 1)} Gbps` : `${Math.round(g * 1000)} Mbps`);
  const yTicks = [1, 0.5, 0].map(k => ({ key: 'y' + k, t: k ? gwAxis(axisMax * k) : '0', top: `${((1 - k) * 100).toFixed(2)}%` }));
  const avgG = otBars.length ? otBars.reduce((a, b) => a + valOf(b), 0) / otBars.length : 0;
  const trfTime = {
    title: grain === 'weekly' ? 'By week' : grain === 'monthly' ? 'By month' : 'By day', yTicks,
    colsTop: `${((1 - frame) * 100).toFixed(2)}%`,
    avgTop: `${(100 - avgG / axisMax * 100).toFixed(2)}%`, avgF: gw(avgG), hasAvg: otBars.length > 0,
    peakLeft: otBars.length ? `${((peakI + 0.5) / otBars.length * 100).toFixed(2)}%` : '0%', peakTop: `${(100 - valOf(otBars[peakI] || { fabGbps: 0, outGbps: 0 }) / axisMax * 100).toFixed(2)}%`, peakF: otBars.length ? gw(valOf(otBars[peakI])) : '',
    replay: act('Replay', 'play', () => set({ obPanel: 'map', replayOpen: true, mapPlay: false }), `Replay ${winLabel} on the flow map`),
    cta: act('Capacity', 'high-meter', toPanel('conn'), `At ${(ot.Trend || {}).v || 'this'} growth, when each port fills`, { primary: true }),
  };

  // ---- Where it goes: each destination's share split on and outside AT&T; the split as one ring; the moves steer what leaves.
  const mix = out.mixRows || [];
  const MIX_ICON = { 'dest:regions': 'large-building', 'dest:local': 'pinpoint', 'dest:AI endpoints': 'ai', 'dest:object storage': 'database', 'dest:public internet': 'internet', 'dest:inter-cloud': 'arrows-horizontal' };
  const mixMax = Math.max(0.001, ...mix.map(r => parseFloat(r.gbps) || 0));
  const toDest = toCost('dest');
  const whereRows = mix.map((r, i) => { const g = parseFloat(r.gbps) || 0, local = r.fabPct === 'Local', fab = local ? 0 : parseFloat(r.fabW) || 0;
    const steer = !local && fab < 90;
    return { ...r, i, icon: MIX_ICON[r.key] || 'globe', local, w: `${Math.max(2, g / mixMax * 100).toFixed(2)}%`, fabPart: `${fab.toFixed(2)}%`, outPart: `${local ? 0 : (100 - fab).toFixed(2)}%`, locPart: local ? '100%' : '0%',
      on: local ? 'Local' : r.fabPct, onTitle: r.fabNote, open: act('Records', 'list', r.explainGo, `${r.label}: the flow records behind ${r.gbps} Gbps`),
      verb: steer ? act('Steer', 'shuffle', toDest, `${r.label}: ${r.fabPct} rides AT&T; steer the rest on Cost, By destination`) : act('Records', 'list', r.explainGo, `${r.label}: the flow records behind ${r.gbps} Gbps`) }; });
  const fabG = parseFloat(out.fabGbps) || 0, pubG = parseFloat(out.pubGbps) || 0, locG = parseFloat(out.locGbps) || 0, allG = fabG + pubG + locG;
  const total = unitOf(((out.mixShort || [])[0] || {}).v || `${allG.toFixed(1)} Gbps`);
  const localRow = mix.find(r => r.key === 'dest:local');
  const whereTiles = [
    { key: 'onatt', icon: 'cable', l: 'On AT&T', v: out.fabPctF || '0%', u: 'crossing', go: out.explainFabric || toLogs('flow'), title: `${out.fabPctF || '0%'} of what crosses a mid mile rides the AT&T network: the records behind it`,
      hasRing: fabG + pubG > 0, ring: ringOf([{ v: fabG, c: HEALTHY }], fabG + pubG), ringLabel: `${out.fabGbps} of ${(fabG + pubG).toFixed(1)} Gbps on AT&T`, ...(fabG + pubG > 0 ? { meter: fabG / (fabG + pubG) * 100 } : {}) },
    { key: 'total', icon: 'global-network', l: 'In the window', v: total[0], u: total[1], go: toPanel('map'), title: `${total.join(' ')} in the window, every class: the flow map draws it` },
    { key: 'out', icon: 'internet', l: 'Outside AT&T', v: out.pubGbps || '0', u: 'Gbps', go: out.explainOutside || toLogs('flow'), title: `${out.pubGbps || 0} Gbps left on the public path: the records behind it` },
    { key: 'local', icon: 'pinpoint', l: 'Stays in region', v: out.locGbps || '0', u: 'Gbps', go: localRow ? localRow.explainGo : toLogs('flow'), title: `${out.locGbps || 0} Gbps never leaves its region, so it crosses no mid mile` },
  ].map(tile);
  const trfWhere = { rows: whereRows, hasRows: whereRows.length > 0,
    ring: ringOf([{ v: fabG, c: HEALTHY }, { v: pubG, c: 'var(--warning)' }, { v: locG, c: 'var(--viz-2)' }], allG), ringC: total[0], ringU: total[1],
    parts: [['fab', 'On AT&T', fabG, HEALTHY, 'cable', out.explainFabric], ['out', 'Outside AT&T', pubG, 'var(--warning)', 'internet', out.explainOutside], ['loc', 'Stays in region', locG, 'var(--viz-2)', 'pinpoint', localRow && localRow.explainGo]]
      .map(([key, label, g, ink, ic, open]) => ({ key, label, ink, icon: ic, gF: `${g.toFixed(1)} Gbps`, pct: allG ? `${Math.round(g / allG * 100)}%` : '0%', open: act(label, ic, open || toLogs('flow'), `${label}: ${g.toFixed(1)} Gbps, the records behind it`) })),
    records: act('Records', 'list', out.explainOutside || toLogs('flow'), 'The flow records that left on the public path'),
    cta: act('By destination', 'globe', toDest, 'Each class today, and if all of it rode AT&T: Cost, By destination', { primary: true }) };

  // ---- Health: is it up. Four tiles, then the view's picture; the open problems each carry their move.
  const ht = Object.fromEntries((out.healthTiles || []).map(t => [t.key, t]));
  const okParts = ofParts((ht.ok || {}).v);
  const riskN = +((ht.risk || {}).v) || 0, downN = +((ht.down || {}).v) || 0;
  const downProb = probs.find(p => p.state === 'down');
  const worstApp = (out.appHealthRows || []).some(r => r.state === 'slo') ? 'slo' : 'risk';
  const healthTiles = [
    { key: 'ok', icon: 'verified', src: ht.ok, go: () => set({ obPanel: 'health', healthView: 'cloud', appState: null }), title: `${(ht.ok || {}).v || '0 of 0'} apps hold their SLO and stay inside your thresholds: App health`,
      ...(okParts && okParts[1] ? { hasRing: true, ring: ringOf([{ v: okParts[0], c: HEALTHY }], okParts[1]), ringLabel: `${okParts[0]} of ${okParts[1]} apps healthy`, meter: okParts[0] / okParts[1] * 100 } : {}) },
    // The model's label names both states in five words; the tile says it in four (glyph first, 2026-10-13).
    { key: 'risk', icon: 'clock', l: 'Over SLO, at risk', src: ht.risk, tone: riskN ? TRF_INK.slo : HEAD, go: () => set({ obPanel: 'health', healthView: 'cloud', appState: worstApp }), title: `${plural(riskN, 'app', 'apps')} over SLO or at risk: App health, filtered to them` },
    { key: 'down', icon: 'close-circle', src: ht.down, tone: downN ? TRF_INK.down : HEAD, go: downProb ? downProb.trace : toPanel('conn'), title: downProb ? `${downProb.where} · ${downProb.thing} is down: trace it hop by hop` : 'No connection down: Capacity shows each one' },
    { key: 'alerts', icon: 'bell', src: ht.alerts, go: toOps('tickets'), title: `${plural(probs.length, 'alert', 'alerts')} open: Operations, Tickets` },
  ].map((t, i) => tile({ key: t.key, icon: t.icon, l: t.l || (t.src || {}).l || t.key, v: (t.src || {}).v || '0', u: (t.src || {}).u || '', tone: t.tone || HEAD, go: t.go, title: t.title, ...(t.hasRing ? { hasRing: true, ring: t.ring, ringLabel: t.ringLabel, meter: t.meter } : {}) }, i));
  const OWNER_ICON = { 'AT&T': 'check-shield', 'Cloud provider': 'cloud', 'Public internet': 'internet', 'Third party': 'person-group', You: 'person' };
  const STATE_ICON = { down: 'close-circle', slo: 'clock', risk: 'exclamation-triangle', ok: 'check-circle' };
  out.problemRows = probs.map((p, i) => ({ ...p, d: i % 3, first: i === 0, stateIcon: STATE_ICON[p.state] || 'exclamation-circle', ownerIcon: OWNER_ICON[p.ownerLabel] || 'person',
    whatShort: String(p.what || '').split(' · ')[0], ticketId: (String(p.ticketF || '').match(/T-\d{4}/) || [''])[0], appsN: String((p.apps || []).length), changeSay: p.changeF ? ` · ${p.changeF}` : '',
    verb: act(p.moveLabel || 'Trace', p.moveLabel === 'Trace' ? 'target' : p.moveLabel === 'In progress' ? 'clock' : 'plus-circle', p.move, `${p.where} · ${p.thing}: ${p.what}`),
    ...(p.canTicket ? { ticketAct: act('Open ticket', 'checklist', p.ticket, `Open a ticket to ${p.ownerLabel}`) } : {}) }));
  const nodata = (out.segRows || []).some(r => r.state === 'nodata');
  const SEG_ICON = { access: 'large-building', access3p: 'midsized-building', ipsec: 'padlock', backbone: 'hub', onramp: 'ethernet', cloudlink: 'cable', hub: 'merge', exit: 'internet', app: 'apps' };
  out.segRows = (out.segRows || []).map((r, i) => ({ ...r, d: i, caretOp: r.canOpen ? 1 : 0, icon: SEG_ICON[r.key] || 'network-folder', ownerIcon: OWNER_ICON[r.ownerLabel] || 'person', ink: TRF_INK[r.state] || 'var(--text-disabled)',
 }));
  out.segDrillRows = (out.segDrillRows || []).map((r, i) => ({ ...r, d: i % 9, caretOp: r.canGo ? 1 : 0 }));
  out.pathFlowRows = (out.pathFlowRows || []).map((r, i) => ({ ...r, d: i % 8 }));
  const pathState = Object.fromEntries((out.pathFlowAll || []).map(r => [r.tag, r.pathState || r.state]));
  const pathByTag = (tag) => (out.pathTimeAll || []).find(r => !r.pinned && r.tag === tag);
  out.appHealthRows = (out.appHealthRows || []).map((r, i) => { const pr = pathByTag(r.key), pol = /^\d/.test(r.policies) ? parseInt(r.policies, 10) : 0;
    return { ...r, d: i, pathState: pathState[r.key] || 'nodata', ink: TRF_INK[r.state] || 'var(--text-disabled)', pathIcon: STATE_ICON[r.state] || 'check-circle', onAttRing: ringOf([{ v: parseFloat(r.onAtt) || 0, c: HEALTHY }], 100), hasPolicy: pol > 0,
      open: act(r.label, 'shuffle', pr ? () => set({ obPanel: 'paths', pathSel: pr.key, pathPin: null }) : toPanel('paths'), `${r.label}: its path hop by hop`) }; });
  const view = s.healthView === 'segment' ? 'segment' : s.healthView === 'cloud' ? 'cloud' : 'app';
  const trfHealth = { view, problems: out.problemRows, hasProblems: out.problemRows.length > 0, noProblems: !out.problemRows.length,
    paths: act('Paths', 'shuffle', toPanel('paths'), 'Each app on its slowest path, hop by hop'),
    tickets: act('Tickets', 'checklist', toOps('tickets'), 'Operations, every ticket open and who holds it'),
    cta: view === 'segment' ? (nodata ? act('Add a source', 'plus-circle', () => { toSources(); if (typeof out.openAddSource === 'function') out.openAddSource(); }, 'Segments not yet measured read once a source sends them', { primary: true }) : act('Paths', 'shuffle', toPanel('paths'), 'Each app on its slowest path, hop by hop', { primary: true }))
      : view === 'cloud' ? (out.appThreshChanged ? act('Reset', 'repeat', out.appThreshReset, 'Back to the default thresholds', { primary: true }) : act('Paths', 'shuffle', toPanel('paths'), 'Each app on its slowest path, hop by hop', { primary: true }))
        : act('Tickets', 'checklist', toOps('tickets'), 'Operations: every ticket open and who holds it') };

  // ---- Paths: is it fast. Each app on its slowest path, the hops, and the time against its SLO; a verb per row.
  const pAll = out.pathTimeAll || [];
  const msMax = Math.max(1, ...pAll.map(r => Math.max(r.total || 0, r.slo || 0)));
  const slowest = pAll.slice().sort((a, b) => (b.total || 0) - (a.total || 0))[0] || null;
  const overRows = pAll.filter(r => r.state === 'slo' || r.state === 'down');
  const lossy = (r) => (r.cells || []).filter(c => c.lossF && c.lossF !== '0.00%').length;
  const lossN = pAll.reduce((a, r) => a + lossy(r), 0), lossRow = pAll.find(r => lossy(r) > 0);
  const okN = pAll.filter(r => r.state === 'ok').length;
  const selPath = (r) => () => { const ix = Math.max(0, pAll.findIndex(x => x.key === r.key)); set({ obPanel: 'paths', pathSel: r.key, pathsPage: Math.floor(ix / 8) }); };
  const pathVerb = (r) => { const reg = regionOf(r.region), pub = !!reg && !reg.priv;
    if (r.state === 'down') return act('Health', 'verified', toPanel('health'), `${r.where} is down: its problem, its ticket and its move`);
    if ((r.state === 'slo' || r.state === 'risk') && pub && attach) return act('Attach', 'cable', attach(r.region), `${r.where} rides the public internet: attach it to the AT&T network`);
    if (r.state === 'slo' || r.state === 'risk') return act('Capacity', 'high-meter', toPanel('conn'), `${r.where}: its port against its peak`);
    return act('Map', 'global-network', () => set({ obPanel: 'map', mapRegion: r.region }), `${r.where} on the flow map`); };
  const pathTiles = [
    { key: 'slowest', icon: 'clock', l: 'Slowest', v: slowest ? String(slowest.total) : 'None', u: slowest ? 'ms' : '', tone: slowest && slowest.state !== 'ok' ? TRF_INK[slowest.state] || HEAD : HEAD, go: slowest ? selPath(slowest) : toPanel('map'), title: slowest ? `${slowest.label}, ${slowest.site} to ${slowest.where}: ${slowest.totalF} against ${slowest.slo} ms` : 'No path to time yet' },
    { key: 'over', icon: 'exclamation-circle', l: 'Over SLO', v: String(overRows.length), u: overRows.length === 1 ? 'path' : 'paths', tone: overRows.length ? TRF_INK.slo : HEAD, go: overRows[0] ? selPath(overRows[0]) : toPanel('health'), title: `${plural(overRows.length, 'path', 'paths')} over SLO or down${overRows[0] ? `, first ${overRows[0].label}` : ''}` },
    { key: 'loss', icon: 'exclamation-triangle', l: 'Loss', v: String(lossN), u: lossN === 1 ? 'hop' : 'hops', go: lossRow ? selPath(lossRow) : toPanel('health'), title: lossN ? `${plural(lossN, 'hop', 'hops')} where a source reports loss` : 'No hop reports loss' },
    { key: 'ok', icon: 'verified', l: 'Within SLO', v: `${okN} of ${pAll.length}`, u: '', go: toPanel('health'), title: `${okN} of ${pAll.length} paths within their SLO: Health`,
      hasRing: pAll.length > 0, ring: ringOf([{ v: okN, c: HEALTHY }], pAll.length), ringLabel: `${okN} of ${pAll.length} within SLO`, ...(pAll.length ? { meter: okN / pAll.length * 100 } : {}) },
  ].map(tile);
  out.pathTimeRows = (out.pathTimeRows || []).map((r, i) => { const full = pAll.find(x => x.key === r.key) || {}; const ms = full.total || 0, slo = full.slo || SLO;
    return { ...r, d: i % 8, ink: TRF_INK[r.state] || HEALTHY, barW: `${Math.max(2, ms / msMax * 100).toFixed(2)}%`, sloLeft: `${Math.min(100, slo / msMax * 100).toFixed(2)}%`, sloF: `SLO ${slo} ms`, verb: pathVerb(full.key ? full : r) }; });
  const selRow = pAll.find(r => r.key === s.pathSel) || null;
  const leadRow = selRow || overRows[0] || slowest;
  const trfPaths = { rows: out.pathTimeRows, sloPriv: `${SLO_PRIVATE} ms`, sloPub: `${SLO} ms`, hasSel: !!selRow, noSel: !selRow,
    // A hop's own time is the step from the one before (the hops carry the time at arrival); where the time is lost reads in its state's ink.
    hops: selRow ? (selRow.hops || []).slice(1).map((h, i, a) => { const prev = i ? a[i - 1].ms || 0 : ((selRow.hops || [])[0] || {}).ms || 0, own = Math.max(0, (h.ms || 0) - prev);
      return { key: 'h' + i, name: h.name, ms: `${own} ms`, grow: Math.max(1, own), ink: h.state === 'bad' ? TRF_INK.slo : h.state === 'warn' ? 'var(--warning)' : i % 2 ? 'var(--viz-4)' : HEALTHY }; }) : [],
    selLabel: selRow ? selRow.label : '', selTotal: selRow ? selRow.totalF : '',
    cta: leadRow ? { ...pathVerb(leadRow), primary: true } : act('Map', 'global-network', toPanel('map'), 'The flow map', { primary: true }) };

  // ---- Capacity: is it full. Each connection a card: its peak as a ring, its run, when it fills, and its move.
  const gauges = out.gaugeRows || [];
  const bw = Object.fromEntries((out.bwTiles || []).map(t => [t.key, t]));
  const busiest = gauges.slice().sort((a, b) => b.pct - a.pct)[0] || null, first = gauges.slice().sort((a, b) => a.toFull - b.toFull)[0] || null;
  const capG = gauges.reduce((a, g) => a + (g.capG || 0), 0), avgG2 = gauges.reduce((a, g) => a + (g.avgG || 0), 0);
  const capTiles = [
    { key: 'cap', icon: 'cable', l: 'Capacity bought', src: bw.cap, go: toConnections, title: (bw.cap && bw.cap.sub) ? `${bw.cap.v}: ${bw.cap.sub}` : 'No port bought yet: Ways to connect' },
    { key: 'avg', icon: 'smart-meter', l: 'Carrying', src: bw.avg, go: busiest ? busiest.click : toWays, title: (bw.avg && bw.avg.sub) ? `${bw.avg.v}: ${bw.avg.sub}` : 'Nothing carried on a port yet',
      ring: capG > 0 ? ringOf([{ v: avgG2, c: HEALTHY }], capG) : '', ringLabel: capG > 0 ? `${Math.round(avgG2 / capG * 100)}% of capacity on average` : '' },
    { key: 'peak', icon: 'high-meter', l: 'Peak', src: bw.peak, go: busiest ? busiest.click : toWays, title: (bw.peak && bw.peak.sub) ? `${bw.peak.v}: ${bw.peak.sub}` : 'No peak yet' },
    { key: 'head', icon: 'clock', l: 'Headroom', src: bw.head, go: first ? first.portGo || first.click : toWays, title: (bw.head && bw.head.sub) ? `${bw.head.v}: ${bw.head.sub}` : 'No headroom to read yet', tone: first && first.toFull < 63 ? 'var(--warning)' : HEAD },
  ].map((t, i) => { const [v, u] = unitOf((t.src || {}).v || '0 Gbps');
    return tile({ key: t.key, icon: t.icon, l: t.l, v, u: u || 'Gbps', go: t.go, title: t.title, tone: t.tone || HEAD, ...(t.ring ? { hasRing: true, ring: t.ring, ringLabel: t.ringLabel, meter: avgG2 / capG * 100 } : {}) }, i); });
  // The ring is the port's use at peak (slate at 80% and over, as Connections draws it); the state rides the head as its glyph.
  const capCards = gauges.map((g, i) => { const hot = g.pct >= 80, ink = hot ? 'var(--warning)' : HEALTHY;
    const mark = MARK[g.cloud] ? markFor(g.cloud, theme) : '';
    return { key: g.key, i, label: g.label, ramp: g.rampLine || g.rampName, portsNote: g.portsNote || '', hasPortsNote: !!g.hasPortsNote, mark, hasMark: !!mark, noMark: !mark, title: g.title,
      stateWord: g.stateWord, stateIcon: g.degraded ? 'close-circle' : hot ? 'exclamation-triangle' : 'check-circle', stateInk: g.degraded ? TRF_INK.down : hot ? 'var(--warning)' : HEALTHY,
      p: Math.max(0, Math.min(100, g.pct)), pF: g.pctF, ink, avgF: g.avgF, peakF: g.peakF, headF: g.headF, portsF: g.portsF, avgW: g.avgW, peakX: g.peakX, fullIn: g.fullIn, fullInk: g.fullInk, spark: g.spark || [],
      open: act(g.label, 'router', g.click, `${g.label}: its panel, in place`), cta: act(g.portLabel || 'Add a port', g.portLabel === 'In progress' ? 'clock' : g.portLabel === 'Modify bandwidth' ? 'smart-meter' : 'plus-circle', g.portGo || g.click, `${g.label}: ${g.portsF} at ${g.pctF} at peak, full ${String(g.fullIn || '').toLowerCase()}`, { primary: !!first && g.key === first.key }) }; });
  const trfCap = { cards: capCards, hasCards: capCards.length > 0, noCards: !capCards.length, cols: Math.max(1, Math.min(4, capCards.length)), rows: Math.max(1, Math.ceil(capCards.length / 4)),
    cta: first ? act(first.portLabel || 'Add a port', 'plus-circle', first.portGo || first.click, `${first.label} fills first, ${String(first.fullIn || '').toLowerCase()}`, { primary: true }) : act('Ways to connect', 'ethernet', toWays, 'Capacity starts with your first port', { primary: true }) };

  // ---- Changes: what changed. The window as a timeline (problems as bands, each change a glyph on its day, the planned ahead
  // of now), then the list; the change a problem followed carries the problem's Trace.
  const chAll = out.changeAll || [];
  const ahead = 14 * 864e5, from = nowMs - winMs, span = winMs + ahead;
  const KIND_INK = { Config: HEALTHY, Route: 'var(--viz-4)', Maintenance: 'var(--warning)' };
  const probOf = (x) => (x.lined ? probs.find(p => x.lineF === `${p.where} · ${p.thing}: ${p.what}`) || worst : null);
  const chgVerb = (x) => { const p = probOf(x);
    if (p) return act('Trace', 'target', p.trace, `Lined up with ${p.where} · ${p.thing}: trace it`);
    if (x.kind === 'Config') return act('Activity', 'person', toLogs('user'), `${x.text}: who did it, in Logs`);
    if (x.kind === 'Maintenance') return act('Operations', 'wrench', toOps('changes'), `${x.text}: Operations, Maintenance & Changes`);
    return act('Records', 'list', toLogs('flow'), `${x.text}: the flow records around it`); };
  const posOf = (t) => `${Math.max(0, Math.min(100, (t - from) / span * 100)).toFixed(2)}%`;
  const marks = chAll.slice().sort((a, b) => a.at - b.at).map((x, i) => ({ key: x.key, i, lane: i % 2, left: posOf(x.at), icon: x.icon, ink: KIND_INK[x.kind] || 'var(--text-body)', lined: !!x.lined, upcoming: !!x.upcoming, title: `${x.whenF} · ${x.kind} · ${x.text}${x.lined ? ` · lined up with ${x.lineF}` : ''}`, open: chgVerb(x) }));
  const bands = probs.map(p => { const b = (out.chgBands || []).find(x => x.key === p.key); if (!b) return null;
    const l = parseFloat(b.left) || 0, w = parseFloat(b.width) || 0;
    return { key: p.key, left: `${(l * winMs / span).toFixed(2)}%`, width: `${Math.max(0.8, w * winMs / span).toFixed(2)}%`, ink: TRF_INK[p.state] || 'var(--error)', icon: STATE_ICON[p.state] || 'exclamation-circle', title: b.title, open: act(`${p.where} · ${p.thing}`, 'target', p.trace, `${p.what}: trace it`) }; }).filter(Boolean)
    // Each open problem its own lane of the band's height, so two that started together both read and both open.
    .map((b, i, a) => ({ ...b, top: `${(10 + i * 56 / a.length).toFixed(1)}px`, h: `${(56 / a.length - (a.length > 1 ? 2 : 0)).toFixed(1)}px` }));
  const SRC_ICON = { 'AT&T': 'check-shield', 'BGP session': 'router' };
  out.changeRows = (out.changeRows || []).map((x, i) => ({ ...x, d: i % 6, ink: KIND_INK[x.kind] || 'var(--text-body)', srcIcon: SRC_ICON[x.source] || 'person', verb: chgVerb(x), hasLine: !!x.lined }));
  const pastN = chAll.filter(x => !x.upcoming).length, linedN = chAll.filter(x => x.lined).length, cfgN = chAll.filter(x => !x.upcoming && x.kind === 'Config').length;
  const next = chAll.filter(x => x.upcoming).sort((a, b) => a.at - b.at)[0] || null;
  const linedP = chAll.find(x => x.lined);
  const chgTiles = [
    { key: 'n', icon: 'history', l: 'Changes', v: String(pastN), u: `in ${winLabel}`, go: toLogs('user'), title: `${plural(pastN, 'change', 'changes')} in ${winLabel}: Logs, User activity` },
    { key: 'lined', icon: 'exclamation-circle', l: 'Lined up', v: String(linedN), u: linedN === 1 ? 'problem' : 'problems', tone: linedN ? TRF_INK.down : HEAD, go: linedP ? chgVerb(linedP).go : toPanel('health'), title: linedN ? `${plural(linedN, 'change', 'changes')} a problem followed: trace it` : 'No change lined up with a problem' },
    { key: 'config', icon: 'gear', l: 'Config', v: String(cfgN), u: cfgN === 1 ? 'change' : 'changes', go: toLogs('user'), title: `${plural(cfgN, 'config change', 'config changes')}: who made them, in Logs` },
    { key: 'next', icon: 'wrench', l: 'Next planned', v: next ? next.whenF.replace(/, planned$/, '') : 'None', u: next ? 'maintenance' : '', go: toOps('changes'), title: next ? `${next.text}, ${next.whenF}` : 'No maintenance planned in the next 14 days' },
  ].map(tile);
  const trfChg = { marks, bands, hasMarks: marks.length > 0, nowLeft: posOf(nowMs), fromF: `${winLabel} ago`,
    ops: act('Operations', 'wrench', toOps('changes'), 'Maintenance & Changes, in Operations'),
    kinds: ['Config', 'Route', 'Maintenance'].map(k => ({ key: k, label: k, ink: KIND_INK[k], icon: { Config: 'gear', Route: 'router', Maintenance: 'wrench' }[k], n: String(chAll.filter(x => x.kind === k).length) })),
    cta: linedP ? { ...chgVerb(linedP), primary: true } : act('Activity', 'person', toLogs('user'), 'Every change, who made it, in Logs', { primary: true }) };

  const TILES = { map: mapTiles, time: timeTiles, where: whereTiles, health: healthTiles, paths: pathTiles, conn: capTiles, changes: chgTiles };
  const trfTiles = TILES[panel];
  return { trfTiles, trfTileN: trfTiles.length, trfPanel: panel, trfMap, trfTime, trfWhere, trfHealth, trfPaths, trfCap, trfChg };
}


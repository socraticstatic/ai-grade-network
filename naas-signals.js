// Insights > Signals (Micah, 2026-09-30: "Observe insights is light"; "the
// previous insights in the last one yesterday were really good"; "all need to be
// useful and action oriented"; "make sure mock data matches persona").
//
// Nine cards. Yesterday's six (Top talkers, New destinations, Shadow SaaS,
// Egress growth, Cloud-to-cloud paths, Latency over SLO) and three beside them
// (Health, Capacity, Spend). The persona picks which three lead, and each row
// carries its move. Pure: the rows in, the words and the kinds of move out;
// naas-app.js binds each kind to where it lands.

import { HEALTH_INK, HEALTH_WORD, healthRadius, RAMP_NAME } from './naas-flowmap.js';

export const CARDS = ['talkers', 'newdest', 'shadow', 'growth', 'multi', 'slo', 'health', 'capacity', 'spend'];
/** How many cards lead for a persona, and how many a page holds (two rows of three). */
export const LEAD_N = 3;
export const PAGE_N = 6;
/** The cards whose figures are traffic, the only ones a figure may open Logs from. */
export const TRAFFIC = new Set(['talkers', 'newdest', 'shadow', 'growth', 'multi', 'slo']);

// The owner's concerns lead (2026-09-30): Security new destinations, shadow SaaS
// and exposure; FinOps egress growth, spend and talkers by cost; Network Eng
// health, latency and capacity; Architect cloud to cloud and coverage (and the
// capacity it plans); Executive spend, health and how much rides AT&T.
const ORDER = {
  architect: ['multi', 'talkers', 'capacity', 'spend', 'health', 'growth', 'slo', 'newdest', 'shadow'],
  neteng: ['health', 'slo', 'capacity', 'talkers', 'multi', 'growth', 'newdest', 'shadow', 'spend'],
  security: ['newdest', 'shadow', 'talkers', 'multi', 'growth', 'health', 'slo', 'spend', 'capacity'],
  finops: ['spend', 'growth', 'talkers', 'multi', 'capacity', 'health', 'slo', 'newdest', 'shadow'],
  exec: ['spend', 'health', 'talkers', 'growth', 'multi', 'capacity', 'slo', 'newdest', 'shadow'],
};
/** The nine cards in the persona's order; an unknown persona reads as Network Eng, as roleKeyOf does. */
export const orderOf = (persona) => (ORDER[persona] || ORDER.neteng).slice();

// Top talkers answers the persona's question: by cost for FinOps, by exposure
// for Security, by coverage (what rides AT&T) for the Architect and the
// Executive, and by share of traffic for Network Eng.
const LENS = { finops: 'cost', security: 'exposure', architect: 'coverage', exec: 'coverage' };
export const lensOf = (persona) => LENS[persona] || 'share';

// The findings behind each card: the ones the Findings tab lists when its count
// is clicked. A latency spike counts on Latency over SLO only when the one rule
// calls it over (ctx.spikesOver); every spike, link and full port is Health's or
// Capacity's.
const TALKER_FINDS = {
  share: ['ipsec', 'onecloud', 'single', 'nothub'],
  cost: ['avoidable', 'ipsecegress'],
  exposure: ['pci', 'uninspected', 'unsegmented'],
  coverage: ['onecloud', 'ipsec', 'single', 'nothub', 'newcloud-oracle'],
};
const FINDS = {
  newdest: ['an-dest'],
  shadow: ['uninspected', 'pci', 'unsegmented', 'an-dest'],
  growth: ['avoidable', 'ipsecegress', 'an-egress'],
  multi: ['crosscloud'],
  spend: ['avoidable', 'ipsecegress', 'crosscloud', 'newcloud-oracle', 'an-egress'],
};
const isIncident = (k) => /^an-/.test(k) && !['an-dest', 'an-egress'].includes(k);
export function findsOf(card, lens = 'share', ctx = {}) {
  const over = ctx.spikesOver instanceof Set ? ctx.spikesOver : new Set();
  if (card === 'talkers') { const l = TALKER_FINDS[lens] || TALKER_FINDS.share; return (k) => l.includes(k); }
  if (card === 'slo') return (k) => k === 'degraded' || over.has(k);
  if (card === 'capacity') return (k) => /^an-sat-/.test(k);
  if (card === 'health') return (k) => (isIncident(k) && !/^an-sat-/.test(k)) || ['unmonitored', 'blindspots', 'single'].includes(k);
  const l = FINDS[card] || [];
  return (k) => l.includes(k);
}

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pctW = (v, max) => `${Math.max(0, Math.min(100, max > 0 ? v / max * 100 : 0)).toFixed(1)}%`;
const AT = { key: 'att', label: 'On AT&T', ink: 'var(--viz-1)' };
const PUB = { key: 'pub', label: 'Public internet', ink: 'var(--viz-6)' };

/**
 * Top talkers by the persona's lens. T: every region's traffic, as
 * { key, region, cloud, label, sub, gbps, share, priv }. pubMo is the public
 * egress spend the buckets count; covPct the share of traffic on AT&T.
 */
export function talkers(T, lens = 'share', { pubMo = 0, covPct = 0 } = {}) {
  const byG = (a, b) => b.gbps - a.gbps;
  const all = T.slice().sort(byG);
  const gMax = Math.max(0, ...all.map(t => t.gbps));
  const pub = all.filter(t => !t.priv), priv = all.filter(t => t.priv);
  const pubG = pub.reduce((a, t) => a + t.gbps, 0);
  const base = (t) => ({ key: t.key, region: t.region, label: t.label, sub: t.sub, priv: !!t.priv, fig: 'map' });
  const seg = (t) => [{ key: 's', fill: t.priv ? AT.ink : PUB.ink, w: pctW(t.gbps, gMax) }];
  if (lens === 'cost') {
    // Modelled: the public egress bill shared across the public regions by the traffic each sends.
    const cost = (t) => (pubG > 0 ? Math.round(pubMo * t.gbps / pubG / 100) * 100 : 0);
    const cMax = Math.max(0, ...pub.map(cost));
    const rows = [
      ...pub.map(t => ({ t, c: cost(t) })).sort((a, b) => b.c - a.c).map(({ t, c }) => ({ ...base(t), v: `${money(c)}/mo`, segs: [{ key: 's', fill: PUB.ink, w: pctW(c, cMax) }], act: 'Optimize', actKind: 'optimize' })),
      ...priv.map(t => ({ ...base(t), v: 'On AT&T', segs: [], act: 'Ask Andi', actKind: 'andi-region' })),
    ];
    return { key: 'talkers', title: 'Top talkers by cost', head: pubMo > 0 ? `${money(pubMo)}/mo public egress · modelled by traffic` : 'No public egress · modelled by traffic', rows, legend: [{ ...PUB, label: 'Public egress, modelled' }, AT], empty: 'No traffic yet.' };
  }
  if (lens === 'exposure') {
    const rows = [...pub, ...priv].map(t => ({ ...base(t), v: `${t.gbps.toFixed(1)} Gbps`, segs: seg(t), ...(t.priv ? { act: 'Policies', actKind: 'policies' } : { act: 'Set policy', actKind: 'policy-region' }) }));
    const head = pub.length ? `${pub.length} ${pub.length === 1 ? 'region' : 'regions'} on the public internet · ${pubG.toFixed(1)} Gbps` : 'Every region rides AT&T';
    return { key: 'talkers', title: 'Top talkers by exposure', head, rows, legend: [PUB, AT], empty: 'No traffic yet.' };
  }
  const rows = all.map(t => ({ ...base(t), v: t.share, segs: seg(t), ...(t.priv ? { act: 'Ask Andi', actKind: 'andi-region' } : { act: 'Attach', actKind: 'attach' }) }));
  if (lens === 'coverage') {
    return { key: 'talkers', title: 'Top talkers by coverage', head: `${priv.length || 'None'} of ${all.length} ${all.length === 1 ? 'region' : 'regions'} on AT&T · ${covPct}% of traffic`, rows, legend: [AT, PUB], empty: 'No traffic yet.' };
  }
  const top = all[0];
  return { key: 'talkers', title: 'Top talkers', head: top ? `${top.label} · ${top.share} of traffic` : 'No traffic yet', rows, legend: [AT, PUB], empty: 'No traffic yet.' };
}

/** New destinations in the window, by volume. The list is sample data and says so. */
export function newdest(rows, { n = rows.length, win = '30 days' } = {}) {
  const seen = new Map();
  rows.forEach(d => { if (!seen.has(d.cls)) seen.set(d.cls, d.fill); });
  // The class and when it first showed, short enough to read beside its bar.
  const when = (d) => (d.day === 0 ? 'first seen today' : d.day === 1 ? 'first seen yesterday' : `${d.day} days ago`);
  return { key: 'newdest', title: `New destinations · ${win}`, head: n ? `${n} new, by volume · sample` : 'None new · sample',
    rows: rows.map(d => ({ key: d.key, label: d.name, sub: d.cls && d.day != null ? `${d.cls} · ${when(d)}` : d.sub, v: d.v, segs: [{ key: 's', fill: d.fill, w: d.w }], act: 'Set policy', actKind: 'policy-dest', fig: 'logs' })),
    legend: [...seen].map(([label, ink]) => ({ key: label, label, ink })), empty: 'No new destination in this window.' };
}

/** SaaS domains reached with no policy, the uncovered first. Sample data, and it says so. */
export function shadow(rows, { n = 0, gb = '0.0' } = {}) {
  const has = (c) => rows.some(d => !!d.covered === c);
  return { key: 'shadow', title: 'Shadow SaaS', head: n ? `${n} with no policy · ${gb} GB/day · sample` : 'Every domain has a policy · sample',
    rows: rows.map(d => ({ key: d.key, label: d.name, sub: d.sub, v: d.v, segs: [{ key: 's', fill: d.fill, w: d.w }], fig: 'logs', ...(d.covered ? { act: 'Policies', actKind: 'policies' } : { act: 'Set policy', actKind: 'policy-dest' }) })),
    legend: [...(has(false) ? [{ key: 'none', label: 'No policy', ink: 'var(--viz-4)' }] : []), ...(has(true) ? [{ key: 'cov', label: 'Covered', ink: 'var(--viz-1)' }] : [])], empty: 'No SaaS domain seen yet.' };
}

const flowAct = (f) => (f.steerable ? { act: 'Steer', actKind: 'steer' } : { act: 'Ask Andi', actKind: 'andi-flow' });

/** Every cloud-to-cloud flow and the path it takes. */
export function multi(rows, { privN = 0, totalN = rows.length } = {}) {
  return { key: 'multi', title: 'Cloud-to-cloud paths', head: totalN ? `${privN || 'None'} of ${totalN} on AT&T` : 'No cloud-to-cloud traffic',
    rows: rows.map(f => ({ key: f.key, id: f.id, region: f.region, label: f.name, sub: f.sub, v: f.v, segs: [{ key: 's', fill: f.fill, w: f.w }], fig: 'map-state', ...flowAct(f) })),
    legend: [AT, PUB], empty: 'Nothing crosses between clouds in this window.' };
}

/** The flows over the latency SLO, worst first, in the Over SLO ink. */
export function slo(rows, { n = rows.length, total = 0, SLO = 100, worst = null } = {}) {
  // With nothing over, the card still says how close the slowest flow runs.
  const empty = `No flow runs over ${SLO} ms in this window.${worst ? ` The slowest, ${worst.name}${worst.where && !worst.name.includes(worst.where) ? ` in ${worst.where}` : ''}, takes ${worst.ms} ms.` : ''}`;
  return { key: 'slo', title: 'Latency over SLO', head: n ? `${n} of ${total} flows over ${SLO} ms` : `None of ${total} flows over ${SLO} ms`, empty,
    // An app flow is named for its tag group; the line under it says where it runs.
    rows: rows.map(f => ({ key: f.key, id: f.id, region: f.region, label: f.name, sub: f.where ? `${f.where} · ${f.sub}` : f.sub, v: f.v, segs: [{ key: 's', fill: f.fill, w: f.w }], fig: 'map-slo', ...flowAct(f) })),
    legend: [{ key: 'slo', label: `Over ${SLO} ms`, ink: HEALTH_INK.slo }] };
}

/** Twelve weeks of egress, AT&T under public; the move is Optimize. */
export function growth(g) {
  return { key: 'growth', title: 'Egress growth · 12 weeks', head: g.subF, isCols: true,
    cols: g.weeks.map(w => ({ key: w.key, pubH: w.pubH, fabH: w.fabH, title: w.title })), thenLabel: g.thenLabel, nowLabel: g.nowLabel,
    act: 'Optimize', actKind: 'optimize', rows: [], legend: [AT, PUB], empty: '' };
}

/**
 * Spend by bucket: today split into what it costs at the AT&T rate and what
 * moving saves; the most to save first. B: { id, name, cloud, today, fabric }.
 */
export function spend(B) {
  const save = (b) => Math.max(0, b.today - b.fabric);
  const all = B.slice().sort((a, b) => save(b) - save(a) || b.today - a.today);
  const max = Math.max(0, ...all.map(b => b.today));
  const total = all.reduce((a, b) => a + b.today, 0), saveT = all.reduce((a, b) => a + save(b), 0);
  const rows = all.map(b => { const sv = save(b);
    return { key: b.id, label: b.name, sub: sv ? `${b.cloud} · save ${money(sv)}/mo on AT&T` : `${b.cloud} · at the AT&T rate`, v: `${money(b.today)}/mo`, fig: 'bucket',
      segs: sv ? [{ key: 'att', fill: 'var(--viz-1)', w: pctW(b.fabric, max) }, { key: 'save', fill: 'var(--viz-4)', w: pctW(sv, max) }] : [{ key: 'att', fill: 'var(--viz-1)', w: pctW(b.today, max) }],
      ...(sv ? { act: 'Optimize', actKind: 'optimize' } : { act: 'By bucket', actKind: 'bucket' }) }; });
  return { key: 'spend', title: 'Spend by bucket', head: !total ? 'No egress spend yet' : saveT ? `Save ${money(saveT)}/mo of ${money(total)}/mo egress` : `${money(total)}/mo egress, all at the AT&T rate`,
    rows, legend: [{ key: 'att', label: 'At the AT&T rate', ink: 'var(--viz-1)' }, ...(saveT ? [{ key: 'save', label: 'Saved by moving', ink: 'var(--viz-4)' }] : [])], empty: 'Egress shows here once a bucket is priced.' };
}

/**
 * Capacity: each connection by its peak against what is bought, fullest first.
 * Add a port at 80% and above; Resize where one fewer port holds the peak.
 */
export function capacity(cap) {
  const all = cap.slice().sort((a, b) => b.peakPct - a.peakPct);
  const fill = { down: HEALTH_INK.down, risk: HEALTH_INK.risk };
  const hot = all.filter(r => r.peakPct >= 80).length, shrink = all.filter(r => r.oversized).length;
  const room = (r) => (r.fullIn === 'Now' ? 'full now' : r.fullIn === 'Over a year' ? 'room for a year' : `full ${r.fullIn}`);
  // The ports lead the line; the connection type is in the row's title (naas-app.js adds it).
  const rows = all.map(r => ({ key: r.id, region: r.region, label: `${r.cloud} ${r.region}`, ramp: RAMP_NAME[r.ramp] || 'NetBond',
    sub: `${r.state === 'down' ? `${HEALTH_WORD.down} · ` : ''}${r.ports} × ${r.portG} Gbps · ${r.oversized ? `${r.resizeTo} would hold the peak` : room(r)}`,
    v: `${r.peakPct}%`, track: true, segs: [{ key: 's', fill: fill[r.state] || 'var(--viz-2)', w: pctW(r.peakPct, 100) }], fig: 'conn',
    ...(r.peakPct >= 80 ? { act: 'Add a port', actKind: 'port' } : r.oversized ? { act: 'Resize', actKind: 'resize' } : { act: 'Ask Andi', actKind: 'andi-region' }) }));
  const head = !all.length ? 'No ports to measure' : `${hot ? `${hot} of ${all.length}` : `None of ${all.length}`} above 80% at peak${shrink ? ` · ${shrink} could shrink` : ''}`;
  const legend = [{ key: 'ok', label: 'Peak use', ink: 'var(--viz-2)' },
    ...(all.some(r => r.state === 'risk') ? [{ key: 'risk', label: 'Above 80%', ink: HEALTH_INK.risk }] : []),
    ...(all.some(r => r.state === 'down') ? [{ key: 'down', label: HEALTH_WORD.down, ink: HEALTH_INK.down, rad: healthRadius('down') }] : [])];
  // Nothing attached: the first step is to attach, and the card offers it (naas-app.js binds emptyKind).
  return { key: 'capacity', title: 'Capacity', head, rows, legend, empty: 'No connection on AT&T yet. Attach a region and its ports show here.', emptyAct: 'Attach', emptyKind: 'attach' };
}

/**
 * Health: the open problems ranked by apps affected, then severity, then
 * workloads; each in the one health ink and word, and each traced.
 * P: { key, state, where, thing, what, appsN, wlN, apps? }.
 */
export function health(P) {
  const SEV = { down: 0, slo: 1, risk: 2 };
  const all = P.slice().sort((a, b) => b.appsN - a.appsN || (SEV[a.state] ?? 3) - (SEV[b.state] ?? 3) || (b.wlN || 0) - (a.wlN || 0));
  const aMax = Math.max(0, ...all.map(p => p.appsN));
  const rows = all.map(p => ({ key: p.key, region: p.region, label: `${p.where} · ${p.thing}`, sub: `${HEALTH_WORD[p.state] || ''} · ${p.what}`, v: `${p.appsN} ${p.appsN === 1 ? 'app' : 'apps'}`,
    segs: [{ key: 's', fill: HEALTH_INK[p.state] || HEALTH_INK.risk, w: pctW(p.appsN, aMax), rad: healthRadius(p.state) }], rad: healthRadius(p.state), act: 'Trace', actKind: 'trace', fig: 'finding' }));
  // Apps count once however many problems they sit behind.
  const apps = all.every(p => Array.isArray(p.apps)) ? new Set(all.flatMap(p => p.apps)).size : all.reduce((a, p) => a + p.appsN, 0);
  const legend = ['down', 'slo', 'risk'].filter(st => all.some(p => p.state === st)).map(st => ({ key: st, label: HEALTH_WORD[st], ink: HEALTH_INK[st], rad: healthRadius(st) }));
  return { key: 'health', title: 'Health', head: all.length ? `${all.length} ${all.length === 1 ? 'problem' : 'problems'} · ${apps} ${apps === 1 ? 'app' : 'apps'} affected` : 'No problems open', rows, legend, empty: 'Nothing is down or over SLO in this window.' };
}

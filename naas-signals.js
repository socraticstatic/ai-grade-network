// Insights > Signals (Micah, 2026-09-30: "Observe insights is light"; "the
// previous insights in the last one yesterday were really good"; "all need to be
// useful and action oriented"; "make sure mock data matches persona").
//
// Nine cards. Yesterday's six (Top talkers, New destinations, Shadow SaaS,
// Egress growth, Cloud-to-cloud paths, Latency over SLO) and three beside them
// (Health, Capacity, Spend). The persona picks which three lead, and each row
// carries its move. Pure: the rows in, the words and the kinds of move out;
// naas-app.js binds each kind to where it lands.
//
// A row reads on three lines (second round, 2026-09-30, "text must not truncate
// the figure that matters"): what it is and its figure; what it means and the
// figure beside it (v2, the Gbps yesterday's cards showed); then its bar.

import { HEALTH_INK, HEALTH_WORD, healthRadius, RAMP_NAME } from './naas-flowmap.js';

export const CARDS = ['talkers', 'newdest', 'shadow', 'growth', 'multi', 'slo', 'health', 'capacity', 'spend'];
/** How many cards lead for a persona, and how many a page holds (two rows of three). */
export const LEAD_N = 3;
export const PAGE_N = 6;
/** The cards whose figures are traffic, the only ones a figure may open Logs from. */
export const TRAFFIC = new Set(['talkers', 'newdest', 'shadow', 'growth', 'multi', 'slo']);

// The owner's concerns lead (2026-09-30): Security new destinations, shadow SaaS
// and exposure; FinOps egress growth, spend and talkers by egress; Network Eng
// health, latency and capacity; Architect cloud to cloud and coverage (and the
// capacity it plans); Executive spend, health and how much rides AT&T.
const ORDER = {
  architect: ['multi', 'talkers', 'capacity', 'spend', 'health', 'growth', 'slo', 'newdest', 'shadow'],
  neteng: ['health', 'slo', 'capacity', 'talkers', 'multi', 'growth', 'newdest', 'shadow', 'spend'],
  security: ['newdest', 'shadow', 'talkers', 'multi', 'growth', 'health', 'slo', 'spend', 'capacity'],
  finops: ['spend', 'growth', 'talkers', 'multi', 'capacity', 'health', 'slo', 'newdest', 'shadow'],
  exec: ['spend', 'health', 'talkers', 'growth', 'multi', 'capacity', 'slo', 'newdest', 'shadow'],
};
/**
 * The nine cards in the persona's order; an unknown persona reads as Network
 * Eng, as roleKeyOf does. A card with nothing to show never leads (second
 * round, 2026-09-30): the empty ones go last, in the same order.
 */
export const orderOf = (persona, empty = new Set()) => {
  const o = ORDER[persona] || ORDER.neteng;
  return [...o.filter(k => !empty.has(k)), ...o.filter(k => empty.has(k))];
};

// Top talkers answers the persona's question: by egress for FinOps, by exposure
// for Security, by coverage (what rides AT&T) for the Architect and the
// Executive, and by share of traffic for Network Eng. FinOps' lens was "by
// cost" until the second round (2026-09-30): the buckets price egress by cloud,
// so a dollar per region contradicted Spend by bucket beside it.
const LENS = { finops: 'egress', security: 'exposure', architect: 'coverage', exec: 'coverage' };
export const lensOf = (persona) => LENS[persona] || 'share';

// The findings behind each card: the ones the Findings tab lists when its count
// is clicked. A lead card opens only its persona's own work (second round,
// 2026-09-30): coverage and topology are the Architect's (onecloud, single,
// nothub, crosscloud, the Oracle regions discovery finds), IPsec sites and
// what is unseen are Network Eng's, egress is FinOps'. A latency spike counts
// on Latency over SLO only when the one rule calls it over (ctx.spikesOver);
// every link and full port is Health's or Capacity's.
const TALKER_FINDS = {
  share: ['ipsec'],
  egress: ['avoidable', 'ipsecegress'],
  exposure: ['pci', 'uninspected', 'unsegmented'],
  coverage: ['onecloud', 'single', 'nothub', 'newcloud-oracle'],
};
const FINDS = {
  newdest: ['an-dest'],
  shadow: ['uninspected', 'pci', 'unsegmented', 'an-dest'],
  growth: ['avoidable', 'ipsecegress', 'an-egress'],
  multi: ['crosscloud'],
  spend: ['avoidable', 'ipsecegress', 'an-egress'],
};
// The Architect's Capacity and Spend (third round, 2026-09-30): its Capacity led
// with a full port Network Eng owns, and on Small its Spend led with FinOps'
// avoidable egress. The capacity it plans is a second path (single); the money
// it moves is the cross-cloud and newly found clouds' buckets, the rows those
// findings price on Spend.
const ARCH_FINDS = {
  capacity: (k) => k === 'single',
  spend: (k) => k === 'crosscloud' || /^newcloud-/.test(k),
};
const isIncident = (k) => /^an-/.test(k) && !['an-dest', 'an-egress'].includes(k);
export function findsOf(card, lens = 'share', ctx = {}) {
  const over = ctx.spikesOver instanceof Set ? ctx.spikesOver : new Set();
  if (ctx.persona === 'architect' && ARCH_FINDS[card]) return ARCH_FINDS[card];
  if (card === 'talkers') { const l = TALKER_FINDS[lens] || TALKER_FINDS.share; return (k) => l.includes(k); }
  if (card === 'slo') return (k) => k === 'degraded' || over.has(k);
  if (card === 'capacity') return (k) => /^an-sat-/.test(k);
  if (card === 'health') return (k) => (isIncident(k) && !/^an-sat-/.test(k)) || ['unmonitored', 'blindspots'].includes(k);
  const l = FINDS[card] || [];
  return (k) => l.includes(k);
}

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pctW = (v, max) => `${Math.max(0, Math.min(100, max > 0 ? v / max * 100 : 0)).toFixed(1)}%`;
const gb = (g) => `${(+g || 0).toFixed(1)} Gbps`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const AT = { key: 'att', label: 'On AT&T', ink: 'var(--viz-1)' };
const PUB = { key: 'pub', label: 'Public internet', ink: 'var(--viz-6)' };
// One colour, one meaning across Cost and Insights (2026-09-30): a saving is
// --success, at risk (no policy) is --warning; --viz-3 and --viz-4 are the same
// values, so no card paints with them.
const SAVE = 'var(--success)', RISK = 'var(--warning)';

/**
 * Top talkers by the persona's lens. T: every region's traffic, as
 * { key, region, cloud, label, sub, gbps, share, priv, ramp, pubG }:
 * pubG is what the region sends outside AT&T, its cross-cloud pairs included.
 * pubMo is the public egress spend the buckets count (0 when Traffic is scoped:
 * the buckets are not split by region); covPct the share of traffic on AT&T;
 * billsPub each cloud whose buckets still bill above the AT&T rate, by name.
 */
export function talkers(T, lens = 'share', { pubMo = 0, covPct = 0, billsPub = {} } = {}) {
  const byG = (a, b) => b.gbps - a.gbps;
  const all = T.slice().sort(byG);
  const gMax = Math.max(0, ...all.map(t => t.gbps));
  // What leaves AT&T, by region (third round, 2026-09-30): a region on AT&T whose
  // cross-cloud pair rides the public internet sends public traffic too, as
  // Cloud-to-cloud, Coverage and the cross-cloud bucket beside this card count it.
  const pubG = (t) => (t.pubG != null ? +t.pubG : t.priv ? 0 : t.gbps);
  const out = all.filter(t => pubG(t) > 0).sort((a, b) => pubG(b) - pubG(a)), on = all.filter(t => !(pubG(t) > 0));
  const outG = out.reduce((a, t) => a + pubG(t), 0), outMax = Math.max(0, ...out.map(pubG));
  const outSub = (t) => (t.priv ? `${t.ramp || 'On AT&T'} · cross-cloud public` : t.sub);
  const base = (t) => ({ key: t.key, region: t.region, label: t.label, sub: t.sub, priv: !!t.priv, fig: 'map' });
  const bar = (t, max) => [{ key: 's', fill: t.priv ? AT.ink : PUB.ink, w: pctW(t.gbps, max) }];
  const outBar = (t) => [{ key: 's', fill: PUB.ink, w: pctW(pubG(t), outMax) }];
  // Each region's share of what leaves AT&T, whole percents that add up to 100 (largest remainder).
  const share = (() => { const raw = out.map(t => (outG > 0 ? pubG(t) / outG * 100 : 0)), fl = raw.map(Math.floor);
    let left = outG > 0 ? 100 - fl.reduce((a, x) => a + x, 0) : 0;
    raw.map((x, i) => [x - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i] += 1; left -= 1; } });
    return new Map(out.map((t, i) => [t, `${fl[i]}% of public`])); })();
  if (lens === 'egress') {
    // What bills as public egress: the Gbps each region sends outside AT&T, on the
    // public regions' own scale; the dollars are the buckets' total, never split by
    // region (the buckets price by cloud), so the head names no region count. A
    // cloud a bucket still bills public with nothing of it outside AT&T says so on
    // its rows (Bank scale's GCP GPU inference bucket, us-central1 on NetBond).
    const outClouds = new Set(out.map(t => t.cloud));
    const bills = (t) => (!outClouds.has(t.cloud) && (billsPub[t.cloud] || []).length ? billsPub[t.cloud] : null);
    const rows = [
      ...out.map(t => ({ ...base(t), sub: outSub(t), v: gb(pubG(t)), v2: share.get(t), segs: outBar(t), act: 'Optimize', actKind: 'optimize' })),
      ...on.map(t => (bills(t) ? { ...base(t), sub: `${bills(t).join(' and ')} bills public`, v: gb(t.gbps), v2: 'On AT&T', segs: [], act: 'Optimize', actKind: 'optimize' }
        : { ...base(t), v: gb(t.gbps), v2: 'On AT&T', segs: [], act: 'Ask Andi', actKind: 'andi-region' })),
    ];
    const head = pubMo > 0 ? `${money(pubMo)}/mo public egress · ${gb(outG)}` : out.length ? `${gb(outG)} public egress` : 'No public egress';
    return { key: 'talkers', title: 'Top talkers by egress', head, rows, legend: [{ ...PUB, label: 'Public egress' }, AT], empty: 'No traffic yet.' };
  }
  if (lens === 'exposure') {
    // The exposed on their own scale, cross-cloud pairs included; what rides AT&T
    // draws nothing (2026-09-30). The head's share of traffic is Coverage's
    // complement; each row's share is of the exposed, so the rows add up to it.
    const rows = [
      ...out.map(t => ({ ...base(t), sub: outSub(t), v: gb(pubG(t)), v2: share.get(t), segs: outBar(t), act: 'Set policy', actKind: 'policy-region' })),
      ...on.map(t => ({ ...base(t), v: gb(t.gbps), v2: 'On AT&T', segs: [], act: 'Policies', actKind: 'policies' })),
    ];
    const head = out.length ? `${gb(outG)} public · ${100 - covPct}% of traffic` : 'Every region rides AT&T';
    return { key: 'talkers', title: 'Top talkers by exposure', head, rows, legend: [{ ...PUB, label: 'Exposed, public internet' }], empty: 'No traffic yet.' };
  }
  const rows = all.map(t => ({ ...base(t), v: t.share, v2: gb(t.gbps), segs: bar(t, gMax), ...(t.priv ? { act: 'Ask Andi', actKind: 'andi-region' } : { act: 'Attach', actKind: 'attach' }) }));
  if (lens === 'coverage') {
    const priv = all.filter(t => t.priv);
    return { key: 'talkers', title: 'Top talkers by coverage', head: `${priv.length || 'None'} of ${all.length} ${all.length === 1 ? 'region' : 'regions'} on AT&T · ${covPct}% of traffic`, rows, legend: [AT, PUB], empty: 'No traffic yet.' };
  }
  const top = all[0];
  return { key: 'talkers', title: 'Top talkers', head: top ? `${top.label} · ${top.share} of traffic` : 'No traffic yet', rows, legend: [AT, PUB], empty: 'No traffic yet.' };
}

/** New destinations in the window, by volume. None has a policy yet, so each is at risk. The list is sample data and says so. */
export function newdest(rows, { n = rows.length, win = '30 days' } = {}) {
  const when = (d) => (d.day === 0 ? 'today' : d.day === 1 ? 'yesterday' : `${d.day} days ago`);
  return { key: 'newdest', title: `New destinations · ${win}`, head: n ? `${n} new, by volume · sample` : 'None new · sample',
    rows: rows.map(d => ({ key: d.key, label: d.name, sub: d.cls ? `${d.cls} · no policy` : d.sub, v: d.v, v2: d.day != null ? when(d) : '', segs: [{ key: 's', fill: RISK, w: d.w }], act: 'Set policy', actKind: 'policy-dest', fig: 'logs' })),
    legend: rows.length ? [{ key: 'none', label: 'No policy', ink: RISK }] : [], empty: 'No new destination in this window.' };
}

/**
 * SaaS domains reached with no policy, the uncovered first. Sample data, and it
 * says so. A covered domain draws no bar (third round, 2026-09-30): it painted
 * --viz-1, which means On AT&T on every other card, so zoom.us and github.com
 * read as AT&T paths; the bars are what is at risk, as exposure draws only the exposed.
 */
export function shadow(rows, { n = 0, gb: gbDay = '0.0' } = {}) {
  const risk = rows.filter(d => !d.covered);
  return { key: 'shadow', title: 'Shadow SaaS', head: n ? `${n} with no policy · ${gbDay} GB/day · sample` : 'Every domain has a policy · sample',
    rows: rows.map(d => ({ key: d.key, label: d.name, sub: d.sub, v: d.v, v2: '', segs: d.covered ? [] : [{ key: 's', fill: RISK, w: d.w }], fig: 'logs', ...(d.covered ? { act: 'Policies', actKind: 'policies' } : { act: 'Set policy', actKind: 'policy-dest' }) })),
    legend: risk.length ? [{ key: 'none', label: 'No policy', ink: RISK }] : [], empty: 'No SaaS domain seen yet.' };
}

// A flow already on AT&T asks Andi; one with an end on AT&T is steered; with
// neither end on AT&T the first step is to attach its region (2026-09-30: Small
// offered Steer with nothing attached; third round: so did Growing's unattached pairs).
const flowAct = (f) => (f.controlled ? { act: 'Ask Andi', actKind: 'andi-flow' } : f.steerable ? { act: 'Steer', actKind: 'steer' } : { act: 'Attach', actKind: 'attach' });

/** Every cloud-to-cloud flow, the Gbps it carries and the path it takes. */
export function multi(rows, { privN = 0, totalN = rows.length } = {}) {
  return { key: 'multi', title: 'Cloud-to-cloud paths', head: totalN ? `${privN || 'None'} of ${totalN} on AT&T` : 'No cloud-to-cloud traffic',
    rows: rows.map(f => ({ key: f.key, id: f.id, region: f.region, label: f.label || f.name, sub: f.clouds ? `${f.clouds} · ${f.path}` : f.path, v: f.v, v2: `${f.ms} ms`, segs: [{ key: 's', fill: f.fill, w: f.w }], fig: 'map-state', ...flowAct(f) })),
    legend: [AT, PUB], empty: 'Nothing crosses between clouds in this window.' };
}

/**
 * Latency over SLO by the one rule Health uses (second round, 2026-09-30):
 * a flow is over when healthOf calls it over against its path's SLO (20 ms on
 * AT&T, 100 ms outside), and a latency spike Health calls Over SLO is here too,
 * at its peak. Worst first, in the Over SLO ink.
 * rows: { key, id, region, name, where, path, ms, slo, gbps, controlled, steerable }.
 * spikes: { key, region, where, ms }.
 */
export function slo(rows, { total = 0, spikes = [], closest = null } = {}) {
  const all = [
    ...spikes.map(p => ({ key: p.key, region: p.region, label: 'Latency spike', sub: `${p.where} · public internet`, ms: p.ms, v: `${p.ms} ms`, v2: 'p95 at peak', fig: 'finding', act: 'Trace', actKind: 'trace' })),
    ...rows.map(f => ({ key: f.key, id: f.id, region: f.region, label: f.label || f.name, sub: `${f.where} · ${f.path}`, ms: f.ms, v: `${f.ms} ms`, v2: gb(f.gbps), fig: 'map-slo', ...flowAct(f) })),
  ].sort((a, b) => b.ms - a.ms);
  const max = Math.max(0, ...all.map(r => r.ms));
  const n = rows.length, sp = spikes.length;
  const head = n || sp ? `${n ? `${n} of ${total} flows` : `None of ${total} flows`} over SLO${sp ? ` · ${plural(sp, 'spike', 'spikes')}` : ''}` : `None of ${total} flows over SLO`;
  // With nothing over, the card still says how close the closest flow runs.
  const empty = `No flow runs over its SLO in this window.${closest ? ` The closest, ${closest.name}${closest.where && !closest.name.includes(closest.where) ? ` in ${closest.where}` : ''}, takes ${closest.ms} ms against ${closest.slo} ms.` : ''}`;
  return { key: 'slo', title: 'Latency over SLO', head, empty,
    rows: all.map(({ ms, ...r }) => ({ ...r, segs: [{ key: 's', fill: HEALTH_INK.slo, w: pctW(ms, max) }] })),
    legend: [{ key: 'slo', label: 'Over SLO · 20 ms on AT&T, 100 outside', ink: HEALTH_INK.slo }] };
}

/**
 * Twelve weeks of egress, AT&T under public; the move is Optimize. Each week is
 * a row too (second round, 2026-09-30): a week's column and the labels under
 * the first and last open the twelve in place, that week marked.
 * g.weeks: { key, label, pub, fab, pubH, fabH, title, moF }.
 */
export function growth(g) {
  const mx = Math.max(0, ...g.weeks.map(w => w.pub + w.fab));
  const rows = g.weeks.map(w => ({ key: w.key, label: w.label, sub: `AT&T ${gb(w.fab)}`, v: w.moF || gb(w.pub), v2: `public ${gb(w.pub)}`, fig: 'week', act: 'Optimize', actKind: 'optimize',
    segs: [{ key: 'pub', fill: PUB.ink, w: pctW(w.pub, mx) }, { key: 'fab', fill: AT.ink, w: pctW(w.fab, mx) }] })).reverse();
  return { key: 'growth', title: 'Egress growth · 12 weeks', head: g.subF, isCols: true,
    cols: g.weeks.map(w => ({ key: w.key, pubH: w.pubH, fabH: w.fabH, title: w.title })), thenLabel: g.thenLabel, nowLabel: g.nowLabel,
    thenKey: g.weeks[0] ? g.weeks[0].key : null, nowKey: g.weeks.length ? g.weeks[g.weeks.length - 1].key : null,
    act: 'Optimize', actKind: 'optimize', rows, legend: [AT, PUB], empty: '' };
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
    return { key: b.id, label: b.name, sub: sv ? `${b.cloud} · ${money(b.fabric)}/mo on AT&T` : `${b.cloud} · at the AT&T rate`, v: `${money(b.today)}/mo`, v2: sv ? `save ${money(sv)}` : '', fig: 'bucket',
      segs: sv ? [{ key: 'att', fill: AT.ink, w: pctW(b.fabric, max) }, { key: 'save', fill: SAVE, w: pctW(sv, max) }] : [{ key: 'att', fill: AT.ink, w: pctW(b.today, max) }],
      ...(sv ? { act: 'Optimize', actKind: 'optimize' } : { act: 'By bucket', actKind: 'bucket' }) }; });
  return { key: 'spend', title: 'Spend by bucket', head: !total ? 'No egress spend yet' : saveT ? `Save ${money(saveT)}/mo of ${money(total)}/mo egress` : `${money(total)}/mo egress, all at the AT&T rate`,
    rows, legend: [{ key: 'att', label: 'At the AT&T rate', ink: AT.ink }, ...(saveT ? [{ key: 'save', label: 'To save on AT&T', ink: SAVE }] : [])], empty: 'Egress shows here once a bucket is priced.' };
}

/**
 * Capacity: each connection by its peak against what is bought, fullest first.
 * A connection that is down is traced first, as Health traces it (2026-09-30);
 * otherwise Add a port at 80% and above, Resize where one fewer port holds the peak.
 */
export function capacity(cap) {
  const all = cap.slice().sort((a, b) => b.peakPct - a.peakPct);
  const fill = { down: HEALTH_INK.down, risk: HEALTH_INK.risk };
  const hot = all.filter(r => r.peakPct >= 80).length, shrink = all.filter(r => r.oversized && r.state !== 'down').length;
  const room = (r) => (r.fullIn === 'Now' ? 'full now' : r.fullIn === 'Over a year' ? 'room for a year' : `full ${r.fullIn}`);
  const move = (r) => (r.state === 'down' ? { act: 'Trace', actKind: 'trace', probKey: 'an-link-' + r.region }
    : r.peakPct >= 80 ? { act: 'Add a port', actKind: 'port' } : r.oversized ? { act: 'Resize', actKind: 'resize' } : { act: 'Ask Andi', actKind: 'andi-region' });
  // The connection type is in the row's title (naas-app.js adds it).
  const rows = all.map(r => ({ key: r.id, region: r.region, label: `${r.cloud} ${r.region}`, ramp: RAMP_NAME[r.ramp] || 'NetBond',
    sub: r.state === 'down' ? `${HEALTH_WORD.down} · BGP flapping` : r.oversized ? `${r.resizeTo} would hold the peak` : room(r),
    v: `${r.peakPct}%`, v2: `${r.ports} × ${r.portG} Gbps`, track: true, segs: [{ key: 's', fill: fill[r.state] || 'var(--viz-2)', w: pctW(r.peakPct, 100), rad: r.state === 'down' ? healthRadius('down') : undefined }], fig: 'conn', ...move(r) }));
  const head = !all.length ? 'No ports to measure' : `${hot ? `${hot} of ${all.length}` : `None of ${all.length}`} above 80% at peak${shrink ? ` · ${shrink} could shrink` : ''}`;
  const legend = [{ key: 'ok', label: 'Peak use', ink: 'var(--viz-2)' },
    ...(all.some(r => r.state === 'risk') ? [{ key: 'risk', label: 'Above 80%', ink: HEALTH_INK.risk }] : []),
    ...(all.some(r => r.state === 'down') ? [{ key: 'down', label: HEALTH_WORD.down, ink: HEALTH_INK.down, rad: healthRadius('down') }] : [])];
  // Nothing attached: the first step is to attach, and the card offers it (naas-app.js binds emptyKind).
  return { key: 'capacity', title: 'Capacity', head, rows, legend, empty: 'No connection on AT&T yet. Attach a region and its ports show here.', emptyAct: 'Attach', emptyKind: 'attach' };
}

/**
 * Health: the open problems ranked by apps affected, then severity, then
 * workloads; each in the one health ink and word, and each traced. The figure
 * that makes it a problem sits beside the word (2026-09-30: "p95 1…" hid it).
 * A port near full gets the move Capacity gives the same connection, Add a port
 * (third round, 2026-09-30: Health said Trace and Capacity Add a port for one
 * connection, on one page); a Down link is traced on both.
 * P: { key, kind?, state, where, thing, what, short?, fig?, appsN, wlN, apps? }.
 */
export function health(P) {
  const SEV = { down: 0, slo: 1, risk: 2 };
  const all = P.slice().sort((a, b) => b.appsN - a.appsN || (SEV[a.state] ?? 3) - (SEV[b.state] ?? 3) || (b.wlN || 0) - (a.wlN || 0));
  const aMax = Math.max(0, ...all.map(p => p.appsN));
  const rows = all.map(p => ({ key: p.key, region: p.region, label: `${p.where} · ${p.thing}`, sub: `${HEALTH_WORD[p.state] || ''} · ${p.short || p.what}`, v: `${p.appsN} ${p.appsN === 1 ? 'app' : 'apps'}`, v2: p.fig || '',
    segs: [{ key: 's', fill: HEALTH_INK[p.state] || HEALTH_INK.risk, w: pctW(p.appsN, aMax), rad: healthRadius(p.state) }], rad: healthRadius(p.state), ...(p.kind === 'sat' ? { act: 'Add a port', actKind: 'port' } : { act: 'Trace', actKind: 'trace' }), fig: 'finding' }));
  // Apps count once however many problems they sit behind.
  const apps = all.every(p => Array.isArray(p.apps)) ? new Set(all.flatMap(p => p.apps)).size : all.reduce((a, p) => a + p.appsN, 0);
  const legend = ['down', 'slo', 'risk'].filter(st => all.some(p => p.state === st)).map(st => ({ key: st, label: HEALTH_WORD[st], ink: HEALTH_INK[st], rad: healthRadius(st) }));
  return { key: 'health', title: 'Health', head: all.length ? `${all.length} ${all.length === 1 ? 'problem' : 'problems'} · ${apps} ${apps === 1 ? 'app' : 'apps'} affected` : 'No problems open', rows, legend, empty: 'Nothing is down or over SLO in this window.' };
}

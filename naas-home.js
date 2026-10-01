/*
 * AT&T AI-grade Network, NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The NaaS home, v2 (Micah, 2026-09-30: "home page is too wordy! this isn't a
// white paper"; "snapshot views"; "more visual, what's the take-away";
// "actionability"; "it needs to tell a story without words - visuals"). The
// approved mockup: one take-away per persona, four snapshot cards each with a
// picture, Waiting on you as three chips, and the Connect network map below
// the fold. The skeptic's rules (2026-09-30): the take-away leads with the
// worst live thing for the role; no card repeats it; every figure is printed
// on the page its door opens.
//
// Pure: every figure arrives from the page that owns it (problemRows,
// roleActAll, spendTiles, spendCols, invStats, rollup, glanceRings,
// healthTiles, pathFlowAll); this module only picks, words and draws them.
// The doors arrive as functions from naas-app.js, so a figure here opens
// exactly the set its page counts.
import { HEALTH_INK, HEALTH_WORD, healthRadius } from './naas-flowmap.js';

/**
 * Which four cards show, by persona, leading card first. No card repeats the
 * take-away (skeptic, 2026-09-30): the Architect's take-away is the On AT&T
 * card's own figure and Security's is the Exposed card's, so each gives that
 * slot to another snapshot (Security gets Tags, the Architect Tags too).
 */
export const CARD_ORDER = {
  architect: ['egress', 'apps', 'exposed', 'tags'],
  neteng: ['apps', 'onatt', 'egress', 'exposed'],
  security: ['tags', 'onatt', 'apps', 'egress'],
  finops: ['egress', 'onatt', 'apps', 'exposed'],
  exec: ['egress', 'apps', 'onatt', 'exposed'],
};

// The worst live thing leads (skeptic, 2026-09-30: an outage beats an at-risk).
const WORST = { down: 0, slo: 1, risk: 2 };
/** Health's problems, worst state first; within a state, Health's own order. */
export function worstFirst(probs) {
  return [...(probs || [])].sort((a, b) => (WORST[a.state] ?? 3) - (WORST[b.state] ?? 3));
}
/** "AWS", "AWS and Azure", "AWS, Azure and GCP". */
export function nameList(names) {
  const n = [...new Set(names || [])];
  return n.length < 2 ? (n[0] || '') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

// A unit rides its number: "22 min", "15 ms" and "84%" are one word each.
const UNIT = /^(ms|min|h|d|mo|\/mo|Gbps|Mbps|GB|TB)$/i;
/**
 * Words on the home, counted as a reader counts them (the twelve-word rule,
 * 2026-09-30): separators (·, ›, ×) are not words, and a unit rides the number
 * before it.
 */
export function words(text) {
  const toks = String(text == null ? '' : text).split(/\s+/).filter(t => /[\p{L}\p{N}]/u.test(t));
  return toks.filter((t, i) => !(i > 0 && UNIT.test(t) && /\d$/.test(toks[i - 1]))).length;
}

/** The first number in a label ("4,120 sites", "$41,500/mo"), as a number. */
export function numOf(s) {
  const m = String(s == null ? '' : s).match(/\d[\d,]*(\.\d+)?/);
  return m ? +m[0].replace(/,/g, '') : 0;
}
const enf = (n) => Number(n || 0).toLocaleString('en-US');
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : '');
const one = (n, a, b) => `${n} ${String(n) === '1' ? a : b}`;
const STATE_PHRASE = { down: 'down', slo: 'over SLO', risk: 'at risk', ok: 'healthy' };

/**
 * The take-away: one headline, one line and one action for the role, each
 * from the page it lands on. The line is parts, and each part that counts
 * something opens that set (the drill rule, 2026-09-30); a duration counts
 * nothing and is never a door. `door`, `headDoor` and each part's `door` name
 * where they go; naas-app.js owns the doors.
 *
 * f: { probs, acts, onTableF, spend, could, banked, exposed, govern, connect, pubWl, pubClouds, healthy }
 */
export function takeAway(rk, f) {
  const probs = worstFirst(f.probs), acts = f.acts || [];
  const out = (o) => ({ headDoor: o.door, ...o, sub: o.parts.map(p => p.t).join(' · ') });
  if (rk === 'exec') {
    const down = probs.filter(p => p.state === 'down');
    const on = down.length ? ` on ${down[0].apps.length === 1 ? cap(down[0].apps[0]) : `${down[0].apps.length} apps`}` : '';
    return out({ key: 'exec', icon: 'bill', ink: 'var(--success)', door: 'moves', cta: 'See the moves',
      head: f.onTableF ? `${f.onTableF}/mo on the table` : 'Nothing priced on the table',
      parts: [{ t: one(acts.length, 'move', 'moves'), door: acts.length ? 'moves' : '' },
        down.length ? { t: `${one(down.length, 'outage', 'outages')}${on}`, door: 'health' } : { t: 'nothing down', door: '' }] });
  }
  const cn = f.connect || {}, cm = /^([\d,]+) of ([\d,]+) regions?$/.exec(cn.value || '');
  const pub = cm ? numOf(cm[1]) : 0;
  if (rk === 'finops') {
    // Spend's own words and figures (skeptic, 2026-09-30): "Could save" is what
    // the moves save at today's volume. The headline is Spend's tile whole, its
    // condition with it (third skeptic: "Save $41,500/mo" read as the Egress
    // card's drop, and no two figures on that card reproduce it).
    const could = f.could && typeof f.could === 'object' ? f.could : { l: 'Could save', v: f.could || '', u: '/mo', sub: 'if every public region moves' };
    return out({ key: 'finops', icon: 'pie-chart', ink: 'var(--success)', door: 'optimize', cta: 'Optimize', headDoor: 'spend',
      head: numOf(could.v) ? `${could.l} ${could.v}${could.u} ${could.sub}` : `Egress runs ${f.spend}/mo`,
      parts: [numOf(f.banked) ? { t: `${f.banked} banked to date`, door: 'spend' } : { t: 'Nothing banked yet', door: '' },
        pub ? { t: `${one(pub, 'region', 'regions')} to move`, door: 'options' } : { t: 'every region on AT&T', door: '' }] });
  }
  if (rk === 'security') {
    // One line, Govern's own total; the policies left it (skeptic, 2026-09-30:
    // the data's policy rows are not Govern's enforced count). The headline is
    // Discover's own word, "exposed", on the page it opens (third skeptic:
    // "reachable from the internet" read against the public regions' "52
    // workloads ride it"; an exposed workload has a public address, wherever
    // its region connects).
    const gv = f.govern || {}, e = String(f.exposed), vn = numOf(gv.value);
    return out({ key: 'security', icon: 'check-shield', ink: numOf(e) ? 'var(--warning)' : 'var(--success)', door: 'violations', cta: 'Review violations',
      head: numOf(e) ? `${e} ${e === '1' ? 'workload' : 'workloads'} exposed` : 'No workload exposed', headDoor: numOf(e) ? 'exposed' : '',
      parts: [vn ? { t: `${gv.value} policy ${vn === 1 ? 'violation' : 'violations'}`, door: 'violations' } : { t: 'No policy violations', door: '' }] });
  }
  if (rk === 'architect') {
    // The clouds are named, not counted: the public regions' own clouds (skeptic,
    // 2026-09-30: the estate's count read as if the problem spanned every cloud).
    if (!pub) return out({ key: 'architect', icon: 'cloud', ink: 'var(--success)', door: 'connect', cta: cn.door || 'Connect',
      head: cm ? 'Every region rides the AT&T network' : (cn.value || 'Nothing connected yet'), parts: [{ t: cn.sub || 'nothing on the public internet', door: '' }] });
    return out({ key: 'architect', icon: 'cloud', ink: 'var(--warning)', door: 'connect', cta: cn.door || 'Recommended',
      head: `${cn.value} still ${pub === 1 ? 'rides' : 'ride'} the public internet`,
      parts: [{ t: `${f.pubWl} workloads ride ${pub === 1 ? 'it' : 'them'}`, door: 'discover' }, { t: `on ${nameList(f.pubClouds)}`, door: '' }] });
  }
  // Network Eng: the worst live problem, in Health's own words.
  const p = probs[0];
  if (!p) return out({ key: 'neteng', icon: 'router', ink: HEALTH_INK.ok, door: 'health', cta: 'See Health',
    head: 'Nothing is down or over SLO', parts: [{ t: `${f.healthy} apps healthy`, door: 'health' }] });
  const who = p.apps.length === 1 ? { t: `${cap(p.apps[0])} rides it`, door: 'app', arg: p.apps[0] } : { t: `${p.apps.length} apps ride it`, door: 'health' };
  return out({ key: 'neteng', icon: 'router', ink: HEALTH_INK[p.state] || 'var(--warning)', door: 'trace', cta: 'Trace it', probKey: p.key,
    head: `${p.where} is ${STATE_PHRASE[p.state] || p.state}`,
    parts: [who, { t: `${enf(p.wl)} workloads`, door: 'health' }, { t: p.ago, door: '' }] });
}

// ---- The pictures ----

// In an 80-unit box: the outer ring is regions, the inner ring sites.
const RING = { sw: 8, outer: 35, inner: 24, gap: 1.6 };
/** The shortest arc drawn, in ring units: long enough to see and to click (skeptic, 2026-09-30). */
export const MIN_ARC = 6;
/**
 * Concentric rings, one list of arcs: each ring's parts in order from twelve
 * o'clock, a zero part left out (it counts nothing, so it is never drawn and
 * never a door). Arcs are stroke dashes on a circle of the ring's radius. A
 * part too small to see is drawn at MIN_ARC and the others give up the length
 * in proportion, so the ring still closes; its title carries the true count.
 */
export function ringArcs(rings) {
  const out = [];
  for (const ring of rings) {
    const total = ring.parts.reduce((a, p) => a + p.n, 0);
    if (!total) continue;
    const C = 2 * Math.PI * ring.r, live = ring.parts.filter(p => p.n > 0), gap = live.length > 1 ? RING.gap : 0;
    const floor = MIN_ARC + gap;
    const small = live.map(p => live.length > 1 && p.n / total * C < floor);
    const bigN = live.reduce((a, p, i) => a + (small[i] ? 0 : p.n), 0);
    const rest = C - small.filter(Boolean).length * floor;
    let at = 0;
    live.forEach((p, i) => {
      const len = small[i] ? floor : p.n / bigN * rest;
      out.push({ ...p, r: ring.r, sw: RING.sw, dash: `${(len - gap).toFixed(2)} ${C.toFixed(2)}`, off: (-at).toFixed(2) });
      at += len;
    });
  }
  return out;
}

const SPARK = { w: 240, h: 56, pad: 5 };
/**
 * Egress by month: the twelve months that happened, then the three ahead
 * twice, as is and with the moves. Both forecasts start at today. A sparkline
 * spans its own lowest to highest month, so the rise and the fork read; the
 * figures beside it carry the size.
 */
export function sparkOf(past, asIs, moved) {
  const all = [...past, ...asIs, ...moved];
  const lo = Math.min(...all), hi = Math.max(...all), span = Math.max(1, hi - lo);
  const n = past.length + asIs.length;
  const dx = (SPARK.w - 2 * SPARK.pad) / Math.max(1, n - 1);
  const pt = (v, i) => [+(SPARK.pad + i * dx).toFixed(1), +(SPARK.h - SPARK.pad - (v - lo) / span * (SPARK.h - 2 * SPARK.pad)).toFixed(1)];
  const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const last = past.length - 1;
  const P = past.map(pt), today = P[last] || [SPARK.pad, SPARK.h - SPARK.pad];
  const A = [today, ...asIs.map((v, i) => pt(v, last + 1 + i))], M = [today, ...moved.map((v, i) => pt(v, last + 1 + i))];
  const end = A[A.length - 1], pc = (v, of) => `${(v / of * 100).toFixed(2)}%`;
  return { past: d(P), asIs: d(A), act: d(M),
    // The months that happened, filled to the floor.
    area: P.length ? `${d(P)} L${today[0]},${SPARK.h} L${P[0][0]},${SPARK.h} Z` : '',
    todayL: pc(today[0], SPARK.w), todayT: pc(today[1], SPARK.h), asIsT: pc(end[1], SPARK.h) };
}

/** The Exposed card's picture: a hundred cells, the exposed share lit (skeptic, 2026-09-30: a 3% bar read as a dot). */
export function waffleOf(n, of, ink = 'var(--text-heading)') {
  const lit = n > 0 && of > 0 ? Math.min(100, Math.max(1, Math.round(n / of * 100))) : 0;
  return Array.from({ length: 100 }, (_, i) => ({ key: 'w' + i, on: i < lit, ink: i < lit ? ink : 'var(--bg-neutral)' }));
}

/**
 * The snapshot cards, the role's four in its order. Each card is one door to
 * its page (go); its big figure, its other figures, its ring's arcs, its dots
 * and its cells each open the set they count, on a page that prints them.
 *
 * f: { glance, health, flows, spend, spendCols, exposed, workloads, govern, tags }
 * doors: { picture, options, sitesOn, sitesOff, health, appPath, spend, discover, tags, tag, policies }
 */
export function snapshotCards(rk, f, doors) {
  const g = f.glance || {};
  const regPriv = g.regPriv || 0, regTotal = g.regTotal || 0, sitesOn = g.sitesOn || 0, sitesTotal = g.sitesTotal || 0;
  const edge = 'var(--border-secondary)';
  const INK_PRIV = 'var(--viz-1)', INK_SITE = 'var(--viz-2)', INK_OFF = 'var(--viz-6)';
  // The set a count card counts and has no health colour for (exposed workloads, tags with no
  // policy) is drawn in ink, the rest as an outline or a blank cell (third skeptic, 2026-09-30:
  // amber read as At risk beside the Apps card, a light grey as the ring's public internet).
  const INK_SET = 'var(--text-heading)', OUTLINE = `inset 0 0 0 2px ${INK_SET}`;
  const card = (key, label, rest) => ({ key, label, edge, suffix: '', unit: '', figs: [], legend: [], segs: [], dots: [], waffle: [], spark: null, wafTitle: '', wafGo: () => {}, wafOff: true,
    isRing: false, isDots: false, isSpark: false, isWaffle: false, dotW: 'auto', ...rest });
  // A dot picture is a near-square block of large marks, its last row centred, so eight or nine of them
  // fill the card's middle rather than float in it (third skeptic, 2026-09-30); four or fewer read
  // larger still, and past sixteen the marks step down to fit.
  const DOT_GAP = 8;
  const dotGrid = (c) => {
    if (!c.isDots) return c;
    const n = c.dots.length, [btn, size] = n <= 4 ? [76, 56] : n <= 16 ? [52, 36] : [36, 24];
    const cols = n <= 16 ? Math.max(1, Math.min(4, Math.ceil(Math.sqrt(n)))) : 5;
    return { ...c, dotW: `${cols * btn + (cols - 1) * DOT_GAP}px`, dots: c.dots.map(d => ({ ...d, btn: `${btn}px`, size: `${size}px` })) };
  };

  // The private regions are Connect's own "N are private"; the map is where they are drawn.
  const onatt = card('onatt', 'On AT&T', {
    door: 'Connect', go: doors.picture(), value: `${enf(regPriv)} of ${enf(regTotal)}`, unit: 'regions private', swatch: INK_PRIV,
    valueGo: doors.picture(), valueOff: !regPriv, isRing: true,
    segs: ringArcs([
      { r: RING.outer, parts: [
        { key: 'priv', n: regPriv, ink: INK_PRIV, title: `${enf(regPriv)} ${regPriv === 1 ? 'region' : 'regions'} private`, go: doors.picture() },
        { key: 'pub', n: regTotal - regPriv, ink: INK_OFF, title: `${enf(regTotal - regPriv)} ${regTotal - regPriv === 1 ? 'region' : 'regions'} on the public internet`, go: doors.options() }] },
      { r: RING.inner, parts: [
        { key: 'att', n: sitesOn, ink: INK_SITE, title: `${enf(sitesOn)} ${sitesOn === 1 ? 'site' : 'sites'} on AT&T`, go: doors.sitesOn() },
        { key: 'outside', n: sitesTotal - sitesOn, ink: INK_OFF, title: `${enf(sitesTotal - sitesOn)} ${sitesTotal - sitesOn === 1 ? 'site' : 'sites'} outside AT&T`, go: doors.sitesOff() }] },
    ]),
    figs: [{ key: 'sites', v: `${enf(sitesOn)} of ${enf(sitesTotal)}`, u: 'sites on AT&T', swatch: INK_SITE, go: doors.sitesOn(), off: !sitesOn }],
  });

  const flows = f.flows || [];
  const seen = new Set(flows.map(r => r.state));
  const apps = card('apps', 'Apps', {
    door: 'Health', go: doors.health(), value: f.health || '0 of 0', unit: 'apps healthy', swatch: HEALTH_INK.ok, valueGo: doors.health(), valueOff: !numOf(f.health), isDots: true,
    dots: flows.map(r => ({ key: r.tag, ink: HEALTH_INK[r.state] || 'var(--text-disabled)', ring: 'none', rad: healthRadius(r.state), title: `${r.label} · ${HEALTH_WORD[r.state] || r.state}`, go: doors.appPath(r.tag) })),
    // Healthy is the unit's own swatch; the legend names the states that are not.
    legend: ['down', 'slo', 'risk'].filter(k => seen.has(k)).map(k => ({ key: k, word: HEALTH_WORD[k], ink: HEALTH_INK[k], ring: 'none', rad: healthRadius(k) })),
  });

  const cols = f.spendCols || [];
  const past = cols.filter(x => x.kind === 'past').map(x => x.spendN);
  const next = cols.filter(x => x.kind === 'next');
  const spend = f.spend || {};
  const egress = card('egress', 'Egress', {
    door: 'Spend', go: doors.spend(), value: spend.spend, suffix: '/mo', unit: 'egress today', valueGo: doors.spend(), valueOff: !numOf(spend.spend), isSpark: true,
    // Spend's forecast columns carry as is and if you act as their own figures (Cost v2, 2026-09-30).
    spark: sparkOf(past, next.map(x => x.asIsN), next.map(x => x.movedN)),
    // Spend's own "In 90 days" tile, so it opens Spend (skeptic, 2026-09-30).
    figs: [{ key: 'act', v: `${spend.ahead}/mo`, u: 'in 90 days, if you act', swatch: 'var(--success)', go: doors.spend(), off: !numOf(spend.ahead) }],
  });

  // Exposed of all, as Discover's At a glance prints them both, in its word: a workload with a public address.
  const exN = numOf(f.exposed), wlN = numOf(f.workloads);
  const gv = f.govern || {};
  const exTitle = `${f.exposed} of ${f.workloads} workloads exposed`;
  const exposed = card('exposed', 'Exposed', {
    door: 'Discover', go: doors.discover(), value: `${f.exposed} of ${f.workloads}`, unit: 'workloads exposed', swatch: INK_SET, valueGo: doors.discover(), valueOff: !exN, isWaffle: true,
    waffle: waffleOf(exN, wlN, INK_SET), wafTitle: exTitle, wafGo: doors.discover(), wafOff: !exN,
    figs: [{ key: 'violations', v: String(gv.value), u: numOf(gv.value) === 1 ? 'policy violation' : 'policy violations', swatch: '', go: doors.policies(), off: !numOf(gv.value) }],
  });

  // Tags with no policy: Govern > Tags, one mark a tag in Govern's order. A bare tag is the set
  // the card counts, filled in ink; a covered tag is its outline.
  const tagRows = f.tags || [];
  const bare = tagRows.filter(t => !t.covered).length;
  const tagMark = (covered) => (covered ? { ink: 'transparent', ring: OUTLINE } : { ink: INK_SET, ring: 'none' });
  const tags = card('tags', 'Tags', {
    door: 'Govern', go: doors.tags(), value: `${enf(bare)} of ${enf(tagRows.length)}`, unit: 'tags with no policy', swatch: INK_SET, valueGo: doors.tags(), valueOff: !bare, isDots: true,
    dots: tagRows.map((t, i) => ({ key: t.key, ...tagMark(t.covered), rad: '9999px', title: `${t.name} · ${t.covered ? t.coverLabel : 'No policy'}`, go: doors.tag(i) })),
    legend: [['bare', 'No policy', false, bare], ['covered', 'Covered', true, tagRows.length - bare]].filter(x => x[3] > 0).map(([key, word, covered]) => ({ key, word, ...tagMark(covered), rad: '9999px' })),
  });

  const by = { onatt, apps, egress, exposed, tags };
  return (CARD_ORDER[rk] || CARD_ORDER.neteng).map(k => dotGrid(by[k])).map(c => ({ ...c,
    figs: c.figs.map(x => ({ ...x, hasSwatch: !!x.swatch })), hasSwatch: !!c.swatch, hasSuffix: !!c.suffix }));
}

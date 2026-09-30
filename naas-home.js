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
// small picture, Waiting on you as three chips, and the Connect network map
// below the fold.
//
// Pure: every figure arrives from the page that owns it (problemRows,
// roleActAll, spendTiles, spendCols, invStats, rollup, glanceRings,
// healthTiles, pathFlowAll); this module only picks, words and draws them.
// The doors arrive as functions from naas-app.js, so a figure here opens
// exactly the set its page counts.
import { HEALTH_INK, HEALTH_WORD, healthRadius } from './naas-flowmap.js';

/** Which card leads, by persona. Every order holds all four. */
export const CARD_ORDER = {
  architect: ['onatt', 'apps', 'exposed', 'egress'],
  neteng: ['apps', 'onatt', 'egress', 'exposed'],
  security: ['exposed', 'onatt', 'apps', 'egress'],
  finops: ['egress', 'onatt', 'apps', 'exposed'],
  exec: ['egress', 'apps', 'onatt', 'exposed'],
};

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
 * f: { probs, acts, onTableF, spend, could, ahead, exposed, govern, connect, pubWl, clouds, healthy }
 */
export function takeAway(rk, f) {
  const probs = f.probs || [], acts = f.acts || [];
  const out = (o) => ({ headDoor: o.door, ...o, sub: o.parts.map(p => p.t).join(' · ') });
  if (rk === 'exec') {
    const down = probs.filter(p => p.state === 'down');
    const on = down.length ? ` on ${down[0].apps.length === 1 ? cap(down[0].apps[0]) : `${down[0].apps.length} apps`}` : '';
    return out({ key: 'exec', icon: 'bill', ink: 'var(--success)', door: 'moves', cta: 'See the moves',
      head: f.onTableF ? `${f.onTableF}/mo on the table` : 'Nothing priced on the table',
      parts: [{ t: one(acts.length, 'move', 'moves'), door: acts.length ? 'moves' : '' },
        down.length ? { t: `${one(down.length, 'outage', 'outages')}${on}`, door: 'health' } : { t: 'nothing down', door: '' }] });
  }
  if (rk === 'finops') {
    return out({ key: 'finops', icon: 'pie-chart', ink: 'var(--success)', door: 'optimize', cta: 'Optimize',
      head: numOf(f.could) ? `Egress can drop ${f.could}/mo` : `Egress runs ${f.spend}/mo`,
      parts: [{ t: `${f.spend}/mo today`, door: 'spend' }, { t: `${f.ahead}/mo in 90 days`, door: 'spend' }] });
  }
  if (rk === 'security') {
    const gv = f.govern || {}, pol = numOf(String(gv.sub || '').replace(/^\D*/, ''));
    const e = String(f.exposed);
    return out({ key: 'security', icon: 'check-shield', ink: numOf(e) ? 'var(--warning)' : 'var(--success)', door: 'violations', cta: 'Review violations',
      head: numOf(e) ? `${e} ${e === '1' ? 'workload' : 'workloads'} exposed` : 'No workload exposed', headDoor: 'tags',
      parts: [{ t: `${gv.value} policy violations`, door: 'violations' }, { t: one(pol, 'policy', 'policies'), door: 'violations' }] });
  }
  if (rk === 'architect') {
    const cn = f.connect || {}, m = /^([\d,]+) of ([\d,]+) regions?$/.exec(cn.value || '');
    const pub = m ? numOf(m[1]) : 0;
    return out({ key: 'architect', icon: 'cloud', ink: pub ? 'var(--warning)' : 'var(--success)', door: 'connect', cta: cn.door || 'Options',
      head: m ? `${cn.value} still ${pub === 1 ? 'rides' : 'ride'} the public internet` : (cn.value || 'Nothing connected yet'),
      parts: [{ t: `${f.pubWl} workloads ride ${pub === 1 ? 'it' : 'them'}`, door: 'options' }, { t: one(String(f.clouds), 'cloud', 'clouds'), door: 'clouds' }] });
  }
  // Network Eng: the first problem in Health's own ranking.
  const p = probs[0];
  if (!p) return out({ key: 'neteng', icon: 'router', ink: HEALTH_INK.ok, door: 'health', cta: 'See Health',
    head: 'Nothing is down or over SLO', parts: [{ t: `${f.healthy} apps healthy`, door: 'health' }] });
  const who = p.apps.length === 1 ? { t: `${cap(p.apps[0])} rides it`, door: 'app', arg: p.apps[0] } : { t: `${p.apps.length} apps ride it`, door: 'health' };
  return out({ key: 'neteng', icon: 'router', ink: HEALTH_INK[p.state] || 'var(--warning)', door: 'trace', cta: 'Trace it',
    head: `${p.where} is ${STATE_PHRASE[p.state] || p.state}`,
    parts: [who, { t: `${enf(p.wl)} workloads`, door: 'health' }, { t: p.ago, door: '' }] });
}

// ---- The pictures ----

// In an 80-unit box, drawn at 96px: the outer ring is regions, the inner ring sites.
const RING = { sw: 8, outer: 35, inner: 24, gap: 1.6 };
/**
 * Concentric rings, one list of arcs: each ring's parts in order from twelve
 * o'clock, a zero part left out (it counts nothing, so it is never drawn and
 * never a door). Arcs are stroke dashes on a circle of the ring's radius.
 */
export function ringArcs(rings) {
  const out = [];
  for (const ring of rings) {
    const total = ring.parts.reduce((a, p) => a + p.n, 0);
    if (!total) continue;
    const C = 2 * Math.PI * ring.r, live = ring.parts.filter(p => p.n > 0), gap = live.length > 1 ? RING.gap : 0;
    let at = 0;
    for (const p of ring.parts) {
      if (!(p.n > 0)) continue;
      const len = p.n / total * C;
      out.push({ ...p, r: ring.r, sw: RING.sw, dash: `${Math.max(0.5, len - gap).toFixed(2)} ${C.toFixed(2)}`, off: (-at).toFixed(2) });
      at += len;
    }
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

/**
 * The four snapshot cards, in the role's order. Each card is one door to its
 * page (go); its big figure, its other figures, its ring's arcs, its dots and
 * its bar each open the set they count.
 *
 * f: { glance, health, flows, spend, spendCols, exposed, workloads, govern }
 * doors: { picture, capacity, options, sitesOn, sitesOff, health, appPath, spend, optimize, tags, policies }
 */
export function snapshotCards(rk, f, doors) {
  const g = f.glance || {};
  const regPriv = g.regPriv || 0, regTotal = g.regTotal || 0, sitesOn = g.sitesOn || 0, sitesTotal = g.sitesTotal || 0;
  const edge = 'var(--border-secondary)';
  const INK_PRIV = 'var(--viz-1)', INK_SITE = 'var(--viz-2)', INK_OFF = 'var(--viz-6)';
  const card = (key, label, rest) => ({ key, label, edge, suffix: '', unit: '', figs: [], legend: [], segs: [], dots: [], bar: [], spark: null,
    isRing: false, isDots: false, isSpark: false, isBar: false, ...rest });

  const onatt = card('onatt', 'On AT&T', {
    door: 'Connect', go: doors.picture(), value: `${enf(regPriv)} of ${enf(regTotal)}`, unit: 'regions private', swatch: INK_PRIV,
    valueGo: doors.capacity(), valueOff: !regPriv, isRing: true,
    segs: ringArcs([
      { r: RING.outer, parts: [
        { key: 'priv', n: regPriv, ink: INK_PRIV, title: `${enf(regPriv)} ${regPriv === 1 ? 'region' : 'regions'} private`, go: doors.capacity() },
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
    dots: flows.map(r => ({ key: r.tag, ink: HEALTH_INK[r.state] || 'var(--text-disabled)', rad: healthRadius(r.state), title: `${r.label} · ${HEALTH_WORD[r.state] || r.state}`, go: doors.appPath(r.tag) })),
    // Healthy is the unit's own swatch; the legend names the states that are not.
    legend: ['down', 'slo', 'risk'].filter(k => seen.has(k)).map(k => ({ key: k, word: HEALTH_WORD[k], ink: HEALTH_INK[k], rad: healthRadius(k) })),
  });

  const cols = f.spendCols || [];
  const past = cols.filter(x => x.kind === 'past').map(x => x.spendN);
  const next = cols.filter(x => x.kind === 'next');
  const spend = f.spend || {};
  const egress = card('egress', 'Egress', {
    door: 'Spend', go: doors.spend(), value: spend.spend, suffix: '/mo', unit: 'egress today', valueGo: doors.spend(), valueOff: !numOf(spend.spend), isSpark: true,
    spark: sparkOf(past, next.map(x => x.baseN + x.topN), next.map(x => x.baseN)),
    figs: [{ key: 'act', v: `${spend.ahead}/mo`, u: 'in 90 days, if you act', swatch: 'var(--success)', go: doors.optimize(), off: !numOf(spend.ahead) }],
  });

  const exN = numOf(f.exposed), wlN = numOf(f.workloads);
  const gv = f.govern || {};
  const exposed = card('exposed', 'Exposed', {
    door: 'Violations', go: doors.policies(), value: String(f.exposed), unit: 'workloads exposed', swatch: 'var(--warning)', valueGo: doors.tags(), valueOff: !exN, isBar: true,
    bar: exN && wlN ? [{ key: 'exposed', w: `${(exN / wlN * 100).toFixed(2)}%`, ink: 'var(--warning)', title: `${f.exposed} of ${f.workloads} workloads exposed`, go: doors.tags() }] : [],
    figs: [{ key: 'violations', v: String(gv.value), u: 'policy violations', swatch: '', go: doors.policies(), off: !numOf(gv.value) }],
  });

  const by = { onatt, apps, egress, exposed };
  return (CARD_ORDER[rk] || CARD_ORDER.neteng).map(k => by[k]).map(c => ({ ...c,
    figs: c.figs.map(x => ({ ...x, hasSwatch: !!x.swatch })), hasSwatch: !!c.swatch, hasSuffix: !!c.suffix }));
}

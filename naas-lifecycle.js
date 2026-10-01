/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-lifecycle.js — a finding's life: when it was found, who owns it, what
// was done, and what acting on it actually banked (notes, 2026-09-29). Pure:
// `now` is always passed in, so the tests pin dates.

import { regionOf, onAtt } from './naas-logic.js';
import { buOf, countOf, classOf } from './naas-sites.js';
const SITE_W = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.4, Edge: 0.05, Field: 0.1 };

export const STATES = ['open', 'ack', 'progress', 'resolved', 'snoozed', 'dismissed'];
export const STATE_LABEL = { open: 'Open', ack: 'Acknowledged', progress: 'In progress', resolved: 'Resolved', snoozed: 'Snoozed', dismissed: 'Dismissed' };
const MOVES = {
  open: ['ack', 'progress', 'snoozed', 'dismissed'],
  ack: ['progress', 'snoozed', 'dismissed'],
  progress: ['resolved', 'snoozed', 'dismissed'],
  resolved: ['open'],
  snoozed: ['open', 'ack', 'progress', 'dismissed'],
  dismissed: ['open'],
};
const OWNER = { FinOps: 'FinOps · J. Rivera', 'FinOps & SRE': 'FinOps · J. Rivera', 'Security & Compliance': 'Security · M. Chen', 'Network Engineering': 'Network Eng · R. Patel', 'Security and Compliance': 'Security · M. Chen' };
// The day the demo's seeded history is written against.
const ANCHOR = Date.UTC(2026, 8, 29);
const DAY = 86400000;
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const ym = (t) => new Date(t).toISOString().slice(0, 7);
const hash = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

// What was done to the open findings before today, per estate.
const SEED = {
  partial: {
    ipsec: [{ at: '2026-09-24', state: 'ack', by: 'R. Patel' }],
    avoidable: [{ at: '2026-09-18', state: 'ack', by: 'J. Rivera' }, { at: '2026-09-23', state: 'progress', by: 'J. Rivera', note: 'Steer order placed' }],
    uninspected: [{ at: '2026-09-26', state: 'snoozed', by: 'M. Chen', until: '2026-10-10', note: 'Waiting on the firewall refresh' }],
  },
  trust: {
    pci: [{ at: '2026-09-15', state: 'ack', by: 'M. Chen' }],
  },
};
// Findings already closed: the history that banked money.
const CLOSED = {
  partial: [
    { kind: 'hairpin', head: 'Dallas traffic to us-east-1 hairpinned through Chicago', persona: 'Network Engineering', save: 4200, found: '2026-05-28', resolvedAt: '2026-06-12' },
    { kind: 'idleport', head: 'Two 5 Gbps ports under 30% utilised', persona: 'FinOps', save: 1800, found: '2026-08-02', resolvedAt: '2026-08-19' },
  ],
  mature: [
    { kind: 'steer', head: 'Object storage steered onto AT&T', persona: 'FinOps', save: 12500, found: '2025-11-03', resolvedAt: '2025-12-01' },
  ],
  trust: [
    { kind: 'c2c', head: 'AWS to Azure replication moved onto AT&T', persona: 'FinOps', save: 21000, found: '2026-01-12', resolvedAt: '2026-02-09' },
    { kind: 'hosted', head: 'Hosted VPC replaced three NAT gateways', persona: 'Network Engineering', save: 9000, found: '2026-05-04', resolvedAt: '2026-06-01' },
  ],
};
// The month each estate first attached to AT&T.
const FIRST = { partial: '2026-02', mature: '2025-06', trust: '2025-01' };
/** The month each estate first attached (2026-09-30: the activity log and the change list start here). */
export const FIRST_ATTACH = FIRST;

const foundOf = (f) => f.found || ymd(ANCHOR - (3 + hash(f.kind) % 40) * DAY);
const ownerOf = (f) => OWNER[f.persona] || OWNER['Network Engineering'];

/** The seeded life of an estate's open findings, keyed by kind. */
export function lifeFor(est) {
  const seed = SEED[est.id] || {};
  return Object.fromEntries((est.findings || []).map(f => [f.kind, { owner: ownerOf(f), events: [{ at: foundOf(f), state: 'open', by: 'Discovery' }, ...(seed[f.kind] || [])] }]));
}

/** A finding as its life says it stands at `now`. */
export function lifeOf(f, life, now) {
  const rec = (life || {})[f.kind] || {};
  const events = rec.events && rec.events.length ? rec.events : [{ at: foundOf(f), state: 'open', by: 'Discovery' }];
  const last = events[events.length - 1];
  const snoozeEnded = last.state === 'snoozed' && !!last.until && Date.parse(last.until) <= +now;
  const state = snoozeEnded ? 'open' : last.state;
  return { state, label: STATE_LABEL[state], owner: rec.owner || ownerOf(f), foundAt: events[0].at, ageDays: Math.max(0, Math.floor((+now - Date.parse(events[0].at)) / DAY)), events, snoozeUntil: last.state === 'snoozed' ? last.until : null, snoozeEnded };
}

/** One step in a finding's life. Returns `life` untouched when the move is not allowed. */
export function transition(life, kind, to, { by, note, now, snoozeDays } = {}) {
  const cur = lifeOf({ kind }, life, now);
  if (!(MOVES[cur.state] || []).includes(to)) return life;
  const ev = { at: ymd(+now), state: to, by: by || 'You', ...(note ? { note } : {}), ...(to === 'snoozed' ? { until: ymd(+now + (snoozeDays || 7) * DAY) } : {}) };
  const rec = (life || {})[kind] || {};
  // Whoever acknowledges or starts it owns it (2026-09-29 audit).
  const owner = ['ack', 'progress'].includes(to) && by === 'You' ? 'You' : rec.owner;
  return { ...life, [kind]: { ...rec, ...(owner ? { owner } : {}), events: [...cur.events, ev] } };
}

/** Findings still asking for something: open, acknowledged, in progress, or back from a snooze. */
export function openFindings(est, life, now) {
  return (est.findings || []).filter(f => ['open', 'ack', 'progress'].includes(lifeOf(f, life, now).state));
}

/** The estate's closed history, owners filled in. */
export function closedFindings(est) {
  return (CLOSED[est.id] || []).map(f => ({ ...f, owner: ownerOf(f), priced: true }));
}

/**
 * What acting actually banked, month by month, for the twelve months ending
 * `now`. The network's own saving (est.savedMo, less what the closed findings
 * account for) runs from the first attach; each closed or newly resolved
 * finding adds its saving from the month it resolved.
 */
export function banked(est, life, now) {
  const closed = closedFindings(est);
  const resolvedNow = (est.findings || []).filter(f => f.priced).map(f => ({ f, l: lifeOf(f, life, now) })).filter(x => x.l.state === 'resolved').map(x => ({ save: x.f.save, resolvedAt: x.l.events[x.l.events.length - 1].at }));
  const base = Math.max(0, (est.savedMo || 0) - closed.reduce((a, f) => a + f.save, 0));
  const first = FIRST[est.id];
  const end = new Date(+now);
  // Every month since the first attach counts toward the running total; the chart shows the last twelve (review, 2026-09-29).
  const since = first ? (end.getUTCFullYear() - +first.slice(0, 4)) * 12 + end.getUTCMonth() - (+first.slice(5, 7) - 1) + 1 : 0;
  const n = Math.max(12, since);
  const months = Array.from({ length: n }, (_, i) => ym(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (n - 1) + i, 1)));
  let cumulative = 0;
  return months.map(month => {
    const saved = (first && month >= first ? base : 0)
      + [...closed, ...resolvedNow].filter(x => x.resolvedAt.slice(0, 7) <= month).reduce((a, x) => a + x.save, 0);
    cumulative += saved;
    return { month, saved, cumulative };
  }).slice(-12);
}

/**
 * What Banked counts, source by source (2026-09-30, the skeptic: "the Banked door
 * does not open what it counts"): the network's own saving from the first attach,
 * then each closed or newly resolved finding from the month it resolved. perMo is
 * this month's share; toDate every month since. The rows add up to banked()'s last
 * month, saved and cumulative, to the dollar.
 */
export function bankedSources(est, life, now) {
  const closed = closedFindings(est);
  const resolvedNow = (est.findings || []).filter(f => f.priced).map(f => ({ f, l: lifeOf(f, life, now) })).filter(x => x.l.state === 'resolved')
    .map(x => ({ kind: x.f.kind, head: x.f.head, save: x.f.save, resolvedAt: x.l.events[x.l.events.length - 1].at }));
  const base = Math.max(0, (est.savedMo || 0) - closed.reduce((a, f) => a + f.save, 0));
  const first = FIRST[est.id], end = new Date(+now), endYm = ym(end);
  const monthsFrom = (m) => { if (!m || m > endYm) return 0; return (end.getUTCFullYear() - +m.slice(0, 4)) * 12 + end.getUTCMonth() - (+m.slice(5, 7) - 1) + 1; };
  const rows = [];
  if (first && base > 0) rows.push({ key: 'network', kind: 'network', label: 'Your connections on AT&T', since: first, perMo: base, months: monthsFrom(first), toDate: base * monthsFrom(first) });
  for (const f of [...closed, ...resolvedNow]) { const m = String(f.resolvedAt).slice(0, 7), n = monthsFrom(m); if (!n) continue; rows.push({ key: 'f:' + f.kind, kind: 'finding', finding: f.kind, label: f.head, since: m, perMo: f.save, months: n, toDate: f.save * n }); }
  return rows;
}

// Split `total` across weights, to the dollar (largest remainder). Cost's regional
// egress uses it too, so a region's share reads the same dollars as the Savings list.
export function split(total, weights) {
  const w = weights.some(x => x > 0) ? weights : weights.map(() => 1);
  const sum = w.reduce((a, x) => a + x, 0) || 1;
  const raw = w.map(x => total * x / sum), floor = raw.map(Math.floor);
  let left = total - floor.reduce((a, x) => a + x, 0);
  raw.map((x, i) => [x - floor[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { floor[i] += 1; left -= 1; } });
  return floor;
}
// ---------- Where the money sits, by cloud region ----------
// The skeptic, 2026-09-30: pooling every bucket of one kind across the estate put
// GCP's egress in AWS and Azure regions, so By region and By cloud disagreed. A
// bucket's money lands only in its own cloud's regions, by workloads; what a finding
// saves lands where the buckets it prices bill; what was banked lands where its
// source names. Cost's By region, the Savings list and Recommended all read these.

/**
 * A bucket bills at your AT&T rate only when it already pays it and its cloud has a
 * region attached (Small business has nothing attached, so nothing of it is). Anything
 * else bills outside AT&T. Cost reads it as CV.bucketInk.
 */
export function bucketInk(est, b) {
  const attached = (est.regionsList || []).some(r => r.priv && r.cloud === b.cloud);
  return attached && b.today <= b.fabric ? 'att' : 'public';
}
/**
 * Where a bucket's money lands, as workloads over est.regionsList, in its own cloud only:
 * at your AT&T rate, the cloud's attached regions; outside AT&T, its public regions, or its
 * attached ones where the cloud has none public (Bank scale's GCP). All zero when the
 * bucket's cloud has no region here.
 */
export function bucketWeights(est, b) {
  const regs = est.regionsList || [];
  const pub = bucketInk(est, b) === 'public' && regs.some(r => r.cloud === b.cloud && !r.priv);
  return regs.map(r => (r.cloud === b.cloud && (pub ? !r.priv : r.priv) ? (r.wl || 1) : 0));
}
/**
 * Spread amounts over the cloud regions, to the dollar: items with the same weights pool
 * first, so one cloud's money splits once. byRegion is dollars per est.regionsList index;
 * rest is what had no region to land in.
 */
export function spread(est, items) {
  const out = (est.regionsList || []).map(() => 0), pools = new Map();
  let rest = 0;
  for (const it of items) {
    if (!(it.v > 0)) continue;
    if (!it.w.some(x => x > 0)) { rest += it.v; continue; }
    const k = it.w.join(','), p = pools.get(k) || { w: it.w, v: 0 };
    p.v += it.v; pools.set(k, p);
  }
  for (const p of pools.values()) split(Math.round(p.v), p.w).forEach((d, i) => { out[i] += d; });
  return { byRegion: out, rest };
}
/** This month's egress by cloud region, of one kind ('public' outside AT&T, 'att' at your AT&T rate), each bucket in its own cloud. */
export function egressByRegion(est, ink) {
  return spread(est, (est.buckets || []).filter(b => bucketInk(est, b) === ink).map(b => ({ v: b.today, w: bucketWeights(est, b) })));
}
// A finding that prices no bucket lands in the public regions by workloads, or every region where none is public.
const pubWeights = (est) => { const regs = est.regionsList || [], w = regs.map(r => (r.priv ? 0 : (r.wl || 1))); return w.some(x => x > 0) ? w : regs.map(r => r.wl || 1); };
/** What each open priced finding saves, bucket by bucket: its saving across the buckets it prices, by their premium. */
export function openByBucket(est, open) {
  const bks = est.buckets || [], out = [];
  for (const f of open || []) {
    if (!f.priced || !(f.save > 0)) continue;
    const mine = bks.filter(b => b.finding === f.kind && b.today > b.fabric);
    if (!mine.length) { out.push({ b: null, f, v: f.save }); continue; }
    split(Math.round(f.save), mine.map(b => b.today - b.fabric)).forEach((v, i) => out.push({ b: mine[i], f, v }));
  }
  return out;
}
/** What the open findings save, by cloud region: each bucket's share where that bucket bills. */
export function openByRegion(est, open) {
  return spread(est, openByBucket(est, open).map(x => ({ v: x.v, w: x.b ? bucketWeights(est, x.b) : pubWeights(est) })));
}
const named = (text, word) => new RegExp(`(^|[^\\w-])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w-]|$)`).test(text);
/**
 * Where a banked source sits, as weights over est.regionsList (the skeptic, 2026-09-30:
 * Azure eastus was credited with a hairpin to us-east-1, CoreWeave with an object-storage
 * steer). Your connections on AT&T: the attached regions, by workloads. A finding that
 * prices buckets: where those buckets bill. A closed finding: the cloud region its words
 * name, else the attached regions of the clouds they name, else, naming no place, where
 * AT&T carries egress at your AT&T rate, by those dollars.
 */
export function sourceWeights(est, src) {
  const regs = est.regionsList || [];
  const attachedWl = regs.map(r => (r.priv ? (r.wl || 1) : 0));
  if (src.kind === 'network') return attachedWl;
  const mine = (est.buckets || []).filter(b => b.finding === src.finding && b.today > b.fabric);
  if (mine.length) {
    const w = regs.map(() => 0);
    for (const b of mine) { const bw = bucketWeights(est, b), t = bw.reduce((a, x) => a + x, 0); if (t) bw.forEach((x, i) => { w[i] += (b.today - b.fabric) * x / t; }); }
    if (w.some(x => x > 0)) return w;
  }
  const text = String(src.label || '');
  const inRegion = regs.map(r => (named(text, r.region) ? (r.wl || 1) : 0));
  if (inRegion.some(x => x > 0)) return inRegion;
  const clouds = new Set(regs.map(r => r.cloud).filter(cl => named(text, cl)));
  if (clouds.size) {
    const w = regs.map(r => (clouds.has(r.cloud) && r.priv ? (r.wl || 1) : 0));
    return w.some(x => x > 0) ? w : regs.map(r => (clouds.has(r.cloud) ? (r.wl || 1) : 0));
  }
  const att = egressByRegion(est, 'att').byRegion;
  return att.some(x => x > 0) ? att : attachedWl;
}
/**
 * Savings by region, business unit or cloud (notes, 2026-09-29), this month: banked
 * from the sources LC.bankedSources lists, still open from the open priced findings.
 * By cloud region (2026-09-30, the skeptic): each source sits where it names, each open
 * finding where its buckets bill, so a cloud's row is its regions' rows summed and no
 * cloud is credited another's money. By business unit the sources name no unit, so
 * each splits by the sites on AT&T (class weight × count), and still open by the sites
 * outside it. bySource is each source's share of a row, to the dollar.
 */
export function savingsBy(est, dim, { sources = [], open = [] } = {}, tags = {}) {
  const groups = {};
  const group = (label) => (groups[label] = groups[label] || { key: label, label, banked: 0, open: 0, bySource: {} });
  if (dim === 'region' || dim === 'cloud') {
    const regs = est.regionsList || [];
    const keyOf = (r) => (dim === 'cloud' ? r.cloud : `${r.cloud} ${r.region}`);
    regs.forEach(r => group(keyOf(r)));
    openByRegion(est, open).byRegion.forEach((d, i) => { group(keyOf(regs[i])).open += d; });
    for (const src of sources) split(Math.round(src.perMo), sourceWeights(est, src)).forEach((d, i) => {
      if (!d) return; const g = group(keyOf(regs[i])); g.banked += d; g.bySource[src.key] = (g.bySource[src.key] || 0) + d; });
  } else {
    // Sites weigh by what they carry (class weight × count), so a data center outweighs a branch (2026-09-29 audit: not an even split).
    const sites = est.sites || [];
    const keys = sites.map(x => (dim === 'bu' ? buOf(x, tags) : regionOf(x)));
    const w = (on) => sites.map(x => (onAtt(x) === on ? countOf(x.name) * (SITE_W[classOf(x)] || 1) : 0));
    keys.forEach(k => group(k));
    const openTotal = (open || []).filter(f => f.priced).reduce((a, f) => a + (f.save || 0), 0);
    split(Math.round(openTotal), w(false)).forEach((d, i) => { group(keys[i]).open += d; });
    for (const src of sources) split(Math.round(src.perMo), w(true)).forEach((d, i) => {
      if (!d) return; const g = group(keys[i]); g.banked += d; g.bySource[src.key] = (g.bySource[src.key] || 0) + d; });
  }
  return Object.values(groups).sort((x, y) => (y.banked + y.open) - (x.banked + x.open));
}

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
import { buOf, countOf } from './naas-sites.js';

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
  return { ...life, [kind]: { ...rec, events: [...cur.events, ev] } };
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

// Split `total` across weights, to the dollar (largest remainder).
function split(total, weights) {
  const w = weights.some(x => x > 0) ? weights : weights.map(() => 1);
  const sum = w.reduce((a, x) => a + x, 0) || 1;
  const raw = w.map(x => total * x / sum), floor = raw.map(Math.floor);
  let left = total - floor.reduce((a, x) => a + x, 0);
  raw.map((x, i) => [x - floor[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { floor[i] += 1; left -= 1; } });
  return floor;
}
/**
 * Savings by region, business unit or cloud (notes, 2026-09-29). What was
 * banked follows what is on AT&T; what is still open follows what is not.
 * Sites weigh by count for region and business unit; clouds by workloads.
 */
export function savingsBy(est, dim, totals, tags = {}) {
  const groups = {};
  const add = (label, on, off) => { const g = groups[label] = groups[label] || { label, on: 0, off: 0 }; g.on += on; g.off += off; };
  if (dim === 'cloud') (est.regionsList || []).forEach(r => add(r.cloud, r.priv ? (r.wl || 1) : 0, r.priv ? 0 : (r.wl || 1)));
  else (est.sites || []).forEach(x => { const n = countOf(x.name), k = dim === 'bu' ? buOf(x, tags) : regionOf(x); add(k, onAtt(x) ? n : 0, onAtt(x) ? 0 : n); });
  const rows = Object.values(groups);
  const b = split(Math.round(totals.banked || 0), rows.map(g => g.on)), o = split(Math.round(totals.open || 0), rows.map(g => g.off));
  return rows.map((g, i) => ({ key: g.label, label: g.label, banked: b[i], open: o[i] })).sort((x, y) => (y.banked + y.open) - (x.banked + x.open));
}

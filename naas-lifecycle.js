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
const OWNER = { FinOps: 'FinOps · J. Rivera', 'Network Engineering': 'Network Eng · R. Patel', 'Security and Compliance': 'Security · M. Chen' };
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
  const months = Array.from({ length: 12 }, (_, i) => ym(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + i, 1)));
  let cumulative = 0;
  return months.map(month => {
    const saved = (first && month >= first ? base : 0)
      + [...closed, ...resolvedNow].filter(x => x.resolvedAt.slice(0, 7) <= month).reduce((a, x) => a + x.save, 0);
    cumulative += saved;
    return { month, saved, cumulative };
  });
}

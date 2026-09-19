/*
 * AT&T AI-grade Network - NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */

// Scheduled auto-discovery. Every function here is pure and takes `now` in
// milliseconds, so the tests never read the clock. All wall-clock arithmetic
// is done in UTC and a schedule's time-of-day string is rendered verbatim,
// so the label a customer reads and the instant the code computes can never
// drift apart on a machine in another timezone.

const HOUR = 3600000, DAY = 86400000;
const DAY_NAME = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

export const SCHEDULE_CHOICES = [
  { id: 'h6', label: 'Every 6 hours', schedule: { kind: 'hours', n: 6 } },
  { id: 'h12', label: 'Every 12 hours', schedule: { kind: 'hours', n: 12 } },
  { id: 'nightly', label: 'Nightly at 02:00', schedule: { kind: 'nightly', at: '02:00' } },
  { id: 'weekly', label: 'Sundays at 03:00', schedule: { kind: 'weekly', day: 0, at: '03:00' } },
  { id: 'manual', label: 'Manual only', schedule: { kind: 'manual' } },
];

function hhmm(at) { const p = String(at || '00:00').split(':'); return (+p[0]) * HOUR + (+p[1]) * 60000; }

function sameSchedule(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'hours') return a.n === b.n;
  if (a.kind === 'nightly') return a.at === b.at;
  if (a.kind === 'weekly') return a.day === b.day && a.at === b.at;
  return true;
}

/** The id of the SCHEDULE_CHOICES entry this schedule equals, or '' for none. */
export function scheduleId(sch) {
  const hit = SCHEDULE_CHOICES.find(c => sameSchedule(c.schedule, sch));
  return hit ? hit.id : '';
}

export function scheduleById(id) {
  const hit = SCHEDULE_CHOICES.find(c => c.id === id);
  return hit ? hit.schedule : null;
}

/** The cadence in words, with no clock reading in it. */
export function scheduleLabel(sch) {
  if (!sch) return 'Manual only';
  if (sch.kind === 'hours') return `Every ${sch.n} hours`;
  if (sch.kind === 'nightly') return `Nightly at ${sch.at}`;
  if (sch.kind === 'weekly') return `${DAY_NAME[sch.day] || 'Sundays'} at ${sch.at}`;
  return 'Manual only';
}

/** Milliseconds between two fires. Manual has no period. */
export function periodOf(sch) {
  if (!sch) return 0;
  if (sch.kind === 'hours') return Math.max(1, sch.n) * HOUR;
  if (sch.kind === 'nightly') return DAY;
  if (sch.kind === 'weekly') return 7 * DAY;
  return 0;
}

/** The most recent fire at or before `now`. */
export function prevRunAt(sch, now) {
  if (!sch || sch.kind === 'manual') return null;
  if (sch.kind === 'hours') { const p = periodOf(sch); return Math.floor(now / p) * p; }
  if (sch.kind === 'nightly') { const t = Math.floor(now / DAY) * DAY + hhmm(sch.at); return t <= now ? t : t - DAY; }
  if (sch.kind === 'weekly') {
    const midnight = Math.floor(now / DAY) * DAY;
    const back = (new Date(midnight).getUTCDay() - sch.day + 7) % 7;
    const t = midnight - back * DAY + hhmm(sch.at);
    return t <= now ? t : t - 7 * DAY;
  }
  return null;
}

/**
 * The first fire strictly after `now`. The grid is anchored to the cadence,
 * not to the last run, so pressing Re-discover at 13:00 does not move the
 * 18:00 slot.
 */
export function nextRunAt(sch, now) {
  const p = periodOf(sch);
  if (!p) return null;
  return prevRunAt(sch, now) + p;
}

export function agoLabel(at, now) {
  if (at == null) return 'never';
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export function clockLabel(at) {
  if (at == null) return '--:--';
  const d = new Date(at);
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
}

/** When the next run lands, in the fewest words that are still true. */
export function nextLabel(sch, next, now) {
  if (!sch || sch.kind === 'manual' || next == null) return 'on demand';
  if (sch.kind === 'hours') return `in ${Math.max(1, Math.round((next - now) / HOUR))}h`;
  if (sch.kind === 'weekly') return `${DAY_NAME[sch.day] || 'Sundays'} at ${sch.at}`;
  return `at ${sch.at}`;
}

/** The newest run in `runs` that covered this account, or null. */
export function lastRunOf(accountId, runs) {
  let best = null;
  (runs || []).forEach(r => {
    if ((r.accountIds || []).indexOf(accountId) >= 0 && (best == null || r.at > best)) best = r.at;
  });
  return best;
}

/**
 * The estate's seeded accounts, hydrated against a clock.
 *
 * lastRun is a fact from the run history: the newest run that covered this
 * account. With no history it falls back to the previous fire of the
 * account's seeded cadence, the runs that happened before this session
 * started, or, for a manual account, to its own lastRunAgoMin.
 *
 * nextRun is a fact about the effective cadence, so changing the cadence
 * moves the next scan at once without rewriting when the last one ran.
 */
export function accountsAt(est, now, opts = {}) {
  const over = opts.overrides || {}, runs = opts.runs || [];
  return ((est && est.accounts) || []).map(a => {
    const schedule = over[a.id] || a.schedule;
    const fromRuns = lastRunOf(a.id, runs);
    const lastRun = fromRuns != null ? fromRuns
      : a.schedule.kind === 'manual' ? now - (a.lastRunAgoMin || 0) * 60000
      : prevRunAt(a.schedule, now);
    return {
      id: a.id, cloud: a.cloud, acct: a.acct || null, cred: a.cred, regions: a.regions,
      name: `${a.cloud} ${a.acct || 'account'}`,
      scope: `Read-only · ${a.regions} ${a.regions === 1 ? 'region' : 'regions'}`,
      schedule, lastRun, nextRun: nextRunAt(schedule, now),
    };
  });
}

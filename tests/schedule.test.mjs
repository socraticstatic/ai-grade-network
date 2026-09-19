import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEDULE_CHOICES, scheduleId, scheduleById, scheduleLabel,
  periodOf, prevRunAt, nextRunAt, agoLabel, clockLabel, nextLabel,
} from '../naas-schedule.js';

// A fixed "now" so nothing here reads the clock. 2026-09-17 is a Thursday.
const T = (iso) => Date.parse(iso);
const NOW = T('2026-09-17T09:12:00Z');

test('the five cadences round-trip through their ids', () => {
  assert.equal(SCHEDULE_CHOICES.length, 5);
  for (const c of SCHEDULE_CHOICES) assert.equal(scheduleId(c.schedule), c.id);
  assert.deepEqual(scheduleById('nightly'), { kind: 'nightly', at: '02:00' });
  assert.equal(scheduleById('nope'), null);
  assert.equal(scheduleId({ kind: 'hours', n: 7 }), '');
  assert.equal(scheduleLabel({ kind: 'hours', n: 6 }), 'Every 6 hours');
  assert.equal(scheduleLabel({ kind: 'nightly', at: '02:00' }), 'Nightly at 02:00');
  assert.equal(scheduleLabel({ kind: 'weekly', day: 0, at: '03:00' }), 'Sundays at 03:00');
  assert.equal(scheduleLabel({ kind: 'manual' }), 'Manual only');
});

test('every N hours fires on the grid, never on the last run', () => {
  const sch = { kind: 'hours', n: 6 };
  assert.equal(periodOf(sch), 6 * 3600000);
  assert.equal(prevRunAt(sch, NOW), T('2026-09-17T06:00:00Z'));
  assert.equal(nextRunAt(sch, NOW), T('2026-09-17T12:00:00Z'));
  // Standing exactly on a fire: the next one is a whole period away.
  assert.equal(nextRunAt(sch, T('2026-09-17T12:00:00Z')), T('2026-09-17T18:00:00Z'));
});

test('nightly: before the hour it is today, after it is tomorrow', () => {
  const sch = { kind: 'nightly', at: '02:00' };
  assert.equal(nextRunAt(sch, T('2026-09-17T01:00:00Z')), T('2026-09-17T02:00:00Z'));
  assert.equal(nextRunAt(sch, T('2026-09-17T02:00:00Z')), T('2026-09-18T02:00:00Z'));
  assert.equal(prevRunAt(sch, T('2026-09-17T01:00:00Z')), T('2026-09-16T02:00:00Z'));
});

test('nightly crosses the day boundary', () => {
  const sch = { kind: 'nightly', at: '02:00' };
  assert.equal(nextRunAt(sch, T('2026-09-17T23:50:00Z')), T('2026-09-18T02:00:00Z'));
  assert.equal(prevRunAt(sch, T('2026-09-17T23:50:00Z')), T('2026-09-17T02:00:00Z'));
  assert.equal(nextRunAt(sch, T('2026-09-17T00:00:00Z')), T('2026-09-17T02:00:00Z'));
});

test('weekly lands on its own day, and crosses the week boundary', () => {
  const sch = { kind: 'weekly', day: 0, at: '03:00' };   // Sundays
  assert.equal(periodOf(sch), 7 * 86400000);
  // Thursday -> the coming Sunday.
  assert.equal(nextRunAt(sch, NOW), T('2026-09-20T03:00:00Z'));
  assert.equal(prevRunAt(sch, NOW), T('2026-09-13T03:00:00Z'));
  // Saturday 23:50 -> Sunday 03:00, three hours later.
  assert.equal(nextRunAt(sch, T('2026-09-19T23:50:00Z')), T('2026-09-20T03:00:00Z'));
  // Sunday 23:50, after it has already fired -> next Sunday.
  assert.equal(nextRunAt(sch, T('2026-09-20T23:50:00Z')), T('2026-09-27T03:00:00Z'));
  assert.equal(prevRunAt(sch, T('2026-09-20T23:50:00Z')), T('2026-09-20T03:00:00Z'));
});

test('manual never fires', () => {
  const sch = { kind: 'manual' };
  assert.equal(periodOf(sch), 0);
  assert.equal(prevRunAt(sch, NOW), null);
  assert.equal(nextRunAt(sch, NOW), null);
  assert.equal(nextLabel(sch, null, NOW), 'on demand');
});

test('the next run is one period after the last one, at every cadence', () => {
  // The spec asks for "the next run from a last run plus a cadence". prevRunAt
  // is that last run, so standing on it must hand back exactly one period.
  for (const sch of [
    { kind: 'hours', n: 6 }, { kind: 'hours', n: 12 },
    { kind: 'nightly', at: '02:00' }, { kind: 'weekly', day: 0, at: '03:00' },
  ]) {
    const last = prevRunAt(sch, NOW);
    assert.equal(nextRunAt(sch, last), last + periodOf(sch), JSON.stringify(sch));
    assert.ok(nextRunAt(sch, NOW) > NOW, JSON.stringify(sch));
  }
  // The weekly case across its own boundary: Saturday 23:59 is still last Sunday's.
  const wk = { kind: 'weekly', day: 0, at: '03:00' };
  const satLast = prevRunAt(wk, T('2026-09-19T23:59:00Z'));
  assert.equal(satLast, T('2026-09-13T03:00:00Z'));
  assert.equal(nextRunAt(wk, satLast), T('2026-09-20T03:00:00Z'));
  // The nightly case across its own boundary: 00:00 is still yesterday's 02:00.
  const nt = { kind: 'nightly', at: '02:00' };
  const midnightLast = prevRunAt(nt, T('2026-09-17T00:00:00Z'));
  assert.equal(midnightLast, T('2026-09-16T02:00:00Z'));
  assert.equal(nextRunAt(nt, midnightLast), T('2026-09-17T02:00:00Z'));
});

test('the labels say the fewest true words', () => {
  assert.equal(agoLabel(null, NOW), 'never');
  assert.equal(agoLabel(NOW - 20000, NOW), 'just now');
  assert.equal(agoLabel(NOW - 4 * 60000, NOW), '4m ago');
  assert.equal(agoLabel(NOW - 3 * 3600000, NOW), '3h ago');
  assert.equal(agoLabel(NOW - 2 * 86400000, NOW), '2d ago');
  assert.equal(clockLabel(T('2026-09-17T02:00:00Z')), '02:00');
  assert.equal(clockLabel(null), '--:--');
  assert.equal(nextLabel({ kind: 'nightly', at: '02:00' }, T('2026-09-18T02:00:00Z'), NOW), 'at 02:00');
  assert.equal(nextLabel({ kind: 'weekly', day: 0, at: '03:00' }, T('2026-09-20T03:00:00Z'), NOW), 'Sundays at 03:00');
  assert.equal(nextLabel({ kind: 'hours', n: 6 }, T('2026-09-17T12:00:00Z'), NOW), 'in 3h');
});

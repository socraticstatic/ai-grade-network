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

import * as D from '../naas-data.js';
import { accountsAt } from '../naas-schedule.js';

test('every estate carries accounts, and every seeded cadence is one a select offers', () => {
  assert.deepEqual(D.ESTATES.empty.accounts, []);
  for (const id of ['partial', 'mature', 'trust']) {
    const accts = D.ESTATES[id].accounts;
    assert.ok(accts.length >= 3, id);
    assert.equal(new Set(accts.map(a => a.id)).size, accts.length, id + ': ids are unique');
    for (const a of accts) {
      assert.notEqual(scheduleId(a.schedule), '', `${id}/${a.id} uses a cadence no select offers`);
      assert.ok(a.cred && a.cloud, `${id}/${a.id}`);
    }
  }
});

test('an account claims exactly the regions its cloud has', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id];
    for (const a of est.accounts) {
      const real = est.regionsList.filter(r => r.cloud === a.cloud).length;
      assert.equal(a.regions, real, `${id}/${a.id}`);
    }
  }
});

test('hydrating an account gives it a last scan behind us and a next scan ahead of us', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const rows = accountsAt(D.ESTATES[id], NOW);
    assert.equal(rows.length, D.ESTATES[id].accounts.length);
    for (const a of rows) {
      assert.ok(a.lastRun <= NOW, `${id}/${a.id} last scan is in the future`);
      if (a.schedule.kind === 'manual') assert.equal(a.nextRun, null);
      else assert.ok(a.nextRun > NOW, `${id}/${a.id} next scan is in the past`);
      assert.match(a.scope, /^Read-only · \d+ regions?$/);
    }
  }
});

test('an override moves the next scan and a run record moves the last scan', () => {
  const est = D.ESTATES.trust;
  const id = 'acc-aws';                     // nightly at 02:00
  const other = 'acc-azure';                // every 12 hours
  const base = accountsAt(est, NOW);
  const baseOne = (rows, k) => rows.find(a => a.id === k);

  const over = baseOne(accountsAt(est, NOW, { overrides: { [id]: { kind: 'hours', n: 6 } } }), id);
  assert.notEqual(over.nextRun, baseOne(base, id).nextRun);
  assert.equal(over.nextRun, T('2026-09-17T12:00:00Z'));
  assert.equal(over.lastRun, baseOne(base, id).lastRun, 'changing the cadence does not rewrite history');

  const ran = accountsAt(est, NOW, { runs: [{ at: NOW - 60000, accountIds: [id] }] });
  assert.equal(baseOne(ran, id).lastRun, NOW - 60000);
  assert.equal(baseOne(ran, other).lastRun, baseOne(base, other).lastRun, 'a run only touches the accounts it covered');
});

test('the empty estate hydrates to nothing rather than throwing', () => {
  assert.deepEqual(accountsAt(D.ESTATES.empty, NOW), []);
  assert.deepEqual(accountsAt({}, NOW), []);
});

import { runRecord, seedRuns, newestRun, soonestNext, estateCadence } from '../naas-schedule.js';

test('a run record counts what it read and names what it covered', () => {
  const est = D.ESTATES.trust;
  const r = runRecord({ at: NOW, trigger: 'manual', accountIds: ['acc-aws', 'acc-gcp'], est });
  assert.equal(r.id, `run-${NOW}-manual`);
  assert.equal(r.at, NOW);
  assert.equal(r.trigger, 'manual');
  assert.deepEqual(r.accountIds, ['acc-aws', 'acc-gcp']);
  assert.equal(r.accounts, 2);
  assert.equal(r.regions, est.regionsList.length);
  assert.equal(r.sites, est.sitesCount);
  assert.equal(r.ok, true);
  assert.equal(runRecord({ at: NOW, trigger: 'intake', accountIds: [], est: {} }).sites, 0);
});

test('a nightly estate seeds last night and the night before, newest first', () => {
  const accts = accountsAt(D.ESTATES.partial, NOW);
  const runs = seedRuns(accts, NOW, 3);
  assert.equal(runs.length, 3);
  assert.deepEqual(runs.map(r => r.at), [
    T('2026-09-17T02:00:00Z'), T('2026-09-16T02:00:00Z'), T('2026-09-15T02:00:00Z'),
  ]);
  assert.equal(runs[0].trigger, 'schedule');
  assert.deepEqual(runs[0].accountIds.slice().sort(), ['acc-aws', 'acc-azure', 'acc-gcp']);
});

test('mixed cadences share an instant when they land on one, and manual never seeds', () => {
  const accts = accountsAt(D.ESTATES.trust, NOW);
  const runs = seedRuns(accts, NOW, 4);
  // AWS is nightly 02:00, Azure is every 12h (00:00 and 12:00), GCP is manual.
  assert.deepEqual(runs.map(r => r.at), [
    T('2026-09-17T02:00:00Z'), T('2026-09-17T00:00:00Z'),
    T('2026-09-16T12:00:00Z'), T('2026-09-16T02:00:00Z'),
  ]);
  assert.deepEqual(runs[0].accountIds, ['acc-aws']);
  assert.deepEqual(runs[1].accountIds, ['acc-azure']);
  for (const r of runs) assert.equal(r.accountIds.indexOf('acc-gcp'), -1);
  assert.deepEqual(seedRuns([], NOW, 3), []);
});

test('the estate reads one cadence when the accounts agree and mixed when they do not', () => {
  assert.deepEqual(estateCadence(accountsAt(D.ESTATES.partial, NOW)),
    { id: 'nightly', label: 'Nightly at 02:00', mixed: false, empty: false });
  assert.equal(estateCadence(accountsAt(D.ESTATES.trust, NOW)).mixed, true);
  assert.equal(estateCadence(accountsAt(D.ESTATES.trust, NOW)).label, 'Mixed');
  assert.equal(estateCadence([]).empty, true);
});

test('newest run and soonest next scan pick the right end of the list', () => {
  const runs = seedRuns(accountsAt(D.ESTATES.partial, NOW), NOW, 3)
    .map(r => runRecord({ ...r, est: D.ESTATES.partial }));
  assert.equal(newestRun(runs).at, T('2026-09-17T02:00:00Z'));
  assert.equal(newestRun([]), null);
  // trust: Azure's every-12h lands at 12:00 today, before AWS's 02:00 tomorrow.
  assert.equal(soonestNext(accountsAt(D.ESTATES.trust, NOW)), T('2026-09-17T12:00:00Z'));
  assert.equal(soonestNext([]), null);
});

import { scheduleView } from '../naas-schedule.js';

test('the view is one answer the four surfaces share', () => {
  const v = scheduleView(D.ESTATES.partial, NOW);
  assert.equal(v.nowMs, NOW);
  assert.equal(v.accounts.length, 3);
  assert.equal(v.runs.length, 3);
  assert.equal(v.lastRun.at, T('2026-09-17T02:00:00Z'));
  assert.equal(v.nextAt, T('2026-09-18T02:00:00Z'));
  assert.deepEqual(v.nextSchedule, { kind: 'nightly', at: '02:00' });
  assert.equal(v.cadence.id, 'nightly');
  // Every account's last scan agrees with the newest run that covered it.
  for (const a of v.accounts) assert.equal(a.lastRun, T('2026-09-17T02:00:00Z'));
});

test('a run on demand becomes the newest run and moves every account it covered', () => {
  const est = D.ESTATES.partial;
  const mine = [runRecord({ at: NOW - 30000, trigger: 'manual', accountIds: est.accounts.map(a => a.id), est })];
  const v = scheduleView(est, NOW, { runs: mine });
  assert.equal(v.lastRun.trigger, 'manual');
  assert.equal(v.lastRun.at, NOW - 30000);
  assert.equal(v.runs.length, 4, 'the seeded history is kept behind it');
  assert.ok(v.runs.every((r, i) => i === 0 || r.at <= v.runs[i - 1].at), 'newest first');
  for (const a of v.accounts) assert.equal(a.lastRun, NOW - 30000);
  assert.equal(v.nextAt, T('2026-09-18T02:00:00Z'), 'running on demand does not move the grid');
});

test('an override reaches the view, the cadence and the next scan together', () => {
  const v = scheduleView(D.ESTATES.partial, NOW, { overrides: {
    'acc-aws': { kind: 'hours', n: 6 }, 'acc-azure': { kind: 'hours', n: 6 }, 'acc-gcp': { kind: 'hours', n: 6 },
  } });
  assert.equal(v.cadence.id, 'h6');
  assert.equal(v.cadence.mixed, false);
  assert.equal(v.nextAt, T('2026-09-17T12:00:00Z'));
});

test('the empty estate has a view with nothing in it', () => {
  const v = scheduleView(D.ESTATES.empty, NOW);
  assert.deepEqual(v.accounts, []);
  assert.deepEqual(v.runs, []);
  assert.equal(v.lastRun, null);
  assert.equal(v.nextAt, null);
  assert.equal(v.nextSchedule, null);
  assert.equal(v.cadence.empty, true);
});

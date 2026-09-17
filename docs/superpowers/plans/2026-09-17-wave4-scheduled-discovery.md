# Wave 4 — Scheduled Auto-Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox syntax for tracking.

**Goal:** Make it impossible to miss that discovery runs automatically on a cadence the customer
sets, controls from three surfaces, and can test with one button that writes a real run record.

**Architecture:** A new pure module, `naas-schedule.js`, owns the schedule shape, the next-run
computation, the run record and one composition function, `scheduleView(est, now, opts)`, that
returns everything the screens bind. `naas-data.js` gains an `accounts` array per estate — the seed
the view hydrates. `naas-app.js` calls `scheduleView` once per render in `vals()` and hands the
result to `shellVals` (title row, rail) and `addendumVals` (Accounts card, activity log), so the
four surfaces cannot disagree about when the last scan ran. Every wall-clock instant is computed
from a `now` passed in, never from a clock read inside a pure function.

**Tech Stack:** Static ES modules, React 18 UMD (vendored), the dc-runtime, node:test.

**Spec:** docs/superpowers/specs/2026-09-17-storefront-story-schedule-scale-design.md

## Global Constraints

1. `sc-for` NEVER renders inside `<table>` or `<svg>`. Use the `.dt` / `.dt-h` / `.dt-b` / `.dt-r` / `.dt-c` CSS-table classes. Every table in the app already does.
2. The dc-runtime expression language is TINY: path lookup, `==` `!=` `===` `!==`, `!`, literals. NO function calls, NO arithmetic, NO ternary, NO logical and/or. Compute the value in `naas-app.js` and bind the computed value.
3. Never load React from a CDN. It is vendored in `vendor/`. AT&T networks block CDNs behind an SRI check and the page comes up blank.
4. Markup edits to `NaaS Storefront.dc.html` have TWICE shipped a stray closing tag that silently killed later screens. Every task that edits it must count open/close tags in the edited section AND screenshot a screen BELOW the edit, not just the one being changed.
5. A dashboard fits the fold: 1440x900, no page scroll on Observe and Home, and no button within 10px of a card edge.
6. Nothing leaves the page. Drills open in place; drawers and details overlay the content.
7. Type is AT&T Aleck Sans with a documented fallback. Colours come from CSS custom properties in the light and dark theme blocks. Never hardcode a hex inside a component.
8. Verification is not optional: CLAUDE.md forbids declaring any UI task done without running the dev server and confirming in a browser. Every task ends by verifying in the browser and naming which estates were checked.

**One extra rule this wave discovered.** `sc-for` dies inside `<select>` too, and for the same
reason: the HTML parser's "in select" insertion mode ignores every start tag that is not
`option`/`optgroup`/`hr`/`script`/`template`, so an `<sc-for>` wrapper is dropped before the runtime
sees it. Every `<select>` in this app already uses a literal `<option>` list. Keep it that way — the
five cadence options are written out longhand in every select this plan adds.

---

## File Structure

| File | The one thing it is responsible for |
|---|---|
| `naas-schedule.js` **(new)** | The schedule shape, the next-run and previous-run computation, the run record, and `scheduleView` — the single composition the screens read. Pure; takes `now` as an argument. |
| `naas-data.js` | Gains an `accounts` array on each of the four estates: the seed each account is hydrated from. |
| `naas-app.js` | Calls `scheduleView` once in `vals()`, adds the two handlers (`setSchedule`, `runNow`), and binds the result on the title row, the Accounts card, the rail and the activity log. |
| `NaaS Storefront.dc.html` | Three edited regions: the page title row (`:258-260`), the Accounts card table (`:965-980`), the rail row (`:239`); plus the intake copy (`:503`, `:511`, `:538`) and one new cadence card on S1. |
| `tests/schedule.test.mjs` **(new)** | Every assertion in this wave: the schedule shape, next-run including the nightly, weekly and day-boundary cases, the account hydration, the run record, and `scheduleView`. |

### Every line number in this plan is measured against HEAD

Every `path:LINE` below was read off the working tree as it stands at commit `04bbb1e`, before any
task has run. The tasks then insert lines, so a number written for Task 6 is **not** where that code
sits once Task 4 has added two dozen lines to `vals()`. The shifts that matter:

| Insertion | Lines added | What moves |
|---|---|---|
| Task 4 Step 4a, the import after `naas-app.js:18` | +1 | everything below it |
| Task 4 Step 4b, after `naas-app.js:141` | +24 | everything below it, so `:1285`, `:1457`, `:1603` and the rest are 25 lower than they will be |
| Task 4 Step 4c, `startScan` | +5 | everything below `:479` |
| Task 5 Step 1, after `naas-app.js:1459` | +12 | the rest of `shellVals`, including Task 7's targets |

Every replacement step changes its own line count too, so the arithmetic does not stay tidy.

So: **anchor every edit on the quoted source text, never on the number.** The numbers are there to
send you to the right neighbourhood and to prove the claim about what is there today. `grep -n` for
the quoted string, confirm it matches once, then edit. If a quoted string matches twice or not at
all, stop — the file is not what this plan was written against.

---

### Task 1: The schedule shape and the next-run computation

**Files:**
- Create: `/Users/micahbos/Developer/cloud-connect/naas-schedule.js`
- Test: `tests/schedule.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `SCHEDULE_CHOICES: Array<{ id: string, label: string, schedule: Schedule }>`
  - `Schedule = { kind: 'hours', n: number } | { kind: 'nightly', at: 'HH:MM' } | { kind: 'weekly', day: 0..6, at: 'HH:MM' } | { kind: 'manual' }`
  - `scheduleId(sch: Schedule): string` — `''` when it matches no choice
  - `scheduleById(id: string): Schedule | null`
  - `scheduleLabel(sch: Schedule): string`
  - `periodOf(sch: Schedule): number` — ms; `0` for manual
  - `prevRunAt(sch: Schedule, now: number): number | null`
  - `nextRunAt(sch: Schedule, now: number): number | null`
  - `agoLabel(at: number|null, now: number): string`
  - `clockLabel(at: number|null): string`
  - `nextLabel(sch: Schedule, next: number|null, now: number): string`

- [ ] **Step 1: Write the failing test**

  Create `/Users/micahbos/Developer/cloud-connect/tests/schedule.test.mjs`:

  ```js
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
    assert.equal(clockLabel(null), '—');
    assert.equal(nextLabel({ kind: 'nightly', at: '02:00' }, T('2026-09-18T02:00:00Z'), NOW), 'at 02:00');
    assert.equal(nextLabel({ kind: 'weekly', day: 0, at: '03:00' }, T('2026-09-20T03:00:00Z'), NOW), 'Sundays at 03:00');
    assert.equal(nextLabel({ kind: 'hours', n: 6 }, T('2026-09-17T12:00:00Z'), NOW), 'in 3h');
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**
  Run: `npm test`
  Expected: FAIL with `Cannot find module '/Users/micahbos/Developer/cloud-connect/naas-schedule.js'`.

- [ ] **Step 3: Write the module**

  Create `/Users/micahbos/Developer/cloud-connect/naas-schedule.js`:

  ```js
  /*
   * AT&T AI-grade Network — NaaS storefront prototype
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
    if (at == null) return '—';
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
  ```

- [ ] **Step 4: Run the test to verify it passes**
  Run: `npm test`
  Expected: 64 passing, 0 failing (56 before, 8 added).

- [ ] **Step 5: Verify in the browser**
  Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=mature#s3/cloud/connect` (start the
  server with `npm start` if 8787 is not already answering). Nothing imports the new module yet, so
  the only thing to confirm is that nothing regressed: no red render-error banner at the top left,
  no console errors. Check the **mature** and **trust** estates.

- [ ] **Step 6: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-schedule.js tests/schedule.test.mjs
  git commit -m "$(cat <<'EOF'
  schedule: a cadence has four shapes and one next-run rule

  Every N hours, nightly at a time, weekly on a day at a time, and manual
  only. The grid is anchored to the cadence rather than to the last run, so
  a run on demand does not move the next slot. Now is an argument, so the
  tests are deterministic and a machine in another timezone reads the same
  clock the label prints.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 2: Accounts on the four estates

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-data.js` (one insertion per estate, after `naas-data.js:38` empty, `:42` partial, `:87` mature, `:146` trust — each insertion shifts the ones below it, so anchor every Edit on text, not on the number)

  **The obvious anchor is not unique.** `id: 'empty'`, `id: 'partial'`, `id: 'mature'` and
  `id: 'trust'` each appear **twice** in this file: once in the `VIEWS` list at `naas-data.js:20-23`
  (`{ id: 'empty', label: 'New customer' },`) and once as the estate header. Anchoring on the short
  string either fails the Edit as ambiguous or, worse, inserts an `accounts:` array into the demo
  picker's list. Anchor on the estate header's **name**, which is unique:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  grep -c "name: 'Meridian Logistics'" naas-data.js   # 1
  grep -c "name: 'Acme Corp'" naas-data.js            # 1
  grep -c "name: 'DataFlow Systems'" naas-data.js     # 1
  grep -c "name: 'Meridian Networks'" naas-data.js    # 1
  ```
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-schedule.js` (append)
- Test: `tests/schedule.test.mjs`

**Interfaces:**
- Consumes: `prevRunAt(sch, now)`, `nextRunAt(sch, now)`, `scheduleId(sch)` from Task 1.
- Produces:
  - `est.accounts: Array<{ id, cloud, acct: string|null, cred, regions: number, schedule: Schedule, lastRunAgoMin?: number }>` — the seed.
  - `accountsAt(est, now, opts?: { overrides?: Record<string, Schedule>, runs?: RunRecord[] }): Array<{ id, cloud, acct, cred, name, regions, scope, schedule, lastRun: number|null, nextRun: number|null }>` — the hydrated array the screens read. `lastRun` comes from `opts.runs` when a run covered the account, otherwise from the seed schedule's previous fire (or `now - lastRunAgoMin` for a manual account). `nextRun` comes from the *effective* schedule, so an override moves it immediately.

- [ ] **Step 1: Write the failing test**

  Append to `/Users/micahbos/Developer/cloud-connect/tests/schedule.test.mjs`:

  ```js
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
  ```

- [ ] **Step 2: Run the test to verify it fails**
  Run: `npm test`
  Expected: FAIL at link time, before a single test runs, with
  `SyntaxError: The requested module '../naas-schedule.js' does not provide an export named 'accountsAt'`.
  A named import of a missing export is a link error, not a runtime one, so `tests/schedule.test.mjs`
  fails to load as a whole and its 8 green tests from Task 1 stop reporting too. The other test files
  are separate `node --test` entries and stay green. That is the correct RED for this step.

- [ ] **Step 3: Seed the four estates**

  Four Edits in `/Users/micahbos/Developer/cloud-connect/naas-data.js`, each inserting one line
  directly after that estate's `id:` header line. Note that today's credential string is derived in
  `naas-app.js:1290` with
  `cloud === 'Azure' ? 'Service principal' : cloud === 'Google Cloud' ? 'Service account' : 'Cross-account role'`,
  and every estate spells the cloud `GCP`, never `Google Cloud`, so the middle branch never fires and
  every GCP account is currently mislabelled a cross-account role. The seed fixes that.

  After `id: 'empty', name: 'Meridian Logistics', …` (the line ending `privatePct: 0,`):
  ```js
      accounts: [],
  ```

  After `id: 'partial', name: 'Acme Corp', …` (the line ending `tags: 14,`):
  ```js
      accounts: [
        { id: 'acc-aws', cloud: 'AWS', acct: null, cred: 'Cross-account role', regions: 3, schedule: { kind: 'nightly', at: '02:00' } },
        { id: 'acc-azure', cloud: 'Azure', acct: 'sub 7f3a-…-21c4', cred: 'Service principal', regions: 2, schedule: { kind: 'nightly', at: '02:00' } },
        { id: 'acc-gcp', cloud: 'GCP', acct: null, cred: 'Service account', regions: 2, schedule: { kind: 'nightly', at: '02:00' } },
      ],
  ```

  After `id: 'mature', name: 'DataFlow Systems', …` (the line ending `tags: 31,`):
  ```js
      accounts: [
        { id: 'acc-aws', cloud: 'AWS', acct: 'acct 4102-8837-5510', cred: 'Cross-account role', regions: 4, schedule: { kind: 'nightly', at: '02:00' } },
        { id: 'acc-azure', cloud: 'Azure', acct: 'sub 7f3a-…-21c4', cred: 'Service principal', regions: 2, schedule: { kind: 'nightly', at: '02:00' } },
        { id: 'acc-gcp', cloud: 'GCP', acct: null, cred: 'Service account', regions: 1, schedule: { kind: 'hours', n: 6 } },
        { id: 'acc-coreweave', cloud: 'CoreWeave', acct: null, cred: 'API key', regions: 1, schedule: { kind: 'weekly', day: 0, at: '03:00' } },
      ],
  ```

  After `id: 'trust', name: 'Meridian Networks', …` (the line ending `tags: 42,`):
  ```js
      accounts: [
        { id: 'acc-aws', cloud: 'AWS', acct: 'acct 6620-1194-3308', cred: 'Cross-account role', regions: 3, schedule: { kind: 'nightly', at: '02:00' } },
        { id: 'acc-azure', cloud: 'Azure', acct: 'sub 0c9e-…-88b1', cred: 'Service principal', regions: 2, schedule: { kind: 'hours', n: 12 } },
        { id: 'acc-gcp', cloud: 'GCP', acct: null, cred: 'Service account', regions: 1, schedule: { kind: 'manual' }, lastRunAgoMin: 2760 },
      ],
  ```

- [ ] **Step 4: Write `accountsAt`**

  Append to `/Users/micahbos/Developer/cloud-connect/naas-schedule.js`:

  ```js
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
   * account. With no history it falls back to the previous fire of the account's
   * SEEDED cadence — the runs that happened before this session started — or, for
   * a manual account, to its own lastRunAgoMin.
   *
   * nextRun is a fact about the EFFECTIVE cadence, so changing the cadence moves
   * the next scan at once without rewriting when the last one ran.
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
  ```

- [ ] **Step 5: Run the test to verify it passes**
  Run: `npm test`
  Expected: 69 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**
  Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect`. The estates
  now carry an extra field that nothing reads yet: confirm the Discover screen renders exactly as
  before, the Connected accounts card still lists its rows, and there is no red render-error banner
  and no console error. Check **partial**, **mature**, **trust** and **empty**
  (`?view=empty` — the intake form must still appear).

- [ ] **Step 7: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-data.js naas-schedule.js tests/schedule.test.mjs
  git commit -m "$(cat <<'EOF'
  data: an account is a thing the estate owns, not a shape derived from regions

  Each estate seeds its cloud accounts with a credential, a scope and a
  cadence. Hydrating them against a clock gives each one a last scan read
  from the run history and a next scan read from the cadence, so changing
  the cadence moves the next scan without rewriting the past. GCP credentials
  stop being labelled cross-account roles.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 3: The run record and the seeded history

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-schedule.js` (append)
- Test: `tests/schedule.test.mjs`

**Interfaces:**
- Consumes: `periodOf`, `prevRunAt`, `scheduleId` from Task 1; `accountsAt` from Task 2.
- Produces:
  - `RunRecord = { id: string, at: number, trigger: 'schedule'|'manual'|'intake', accountIds: string[], accounts: number, regions: number, sites: number, ok: boolean }`
  - `runRecord({ at, trigger, accountIds, est }): RunRecord`
  - `seedRuns(accounts, now, n?): Array<{ at, trigger: 'schedule', accountIds }>` — newest first
  - `newestRun(runs): RunRecord | null`
  - `soonestNext(accounts): number | null`
  - `estateCadence(accounts): { id: string, label: string, mixed: boolean, empty: boolean }`

- [ ] **Step 1: Write the failing test**

  Append to `/Users/micahbos/Developer/cloud-connect/tests/schedule.test.mjs`:

  ```js
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
  ```

- [ ] **Step 2: Run the test to verify it fails**
  Run: `npm test`
  Expected: FAIL with `SyntaxError: The requested module '../naas-schedule.js' does not provide an export named 'runRecord'`.

- [ ] **Step 3: Write the run record and the seeded history**

  Append to `/Users/micahbos/Developer/cloud-connect/naas-schedule.js`:

  ```js
  /** One discovery run: when it happened, what it covered, what it read. */
  export function runRecord({ at, trigger, accountIds, est }) {
    const ids = accountIds || [], e = est || {};
    return {
      id: `run-${at}-${trigger}`,
      at, trigger, accountIds: ids,
      accounts: ids.length,
      regions: (e.regionsList || []).length,
      sites: e.sitesCount || (e.sites || []).length || 0,
      ok: true,
    };
  }

  /**
   * The runs the accounts' own cadences imply, newest first. Two accounts that
   * fire at the same instant share one record, which is what a customer sees:
   * one nightly sweep, not three.
   */
  export function seedRuns(accounts, now, n = 3) {
    const byAt = new Map();
    (accounts || []).forEach(a => {
      const p = periodOf(a.schedule);
      if (!p) return;
      let t = prevRunAt(a.schedule, now);
      for (let i = 0; i < n && t != null; i++, t -= p) {
        if (!byAt.has(t)) byAt.set(t, []);
        byAt.get(t).push(a.id);
      }
    });
    return [...byAt.entries()].sort((x, y) => y[0] - x[0]).slice(0, n)
      .map(([at, accountIds]) => ({ at, trigger: 'schedule', accountIds }));
  }

  export function newestRun(runs) {
    return (runs || []).reduce((best, r) => (best == null || r.at > best.at) ? r : best, null);
  }

  export function soonestNext(accounts) {
    return (accounts || []).reduce((best, a) =>
      (a.nextRun != null && (best == null || a.nextRun < best)) ? a.nextRun : best, null);
  }

  /** One cadence for the whole estate when every account agrees, else Mixed. */
  export function estateCadence(accounts) {
    const list = accounts || [];
    if (!list.length) return { id: '', label: 'No accounts', mixed: false, empty: true };
    const ids = [...new Set(list.map(a => scheduleId(a.schedule)))];
    if (ids.length === 1 && ids[0]) return { id: ids[0], label: scheduleLabel(list[0].schedule), mixed: false, empty: false };
    return { id: '', label: 'Mixed', mixed: true, empty: false };
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**
  Run: `npm test`
  Expected: 74 passing, 0 failing.

- [ ] **Step 5: Verify in the browser**
  Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=mature#s3/cloud/connect`. Still nothing
  imports the module from the app, so the check is again that nothing regressed: no red
  render-error banner, no console error, Discover and Observe render. Check **mature** and
  **trust**.

- [ ] **Step 6: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-schedule.js tests/schedule.test.mjs
  git commit -m "$(cat <<'EOF'
  schedule: a run is a record, and the cadence implies the ones before this session

  Two accounts that fire at the same instant share one record, so a nightly
  estate reads as one sweep at 02:00 rather than three. Manual accounts seed
  nothing, because nothing ran.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 4: One view, computed once, handed to every surface

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-schedule.js` (append `scheduleView`)
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:18` (import), `:140-141` (compute the view and the handlers), `:387` (pass to `shellVals`), `:442` (pass to `addendumVals`), `:474-479` (`startScan` raises `scanBusy`), `:661` (`addendumVals` signature), `:1457` (`shellVals` signature)
- Test: `tests/schedule.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces:
  - `scheduleView(est, now, opts?: { overrides?, runs?, history? }): { nowMs, accounts, runs, lastRun, nextAt, nextSchedule, cadence }`
  - In `naas-app.js`, a local `sched` object: the `scheduleView` result plus `setSchedule(ids: string[]): (e) => void` and `runNow(ids: string[], trigger?): () => void`. Passed as the last argument to `shellVals(s, set, go, est, c, sched)` and `addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0, sched)`.
  - State keys introduced, all new, none of them `s.obWindow`: `s.acctSched = { est: string, map: Record<string, Schedule> }`, `s.scanRuns = { est: string, list: RunRecord[] }`, `s.scanBusy: boolean`.

- [ ] **Step 1: Write the failing test**

  Append to `/Users/micahbos/Developer/cloud-connect/tests/schedule.test.mjs`:

  ```js
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
  ```

- [ ] **Step 2: Run the test to verify it fails**
  Run: `npm test`
  Expected: FAIL with `does not provide an export named 'scheduleView'`.

- [ ] **Step 3: Write `scheduleView`**

  Append to `/Users/micahbos/Developer/cloud-connect/naas-schedule.js`:

  ```js
  /**
   * Everything the screens bind, computed once per render. The title row, the
   * Accounts card, the rail and the activity log all read this object, so they
   * cannot disagree about when the last scan ran.
   */
  export function scheduleView(est, now, opts = {}) {
    const overrides = opts.overrides || {};
    const seeded = accountsAt(est, now, { overrides });
    const runs = [
      ...(opts.runs || []),
      ...seedRuns(seeded, now, opts.history || 3).map(r => runRecord({ ...r, est })),
    ].sort((a, b) => b.at - a.at);
    const accounts = accountsAt(est, now, { overrides, runs });
    const nextAt = soonestNext(accounts);
    const nextAcct = accounts.find(a => a.nextRun === nextAt) || null;
    return {
      nowMs: now, accounts, runs,
      lastRun: newestRun(runs),
      nextAt,
      nextSchedule: nextAcct ? nextAcct.schedule : null,
      cadence: estateCadence(accounts),
    };
  }
  ```

- [ ] **Step 4: Wire it into `naas-app.js`**

  Four edits, no markup.

  **a.** After `naas-app.js:18` (`import * as V from './naas-volume.js';`) add:
  ```js
  import * as SCH from './naas-schedule.js';
  ```

  **b.** After `naas-app.js:141` (the `const go = (screen, extra) => …` line) insert:
  ```js
    // Scheduled auto-discovery (wave 4). One clock, one account list and one run
    // history for the whole render. s.acctSched and s.scanRuns are keyed by estate
    // so the demo picker cannot carry one estate's cadence onto another. Neither
    // of them is s.obWindow, which already means two things.
    const nowMs = Date.now();
    const schedOver = (s.acctSched && s.acctSched.est === est.id) ? s.acctSched.map : {};
    const myRuns = (s.scanRuns && s.scanRuns.est === est.id) ? s.scanRuns.list : [];
    const schedView = SCH.scheduleView(est, nowMs, { overrides: schedOver, runs: myRuns });
    const sched = {
      ...schedView,
      setSchedule: (ids) => (e) => {
        const next = SCH.scheduleById(e.target.value);
        if (!next) return;                       // the estate-wide select's "Mixed" entry
        const map = { ...schedOver };
        ids.forEach(id => { map[id] = next; });
        c.setState({ acctSched: { est: est.id, map } });
      },
      runNow: (ids, trigger) => () => {
        if (!ids.length) return;
        const rec = SCH.runRecord({ at: Date.now(), trigger: trigger || 'manual', accountIds: ids, est });
        c.setState({ scanRuns: { est: est.id, list: [rec, ...myRuns] } });
        startScan(c);
      },
    };
  ```

  **c.** `naas-app.js:474-479`, replace `startScan` so a run raises and clears a busy flag — this is
  what makes Re-discover visibly do something on Discover, where there is no scan screen:
  ```js
  let scanTimer = null;
  export function startScan(c) {
    clearInterval(scanTimer);
    c.setState({ scanStep: 0, scanBusy: true });
    scanTimer = setInterval(() => {
      c.setState(st => {
        if (st.scanStep >= 4) { clearInterval(scanTimer); return { scanBusy: false }; }
        return { scanStep: st.scanStep + 1 };
      });
    }, 750);
  }
  ```

  **d.** Pass `sched` down. At `naas-app.js:387` change `...shellVals(s, set, go, est, c),` to
  `...shellVals(s, set, go, est, c, sched),` and at `:1457` change the signature to
  `function shellVals(s, set, go, est, c, sched) {`. At `naas-app.js:442` change
  `...addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0),` to
  `...addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0, sched),` and at
  `:661` change the signature to
  `function addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0, sched) {`.

- [ ] **Step 5: Run the test to verify it passes**
  Run: `npm test`
  Expected: 78 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**
  Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect`. Nothing is
  bound to `sched` yet, so this step is pure regression cover for the plumbing: no red render-error
  banner, no console error, Discover, Observe, Govern and Cost all render, and the demo view picker
  still switches estates. Then open `?view=empty` and confirm the intake form still appears (the
  empty estate has no accounts, and `scheduleView` must not throw on it). Check **empty**,
  **partial**, **mature** and **trust**.

- [ ] **Step 7: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-schedule.js naas-app.js tests/schedule.test.mjs
  git commit -m "$(cat <<'EOF'
  app: one schedule view per render, handed to every surface

  scheduleView composes the seeded history, the accounts and the cadence into
  one object, so the title row, the Accounts card, the rail and the activity
  log cannot disagree about when the last scan ran. The state keys are new and
  keyed by estate; obWindow is left alone, because it already means both a
  discovery window and an observation window.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 5: Surface 1 — the page title row

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:1459` (insert the derivations at the top of `shellVals`), `:1603-1610` (replace), `:1622` (the returned values), `:42` (delete the dead `window.__naasLoaded` write)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:258-259` (replace the two buttons), `:260` (`manageCreds` keeps its markup; only its handler changes)
- Test: `tests/schedule.test.mjs` (already covers the values; no new test)

**Line numbers drift inside this task too** — see the note under File Structure. Step 1 inserts
twelve lines at the top of `shellVals`, so from Step 2 onward every later `shellVals` line sits
twelve further down than the number written here.

**Interfaces:**
- Consumes: `sched` from Task 4; `SCH.agoLabel`, `SCH.nextLabel`, `SCH.scheduleLabel`, `SCH.SCHEDULE_CHOICES`.
- Produces, bound in the markup: `schedLine`, `schedTitle`, `cadenceValue`, `setCadence`, `rescan`, `credsLabel`, `credsTitle`, `manageCreds`. Removes `updatedAgo` from the binding surface.

- [ ] **Step 1: Hoist the schedule derivations to the top of `shellVals`**

  These must sit above `railGroups` (`naas-app.js:1567`) because Task 7 reads them there. Insert
  immediately after `naas-app.js:1459` (the `const iconDir = …` line):

  ```js
    // Scheduled discovery, read once for the title row and the rail.
    const schedAcctIds = sched.accounts.map(a => a.id);
    const nextWord = SCH.nextLabel(sched.nextSchedule, sched.nextAt, sched.nowMs);
    const scannedWord = SCH.agoLabel(sched.lastRun ? sched.lastRun.at : null, sched.nowMs);
    const schedLine = s.scanBusy ? 'Scanning…'
      : sched.cadence.empty ? 'No accounts connected yet'
      : `Scanned ${scannedWord} · next ${nextWord}`;
    const schedTitle = sched.cadence.empty
      ? 'Connect a cloud account to put discovery on a schedule'
      : sched.accounts.map(a => `${a.name}: ${SCH.scheduleLabel(a.schedule)}`).join(' · ');
    const cadenceValue = sched.cadence.id;
    const setCadence = sched.setSchedule(schedAcctIds);
  ```

- [ ] **Step 2: Replace the eight lines at `naas-app.js:1603-1610`**

  Delete `loadedAt`, `agoMin`, `updatedAgo` and the old `rescan`, and fix both `credsN` bugs.
  `credsN` was `(est.clouds || []).length` — `est.clouds` is a **number** on every estate, and a
  number has no `.length`, so the count was always `undefined` and the tooltip always claimed the
  estate had no accounts. Replace with:

  ```js
    const rescan = sched.runNow(schedAcctIds, 'manual');
    const credsN = sched.accounts.length;
    const credsLabel = credsN ? `Manage credentials (${credsN})` : 'Manage credentials';
    const credsTitle = credsN
      ? `${credsN} connected ${credsN === 1 ? 'account' : 'accounts'}; this picture is what they can see`
      : 'Connect a cloud account to scan it';
    // Manage credentials went to the empty-estate front door, which is not where
    // the accounts are. It scrolls to the Accounts card by the same mechanism the
    // rail already uses (naas-app.js:1576), and only falls back to s0 when there
    // is genuinely nothing to scroll to.
    const manageCreds = () => {
      if (!credsN) { go('s0')(); set(close); return; }
      go('s3', { layer: 'cloud', tab: 'connect' })();
      set({ ...close, scrollToSec: 'sec-accounts', scrollNonce: (s.scrollNonce || 0) + 1 });
    };
  ```

  `close` here is `shellVals`'s own `{ elevatorOpen: false }` object (`naas-app.js:1469`), which is
  why one branch spreads it and the other passes it whole. `sec-accounts` is the id on the
  Connected accounts card at `NaaS Storefront.dc.html:954`, and it is already the id the rail's own
  Accounts row scrolls to, so the target is known to work.

- [ ] **Step 3: Export the new values and drop `updatedAgo`**

  At `naas-app.js:1622`, in the `showRail, showHeader, updatedAgo, rescan, windowLabel, …` line,
  replace `updatedAgo` with `schedLine, schedTitle, cadenceValue, setCadence`. Leave `rescan` and
  everything else in place. Verify the line before editing — it is one long object literal.
  `updatedAgo` is bound in exactly one place in the markup, the button Step 4 deletes, so nothing
  else loses a value:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect && grep -c updatedAgo "NaaS Storefront.dc.html"   # 1
  ```

- [ ] **Step 3b: Delete the dead clock at `naas-app.js:42`**

  `window.__naasLoaded` had four occurrences. Step 2 deleted the reader at `:1603` and the writer at
  `:1606`, and Task 6 deletes the writer at `:1287`. That leaves `naas-app.js:42`:
  ```js
    window.__naasLoaded = window.__naasLoaded || Date.now();
  ```
  writing a value nothing reads. Delete that one line. The run record is the clock now. Then prove
  the name is gone from the app source:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  grep -rn "__naasLoaded" --include=*.js --include=*.html . | grep -v naas-design-scope
  ```
  Expected after Task 6 lands: no output. Expected here, with Task 6 still ahead: the single line
  `naas-app.js:1287`. `naas-design-scope/` is an archived nested clone — never edit it, and never
  let it into a commit.

- [ ] **Step 4: Replace the markup at `NaaS Storefront.dc.html:258-259`**

  Two buttons become a span, a cadence select and one button. The `↻ Updated …` button is gone:
  Re-discover is now the only thing that runs a scan, and it genuinely runs one.

  ```html
      <span title="{{ schedTitle }}" style="white-space:nowrap">{{ schedLine }}</span>
      <label title="{{ schedTitle }}" style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span aria-hidden="true" style="width:16px;height:16px;flex:none;background:url('{{ iconCalendar }}') center / contain no-repeat"></span><select value="{{ cadenceValue }}" onChange="{{ setCadence }}" aria-label="Discovery cadence" style="border:0;background:transparent;font:inherit;font-size:12px;font-weight:700;color:var(--link);cursor:pointer"><option value="">Mixed</option><option value="h6">Every 6 hours</option><option value="h12">Every 12 hours</option><option value="nightly">Nightly at 02:00</option><option value="weekly">Sundays at 03:00</option><option value="manual">Manual only</option></select></label>
      <button onClick="{{ rescan }}" title="Read every connected account again from scratch" style="display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border:0;border-radius:9999px;background:var(--cta);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap"><span aria-hidden="true">↻</span>Re-discover</button>
  ```

  The empty `<option value="">Mixed</option>` is how a select renders an estate whose accounts do
  not agree; `setSchedule` ignores an empty value, so picking it is a no-op rather than a lie.
  `sc-for` must not be used here — see the extra rule in Global Constraints.

- [ ] **Step 5: Count the tags this edit added and removed**

  A fixed line range is the wrong instrument here: every range in this file straddles tags that open
  inside it and close hundreds of lines later, so "opens equal closes in lines 252-266" is false
  before anyone edits anything. What must balance is the **diff**. Run:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^+' | grep -v '^+++' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  echo '--- removed ---'
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^-' | grep -v '^---' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  ```
  Expected, added minus removed, per name:

  | Tag | opens | closes |
  |---|---|---|
  | `button` | -1 | -1 |
  | `span` | +1 | +1 |
  | `label` | +1 | +1 |
  | `select` | +1 | +1 |
  | `option` | +6 | +6 |

  Every name's open delta must equal its close delta. A name whose deltas differ by one is the stray
  tag that has twice killed later screens. Stop and fix before going further.

- [ ] **Step 6: Run the test to verify nothing broke**
  Run: `npm test`
  Expected: 78 passing, 0 failing.

- [ ] **Step 7: Verify in the browser**
  At **1440x900**, on `http://localhost:8787/NaaS%20Storefront.dc.html?view=partial#s3/cloud/connect`:
  1. The title row reads `Scanned 7h ago · next at 02:00` (the exact figures depend on the wall
     clock), the cadence select shows `Nightly at 02:00`, and `Manage credentials (3)` shows a
     count for the first time.
  2. Click **Re-discover**. The line flips to `Scanning…` for about four seconds (four 750ms beats plus the tick that clears the flag), then reads
     `Scanned just now · next at 02:00`.
  3. Set the cadence select to **Every 6 hours**. The line's `next` changes to `in Nh` without a
     reload.
  4. Click **Manage credentials (3)**. The page scrolls to the Connected accounts card; it does not
     navigate to the intake screen.
  5. **Screenshot a screen below the edit** (constraint 4): scroll to the bottom of Discover and
     confirm the Paths section still renders, then open `#s3/cloud/cost` and confirm the Cost
     screen renders.
  6. Confirm the title row still fits one line at 1440 and that the page does not scroll on
     `#s3/cloud/observe`; no button sits within 10px of a card edge.
  Check **partial** (single cadence), **trust** (the select reads `Mixed`) and **empty**
  (`?view=empty` — the line reads `No accounts connected yet`, `Manage credentials` has no count,
  and clicking it still opens the front door).

- [ ] **Step 8: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-app.js "NaaS Storefront.dc.html"
  git commit -m "$(cat <<'EOF'
  title row: when it last ran, when it runs next, and the cadence in one line

  Updated just now was minutes since page load. It is now the newest run
  record, beside the next fire and the cadence that produces it. Re-discover
  writes a real record from any screen instead of setting scanStep to itself.
  Manage credentials counts the accounts it manages and scrolls to them.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 6: Surface 2 — the Accounts card

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:1285-1296` (replace the sources block)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:965-980` (the header row and the body row of the accounts table)

**Interfaces:**
- Consumes: `sched` from Task 4.
- Produces, per row in `sources`: `seen`, `nextSeen`, `cadenceValue`, `cadenceLabel`, `setCadence`, `canSchedule`, `noSchedule`, `rescan`, plus the fields the card already binds (`key`, `name`, `cred`, `scope`, `dot`, `edit`, `canRemove`). `sourcesSub` gains the cadence.

- [ ] **Step 1: Replace `naas-app.js:1285-1296`**

  `byCloud`, `rescanNow` and `scanAgo` all go. `scanAgo` was
  `['4 min ago','18 min ago','1 h ago','3 h ago'][k % 4]` — a last-scan time indexed by row
  position. The `daily refresh` copy already written into the `sub` at `:1290` and never rendered
  becomes the real cadence.

  ```js
    // Sources (Micah, 14:33: "where can I connect to my current ecosystem?"): what feeds the
    // picture, and the door to add more. The cloud rows are a read of est.accounts through
    // scheduleView; the AT&T rows are inventory AT&T keeps live, not a credential the customer
    // schedules, so they carry no cadence control.
    const acctRow = (a) => ({
      key: 'src:' + a.id, name: a.name, kind: a.cloud, cred: a.cred, scope: a.scope,
      seen: SCH.agoLabel(a.lastRun, sched.nowMs),
      nextSeen: SCH.nextLabel(a.schedule, a.nextRun, sched.nowMs),
      cadenceValue: SCH.scheduleId(a.schedule), cadenceLabel: SCH.scheduleLabel(a.schedule),
      setCadence: sched.setSchedule([a.id]), canSchedule: true, noSchedule: false,
      sub: `${a.scope} · ${SCH.scheduleLabel(a.schedule).toLowerCase()}`,
      state: 'Connected', dot: 'var(--success)', rescan: sched.runNow([a.id], 'manual'),
    });
    const attRow = (key, name, scope, sub) => ({
      key, name, kind: 'AT&T', cred: 'AT&T inventory', scope, seen: 'live', nextSeen: 'continuous',
      cadenceValue: '', cadenceLabel: 'AT&T inventory', setCadence: () => {},
      canSchedule: false, noSchedule: true, sub, state: 'Connected', dot: 'var(--success)',
      rescan: sched.runNow(sched.accounts.map(a => a.id), 'manual'),
    });
    const connWord = conns.total === 1 ? 'connection' : 'connections';
    const siteN = (est0.sitesCount || est0.sites.length).toLocaleString('en-US');
    const rawSources = [
      ...sched.accounts.map(acctRow),
      ...(conns.total ? [attRow('src:netbond', 'NetBond inventory', `${conns.total} ${connWord}`, `${conns.total} ${connWord} · live`)] : []),
      ...(est0.sites.length ? [attRow('src:sites', 'AVPN and access sites', `${siteN} sites`, `${siteN} sites · from AT&T inventory`)] : []),
      ...((s.addedSources || []).map((k, i) => ({
        key: 'src:new' + i, name: k, kind: k, cred: 'Pending', scope: 'Read-only, all regions',
        seen: 'never', nextSeen: 'at the next scan', cadenceValue: '', cadenceLabel: 'Pending',
        setCadence: () => {}, canSchedule: false, noSchedule: true,
        sub: 'added · queued for the next scan', state: 'Scanning', dot: 'var(--warning)',
        rescan: sched.runNow(sched.accounts.map(a => a.id), 'manual'),
      }))),
    ];
    const sources = rawSources.map(r => ({ ...r,
      edit: () => set({ addSourceOpen: true, addSourceKind: r.kind }),
      remove: () => set({ addedSources: (s.addedSources || []).filter(x => 'src:new' + (s.addedSources || []).indexOf(x) !== r.key) }),
      canRemove: r.key.startsWith('src:new') }));
    const credScanned = sources.filter(x => x.state === 'Connected').length;
  ```

  Then in the `obX` literal at `naas-app.js:1298`, change `sourcesSub` from
  ``` `${credScanned} of ${sources.length} credentials scanning · everything above is drawn from these` ```
  to
  ```js
  sourcesSub: `${credScanned} of ${sources.length} credentials scanning · ${sched.cadence.empty ? 'nothing on a schedule yet' : sched.cadence.label.toLowerCase()} · everything above is drawn from these`,
  ```

- [ ] **Step 2: Add the two header cells at `NaaS Storefront.dc.html:966-970`**

  Replace the five `dt-th` cells with seven, re-proportioned to sum to 100%. Keep the shared style
  string verbatim on each new cell:

  ```html
            <div class="dt-c dt-th" style="width:22%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Account</div>
            <div class="dt-c dt-th" style="width:14%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Credential</div>
            <div class="dt-c dt-th" style="width:15%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Scope</div>
            <div class="dt-c dt-th" style="width:11%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Last scan</div>
            <div class="dt-c dt-th" style="width:11%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Next scan</div>
            <div class="dt-c dt-th" style="width:15%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Cadence</div>
            <div class="dt-c dt-th" style="width:12%;text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--text-disabled)">Manage</div>
  ```

- [ ] **Step 3: Add the two body cells between `NaaS Storefront.dc.html:977` and `:978`**

  Insert after the `{{ sr.seen }}` cell and before the Manage cell:

  ```html
              <div class="dt-c" style="padding:8px 10px;vertical-align:middle;color:var(--text-light);white-space:nowrap">{{ sr.nextSeen }}</div>
              <div class="dt-c" style="padding:8px 10px;vertical-align:middle">
                <sc-if value="{{ sr.canSchedule }}" hint-placeholder-val="{{ true }}"><select value="{{ sr.cadenceValue }}" onChange="{{ sr.setCadence }}" aria-label="Cadence" style="max-width:100%;height:26px;padding:0 4px;border:1px solid var(--border-secondary);border-radius:6px;background:var(--bg-base);color:var(--text-heading);font:inherit;font-size:12px;cursor:pointer"><option value="h6">Every 6 hours</option><option value="h12">Every 12 hours</option><option value="nightly">Nightly at 02:00</option><option value="weekly">Sundays at 03:00</option><option value="manual">Manual only</option></select></sc-if>
                <sc-if value="{{ sr.noSchedule }}" hint-placeholder-val="{{ false }}"><span style="color:var(--text-light)">{{ sr.cadenceLabel }}</span></sc-if>
              </div>
  ```

  No `"Mixed"` option here: a single account always matches one of the five choices, and Task 2's
  test asserts that every seeded cadence does.

- [ ] **Step 4: Count the tags this edit added and removed**

  Same instrument as Task 5, and for the same reason: lines 954-990 hold 27 opening `<div>`s and 23
  closing ones even in the untouched file, because the card closes below 990. The diff is what must
  balance. Run:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^+' | grep -v '^+++' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  echo '--- removed ---'
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^-' | grep -v '^---' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  ```
  Expected, added minus removed, per name:

  | Tag | opens | closes |
  |---|---|---|
  | `div` | +4 | +4 |
  | `sc-if` | +2 | +2 |
  | `select` | +1 | +1 |
  | `option` | +5 | +5 |
  | `span` | +1 | +1 |

  (Two header cells and two body cells is four `div`s; the cadence cell holds the two `sc-if`s, the
  five-option select and the fallback `span`.) Every name's open delta must equal its close delta.

- [ ] **Step 5: Run the test to verify nothing broke**
  Run: `npm test`
  Expected: 78 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**
  On `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect`, scroll to
  **Connected accounts**:
  1. Seven columns. The three cloud rows show a real Last scan, a Next scan and a cadence select;
     the two AT&T rows show `live` / `continuous` / `AT&T inventory` with no select.
  2. The GCP row's cadence reads **Manual only**, its Next scan reads **on demand**, and its Last
     scan reads about **2d ago**.
  3. Change the AWS row's cadence to **Every 6 hours**. Its Next scan changes at once; the other
     rows do not move; the title row's cadence select flips to **Mixed** if it was not already.
  4. Click **Re-scan** on the Azure row. That row's Last scan flips to `just now`; the AWS row does
     not.
  5. The card sub-line now names the cadence.
  6. **Screenshot a screen below the edit** (constraint 4): scroll down past Not connected yet to
     the Paths section and confirm both still render, then open `#s3/cloud/observe` and confirm the
     flow map renders.
  Check **partial** (three cloud rows, all nightly), **mature** (four cloud rows, one weekly),
  **trust** (one manual) and **empty** (no Accounts card at all — the intake form instead).

- [ ] **Step 7: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-app.js "NaaS Storefront.dc.html"
  git commit -m "$(cat <<'EOF'
  accounts: a next scan column and a cadence a customer can change

  Last scan was an array indexed by row position. It is now the newest run
  that covered the account, beside the next fire of its own cadence and a
  select that sets it. The daily refresh copy written into the sub at
  naas-app.js:1290 and never rendered is now the cadence, and it is true.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 7: Surface 3 — the rail Accounts row

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:1567` (a `railSub` map above `railGroups`), `:1572-1577` (`row` takes a sub), `:1595` (the call site passes it)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:239` (the rail button's fixed height)

**Interfaces:**
- Consumes: `nextWord`, `sched` from Task 5's Step 1 hoist.
- Produces: `railGroups[n].items[m].sub` / `.hasSub` populated for `sec-accounts`. No new markup —
  `item()` at `naas-app.js:1518` already takes `sub` as its sixth argument and the rail button at
  `html:239` already renders `r.sub` behind an `sc-if` on `r.hasSub`. Nothing has ever passed one,
  so the button's `height:28px` has never had to hold two lines.

- [ ] **Step 1: Add the sub map above `railGroups`**

  Insert immediately before `naas-app.js:1567` (`const railGroups = (() => {`):
  ```js
    // The rail carries the cadence with no new markup: item() already takes a sub.
    const railSub = { 'sec-accounts': sched.cadence.empty ? '' : `Next scan ${nextWord}` };
  ```

- [ ] **Step 2: Let `row` take a sub**

  Replace `naas-app.js:1572-1577`:
  ```js
          const row = (tab, id, label, ic, sub) => {
            const isNav = id.startsWith('@');
            const cur = isNav ? s.screen === 's1' : (onS3('cloud', tab) && activeSec === id);
            // A section sits one step in from the category that owns it.
            return { ...item(label, ic, isNav ? go('s1') : () => { go('s3', { layer: 'cloud', tab })(); set({ scrollToSec: id, scrollNonce: (s.scrollNonce || 0) + 1 }); }, cur, false, sub), pad: railCollapsed ? '4px 0' : '4px 8px 4px 24px' };
          };
  ```

  And at `naas-app.js:1595`:
  ```js
                items: (SECTIONS[tab] || []).map(([id, label, ic]) => row(tab, id, label, ic, railSub[id] || '')),
  ```

- [ ] **Step 3: Let the rail button grow to two lines**

  In `NaaS Storefront.dc.html:239`, the rail row button is `height:28px` with `overflow:hidden`, so
  a sub would be clipped. Change that one declaration on that one button:
  - from: `style="width:100%;height:28px;box-sizing:border-box;padding:{{ r.pad }};`
  - to:   `style="width:100%;min-height:28px;box-sizing:border-box;padding:{{ r.pad }};`

  Nothing else on the line changes, and no tag is added or removed.

- [ ] **Step 4: Count the tags this edit added and removed**

  Run:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^[+-]' | grep -v '^\(+++\|---\)' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  ```
  Expected: every name appears an **even** number of times — once on the removed line and once on
  the added line, for each tag on that button. This edit changes one CSS declaration and no tag at
  all, so the added and removed lines must carry exactly the same tags. An odd count is a tag that
  went missing in the retype.

  As a second, independent check that the rail region is still well-formed (it is balanced today,
  unlike the ranges in Tasks 5, 6 and 9):
  ```bash
  sed -n '233,246p' "NaaS Storefront.dc.html" | grep -o '<\(sc-if\|sc-for\|div\|span\|button\)\b' | sort | uniq -c
  sed -n '233,246p' "NaaS Storefront.dc.html" | grep -o '</\(sc-if\|sc-for\|div\|span\|button\)\b' | sort | uniq -c
  ```
  Expected, unchanged from before the edit: `button` 3/3, `div` 2/2, `sc-for` 3/3, `sc-if` 8/8,
  `span` 6/6.

- [ ] **Step 5: Run the test to verify nothing broke**
  Run: `npm test`
  Expected: 78 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**
  On `http://localhost:8787/NaaS%20Storefront.dc.html?view=mature#s3/cloud/connect`:
  1. The rail's **Discover → Accounts** row carries a second line reading `Next scan at 02:00`
     (or `in Nh`, depending on the soonest cadence).
  2. The other rail rows are unchanged and the rows below Accounts have not shifted into each
     other; nothing is clipped.
  3. Collapse the rail with the `‹` button: the sub disappears with the label, the icons stay on one
     row, and expanding brings it back.
  4. Change the title row's cadence to **Every 6 hours**; the rail sub follows without a reload.
  5. **Screenshot a screen below the edit** (constraint 4): the rail is above everything, so confirm
     Discover, `#s3/cloud/observe` and `#s3/cloud/cost` all still render, and that Observe still
     fits 1440x900 with no page scroll.
  Check **mature**, **trust** and **empty** (on empty the sub is blank and the row keeps its old
  height).

- [ ] **Step 7: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-app.js "NaaS Storefront.dc.html"
  git commit -m "$(cat <<'EOF'
  rail: the next scan rides on the Accounts row

  item() has always taken a sub and the rail button has always rendered one
  behind an sc-if. Nothing had ever passed one, so the button's fixed height
  had never had to hold two lines. One argument, one min-height, and the
  cadence is in the persistent navigation.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 8: Run history in the user-activity log

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:830` (replace the single hardcoded re-discovery row)

**Interfaces:**
- Consumes: `sched` (Task 4), `SCH.clockLabel` (Task 1).
- Produces: nothing new — `actAll` already feeds `actRows` at `naas-app.js:838` and the Logs card's
  User activity tab already renders them. Zero new markup.

- [ ] **Step 1: Replace `naas-app.js:830`**

  The line today is one invented row:
  ```js
      push(4, 'svc-terraform', 'Ran re-discovery', 'Whole estate', `${[...new Set((est.regionsList || []).map(r => r.cloud))].length} accounts, ${(est.regionsList || []).length} regions scanned`, true);
  ```
  Replace it with the real history. `push(mins, who, verb, target, detail, ok)` is the existing
  signature and `mins` is minutes ago, which is what `actAll`'s sort and the `ago()` helper at
  `naas-app.js:835` expect:
  ```js
      (sched.runs || []).forEach(r => {
        const mins = Math.max(0, Math.round((sched.nowMs - r.at) / 60000));
        const how = r.trigger === 'manual' ? 'on demand' : `on schedule at ${SCH.clockLabel(r.at)}`;
        push(mins, r.trigger === 'manual' ? WHO[0] : 'svc-terraform', 'Ran re-discovery',
          r.accounts === 1 ? 'One account' : 'Whole estate',
          `${r.accounts} ${r.accounts === 1 ? 'account' : 'accounts'}, ${r.regions} regions, ${r.sites.toLocaleString('en-US')} sites · ${how}`, r.ok);
      });
  ```

- [ ] **Step 2: Run the test to verify nothing broke**
  Run: `npm test`
  Expected: 78 passing, 0 failing.

- [ ] **Step 3: Verify in the browser**
  On `http://localhost:8787/NaaS%20Storefront.dc.html?view=partial#s3/cloud/observe`, scroll to
  **Logs** and open the **User activity** tab:
  1. Three `Ran re-discovery` rows, the newest reading `on schedule at 02:00` from earlier today,
     then one from the night before, then the night before that — spaced roughly 24h apart in the
     `when` column.
  2. The tab label's count has gone up by two from its previous value.
  3. Go back to Discover, press **Re-discover**, return to Logs → User activity: a fourth row is at
     the top, `just now`, by `m.boswell`, reading `on demand`.
  4. On `?view=trust`, the rows are spaced by the mixed cadences (a 12-hour account produces a row
     at 00:00 and 12:00) rather than all at 02:00.
  Check **partial**, **trust** and **mature**.

- [ ] **Step 4: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-app.js
  git commit -m "$(cat <<'EOF'
  logs: the activity table shows the scans that actually ran

  One invented row four minutes old becomes the seeded history plus anything
  this session ran, each one naming the clock time it fired at and whether it
  was on schedule or on demand. Zero new markup: the row shape at
  naas-app.js:830 was already right.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 9: Set the cadence at intake

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:339` (insert the cadence values after the `scanDone` line), `:410` (the intake Scan button raises the ask), `:441` (bind the values)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:503`, `:511`, `:538` (three hardcoded promises), and a new block after `:581` (the end-of-scan ask on S1)

**Interfaces:**
- Consumes: `sched` (Task 4), `SCH.scheduleById`, `SCH.scheduleLabel`.
- Produces, bound in the markup: `intakeCadence`, `setIntakeCadence`, `intakeCadenceLabel`,
  `intakeCadenceLower`, `cadenceAsk`, `cadenceAskText`, `confirmCadence`. New state keys
  `s.intakeCadence` (a SCHEDULE_CHOICES id) and `s.cadenceAsk` (boolean).

- [ ] **Step 1: Add the cadence values beside `scanSteps`**

  Insert after `naas-app.js:339` (the `const scanDone = …` line):
  ```js
    // The app promised "refreshed daily" three times during onboarding and then
    // never mentioned it again. The promise is now a choice, made where the scan
    // ends, and the three intake strings read it back.
    const intakeCadence = s.intakeCadence || 'nightly';
    const intakeSch = SCH.scheduleById(intakeCadence) || SCH.scheduleById('nightly');
    const intakeCadenceLabel = SCH.scheduleLabel(intakeSch);
    const intakeCadenceLower = intakeCadenceLabel.toLowerCase();
    const cadenceAsk = !!s.cadenceAsk && s.scanStep >= 4;
    const cadenceAskText = `Discovery runs ${intakeCadenceLower} from now on, read-only, with no change to routing. Change it here, or later from the Accounts card.`;
    const setIntakeCadence = (e) => set({ intakeCadence: e.target.value });
    const confirmCadence = () => {
      const map = {};
      sched.accounts.forEach(a => { map[a.id] = intakeSch; });
      set({ acctSched: { est: est.id, map }, cadenceAsk: false });
    };
  ```

- [ ] **Step 2: Raise the ask from the intake Scan button**

  In `naas-app.js:410`, the intake handler is
  `startScan: () => { set({ view: 'partial', screen: 's1', scanStep: 0 }); startScan(c); syncHash('s1'); },`.
  Change the `set` call to `set({ view: 'partial', screen: 's1', scanStep: 0, cadenceAsk: true });`.
  Everything else on that long line stays. Verify the line before editing.

- [ ] **Step 3: Bind the values**

  In the returned object at `naas-app.js:441` (the line beginning
  `allRegions: est.regionsList, scanSteps, scanLine: …`), add after `scanning: s.scanStep < 4,`:
  ```js
  intakeCadence, setIntakeCadence, intakeCadenceLabel, intakeCadenceLower, cadenceAsk, cadenceAskText, confirmCadence,
  ```

- [ ] **Step 4: Make the three intake promises read the choice**

  Three one-phrase swaps in `NaaS Storefront.dc.html`, no tags added or removed:
  - `:503` `>Read-only. Refreshed daily. No change to routing.<` → `>Read-only. {{ intakeCadenceLabel }}. No change to routing.<`
  - `:511` `>Provider, auth type, read-only scope, daily refresh<` → `>Provider, auth type, read-only scope, {{ intakeCadenceLower }}<`
  - `:538` `>Read-only, refreshed daily, no change to routing.<` → `>Read-only, {{ intakeCadenceLower }}, no change to routing.<`

- [ ] **Step 5: Ask at the end of the scan**

  Insert a new block in `NaaS Storefront.dc.html` immediately after the `</sc-if>` that closes the
  scanning skeleton (line `:581`) and before the `<sc-if value="{{ scanDone }}"` at `:582`. It
  reuses the `fx-alert` shape that already ships five lines below it, so the classes are known-good:

  ```html
    <sc-if value="{{ cadenceAsk }}" hint-placeholder-val="{{ false }}">
    <div class="fx-alert" role="status" aria-label="Keep it current" style="animation:fadeIn .3s">
      <div class="fx-alert-body"><span class="fx-alert-icon" aria-hidden="true"></span><div style="display:grid;gap:2px;min-width:0"><div class="fx-alert-title">Keep it current</div><div class="fx-alert-text">{{ cadenceAskText }}</div></div></div>
      <label class="fx-filter"><span class="fx-label">Cadence</span><select class="fx-select" value="{{ intakeCadence }}" onChange="{{ setIntakeCadence }}" aria-label="Discovery cadence"><option value="h6">Every 6 hours</option><option value="h12">Every 12 hours</option><option value="nightly">Nightly at 02:00</option><option value="weekly">Sundays at 03:00</option><option value="manual">Manual only</option></select></label>
      <button class="fx-btn" onClick="{{ confirmCadence }}">Keep this cadence</button>
    </div>
    </sc-if>
  ```

- [ ] **Step 6: Count the tags this edit added and removed**

  Do not count a line range here. Both intake ranges are unbalanced in the untouched file — lines
  498-545 hold 13 opening `<div>`s against 12 closing ones and 3 `<sc-if>`s against 2, and 575-600
  hold 28 against 25 and 6 against 4 — because the blocks close below the range. The diff is what
  must balance. Run:
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^+' | grep -v '^+++' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  echo '--- removed ---'
  git diff -U0 -- "NaaS Storefront.dc.html" | grep '^-' | grep -v '^---' | grep -o '</\?[a-z][a-z0-9-]*' | sort | uniq -c
  ```
  Step 4's three copy swaps add and remove no tags, so their added and removed lines cancel exactly.
  The whole delta belongs to Step 5's new block. Expected, added minus removed, per name:

  | Tag | opens | closes |
  |---|---|---|
  | `sc-if` | +1 | +1 |
  | `div` | +5 | +5 |
  | `span` | +2 | +2 |
  | `label` | +1 | +1 |
  | `select` | +1 | +1 |
  | `option` | +5 | +5 |
  | `button` | +1 | +1 |

  Every name's open delta must equal its close delta.

- [ ] **Step 7: Run the test to verify nothing broke**
  Run: `npm test`
  Expected: 78 passing, 0 failing.

- [ ] **Step 8: Verify in the browser**
  Walk the whole onboarding flow as a customer, from scratch:
  1. Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=empty`. The intake form's three
     promises now read `Nightly at 02:00` / `nightly at 02:00`, not `Refreshed daily`.
  2. Type an organization name and press **Scan**. The scan runs its four beats.
  3. When it finishes, the **Keep it current** card is there, above the discovered estate, with the
     cadence select set to `Nightly at 02:00`.
  4. Change it to **Every 6 hours**: the card's text changes to say so.
  5. Press **Keep this cadence**. The card disappears.
  6. Go to Discover (`#s3/cloud/connect`): the title row's cadence select reads **Every 6 hours**,
     the rail's Accounts sub reads `Next scan in Nh`, and every row in the Connected accounts card
     carries the same cadence. The choice made at intake reached all three surfaces.
  7. **Screenshot a screen below the edit** (constraint 4): scroll to the bottom of Explore 360 and
     confirm the inventory tree renders, then confirm `#s3/cloud/observe` and `#s3/cloud/cost`
     render.
  Check **empty** (the whole flow above) and **mature** (open Explore 360 directly from the rail:
  no cadence card, because the ask only fires from intake).

- [ ] **Step 9: Commit**
  ```bash
  cd /Users/micahbos/Developer/cloud-connect
  git add naas-app.js "NaaS Storefront.dc.html"
  git commit -m "$(cat <<'EOF'
  intake: the scan ends by asking how often to run it again

  Refreshed daily was written into the onboarding form three times and was
  never true of anything. It is now a choice made where the first scan ends,
  and the three promises read it back. The choice lands on every account, so
  the title row, the rail and the Accounts card all carry it before the
  customer has seen the estate twice.

  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  EOF
  )"
  ```

---

## What this wave deliberately does not do

- It does not touch `s.obWindow`. That key already carries two meanings — the `isNew` discovery
  window at `naas-app.js:690` and the "vs prior 30d" observation window at `naas-round2.js:103-107`
  — and is bound to two selects with two different labels, `Date range` in the header and
  `Discovery window` on Explore 360. Wave 4 adds no third meaning; splitting the two it already has
  is separate work.
- It does not persist the cadence or the run history across a reload. `s.acctSched` and `s.scanRuns`
  live in React state, keyed by estate; a reload re-seeds the history from the cadences, which is
  the honest behaviour for a prototype with no backend.
- It does not render the change story on Discover. That is wave 5, and it depends on the real
  `lastRun` this wave introduces.

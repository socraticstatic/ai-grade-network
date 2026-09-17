# Wave 5 - The Change Story on Discover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox syntax for tracking.

**Goal:** Discover answers "what changed since the last discovery run" with a block that reads the wave 4 run record, and every object's Detail overlay carries its own dated history.

**Architecture:** One new pure module, `naas-changes.js`, owns the whole change story: it flattens the estate into a population of objects that carry a `since`, reads wave 4's `est.accounts[].lastRun` / `schedule` into a run history, computes the delta between the last two runs, and builds one object's history rows. `naas-app.js` calls it once per render and binds the computed strings; `naas-observe-dash.js` attaches the history to the site, VPC and workload panels. The same module also splits the one window accessor that served two meanings into two named readers, so `s.obWindow` is the observation window and `s.discWindow` is the discovery lookback, whose default is not a period at all but the last run.

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

---

## How to read the line numbers

Every line number below is a line in the tree as it stands at `HEAD` **before Task 1**, unless a step says otherwise. Two rules keep them true:

1. **Inside a task, edit from the bottom of the file upward.** Do the highest-numbered edit first. Then an earlier edit can never move a later edit's line number, and every number in the task stays the one written here.
2. **Between tasks, the plan states the shift.** Only three tasks move lines in a file another task edits, and each of the three is named where it lands:

| After | `naas-app.js` | `NaaS Storefront.dc.html` | `naas-observe-dash.js` |
|---|---|---|---|
| Task 3 | **+2** below line 689 (one import added, the three `WIN` lines deleted, line 689 becomes five) | unchanged: line 588 is replaced one-for-one, 262 and 586 change an attribute | untouched |
| Task 4 | **+11** below line 1364 | **+18** below line 953 | untouched |
| Task 6 | - | - | **+1** below line 13 |

So Task 4's `naas-app.js:1362` is at **1364** when Task 4 runs, and Task 6's `:1121` and `:1124` are at **1123** and **1126**, because Task 4's own insert is below them. Every step that needs a shifted number prints both.

Where a number could still be stale, the step names a `grep` or `sed` that finds the line by its text. Match on the text. A wrong line number wastes the whole task.

---

## Which verbs survived, and why

The spec asked for four verbs and the project has a standing rule (`docs/HANDOFF.md`, "What is real and what is mock") that a derivation must be honest about what the data can say. Shadow SaaS and new-destination insights were deleted under that rule. Applying it here:

| Verb | Verdict | Why |
|---|---|---|
| **NEW** | **KEPT** | Every site (`naas-sites.js:70`, `:105`), every VPC (`naas-addendum.js:97`) and every workload (`naas-addendum.js:80`) carries a seeded `since`, the days elapsed since discovery. An object whose `since` is smaller than the age of the previous run was first reported by the last run. That is a real interval test over real fields. |
| **GONE** | **DROPPED** | The estates in `naas-data.js` hold only objects that exist now. No tombstone, no `removedOn`, no per-run inventory snapshot. A GONE count could only be fabricated, and the run-over-run counts would be identical because both runs read the same estate. |
| **MOVED** | **DROPPED** | No object carries a previous parent. `siteRow` mints `metro` at generation time and `inventory` mints `region` at generation time. A move is not representable in this data. |
| **DRIFT** | **DROPPED as a verb** | Drift needs a prior value of a property. Nothing in the estate stores one. Its useful half survives as a *standing statement* attached to the NEW rows: how many of the arrivals reach the internet directly. That is a fact about now, computed from `exposed` / `priv`, not a claim about change. |

So the block carries **one verb, NEW**, in four shapes: `never` (no account has ever been read, or the accounts hold nothing), `first` (one run, everything is new, rendered as a sentence and zero rows), `none` (the last run found the same estate), and `some` (a capped sample plus a count).

## Dependency on wave 4

This plan consumes exactly two things from wave 4 and nothing else:

```js
est.accounts = [{ id, cloud, cred, scope, schedule, lastRun, nextRun }]
```

- `schedule` is one of `hourly` / `6h` / `daily` / `weekly` / `monthly` (case-insensitive; anything else is read as daily).
- `lastRun` and `nextRun` are epoch milliseconds, a `Date`, or an ISO string. All three are accepted.

Wave 5 does **not** require a `runs` array. It derives the number of runs so far from the cadence and from the age of the oldest object discovery knows about, which is a real field. If `est.accounts` is missing or empty the block renders its `never` shape, which is correct and not a failure. Every test in this plan hands `runsOf` its accounts directly, so the tests do not depend on wave 4's seeded values.

---

## File Structure

| File | Its one responsibility |
|---|---|
| `naas-changes.js` (create) | The change story as pure data: the object population, the run history, the delta, one object's history, and the two window readers. |
| `tests/changes.test.mjs` (create) | Proves the delta against two run records, the empty delta, the first run, and the window split. |
| `naas-app.js` (modify) | Calls `naas-changes.js` once per render, feeds `isNew` from the run cut instead of a UI window, and binds the computed strings. |
| `naas-observe-dash.js` (modify) | Attaches the history rows to the site, VPC and workload panels. |
| `NaaS Storefront.dc.html` (modify) | The "what changed" card on Discover, the HISTORY group in the Detail overlay, and the two window selects. |
| `docs/HANDOFF.md` (modify) | Records which verbs survived and why, beside the Shadow SaaS ruling it follows. |

---

### Task 1: The object population and the run history

**Files:**
- Create: `/Users/micahbos/Developer/cloud-connect/naas-changes.js`
- Create: `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs`
- Test: `tests/changes.test.mjs`

**Interfaces:**
- Consumes: `S.siteTree(est)`, `S.metroSites(metroNode)` from `naas-sites.js`; `A.inventory(est)` from `naas-addendum.js`; wave 4's `est.accounts`.
- Produces:
  - `population(est, inv) -> { sites: Obj[], vpcs: Obj[], workloads: Obj[] }` where `Obj = { kind: 'site'|'vpc'|'workload', id: string, name: string, since: number, priv: boolean, exposed: boolean, via: string, where: string }`
  - `runsOf(est, pop, nowMs) -> { ran: boolean, first: boolean, last: number|null, prev: number|null, next: number|null, cutDays: number, cadenceDays: number, runCount: number }`
  - `agoLabel(ms, nowMs) -> string`, `clock(ms) -> string`, `stamp(ms) -> string`, `kindLabel(kind) -> string`
  - module-scope `DAY`, `NOUN`, `CADENCE_DAYS`, `MONTH`, which Tasks 2, 3 and 5 append beside rather than redeclare

- [ ] **Step 1: Write the failing test.** Create `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { population, runsOf, agoLabel } from '../naas-changes.js';

const DAY = 86400000;
const HOUR = 3600000;
const NOW = Date.UTC(2026, 8, 17, 9, 0, 0);
const trust = D.ESTATES.trust;
const tinv = A.inventory(trust);
const withAccounts = (est, accounts) => ({ ...est, accounts });

test('the population is every object discovery can date, and the run history reads wave 4 accounts', () => {
  const est = withAccounts(trust, [
    { id: 'a1', cloud: 'AWS', cred: 'Cross-account role', scope: 'Read-only', schedule: 'daily', lastRun: NOW - 12 * HOUR, nextRun: NOW + 12 * HOUR },
    { id: 'a2', cloud: 'Azure', cred: 'Service principal', scope: 'Read-only', schedule: 'daily', lastRun: NOW - 3 * HOUR, nextRun: NOW + 21 * HOUR },
  ]);
  const pop = population(est, tinv);
  assert.equal(pop.sites.length, 4120);
  assert.equal(pop.vpcs.length, 18);
  assert.equal(pop.workloads.length, 2681);
  assert.ok(pop.sites.every(x => typeof x.since === 'number' && x.id && x.where));
  assert.ok(pop.workloads.some(x => x.exposed === true));

  const runs = runsOf(est, pop, NOW);
  assert.equal(runs.ran, true);
  assert.equal(runs.first, false);
  assert.equal(runs.last, NOW - 3 * HOUR);
  assert.equal(runs.next, NOW + 12 * HOUR);
  assert.equal(runs.cadenceDays, 1);
  assert.equal(runs.prev, NOW - 3 * HOUR - DAY);
  assert.ok(runs.cutDays > 1 && runs.cutDays < 1.2);
  assert.ok(runs.runCount > 100);
  assert.equal(agoLabel(runs.last, NOW), '3 h ago');
});

test('one run is a first run, and an estate with no account has never been read', () => {
  const never = runsOf({ ...trust, accounts: [] }, { sites: [], vpcs: [], workloads: [] }, NOW);
  assert.equal(never.ran, false);
  assert.equal(never.first, true);
  assert.equal(never.prev, null);
  assert.equal(never.cutDays, 0);
  assert.equal(agoLabel(never.last, NOW), 'never');

  const est = withAccounts(trust, [{ id: 'a1', cloud: 'AWS', schedule: 'daily', lastRun: NOW - HOUR, nextRun: NOW + 23 * HOUR }]);
  const young = runsOf(est, { sites: [{ since: 0 }, { since: 0 }], vpcs: [], workloads: [] }, NOW);
  assert.equal(young.ran, true);
  assert.equal(young.first, true);
  assert.equal(young.runCount, 1);
  assert.equal(young.prev, null);
  assert.equal(young.cutDays, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`   Expected: FAIL with `Cannot find module '/Users/micahbos/Developer/cloud-connect/naas-changes.js'`.

- [ ] **Step 3: Create `/Users/micahbos/Developer/cloud-connect/naas-changes.js`** with the header, the population and the run history:

```js
/*
 * AT&T AI-grade Network - NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-changes.js - the change story. What the last discovery run found, one
// object's history, and the two windows that used to share a state key.
// Pure data. Added 2026-09-17 (wave 5).
//
// Honest about what the data can say. Every object carries a seeded `since`,
// the days elapsed since discovery, so NEW is computable. Nothing carries a
// removal date, a previous parent or a previous value, so GONE, MOVED and
// DRIFT are not. See docs/HANDOFF.md, "What is real and what is mock".
import * as S from './naas-sites.js';

const DAY = 86400000;
const CADENCE_DAYS = { hourly: 1 / 24, '6h': 0.25, daily: 1, weekly: 7, monthly: 30 };
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOUN = { site: ['site', 'sites'], vpc: ['VPC', 'VPCs'], workload: ['workload', 'workloads'] };

/** Epoch ms from whatever wave 4 stored: a number, a Date, or an ISO string. */
function at(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

export function kindLabel(kind) { return NOUN[kind] ? NOUN[kind][0] : kind; }

/** "4 min ago" for a run stamp, in the grammar the accounts card already uses. */
export function agoLabel(ms, nowMs) {
  if (ms == null) return 'never';
  const m = Math.max(0, Math.round(((nowMs || Date.now()) - ms) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

/** "02:00" for the next scheduled run. */
export function clock(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "17 Sep 2026" for a dated history row. */
export function stamp(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

// The sites half is the expensive one: on ?view=trust it generates all 4,120
// remote sites the drawer already lists. It depends only on the estate, and an
// estate's sites never change inside a session, so one entry of cache is
// enough and it is keyed on the estate.
const SITE_CACHE = { key: null, rows: null };

/**
 * Every object discovery can date, flattened and normalised to one shape.
 * Sites come from the full generated population, the same list the volume
 * drawer pages through, not from the six-site sample on the canvas.
 */
export function population(est, inv) {
  const e = est || { id: 'none', sites: [] };
  const key = `${e.id || 'none'}:${(e.sites || []).length}`;
  let sites = SITE_CACHE.key === key ? SITE_CACHE.rows : null;
  if (!sites) {
    sites = [];
    S.siteTree(e).forEach(cl => cl.children.forEach(ch => {
      if (ch.kind === 'metro') {
        S.metroSites(ch).forEach(x => sites.push({
          kind: 'site', id: x.id, name: x.name, since: x.since, priv: !!x.priv, exposed: !x.priv,
          via: ch.access || '', where: `${cl.label} · ${ch.name}`,
        }));
      } else {
        sites.push({
          kind: 'site', id: ch.id, name: ch.name, since: ch.since, priv: !!ch.priv, exposed: !ch.priv,
          via: ch.access || '', where: `${cl.label} · ${ch.metro}`,
        });
      }
    }));
    SITE_CACHE.key = key;
    SITE_CACHE.rows = sites;
  }
  const vpcs = [], workloads = [];
  (inv || []).forEach(cl => cl.regions.forEach(r => (r.vpcs || []).forEach(v => {
    vpcs.push({
      kind: 'vpc', id: v.id, name: v.name, since: v.since, priv: !!v.priv, exposed: !v.priv,
      via: r.ramp || '', where: `${cl.name} ${r.region}`,
    });
    (v.subnets || []).forEach(sn => (sn.workloads || []).forEach(w => workloads.push({
      kind: 'workload', id: w.id, name: w.name, since: w.since, priv: !w.exposed, exposed: !!w.exposed,
      via: r.ramp || '', where: `${r.region} · ${v.name}`,
    })));
  })));
  return { sites, vpcs, workloads };
}

/** The oldest thing discovery knows about. That day is the day it first ran. */
function oldestDays(pop) {
  let max = 0;
  const scan = (arr) => (arr || []).forEach(x => { if (typeof x.since === 'number' && x.since > max) max = x.since; });
  scan(pop.sites); scan(pop.vpcs); scan(pop.workloads);
  return max;
}

/**
 * The run history, from wave 4's accounts. `last` is the newest scan across
 * every account, `next` the soonest one due, and the cadence the tightest
 * schedule any account is on. How many runs there have been is not stored
 * anywhere, so it is derived: the estate's oldest object dates the first run,
 * and the cadence fills in the gap.
 */
export function runsOf(est, pop, nowMs) {
  const now = nowMs || Date.now();
  const accts = (est && est.accounts) || [];
  const stamps = accts.map(a => at(a.lastRun)).filter(t => t != null);
  if (!stamps.length) {
    return { ran: false, first: true, last: null, prev: null, next: null, cutDays: 0, cadenceDays: 0, runCount: 0 };
  }
  const last = Math.max(...stamps);
  const nexts = accts.map(a => at(a.nextRun)).filter(t => t != null);
  const next = nexts.length ? Math.min(...nexts) : null;
  const cadenceDays = Math.min(...accts.map(a => CADENCE_DAYS[String(a.schedule || 'daily').toLowerCase()] || 1));
  const ageDays = Math.max(0, (now - last) / DAY);
  const spanDays = Math.max(0, oldestDays(pop) - ageDays);
  const runCount = 1 + Math.floor(spanDays / cadenceDays);
  const first = runCount <= 1;
  const prev = first ? null : last - cadenceDays * DAY;
  const cutDays = first ? 0 : Math.max(0, (now - prev) / DAY);
  return { ran: true, first, last, prev, next, cutDays, cadenceDays, runCount };
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: `tests 58`, `pass 58`, `fail 0`.

- [ ] **Step 5: Verify in the browser.** Nothing renders yet, so verify the module loads without breaking the app. Serve with `npx http-server . -p 8787 -c-1` if nothing is on 8787 already, open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect`, and confirm the red render-error banner at the top left is absent and the Connected accounts card still lists its rows. Also confirm wave 4 landed: `grep -n "accounts:" /Users/micahbos/Developer/cloud-connect/naas-data.js` must print at least one hit per non-empty estate. If it prints nothing, wave 4 is not in the tree and every later task will render the `never` shape; stop and say so rather than working around it. Estates checked: trust.

- [ ] **Step 6: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-changes.js tests/changes.test.mjs
git commit -m "$(cat <<'EOF'
changes: the object population and the run history behind the change story

Every object discovery can date, flattened to one shape, plus the run history
read out of wave 4's accounts. How many runs there have been is derived from
the cadence and the age of the oldest object, because nothing stores it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The delta between the last two runs

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-changes.js` (append after `runsOf`)
- Modify: `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs` (append)
- Modify: `/Users/micahbos/Developer/cloud-connect/docs/HANDOFF.md:49` (append one paragraph after the "What is real and what is mock" paragraph)
- Test: `tests/changes.test.mjs`

**Interfaces:**
- Consumes: `population(est, inv)`, `runsOf(est, pop, nowMs)` from Task 1.
- Produces: `changeDelta(pop, runs, opts) -> { shape: 'never'|'first'|'none'|'some', verb: 'NEW', total: number, counts: { site, vpc, workload }, rows: Row[], hidden: number, exposed: number, title: string, text: string }` where `Row = { key, kind, name, where, exposed, state, dot }`. `opts.sample` caps the rows and defaults to 6.

- [ ] **Step 1: Write the failing test.** Append to `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs`:

```js
import { changeDelta } from '../naas-changes.js';

const daily = (lastRun) => [{ id: 'a1', cloud: 'AWS', schedule: 'daily', lastRun, nextRun: lastRun + DAY }];

test('the delta between two runs is NEW only, sampled, worst first', () => {
  const est = withAccounts(trust, daily(NOW - HOUR));
  const pop = population(est, tinv);
  const runs = runsOf(est, pop, NOW);
  const d = changeDelta(pop, runs, {});
  assert.equal(d.shape, 'some');
  assert.equal(d.verb, 'NEW');
  assert.equal(d.counts.site, 27);
  assert.equal(d.counts.vpc, 0);
  assert.equal(d.counts.workload, 12);
  assert.equal(d.total, 39);
  assert.equal(d.rows.length, 6);
  assert.equal(d.hidden, 33);
  // worst first: anything that reaches the internet directly leads
  assert.ok(d.rows[0].exposed === true || d.exposed === 0);
  assert.ok(d.rows.every(r => ['site', 'vpc', 'workload'].includes(r.kind)));
  assert.match(d.title, /^39 new$/);
  assert.match(d.text, /27 sites and 12 workloads/);
  assert.match(d.text, /internet directly/);
  // the comparator is antisymmetric: sorting twice does not reorder
  const again = changeDelta(pop, runs, {}).rows.map(r => r.key);
  assert.deepEqual(again, d.rows.map(r => r.key));
});

test('the empty delta says nothing changed and renders no rows', () => {
  const est = withAccounts(D.ESTATES.partial, daily(NOW - HOUR));
  const pop = population(est, A.inventory(D.ESTATES.partial));
  const runs = runsOf(est, pop, NOW);
  const d = changeDelta(pop, runs, {});
  assert.equal(d.shape, 'none');
  assert.equal(d.total, 0);
  assert.equal(d.rows.length, 0);
  assert.equal(d.hidden, 0);
  assert.match(d.title, /Nothing changed/);
  assert.match(d.text, /same estate/);
});

test('the first run is a sentence, never 4,120 NEW rows; a never-run estate says so', () => {
  const est = withAccounts(trust, daily(NOW - HOUR));
  const pop = population(est, tinv);
  const first = changeDelta(pop, { ran: true, first: true, last: NOW - HOUR, prev: null, next: NOW, cutDays: 0, cadenceDays: 1, runCount: 1 }, {});
  assert.equal(first.shape, 'first');
  assert.equal(first.rows.length, 0);
  assert.equal(first.hidden, 0);
  assert.equal(first.total, 4120 + 18 + 2681);
  assert.match(first.title, /First run/);
  assert.match(first.text, /4,120 sites/);

  const never = changeDelta({ sites: [], vpcs: [], workloads: [] }, { ran: false, first: true, last: null, prev: null, next: null, cutDays: 0, cadenceDays: 0, runCount: 0 }, {});
  assert.equal(never.shape, 'never');
  assert.equal(never.rows.length, 0);
  assert.match(never.title, /has not run yet/);

  // An account that has run and found nothing is not a first run. `?view=empty`
  // hits this the moment wave 4 seeds it an account, and "Everything here is
  // new: nothing." would be the wrong sentence.
  const barren = changeDelta({ sites: [], vpcs: [], workloads: [] }, { ran: true, first: true, last: NOW - HOUR, prev: null, next: NOW, cutDays: 0, cadenceDays: 1, runCount: 1 }, {});
  assert.equal(barren.shape, 'never');
  assert.equal(barren.total, 0);
  assert.equal(barren.rows.length, 0);
  assert.match(barren.title, /Nothing discovered yet/);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `The requested module '../naas-changes.js' does not provide an export named 'changeDelta'`.

- [ ] **Step 3: Append `changeDelta` to `/Users/micahbos/Developer/cloud-connect/naas-changes.js`**, after `runsOf`:

```js
/** "27 sites and 12 workloads", skipping the kinds that found nothing. */
function countLine(c) {
  const parts = ['site', 'vpc', 'workload']
    .filter(k => c[k] > 0)
    .map(k => `${c[k].toLocaleString('en-US')} ${NOUN[k][c[k] === 1 ? 0 : 1]}`);
  if (!parts.length) return 'nothing';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/** Antisymmetric by construction: exposed first, then newest, then by id. */
function worstFirst(a, b) {
  if (a.exposed !== b.exposed) return a.exposed ? -1 : 1;
  if (a.since !== b.since) return a.since - b.since;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * What the last run found that the run before it did not.
 *
 * One verb. NEW is the only change this data can carry: `since` dates a
 * discovery, and nothing dates a removal, a move or a property's previous
 * value. The internet-facing count that rides along is a statement about the
 * arrivals as they are now, not a claim that anything drifted.
 *
 * Four shapes, because a count alone lies in three of them: an estate nobody
 * has scanned or whose accounts hold nothing, a first run where everything is
 * new and a list would be the whole inventory, a run that found the same
 * estate, and the ordinary case.
 */
export function changeDelta(pop, runs, opts = {}) {
  const sample = opts.sample || 6;
  const totals = { site: pop.sites.length, vpc: pop.vpcs.length, workload: pop.workloads.length };
  const zero = { site: 0, vpc: 0, workload: 0 };
  if (!runs || !runs.ran) {
    return {
      shape: 'never', verb: 'NEW', total: 0, counts: { ...zero }, rows: [], hidden: 0, exposed: 0,
      title: 'Discovery has not run yet',
      text: 'Connect an account and the first run reads it. Everything it finds is listed here.',
    };
  }
  if (!(totals.site + totals.vpc + totals.workload)) {
    return {
      shape: 'never', verb: 'NEW', total: 0, counts: { ...zero }, rows: [], hidden: 0, exposed: 0,
      title: 'Nothing discovered yet',
      text: 'The last run read the connected accounts and found no sites, VPCs or workloads in them.',
    };
  }
  if (runs.first) {
    return {
      shape: 'first', verb: 'NEW', total: totals.site + totals.vpc + totals.workload, counts: { ...totals }, rows: [], hidden: 0, exposed: 0,
      title: 'First run',
      text: `Everything here is new: ${countLine(totals)}. From the next run this block lists only what changed.`,
    };
  }
  const cut = runs.cutDays;
  const isNew = (x) => typeof x.since === 'number' && x.since <= cut;
  const hits = [...pop.sites.filter(isNew), ...pop.vpcs.filter(isNew), ...pop.workloads.filter(isNew)];
  const counts = {
    site: hits.filter(x => x.kind === 'site').length,
    vpc: hits.filter(x => x.kind === 'vpc').length,
    workload: hits.filter(x => x.kind === 'workload').length,
  };
  if (!hits.length) {
    return {
      shape: 'none', verb: 'NEW', total: 0, counts, rows: [], hidden: 0, exposed: 0,
      title: 'Nothing changed',
      text: `The last run found the same estate as the run before it: ${countLine(totals)}.`,
    };
  }
  const exposed = hits.filter(x => x.exposed).length;
  const rows = hits.slice().sort(worstFirst).slice(0, sample).map(x => ({
    key: x.id, kind: x.kind, name: x.name, where: x.where, exposed: x.exposed,
    state: x.exposed ? 'reaches the internet' : 'private',
    dot: x.exposed ? 'var(--warning)' : 'var(--success)',
  }));
  return {
    shape: 'some', verb: 'NEW', total: hits.length, counts, rows, hidden: Math.max(0, hits.length - rows.length), exposed,
    title: `${hits.length.toLocaleString('en-US')} new`,
    text: `The last run found ${countLine(counts)} that the run before it did not.`
      + (exposed
        ? ` ${exposed.toLocaleString('en-US')} of them ${exposed === 1 ? 'reaches' : 'reach'} the internet directly.`
        : ' None of them reach the internet directly.'),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: `tests 61`, `pass 61`, `fail 0`.

- [ ] **Step 5: Record the ruling in `/Users/micahbos/Developer/cloud-connect/docs/HANDOFF.md`.** Insert this paragraph immediately after line 49 (the paragraph that ends "`impacted()` expects the region's VPCs and the cloud-to-cloud arcs."):

```markdown

The change story on Discover follows the same rule. Every object carries a
seeded `since`, the days elapsed since discovery, so NEW is a real interval
test. GONE, MOVED and DRIFT were dropped: the estates hold only objects that
exist now, no object carries a previous parent, and no property carries a
previous value, so all three could only be fabricated. The internet-facing
count beside the new rows is a statement about those objects as they are, not
a claim that anything drifted.
```

- [ ] **Step 6: Verify in the browser and commit.** Reload `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect` and confirm the render-error banner is still absent (nothing binds the delta yet, so this is a regression check on the module graph).

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-changes.js tests/changes.test.mjs docs/HANDOFF.md
git commit -m "$(cat <<'EOF'
changes: the delta between the last two runs, in four honest shapes

NEW is the only verb this data can carry. GONE, MOVED and DRIFT are dropped
and the reason is written into HANDOFF beside the Shadow SaaS ruling. A first
run is a sentence, never 4,120 rows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Two windows, two readers, two state keys

The spec names the collision: `s.obWindow` is read as a discovery lookback by `isNew` (`naas-app.js:690`) and as an observation period by `R.trends`. Wave 5 ends it. `s.obWindow` keeps the observation meaning only; Explore 360's "Since" filter moves to `s.discWindow`, whose default is not a period but the last run, so it agrees with the Discover block by construction.

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-changes.js` (append)
- Modify: `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs` (append)
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:18`, `:618-620`, `:689`, `:717`, `:723-730`, `:1348`, `:1360`, `:1611`
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:262`, `:588`
- Test: `tests/changes.test.mjs`

**Interfaces:**
- Consumes: `population`, `runsOf` (Task 1), `changeDelta` (Task 2).
- Produces:
  - `observationWindow(key) -> { key, days, label, phrase }`, default key `'30d'`
  - `discoveryWindow(key, cutDays) -> { key, days, label, phrase }`, default key `'run'` with `days = cutDays`
  - `naas-app.js` locals `pop`, `runs`, `changed`, `discWin` in scope from line 689 to the end of `addendumVals` (which closes at `naas-app.js:1369`)
  - values `discRangeValue: string`, `setDiscRange: (e) => void`

- [ ] **Step 1: Write the failing test.** Append to `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs`:

```js
import { observationWindow, discoveryWindow } from '../naas-changes.js';

test('the observation window and the discovery window are two readers with two defaults', () => {
  assert.equal(observationWindow(null).key, '30d');
  assert.equal(observationWindow(null).days, 30);
  assert.equal(observationWindow('7d').phrase, 'the last 7 days');
  assert.equal(observationWindow('nonsense').key, '30d');

  assert.equal(discoveryWindow(null, 1.04).key, 'run');
  assert.equal(discoveryWindow(null, 1.04).days, 1.04);
  assert.equal(discoveryWindow(null, 1.04).phrase, 'the last run');
  assert.equal(discoveryWindow('run', 2.5).days, 2.5);
  assert.equal(discoveryWindow('90d', 1.04).days, 90);
  assert.equal(discoveryWindow('90d', 1.04).phrase, 'the last 90 days');
  assert.equal(discoveryWindow('nonsense', 1.04).key, 'run');
});

test('widening the discovery window past the last run finds strictly more', () => {
  const est = withAccounts(trust, [{ id: 'a1', cloud: 'AWS', schedule: 'daily', lastRun: NOW - HOUR, nextRun: NOW + 23 * HOUR }]);
  const pop = population(est, tinv);
  const runs = runsOf(est, pop, NOW);
  const run = discoveryWindow(null, runs.cutDays);
  const wide = discoveryWindow('7d', runs.cutDays);
  const count = (d) => pop.sites.filter(x => x.since <= d).length + pop.workloads.filter(x => x.since <= d).length;
  assert.equal(count(run.days), 39);
  assert.ok(count(wide.days) > count(run.days));
  // the two meanings no longer share a number
  assert.notEqual(observationWindow('30d').days, run.days);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `does not provide an export named 'observationWindow'`.

- [ ] **Step 3: Append the two readers to `/Users/micahbos/Developer/cloud-connect/naas-changes.js`.**

```js
/**
 * The one table, read by two named functions, because one accessor serving
 * two meanings is what broke. `days` is the number a filter compares against,
 * `label` is what a pill says, `phrase` is what a sentence says.
 */
export const WINDOWS = {
  '1h': [1 / 24, 'the last hour'],
  '24h': [1, '24 hours'],
  '7d': [7, '7 days'],
  '30d': [30, '30 days'],
  '90d': [90, '90 days'],
  '6m': [182, '6 months'],
  '12m': [365, '12 months'],
};

/** How far back Observe measures: the period a trend, a rate or a record set covers. */
export function observationWindow(key) {
  const k = WINDOWS[key] ? key : '30d';
  const [days, label] = WINDOWS[k];
  return { key: k, days, label, phrase: k === '1h' ? label : `the last ${label}` };
}

/**
 * How far back Explore 360 looks for what was found. Its default is not a
 * period: it is the last discovery run, so the tree and the Discover block
 * agree without a widget in between.
 */
export function discoveryWindow(key, cutDays) {
  const k = WINDOWS[key] ? key : 'run';
  if (k === 'run') return { key: 'run', days: cutDays || 0, label: 'the last run', phrase: 'the last run' };
  const [days, label] = WINDOWS[k];
  return { key: k, days, label, phrase: k === '1h' ? label : `the last ${label}` };
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: `tests 63`, `pass 63`, `fail 0`.

- [ ] **Step 5: Wire the two readers into `/Users/micahbos/Developer/cloud-connect/naas-app.js`.** Six edits, every line number as the file stands at the start of this task. **Apply them bottom-up: 5e, then 5d, then 5c-bis, then 5c, then 5b, then 5a.** In that order no edit moves the next one's line number. Top-down instead and 5c's four added lines put 5d eight lines off target.

**5a.** After line 18 (`import * as V from './naas-volume.js';`) add:

```js
import * as CH from './naas-changes.js';
```

**5b.** Delete lines 619 and 620 and the `WIN` table on line 618 that only they read. Verify with `grep -n "WIN\[" naas-app.js` first: it must print only lines 619 and 620. Remove all three lines:

```js
const WIN = { '1h': [1 / 24, 'the last hour'], '24h': [1, '24 hours'], '7d': [7, '7 days'], '30d': [30, '30 days'], '90d': [90, '90 days'], '6m': [182, '6 months'], '12m': [365, '12 months'] };
const winDaysOf = (s) => (WIN[s.obWindow || '30d'] || WIN['30d'])[0];
const winLabelOf = (s) => (WIN[s.obWindow || '30d'] || WIN['30d'])[1];
```

**5c.** Replace line 689 (`const winDays = winDaysOf(s), winLabel = winLabelOf(s), newOnly = !!s.newOnly;`) with the population, the run history, the delta and the discovery window. All four new locals - `pop`, `runs`, `changed`, `discWin` - stay in scope for the rest of `addendumVals`, which closes at line 1369:

```js
  const pop = CH.population(est, inv);
  const runs = CH.runsOf(est, pop, Date.now());
  const changed = CH.changeDelta(pop, runs, {});
  const discWin = CH.discoveryWindow(s.discWindow, runs.cutDays);
  const winDays = discWin.days, newOnly = !!s.newOnly;
```

Line 690 (`const isNew = ...`) is unchanged: it already reads `winDays`, which now comes from the run cut.

**5c-bis.** Replace line 717 so the Explore 360 strip counts the same sites the Discover card does. Today it reads the six-site sample each metro puts on the canvas, so on `?view=trust` it finds **0** new sites out of 136 sampled while the full population holds 27 out of 4,120. Two screens, two numbers, one estate. Line 717 today:

```js
  const allSites = S.siteTree(est).flatMap(cl => cl.children.flatMap(ch => ch.kind === 'metro' ? ch.sites : [ch]));
```

becomes the population Task 1 already built, which is the full generated list and is cached per estate:

```js
  const allSites = pop.sites;
```

`pop.sites` rows carry `id`, `priv` and `since`, which is everything lines 718 to 721 read off `allSites` (`isNew`, `LK.labelsOf(x.id)`, `x.priv`). Confirm nothing else uses the old local: `grep -n "allSites" /Users/micahbos/Developer/cloud-connect/naas-app.js` must print only lines 717 and 718.

**5d.** Replace the `newStrip` literal at lines 723 to 730 - the literal opens with `const newStrip = {` on 723 and closes with `};` on 730 - so its copy names the run instead of a window, and so the two shapes that have no meaningful count borrow their sentence from the delta:

```js
  const newStrip = {
    title: newOnly ? `Showing only what is new since ${discWin.phrase}` : 'Act on it',
    text: changed.shape === 'first' || changed.shape === 'never'
      ? changed.text
      : newN
      ? `${nn(newN, 'resource was', 'resources were')} discovered since ${discWin.phrase}: ${nn(newVpcs.length, 'VPC', 'VPCs')}, ${nn(newWls.length, 'workload', 'workloads')} and ${nn(newSites.length, 'site', 'sites')}. ${newUnlabeled === 0 ? 'All of them carry a label' : `${newUnlabeled} ${newUnlabeled === 1 ? 'has' : 'have'} no label yet`}${newPublic === 0 ? ' and none reach the internet directly.' : ` and ${newPublic} ${newPublic === 1 ? 'reaches' : 'reach'} the internet directly. Label them, then bring the exposed ones under a private-path policy.`}`
      : `Nothing new was discovered since ${discWin.phrase}. Widen the range above to look further back.`,
    cta: newOnly ? 'Show everything' : 'Review new', hasNew: newN > 0, pill: newOnly ? `${newN} new · showing only these` : `${newN} new · ${discWin.label}`,
    toggle: () => set({ newOnly: !newOnly, inv: newOnly ? openMap : { ...openMap, ...Object.fromEntries(inv.flatMap(cl => [cl.id, ...cl.regions.map(r => r.id)]).map(k => [k, true])) }, siteOpen: newOnly ? (s.siteOpen || {}) : Object.fromEntries(S.siteTree(est).flatMap(cl => [cl.key, ...cl.children.map(ch => ch.key)]).map(k => [k, true])) }),
  };
```

**5e.** Point the three surviving call sites at the right reader.

On line 1348, add the two new values beside `newStrip, newOnly,` at the head of that object literal:

```js
        newStrip, newOnly, discRangeValue: discWin.key, setDiscRange: (e) => set({ discWindow: e.target.value }), siteTree: tree,
```

On line 1360, replace the two `winDaysOf(s)` occurrences with `CH.observationWindow(s.obWindow).days` and the one `winLabelOf(s)` with `CH.observationWindow(s.obWindow).label`.

On line 1611 in `shellVals`, replace `const windowLabel = winLabelOf(s);` with:

```js
  const windowLabel = CH.observationWindow(s.obWindow).label;
```

Then run `grep -n "winDaysOf\|winLabelOf\|WIN\[" /Users/micahbos/Developer/cloud-connect/naas-app.js` and expect zero hits.

- [ ] **Step 6: Give Explore 360 its own select in `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html`.** Two edits, then count tags.

On line 262 (the title row), change only the `aria-label` so the widget names its single meaning:

```
aria-label="Observation window"
```

Replace line 588 entirely. It keeps the same element count (one `<label>`, one `<span>`, one `<select>`, seven `<option>`) and changes the bindings and the first option - `value="1h"` becomes `value="run"`, because an hour is not a period Explore 360 can honestly offer against a daily cadence:

```html
      <label class="fx-filter"><span class="fx-label">Since</span><select class="fx-select" value="{{ discRangeValue }}" onChange="{{ setDiscRange }}" aria-label="Discovery lookback"><option value="run">The last run</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="6m">Last 6 months</option><option value="12m">Last 12 months</option></select></label>
```

On line 586, the alert that wraps it still calls itself the window. Change only that `aria-label`, nothing else on the line:

```
aria-label="Discovered since the last run"
```

Count the tags in the replaced line 588: `<label>` 1 open 1 close, `<span>` 1/1, `<select>` 1/1, `<option>` 7/7. Lines 262 and 586 change one attribute value each and open or close no tag. So all three edits together must leave the file's tag census untouched, and that is the check - stronger than counting one block, because it catches a tag dropped anywhere:

```bash
cd /Users/micahbos/Developer/cloud-connect
tagcount () { for t in div span label select option sc-if sc-for button h3 i; do printf "%s %s %s\n" "$t" "$(grep -o "<${t}[ >]" "$1" | wc -l | tr -d ' ')" "$(grep -o "</${t}>" "$1" | wc -l | tr -d ' ')"; done; }
git show HEAD:"NaaS Storefront.dc.html" > /tmp/before.html
tagcount /tmp/before.html > /tmp/before.tags
tagcount "NaaS Storefront.dc.html" > /tmp/after.tags
diff /tmp/before.tags /tmp/after.tags && echo "IDENTICAL - no tag added or lost"
```

`diff` must print nothing and the echo must fire. The baseline on the current tree is `div 844 844`, `span 632 632`, `label 26 26`, `select 15 15`, `option 53 53`, `sc-if 282 282`, `sc-for 171 171`, `button 244 244`, `h3 20 20`, `i 21 21`; each pair is open then close and every pair must stay equal.

The `${t}` braces are load-bearing. This repo's shell is zsh, where `"<$t[ >]"` parses `[ >]` as an array subscript on `t` and the loop dies with `bad math expression: operand expected at '>'` while printing zeroes, which reads like a passing check.

- [ ] **Step 7: Run the test to verify nothing regressed.** Run: `npm test`  Expected: `tests 63`, `pass 63`, `fail 0`.

- [ ] **Step 8: Verify in the browser.** Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s1` (Explore 360). Confirm: the "Since" select reads **The last run**; the strip under the stats reads "discovered since the last run"; the `N new` pill reads `39 new · the last run` (0 VPCs, 12 workloads and 27 sites - if it reads `12 new` then step 5c-bis was skipped and the strip is still counting the 136-site canvas sample); switching the select to **Last 90 days** changes the count and the strip to "since the last 90 days" and does **not** change the title-row date range at the top. Then open `#s3/cloud/observe` and confirm the title-row range still reads Last 30 days and the flow-map line under the map header still reads `30 days`, proving the two controls are now independent. Screenshot a screen **below** line 588: `#s3/cloud/cost` must render its cards, not a blank page. Estates checked: trust, partial, empty.

- [ ] **Step 9: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-changes.js tests/changes.test.mjs naas-app.js "NaaS Storefront.dc.html"
git commit -m "$(cat <<'EOF'
changes: the discovery lookback stops sharing a widget with the observation window

obWindow now means one thing, the period Observe measures. Explore 360's
"Since" filter moves to discWindow, whose default is the last discovery run,
so the tree and Discover agree without a widget in between.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The "what changed" block on Discover

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-changes.js` (append `changeCard`)
- Modify: `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs` (append)
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:1362` (spread the new values)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html` (insert a card between line 953 and line 954)
- Test: `tests/changes.test.mjs`

**Interfaces:**
- Consumes: `changeDelta(pop, runs, opts)` (Task 2), `runsOf` (Task 1), `agoLabel`, `clock`, `kindLabel` (Task 1); the `changed` and `runs` locals added to `addendumVals` in Task 3 step 5c.
- Produces: `changeCard(delta, runs, nowMs) -> { title, sub, text, pill, hasPill, rows, hasRows, hidden, hasHidden, hiddenLabel }` where each row is `{ key, kind, kindLabel, name, where, exposed, state, dot }`; and the values `chgTitle`, `chgSub`, `chgText`, `chgPill`, `chgHasPill`, `chgRows`, `chgHasRows`, `chgHasHidden`, `chgHiddenLabel`, `chgOpenAll`.

- [ ] **Step 1: Write the failing test.** Append to `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs`:

```js
import { changeCard } from '../naas-changes.js';

test('the change card turns the delta into the strings the card binds', () => {
  const est = withAccounts(trust, [{ id: 'a1', cloud: 'AWS', schedule: 'daily', lastRun: NOW - 4 * 60000, nextRun: NOW + 20 * HOUR }]);
  const pop = population(est, tinv);
  const runs = runsOf(est, pop, NOW);
  const card = changeCard(changeDelta(pop, runs, {}), runs, NOW);
  assert.equal(card.title, '39 new');
  assert.match(card.sub, /^Ran 4 min ago · next at \d{2}:\d{2}$/);
  assert.equal(card.hasPill, true);
  assert.equal(card.pill, '39 NEW');
  assert.equal(card.hasRows, true);
  assert.equal(card.rows.length, 6);
  assert.ok(card.rows.every(r => r.kindLabel && r.name && r.where && r.dot));
  assert.equal(card.hasHidden, true);
  assert.equal(card.hiddenLabel, 'See all 39 ›');
});

test('the card offers no rows and no pill when there is nothing to list', () => {
  const runs = { ran: false, first: true, last: null, prev: null, next: null, cutDays: 0, cadenceDays: 0, runCount: 0 };
  const card = changeCard(changeDelta({ sites: [], vpcs: [], workloads: [] }, runs, {}), runs, NOW);
  assert.equal(card.sub, 'No run yet');
  assert.equal(card.hasPill, false);
  assert.equal(card.hasRows, false);
  assert.equal(card.hasHidden, false);
  assert.match(card.title, /has not run yet/);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `does not provide an export named 'changeCard'`.

- [ ] **Step 3: Append `changeCard` to `/Users/micahbos/Developer/cloud-connect/naas-changes.js`.**

```js
/**
 * The delta as the strings the card binds. The dc-runtime cannot call a
 * function or do arithmetic in a binding, so every number is formatted and
 * every conditional is a boolean before it reaches the markup.
 */
export function changeCard(delta, runs, nowMs) {
  const now = nowMs || Date.now();
  const ran = runs && runs.ran;
  return {
    title: delta.title,
    sub: ran
      ? `Ran ${agoLabel(runs.last, now)}${runs.next != null ? ` · next at ${clock(runs.next)}` : ''}`
      : 'No run yet',
    text: delta.text,
    pill: delta.shape === 'some' ? `${delta.total.toLocaleString('en-US')} NEW` : '',
    hasPill: delta.shape === 'some',
    rows: delta.rows.map(r => ({ ...r, kindLabel: kindLabel(r.kind) })),
    hasRows: delta.rows.length > 0,
    hidden: delta.hidden,
    hasHidden: delta.hidden > 0,
    hiddenLabel: `See all ${delta.total.toLocaleString('en-US')} ›`,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: `tests 65`, `pass 65`, `fail 0`.

- [ ] **Step 5: Bind the card in `/Users/micahbos/Developer/cloud-connect/naas-app.js`.** Replace the single line `    ...logVals, ...gapVals, ...stepVals,` with the same spread plus the change values. It is line 1362 at `HEAD` and line **1364** now, because Task 3 added two net lines above it - find it with `grep -n "logVals, \.\.\.gapVals" naas-app.js`, which prints exactly one hit. `changed`, `runs` and `go` are all in scope here:

```js
    ...logVals, ...gapVals, ...stepVals,
    ...(() => {
      const card = CH.changeCard(changed, runs, Date.now());
      return {
        chgTitle: card.title, chgSub: card.sub, chgText: card.text,
        chgPill: card.pill, chgHasPill: card.hasPill,
        chgRows: card.rows, chgHasRows: card.hasRows,
        chgHasHidden: card.hasHidden, chgHiddenLabel: card.hiddenLabel,
        chgOpenAll: () => { set({ discWindow: 'run', newOnly: true }); go('s1')(); },
      };
    })(),
```

- [ ] **Step 6: Add the card to `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html`.** Insert these lines between line 953 (the Discover filters row, ending `</div>`) and line 954 (`<div id="sec-accounts" ...>`). It sits first because it is the newest information on the screen, above the accounts it was drawn from. It uses a plain grid, not a `<table>`, so `sc-for` renders:

```html
    <div id="sec-changed" class="fx-card" aria-label="What changed" style="gap:12px;padding:16px 24px">
      <div class="fx-card-head"><div><h3 class="fx-card-title">{{ chgTitle }}</h3><div class="fx-card-sub">{{ chgSub }}</div></div><sc-if value="{{ chgHasPill }}" hint-placeholder-val="{{ true }}"><span class="fx-badge new" style="flex:none;height:24px">{{ chgPill }}</span></sc-if></div>
      <div style="font-size:13px;line-height:18px;color:var(--text-body);text-wrap:pretty">{{ chgText }}</div>
      <sc-if value="{{ chgHasRows }}" hint-placeholder-val="{{ true }}">
      <div style="display:grid">
        <sc-for list="{{ chgRows }}" as="cg" hint-placeholder-count="4">
          <div style="display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--border-secondary);min-width:0">
            <i style="width:8px;height:8px;border-radius:9999px;background:{{ cg.dot }};display:inline-block"></i>
            <span style="min-width:0"><span style="display:block;font-size:13px;line-height:18px;font-weight:700;color:var(--text-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ cg.name }}</span><span style="display:block;font-size:11px;line-height:15px;color:var(--text-light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ cg.kindLabel }} · {{ cg.where }}</span></span>
            <span style="flex:none;font-size:11px;color:var(--text-light);white-space:nowrap">{{ cg.state }}</span>
          </div>
        </sc-for>
      </div>
      <sc-if value="{{ chgHasHidden }}" hint-placeholder-val="{{ true }}">
      <div style="display:flex;justify-content:flex-end"><button class="fx-btn" onClick="{{ chgOpenAll }}" style="height:28px;padding:0 12px;font-size:12px">{{ chgHiddenLabel }}</button></div>
      </sc-if>
      </sc-if>
    </div>
```

- [ ] **Step 7: Count the tags in the inserted block.** Expected, and each must balance: `<div>` 8 open / 8 close (`sec-changed`, `fx-card-head`, the head's inner div, `fx-card-sub`, the text block, the rows grid, the row, the button wrapper); `<sc-if>` 3/3; `<sc-for>` 1/1; `<span>` 5/5; `<h3>` 1/1; `<i>` 1/1; `<button>` 1/1. Confirm mechanically:

```bash
cd /Users/micahbos/Developer/cloud-connect
sed -n '954,971p' "NaaS Storefront.dc.html" > /tmp/chg-block.html
for t in div sc-if sc-for span h3 i button; do
  o=$(grep -o "<${t}[ >]" /tmp/chg-block.html | wc -l); c=$(grep -o "</${t}>" /tmp/chg-block.html | wc -l)
  echo "$t open=$o close=$c"
done
```

Adjust the `sed` range if the insert landed elsewhere; every pair must be equal. Then run the whole-file census from Task 3 step 6 against `HEAD` - `diff` will show the 18 added lines this time, so read the numbers instead: every tag's open count must still equal its close count.

- [ ] **Step 8: Verify in the browser.** Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect` at 1440x900.
  - **trust**: the card reads `39 new` with `Ran <n> min ago · next at HH:MM`, a `39 NEW` pill, six rows each naming a site or workload with its class and metro or its region and VPC, and a `See all 39 ›` button whose right edge is 24px inside the card. The exact count depends on the cadence wave 4 seeded: at a daily cadence it is 27 sites and 12 workloads; a six-hourly or hourly cadence gives fewer (15 sites and 9 workloads at the limit). Sites and workloads must both appear; VPCs will not, because none were discovered that recently.
  - `?view=mature` -> a smaller count with no `See all` button, because the delta fits the six-row sample: 6 at a daily cadence (1 site, 5 workloads), 4 at hourly or six-hourly (1 site, 3 workloads).
  - `?view=partial` -> **Nothing changed**, the sentence only, no rows, no pill. Partial has 0 objects newer than a day at any cadence.
  - `?view=empty` -> one of two titles, both correct, depending on what wave 4 seeded. If the empty estate has no `accounts` entry: **Discovery has not run yet** with `No run yet` in the sub. If wave 4 gave it an account with a `lastRun`: **Nothing discovered yet** with `Ran <n> min ago` in the sub. Read `grep -n "accounts" /Users/micahbos/Developer/cloud-connect/naas-data.js` to know which to expect, and record which one you saw. Neither may read "First run" or "Everything here is new: nothing" - if it does, the empty-population guard in Task 2 step 3 is missing.
  - Click `See all 39 ›` and confirm it lands on Explore 360 with the "Since" select on **The last run** and the tree filtered to what is new. Nothing opened in a new page.
  - Screenshot a screen **below** the insert: `#s3/cloud/cost` and `#s3/cloud/govern` must both render their cards.
  - Toggle dark mode and confirm the card's text and dots read correctly; every colour in the block is a `var(--...)` token.
  - The `first` shape has no shipped estate to stand on, because every non-empty estate is a year old at any cadence. It is proven by the unit test in Task 2 rather than in the browser; say so rather than claiming it was seen.

- [ ] **Step 9: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-changes.js tests/changes.test.mjs naas-app.js "NaaS Storefront.dc.html"
git commit -m "$(cat <<'EOF'
discover: what the last run found, above the accounts it was drawn from

One verb, NEW, read from the run record rather than a UI window. A first run
is a sentence and a quiet estate says nothing changed, so the block never
claims a delta the data cannot carry.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: One object's history

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-changes.js` (append `objectHistory`)
- Modify: `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs` (append)
- Test: `tests/changes.test.mjs`

**Interfaces:**
- Consumes: `runsOf(est, pop, nowMs)` (Task 1), `stamp(ms)`, `clock(ms)` (Task 1).
- Produces: `objectHistory(obj, runs, nowMs) -> Row[]` where `obj = { since: number, priv: boolean, via?: string, foundBy?: string }` and `Row = { key: 'disc'|'att'|'seen', when: string, what: string, dated: boolean }`.

- [ ] **Step 1: Write the failing test.** Append to `/Users/micahbos/Developer/cloud-connect/tests/changes.test.mjs`:

```js
import { objectHistory } from '../naas-changes.js';

test('an object history dates what it can and says so where it cannot', () => {
  const runs = { ran: true, first: false, last: NOW - 4 * 60000, prev: NOW - DAY, next: NOW + 20 * HOUR, cutDays: 1.003, cadenceDays: 1, runCount: 364 };
  const h = objectHistory({ since: 17, priv: true, via: 'AVPN (MPLS VPN)' }, runs, NOW);
  assert.equal(h.length, 3);
  assert.deepEqual(h.map(r => r.key), ['disc', 'att', 'seen']);

  assert.equal(h[0].dated, true);
  assert.match(h[0].when, /^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
  assert.match(h[0].what, /^Discovered · 17 days ago$/);

  // no source of truth records when a resource was put on the fabric
  assert.equal(h[1].dated, false);
  assert.equal(h[1].when, 'not recorded');
  assert.match(h[1].what, /On the AT&T fabric via AVPN \(MPLS VPN\)/);

  assert.equal(h[2].dated, true);
  assert.match(h[2].when, /^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
  assert.match(h[2].what, /^Last seen by a discovery run · \d{2}:\d{2}$/);
});

test('a public object and an unread estate each shorten the history honestly', () => {
  const pub = objectHistory({ since: 0, priv: false }, { ran: false, first: true, last: null, prev: null, next: null, cutDays: 0, cadenceDays: 0, runCount: 0 }, NOW);
  assert.equal(pub.length, 2);
  assert.match(pub[0].what, /Discovered · today/);
  assert.match(pub[1].what, /Not attached · public first mile/);
  assert.equal(objectHistory(null, null, NOW).length, 0);
  assert.equal(objectHistory({ priv: true }, null, NOW).length, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `does not provide an export named 'objectHistory'`.

- [ ] **Step 3: Append `objectHistory` to `/Users/micahbos/Developer/cloud-connect/naas-changes.js`.**

```js
const agoWord = (d) => d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`;

/**
 * One object's history, for the Detail overlay.
 *
 * Two of the three rows carry a date because the data carries one: `since`
 * dates the discovery, and the run record dates the last time discovery saw
 * this object. The attach does not. Neither the cloud control plane nor AT&T
 * inventory records when a resource was put on the fabric, so that row states
 * what is true now and prints "not recorded" rather than inventing a day.
 */
export function objectHistory(obj, runs, nowMs) {
  if (!obj || typeof obj.since !== 'number') return [];
  const now = nowMs || Date.now();
  const rows = [{
    key: 'disc',
    when: stamp(now - obj.since * DAY),
    what: `${obj.foundBy ? `Discovered by ${obj.foundBy}` : 'Discovered'} · ${agoWord(obj.since)}`,
    dated: true,
  }];
  rows.push({
    key: 'att',
    when: 'not recorded',
    what: obj.priv
      ? `On the AT&T fabric${obj.via ? ' via ' + obj.via : ''}`
      : 'Not attached · public first mile',
    dated: false,
  });
  if (runs && runs.ran && runs.last != null) {
    rows.push({
      key: 'seen',
      when: stamp(runs.last),
      what: `Last seen by a discovery run · ${clock(runs.last)}`,
      dated: true,
    });
  }
  return rows;
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: `tests 67`, `pass 67`, `fail 0`.

- [ ] **Step 5: Verify in the browser.** Nothing binds it yet, so this is a regression check on the module graph and on Task 4's card. Reload `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/connect` and confirm the change card still reads `39 new` and the render-error banner is absent. Estates checked: trust.

- [ ] **Step 6: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-changes.js tests/changes.test.mjs
git commit -m "$(cat <<'EOF'
changes: one object's history, dated where the data carries a date

Discovered and last seen are real stamps. The attach is not: nothing records
when a resource was put on the fabric, so the row prints "not recorded" and
the gap stays visible instead of being filled.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: History in the Detail overlay

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-observe-dash.js:13` (import), `:102-104` (site panel), `:164-167` (workload panel), `:254-255` (VPC panel) - all pre-edit numbers; the import adds one line and every later number shifts down by one
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:1121` (pass `runs` into the panel context), `:1124` (shape the history rows)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html` (insert a HISTORY group after line 1881 - the `</sc-for>` that closes the `panel.groups` loop sits at 1863 in today's tree and Task 4 pushes it down 18 lines)
- Modify: `/Users/micahbos/Developer/cloud-connect/tests/observe-dash.test.mjs` (append)
- Test: `tests/observe-dash.test.mjs`

**Interfaces:**
- Consumes: `objectHistory(obj, runs, nowMs)` (Task 5); the `runs` local added to `addendumVals` in Task 3 step 5c.
- Produces: `sitePanel(id, ctx).history`, `workloadPanel(sel, ctx).history` and `vpcPanel(sel, ctx).history`, all `Row[]` from `objectHistory`, where `ctx` gains an optional `runs`; and the values `panel.history` (each row gains `key` and `whenColor`) and `panel.hasHistory`. The other panels (`connection`, `subnet`, the map's generic node) return no `history`, so `hasHistory` is false and the group does not render for them; that is correct, because none of those objects carries a `since`.

- [ ] **Step 1: Write the failing test.** Append to `/Users/micahbos/Developer/cloud-connect/tests/observe-dash.test.mjs`:

```js
import { workloadPanel, vpcPanel } from '../naas-observe-dash.js';
import * as CH from '../naas-changes.js';

test('a site and a workload carry their own history, and the flat Discovered row is gone', () => {
  const trust = D.ESTATES.trust; const tinv = A.inventory(trust); const tob = A.observe(trust, [], tinv);
  const tctx = { est: trust, inv: tinv, flows: tob.flows };
  const runs = { ran: true, first: false, last: Date.now() - 240000, prev: Date.now() - 86400000, next: Date.now() + 3600000, cutDays: 1.003, cadenceDays: 1, runCount: 364 };

  const metro = S.siteTree(trust).find(c => c.cls === 'Edge').children[0];
  const one = S.metroSites(metro)[10];
  const sp = sitePanel(one.id, { ...tctx, runs });
  assert.equal(sp.history.length, 3);
  assert.deepEqual(sp.history.map(r => r.key), ['disc', 'att', 'seen']);
  assert.equal(sp.history[1].dated, false);
  assert.ok(!sp.overview.some(x => x[0] === 'Discovered'));

  // the estate is unchanged when no run history is supplied
  assert.equal(sitePanel(one.id, tctx).history.length, 2);

  const reg = tinv.flatMap(c => c.regions)[0];
  const vpc = reg.vpcs[0];
  const wl = vpc.subnets.flatMap(sn => sn.workloads || [])[0];
  const wp = workloadPanel(`wl:${reg.region}|${vpc.id}|${wl.id}`, { ...tctx, runs });
  assert.equal(wp.history.length, 3);
  assert.ok(!wp.overview.some(x => x[0] === 'First seen'));
  assert.equal(CH.objectHistory({ since: wl.since, priv: !wl.exposed }, runs, Date.now())[0].what, wp.history[0].what);

  // a VPC carries a `since` too (naas-addendum.js:97), so it gets the same three rows
  const vp = vpcPanel(`vpc:${reg.region}|${vpc.id}`, { ...tctx, runs });
  assert.equal(vp.history.length, 3);
  assert.deepEqual(vp.history.map(r => r.key), ['disc', 'att', 'seen']);
  assert.equal(vp.history[0].what, CH.objectHistory({ since: vpc.since, priv: !!vpc.priv }, runs, Date.now())[0].what);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `Cannot read properties of undefined (reading 'length')` on `sp.history.length`.

- [ ] **Step 3: Attach the history in `/Users/micahbos/Developer/cloud-connect/naas-observe-dash.js`.** Four edits. Tasks 1 to 5 never touched this file, so every number below is today's. **Apply them bottom-up: 3d, then 3c, then 3b, then 3a.** In that order the import in 3a lands last and shifts nothing that is still to be edited.

**3a.** After line 13 (`import * as P from './naas-paths.js';`) add:

```js
import * as CH from './naas-changes.js';
```

**3b.** `sitePanel`'s return is on line 102, its `overview` on 103 and `paths, talks, impact: null, records: recs,` on 104. Confirm with `sed -n '100,106p' naas-observe-dash.js` before editing. Replace those three lines (the return, the overview, and the `paths, talks` line) with the version that destructures `runs`, drops the flat `Discovered` pair - the last entry in the overview array, keyed `'Discovered'` - and adds `history`:

```js
  const runs = ctx.runs || null;
  return { kind: 'site', title: site.name || site.id, sub: `${site.clsLabel || site.cls} · ${site.metro}${site.address ? ' · ' + site.address : ''}`, trail: site.trail.map((t, i) => ({ key: 'st' + i, name: t })),
    overview: [['Class', site.clsLabel || site.cls], ['Metro', site.metro], ...(site.address ? [['Address', site.address]] : []), ['Access', site.access || 'Access'], ['First mile', pub ? 'Public internet' : 'AT&T private'], ['PoP', `${site.metro === 'Various' ? 'nearest' : site.metro} PoP · ${site.popMs || site.ms || 4} ms`], ['State', state], ['Traffic', (() => { const g = sr.rows.reduce((a, x) => a + x.gbps, 0); return g >= 1 ? g.toFixed(1) + ' Gbps' : Math.max(1, Math.round(g * 1000)) + ' Mbps'; })()], ['Reaches', `${sr.total} regions`]],
    history: CH.objectHistory({ since: site.since, priv: !pub, via: site.access || '' }, runs, Date.now()),
    paths, talks, impact: null, records: recs,
```

**3c.** In `workloadPanel`, delete the `['First seen', ...]` pair on line 164 and add the `history` key after the `overview` array closes with `],` on line 166. Replace lines 164 to 167 with:

```js
      ['Instances sharing this app', `${peers.length + 1}`],
    ],
    history: CH.objectHistory({ since: w.since, priv: !w.exposed, via: top.priv ? (top.ramp || 'NetBond') : '' }, ctx.runs || null, Date.now()),
    children: (w.endpoints || []).length ? {
```

Only the `['First seen', ...]` pair goes; `['Instances sharing this app', ...]`, the closing `],` and the `children:` line all stay, and the `history` line arrives between the last two. Verify with `sed -n '163,170p' naas-observe-dash.js` before editing and match on the text, not the number.

**3d.** `vpcPanel` gets the same treatment, because a VPC carries a `since` at `naas-addendum.js:97` and shows up in the change card's population. It has no flat date row to remove, so this is one inserted line. Its `overview` array closes with `],` on line 254 and `children: { title: ...` follows on line 255. Confirm with `sed -n '252,257p' naas-observe-dash.js`, then insert between those two lines:

```js
    history: CH.objectHistory({ since: vpc.since, priv: !!vpc.priv, via: top.priv ? (top.ramp || 'NetBond') : '' }, ctx.runs || null, Date.now()),
```

`vpc`, `top` and `ctx` are all already in scope: `const { top, vpc } = c;` runs at the head of `vpcPanel` and `ctx` is its own parameter. Nothing else in `vpcPanel` changes.

After the three panel edits, confirm the flat rows are gone: `grep -n "'Discovered'\|'First seen'" naas-observe-dash.js` must print nothing, and `grep -c "CH.objectHistory" naas-observe-dash.js` must print `3`.

- [ ] **Step 4: Pass the run history in, and shape the rows, in `/Users/micahbos/Developer/cloud-connect/naas-app.js`.** Two edits, **bottom-up: the `hasChildren2` line first, then the `panel0` line.** Both sit above Task 4's insert, so Task 3's +2 is the only shift that reached them: line 1121 at `HEAD` is line **1123** now, and 1124 is **1126**. Anchor on the text - `grep -n "OD.panelFor(mapSel" naas-app.js` and `grep -n "hasChildren2:" naas-app.js` each print exactly one hit.

On the `OD.panelFor(mapSel, ...)` line, add `runs` to the panel context:

```js
  const panel0 = OD.panelFor(mapSel, { est: est0, inv, flows: ob.flows, map, conns, runs });
```

On the `hasChildren2:` line, add the two history values beside it:

```js
    hasChildren2: !!(panel0.children && panel0.children.rows.length),
    history: (panel0.history || []).map((h, i) => ({ ...h, key: h.key || ('hx' + i), whenColor: h.dated ? 'var(--text-light)' : 'var(--text-disabled)' })), hasHistory: !!(panel0.history && panel0.history.length),
```

- [ ] **Step 5: Add the HISTORY group to `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html`.** Insert these lines between the `          </sc-for>` that closes the `panel.groups` loop and the line below it, which opens with `        </div><sc-if value="{{ panel.hasChildren2 }}"`. Those are lines 1863 and 1864 in today's tree and lines **1881 and 1882** after Task 4 inserts its 18-line card at 954. Locate them, do not trust the number: `grep -n 'panel.hasChildren2' "NaaS Storefront.dc.html"` prints the second one, and the `</sc-for>` is the line above it. The block sits inside the `panel.isOverview` grid, so it follows the Identity, Where it sits and How it connects groups and uses the same row geometry:

```html
          <sc-if value="{{ panel.hasHistory }}" hint-placeholder-val="{{ false }}">
          <div style="min-width:0">
            <div style="font-size:10px;line-height:14px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--text-disabled);padding-bottom:2px">History</div>
            <sc-for list="{{ panel.history }}" as="hx" hint-placeholder-count="3">
              <div style="display:grid;grid-template-columns:minmax(84px,auto) minmax(0,1fr);gap:12px;align-items:baseline;padding:6px 0;border-top:1px solid var(--border-secondary);font-size:13px;line-height:18px;min-width:0"><span style="color:{{ hx.whenColor }};white-space:nowrap">{{ hx.when }}</span><span style="min-width:0;font-weight:500;color:var(--text-heading);text-align:right;overflow-wrap:anywhere">{{ hx.what }}</span></div>
            </sc-for>
          </div>
          </sc-if>
```

- [ ] **Step 6: Count the tags in the inserted block.** Expected: `<sc-if>` 1 open / 1 close, `<div>` 3/3 (the group, the header, the row), `<sc-for>` 1/1, `<span>` 2/2. Confirm mechanically:

```bash
cd /Users/micahbos/Developer/cloud-connect
sed -n '1882,1889p' "NaaS Storefront.dc.html" > /tmp/hist-block.html
for t in div sc-if sc-for span; do
  o=$(grep -o "<${t}[ >]" /tmp/hist-block.html | wc -l); c=$(grep -o "</${t}>" /tmp/hist-block.html | wc -l)
  echo "$t open=$o close=$c"
done
```

That range is the eight inserted lines after Task 4's card pushed this region down 18 lines; correct it to wherever the block actually landed, and every pair must be equal. Then run the whole-file census from Task 3 step 6 against `HEAD` - `diff` will show the added lines this time, so read the numbers instead: every tag's open count must still equal its close count.

- [ ] **Step 7: Run the test to verify it passes.** Run: `npm test`  Expected: `tests 68`, `pass 68`, `fail 0`.

- [ ] **Step 8: Verify in the browser.** Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust#s3/cloud/observe` at 1440x900.
  - Drill the live flow map into a site: click a left-column node, then a metro, then a named site. The Detail overlay's Overview tab must end with a **HISTORY** group of three rows: a date and "Discovered · N days ago", then "not recorded" in the dimmer token beside "On the AT&T fabric via AVPN (MPLS VPN)" or "Not attached · public first mile", then a date and "Last seen by a discovery run · HH:MM".
  - Confirm the old flat "Discovered" row is gone from the **Also** group, and that the Also group has disappeared entirely for a site because nothing is left in it.
  - Drill the right column to a workload and confirm the same three rows, and that "First seen" no longer appears in the overview list.
  - Stop one level short on the right column, on a VPC, and confirm it carries the same HISTORY group.
  - Open a connection gauge and confirm its panel shows **no** HISTORY group, because a connection has no `since` to date.
  - Confirm the overlay still opens over the content and nothing navigated away; Observe still fits 1440x900 with no page scroll.
  - Toggle dark mode and confirm both `when` colours are legible.
  - Screenshot a screen **below** the insert: the Marketplace at `#s7` and a product at `#s8` must both render.
  - Estates checked: trust, mature, partial.

- [ ] **Step 9: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-changes.js naas-observe-dash.js naas-app.js "NaaS Storefront.dc.html" tests/observe-dash.test.mjs
git commit -m "$(cat <<'EOF'
detail: a site, a VPC and a workload carry their own history

Discovered, attached and last seen, replacing the single flat "Discovered N
days ago" row. The attach carries no date because nothing records one, and
the row says that instead of guessing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Done when

- `npm test` reports 68 passing.
- Discover carries a "what changed" card on all four estates, in the shape each estate's data earns.
- Explore 360's "Since" filter and the title row's date range move independently.
- A site, a VPC and a workload each show a three-row history in the Detail overlay; a connection shows none.
- On `?view=trust`, Explore 360's `N new` pill and the Discover card report the same 39.
- `grep -n "winDaysOf\|winLabelOf" naas-app.js` prints nothing.

# First level: rail collapse and Discover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink the storefront's first level so the rail offers five real destinations and Discover shows only what can act, with everything else one click deep.

**Architecture:** Gate, do not move. Every heavy section keeps its markup position and its `sec-*` id; a new `sc-if` decides whether it renders. Liveness and openness are computed in `vals()` and bound as booleans, so every rule in this plan is asserted against the view model in plain `node --test` without a browser. The rail collapses by emitting empty `items`, which needs no markup change at all.

**Tech Stack:** ES modules, no build step. `node --test tests/*.test.mjs`. Markup is a single `dc-runtime` template, `NaaS Storefront.dc.html`.

**Spec:** `docs/superpowers/specs/2026-09-22-first-level-and-task-flows-design.md`

## Global Constraints

- **Never `git add -A` in this repo.** Untracked `.claude/` and `naas-design-scope/` must not ride into a commit. Stage by explicit path, every time.
- **`sc-for` does not work inside `<table>`, `<svg>` or `<select>`.** Use the `.dt` CSS-table classes or `.fx-row`; write `<option>` lists longhand.
- **The markup census in `tests/markup.test.mjs:80-88` is pinned, not merely balanced.** Every task that changes markup updates the pinned number in the same commit and adds a comment above the test saying which task moved it and by how much.
- **No em dashes in UI copy.** Hyphens or rephrase.
- **Fold rule:** 1440x900, no scroll, at a page's rest state.
- Current census pins: `div 870`, `span 644`, `sc-if 301`, `sc-for 174`, `section 11`, `button 252`, `aside 9`, `label 28`.

## Decisions this plan makes

The spec left four questions open in its section 9. This plan answers three of
them, and they are answered here rather than inside a task so they can be
overruled in one place.

- **Where the accounts drill opens:** in place, at its current position in the
  markup, behind an `sc-if`. Nothing moves. The 356KB template has twice shipped
  a stray closing tag, so gating beats relocating.
- **Whether Explore 360 stays a rail destination:** yes. It is the only former
  section row that already navigated, and the spec calls for five destinations.
- **Whether the four state tiles survive as tiles:** yes, untouched. Folding them
  into the verdict line is a separate change with its own copy questions.

The fourth, Observe's flow-map frame, is out of scope for this plan.

## Review Focus

Five things the spec implies, that no task's happy path exercises, most likely to bite first.

1. **A former rail row becomes unreachable.** Collapsing the rail removes fifteen doors. If a drill opener is missing or mis-keyed, `sec-accounts`, `sec-gap` or `sec-paths` exists in the DOM with no way in. Pinned in Task 3.
2. **Two sections open at once, or one refuses to close.** `openSec` is a single slot; a toggle that sets instead of clearing leaves a section stuck open and the page back over the fold. Pinned in Task 2.
3. **An empty estate renders a drill to nothing.** "0 accounts" and "0 off fabric" are live-looking controls over no rows, which is the exact defect this plan exists to remove. Pinned in Task 4.
4. **Govern loses its heading row entirely.** `showPageTitle` wraps the whole title row. Gating the bar inside it must leave `pageTitle` and `pageVerdict` rendering on all four tabs. Pinned in Task 1.
5. **The multi-credential intake scans with an empty list.** Removing the last row, or pressing Scan before adding one, must not start a scan or clear the estate. Pinned in Task 5.

---

### Task 1: Discovery leaves the pages that do not own it

**Files:**
- Modify: `naas-app.js:1991` (beside `const credsN = sched.accounts.length;`)
- Modify: `naas-app.js:2013` (the returned value object)
- Modify: `NaaS Storefront.dc.html:259-263`
- Modify: `tests/markup.test.mjs:75-88`
- Create: `tests/first-level.test.mjs`

**Interfaces:**
- Consumes: `s.screen`, `s.tab` from component state.
- Produces: `ownsDiscovery: boolean`, `ownsTelemetry: boolean` on the object returned by `vals()`. Tasks 2 and 4 read neither; the markup binds both.

- [ ] **Step 1: Write the failing test**

Create `tests/first-level.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

const at = (screen, tab) => vals(mkC({ screen, tab }));

test('discovery controls render only where discovery happens', () => {
  assert.equal(at('s3', 'connect').ownsDiscovery, true);
  assert.equal(at('s0', 'connect').ownsDiscovery, true);
  assert.equal(at('s3', 'observe').ownsDiscovery, false);
  assert.equal(at('s3', 'govern').ownsDiscovery, false);
  assert.equal(at('s3', 'cost').ownsDiscovery, false);
});

test('the telemetry window renders only where telemetry exists', () => {
  assert.equal(at('s3', 'observe').ownsTelemetry, true);
  assert.equal(at('s3', 'cost').ownsTelemetry, true);
  assert.equal(at('s3', 'connect').ownsTelemetry, false);
  assert.equal(at('s3', 'govern').ownsTelemetry, false);
  assert.equal(at('s0', 'connect').ownsTelemetry, false);
});

test('Govern carries neither bar', () => {
  const g = at('s3', 'govern');
  assert.equal(g.ownsDiscovery, false);
  assert.equal(g.ownsTelemetry, false);
});

// Review Focus 4: the bar is gated inside the title row, so the title row
// itself must survive on every tab that had one.
test('every tab keeps its heading row', () => {
  for (const tab of ['connect', 'observe', 'govern', 'cost']) {
    const v = at('s3', tab);
    assert.equal(v.showPageTitle, true, `${tab} lost its title row`);
    assert.ok(v.pageTitle, `${tab} lost its page title`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/first-level.test.mjs`
Expected: FAIL. `ownsDiscovery` is `undefined`, so `assert.equal(undefined, true)` throws.

- [ ] **Step 3: Write minimal implementation**

In `naas-app.js`, immediately after `const credsN = sched.accounts.length;` (line 1991):

```js
  // Discovery is a Discover task, not global chrome. The cadence, Re-discover
  // and Manage credentials belong where accounts are read. The telemetry
  // window belongs where telemetry exists. Govern owns neither, and carried
  // both: four controls on three pages that do not use them.
  const ownsDiscovery = s.screen === 's0' || (s.screen === 's3' && s.tab === 'connect');
  const ownsTelemetry = s.screen === 's3' && (s.tab === 'observe' || s.tab === 'cost');
```

Add `ownsDiscovery, ownsTelemetry,` to the object returned at `naas-app.js:2013`, beside `showPageTitle`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/first-level.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Gate the markup**

In `NaaS Storefront.dc.html`, wrap the cadence label, Re-discover, Manage credentials and the divider span (lines 259, 260, 261, 262) in one gate, and the date-range label (line 263) in another. Open before line 259 and close after line 262:

```html
<sc-if value="{{ ownsDiscovery }}" hint-placeholder-val="{{ true }}">
```

…the four existing elements, unchanged…

```html
</sc-if>
<sc-if value="{{ ownsTelemetry }}" hint-placeholder-val="{{ true }}">
```

…the existing date-range label, unchanged…

```html
</sc-if>
```

Move no other element. Change no attribute on the four existing lines.

- [ ] **Step 6: Move the census pin**

In `tests/markup.test.mjs`, above the census test, append to the comment block:

```js
// Task 1 (first level) gates the discovery bar and the telemetry window on the
// two pages that own them: two new sc-if wrappers around elements that already
// existed. Nothing else moves. sc-if 301 -> 303.
```

Change `['sc-if', /<sc-if\b/g, /<\/sc-if>/g, 301]` to `303`.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. If the census reports a number other than 303, the edit moved something it should not have; revert and redo step 5.

- [ ] **Step 8: Verify in the browser**

```bash
npx http-server . -p 8787 -c-1
```

Open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?estate=mature`, click Govern in the rail, and confirm the heading reads Govern with no cadence selector, no Re-discover, no Manage credentials and no date range. Confirm Observe still has the date range and no Re-discover. Confirm Discover still has Re-discover and no date range.

- [ ] **Step 9: Commit**

```bash
git add naas-app.js "NaaS Storefront.dc.html" tests/first-level.test.mjs tests/markup.test.mjs
git commit -m "discovery is a Discover task, not chrome on every page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Discover's three heavy sections become drills

**Files:**
- Modify: `naas-app.js:2000` (`defaults()`, add `openSec`)
- Modify: `naas-app.js:1991` (beside Task 1's additions)
- Modify: `naas-app.js:2013` (the returned value object)
- Modify: `NaaS Storefront.dc.html:974` (`sec-accounts`), `:1012` (`sec-gap`), `:1030` (`sec-paths`)
- Modify: `tests/markup.test.mjs`
- Modify: `tests/first-level.test.mjs`

**Interfaces:**
- Consumes: `ownsDiscovery` from Task 1 (the drill row renders only where it does), `est` and `sched` already in scope at `naas-app.js:1991`.
- Produces: `secAccountsOpen`, `secGapOpen`, `secPathsOpen` (booleans) and `drillRow` (array of `{ key, label, on, go }`) on the object returned by `vals()`. Task 4 gates `drillRow` on estate stage.

**Scope note:** this task delivers the drill row. Wiring the picture's unattached nodes as additional openers for `sec-gap` means editing the canvas SVG and is deliberately out of this plan.

- [ ] **Step 1: Write the failing test**

Append to `tests/first-level.test.mjs`:

```js
test('the three heavy Discover sections are closed at rest', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect' }));
  assert.equal(v.secAccountsOpen, false);
  assert.equal(v.secGapOpen, false);
  assert.equal(v.secPathsOpen, false);
});

test('the drill row offers one opener per closed section', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect' }));
  assert.deepEqual(v.drillRow.map(d => d.key), ['sec-accounts', 'sec-gap', 'sec-paths']);
  assert.equal(v.drillRow.every(d => d.on === false), true);
});

test('opening a section opens exactly that one', () => {
  const c = mkC({ screen: 's3', tab: 'connect' });
  vals(c).drillRow.find(d => d.key === 'sec-gap').go();
  const v = vals(c);
  assert.equal(v.secGapOpen, true);
  assert.equal(v.secAccountsOpen, false);
  assert.equal(v.secPathsOpen, false);
});

// Review Focus 2: one slot, so opening a second closes the first, and
// pressing the same opener twice returns the page to rest.
test('only one section is open at a time, and it closes again', () => {
  const c = mkC({ screen: 's3', tab: 'connect' });
  vals(c).drillRow.find(d => d.key === 'sec-gap').go();
  vals(c).drillRow.find(d => d.key === 'sec-paths').go();
  let v = vals(c);
  assert.equal(v.secGapOpen, false, 'the first section stayed open');
  assert.equal(v.secPathsOpen, true);
  v.drillRow.find(d => d.key === 'sec-paths').go();
  assert.equal(vals(c).secPathsOpen, false, 'a second press did not close it');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/first-level.test.mjs`
Expected: FAIL. `v.drillRow` is `undefined`, so `.map` throws `TypeError`.

- [ ] **Step 3: Write minimal implementation**

In `defaults()` at `naas-app.js:2000`, add `openSec: null,` beside `drill: []`.

In `naas-app.js`, immediately after Task 1's `ownsTelemetry` line:

```js
  // One slot, not three booleans: a section opens by claiming it, and the
  // page can only ever be one drill deep. Pressing the open one clears it.
  const openSec = s.openSec || null;
  const toggleSec = (id) => () => set({ openSec: openSec === id ? null : id });
  const secAccountsOpen = openSec === 'sec-accounts';
  const secGapOpen = openSec === 'sec-gap';
  const secPathsOpen = openSec === 'sec-paths';
  const offFabric = Math.max(0, est.regions - est.attachedRegions);
  const drillRow = [
    ['sec-accounts', `${credsN} ${credsN === 1 ? 'account' : 'accounts'}`],
    ['sec-gap', `${offFabric} off fabric`],
    ['sec-paths', 'Ways to connect'],
  ].map(([key, label]) => ({ key, label, on: openSec === key, go: toggleSec(key) }));
```

Add `secAccountsOpen, secGapOpen, secPathsOpen, drillRow,` to the returned object at `naas-app.js:2013`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/first-level.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Gate the three sections and add the drill row**

In `NaaS Storefront.dc.html`, wrap each section's existing outermost element in a gate, changing nothing inside:

- Before `<div id="sec-accounts"` (line 974): `<sc-if value="{{ secAccountsOpen }}" hint-placeholder-val="{{ false }}">`, and close after that div ends.
- Before `<div id="sec-gap"` (line 1012): `<sc-if value="{{ secGapOpen }}" hint-placeholder-val="{{ false }}">`, closed after that div ends.
- Before `<div id="sec-paths"` (line 1030): `<sc-if value="{{ secPathsOpen }}" hint-placeholder-val="{{ false }}">`, closed after that div ends.

Add the drill row immediately before the `sec-accounts` gate:

```html
<sc-if value="{{ ownsDiscovery }}" hint-placeholder-val="{{ true }}">
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px">
  <sc-for list="{{ drillRow }}" as="d" hint-placeholder-count="3"><button onClick="{{ d.go }}" aria-expanded="{{ d.on }}" style="height:32px;padding:0 14px;border:1px solid var(--border-secondary);border-radius:9999px;background:var(--bg-base);color:var(--text-heading);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap" style-hover="border-color:var(--border-active)">{{ d.label }}</button></sc-for>
</div>
</sc-if>
```

- [ ] **Step 6: Move the census pin**

Append to the comment block in `tests/markup.test.mjs`:

```js
// Task 2 (first level) closes Accounts, Off fabric and Ways to connect at rest
// behind three sc-ifs, and adds the drill row that opens them: one gate sc-if,
// one wrapper div, one sc-for, one button inside it. sc-if 303 -> 307,
// div 870 -> 871, sc-for 174 -> 175, button 252 -> 253.
```

Set `sc-if` to `307`, `div` to `871`, `sc-for` to `175`, `button` to `253`.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. A census mismatch means a gate landed on the wrong element; compare the reported number against the deltas in step 6 to find which.

- [ ] **Step 8: Measure the fold**

With the server running, capture Discover at rest and confirm it shrank:

```bash
node -e "const{chromium}=require('/Users/micahbos/Developer/Cloud_Designer/node_modules/playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://127.0.0.1:8787/NaaS%20Storefront.dc.html?estate=mature',{waitUntil:'networkidle'});await p.waitForTimeout(2500);console.log(await p.evaluate(()=>({h:document.body.scrollHeight,ctl:[...document.querySelectorAll('button,select,input,[role=button]')].filter(e=>{const b=e.getBoundingClientRect();return b.width>4&&b.height>4&&(b.left+scrollX)>250}).length})));await b.close()})()"
```

Baseline to beat: 58 controls, 2479px. Record the new numbers in the commit message.

- [ ] **Step 9: Commit**

```bash
git add naas-app.js "NaaS Storefront.dc.html" tests/first-level.test.mjs tests/markup.test.mjs
git commit -m "Discover keeps the picture and puts the rest one click away

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The rail collapses to five destinations

**Files:**
- Modify: `naas-app.js:1944` (`subNav`)
- Modify: `naas-app.js:1954-1986` (`railGroups`)
- Modify: `tests/first-level.test.mjs`

**Interfaces:**
- Consumes: `SECTIONS` at `naas-app.js:1915`, which **stays**. Its ids are still the scroll and open targets Task 2's drills use.
- Produces: `railGroups` with five `hasTitle` groups, each with `items: []`. `hasSubNav` is now always `false`.

This task changes no markup. The census does not move.

- [ ] **Step 1: Write the failing test**

Append to `tests/first-level.test.mjs`:

```js
test('the rail offers five destinations', () => {
  const groups = vals(mkC()).railGroups.filter(g => g.hasTitle);
  assert.deepEqual(groups.map(g => g.title), ['Discover', 'Observe', 'Govern', 'Cost', 'Explore 360']);
});

test('no category renders scroll anchors under it', () => {
  const v = vals(mkC());
  for (const g of v.railGroups.filter(x => x.hasTitle)) {
    assert.equal(g.items.length, 0, `${g.title} still lists ${g.items.length} anchors`);
  }
  assert.equal(v.hasSubNav, false, 'the nested sub-nav still renders');
});

test('Explore 360 reads as current on its own screen', () => {
  const on = vals(mkC({ screen: 's1' })).railGroups.find(g => g.title === 'Explore 360');
  assert.equal(on.titleCur, true);
  const off = vals(mkC({ screen: 's3', tab: 'connect' })).railGroups.find(g => g.title === 'Explore 360');
  assert.equal(off.titleCur, false);
});

// Review Focus 1: fifteen doors are being removed. Every id they pointed at
// must still be reachable, either as a rail destination or as a Task 2 drill.
test('every former rail anchor is still reachable', () => {
  const v = vals(mkC({ screen: 's3', tab: 'connect' }));
  const drills = new Set(v.drillRow.map(d => d.key));
  for (const id of ['sec-accounts', 'sec-gap', 'sec-paths']) {
    assert.equal(drills.has(id), true, `${id} has no door`);
  }
  const titles = new Set(v.railGroups.filter(g => g.hasTitle).map(g => g.title));
  assert.equal(titles.has('Explore 360'), true, 'Explore 360 lost its destination');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/first-level.test.mjs`
Expected: FAIL. The first test reports four titles, not five, and the second reports that Discover still lists five anchors.

- [ ] **Step 3: Write minimal implementation**

Replace the `subNav` assignment at `naas-app.js:1944` with:

```js
  // The rail stopped being a table of contents when the pages stopped needing
  // one. SECTIONS survives because its ids are the drill targets.
  const subNav = [];
```

In `railGroups` at `naas-app.js:1954`, change the `TABS.map` group body so `items` is `[]`, and append Explore 360 as a fifth title group after it:

```js
          ...TABS.map(([tab, title]) => {
            const here = onS3('cloud', tab) || (tab === 'connect' && (s.screen === 's0' || s.screen === 's1' || s.screen === 's2'));
            return { key: tab, hasTitle: true, title, titleGo: () => { goTabRow(tab)(); set(close); }, titleCur: here, items: [] };
          }),
          { key: 'explore', hasTitle: true, title: 'Explore 360', titleGo: () => { go('s1')(); set(close); }, titleCur: s.screen === 's1', items: [] },
```

The `here` expression for `connect` still includes `s.screen === 's1'`, which would mark Discover current on Explore 360's own screen. Remove `s.screen === 's1' ||` from that clause so exactly one destination reads current:

```js
            const here = onS3('cloud', tab) || (tab === 'connect' && (s.screen === 's0' || s.screen === 's2'));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/first-level.test.mjs`
Expected: PASS, 12 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, including `tests/markup.test.mjs` with its pins unchanged from Task 2. A census change here means markup was edited, which this task must not do.

- [ ] **Step 6: Verify in the browser**

Reload `?estate=mature` and count rail entries. Expect five titles, a home row and the collapse toggle, with no row below y=860 and no rail scrollbar.

- [ ] **Step 7: Commit**

```bash
git add naas-app.js tests/first-level.test.mjs
git commit -m "five doors, not fifteen anchors into four rooms

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The reveal ladder on Discover

**Files:**
- Modify: `naas-app.js:1991` (beside Tasks 1 and 2)
- Modify: `naas-app.js:2013`
- Modify: `NaaS Storefront.dc.html` (the `sec-fabric` block at `:329`, and Task 2's drill row)
- Modify: `tests/markup.test.mjs`
- Modify: `tests/first-level.test.mjs`

**Interfaces:**
- Consumes: `est` (`est.regions`, `est.clouds`, `est.stage`), `drillRow` from Task 2.
- Produces: `hasEstate: boolean`, and a `drillRow` filtered to openers whose subject exists.

- [ ] **Step 1: Write the failing test**

Append to `tests/first-level.test.mjs`:

```js
const onEstate = (view) => vals(mkC({ screen: 's3', tab: 'connect', view, estateParam: null }));

test('an empty estate has no picture to show', () => {
  assert.equal(onEstate('empty').hasEstate, false);
});

test('any estate with a region has a picture', () => {
  for (const view of ['small', 'partial', 'mature']) {
    assert.equal(onEstate(view).hasEstate, true, `${view} lost its picture`);
  }
});

// Review Focus 3: a drill to nothing is the defect this plan removes. An
// opener renders only when its subject has rows.
test('no opener survives over an empty subject', () => {
  const v = onEstate('empty');
  assert.deepEqual(v.drillRow.map(d => d.label), []);
});

test('a small estate offers only the openers that have something behind them', () => {
  const v = onEstate('small');
  const keys = v.drillRow.map(d => d.key);
  assert.equal(keys.includes('sec-accounts'), true, 'one credential is still an account');
  assert.equal(keys.includes('sec-paths'), true, 'unattached regions still need ways to connect');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/first-level.test.mjs`
Expected: FAIL. `hasEstate` is `undefined`, and the empty estate still returns three openers.

- [ ] **Step 3: Write minimal implementation**

Replace Task 2's `drillRow` definition with a filtered one, and add `hasEstate`, at `naas-app.js:1991`:

```js
  // A section appears when its subject exists. An opener over zero rows is a
  // live-looking control that cannot act, which is the whole defect.
  const hasEstate = est.regions > 0;
  const drillRow = [
    ['sec-accounts', `${credsN} ${credsN === 1 ? 'account' : 'accounts'}`, credsN > 0],
    ['sec-gap', `${offFabric} off fabric`, offFabric > 0],
    ['sec-paths', 'Ways to connect', offFabric > 0],
  ].filter(([, , live]) => live)
   .map(([key, label]) => ({ key, label, on: openSec === key, go: toggleSec(key) }));
```

Add `hasEstate,` to the returned object at `naas-app.js:2013`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/first-level.test.mjs`
Expected: PASS, 16 tests. Task 2's `drillRow.every(d => d.on === false)` test still passes on the default `mature` estate, which has all three openers live.

- [ ] **Step 5: Gate the picture**

In `NaaS Storefront.dc.html`, wrap the `sec-fabric` block at line 329 in `<sc-if value="{{ hasEstate }}" hint-placeholder-val="{{ true }}">`, closed after that div ends. On an empty estate the intake at `s0` already carries the fold, so nothing replaces it here.

- [ ] **Step 6: Move the census pin**

```js
// Task 4 (first level) hides the picture on an estate with no regions: one
// sc-if around sec-fabric. sc-if 307 -> 308.
```

Set `sc-if` to `308`.

- [ ] **Step 7: Run the whole suite and measure the empty fold**

Run: `npm test`
Then re-run the measurement from Task 2 step 8 against `?estate=empty`. Baseline to beat: 27 controls, 1765px, 19 above the fold and none able to act.

- [ ] **Step 8: Commit**

```bash
git add naas-app.js "NaaS Storefront.dc.html" tests/first-level.test.mjs tests/markup.test.mjs
git commit -m "a section appears when its subject exists

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The intake takes more than one cloud

**Files:**
- Modify: `naas-app.js:2000` (`defaults()`: replace `intakeProvider`)
- Modify: `naas-app.js:645` (the intake value block)
- Modify: `NaaS Storefront.dc.html:508-539` (the intake form)
- Modify: `tests/markup.test.mjs`
- Modify: `tests/first-level.test.mjs`

**Interfaces:**
- Consumes: `s.intakeSource`, `startScan` at `naas-app.js:645`.
- Produces: `intakeCreds` (array of `{ key, provider, auth, scope, remove }`), `addCred`, `canScan: boolean`. Replaces `intakeProvider` and `setProvider`.

- [ ] **Step 1: Write the failing test**

Append to `tests/first-level.test.mjs`:

```js
test('the intake starts with one credential row', () => {
  const v = vals(mkC({ screen: 's0', view: 'empty', estateParam: null }));
  assert.equal(v.intakeCreds.length, 1);
  assert.equal(v.intakeCreds[0].provider, 'AWS');
  assert.equal(v.canScan, true);
});

test('a customer can add a second and third cloud before scanning', () => {
  const c = mkC({ screen: 's0', view: 'empty', estateParam: null });
  vals(c).addCred();
  vals(c).addCred();
  assert.equal(vals(c).intakeCreds.length, 3);
});

test('removing a row leaves the others', () => {
  const c = mkC({ screen: 's0', view: 'empty', estateParam: null });
  vals(c).addCred();
  const first = vals(c).intakeCreds[0].key;
  vals(c).intakeCreds[0].remove();
  const left = vals(c).intakeCreds;
  assert.equal(left.length, 1);
  assert.equal(left.some(r => r.key === first), false);
});

// Review Focus 5: an empty list must not scan.
test('an empty credential list cannot scan', () => {
  const c = mkC({ screen: 's0', view: 'empty', estateParam: null });
  vals(c).intakeCreds[0].remove();
  const v = vals(c);
  assert.equal(v.intakeCreds.length, 0);
  assert.equal(v.canScan, false);
  v.startScan();
  assert.equal(c.state.screen, 's0', 'an empty intake started a scan');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/first-level.test.mjs`
Expected: FAIL. `v.intakeCreds` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `defaults()` at `naas-app.js:2000`, replace `intakeProvider: 'AWS',` with:

```js
    intakeCreds: [{ key: 'cred1', provider: 'AWS', auth: 'Cross-account role', scope: 'Read-only, all regions' }], credSeq: 1,
```

At `naas-app.js:645`, replace `intakeProvider: s.intakeProvider, setProvider: (e) => set({ intakeProvider: e.target.value }),` with:

```js
    intakeCreds: (s.intakeCreds || []).map((r, i) => ({
      ...r,
      setProvider: (e) => set({ intakeCreds: s.intakeCreds.map((x, j) => j === i ? { ...x, provider: e.target.value } : x) }),
      setAuth: (e) => set({ intakeCreds: s.intakeCreds.map((x, j) => j === i ? { ...x, auth: e.target.value } : x) }),
      setScope: (e) => set({ intakeCreds: s.intakeCreds.map((x, j) => j === i ? { ...x, scope: e.target.value } : x) }),
      remove: () => set({ intakeCreds: s.intakeCreds.filter((_, j) => j !== i) }),
    })),
    addCred: () => { const n = (s.credSeq || 1) + 1; set({ credSeq: n, intakeCreds: [...(s.intakeCreds || []), { key: 'cred' + n, provider: 'AWS', auth: 'Cross-account role', scope: 'Read-only, all regions' }] }); },
    canScan: (s.intakeCreds || []).length > 0,
    noCreds: (s.intakeCreds || []).length === 0,
```

Any row can be removed, including the last one, so Scan has to answer for an
empty list rather than be defended by a hidden Remove button.

Guard `startScan` in the same block so it returns early when the list is empty:

```js
    startScan: () => { if (!(s.intakeCreds || []).length) return; set({ view: 'partial', screen: 's1', scanStep: 0, cadenceAsk: true }); startScan(c); syncHash('s1'); },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/first-level.test.mjs`
Expected: PASS, 20 tests.

- [ ] **Step 5: Rebuild the intake form as a repeating row**

Note before editing: the Auth type and Scope `<select>`s at
`NaaS Storefront.dc.html:526` and `:529` have no `value` or `onChange` today.
They are decorative. This step binds them for the first time.

In `NaaS Storefront.dc.html`, replace the grid `div` and its three labels
(lines 521-531, inside the `srcCredential` gate) with this. The `<option>`
lists stay longhand, because `sc-for` does not render inside a `<select>`:

```html
          <sc-for list="{{ intakeCreds }}" as="cr" hint-placeholder-count="1">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:16px;align-items:end;margin-bottom:12px">
              <label style="display:grid;gap:6px;font-size:12px;font-weight:500;color:var(--text-light)">Provider
                <select value="{{ cr.provider }}" onChange="{{ cr.setProvider }}" style="height:40px;padding:0 10px;border:1px solid var(--border-secondary);border-radius:8px;background:var(--bg-base);color:var(--text-heading);font-size:14px"><option>AWS</option><option>Azure</option><option>Google Cloud</option><option>Oracle</option></select>
              </label>
              <label style="display:grid;gap:6px;font-size:12px;font-weight:500;color:var(--text-light)">Auth type
                <select value="{{ cr.auth }}" onChange="{{ cr.setAuth }}" style="height:40px;padding:0 10px;border:1px solid var(--border-secondary);border-radius:8px;background:var(--bg-base);color:var(--text-heading);font-size:14px"><option>Cross-account role</option><option>Service principal</option><option>Service account</option></select>
              </label>
              <label style="display:grid;gap:6px;font-size:12px;font-weight:500;color:var(--text-light)">Scope
                <select value="{{ cr.scope }}" onChange="{{ cr.setScope }}" style="height:40px;padding:0 10px;border:1px solid var(--border-secondary);border-radius:8px;background:var(--bg-base);color:var(--text-heading);font-size:14px"><option>Read-only, all regions</option><option>Read-only, selected regions</option></select>
              </label>
              <button type="button" onClick="{{ cr.remove }}" aria-label="Remove this credential" style="height:40px;padding:0 14px;border:1px solid var(--border-secondary);border-radius:8px;background:var(--bg-base);color:var(--text-body);font-size:14px;cursor:pointer;white-space:nowrap" style-hover="border-color:var(--border-active)">Remove</button>
            </div>
          </sc-for>
          <button type="button" onClick="{{ addCred }}" style="height:32px;padding:0 14px;border:1px solid var(--border-secondary);border-radius:9999px;background:var(--bg-base);color:var(--text-heading);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap" style-hover="border-color:var(--border-active)">+ Add another cloud</button>
```

Then gate the Scan button at line 538. Wrap the existing `<button>` and its
sibling note in `<sc-if value="{{ canScan }}" hint-placeholder-val="{{ true }}">`,
and add the empty case after it:

```html
          <sc-if value="{{ noCreds }}" hint-placeholder-val="{{ false }}"><span style="font-size:12px;color:var(--text-light)">Add a cloud credential to scan.</span></sc-if>
```

A Scan button over no credentials is a control that cannot act, which this
plan exists to remove; it does not get an exception for being the one we built.

- [ ] **Step 6: Move the census pin**

The replacement keeps one grid `div`, three `label`s and three `select`s, moving
them inside a new `sc-for`. It adds the Remove button, the Add button, the
`canScan` gate and the `noCreds` gate with its hint span.

```js
// Task 5 (first level) turns the one-cloud intake into a repeating credential
// row: one sc-for around the grid div that already existed, a Remove button
// per row and one Add another cloud button, and two gates on Scan - canScan
// over the button and noCreds over a hint span. sc-for 175 -> 176,
// button 253 -> 255, sc-if 308 -> 310, span 644 -> 645.
```

Set `sc-for` to `176`, `button` to `255`, `sc-if` to `310`, `span` to `645`.
`div` and `label` do not move. Run `npm test` before trusting these numbers: if
the reported count differs, the diff did more than this step describes.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`

- [ ] **Step 8: Walk the flow as a customer**

With the server running, open `?estate=empty#s0`. Add a second cloud, set it to Azure, remove the first row, confirm Scan still works and the scan completes. Reload and confirm the form returns to one row. Remove the only row and confirm the Scan button disappears and the hint reads "Add a cloud credential to scan." Add a cloud again and confirm Scan returns.

- [ ] **Step 9: Commit**

```bash
git add naas-app.js "NaaS Storefront.dc.html" tests/first-level.test.mjs tests/markup.test.mjs
git commit -m "a customer arrives with three clouds, not one

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done when

- `npm test` passes with the census pinned at its new numbers.
- Discover at `?estate=mature` is under 900px at rest, down from 2479px.
- Discover at `?estate=empty` renders no control that cannot act.
- The rail shows five destinations, none below y=860, with no scrollbar.
- Govern and Observe carry no discovery controls.

Observe, Govern and Cost get their own plans, each written after the page before it has been measured.

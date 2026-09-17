# Wave 2 — The drawer at any layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox syntax for tracking.

**Goal:** Make every level of all three hero columns addressable and listable, so the count in a column header is a door that opens the full list of exactly what the picture is sampling.

**Architecture:** One trail per column (`s.drill`, `s.fabDrill`, `s.cloudDrill`) is read live by both the canvas and the drawer; a new `levelHead`/`levelList` pair in `naas-volume.js` resolves any (column, trail) pair to a count and a row list, delegating to the two existing volume builders where they already work and reading the existing row producers everywhere else. The drill keys become stable and the rolled-up canvas rows become real nodes, so the number a user clicks is the number they land on.

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

**On the line numbers.** Every `path:line` in this plan was read off the tree at `04bbb1e`, before any task has run. Several steps insert lines, which moves everything below them in that file. So a number here is where to look, and the quoted text is what to match: if the line at the number is not the quoted line, search the file for the quoted text. Steps are ordered inside each task so that the inserting edit comes last wherever that was possible.

---

## File Structure

| File | The one thing it is responsible for in this wave |
|---|---|
| `naas-sites.js` | Stable identity for a rolled-up canvas row (`rollupKeyOf`), the display label for any drill key (`labelOfKey`), and the site count behind the gap rows (`gapSiteCount`) |
| `naas-connections.js` | Emitting the stable metro key on the drill row, resolving a rollup-group trail, and retitling the cloud climb row |
| `naas-volume.js` | `levelHead` (the count that cannot lie) and `levelList` (the rows behind it) for all three columns, plus an antisymmetric sort |
| `naas-addendum.js` | Memoised `inventory(est)` |
| `naas-app.js` | The `level` drawer scope, the three header doors, the three dead clicks, the breadcrumb, the gap count, the gated inventory tree |
| `NaaS Storefront.dc.html` | Three header door rows, the drawer crumb row, three capability gates, the band overflow button, the breadcrumb split |
| `tests/drill-keys.test.mjs` | Metro keys resolve the right node |
| `tests/rollup-nodes.test.mjs` | Rollup groups are addressable and their counts add up |
| `tests/level-head.test.mjs` | Every level's header count on `trust` and `partial` |
| `tests/level-list.test.mjs` | Every level's rows, doors and delegation |
| `tests/level-caps.test.mjs` | Capability gates and the VPC filter defect |
| `tests/markup.test.mjs` | Tag balance and required bindings in every edited HTML region |
| `tests/inventory-memo.test.mjs` | `inventory(est)` returns the same array for the same estate shape |
| `tests/gap-count.test.mjs` | "Not connected yet" counts sites, not rollup rows |
| `tests/drawer-sort.test.mjs` | The drawer comparator is antisymmetric and the order is total |

---

### Task 1: Stable metro keys in the drill

**Files:**
- Modify: `naas-connections.js:159`
- Modify: `naas-volume.js:23-27`
- Modify: `naas-app.js:286` (`crumbLabel`), `naas-app.js:422` (`sitesHead`), `naas-app.js:217` (the drawer pin write-back), `naas-app.js:485` (`levelMap` tile click)
- Modify: `naas-sites.js` (append `labelOfKey` after `accessOf`, currently the last export, line 142-151)
- Test: `tests/drill-keys.test.mjs`

**Interfaces:**
- Consumes: `S.siteTree(est)` metro children already carry `key: '<cls>:<ri>:<metro>'` (`naas-sites.js:99`); `siteDrillRows`'s resolver already accepts `ch.key === trail[1]` (`naas-connections.js:163`)
- Produces: `S.labelOfKey(est, key) -> string`; `siteDrillRows` rows now carry `drillKey` = the metro's stable key; `metroOf(est, cls, metroKeyOrName) -> node | null`

- [ ] **Step 1: Write the failing test**

Create `tests/drill-keys.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { siteDrillRows } from '../naas-connections.js';
import { metroOf } from '../naas-volume.js';

const est = D.ESTATES.trust;

test('the metro drill key is unique among siblings', () => {
  const rows = siteDrillRows(est, ['Branch']).rows;
  const keys = rows.map(r => r.drillKey);
  assert.equal(new Set(keys).size, keys.length, 'duplicate drillKey among 19 metros');
  assert.equal(new Set(rows.map(r => r.key)).size, rows.length, 'duplicate React key');
  assert.ok(keys.includes('Branch:2:Chicago'));
  assert.ok(keys.includes('Branch:1:Chicago'));
});

test('two metros of the same name resolve to different nodes', () => {
  const byKey = siteDrillRows(est, ['Branch', 'Branch:2:Chicago']);
  const byName = siteDrillRows(est, ['Branch', 'Chicago']);
  assert.match(byKey.rows.at(-1).name, /\+428 more/);   // the 434-site node
  assert.match(byName.rows.at(-1).name, /\+337 more/);  // the 343-site node
});

test('metroOf accepts a key and still accepts a name', () => {
  assert.equal(metroOf(est, 'Branch', 'Branch:2:Chicago').count, 434);
  assert.equal(metroOf(est, 'Branch', 'Chicago').count, 343);
  assert.equal(metroOf(est, 'Branch', 'Nowhere'), null);
});

test('labelOfKey never prints a key on screen', () => {
  assert.equal(S.labelOfKey(est, 'Branch:2:Chicago'), 'Chicago');
  assert.equal(S.labelOfKey(est, 'Branch'), 'Remote sites');
  assert.equal(S.labelOfKey(est, 'Data center:Dallas DC1'), 'Dallas DC1');
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `duplicate drillKey among 19 metros`, and `S.labelOfKey is not a function`.

- [ ] **Step 3: Add `labelOfKey` to `naas-sites.js`**

Append after `accessOf` (the file's last export, ends at line 151):

```js
/**
 * Display label for any drill key. The trail carries identity; the screen
 * carries names, so nothing ever prints "Branch:2:Chicago" at a user.
 * Handles a class key, a rollup-group key (Task 2) and a metro or site key.
 */
export function labelOfKey(est, key) {
  const k = String(key);
  if (CLASS[k]) return CLASS[k].label;
  const hash = k.indexOf('#');
  if (hash > 0) {
    const cls = k.slice(0, hash), ri = parseInt(k.slice(hash + 1), 10);
    const peers = (est && est.sites || []).filter(x => classOf(x) === cls && countOf(x.name) > 1);
    if (peers[ri]) return peers[ri].name.replace(/\s*\([\d,]+\)\s*$/, '');
    return (CLASS[cls] || {}).label || cls;
  }
  const parts = k.split(':');
  if (parts.length >= 3) return parts.slice(2).join(':');
  if (parts.length === 2) return parts[1];
  return k;
}
```

- [ ] **Step 4: Emit the stable key on the metro row**

`naas-connections.js:159` — replace `key: 'metro:' + ch.name` with `key: 'metro:' + ch.key` and `drillKey: ch.name` with `drillKey: ch.key`:

```js
      ? { key: 'metro:' + ch.key, name: `${ch.name} (${ch.count.toLocaleString('en-US')})`, access: `${ch.onFabric.toLocaleString('en-US')} of ${ch.count.toLocaleString('en-US')} on the fabric · ${ch.access}`, priv: ch.onFabric >= ch.count / 2, drillKey: ch.key, rollup: true, cursor: 'pointer' }
```

- [ ] **Step 5: Teach `metroOf` the key**

`naas-volume.js:23-27` — replace the doc comment and the whole function:

```js
/** Find the metro node for a class (or rollup-group key) and a metro key or name. */
export function metroOf(est, cls, metro) {
  const base = String(cls).split('#')[0];
  const c = S.siteTree(est).find(x => x.cls === base || x.label === base); if (!c) return null;
  return c.children.find(ch => ch.kind === 'metro' && (ch.key === metro || ch.name === metro)) || null;
}
```

The name branch stays: `naas-observe-dash.js:70` mints `vol:<cls>|<metro>` by name and `naas-app.js:1123` splits it back.

- [ ] **Step 6: Route the four display reads through the label**

`naas-app.js:286` — replace:

```js
  const crumbLabel = (d) => S.labelOfKey(est, d);
```

`naas-app.js:422` — inside `sitesHead`, replace `s.drill.map(k => (S.CLASS[k] || {}).label || String(k))` with `s.drill.map(k => S.labelOfKey(est, k))`.

`naas-app.js:217` — the pin write-back currently rebuilds the trail from `[vol.cls, vol.metro]`. `vol.metro` may now be a key, which is correct for the trail, so the only change is to keep the existing trail when one is already deeper:

```js
: () => set({ volPin: x.id, mapSel: 'asset:' + x.id, panelTab: 'overview', drill: s.drill.length >= 2 ? s.drill : [String(vol.cls).split('#')[0], (V.metroOf(est, vol.cls, vol.metro) || {}).key || vol.metro] }),
```

`naas-app.js:485` — the level-map tile click passes the display name as the drill key; pass the stable key:

```js
  if (drillInfo) return drillInfo.rows.map(r => tile({ key: r.key || r.name, name: r.name, sub: r.access, size: r.count, exposed: r.priv ? 0 : r.count, meta: `${r.access} · ${r.priv ? 'private' : 'public'}`, dot: r.priv ? 'var(--success)' : 'var(--warning)' }, r.rollup, r.drillKey || r.name));
```

- [ ] **Step 7: Run the test to verify it passes**  Run: `npm test`  Expected: 60 passing, 0 failing.

- [ ] **Step 8: Verify in the browser**  Serve with `npx http-server . -p 8787 -c-1`. Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust`, click **Remote sites** in the left column, then the **Chicago (434)** row. The SITES header must read `‹ Sites › Remote sites › Chicago` — never `Branch:2:Chicago`. The row list must end `+428 more in Chicago`. Go back and click **Chicago (343)**: `+337 more in Chicago`. Then repeat on `?view=partial`, where the Branch class has a single metro and the Data centers class has named sites (the header must read `Data centers › Dallas DC1`).

- [ ] **Step 9: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-sites.js naas-connections.js naas-volume.js naas-app.js tests/drill-keys.test.mjs
git commit -m "fix: a metro drill key is unique, so two Chicagos are two places

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Rollup rows become real, addressable nodes

**Files:**
- Modify: `naas-sites.js` (append `rollupKeyOf` beside `labelOfKey`)
- Modify: `naas-connections.js:148-175` (`siteDrillRows` resolves a group key)
- Modify: `naas-app.js:187` (the `heroSites` click computes the group key)
- Test: `tests/rollup-nodes.test.mjs`

**Interfaces:**
- Consumes: `S.labelOfKey(est, key)` from Task 1; metro keys `'<cls>:<ri>:<metro>'` where `ri` is the index of the rollup row within its class
- Produces: `S.rollupKeyOf(est, siteRow) -> '<cls>#<ri>' | null`; `siteDrillRows(est, ['<cls>#<ri>', ...])` returns only that group's metros

- [ ] **Step 1: Write the failing test**

Create `tests/rollup-nodes.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { siteDrillRows } from '../naas-connections.js';

const est = D.ESTATES.trust;
const rowNamed = (n) => est.sites.find(x => x.name === n);

test('every rolled-up canvas row has its own key', () => {
  assert.equal(S.rollupKeyOf(est, rowNamed('Regional hubs (24)')), 'Branch#0');
  assert.equal(S.rollupKeyOf(est, rowNamed('Remote sites, East (1,640)')), 'Branch#1');
  assert.equal(S.rollupKeyOf(est, rowNamed('Remote sites, Central (1,210)')), 'Branch#2');
  assert.equal(S.rollupKeyOf(est, rowNamed('Remote sites, West (1,180)')), 'Branch#3');
  assert.equal(S.rollupKeyOf(est, rowNamed('Data centers (6)')), 'Data center#0');
});

test('the count a user clicks is the count they land on', () => {
  const east = siteDrillRows(est, ['Branch#1']);
  const total = east.rows.reduce((a, r) => a + parseInt(r.name.replace(/.*\(([\d,]+)\).*/, '$1').replace(/,/g, ''), 10), 0);
  assert.equal(total, 1640);
  assert.equal(east.label, 'Remote sites, East');
  const cls = siteDrillRows(est, ['Branch']);
  assert.equal(cls.rows.length, 19);
  assert.equal(east.rows.length, 6);
});

test('a group trail still drills through to sites', () => {
  const east = siteDrillRows(est, ['Branch#1']);
  const first = east.rows[0];
  const sites = siteDrillRows(est, ['Branch#1', first.drillKey]);
  assert.equal(sites.level, 'site');
  assert.ok(sites.rows.length > 1);
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `S.rollupKeyOf is not a function`.

- [ ] **Step 3: Add `rollupKeyOf` to `naas-sites.js`**

Append immediately after `labelOfKey`:

```js
/**
 * The stable key for a rolled-up row of `est.sites`. The canvas draws East,
 * Central and West as three rows; `classOf` collapses all three into one
 * class, so without this a click on "Remote sites, East (1,640)" lands on
 * 4,054 sites. Null for a single named site, which is already addressable.
 */
export function rollupKeyOf(est, st) {
  if (!st || countOf(st.name) <= 1) return null;
  const cls = classOf(st);
  const peers = (est && est.sites || []).filter(x => classOf(x) === cls && countOf(x.name) > 1);
  const ri = peers.findIndex(x => x.name === st.name);
  return ri < 0 ? null : `${cls}#${ri}`;
}
```

- [ ] **Step 4: Resolve a group key in `siteDrillRows`**

`naas-connections.js:152-153` — replace the class lookup and its `if (!cls)` guard, and add the group narrowing:

```js
  const [clsKey, grpIx] = String(trail[0]).split('#');
  const cls = tree.find(c => c.cls === clsKey || c.label === clsKey);
  if (!cls) { const named = all.find(x => x.name === trail[0]); return named && trail.length === 1 ? pathsOfSite(est, named) : null; }
  const kids = grpIx == null ? cls.children : cls.children.filter(ch => String(ch.key).startsWith(`${cls.cls}:${grpIx}:`));
  const clsLabel = S.labelOfKey(est, trail[0]);
```

That replaces two lines with five, so everything below moves down three: the numbers that follow are the ones in the file *before* this step, and each edit is unambiguous by its text. Replace `cls.children` with `kids` at lines 158, 161 and 163, and `cls.label` with `clsLabel` at lines 161 and 171. After the edit those four lines read:

```js
    const rows = kids.map(ch => ch.kind === 'metro'
```
```js
    return { level: kids[0] && kids[0].kind === 'metro' ? 'metro' : 'site', label: clsLabel, rows };
```
```js
  const second = kids.find(ch => ch.name === trail[1] || ch.key === trail[1]);
```
```js
    return { level: 'site', label: `${clsLabel} · ${second.name}`, rows };
```

`naas-connections.js` already imports `* as S from './naas-sites.js'` at line 143.

- [ ] **Step 5: Emit the group key from the canvas click**

`naas-app.js:187` — in the `heroSites` `click` handler, replace:

```js
const key = st.drillKey || (S.countOf(st.name) > 1 || st.rollup ? S.classOf(st) : st.name);
```

with:

```js
const key = st.drillKey || S.rollupKeyOf(est, st) || (S.countOf(st.name) > 1 || st.rollup ? S.classOf(st) : st.name);
```

- [ ] **Step 6: Run the test to verify it passes**  Run: `npm test`  Expected: 63 passing, 0 failing.

- [ ] **Step 7: Verify in the browser**  On `?view=trust`, click **Remote sites, East (1,640)**. The SITES header must read `‹ Sites › Remote sites, East`, the column must show 6 metro rows, and their counts must sum to 1,640 — not the 19 metros of the whole class. Click **Remote sites, Central (1,210)** from Home and confirm a different set of metros. Then `?view=partial` (Branch has one rollup, Data centers are named) and `?view=mature`: the picture must still draw the same rows it drew before this task.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-sites.js naas-connections.js naas-app.js tests/rollup-nodes.test.mjs
git commit -m "fix: East, Central and West are three nodes, not one class

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `levelHead` — the count that cannot lie

**Files:**
- Modify: `naas-volume.js` (new imports at line 11-12, new exports appended after `workloadList`)
- Test: `tests/level-head.test.mjs`

**Interfaces:**
- Consumes: `metroOf(est, cls, metroKeyOrName)` (Task 1); `S.rollupKeyOf`, `S.labelOfKey` (Tasks 1-2); `C.siteDrillRows(est, trail)`, `C.regionDrillRows(est, inv, trail)`, `FB.fabricRows(est, inv, ob, trail)`
- Produces: `levelHead(est, inv, ob, col, trail, flat = false) -> { col, level, noun, total, title, sub, trail: string[] } | null`. `trail` is the crumb row and holds NAMES, never keys or ids.

- [ ] **Step 1: Write the failing test**

Create `tests/level-head.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { levelHead } from '../naas-volume.js';

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const head = (col, trail) => levelHead(est, inv, ob, col, trail);

test('the sites column counts what the drawer will hold', () => {
  assert.deepEqual(pick(head('sites', [])), { total: 7, noun: 'site groups' });
  assert.deepEqual(pick(head('sites', ['Branch'])), { total: 19, noun: 'metros' });
  assert.deepEqual(pick(head('sites', ['Branch#1'])), { total: 6, noun: 'metros' });
  assert.deepEqual(pick(head('sites', ['Branch', 'Branch:1:Atlanta'])), { total: 588, noun: 'remote sites' });
  const site = head('sites', ['Branch', 'Branch:1:Atlanta', 'RS-ATL-0100']);
  assert.equal(site.noun, 'paths');
});

test('the fabric column counts facilities, ports and circuits', () => {
  assert.deepEqual(pick(head('fabric', [])), { total: 4, noun: 'facilities' });
  assert.deepEqual(pick(head('fabric', ['fab'])), { total: 4, noun: 'facilities' });
  assert.deepEqual(pick(head('fabric', ['fab', 'N. Virginia'])), { total: 21, noun: 'ports' });
  const p = head('fabric', ['fab', 'N. Virginia']);
  assert.deepEqual(pick(head('fabric', ['fab', 'N. Virginia', 'port:us-east-1:1'])), { total: 3, noun: 'circuits' });
  assert.ok(p.trail.length === 2);
});

test('the clouds column never claims regions it does not have', () => {
  assert.deepEqual(pick(head('clouds', [])), { total: 6, noun: 'regions' });
  assert.deepEqual(pick(head('clouds', ['us-east-1'])), { total: 3, noun: 'VPCs' });
  assert.deepEqual(pick(head('clouds', ['us-east-1', 'vpc-0-0'])), { total: 6, noun: 'subnets' });
  assert.deepEqual(pick(head('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0'])), { total: 60, noun: 'workloads' });
});

test('partial proves depth is not level', () => {
  const p = D.ESTATES.partial;
  const pinv = A.inventory(p);
  const pob = A.observe(p, [], pinv);
  assert.equal(levelHead(p, pinv, pob, 'sites', ['Data center']).level, 'site');
  assert.equal(levelHead(p, pinv, pob, 'sites', ['Branch']).level, 'metro');
});

function pick(h) { return { total: h.total, noun: h.noun }; }
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `levelHead is not a function` (`SyntaxError`/`TypeError` from the import).

- [ ] **Step 3: Add the imports and the level vocabulary to `naas-volume.js`**

After line 12 (`import * as P from './naas-paths.js';`) add:

```js
import * as C from './naas-connections.js';
import * as FB from './naas-fabric.js';
```

`naas-connections.js` imports only `naas-paths.js` and `naas-sites.js`, and `naas-fabric.js` imports nothing, so there is no cycle.

Then append at the end of the file, after `workloadList` (its last export, which ends at line 155 before the two imports above push it to 157):

```js
// ---------- The drawer at any layer (2026-09-17) ----------
// One trail per column, read live. The count in the header is the door, the
// picture is the sample, and both are the same node.

const NOUN = {
  group: ['site group', 'site groups'],
  metro: ['metro', 'metros'],
  site: ['site', 'sites'],
  path: ['path', 'paths'],
  facility: ['facility', 'facilities'],
  port: ['port', 'ports'],
  circuit: ['circuit', 'circuits'],
  region: ['region', 'regions'],
  vpc: ['VPC', 'VPCs'],
  subnet: ['subnet', 'subnets'],
  workload: ['workload', 'workloads'],
};
const nounFor = (level, total) => { const pair = NOUN[level] || ['item', 'items']; return total === 1 ? pair[0] : pair[1]; };
const fabTrail = (trail) => (trail && trail.length ? trail : ['fab']);
const totalSites = (est) => (est.sites || []).reduce((a, x) => a + S.countOf(x.name), 0);
```

- [ ] **Step 4: Add `levelHead`**

Append after the vocabulary block:

```js
/**
 * The count behind a column's header door, and the words for it. Cheap: it
 * resolves the node, never the rows, so the three headers can ask on every
 * render. `levelList` asks the same question, so the number cannot drift.
 */
export function levelHead(est, inv, ob, col, trail = [], flat = false) {
  if (col === 'sites') return sitesHead(est, trail);
  if (col === 'fabric') return fabHead(est, inv, ob, trail);
  if (col === 'clouds') return cloudsHead(est, inv, trail, flat);
  return null;
}

/**
 * The crumb row over the drawer. Every hop is a NAME: the trail carries ids
 * (`Branch:2:Chicago`, `vpc-0-0`, `vpc-0-0-pub-0`) and not one of them may
 * reach a screen.
 */
function labels(est, inv, col, trail) {
  const root = col === 'sites' ? 'Sites' : col === 'fabric' ? 'AT&T fabric' : 'Clouds';
  if (col === 'sites') return [root, ...trail.map(k => S.labelOfKey(est, k))];
  if (col === 'fabric') return [root, ...fabTrail(trail).slice(1).map(k => String(k).replace(/^port:[^:]+:/, 'port '))];
  const out = [root];
  if (!trail.length) return out;
  const top = (est.regionsList || []).find(r => r.region === trail[0]);
  const reg = (inv || []).flatMap(c => c.regions).find(r => r.region === trail[0]);
  out.push(top ? `${top.cloud} ${top.region}` : String(trail[0]));
  const vpc = reg && trail[1] ? reg.vpcs.find(v => v.id === trail[1]) : null;
  if (trail.length > 1) out.push(vpc ? vpc.name : String(trail[1]));
  const sn = vpc && trail[2] ? vpc.subnets.find(x => x.id === trail[2]) : null;
  if (trail.length > 2) out.push(sn ? sn.name : String(trail[2]));
  return out;
}

function sitesHead(est, trail) {
  const tr = labels(est, null, 'sites', trail);
  if (!trail.length) {
    const total = (est.sites || []).length;
    return { col: 'sites', level: 'group', noun: nounFor('group', total), total, title: 'Sites', sub: `${n(total)} groups · ${n(totalSites(est))} sites`, trail: tr };
  }
  // Depth is not level: only a trail that STOPS on a metro node is the site
  // list. One hop deeper is that site's paths, which `siteDrillRows` answers.
  const m = trail.length === 2 ? metroOf(est, trail[0], trail[1]) : null;
  if (m) {
    const cls = S.CLASS[String(trail[0]).split('#')[0]] || S.CLASS.Branch;
    const noun = m.count === 1 ? cls.unit : cls.plural;
    return { col: 'sites', level: 'site', noun, total: m.count, title: m.name, sub: `${n(m.onFabric)} on the fabric · ${n(m.count - m.onFabric)} public`, trail: tr };
  }
  const info = C.siteDrillRows(est, trail);
  if (!info) return null;
  const rows = info.rows.filter(r => !r.more);
  return { col: 'sites', level: info.level, noun: nounFor(info.level, rows.length), total: rows.length, title: info.label, sub: `${n(rows.length)} ${nounFor(info.level, rows.length)}`, trail: tr };
}

function fabHead(est, inv, ob, trail) {
  const info = FB.fabricRows(est, inv, ob, fabTrail(trail));
  if (!info) return null;
  const total = info.rows.length;
  return { col: 'fabric', level: info.level, noun: nounFor(info.level, total), total, title: info.label, sub: info.head, trail: labels(est, inv, 'fabric', trail) };
}

function cloudsHead(est, inv, trail, flat = false) {
  const tr = labels(est, inv, 'clouds', trail);
  if (!trail.length) {
    const total = est.regionsList.length;
    const wl = est.regionsList.reduce((a, r) => a + (r.wl || 0), 0);
    return { col: 'clouds', level: 'region', noun: nounFor('region', total), total, title: 'Clouds', sub: `${n(total)} regions · ${n(wl)} workloads`, trail: tr };
  }
  const reg = inv.flatMap(c => c.regions).find(r => r.region === trail[0]);
  const top = est.regionsList.find(r => r.region === trail[0]);
  if (!reg || !top) return null;
  if (trail.length === 1) return { col: 'clouds', level: 'vpc', noun: nounFor('vpc', reg.vpcs.length), total: reg.vpcs.length, title: `${top.cloud} ${top.region}`, sub: `${n(reg.wl || 0)} workloads`, trail: tr };
  const vpc = reg.vpcs.find(v => v.id === trail[1]);
  if (!vpc) return null;
  if (trail.length === 2) {
    const wl = vpc.subnets.reduce((a, x) => a + (x.workloads || []).length, 0);
    // The flat door skips the subnets without moving the column, so the head
    // has to follow it or the drawer would count 6 and list 447.
    if (flat) return { col: 'clouds', level: 'workload', noun: nounFor('workload', wl), total: wl, title: vpc.name, sub: `every workload in ${vpc.name}`, trail: tr };
    return { col: 'clouds', level: 'subnet', noun: nounFor('subnet', vpc.subnets.length), total: vpc.subnets.length, title: vpc.name, sub: `${n(wl)} workloads in this VPC`, trail: tr };
  }
  const sn = vpc.subnets.find(x => x.id === trail[2]);
  if (!sn) return null;
  const wl = (sn.workloads || []).length;
  return { col: 'clouds', level: 'workload', noun: nounFor('workload', wl), total: wl, title: `${vpc.name} › ${sn.name}`, sub: `${sn.cidr} · ${sn.az}`, trail: tr };
}
```

- [ ] **Step 5: Run the test to verify it passes**  Run: `npm test`  Expected: 67 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**  No UI yet, so verify the module loads in the real page: open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust`, open the console, and confirm there is **no** red error banner at the top left and no module-resolution error (the new `naas-connections.js` / `naas-fabric.js` imports inside `naas-volume.js` are the risk). Repeat on `?view=empty`, which has no regions and no facilities.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-volume.js tests/level-head.test.mjs
git commit -m "feat: levelHead answers the count behind any column header

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `levelList` for the sites column

**Files:**
- Modify: `naas-volume.js` (append after `levelHead`'s helpers)
- Test: `tests/level-list.test.mjs`

**Interfaces:**
- Consumes: `levelHead(est, inv, ob, col, trail)`; `volumeList(est, {cls, metro}, opts)`
- Produces: `levelList(est, inv, ob, col, trail, opts = {}) -> { kind, col, level, noun, total, title, sub, searchHint, trail: string[], rows, counts, matching, shownCount, hasMore, flatDoor, selectedCount, matchingIds, bulk } | null`. A row carries `into` (the child's stable key) when it is a door and `null` when it is an asset. `kind` is `'level'` on a generic level and the delegate's own kind (`undefined` from `volumeList`, `'workloads'` from `workloadList`) on a delegated one.

- [ ] **Step 1: Write the failing test**

Create `tests/level-list.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { levelList, levelHead } from '../naas-volume.js';

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const list = (col, trail, opts) => levelList(est, inv, ob, col, trail, opts);

test('the sites root lists every group, each a door', () => {
  const lv = list('sites', []);
  assert.equal(lv.rows.length, 7);
  assert.equal(lv.total, 7);
  assert.ok(lv.rows.every(r => r.into), 'every group row is a door');
  assert.equal(lv.rows.find(r => /East/.test(r.id)).into, 'Branch#1');
});

test('a class lists all 19 metros, not the canvas six', () => {
  const lv = list('sites', ['Branch']);
  assert.equal(lv.rows.length, 19);
  assert.ok(lv.rows.every(r => r.into && r.into.startsWith('Branch:')));
  assert.ok(!lv.rows.some(r => /more/.test(r.id)), 'the overflow row is never a drawer row');
});

test('a metro delegates to volumeList and pages', () => {
  const lv = list('sites', ['Branch', 'Branch:1:Atlanta']);
  assert.equal(lv.total, 588);
  assert.equal(lv.shownCount, 60);
  assert.ok(lv.hasMore);
  assert.ok(lv.rows.every(r => !r.into), 'a site is an asset, not a door');
  assert.equal(list('sites', ['Branch', 'Branch:1:Atlanta'], { page: 2 }).shownCount, 120);
});

test('a group node lists only its own metros', () => {
  const lv = list('sites', ['Branch#1']);
  assert.equal(lv.rows.length, 6);
  assert.equal(lv.title, 'Remote sites, East');
});

test('the header count is the drawer count, at every sites level', () => {
  for (const trail of [[], ['Branch'], ['Branch#1'], ['Branch', 'Branch:1:Atlanta']]) {
    assert.equal(list('sites', trail).total, levelHead(est, inv, ob, 'sites', trail).total, JSON.stringify(trail));
  }
});

test('the drawer trail is the column trail plus its root', () => {
  assert.deepEqual(list('sites', ['Branch', 'Branch:1:Atlanta']).trail, ['Sites', 'Remote sites', 'Atlanta']);
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `levelList is not a function`.

- [ ] **Step 3: Add the frame helper and the sites branch**

Append to `naas-volume.js` after the `levelHead` helpers:

```js
/** Search, page and shape any generic level into the drawer's contract. */
function frame(head, rows, opts, extra = {}) {
  const q = (opts.q || '').trim().toLowerCase();
  const page = opts.page || 1, size = opts.size || 60;
  const hit = q ? rows.filter(r => `${r.id} ${r.sub}`.toLowerCase().includes(q)) : rows;
  const shown = hit.slice(0, page * size);
  return {
    kind: 'level', col: head.col, level: head.level, noun: head.noun, total: head.total,
    title: head.title, sub: head.sub, trail: head.trail, searchHint: `Search ${head.noun}`,
    counts: { total: rows.length }, matching: hit.length, shownCount: shown.length,
    hasMore: shown.length < hit.length, rows: shown,
    apps: [], flatDoor: null, selectedCount: 0, matchingIds: [],
    bulk: { attach: 0, label: '' },
    ...extra,
  };
}

const stateOfPriv = (priv) => (priv ? 'ok' : 'public');
const labelOfPriv = (priv) => (priv ? 'On the AT&T fabric' : 'Public first mile');

/**
 * The rows behind a column header's door, at any level of any column.
 * Delegates where a real volume builder already exists; generic everywhere
 * else, off the `level` string each row producer returns.
 */
export function levelList(est, inv, ob, col, trail = [], opts = {}) {
  if (col === 'sites') return sitesLevel(est, trail, opts);
  return null;
}

function sitesLevel(est, trail, opts) {
  const head = sitesHead(est, trail);
  if (!head) return null;
  if (!trail.length) {
    const rows = (est.sites || []).map((st) => {
      const c = S.countOf(st.name);
      return {
        id: String(st.name), into: S.rollupKeyOf(est, st) || (c > 1 ? S.classOf(st) : st.name),
        state: stateOfPriv(st.priv), stateLabel: labelOfPriv(st.priv),
        sub: `${st.access || 'first mile'} · ${n(c)} ${c === 1 ? 'site' : 'sites'}`, action: '',
      };
    });
    return frame(head, rows, opts);
  }
  // The same guard as `sitesHead`. And the delegate KEEPS its own `kind`: the
  // drawer's chip rows, search hint, pin and row action all branch on
  // `volList.kind`, so overwriting it here would hand a cloud workload the
  // site treatment. The scope kind lives on `s.vol`, not on the list.
  const m = trail.length === 2 ? metroOf(est, trail[0], trail[1]) : null;
  if (m) {
    const cls = String(trail[0]).split('#')[0];
    const v = volumeList(est, { cls, metro: trail[1] }, opts);
    if (!v) return null;
    return { ...v, col: 'sites', level: head.level, noun: head.noun, total: head.total, trail: head.trail, rows: v.rows.map(r => ({ ...r, into: null })) };
  }
  const info = C.siteDrillRows(est, trail);
  if (!info) return null;
  const rows = info.rows.filter(r => !r.more).map(r => ({
    id: r.name, into: r.leaf ? null : (r.drillKey || null),
    state: stateOfPriv(r.priv), stateLabel: labelOfPriv(r.priv),
    sub: r.access || '', action: r.priv ? '' : 'Attach',
  }));
  return frame(head, rows, opts);
}
```

- [ ] **Step 4: Run the test to verify it passes**  Run: `npm test`  Expected: 73 passing, 0 failing.

- [ ] **Step 5: Verify in the browser**  Still data-only. Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=trust`, then in the console run `(await import('./naas-volume.js')).levelList((await import('./naas-data.js')).ESTATES.trust, [], null, 'sites', ['Branch']).rows.length` and confirm `19`. Confirm the page itself still renders with no red banner on `?view=trust` and `?view=empty`.

- [ ] **Step 6: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-volume.js tests/level-list.test.mjs
git commit -m "feat: levelList holds the sites column at every level

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `levelList` for the fabric and clouds columns

**Files:**
- Modify: `naas-volume.js` (`levelList` dispatch, plus `fabricLevel` and `cloudsLevel`)
- Test: `tests/level-list.test.mjs` (append)

**Interfaces:**
- Consumes: `levelHead`, `frame`, `stateOfPriv`, `labelOfPriv` from Task 4; `workloadList(est, inv, scope, opts)`; `FB.fabricRows`; `C.regionDrillRows`
- Produces: `levelList(est, inv, ob, 'fabric'|'clouds', trail, opts)` with the same contract as the sites branch; a subnet row's `into` is its `snId`, a VPC row's `into` is its `vpcId`, a region row's `into` is its region name

- [ ] **Step 1: Write the failing test**

Append to `tests/level-list.test.mjs`:

```js
test('the fabric column opens facilities, ports and circuits', () => {
  assert.equal(list('fabric', []).rows.length, 4);
  assert.equal(list('fabric', ['fab']).rows[0].into, 'N. Virginia');
  const ports = list('fabric', ['fab', 'N. Virginia']);
  assert.equal(ports.rows.length, 21, 'all 21 ports, not the band eight');
  assert.ok(ports.rows.every(r => r.into && r.into.startsWith('port:')));
  const cx = list('fabric', ['fab', 'N. Virginia', 'port:us-east-1:1']);
  assert.equal(cx.rows.length, 3);
  assert.ok(cx.rows.every(r => !r.into), 'a circuit is a leaf');
});

test('the clouds root lists the regions it actually has', () => {
  const lv = list('clouds', []);
  assert.equal(lv.rows.length, 6);
  assert.equal(lv.total, 6, 'never 14: regionsExtra is not in the drawer');
  assert.equal(lv.rows[0].into, 'us-east-1');
});

test('a region lists its VPCs; a VPC delegates to workloadList', () => {
  const vpcs = list('clouds', ['us-east-1']);
  assert.equal(vpcs.rows.length, 3);
  assert.equal(vpcs.rows[0].into, 'vpc-0-0');
  const subnets = list('clouds', ['us-east-1', 'vpc-0-0']);
  assert.equal(subnets.rows.length, 6);
  assert.equal(subnets.rows[0].into, subnets.rows[0].snId);
  assert.ok(subnets.flatDoor, 'the flat door survives the delegation');
  const wl = list('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0']);
  assert.equal(wl.total, 60);
  assert.ok(wl.rows.every(r => !r.into));
  // The crumb row is names, never ids: the trail carries `vpc-0-0`, the
  // header must read `vpc-prod-01`.
  assert.deepEqual(wl.trail, ['Clouds', 'AWS us-east-1', 'vpc-prod-01', 'public-a']);
  assert.deepEqual(list('clouds', []).trail, ['Clouds']);
});

test('the flat door skips the subnets without moving the column', () => {
  const flat = list('clouds', ['us-east-1', 'vpc-0-0'], { flat: true });
  assert.equal(flat.level, 'workload');
  assert.equal(flat.total, 447);
});

test('the header count is the drawer count, on every column', () => {
  const cases = [['fabric', []], ['fabric', ['fab', 'N. Virginia']], ['clouds', []], ['clouds', ['us-east-1']], ['clouds', ['us-east-1', 'vpc-0-0']]];
  for (const [col, trail] of cases) {
    assert.equal(list(col, trail).total, levelHead(est, inv, ob, col, trail).total, `${col} ${trail}`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `Cannot read properties of null (reading 'rows')`, because `levelList` returns `null` for `fabric` and `clouds`.

- [ ] **Step 3: Dispatch the two columns**

In `naas-volume.js`, replace the body of `levelList`:

```js
export function levelList(est, inv, ob, col, trail = [], opts = {}) {
  if (col === 'sites') return sitesLevel(est, trail, opts);
  if (col === 'fabric') return fabricLevel(est, inv, ob, trail, opts);
  if (col === 'clouds') return cloudsLevel(est, inv, trail, opts);
  return null;
}
```

- [ ] **Step 4: Add `fabricLevel` and `cloudsLevel`**

Append after `sitesLevel`:

```js
const FAB_STATE = { degraded: ['degraded', 'Degraded'], saturating: ['public', 'Saturating'], ok: ['ok', 'Healthy'] };

function fabricLevel(est, inv, ob, trail, opts) {
  const head = fabHead(est, inv, ob, trail);
  if (!head) return null;
  const info = FB.fabricRows(est, inv, ob, fabTrail(trail));
  const rows = info.rows.map(r => {
    const [state, stateLabel] = FAB_STATE[r.state] || FAB_STATE.ok;
    return { id: r.name, into: r.leaf ? null : (r.drill || null), state, stateLabel, sub: r.sub || '', action: r.leaf ? 'Add circuit' : '' };
  });
  return frame(head, rows, opts);
}

function cloudsLevel(est, inv, trail, opts) {
  const head = cloudsHead(est, inv, trail, !!opts.flat);
  if (!head) return null;
  if (!trail.length) {
    const rows = est.regionsList.map(r => ({
      id: `${r.cloud} ${r.region}`, into: r.region,
      state: stateOfPriv(r.priv), stateLabel: r.priv ? 'On the AT&T fabric' : 'Public internet',
      sub: `${n(r.wl || 0)} ${r.wl === 1 ? 'workload' : 'workloads'} · ${r.ramp || 'no on-ramp'}`,
      action: r.priv ? '' : 'Attach',
    }));
    return frame(head, rows, opts);
  }
  if (trail.length === 1) {
    const info = C.regionDrillRows(est, inv, trail);
    if (!info) return null;
    const rows = info.rows.filter(r => r.child && !r.seeAll).map(r => ({
      id: r.region, into: r.drill || null,
      state: stateOfPriv(r.priv), stateLabel: r.priv ? 'Private' : 'Public',
      sub: r.sub || '', action: '',
    }));
    return frame(head, rows, opts);
  }
  const w = workloadList(est, inv, { region: trail[0], vpcId: trail[1], snId: trail[2] || null, flat: !!opts.flat }, opts);
  if (!w) return null;
  // `kind: 'workloads'` survives, for the same reason the sites delegation
  // keeps its own: the drawer's app chips, ip search hint, pin and Isolate
  // action all read `volList.kind`.
  return { ...w, col: 'clouds', level: head.level, noun: head.noun, total: head.total, trail: head.trail, rows: w.rows.map(r => ({ ...r, into: r.snId || null })) };
}
```

- [ ] **Step 5: Run the test to verify it passes**  Run: `npm test`  Expected: 78 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**  Data-only. Open `?view=trust` and confirm no red banner; open `?view=empty` (zero regions, zero facilities) and confirm `levelList` returning `null` does not throw — in the console, `(await import('./naas-volume.js')).levelList((await import('./naas-data.js')).ESTATES.empty, [], null, 'clouds', ['nope'])` must be `null`, not an exception.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-volume.js tests/level-list.test.mjs
git commit -m "feat: levelList holds the band and the cloud column too

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Capability gates, and the VPC filters that do nothing

**Files:**
- Modify: `naas-volume.js:62-108` (`workloadList` applies `q`, `path` and `state` at the VPC level; Task 3's two imports have pushed it to 64-110), plus `frame` and the two delegating branches to carry `caps`
- Test: `tests/level-caps.test.mjs`

**Interfaces:**
- Consumes: `frame(head, rows, opts, extra)`, `sitesLevel`, `cloudsLevel` from Tasks 4-5
- Produces: every `levelList` and `volumeList`/`workloadList` return gains `caps: { search: boolean, chips: boolean, bulk: boolean }`, all three false below 12 rows

- [ ] **Step 1: Write the failing test**

Create `tests/level-caps.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { levelList, workloadList } from '../naas-volume.js';

const est = D.ESTATES.trust;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);
const list = (col, trail, opts) => levelList(est, inv, ob, col, trail, opts);

test('a level with a handful of rows shows no search and no chips', () => {
  assert.deepEqual(list('sites', []).caps, { search: false, chips: false, bulk: false });
  assert.deepEqual(list('clouds', ['us-east-1']).caps, { search: false, chips: false, bulk: false });
  assert.deepEqual(list('clouds', ['us-east-1', 'vpc-0-0']).caps, { search: false, chips: false, bulk: false });
  assert.deepEqual(list('fabric', []).caps, { search: false, chips: false, bulk: false });
});

test('a level at volume earns search, chips and bulk', () => {
  assert.deepEqual(list('sites', ['Branch']).caps, { search: true, chips: false, bulk: false });
  assert.deepEqual(list('sites', ['Branch', 'Branch:1:Atlanta']).caps, { search: true, chips: true, bulk: true });
  assert.deepEqual(list('fabric', ['fab', 'N. Virginia']).caps, { search: true, chips: false, bulk: false });
  assert.deepEqual(list('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0']).caps, { search: true, chips: true, bulk: true });
});

test('the VPC level applies the filters it renders', () => {
  const scope = { region: 'us-east-1', vpcId: 'vpc-0-0' };
  const all = workloadList(est, inv, scope);
  assert.equal(all.rows.length, 6);
  assert.equal(workloadList(est, inv, scope, { q: 'public-a' }).rows.length, 1);
  const pub = workloadList(est, inv, scope, { state: 'exposed' });
  assert.ok(pub.rows.length < all.rows.length, 'the Exposed chip must filter the subnet list');
  assert.ok(pub.rows.every(r => r.state === 'public'));
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `Expected values to be deeply equal: undefined !== { search: false, ... }`, and the VPC-level filter test fails with `6 !== 1`.

- [ ] **Step 3: Add `capsFor` and wire it into `frame`**

In `naas-volume.js`, add beside `nounFor`:

```js
/** At a level with two children the drawer is a list of two. Threshold 12. */
const capsFor = (total, chips) => ({ search: total >= 12, chips: total >= 12 && !!chips, bulk: total >= 12 && !!chips });
```

In `frame`, add `caps: capsFor(rows.length, false),` immediately before the `...extra,` line.

In `sitesLevel`'s metro delegation, add `caps: capsFor(head.total, true),` to the returned object (after `trail: head.trail,`).

In `cloudsLevel`'s `workloadList` delegation, add `caps: capsFor(head.total, true),` in the same position.

- [ ] **Step 4: Apply the filters the VPC level already computes**

Inside `workloadList`, the `if (!sn && !scope.flat)` branch (`naas-volume.js:81-108` as the file shipped, two lines lower after Task 3) reads the `q`, `app` and `state` that `workloadList` computed at its top and never uses them. Replace the `const rows = vpc.subnets.map(...)` assignment and the `return` that follows with:

```js
    let rows = vpc.subnets.map(x => {
      const ws = x.workloads || [];
      const exp = ws.filter(y => y.exposed).length;
      return {
        id: x.name, snId: x.id, descend: true,
        state: x.pub ? 'public' : 'fabric',
        stateLabel: x.pub ? 'Public subnet' : 'Private subnet',
        sub: `${x.cidr} · ${x.az} · ${n(ws.length)} ${ws.length === 1 ? 'workload' : 'workloads'}${exp ? ` · ${exp} exposed` : ''}`,
        action: '', exposed: exp,
      };
    });
    if (q) rows = rows.filter(r => `${r.id} ${r.sub}`.toLowerCase().includes(q));
    if (app !== 'all') rows = rows.filter(r => (vpc.subnets.find(x => x.id === r.snId).workloads || []).some(w => (w.tag || 'untagged') === app));
    if (state === 'exposed') rows = rows.filter(r => r.exposed > 0);
    return {
      kind: 'workloads', level: 'subnets', apps: [],
      title: `${vpc.name} · ${n(vpc.subnets.length)} ${vpc.subnets.length === 1 ? 'subnet' : 'subnets'}`,
      sub: `${top.cloud} ${top.region} · ${n(totalWl)} workloads`,
      trail: [top.cloud, top.region, vpc.name],
      counts: { total: totalWl, exposed: totalExp, apps: totalApps },
      caps: capsFor(vpc.subnets.length, true),
      matching: rows.length, shownCount: rows.length, hasMore: false, rows,
      flatDoor: { label: `All ${n(totalWl)} workloads in this VPC`, sub: 'skip the subnets' },
      selectedCount: 0, matchingIds: [], bulk: { attach: 0, label: '' },
    };
```

Then add `caps: capsFor(counts.total, true),` to `workloadList`'s final return (after `counts, matching, shownCount, hasMore,`) and to `volumeList`'s return (after `counts,`).

- [ ] **Step 5: Run the test to verify it passes**  Run: `npm test`  Expected: 81 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**  On `?view=trust`, drill the right column to a region, then a VPC, and click **See all 447 workloads**. The drawer shows six subnet rows; type `public-a` into the search box — the list must narrow to one row (today it does nothing). Press the **Exposed** chip — only subnets with an exposed workload remain. Also check `?view=partial`, whose VPCs are smaller.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-volume.js tests/level-caps.test.mjs
git commit -m "fix: the VPC drawer applies the filters it renders, and small levels stop rendering controls

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Wire the `level` drawer scope into the app

**Files:**
- Modify: `naas-app.js:201-220` (the drawer block inside `vals()`, including `bulkAttach` at `:213` and the row map at `:217`)
- Modify: `naas-app.js:412` (the returned drawer values)

**Interfaces:**
- Consumes: `V.levelList(est, inv, ob, col, trail, opts)`, `V.levelHead(...)` from Tasks 3-6; `S.labelOfKey(est, key)` from Task 1
- Produces: `openLevel(col)`; `colTrail(col) -> string[]`, `setColTrail(col, next)`, `crumbCut(col, i) -> string[]`, `levelInto(col, into)`, `volCtx -> { region, vpcId, snId, cls, metro, metroLabel }`; `s.vol = { kind: 'level', col }` plus the scalar `s.volFlat`; `drawer.capSearch`, `drawer.capChips`, `drawer.capBulk`, `drawer.crumbs`, `drawer.hasCrumbs`, `drawer.canBack`, `drawer.back`, `drawer.rows[].isDoor` / `.descend`

The six edits below sit in one 20-line block and Step 1 inserts into the top of it, so apply them **bottom-up** — `:217` first, the insert after `:203` last — and every number below stays the number in the file.

- [ ] **Step 1: Add the column trail reader and `openLevel`**

`naas-app.js` — insert immediately after line 203 (`const volSlide = s.volSlide || 0;`):

```js
  // One trail per column, read live. The drawer no longer owns a path, so the
  // picture and the list are always on the same node by definition.
  const colTrail = (col) => col === 'sites' ? s.drill : col === 'clouds' ? cloudDrill : (s.fabDrill || []);
  const setColTrail = (col, next) => set(col === 'sites' ? { drill: next } : col === 'clouds' ? { cloudDrill: next } : { fabDrill: next });
  // The fabric trail carries its own root ('fab'); the other two do not, so
  // crumb i cuts one deeper on the band.
  const crumbCut = (col, i) => colTrail(col).slice(0, col === 'fabric' ? i + 1 : i);
  const openLevel = (col) => set({ vol: { kind: 'level', col }, volFlat: false, drawerOpen: true, andiOpen: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: (s.volSlide || 0) + 1 });
  // A level scope holds no ids of its own — the column trail IS the scope. The
  // row handlers below still need cls/metro/region/vpcId, so resolve them once
  // and never read `vol.cls` or `vol.region` again.
  const volCtx = (s.vol && s.vol.kind === 'level')
    ? (s.vol.col === 'clouds'
      ? { region: colTrail('clouds')[0], vpcId: colTrail('clouds')[1], snId: colTrail('clouds')[2] || null, cls: '', metro: '', metroLabel: '' }
      : { region: '', vpcId: '', cls: String(colTrail('sites')[0] || '').split('#')[0], metro: colTrail('sites')[1], metroLabel: S.labelOfKey(est, colTrail('sites')[1]) })
    : { ...(s.vol || {}), metroLabel: (s.vol && s.vol.metro) ? S.labelOfKey(est, s.vol.metro) : '' };
```

`cloudDrill` is defined at line 157 and `s.fabDrill` at line 223 is only a local alias of the same state key, so reading `s.fabDrill` here is safe and order-independent.

- [ ] **Step 2: Branch `volList` on the new kind**

`naas-app.js:204` — replace:

```js
  const volList = vol ? (vol.kind === 'level' ? V.levelList(est, inv, obAll, vol.col, colTrail(vol.col), { ...volOpts, flat: !!s.volFlat })
    : vol.kind === 'workloads' ? V.workloadList(est0, inv, vol, volOpts) : V.volumeList(est0, vol, volOpts)) : null;
```

- [ ] **Step 3: Make back and descend generic**

`naas-app.js:209-211` — replace `drawerInto` and `drawerBack`:

```js
  /** Slide in one level. For a level scope the COLUMN trail grows, so the picture drills with the drawer. */
  const drawerInto = (patch) => set({ vol: { ...(s.vol || {}), ...patch }, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: (s.volSlide || 0) + 1 });
  const levelInto = (col, into) => { setColTrail(col, [...colTrail(col), into]); set({ volFlat: false, volQ: '', volPath: 'all', volState: 'all', volPage: 1, volSel: [], volSlide: (s.volSlide || 0) + 1 }); };
  /** Climb back out one level: a slice, never a pair of hardcoded pops. */
  const drawerPath = () => { const v = s.vol || {}; return v.kind === 'level' ? colTrail(v.col) : [v.snId, s.volFlat || v.flat].filter(Boolean); };
  const drawerBack = () => {
    const v = s.vol || {};
    if (v.kind === 'level') {
      if (s.volFlat) { set({ volFlat: false, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }); return; }
      setColTrail(v.col, colTrail(v.col).slice(0, -1));
      set({ volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 });
      return;
    }
    if (v.flat) { set({ vol: { ...v, flat: false }, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }); return; }
    if (v.snId) { set({ vol: { ...v, snId: null }, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }); return; }
    closeVolume();
  };
```

`naas-app.js:212` — add `volFlat: false` to `closeVolume`:

```js
  const closeVolume = () => set({ vol: null, drawerOpen: false, volSel: [], volPin: null, volFlat: false });
```

- [ ] **Step 4: Bind the crumbs, the caps and the door rows**

`naas-app.js:214` — in the `drawer` object literal, replace `canBack: !!(vol && (vol.snId || vol.flat)),` with:

```js
canBack: drawerPath().length > 0, isLevel: vol && vol.kind === 'level',
capSearch: !!(volList.caps && volList.caps.search), capChips: !!(volList.caps && volList.caps.chips), capBulk: !!(volList.caps && volList.caps.bulk),
crumbs: (volList.trail || []).map((name, i, a) => ({ key: 'dc' + i, name, last: i === a.length - 1, notLast: i < a.length - 1, go: vol && vol.kind === 'level' ? () => { setColTrail(vol.col, crumbCut(vol.col, i)); set({ volFlat: false, volPage: 1, volQ: '', volSlide: volSlide + 1 }); } : () => {} })),
hasCrumbs: (volList.trail || []).length > 1,
```

`naas-app.js:214` — replace `searchHint: volList.kind === 'workloads' ? 'Search name, ip, type, app' : 'Search id, street, host',` with the list's own hint when it has one, so a port level stops asking for a street:

```js
searchHint: volList.searchHint || (volList.kind === 'workloads' ? 'Search name, ip, type, app' : 'Search id, street, host'),
```

`naas-app.js:214` — replace `goFlat: () => drawerInto({ flat: true, snId: null }),` with:

```js
goFlat: vol && vol.kind === 'level' ? () => set({ volFlat: true, volQ: '', volPath: 'all', volPage: 1, volSlide: volSlide + 1 }) : () => drawerInto({ flat: true, snId: null }),
```

`naas-app.js:217` — replace the two row fields that decide door versus asset:

```js
isDoor: !!(x.into || x.descend), notDoor: !(x.into || x.descend), descend: x.into ? () => levelInto(vol.col, x.into) : x.descend ? () => drawerInto({ snId: x.snId }) : () => {},
```

- [ ] **Step 5: Point the row handlers at the resolved scope**

Four handlers still read `vol.cls`, `vol.metro`, `vol.region` and `vol.vpcId`, which a level scope does not carry. Unfixed they write `wl:undefined|undefined|<id>` into `mapSel` and print `Branch:2:Chicago` into a compose order.

`naas-app.js:213` — replace `bulkAttach`:

```js
  const bulkAttach = () => { if (!volList) return; const cnt = volList.bulk.attach; const what = `${cnt.toLocaleString('en-US')} ${volList.rows[0] ? (S.CLASS[volCtx.cls] || S.CLASS.Branch).plural : 'sites'} in ${volCtx.metroLabel || volCtx.metro} on a public first mile`; c.setState({ screen: 's4', compose: { ...prefillCompose(est), bulk: what }, parsedNote: `Attach ${what}. One order, one policy, ${cnt.toLocaleString('en-US')} circuits.` }); syncHash('s4', s.layer, s.tab); };
```

`naas-app.js:217` — in the same `rows` map, replace the `pin` field:

```js
pin: volList.kind === 'workloads' ? () => set({ volPin: x.id, mapSel: `wl:${volCtx.region}|${volCtx.vpcId}|${x.id}`, panelTab: 'overview', andiScope: { kind: 'workload', id: x.id, label: `${x.id} · ${x.tag || 'untagged'}` } }) : () => set({ volPin: x.id, mapSel: 'asset:' + x.id, panelTab: 'overview', drill: s.drill.length >= 2 ? s.drill : [volCtx.cls, (V.metroOf(est, volCtx.cls, volCtx.metro) || {}).key || volCtx.metro] }),
```

`naas-app.js:217` — and in the workloads branch of `act`, replace `in ${vol.region}` with `in ${volCtx.region}`:

```js
act: volList.kind === 'workloads' ? () => { c.setState({ screen: 's4', compose: { ...prefillCompose(est), bulk: `${x.id} · ${x.tag || 'untagged'} · ${x.ip}` }, parsedNote: `Isolate ${x.id} (${x.ip}, ${x.tag || 'untagged'}) in ${volCtx.region}: bring it off the public path.` }); syncHash('s4', s.layer, s.tab); }
```

- [ ] **Step 6: Export `openLevel` for the header doors and the dead clicks**

`naas-app.js:412` — add `openLevel,` to the returned object, immediately after `drawer, drawerOpen,`.

- [ ] **Step 7: Run the tests**  Run: `npm test`  Expected: 81 passing, 0 failing (no data model changed).

- [ ] **Step 8: Verify in the browser**  On `?view=trust`, open the console and run `document.querySelector('[aria-label="Volume"]')` — null, no drawer yet. There is no UI hook for the level scope until Task 8, so assert two things. First, the page renders with no red banner. Second, every existing drawer still behaves exactly as before: click **Remote sites**, a metro, then the `+N more in <metro>` row, and confirm the drawer opens, pages, filters, selects and closes; press **Attach N** and confirm the compose alert names the metro in words (`in Chicago`, never `in Branch:2:Chicago`). Then open Observe, click a workload tile's **See what is running**, pin a workload row and confirm the map selects it. Repeat on `?view=mature`.

- [ ] **Step 9: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js
git commit -m "feat: the drawer reads the column trail, so back is a slice

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The drawer header grows crumbs, and its controls earn their place

**Files:**
- Modify: `NaaS Storefront.dc.html:1907` (the drawer header), `:1909` (search), `:1910` (chips), `:1911` (the Select all bar)
- Test: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `drawer.crumbs[].name` / `.go` / `.notLast`, `drawer.hasCrumbs`, `drawer.canBack`, `drawer.capSearch`, `drawer.capChips`, `drawer.capBulk` from Task 7
- Produces: no new values; the drawer renders the crumb row that `panel.trail` already renders at `html:1842`

- [ ] **Step 1: Write the failing test**

Create `tests/markup.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
export const LINES = HTML.split('\n');
// `<style>` holds CSS `url("data:image/svg+xml,<svg …/>")` and `<script>` holds
// selector strings; both carry angle brackets that are not markup.
const MARKUP = HTML.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
// Written without a closing tag in this file. Everything else, `<input>` and
// `<i>` included, is closed explicitly, which is what makes counting work.
const VOID = new Set(['meta', 'link', 'br', 'img', 'hr', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

function tally(src) {
  const open = {}, close = {};
  for (const m of src.matchAll(/<([a-zA-Z][\w-]*)(\s|>)/g)) open[m[1]] = (open[m[1]] || 0) + 1;
  for (const m of src.matchAll(/<\/([a-zA-Z][\w-]*)\s*>/g)) close[m[1]] = (close[m[1]] || 0) + 1;
  return { open, close };
}
function assertTallied(src, what) {
  const { open, close } = tally(src);
  for (const tag of new Set([...Object.keys(open), ...Object.keys(close)])) {
    if (VOID.has(tag)) continue;
    assert.equal(open[tag] || 0, close[tag] || 0, `${what}: <${tag}> opens ${open[tag] || 0} closes ${close[tag] || 0}`);
  }
}

/** A well-nested region, first line to last, inclusive. */
export function assertBalanced(from, to, what) {
  const seg = LINES.slice(from - 1, to).join('\n');
  assert.equal((seg.match(/\/>/g) || []).length, 0, `${what}: a self-closing tag breaks the count`);
  assertTallied(seg, what);
}

export function lineOf(marker) {
  const i = LINES.findIndex(l => l.includes(marker));
  assert.ok(i >= 0, `marker not found: ${marker}`);
  return i + 1;
}
/** A marker line down to the first line that is exactly its closing tag. */
export function block(marker, closeTag) {
  const from = lineOf(marker);
  for (let i = from; i < LINES.length; i++) if (LINES[i].trim() === closeTag) return [from, i + 1];
  assert.fail(`no ${closeTag} after ${marker}`);
}

test('the drawer header carries a crumb row and a generic back', () => {
  assert.ok(HTML.includes('{{ drawer.crumbs }}'), 'drawer.crumbs is bound');
  assert.ok(HTML.includes('{{ drawer.hasCrumbs }}'), 'drawer.hasCrumbs gates the row');
  const [from, to] = block('aria-label="Volume"', '</aside>');
  assertBalanced(from, to, 'the drawer');
});

test('search, chips and Select all are gated on capability', () => {
  assert.ok(HTML.includes('{{ drawer.capSearch }}'), 'search is gated');
  assert.ok(HTML.includes('{{ drawer.capChips }}'), 'the chip rows are gated');
  assert.ok(HTML.includes('{{ drawer.capBulk }}'), 'the Select all bar is gated');
});

test('every tag in the document balances', () => {
  assertTallied(MARKUP, 'the document');
});
```

The three regions this file checks — the drawer, the hero svg (Task 10) and the breadcrumb (Task 12) — and the whole-document tally are all green on the file as it stands today, so a failure after an edit is the edit.

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `drawer.crumbs is bound`.

- [ ] **Step 3: Add the crumb row to the drawer header**

`NaaS Storefront.dc.html:1907` — replace the whole line. The crumb renderer is copied from `panel.trail` at `html:1842`; the `<div style="min-width:0;flex:1">` wrapper gains exactly one child and nothing else changes:

```html
  <div style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--border-secondary)"><div style="min-width:0;flex:1"><sc-if value="{{ drawer.hasCrumbs }}" hint-placeholder-val="{{ true }}"><div class="fx-chips" style="font-size:11px;margin-bottom:4px"><sc-for list="{{ drawer.crumbs }}" as="dc" hint-placeholder-count="2"><button onClick="{{ dc.go }}" style="border:0;background:transparent;padding:0;font:inherit;font-size:11px;color:var(--link);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">{{ dc.name }}</button><sc-if value="{{ dc.notLast }}" hint-placeholder-val="{{ false }}"><span style="color:var(--text-disabled)">›</span></sc-if></sc-for></div></sc-if><sc-if value="{{ drawer.canBack }}" hint-placeholder-val="{{ false }}"><button onClick="{{ drawer.back }}" style="border:0;background:transparent;padding:0 0 4px;font:inherit;font-size:12px;font-weight:500;color:var(--link);cursor:pointer">‹ Back</button></sc-if><div style="font-size:15px;line-height:20px;font-weight:700;color:var(--text-heading);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ drawer.title }}</div><div style="font-size:12px;line-height:16px;color:var(--text-light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ drawer.sub }}</div></div><button onClick="{{ drawer.close }}" aria-label="Close" style="border:0;background:transparent;font-size:18px;line-height:1;color:var(--text-light);cursor:pointer;padding:2px">×</button></div>
```

- [ ] **Step 4: Gate the three controls**

`NaaS Storefront.dc.html:1909` — wrap the search label:

```html
    <sc-if value="{{ drawer.capSearch }}" hint-placeholder-val="{{ true }}"><label class="fx-search" style="width:100%"><span aria-hidden="true"></span><input value="{{ drawer.q }}" onChange="{{ drawer.setQ }}" placeholder="{{ drawer.searchHint }}" aria-label="Search the list"></input></label></sc-if>
```

`NaaS Storefront.dc.html:1910` — wrap the chip row:

```html
    <sc-if value="{{ drawer.capChips }}" hint-placeholder-val="{{ true }}"><div class="fx-chips"><sc-for list="{{ drawer.paths }}" as="pc" hint-placeholder-count="3"><button class="fx-chip" aria-pressed="{{ pc.on }}" onClick="{{ pc.go }}" style="cursor:pointer;background:{{ pc.bg }};color:{{ pc.color }};border-color:{{ pc.border }}">{{ pc.label }}</button></sc-for><sc-for list="{{ drawer.states }}" as="sc" hint-placeholder-count="2"><button class="fx-chip" aria-pressed="{{ sc.on }}" onClick="{{ sc.go }}" style="cursor:pointer;background:{{ sc.bg }};color:{{ sc.color }};border-color:{{ sc.border }}">{{ sc.label }}</button></sc-for></div></sc-if>
```

`NaaS Storefront.dc.html:1911` — wrap the Select all bar:

```html
    <sc-if value="{{ drawer.capBulk }}" hint-placeholder-val="{{ true }}"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;line-height:16px;color:var(--text-light)"><span>{{ drawer.matchingF }} matching · worst first</span><span style="display:flex;gap:8px"><button onClick="{{ drawer.selectAll }}" style="border:0;background:transparent;padding:0;font:inherit;font-size:12px;color:var(--link);cursor:pointer">Select all</button><sc-if value="{{ drawer.hasSel }}" hint-placeholder-val="{{ false }}"><button onClick="{{ drawer.clearSel }}" style="border:0;background:transparent;padding:0;font:inherit;font-size:12px;color:var(--link);cursor:pointer">Clear</button></sc-if></span></div></sc-if>
```

- [ ] **Step 5: Run the test to verify it passes**  Run: `npm test`  Expected: 84 passing, 0 failing.

- [ ] **Step 6: Verify in the browser**  Hard constraint 4: check a screen BELOW the edit. The only markup below the drawer is the **Andi dock** (`html:1937-1960`), so on `?view=trust` press **Ask Andi** in the header (`html:208`) and confirm the dock draws its lead line, its scope chip and its question list — and that with the drawer already open it sits beside it rather than under it. Then the drawer itself: drill to a metro, open `+N more in <metro>`. The header must show crumbs `Sites › Remote sites › <metro>`, a `‹ Back` button, search, chips and the Select all bar, and clicking `Remote sites` in the crumb row must climb both the drawer and the picture. Then open a VPC's subnet drawer (six rows) and confirm search, chips and Select all are all **gone**. Check `?view=partial` too.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add "NaaS Storefront.dc.html" tests/markup.test.mjs
git commit -m "feat: the drawer has crumbs, and small levels stop pretending to be searchable

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: The three header doors, as values

**Files:**
- Modify: `naas-app.js` (new block after line 227, `fabHead`), `naas-app.js:412-415` (the returned values)

**Interfaces:**
- Consumes: `V.levelHead(est, inv, obAll, col, trail)` (Task 3), `openLevel(col)` (Task 7), `L.sites`, `L.regions`, `fabRows`
- Produces: `sitesDoor`, `bandDoor`, `cloudsDoor`, each `{ has, label, title, color, gutter, open }`; `sitesDoorGutter` / `cloudsDoorGutter` / `bandDoorGutter` are inside the door object, one scalar each, because the dc-runtime cannot do arithmetic

- [ ] **Step 1: Write the door builder**

`naas-app.js` — insert immediately after line 229 (`const fabTrail = fabDrill.map(...)`):

```js
  // ---- the header door (2026-09-17): the count is the door ----
  // Unconditional, so the rule survives contact with every level. The number
  // is the one that fills the drawer, so the cloud root reads "All 6 regions".
  const nfmt = (x) => Number(x).toLocaleString('en-US');
  // `shown` is how many of them the canvas is drawing right now, or null when
  // the canvas is drawing none of them — a closed band is not "4 hidden".
  const doorFor = (col, shown, gutter) => {
    const h = V.levelHead(est, inv, obAll, col, colTrail(col));
    if (!h || !h.total) return { has: false, label: '', title: '', color: 'var(--text-light)', gutter, open: () => {} };
    const hidden = shown == null ? 0 : Math.max(0, h.total - shown);
    return {
      has: true,
      label: hidden ? `All ${nfmt(h.total)} ${h.noun} · ${nfmt(hidden)} hidden ›` : `All ${nfmt(h.total)} ${h.noun} ›`,
      title: `Open the list: ${h.title}`,
      color: hidden ? 'var(--link)' : 'var(--text-light)',
      gutter,
      open: () => openLevel(col),
    };
  };
  // The gutter lands each door 12px inside its column's card edge. SITES runs
  // x=24..484 over 200-wide cards ending at 224; CLOUDS runs x=980..(980+w)
  // over cards ending at 1220; the band door sits inside the band.
  // `seeAll` is a door, not a sampled child: counting it would report one
  // fewer hidden workload than the drawer holds.
  const sitesDoor = doorFor('sites', L.sites.filter(x => !x.more && !x.ghost).length, 272);
  const cloudsDoor = doorFor('clouds', L.regions.filter(x => !x.rollup && !x.other && !x.pinned && !x.ghost && !x.seeAll).length, cloudDrill.length ? 184 : 12);
  const bandDoor = doorFor('fabric', fabDrill.length ? fabRows.length : null, 12);
```

`V` is already imported at the top of `naas-app.js` as the `naas-volume.js` namespace (it is used at line 204).

- [ ] **Step 2: Return the three doors**

`naas-app.js:413` — the line that begins `fabOpen: fabDrill.length > 0, fabClosed: fabDrill.length === 0,`, which Step 1's insert has pushed down about twenty lines. Add `sitesDoor, bandDoor, cloudsDoor,` immediately after `fabClosed: fabDrill.length === 0,`.

- [ ] **Step 3: Write the failing test**

Append to `tests/level-head.test.mjs`:

```js
test('the door copy matches the design, level by level', () => {
  const copy = (col, trail, shown) => {
    const h = levelHead(est, inv, ob, col, trail);
    const hidden = Math.max(0, h.total - shown);
    return hidden ? `All ${h.total} ${h.noun} · ${hidden} hidden ›` : `All ${h.total} ${h.noun} ›`;
  };
  assert.equal(copy('sites', [], 7), 'All 7 site groups ›');
  assert.equal(copy('sites', ['Branch'], 6), 'All 19 metros · 13 hidden ›');
  assert.equal(copy('sites', ['Branch', 'Branch:1:Atlanta'], 6), 'All 588 remote sites · 582 hidden ›');
  assert.equal(copy('fabric', [], 4), 'All 4 facilities ›');
  assert.equal(copy('fabric', ['fab', 'N. Virginia'], 8), 'All 21 ports · 13 hidden ›');
  assert.equal(copy('clouds', [], 6), 'All 6 regions ›');
  assert.equal(copy('clouds', ['us-east-1'], 3), 'All 3 VPCs ›');
  assert.equal(copy('clouds', ['us-east-1', 'vpc-0-0'], 6), 'All 6 subnets ›');
  assert.equal(copy('clouds', ['us-east-1', 'vpc-0-0', 'vpc-0-0-pub-0'], 6), 'All 60 workloads · 54 hidden ›');
});
```

- [ ] **Step 4: Run the test**  Run: `npm test`  Expected: 85 passing, 0 failing. If a count differs, the estate moved — fix the expectation from the measured value, never the other way.

- [ ] **Step 5: Verify in the browser**  No markup yet, so verify the values exist and are shaped: on `?view=trust`, open the console and confirm the page renders with no red banner (a throw inside `doorFor` on any estate blanks the hero). Load all four estates — `?view=empty` in particular, where `levelHead` returns a zero total and the door must report `has: false` rather than throwing.

- [ ] **Step 6: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js tests/level-head.test.mjs
git commit -m "feat: the three column headers compute their door

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: The three header doors, as markup

**Files:**
- Modify: `NaaS Storefront.dc.html:336` (SITES), `:337` (CLOUDS), `:375` (the band)
- Test: `tests/markup.test.mjs` (append)

**Interfaces:**
- Consumes: `sitesDoor`, `bandDoor`, `cloudsDoor` from Task 9
- Produces: nothing new

- [ ] **Step 1: Write the failing test**

Append to `tests/markup.test.mjs`:

```js
test('each of the three column headers carries a door', () => {
  for (const b of ['{{ sitesDoor.has }}', '{{ sitesDoor.open }}', '{{ sitesDoor.label }}',
                   '{{ cloudsDoor.has }}', '{{ cloudsDoor.open }}', '{{ cloudsDoor.label }}',
                   '{{ bandDoor.has }}', '{{ bandDoor.open }}', '{{ bandDoor.label }}']) {
    assert.ok(HTML.includes(b), `${b} is bound`);
  }
});

test('the hero svg still balances after the header edits', () => {
  const [from, to] = block('aria-label="Fabric picture"', '</svg>');
  assertBalanced(from, to, 'the hero svg');
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `{{ sitesDoor.has }} is bound`.

- [ ] **Step 3: Rebuild the SITES header as a flex row**

`NaaS Storefront.dc.html:336` — replace the whole line:

```html
  <foreignObject x="24" y="0" width="460" height="18"><div style="display:flex;align-items:center;gap:8px;height:18px"><button onClick="{{ sitesUp }}" title="Up one level" style="flex:1;min-width:0;border:0;background:transparent;padding:0;margin:0;text-align:left;color:{{ sitesHeadColor }};font-size:11px;line-height:18px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:inherit">{{ sitesHead }}</button><sc-if value="{{ sitesDoor.has }}" hint-placeholder-val="{{ true }}"><button onClick="{{ sitesDoor.open }}" title="{{ sitesDoor.title }}" style="flex:none;margin-right:{{ sitesDoor.gutter }}px;border:0;background:transparent;padding:0;color:{{ sitesDoor.color }};font-size:11px;line-height:18px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit">{{ sitesDoor.label }}</button></sc-if></div></foreignObject>
```

- [ ] **Step 4: Rebuild the CLOUDS header as a flex row**

`NaaS Storefront.dc.html:337` — replace the whole line:

```html
  <foreignObject x="980" y="0" width="{{ cloudsHeadW }}" height="18"><div style="display:flex;align-items:center;gap:8px;height:18px"><button onClick="{{ cloudsUp }}" title="{{ cloudsHead }}" style="flex:1;min-width:0;border:0;background:transparent;padding:0;margin:0;text-align:left;color:{{ cloudsHeadColor }};font-size:{{ cloudsHeadSize }};line-height:18px;letter-spacing:{{ cloudsHeadTrack }};text-transform:{{ cloudsHeadCase }};font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:inherit">{{ cloudsHead }}</button><sc-if value="{{ cloudsDoor.has }}" hint-placeholder-val="{{ true }}"><button onClick="{{ cloudsDoor.open }}" title="{{ cloudsDoor.title }}" style="flex:none;margin-right:{{ cloudsDoor.gutter }}px;border:0;background:transparent;padding:0;color:{{ cloudsDoor.color }};font-size:11px;line-height:18px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit">{{ cloudsDoor.label }}</button></sc-if></div></foreignObject>
```

- [ ] **Step 5: Rebuild the band header as a flex row**

`NaaS Storefront.dc.html:375` — replace the whole line. The band label keeps its centre by taking `flex:1` with `text-align:center`:

```html
    <foreignObject x="{{ bandLabelX }}" y="0" width="{{ bandW }}" height="18"><div style="display:flex;align-items:center;gap:8px;height:18px"><button onClick="{{ toggleBand }}" aria-label="Expand the fabric band" style="flex:1;min-width:0;border:0;background:transparent;padding:0;color:var(--link);font-size:11px;line-height:18px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;text-align:center;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:inherit">{{ bandLabel }}</button><sc-if value="{{ bandDoor.has }}" hint-placeholder-val="{{ true }}"><button onClick="{{ bandDoor.open }}" title="{{ bandDoor.title }}" style="flex:none;margin-right:{{ bandDoor.gutter }}px;border:0;background:transparent;padding:0;color:{{ bandDoor.color }};font-size:11px;line-height:18px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit">{{ bandDoor.label }}</button></sc-if></div></foreignObject>
```

- [ ] **Step 6: Run the test to verify it passes**  Run: `npm test`  Expected: 87 passing, 0 failing.

- [ ] **Step 7: Verify in the browser**  At 1440x900 on `?view=trust`:
  - Home reads `SITES … All 7 site groups ›` on the left, `AT&T FABRIC … All 4 facilities ›` in the band, `CLOUDS … All 6 regions ›` on the right — **not** 14.
  - Click **Remote sites** → the SITES door reads `All 19 metros · 13 hidden ›` in accent; clicking it opens the drawer with 19 rows, each a door, and clicking a row drills the picture behind it.
  - Drill a metro → `All 588 remote sites · 582 hidden ›`; open it, page it, `‹ Back` returns to the metro list and the picture climbs with it.
  - Open the band → `All 21 ports · 13 hidden ›`.
  - Drill the right column to a subnet → `All 60 workloads · 54 hidden ›`.
  - Confirm no page scroll on Home and no door within 10px of a card edge (measure with `getBoundingClientRect()` on the door button and the adjacent card rect).
  - Screenshot a screen BELOW the edit: load Observe and Cost and confirm both still draw.
  - Repeat the header read on `?view=empty`, `?view=partial` and `?view=mature`.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add "NaaS Storefront.dc.html" tests/markup.test.mjs
git commit -m "feat: the count in every column header is a door

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: The three dead clicks, and the climb row that looks like an overflow row

**Files:**
- Modify: `naas-app.js:187` (the metro overflow row), `:188` (the `+8 regions` rollup and the `other` climb), `:227` (`fabMore` copy)
- Modify: `naas-connections.js:198-199` (the climb row's title)
- Modify: `NaaS Storefront.dc.html:401` (the band overflow div becomes a button)
- Test: `tests/rollup-nodes.test.mjs` (append), `tests/markup.test.mjs` (append)

**Interfaces:**
- Consumes: `openLevel(col)` (Task 7)
- Produces: `regionDrillRows`'s climb row reads `Back to N regions` and carries `toRoot: true`

- [ ] **Step 1: Write the failing test**

Append to `tests/rollup-nodes.test.mjs`:

```js
import * as A from '../naas-addendum.js';
import { regionDrillRows } from '../naas-connections.js';

test('the climb row stops looking like an overflow row', () => {
  const inv = A.inventory(est);
  const rows = regionDrillRows(est, inv, ['us-east-1']).rows;
  const climb = rows.find(r => r.other);
  assert.equal(climb.region, 'Back to 6 regions');
  assert.equal(climb.toRoot, true);
  assert.ok(!/\+/.test(climb.region), 'no plus sign: it climbs, it does not overflow');
});
```

Append to `tests/markup.test.mjs`:

```js
test('the band overflow row is a button, not a dead div', () => {
  const line = LINES.find(l => l.includes('{{ fabMore }}'));
  assert.ok(/<button/.test(line), 'the +N more ports row must be clickable');
  assert.ok(line.includes('{{ openBandLevel }}'));
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `'+13 other regions' !== 'Back to 6 regions'` (trust has 6 listed regions and `regionsExtra: 8`, so the climb row counts 13 today) and `the +N more ports row must be clickable`.

- [ ] **Step 3: Retitle the climb row**

`naas-connections.js:198-199` — replace both lines:

```js
  const others = est.regionsList.length - 1 + (est.regionsExtra || 0);
  const rows = [pinned, ...children, ...(others > 0 ? [{ cloud: '', region: `Back to ${est.regionsList.length} regions`, rollup: true, other: true, toRoot: true, wl: 0, priv: false }] : [])];
```

- [ ] **Step 4: Route the metro overflow row**

`naas-app.js:187` — in the `heroSites` `click` handler, replace:

```js
if (st.more) { if (s.drill.length >= 2) openVolume(s.drill[0], s.drill[1]); return; }
```

with:

```js
if (st.more) { openLevel('sites'); return; }
```

- [ ] **Step 5: Route the `+N regions` rollup and the climb row**

`naas-app.js:188` — in the `heroRegions` `click` handler, replace:

```js
if (r.other || r.pinned) { set({ cloudDrill: cloudDrill.slice(0, -1) }); return; }
if (r.rollup) return;
```

with:

```js
if (r.toRoot) { set({ cloudDrill: [] }); return; }
if (r.pinned) { set({ cloudDrill: cloudDrill.slice(0, -1) }); return; }
if (r.rollup) { openLevel('clouds'); return; }
```

The order matters: the climb row carries both `other` and `rollup`, so `toRoot` must be tested first.

And on the same line, the `+8 regions` row has no caret today, so the new door is invisible. Replace:

```js
caret: r.seeAll ? '›' : r.ghost || r.rollup || r.other ? (r.other ? '‹' : '') : (r.pinned ? '‹' : r.leaf ? '' : '›'),
```

with:

```js
caret: r.seeAll ? '›' : r.ghost || r.rollup || r.other ? (r.other ? '‹' : r.rollup ? '›' : '') : (r.pinned ? '‹' : r.leaf ? '' : '›'),
```

- [ ] **Step 6: Make the band overflow row a button**

`naas-app.js:227` — give the overflow row its verb:

```js
  const fabHead = fabInfo ? { label: fabInfo.label, head: fabInfo.head, more: fabInfo.rows.length > 8 ? `+${fabInfo.rows.length - 8} more · open the list ›` : '', x: L.bandX + 12, w: L.bandW - 24, moreY: L.bandY + 40 + 8 * 32 } : null;
```

`naas-app.js:413` — add `openBandLevel: () => openLevel('fabric'),` immediately after `fabMore: fabHead ? fabHead.more : '',`.

`NaaS Storefront.dc.html:401` — replace the whole line:

```html
      <sc-if value="{{ hasFabMore }}" hint-placeholder-val="{{ false }}"><foreignObject x="{{ fabHead.x }}" y="{{ fabHead.moreY }}" width="{{ fabHead.w }}" height="16"><button onClick="{{ openBandLevel }}" style="display:block;width:100%;border:0;background:transparent;padding:0;font:inherit;font-size:10px;line-height:16px;color:var(--link);text-align:center;cursor:pointer">{{ fabMore }}</button></foreignObject></sc-if>
```

- [ ] **Step 7: Give the metro overflow row the same sub**

`naas-connections.js:170` — replace `access: 'open the drawer ›'` with `access: 'open the list ›'` so both overflow rows read alike.

- [ ] **Step 8: Run the test to verify it passes**  Run: `npm test`  Expected: 89 passing, 0 failing.

- [ ] **Step 9: Verify in the browser**  On `?view=trust`:
  - Home, right column: click **+8 regions** — the drawer opens with 6 region rows (today the click does nothing).
  - Left column: **Remote sites** → click the `+13 more` row — the drawer opens with 19 metros (today nothing below drill depth 2).
  - Open the band, drill to **N. Virginia** → click the `+13 more · open the list ›` row under the eight ports — the drawer opens with 21 ports.
  - Drill the right column into a region and confirm the last row reads `‹ Back to 6 regions` and returns to the six-region root in one click.
  - Screenshot Observe (below the band edit) and confirm it still draws.
  - Repeat on `?view=mature`, which has a different `regionsExtra`.

- [ ] **Step 10: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js naas-connections.js "NaaS Storefront.dc.html" tests/rollup-nodes.test.mjs tests/markup.test.mjs
git commit -m "fix: every +N row is a door, and the climb row says it climbs

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: The breadcrumb above the card

**Files:**
- Modify: `naas-app.js:287` (`crumbs`), `:422` (add `cloudCrumbs`, `hasCloudCrumbs`)
- Modify: `NaaS Storefront.dc.html:299-302`
- Test: `tests/markup.test.mjs` (append)

**Interfaces:**
- Consumes: `crumbLabel` (Task 1), `regionDrill.crumb`
- Produces: `crumbs` (the site path only, starting at Home, each with `notLast`), `cloudCrumbs` (the cloud path, correctly indexed, each with `notLast`), `hasCloudCrumbs`

The layer label goes, it is not gated. `showCrumbs` (`naas-app.js:422`) is `s.drill.length > 0 || cloudDrill.length > 0`, so the nav renders only when a column is drilled — which is exactly when `Network services` is a false deepest node. There is no state in which it is the right last crumb, so gating it would only hide dead markup.

- [ ] **Step 1: Write the failing test**

Append to `tests/markup.test.mjs`:

```js
test('the breadcrumb keeps the two columns apart', () => {
  assert.ok(HTML.includes('{{ cloudCrumbs }}'), 'the cloud trail is its own row');
  assert.ok(HTML.includes('{{ hasCloudCrumbs }}'));
  assert.ok(HTML.includes('{{ cc.notLast }}') && HTML.includes('{{ cr.notLast }}'), 'no dangling caret on either trail');
  assert.ok(!HTML.includes('{{ layerLabel }}'), 'the layer label is not a crumb at all');
  assertBalanced(lineOf('<!-- ===== S3 header: breadcrumb'), lineOf('<!-- ===== S2 LAUNCH POINTS') - 1, 'the breadcrumb');
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `the cloud trail is its own row`.

- [ ] **Step 3: Split the trails and fix the cloud indexing**

`naas-app.js:287` — replace the line. `cloudCrumbs` is declared first because the site trail reads nothing from it and the markup renders them in order:

```js
  // The cloud crumb starts at the cloud name; the cloud drill starts at the
  // region. Index i of the crumb is depth i of the drill, so "AWS" clears it.
  const cloudCrumbs = ((regionDrill && regionDrill.crumb) || cloudDrill).map((name, i, a) => ({ key: 'c' + i, label: name, notLast: i < a.length - 1, go: () => set({ cloudDrill: cloudDrill.slice(0, i) }) }));
  const crumbs = [{ key: 'floor', label: 'Home', go: go('s3', { layer: 'cloud', tab: 'connect', drill: [], cloudDrill: [] }) }, ...s.drill.map((d, i) => ({ key: 'd' + i, label: crumbLabel(d), go: () => set({ drill: s.drill.slice(0, i + 1) }) }))].map((c, i, a) => ({ ...c, notLast: i < a.length - 1 }));
```

- [ ] **Step 4: Return the cloud trail**

`naas-app.js:422` — add `cloudCrumbs, hasCloudCrumbs: cloudCrumbs.length > 0,` immediately after `crumbs, verbTabs,`.

- [ ] **Step 5: Render two trails, not one, and drop the layer label**

`NaaS Storefront.dc.html:299-302` — replace those four lines with four. The `·` joins the two trails, so neither trail ends in a dangling `›`:

```html
  <sc-for list="{{ crumbs }}" as="cr" hint-placeholder-count="2">
    <span style="display:flex;align-items:center;gap:8px"><button onClick="{{ cr.go }}" style="border:0;background:transparent;padding:0;color:var(--link);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap">{{ cr.label }}</button><sc-if value="{{ cr.notLast }}" hint-placeholder-val="{{ true }}"><span style="color:var(--text-disabled)">›</span></sc-if></span>
  </sc-for>
  <sc-if value="{{ hasCloudCrumbs }}" hint-placeholder-val="{{ false }}"><span style="display:flex;align-items:center;gap:8px"><span style="color:var(--text-disabled)">·</span><sc-for list="{{ cloudCrumbs }}" as="cc" hint-placeholder-count="2"><button onClick="{{ cc.go }}" style="border:0;background:transparent;padding:0;color:var(--link);font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap">{{ cc.label }}</button><sc-if value="{{ cc.notLast }}" hint-placeholder-val="{{ false }}"><span style="color:var(--text-disabled)">›</span></sc-if></sc-for></span></sc-if>
```

- [ ] **Step 6: Run the test to verify it passes**  Run: `npm test`  Expected: 90 passing, 0 failing.

- [ ] **Step 7: Verify in the browser**  On `?view=trust`, drill the left column to a metro **and** the right column to a VPC at the same time. The breadcrumb must read `Home › Remote sites › Chicago · AWS › us-east-1 › vpc-prod-01` — two paths, not one spliced line, no trailing `Network services`, and no caret hanging off either end. Click **AWS**: the right column must return to all six regions (today it stays on the region). Click **us-east-1**: back to that region's VPCs. Drill only the right column and confirm the row reads `Home · AWS › us-east-1`. With no drill at all the nav does not render, which is unchanged. Screenshot Discover (below the edit at line 561) and confirm it still draws. Check `?view=partial` and `?view=mature`.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js "NaaS Storefront.dc.html" tests/markup.test.mjs
git commit -m "fix: two columns, two trails, and the cloud crumb goes where it says

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Memoise `inventory(est)`

**Files:**
- Modify: `naas-addendum.js:25-34`
- Test: `tests/inventory-memo.test.mjs`

**Interfaces:**
- Consumes: `est.id`, `est.regionsList` (the only inputs `inventory` reads, besides `est.sites` via `circuitsFor`, which is fixed per estate id)
- Produces: `inventory(est)` returns the identical array for two estate objects with the same id and the same region signature

- [ ] **Step 1: Write the failing test**

Create `tests/inventory-memo.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { inventory } from '../naas-addendum.js';

const est = D.ESTATES.trust;

test('the same estate shape rebuilds nothing', () => {
  const a = inventory({ ...est });
  const b = inventory({ ...est });
  assert.equal(a, b, 'two renders of one estate must share one tree');
  assert.equal(inventory(est), a);
});

test('a landed region is a different estate', () => {
  // us-west-2 is the first region trust has NOT attached. Landing it is what
  // `naas-app.js:132` does on every render after the user attaches, and it has
  // to miss the cache. Flipping an already-private region proves nothing:
  // trust's regionsList[1] is us-east-2, which is private already.
  const landed = { ...est, regionsList: est.regionsList.map(r => r.region === 'us-west-2' ? { ...r, priv: true, ramp: r.ramp || 'NetBond', rel: 'ok', landed: true } : r) };
  assert.notEqual(inventory(landed), inventory(est));
  assert.equal(inventory(landed), inventory({ ...landed }));
});

test('a facet filter is a different estate', () => {
  const few = { ...est, regionsList: est.regionsList.slice(0, 2) };
  const tree = inventory(few);
  assert.equal(tree.flatMap(c => c.regions).length, 2);
  assert.notEqual(tree, inventory(est));
});

test('two estates never share a tree', () => {
  assert.notEqual(inventory(D.ESTATES.partial), inventory(D.ESTATES.mature));
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `two renders of one estate must share one tree` (`inventory` builds a fresh array every call).

- [ ] **Step 3: Memoise**

`naas-addendum.js:25-34` — replace `inventory` with:

```js
/**
 * The whole 2,681-workload tree rebuilt on every render cost each Discover
 * click 60-160ms and degraded drawer paging from 62ms to 131ms by page 10.
 * The key is the estate id plus the region signature, because `naas-app.js`
 * hands us a fresh object literal (the landed flip, then the facet filter)
 * on every pass and a WeakMap would never hit. The signature carries every
 * region field `region()` reads and the app can change — cloud, region, priv,
 * ramp, wl, rel, landed. Everything else it reads (`est.sites`,
 * `est.sitesCount`, `r.fab`, `r.pub`, `r.tags`) is fixed for an estate id.
 */
const INV_CACHE = new Map();
const INV_CAP = 8;
const invKey = (est) => `${est.id || ''}|${(est.regionsList || []).map(r => `${r.cloud}/${r.region}/${r.priv ? 1 : 0}/${r.ramp || ''}/${r.wl || 0}/${r.rel || ''}/${r.landed ? 1 : 0}`).join(',')}`;

export function inventory(est) {
  if (!est) return [];
  const key = invKey(est);
  const hit = INV_CACHE.get(key);
  if (hit) return hit;
  const clouds = [];
  est.regionsList.forEach((r, i) => {
    let cl = clouds.find(c => c.name === r.cloud);
    if (!cl) { cl = { id: 'c-' + r.cloud, name: r.cloud, mark: PROVIDER_MARK[r.cloud] || null, initials: r.cloud === 'GCP' ? 'G' : r.cloud.slice(0, 2).toUpperCase(), gpu: GPU_CLOUDS.includes(r.cloud), regions: [] }; clouds.push(cl); }
    cl.regions.push(region(r, i, est));
  });
  clouds.forEach(cl => { cl.vpcs = cl.regions.reduce((a, r) => a + r.vpcs.length, 0); cl.wl = cl.regions.reduce((a, r) => a + r.wl, 0); cl.priv = cl.regions.some(r => r.priv); });
  if (INV_CACHE.size >= INV_CAP) INV_CACHE.delete(INV_CACHE.keys().next().value);
  INV_CACHE.set(key, clouds);
  return clouds;
}
```

- [ ] **Step 4: Run the test to verify it passes**  Run: `npm test`  Expected: 94 passing, 0 failing.

- [ ] **Step 5: Verify in the browser**  On `?view=trust`, open the Performance panel, record, and click through Discover's left column four levels deep. Each click must no longer show a 60-160ms scripting block attributable to `inventory`. Then walk the drawer to page 10 on a 588-site metro and confirm paging stays responsive. Functionally: the numbers on Discover, Observe, Explore 360 and Cost must be identical to before — check the workload total in the Explore 360 stats row and the Observe Gbps figure on all four estates, and confirm a facet chip on Discover still changes the tree (the key includes the filtered region list).

- [ ] **Step 6: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-addendum.js tests/inventory-memo.test.mjs
git commit -m "perf: the inventory tree is built once per estate shape, not once per render

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Gate the inventory view tree on open state

**Files:**
- Modify: `naas-app.js:692`, `:695`, `:702`, `:707`, `:711-713`, `:1301`
- Modify: `naas-app.js:671` (add `openKeys` and `treeOpen` beside `allKeys`)

**Interfaces:**
- Consumes: `openMap` (`naas-app.js:669`), `newOnly`, `isNew`, `s.tagView`
- Produces: `treeOpen(id) -> boolean`, `openKeys: string[]`; `invTree` nodes whose `regions`, `vpcs` and `azGroups` are empty arrays until their parent is open; `expandAll` opens clouds, regions and VPCs but not subnets

- [ ] **Step 1: Move the `newOnly` filter ahead of the map**

`naas-app.js:692` — replace:

```js
  const tree = inv.filter(cl => !newOnly || cl.regions.some(r => r.vpcs.some(isNew))).map(cl => ({
```

`naas-app.js:713` — replace:

```js
  }));
```

The markup already gates every level on `cl.open` / `rg.open` / `v.open` (`html:647` and below), so an empty child array is never rendered.

- [ ] **Step 2: Gate the three levels**

`treeOpen` lands in Step 4, because that step is the only one that inserts lines and every number below would move if it went first.

`naas-app.js:695` — replace:

```js
    regions: treeOpen(cl.id) ? cl.regions.filter(r => !newOnly || r.vpcs.some(isNew)).map(r => ({
```

`naas-app.js:702` — replace:

```js
      vpcs: treeOpen(r.id) ? r.vpcs.filter(v => !newOnly || isNew(v)).map(v => ({
```

`naas-app.js:707` — two edits on the one long `azGroups` line. Replace its head:

```js
        azGroups: treeOpen(v.id) ? Array.from(new Set(v.subnets.map(sn => sn.az))).map(az => ({
```

and its tail, which today reads `} })) })),` at the very end of the line:

```js
} })) })) : [],
```

`naas-app.js:711` and `:712` — close the two new conditionals. Line 711 becomes:

```js
      })) : [],
```

and line 712 becomes:

```js
    })) : [],
```

- [ ] **Step 3: Stop Expand all from opening every subnet**

`naas-app.js:1301` — replace `allKeys` with `openKeys` in `expandAll`:

```js
    expandAll: () => set({ inv: Object.fromEntries(openKeys.map(k => [k, true])) }), collapseAll: () => set({ inv: {} }), collapsedLabel: Object.values(openMap).some(Boolean) ? 'Expanded view' : 'Collapsed view',
```

- [ ] **Step 4: Declare the gate, and keep the tag view whole**

`naas-app.js:671` — add below `allKeys`. This is the last edit in the task because it inserts six lines and moves every number above:

```js
  // Expand all opens the three cheap levels. Opening every subnet rendered
  // 47,659 DOM nodes over 7.2 seconds on the trust estate; a subnet's
  // workload list opens on its own click, where the user asked for it.
  const openKeys = inv.flatMap(cl => [cl.id, ...cl.regions.flatMap(r => [r.id, ...r.vpcs.map(v => v.id)])]);
  // The tag view is not a tree of open nodes: `tagTree` (naas-app.js:1743)
  // walks `cl.regions -> rg.vpcs` to group every VPC by tag, so gating those
  // arrays on open state would empty the whole view. Under `tagView` the tree
  // is built in full, which is what it already cost before this task.
  const treeOpen = (id) => !!s.tagView || !!openMap[id];
```

- [ ] **Step 5: Run the tests**  Run: `npm test`  Expected: 94 passing, 0 failing (no data model changed).

- [ ] **Step 6: Verify in the browser**  On `?view=trust`, open **Explore 360**. Press **Expand all** and time it: the tree must open to clouds, regions and VPCs in well under a second, and `document.querySelectorAll('#sec-inv *').length` must be in the low thousands, not 47,659. Then click one VPC's subnet row and confirm its workloads still render. Press **Collapse all** and confirm everything shuts. Toggle the **new only** window filter and confirm clouds with nothing new still disappear. Then switch to the **tag view** (`Tags` beside `Clouds` above the tree) with everything collapsed and confirm it still lists every tag group with its VPCs — that is the gate's one real hazard. Repeat on `?view=mature` and `?view=partial`.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js
git commit -m "perf: Explore 360 builds only the branches that are open

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: "Not connected yet" counts sites, and the order carries the quantity

**Files:**
- Modify: `naas-app.js:901-912` (`gapSites`, `gapSummary`)
- Modify: `NaaS Storefront.dc.html:1423` (the compose alert title becomes a binding)
- Modify: `naas-app.js:1430` (add `parsedNoteTitle`)
- Test: `tests/gap-count.test.mjs`

**Interfaces:**
- Consumes: `S.countOf(name)` (`naas-sites.js:48`); `prefillCompose(est)`, `composeFor(go, r)`
- Produces: `gapSiteCount(est) -> number` exported from `naas-sites.js`; each gap row carries `qty` and a `go` that writes `compose.bulk` and `parsedNote`

- [ ] **Step 1: Write the failing test**

Create `tests/gap-count.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';

const est = D.ESTATES.trust;

test('the gap is 2,898 sites, not 3 rows', () => {
  assert.equal(S.gapSiteCount(est), 2898);
  const rows = (est.sites || []).filter(x => !x.priv);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(x => S.countOf(x.name)), [1640, 1210, 48]);
});

test('every estate reports a gap it can defend', () => {
  for (const id of ['empty', 'partial', 'mature', 'trust']) {
    const e = D.ESTATES[id];
    const n = S.gapSiteCount(e);
    const rows = (e.sites || []).filter(x => !x.priv);
    assert.ok(n >= rows.length, `${id}: ${n} sites across ${rows.length} rows`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `S.gapSiteCount is not a function`.

- [ ] **Step 3: Count the sites**

`naas-sites.js` — append beside `rollupKeyOf`:

```js
/** How many sites are still on a public first mile. Rows are rollups; this counts inside them. */
export function gapSiteCount(est) {
  return (est && est.sites || []).filter(x => !x.priv).reduce((a, x) => a + countOf(x.name), 0);
}
```

- [ ] **Step 4: Put the quantity on the row and in the order**

Replace `gapSummary` first: the `gapSites` replacement below grows the block by five lines and would move it.

`naas-app.js:901-908` — replace `gapSites`:

```js
  const gapSites = (est.sites || []).filter(x => !x.priv).map(x => {
    const qty = S.countOf(x.name);
    const what = `${qty.toLocaleString('en-US')} ${qty === 1 ? 'site' : 'sites'} · ${x.name.replace(/\s*\([\d,]+\)\s*$/, '')}`;
    return {
      key: 'gs-' + x.name, kind: 'site', name: x.name, qty,
      sub: `${qty.toLocaleString('en-US')} ${qty === 1 ? 'site' : 'sites'} · ${x.access || 'first mile'} · ${x.metro || 'various'} · public first mile`,
      tags: [], hasTags: false,
      best: 'Attach the first mile to the fabric', bestWhy: 'AVPN or ASE, same-day on existing access',
      alt: 'or keep the internet path with inline inspection',
      go: () => { c.setState({ screen: 's4', compose: { ...prefillCompose(est), bulk: what, qty }, parsedNoteTitle: 'Not connected yet', parsedNote: `Attach ${what}. One order, one policy, ${qty.toLocaleString('en-US')} ${qty === 1 ? 'circuit' : 'circuits'}.` }); syncHash('s4', s.layer, s.tab); },
    };
  });
```

`naas-app.js:910-912` — replace `gapSummary`:

```js
  const gapSiteN = S.gapSiteCount(est);
  const gapSummary = gapRows.length
    ? `${gapRegions.length} cloud ${gapRegions.length === 1 ? 'region' : 'regions'} and ${gapSiteN.toLocaleString('en-US')} ${gapSiteN === 1 ? 'site is' : 'sites are'} still on the public internet, in ${gapRows.length} ${gapRows.length === 1 ? 'group' : 'groups'}.`
    : 'Everything discovered is on the AT&T fabric.';
```

- [ ] **Step 5: Let the compose alert name its source**

`naas-app.js:1430` — add `parsedNoteTitle: s.parsedNoteTitle || 'From the drawer',` immediately after `parsedNote: s.parsedNote || '',`. The default is the copy the alert ships with today, so every other route into Compose — the drawer's bulk attach, a row's Attach, a workload's Isolate — reads exactly as it did before; only the gap rows, which set the key in Step 4, say something else.

`NaaS Storefront.dc.html:1423` — replace `<div class="fx-alert-title">From the drawer</div>` with `<div class="fx-alert-title">{{ parsedNoteTitle }}</div>` inside that line, changing nothing else.

- [ ] **Step 6: Run the test to verify it passes**  Run: `npm test`  Expected: 96 passing, 0 failing.

- [ ] **Step 7: Verify in the browser**  On `?view=trust`, open **Discover** and scroll to **Not connected yet**. The sub must read `2 cloud regions and 2,898 sites are still on the public internet, in 5 groups.` — not "3 sites". Each site row's sub must lead with its own count (`1,640 sites · …`). Click **Connect this** on the East row: Compose opens with the alert titled `Not connected yet` and reading `Attach 1,640 sites · Remote sites, East. One order, one policy, 1,640 circuits.` Open a metro drawer and press **Attach N** instead: the same alert must still be titled `From the drawer`. Hard constraint 4: the compose alert is `html:1423`, so also load a screen below it — **S7 Browse** (`html:1656`, the `Browse the marketplace` tab) and the **Andi dock** (`html:1937`) — and confirm both still draw. Repeat on `?view=partial` and `?view=mature`, and confirm `?view=empty` still hides the card.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-sites.js naas-app.js "NaaS Storefront.dc.html" tests/gap-count.test.mjs
git commit -m "fix: the gap is 2,898 sites, and the order says how many

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: The drawer sort tells the truth

**Files:**
- Modify: `naas-volume.js:40`
- Test: `tests/drawer-sort.test.mjs`

**Interfaces:**
- Consumes: `volumeList(est, {cls, metro}, opts)`, `RANK` (`naas-volume.js:15`)
- Produces: a total order — state band, then latency, then id — so `rows[0]` is genuinely the worst and page N is stable

- [ ] **Step 1: Write the failing test**

Create `tests/drawer-sort.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { volumeList } from '../naas-volume.js';

const est = D.ESTATES.trust;
const RANK = { degraded: 0, public: 1, ok: 2 };

test('the drawer order is a total order', () => {
  const v = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { size: 588 });
  assert.equal(v.rows.length, 588);
  for (let i = 1; i < v.rows.length; i++) {
    const a = v.rows[i - 1], b = v.rows[i];
    const ka = [RANK[a.state], a.ms, a.id], kb = [RANK[b.state], b.ms, b.id];
    assert.ok(ka[0] < kb[0] || (ka[0] === kb[0] && (ka[1] < kb[1] || (ka[1] === kb[1] && ka[2] <= kb[2]))),
      `out of order at ${i}: ${a.state}/${a.ms}/${a.id} before ${b.state}/${b.ms}/${b.id}`);
  }
});

test('paging does not reshuffle the list', () => {
  const p1 = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { page: 1 });
  const p10 = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { page: 10 });
  assert.deepEqual(p10.rows.slice(0, 60).map(r => r.id), p1.rows.map(r => r.id));
});

test('the worst row really is first', () => {
  const v = volumeList(est, { cls: 'Branch', metro: 'Branch:1:Atlanta' }, { size: 588 });
  const worst = v.rows.filter(r => r.state === 'degraded');
  assert.ok(worst.length > 0);
  assert.equal(v.rows[0].id, worst.slice().sort((a, b) => a.ms - b.ms || a.id.localeCompare(b.id))[0].id);
});
```

- [ ] **Step 2: Run the test to verify it fails**  Run: `npm test`  Expected: FAIL — `out of order at 2: degraded/67/RS-ATL-0287 before degraded/30/RS-ATL-0266`. Today `a.ms - b.ms * 0` evaluates to `a.ms`, which is positive for every row, so the comparator claims `a > b` and `b > a` at once and the third clause never runs.

- [ ] **Step 3: Fix the comparator**

`naas-volume.js:40` — replace:

```js
  rows = rows.slice().sort((a, b) => RANK[a.state] - RANK[b.state] || a.ms - b.ms || a.id.localeCompare(b.id));
```

- [ ] **Step 4: Run the test to verify it passes**  Run: `npm test`  Expected: 99 passing, 0 failing.

- [ ] **Step 5: Verify in the browser**  On `?view=trust`, drill to **Remote sites → Atlanta** and open the drawer. The first rows must be the degraded ones in ascending latency; note the first five ids. Press **Show 60 more** nine times and confirm the first five ids have not moved. Filter to **Public**, then clear the filter, and confirm the head of the list is the same as before. Repeat on `?view=mature`.

- [ ] **Step 6: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-volume.js tests/drawer-sort.test.mjs
git commit -m "fix: the drawer comparator is antisymmetric, so worst first means worst first

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Wave exit check

- [ ] `npm test` is green at 99.
- [ ] `?view=empty`, `?view=partial`, `?view=mature` and `?view=trust` each load Home, Discover, Observe, Govern, Cost and Explore 360 with no red error banner.
- [ ] On `?view=trust`, every one of the twelve levels in the spec's table opens from its header door, lists exactly the count the header claims, drills in place, and climbs back out with `‹ Back`.
- [ ] Home and Observe still fit 1440x900 with no page scroll, and no door or button sits within 10px of a card edge.

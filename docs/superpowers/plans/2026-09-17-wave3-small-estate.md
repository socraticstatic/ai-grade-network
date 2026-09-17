# Wave 3 — The Small End of the Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox syntax for tracking.

**Goal:** Make the storefront honest for a customer with one cloud, two regions and two sites — a fifth estate, a canvas sized to it, a band that says something when nothing is attached, and copy that counts to one.

**Architecture:** `naas-data.js` gains a fifth estate and `VIEWS` gains its row; the literal Estate `<select>` is held to `VIEWS` by a test because `sc-for` cannot live inside a `<select>`. `heroLayout` stops being a fixed 1392×560 and derives its height, band height and internet floor from the **root** row counts of the estate — never the drilled ones, so the picture never resizes under a click, and every full estate lands on exactly the numbers it lands on today. Four wiring defects that only a small estate exposes (the fabric band's empty blue box, `launchCards` starting at Observe with nothing attached, Explore 360's fake scan, `?estate=` being ignored) are fixed at the source, each behind a unit test.

**Tech Stack:** Static ES modules, React 18 UMD (vendored), the dc-runtime, node:test.

**Spec:** docs/superpowers/specs/2026-09-17-storefront-story-schedule-scale-design.md

## Global Constraints

1. `sc-for` NEVER renders inside `<table>` or `<svg>`. Use the `.dt` / `.dt-h` / `.dt-b` / `.dt-r` / `.dt-c` CSS-table classes. Every table in the app already does.
2. The dc-runtime expression language is TINY: path lookup, `==` `!=` `===` `!==`, `!`, literals. NO function calls, NO arithmetic, NO ternary, NO logical and/or. Compute the value in `naas-app.js` and bind the computed value.
3. Never load React from a CDN. It is vendored in `vendor/`. AT&T networks block CDNs behind an SRI check and the page comes up blank.
4. Markup edits to `NaaS Storefront.dc.html` have TWICE shipped a stray closing tag that silently killed later screens. Every task that edits it must count open/close tags in the edited section AND screenshot a screen BELOW the edit, not just the one being changed.
5. A dashboard fits the fold: 1440×900, no page scroll on Observe and Home, and no button within 10px of a card edge.
6. Nothing leaves the page. Drills open in place; drawers and details overlay the content.
7. Type is AT&T Aleck Sans with a documented fallback. Colours come from CSS custom properties in the light and dark theme blocks. Never hardcode a hex inside a component.
8. Verification is not optional: CLAUDE.md forbids declaring any UI task done without running the dev server and confirming in a browser. Every task ends by verifying in the browser and naming which estates were checked.

### Note on constraint 1 inside the hero SVG

Constraint 1 names `<table>` and `<svg>`. The hero picture is the documented exception in this file: `sc-if` and `sc-for` are already live inside `<svg id-less fabric picture>` at `NaaS Storefront.dc.html:376` (`sc-if fabClosed`), `:377` (`sc-for strata`), `:393` (`sc-if fabOpen`), `:395` (`sc-for fabRows`) and `:401` (`sc-if hasFabMore`), and all five render today. The browser parses `<svg>` in foreign-content mode and keeps unknown elements, which is why these survive where a `<table>` child would be foster-parented out. Task 4 adds ONE more `sc-if` as an immediate sibling of `:401`, inside the same `<g>`, which is the proven-safe pattern. Do not introduce an `sc-for` anywhere new inside an SVG.

### Note on the Estate `<select>`

The same parser rule that kills `sc-for` in a `<table>` kills it in a `<select>`: the "in select" insertion mode drops every start tag that is not `option`, `optgroup`, `hr`, `script` or `template`. So the Estate list **stays literal markup** and Task 1 adds a drift test that reads the file and compares the options to `VIEWS`.

---

## File Structure

| File | The one thing it is responsible for here |
|---|---|
| `naas-data.js` | The fifth estate (`small`) and its row in `VIEWS` |
| `NaaS Storefront.dc.html` | The Estate `<option>`, the compact strata card, the band's empty state |
| `naas-logic.js` | The derived canvas in `heroLayout`; `plural` and `estatePhrase` |
| `naas-app.js` | `estateFor` / `shouldScan` / `runScan`, the strata card metrics, the band empty-state bindings, the copy |
| `naas-connections.js` | `launchCards` routing when nothing is on the fabric |
| `naas-fabric.js` | `fabricRows`' empty state and its singular heads |
| `tests/data.test.mjs` | The small estate's shape; `VIEWS` against the markup |
| `tests/estate.test.mjs` (new) | `estateFor`, `shouldScan` and `runScan`'s skip branch |
| `tests/hero.test.mjs` | The derived canvas at both ends |
| `tests/fabric.test.mjs` | The zero-facility band |
| `tests/connections.test.mjs` | Cold-estate launch routing |
| `tests/copy.test.mjs` (new) | Singular and plural |
| `docs/PATCHES.md` | The wave's record |

Baseline before this wave: `npm test` is green at **56**.

---

### Task 1: The fifth estate, and an Estate select that cannot drift

**Files:**
- Modify: `naas-data.js:18-24` (VIEWS), `naas-data.js:40` (insert the estate after `empty`)
- Modify: `NaaS Storefront.dc.html:220` (the Estate `<select>`)
- Test: `tests/data.test.mjs`

**Interfaces:**
- Produces: `D.ESTATES.small` — `{ id:'small', name:'Trinity Supply Co.', stage:'partial', clouds:1, regions:2, workloads:20, attachedRegions:0, regionsExtra:0, sites:[2], regionsList:[2 AWS regions, both priv:false] }`. Every later task consumes it by name.
- Produces: `D.VIEWS` with `small` third, between `empty` and `partial`.

- [ ] **Step 1: Write the failing test** — append to `tests/data.test.mjs`:

```js
import { readFile } from 'node:fs/promises';

test('small: one cloud, two regions, two sites, nothing attached', () => {
  const e = D.ESTATES.small;
  assert.equal(e.id, 'small');
  assert.equal(e.stage, 'partial');
  assert.equal(e.sites.length, 2);
  assert.equal(e.regionsList.length, 2);
  assert.equal(e.regionsExtra, 0);
  assert.equal(new Set(e.regionsList.map(r => r.cloud)).size, e.clouds);
  assert.equal(e.regionsList.length, e.regions);
  assert.equal(e.regionsList.reduce((a, r) => a + r.wl, 0), e.workloads);
  assert.equal(e.regionsList.filter(r => r.priv).length, 0);
  assert.equal(e.attachedRegions, 0);
});

test('the Estate select and VIEWS cannot drift', async () => {
  const html = await readFile(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  const sel = /aria-label="View as"[\s\S]*?<\/select>/.exec(html);
  assert.ok(sel, 'the Estate select is gone from the markup');
  const opts = [...sel[0].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
    .map(m => ({ id: m[1], label: m[2] }));
  assert.deepEqual(opts, D.VIEWS);
});
```

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL, `TypeError: Cannot read properties of undefined (reading 'id')` from the first test, and `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal` from the second.

- [ ] **Step 3: Add `small` to VIEWS** — in `naas-data.js`, replace lines 18-24 with:

```js
export const VIEWS = [
  { id: 'live', label: 'Live estate' },
  { id: 'empty', label: 'New customer' },
  { id: 'small', label: 'Small business' },
  { id: 'partial', label: 'Growing' },
  { id: 'mature', label: 'Established' },
  { id: 'trust', label: 'Bank scale' },
];
```

- [ ] **Step 4: Add the estate** — in `naas-data.js`, insert this block immediately after the `empty` estate's closing `},` (currently line 40), before `partial: {`:

```js
  // The customer Ramesh described out loud and no fixture represented: one
  // cloud, two regions, two buildings, twenty workloads, nothing attached.
  small: {
    id: 'small', name: 'Trinity Supply Co.', stage: 'partial', clouds: 1, regions: 2, workloads: 20, privatePct: 0, attachedRegions: 0, policiesEnforced: 0, policiesAuthored: 2, observedPct: 0, savedMo: 0, fabricAttachPct: 0, tags: 4,
    sites: [
      { name: 'Dallas HQ', cls: 'Campus', access: 'ABF (Business Fiber)', priv: false, metro: 'Dallas' },
      { name: 'Houston yard', cls: 'Plant', access: 'ADI (Dedicated Internet)', priv: false, metro: 'Houston' },
    ],
    regionsList: [
      REG('AWS', 'us-east-1', 12, false, null, 34, 8, ['Prod']),
      REG('AWS', 'us-west-2', 8, false, null, 46, 11, ['Internet-facing'], 'warn'),
    ],
    regionsExtra: 0,
    arcs: [{ from: 'us-east-1', to: 'us-west-2', priv: false }],
    policies: [
      { name: 'Prod no direct internet', match: 'tag Prod', req: 'No direct internet path', matched: 12, viol: 12, state: 'authored' },
      { name: 'Internet-facing inspection', match: 'tag Internet-facing', req: 'Inline security inspection', matched: 8, viol: 8, state: 'authored' },
    ],
    buckets: [
      { id: 'misc', name: 'Misc internet egress', cloud: 'AWS', today: 2400, fabric: 900 },
      { id: 'base', name: 'Committed base', cloud: 'AWS', today: 1800, fabric: 1800 },
    ],
    findings: [
      { kind: 'avoidable', layer: 'cloud', tab: 'cost', pillar: 'Cost control', persona: 'FinOps', head: '$2,400/mo of internet egress the fabric would carry for $900', ev: 'One misc internet bucket on AWS, last 30 days of egress spend.', priced: true, save: 1500, why: 'Both regions terminate in metros with a NetBond on-ramp. Steering changes the path, not the workload.', ladder: ['Steer this bucket on the fabric', 'Steer every internet bucket', 'Hosted VPC with AT&T egress for the region'] },
      { kind: 'onecloud', layer: 'cloud', tab: 'connect', pillar: 'Private reach', persona: 'Network Engineering', head: 'Both regions ride the public internet', ev: 'us-east-1 and us-west-2 have no private path to AT&T; Dallas and Houston reach them over the internet first mile.', priced: false, why: 'Nothing is attached yet, so there is no telemetry, no inspection point and no fabric rate.', ladder: ['Attach us-east-1', 'Attach both regions', 'Connection Hub in Dallas'] },
    ],
  },
```

- [ ] **Step 5: Add the option to the Estate select** — in `NaaS Storefront.dc.html:220`, inside the `aria-label="View as"` `<select>`, insert one option between the `empty` and `partial` options so the markup reads:

```html
<option value="live">Live estate</option><option value="empty">New customer</option><option value="small">Small business</option><option value="partial">Growing</option><option value="mature">Established</option><option value="trust">Bank scale</option>
```

Count the tags in the edited `<select>`: 6 `<option>` opens, 6 `</option>` closes, 1 `<select>`, 1 `</select>`, 1 `<label>`, 1 `</label>`. Nothing else on line 220 changes.

- [ ] **Step 6: Run the test to verify it passes** — Run: `npm test`. Expected: 58 passing, 0 failing.

- [ ] **Step 7: Verify in the browser** — with the server up (`npx http-server . -p 8787 -c-1`; one may already be running on 8787), open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=small`. Expected: the page renders with no red error banner at the top left; the Estate control in the dev toolbar reads **Small business**; the Discover title row names **Trinity Supply Co.**; the picture shows 2 site rows on the left and 2 AWS region rows on the right. Then use the Estate control to walk **New customer → Small business → Growing → Established → Bank scale** and confirm each one renders without the banner. Finally, constraint 4: the edit is at markup line 220, in the dev toolbar near the top of the file, so screenshot two screens far below it — Observe (`?view=small#s3/cloud/observe`, markup from line 945) and the Product page (`?view=small#s8`, markup from line 1775, the last screen in the file). Both must render their full content, not a blank panel.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-data.js "NaaS Storefront.dc.html" tests/data.test.mjs
git commit -m "$(cat <<'MSG'
a fifth estate: one cloud, two regions, two sites

Trinity Supply Co. is the customer Ramesh described and no fixture
represented. Nothing is attached, which is the point: it is the estate
that exposes the cold-start defects.

The Estate select duplicates VIEWS as literal markup because sc-for
cannot live inside a <select> - the parser drops it the same way it
foster-parents one out of a <table>. A test reads the file and holds
the two lists together instead.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: `?estate=` selects the estate on any view

**Files:**
- Modify: `naas-app.js:47` (the query parse), `naas-app.js:69-72` (`estateFor`), `naas-app.js:383` (`setView`)
- Test: `tests/estate.test.mjs` (create)

**Interfaces:**
- Consumes: `D.ESTATES.small` from Task 1.
- Produces: `export function estateFor(s)` — takes the state object, returns an estate. Task 6's test imports from the same module.

- [ ] **Step 1: Write the failing test** — create `tests/estate.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { estateFor, defaults } from '../naas-app.js';

const st = (patch) => ({ ...defaults(), ...patch });

test('?estate= picks the estate whatever the view is', () => {
  assert.equal(estateFor(st({ view: 'mature', estateParam: 'trust' })).id, 'trust');
  assert.equal(estateFor(st({ view: 'live', estateParam: 'trust' })).id, 'trust');
  assert.equal(estateFor(st({ view: 'live', estateParam: null })).id, 'partial');
  assert.equal(estateFor(st({ view: 'small', estateParam: null })).id, 'small');
  assert.equal(estateFor(st({ view: 'nope', estateParam: null })).id, 'mature');
  assert.equal(estateFor(st({ view: 'mature', estateParam: 'nonsense' })).id, 'mature');
});
```

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL, `SyntaxError: The requested module '../naas-app.js' does not provide an export named 'estateFor'`.

- [ ] **Step 3: Make `estateFor` honour the param** — in `naas-app.js`, replace lines 69-72:

```js
export function estateFor(s) {
  // ?estate= names an estate outright; it used to be read only when the view
  // was 'live', so ?estate=meridian on its own silently showed the default.
  if (s.estateParam && D.ESTATES[s.estateParam]) return D.ESTATES[s.estateParam];
  if (s.view === 'live') return D.ESTATES.partial;
  return D.ESTATES[s.view] || D.ESTATES.mature;
}
```

- [ ] **Step 4: Keep the Estate control honest** — in `naas-app.js:47`, replace:

```js
  if (q.get('estate') === 'meridian') patch.estateParam = 'trust';
```

with:

```js
  if (q.get('estate') === 'meridian') { patch.estateParam = 'trust'; if (!q.get('view')) patch.view = 'trust'; }
```

and in `naas-app.js:383`, add `estateParam: null` to the `setView` patch so picking an estate by hand clears the URL's override:

```js
    view: s.view, setView: (e) => set({ view: e.target.value, estateParam: null, drill: [], regionDrill: null, simulated: false, enforced: false, scanStep: s.screen === 's1' ? 0 : s.scanStep }),
```

- [ ] **Step 5: Run the test to verify it passes** — Run: `npm test`. Expected: 59 passing, 0 failing.

- [ ] **Step 6: Verify in the browser** — open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?estate=meridian`. Expected: the title row names **Meridian Networks** (not DataFlow Systems) and the Estate control reads **Bank scale**. Then change the Estate control by hand to **Small business** and confirm it switches to Trinity Supply Co. and stays there on a click into Observe (the URL override must not reassert). Check `?view=empty` and `?view=trust` still open their own estates.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js tests/estate.test.mjs
git commit -m "$(cat <<'MSG'
?estate= selects the estate on any view, not only on live

estateParam was written at parse time and read only inside the 'live'
branch, so ?estate=meridian alone loaded the default estate. Picking an
estate by hand now clears the override, so the control and the screen
cannot disagree.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: The canvas is derived from the estate

**Files:**
- Modify: `naas-logic.js:15-64` (the body of `heroLayout` above `return out;` on line 65)
- Modify: `naas-app.js:194` (insert the strata card metrics), `naas-app.js:407` (bind them)
- Modify: `NaaS Storefront.dc.html:381` (the strata card's padding and gap)
- Test: `tests/hero.test.mjs`

**Interfaces:**
- Consumes: `D.ESTATES.small` from Task 1.
- Produces: `heroLayout(est, opts)` returning the same shape as today plus derived `H`, `bandH`, `lane`, `internet` and `strata[i].h`. Every consumer already reads these by name (`naas-app.js:394` `heroVB`, `:407` `laneY/laneH/bandY/bandH/facH/strataCardH/footY`, `:415` `internetY/internetTy`). No key is added or removed.
- Produces: `strataPadY: number` and `strataRowGap: number` in the values object, bound only by `NaaS Storefront.dc.html:381`.

**Why the numbers are what they are.** Measured, not chosen. The stratum card at `html:381` is a three-row grid: 18px + 14px + 20px of rows, two 6px gaps, 10px of padding top and bottom = **84px of content**. `naas-app.js:407` sets the card to `round(bandH/4) - 12`, so a band below 384px clips the third line. The compact card closes the padding to 6 and the gaps to 3 — 18 + 14 + 20 + 6 + 12 = **70px** — which fits the 72px card that a 336px band gives. That is the floor: `BAND_H_MIN = 4 × 84 = 336`. Above it, `H = bandY + bandH + 16 + 76 + 44`, which is exactly 560 at `bandH = 396`, and the internet floor is `lane.y - 60`, which is exactly 380 at `bandH = 396`. Both are therefore byte-identical wherever the band is full.

**Why the measurement reads the root rows, not the drilled ones.** `opts.siteRows` and `opts.regionRows` change on every click. Measuring them would make the canvas grow and shrink under the pointer. The canvas is a property of the estate, so it is measured from `est.sites` and `est.regionsList`. The full estates are unmoved by construction: at `bandH = 396`, `H = 28 + 396 + 16 + 76 + 44 = 560` and the internet floor is `440 - 60 = 380`, the two constants the old function hardcoded. Measured on the shipping data, `sitesEnd`/`cloudsEnd` push `partial`, `mature` and `trust` past `BAND_H_MAX`, so all three clamp to 396 and every derived number reproduces today's exactly; Step 1's first test pins that at root and at drill depth.

- [ ] **Step 1: Write the failing test** — in `tests/hero.test.mjs`, add `import * as D from '../naas-data.js';` under the existing imports, then append:

```js
test('the canvas a full estate needs does not move', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const L = heroLayout(D.ESTATES[id], {});
    assert.equal(L.W, 1392, id);
    assert.equal(L.H, 560, id);
    assert.equal(L.bandH, 396, id);
    assert.equal(L.lane.y, 440, id);
    assert.equal(L.strata[0].h, 99, id);
  }
  assert.equal(heroLayout(D.ESTATES.mature, {}).internet.y, 472);
  assert.equal(heroLayout(D.ESTATES.trust, {}).internet.y, 380);
  assert.equal(heroLayout(D.ESTATES.partial, {}).internet.y, 406);
  // Drilling must not resize the picture under the click.
  const t = D.ESTATES.trust;
  const drilled = heroLayout(t, { siteRows: t.sites.slice(0, 3), regionRows: t.regionsList.slice(0, 1) });
  assert.equal(drilled.H, 560);
  assert.equal(drilled.bandH, 396);
  assert.equal(drilled.lane.y, 440);
});

test('a small estate gets a canvas sized to it', () => {
  for (const id of ['empty', 'small']) {
    const L = heroLayout(D.ESTATES[id], {});
    assert.equal(L.H, 500, id);
    assert.equal(L.bandH, 336, id);
    assert.equal(L.lane.y, 380, id);
    assert.equal(L.internet.y, 320, id);
    assert.equal(L.strata.length, 4, id);
    assert.equal(L.strata[0].h, 84, id);
    assert.ok(L.lane.y + L.lane.h <= L.H, id);
    assert.ok(L.internet.y + 30 <= L.H, id);
    for (const s of L.sites) assert.ok(s.y >= 0 && s.y + 36 <= L.H, `${id}: site at ${s.y} leaves the canvas`);
    for (const r of L.regions) assert.ok(r.y + 28 <= L.H, `${id}: region at ${r.y} leaves the canvas`);
  }
  assert.equal(heroLayout(D.ESTATES.small, {}).sites.length, 2);
  assert.equal(heroLayout(D.ESTATES.small, {}).regions.length, 2);
});

test('zero sites and one region still lay out', () => {
  const base = D.ESTATES.small;
  const noSites = heroLayout({ ...base, sites: [] }, {});
  assert.equal(noSites.sites.length, 0);
  assert.equal(noSites.edges.filter(e => e.kind === 'ingress').length, 0);
  assert.equal(noSites.strata.length, 4);
  assert.ok(noSites.H >= noSites.lane.y + noSites.lane.h);

  const oneRegion = heroLayout({ ...base, regionsList: [base.regionsList[0]] }, {});
  assert.equal(oneRegion.regions.length, 1);
  assert.equal(oneRegion.groups.length, 1);
  assert.ok(oneRegion.internet.y > oneRegion.regions[0].y, 'the internet row rides up over the regions');
  assert.ok(oneRegion.internet.y + 30 <= oneRegion.H);

  const oneSite = heroLayout({ ...base, sites: [base.sites[0]] }, {});
  assert.equal(oneSite.sites.length, 1);
  assert.ok(oneSite.sites[0].y > 0 && oneSite.sites[0].y + 36 <= oneSite.H, 'the single site is off the canvas');
});
```

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL. `the canvas a full estate needs does not move` passes (today's fixed canvas already matches), `a small estate gets a canvas sized to it` fails with `Expected values to be strictly equal: 560 !== 500`.

- [ ] **Step 3: Derive the canvas** — in `naas-logic.js`, replace lines **15 through 64** — from the `// The band widens…` comment down to and including the `out.strata = [0, 1, 2, 3].map(…)` line — with the block below. Line 65 (`return out;`) and line 66 (`}`) stay as they are. The two `forEach` bodies are unchanged; only their order and the constants around them move.

```js
  // The canvas is derived from the estate, not fixed. A full estate fills
  // every one of these numbers, so they are the maxima; a two-site estate
  // gets a picture sized to it instead of 88% whitespace.
  //
  // BAND_H_MIN is measured, not chosen: the stratum card at html:381 holds
  // 84px of content (18 + 14 + 20, two gaps, two pads), the card is
  // bandH/4 - 12, and the compact card closes its pads and gaps to fit 70px
  // into 72px. Four strata of 84 is the floor.
  //
  // The measurement reads the ROOT rows, never opts.siteRows / opts.regionRows,
  // so the picture never changes height under a click.
  const W = 1392, H_MAX = 560, BAND_H_MAX = 396, BAND_H_MIN = 336;
  const LANE_GAP = 16, LANE_H = 76, FOOT = 44, COL_TOP = 30, CARD_H = 36, GAP_MAX = 66, INET_OVER_LANE = 60;
  const rowH = 34, groupHead = 20, groupGap = 12;
  const bandX = opts.bandX || 560, bandW = opts.bandW || 240, bandY = 28;
  const empty = !est || est.stage === 'empty';
  // Row pitch is measured against the tallest canvas, never the derived one,
  // so shrinking the picture never re-spaces a full estate's rows.
  const pitch = (k) => k > 1 ? Math.min(GAP_MAX, (H_MAX - 120) / (k - 1)) : 0;

  const rootN = empty ? 3 : Math.min(7, (est.sites || []).length);
  const sitesEnd = rootN ? COL_TOP + (rootN - 1) * pitch(rootN) + CARD_H : 0;
  const rootRegs = empty ? 2 : (est.regionsList || []).length;
  const rootClouds = empty ? 2 : new Set((est.regionsList || []).map(r => r.cloud)).size;
  const cloudsEnd = COL_TOP + rootClouds * (groupHead + groupGap) + rootRegs * rowH + (!empty && est.regionsExtra ? rowH : 0);
  const bandH = Math.max(BAND_H_MIN, Math.min(BAND_H_MAX, Math.max(sitesEnd, cloudsEnd) + 28));
  const strataH = bandH / 4;
  // Beneath the band: the lane for traffic that never touches the AT&T fabric (third party, internet). Ramesh, 2026-09-09.
  const lane = { x: bandX, y: bandY + bandH + LANE_GAP, w: bandW, h: LANE_H };
  const H = lane.y + lane.h + FOOT;
  const internetFloor = lane.y - INET_OVER_LANE;

  const out = { W, H, bandX, bandW, bandY, bandH, lane, sites: [], groups: [], regions: [], workloads: [], edges: [], arcs: [], internet: null, strata: [], ghost: false };
  const clampBand = (y) => Math.round(Math.min(bandY + bandH - 24, Math.max(bandY + 24, y)));
  const clampLane = (y) => Math.round(Math.min(lane.y + lane.h - 14, Math.max(lane.y + 14, y)));
  out.ghost = empty;

  const rawSites = empty ? [{ name: 'Your data centers', access: 'AVPN, ASE', ghost: true }, { name: 'Your sites', access: 'ADI, ABF, SD-WAN', ghost: true }, { name: 'Your internet sites', access: 'Internet first mile', ghost: true }] : (opts.siteRows || est.sites);
  const sites = rawSites.length > 7 ? [...rawSites.slice(0, 6), { name: `+${fmtN(rawSites.length - 6)} more`, access: 'In the level map', more: true, rollup: false }] : rawSites;
  const n = sites.length;
  const gap = pitch(n);
  const top = 48 + ((H - 96) - (n - 1) * gap) / 2 - 18;
  sites.forEach((s, i) => {
    const y = Math.round(top + i * gap);
    out.sites.push({ ...s, i, y, cy: y + 18, key: 'site' + i });
    const viaLane = !s.priv && !s.ghost;
    out.edges.push({ id: 'in' + i, kind: 'ingress', priv: !!s.priv, ghost: !!s.ghost, viaLane, x1: 224, y1: y + 18, x2: bandX, y2: viaLane ? clampLane(y + 18) : clampBand(y + 18), site: s });
  });

  const regs = empty ? [{ cloud: 'Clouds', region: 'Your regions', ghost: true, wl: 0 }, { cloud: 'Neoclouds', region: 'Your GPU regions', ghost: true, wl: 0 }] : (opts.regionRows || est.regionsList);
  const byCloud = {};
  regs.forEach(r => { (byCloud[r.cloud] = byCloud[r.cloud] || []).push(r); });
  const ord = (c) => { const i = CLOUD_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  const clouds = Object.keys(byCloud).sort((a, b) => ord(a) - ord(b));
  let y = COL_TOP;
  clouds.forEach(c => {
    out.groups.push({ cloud: c, y, count: byCloud[c].length });
    y += groupHead;
    byCloud[c].forEach((r, j) => {
      const ry = y;
      out.regions.push({ ...r, y: ry, cy: ry + 14, key: (r.child ? 'c:' : '') + r.region });
      const viaLane = !r.priv && !r.ghost;
      if (!r.noEdge && !r.other) out.edges.push({ id: 'eg' + out.regions.length, kind: 'egress', priv: !!r.priv, ghost: !!r.ghost, viaLane, x1: bandX + bandW, y1: viaLane ? clampLane(ry + 14) : Math.round(Math.min(bandY + bandH - 40, Math.max(bandY + 24, ry + 14))), x2: 980, y2: ry + 14, chip: r.ramp, shield: !!r.priv && (r.ramp === 'NetBond' || r.ramp === 'ER'), region: r, dur: r.fab ? Math.max(1.2, r.fab / 6) : 3 });
      if (r.wl) out.workloads.push({ region: r.region, y: ry + 3, label: r.wlLabel || (r.wl.toLocaleString('en-US') + ' workloads'), key: 'wl' + (r.child ? 'c:' : '') + r.region, tags: r.tags });
      y += rowH;
    });
    y += groupGap;
  });
  if (!empty && est.regionsExtra && !opts.regionRows) { out.regions.push({ cloud: '', region: '+' + est.regionsExtra + ' regions', rollup: true, y, cy: y + 14, key: 'more' }); y += rowH; }
  out.internet = { y: Math.min(H - 36, Math.max(y + 8, internetFloor)) };
  out.edges.push({ id: 'inet', kind: 'internet', priv: false, ghost: empty, viaLane: true, x1: bandX + bandW, y1: lane.y + lane.h - 14, x2: 980, y2: out.internet.y + 14, internet: true });
  (est && est.arcs || []).forEach((a, i) => {
    const r1 = out.regions.find(r => r.region === a.from), r2 = out.regions.find(r => r.region === a.to);
    if (r1 && r2) out.arcs.push({ id: 'arc' + i, priv: a.priv, y1: r1.cy, y2: r2.cy, from: a.from, to: a.to });
  });
  out.strata = [0, 1, 2, 3].map(i => ({ i, y: bandY + i * strataH, h: strataH }));
```

- [ ] **Step 4: Run the test to verify it passes** — Run: `npm test`. Expected: 62 passing, 0 failing, including the two pre-existing hero tests (`the lane sits beneath the band…` and `public edges enter and leave through the lane…`) unchanged.

- [ ] **Step 5: Give the stratum card its compact metrics** — in `naas-app.js`, insert directly after line 194 (`const bandFill = …`):

```js
  // The stratum card holds 84px of content (18 + 14 + 20, two 6px gaps, two
  // 10px pads). A compact band gives it 72px, so the pads and gaps close up
  // rather than clipping the third line.
  const strataCardH = Math.round(L.bandH / 4) - 12;
  const strataTight = strataCardH < 84;
```

Then in `naas-app.js:407`, replace the fragment `strataCardH: Math.round(L.bandH / 4) - 12,` with:

```js
strataCardH, strataPadY: strataTight ? 6 : 10, strataRowGap: strataTight ? 3 : 6,
```

- [ ] **Step 6: Bind them in the card** — in `NaaS Storefront.dc.html:381`, replace the whole line with:

```html
          <div style="box-sizing:border-box;height:{{ strataCardH }}px;padding:{{ strataPadY }}px 14px;display:grid;grid-template-rows:auto auto auto;gap:{{ strataRowGap }}px;align-content:center">
```

This is an attribute-only edit: the line still opens exactly one `<div>`, and its matching `</div>` on **line 387** is untouched (line 388 is the `</foreignObject>`). Count the edited section before and after — it must read the same both times:

```bash
cd /Users/micahbos/Developer/cloud-connect
sed -n '377,391p' "NaaS Storefront.dc.html" | python3 -c "
import re, sys
s = sys.stdin.read()
for t in ['sc-for', 'g', 'rect', 'foreignObject', 'div', 'sc-if', 'span']:
    print(t, len(re.findall(r'<' + t + r'(?=[ >])', s)), len(re.findall(r'</' + t + r'>', s)))
"
```

Expected, both times: `sc-for 1 1`, `g 1 1`, `rect 1 1`, `foreignObject 1 1`, `div 4 4`, `sc-if 2 3`, `span 3 3`. The `sc-if` count is deliberately lopsided: the third close on line 391 belongs to the `fabClosed` `sc-if` opened on line 376, outside the range.

- [ ] **Step 7: Verify in the browser** — with the server up, for each URL below read the hero canvas by running this in the devtools console and compare to the expected value (measure, do not eyeball):

```js
document.querySelector('svg[aria-label="Fabric picture"]').getAttribute('viewBox')
```

| URL | Expected viewBox |
|---|---|
| `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=empty` | `0 0 1392 500` |
| `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=small` | `0 0 1392 500` |
| `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=trust` | `0 0 1392 560` |

On `?view=small` and `?view=empty`, confirm all four stratum cards (AI Fabric, Cloud, Network services, Transport and access) show their title, their sub line and their bottom row with no clipped text, and that the "Outside the AT&T fabric" lane still sits fully below the band. On `?view=trust`, confirm the picture is pixel-unchanged from before this task: 7 site rows, the band bottom level with the lane top, the Internet / SaaS row where it was. Then click a site class on `?view=trust` to drill and confirm the canvas height does not change (re-read the viewBox: still `0 0 1392 560`). Finally, constraint 4: the edit is at markup line 381, so screenshot two screens whose markup is well below it — the Floor (`?view=small#s2`, markup from line 911) and Observe (`?view=trust#s3/cloud/observe`, markup from line 945). Both must render their full content, not a blank panel.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-logic.js naas-app.js "NaaS Storefront.dc.html" tests/hero.test.mjs
git commit -m "$(cat <<'MSG'
the picture is sized to the estate, not to a constant

heroLayout was a fixed 1392x560 with a 396px band and the Internet row
floored at 380, so a two-site estate got a canvas that was 88% empty.
H, bandH and the internet floor now derive from the root row counts.

Measured, not chosen: the band floor is four strata of 84px, which is
the stratum card's own content height, and the compact card closes its
pads and gaps to fit. Full estates land on 560/396/440 exactly as
before, because at bandH 396 the derived H is 28+396+16+76+44 and the
internet floor is 440-60 - the two numbers the old function hardcoded -
and partial, mature and trust all clamp to that band. The measurement
reads the root rows, so the canvas never resizes under a click.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: The fabric band says what is missing instead of opening blank

**Files:**
- Modify: `naas-fabric.js:46` (the facility level of `fabricRows`)
- Modify: `naas-app.js:227` (after `fabHead`), `naas-app.js:413` (bind the empty state)
- Modify: `NaaS Storefront.dc.html:401` (insert one sibling `sc-if`)
- Test: `tests/fabric.test.mjs`

**Interfaces:**
- Consumes: `D.ESTATES.small` from Task 1.
- Produces: `fabricRows(est, inv, ob, ['fab'])` gains `empty: boolean`, `emptyHead: string`, `emptyLine: string`, `emptyCta: string`. The ports and circuits levels are untouched.
- Produces: `fabEmpty`, `fabEmptyY`, `fabEmptyHead`, `fabEmptyLine`, `fabEmptyCta`, `fabEmptyGo` in the values object.

**The ruling: an empty state inside the band, not a dead stratum.** Three reasons. (1) The four strata are the product's four layers — AI Fabric, Cloud, Network services, Transport and access — and they are the one thing a customer with nothing attached is being shown; greying them out hides the offer at exactly the moment it matters. (2) An affordance that disappears when there is nothing behind it is unlearnable — the same argument the spec makes for the header door in §1 ("an affordance that only appears when something is hidden is unlearnable"); a stratum that is clickable on four estates and dead on the fifth teaches the wrong rule. (3) The band already has a trail, an Up button and a head; an empty state costs one sentence and reuses the Attach door the customer needs next anyway.

- [ ] **Step 1: Write the failing test** — append to `tests/fabric.test.mjs`:

```js
test('the band has something to say when nothing is attached', () => {
  const e = D.ESTATES.small, i = A.inventory(e), o = A.observe(e, [], i);
  assert.equal(facilities(e, i, o).length, 0);
  const l1 = fabricRows(e, i, o, ['fab']);
  assert.equal(l1.level, 'facility');
  assert.deepEqual(l1.rows, []);
  assert.equal(l1.empty, true);
  assert.equal(l1.head, '0 facilities');
  assert.ok(l1.emptyHead && l1.emptyLine && l1.emptyCta, 'the empty state has no copy');
  assert.equal(fabricRows(e, i, o, ['fab', 'N. Virginia']), null);
  // An estate with facilities is untouched.
  const full = fabricRows(est, inv, ob, ['fab']);
  assert.equal(full.empty, false);
  assert.ok(full.rows.length >= 3);
});
```

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL, `Expected values to be strictly equal: undefined !== true` on `l1.empty`.

- [ ] **Step 3: Give `fabricRows` an empty state** — in `naas-fabric.js`, replace line 46 with:

```js
  if (trail.length === 1) return {
    level: 'facility', label: 'AT&T fabric',
    rows: facs.map(f => ({ key: f.key, name: f.name, sub: f.sub, state: f.state, drill: f.city, count: `${f.ports}` })),
    head: `${facs.length} facilities`,
    // Nothing attached means no facility, and the band used to open to a blank
    // blue box. It says what is missing and offers the door instead.
    empty: facs.length === 0,
    emptyHead: 'Nothing on the fabric yet',
    emptyLine: 'Attach a cloud region and the AT&T facility carrying it appears here, with its ports and the circuits on them.',
    emptyCta: 'Attach a region',
  };
```

- [ ] **Step 4: Run the test to verify it passes** — Run: `npm test`. Expected: 63 passing, 0 failing.

- [ ] **Step 5: Wire the values** — in `naas-app.js`, insert directly after line 227 (the `const fabHead = …` line):

```js
  const fabEmpty = !!(fabInfo && fabInfo.empty);
  // go() is the file's own navigator, defined at :141. It already prefills
  // Compose, clears the drills, scrolls to the top and syncs the hash - so the
  // Attach door behaves exactly like every other door rather than a near-copy.
  const fabEmptyGo = go('s4');
```

Then in `naas-app.js:413`, append to the same object literal, immediately after `fabHeadY: L.bandY + 8,`:

```js
fabEmpty, fabEmptyY: L.bandY + 40, fabEmptyHead: fabInfo ? fabInfo.emptyHead : '', fabEmptyLine: fabInfo ? fabInfo.emptyLine : '', fabEmptyCta: fabInfo ? fabInfo.emptyCta : '', fabEmptyGo,
```

- [ ] **Step 6: Draw it** — in `NaaS Storefront.dc.html`, insert this as a new line directly after line 401 (the `hasFabMore` `sc-if`) and before line 402's `</sc-if>`, so it is a sibling of the rows inside the `fabOpen` block:

```html
      <sc-if value="{{ fabEmpty }}" hint-placeholder-val="{{ false }}"><foreignObject x="{{ fabHead.x }}" y="{{ fabEmptyY }}" width="{{ fabHead.w }}" height="132"><div style="box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:10px;background:var(--bg-base);border:1px solid var(--border-secondary)"><div style="font-size:13px;line-height:18px;font-weight:700;color:var(--text-heading)">{{ fabEmptyHead }}</div><div style="font-size:12px;line-height:16px;color:var(--text-light);text-wrap:pretty">{{ fabEmptyLine }}</div><button onClick="{{ fabEmptyGo }}" style="align-self:flex-start;height:28px;padding:0 12px;border:0;border-radius:9999px;background:var(--cta);color:#fff;font:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap">{{ fabEmptyCta }}</button></div></foreignObject></sc-if>
```

Tag count for the inserted line: `sc-if` 1 open / 1 close, `foreignObject` 1 / 1, `div` 3 opens / 3 closes, `button` 1 / 1. Balanced, and it opens and closes entirely on one line, so nothing above or below it changes nesting. Colours are `var(--bg-base)`, `var(--border-secondary)`, `var(--text-heading)`, `var(--text-light)` and `var(--cta)`; the only literal is `#fff` on the CTA label, matching the Up button on line 394 and the Attach button on line 409. The button sits `align-self:flex-start` inside 14px of padding, inside a card inset 12px from the band edge, so it is 26px clear — outside the ten-pixel rule.

- [ ] **Step 7: Verify in the browser** — open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=small` and click the **AT&T fabric** band. Expected: the band opens to a card reading **Nothing on the fabric yet**, the sentence beneath it, and an **Attach a region** button; no empty blue rectangle. Click **Attach a region** and confirm it lands on Compose without leaving the page shell. Repeat on `?view=empty` (the ghost estate) — the band must open to the same empty state rather than a blank box. Then on `?view=trust`, click the band and confirm the facility list still renders (`4 facilities`, N. Virginia first) and drills to ports and circuits as before, and that the empty card does not appear. Toggle the theme to dark on `?view=small` and confirm the card's text reads against the dark band. Screenshot Observe on `?view=trust` — a screen well below line 401 — to prove nothing later went blank.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-fabric.js naas-app.js "NaaS Storefront.dc.html" tests/fabric.test.mjs
git commit -m "$(cat <<'MSG'
the fabric band says what is missing instead of opening blank

With no attached region there are no facilities, and clicking the band
opened a 420x396 empty blue box. It now opens to a sentence and the
Attach door.

The stratum stays clickable on purpose. The four strata are the offer a
cold customer is being shown, and an affordance that is live on four
estates and dead on the fifth teaches the wrong rule.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: Zero attached regions route the way an empty estate does

**Files:**
- Modify: `naas-connections.js:94-105` (the body of `launchCards`)
- Test: `tests/connections.test.mjs`

**Interfaces:**
- Consumes: `D.ESTATES.small` from Task 1.
- Produces: `launchCards({ est, ob, conns, totalSave, violations, isEmpty })` unchanged in signature and in the shape of each returned card (`key`, `label`, `value`, `sub`, `bar`, `primary`, `door`, `eyebrow`). `naas-app.js:237` needs no change.

The signal for "attached" is `est.regionsList.filter(r => r.priv).length`, not `est.attachedRegions`. `connections()` already counts the same way (`tests/connections.test.mjs:13` asserts it), and `facilities()` in `naas-fabric.js:17` filters on `priv` too. On `partial`, `attachedRegions` is 5 while only 2 listed regions are private, because it counts the regions hidden behind `regionsExtra` — so it is the wrong number to ask "is anything on the fabric".

- [ ] **Step 1: Write the failing test** — append to `tests/connections.test.mjs`:

```js
test('nothing attached starts at Connect, whatever else was discovered', () => {
  const e = D.ESTATES.small, i = A.inventory(e), o = A.observe(e, [], i);
  const c = connections(e, o);
  assert.equal(c.total, 0);
  const cards = launchCards({ est: e, ob: o, conns: c, totalSave: 0, violations: 20, isEmpty: false });
  const by = (k) => cards.find(x => x.key === k);
  assert.equal(cards.find(x => x.primary).key, 'connect');
  assert.equal(by('connect').eyebrow, 'Start here · new to the fabric');
  assert.match(by('connect').value, /2 of 2 regions/);
  assert.equal(by('connect').door, 'Attach the 2 regions');
  assert.equal(by('observe').eyebrow, '');
  assert.equal(by('observe').value, 'No telemetry yet');
  assert.equal(by('observe').door, 'Open Observe');
  assert.equal(by('govern').value, '20');
  // An attached estate is untouched.
  const warm = launchCards({ est, ob, conns: connections(est, ob), totalSave: 12000, violations: 52, isEmpty: false });
  assert.equal(warm.find(x => x.primary).key, 'observe');
  assert.match(warm.find(x => x.key === 'observe').eyebrow, /you are connected/);
});
```

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL, `Expected values to be strictly equal: 'observe' !== 'connect'` on the primary card.

- [ ] **Step 3: Route on what is actually attached** — in `naas-connections.js`, replace lines **94 through 105** — from `const rs = est.regionsList…` down to and including the `});` that closes the `.map` — with the block below. Line 93 (the signature) and line 106 (`}`) stay as they are.

```js
  const rs = est.regionsList, pub = rs.filter(r => !r.priv).length;
  // "Cold" is an estate with nothing on the fabric, discovered or not. It has
  // no connections, no telemetry and no savings, so Observe cannot be the
  // start-here card and must not claim "you are connected".
  const cold = isEmpty || rs.filter(r => r.priv).length === 0;
  const degRow = conns.rows.find(r => r.degraded);
  return [
    { key: 'connect', label: 'Connect', value: isEmpty ? 'Nothing connected yet' : `${pub} of ${rs.length} regions`, sub: isEmpty ? 'Start here' : pub ? 'still ride the public internet' : 'every region on the fabric', bar: isEmpty ? null : Math.round((rs.length - pub) / (rs.length || 1) * 100) },
    { key: 'observe', label: 'Observe', value: cold ? 'No telemetry yet' : `${conns.degraded} of ${conns.total} connections`, sub: cold ? 'starts with the first attach' : degRow ? `degraded · ${n(degRow.wl)} workloads impacted` : `healthy · ${(ob.fab || 0).toFixed(1)} Gbps on the fabric`, bar: null },
    { key: 'govern', label: 'Govern', value: isEmpty ? 'No policies yet' : n(violations), sub: isEmpty ? 'three starting points' : `policy violations across ${(est.policies || []).length} policies`, bar: null },
    { key: 'cost', label: 'Cost', value: isEmpty ? 'No egress seen yet' : cold ? money(ob.egressMo || 0) + '/mo' : totalSave ? money(totalSave) + '/mo' : money(ob.savingsMo || 0) + '/mo', sub: isEmpty ? 'priced after the scan' : cold ? 'of egress, every byte on public rates' : totalSave ? `on the table across ${est.findings.filter(f => f.priced).length} findings` : 'already saved on the fabric', bar: null },
  ].map(c => {
    const primary = cold ? c.key === 'connect' : c.key === 'observe';
    const door = { connect: isEmpty ? 'Connect a cloud' : pub ? `Attach the ${pub === 1 ? 'region' : pub + ' regions'}` : 'See the fabric', observe: cold ? 'Open Observe' : degRow ? 'What is impacted' : 'See the traffic', govern: isEmpty ? 'Start a policy' : violations ? 'Review violations' : 'Review policies', cost: cold ? 'Open Cost' : 'See the savings' }[c.key];
    return { ...c, primary, door, eyebrow: primary ? (cold ? 'Start here · new to the fabric' : 'Start here · you are connected') : '' };
  });
```

Every estate with at least one private region has `cold === isEmpty`, so `partial`, `mature` and `trust` take the identical branch at every one of these ternaries and `empty` is unchanged by construction.

- [ ] **Step 4: Run the test to verify it passes** — Run: `npm test`. Expected: 64 passing, 0 failing, including the pre-existing `launchCards` test at `tests/connections.test.mjs:62-70` unchanged.

- [ ] **Step 5: Verify in the browser** — open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=small#s2` (the floor, where the four launch cards sit). Expected: the **Connect** card carries the accent border and the eyebrow **Start here · new to the fabric**; its door reads **Attach the 2 regions**; the **Observe** card reads **No telemetry yet / starts with the first attach** and has no eyebrow; the **Cost** card shows a real egress figure, not "$0/mo already saved on the fabric". Click the Connect door and confirm it opens Compose in place. Then check `?view=empty#s2` (Connect is primary with "new to the fabric", unchanged) and `?view=trust#s2` (Observe is primary with **Start here · you are connected**, unchanged). Screenshot `?view=small#s2` and `?view=trust#s2`.

- [ ] **Step 6: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-connections.js tests/connections.test.mjs
git commit -m "$(cat <<'MSG'
nothing attached starts at Connect, whatever else was discovered

launchCards made Observe the "Start here - you are connected" card for
any non-empty estate, so a scanned customer with zero private regions
was told he was connected, over "0 of 0 connections - healthy - 0.0
Gbps on the fabric".

Cold is now "no private region", counted the way connections() and
facilities() already count. Every estate with an attached region takes
the identical branch, so the warm path is unchanged by construction.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: Explore 360 stops faking a scan on an empty estate

**Files:**
- Modify: `naas-app.js:55` (the boot path), `naas-app.js:141` (the `go` navigator), `naas-app.js:475` (add `shouldScan` and `runScan` beside `startScan`)
- Test: `tests/estate.test.mjs`

**Interfaces:**
- Consumes: `estateFor(s)` exported in Task 2.
- Produces: `export function shouldScan(est): boolean` — `true` when the estate has something to find.
- Produces: `export function runScan(c, est): void` — runs the four beats where `shouldScan(est)`, and otherwise puts the screen straight into its finished state. Both call sites call `runScan`; nothing calls `shouldScan` outside it and the test.

The guard the author intended is already written one clause earlier on line 141: `if (screen === 's1' && s.scanStep < 4 && est.stage !== 'empty') startScan(c);`. The same line ends with an unguarded `if (screen === 's1') startScan(c);`, which is what actually runs the 3-second spinner over an estate with nothing in it. Line 55 repeats the unguarded call on boot, so `#s1` in the URL fakes a scan too.

**Why simply not calling `startScan` is wrong, and what to do instead.** `naas-app.js:441` derives `scanning: s.scanStep < 4` and `scanDone: s.scanStep >= 4`, and the markup gates on both: `NaaS Storefront.dc.html:573` wraps the spinner and its five skeleton blocks in `<sc-if scanning>`, and `:582` wraps the **entire Discover body** in `<sc-if scanDone>`. `defaults()` seeds `scanStep: 0`. So an estate that never scans never leaves `scanning`, and Discover shows a skeleton that never resolves — strictly worse than the three seconds of theatre. The scan is the screen's loading state, not an optional animation. `runScan` therefore has two branches: run the beats, or land on step 4 at once. `clearInterval(scanTimer)` is in the second branch because a scan may be in flight when the estate changes under it; `scanTimer` is the module-level `let` declared on line 474, immediately above the insertion point.

- [ ] **Step 1: Write the failing test** — append to `tests/estate.test.mjs`:

```js
import { shouldScan, runScan } from '../naas-app.js';

test('a scan only runs where there is something to find', () => {
  assert.equal(shouldScan(D.ESTATES.empty), false);
  assert.equal(shouldScan(D.ESTATES.small), true);
  assert.equal(shouldScan(D.ESTATES.partial), true);
  assert.equal(shouldScan(D.ESTATES.trust), true);
  assert.equal(shouldScan(null), false);
  assert.equal(shouldScan(undefined), false);
});

test('an estate with nothing to find lands on the finished state, it does not sit in the skeleton', () => {
  // Discover's whole body is behind <sc-if scanDone> at html:582 and the
  // skeleton is behind <sc-if scanning> at :573, so skipping the scan without
  // reaching step 4 would spin forever.
  const seen = [];
  const c = { state: { scanStep: 0 }, setState: (p) => seen.push(p) };
  runScan(c, D.ESTATES.empty);
  assert.deepEqual(seen, [{ scanStep: 4 }]);
  runScan(c, null);
  assert.deepEqual(seen, [{ scanStep: 4 }, { scanStep: 4 }]);
});
```

Only the skip branch is exercised here. `runScan` on a real estate starts a 750ms `setInterval` that would hold the test runner's event loop open, so the four beats are verified in the browser at Step 6, not in `node:test`.

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL, `SyntaxError: The requested module '../naas-app.js' does not provide an export named 'shouldScan'`.

- [ ] **Step 3: Name the guard, and give the skip a destination** — in `naas-app.js`, insert directly above line 475 (`export function startScan(c) {`), below the `let scanTimer = null;` on line 474:

```js
/** There is nothing to discover on an estate with no clouds, so the scan must not run. */
export function shouldScan(est) { return !!est && est.stage !== 'empty'; }
/**
 * The scan is Discover's loading state, not an animation: html:573 holds the
 * skeleton while `scanning`, html:582 holds the whole body until `scanDone`.
 * So an estate we do not scan has to arrive at step 4 anyway, or the screen
 * never renders.
 */
export function runScan(c, est) {
  if (shouldScan(est)) return startScan(c);
  clearInterval(scanTimer);
  c.setState({ scanStep: 4 });
}
```

- [ ] **Step 4: Apply it at both call sites** — in `naas-app.js:141`, replace the whole `go` line with:

```js
  const go = (screen, extra) => () => { const pre = screen === 's4' && !(extra && extra.compose) && !s.compose.outcome ? { compose: prefillCompose(est) } : {}; if (screen === 's1' && s.scanStep < 4) runScan(c, est); c.setState({ screen, hoverRegion: null, andiScope: null, drill: [], cloudDrill: [], fabDrill: [], laneFocus: false, ...pre, ...(extra || {}) }); window.scrollTo(0, 0); syncHash(screen, extra && extra.layer || s.layer, extra && extra.tab || s.tab); };
```

and in `naas-app.js:55`, replace:

```js
  if ((patch.screen || c.state.screen) === 's1') startScan(c);
```

with:

```js
  if ((patch.screen || c.state.screen) === 's1') runScan(c, estateFor({ ...c.state, ...patch }));
```

`estateFor` is a hoisted function declaration at `:69`, so it is callable from `:55`. Both call sites read the state that is about to apply, not the state that is being replaced.

- [ ] **Step 5: Run the test to verify it passes** — Run: `npm test`. Expected: 66 passing, 0 failing.

- [ ] **Step 6: Verify in the browser** — open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=empty`, then click **Explore 360** in the rail. Expected: no spinner, no grey skeleton blocks, no "1 of 4 / 2 of 4" scan line, no three-second wait; the empty-estate Discover content appears at once and stays. Reload straight onto `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=empty#s1` and confirm the same — content immediately, no scan on boot, and leave the page sitting there for ten seconds to prove it does not fall back into the skeleton. Then on `?view=small`, click Explore 360 and confirm the four scan steps DO run, the spinner shows, and it lands on the estate tree; same on `?view=trust`. Finally, on `?view=trust`, navigate away to Observe and back to Explore 360 and confirm the page does not re-run the scan a second time.

- [ ] **Step 7: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js tests/estate.test.mjs
git commit -m "$(cat <<'MSG'
Explore 360 stops faking a scan on an empty estate

The guard was already written one clause earlier on the same line; the
line then ended with an unguarded startScan that ran the spinner anyway,
and the boot path repeated it. Both now go through runScan.

Skipping the scan is not the same as not calling it. Discover's body is
behind <sc-if scanDone> and the skeleton behind <sc-if scanning>, both
read off scanStep, which defaults to 0. An estate we decline to scan has
to arrive at step 4 anyway or the screen never renders at all.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 7: Singular and plural

**Files:**
- Modify: `naas-logic.js:10` (add `plural` and `estatePhrase` after `pct`)
- Modify: `naas-app.js:9` (the import), `:340`, `:341`, `:408`, `:441`, `:1351`
- Modify: `naas-fabric.js` (add the import, then the three `head:` values). Task 4 grew the facility level from one line into an eleven-line object and this step adds an import above it, so `:48` and `:51` have both moved — locate them with `grep -n "head: \`" naas-fabric.js`, do not trust the old numbers.
- Test: `tests/copy.test.mjs` (create)

**Interfaces:**
- Produces: `export const plural = (n, one, many) => string` — `plural(1,'cloud','clouds')` is `'1 cloud'`, `plural(4120,'site','sites')` is `'4,120 sites'`.
- Produces: `export const estatePhrase = (est) => string` — `'1 cloud, 2 regions, 20 workloads'`.
- Consumes: `D.ESTATES.small` from Task 1; `fabricRows` from Task 4.

Every count already goes through `toLocaleString('en-US')` where it is over a thousand, and `plural` keeps doing that, so no big-estate string changes: `mature` still reads `4 clouds, 18 regions, 940 workloads` and `trust` still reads `3 clouds, 14 regions, 2,860 workloads`. `?view=partial` has a live n=1 defect today — the Virginia facility's head reads **"1 ports · ER"** — so this is not only a small-estate fix.

- [ ] **Step 1: Write the failing test** — create `tests/copy.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { plural, estatePhrase } from '../naas-logic.js';
import { fabricRows } from '../naas-fabric.js';

test('one of a thing reads as one', () => {
  assert.equal(plural(1, 'cloud', 'clouds'), '1 cloud');
  assert.equal(plural(0, 'cloud', 'clouds'), '0 clouds');
  assert.equal(plural(2, 'cloud', 'clouds'), '2 clouds');
  assert.equal(plural(4120, 'site', 'sites'), '4,120 sites');

  assert.equal(estatePhrase(D.ESTATES.small), '1 cloud, 2 regions, 20 workloads');
  // The big estates' copy must not drift while the small one is fixed.
  assert.equal(estatePhrase(D.ESTATES.mature), '4 clouds, 18 regions, 940 workloads');
  assert.equal(estatePhrase(D.ESTATES.trust), '3 clouds, 14 regions, 2,860 workloads');

  // A live n=1 defect on a shipping estate: the Virginia facility has one port.
  const e = D.ESTATES.partial, i = A.inventory(e), o = A.observe(e, [], i);
  assert.equal(fabricRows(e, i, o, ['fab', 'Virginia']).head, '1 port · ER');
  assert.equal(fabricRows(e, i, o, ['fab', 'N. Virginia']).head, '3 ports · NetBond');
});
```

- [ ] **Step 2: Run the test to verify it fails** — Run: `npm test`. Expected: FAIL, `SyntaxError: The requested module '../naas-logic.js' does not provide an export named 'plural'`.

- [ ] **Step 3: Add the helpers** — in `naas-logic.js`, insert directly after line 10 (`export const pct = …`):

```js
/** "1 cloud" / "2 clouds" / "4,120 sites". Every count in the copy goes through this. */
export const plural = (n, one, many) => `${Number(n).toLocaleString('en-US')} ${n === 1 ? one : many}`;
/** What discovery found, in one phrase. */
export const estatePhrase = (est) => `${plural(est.clouds, 'cloud', 'clouds')}, ${plural(est.regions, 'region', 'regions')}, ${plural(est.workloads, 'workload', 'workloads')}`;
```

- [ ] **Step 4: Apply them in `naas-fabric.js`** — add a first import line under the licence header:

```js
import { plural } from './naas-logic.js';
```

`naas-logic.js` imports nothing, so this does not make a cycle. Then replace the three `head:` values. Task 4 turned the facility level into a multi-line object literal, so its `head:` is no longer on line 46 — find the line reading `head: \`${facs.length} facilities\`,` inside that block and make it:

```js
    head: plural(facs.length, 'facility', 'facilities'),
```

on line 48 replace `head: \`${ps.length} ports · ${fac.ramps.join(' · ')}\`` with:

```js
head: `${plural(ps.length, 'port', 'ports')} · ${fac.ramps.join(' · ')}`
```

and on line 51 replace `head: \`${cxs.length} circuits on this port\`` with:

```js
head: `${plural(cxs.length, 'circuit', 'circuits')} on this port`
```

- [ ] **Step 5: Apply them in `naas-app.js`** — change the import on line 9 to:

```js
import { fmt, pct, plural, estatePhrase, heroLayout, edgePath, arcPath, drillLevel, sankey } from './naas-logic.js';
```

then, line by line:

`:340` — replace the non-empty branch of `discoverVerdict`:

```js
  const discoverVerdict = isEmpty ? 'Add a cloud credential or pick an inventory to start.' : `${estatePhrase(est)}. ${est.privatePct}% already reach AT&T privately.`;
```

`:341` — in `discoverKpis`, the `e:` of the `key: 'a'` entry becomes:

```js
e: `${plural(est.clouds, 'cloud', 'clouds')}, ${plural(est.regions, 'region', 'regions')}`
```

`:408` — the non-empty branch of `headStartVerdict` becomes:

```js
`${est.name} is recognized. ${estatePhrase(est)} already visible.`
```

`:441` — the fallback branch of `sitesCountLabel` becomes:

```js
sitesCountLabel: est.sitesCount ? `${est.sitesCount.toLocaleString('en-US')} sites, grouped` : plural(est.sites.length, 'site', 'sites'),
```

`:1351` — the whole line becomes (only the final `${inv.length} clouds` changes):

```js
    discoverVerdictLine: isEmpty ? 'Nothing discovered yet. Connect an account or pick an inventory.' : `${est.regionsList.length - ob.pathsCovered} of your ${est.regionsList.length} cloud regions still ride the public internet. ${ob.pathsCovered} ${ob.pathsCovered === 1 ? 'is' : 'are'} on the AT&T fabric, across ${plural(inv.length, 'cloud', 'clouds')}.`,
```

- [ ] **Step 6: Run the test to verify it passes** — Run: `npm test`. Expected: 67 passing, 0 failing.

- [ ] **Step 7: Verify in the browser** — open `http://127.0.0.1:8787/NaaS%20Storefront.dc.html?view=small#s1` (Explore 360) and read the verdict under the title: it must say **1 cloud, 2 regions, 20 workloads**, never "1 clouds". Check the KPI strip's first tile eyebrow reads **1 cloud, 2 regions**, and the Discover verdict line ends **across 1 cloud.** Open `?view=partial`, click the AT&T fabric band, then the **AT&T Virginia** facility: the head must read **1 port · ER**. Confirm `?view=trust` still reads **3 clouds, 14 regions, 2,860 workloads** and its N. Virginia facility still reads **21 ports · NetBond**, and `?view=empty` still shows its own empty copy.

- [ ] **Step 8: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-logic.js naas-app.js naas-fabric.js tests/copy.test.mjs
git commit -m "$(cat <<'MSG'
one of a thing reads as one

"1 clouds" on the small estate and "1 ports - ER" on the Virginia
facility of ?view=partial, which has been shipping. Counts go through
plural(), the estate line through estatePhrase(), and a test pins the
big estates' phrasing so fixing the small end cannot move it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 8: Walk all five estates and record the wave

**Files:**
- Modify: `docs/PATCHES.md` (append a new section after the last one, currently `## 10. The drawer at the point of volume…` at line 343). The heading is **unnumbered on purpose**: the file's numbering already collides — `## 8.`, `## 9.` and `## 10.` each appear twice, and `## 11.` is taken at line 124 — so a `## 11.` here would be the fourth duplicate and would break the grep in Step 5.
- Test: the full suite plus a five-estate walk in the browser

**Interfaces:**
- Consumes: everything from Tasks 1-7. Produces nothing the code reads.

- [ ] **Step 1: Run the whole suite from clean** — Run:

```bash
cd /Users/micahbos/Developer/cloud-connect
npm test
```

Expected: `tests 67`, `pass 67`, `fail 0`. If the count is not 67, a task's tests were not added; do not proceed.

- [ ] **Step 2: Confirm the working tree holds nothing unintended** — Run:

```bash
cd /Users/micahbos/Developer/cloud-connect
git status --short
git diff --stat HEAD~7 HEAD
```

Expected: `git status` shows only the pre-existing untracked entries (`.claude/`, `.env.*`, `.worktrees/`, `dist/`, `public/`, `naas-design-scope/`, `playwright-report/`, `test-results/`, `video-output/`, the drop zip) and nothing from this wave. The diff touches exactly: `naas-data.js`, `naas-logic.js`, `naas-app.js`, `naas-connections.js`, `naas-fabric.js`, `NaaS Storefront.dc.html`, and the six test files.

- [ ] **Step 3: Walk the five estates at 1440×900** — with the browser window sized to 1440×900, open each URL and record pass/fail for each check:

| URL | What must be true |
|---|---|
| `…?view=empty` | Picture 500 tall; band opens to the empty state; Connect is the start-here card; Explore 360 shows no scan and no skeleton, its content is there at once and stays |
| `…?view=small` | Picture 500 tall, 2 sites, 2 regions; "1 cloud, 2 regions, 20 workloads"; band empty state; Connect is start-here |
| `…?view=partial` | Picture 560 tall, unchanged; Virginia facility reads "1 port · ER"; Observe is start-here |
| `…?view=mature` | Picture 560 tall, unchanged; 7 site rows; Internet row unchanged |
| `…?view=trust` | Picture 560 tall, unchanged; drill a site class and a region and confirm the canvas height does not move |

Then on `?view=small` and `?view=trust`, open **Observe** and the **floor** (`#s2`) and confirm neither page scrolls vertically at 1440×900, and that no button sits within 10px of a card edge. Re-check each of the five with the theme toggled to dark. Note any estate that fails, fix it, and re-run `npm test` before continuing.

- [ ] **Step 4: Record the wave** — append to `docs/PATCHES.md`, after its last section:

```markdown
## Wave 3: the small end of the drill (2026-09-17)

A fifth estate, `small` — Trinity Supply Co., one cloud, two AWS regions, two
sites, twenty workloads, nothing attached. It is in `VIEWS` as **Small business**
between New customer and Growing. The Estate `<select>` duplicates `VIEWS` as
literal markup, because `sc-for` cannot live inside a `<select>` any more than
inside a `<table>`, so a test reads the file and holds the two together.

`?estate=` now names an estate on any view. It used to be read only inside the
`live` branch of `estateFor`, so `?estate=meridian` alone showed the default.
Picking an estate by hand clears the override.

**The picture is sized to the estate.** `heroLayout` was a fixed 1392×560 with a
396px band and the Internet row floored at y=380, so a two-site estate got a
canvas that was 88% empty. `H`, `bandH` and the internet floor now derive from
the root row counts: `H = 28 + bandH + 16 + 76 + 44` and the floor is
`lane.y - 60`, which reproduce 560 and 380 exactly at a full band. The band's
floor is four strata of 84px — the stratum card's own content height — and below
that the card closes its padding and gaps rather than clipping its third line.
The measurement reads the root rows, never the drilled ones, so the canvas never
resizes under a click. `partial`, `mature` and `trust` all clamp to the full band,
so every number they produce is byte-identical to the old function's, at root and
at every drill depth.

**Three cold-start defects.** The fabric band opened to an empty blue box with
nothing attached; it now opens to what is missing and the Attach door, and the
stratum stays clickable because the four layers are the offer a cold customer is
being shown. `launchCards` made Observe the "Start here · you are connected" card
for any non-empty estate, over "0 of 0 connections · healthy · 0.0 Gbps on the
fabric"; cold is now "no private region", counted the way `connections()` and
`facilities()` already count it. Explore 360 ran a fake three-second scan on the
empty estate; the guard the author intended was written one clause earlier on the
same line and is now a named `shouldScan`, behind a `runScan` that lands the
skipped case on step 4 — the scan is Discover's loading state, and the body at
`html:582` is gated on `scanDone`, so not scanning and not finishing would have
left the screen in its skeleton forever.

**Singular and plural.** "1 clouds" on the small estate, and "1 ports · ER" on the
Virginia facility of `?view=partial`, which has been shipping. Counts go through
`plural()`.

Tests: 56 → 67. New coverage for `heroLayout` on the empty estate, on zero sites,
on one site and on one region; for `fabricRows` on a zero-facility estate; for
`estateFor`, `shouldScan` and `runScan`; and for the big estates' canvas, which had
no pin at all before this wave.
```

- [ ] **Step 5: Verify the doc renders** — Run:

```bash
cd /Users/micahbos/Developer/cloud-connect
grep -c "^## Wave 3: the small end of the drill" docs/PATCHES.md
tail -20 docs/PATCHES.md
```

Expected: `1`, and the tail shows the new section complete with the tests line.

- [ ] **Step 6: Commit**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add docs/PATCHES.md
git commit -m "$(cat <<'MSG'
record wave 3: the small end of the drill

Five estates walked at 1440x900 in both themes, 67/67 green.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Out of this wave

These are named in the spec's section 4 but belong to other waves, and no task here touches them:

- The big end — `Not connected yet` counting rollup rows, `inventory(est)` memoisation, gating `invTree` on open state, the drawer's non-antisymmetric sort comparator. Spec §4 "The big end"; wave 2.
- Story, schedule, Flywheel tokens, the header doors and `levelList`. Waves 1, 2 and 4.
- `naas-fabric.js:38`'s degenerate port filter, which the spec lists as out of scope entirely.

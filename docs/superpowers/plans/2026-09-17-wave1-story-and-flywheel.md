# Wave 1: Story bindings and Flywheel tokens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox syntax for tracking.

**Goal:** Put the four written verdicts, the closed loop on Observe, and the scan's four beats on the screen, retire the competing five-stop model, and land the eight mechanical Flywheel token corrections.

**Architecture:** Three verdict sentences move out of the middle of `renderVals` into a new pure module, `naas-verdicts.js`, so they can be asserted against each estate without a browser; `naas-app.js` binds the returned string instead of building it inline. The markup gains four bindings it never had — `pageVerdict` over `pageStat` in the title row, `nextStop` at the foot of Observe, and the `scanSteps` list with its source text — and loses none. The token work is one line of CSS.

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

**Deferred by the spec, do not touch in this wave:** `--warning` (`#b85f00`), `--error` (`#c23131`), `--viz-4` (`#b85f00`) and `--viz-5` (`#7d3f98`). Flywheel's equivalents are markedly louder and it has no purple at all, so spec section 5 defers those four to a human ruling. Task 6 adds a test that pins them at today's values so nobody "finishes the migration" by accident.

---

## File Structure

| File | The one thing it is responsible for |
|---|---|
| `naas-verdicts.js` | **Create.** The written verdict sentence for Connect, Govern and Cost, and Observe's Next stop copy. Pure functions of the estate; no DOM, no state, no React. |
| `naas-app.js` | Binds those strings into the values layer, routes the hash, and stops carrying the dead five-stop station model. |
| `naas-addendum.js` | Loses `STOPS`, `STOP_LABEL` and `stopCta`. Keeps `observe()` and its `verdict`, which is already the Observe sentence. |
| `NaaS Storefront.dc.html` | Renders the verdict above the stat line, the Next stop row on Observe, the scan's four beats, and carries the corrected light-theme token values. |
| `tests/verdicts.test.mjs` | **Create.** The four verdict sentences and the Next stop text, asserted per estate. |
| `tests/markup.test.mjs` | **Create.** The bindings exist where they are supposed to, and every container the markup opens it closes. |
| `tests/route.test.mjs` | **Create.** The hash resolves to the right screen patch. |
| `tests/tokens.test.mjs` | **Create.** The light theme's token values, so the Flywheel drift cannot come back. |

Line numbers below are as of commit `04bbb1e`. Every edit is anchored on an exact string that was verified unique at that commit, so a shifted line does not break the edit — but if an anchor fails to match, stop and re-locate rather than guessing.

Serve with `npx http-server . -p 8787 -c-1` (one may already be running on 8787). The four estates are `?view=empty`, `?view=partial`, `?view=mature`, `?view=trust`. Baseline: `npm test` is 56 passing.

---

### Task 1: The three written verdicts become pure, tested functions

`connectVerdict` (`naas-app.js:257`), `governVerdict` (`:263`) and `costVerdict` (`:271`) are built inline in a 1,844-line values function that needs a React component and a DOM to run. Extracting them changes no output; it makes the sentences assertable, which is what lets Task 2 bind them with confidence.

Note: the spec's pointer to `governVerdict` at `:265` is off by two. It is at `:263`, directly under `pciViol` at `:262`.

**Files:**
- Create: `/Users/micahbos/Developer/cloud-connect/naas-verdicts.js`
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:18` (import), `:254-257`, `:262-263`, `:271`
- Test: `tests/verdicts.test.mjs`

**Interfaces:**
- Consumes: `fmt(n) -> string` from `naas-logic.js:9`; `observe(est, steered, inv) -> { verdict, savingsMo, ... }` from `naas-addendum.js`.
- Produces:
  - `connectVerdict(est, layer = 'cloud', items = []) -> string`
  - `governVerdict(est) -> string`
  - `costVerdict(est, ob, totalSave, buckets = []) -> string`

- [ ] **Step 1: Write the failing test.** Create `tests/verdicts.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { connectVerdict, governVerdict, costVerdict } from '../naas-verdicts.js';

// Measured against commit 04bbb1e. Change one of these only when the copy is meant to change.
const EXPECT = {
  empty: {
    connect: 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.',
    govern: 'No policies yet. Three starting points below.',
    cost: 'No egress seen yet.',
    observe: 'No telemetry yet.',
  },
  partial: {
    connect: '5 of 7 regions still ride the public internet. 2 are on the AT&T fabric, plus 5 smaller regions rolled up.',
    govern: '4 policies enforced. 11 PCI-tagged workloads reach the internet directly',
    cost: '$36,000/mo on the table across 2 priced findings. $0/mo already saved on the fabric.',
    observe: '40% of traffic on the AT&T fabric, saving $0/mo. 5 regions are blind.',
  },
  mature: {
    connect: '1 of 8 regions still ride the public internet. 7 are on the AT&T fabric, plus 10 smaller regions rolled up.',
    govern: '14 policies enforced. 2 authored but not enforced.',
    cost: '$32,800/mo leaves through public egress that the fabric would carry for $15,300.',
    observe: '95% of traffic on the AT&T fabric, saving $61.4k/mo. 1 region is blind.',
  },
  trust: {
    connect: '2 of 6 regions still ride the public internet. 4 are on the AT&T fabric, plus 8 smaller regions rolled up.',
    govern: '9 policies enforced. 96 PCI-tagged workloads reach the internet directly',
    cost: '$132,000/mo on the table across 2 priced findings. $0/mo already saved on the fabric.',
    observe: '77% of traffic on the AT&T fabric, saving $0/mo. 2 regions are blind.',
  },
};

for (const id of ['empty', 'partial', 'mature', 'trust']) {
  test(`${id}: each of the four screens carries a written verdict`, () => {
    const est = D.ESTATES[id];
    const ob = A.observe(est, [], A.inventory(est));
    const totalSave = est.findings.filter(f => f.priced).reduce((a, f) => a + f.save, 0);
    assert.equal(connectVerdict(est, 'cloud'), EXPECT[id].connect);
    assert.equal(governVerdict(est), EXPECT[id].govern);
    assert.equal(costVerdict(est, ob, totalSave, est.buckets || []), EXPECT[id].cost);
    assert.equal(ob.verdict, EXPECT[id].observe);
  });
}

test('off the cloud layer the connect verdict counts sites, not regions', () => {
  const est = D.ESTATES.mature;
  const items = [{ exposed: 2 }, { exposed: 0 }, { exposed: 0 }];
  assert.equal(
    connectVerdict(est, 'net', items),
    '1 of 3 sites reach clouds over the public internet. 2 are on the AT&T fabric.',
  );
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`   Expected: FAIL with `Cannot find module '/Users/micahbos/Developer/cloud-connect/naas-verdicts.js'`.

- [ ] **Step 3: Create `naas-verdicts.js`.**

```js
// The written verdicts. One sentence per screen, derived from the estate and nothing
// else, so they can be asserted without a browser. Observe's verdict is `ob.verdict`
// in naas-addendum.js, which was already pure; it stays where it is.
import { fmt } from './naas-logic.js';

export function connectVerdict(est, layer = 'cloud', items = []) {
  if (est.stage === 'empty') return 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.';
  const cloud = layer === 'cloud';
  const base = cloud ? est.regionsList.map(r => ({ exposed: r.priv ? 0 : 1 })) : items;
  const exposedN = base.filter(t => t.exposed > 0).length;
  const totalN = base.length;
  const noun = cloud
    ? ['region', 'regions', 'still ride the public internet']
    : ['site', 'sites', 'reach clouds over the public internet'];
  if (!exposedN) return `Every ${noun[0]} is on the AT&T fabric.`;
  const onFabric = totalN - exposedN;
  const extra = cloud && est.regionsExtra ? `, plus ${est.regionsExtra} smaller regions rolled up` : '';
  return `${exposedN} of ${totalN} ${noun[1]} ${noun[2]}. ${onFabric} ${onFabric === 1 ? 'is' : 'are'} on the AT&T fabric${extra}.`;
}

export function governVerdict(est) {
  if (est.stage === 'empty') return 'No policies yet. Three starting points below.';
  const pci = (est.findings.find(f => f.kind === 'pci') || {}).head;
  return `${est.policiesEnforced} policies enforced. ${pci || (est.policiesAuthored - est.policiesEnforced) + ' authored but not enforced.'}`;
}

export function costVerdict(est, ob, totalSave, buckets = []) {
  if (est.stage === 'empty') return 'No egress seen yet.';
  if (totalSave) return `${fmt(totalSave)}/mo on the table across ${est.findings.filter(f => f.priced).length} priced findings. ${fmt(ob.savingsMo)}/mo already saved on the fabric.`;
  const steerable = buckets.filter(b => b.today > b.fabric);
  if (!steerable.length) return 'Every bucket is already on the fabric.';
  return `${fmt(steerable.reduce((a, b) => a + b.today, 0))}/mo leaves through public egress that the fabric would carry for ${fmt(steerable.reduce((a, b) => a + b.fabric, 0))}.`;
}
```

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: 61 passing (56 baseline + 5).

- [ ] **Step 5: Point `naas-app.js` at the module.** Run this from the repo root. It locates each block by content, guards before it splices, and throws rather than damaging the file:

```bash
node - <<'JS'
const fs = require('fs');
const p = 'naas-app.js';
const L = fs.readFileSync(p, 'utf8').split('\n');
const at = (needle) => { const i = L.findIndex(l => l.includes(needle)); if (i < 0) throw new Error('anchor not found: ' + needle); return i; };

const iCost = at('const costVerdict = isEmpty ?');
L.splice(iCost, 1, '  const costVerdict = VD.costVerdict(est, ob, totalSave, buckets);');

const iPci = at('const pciViol =');
if (!L[iPci + 1].includes('const governVerdict =')) throw new Error('governVerdict no longer sits under pciViol');
L.splice(iPci, 2, '  const governVerdict = VD.governVerdict(est);');

const iBase = at('const baseItems =');
if (!L[iBase + 3].includes('const connectVerdict =')) throw new Error('the connect verdict block moved');
L.splice(iBase, 4, '  const connectVerdict = VD.connectVerdict(est, s.layer, levelItems);');

const iImp = at("import * as V from './naas-volume.js';");
L.splice(iImp + 1, 0, "import * as VD from './naas-verdicts.js';");

fs.writeFileSync(p, L.join('\n'));
console.log('ok');
JS
```

Then re-run `npm test`. Expected: 61 passing. `naas-app.js` loses three lines net (four removed from the verdict blocks, one import added).

- [ ] **Step 6: Verify in the browser.** Serve with `npx http-server . -p 8787 -c-1`. Open `http://localhost:8787/NaaS%20Storefront.dc.html?view=mature#s3/cloud/connect`. Nothing should look different — this task is a refactor. Confirm the red render-error banner at the top left is absent, then walk `#s3/cloud/govern` and `#s3/cloud/cost` on `?view=mature` and `?view=trust`, and `?view=empty#s3/cloud/connect`. Four estates checked: empty, partial, mature, trust (open `?view=partial#s3/cloud/cost` too, since it is the one estate that takes the `totalSave` branch alongside trust).

- [ ] **Step 7: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-verdicts.js naas-app.js tests/verdicts.test.mjs
git commit -m "$(cat <<'EOF'
refactor: the three written verdicts become pure functions with a test per estate

They were built inline inside renderVals, which needs a DOM to run, so the
sentences the product is supposed to lead with were never assertable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The verdict leads the page, the stat string follows it

`deptVerdict` is computed at `naas-app.js:390` and bound zero times. What renders in the title row is `pageSub`, a dot-separated stat string with no verb. On Home the same pair exists: `floorVerdict0` (`:372`) is the written sentence, `floorVerdict` (`:374`) is the stats, and only the stats render.

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:390` (two string replacements on one line)
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:255`
- Test: `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `connectVerdict`, `governVerdict`, `costVerdict` from Task 1, via the locals of the same name in `renderVals`; `ob.verdict`; `floorVerdict0`.
- Produces: two template values, replacing two —
  - `pageVerdict: string` — the written sentence for the current screen (`s3` → the tab's verdict, `s2` → `floorVerdict0`, otherwise `''`). It **replaces** `deptVerdict`, whose ternary is identical to the `s3` branch. Verified: `deptVerdict` is written once, at `naas-app.js:390`, and bound zero times in the markup, so renaming it costs nothing and leaves one source of truth instead of two copies of the same ternary.
  - `pageStat: string` — the dot-separated stat line, formerly `pageSub`
  - `pageSub` and `deptVerdict` are both retired. `pageSub` had exactly one binding, the one this task replaces; `deptVerdict` had none.

- [ ] **Step 1: Write the failing test.** Create `tests/markup.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
const count = (re) => (HTML.match(re) || []).length;

test('the page title row leads with the verdict and demotes the stat line', () => {
  const i = HTML.indexOf('{{ pageTitle }}');
  assert.ok(i > 0, 'the page title row is gone');
  const row = HTML.slice(i, i + 900);
  assert.ok(row.includes('{{ pageVerdict }}'), 'the written verdict is not bound in the title row');
  assert.ok(row.includes('{{ pageStat }}'), 'the stat string is not bound in the title row');
  assert.ok(row.indexOf('{{ pageVerdict }}') < row.indexOf('{{ pageStat }}'), 'the stat line must sit under the verdict');
  assert.equal(HTML.includes('{{ pageSub }}'), false, 'pageSub is retired');
  // deptVerdict was the same ternary under a name nothing bound. One copy, or it drifts.
  assert.equal(APP.includes('deptVerdict'), false, 'deptVerdict was renamed to pageVerdict, not duplicated by it');
});

test('every container the markup opens, it closes', () => {
  const pairs = [
    ['div', /<div\b/g, /<\/div>/g],
    ['sc-if', /<sc-if\b/g, /<\/sc-if>/g],
    ['sc-for', /<sc-for\b/g, /<\/sc-for>/g],
    ['section', /<section\b/g, /<\/section>/g],
    ['button', /<button\b/g, /<\/button>/g],
  ];
  for (const [name, open, close] of pairs) assert.equal(count(open), count(close), `${name} is unbalanced`);
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `the written verdict is not bound in the title row`. The balance test passes already (844 divs, 282 `sc-if`, 171 `sc-for` at `04bbb1e`); it is the guard against constraint 4, not a new assertion.

- [ ] **Step 3: Add the two values in `naas-app.js`.** Two exact string replacements on line 390. First, replace

```
    deptVerdict: s.tab === 'govern' ? governVerdict : s.tab === 'cost' ? costVerdict : s.tab === 'observe' ? ob.verdict : connectVerdict, pageSub: s.screen === 's3' ? ({ connect:
```

with

```
    pageVerdict: s.screen === 's3' ? (s.tab === 'govern' ? governVerdict : s.tab === 'cost' ? costVerdict : s.tab === 'observe' ? ob.verdict : connectVerdict) : s.screen === 's2' ? floorVerdict0 : '', pageStat: s.screen === 's3' ? ({ connect:
```

This is a rename, not an addition: `deptVerdict`'s ternary becomes `pageVerdict`'s `s3` branch, with the `s2` branch in front of it. Writing `pageVerdict` *beside* `deptVerdict` would leave the same ternary in the file twice, free to drift. `floorVerdict0` is at `naas-app.js:372`, in scope. This is a JavaScript expression in the values layer, not a dc-runtime binding, so the nested ternaries are fine — constraint 2 governs what goes inside `{{ }}`, and the markup binds only `{{ pageVerdict }}`.

Second, on the same line, replace

```
}[s.tab] || connectVerdict) : s.screen === 's2' ? floorVerdict : '', hasPageSub:
```

with

```
}[s.tab] || '') : s.screen === 's2' ? floorVerdict : '', hasPageSub:
```

The second replacement matters: the old fallback made a verdict masquerade as a stat line whenever `s.tab` was unrecognised, which would now print the verdict twice.

- [ ] **Step 4: Rewrite the title row in `NaaS Storefront.dc.html`.** Replace, exactly:

```html
<sc-if value="{{ hasPageSub }}" hint-placeholder-val="{{ false }}"><div style="font-size:13px;line-height:18px;color:var(--text-body);text-wrap:pretty">{{ pageSub }}</div></sc-if>
```

with:

```html
<sc-if value="{{ hasPageSub }}" hint-placeholder-val="{{ false }}"><div style="font-size:14px;line-height:20px;font-weight:500;color:var(--text-heading);text-wrap:pretty">{{ pageVerdict }}</div><div style="font-size:12px;line-height:17px;color:var(--text-light);text-wrap:pretty">{{ pageStat }}</div></sc-if>
```

The replacement is a single line ending in `</sc-if>`. One `<div>` becomes two, both closed: div opens and div closes each go 844 → 845, so the balance test still passes.

- [ ] **Step 5: Run the test to verify it passes.** Run: `npm test`  Expected: 63 passing (61 + 2).

- [ ] **Step 6: Verify in the browser.** At 1440x900:
  - `?view=mature#s3/cloud/connect` — first line reads `1 of 8 regions still ride the public internet. 7 are on the AT&T fabric, plus 10 smaller regions rolled up.`; second line is the `regions public · attached · sites` stat string, smaller and lighter.
  - `?view=mature#s3/cloud/observe` — `95% of traffic on the AT&T fabric, saving $61.4k/mo. 1 region is blind.`
  - `?view=mature#s3/cloud/govern` — `14 policies enforced. 2 authored but not enforced.`
  - `?view=mature#s3/cloud/cost` — `$32,800/mo leaves through public egress that the fabric would carry for $15,300.`
  - `?view=mature#s2` — Home shows the `floorVerdict0` sentence over the stats.
  - The title row must not wrap into the Re-discover button cluster; the verdict block is `flex:1 1 320px` and the buttons are on the right. Confirm no button sits within 10px of the row edge.
  - **Below the edit** (constraint 4): screenshot `?view=mature#s3/cloud/cost` scrolled to the foot of the page and confirm the Next stop row still renders. A stray tag in the title row kills every screen under it.
  - Estates checked: empty (`?view=empty#s3/cloud/connect`), partial, mature, trust.

- [ ] **Step 7: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js "NaaS Storefront.dc.html" tests/markup.test.mjs
git commit -m "$(cat <<'EOF'
design: the page says what it found before it says how many

The four verdict sentences were written and never reached a screen. They lead
the title row now; the dot-separated stat string is the second line.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Observe closes the loop

Every page ends with a Next stop row except Observe. `nextStop` is computed at `naas-app.js:887`, spread into `obX` at `:1298`, and drawn zero times. The three shipped rows are `fx-alert` blocks at `html:1040` (Connect), `:1108` (Govern) and `:1407` (Cost); this copies that pattern exactly.

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-verdicts.js` (add `observeNext`)
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:886-887`
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:1308`
- Test: `tests/verdicts.test.mjs`, `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `connections(est, ob) -> { rows: [{ degraded, wl, cloud, region, paths, ... }], total, degraded }` from `naas-connections.js`.
- Produces: `observeNext(conns) -> { title: string, text: string, cta: string }`. `naas-app.js` spreads it and attaches `go`, so the template value `nextStop` keeps the shape the other three rows use: `{ title, text, cta, go }`.

- [ ] **Step 1: Write the failing test.** Append to `tests/verdicts.test.mjs`:

```js
import { connections } from '../naas-connections.js';
import { observeNext } from '../naas-verdicts.js';

const NEXT = {
  partial: '40 workloads behind Azure eastus ride a single path with no policy that requires a second. Author the policy, simulate it, then enforce it.',
  mature: '96 workloads behind AWS eu-central-1 ride a single path with no policy that requires a second. Author the policy, simulate it, then enforce it.',
  trust: '420 workloads behind AWS us-east-2 ride a single path with no policy that requires a second. Author the policy, simulate it, then enforce it.',
};

test('Observe points at the degraded connection and the policy that would fix it', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id];
    const ob = A.observe(est, [], A.inventory(est));
    const next = observeNext(connections(est, ob));
    assert.equal(next.title, 'Next stop: Govern', id);
    assert.equal(next.text, NEXT[id], id);
    assert.equal(next.cta, 'Open Govern', id);
  }
});

test('with nothing connected, Observe still names a next stop', () => {
  const est = D.ESTATES.empty;
  const ob = A.observe(est, [], A.inventory(est));
  const next = observeNext(connections(est, ob));
  assert.equal(next.text, 'Every connection is up. Set a latency SLO for the tags that still cross the public internet, then enforce it.');
});
```

And append to `tests/markup.test.mjs`:

```js
test('Observe closes the loop with a Next stop row', () => {
  const start = HTML.indexOf('<sc-if value="{{ tObserve }}"');
  const end = HTML.indexOf('<sc-if value="{{ tCost }}"');
  assert.ok(start > 0 && end > start, 'the Observe tab block is gone');
  const observe = HTML.slice(start, end);
  for (const b of ['{{ nextStop.title }}', '{{ nextStop.text }}', '{{ nextStop.cta }}', '{{ nextStop.go }}']) {
    assert.ok(observe.includes(b), `${b} is not bound inside the Observe tab`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `The requested module '../naas-verdicts.js' does not provide an export named 'observeNext'`.

- [ ] **Step 3: Add `observeNext` to `naas-verdicts.js`.** Append:

```js
// The loop is Connect -> Observe -> Govern -> Cost -> Connect. Observe's stop is Govern,
// and it points at the one connection that would justify the policy.
export function observeNext(conns) {
  const deg = (conns.rows || []).find(r => r.degraded);
  return {
    title: 'Next stop: Govern',
    text: deg
      ? `${deg.wl.toLocaleString('en-US')} workloads behind ${deg.cloud} ${deg.region} ${deg.paths >= 2 ? 'have a second path but no policy that requires one' : 'ride a single path with no policy that requires a second'}. Author the policy, simulate it, then enforce it.`
      : 'Every connection is up. Set a latency SLO for the tags that still cross the public internet, then enforce it.',
    cta: 'Open Govern',
  };
}
```

- [ ] **Step 4: Make `naas-app.js` use it.** Replace the two lines at `:886-887`. The first line, exactly:

```js
  const degRow = conns.rows.find(r => r.degraded);
```

`degRow` is referenced nowhere else. Replace those two lines with one:

```js
  const nextStop = { ...VD.observeNext(conns), go: go('s3', { layer: 'cloud', tab: 'govern' }) };
```

`addendumVals` does not import `naas-verdicts.js` by itself — it is the same module as `renderVals`, and the `VD` import added in Task 1 is file-scoped. Confirm `import * as VD from './naas-verdicts.js';` is present near the top before running.

- [ ] **Step 5: Render the row.** In `NaaS Storefront.dc.html`, replace exactly:

```html
    <sc-if value="{{ isEmpty }}" hint-placeholder-val="{{ false }}"><div style="padding:24px;border:1px dashed var(--border-secondary);border-radius:16px;color:var(--text-light);font-size:14px;line-height:20px">No telemetry yet. It starts with the first attach.</div></sc-if>
```

with:

```html
    <div class="fx-alert" role="status" aria-label="Next stop">
      <div class="fx-alert-body"><span class="fx-alert-icon" aria-hidden="true"></span><div><div class="fx-alert-title">{{ nextStop.title }}</div><div class="fx-alert-text">{{ nextStop.text }}</div></div></div>
      <button class="fx-btn" onClick="{{ nextStop.go }}">{{ nextStop.cta }}</button>
    </div>
    <sc-if value="{{ isEmpty }}" hint-placeholder-val="{{ false }}"><div style="padding:24px;border:1px dashed var(--border-secondary);border-radius:16px;color:var(--text-light);font-size:14px;line-height:20px">No telemetry yet. It starts with the first attach.</div></sc-if>
```

This lands the row inside the Observe tab's `display:grid;gap:16px` container (opened at `html:1118`) and outside the `hasKpis` gate that closes at `:1307`, so it renders on the empty estate too — the same position Cost uses, where the alert opens at `:1407` and the empty fallback follows it.

Tag count for constraint 4: the inserted block opens **five** `<div>` (`fx-alert`, `fx-alert-body`, the bare wrapper, `fx-alert-title`, `fx-alert-text`) and closes five; one `<span>` open and close; one `<button>` open and close. Nothing else in the file moves, so the balance test in `tests/markup.test.mjs` goes 844 → 849 on both sides and stays green.

- [ ] **Step 6: Run the test to verify it passes.** Run: `npm test`  Expected: 66 passing (63 + 3).

- [ ] **Step 7: Verify in the browser.** At 1440x900, `?view=mature#s3/cloud/observe`:
  - The Observe **dashboard** (tiles, map, gauges, queue, panel) must still fit the fold with no page scroll before the Insights section. The new row is below Logs, at the very foot; it does not move anything above it.
  - Scroll to the foot: the row reads `Next stop: Govern` / `96 workloads behind AWS eu-central-1 ride a single path…` with an `Open Govern` button. The button must not sit within 10px of the card edge — it is the shipped `fx-btn` inside `fx-alert`, identical to the row at the foot of Cost, so compare the two side by side.
  - Click `Open Govern`: the page must switch to the Govern tab in place, not navigate away (constraint 6).
  - **Below the edit:** the Cost tab starts immediately after this block. Open `#s3/cloud/cost` and confirm it renders in full down to its own Next stop row.
  - Estates checked: empty (`?view=empty#s3/cloud/observe` — the row reads `Every connection is up…` above the `No telemetry yet` panel), partial, mature, trust.

- [ ] **Step 8: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-verdicts.js naas-app.js "NaaS Storefront.dc.html" tests/verdicts.test.mjs tests/markup.test.mjs
git commit -m "$(cat <<'EOF'
design: Observe names its next stop, so the loop closes

nextStop was computed, spread into the Observe values, and drawn zero times.
It is now the same fx-alert row the other three pages end with.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Retire the five-stop model

Two contradictory loop orders coexist. The shipped rows run Connect → Observe → Govern → Cost. `naas-addendum.js:265-277` holds `STOPS` / `STOP_LABEL` / `stopCta`, a five-stop model running discover → connect → govern → observe → cost. The shipped four-word order wins.

**Careful:** `stations` and `showTrack` (`naas-app.js:738`, `:1354`) are unbound and go with it, but **`stationCta` IS bound**, at `html:570`, in the Explore 360 title row. It must keep working. Today on Explore 360 it reads `Attach 52` on mature, `Attach 174` on partial, `Attach 598` on trust, `Connect` on empty, and it goes to the Connect tab. The replacement below reproduces every one of those exactly.

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-addendum.js:264-277` (delete)
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js:735-742`, `:1354`
- Test: `tests/verdicts.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `stationCta: { label: string, go: () => void }` stays in the values layer with the same shape. `A.STOPS`, `A.STOP_LABEL`, `A.stopCta` cease to exist; `stations`, `showTrack` and `showStationCta` leave the values layer.

- [ ] **Step 1: Write the failing test.** Append to `tests/verdicts.test.mjs`:

```js
test('the five-stop model is gone; the shipped four-word order is the only loop', async () => {
  const addendum = await import('../naas-addendum.js');
  for (const name of ['STOPS', 'STOP_LABEL', 'stopCta']) {
    assert.equal(name in addendum, false, `naas-addendum still exports ${name}`);
  }
  assert.ok(typeof addendum.observe === 'function', 'observe() must survive the deletion');
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `naas-addendum still exports STOPS`.

- [ ] **Step 3: Delete the model from `naas-addendum.js`.** Remove the block that begins with the comment `// ---------- Station track ----------` and runs to the closing brace of `stopCta`, i.e. lines 264-277 inclusive:

```bash
node - <<'JS'
const fs = require('fs');
const p = 'naas-addendum.js';
const L = fs.readFileSync(p, 'utf8').split('\n');
const i = L.findIndex(l => l.includes('// ---------- Station track ----------'));
if (i < 0) throw new Error('station track block not found');
if (!L[i + 1].startsWith('export const STOPS')) throw new Error('unexpected block head');
const j = L.findIndex((l, k) => k > i && l === '}');
if (j < 0 || j - i > 20) throw new Error('could not find the end of stopCta');
L.splice(i, j - i + 1);
fs.writeFileSync(p, L.join('\n'));
console.log('removed lines', i + 1, 'to', j + 1);
JS
```

`short()` at `naas-addendum.js:194` is still used by `kpis` and `briefing`; leave it.

- [ ] **Step 4: Replace the station track in `naas-app.js`.** Remove lines 735-742 (`// station track` through `const stationCta = ...`) and put back only the CTA:

```bash
node - <<'JS'
const fs = require('fs');
const p = 'naas-app.js';
const L = fs.readFileSync(p, 'utf8').split('\n');
const i = L.findIndex(l => l.trim() === '// station track');
if (i < 0) throw new Error('station track comment not found');
if (!L[i + 7].includes('const stationCta =')) throw new Error('the station block is not 8 lines any more');
L.splice(i, 8,
  '  // The loop is Connect -> Observe -> Govern -> Cost. Explore 360 is the way in, so its',
  '  // one call to action is Connect. (The five-stop model it used to read is deleted.)',
  "  const stationCta = { label: attachN ? `Attach ${attachN.toLocaleString('en-US')}` : 'Connect', go: go('s3', { layer: s.layer, tab: 'connect' }) };");

const j = L.findIndex(l => l.includes("showStationCta: s.screen !== 's4',"));
if (j < 0) throw new Error('the stations values line is gone');
if (!L[j].trim().startsWith('stations:')) throw new Error('unexpected values line shape');
L[j] = '    stationCta,';

fs.writeFileSync(p, L.join('\n'));
console.log('ok');
JS
```

- [ ] **Step 5: Run the test to verify it passes.** Run: `npm test`  Expected: 67 passing (66 + 1).

- [ ] **Step 6: Verify in the browser.** Explore 360 is screen `s1`:
  - `?view=mature#s1` — wait out the scan, then the button in the title row (right of `+ Add cloud`) reads **Attach 52** and opens the Connect tab in place.
  - `?view=partial#s1` reads **Attach 174**; `?view=trust#s1` reads **Attach 598**; `?view=empty#s1` reads **Connect**.
  - Select a VPC in the tree and confirm the label changes to that selection's workload count — `attachN` is `selWl || pubWl` and is untouched by this task.
  - **Below the edit:** `html:570` is in the Explore 360 header; screenshot the estate tree and the Insights below it on `?view=trust#s1` to confirm nothing under the header went blank. No markup changed in this task, so the tag counts are unchanged; `npm test` proves it.
  - Estates checked: empty, partial, mature, trust.

- [ ] **Step 7: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-addendum.js naas-app.js tests/verdicts.test.mjs
git commit -m "$(cat <<'EOF'
cleanup: one loop, not two

naas-addendum carried a five-stop discover/connect/govern/observe/cost model
that contradicted the four words the app ships. Deleted, with the Explore 360
call to action rebuilt on the shipped order.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The scan tells its four beats

`scanSteps` (`naas-app.js:333-338`) holds four steps, each with a `src` string naming what is being read. Only `scanLine` renders, beside a spinner at `html:575`. The renderer at `html:2077` and `:2096` already decorates each step with `icon`, `iconSrc`, `fillBg` and `mark` — somebody built the list and nobody drew it.

Two bugs ride along. `scanDone` at `:339` is `s.scanStep >= 4 || isEmpty === false && s.scanStep >= 4`, where the right half is a subset of the left, and the const is dead anyway: line 441 recomputes the value it actually exports. And Explore 360 reached by a hash change never starts its scan — `init` calls `startScan` at `:55`, the `hashchange` listener at `:31-38` does not — so the spinner spins forever.

Timing is left alone: `startScan` (`:475-479`) stays at 750ms × 4. The spec's "give it room" is the list, not the clock.

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/naas-app.js` — new export inserted above `init` at `:26`, listener body `:31-38`, dead const `:339`
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:575`
- Test: `tests/route.test.mjs`, `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `scanSteps` rows, which already carry `{ key, label, src, done, active, color, textColor, icon, iconSrc, fillBg, mark }`.
- Produces: `hashRoute(hash: string) -> { screen?: string, layer?: string, tab?: string }`, exported from `naas-app.js`.

- [ ] **Step 1: Write the failing test.** Create `tests/route.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashRoute } from '../naas-app.js';

test('the hash resolves to a screen patch', () => {
  assert.deepEqual(hashRoute('#s1'), { screen: 's1' });
  assert.deepEqual(hashRoute('#s3/cloud/observe'), { screen: 's3', layer: 'cloud', tab: 'observe' });
});

test('an unroutable hash produces an empty patch, so nothing is set', () => {
  assert.deepEqual(hashRoute(''), {});
  assert.deepEqual(hashRoute('#nonsense'), {});
  assert.deepEqual(hashRoute('#s3/nonsense/nonsense'), { screen: 's3' });
});
```

And append to `tests/markup.test.mjs`:

```js
test('the scan shows its four beats and what each one reads', () => {
  const open = '<sc-for list="{{ scanSteps }}" as="sst"';
  const i = HTML.indexOf(open);
  assert.ok(i > 0, 'scanSteps is never rendered');
  const block = HTML.slice(i, HTML.indexOf('</sc-for>', i));
  assert.ok(block.includes('{{ sst.label }}'), 'the step has no label');
  assert.ok(block.includes('{{ sst.src }}'), 'the step never says what it is reading');
  assert.ok(block.includes('{{ sst.mark }}'), 'a finished step is not marked done');
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `The requested module '../naas-app.js' does not provide an export named 'hashRoute'`, and `scanSteps is never rendered`.

- [ ] **Step 3: Extract `hashRoute` and start the scan on a hash landing.** In `naas-app.js`, insert this immediately above `export function init(c) {` (line 26):

```js
// The hash is the app's only route. Pulled out of the listener so it can be asserted
// without a browser, and so an s1 landing can start its scan.
export function hashRoute(hash) {
  const h = (hash || '').replace('#', '').split('/');
  const p = {};
  if (SCREENS[h[0]]) p.screen = h[0];
  if (h[1] && D.LAYERS.find(l => l.id === h[1])) p.layer = h[1];
  if (h[2] && TABS.includes(h[2])) p.tab = h[2];
  return p;
}
```

Then replace the listener body, exactly:

```js
    window.addEventListener('hashchange', () => {
      const h = (location.hash || '').replace('#', '').split('/');
      const p = {};
      if (SCREENS[h[0]]) p.screen = h[0];
      if (h[1] && D.LAYERS.find(l => l.id === h[1])) p.layer = h[1];
      if (h[2] && TABS.includes(h[2])) p.tab = h[2];
      if (Object.keys(p).length) c.setState(p);
    });
```

with:

```js
    window.addEventListener('hashchange', () => {
      const p = hashRoute(location.hash);
      if (!Object.keys(p).length) return;
      c.setState(p);
      // Explore 360 reached by a hash change never ran startScan, so the spinner
      // spun forever on a scanStep that nothing was advancing.
      if (p.screen === 's1') startScan(c);
    });
```

- [ ] **Step 4: Delete the dead tautological `scanDone`.** In `naas-app.js`, delete the whole line:

```js
  const scanDone = s.scanStep >= 4 || isEmpty === false && s.scanStep >= 4;
```

It is referenced nowhere. The exported value is built independently at line 441 as `scanDone: s.scanStep >= 4`, and that is the one the markup reads. Confirm with `grep -n scanDone naas-app.js` before and after: one hit should remain.

- [ ] **Step 5: Render the four beats.** In `NaaS Storefront.dc.html`, find the spinner line inside the `scanning` block (`html:575`) and insert the list immediately after it. Replace exactly:

```html
    <div style="display:flex;align-items:center;gap:10px;font-size:13px;line-height:18px;color:var(--text-body)"><span aria-hidden="true" style="width:14px;height:14px;border-radius:9999px;border:2px solid var(--cta);border-top-color:transparent;animation:skSpin .9s linear infinite;flex:none"></span>{{ scanLine }}</div>
```

with:

```html
    <div style="display:flex;align-items:center;gap:10px;font-size:13px;line-height:18px;color:var(--text-body)"><span aria-hidden="true" style="width:14px;height:14px;border-radius:9999px;border:2px solid var(--cta);border-top-color:transparent;animation:skSpin .9s linear infinite;flex:none"></span>{{ scanLine }}</div>
    <div style="display:grid;gap:10px;padding:14px 16px;background:var(--bg-base);border:1px solid var(--border-secondary);border-radius:12px">
      <sc-for list="{{ scanSteps }}" as="sst" hint-placeholder-count="4">
        <div style="display:grid;grid-template-columns:18px minmax(0,1fr);gap:12px;align-items:start;min-width:0">
          <span aria-hidden="true" style="width:16px;height:16px;margin-top:2px;box-sizing:border-box;border-radius:9999px;border:2px solid {{ sst.color }};background:{{ sst.fillBg }};color:#fff;font-size:10px;line-height:12px;text-align:center">{{ sst.mark }}</span>
          <div style="display:grid;gap:2px;min-width:0">
            <div style="font-size:13px;line-height:18px;font-weight:500;color:{{ sst.textColor }};text-wrap:pretty">{{ sst.label }}</div>
            <div style="font-size:11px;line-height:16px;color:var(--text-light);text-wrap:pretty">{{ sst.src }}</div>
          </div>
        </div>
      </sc-for>
    </div>
```

The loop variable is `sst`, not `st`, because `st` is already the loop variable in several sibling `sc-for` blocks and a collision is not worth the risk. No colour is hardcoded: `sst.color` and `sst.textColor` are `var(--…)` strings built in `naas-app.js:338`, and `sst.fillBg` and `sst.mark` are added by the decorator at `html:2096` (`fillBg: st.done ? 'var(--success)' : 'transparent'`). The `#fff` on the tick is the same literal the shipped CTA button at `html:570` uses. The `sc-for` sits inside a plain `<div>`, not a `<table>` or an `<svg>`, so constraint 1 holds.

Tag count for constraint 4: the inserted block opens **five** `<div>` (the card, the row, the text stack, the label, the source) and closes five; one `<span>` open and close; one `<sc-for>` open and close. After Task 3 the balance test goes 849 → 854 on divs and 171 → 172 on `sc-for`, both sides, and stays green.

- [ ] **Step 6: Run the test to verify it passes.** Run: `npm test`  Expected: 70 passing (67 + 3).

- [ ] **Step 7: Verify in the browser.**
  - `?view=mature#s1` on a cold load: the four beats appear under the spinner, each with its source line — `regions, VPCs and VNets, subnets, gateways, endpoints, workloads`, `NetBond, AVPN (MPLS VPN), ADI (Dedicated Internet), ABF (Business Fiber)`, `41 metros`, `last 30 days`. Each step's dot fills green with a tick as the scan passes it, over three seconds, then the tree replaces the block.
  - **The hashchange bug, reproduced then fixed:** load `?view=mature#s3/cloud/observe`, then edit the address bar hash to `#s1` and press Enter without reloading. Before the fix the spinner spins forever; after it, the scan runs and completes. Do this once on `?view=trust` too.
  - **Below the edit:** the scanning block sits above the whole Explore 360 body. After the scan completes, confirm the estate tree, the stat chips and the Insights all render on `?view=trust#s1`.
  - Estates checked: empty (`?view=empty#s1` — note the empty estate still runs its fake scan; that guard is spec section 4 and belongs to wave 3, not here), partial, mature, trust.

- [ ] **Step 8: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add naas-app.js "NaaS Storefront.dc.html" tests/route.test.mjs tests/markup.test.mjs
git commit -m "$(cat <<'EOF'
design: the scan says what it is reading, and a hash landing actually scans

The four beats and their source strings were computed and hidden behind a
spinner. Also drops a tautological dead scanDone and starts the scan when
Explore 360 is reached by a hash change, which used to freeze the spinner.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: The eight Flywheel token corrections

The storefront is already 17 of 29 tokens exact against the Flywheel 3 extraction at `~/Developer/att-netbond-sdci/tailwind.config.js`. Eight have drifted. All eight are values in the single `[data-theme="light"]` block at `NaaS Storefront.dc.html:63`. No component is touched.

`--warning`, `--error`, `--viz-4` and `--viz-5` are **not** in this task. Flywheel's `orange-600` (`#ea712f`) and `red-600` (`#c70032`) are markedly louder than what ships, and Flywheel has no purple at all. Spec section 5 calls that a design decision rather than a migration and defers it to Micah. The second test below pins the four at today's values so the deferral is enforced rather than remembered.

The dark theme is out of scope: Flywheel's dark ramp is not in the extraction on disk.

**Files:**
- Modify: `/Users/micahbos/Developer/cloud-connect/NaaS Storefront.dc.html:63`
- Test: `tests/tokens.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing in code. Eight changed custom-property values.

- [ ] **Step 1: Write the failing test.** Create `tests/tokens.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

const theme = (name) => {
  const head = `[data-theme="${name}"]{`;
  const i = HTML.indexOf(head);
  assert.ok(i > 0, `no ${name} theme block`);
  const body = HTML.slice(i + head.length, HTML.indexOf('}', i));
  return Object.fromEntries(body.split(';').filter(Boolean).map(d => d.split(':').map(x => x.trim())));
};

// Flywheel 3, from ~/Developer/att-netbond-sdci/tailwind.config.js (Figma-matched from SDCI.fig).
const FLYWHEEL = {
  '--success': '#2d7e24',          // green-600
  '--viz-3': '#2d7e24',            // green-600
  '--border-primary': '#bdc2c7',   // gray-400
  '--text-disabled': '#878c94',    // gray-500
  '--viz-6': '#878c94',            // gray-500
  '--border-secondary': '#dcdfe3', // gray-300
  '--sidebar-accent': '#e6f0fa',   // cobalt-100
  '--bg-neutral': '#f3f4f6',       // gray-200
};

test('the light theme carries Flywheel 3 values for the eight drifted tokens', () => {
  const t = theme('light');
  for (const [k, v] of Object.entries(FLYWHEEL)) assert.equal(t[k], v, k);
});

test('the four tokens Flywheel has no answer for are left alone until a human rules', () => {
  const t = theme('light');
  assert.equal(t['--warning'], '#b85f00', 'fw orange-600 #ea712f is markedly louder; deferred');
  assert.equal(t['--viz-4'], '#b85f00', 'same as --warning; deferred');
  assert.equal(t['--error'], '#c23131', 'fw red-600 #c70032 is markedly louder; deferred');
  assert.equal(t['--viz-5'], '#7d3f98', 'Flywheel has no purple; deferred');
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `npm test`  Expected: FAIL with `--success` — `Expected values to be strictly equal: '#1f7a3d' !== '#2d7e24'`. The second test passes already; that is its job.

- [ ] **Step 3: Replace the light theme line.** In `NaaS Storefront.dc.html`, replace line 63 exactly. Old:

```css
[data-theme="light"]{--bg-base:#ffffff;--bg-wash:#f8fafb;--bg-neutral:#eef2f5;--bg-accent:#e6f0fa;--text-heading:#13171b;--text-body:#454b52;--text-light:#686e74;--text-disabled:#8a949c;--link:#0057b8;--border-primary:#c2cbd2;--border-secondary:#dfe5ea;--border-active:#0057b8;--cta:#0057b8;--cta-hover:#00388f;--success:#1f7a3d;--warning:#b85f00;--error:#c23131;--band:#e6f0fa;--band-stroke:#99daf5;--sidebar-accent:#dcf3fa;--sidebar-fg:#1d2329;--sidebar-muted:#686e74;--sidebar-border:#dcdfe3;--viz-1:#0057b8;--viz-2:#009fdb;--viz-3:#1f7a3d;--viz-4:#b85f00;--viz-5:#7d3f98;--viz-6:#8a949c}
```

New:

```css
[data-theme="light"]{--bg-base:#ffffff;--bg-wash:#f8fafb;--bg-neutral:#f3f4f6;--bg-accent:#e6f0fa;--text-heading:#13171b;--text-body:#454b52;--text-light:#686e74;--text-disabled:#878c94;--link:#0057b8;--border-primary:#bdc2c7;--border-secondary:#dcdfe3;--border-active:#0057b8;--cta:#0057b8;--cta-hover:#00388f;--success:#2d7e24;--warning:#b85f00;--error:#c23131;--band:#e6f0fa;--band-stroke:#99daf5;--sidebar-accent:#e6f0fa;--sidebar-fg:#1d2329;--sidebar-muted:#686e74;--sidebar-border:#dcdfe3;--viz-1:#0057b8;--viz-2:#009fdb;--viz-3:#2d7e24;--viz-4:#b85f00;--viz-5:#7d3f98;--viz-6:#878c94}
```

Replacing the whole line is deliberate: `--viz-6:#8a949c` appears in both the light and the dark block, so a token-by-token find-and-replace would hit the dark theme by accident.

- [ ] **Step 4: Run the test to verify it passes.** Run: `npm test`  Expected: 72 passing (70 + 2).

- [ ] **Step 5: Verify in the browser.** At 1440x900, light theme:
  - `?view=mature#s3/cloud/observe` — the success greens (gauge rings, `Do ·` labels, connected dots) shift from `#1f7a3d` to the slightly warmer `#2d7e24`. Card borders (`--border-secondary`) get very slightly darker and cooler. Nothing should look broken, only settled.
  - `?view=mature#s3/cloud/cost` — the `--viz-3` series in the charts must match the success green exactly; they are the same value.
  - The rail's selected row uses `--sidebar-accent`, now `#e6f0fa`, which is the same value as `--bg-accent`. Confirm the selected rail row is still distinguishable from the rail background (`--bg-base` / `--bg-wash`); if the loss of the cyan tint reads as a regression, note it for Micah rather than reverting — the value is the Flywheel cobalt-100 the spec names.
  - Toggle the theme to dark and back. The dark block is untouched; confirm it still renders and that `?theme=dark` pre-paint is unaffected.
  - **Below the edit:** line 63 is above the entire document. Screenshot Home (`#s2`), Explore 360 (`#s1`) and all four tabs to confirm nothing went blank. The token test plus `npm test` covers the parse; the screenshots cover the paint.
  - Estates checked: empty, partial, mature, trust.
  - Known and out of scope: `naas-app.js` hardcodes `#8a949c` in **four** places that no longer equal `--text-disabled` / `--viz-6` — `:283` (hero Sankey ribbon fill), `:752` (flow Sankey ribbon fill), `:1048` (flow-map node tone) and `:1081` (flow-map ribbon base). Spec section 5 says "no component touches", so leave all four; they belong with the wave 2 viz work. Verified with `grep -n 8a949c naas-app.js`.

- [ ] **Step 6: Commit.**

```bash
cd /Users/micahbos/Developer/cloud-connect
git add "NaaS Storefront.dc.html" tests/tokens.test.mjs
git commit -m "$(cat <<'EOF'
design: the eight drifted light-theme tokens conform to Flywheel 3

Values from the Figma-matched extraction in att-netbond-sdci. --warning,
--error, --viz-4 and --viz-5 are deliberately untouched and now pinned by a
test: Flywheel's equivalents are markedly louder and it has no purple, so
those four are a design ruling, not a migration.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Wave exit criteria

- `npm test` reports **72 passing**, 0 failing.
- Each of the four screens leads with a written sentence on all four estates.
- Observe ends with a Next stop row, on every estate including empty.
- Explore 360 shows four named beats with their sources, and a hash landing on `#s1` scans.
- `grep -n 'STOPS\|stopCta' naas-addendum.js` returns nothing.
- The light theme's eight drifted tokens match Flywheel 3; the four deferred ones are unchanged and pinned.
- `git status --porcelain` shows no unintended files staged. **Never `git add -A` in this repo** — untracked scratch, `dist/`, `naas-design-scope/`, `playwright-report/`, `test-results/`, `video-output/` and a nested clone all ride into the commit if you do.

## Deliberately not in this wave

- The change story on Discover (`since` / `isNew` / `newStrip`). It needs a real `lastRun`, which is wave 4.
- The `--warning` / `--error` / `--viz-4` / `--viz-5` ruling, and the dark-theme Flywheel diff.
- The empty estate's fake three-second scan on Explore 360. The guard is one clause out of place, and it lands with the small estate in wave 3.
- `startScan`'s 750ms × 4 timing.
- The two hardcoded `#8a949c` fills in `naas-app.js`.

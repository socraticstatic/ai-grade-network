# Notes Feedback (2026-09-29) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the eight asks in the "notes" email (sent from mb351v@att.com, 2026-09-29 06:13) into the NaaS storefront so it is ready for the next demo.

**Architecture:** The storefront is one dc-runtime template (`NaaS Storefront.dc.html`) bound to a view model `vals(c)` in `naas-app.js`, plus pure modules (`naas-*.js`) that tests call directly. Each ask becomes a pure function first (tested with `node --test`), then view-model fields, then markup behind an `<sc-if>` gate. New state keys go in `defaults()` **and** in the markup's own `constructor` state.

**Tech Stack:** Plain ES modules, dc-runtime `<sc-if>`/`<sc-for>` markup, `node --test`, headless Playwright (from `~/Developer/Cloud_Designer/node_modules/playwright`) for fold/sweep checks.

**Spec:** The email itself, restated here as numbered asks. Every task cites its ask.

1. **Connect tile goes somewhere.** "Connect is detached currently." Clicking the Connect tile (5 of 7 regions) should open a Connect page that lists the sites, data centers and regions that are candidates, each with its connectivity options.
2. **Observe head.** At the top of Observe, show "xx findings open. $xx/mo potential savings".
3. **Findings you can try first.** Cards like the Sep 8 ones (AT&T did · Do · action · See the evidence · Snooze). Before the user commits, show or simulate the change and show the evidence: where and how.
4. **Findings lifecycle.** Add a timeline: when it was found and what actions were taken. States are Open → Acknowledged → In progress → Resolved → Snoozed → Dismissed. Show the owner and the age.
5. **Banked savings.** Show a running total of what the customer actually banked after acting, not just potential savings, over time.
6. **Savings group-by.** Group savings by region, business unit and cloud provider.
7. **Access grouping on the picture.** The left column of the main picture gets "Group: Access type · Then: Region", with the groups AVPN, ADI, ASEoD and Broadband + IPsec. A "Not on the AT&T network · N" section below holds Third-party VPN and Third-party internet. Each row shows its site count, metros and health.
8. **Site tags.** The customer tags sites by business unit (HQ, Remote office, Manufacturing plant, or whatever fits the business) and groups by them.

Then: set up a demo for next-level feedback (Task 10).

## Open decision (answer before Task 8)

The email's access screenshot puts **Broadband + IPsec on the AT&T network**, as an "AT&T-managed overlay". The 2026-09-28 ruling modelled IPsec as **Third Party Access, outside AT&T**, and the Growing estate's five IPsec sites are the egress and security story. This plan defaults to the screenshot's reading:
- AT&T-managed IPsec over broadband counts as on AT&T.
- The Growing estate's customer-run IPsec-to-cloud sites stay under **Third-party internet**.

Micah confirms or overrides this default before Task 8 starts.

## Global Constraints

- Every page fits 1440×900 with no page scroll, on all five estates (partial, mature, trust, small, empty). Long lists scroll inside a capped frame and never scroll the page.
- User-facing text says "on AT&T / outside AT&T / the AT&T network", never "fabric". Code identifiers and product names (AI Fabric, Equinix Fabric) keep theirs.
- Copy uses no em dashes. Labels lead with savings; "Cost" appears only where the figure is literally spend.
- Cards stay terse, per the ruling "trim down the text on findings". The longer text (AT&T did, Do, evidence, simulation, timeline) goes in the finding drawer, never on the card.
- Every markup change moves the census pins in `tests/markup.test.mjs` and adds a dated comment. Raw `&` in markup text is `&amp;`. Never put `sc-for` inside `<svg>`, `<table>` or `<select>`.
- Every new state key goes in `defaults()` (naas-app.js:173) and in the markup `constructor` state. Persisted keys use `localStorage` under a `naas.` prefix, wrapped in try/catch, the same as `naas.hero` at naas-app.js:156.
- Browser verification is headless Playwright only. Never drive Comet or Chrome.
- Stage commits by explicit path; never `git add -A`. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Every task passes `npm test` and headless checks in light **and** dark before commit.

## Review Focus

- **Empty estate.** "0 findings open" must not render, and neither must a $0 banked chart. With no findings, the Observe head falls back to `ob.verdict`, and Savings shows no Banked tab. Task 2 and Task 6 each pin this.
- **Snoozed findings come back.** A snooze has an end date. Once it passes, the finding counts as open again and the head count rises. Task 3 pins this.
- **Dismissed and Resolved never count as potential savings.** They leave the head's $ total. Only Resolved adds to Banked. Dismissed never does. Tasks 3 and 6 pin this.
- **Mature estate at scale.** Access groups must hold at 1,000+ sites without growing the picture. The canvas height is measured from the root rows and never changes on a group-by switch. Task 8 pins `heroLayout(...).H` equal across group modes.
- **Tag renames and untagged sites.** Sites with no tag group under "Untagged", never vanish from a total, and the group-by counts still sum to the estate site count. Tasks 7 and 9 pin this.

---

## Phase 1: Demo-critical, small

### Task 1: Connect tile opens the Options page (ask 1)

Today the Connect tile (`launchGo.connect`, naas-app.js:633) lands on the picture with a cloud drilled open. The rail's "Options" item (naas-app.js:93, `sec-paths`) scrolls to a `#sec-paths` block that lives only inside the Discovery drawer (html ~1586), so it lands on the picture too. The candidate list (`gapRows`, naas-app.js:1583) exists only in that drawer, and every site gets the same recommendation.

**Files:**
- Modify: `naas-sites.js`: add `candidateOptions(site)`.
- Modify: `naas-app.js`: `launchGo.connect`; rail `sec-paths` goTo; new vals `cnPage`, `cnIsOptions`, `cnPanels`, `candGroups`.
- Modify: `NaaS Storefront.dc.html`: Connect `<sc-if tConnect>` block (~1140) gets an Options page gated `cnIsOptions`. The picture shows only when `!cnIsOptions`.
- Test: `tests/connect-options.test.mjs`

**Interfaces:**
- Produces: `candidateOptions(site) -> { best: {key, name, why}, alts: [{key, name}] }`. The keys come from the service catalog (`avpn`, `aseod`, `adi`, `abf`, `aiab`) plus `netbond` for cloud regions.
- Produces: state `cnPage: 'picture' | 'options'` (default `'picture'`).

- [ ] **Step 1: Write failing tests**

```js
test('the Connect tile opens Options, not the picture', () => {
  const c = mkC({ view: 'partial', screen: 's2', estateParam: null });
  vals(c).rollup.find(r => r.key === 'connect').go();
  assert.equal(c.state.tab, 'connect'); assert.equal(c.state.cnPage, 'options');
});
test('the rail Options item opens the same page', () => { /* click rail row 'Options' via vals(c).rail…goTo; assert cnPage === 'options' */ });
test('candidates are grouped Sites · Data centers · Cloud regions, each with a best option and alternatives', () => {
  const v = vals(mkC({ view: 'partial', tab: 'connect', cnPage: 'options', estateParam: null }));
  assert.deepEqual(v.candGroups.map(g => g.label), ['Sites', 'Data centers', 'Cloud regions']);
  for (const g of v.candGroups) for (const r of g.rows) { assert.ok(r.best && r.alts.length >= 1, r.name); assert.equal(typeof r.go, 'function'); }
});
test('an IPsec site and a data center get different best options', () => {
  // candidateOptions({access:'IPsec',...}).best.key === 'aseod'; data center (name /DC$/) best.key === 'avpn'; cloud region best.key === 'netbond'
});
test('every estate: candidates count equals the public sites plus public regions', () => { /* sum rows qty === gapSiteCount(est) + public regions */ });
```

- [ ] **Step 2:** Run `node --test tests/connect-options.test.mjs`. Expected: FAIL (`cnPage` undefined).
- [ ] **Step 3: Implement.**
  - `candidateOptions` rules:
    - IPsec or internet access → best ASE on Demand, alts AVPN and ADI.
    - Data center → best AVPN, alts ASE on Demand and Business Fiber.
    - Branch on broadband → best AVPN, alt AIA-B.
    - Cloud region → best NetBond, alt ASE to a cloud on-ramp.
  - `candGroups` reuses `gapRegions` and `gapSites`, split by kind. It adds `best`, `alts` and `go`, and keeps the existing `go` (prefillAttach order).
  - `launchGo.connect` and the rail `sec-paths` both call `go('s3', { layer: 'cloud', tab: 'connect', cnPage: 'options' })`.
  - The tab row "Connect views" (Picture · Options) sits in the Connect card head. Picture is the default.
  - Markup layout:
    - Three columns, one per group.
    - Each row shows its name, a count, a pill for the best option, a line for the alternatives, and an "Attach" button.
    - Each column scrolls inside a frame `.cand-frame{max-height:calc(100vh - 330px);overflow:auto}`.
    - "Ways to connect" (`pathRows`) goes behind an Options sub-tab only if the page still fits. Otherwise it stays in the drawer.
- [ ] **Step 4:** Run `npm test`, then run `fold.mjs` on all estates. Expected: tests PASS, and Connect and Options measure 900 on every estate.
- [ ] **Step 5:** Commit: `connect tile opens Options: candidates by kind, each with its best option`.

### Task 2: Observe head says findings open and potential savings (ask 2)

**Files:** `naas-app.js` (`pageVerdict` at ~875), `naas-lifecycle.js` (from Task 3, stubbed here as all-open), `tests/observe-head.test.mjs`.

**Interfaces:**
- Consumes: `openFindings(est, life, now) -> finding[]` (Task 3). Until then, use `est.findings`.
- Produces: `observeHead(est, life, now) -> string`.

- [ ] **Step 1: Failing test**

```js
test('Observe leads with findings open and potential savings', () => {
  const v = vals(mkC({ view: 'partial', tab: 'observe', estateParam: null }));
  assert.match(v.pageVerdict, /^\d+ findings? open\. \$[\d,.]+k?\/mo potential savings\.$/);
});
test('the dollar figure is the sum of open priced findings', () => { /* parse $, compare to sum(f.save) over openFindings */ });
test('no findings: the old verdict stays', () => {
  assert.equal(vals(mkC({ view: 'empty', tab: 'observe', estateParam: null })).pageVerdict, 'No telemetry yet.');
});
```

- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3:** Implement `observeHead` using `fmt` from naas-logic. For Observe, `pageVerdict` = `observeHead(...) || ob.verdict`. Clicking the verdict (`verdictGo`) opens Insights → Findings.
- [ ] **Step 4:** Run `npm test` and `sweep2.mjs`. Expected: all PASS.
- [ ] **Step 5:** Commit: `observe head: findings open, potential savings`.

## Phase 2: Findings you can act on

### Task 3: Findings lifecycle model (ask 4)

**Files:**
- Create: `naas-lifecycle.js`
- Modify: `naas-data.js` (seed per estate)
- Test: `tests/finding-life.test.mjs`

**Interfaces (Produces):**
```js
export const STATES = ['open', 'ack', 'progress', 'resolved', 'snoozed', 'dismissed'];
export const STATE_LABEL = { open: 'Open', ack: 'Acknowledged', progress: 'In progress', resolved: 'Resolved', snoozed: 'Snoozed', dismissed: 'Dismissed' };
export function lifeOf(finding, life, now) -> { state, owner, foundAt, ageDays, events: [{at, state, by, note}] , snoozeUntil }
export function transition(life, kind, to, { by, note, now, snoozeDays }) -> life   // pure; returns a new object
export function openFindings(est, life, now) -> finding[]   // open | ack | progress | snoozed-and-expired
export function banked(est, life, now) -> [{ month: 'YYYY-MM', saved, cumulative }]   // used by Task 6
```

- `life` is the persisted state `s.findingLife`, shaped `{ [kind]: { owner, events } }`.
- Seeds: each estate's findings carry `foundAt` (ISO) and `owner` (for example "FinOps · J. Rivera"). The partial estate has one Resolved finding with a `save`, so Banked is non-empty in the demo. Today is 2026-09-29.

- [ ] **Step 1: Failing tests**
  - Allowed moves:
    - open → ack → progress → resolved.
    - Any state → snoozed, with `snoozeDays` 7/30. Any state → dismissed.
    - resolved → open (reopen).
  - An illegal move returns `life` unchanged.
  - `ageDays` is 12 for `foundAt` 2026-09-17 and `now` 2026-09-29.
  - A finding snoozed for 7 days on 2026-09-20 is open again on 2026-09-29.
  - `openFindings` excludes resolved and dismissed.
  - Every transition appends one event carrying `by` and `at`.
- [ ] **Step 2:** Run `node --test tests/finding-life.test.mjs`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement. `now` is always a parameter, never `Date.now()` inside the module, so tests are deterministic. The view model passes `new Date()`.
- [ ] **Step 4:** Run the test. Expected: PASS. Then point Task 2's `observeHead` at `openFindings`.
- [ ] **Step 5:** Commit: `findings lifecycle: states, owner, age, timeline`.

### Task 4: Finding drawer with preview and evidence (asks 3 and 4)

The card stays one headline and one action. The drawer holds everything else.

**Files:**
- Modify: `naas-app.js`:
  - `findingCard` (naas-app.js:637), `anomalyRows`/`insightRows` (~1946).
  - New vals `fdOpen`, `fd` (the drawer model), `setFindingState`.
- Modify: `NaaS Storefront.dc.html`: one right-hand drawer `<aside aria-label="Finding">`, in the same pattern as the Discovery aside.
- Modify: `naas-lifecycle.js`: `preview(est, finding) -> { before: {path, gbps, egressMo}, after: {…}, deltaMo, touches: [{region, site}] }`.
- Test: `tests/finding-drawer.test.mjs`

**Drawer sections, top to bottom:**
1. The headline, then a chip for its state, its owner and its age ("Open · FinOps · 12 days").
2. **AT&T did**: one line.
3. **Do**: one line.
4. **Preview**:
   - Before and after, side by side: path, Gbps and $/mo.
   - The delta in green.
   - "Show it on the map" sets `mapSel` or `mapRegion`, so the picture highlights the flows the change moves.
5. **Evidence**: the top 5 log rows that prove it (reuse the Logs row model filtered by region and path), plus "Open in Logs".
6. **Timeline**: the event list.
7. **Actions**:
   - The primary action is the finding's `rec.name`. It goes through its order, then moves the finding to In progress.
   - Acknowledge, Snooze 7d or 30d, Dismiss.
   - Resolve appears only while the finding is In progress.

- [ ] **Step 1: Failing tests**

```js
test('every card opens the drawer with preview, evidence and timeline', () => {
  const c = mkC({ view: 'partial', tab: 'observe', obPage: 'insights', insPanel: 'findings', estateParam: null });
  vals(c).insightRowsShown[0].open();
  const d = vals(c).fd;
  assert.ok(d.before && d.after && d.deltaLine); assert.ok(d.evidence.length >= 1 && d.evidence.length <= 5); assert.ok(d.timeline.length >= 1);
});
test('Acknowledge moves the state and adds a timeline row', () => { /* fd.actions.find(a=>a.label==='Acknowledge').go(); state 'ack'; timeline +1 */ });
test('the primary action places the order and moves to In progress', () => { /* go(); screen s4 or s8; findingLife[kind] last event 'progress' */ });
test('the card itself stays terse', () => { /* card keys: head, cta, stateChip, age; no did/act text on the card */ });
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - `findingLife` goes in `defaults()` and the constructor, and persists to `localStorage['naas.life']`.
  - Each card gets a small state chip and age ("Open · 12d") and an `open` handler.
  - The drawer frame scrolls inside its own height.
- [ ] **Step 4:** Run `npm test`, `fold.mjs` and `sweep2.mjs`.
  - Then headless: open a finding, click Acknowledge, reload the page, and confirm the state survived (persistence per CLAUDE.md).
  - Expected: all PASS, and the state is still Acknowledged after reload.
- [ ] **Step 5:** Commit: `finding drawer: preview the change, the evidence, the timeline`.

### Task 5: Findings list filters by state

**Files:** `naas-app.js` (`insightFilters`), markup chips, `tests/finding-life.test.mjs` (extend).

- [ ] **Step 1: Failing test.** The chips read "Open · N", "In progress · N", "Resolved · N" and "All". The default is Open. The counts sum to `est.findings.length` plus the anomalies.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3:** Implement the chips alongside the existing persona/kind chips, keeping one filter row.
- [ ] **Step 4:** Run `npm test` and `fold.mjs`. Expected: PASS, and Insights measures 900.
- [ ] **Step 5:** Commit: `findings filter by state`.

## Phase 3: Savings that happened

### Task 6: Banked savings running total (ask 5)

**Files:**
- `naas-lifecycle.js`: `banked`.
- `naas-app.js`: the `costPanels` list (~2720) gains `['banked', 'Banked']` as its first entry when non-empty. Add vals `bankTiles` and `bankBars`.
- Markup: a Cost panel reusing the Over-time bar grammar.
- Test: `tests/banked.test.mjs`

**Model:**
- Baseline: `est.savedMo` has been banked monthly since the estate's first attach (seed `firstAttach` per estate).
- Plus each Resolved priced finding: `f.save` per month from the month it resolved.
- Twelve monthly bars, cumulative.
- Tiles: "Banked to date", "This month", "Potential still open" (from `openFindings`), and "Realised" (banked ÷ (banked + potential)).

- [ ] **Step 1: Failing tests**
  - The cumulative series never decreases.
  - Resolving a $1,500/mo finding in 2026-09 raises every bar from 2026-09 on by 1,500 × months elapsed.
  - Dismissing it adds nothing.
  - The empty estate has no Banked tab.
  - The "Potential still open" tile equals the Task 2 head's figure.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. The rail "Savings" item opens `costPanel: 'banked'`, and the ring label stays "of egress".
- [ ] **Step 4:** Run `npm test`, `fold.mjs` and `sweep2.mjs`. Expected: PASS, Cost measures 900, and light and dark are both clean.
- [ ] **Step 5:** Commit: `banked savings: the running total, not just the potential`.

### Task 7: Savings group-by region, business unit, cloud provider (ask 6)

**Files:** `naas-lifecycle.js` or `naas-round2.js`: `savingsBy(est, life, now, dim)`. Plus `naas-app.js` and markup (a "Group" select in the Banked panel's tab row). Test: `tests/savings-group.test.mjs`.

**Interfaces:**
- Consumes: `buOf(site)` from Task 9 (Task 7 runs after Task 9).
- Produces: `savingsBy(est, life, now, dim: 'region'|'bu'|'cloud') -> [{ key, label, banked, potential }]`.

- [ ] **Step 1: Failing tests**
  - For each dim, the sum of `banked` equals the Task 6 total, and the sum of `potential` equals the Task 2 figure.
  - Business-unit rows include "Untagged" when any site has no tag.
  - Cloud rows are AWS, Azure, GCP, and so on, for that estate.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Allocation:
  - By region: through each finding's region, falling back to workload share.
  - By cloud: through the finding's cloud.
  - By business unit: through the sites behind the finding's traffic, weighted by site count.
  - Render as `.fx-row` bars with two segments (banked solid, potential tint), with no chart library.
- [ ] **Step 4:** Run `npm test` and `fold.mjs`. Expected: PASS and 900.
- [ ] **Step 5:** Commit: `savings by region, business unit, cloud`.

## Phase 4: Sites the way the customer thinks of them

### Task 8: Access-type grouping on the picture (ask 7)

**Files:**
- `naas-logic.js`: `accessRows(est)`, next to `regionRows`. `heroLayout(est, { groupBy })`.
- `naas-app.js`: state `siteGroup: 'region' | 'access' | 'bu'` and `siteThen`. The breadcrumb row "All sites" becomes a "Group: … · Then: …" control.
- Markup: the "Where you are" row (~391).
- Test: `tests/access-group.test.mjs`

**Interfaces (Produces):**
- `accessRows(est) -> [{ key, name, onAtt, count, metros, health: 'ok'|'warn'|'down', note, sites }]`
  - On AT&T, in order: AVPN, ADI, ASEoD, Broadband + IPsec.
  - Then `{ divider: 'Not on the AT&T network', count }`.
  - Then Third-party VPN and Third-party internet.
- The note text follows the screenshot: "412 sites · 38 metros · 9 degraded", "all healthy", "2 single-homed", "AT&T-managed overlay", "3 providers · no telemetry".

- [ ] **Step 1: Failing tests**
  - Across groups, the counts sum to the estate site count, on every estate.
  - The divider count equals the off-AT&T total.
  - `heroLayout(est, { groupBy: 'access' }).H === heroLayout(est, {}).H`: the picture never resizes.
  - Clicking a group then drills by the "Then" dimension (Region by default).
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement, applying the open decision on IPsec. Each group card reuses the region-card grammar (pill, dot, caret). The off-AT&T cards use the `--error`-tinted border from the screenshot.
- [ ] **Step 4:** Run `npm test`, `fold.mjs` and `sweep2.mjs`, and measure the 10px button clearance on the Connect picture. Expected: PASS and 900.
- [ ] **Step 5:** Commit: `picture groups sites by access type, then region`.

### Task 9: Site tags by business unit (ask 8)

**Files:**
- `naas-sites.js`: `BU_DEFAULTS = ['HQ', 'Remote office', 'Manufacturing plant', 'Retail', 'Data center']` and `buOf(site, tags)`.
- `naas-data.js`: seed `bu` on the partial and mature sites.
- `naas-app.js`: state `siteTags` (`{ [siteName]: bu }`, persisted as `naas.tags`). Add a tag editor in Estate → Your sites (select per row, plus "New tag…"). Add `siteGroup: 'bu'` to Task 8's control.
- Test: `tests/site-tags.test.mjs`

- [ ] **Step 1: Failing tests**
  - Tagging a site moves it between business-unit groups, and the totals stay equal.
  - A new tag name appears as a group.
  - Untagged sites group under "Untagged".
  - Tags survive `defaults()` reload through the localStorage seam (mock `globalThis.localStorage`).
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. The editor is a `<select>` with longhand `<option>`s (no `sc-for` in `<select>`), plus a text input that appears on "New tag…".
- [ ] **Step 4:** Run `npm test`. Then headless: tag a site, reload, and confirm the tag holds and the picture's business-unit group count changed. Expected: PASS, and the tag survives the reload.
- [ ] **Step 5:** Commit: `site tags by business unit, grouped on the picture and in savings`.

Order note: run Task 9 before Task 7, because Task 7's business-unit dimension needs `buOf`.

## Phase 5: Demo

### Task 10: Demo readiness

- [ ] Full `npm test`, then `fold.mjs` on all five estates, then `sweep2.mjs` in light and dark. Expected: all green, and every page measures 900.
- [ ] Walk the demo path headless on Growing (partial), screenshotting each stop:
  1. Connect tile → Options.
  2. Pick an IPsec site → its best option → Attach.
  3. Observe head → Findings → open the egress finding → Preview → Evidence.
  4. Acknowledge → Steer (order) → In progress.
  5. Cost → Banked → Group by business unit.
  6. Connect → Group: Access type.
- [ ] Commit, push `discovery-drawer`, fast-forward `main`, deploy, and confirm the live `version.js` sha.
- [ ] Write a one-page demo script (the six stops above, with what each proves) for the feedback session.

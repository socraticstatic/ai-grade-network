# Notes 2026-09-30: Monday Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the asks in the 2026-09-30 "notes" email into the NaaS storefront. The Monday Oct 5 demo must run on numbers that agree across every page. Also answer the stakeholder's one question.

**Architecture:** Same shape as the 2026-09-29 plan. One dc-runtime template (`NaaS Storefront.dc.html`) is bound to `vals(c)` in `naas-app.js`, and pure `naas-*.js` modules are tested with `node --test`. This round builds shared primitives before any new surface: one clock, one health rule, one change list, one incident list, one connection classifier, one capacity function and one segment contract. Surfaces whose data doesn't exist yet ship as designed, with history-type data seeded and labelled. Nothing seeds live-looking telemetry.

**Tech Stack:** Plain ES modules and dc-runtime `<sc-if>`/`<sc-for>`, tested with `node --test` (610 green at `e7298bf`). Browser checks use headless Playwright Chromium from `~/Developer/Cloud_Designer/node_modules/playwright`.

**Spec:** The email itself, restated below as asks A1 to F2. Source: Apple Mail, Exchange inbox, from mb351v@att.com, 2026-09-30 06:12, subject "notes", 11 PNGs of which 6 are unique.

**Evidence:** On 2026-09-30, 13 agents mapped the asks against `e7298bf`: six mappers, six adversarial verifiers and one critic. The file:line anchors below come from that run as the verifiers corrected them. Lines drift, so re-grep before editing.

---

## The asks

| Id | Ask (condensed) | Shot | Lands at | Monday |
|---|---|---|---|---|
| A1 | Cost > Optimize, "What should I change first?" Four rows: Spend (Update connection type), Routing (Update routing policy), Resiliency (Add backup path), Capacity (Resize) | | Cost > Optimize (new rail door, landing tab) | Wired, Task 2.5 |
| A2 | Cost in three legs: site access, cloud connectivity, cloud-side networking | att8 | Cost > By leg | Shown, modelled prices, Task 3.1 |
| B1 | "Add health tab" | att5 | Observe > Health | Wired, Task 2.6 |
| B2 | Four questions as tabs: Health (is it up), Paths (is it fast), Capacity (is it full), Changes (what changed) | | Observe tab row | Health and Capacity wired (2.6, 2.7); Paths and Changes shown (3.3) |
| B3 | Nine-row segment table: owner, what to show, data source, "limited view" for other carriers | | Observe > Health > By segment | Shown: the contract, live where a source exists (1.8, 3.2) |
| B4 | Path flow grid, one row per app group, one dot per segment | | Observe > Health > By app | Wired, Task 2.6 |
| B5 | Open problems ranked by apps affected, with Open ticket and Trace | | Observe > Health, below the grid | Wired (1.4, 2.6) |
| C1 | Operations insight: Sev 1 / tickets / time to fix; 24h, 7d, 30d, 90d; tickets by hand or by Andi; subtabs Overview, Tickets, Availability, Maintenance & Changes | | Observe > Insights > Operations | Shown, sample history, Task 3.4 |
| C2 | One Insights page per role, actions on the right; Do it visible, not enabled; Accept or Defer | | Observe > Insights > Your actions | Stand-in until the reference file arrives, Task 3.5 |
| C3 | Andi's monthly briefing, sent per role configuration | | Observe > Insights > Monthly briefing | Shown, nothing sends, Task 3.5 |
| D1 | Add a source, rerun discovery, a new cloud hierarchy with workloads appears | | Discover > Sources, then Your clouds | Wired, session only, Task 2.8 |
| D2 | At the state level, list every site with its connection type and bandwidth | att2 | Discover > Your sites | Wired, Task 2.3 |
| D3 | Your clouds tiles count clouds, regions, VPCs/VNets and apps, and how they connect (AT&T, IPsec, SD-WAN, third party) | att1 | Discover > Your clouds | Wired, Task 2.4 |
| E1 | Filtered to one cloud, destination bars stay proportional (GCP 70 Mbps vs Azure 11.4 Gbps) | att5 | Observe > Traffic | Wired, Task 2.1 |
| E2 | Egress growth card shows the $ impact (start and end reference, or per bar) | att3 | Observe > Insights > Signals | Wired, Task 2.2 |
| F1 | Rail icons: Estate = Options, Spend is a cloud, Insights "?" duplicates Help | att4 | Rail | Wired, Task 0.3 |
| F2 | "Can the designer tool scale from Growing to Established, or is it a page per persona/estate?" | | Answer, Appendix A | Answer |

The meta ask, "fine tune the NaaS UI ready for Monday demo", is owned by Tasks 0.1, 0.2 and 4.1.

## What the mapping found (read before any task)

These pre-existing disagreements would leak into every new surface:

1. **The stakeholder's own screenshot (att5) contradicts itself.**
   - The Over SLO tile reads 0, but the GCP node and six IPsec ribbons are red. In the Traffic view, red means public share (naas-flowmap.js:155, :447; naas-app.js:1941), not latency.
   - The IPsec label prints the whole-estate $8,600 bucket under a GCP pick (naas-app.js:1836), while the Cost tile reads $3,300.
   - The tile says "0.1 Gbps" where the node says "70 Mbps".
   - "Sites on AT&T" reads 20 of 25 under a GCP pick, because it reads `mapEst.sites` (naas-app.js:1956).
2. **`mapRates` divides by unwindowed Gbps** (naas-app.js:1784). Whole-estate IPsec reads $8,400, $8,200 and $7,600 at 7d, 30d and 90d, against the $8,600 bucket and the ipsecegress finding.
3. **Three live incident lists disagree:**
   - the Home hero `healthIncidents` (naas-app.js:914, markup :575);
   - the Alerts queue (naas-observe-dash.js:24-31);
   - the `findingList` events (naas-app.js:1319-1325).

   On Growing they read 2, 9 and 12. The ages are the literal '22 min', and "02:14" belongs to the eu-west-1 latency spike (naas-round2.js:114), not the eastus flap.
4. **Five public-path SLO rules** are in use:
   - perfOf at 100 ms;
   - regionHealth above 120;
   - observeFindings above 120 or rel 'warn';
   - the queue above SLO;
   - stateOfRegion.

   The 'degraded' finding claims "3 paths" on Growing, Small and Bank scale, while the tile and queue say 0 on Small and Bank scale.
5. **attChargeRows bills Direct Connect, ExpressRoute and Equinix regions as "NetBond on-ramps x $1,800"** (naas-app.js:3054, :3059). naas-fabric.js:18-25 also files DX and ER under AT&T facilities ("AT&T Virginia: ER").
6. **`setView` (naas-app.js:878) leaves stale state:** obScope, obDim, mapOpen, mapSel, mapRegion, cloudTrailE, placeTrail, cloudPage and placePage. Switching Estate under a By pick draws an empty map with a phantom "Internet 1.0 Gbps" and Cost $47,800.
7. **Saved state persists with no reset:** `naas.life`, `naas.tags` and `naas.hero`. att8 shows "11 findings open", where a clean Growing reads 12.
8. **Two clocks.** Findings run on `s.nowIso`, which is null in production, so they use the real clock. The schedule runs on `Date.now()` (naas-app.js:258). Lifecycle ages anchor on 2026-09-29.
9. **Established has no priced findings.** Its Spend tile reads "Could save $17,500" beside "Still open $0". Growing's 'single' finding ("4 data centers have one path", naas-data.js:149) contradicts the site data: every DC declares a backup (:88-103).
10. **Small draws a phantom NetBond on-ramp** (about 380 Mbps) with nothing attached (naas-flowmap.js:133 fallback; rampOf default :108).
11. **Copy violations:**
    - visible "fabric" (markup :1365) and an aria-label (:1068);
    - the raw code 'ER' in region rows (naas-app.js:2526);
    - em dashes at naas-app.js:3220 and :3230, and in PERSONA_LENS (:2313-2318).
12. **No fold harness exists in the repo.** Every pixel figure in the mapping is an estimate.
13. **`NaaS_Insights_By_Role_Options.html` is missing.** C2 names it as its reference, but it was not attached and is not on disk.

## Decisions (defaults; Micah confirms or overrides before the named task)

- **D-1 Scope.** The phases below. Wired means demo-ready with agreeing numbers. Shown means designed, with sample or modelled data marked as such. After Monday is listed, not built. *(Before Phase 2.)*
- **D-2 Sample data.** Closed tickets, fix times, maintenance windows, outage minutes and list prices may be seeded relative to the one clock (Task 1.1) and marked "sample" or "modelled". Live telemetry the model lacks is never invented; it reads "Not yet measured". That covers optical levels, jitter, NAT ports, DNS failures and tunnel flaps. *(Before 1.8.)*
- **D-3 One problems list.**
  - Link incidents (degraded, saturating) become event findings under naas-lifecycle.js.
  - Alerts show incidents only. Blind regions and flow-level Over SLO stay findings ('blindspots', 'degraded').
  - Growing Alerts go from 9 to 2, and the head reads 13 findings open (the flap joins); savings don't change.
  - Tickets are lifecycle moves, with no second store. "N tickets open" is allowed with the noun attached; re-pin tests/consistency.test.mjs:81 with a dated comment.
  - We do not chase the email's "9 tickets open". *(Before 1.4.)*
- **D-4 Health is a tab, not a fourth view chip.**
  - The Observe underline row becomes Traffic | Over time | Where it goes | Health | Paths | Capacity | Changes.
  - The 2026-09-29 Health filter chips stay as they are.
  - If the measured row doesn't fit at 1440, Over time and Where it goes fold into Traffic. *(Before 2.6.)*
- **D-5 Column placement.** Direct Connect, ExpressRoute and Interconnect sit in the **Cloud link** column, owner Cloud provider, as the stakeholder's own table and example row put them. On-ramp holds NetBond/IPE (AT&T) and Equinix (third party). *(Before 1.8.)*
- **D-6 NetBond billing.** Fix NetBond billing for DX, ER and EQX regions before Monday. The AT&T charges total and the Observe Cost tile will move. *(Before 1.5.)*
- **D-7 Optimize door.**
  - Cost gets a second rail door, **Optimize**, and lands on it. This revisits the "One Cost door" line at naas-app.js:100, which was about folding Savings and Forecast into Spend.
  - "Spend this month" stays egress on Monday.
  - The three legs get their own tab with modelled prices. *(Before 2.5.)*
- **D-8 Health vocabulary.**
  - One legend: Healthy, At risk, Over SLO, Down. Down gets its own key (`down` in HEALTH_FILL) and its word in every title, so red never means both Down and Over SLO without saying which.
  - One latency rule everywhere: `healthOf(ms, SLO 100 public | SLO_PRIVATE 20 private)`, and each surface names its unit (regions, paths, on the map).
  - Degraded is red on every surface, not amber or orange. *(Before 1.2.)*
- **D-9 Findings data.**
  - Seed Established's priced findings: avoidable (misc, $5,400) and crosscloud (awsx, $12,100). The Established head goes from 6 to 8 findings open.
  - Rewrite Growing's 'single' to the one true single path: Azure eastus, which finance rides. *(Before 1.7.)*
- **D-10 Your actions.** Build it as a stand-in. Ask the stakeholder for `NaaS_Insights_By_Role_Options.html` today, and rebuild when it arrives. *(Before 3.5.)*
- **D-11 Your clouds unit.** Count VPCs and VNets by how they attach, plus a line derived from sites for IPsec and SD-WAN. Legend labels are short; titles carry the full names. *(Before 2.4.)*
- **D-12 Site bandwidth.**
  - Bandwidth means the purchased circuit per service.
  - Keep the catalog label "Business Fiber" (not "ABF").
  - Re-seed the two AIA-B offices, Atlanta and Los Angeles, as Business Fiber primary with an AIA-B backup: 0.9 Gbps modelled on fixed wireless is not credible. The Group: Access type counts move. *(Before 2.3.)*
- **D-13 Capacity.** Seed no port. AWS us-east-1 (3 x 10 Gbps, 41% peak, lower 6-month average, resize to 2 x 10 Gbps puts peak at 62%) is the honest Resize example. *(Before 1.6.)*
- **D-14 Proportional destinations.**
  - Left and middle stay at the pick's scale; the right column goes to estate scale, with muted neighbours and the sub-head "Destinations at estate scale".
  - Fallback if the headless look reads wrong: the full-frame pick plus "70 Mbps of 43.4 Gbps". *(Before 2.1.)*
- **D-15 Demo mechanics.**
  - Verify both themes.
  - Switch Estate live only after Task 0.2.
  - Run from a clean profile or the Reset demo control. *(Before 4.1.)*
- **D-16 Display zone.** HH:MM prints in America/Chicago. *(Before 1.1.)*

## Global Constraints

- Every page and every tab fits 1440x900 with no page scroll, on all five estates (partial, mature, trust, small, empty), in light and dark.
- No button sits within 10 rendered px of its card edge.
- Lists and tables sit on the page and page to fit with `pageRows` / `PAGE_SIZE` (naas-app.js:1036). There are no scrolling boxes and no card around a list; charts may sit in cards.
- Drawers are only for detail overlays and for adding or editing a source.
- Nothing leaves the page: drills happen in place.
- The site side drills region > state > metro > site > services on every surface and never opens into clouds. Clouds are right-side destinations only.
- The Sankey conserves at every level. Tiles read the map (`mapG`, `perf`), never `ob.kpis` or estate totals.
- Findings are one list (`findingList`) following `naas-lifecycle.js`. Every count of "open" reads it.
- Copy rules:
  - Say "the AT&T network" or "on AT&T", never "fabric". Product names (AI Fabric, Equinix Fabric) are fine.
  - No em dashes.
  - Savings lead; "Cost" appears only where the figure is literally spend.
  - The assistant is "Andi".
  - Rows name things ("ExpressRoute"), never codes ("ER", "DX").
  - The Sankey middle stays "Cloud provider direct connect".
- The owner is the SLA holder as stated on the site or connection, never inferred. Owner words are:
  - AT&T
  - Third party
  - Cloud provider
  - You
  - Public internet
- IPsec is Third Party Access, outside AT&T.
- Markup rules:
  - Every change moves the census pins in tests/markup.test.mjs (about :222-231) with a dated comment.
  - Never put `sc-for` inside `<svg>`, `<table>` or `<select>`; write `<option>` lists longhand.
  - Raw `&` is `&amp;`.
- New state keys go in `defaults()` (naas-app.js:166) and in the markup constructor state (NaaS Storefront.dc.html:2108).
- Browser checks are headless Playwright only. Never Micah's Comet or Chrome, and no tabs in his browser.
- Stage by path; never `git add -A` in this repo. Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push and deploy only on Micah's word.

## Review Focus

1. **Switching Estate under a By pick or a deep drill.** A person expects the new estate's whole map, not an empty one. Pinned in Task 0.2.
2. **Leftover browser state on the demo machine.** Rehearsal Acknowledge, Snooze, Accept, tags or added sources must not change Monday's numbers. Reset demo is pinned in Task 0.2. Added sources are session-only in Task 2.8.
3. **The real clock on demo day.** Every age, "Started HH:MM", maintenance window and next briefing send reads coherently at any `nowIso`. Task 1.1 runs its tests at two different `nowIso` values, and Tasks 1.3, 1.4 and 3.4 assert relative times.
4. **Small and empty estates.** No NaN, no "$0" totals, no "0 of 0", and no phantom on-ramp. Every surface task carries a small/empty test; Task 1.5 removes the phantom NetBond.
5. **Dark theme.** Every new ink is a token, and the fold harness runs dark (Task 0.1). Each surface task's gate includes a dark screenshot that a person looks at.

## How every task runs

- [ ] Write the named failing tests (the key assertions are given; follow the existing test style with `mkC` from tests/harness.mjs and `vals` from naas-app.js).
- [ ] Run `node --test tests/<file>.test.mjs` and see it fail for the stated reason.
- [ ] Implement to the interfaces given.
- [ ] Run `npm test` (bare, all files) and `node scripts/fold.mjs --pages <touched pages>` (5 estates x light/dark). Both pass. Look at the dark screenshot of every changed surface.
- [ ] Commit by path with the message given, plus the trailer.

Branch: `notes-0930` from `main` at `e7298bf`. Merge to `main` after each phase gate.

---

## Phase 0: Safety net and the stakeholder's own screen (Wed-Thu AM)

### Task 0.1: Headless fold harness

**Files:**
- Create: `scripts/fold.mjs`
- Modify: `package.json` (add `"fold": "node scripts/fold.mjs"`)

**Interfaces:**
- Produces: `node scripts/fold.mjs [--estates partial,mature,trust,small,empty] [--pages discover,connect,observe,govern,cost,help] [--theme light|dark|both] [--shots <dir>]`. It prints one line per (estate, theme, page, tab): `scrollHeight`, boxed elements, edge offenders, PASS/FAIL. It exits 1 on any FAIL, and `--shots` saves a PNG per line.

- [ ] **Step 1: Build it.**
  - Load `NaaS%20Storefront.dc.html?view=<id>` (plus `&theme=dark`) by serving files from the repo through `page.route`, with no dev server. index.html's meta-refresh strips params, so never load index.html.
  - Use a fresh context per load at 1440x900.
  - Walk every `railGroups` link by accessible name, and on each page click every `role="tab"` button.
  - Checks:
    - `document.documentElement.scrollHeight <= 900`;
    - no element with computed `overflow-y` auto or scroll where `scrollHeight > clientHeight + 1`, except an allowlist of the Andi dock and detail overlays, named in the file;
    - every visible `button` rect is at least 10px inside its nearest `.fx-card` padding box.
- [ ] **Step 2: Baseline.** Run it on `e7298bf` across all estates and both themes. Memory says every rail page measured 900 on all five estates at `6098969`. Record any baseline FAIL in the file's header comment, so later tasks know what already failed.
- [ ] **Step 3: Commit.** `git add scripts/fold.mjs package.json && git commit -m "fold: one headless harness for every page, tab, estate and theme"`

### Task 0.2: Demo-state hygiene

**Files:**
- Modify: `naas-app.js`: `setView` (~:878); the init restore (~:145-156); a new `resetDemo`
- Modify: `NaaS Storefront.dc.html`: rail foot beside the Estate and Persona selects (inside `sc-if railExpanded`, ~:300)
- Test: `tests/demo-state.test.mjs`

**Interfaces:**
- Produces: `export const DEMO_KEYS = ['naas.life', 'naas.tags', 'naas.hero', 'naas.openHint']`. Tasks 3.4 and 3.5 append their keys.
- Produces: val `resetDemo()`. It removes `DEMO_KEYS` from localStorage (inside try/catch) and sets state back to `defaults()` for `findingLife`, `siteTags`, `buCustom`, `addedSources`, `obScope` and every trail.

- [ ] **Step 1: Failing tests**

```js
test('switching estate under a By pick draws the new estate whole', () => {
  const c = mkC({ view: 'mature', tab: 'observe', obScope: 'cloud:CoreWeave', obDim: 'cloud', mapOpen: ['r:CoreWeave'], cloudTrailE: ['cloud:Azure', 'region:westeurope'] });
  vals(c).setView({ target: { value: 'partial' } });           // the Estate select handler
  assert.equal(c.state.obScope, 'all'); assert.deepEqual(c.state.mapOpen, []); assert.deepEqual(c.state.cloudTrailE, []);
  const v = vals(c); assert.ok(v.mapNodes.some(n => n.side === 'r')); assert.ok(!v.mapNodes.some(n => /Internet 1\.0/.test(n.vF || '')));
});
test('Reset demo clears every saved key and the head reads a clean estate', () => { /* stub globalThis.localStorage with DEMO_KEYS set; resetDemo(); keys gone; the Observe pageVerdict on partial reads '12 findings open.' */ });
```

- [ ] **Step 2: Implement.**
  - `setView` also resets obScope 'all', obDim 'all', mapOpen [], mapSel null, mapRegion null, cloudTrailE [], placeTrail [], cloudPage 0 and placePage 0.
  - Add a small muted "Reset demo" text button in the rail foot.
- [ ] **Step 3: Commit.** `"demo state: an estate switch starts clean; Reset demo clears what rehearsal saved"`

### Task 0.3: Rail icons (F1)

**Files:**
- Modify: `naas-app.js`: `SECTIONS` (~:80-103); the sequence rail icons (~:2899)
- Create: `brand/icons-{light,dark,link,linkdark}/lightbulb.svg`, taken from `brand/lights-on.svg`, recoloured to each folder's fill (#13171b, #ffffff, #0057b8, #66c8f0), on the set's 96x96 viewBox
- Test: `tests/rail-persona.test.mjs`

**Interfaces:**
- Produces: the icon map.

| Rail link | Icon | Note |
|---|---|---|
| Estate | apis | |
| Sources | lock | |
| Options | cable | |
| Orders | shopping-bag | |
| Traffic | hub | |
| Insights | lightbulb | |
| Logs | checklist | |
| Violations | check-shield | |
| Policies | grid | |
| Optimize | high-meter | Door added in Task 2.5 |
| Spend | bill | |

  The sequence rail uses one icon per step.

- [ ] **Step 1: Failing tests.**
  - 'no two rail links share an icon, and none is question-circle or bell': run it on empty, small, partial and mature.
  - 'every rail icon exists in all four theme folders'.
- [ ] **Step 2: Implement.** Take a headless screenshot of the rail at 16px in light and dark, and check the lightbulb's weight next to the stroke icons. The fallback is `pie-chart`, which needs no new asset.
- [ ] **Step 3: Commit.** `"rail: one icon per link; Insights is a lightbulb, Spend a bill, Options a cable"`

### Task 0.4: The Traffic screen agrees with itself (att5)

**Files:**
- Modify: `naas-app.js`: `mapRates` (~:1781-1785); IPsec `midSay` (~:1836); `flowTiles` (~:1952-1964); Traffic-view fills (~:1845-1847, ~:1941)
- Modify: `naas-flowmap.js`: destination state (~:155); `link()` ribbon state (~:447)
- Test: `tests/sankey-views.test.mjs`, `tests/flow-head.test.mjs`, `tests/consistency.test.mjs`

**Interfaces:**
- Produces: `mapRates` divides each bucket by the window-scaled whole-estate Gbps at the level the map draws. Its shape `{ att, out }` is unchanged.

- [ ] **Step 1: Failing tests**

```js
for (const win of ['7d', '30d', '90d']) test(`Whole estate IPsec prices at the bucket at ${win}`, () => {
  const v = vals(mkC({ view: 'partial', tab: 'observe', mapMode: 'cost', obWindow: win }));
  assert.equal(v.mapNodes.find(n => n.key === 'mid:ipsec').vF, '$8,600');
});
test('under a GCP pick the IPsec label, the Cost view node and the Cost tile agree', () => { /* obScope 'cloud:GCP' */ });
test('a 70 Mbps map reads 70 Mbps on the Traffic tile', () => { /* sub-1 Gbps totals use the node's gbpsW format */ });
test('Sites on AT&T under a cloud pick counts what the map draws', () => { /* computed from the map's on-AT&T left flows, never mapEst.sites */ });
test('in the Traffic view, red nodes are exactly perf.over', () => { /* partial, mature, trust; public share keeps the grey Outside AT&T ink */ });
```

- [ ] **Step 2: Implement** the five fixes above. The IPsec label prices its own node (`nd.v x mapRates.out`). The Observe Cost and Could save tiles will move. Re-pin flow-head and consistency with dated comments. sankey-metrics, sankey-drill and flowmap stay green unchanged.
- [ ] **Step 3: Commit.** `"traffic: the tiles, the labels and the colours say the same thing in every window"`

### Task 0.5: Copy sweep

**Files:**
- Modify: markup ~:1365 ("fabric · $0.02/GB" becomes "on AT&T · $0.02/GB")
- Modify: markup ~:1068 (aria-label becomes "Weekly egress, on AT&T under public internet")
- Modify: `naas-app.js:2526` (region sub uses `F.RAMP_NAME[r.ramp]` plus port size, e.g. "NetBond · 3 x 10G")
- Modify: `naas-app.js:3220`, `:3230` and `PERSONA_LENS` (:2313-2318): replace the em dashes
- Test: `tests/network-name.test.mjs`, `tests/copy.test.mjs`

**Interfaces:**
- Produces: stricter guards that later tasks inherit:
  - no visible or aria text matching `/\bfabric\b/i` except "AI Fabric" and "Equinix Fabric";
  - no rendered row text containing ` ER ` or ` DX `;
  - no U+2014 in any `naas-*.js` string literal or the markup.

- [ ] **Step 1: Failing tests** for the three guards above.
- [ ] **Step 2: Implement** the edits.
- [ ] **Step 3: Commit.** `"copy: no fabric, no ramp codes, no em dashes"`

**Phase 0 gate:** `npm test`, the full `node scripts/fold.mjs`, then merge to main.

---

## Phase 1: Shared primitives (Thu)

### Task 1.1: One clock

**Files:**
- Modify: `naas-schedule.js` (next to `clockLabel`, ~:99-104)
- Modify: `naas-app.js`: `acctSched` (~:258), `lifeNow` (~:281)
- Modify: `naas-observe-dash.js:26, :29`
- Modify: `naas-round2.js:58-59, :114`
- Test: `tests/clock.test.mjs`

**Interfaces:**
- Produces: `export function nowOf(s) -> number` (ms). It returns `Date.parse(s.nowIso)` when set, otherwise `Date.now()`.
- Produces: `export function hhmm(ms) -> 'HH:MM'`, in America/Chicago via `Intl.DateTimeFormat`.
- Produces: `export function agoOf(ms, now) -> '22 min' | '3 h' | '2 d'`.
- Produces: `export function startOf(key, now, minutesAgo) -> ms`. Seeds are relative to now: a flap starts 22 min ago, a saturation 3 h ago, and the latency spike keeps its own seeded offset.

- [ ] **Step 1: Failing tests**

```js
test('the schedule and the findings read one clock', () => { /* nowIso set: acctSched nowMs === Date.parse(nowIso) */ });
test('no literal ages remain', () => { /* grep naas-*.js for '22 min', "'3 h'", '02:14 today' → none */ });
for (const iso of ['2026-10-05T15:00:00Z', '2026-10-06T02:00:00Z']) test(`incident times hold at ${iso}`, () => {
  /* the eastus flap reads Started hhmm(now - 22 min) and age '22 min' at either hour */
});
```

- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit.** `"clock: one now for findings, schedules and incidents"`

### Task 1.2: One health rule, one legend, app groups by traffic

**Files:**
- Modify: `naas-flowmap.js`: export `healthOf`, `SLO`, `SLO_PRIVATE` (already there, ~:18-20, :571)
- Modify: `naas-round2.js`: `regionHealth` (~:55) reads it
- Modify: `naas-addendum.js`: `observeFindings` 'degraded' (~:324) reads it and counts its paths
- Modify: `naas-observe-dash.js`: the queue rule (~:29)
- Modify: `naas-app.js`: `HEALTH_FILL` (~:1839) gains `down`; STATE_FILL degraded (~:1809) and OD.gauges (naas-observe-dash.js:20) move from orange to the same red; the hero degraded amber (~:408) becomes red
- Modify: `naas-apps.js`: `appsOf` returns per-region traffic parts; `topApps` skips `otel-agent` (~:47)
- Test: `tests/health-rule.test.mjs`, `tests/apps.test.mjs`

**Interfaces:**
- Produces: `regionState(r) -> 'ok' | 'risk' | 'slo' | 'down'`. It is `down` when the region's connection is degraded; otherwise it is `healthOf(r.priv ? r.fab : r.pub, r.priv ? SLO_PRIVATE : SLO)`.
- Produces: `HEALTH_WORD = { ok: 'Healthy', risk: 'At risk', slo: 'Over SLO', down: 'Down' }`.
- Produces: `appsOf(...)[i].parts: [{ region, gbps, share }]`. Materiality is at least 5% of traffic, never of workload count.

- [ ] **Step 1: Failing tests.**
  - 'every over-SLO count uses one rule': the 'degraded' finding head count equals the number of regions with `regionState === 'slo'` on every estate. Small and trust must no longer claim 3.
  - 'Degraded is one red everywhere': the STATE_FILL, gauges, hero and HEALTH_FILL.down inks are equal.
  - 'finance on Growing is not red from westeurope latency': its westeurope part is below 5% of its traffic.
  - 'topApps never leads with otel-agent'.
- [ ] **Step 2: Implement.** Signals "Latency over SLO", the queue and the finding counts may change. Re-pin them with dated comments, naming the rule.
- [ ] **Step 3: Commit.** `"health: one latency rule, one legend, apps weighed by traffic"`

### Task 1.3: One change list

**Files:**
- Modify: `naas-observe-dash.js`: new `changes`
- Modify: `naas-app.js`: extract the `actAll` builder (~:1558-1592) into `activityOf`; Logs > User activity reads it
- Test: `tests/changes.test.mjs`

**Interfaces:**
- Produces: `export function activityOf(est, s, now) -> Activity[]`. It is re-seeded across 90 days relative to `now` and floored at each region's attach date (naas-lifecycle.js FIRST).
- Produces: `export function changes(est, conns, activity, now) -> Change[]`, with `Change = { at, kind: 'config' | 'route' | 'maintenance', text, region, source, linedUp: problemKey | null }`.
  - Config rows: activity rows with a change verb (attach, policy enforce or simulate, scope, port order).
  - Route rows: one per degraded connection, "routes withdrawn", 3 minutes before its problem's start.
  - Maintenance rows: AT&T planned maintenance on AT&T-held connections only (NetBond, hosted), one done at now-9d and one coming at now+4d, on the region's PE.
  - "Lined up" means within 15 minutes before a problem on the same region.

- [ ] **Step 1: Failing tests.**
  - The config rows are a subset of User activity by key.
  - Each link problem has a route change exactly 3 minutes before its start.
  - 24h, 7d, 30d and 90d give different counts.
  - Maintenance appears only on AT&T-held connections.
  - No activity predates its region's first attach.
  - "Coming up" is after now at any `nowIso`.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit.** `"changes: one list of what changed, shared with User activity"`

### Task 1.4: One incident list (B5 data)

**Files:**
- Modify: `naas-observe-dash.js`: `problems` replaces `queue` (~:24-31)
- Modify: `naas-round2.js`: `R.health().incidents` (~:56-60) reads `problems`; `anomalies` (~:112-118) adds link events
- Modify: `naas-app.js`: `findingList` (~:1319-1325); `healthIncidents` (~:914); `queueRows` / `queueCount` (~:2046, ~:2320)
- Test: `tests/problems.test.mjs`, `tests/observe-dash.test.mjs`, `tests/consistency.test.mjs`

**Interfaces:**
- Consumes: `startOf`, `hhmm`, `agoOf` (1.1); `regionState` and `appsOf(...).parts` (1.2); `changes` (1.3).
- Produces: `export function problems(est, conns, ob, apps, changes, now) -> Problem[]`, with fields:

  | Field | Value |
  |---|---|
  | `key` | `'an-link-<region>'` or `'an-<region>'` |
  | `where` | e.g. `'Azure eastus'` |
  | `thing` | from naas-things, e.g. `'ExpressRoute'` |
  | `what` | e.g. `'BGP flapping · 0.31% drops'` |
  | `owner` | `'att' \| 'third' \| 'cloud' \| 'public'` |
  | `ownerLabel` | the owner in words |
  | `state` | `'down' \| 'risk' \| 'slo'` |
  | `sev` | `1 \| 2 \| 3`; 1 is worst, the only severity scale |
  | `apps` | `[tag]` |
  | `wl` | workload count |
  | `startedAt` | ms |
  | `change` | `{ at, text } \| null` |

  Rows rank by apps affected, then sev, then workloads.
- Produces: link problems enter `findingList` as `event: true` findings (unpriced) with lifecycle state. Alerts, the Home hero and the events all read this one list.

- [ ] **Step 1: Failing tests**

```js
test('Alerts, the Home hero and the findings events count one list', () => {
  const v = vals(mkC({ view: 'partial', tab: 'observe' }));
  assert.equal(v.queueCount, 2); assert.equal(vals(mkC({ view: 'partial', screen: 's0' })).healthIncidents.length, 2);
});
test('Growing: the first problem is the eastus flap, owned by the cloud provider', () => {
  /* where 'Azure eastus', thing 'ExpressRoute', what /BGP flapping/, ownerLabel 'Cloud provider', apps ['finance'], change.text '1 route change', change.at === startedAt - 3 min */
});
test('Blind regions are not alerts; they stay the blindspots finding', () => {});
test('the head counts the flap and keeps the savings', () => { /* the Observe pageVerdict on partial reads '13 findings open. $41,500/mo potential savings.' */ });
test('rank per estate', () => { /* mature: us-west-2 saturating (3 apps) before eu-central-1 flap (2 apps); trust: us-east-2 flap first */ });
test('no problem row prints ER, DX, fabric or a literal age', () => {});
```

- [ ] **Step 2: Implement.**
  - The eu-west-1 spike reads "p95 136 ms at peak", stating which p95 it shows.
  - Remove the Alerts drawer rows' "Blind" and flow "Over SLO" kinds.
  - Re-pin tests/consistency.test.mjs:81 per D-3.
- [ ] **Step 3: Commit.** `"incidents: one list for Alerts, Home and findings, ranked by apps affected"`

### Task 1.5: One connection classifier and the money it drives

**Files:**
- Modify: `naas-logic.js`: new classifier beside `RAMP_EDGE` (~:26)
- Modify: `naas-round2.js`: receives `attChargeRows` (moved from naas-app.js ~:3053-3063); `regionPath` (~:27) uses the classifier
- Modify: `naas-fabric.js` (~:18-25): facilities list AT&T-terminated ramps only
- Modify: `naas-flowmap.js` (~:108, ~:133): with nothing attached, sites route to the Internet mid, not a phantom NetBond
- Modify: `naas-app.js` (~:1783, ~:3089): import `attChargeRows` back
- Test: `tests/classify.test.mjs`, `tests/spend-view.test.mjs`, `tests/fabric.test.mjs`

**Interfaces:**
- Produces: `export function connModeOf(region) -> 'netbond' | 'direct' | 'third' | 'internet'`. It classifies by `r.priv` and `r.ramp` through the RAMP_EDGE owner. DX, ER and Interconnect are `direct`, owner cloud. EQX is `third`.
- Produces: `export function siteModeOf(site) -> 'att' | 'ipsec' | 'sdwan' | 'third'`. IPsec comes from `isTunnel`; SD-WAN comes from access matching `/sd-?wan/`.
- Produces: `export const CONN_LABEL`:

  | Mode | Short | Long |
  |---|---|---|
  | netbond | NetBond | AT&T NetBond |
  | direct | Direct connect | Cloud provider direct connect |
  | third | Equinix | Third party (Equinix Fabric) |
  | internet | Internet | Public internet |
  | ipsec | IPsec | IPsec VPN |
  | sdwan | SD-WAN | SD-WAN |

- Produces: `export function attChargeRows(est, utilRows) -> Row[]`. It bills NetBond by ports from `utilRows` and never lists a `direct` or `third` region as NetBond.

- [ ] **Step 1: Failing tests.**
  - 'no DX, ER or EQX region appears in the NetBond row' (all estates).
  - 'the AT&T charges tab, mapRates and the connectivity leg read one function'.
  - 'fabric facilities never say AT&T for a cloud-owned ramp'.
  - 'Small draws no NetBond node when nothing is attached'.
  - `connModeOf` and `siteModeOf` per estate: Growing has 5 IPsec sites; Established and Bank scale SD-WAN come from their rollups.
- [ ] **Step 2: Implement.** Re-pin the moved AT&T charges totals and the Observe Cost tile with dated comments (D-6).
- [ ] **Step 3: Commit.** `"connections: one classifier; NetBond is billed only for NetBond"`

### Task 1.6: One capacity function

**Files:**
- Modify: `naas-observe-dash.js`: new `capacity`, extracted from the inline gauge math in `naas-app.js` (~:2015-2035)
- Test: `tests/capacity.test.mjs`, `tests/bandwidth.test.mjs`

**Interfaces:**
- Produces: `export function capacity(conns, win) -> Cap[]`. `Cap` has:
  - `{ id, region, thing, ports, portG, capG, peakG, peakPct }`;
  - `avg6mPct`: the mean of `X.utilSeries(id + ':6m', 24, pct, growthOf('6m'))`;
  - `headroomG`, `fullIn` (days) and `state`;
  - `oversized`: true when `peakPct <= 50` and one fewer port keeps peak at or below 80%.

- [ ] **Step 1: Failing tests.**
  - Observe Connections and `capacity` agree row for row.
  - Growing us-east-1: capG 30, peakPct 41, avg6mPct below 41, oversized true, resize to 2 ports gives peak 62%.
  - The window changes `avg6mPct` and `fullIn`, never `capG`.
- [ ] **Step 2: Implement.** gaugeRows reads it.
- [ ] **Step 3: Commit.** `"capacity: one function for what was bought, what is used, and when it fills"`

### Task 1.7: Findings that agree with the data

**Files:**
- Modify: `naas-data.js`: Established findings (~:208-210); Growing 'single' (~:149)
- Test: `tests/estate-insights.test.mjs`, `tests/finding-life.test.mjs`

- [ ] **Step 1: Failing tests.**
  - The Established Observe pageVerdict reads '8 findings open. $17,500/mo potential savings.'
  - Established Spend "Still open" equals "Could save".
  - Growing 'single' names Azure eastus and finance.
  - 'no finding names a site or region that contradicts its data': any single-path claim has `paths < 2`.
- [ ] **Step 2: Implement** per D-9. Established avoidable is misc $5,400 and crosscloud is awsx $12,100, each with a ladder copied from Growing's.
- [ ] **Step 3: Commit.** `"findings: Established prices its savings; single path means one path"`

### Task 1.8: The segment contract (B3 data)

**Files:**
- Create: `naas-segments.js`. It imports naas-things, naas-sites, naas-paths, naas-flowmap, naas-connections, naas-volume and naas-fabric; none of them import it. `stamp-version.sh:45` and network-name.test.mjs pick it up automatically.
- Modify: `naas-app.js`: build `segCtx` once after ~:251 from `obAll`, `conns` and an unfiltered, memoized `A.inventory(est0)`, never the chip-filtered `inv`.
- Test: `tests/segment-model.test.mjs` (tests/segments.test.mjs already belongs to the hero band)

**Interfaces:**
- Produces: `SEGMENTS`, the seven grid columns in order: site, edge, backbone, onramp, cloudlink, hub, app.

  | Column | Header (stakeholder) | Title (house segment) |
  |---|---|---|
  | site | Site | Access |
  | edge | Edge | Edge: AT&T PE |
  | backbone | Backbone | Core: AT&T backbone |
  | onramp | On-ramp | Edge: NetBond or Equinix |
  | cloudlink | Cloud link | Access: the cloud's port and gateway |
  | hub | Hub | Cloud routing hub |
  | app | App | VPC and app |

- Produces: `TABLE`, the stakeholder's nine rows in his order. Each row is `{ key, label, owner, show, source, limited }`.
- Produces: `OWNERS = { att: 'AT&T', third: 'Third party', cloud: 'Cloud provider', customer: 'You', public: 'Public internet' }`.
- Produces: `HUB_NAME = { AWS: 'Transit Gateway', Azure: 'Virtual WAN hub', GCP: 'NCC hub', Oracle: 'DRG', CoreWeave: 'VPC router' }`.
- Produces: `cellsFor(tag, ctx) -> Cell[7]`, with `Cell = { state: 'ok'|'risk'|'slo'|'down'|'nodata'|'none', thing, owner, limited, why }`. States come only from existing sources:

  | State | Source |
  |---|---|
  | `down` | `conns` degraded, landing on Cloud link for direct and On-ramp for netbond or third (D-5) |
  | `risk` | `conns` at 80% or more |
  | Site cells | `V.siteState` |
  | NetBond ports | `FB.ports` |
  | Latency | `regionState` (1.2) |
  | App `nodata` | `ob.blind` |

  - Hub is `nodata` everywhere, "Not yet measured" (D-2).
  - A NetBond region's Cloud link is `nodata`.
  - IPsec sites:
    - Site is Third Party Access, owner third, limited.
    - Edge, Backbone and On-ramp are `none` (off the path).
    - Cloud link is the IPsec tunnel, owner customer, `nodata`.
  - A cell is the worst of its material parts (at least 5% of traffic), except `down`, which wins from any part.
- Produces: `segmentTable(est, ctx) -> Row[9]`, with `Row = { ...TABLE[i], now: { state, where, why } | null, measured: boolean, counts: { n, ok, risk, slo, down, nodata } }`.

- [ ] **Step 1: Failing tests.**
  - Owner parity with naas-things on all five estates.
  - Down cells equal `conns.degraded`, which equals fabricHealth's "N degraded".
  - `nodata` app cells equal `ob.blind`.
  - The five Growing IPsec branches show a Third Party Access, limited Site cell.
  - Deterministic under `obScope` and `s.chips`.
  - Empty returns 9 rows with zero counts.
  - `TABLE` order and labels match the email.
  - No 'ER', 'DX', 'fabric' or em dash.
- [ ] **Step 2: Implement.** Seed no live telemetry (D-2); unmeasured metrics read "Not yet measured".
- [ ] **Step 3: Commit.** `"segments: who answers for each piece of a path, from data we already hold"`

**Phase 1 gate:** `npm test` and the full fold run, then merge to main.

---

## Phase 2: Wired for Monday (Thu-Fri)

### Task 2.1: Proportional destinations (E1)

**Files:**
- Modify: `naas-flowmap.js`: `buildMap` pick block (~:369-378) and layout (~:422)
- Modify: `naas-app.js`: `mapNodes` render (~:1840) and the scope picker's set (~:2093)
- Test: `tests/flowmap.test.mjs`, `tests/sankey-scope.test.mjs`

**Interfaces:**
- Produces: `buildMap(...).context: Node[]`, with `side: 'ctx'` and `ctx: true`. Context nodes never enter `map.nodes`, so perfOf, the tiles, the trace and `side === 'r'` readers are untouched.

- [ ] **Step 1: Failing tests (partial, 30d)**

```js
test('a cloud pick draws its destination at its whole-estate height', () => {
  /* heights by key of [pick, ...m.context] equal the Whole estate right heights within 0.5px; GCP.h < Azure.h (13 vs 79) */
});
test('context rows carry no ribbons, no trace, no health, and the total is unchanged', () => {});
test('opening the picked destination returns the column to the full frame', () => { /* m.context is [] */ });
test('clicking a context cloud switches the pick in place', () => { /* obScope 'cloud:Azure', mapRegion null; the data-center row is not clickable */ });
test('By app picks on Small get context; By cloud on Small does not', () => {});
```

- [ ] **Step 2: Implement.** Add the sub-head "Destinations at estate scale" when context exists. Muted rows sit at opacity 0.45, with no caret and a right-aligned label. Take headless screenshots of the Growing GCP pick in both themes; Micah looks, and D-14's fallback applies if it reads as a conservation break.
- [ ] **Step 3: Commit.** `"traffic: a picked cloud keeps its true size next to the others"`

### Task 2.2: Egress growth in dollars (E2)

**Files:**
- Modify: `naas-round2.js`: new `egressWeeks`; `insightWidgets` (~:236); `an-egress` (~:117)
- Modify: `naas-app.js` (~:2603)
- Modify: markup (~:1067-1069)
- Test: `tests/insight-cards.test.mjs`

**Interfaces:**
- Produces: `export function egressWeeks(ob) -> [{ label, pub, fab }]`, 12 weeks, with no `|| 1` fallbacks.
- Produces: `insightWidgets(est, ob, win, { pubRate })`. Its growth gains `thenMo`, `nowMo`, `deltaMo`, `thenF`, `nowF`, `deltaF` and `pubPctF`.
  - `pubRate` = the sum of `est0.buckets` where today exceeds fabric, divided by `wk[11].pub`, so it is anchored to this week.

- [ ] **Step 1: Failing tests.**
  - Growing: nowF '$71,600', thenF '$64,800', deltaF '+$6,800'.
  - Established: nowF equals the Cost verdict's public egress, '$32,800'.
  - A scope with no public traffic shows no bars, no %, no $.
  - The an-egress head contains `pubPctF` and never 'week over week'.
  - No title says '1 weeks'.
- [ ] **Step 2: Implement.**
  - The sub-head reads "Public egress +$6,800/mo in 12 weeks · +11%".
  - The axis ends read "$64,800/mo · 12 weeks ago" and "this week · $71,600/mo".
  - Per-bar dollars go in the bar title, not on the bar.
  - Optional: a dashed reference line at week 0 (+1 div, census moved). Keep it only if the headless screenshot reads.
- [ ] **Step 3: Commit.** `"signals: egress growth says what it costs"`

### Task 2.3: Your sites lists sites with service and bandwidth (D2)

**Files:**
- Modify: `naas-sites.js`: `servicesOf` (~:166-177); sample privacy (~:107, ~:133)
- Modify: `naas-data.js`: Growing services (~:88-112), with explicit bandwidth and the D-12 re-seed
- Modify: `naas-connections.js`: `siteCard` (~:181); service leaf (~:251-255)
- Modify: `naas-flowmap.js`: service nodes in `childrenOf` (~:211-215)
- Modify: `naas-observe-dash.js`: site panel Access row (~:103)
- Modify: `naas-app.js`: Your sites block (~:2552-2571); Business units rows
- Modify: markup Your sites rows (~:815-822) and Business units (~:799)
- Test: `tests/your-sites.test.mjs`, `tests/site-services.test.mjs`, `tests/access-group.test.mjs`

**Interfaces:**
- Produces: `servicesOf(site)[i].bw` (Mbps) and `.bwF` ('10 Gbps', '100 Mbps').
  - An explicit `services[i].bw` wins.
  - Otherwise class defaults apply: Data center 10000, Campus 5000, Plant 2000, Office 2000, Branch 100, Edge 10, Field 500.
  - A backup gets min(1000, primary).
- Produces: at the state level, the metros flatten into site rows `{ name, sub: '<metro> · <class>', svcLine: 'AVPN 10 Gbps + ADI 1 Gbps backup', bwF, onAtt }`. `placeTrail` keeps the metro, so crumbs read All regions > region > state > metro > site.

- [ ] **Step 1: Failing tests.**
  - Growing MA lists 'Boston office', 'Business Fiber', '2 Gbps', with placeLine '1 site in 1 metro'.
  - Texas lists Dallas DC as 'AVPN 10 Gbps + ADI 1 Gbps backup'.
  - Every site's primary bandwidth is at least its modelled traffic (`P.siteRegions`), on every estate.
  - Bank scale Florida '+703 more in Miami' pages in place and never sets `drawerOpen`.
  - Nationwide says 'states'.
  - No crumb reads a bare dash.
  - Rollup samples agree with the metro's AT&T count.
  - Dallas DC's bwF is identical on Discover, the Connect service leaf, the Traffic map service node and the Observe site panel.
  - Atlanta and Los Angeles are Business Fiber primary. Re-pin the access-group counts with a comment (D-12).
- [ ] **Step 2: Implement.**
  - At the region level, a state row holding two sites or fewer names them in its sub.
  - Widen the row grid to `10px minmax(0,1.3fr) minmax(0,1.4fr) 96px auto 16px`; Service ellipsizes.
- [ ] **Step 3: Commit.** `"sites: every state lists its sites with how they connect and how fast"`

### Task 2.4: Your clouds tiles (D3)

**Files:**
- Modify: `naas-connections.js`: new `cloudScope`
- Modify: `naas-app.js`: `cloudTiles` (~:2543-2548); level noun (~:2534)
- Modify: markup tile row (~:771)
- Test: `tests/cloud-scope.test.mjs`

**Interfaces:**
- Consumes: `connModeOf`, `siteModeOf` and `CONN_LABEL` (1.5).
- Produces: `cloudScope(est, inv, trail) -> { counts, tiles, mix, siteLine }`.
  - `counts` = `{ clouds, regions, vpcs, subnets, workloads, apps, exposed }`.
  - `tiles` are four per level:
    - root: Clouds, Regions, VPCs & VNets, Apps;
    - cloud: Regions, VNets, Apps, Workloads;
    - region: VNets, Subnets, Apps, Workloads;
    - VPC: Subnets, Workloads, Apps, Exposed;
    - subnet: Workloads, Exposed, Apps, AZ.
  - `mix` is `[{ mode, n, pct }]` over VPCs, in CONN_LABEL order.
  - `siteLine` = "5 IPsec sites · 0 SD-WAN sites" on Growing.
  - The noun is VNet for Azure and VCN for Oracle.

- [ ] **Step 1: Failing tests.**
  - The tiles differ at root, Azure, eastus, vnet-prod-01 and a subnet.
  - Root clouds, regions and apps equal the invStats pills and the Apps ring.
  - The mix sums to the VPC count at every level on every estate.
  - netbond + direct + third equals invStats.attached at root: 3, 14, 8 and 0.
  - ER and DX count as Direct connect; EQX as Equinix.
  - No Sites, On AT&T or Not on AT&T tile remains.
  - A landed attach moves that region's VPCs from Internet to NetBond.
- [ ] **Step 2: Implement.** The grid is `repeat(4,minmax(0,1fr)) minmax(0,2.2fr)`. The mix is a bar of spans with a one-line legend; the full names go in titles. If the tile still wraps at 1440, `cloudRows` goes from 9 to 8 per page.
- [ ] **Step 3: Commit.** `"clouds: tiles count clouds and how they attach, and follow the drill"`

### Task 2.5: Cost > Optimize (A1)

**Files:**
- Modify: `naas-round2.js`: new `optimizeRows`
- Modify: `naas-app.js`:
  - `SECTIONS.cost` (~:100-103)
  - the rail cost branches (~:2872, ~:2877), as an id-to-panel map
  - `costPanels` (~:3213-3215) and `costPanelOf` (~:3048)
  - `costVals` (~:3064), which receives conns, obAll and findings
  - delete the dead `costStrip` (~:3216)
  - the Resiliency prefill bug at ~:2049
- Modify: markup: a new `sc-if costPanelOptimize` with `id="sec-optimize"` before the Spend panel (~:1337); remove the costMoves strip (~:1306-1310)
- Test: `tests/optimize.test.mjs`, `tests/spend-view.test.mjs`, `tests/sub-layer.test.mjs`, `tests/rail-persona.test.mjs`

**Interfaces:**
- Consumes: `findingList` with `LC.lifeOf`; `capacity` (1.6); `appsOf` (1.2); enforced policies.
- Produces: `optimizeRows(est, { findings, capacity, apps }) -> [{ key: 'spend'|'routing'|'resiliency'|'capacity', label, lines: [string], figure, figureF, figureKind: 'save'|'risk'|'size', cta, state }]`, in the stakeholder's order:

  | Row | Source | CTA (verbatim) | Growing figure |
  |---|---|---|---|
  | spend | open `ipsecegress` + `avoidable` findings; lines are their heads | Update connection type | $28,700 |
  | routing | open `crosscloud` | Update routing policy | $12,800 |
  | resiliency | apps whose tag an enforced policy matches, riding a private region with paths < 2 | Add backup path | Azure eastus, finance, 40 workloads |
  | capacity | `capacity(...)` rows with `oversized` | Resize | us-east-1, 3 x 10 Gbps to 2 x 10 Gbps |

  - If nothing is oversized, the capacity row lists saturating rows with "Add a port".
- Produces: vals field `optRows` (the rows above, each with `go`), `costPanelOptimize`, and `costPanel` 'optimize' as the landing panel. The legacy 'banked', 'forecast' and 'savings' keys map to 'spend'.

- [ ] **Step 1: Failing tests**

```js
test('Optimize rows in the stakeholder order with his verbs', () => {
  const r = vals(mkC({ view: 'partial', tab: 'cost' })).optRows;
  assert.deepEqual(r.map(x => x.cta), ['Update connection type', 'Update routing policy', 'Add backup path', 'Resize']);
});
test('Spend plus Routing is the head savings on every estate', () => { /* === the $ in the Observe pageVerdict (observeHead, naas-app.js:286); rounded to hundreds vs arbTotal (spend-view:41 precedent) */ });
test('a dismissed finding leaves its row', () => { /* dismiss ipsecegress: spend drops $5,500 */ });
test('every action lands', () => {
  /* spend → s4 compose with the IPsec sites; routing → govern authoring.req ['Cost-aware routing'];
     resiliency → s4 compose, prefillRegion 'Azure eastus', two metros, no constraint; capacity → s6, order.title /^Resize/ */
});
test('small and empty degrade in words', () => { /* empty: 'No egress seen yet.' No '$0', no NaN */ });
test('the Cost rail lists Optimize then Spend; Optimize lights only on its panel; legacy keys land on Spend', () => {});
```

- [ ] **Step 2: Implement.**
  - The head reads "What should I change first?" plus "Save $41,500/mo across Spend and Routing".
  - The largest saving carries "Start here".
  - Each row shows its backing finding's state chip, e.g. "In progress".
  - Rows are a bare list: no card, no box.
  - Re-pin spend-view:17-22 with a dated comment.
- [ ] **Step 3: Commit.** `"cost: Optimize answers what to change first, with the four moves"`

### Task 2.6: Observe > Health (B1, B2, B4, B5)

**Files:**
- Modify: `naas-app.js`:
  - `obPanels` (~:1978-1979) and gates (~:2322) gain 'health'
  - `healthTiles`, `pathFlowRows` (paged 8) and `problemRows` (paged 3) in `PAGE_SIZE`
  - the Alerts button sets `obPanel: 'health'`
  - Home's Observe door `launchGo.observe` (~:647) lands on Health with the problem selected
  - the Help 'Support Tickets' card (~:965) becomes a door to Health's problems
- Modify: `naas-observe-dash.js`: new `pathFlow`; a `panelFor` branch for `'app:<tag>'` (~:34)
- Modify: markup: `sc-if obPanelHealth` inside `#sec-flow` after Where it goes; retire the Alerts drawer (~:2027-2043)
- Test: `tests/health-tab.test.mjs`, `tests/help-center.test.mjs`, `tests/markup.test.mjs`

**Interfaces:**
- Consumes: `cellsFor` and `SEGMENTS` (1.8); `problems` (1.4); `appsOf` (1.2); `HEALTH_WORD` (1.2).
- Produces: `pathFlow(est, ctx) -> [{ tag, label: '<tag> → <first top app>', cells: Cell[7], state, wl }]`, worst first.
- Produces: `healthTiles`: "Apps healthy · n of N", "At risk · n apps", "Down · n connections", "Alerts · n".
- Produces: an "Open ticket" move = `moveF(f, 'progress', { note: 'Ticket T-<4 digits> opened, routed to <ownerLabel>' })`. The button then reads "T-1234 · In progress".

  "Trace" sets the Traffic map to the problem's region (the `fd.showMap` pattern). Task 3.3 re-points it to Paths.

- [ ] **Step 1: Failing tests.**
  - The tab labels are Traffic, Over time, Where it goes, Health, Capacity.
  - Growing finance row: Cloud link `down` (thing 'ExpressRoute', ownerLabel 'Cloud provider') and App `down` (single path); the pci row is all Healthy.
  - The red rows per estate are the tags behind the degraded connection: Growing finance; Established prod and analytics; Bank scale pci, finance-invoices and internet-facing.
  - IPsec branch Site cells are Third Party Access rings; Hub cells are `nodata`.
  - Growing problem row 1 fields, with Started from the clock and the route change 3 minutes earlier.
  - "Alerts · N" equals the problems total, and the button opens Health.
  - Open ticket persists through `naas.life`, and the finding shows 'In progress' in Insights.
  - The Down tile equals the distinct down connections.
  - No 'ER', 'DX' or 'fabric'.
  - Help's Support Tickets card is a door, with help-center:40 re-pinned.
- [ ] **Step 2: Implement.**
  - The grid is CSS-grid rows, with a nested `sc-for` over the cells (the g.spark pattern, ~:1282).
  - Headers are written longhand, with titles naming the house segment.
  - Marks:
    - filled dot for a full view;
    - ring for limited;
    - dashed grey for no data;
    - blank for off-path;
    - Down carries its word.
  - Measure the 5-tab row at 1440; if it overflows, apply D-4's fold.
- [ ] **Step 3: Commit.** `"observe: Health shows every app's path segment by segment, and the problems ranked by apps"`

### Task 2.7: Capacity tab (B2 "Is it full?")

**Files:**
- Modify: `naas-app.js`: the obPanels label becomes 'Capacity' (key stays 'conn'); gauge rows read `capacity` (1.6)
- Modify: markup Connections panel (~:1269-1286): Headroom and Full-in columns; empty state
- Test: `tests/bandwidth.test.mjs`

- [ ] **Step 1: Failing tests.**
  - The label is 'Capacity'.
  - Each row's peak, 6-month average, headroom and full-in equal `capacity(...)`.
  - Small reads "Nothing attached yet. Capacity starts with your first port." and has no blank body.
  - Established us-west-2 shows its full-in.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit.** `"observe: Capacity says what is bought, used and when it fills"`

### Task 2.8: Add a source and watch it discovered (D1)

**Files:**
- Modify: `naas-data.js`: `FOUND_SOURCES`; `REG` (~:37) carries `x.fresh`
- Modify: `naas-addendum.js`: `region()` (~:93-160) marks fresh VCNs and workloads (since 0, prefix 'vcn' for Oracle); `invKey` (~:75) gains fresh
- Modify: `naas-schedule.js`: new `withSources`; `accountsAt` (~:139-141) and `seedRuns` are floored at `added`
- Modify: `naas-app.js`:
  - `estateFor` (~:178-184)
  - `addSource` (~:2404-2406)
  - `rawSources` (~:2368-2379): the fake Pending rows go
  - an S1 "Re-discover" bound to `rescanNow` (~:2927), never `rescan`
  - the '10 new' pill filters Your clouds and Your sites rows (~:1372, ~:1395-1397)
- Modify: markup: Sources head (~:665-668); result alert; Remove bound (~:722)
- Test: `tests/found-source.test.mjs`, `tests/sources-page.test.mjs`

**Interfaces:**
- Produces: `FOUND_SOURCES.Oracle`:
  - regions:
    - us-ashburn-1: wl 48, tags ['ERP', 'Finance'], public
    - eu-frankfurt-1: wl 22, tags ['ERP'], public
  - bucket `{ id: 'oci', cloud: 'Oracle', today, fabric }`
  - finding kind 'newcloud-oracle': priced, found = the add time, ladder Attach > FastConnect over NetBond.
- Produces: `withSources(est, added) -> est`. It is append-only and dedups by region name. It bumps `meta` clouds, regions and workloads, shrinks `regionsExtra` for discovered names, and never mutates `D.ESTATES`.
- Produces: state `addedSources: { [estId]: [{ provider, cred, cadence, at }] }`, session only (not persisted), in `defaults()` and the constructor.

- [ ] **Step 1: Failing tests.**
  - Growing, add Oracle and scan:
    - The Sources row reads Connected, 'API signing key', 'Read-only · 2 regions', 'just now'.
    - invStats go from 3 to 4 clouds, 7 to 9 regions, and 303 to 373 workloads.
    - The Apps ring gains 'erp'.
    - Your clouds root lists Oracle, which drills to us-ashburn-1 > VCN > subnets > workloads.
    - The Health grid gains an 'erp' row.
  - Established is untouched.
  - Remove restores the counts; a fresh `mkC` carries nothing.
  - The Sankey conserves with Oracle.
  - The Oracle finding reads 'today'.
  - No seeded region collides with `regionsList` or the levelMap extras (~:1110).
  - Adding AT&T inventory creates no row.
- [ ] **Step 2: Implement.**
  - The result alert (role=status) reads "Discovery found 2 Oracle regions, 3 VCNs and 70 workloads. Both ride the public internet."
  - It offers "See what it found", which moves in place to Your clouds with `cloudTrailE ['cloud:Oracle']`, and "Attach".
  - The run record is written in the same setState as the add.
- [ ] **Step 3: Commit.** `"discover: an added source finds its clouds, and every count follows"`

**Phase 2 gate:** `npm test`; the full fold run, plus a fold pass with Oracle added on Growing; merge to main.

---

## Phase 3: Shown as designed, data labelled (Fri-Sat)

### Task 3.1: Three cost legs (A2)

**Files:**
- Modify: `naas-round2.js`: new `costLegs`; a `CSP_PORT` constant with a source URL comment per price
- Modify: `naas-app.js`: `costPanels` gains 'legs' ("By leg"); the Observe Cost tile gets a scope line and a door
- Modify: markup: a `sc-if costPanelLegs` panel
- Test: `tests/cost-legs.test.mjs`, `tests/spend-view.test.mjs`

**Interfaces:**
- Consumes: `connModeOf`, `siteModeOf` and `attChargeRows` (1.5); `servicesOf` (2.3).
- Produces: `costLegs(est, inv, utilRows) -> { access, connect, cloud, total }`. Each leg is `{ key, label, total, rows: [{ key, label, sub, n, v, modelled }] }`.

  **access (Site access):**
  - `servicesOf` x `countOf` at the CATALOG "Starting at" price.
  - Rollup rows are priced at 0.3x (a remote-site rate) and marked modelled.
  - Third Party Access and AT&T off-net 'other' are counted with v 0 and "billed by another carrier".

  **connect (Cloud connectivity):**
  - `attChargeRows`.
  - "Your cross-connects" at a colo rate, modelled.
  - IPsec tunnels at the CSP VPN connection fee, list price, modelled.
  - SD-WAN sites at CATALOG sdwan.

  **cloud (Cloud provider):**
  - CSP port rows by product name (AWS Direct Connect, Azure ExpressRoute, Google Cloud Interconnect, Oracle FastConnect) from `utilRows` ports.
  - A billing-mode flag for AWS flat-rate DX.
  - An egress row equal to the sum of `est.buckets` today.

- [ ] **Step 1: Failing tests.**
  - total equals the sum of the three legs on every estate; empty is all 0.
  - Access rows count what `servicesOf` counts, primary and backup.
  - The egress row is $89,600 on partial, $121,400 on mature and $438,000 on trust.
  - No DX, ER or EQX region appears in the NetBond row.
  - Every modelled figure carries the modelled mark.
  - "Spend this month" is unchanged (D-7).
  - The empty estate reads 'No egress seen yet.'
- [ ] **Step 2: Implement.**
  - Verify each CSP list price on the vendor's pricing page (WebFetch) during the task, and cite it in the code comment. Azure ExpressRoute sources disagree ($300 vs $436 at 1G); take the vendor page.
  - The panel shows three leg tiles over three bare lists with totals, paged. It must fit 900.
- [ ] **Step 3: Commit.** `"cost: spend in three legs, list prices marked modelled"`

### Task 3.2: Health > By segment (B3)

**Files:**
- Modify: `naas-app.js`: `healthView: 'app' | 'segment'` (in `defaults()` and the constructor); `segRows`
- Modify: markup: an in-panel toggle "By app | By segment"; nine CSS-grid rows
- Test: `tests/segment-table.test.mjs`

**Interfaces:**
- Consumes: `segmentTable` (1.8).
- Columns: Segment · Owner · Now (dot, worst thing, why) · What we show · Source.
  - Rows with `limited` carry a "Limited view" chip.
  - Rows with no source read "Not yet measured".
  - A row click drills in place into its instances. Site rows go region > state > metro > site; the list is never flat.

- [ ] **Step 1: Failing tests.**
  - Nine rows in the email's order on every estate, including empty.
  - Owners match OWNERS.
  - The limited rows are exactly the third-party and public ones.
  - Growing's Cloud connection row reads 'Azure eastus · ExpressRoute · BGP flapping'.
  - Hub, exit and DNS show 'Not yet measured'.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit.** `"health: by segment, who answers for each piece and what we can see"`

### Task 3.3: Paths and Changes tabs (B2)

**Files:**
- Modify: `naas-app.js`: `obPanels` gains 'paths' and 'changes'; `pathSel`, `changesPage` (in `defaults()` and the constructor); Trace re-points to Paths
- Modify: markup: two panels; the Changes timeline is positioned divs, never `sc-for` inside `<svg>`
- Test: `tests/paths-changes.test.mjs`

**Interfaces:**
- Consumes: `cellsFor` (1.8); `changes` (1.3); `problems` (1.4).
- Paths rows: one per app group; cells show "ms · loss" per segment; the last column is "Site to app".
  - The total equals `site.ms` plus the perfOf path ms (+1 per hub or public hop). Pin that identity; leave `P.path` alone.
  - Loss shows only where a source exists: conns drops, or 0.3% on a rel 'warn' public path. Elsewhere it is blank, titled "Not yet measured".
- Changes: a timeline strip over the Since window (problem bands, change ticks), then a paged list: When · Kind · Change · What it touched · Source · Lined up with.

- [ ] **Step 1: Failing tests.**
  - Hop ms sum to "Site to app".
  - The eastus Cloud link loss reads '0.31%'.
  - Changes lists the route change 3 minutes before the eastus problem, marked lined up.
  - Since changes the list.
  - Trace sets `obPanel 'paths'` and `pathSel 'finance|eastus'`.
- [ ] **Step 2: Implement.** Measure the 7-tab row (D-4).
- [ ] **Step 3: Commit.** `"observe: Paths shows is it fast, Changes shows what changed"`

### Task 3.4: Insights > Operations (C1)

**Files:**
- Modify: `naas-observe-dash.js`: `HISTORY` (sample closed tickets per estate, relative to now); `ticketStats`; `availability`
- Modify: `naas-data.js`: `slaHolder` stated on each `regionsList` entry
- Modify: `naas-app.js`: `insPanels` gains 'ops'; `opsPanel`, `andiTickets`, `ticketPage`, `availPage` and `changePage` (in `defaults()` and the constructor); Help Support Tickets now goes to Operations > Tickets
- Modify: markup: `sc-if insPanelOps` with four sub-panels
- Test: `tests/ops-insights.test.mjs`, `tests/help-center.test.mjs`

**Interfaces:**
- Consumes: `problems` (1.4); `changes` (1.3); lifecycle moves; `capacity` (1.6).
- Tickets = open problems + findings In progress that carry a ticket note + `HISTORY` closed tickets.
- Growing's 30-day closed fixes are 190, 845, 2295, 1560, 582, 2069 and 1076 minutes, so the mean is 1231, which is 20h 31m. The other windows (24h: 1 fix, 7d: 3, 90d: 15, 12m: sparse) and the other estates each get their own scaled seeds.
- `opsLine` = `${sev1} Sev 1 open now. ${open} tickets open. Fixes took ${mttr} on average.`
- The window is the title-row Since select, which already offers 24h, 7d, 30d and 90d (markup ~:327). There is no second control.
- Availability:
  - uptime = 1 - Sev 1 outage minutes / window;
  - targets come from the R path objects (naas-round2.js:14-15: NetBond 99.99, hyperscaler 99.9);
  - the owner is the stated `slaHolder`.
- "Andi opens a ticket for each new incident: On" is a session toggle.

- [ ] **Step 1: Failing tests.**
  - The subtabs are Overview, Tickets · N, Availability, Maintenance & Changes, as underline tabs.
  - Growing at 30d: `opsLine` ends "Fixes took 20h 31m on average." and its open count equals the Tickets pager total.
  - Since changes fixes and time-to-fix but never "open now".
  - Availability stays within 0-100%, with stated owners.
  - Maintenance appears only on AT&T-held connections, and "Coming up" is after now.
  - Empty shows lines, never NaN or "0 of 0".
  - Lists page.
  - Only theme tokens appear before `id="sec-insights"` (insight-cards:39-45).
  - The history is labelled sample.
- [ ] **Step 2: Implement.** Append 'naas.*' keys, if any, to `DEMO_KEYS`.
- [ ] **Step 3: Commit.** `"insights: Operations with tickets, availability and what changed"`

### Task 3.5: Insights > Your actions and Monthly briefing (C2, C3)

**Files:**
- Modify: `naas-verdicts.js`: new `briefingFor`
- Modify: `naas-schedule.js`: a monthly calendar branch in `nextRunAt` / `prevRunAt`, kept out of `periodOf` and the history loop; `BRIEF_CHOICES`
- Modify: `naas-app.js`:
  - `insPanels` gains 'role' (the landing tab) and 'brief', so the order is Your actions, Operations, Findings · N, Signals, Monthly briefing
  - `ROLE_OF`
  - `rolePage` and `briefCfg`
  - delete the dead persona map (~:2156-2157) after reusing its assignments
  - bind the rewritten PERSONA_LENS
  - Andi's context carries the briefing string
- Modify: markup: two panels
- Test: `tests/insights-role.test.mjs`, `tests/briefing.test.mjs`, `tests/schedule.test.mjs`

**Interfaces:**
- Your actions:
  - Role chips inside the panel are bound to `s.persona`.
  - The left side is a role headline plus two visuals from the Signals cards: talkers for Executive; newdest and shadow for Security; growth and idle for FinOps; multi for Architect; Health problems and Latency over SLO for Network Eng.
  - The right side is "Actions for <role>", a bare list with a border-left rule, paged at 4. It holds findings only, never events.
  - Each row carries head, save line, "Recommended: <rec>" and state.
  - Buttons:
    - "Do it" is disabled, with visible "Coming soon" text;
    - "Accept" shows only when the state is open or snoozed, and moves to ack with the note "Accepted: <rec>";
    - "Defer" moves to snoozed until the role's next briefing send;
    - after Accept, "Start" (to progress) and "Snooze" show.
  - Architect's list = the Private reach pillar + crosscloud + capacity rows at 80% or more ("Add a port").
  - Executive's list = the top 3 open priced findings by save. With none priced, it shows "Nothing priced on the table" and a link to Operations.
- Monthly briefing:
  - `briefingFor(role, facts) -> string` of 4-6 sentences. The facts are built once in vals from rendered figures: open findings, on the table, banked last month, found and resolved this month, tickets and time to fix, availability, top 3 actions, next maintenance.
  - "Who gets it" has five rows with a role mailbox per estate (never meridianlogistics.com on Acme).
  - The cadence select is written longhand: "Monthly on the 1st at 08:00" / "Off".
  - Last sent and next send come from the one clock; "Send a test" is disabled.

- [ ] **Step 1: Failing tests.**
  - Insights lands on Your actions; the chips set the persona.
  - Each role has at least one visual and one action on Growing and Bank scale; empty shows its line.
  - Accept on an open finding gives 'Acknowledged', and Accept is absent on ack and progress rows.
  - Defer gives 'Snoozed': openFindingsN drops by 1 and the priced verdict moves.
  - Do it is disabled and shows 'Coming soon'.
  - The briefing cites the same dollars as pageVerdict and the same counts as openFindingsN and opsLine.
  - After 2026-10-05 the next monthly send is Nov 1, 08:00; SCHEDULE_CHOICES stays at 5.
  - No em dashes; 'Andi' only.
- [ ] **Step 2: Implement.** Rebuild when the reference file arrives (D-10).
- [ ] **Step 3: Commit.** `"insights: actions by role and Andi's monthly briefing"`

**Phase 3 gate:** `npm test` and the full fold run, then merge to main.

---

## Phase 4: Rehearsal gate (Sun)

### Task 4.1: Demo script, walk, deploy

**Files:**
- Create: `docs/demo-2026-10-05-notes.md`
- Create: `scripts/demo-walk.mjs`: headless; a fresh profile; follows the script and asserts its key strings

- [ ] **Step 1: Write the script.** It runs Growing, Network Eng, at 1440x900. The beats:
  1. Discover: add Oracle; see what it found.
  2. Your sites and Your clouds.
  3. Observe > Traffic: GCP pick, proportional.
  4. Health: the eastus flap, Open ticket.
  5. Capacity.
  6. Cost > Optimize: the four moves; By leg.
  7. Insights > Operations and Your actions.
  8. The Estate switch to Established (F2).
- [ ] **Step 2: Run the walk.** `npm test` bare; `node scripts/fold.mjs` in full (5 estates x light/dark); `node scripts/demo-walk.mjs` on a clean profile. All pass.
- [ ] **Step 3: Deploy on Micah's word.** Push main; the Pages workflow stamps the build. Cold-load the live URL headless, and check that `version.js` shows the pushed sha.

---

## Phase 5: After Monday (not tasked)

- **B3:** full segment telemetry (jitter, optical, NAT, DNS, tunnel flaps) once a source is agreed.
- **B1:** health colouring on the Sankey itself.
- **B2:** the `P.path` hop-name rework and the Observe tab consolidation.
- **A2:**
  - legs stacked in the Spend chart;
  - the Sankey priced by legs;
  - "Spend this month" as the three-leg total.
- **C2:** rebuilt from `NaaS_Insights_By_Role_Options.html`.
- **C1:** a real ticket store and Andi auto-open rules.
- **C3:** actual sending.
- **D1:**
  - persistence;
  - second-account seeds (names outside the levelMap extras);
  - honouring "selected regions".
- **E1:** region filters, and the By site / By first mile picks.
- **Unify:** SPEND_GROWTH, TREND and the egress card series into one growth model.
- **Inventory:** fix the GCP and CoreWeave hub and gateway labels (naas-addendum.js:155-156).

---

## Appendix A: Reply to the stakeholder's question (F2), for Micah to send

> Yes. It's one design, not a page per combination. Each estate is a data record: sites, clouds, circuits, spend and findings. Every page computes its numbers, copy and charts from the record in view, so switching Estate at the foot of the left rail from Growing to Established changes every page at once. Connect, for example, goes from 5 of 7 regions on the public internet to 1 of 8. Persona is a lens on the same pages. Today it orders findings, and the per-role Insights page will be the first view whose content changes by role. It's still one page. A new estate is a new record, not new screens. The one exception is the Figma boards: they're captured from a single estate, so another estate there means another capture.

Send it after Task 0.2 lands if the demo will switch Estate live.

## Appendix B: Ask the stakeholder

1. Please send `NaaS_Insights_By_Role_Options.html`. The email names it, but it wasn't attached. It is the reference for Your actions and Monthly briefing.
2. "Finance → ERP" and "Retail → Checkout":
   - The Growing estate has finance → payments-api and internet-facing → checkout-svc (the Retail business unit) today.
   - ERP appears once the Oracle discovery beat runs.
   - Is that close enough, or should ERP be in the base estate?

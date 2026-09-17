# NaaS storefront: story, scheduled discovery, and a drill that works at both ends

Design, 2026-09-17. Supersedes nothing. Builds on `docs/HANDOFF.md`.

Four asks, in the order they were given:

1. Make the product more storified.
2. Make it obvious that discovery runs automatically on a schedule the customer controls.
3. Make the Discover drill look right for a two-site network and for a four-thousand-site one.
4. Open the right-hand drawer at any layer.

Ask 4 arrived last and turned out to be the spine. It subsumes most of ask 3's hard half, so it leads.

A fifth thread runs through all of them: conform the palette to AT&T Flywheel.

---

## 0. What is already true

Three findings reframed the work. Each was verified at source, not inferred.

**The story is written and never reaches the screen.** `connectVerdict`, `governVerdict`, `costVerdict`, `ob.verdict`, `floorVerdict`, `discoverVerdict`, `deptVerdict`, `nextStop`, `stations` and `showTrack` have **zero** bindings in `NaaS Storefront.dc.html`. Their only route to a screen is the Andi dock, which is closed by default. What renders in their place is `pageSub`, a dot-separated stat string with no verb.

**There is no schedule concept of any kind.** Zero occurrences of schedule, cadence, cron, nightly, hourly, recurring or frequency across every app source file. `Re-discover` is `set({ scanStep: s.scanStep })` on Discover, a no-op. `Updated just now` is minutes since page load, from `window.__naasLoaded`, which is not state. Account `Last scan` is `['4 min ago','18 min ago','1 h ago','3 h ago'][k % 4]`.

**The drawer is modelled as an overflow valve, not as a view.** It appears only where a level overflows, so it exists at exactly one level per column and is dead or absent everywhere else.

---

## 1. The drawer at any layer

### The rule

> The count in the column header is the door. The picture is the sample, the drawer is the list, and they are always on the same node.

An affordance that only appears when something is hidden is unlearnable. `+N more` shows at 19 metros and vanishes at 3 VPCs, so a user concludes the 3 VPCs are all there is, then generalises the habit wrongly. The header door is unconditional, so the rule survives contact with every level.

### The affordance

Each of the three column headers becomes a flex row: the existing trail button on the left, a new right-aligned door on the right. The headers are already `foreignObject`s at `y=0`, `height=18`:

| Column | Markup | Geometry |
|---|---|---|
| SITES | `NaaS Storefront.dc.html:336` | `x=24 w=460`; the site cards are only 200 wide, so ~236px of that header is empty today |
| BAND | `NaaS Storefront.dc.html:375` | `x={{bandLabelX}} w={{bandW}}` |
| CLOUDS | `NaaS Storefront.dc.html:337` | `x=980 w={{cloudsHeadW}}` |

No row moves. No canvas geometry changes. The door sits 47px (left) and 25px (right) inside the card edge, clear of the ten-pixel rule.

One copy formula: `All {total} {noun} ›`, with `· {hidden} hidden` appended and an accent fill only where the canvas is actually sampling.

```
SITES   L0   All 7 site groups ›
SITES   L1   All 19 metros · 13 hidden ›          accent
SITES   L2   All 588 remote sites · 582 hidden ›  accent
SITES   L3   All 6 paths ›
FABRIC  L0   All 4 facilities ›
FABRIC  L1   All 21 ports · 13 hidden ›           accent
FABRIC  L2   All 3 circuits ›
CLOUDS  L0   All 6 regions ›
CLOUDS  L1   All 3 VPCs ›
CLOUDS  L2   All 6 subnets ›
CLOUDS  L3   All 89 workloads · 83 hidden ›       accent
```

Counts measured on `?view=trust`. The L3 example is `vpc-0-0 › private-a`; the public subnets of the same VPC hold 60, so the door reads `All 60 workloads · 54 hidden ›` there. Every count comes from the measurement, never from this table.

The pixel offsets for the door inside the card edge are not yet measured. Measure them against the ten-pixel rule before committing to a placement.

**The number cannot lie.** It is the same value that fills the drawer. So the right column's root reads `All 6 regions ›`, not 14.

### The second door

Every `+N more` row becomes a button to the same destination, with the sub `open the list ›`. The row is what a user stumbles on; the header is what they can rely on.

This fixes three dead clicks:

| Dead click | Where | Cost today |
|---|---|---|
| `+13 more` metros | `naas-app.js:187` refuses below drill depth 2 | 2,518 of 4,120 sites unreachable |
| `+8 regions` | `naas-app.js:188`, the `if (r.rollup) return` branch | 8 of 14 regions headline-only |
| `+13 more` ports | `naas-app.js:227`, a non-interactive `<div>` at `html:401` | 13 of 21 ports unreachable |

Correction to an earlier claim in `HANDOFF.md`: the band's 8-row cap is `fabInfo.rows.slice(0, 8)` applied at **every** fabric level. On trust it truncates ports, never circuits.

The `+N other regions` row at `naas-connections.js:199` climbs *up* while looking like an overflow row. It gains a `‹` caret and reads `‹ Back to 6 regions`, so the two affordances stop colliding.

### The model

The drawer stops owning a path. One trail per column, read live, shared by picture and drawer. Then "always at the same place" is a definition rather than a sync problem, and `back` becomes `slice(0,-1)` instead of two hardcoded pops.

State stays as it is. `s.drill`, `s.cloudDrill`, `s.fabDrill` and `s.vol` keep their shapes. `s.vol` gains one kind:

```js
s.vol = { kind: 'level', col: 'sites' | 'fabric' | 'clouds' }
```

Plus one scalar, `s.volFlat`. Everything else (`volQ`, `volPath`, `volState`, `volPage`, `volSel`, `volPin`, `volSlide`) is reused unchanged.

This is deliberate. The five off-column openers (`naas-app.js:995` flow map, `:1123` panel children, `:1199-1201` Observe tiles) keep the two existing kinds and carry zero regression surface.

One new function in `naas-volume.js`, about 70 lines:

```js
export function levelList(est, inv, ob, col, trail, opts = {})
```

It **delegates** at the three levels that are genuinely volume and already work:

- `sites` at depth 2 → `volumeList(est, {cls: trail[0], metro: trail[1]}, opts)`
- `clouds` at depth ≥ 2 → `workloadList(est, inv, {region, vpcId, snId, flat}, opts)`

and is **generic** for the other nine, reading row producers that already exist: `siteDrillRows`, `fabricRows`, `regionDrillRows`, `est.sites`, `est.regionsList`.

Keying is off the `level` string every builder already returns, **not** off path depth. Depth is not level in this codebase: on `?view=partial`, `sites` depth 1 is `site` for Data centers and `metro` for Branch.

One new row field in the whole design: `into`, the child's stable key. A row with `into` renders as the door row that already ships at `html:1914-1920`; a row without it renders as the asset row at `:1921-1928`.

### Inside the drawer

A row with children is a door. Click descends, the column trail grows, and the picture behind drills to the same level. The scroll container remounts on the bumped `volSlide` and replays the existing `.22s drawerSlide`.

The header gains a crumb row, each hop a button:

```
┌──────────────────────────────────────────┐
│ Sites › Remote sites › Atlanta        ×  │
│ ‹ Back                                   │
│ Atlanta                                  │
│ 588 remote sites · 235 on the fabric ·   │
│ 353 public                               │
└──────────────────────────────────────────┘
```

`drawer.trail` is already computed in `naas-volume.js:102,133` and bound zero times. A working clickable-crumb renderer already ships 65 lines away at `html:1842` (`panel.trail`).

`canBack` becomes `path.length > 0`. Today it is `!!(vol && (vol.snId || vol.flat))`, which is why a metro drawer can never go back.

### Capability gates

At a level with two children the drawer shows two rows and nothing else. Three `sc-if` gates on search, chips and Select all, driven by a `caps` field, with the threshold at 12 rows.

This also fixes a live defect: the VPC level computes `q`, `app` and `state` at `naas-volume.js:64-66` and never applies them, so the search box and both chip rows render and do nothing.

### Stable keys

The metro level is one token from correct. `siteTree` already emits `key: '<cls>:<ri>:<metro>'` at `naas-sites.js:99`, and the resolver at `naas-connections.js:163` **already accepts it**. Only the row emitter at `:159` throws it away with `drillKey: ch.name`.

Verified against trust: `siteDrillRows(est, ['Branch','Branch:2:Chicago'])` returns the 434-site node; `['Branch','Chicago']` returns the 343-site one. Ten unaddressable metro nodes holding 2,204 sites come back.

`metroOf` at `naas-volume.js:26` must accept a key too, or the drawer opens on the wrong metro. The name branch stays, because the Observe panel mints `vol:<cls>|<metro>` by name.

Keys need only be unique among siblings. The path carries identity. That is what makes this cheap, and it covers the right column's repeated `vpc-prod-01` and `public-a` names for free.

Four display reads must route through the node rather than the key, or the UI prints `Branch:2:Chicago` on screen: `crumbLabel` (`naas-app.js:286`), `sitesHead` (`:422`), the drawer pin write-back (`:217`), and `levelMap`'s tile click (`:484`).

### The ruling that unblocks this

The left column's root rows are not the drill's nodes. The canvas renders `est.sites`; the drill walks `S.siteTree`. `naas-app.js:187` computes `key = S.classOf(st)`, so East, Central, West and Regional hubs all collapse into one class node. Clicking **Remote sites, East (1,640)** lands on 4,054 sites.

**Decision: the rollup rows become real, addressable nodes.** East/Central/West keep their identity, the picture keeps its 7 rows, and the header count matches what the user clicked.

Rejected: reconciling the canvas down to the 4 real classes. It makes the arithmetic agree but rewrites the opening picture on every estate, which is the screen already signed off.

### Known weaknesses, accepted

- The header door is 11px text, not a pill. It is quiet. Mitigated by the `+N more` rows pointing at the same place.
- The breadcrumb above the card is defective independently: it splices the site and cloud trails into one path, appends the non-clickable layer label as if it were the deepest node, and its cloud-side handlers are off by one. Fixed in wave 2, not assumed away.
- `naas-fabric.js:38`'s port filter is degenerate: all 21 N. Virginia ports return the same three circuits. The drawer will faithfully display wrong data at that leaf. A data bug to fix separately; the drawer neither causes nor hides it.
- No trail is persisted to the hash, so a reload loses a four-level drill and the drawer with it. Out of scope.

---

## 2. Story

Four moves. Three are wiring.

**Bind the verdict.** Swap `pageSub` for the written verdict on all four screens; demote the stat string to a second line. Copy already exists.

**Close the loop.** Observe is the only screen with no Next stop row. `nextStop` is computed at `naas-app.js:887`, spread into `obX`, drawn zero times. One `fx-alert` block.

Two contradictory loop orders coexist. The shipped rows run Connect → Observe → Govern → Cost. `naas-addendum.js:265` holds a five-stop model running discover → connect → govern → observe → cost. **The shipped four-word order wins**; the five-stop model is deleted.

**Let the scan tell its four beats.** `scanSteps` holds four steps each with source text. It runs 750ms × 4 behind a spinner and the source strings never show. Render the list, show what each step found, give it room.

**The change story.** `since` / `isNew` / `newStrip` exist, seeded per object, and render only on Explore 360. Discover, whose job is "what is connected and where it came from," shows no delta. This is wave 4 because it needs a real `lastRun`.

---

## 3. Scheduled discovery

Nothing to reconcile and nothing to un-build.

**Data model first.** Accounts are synthesized from `regionsList`; no account object exists. Add to each estate:

```js
accounts: [{ id, cloud, cred, scope, schedule, lastRun, nextRun }]
```

Its own state key. **Not** `s.obWindow`, which already serves as both a discovery window (`isNew(x) = x.since <= winDays`) and an observation window (`R.trends` "vs prior 30d"). A third meaning breaks it.

**Re-discover must actually run.** It is the button a customer presses to test the schedule.

Then three surfaces, which the evidence ranks as the minimum for "cannot miss it":

| Surface | What is already there |
|---|---|
| Page title row | Says `Updated just now` on every screen. Becomes `Scanned 4 min ago · next at 02:00 ▾` |
| Accounts card | Has a LAST SCAN column and a per-row Manage cell. Gains NEXT SCAN and a cadence control |
| Rail Accounts row | `row()` takes a free `sub:` argument. `Next scan 02:00`, zero markup |

**And set the cadence at the end of intake.** The app promises "refreshed daily" three times during onboarding and never mentions it again.

Run history is one array away: `naas-app.js:830` already has a discovery-run record shape in the activity log.

Two bugs to fix in the same pass: `credsN` is always undefined, so `Manage credentials` never shows a count; and `Manage credentials` navigates to the empty-estate front door instead of scrolling to Accounts.

---

## 4. Scale at both ends

### The small end

Add a fifth estate: `small`, labelled **Small business**. One cloud, two regions, two sites, roughly twenty workloads. Ramesh described this customer out loud and no fixture represents him.

The picture is a fixed 1392×560 canvas. `gap` is pinned at 66px for any n>1 and the Internet row is floored at `y=380`. At two sites the canvas is 88% empty. **Derive `H`, `bandH` and the internet floor from row count.**

Three small-estate defects, all cited:

- The fabric band opens to an empty 420×396 blue box whenever no region is attached. Needs an empty state inside the band, or the stratum must not be clickable when `facilities().length === 0`.
- `launchCards` makes Observe the "Start here · you are connected" card for any non-empty estate, including one with nothing attached. `attachedRegions === 0` should route like `isEmpty`.
- Explore 360 runs a fake 3-second scan on the empty estate. The guard the author intended is written one clause earlier in the same line.

### The big end

Mostly delivered by section 1. What remains:

- **`Not connected yet` reports 3 sites for 2,898.** It counts rollup rows, not sites. Each `Connect this` prefills a single compose for up to 1,640 sites with no quantity in the order.
- **Memoise `inventory(est)`.** The entire 2,681-workload tree rebuilds on every render, so each Discover click costs 60–160ms and drawer paging degrades from 62ms to 131ms by page 10.
- **Gate `invTree` on open state.** Explore 360's Expand all renders 47,659 DOM nodes over 7.2 seconds.
- **The drawer's sort comparator is not antisymmetric**, so the picture's six sites are not the drawer's first six. `+582 more in Atlanta` implies a continuity it does not deliver.

### Tests

`npm test` is green at 56/56 and covers no small estate. `heroLayout` is never called with the empty estate, with zero sites, or with one region; `fabricRows` never with a zero-facility estate. Those cases land with this work.

---

## 5. Flywheel conformance

Flywheel Forge is not publicly documented. The authoritative extraction on disk is `~/Developer/att-netbond-sdci/tailwind.config.js`, Figma-matched from `SDCI.fig`, with `.flywheel-token-migration-map.md` beside it.

The Figma MCP available here authenticates as a personal Pro team with no AT&T org libraries, and `SDCI.fig` returns "you don't have edit access". **This work conforms to Flywheel 3.** If the mandate is Flywheel 4, this section is a starting point and the library is a prerequisite.

The storefront is already 17 of 29 tokens exact. Twelve change:

```
DRIFT (8)
  --success          #1f7a3d -> #2d7e24    fw green-600
  --viz-3            #1f7a3d -> #2d7e24    fw green-600
  --border-primary   #c2cbd2 -> #bdc2c7    fw gray-400
  --text-disabled    #8a949c -> #878c94    fw gray-500
  --viz-6            #8a949c -> #878c94    fw gray-500
  --border-secondary #dfe5ea -> #dcdfe3    fw gray-300
  --sidebar-accent   #dcf3fa -> #e6f0fa    fw cobalt-100
  --bg-neutral       #eef2f5 -> #f3f4f6    fw gray-200

NOT IN FLYWHEEL (4) — need a ruling
  --warning  #b85f00   fw orange-600 #ea712f is markedly louder
  --viz-4    #b85f00   same
  --error    #c23131   fw red-600    #c70032 is markedly louder
  --viz-5    #7d3f98   Flywheel has no purple
```

The eight drifted tokens are mechanical. The four outliers are a design decision, not a migration, and are deferred to Micah. The dark theme needs the same diff run against Flywheel's dark ramp, which is not in the extraction.

Every change is a token value in one `[data-theme="light"]` block. No component touches.

---

## 6. Sequence

| Wave | Work | Ships |
|---|---|---|
| **1** | Bind verdicts · close the loop · scan beats · 8 Flywheel token fixes | Independently |
| **2** | Stable keys · rollups as real nodes · `levelList` · header doors · drawer crumbs · breadcrumb fix | Independently |
| **3** | Small estate · derived canvas height · empty-band state · launch-card routing · `heroLayout` tests | Independently |
| **4** | Schedule data model · Re-discover runs · three surfaces · intake cadence · run history | Independently |
| **5** | The change story on Discover | Needs wave 4 |

Wave 1 is hours and the copy exists. Wave 2 is the largest, about a day and a half, dominated by walking all five estates on Discover and Observe rather than by code. Waves 3 and 4 are roughly a day each.

Performance work (`inventory` memoisation, `invTree` gating) folds into wave 2, where the drawer makes it felt.

---

## 7. Out of scope

- Persisting drill trails to the hash.
- Generating the 8 missing regions behind `regionsExtra`. Wave 2 makes the gap visible by reading `All 6 regions ›`; closing it is a separate data decision.
- `naas-fabric.js:38`'s degenerate port filter.
- Flywheel 4, and the dark-theme token diff.
- The `--warning` / `--error` / `--viz-5` ruling.

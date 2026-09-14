# Shell adoption and insights: our screens in their frame

**Date:** 2026-09-08
**Author:** Micah Boswell, with Helen
**Status:** Design, approved in conversation section by section; awaiting written review
**Source of the shell:** Figma file `GMSruRYGS5uyQLRBk2ADMB`, page "AI Fabric UI" (node 113:51)
**Source of the screens:** the NaaS guided storefront (repo `naas-design-scope`, export of 2026-09-08) and this app

---

## 1. What this is

AT&T's designers drew an admin console for AI Fabric on a second page of our Figma file. Micah wants our NaaS work to sit inside that console so it can move to their file and their codebase without a re-draw. This document specifies the shell we adopt, the page template every layer page follows, the insights model that feeds every "Act on it" row, and three phases to get there.

The property that made our first 24 boards good is kept: every board is a transcription of the running app. So the shell is adopted in the React app first and frozen to Figma second. The storefront prototype is the source of truth for content; the React app is the source of truth for the shell and the freeze.

Decisions taken in conversation on 2026-09-08:

- Port target is the React app (`ai-grade-network`, local folder `cloud-connect`), with the storefront's content brought across (option 3).
- Approach is phased: shell first, insights and unified Home second, storefront round 2 third.
- The NaaS rail gains a **Connect** group. Their grammar has no objection; the layer-first rule requires it.
- The wordmark click lands on a unified Home that spans both products.

## 2. What their file contains

Page "AI Fabric UI" holds, in this order:

| Frame | Node | What it is |
|---|---|---|
| COMPONENETS | 114:1425 | KPI card, Card with menu, donut, bar list, table with bars, stacked bar, area chart, search, three filter bars (Both / LLMs / AI apps) and their option lists |
| overview | 114:1998 | The shell: top bar, grouped rail, KPI row of five, 3×3 card grid, AI traffic module |
| AI traffic Flow / Trend | 114:2238, 114:2370 | Sankey Identity → Source → Fabric route → AI service; stacked area for the same filter set |
| Security & Governance | 114:2606 | Insight page template: KPI row, Act on it, three named sections |
| Cost | 114:2698 | Same template; two cards broken in the frame |
| Performance & Reliability | 114:3327 | Same template; two KPI values copy-pasted from Cost |
| trends | 114:3680 | Older iteration ("AI Gateway", flatter rail); shows the IA's origin |
| Data VIZ | 114:2488 | Chart token map: chart-1..5, functional colors, by-role pair, eight light fills |
| insights | 114:3835 | Empty (renders 1×1) |

It is a designer's page, not a transcription. Data is placeholder ("Team 1", "Region 1", "xxms"). Two sticky notes remain open: "Add tokens empty state for apps and for models" and "on hover show list of model & path and %."

## 3. Navigation model

### 3.1 Top bar

Left to right: AT&T AI-grade network wordmark; two product pills, **AI Fabric** and **NaaS** (their file spells it "Naas"; ours keeps "NaaS"); at right an **Ask Andi** pill, a bell whose badge is the open-tasks count and turns red when a promise is violated, and the avatar.

Discover leaves the top bar. Search, tenant selector, guided tour, theme toggle, and undo move into the avatar menu. The Create menu is retired; creation happens from Connect · Compose and from the CTAs on findings.

The wordmark click lands on the unified Home (section 5) from Phase 2; in Phase 1 it lands on NaaS Home. Each pill lands on its layer's Home. The app uses hash routing, so page-internal targets are query parameters, never a second fragment.

### 3.2 Rails

Rails are 240px, always expanded, text labels with AT&T icons, in labeled groups. There is no collapse control.

**NaaS**

| Group | Item | Route |
|---|---|---|
| (home) | NaaS | `/naas/home` |
| Connect | Fabric | `/naas/connect` |
| Connect | Compose | `/naas/connect?compose=1` (opens the wizard) |
| Observe | Traffic | `/naas/observe` |
| Observe | Cost | `/naas/cost` |
| Deep dive | Explore 360 | `/discover` |
| Deep dive | Logs | `/naas/observe?panel=records` until a page exists |
| Govern | Policies | `/naas/govern?tab=policies` |
| Govern | Groups | `/naas/govern?tab=groups` |
| Govern | Posture | `/naas/govern?tab=posture` |

**AI Fabric**, theirs verbatim:

| Group | Item | Route |
|---|---|---|
| (home) | AI Fabric | `/ai/home` |
| Observe | Security & Governance | `/ai/observe?tab=security` |
| Observe | Cost | `/ai/observe?tab=savings` |
| Observe | Performance & Reliability | `/ai/observe?tab=performance` |
| Deep dive | Explore 360 | `/discover?lens=ai` |
| Deep dive | Logs | `/ai/observe?panel=records` until a page exists |
| Govern | Policies | `/ai/govern` |
| Govern | Budget & Limits | `/ai/teams` (relabeled) |
| Govern | Providers | `/ai/providers` |
| Govern | Virtual Keys | `/ai/keys` |

Consequences:

- Cost is an Observe item on both rails. Its page and its savings framing are unchanged.
- Explore 360 is Discover with the layer's lens applied. The first-run advisor is reached from Ask Andi and from Home, never from the rail.
- No rail item points at a page that does not exist. NaaS Performance & Reliability and standalone Logs pages arrive in Phase 2 and join the rail then.

### 3.3 What leaves

The lifecycle stepper (`FlowBar`, `FlowStepper`), the `StageIntent` kicker, the `PageSection` wrapper, and the rail collapse state. The rail groups carry the lifecycle meaning now.

## 4. Page template

Every layer page renders inside `PageFrame`, top to bottom:

1. **Header row.** Title left. Right: "Updated 5m ago" with a refresh glyph, a hairline, the date range control. The range is per-layer state in the URL (`?range=7d`), read by every KPI, chart, and finding on the page. Observe's window chips fold into it.
2. **KPI row.** Three to five KPI cards: label, delta pill at top right, big figure, one sub-line of evidence. The delta pill is green when the direction is good and red when it is bad, never by sign. This is `StatTile` restyled.
3. **Act on it.** One strip: bulb glyph, the label "Act on it," one sentence, one CTA at the right. This is the page's top finding (section 6). On the unified Home it is the ranked list; everywhere else it is one row.
4. **Body.** Named sections, each a bold heading over a two- or three-column grid of cards. A card is a title, a "…" menu, content. The fabric picture is the first body block on NaaS Home, Connect, Observe, and Cost, full width, above any grid.

Charts render through the kit, never through a library: `ShareRing` for donuts, `CategoryBars` for bar lists, `TrendBand` for area charts, the existing Sankey for their Flow. Nothing new is drawn where a primitive exists.

Andi opens from the Ask Andi pill. It docks at 1440 and wider and floats as a drawer below that.

### 4.1 Phase 1 mapping

| Page | KPI row | Act on it | First body block |
|---|---|---|---|
| NaaS Home | private %, attached regions, policies enforced, observed %, saved/mo | Andi's first line | fabric picture, then rollups |
| Connect | regions on fabric, public, p95, attach rate | the worst region | fabric picture with lenses |
| Observe | throughput, p95, loss, egress, on fabric, savings | the anomaly | fabric picture, then Sankey |
| Cost | spend, avg per path, saved | the arbitrage | fabric picture in $ mode |
| Govern | enforced, authored, violations | the violation | policies table |
| AI pages | their KPI rows as drawn | their sentence as drawn | their first section |

### 4.2 Tokens

Their chart names become aliases over ours in `src/styles/tokens.css`; the dark skin is generated and picks them up. No component references their names directly.

| Their token | Ours |
|---|---|
| `--chart-1` … `--chart-5` | series in their order: att-blue, cobalt-700, mint, light-blue, functional-blue |
| `--chart-func-success / warn / error` | `--chart-success / warn / danger` |
| `--chart-blocked`, `--chart-detected` | att-blue, cobalt-700 |
| `--chart-light-fill-1 … 5, -success, -error, -warn` | new light fills, one per series and tone |

The audit allowlist gains mint and light-blue if they are not already sanctioned.

## 5. Unified Home

The wordmark lands here. It is a verdict page, not a widget wall.

1. Header row with the global range.
2. KPI row of five across both products: workloads private, AI traffic governed, saved per month, p95 on the fabric, open findings.
3. The fabric picture, four strata, AI Fabric on top of Network services, sites left, clouds right. This is the spine; nothing in their file or in NetBond has it.
4. **Act on it**, plural: the ranked finding queue across both layers, each row one tone, one sentence, one CTA.
5. Andi's first line is the top finding.

NetBond Advanced's Insights (the "control-center" tab: toned findings about shared peer groups and VNFs, plus group performance) lend the form, not the content. On Home a NetBond insight is rolled up ("3 connections share a VNF at risk"); the per-connection line stays in NetBond's drawer.

## 6. Insights model

A **finding** is: one tone (risk, warn, good, info), one sentence with the figure in it, one CTA that lands on the screen that fixes it, and one requirement key. Findings come from one derivation, `src/features/work/findings.ts`, over the engine and the work queue. Andi, the tasks badge, every Act-on-it row, and the unified Home are lenses over that list. There is no second list.

Tone rules: **risk** means a policy or SLO is violated now; **warn** means exposure with no violation yet; **good** means a saving or coverage gained in the window; **info** is a count with no action. Risk and warn get a CTA button; good and info get a link.

### 6.1 Requirements, keyed

Source: AI Overlay board export `ai_overlay_2026-09-08_10.25am.csv`, 19 features, all prefixed "Networking."

| Key | Requirement | Lands | KPI or section | Finding |
|---|---|---|---|---|
| AO-348 | Discover AT&T last-mile sites | Explore 360 | sites column, first-mile sub-line | info: sites on first mile only |
| AO-349 | Discover AT&T Cloud Fabric | Explore 360, fabric picture | fabric band, on-ramps as stations | good: fabric present in N of M regions |
| AO-350 | Discover AT&T-managed VPCs | Explore 360 tree | "managed by AT&T" chip on VPC rows | info: count |
| AO-351 | Discover customer-managed VPCs | Explore 360 tree | "customer" chip | warn: customer VPCs unreachable privately |
| AO-353 | Label cloud assets; auto-label provider, region, type, connection | Explore 360, By tag | auto-label chips | warn: assets untagged |
| AO-354 | Label customer sites; auto-label state, city, connection type | Explore 360, Sites | auto-label chips | warn: sites unlabeled |
| AO-362 | Identify new sites and resources for labeling and governance | unified Home, Observe | KPI "new since last window" | risk: new resources, none governed |
| AO-352 | Visualize top traffic streams | Observe · Traffic | Sankey, top talkers | warn: top stream on public path |
| AO-363 | Connection KPIs: throughput, utilization, latency, loss | Observe · Traffic | KPI row, per-connection sparklines | risk: p95 over SLO |
| AO-355 | Customer-sites overalls | Observe · Traffic | Sites rollup card | info |
| AO-356 | Customer-cloud overalls | Observe · Traffic | Clouds rollup card | info |
| AO-359 | Customer-sites costs | Observe · Cost | By site section | warn: highest-cost site |
| AO-360 | AT&T-cloud costs | Observe · Cost | Fabric charges section | info |
| AO-361 | Customer-cloud cost estimator | Observe · Cost | forecast slider, egress by destination | good: avoidable $/mo |
| AO-364 | Optimization suggestions | unified Home, every Act on it | the finding queue | all tones |
| AO-357 | Traffic-stream rules | Govern · Policies | Author: When / Reaches / Require | risk: violations |
| AO-358 | Service-insertion options | Govern · Policies, Compose control step | "Require inline inspection" | warn: paths uninspected |
| AO-365 | Policy optimization and enforcement | Govern · Policies, Posture | enforced vs authored, Simulate | warn: authored, not enforced |
| AO-366 | Customer-cloud connections with NetBond Advanced | Connect · Compose, elevator to Cloud | Compose prefilled, Go live | the CTA on most risk findings |

Sixteen of nineteen have a screen and a figure today or in the storefront. Three are new content: site auto-labels (AO-354), the "new since last window" derivation (AO-362), and AT&T-cloud charges as a section (AO-360). They ship in Phase 2.

## 7. Phases

### Phase 1: the shell

- New `TopBar`, `GroupedRail`, `PageFrame` in `src/components/navigation/` and `src/components/common/layouts/`. They replace `MainNav`, `LeftRail`, `PageSection`, `FlowBar`, `StageIntent`.
- `navItems.ts` gains the groups in section 3.2; `railSectionsFor` serves both layers.
- Token aliases from section 4.2; run `scripts/figma-handoff/generate-dark-css.mjs`.
- Every NaaS and AI page re-wrapped. Bodies untouched except that stat tiles and the verdict line move into the frame.
- **Exit:** all 22 boards re-captured at 1440, light and dark; `audit.cjs` CLEAN on each; frozen artboards imported to their Figma page under a section named "NaaS in shell."

### Phase 2: insights and the unified Home

- `findings.ts` replaces the scattered verdict functions; Andi, the tasks badge, and Act on it read from it.
- The three AI insight pages rebuilt on their frames, real figures from the engine.
- Unified Home behind the wordmark, per section 5.
- New content: AO-354, AO-360, AO-362.
- **Exit:** three AI boards and the unified Home frozen, light and dark, audited CLEAN.

### Phase 3: the storefront's round 2

- Elevator lockup as the product switcher's menu, with Cloud (NetBond Advanced) and Transport rows per the 2026-09-04 elevator spec.
- Compose flow, Marketplace, and the storefront's Discover tree spec brought into the React app where the React version is older.
- The storefront repo becomes an archive; its README points here.
- **Exit:** boards for Compose, Review, Marketplace frozen and audited.

## 8. Testing

Existing and kept: the rebrand test, the VizKit dependency guard, the routing test.

New, every phase:

- **Nav test.** Every rail item in `navItems.ts` resolves to a mounted route.
- **Frame test.** Every layer page renders a KPI row and exactly one Act-on-it row.
- **Findings test.** Each of the 19 keys produces a finding with a tone and a landing route.
- **Audit gate.** `audit.cjs` on every board; the sweep fails on any off-token color or size.
- **Demo walk.** The storefront README's five-minute demo, walked in the browser at 1440 and at 1280, before any phase is called done.

## 9. Out of scope

No changes to the NetBond Advanced repo. No chart library. No renaming of engine or code identifiers. No hand edits to the dark skin. No new rail item without a page behind it.

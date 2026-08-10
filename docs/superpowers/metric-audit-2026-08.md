# Metric audit — top-level figures, August 2026

Phase 0, Task 1. Audit only: this document changes no product code.

## Why

The exec critique: too many low-value data points at the top level of every screen. A
raw inventory count is exactly what fails at the top level unless the persona genuinely
leads with it. Santosh's bar is the two-second test — "for a customer to get it in two
seconds." If a label needs the builder to explain it, it fails.

## Scope

Every number that renders **at the top level** of a screen: verdict lines, KPI strips,
widget faces, hero bands, summary tiles, band figures, and counts carried in CTA labels
or tab badges. Table cells, drawer contents, and figures already folded behind a
`<details>` disclosure are out of scope except where noted (the folded Discover
breakdown is audited because Task 2-4 may move figures into or out of it).

Verdict lines count as top-level metrics. A verdict line is audited as one row — the
sentence is the rendered unit — with its individual numbers named in the derivation
cell.

## Personas (from the NaaS value map)

| Screen | Route | Persona |
|---|---|---|
| Layer home (NaaS) | `/naas/home` | Exec |
| Layer home (AI Fabric) | `/ai/home` | Exec (board), platform/ML (content) |
| Discover | `/discover` | Cloud & Platform Architect |
| Connect | `/naas/connect` | NetOps |
| Observe | `/naas/observe` | FinOps + SRE |
| Govern | `/naas/govern` | Security & Compliance |
| Cost | `/naas/cost` | FinOps |
| AI Fabric · Observe (Insights) | `/ai/observe` | Platform / ML team |
| AI Fabric · Govern | `/ai/govern` | Platform / ML team |

The app has no route at `/` that renders a dashboard: `/` redirects to `/discover`
(`src/App.tsx:494`). The exec dashboard is the layer home board
(`LayerHomePage` → `LayerDashboard`), so both layer homes were walked in its place.

## The four tests

- **T1 savings-first** — does the figure lead with what the customer keeps, saves, or
  is exposed to, rather than with inventory?
- **T2 connected** — does it connect to a next move, another screen, or the sentence
  above it? An orphan number fails.
- **T3 right measure / right label** — does the number measure what the label says, in
  the product's own vocabulary ("Save, not cost": labels lead with savings framing;
  "Cost" only where the figure is literally spend)?
- **T4 two-second** — can a customer get it in two seconds with no explanation?

## Verdicts

`keep` (all four pass) · `relabel` (fails only T3 wording; new copy in the note) ·
`demote` (true but second-order; names the disclosure or screen it moves into) · `cut`
(fails T1+T4 with no story) · `phase-2c` (needs structure or a derivation that does not
exist).

### How to read a verdict

Every verdict cell holds exactly one verdict. The T-columns predict a default:

| T-pattern | Default verdict |
|---|---|
| all four PASS | `keep` |
| T3 fails alone | `relabel` |
| T1 **and** T4 both fail | `cut` |

**Any row whose verdict differs from that default carries a `Divergence:` clause in its
Action note giving the reason, in one clause.** `demote` and `phase-2c` are never
predicted by the T-columns, so every row carrying them has a `Divergence:` clause too.
The table is therefore reproducible on its own: nothing below the table is needed to
justify a verdict.

Two rules recur often enough to name once and cite by name in the notes:

- **Persona-overrides-T1** — on Discover, the Cloud & Platform Architect genuinely
  opens with "what do I have", so an inventory count that fails T1 can still be `keep`
  *on that screen only*. It is `cut` or `demote` everywhere else.
- **Duplication-only-T4** — when a figure passes T1-T3 and fails T4 solely because it
  is the second or third rendering of one claim on one screen, copy cannot fix it;
  deletion of the weaker rendering is the only fix. See rows 33, 40, 55 (`cut`) and the
  deliberate exception at row 52.

---

## The inventory

| # | Screen | Component:line | Label as shown | Value derivation | Persona | T1 savings-first | T2 connected | T3 right measure/label | T4 two-second | Verdict | Action note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Layer home (NaaS) | `MoneyOnTheTableWidget.tsx:36` | `$19,900/mo` under "still on the table if every on-ramp attached" | `arbitrage().availableSavings` | Exec | PASS — the money question, stated as money | PASS — the Review button stages the moves | PASS — savings framing, literal $ | PASS | `keep` | The board's anchor figure. Everything else on this board is judged against it. |
| 2 | Layer home (NaaS) | `MoneyOnTheTableWidget.tsx:29` | `Review 10 moves` | `advisorDraft(c).moves.length` | Exec | PASS — a count of savings actions, not inventory | PASS — navigates to `/discover?draft=andi` | FAIL — the same 10 moves are priced at `$52,961/mo` by the Discover advisor chip (row 26), not `$19,900/mo` | FAIL — two totals for one move set | `phase-2c` | **Divergence:** T3+T4 fail, which would normally read as `relabel` or `cut`; neither applies because the number disagrees with another *number*, not with its label. Needs one reconciled savings derivation: `arbitrage().availableSavings` (attach buckets) and `advisorDraft().deltas.egressSavingMo` (attach buckets + steer recommendations) both claim "$/mo saved" for the identical move list. Until one wins, no copy fixes this. |
| 3 | Layer home (NaaS) | `MoneyOnTheTableWidget.tsx:42,44` | `GPU inference egress · $8,000/mo` (×3 buckets) | `arbitrage().buckets` unattached, top 3 | Exec | PASS | PASS — the same rows Cost's breakdown ranks | PASS | PASS | `keep` | Ranked savings with named sources is the strongest pattern on the board. |
| 4 | Layer home (NaaS) | `EstateFiguresWidget.tsx:24` | `1/9` "Regions on the fabric" | `naasStratum().regionsAttached / regionsTotal` | Exec | FAIL — inventory | PASS — Connect owns it | PASS | PASS | `demote` | **Divergence:** T1 fails alone, which the default tolerates as `keep`; demoted because the exec board is the screen least interested in inventory and the figure is already stated in prose one click away. **Target: Connect's verdict line (row 37)**, which states it as a sentence. |
| 5 | Layer home (NaaS) | `EstateFiguresWidget.tsx:25` | `5` "Sites" | `fabricModel().sites.length` | Exec | FAIL — raw count | FAIL — links nowhere | FAIL — the estate has **6** premises (`branches.length`, rows 20, 34); this 5 counts the fabric model's 4 real sites **plus** the "Internet" pseudo-node rendered as a site in `FabricHero` | FAIL — "5 Sites" here and "6 SITES" on Discover, one click apart | `cut` | Matches the T1+T4 default. The number is also wrong and the figure serves no exec question. Sites survive on Discover's summary band (row 20), where the count is right. |
| 6 | Layer home (NaaS) | `EstateFiguresWidget.tsx:26` | `$29,900/mo` "Egress on public transit" | `egress().pub` | Exec | PASS — states exposure in money | PASS — Cost's invoice line names the same figure | PASS — literally spend, so "Egress" is honest, though see row 50 | PASS | `keep` | |
| 7 | Layer home (NaaS) | `EstateFiguresWidget.tsx:27` | `$19,900/mo` "Still on the table" | `arbitrage().availableSavings` | Exec | PASS | PASS | FAIL — identical to row 1 on the same board, under a second label | FAIL — a viewer reads two savings figures | `cut` | **Divergence:** T1 passes, so the default does not reach `cut`; both failures are caused by being a duplicate of the board's own hero, and Duplication-only-T4 means deletion is the only fix. Remove from Estate at a glance; row 1 already leads with it. |
| 8 | Layer home (both) | `AssessmentFindingsWidget.tsx:10` | `$19,900/mo` "Recoverable" | `assessmentReport().recoverableMo` = `arbitrage().availableSavings + aiSavingMo` | Exec | PASS | FAIL — no route out of the widget | FAIL — a **third** label for the same number as rows 1 and 7 | FAIL | `cut` | **Divergence:** T1 passes, so the default does not reach `cut`; same Duplication-only-T4 reasoning as row 7, compounded by an orphan T2. Three tiles, one number, three nouns — keep "Money on the table", drop "Recoverable". |
| 9 | Layer home (both) | `AssessmentFindingsWidget.tsx:11` | `7` "Security events" | `assessmentReport().securityEvents` = denials + violations | Exec | PASS — exposure counts as savings-adjacent risk | FAIL — no link to Govern, where the same 7 violations are listed | PASS | PASS | `phase-2c` | **Divergence:** T3 passes, so this is *not* a `relabel` — copy alone cannot close the only failure. The widget has no outbound routing on any tile, so fixing T2 means giving `AssessmentFindingsWidget` a link affordance it does not have. Ready copy once routed: **"7 open security findings"**, linking to `/naas/govern`. Task 2 should not take this as a wording change. |
| 10 | Layer home (both) | `AssessmentFindingsWidget.tsx:12` | `87%` "Invisible share" | `assessmentReport().invisibleSharePct` (live) | Exec | PASS — states the blind spot | FAIL — orphan | FAIL — "Invisible share" of what is not stated | FAIL — needs the builder to explain it | `relabel` | **Divergence:** T2 and T4 fail alongside T3, but both are downstream of the wording — T4 because the phrase is unreadable, T2 because the widget-level routing gap is row 9's item and is tracked there, not here. Copy alone closes T3 and T4. Copy: **"87% of traffic you cannot see"**. Same figure, no new derivation. |
| 11 | Layer home (AI) | `TokenBudgetsWidget.tsx:51` | `0 of 2.40B` / `1.65M of 1.60B` | `tokenMeterList()` today vs `tokenPolicyList()` budget | Exec | FAIL — a ceiling, not a saving | PASS — Enforce stages a policy move | PASS — the meter is the honest reading | FAIL — 2.40B tokens is not a two-second quantity | `relabel` | **Divergence:** T3 passes, so the default does not predict `relabel`; the fix is still pure copy — reorder which of the two figures already rendered leads. Copy: **"0% of a 2.4B/day budget"**. Nothing new is derived. |
| 12 | Layer home (AI) | `TokenBudgetsWidget.tsx:52` | `· 0%` | `tokenMeterList().pct` | Exec | FAIL | PASS | PASS | PASS | `keep` | **Divergence:** T1 fails alone, which the default tolerates; kept rather than demoted because row 11's relabel promotes this figure to the row's lead. |
| 13 | Layer home (AI) | `TokenBudgetsWidget.tsx:51` | `1.20B budget` (no meter) | `tokenPolicyList()` budget, no matching meter | Exec | FAIL | PASS | FAIL — a ceiling with no reading, in a list where every sibling row states both | FAIL — the row shape changes mid-list | `phase-2c` | **Divergence:** T1+T4 fail, which predicts `cut`; the figure is not the problem — the missing one is. Needs an explicit "no traffic metered yet" state so the row reads as absent data rather than as a different kind of figure. |
| 14 | Layer home (AI) | `EstateFiguresWidget.tsx:15` | `0/3` "Model endpoints ready" | `modelCatalog()` `ready` count | Exec | FAIL — inventory | FAIL — no route to Providers | FAIL — zero endpoints "ready" while rows 15-17 meter live tokens, spend, and 6 answered requests through those endpoints | FAIL | `cut` | Matches the T1+T4 default. The figure contradicts every other number on the board and nothing on either layer home depends on it. |
| 15 | Layer home (AI) | `EstateFiguresWidget.tsx:16` | `1.65M` "Tokens today" | `aiSpendTotals().tokensToday` | Exec | FAIL — volume, not money | PASS — the same figure Insights leads with | PASS | PASS | `demote` | **Divergence:** T1 fails alone, which the default tolerates as `keep`; demoted because it is second-order behind spend (row 17) and exposure (row 16) on an exec board. **Target: the AI Insights KPI strip (row 77)**, which already states it with the governed/public split this tile lacks. |
| 16 | Layer home (AI) | `EstateFiguresWidget.tsx:17` | `1.65M` "On the public internet" | `aiSpendTotals().ungovernedTokensToday` | Exec | PASS — the exposure story | PASS | FAIL — identical value to row 15, adjacent, under a different label; the real claim ("all of them") is never made | FAIL — reads as double counting | `relabel` | **Divergence:** T4 fails alongside T3, but the T4 failure is caused by the wording splitting one claim across two tiles — one sentence closes both. Copy: **"All 1.65M tokens today rode the public internet"** as one warned line replacing the two-tile pair. |
| 17 | Layer home (AI) | `EstateFiguresWidget.tsx:18` | `$8.25` "Spend today" | `aiSpendTotals().spendToday` | Exec | PASS — literally spend, so the noun is allowed | PASS | PASS | PASS | `keep` | |
| 18 | Discover | `DiscoverPage.tsx:23` → `verdict.ts:10-12` | "Your estate spans 9 regions across 6 clouds. 1 is on the AT&T fabric; 8 still ride the public internet." | `fabricModel()` regions / cloudIds / `path === 'private'` | Architect | FAIL — opens on inventory ("spans 9 regions"), buries the gap in the last clause | PASS | PASS — every number is right | PASS | `relabel` | **Divergence:** T3 passes and T1 fails alone, which the default reads as `keep`; relabelled because reordering the same three numbers is a pure copy change that turns an inventory opener into a gap opener — the cheapest T1 fix in the audit. Copy: **"8 of your 9 cloud regions still ride the public internet. 1 is on the AT&T fabric, across 6 clouds."** |
| 19 | Discover | `UnifiedDiscovery.tsx:470` | `Attach 142 public workloads` (FlowBar CTA) | `clouds.filter(!attached).reduce(workloads)` | Architect | PASS — a move, priced in exposure | PASS — `/naas/connect?from=discover` | PASS | FAIL — 142 also happens to be AWS's own workload count on the row below (row 31), so the CTA reads as "attach AWS" | `relabel` | **Divergence:** T4 fails alone with T3 passing, so this is not the Duplication-only-T4 pattern of rows 33/40 — the T4 failure here is ambiguity against a coincidentally equal number, which a predicate fixes. Copy: **"Attach the 142 workloads still on the public internet"**. |
| 20 | Discover | `UnifiedDiscovery.tsx:384` | `6` "SITES" | `estateDomains()` `network.sites` = `branches.length` | Architect | FAIL — inventory | PASS — the sites panel below | PASS — 6 is the right premises count | PASS | `keep` | **Divergence:** T1 fails; **Persona-overrides-T1** applies — Discover is the inventory screen and the Architect opens with it. This is the one place a site count belongs; see row 5 for the count that disagrees with it. |
| 21 | Discover | `UnifiedDiscovery.tsx:385` | `1 / 4` "ACTIVE ON-RAMPS" | `activeOnramps()` / `onramps.length` | Architect | FAIL — inventory | FAIL — nothing on this screen acts on it | PASS — the honest active/on-order split | FAIL — "on-ramp" needs explaining, and the denominator is "circuits on order", which the tile never says | `demote` | **Divergence:** T1+T4 fail, which predicts `cut`; demoted instead because the figure is true and its T4 failure is fixed by context that already exists. **Target: the `estate-breakdown` disclosure**, where the Network domain carries this stat with the blurb that explains the denominator. |
| 22 | Discover | `UnifiedDiscovery.tsx:386` | `6 · 9` "CLOUDS · REGIONS" | `counts().clouds`, `counts().regions` | Architect | FAIL — inventory | PASS — the tree below is exactly this | PASS | PASS | `keep` | **Divergence:** T1 fails; **Persona-overrides-T1** applies. Two numbers on one tile is the right compression for the Architect's orientation figure. |
| 23 | Discover | `UnifiedDiscovery.tsx:387` | `284` "WORKLOADS" | `counts().workloads` | Architect | FAIL — inventory | PASS — row 19's CTA splits it | PASS | PASS | `keep` | **Divergence:** T1 fails; **Persona-overrides-T1** applies. Also the denominator row 19 is a fraction of. |
| 24 | Discover | `UnifiedDiscovery.tsx:388` | `2` "ATTACHED" | `counts().attached` | Architect | FAIL — inventory | FAIL — orphan as labelled: nothing on screen says what it counts | FAIL — attached *what*? The value counts VPCs, while the tile sits beside a regions tile and a workloads tile | FAIL | `relabel` | **Divergence:** all four fail, which predicts `cut`; `relabel` holds because naming the unit is a pure copy change that closes T3, T4 **and** T2 at once — once the tile says VPCs it points at the Private/Public badges on every VPC in the tree below — and **Persona-overrides-T1** covers the rest. Copy: **"2 — ATTACHED VPCS"**. A `2 / 15` denominator would read better still, but `attachedStat` carries no `of` value today, so that is a data-wiring change and deliberately **not** part of this relabel. |
| 25 | Discover | `UnifiedDiscovery.tsx:389` | `3` "EXPOSED ENDPOINTS" | `aiExposed()` | Architect | PASS — the one posture finding in the band | PASS — the AI domain CTA routes to `/ai/providers` | PASS | PASS | `keep` | The only savings-first tile in a band of six. |
| 26 | Discover | `StackPanel.tsx:374` | `Advisor: 10 moves · $52,961/mo · Review` | `advisorDraft(cc).deltas.egressSavingMo` | Architect | PASS | PASS — stages the tray | FAIL — the same 10 moves are `$19,900/mo` on the exec board (rows 1-2) and `$19.9k/mo` on Cost (row 69) | FAIL | `phase-2c` | **Divergence:** identical to row 2 and for the same reason — the number disagrees with another number, not with its label, so neither `relabel` nor `cut` reaches it. `advisorDraft` sums attach-bucket savings **and** steer savings; `arbitrage().availableSavings` sums only the buckets. One derivation must win before either chip can carry an honest figure. |
| 27 | Discover | `StackPanel.tsx:409-414` | `0/3` model endpoints ready · `0` tokens today · `$0.00` spend today · 3 identities | `aiStratum()` | Architect | FAIL — inventory, on a NaaS-shaped screen | PASS — the AI band's four verb links | PASS | FAIL — three zeros stacked in the rail read as a broken panel | `demote` | **Divergence:** T1+T4 fail, which predicts `cut`; demoted rather than cut because the figures are true and belong to a screen that renders them well. **Target: the AI layer home's Estate at a glance (rows 14-17)**, which states all four. Keep the band itself — the stack diagram needs the stratum; drop its numbers. |
| 28 | Discover | `StackPanel.tsx:438` | "6 clouds · 9 regions · 15 VPCs in the estate today." | `cloudStratum()` = `counts()` | Architect | FAIL | PASS | PASS | FAIL — restates rows 22 and 24 on the same page in a different format | `cut` | Matches the T1+T4 default. The Cloud band's job is "its own layer, next", not a third count of what the summary band above already states. |
| 29a | Discover | `StackPanel.tsx:454-455` | `1/9` "regions on the fabric" · `5` "sites" | `naasStratum().regionsAttached/regionsTotal`, `.sites` | Architect | FAIL — inventory | PASS | FAIL — `5 sites` contradicts the `6 SITES` tile on the same page (rows 5, 20) | FAIL — two renderings of the region split and two disagreeing site counts on one page | `cut` | Matches the T1+T4 default. Both counts are stated better elsewhere on the same page and one of them is wrong (row 5 explains why). |
| 29b | Discover | `StackPanel.tsx:456-457` | `$29,900/mo` "egress on public transit" · `$19,900/mo` "still on the table" | `naasStratum().egressPubMo`, `.availableSavingsMo` | Architect | PASS — exposure and savings, both in money | PASS — the four NaaS verb links sit beside them | PASS | PASS | `keep` | The band's whole argument. Splitting this row from 29a is deliberate: the NaaS band's counts and its money figures earn opposite verdicts and Task 2-4 must not treat the band as one unit. |
| 30 | Discover | `StackPanel.tsx:533-541` | "N moves staged · <region> 92→3 ms on the fabric · keeps $X/mo of egress · clears N violations" | `stagedDeltas()` | Architect | PASS — the delta is stated in savings and violations | PASS — Commit is right beside it | PASS — unpriced moves are named, never summed | PASS | `keep` | The best sentence in the product. Everything else should read like this. |
| 31 | Discover | `UnifiedDiscovery.tsx:556` + `:560-564` | "3 regions · 6 VPC/VNet · 142 workloads" **and** the same three as stat tiles on the same row | `cloudRegionCount` / `cloudVpcCount` / `c.workloads` | Architect | FAIL | PASS | PASS | FAIL — the identical three numbers render twice in one row, once as prose and once as tiles | `cut` | Matches the T1+T4 default. **Scope: the `StatTiles` only** (`:560-564`) — keep the prose subtitle at `:556`, which is the readable half. |
| 32 | Discover | `UnifiedDiscovery.tsx:599-611` | Region row tiles: `VPC/VNet` · `Subnets` · `54ms` "Latency · public" | `vpcsOf`, `r.subnets`, `regionLatencyMap` / `regionLatencyPathMap` | Architect | FAIL — inventory | PASS — the latency tile names its path, so it reads against Connect and Observe | PASS — the path label was the fix that stopped this tile disagreeing with Observe | PASS | `keep` | **Divergence:** T1 fails; this is row-level detail inside a region the user chose to expand, not a top-level figure, so T1 does not bind at this altitude. The path suffix is the pattern other latency figures should copy. |
| 33 | Discover | `UnifiedDiscovery.tsx:713` | "142 workloads reachable over the public internet" | same as row 19 | Architect | PASS | PASS | PASS | FAIL — third rendering of `142` on one screen (CTA, AWS row coincidence, this alert) | `cut` | **Divergence:** T1-T3 all pass, so the default reads `keep`; **Duplication-only-T4** applies — the failure is repetition and only deletion fixes it. Row 19 states the same figure with an action attached; this alert states it with none, so this is the weaker rendering. |
| 34 | Discover | `UnifiedDiscovery.tsx:165` | "6 premises · your own buildings, not a cloud" | `branchesOf(cc).length` | Architect | FAIL | PASS | PASS | PASS | `keep` | **Divergence:** T1 fails; kept because this is a section header counting the rows immediately beneath it, which is one of the two honest shapes for a raw count (see also rows 59, 88). |
| 35 | Discover (folded) | `discoveryModel.ts:238` | `Routes` | `counts().routes` | Architect | FAIL | FAIL — nothing in the product reads or acts on a route count | FAIL — "routes" is ambiguous between BGP routes and route tables | FAIL | `cut` | Matches the T1+T4 default. Already inside the `estate-breakdown` disclosure; delete rather than leave behind the fold — this is the archetype the exec critique names. |
| 36 | Discover (folded) | `discoveryModel.ts:239` | `Gateways` | `counts().gateways` | Architect | FAIL | FAIL | FAIL — a gateway is not a first-class object anywhere else in this product | FAIL | `cut` | Matches the T1+T4 default. Same as row 35. |
| 37 | Connect | `ConnectPage.tsx:90` → `verdict.ts:17` | "1 of 9 regions are on the AT&T fabric, 0 with dual paths. 8 still ride the public internet." | `fabricModel()` | NetOps | PASS — leads with control posture, which is NetOps' savings equivalent | PASS | FAIL — "1 … **are**" (verified in the rendered page), and "0 with dual paths" reads as a field left blank | PASS | `relabel` | Matches the T3-alone default. Copy: **"1 of 9 regions is on the AT&T fabric, none with dual paths. 8 still ride the public internet."** Needs a singular/plural branch on `attached.length` and a zero branch on `dual` — both inside the existing string builder. |
| 38 | Connect | `ConnectPage.tsx:23` | `1` "On the fabric" / "of 9 regions" | `model.regions.filter(path === 'private')` | NetOps | FAIL | PASS | PASS | FAIL — restates the verdict line directly above it, verbatim | `cut` | Matches the T1+T4 default. The verdict line owns this claim on this screen. |
| 39 | Connect | `ConnectPage.tsx:24` | `0` "Dual / resilient" / "diverse paths" | `attached.filter(reliability === 'dual')` | NetOps | PASS — resiliency is the NetOps risk figure | PASS — the Connections list offers "Make dual" | PASS | PASS | `keep` | |
| 40 | Connect | `ConnectPage.tsx:25` | `8` "Still public" / "on the internet" | `model.regions.filter(path === 'public')` | NetOps | PASS — exposure | PASS | PASS | FAIL — the complement of row 38 and of the verdict line; three renderings of 1-vs-8 on one screen | `cut` | **Divergence:** T1-T3 all pass, so the default reads `keep`; **Duplication-only-T4** applies, and the verdict line (row 37) is the rendering worth keeping because it states both halves in one sentence. |
| 41 | Connect | `ConnectPage.tsx:26` | `4` "Cloud-to-cloud" / "0 on fabric" | `model.c2c.length`, `.filter(controlled)` | NetOps | PASS — 0-of-4 controlled is a real gap | PASS — Observe's steer rows act on exactly these | PASS | PASS | `keep` | The one tile in this panel that says something the verdict line does not. |
| 42 | Connect | `FabricHero.tsx:511` | `Public · 92ms` on each region node | `region.latencyMs` for the path the region is on | NetOps | FAIL — a measurement, not a saving | PASS — the hover card links into Observe | PASS — the word and the number describe one path, which is the fix that stopped this disagreeing with Observe | PASS | `keep` | **Divergence:** T1 fails; this is a node label inside a diagram, not a headline figure, so T1 does not bind at this altitude (same reasoning as rows 32, 54). |
| 43 | Connect | `FabricHero.tsx:574-576` | "Public today **92ms** · on the fabric **3ms**" | `region.publicMs` / `privateMs` | NetOps | PASS — states the gap attaching would close | PASS — "View in Observe →" | PASS | PASS | `keep` | The pattern row 42 borrows from. |
| 44 | Connect | `FabricHero.tsx:210` | "4 paths · 2 diverse sites · failover detect in 900ms (BFD)" | **Hardcoded** — the layout function's own literal, not an engine derivation | NetOps | FAIL | PASS — appears only on "see inside" | FAIL — every other number in this product is engine-derived; this one is a product claim rendered as telemetry | PASS for NetOps (BFD is their vocabulary) | `phase-2c` | **Divergence:** T1+T3 fail with T4 passing, which predicts `relabel`; copy cannot reach it because the problem is provenance, not wording. Needs either a real derivation or an explicit "how the fabric is built" frame that stops it reading as this estate's live figures. |
| 45 | Connect | `ConnectionsList.tsx:62` | "1 on the fabric · reliability · performance · private/public" | `connections.length` | NetOps | FAIL | PASS | PASS | FAIL — a fourth rendering of "1 on the fabric" on this screen | `cut` | Matches the T1+T4 default. **Scope: the leading count only** — keep the descriptive tail ("reliability · performance · private/public") as a section subtitle. |
| 46 | Observe | `ObservePage.tsx:18` → `networkBinding.ts:344` | "13% of your traffic rides the AT&T-controlled path, saving $3.3k/mo. 87% still crosses the public internet." | `routingKpis().pctUnderControl`, `egress().savings` | FinOps + SRE | PASS — savings named in the first clause | PASS | PASS | PASS | `keep` | The model verdict line for the whole product. |
| 47 | Observe | `networkBinding.ts:264` | `90.7` "THROUGHPUT" Gbps | `routingKpis().totalGbps` | FinOps + SRE | FAIL for FinOps, PASS for SRE | PASS — the Sankey headline splits it | PASS | PASS | `keep` | **Divergence:** T1 fails for one of this screen's two personas; kept because the SRE genuinely opens with throughput and it is the denominator the Sankey (row 53) and briefing both divide. |
| 48 | Observe | `networkBinding.ts:265-271` | `187` "P95 LATENCY" ms · "across 16 flows" | p95 over `routeFlows()` current path latency | SRE | FAIL | PASS | PASS — the sub names its own population, which is the fix that stopped it disagreeing with the briefing | PASS | `keep` | **Divergence:** T1 fails; kept because latency is the SRE persona's leading figure, and the population sub-line is the pattern other KPIs should copy. |
| 49 | Observe | `networkBinding.ts:272` | `0.19` "PACKET LOSS" % | throughput-weighted loss at the latest sample | SRE | FAIL | FAIL — nothing on this screen acts on loss | PASS | PASS | `keep` | **Divergence:** T1 and T2 both fail, which normally weakens a figure to `demote`; kept because the SRE persona genuinely opens with loss, and the orphan-ness is a Phase 1 linking gap rather than grounds to delete a figure nobody has anywhere else to read. |
| 50 | Observe | `networkBinding.ts:273` | `$44.9k` "EGRESS" · "/mo" | `egress().total` | FinOps | PASS — money | PASS — "See the savings" CTA | FAIL — "Egress" names traffic; the figure is spend. Cost states the same number as "On the AT&T fabric $44.9k/mo" | FAIL — a customer reads a data volume and sees a dollar sign | `relabel` | **Divergence:** T4 fails alongside T3, but the T4 failure is entirely caused by the noun/unit mismatch — naming the unit closes both. Copy: **"EGRESS SPEND"**, sub `/mo`. |
| 51 | Observe | `networkBinding.ts:274` | `13` "UNDER CONTROL" % | `routingKpis().pctUnderControl` | FinOps | PASS | PASS | FAIL — "under control" is builder language; the product's own noun is "on the AT&T fabric" | FAIL | `relabel` | **Divergence:** T4 fails alongside T3 and is caused by it — the number is instantly legible once the label uses the product's noun. Copy: **"ON THE AT&T FABRIC"**, value `13%`, matching the verdict line above it word for word. |
| 52 | Observe | `networkBinding.ts:275` | `$3.3k` "SAVINGS" · "/mo" | `egress().savings` | FinOps | PASS | PASS | PASS | FAIL — restates the verdict line's savings clause four inches away | `keep` | **Divergence:** T1-T3 pass and only T4 fails, the exact pattern that yields `cut` at rows 33, 40 and 55 — this row is the deliberate exception. There the duplicate repeats the same reading mode; here the pair is one prose sentence and one scannable tile, which serve a reader who reads and a reader who scans. That is the only duplication in the audit that earns itself. |
| 53 | Observe | `SankeyPanel.tsx:232-234` | "**79 of 90.7 Gbps** still rides the public internet · **11.7 Gbps** under AT&T control" | `computeSankeyGeometry()` path-band node values | FinOps + SRE | PASS — exposure first | PASS — the ribbons below draw the same claim | PASS | PASS | `keep` | |
| 54 | Observe | `SankeyPanel.tsx:193,200,219` | `rd-helion · 25.1 Gbps`, `AT&T fabric · 11.7 Gbps`, … | per-node link sums | FinOps + SRE | FAIL | PASS | PASS | PASS | `keep` | **Divergence:** T1 fails; these are diagram labels rather than headline metrics, so T1 does not bind at this altitude (same reasoning as rows 32, 42). |
| 55 | Observe | `networkBinding.ts:289` | "13% of network traffic (11.7 of 90.7 Gbps) rides the AT&T-controlled path." | `routingKpis()` | FinOps | PASS | PASS | PASS | FAIL — the **third** statement of 13% on one screen (verdict line, KPI tile, this) | `cut` | **Divergence:** T1-T3 all pass, so the default reads `keep`; **Duplication-only-T4** applies and the fix is deletion of this narrative block, not relocation — the verdict line (row 46) and the KPI tile (row 51) both already carry the claim, so there is no disclosure left for it to move into. Once deleted, the briefing opens on row 57. |
| 56 | Observe | `networkBinding.ts:293` | "87% of flows (79.0 Gbps) still cross the public internet, exposed to congestion and higher egress rates." | `routeFlows()` public share | FinOps | PASS | PASS | FAIL — says "of flows" but measures Gbps, not a flow count | FAIL — third statement of 87% | `cut` | **Divergence:** T1+T2 pass so the default does not reach `cut`, and the T3 failure alone would read as `relabel`; deletion is chosen because it resolves T3 and T4 together, where copy resolves only T3 and leaves a third rendering of 87% on the screen. If the block is retained anywhere, the copy fix is **"87% of traffic (79.0 Gbps) …"**. |
| 57 | Observe | `networkBinding.ts:306` | "vSRX in <region> blocked N flows from <tag>-tagged workloads." | `flowLogs()` denies | Security-adjacent | PASS — states a real block | PASS — the records table below carries the rows | PASS | PASS | `keep` | Promote to the briefing's opening line once rows 55-56 are cut. |
| 58 | Govern | `GovernPage.tsx:49` | Policies tab badge: `7` | `violations().length` | Security | PASS — violations are the security savings figure | PASS — the tab opens the rules panel | FAIL — the badge sits on a tab labelled "Policies" and there are **8** rules, so `7` reads as a policy count and is wrong under that reading | FAIL | `relabel` | **Divergence:** T4 fails alongside T3 and is caused by it — a bare number inherits the tab's noun. The number is right; the label it inherits is not. Copy: give the badge the accessible name and `title` **"7 open violations"**. |
| 59 | Govern | `GovernPage.tsx:52` | Groups tab badge: `2` | `groupList().length` | Security | FAIL — inventory | PASS | PASS | PASS | `keep` | **Divergence:** T1 fails; kept because a tab badge counting the rows immediately behind it is one of the two honest shapes for a raw count (see also rows 34, 88). |
| 60 | Govern | `ProposalBand.tsx:41` | "Andi spotted **4** things worth a rule" | `ruleProposals(cc).length` | Security | PASS — findings, not inventory | PASS — every row has Enforce it / Tighten it | PASS | PASS | `keep` | |
| 61 | Govern | `ProposalBand.tsx:55-56` | "enforcing <rule> would match **1** flow carrying **1** Gbps" | `p.impact.matched`, `p.impact.gbps` | Security | PASS — the price of the move | PASS | PASS | PASS | `keep` | |
| 62 | Govern | `RulesPanel.tsx:202,206` | "**0 / 8** enforced · **7** violations" | `ruleEnforced` over `ruleList()`, `violations()` | Security | PASS — the gap is the whole story | PASS — the table beneath is the move list | PASS | PASS | `keep` | The security persona's anchor figure, the way row 1 is the exec's. |
| 63 | Govern | `NextMoveBand.tsx:168-183,193` | "it clears **2** of the **7** open violations and lifts posture **57 → 60** … Ranked by violations cleared, out of **8** unenforced rules." | `nextMove()` projection | Security | PASS | PASS — "Enforce this rule" | PASS — the zero-delta branch refuses to claim a posture lift it cannot make | PASS | `keep` | Second-best sentence in the product after row 30. |
| 64 | Govern | `ServiceInsertion.tsx:27` | "**0 / 5** inserted" | `services.filter(inserted)` | Security | FAIL — inventory | PASS — each row has Insert | FAIL — "inserted" is deployment vocabulary, not a posture claim | FAIL | `relabel` | **Divergence:** T1 fails too, which with T4 would predict `cut`; the Security persona genuinely leads with inspection coverage, so only the vocabulary is broken and copy fixes both remaining failures. Copy: **"0 of 5 inspection services in the path"**. |
| 65 | Govern (Posture tab) | `PosturePanel.tsx:88,110` | Score ring `57` · "/ 100" | `postureCatalog[].score()` | Security | FAIL | PASS — row 63 names the same posture number as a delta | PASS | PASS | `keep` | **Divergence:** T1 fails; kept because the figure sits behind a tab, per category, with a summary sentence beside it — it is never competing for a viewer's first two seconds. |
| 66 | Cost | `ArbitrageHero.tsx:71` | `$48.2k/mo` "ALL-HYPERSCALER EGRESS" (struck through) | `arbitrage().hyperscalerBill` | FinOps | PASS — the counterfactual that makes the saving legible | PASS | PASS | PASS | `keep` | |
| 67 | Cost | `ArbitrageHero.tsx:82` | `$44.9k/mo` "ON THE AT&T FABRIC" | `arbitrage().cloudConnectBill` | FinOps | PASS | PASS — the same figure Observe's Egress tile states (row 50) | PASS | PASS | `keep` | |
| 68 | Cost | `ArbitrageHero.tsx:90` | "save **$3.3k** (**7%**)" | `arbitrage().savings`, `.savingsPct` | FinOps | PASS | PASS | PASS | PASS | `keep` | The vocabulary rule, done right: the verb is "save". |
| 69 | Cost | `ArbitrageHero.tsx:97` | "**$19.9k/mo** more on the table — attach the paths below." | `arbitrage().availableSavings` | FinOps | PASS | PASS — "below" is literally true | PASS | PASS | `keep` | Same number as row 1, on a different screen, under the same noun. Cross-screen repetition of one noun is consistency; the Duplication-only-T4 rule is about repetition *within* one screen. |
| 70 | Cost | `ArbitrageHero.tsx:103` | "+ **$4,200/mo** AT&T fabric ports (access, billed separately)" | `arbitrage().portFeesMo` | FinOps | FAIL — a cost, deliberately | PASS — the invoice line below carries it | PASS — "Cost" framing is correct here because the figure is literally spend | PASS | `keep` | **Divergence:** T1 fails by design; kept because a cost kept visible beside a savings claim is what makes the savings claim credible, and row 75's total does not reconcile without it. |
| 71 | Cost | `ArbitrageBreakdown.tsx:116-120` | "**$11,400** → **$3,400** · save **$8,000** (**70%**)" per bucket | `arbitrage().buckets` | FinOps | PASS | PASS — Attach fires the capture action | PASS | PASS | `keep` | |
| 72 | Cost | `ArbitrageBreakdown.tsx:57` | "**$8,000**/mo captured this session" | local session tally of committed buckets | FinOps | PASS | PASS | FAIL — "this session" is demo vocabulary; a customer has no session model | FAIL | `relabel` | **Divergence:** T4 fails alongside T3 and is caused by it — "session" is the only unreadable word in the sentence. Copy: **"$8,000/mo captured so far"**. |
| 73 | Cost | `CostPage.tsx:66-67` | `$19,200` "Commit draw" · meter "Commit draw 64% of $30,000" | `billing().commitDraw`, `.commitPct`, `.commit` | FinOps | FAIL — a spend position, not a saving | FAIL — nothing acts on it | FAIL — "Commit draw" is carrier billing vocabulary | FAIL | `relabel` | **Divergence:** all four fail, which predicts `cut`; `relabel` holds because FinOps genuinely leads with commitment burn, and all three fixable failures are carrier vocabulary — every number the new sentence needs ($19,200, 64%, $30,000) is already rendered in the tile. Copy: **"$19,200 of your $30,000 commitment used (64%)"**. |
| 74 | Cost | `EgressTrend.tsx:17` | Y-axis: `$1k/d`, `$1k/d`, `$0k/d` | `Math.round((max * (1-f))/1000)` | FinOps | FAIL | PASS | FAIL — the rounding renders two identical axis labels (verified in the rendered page) | FAIL — an axis with a repeated tick reads as broken | `phase-2c` | **Divergence:** T1+T4 fail, which predicts `cut`; the trend is a figure FinOps needs and the defect is arithmetic, not editorial. Needs a tick formatter that keeps one decimal below $10k, or an axis that scales to the data rather than to thousands. |
| 75 | Cost | `InvoiceTable.tsx:28` | "Total **$49,100**" | `billing().total` | FinOps | FAIL — literal spend | PASS — the lines above sum to it | PASS — "Total" on an invoice is the correct noun | PASS | `keep` | **Divergence:** T1 fails by design; kept because an invoice total is the one place spend is the point, and it reconciles rows 67 + 70 ($44.9k + $4.2k) — which is exactly why row 70 must stay. |
| 76 | Cost | `SteerToSave.tsx:32` | "**$X**/mo captured this session" | local tally | FinOps | PASS | PASS | FAIL — same "session" problem as row 72 | FAIL | `relabel` | **Divergence:** T4 fails alongside T3 and is caused by it, exactly as at row 72. Same copy: **"…captured so far"**. |
| 77 | AI Insights | `insightsFigures.ts:70-77` | "Tokens" `10.18M` · "0 governed · 10.18M public" | `aiSpendTotals()` | Platform/ML | PASS — the sub carries the exposure | PASS — the Security tab acts on it | PASS | PASS | `keep` | The sub-line pattern rows 15-16 should adopt. |
| 78 | AI Insights | `insightsFigures.ts:80-85` | "Cost" `$20.94` · "Savings $29.96 (59%)" | `aiSpendTotals().spendToday`, `.savings` | Platform/ML | PASS — savings in the sub | PASS | FAIL — the card says "Cost" while the emphasis toggle above labels the same figure "Spend" (`InsightsPage.tsx:109`) | FAIL — savings ($29.96) exceeding spend ($20.94) needs the counterfactual named | `relabel` | **Divergence:** T4 fails alongside T3; both failures are wording — one word to match the toggle, one clause to name what the saving is measured against. Copy: title **"Spend"**, sub **"Saved $29.96 vs external models (59%)"**. |
| 79 | AI Insights | `insightsFigures.ts:87-93` | "TTFT (p95 latency)" `246ms` · "P95 across 3 models" | p95 over `modelLatencySeries` across the full catalog | Platform/ML | FAIL | PASS — the Performance tab | PASS — the sub names its population | PASS for this persona (TTFT is their term) | `keep` | **Divergence:** T1 fails; kept because latency is the platform/ML persona's leading operational figure and the acronym is their own vocabulary, which is what carries T4 here. |
| 80 | AI Insights | `insightsFigures.ts:94-100` | "Requests" `6` · "total today" | `decisionLog().length` | Platform/ML | FAIL — inventory | PASS — the deep dive and raw log | PASS | FAIL — "6 requests today" on a gateway screen reads as a broken meter, not a small estate | `demote` | **Divergence:** T1+T4 fail, which predicts `cut`; demoted rather than cut because the count is load-bearing context for every facet below it. **Target: the request deep dive's opening sentence (row 82)**, which already states the same count inside a sentence that makes the small number read as a window rather than a fault. |
| 81 | AI Insights | `insightsFigures.ts:101-110` | "Blocked requests" `0` · "0 policy denials" | `decisionLog().filter(!allowed)` | Platform/ML | PASS — a governance claim | PASS | FAIL — the value and the sub are the same zero stated twice | FAIL | `relabel` | **Divergence:** T4 fails alongside T3 and is caused by it — the doubled zero is a wording choice, not a data problem. Copy: value `0`, sub **"no request denied by policy today"**. |
| 82 | AI Insights | `RequestDeepDive.tsx:58` → `requestAnalysis.ts:68-69` | "6 requests today: 4 allowed, 2 guardrailed, 0 denied. $20.94 spent, $29.96 saved." | `classify()` over `requestRows()` | Platform/ML | PASS — ends on the saving | PASS — every facet below filters from it | PASS | PASS | `keep` | Absorbs rows 80-81 once they move. |
| 83 | AI Insights | `PerformanceTab.tsx:150-151,171` | "Direct (external) **38ms**" vs "With routing **54ms**" | `directP50`, `routedP50` | Platform/ML | FAIL — routing is *slower*, stated plainly | PASS | PASS — the caption defines both terms | PASS | `keep` | **Divergence:** T1 fails because the figure argues against the product; kept for exactly that reason — an honest counter-figure is what makes the savings figure beside it credible. |
| 84 | AI Insights | `SavingsTab.tsx:280` | "OpenAI (external) · **79%**" (share by provider) | spend share | Platform/ML | PASS — 79% of spend leaving for an external model is the savings argument | PASS | PASS | PASS | `keep` | |
| 85 | AI Insights | `SavingsTab.tsx:146-147` | "Predicted **$X**/mo runs over the **$Y** ceiling" | `view.budget` | Platform/ML | PASS | PASS | PASS | PASS | `keep` | |
| 86 | AI Govern | `TokenPolicies.tsx:78` | "**0 / 4** enforced" | `tokenPolicyList().filter(enforced)` | Platform/ML | PASS — the governance gap | PASS — Enforce per row | PASS — the three-state pill below refuses to over-claim | PASS | `keep` | |
| 87 | AI Govern | `TokenPolicies.tsx:126` | Budget column `2,400,000,000` | `p.budget` | Platform/ML | FAIL | PASS | PASS | FAIL — ten digits, unformatted, where the same figure renders as `2.40B` on the layer home (row 11) | `relabel` | **Divergence:** T1+T4 fail with T3 passing, which predicts `cut`; the figure is correct and the failure is formatting inconsistency with the same number elsewhere. `fmtTokens` already exists, so this is one call site and no new derivation. Copy: **`2.40B`**. |
| 88 | AI Govern | `AgentsPanel.tsx:22` | "**3 / 3** enabled" | `agentList().filter(enabled)` | Platform/ML | FAIL — inventory | PASS — Suspend per row | PASS | PASS | `keep` | **Divergence:** T1 fails; kept because this is a section header counting the rows immediately beneath it, the same honest shape as rows 34 and 59. |

**Rows: 89** (rows 1-88, with 29 split into 29a and 29b).

## Verdict tally

| Verdict | Count |
|---|---|
| `keep` | 46 |
| `relabel` | 17 |
| `cut` | 15 |
| `phase-2c` | 6 |
| `demote` | 5 |
| **Total** | **89** |

Every verdict cell holds exactly one verdict. Rows 31 and 45 are `cut` with a stated
scope in the Action note (part of the row's rendering survives); rows 29a and 29b were
split from a single row precisely so that neither carries two verdicts.

## The findings that matter most

1. **One move set, two savings totals.** The layer-home widget says
   `Review 10 moves` beside `$19,900/mo`; the Discover advisor chip prices the same 10
   moves at `$52,961/mo`. `arbitrage().availableSavings` sums attach buckets;
   `advisorDraft().deltas.egressSavingMo` sums attach buckets **plus** steer
   recommendations. Both are labelled "/mo". Rows 2 and 26. This is the highest-value
   defect in the audit and no relabel fixes it.

2. **The same $19,900 under three nouns on one board.** "Money on the table",
   "Still on the table", and "Recoverable" all render `arbitrage().availableSavings`
   on `/naas/home`. Rows 1, 7, 8.

3. **Sites: 5 or 6.** `fabricModel().sites.length` is 5 because the model carries an
   "Internet" pseudo-node as a site; `branches.length` is 6, the real premises count.
   Both render on `/discover` at the same time. Rows 5, 20, 29a.

4. **A violations count wearing a policies label.** The Govern "Policies" tab badge is
   `violations().length`. There are 8 rules and 7 violations, so the badge reads as a
   wrong policy count. Row 58.

5. **Grammar and rounding defects visible in the rendered page.** Connect's verdict
   line renders "1 of 9 regions **are**"; Cost's egress trend renders two identical
   `$1k/d` axis ticks. Rows 37, 74.

6. **Routes and Gateways are already folded** into Discover's `estate-breakdown`
   disclosure. They still fail every test and should be deleted rather than left
   behind the fold. Rows 35, 36.

## Judgment calls

The reasoning behind every individual verdict now lives in that row's Action note, so
this section records only the cross-cutting decisions.

- **Verdict lines are one row each, not one row per number.** The interface says one
  row per rendered number, but a verdict line is authored, read, and changed as a
  sentence. Splitting "1 of 9 regions are on the AT&T fabric" into four rows would
  have produced four identical verdicts and lost the grammar defect, which lives in
  the sentence and not in any number. The individual numbers are named in the
  derivation cell so Tasks 2-4 lose nothing.

- **Repeated widgets are audited once unless they branch.** `EstateFiguresWidget`
  branches on surface, so it is audited twice (rows 4-7 for NaaS, 14-17 for AI).
  `AssessmentFindingsWidget` does not branch and is audited once, with "Layer home
  (both)" in the screen column.

- **One row, one verdict.** The NaaS stack band (`StackPanel.tsx:454-457`) renders two
  counts and two money figures that earn opposite verdicts, so it is two rows (29a,
  29b) rather than one row with a split cell. Where only part of a row's rendering is
  removed, the verdict stays single and the Action note states the scope (rows 31, 45).

- **`cut` was applied to duplication, not just to low value.** A figure that passes
  every test on its own but is the second or third rendering of one claim on one screen
  fails T4 in context, and copy cannot fix a repetition. That is the
  Duplication-only-T4 rule named above the table; it drives rows 7, 8, 33, 40, 55, and
  is deliberately not applied at row 52, which says why in its own note.

- **Raw counts survive in exactly two shapes.** A tab badge or section header counting
  the rows immediately beneath it (rows 34, 59, 88) is honest and instantly legible. A
  count floating in a KPI strip with no rows behind it is not.

- **Altitude matters.** Node labels inside a diagram and stat tiles inside a region the
  user chose to expand (rows 32, 42, 54) are not competing for a viewer's first two
  seconds, so T1 does not bind on them.

- **Discover keeps its inventory tiles.** The Persona-overrides-T1 rule named above the
  table applies on Discover only; the same figures are `cut` or `demote` on every other
  screen.

- **Honest costs are kept.** The "Save, not cost" rule bars savings-framed labels from
  carrying spend figures; it does not bar spend figures. Port fees (row 70) and the
  invoice total (row 75) are literal spend, correctly named, and load-bearing for the
  savings claims beside them.

- **`phase-2c` is reserved for what a copy change cannot reach**: a derivation that
  contradicts another derivation (rows 2, 26), a missing empty state (row 13), a
  missing link affordance on a widget that has none (row 9), a hardcoded figure posing
  as telemetry (row 44), and an axis formatter (row 74).

## Self-review

- Walked every screen in a browser and read every source file the brief named, plus
  the files those files render through (`stackFigures.ts`, `networkBinding.ts`,
  `discoveryModel.ts`, `insightsFigures.ts`, `requestAnalysis.ts`, the govern panels,
  the cost panels, `registry.ts`).
- Every `VerdictLine` call site is in the table: `DiscoverPage.tsx:23` (row 18),
  `ConnectPage.tsx:90` (row 37), `ObservePage.tsx:18` (row 46). `grep -rn "VerdictLine"
  src/features --include="*.tsx"` returns exactly those three plus the component and
  its test.
- Every figure in the table was confirmed rendering in the browser except rows 44
  (behind the fabric "see inside" toggle), 65 (behind the Posture tab), 72 and 76
  (session tallies that appear only after a capture action), and 85 (Savings tab
  branch). Those five were read from source only and are flagged here.
- Cross-checked the three savings figures against each other by arithmetic:
  `8,000 + 6,200 + 3,900 + 1,800 = 19,900`, which matches
  `arbitrage().availableSavings` and rows 1, 7, 8, 29b and 69. The advisor chip's
  `$52,961` reconciles against nothing in the table, which is finding 1.
- Swept all 89 rows against the default T-pattern mapping and confirmed every divergent
  row carries a `Divergence:` clause. Rows matching a default (all-pass `keep`,
  T3-alone `relabel`, T1+T4 `cut`) carry none, by design.
- Row count and verdict tally recomputed from the table after every edit; both come to
  89.

## Test / build evidence

Not applicable — this task produces one markdown document and changes no product code.
No tests were run and no build was executed, per the brief.

The dev server used for the walkthrough was the `cloud-connect-demo` launch
configuration (`VITE_AUTH_MODE=gate`, port 5201). The preview tooling resolves
`.claude/launch.json` from the shared checkout rather than from this worktree, so the
server served the shared checkout's working tree. Since this task changes no product
code and the branch under audit carries no product-code delta, the rendered pages are
representative; anyone re-running the walkthrough from this worktree should confirm
that assumption still holds.

## Concerns

- The app uses a hash router (`#/naas/home`), which the browser tooling's `navigate`
  silently strips to the origin. Screens were reached by navigating to the full hash
  URL. Anyone repeating this walk should verify the URL after each navigation.
- Several figures are live-ticking (`invisibleSharePct` read 87% on the NaaS board and
  100% on the AI board minutes apart; token counts moved from 1.65M to 10.18M during
  the walk). The audit judges labels and framing, which do not tick — but any Phase 1
  test that asserts a specific rendered value will be flaky.
- Finding 1 (the two savings totals) may have a scope larger than this program. If
  reconciling `advisorDraft` and `arbitrage` turns out to be an engine change rather
  than a presentation change, Tasks 2-4 should carry the relabels and leave the
  reconciliation as a named Phase 2c item rather than absorbing it.
- `assessmentReport().recoverableMo` adds an AI saving to the arbitrage figure. In this
  estate the AI term rounds to zero, so "Recoverable" and "Still on the table" are the
  same number today. In an estate where AI savings are non-zero they would differ by an
  unexplained amount under two savings labels — which is a stronger argument for row
  8's `cut`, not a weaker one.

## Applied

Phase 0, Task 4. Every `keep` row (46) needed no change and carries no line below —
this section covers the 43 rows that did. `done` cites the commit that applied it;
`deferred-to-2c` rows are the seed list for the roadmap's Phase 2c (their target
needs a derivation, a structure, or a reconciliation a copy change cannot reach — see
each row's own Action note above for what that is).

| Row | Verdict | Disposition |
|---|---|---|
| 2 | `phase-2c` | deferred-to-2c — needs one reconciled savings derivation between `arbitrage().availableSavings` and `advisorDraft().deltas.egressSavingMo` before either the exec board or the Discover advisor chip can carry an honest total. |
| 4 | `demote` | done (f26e8e4) — "Regions on the fabric" tile removed from `EstateFiguresWidget`; Connect's verdict line (row 37) already states it. |
| 5 | `cut` | done (f26e8e4) — "Sites" tile removed from `EstateFiguresWidget`. |
| 7 | `cut` | done (f26e8e4) — "Still on the table" tile removed from `EstateFiguresWidget`. |
| 8 | `cut` | done (f26e8e4) — "Recoverable" KPI removed from `AssessmentFindingsWidget`. |
| 9 | `phase-2c` | deferred-to-2c — needs a link affordance on `AssessmentFindingsWidget` (it has none today) before the ready copy ("7 open security findings" → `/naas/govern`) can land. |
| 10 | `relabel` | done (2fbff91) — "Invisible share" → "of traffic you cannot see" in `AssessmentFindingsWidget`. |
| 11 | `relabel` | done (2fbff91) — `TokenBudgetsWidget` reordered to lead with the percentage ("0% of a 2.40B/day budget"). Minor deferred: renders `2.40B` (existing `fmtTokens` form), not the audit's literal `2.4B` — see Concerns. |
| 13 | `phase-2c` | deferred-to-2c — needs an explicit "no traffic metered yet" empty state in `TokenBudgetsWidget` for a budget row with no matching meter. |
| 14 | `cut` | done (f26e8e4) — "Model endpoints ready" tile removed from `EstateFiguresWidget` (AI). |
| 15 | `demote` | done (f26e8e4) — merged with row 16 into one warned line in `EstateFiguresWidget` (AI); see row 16. |
| 16 | `relabel` | done (f26e8e4) — merged with row 15's demote into one line: `All {tokensToday} tokens today rode the public internet` (or the partial-governance branch — see Task 3's Concerns) when `ungovernedTokensToday > 0`. |
| 18 | `relabel` | done (2fbff91) — Discover's verdict line reordered to open on the gap: "8 of your 9 cloud regions still ride the public internet. 1 is on the AT&T fabric, across 6 clouds." |
| 19 | `relabel` | done (2fbff91) — FlowBar CTA reworded to "Attach the 142 workloads still on the public internet". |
| 21 | `demote` | done (f26e8e4) — "Active on-ramps" tile removed from Discover's summary band; the same stat still renders inside the `estate-breakdown` disclosure's Network domain. |
| 24 | `relabel` | done (2fbff91) — "ATTACHED" → "ATTACHED VPCS" in Discover's summary band. |
| 26 | `phase-2c` | deferred-to-2c — same reconciliation as row 2; one derivation must win before the Discover advisor chip's `$52,961/mo` and the exec board's `$19,900/mo` agree. |
| 27 | `demote` | done (f26e8e4) — all four AI-band figures removed from `StackPanel`; the band's verb links and blurb stay. Same four figures already state on the AI layer home (rows 14-17). |
| 28 | `cut` | done (f26e8e4) — "N clouds · N regions · N VPCs" prose line removed from `StackPanel`'s Cloud band; `cloudStratum()` deleted outright as its only consumer. |
| 29a | `cut` | done (f26e8e4) — "regions on the fabric" and "sites" figures removed from `StackPanel`'s NaaS band; row 29b's egress/savings pair stays. |
| 31 | `cut` | done (f26e8e4) — the `StatTiles` beside each Discover cloud row removed; the prose subtitle one line up stays. |
| 33 | `cut` | done (f26e8e4) — the "N workloads reachable over the public internet" alert banner removed from `UnifiedDiscovery`. |
| 35 | `cut` | done (f26e8e4) — "Routes" stat removed from the folded `estate-breakdown` disclosure. |
| 36 | `cut` | done (f26e8e4) — "Gateways" stat removed from the folded `estate-breakdown` disclosure. |
| 37 | `relabel` | done (2fbff91) — Connect's verdict line grammar/zero-branch fixed: "1 of 9 regions is on the AT&T fabric, none with dual paths. 8 still ride the public internet." |
| 38 | `cut` | done (f26e8e4) — "On the fabric" tile removed from `ConnectPage`'s `FabricPanel`. |
| 40 | `cut` | done (f26e8e4) — "Still public" tile removed from `ConnectPage`'s `FabricPanel`. |
| 44 | `phase-2c` | deferred-to-2c — needs either a real derivation for "4 paths · 2 diverse sites · failover detect in 900ms (BFD)" or an explicit "how the fabric is built" frame; the figure is hardcoded today. |
| 45 | `cut` | done (f26e8e4) — the leading "N on the fabric ·" count removed from `ConnectionsList`; the descriptive tail stays. |
| 50 | `relabel` | done (2fbff91) — Observe KPI "EGRESS" → "EGRESS SPEND". |
| 51 | `relabel` | done (2fbff91) — Observe KPI "UNDER CONTROL" → "ON THE AT&T FABRIC". |
| 55 | `cut` | done (f26e8e4) — the "13% of network traffic (…)" narrative block removed from `buildBriefing`. |
| 56 | `cut` | done (f26e8e4) — the "87% of flows (…)" narrative block removed from `buildBriefing`; the briefing now opens on row 57's denial sentence when there are denials. |
| 58 | `relabel` | done (2fbff91) — Govern's Policies tab badge given the accessible name/title "7 open violations" (visible `7` unchanged; `TabItem`/`TabGroup` gained an optional `countLabel` to carry it). |
| 64 | `relabel` | done (2fbff91) — `ServiceInsertion` "0 / 5 inserted" → "0 of 5 inspection services in the path". |
| 72 | `relabel` | done (2fbff91) — `ArbitrageBreakdown` "…captured this session" → "…captured so far". |
| 73 | `relabel` | done (2fbff91) — Cost's commit-draw sentence rewritten: "$19,200 of your $30,000 commitment used (64%)". Minor deferred: the tile's own header label was changed to "Commitment" (not a literal string from the audit's Action note) — see Concerns. |
| 74 | `phase-2c` | deferred-to-2c — `EgressTrend`'s Y-axis tick formatter needs a fix (repeated `$1k/d` labels), which is an arithmetic defect, not a copy change. |
| 76 | `relabel` | done (2fbff91) — `SteerToSave` "…captured this session" → "…captured so far" (same fix as row 72). |
| 78 | `relabel` | done (2fbff91) — AI Insights "Cost" card → "Spend", sub → "Saved $29.96 vs external models (59%)". |
| 80 | `demote` | done (f26e8e4) — "Requests" KPI card removed from the AI Insights strip; the request deep dive's own opening sentence (row 82) already states the count. `InsightsPage.tsx`'s emphasis toggle also dropped the now-dead `requests` option. |
| 81 | `relabel` | done (2fbff91) — AI Insights "Blocked requests" sub-line de-doubled: "no request denied by policy today". |
| 87 | `relabel` | done (2fbff91) — `TokenPolicies` Budget column now renders through `fmtTokens` (e.g. `2.40B`), matching row 11's layer-home format. |

### Orphaned derivations left behind (not this program's to remove)

Surfaced by Task 3's report; none are `src/engine/**` derivations, so none block a
future cleanup pass on the engine itself:

- **`counts().routes` / `counts().gateways`** (`src/engine/state.ts:389-390`) — engine
  derivations. Their only consumer (`discoveryModel.ts`'s Network domain stats) was
  removed by rows 35-36; `counts()` itself stays fully alive for every other field.
- **`aiStratum().modelsReady` / `.modelsTotal` / `.identityCount`**
  (`src/features/discover/stackFigures.ts`) — lost their last UI consumer (row 27's
  `StackPanel` figures, row 14's `EstateFiguresWidget` tile) but the owning function,
  `aiStratum()`, stays alive for `tokensToday`/`ungovernedTokensToday`/`spendToday`.
- **`naasStratum().regionsAttached` / `.regionsTotal` / `.sites`**
  (`src/features/discover/stackFigures.ts`) — lost their last UI consumer (rows 4, 5,
  29a) but `naasStratum()` stays alive for `egressPubMo`/`egressPrivMo`/`availableSavingsMo`.
- **`InsightKpi`'s `'requests'` key union member** (`src/features/ai-fabric/insights/insightsFigures.ts:35`)
  — stale now that row 80 removed the Requests card; `InsightsPage.tsx`'s emphasis
  toggle no longer offers it, but the type still names it.

`cloudStratum()` / `CloudStratumFigures` (`stackFigures.ts`, row 28's only consumer)
was the one exception: deleted outright in f26e8e4, not left orphaned, because it was
a whole local helper with zero remaining callers rather than a function losing one
field among several still in use.

### Deferred minors (word-choice, not structural)

- **Row 73's tile header.** The Action note gave one sentence for the meter's caption;
  the tile's separate `label` prop needed its own fix, and Task 2 chose "Commitment"
  (lifted from the given sentence's vocabulary) since no replacement was literally
  quoted. `src/features/cost/CostPage.tsx:64`.
- **Row 11 / row 87's digit count.** The audit's own copy quotes `2.4B`; the shipped
  `fmtTokens` helper renders `2.40B` (two decimals, the same convention `fmtTokens`
  already used for `M`). Task 2 kept the existing formatter rather than special-case
  one digit of precision. `src/features/ai-fabric/TokenBudgetsWidget.tsx:51`.

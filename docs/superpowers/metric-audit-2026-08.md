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
`demote` (true but second-order; names the disclosure it moves into) · `cut` (fails
T1+T4 with no story) · `phase-2c` (needs structure or a derivation that does not exist).

---

## The inventory

| # | Screen | Component:line | Label as shown | Value derivation | Persona | T1 savings-first | T2 connected | T3 right measure/label | T4 two-second | Verdict | Action note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Layer home (NaaS) | `MoneyOnTheTableWidget.tsx:36` | `$19,900/mo` under "still on the table if every on-ramp attached" | `arbitrage().availableSavings` | Exec | PASS — the money question, stated as money | PASS — the Review button stages the moves | PASS — savings framing, literal $ | PASS | `keep` | The board's anchor figure. Everything else on this board is judged against it. |
| 2 | Layer home (NaaS) | `MoneyOnTheTableWidget.tsx:29` | `Review 10 moves` | `advisorDraft(c).moves.length` | Exec | PASS — a count of savings actions, not inventory | PASS — navigates to `/discover?draft=andi` | FAIL — the same 10 moves are priced at `$52,961/mo` by the Discover advisor chip (row 26), not `$19,900/mo` | FAIL — two totals for one move set | `phase-2c` | Needs one reconciled savings derivation. `arbitrage().availableSavings` (attach buckets) and `advisorDraft().deltas.egressSavingMo` (attach buckets + steer recommendations) both claim "$/mo saved" for the identical move list. Until one number wins, no label fixes this. |
| 3 | Layer home (NaaS) | `MoneyOnTheTableWidget.tsx:42,44` | `GPU inference egress · $8,000/mo` (×3 buckets) | `arbitrage().buckets` unattached, top 3 | Exec | PASS | PASS — the same rows Cost's breakdown ranks | PASS | PASS | `keep` | Ranked savings with named sources is the strongest pattern on the board. |
| 4 | Layer home (NaaS) | `EstateFiguresWidget.tsx:24` | `1/9` "Regions on the fabric" | `naasStratum().regionsAttached / regionsTotal` | Exec | FAIL — inventory | PASS — Connect owns it | PASS | PASS | `demote` | Moves into the Connect screen, which already states it twice (rows 32, 34). An exec does not lead with a region count. |
| 5 | Layer home (NaaS) | `EstateFiguresWidget.tsx:25` | `5` "Sites" | `fabricModel().sites.length` | Exec | FAIL — raw count | FAIL — links nowhere | FAIL — the estate has **6** premises (`branches.length`, rows 20, 25); this 5 counts the fabric model's 4 real sites **plus** the "Internet" pseudo-node rendered as a site in `FabricHero` | FAIL — "5 Sites" here and "6 SITES" on Discover, one click apart | `cut` | The number is wrong and the figure serves no exec question. Sites survive on Discover's summary band, where the count is right. |
| 6 | Layer home (NaaS) | `EstateFiguresWidget.tsx:26` | `$29,900/mo` "Egress on public transit" | `egress().pub` | Exec | PASS — states exposure in money | PASS — Cost's invoice line names the same figure | PASS — literally spend, so "Egress" is honest, though see row 41 | PASS | `keep` | |
| 7 | Layer home (NaaS) | `EstateFiguresWidget.tsx:27` | `$19,900/mo` "Still on the table" | `arbitrage().availableSavings` | Exec | PASS | PASS | FAIL — identical to row 1 on the same board, under a second label | FAIL — a viewer reads two savings figures | `cut` | Duplicate of the board's own hero. Remove from Estate at a glance; the Money on the table widget already leads with it. |
| 8 | Layer home (both) | `AssessmentFindingsWidget.tsx:10` | `$19,900/mo` "Recoverable" | `assessmentReport().recoverableMo` = `arbitrage().availableSavings + aiSavingMo` | Exec | PASS | FAIL — no route out of the widget | FAIL — a **third** label for the same number as rows 1 and 7 | FAIL | `cut` | Three tiles, one number, three nouns. Keep "Money on the table"; drop "Recoverable". |
| 9 | Layer home (both) | `AssessmentFindingsWidget.tsx:11` | `7` "Security events" | `assessmentReport().securityEvents` = denials + violations | Exec | PASS — exposure counts as savings-adjacent risk | FAIL — no link to Govern, where the 7 violations are listed | PASS | PASS | `relabel` | Copy: **"7 open security findings"**, and link the tile to `/naas/govern`. "Events" reads as log noise; these are the same 7 violations Govern's rules panel opens with. |
| 10 | Layer home (both) | `AssessmentFindingsWidget.tsx:12` | `87%` "Invisible share" | `assessmentReport().invisibleSharePct` (live) | Exec | PASS — states the blind spot | FAIL — orphan | FAIL — "Invisible share" of what is not stated | FAIL — needs the builder to explain it | `relabel` | Copy: **"87% of traffic you cannot see"**. Same figure, no new derivation. |
| 11 | Layer home (AI) | `TokenBudgetsWidget.tsx:51` | `0 of 2.40B` / `1.65M of 1.60B` | `tokenMeterList()` today vs `tokenPolicyList()` budget | Exec | FAIL — a ceiling, not a saving | PASS — Enforce stages a policy move | PASS — the meter is the honest reading | FAIL — 2.40B tokens is not a two-second quantity | `relabel` | Copy: lead with the percentage, budget second — **"0% of a 2.4B/day budget"**. The raw token magnitudes stop being the first thing read. |
| 12 | Layer home (AI) | `TokenBudgetsWidget.tsx:52` | `· 0%` | `tokenMeterList().pct` | Exec | FAIL | PASS | PASS | PASS | `keep` | Becomes the lead under row 11's relabel. |
| 13 | Layer home (AI) | `TokenBudgetsWidget.tsx:51` | `1.20B budget` (no meter) | `tokenPolicyList()` budget, no matching meter | Exec | FAIL | PASS | FAIL — a ceiling with no reading, in a list where every sibling row states both | FAIL — the row shape changes mid-list | `phase-2c` | Needs an explicit "no traffic metered yet" state so the row reads as absent data, not as a different kind of figure. |
| 14 | Layer home (AI) | `EstateFiguresWidget.tsx:15` | `0/3` "Model endpoints ready" | `modelCatalog()` `ready` count | Exec | FAIL — inventory | FAIL — no route to Providers | FAIL — zero endpoints "ready" while rows 15-17 meter live tokens, spend, and 6 answered requests through those endpoints | FAIL | `cut` | The figure contradicts every other number on the board. Nothing on either layer home depends on it. |
| 15 | Layer home (AI) | `EstateFiguresWidget.tsx:16` | `1.65M` "Tokens today" | `aiSpendTotals().tokensToday` | Exec | FAIL — volume, not money | PASS — the same figure Insights leads with | PASS | PASS | `demote` | Second-order behind spend (row 17) and exposure (row 16). Belongs in the AI Insights KPI strip, which already carries it (row 47). |
| 16 | Layer home (AI) | `EstateFiguresWidget.tsx:17` | `1.65M` "On the public internet" | `aiSpendTotals().ungovernedTokensToday` | Exec | PASS — the exposure story | PASS | FAIL — identical value to row 15, adjacent, under a different label; the real claim ("all of them") is never made | FAIL — reads as double counting | `relabel` | Copy: **"All 1.65M tokens today rode the public internet"** as one warned line, replacing the two-tile pair. States the fact the two tiles only imply. |
| 17 | Layer home (AI) | `EstateFiguresWidget.tsx:18` | `$8.25` "Spend today" | `aiSpendTotals().spendToday` | Exec | PASS — literally spend, so the noun is allowed | PASS | PASS | PASS | `keep` | |
| 18 | Discover | `DiscoverPage.tsx:23` → `verdict.ts:10-12` | "Your estate spans 9 regions across 6 clouds. 1 is on the AT&T fabric; 8 still ride the public internet." | `fabricModel()` regions / cloudIds / `path === 'private'` | Architect | FAIL — opens on inventory ("spans 9 regions"), buries the gap in the last clause | PASS | PASS — every number is right | PASS | `relabel` | Copy: **"8 of your 9 cloud regions still ride the public internet. 1 is on the AT&T fabric, across 6 clouds."** Same three numbers, gap first. No new derivation. |
| 19 | Discover | `UnifiedDiscovery.tsx:470` | `Attach 142 public workloads` (FlowBar CTA) | `clouds.filter(!attached).reduce(workloads)` | Architect | PASS — a move, priced in exposure | PASS — `/naas/connect?from=discover` | PASS | FAIL — 142 also happens to be AWS's own workload count on the row directly below (row 24), so the CTA reads as "attach AWS" | `relabel` | Copy: **"Attach the 142 workloads still on the public internet"**. The predicate disambiguates it from the AWS row. |
| 20 | Discover | `UnifiedDiscovery.tsx:384` | `6` "SITES" | `estateDomains()` `network.sites` = `branches.length` | Architect | FAIL — inventory | PASS — the sites panel below | PASS — 6 is the right premises count | PASS | `keep` | Discover is the inventory screen and the architect does lead with "what do I have". This is the one place a site count belongs. See row 5 for the count that disagrees with it. |
| 21 | Discover | `UnifiedDiscovery.tsx:385` | `1 / 4` "ACTIVE ON-RAMPS" | `activeOnramps()` / `onramps.length` | Architect | FAIL — inventory | FAIL — nothing on this screen acts on it | PASS — the honest active/on-order split | FAIL — "on-ramp" needs explaining, and the denominator is "circuits on order", which the tile never says | `demote` | Into the existing `estate-breakdown` disclosure, where the Network domain already carries the same stat with its explanatory blurb. |
| 22 | Discover | `UnifiedDiscovery.tsx:386` | `6 · 9` "CLOUDS · REGIONS" | `counts().clouds`, `counts().regions` | Architect | FAIL — inventory | PASS — the tree below is exactly this | PASS | PASS | `keep` | The architect's orientation figure. Two numbers on one tile is the right compression here. |
| 23 | Discover | `UnifiedDiscovery.tsx:387` | `284` "WORKLOADS" | `counts().workloads` | Architect | FAIL — inventory | PASS — row 19's CTA splits it | PASS | PASS | `keep` | The denominator row 19 is a fraction of. |
| 24 | Discover | `UnifiedDiscovery.tsx:388` | `2` "ATTACHED" | `counts().attached` | Architect | FAIL | FAIL | FAIL — attached *what*? The value counts VPCs, while the tile sits beside a regions tile and a workloads tile | FAIL | `relabel` | Copy: **"2 / 15 — VPCS ON THE FABRIC"**. Names the unit and gives it the denominator the tile beside it already has. |
| 25 | Discover | `UnifiedDiscovery.tsx:389` | `3` "EXPOSED ENDPOINTS" | `aiExposed()` | Architect | PASS — the one posture finding in the band | PASS — the AI domain CTA routes to `/ai/providers` | PASS | PASS | `keep` | The only savings-first tile in a band of six. |
| 26 | Discover | `StackPanel.tsx:374` | `Advisor: 10 moves · $52,961/mo · Review` | `advisorDraft(cc).deltas.egressSavingMo` | Architect | PASS | PASS — stages the tray | FAIL — the same 10 moves are `$19,900/mo` on the exec board (rows 1-2) and `$19.9k/mo` on Cost (row 43) | FAIL | `phase-2c` | Same defect as row 2, stated from the other side. `advisorDraft` sums attach-bucket savings **and** steer savings; `arbitrage().availableSavings` sums only the buckets. One derivation has to win before either chip can carry an honest number. |
| 27 | Discover | `StackPanel.tsx:409-414` | `0/3` model endpoints ready · `0` tokens today · `$0.00` spend today · 3 identities | `aiStratum()` | Architect | FAIL — inventory, on a NaaS-shaped screen | PASS — the AI band's four verb links | PASS | FAIL — three zeros stacked in the rail read as a broken panel | `demote` | The AI stratum band is context for the stack diagram, not a figure strip. Keep the band, drop the numbers to the AI layer home which already states all four (rows 14-17). |
| 28 | Discover | `StackPanel.tsx:438` | "6 clouds · 9 regions · 15 VPCs in the estate today." | `cloudStratum()` = `counts()` | Architect | FAIL | PASS | PASS | FAIL — restates rows 22 and 24 on the same page, in a different format | `cut` | The summary band above already carries clouds, regions and VPC counts. The Cloud band's job is "its own layer, next", not a third count. |
| 29 | Discover | `StackPanel.tsx:454-457` | `1/9` regions on the fabric · `5` sites · `$29,900/mo` egress on public transit · `$19,900/mo` still on the table | `naasStratum()` | Architect | Mixed — the two money figures pass, the two counts fail | PASS | FAIL — `5 sites` contradicts the `6 SITES` tile on the same page (rows 5, 20) | FAIL | `cut` (the two counts) / `keep` (the two money figures) | Drop `regions on the fabric` and `sites` from the NaaS band; both are stated better elsewhere on the same page and one of them is wrong. Keep the egress and savings figures — they are the band's whole argument. |
| 30 | Discover | `StackPanel.tsx:533-541` | "N moves staged · <region> 92→3 ms on the fabric · keeps $X/mo of egress · clears N violations" | `stagedDeltas()` | Architect | PASS — the delta is stated in savings and violations | PASS — Commit is right beside it | PASS — unpriced moves are named, never summed | PASS | `keep` | The best sentence in the product. Everything else should read like this. |
| 31 | Discover | `UnifiedDiscovery.tsx:556` + `:560-564` | "3 regions · 6 VPC/VNet · 142 workloads" **and** the same three as stat tiles on the same row | `cloudRegionCount` / `cloudVpcCount` / `c.workloads` | Architect | FAIL | PASS | PASS | FAIL — the identical three numbers render twice in one row, once as prose and once as tiles | `cut` (the stat tiles) | Keep the prose subtitle; drop the duplicate `StatTiles` from the cloud row. |
| 32 | Discover | `UnifiedDiscovery.tsx:599-611` | Region row tiles: `VPC/VNet` · `Subnets` · `54ms` "Latency · public" | `vpcsOf`, `r.subnets`, `regionLatencyMap` / `regionLatencyPathMap` | Architect | FAIL — inventory | PASS — the latency tile names its path, so it reads against Connect and Observe | PASS — the path label was the fix that stopped this tile disagreeing with Observe | PASS | `keep` | Row-level detail inside an expanded region, not a headline. The path suffix is the pattern other latency figures should copy. |
| 33 | Discover | `UnifiedDiscovery.tsx:713` | "142 workloads reachable over the public internet" | same as row 19 | Architect | PASS | PASS | PASS | FAIL — third rendering of `142` on one screen (CTA, AWS row coincidence, this alert) | `cut` | The FlowBar CTA (row 19) already states it with an action attached. This alert states it with none. |
| 34 | Discover | `UnifiedDiscovery.tsx:165` | "6 premises · your own buildings, not a cloud" | `branchesOf(cc).length` | Architect | FAIL | PASS | PASS | PASS | `keep` | Section header for the panel it introduces. |
| 35 | Discover (folded) | `discoveryModel.ts:238` | `Routes` | `counts().routes` | Architect | FAIL | FAIL — nothing in the product reads or acts on a route count | FAIL — "routes" is ambiguous between BGP routes and route tables | FAIL | `cut` | Already inside the `estate-breakdown` disclosure. Remove entirely — this is the archetype the exec critique names. |
| 36 | Discover (folded) | `discoveryModel.ts:239` | `Gateways` | `counts().gateways` | Architect | FAIL | FAIL | FAIL — a gateway is not a first-class object anywhere else in this product | FAIL | `cut` | Same as row 35. |
| 37 | Connect | `ConnectPage.tsx:90` → `verdict.ts:17` | "1 of 9 regions are on the AT&T fabric, 0 with dual paths. 8 still ride the public internet." | `fabricModel()` | NetOps | PASS — leads with control posture, which is NetOps' savings equivalent | PASS | FAIL — "1 … **are**" (verified in the rendered page), and "0 with dual paths" reads as a field left blank | PASS | `relabel` | Copy: **"1 of 9 regions is on the AT&T fabric, none with dual paths. 8 still ride the public internet."** Requires a singular/plural branch on `attached.length` and a zero branch on `dual`. |
| 38 | Connect | `ConnectPage.tsx:23` | `1` "On the fabric" / "of 9 regions" | `model.regions.filter(path === 'private')` | NetOps | FAIL | PASS | PASS | FAIL — restates the verdict line directly above it, verbatim | `cut` | The verdict line owns this claim on this screen. |
| 39 | Connect | `ConnectPage.tsx:24` | `0` "Dual / resilient" / "diverse paths" | `attached.filter(reliability === 'dual')` | NetOps | PASS — resiliency is the NetOps risk figure | PASS — the Connections list offers "Make dual" | PASS | PASS | `keep` | |
| 40 | Connect | `ConnectPage.tsx:25` | `8` "Still public" / "on the internet" | `model.regions.filter(path === 'public')` | NetOps | PASS — exposure | PASS | PASS | FAIL — the complement of row 38 and of the verdict line; three renderings of 1-vs-8 on one screen | `cut` | Same reason as row 38. |
| 41 | Connect | `ConnectPage.tsx:26` | `4` "Cloud-to-cloud" / "0 on fabric" | `model.c2c.length`, `.filter(controlled)` | NetOps | PASS — 0-of-4 controlled is a real gap | PASS — Observe's steer rows act on exactly these | PASS | PASS | `keep` | The one tile in this panel that says something the verdict line does not. |
| 42 | Connect | `FabricHero.tsx:511` | `Public · 92ms` on each region node | `region.latencyMs` for the path the region is on | NetOps | FAIL — a measurement, not a saving | PASS — the hover card links into Observe | PASS — the word and the number describe one path, which is the fix that stopped this disagreeing with Observe | PASS | `keep` | |
| 43 | Connect | `FabricHero.tsx:574-576` | "Public today **92ms** · on the fabric **3ms**" | `region.publicMs` / `privateMs` | NetOps | PASS — states the gap attaching would close | PASS — "View in Observe →" | PASS | PASS | `keep` | The pattern row 42 borrows from. |
| 44 | Connect | `FabricHero.tsx:210` | "4 paths · 2 diverse sites · failover detect in 900ms (BFD)" | **Hardcoded** — the layout function's own literal, not an engine derivation | NetOps | FAIL | PASS — appears only on "see inside" | FAIL — every other number in this product is engine-derived; this one is a product claim rendered as telemetry | PASS for NetOps (BFD is their vocabulary) | `phase-2c` | Needs either a real derivation or an explicit "how the fabric is built" framing that stops it reading as this estate's live figures. |
| 45 | Connect | `ConnectionsList.tsx:62` | "1 on the fabric · reliability · performance · private/public" | `connections.length` | NetOps | FAIL | PASS | PASS | FAIL — a fourth rendering of "1 on the fabric" on this screen | `cut` (the count) | Keep the descriptive tail as a section subtitle; drop the leading count. |
| 46 | Observe | `ObservePage.tsx:18` → `networkBinding.ts:344` | "13% of your traffic rides the AT&T-controlled path, saving $3.3k/mo. 87% still crosses the public internet." | `routingKpis().pctUnderControl`, `egress().savings` | FinOps + SRE | PASS — savings named in the first clause | PASS | PASS | PASS | `keep` | The model verdict line for the whole product. |
| 47 | Observe | `networkBinding.ts:264` | `90.7` "THROUGHPUT" Gbps | `routingKpis().totalGbps` | FinOps + SRE | FAIL for FinOps, PASS for SRE | PASS — the Sankey headline splits it | PASS | PASS | `keep` | The denominator the Sankey and briefing both divide. |
| 48 | Observe | `networkBinding.ts:265-271` | `187` "P95 LATENCY" ms · "across 16 flows" | p95 over `routeFlows()` current path latency | SRE | FAIL | PASS | PASS — the sub names its own population, which is the fix that stopped it disagreeing with the briefing | PASS | `keep` | |
| 49 | Observe | `networkBinding.ts:272` | `0.19` "PACKET LOSS" % | throughput-weighted loss at the latest sample | SRE | FAIL | FAIL — nothing on this screen acts on loss | PASS | PASS | `keep` | SRE genuinely leads with loss; the orphan-ness is a Phase 1 linking problem, not a cut. |
| 50 | Observe | `networkBinding.ts:273` | `$44.9k` "EGRESS" · "/mo" | `egress().total` | FinOps | PASS — money | PASS — "See the savings" CTA | FAIL — "Egress" names traffic; the figure is spend. The Cost screen states the same number as "On the AT&T fabric $44.9k/mo" | FAIL — a customer reads a data volume and sees a dollar sign | `relabel` | Copy: **"EGRESS SPEND"**, sub `/mo`. |
| 51 | Observe | `networkBinding.ts:274` | `13` "UNDER CONTROL" % | `routingKpis().pctUnderControl` | FinOps | PASS | PASS | FAIL — "under control" is builder language; the product's own noun is "on the AT&T fabric" | FAIL | `relabel` | Copy: **"ON THE AT&T FABRIC"**, value `13%`. Matches the verdict line above it word for word. |
| 52 | Observe | `networkBinding.ts:275` | `$3.3k` "SAVINGS" · "/mo" | `egress().savings` | FinOps | PASS | PASS | PASS | FAIL — restates the verdict line's savings clause four inches away | `keep` | Kept deliberately: the verdict line is prose and the tile is scannable. This is the one duplication that earns itself. |
| 53 | Observe | `SankeyPanel.tsx:232-234` | "**79 of 90.7 Gbps** still rides the public internet · **11.7 Gbps** under AT&T control" | `computeSankeyGeometry()` path-band node values | FinOps + SRE | PASS — exposure first | PASS — the ribbons below draw the same claim | PASS | PASS | `keep` | |
| 54 | Observe | `SankeyPanel.tsx:193,200,219` | `rd-helion · 25.1 Gbps`, `AT&T fabric · 11.7 Gbps`, … | per-node link sums | FinOps + SRE | FAIL | PASS | PASS | PASS | `keep` | Diagram labels, not headline metrics. |
| 55 | Observe | `networkBinding.ts:289` | "13% of network traffic (11.7 of 90.7 Gbps) rides the AT&T-controlled path." | `routingKpis()` | FinOps | PASS | PASS | PASS | FAIL — the **third** statement of 13% on one screen (verdict line, KPI tile, this) | `demote` | The briefing band already sits below the data. Drop this first block; open the briefing on the deny sentence (row 57), which nothing else states. |
| 56 | Observe | `networkBinding.ts:293` | "87% of flows (79.0 Gbps) still cross the public internet, exposed to congestion and higher egress rates." | `routeFlows()` public share | FinOps | PASS | PASS | FAIL — says "of flows" but measures Gbps, not a flow count | FAIL — third statement of 87% | `demote` | Same disclosure as row 55; if kept anywhere, copy: **"87% of traffic (79.0 Gbps) …"**. |
| 57 | Observe | `networkBinding.ts:306` | "vSRX in <region> blocked N flows from <tag>-tagged workloads." | `flowLogs()` denies | Security-adjacent | PASS — states a real block | PASS — the records table below carries the rows | PASS | PASS | `keep` | Promote to the briefing's opening line once rows 55-56 demote. |
| 58 | Govern | `GovernPage.tsx:49` | Policies tab badge: `7` | `violations().length` | Security | PASS — violations are the security savings figure | PASS — the tab opens the rules panel | FAIL — the badge sits on a tab labelled "Policies" and there are **8** rules, so `7` reads as a policy count and is wrong under that reading | FAIL | `relabel` | Copy: give the badge the accessible name **"7 open violations"** and a matching `title`. The number is right; the label it inherits is not. |
| 59 | Govern | `GovernPage.tsx:52` | Groups tab badge: `2` | `groupList().length` | Security | FAIL — inventory | PASS | PASS | PASS | `keep` | A tab badge counting the rows behind it is the one honest use of a raw count. |
| 60 | Govern | `ProposalBand.tsx:41` | "Andi spotted **4** things worth a rule" | `ruleProposals(cc).length` | Security | PASS — findings, not inventory | PASS — every row has Enforce it / Tighten it | PASS | PASS | `keep` | |
| 61 | Govern | `ProposalBand.tsx:55-56` | "enforcing <rule> would match **1** flow carrying **1** Gbps" | `p.impact.matched`, `p.impact.gbps` | Security | PASS — the price of the move | PASS | PASS | PASS | `keep` | |
| 62 | Govern | `RulesPanel.tsx:202,206` | "**0 / 8** enforced · **7** violations" | `ruleEnforced` over `ruleList()`, `violations()` | Security | PASS — the gap is the whole story | PASS — the table beneath is the move list | PASS | PASS | `keep` | The security persona's anchor figure, the way row 1 is the exec's. |
| 63 | Govern | `NextMoveBand.tsx:168-183,193` | "it clears **2** of the **7** open violations and lifts posture **57 → 60** … Ranked by violations cleared, out of **8** unenforced rules." | `nextMove()` projection | Security | PASS | PASS — "Enforce this rule" | PASS — the zero-delta branch refuses to claim a posture lift it cannot make | PASS | `keep` | Second-best sentence in the product after row 30. |
| 64 | Govern | `ServiceInsertion.tsx:27` | "**0 / 5** inserted" | `services.filter(inserted)` | Security | FAIL — inventory | PASS — each row has Insert | FAIL — "inserted" is deployment vocabulary, not a posture claim | FAIL | `relabel` | Copy: **"0 of 5 inspection services in the path"**. |
| 65 | Govern (Posture tab) | `PosturePanel.tsx:88,110` | Score ring `57` · "/ 100" | `postureCatalog[].score()` | Security | FAIL | PASS — row 63 names the same posture number as a delta | PASS | PASS | `keep` | Behind a tab, per category, with a summary sentence beside it. |
| 66 | Cost | `ArbitrageHero.tsx:71` | `$48.2k/mo` "ALL-HYPERSCALER EGRESS" (struck through) | `arbitrage().hyperscalerBill` | FinOps | PASS — the counterfactual that makes the saving legible | PASS | PASS | PASS | `keep` | |
| 67 | Cost | `ArbitrageHero.tsx:82` | `$44.9k/mo` "ON THE AT&T FABRIC" | `arbitrage().cloudConnectBill` | FinOps | PASS | PASS — the same figure Observe's Egress tile states (row 50) | PASS | PASS | `keep` | |
| 68 | Cost | `ArbitrageHero.tsx:90` | "save **$3.3k** (**7%**)" | `arbitrage().savings`, `.savingsPct` | FinOps | PASS | PASS | PASS | PASS | `keep` | The vocabulary rule, done right: the verb is "save". |
| 69 | Cost | `ArbitrageHero.tsx:97` | "**$19.9k/mo** more on the table — attach the paths below." | `arbitrage().availableSavings` | FinOps | PASS | PASS — "below" is literally true | PASS | PASS | `keep` | Same number as row 1, on a different screen, under the same noun. This is consistency, not duplication. |
| 70 | Cost | `ArbitrageHero.tsx:103` | "+ **$4,200/mo** AT&T fabric ports (access, billed separately)" | `arbitrage().portFeesMo` | FinOps | FAIL — a cost, deliberately | PASS — the invoice line below carries it | PASS — "Cost" framing is correct here because the figure is literally spend | PASS | `keep` | The honesty disclosure. Keeping a cost visible next to a savings claim is what makes the savings claim credible. |
| 71 | Cost | `ArbitrageBreakdown.tsx:116-120` | "**$11,400** → **$3,400** · save **$8,000** (**70%**)" per bucket | `arbitrage().buckets` | FinOps | PASS | PASS — Attach fires the capture action | PASS | PASS | `keep` | |
| 72 | Cost | `ArbitrageBreakdown.tsx:57` | "**$8,000**/mo captured this session" | local session tally of committed buckets | FinOps | PASS | PASS | FAIL — "this session" is demo vocabulary; a customer has no session model | FAIL | `relabel` | Copy: **"$8,000/mo captured so far"**. |
| 73 | Cost | `CostPage.tsx:66-67` | `$19,200` "Commit draw" · meter "Commit draw 64% of $30,000" | `billing().commitDraw`, `.commitPct`, `.commit` | FinOps | FAIL — a spend position, not a saving | FAIL — nothing acts on it | FAIL — "Commit draw" is carrier billing vocabulary | FAIL | `relabel` | Copy: **"$19,200 of your $30,000 commitment used (64%)"**. FinOps genuinely leads with commit burn, so it survives; the phrase does not. |
| 74 | Cost | `EgressTrend.tsx:17` | Y-axis: `$1k/d`, `$1k/d`, `$0k/d` | `Math.round((max * (1-f))/1000)` | FinOps | FAIL | PASS | FAIL — the rounding renders two identical axis labels (verified in the rendered page) | FAIL — an axis with a repeated tick reads as broken | `phase-2c` | Needs a tick formatter that keeps one decimal below $10k, or an axis that scales to the data rather than to thousands. |
| 75 | Cost | `InvoiceTable.tsx:28` | "Total **$49,100**" | `billing().total` | FinOps | FAIL — literal spend | PASS — the lines above sum to it | PASS — "Total" on an invoice is the correct noun | PASS | `keep` | Reconciles with row 67 + row 70 ($44.9k + $4.2k), which is exactly why row 70 must stay. |
| 76 | Cost | `SteerToSave.tsx:32` | "**$X**/mo captured this session" | local tally | FinOps | PASS | PASS | FAIL — same "session" problem as row 72 | FAIL | `relabel` | Same copy as row 72: **"…captured so far"**. |
| 77 | AI Insights | `insightsFigures.ts:70-77` | "Tokens" `10.18M` · "0 governed · 10.18M public" | `aiSpendTotals()` | Platform/ML | PASS — the sub carries the exposure | PASS — the Security tab acts on it | PASS | PASS | `keep` | The sub-line pattern rows 15-16 should adopt. |
| 78 | AI Insights | `insightsFigures.ts:80-85` | "Cost" `$20.94` · "Savings $29.96 (59%)" | `aiSpendTotals().spendToday`, `.savings` | Platform/ML | PASS — savings in the sub | PASS | FAIL — the card says "Cost" while the emphasis toggle 8 inches above labels the same figure "Spend" (`InsightsPage.tsx:109`) | FAIL — savings ($29.96) exceeding spend ($20.94) needs the counterfactual explained | `relabel` | Copy: card title **"Spend"**, sub **"Saved $29.96 vs external models (59%)"**. Matches the toggle and names what the saving is measured against. |
| 79 | AI Insights | `insightsFigures.ts:87-93` | "TTFT (p95 latency)" `246ms` · "P95 across 3 models" | p95 over `modelLatencySeries` across the full catalog | Platform/ML | FAIL | PASS — the Performance tab | PASS — the sub names its population | PASS for this persona (TTFT is their term) | `keep` | |
| 80 | AI Insights | `insightsFigures.ts:94-100` | "Requests" `6` · "total today" | `decisionLog().length` | Platform/ML | FAIL — inventory | PASS — the deep dive and raw log | PASS | FAIL — "6 requests today" on a gateway screen reads as a broken meter, not a small estate | `demote` | Into the request deep dive, which already opens with the same count in a sentence (row 82). |
| 81 | AI Insights | `insightsFigures.ts:101-110` | "Blocked requests" `0` · "0 policy denials" | `decisionLog().filter(!allowed)` | Platform/ML | PASS — a governance claim | PASS | FAIL — the value and the sub are the same zero stated twice | FAIL | `relabel` | Copy: value `0`, sub **"no request denied by policy today"**. Says the same thing once, in words. |
| 82 | AI Insights | `RequestDeepDive.tsx:58` → `requestAnalysis.ts:68-69` | "6 requests today: 4 allowed, 2 guardrailed, 0 denied. $20.94 spent, $29.96 saved." | `classify()` over `requestRows()` | Platform/ML | PASS — ends on the saving | PASS — every facet below filters from it | PASS | PASS | `keep` | Absorbs rows 80-81 once they demote. |
| 83 | AI Insights | `PerformanceTab.tsx:150-151,171` | "Direct (external) **38ms**" vs "With routing **54ms**" | `directP50`, `routedP50` | Platform/ML | FAIL — routing is *slower*, stated plainly | PASS | PASS — the caption defines both terms | PASS | `keep` | An honest figure that undercuts the pitch. Keep it; the savings figure beside it is what pays for the 16ms. |
| 84 | AI Insights | `SavingsTab.tsx:280` | "OpenAI (external) · **79%**" (share by provider) | spend share | Platform/ML | PASS — 79% of spend leaving for an external model is the savings argument | PASS | PASS | PASS | `keep` | |
| 85 | AI Insights | `SavingsTab.tsx:146-147` | "Predicted **$X**/mo runs over the **$Y** ceiling" | `view.budget` | Platform/ML | PASS | PASS | PASS | PASS | `keep` | |
| 86 | AI Govern | `TokenPolicies.tsx:78` | "**0 / 4** enforced" | `tokenPolicyList().filter(enforced)` | Platform/ML | PASS — the governance gap | PASS — Enforce per row | PASS — the three-state pill below refuses to over-claim | PASS | `keep` | |
| 87 | AI Govern | `TokenPolicies.tsx:126` | Budget column `2,400,000,000` | `p.budget` | Platform/ML | FAIL | PASS | PASS | FAIL — ten digits, unformatted, where the same figure renders as `2.40B` on the layer home (row 11) | `relabel` | Copy: **`2.40B`**, using the existing `fmtTokens` helper. One number, one format, everywhere. |
| 88 | AI Govern | `AgentsPanel.tsx:22` | "**3 / 3** enabled" | `agentList().filter(enabled)` | Platform/ML | FAIL — inventory | PASS — Suspend per row | PASS | PASS | `keep` | Section header counting the rows behind it, same as row 59. |

**Rows: 88.**

## Verdict tally

| Verdict | Count |
|---|---|
| `keep` | 45 |
| `relabel` | 18 |
| `demote` | 7 |
| `cut` | 13 |
| `phase-2c` | 5 |
| **Total** | **88** |

Three rows carry a scoped verdict — row 29 (`cut` its two counts, `keep` its two money
figures), row 31 (`cut` the duplicate stat tiles), row 45 (`cut` the leading count,
keep the descriptive tail). Each is counted once, under `cut`.

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
   Both render on `/discover` at the same time. Rows 5, 20, 29.

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

- **Verdict lines are one row each, not one row per number.** The interface says one
  row per rendered number, but a verdict line is authored, read, and changed as a
  sentence. Splitting "1 of 9 regions are on the AT&T fabric" into four rows would
  have produced four identical verdicts and lost the grammar defect, which lives in
  the sentence and not in any number. The individual numbers are named in the
  derivation cell so Tasks 2-4 lose nothing.

- **Repeated widgets are audited once.** `EstateFiguresWidget` and
  `AssessmentFindingsWidget` render on both layer homes. The estate figures branch on
  surface and so are audited twice (rows 4-7 for NaaS, 14-17 for AI); the assessment
  widget does not branch and is audited once, with "Layer home (both)" in the screen
  column.

- **`cut` was applied to duplication, not just to low value.** A figure that passes
  every test on its own but is the third rendering of the same claim on one screen
  fails T4 in context — a customer reading three numbers assumes three facts. Rows 7,
  8, 28, 33, 38, 40, 45.

- **Raw counts survive in exactly two shapes.** A tab badge or section header counting
  the rows immediately beneath it (rows 59, 88) is honest and instantly legible. A
  count floating in a KPI strip with no rows behind it is not. That distinction is
  what separates `keep` from `cut` across the count rows.

- **Discover keeps its inventory tiles.** The exec critique is about top-level
  low-value data, and Discover is the one screen whose persona — the Cloud & Platform
  Architect — genuinely opens with "what do I have". Clouds, regions, workloads and
  sites are `keep` there and `cut` or `demote` everywhere else.

- **Honest costs are kept.** The "Save, not cost" rule bars savings-framed labels from
  carrying spend figures; it does not bar spend figures. Port fees (row 70) and the
  invoice total (row 75) are literal spend, correctly named, and load-bearing for the
  savings claims beside them.

- **`phase-2c` was reserved for what a copy change cannot reach**: a contradicting
  derivation (rows 2, 26), a missing empty state (row 13), a hardcoded figure posing as
  telemetry (row 44), and an axis formatter (row 74).

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
  `arbitrage().availableSavings` and rows 1, 7, 8 and 69. The advisor chip's
  `$52,961` reconciles against nothing in the table, which is finding 1.
- Counted the table rows and the verdict column independently; both come to 88.

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

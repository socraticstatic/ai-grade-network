# NAAS / Cloud Control / AI Fabric - Brainstorm Notes

**Session:** Friday, August 7, 2026 (reconstructed Sunday Aug 10 from transcript excerpts, Micah's notes, and the advisor demo video)
**People:** Micah Boswell, Jared Peterson, Santosh Pandey. Ramesh referenced (filmed a demo video, heading into PTO). Santosh wants his points raised in the brainstorm with Ramesh and will sync with him after PTO.
**Inputs:** Teams transcript fragments, Micah's raw notes, `Video Project 261111.mp4` (48s silent screen demo of an "AT&T Business Advisor" wizard), `NaaS_Portal_Values_User_Journey.pptx` (8-slide value-map deck, reviewed Aug 10).

---

## 1. The core critique

### Too many data points at the top level
The leadership concern: we are not showing high-value metrics - we are showing too many metrics. The volume makes it hard for teams to read the screen. Top level needs a few numbers that matter, with everything else on demand.

### Jared's user lens
Jared's evaluation frame, in his words:
- "I'm interested in saving money."
- "If I just go, is it clear and connected, or does it feel like bounce around?"
- "Is it the right measurements with the right labels?"

Three tests for every screen: savings-first, connected flow (no pogo-sticking), correct metrics with correct labels. This aligns with the existing "Save, not cost" vocabulary rule.

### Santosh's data lens
Santosh is data-focused: "If the chat makes sense to me, I'm happy with it." But his hard requirement is legibility for everyone else: "For me to explain that chat to everybody, or a customer to get it in two seconds - I can't do that." The two-second test: a customer must get the point of any chart without explanation.

---

## 2. The scale problem

The Sankey and the "AT&T Fabric" infographic are great - but they do not survive contact with real enterprise customers.

A customer like Wells Fargo, with ATMs and banking locations, has **thousands of sites** on the left side of the diagram. Neither visualization covers that volume.

What's needed:
- A **top-level rollup** view - aggregate first, never thousands of individual nodes.
- A **filtering mechanism** - carve the estate down by region, site type, business unit, connection type, whatever the customer's mental model is - before the flow diagram renders individual entities.

Note: the Discover estate filter chips shipped last week (chips scope tree and map, rollups first) are the same pattern. The Sankey / Observe flow needs the equivalent.

---

## 3. The advisor entry point (the big new direction)

One participant wants the entry point to the product to be an **advisor**, not a dashboard.

The shape of it:
- **Discover assesses.** It scans the customer's estate and converses with the user about what it found.
- **The advisor offers solutions**, not just data: NetBond Advanced, tiered options, packaged solutions matched to issues spotted during discovery.
- **Progressive deepening.** The advisor asks for more: "give us more information" or "let us scan deeper."
- **Proactive findings** phrased as observations: "We noticed you're using untracked AI."

This turns Discover from an inventory screen into a consultative flow: assess, converse, recommend, deepen.

---

## 4. Video walkthrough - AT&T Business Advisor UX (the reference pattern)

The 48-second demo (silent, screen-capture) shows a consumer-grade version of exactly this pattern, on the AT&T Business Fiber marketing page. Frame-by-frame:

1. **Entry banner** on the product page: "Not sure what you're looking for?" tagged "New - AI-powered." Copy: tell us your business name and address, we'll analyze your locations, your industry, and what similar businesses use - then build a bundle for you in minutes. Proof chips: "Locations analyzed," "Fiber availability," "Security fit." Single CTA: Get started.
2. **Minimal intake modal** ("AT&T Business Advisor - Tell us about your business"): two fields only, business name and address. Inline "Address verified" confirmation. Trust copy: "We use public business listings to speed this up. No credit check required."
3. **Visible analysis steps** while it works, checked off one by one: Finding your Google Business Profile → Reading Yelp reviews and category signals → Scanning your website, hours, and locations → Checking AT&T Fiber and 5G coverage at each site. Status line: "Analyzing your business needs."
4. **Advisor workspace** (full page, two panes). Left rail: "Your AT&T Business Advisor - recommendations update as you change your bundle," with conversational narration ("Got it - I've pulled coverage and profile data for your Dallas location," "Fiber and strong 5G are confirmed at your site, so I can build one converged bundle," "Here's what businesses like yours run..."). Right pane: recommendation canvas, skeleton-loading while the bundle builds.
5. **Savings-led recommendation.** Headline card: "Your recommended bundle - You save $100.00/mo." Then itemized product cards (Fiber 1 GIG $90, Wireless Premium 6 lines $318, iPhone 17 devices $138), each with an inline evidence note ("92% of cafés with daily delivery-app volume run 1 GIG or faster," "Businesses your size typically staff 1 line per shift manager"). Sticky footer: bundle total $571/mo, "You save $100.00/mo with bundling," Checkout.
6. **Evidence chips and why-popovers.** Left rail chips: "78% choose this mix," "1 GIG most common speed," two customer stories. Clicking a chip opens "Why we recommended this mix" - e.g. "78% of cafés with 10-50 employees choose fiber + wireless + security together," sourced "Based on anonymized AT&T Business customer data for food & beverage businesses of a similar size in Texas."
7. **Editable, re-checked.** "You can change any product on the right and I'll re-check your savings instantly." Suggested questions seeded in the chat: "Why this internet speed?" "Can I add locations later?" "How much do I save?"

### UX patterns worth stealing for NAAS Discover
- Minimal intake, maximum inference - two fields, then the system does the work.
- Analysis is theater with receipts - each scan step named and checked off, so the recommendation feels earned.
- Every number carries its evidence inline, with a "why" one click away, sourced from peer data.
- Savings is the headline; itemized spend is beneath it.
- Chat narrates, canvas shows - conversation on the left, artifacts on the right, never chat-only.
- Recommendation is a starting point the user can edit, with instant savings re-check.
- Trust signals at the moment of ask (address verified, no credit check, anonymized data).

### Enterprise translation
Consumer intake = name + address. NAAS intake = org + a scoped estate scan (or LMCC / existing inventory). Consumer evidence = Yelp and Google. NAAS evidence = flow logs, discovered connections, utilization, egress spend. Consumer output = a bundle with checkout. NAAS output = packaged solutions (NetBond Advanced, tiers) with a savings figure and a path to Connect.

---

## 5. Value deck review - NaaS_Portal_Values_User_Journey.pptx

8-slide deck, "NaaS Portal UX Concepts, Screen by Screen Value Displays." Its sources: Ramesh's Aug 4 "Cloud Control - NaaS weekly" email and the Cloud_Fabric_with_Control_MVP-v1 doc. The weekly asked Dev Patel, Jared, and Santosh to go screen by screen and say what should be displayed as value.

### The mandate (slide 1)
Network, cloud, and customer data must flow from cloud locations to the portal; the portal analyzes it and shows key pieces of value screen by screen. Three-step arc: **Discover → Contextualize → Show value** (collect credentials and crawl the estate → join cloud inventory to AT&T access, SD3 status, utilization, path data → surface visibility, cost, bottlenecks, and policy actions customers can understand). Data inputs named: IAM, SPN, SD3, INSTAR.

### The value map (slide 2) - flagged "this is something we should brainstorm and identify for UI"

| Stage | Persona | Job to be done | Value the screen shows | Proof metric |
| --- | --- | --- | --- | --- |
| Discover | Cloud & Platform Architect | See what I actually have across every cloud | One normalized inventory - no console hopping | Accounts, regions, workloads, tags discovered |
| Attach / Connect | Network Engineer, NetOps | Stand up a private path in 10 minutes, no ticket, no hardware | Guided path build in the portal, path state you can trust | Time to first connection, path state |
| Observe | FinOps + NetOps / SRE | Know where traffic, cost, and bottlenecks are | Avoidable egress spend and bottlenecks, dollars saved quantified, up/down recommendations | Traffic coverage %, $ saved, bottlenecks, route optimization |
| Govern | Security & Compliance | Enforce policy once across all clouds | Tag-based policy with simulate-before-enforce, risk and savings known first | Policy gaps closed, public paths removed |

**Design rule stated in the deck:** every screen states value in the user's language first, then exposes raw data underneath for trust. "Value on top, evidence below." This is the same principle as the advisor's evidence-inline pattern, and it answers Santosh's two-second test.

### Screen concepts (slides 3-6)
- **Discover:** credential intake (provider, auth type, scope, read-only permission, daily refresh) → four KPI tiles (accounts 3, regions 12, workloads 322, tags 148... illustrative) → normalized inventory table with drill-down on everything. Developer data contract spelled out (tenantId, provider, resourceType, cidr, tags, state, discoveredAt).
- **Connect / Topology:** end-to-end path as one view - customer network → AT&T fabric (NaaS Hub IPE/TAO, AT&T core) → cloud subscription. Three use cases: ingress site-to-cloud, egress cloud-to-internet/WAN, optimal cloud-to-cloud. Selected-path detail is a typed object (sourceEndpoint, accessType, gatewayType, router, privateLinkEndpoint, pathState). Key line: **"Path can be converted to recommendation."**
- **Observe:** four tiles - traffic coverage 84%, monthly savings $18.4K, bottlenecks 5, policy gaps 3 - over a traffic-flow view (Internet / AWS / Azure / GPU cloud / branches around an AI Fabric hub; "65% private path, 18% avoidable egress"). Recommendations generated from data, typed by trigger: Path (latency/loss → move traffic private), Cost (egress → save $6.2K), Policy (tag=PCI on internet → force private + NGFW), Capacity (utilization → upgrade 1G to 10G). Actions: view path evidence, create policy action.
- **Govern:** policy action composer - groups built from discovered tags (west-branches, pci-workloads, internet-facing, ai-training) → intent ("allow only private path") → service insertion (NGFW, Palo Alto) → routing action → **simulate first, enforce later**, with simulated impact quantified (47 public paths removed, 3 gaps closed, $6.2K/mo est. savings) → request approval.
- **Developer handoff:** data dictionary across four domains - cloud inventory, AT&T network inventory, telemetry and cost, policy and action. Principle restated: latencyMs and egressGb become a bottleneck warning and a dollars-saved recommendation.

### Competitive benchmark (slide 8)
Benchmarked against Aviatrix CoPilot, Alkira + Lumen Cloud Insights, Cisco Multicloud Defense. The structural argument: **all three are software overlays that only see the cloud side. AT&T owns the network.** Win on:
- End-to-end visibility: premises → AT&T backbone → on-ramp → cloud workload, stitched as one graph - the AT&T access side (INSTAR, circuits) no software vendor can see.
- Egress arbitrage that actually re-routes traffic through AT&T to cut cloud egress, with $ saved per workload.
- Tag-driven intent policy on the private path, reusing NetBond VNFs (Palo Alto).
- Native AI/GPU connectivity as a first-class use case: Nvidia PDN (>30 Tb/s routes), AWS Interconnect last mile. (Alkira does agentless shadow-IT discovery - our "we noticed untracked AI" finding is the same move, but backed by network-side evidence.)

Demo videos referenced: Aviatrix CoPilot (youtube.com/watch?v=pJAqEAsOoFI), Alkira overview (youtube.com/watch?v=Je4iQFSb5qY), Cisco Multicloud Defense (youtube.com/watch?v=zzrByzkdBhQ).

### How the deck maps to the brainstorm critique
- The deck's "value on top, evidence below" rule *is* Jared's three tests and Santosh's two-second test, stated as a design principle. The brainstorm and the deck agree on principle; the fight is about metric count.
- Each screen carries exactly four KPI tiles. That is already a rollup discipline - but the brainstorm critique still applies inside the tiles: are these the four highest-value numbers, and does the Wells Fargo case survive the inventory table and topology view without rollup+filter?
- "Path can be converted to recommendation" and the Observe recommendations table are the advisor concept in embryo - the deck generates recommendations from data; the advisor direction wraps them in assess-converse-recommend-deepen.
- The persona column (Architect, NetOps, FinOps, Security) gives the advisor its audiences: findings should speak the persona's language per stage.
- The govern pattern (simulate before enforce, impact quantified first) is the trust mechanic the advisor needs when it proposes packaged solutions.

---

## 6. Tensions to resolve

- **Advisor chat vs. the two-second test.** Santosh's warning applies directly to the advisor concept: chat that makes sense to the person who built it is not chat a customer gets in two seconds. The demo's answer - chat narrates, canvas carries the payload - is probably the resolution. The recommendation must stand on its own if the chat rail were deleted.
- **Advisor entry vs. summary-band Discover.** Current Discover leads with one summary band and breakdown on demand. The advisor is a flow, not a band. Are these two modes of the same screen (assess-me vs. show-me), or does the advisor become the first-run experience and the band the return visit?
- **Volume vs. narrative.** The Sankey mandate (Observe is the money screen) collides with the Wells Fargo problem. Rollup-then-filter has to come before flow rendering at enterprise scale.

## 7. Candidate next steps

- Sketch a top-level rollup + filter treatment for the Sankey / Fabric infographic (thousands of sites → grouped left-column with drill-in).
- Prototype the advisor entry for Discover: intake → visible scan steps → findings with evidence → packaged recommendations ("We noticed you're using untracked AI" as the flagship finding).
- Audit top-level metrics on every screen against Jared's three tests: savings-first, connected, right measurement with the right label. Cut what fails.
- Get Micah working staging access (current URLs all resolve to the old build; only the Figma is current).
- Ramesh syncs with Santosh post-PTO; bring Santosh's data-legibility points into that session.
- Pressure-test the deck's four-tiles-per-screen KPI sets against the "too many / wrong metrics" critique: for each stage, which single number would the persona pay for?
- Wells Fargo-scale the deck's screens: the Discover inventory table and Connect topology need the rollup+filter treatment before they hold thousands of sites.
- Fold the advisor concept into the deck's arc: Discover → Contextualize → Show value → **Recommend** (the deck's "path can be converted to recommendation" + Observe recommendations table are the seed).
- Watch the three competitor demo videos (Aviatrix, Alkira, Cisco) before the next session; steal presentation-of-value patterns, not features.

# Monday demo, 2026-10-05: the notes, walked

Growing estate, Network Eng persona, 1440 x 900. Eight beats, about twelve minutes.
`node scripts/demo-walk.mjs` clicks every beat below on a fresh profile and asserts the words in quotes. Run it the morning of the demo.

Before you start: open the storefront, click **Reset demo** at the foot of the left rail, and check that Estate reads **Growing** and Persona reads **Network Eng**.

## 1. Discover: add a source, and discovery finds it

- Rail: **Sources**. Let the scan finish (four beats, about three seconds).
- **+ Add a source**, pick **Oracle**, then **Add and scan**.
- The alert reads "Discovery found 2 Oracle regions, 3 VCNs and 70 workloads. Both ride the public internet."
- The counts at the top move: 4 clouds, 9 regions, 373 workloads.
- **See what it found** drills into Oracle in place: us-ashburn-1 and eu-frankfurt-1.

Say: a new source is a credential, not a project. The hierarchy and the workloads arrive with it.

## 2. Your sites and Your clouds

- **Your sites**: region, then state, then the state's sites with their service and bandwidth. Never a flat list.
- **Your clouds**: the tiles count clouds and how they attach, and they follow the drill.

## 3. Observe > Traffic: a pick keeps its proportion

- Rail: **Traffic**. **By cloud**, then **GCP**.
- "Sites on AT&T" reads "0 of 25": GCP rides IPsec only. The right column reads "Destinations · at estate scale", so GCP sits beside everything else, not blown up to fill the frame.
- **Whole estate** to clear.

## 4. Health: is it up

- Tab: **Health**. Finance is red on the ExpressRoute cloud link, and red at the app.
- Open problems, ranked by apps affected: "Azure eastus · ExpressRoute", "BGP flapping", owner "Cloud provider", 1 route change 3 minutes before it started.
- **Open ticket**: the row reads "T-nnnn · In progress", and the same finding reads In progress under Insights.
- Optional: **By segment** shows the stakeholder's nine rows, each with its owner and its source. Hub, exit and DNS read "Not yet measured".
- Optional: **Trace** opens **Paths** on finance through eastus, where the hops add up to Site to app and the cloud link shows 0.31% loss.

## 5. Capacity: is it full

- Tab: **Capacity**. Each connection shows what was bought, the peak, the 6-month average, the headroom, and when it fills.
- AWS us-east-1 is bought bigger than it is used: 3 x 10 Gbps, peak 41%. Two ports hold the peak.

## 6. Cost: what should I change first

- Rail: **Optimize**. Four moves in the stakeholder's words: Spend, **Update connection type**; Routing, **Update routing policy**; Resiliency, **Add backup path**; Capacity, **Resize**.
- Spend plus Routing equals the Observe head's potential savings.
- Tab: **By leg**. Site access, Cloud connectivity, Cloud provider. AT&T charges are catalog prices. Other providers' list prices wear **Modelled**, and the source for each price is in the code. Spend this month stays egress.

## 7. Insights: Your actions and Operations

- Rail: **Insights**. It lands on **Your actions** for Network Eng: health problems and latency over SLO on the left, and that role's findings on the right.
- **Do it** is visible, disabled, and reads "Coming soon". **Accept** and **Defer** work; Defer snoozes the finding to the next monthly briefing.
- Tab: **Operations**. "1 Sev 1 open now. N tickets open. Fixes took 20h 31m on average." The fixed list is labelled sample history.
- Optional: **Monthly briefing**, Andi's four to six sentences for the role, built from the same figures. Nothing sends.

## 8. The Estate switch (F2)

- Rail: **Options**. Growing reads "7 of 9 regions still ride the public internet" (Oracle's two regions joined it in beat 1).
- Estate, at the foot of the rail: **Established**. Every page recomputes: "1 of 8 regions still ride the public internet."
- The answer to the stakeholder's question is Appendix A of the plan (docs/superpowers/plans/2026-09-30-notes-monday-demo.md).

## If something goes sideways

- **Reset demo** clears tickets, deferrals, tags and added sources. Oracle comes off with it.
- A time on the page reads today's clock. Problems start 22 and 47 minutes before now, so the story holds whenever you run it.
- Things that are shown but not live yet: ticket sending, briefing sending, Do it, and the reference design for Your actions (still owed by the stakeholder).

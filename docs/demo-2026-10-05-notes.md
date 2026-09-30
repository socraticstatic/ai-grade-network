# Monday demo, 2026-10-05: the notes, walked

Growing estate, Network Eng persona, 1440 x 900. Nine beats, about thirteen minutes.
`node scripts/demo-walk.mjs` clicks every beat below on a fresh profile and asserts the words in quotes. Run it the morning of the demo.

Before you start: open the storefront. It opens on the NaaS home. Click **Reset demo** at the foot of the left rail, and check that Estate reads **Growing** and Persona reads **Network Eng**.

## 0. The NaaS home: the whole network at a glance

- Rail: **NaaS**. "Good morning, Network Eng" (the greeting follows the clock in Chicago time).
- Under it, the Observe head: "13 findings open. $41,500/mo potential savings. 1 Sev 1 open now."
- **Andi's briefing** on the left is the Monthly briefing's text for the role. **Waiting on you** on the right is the first three of Your actions, with the same Accept and Defer; Do it reads "Coming soon".
- The five areas, each figure from the page its door opens: Discover "25 sites · 3 clouds", Connect "5 of 7 regions", Observe "1 of 2 connections", Govern "166", Cost "$41,500/mo".
- **Now**: the eastus flap, "Azure eastus · ExpressRoute", "BGP flapping", with Trace.
- Click **Executive** in the role chips: the briefing and the rows change to the executive team's. Click **Network Eng** to come back.

Say: one page for every role. The role changes what the top band says; the strip and Now are the same for everyone.

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
- The row already reads "T-nnnn · opened by Andi": Andi opens a ticket for each new incident, so there is no Open ticket to click. Operations > Tickets (beat 7) lists the same number.
- Optional: to open one by hand, turn Andi off under Operations > Tickets. Open ticket then shows here and there alike, and the row reads "T-nnnn · In progress", the same number.
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
- Tab: **Tickets**. The eastus incident carries the T-nnnn Health showed in beat 4, opened by Andi. With Andi off, an incident with no ticket still lists here as "No ticket yet", and the line counts it as an incident, not a ticket.
- Optional: **Monthly briefing**, Andi's four to six sentences for the role, built from the same figures. Nothing sends.

## 8. The Estate switch (F2)

- Rail: **Options**. It still reads the Connect verdict: Growing reads "7 of 9 regions still ride the public internet" (Oracle's two regions joined it in beat 1).
- Rail: **NaaS**. The home reads "14 findings open" and "25 sites · 4 clouds" now that Oracle is in.
- Estate, at the foot of the rail: **Established**, while on the home. Every figure recomputes: "10 findings open", "221 sites · 4 clouds", and Waiting on you lists Established's "3 paths send no telemetry", not Growing's rows.
- Rail: **Options**: "1 of 8 regions still ride the public internet."
- The answer to the stakeholder's question is Appendix A of the plan (docs/superpowers/plans/2026-09-30-notes-monday-demo.md).

## If something goes sideways

- **Reset demo** clears tickets, deferrals, tags and added sources, and turns Andi's tickets back on. Oracle comes off with it.
- A time on the page reads today's clock. Problems start 22 and 47 minutes before now, so the story holds whenever you run it.
- Things that are shown but not live yet: ticket sending, briefing sending, Do it, and the reference design for Your actions (still owed by the stakeholder).

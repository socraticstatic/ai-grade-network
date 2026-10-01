# Monday demo, 2026-10-05: the notes, walked

Growing estate, Network Eng persona, 1440 x 900. Nine beats, about thirteen minutes.
`node scripts/demo-walk.mjs` clicks every beat below on a fresh profile and asserts the words in quotes. Run it the morning of the demo.

Before you start: open the storefront. It opens on the NaaS home. Click **Reset demo** at the foot of the left rail, and check that Estate reads **Growing** and Persona reads **Network Eng**.

## 0. The NaaS home: the whole network at a glance

- Rail: **NaaS**. The role chips sit on top, with **Andi's briefing ›** at the right; it opens the Monthly briefing.
- The take-away is the worst live thing for the role: "Azure eastus is down", then "Finance rides it · 40 workloads · 22 min", and **Trace it**, which opens Paths on finance through eastus. Each counted part opens the set it counts.
- Four snapshot cards, each a picture and the figure its door opens: Apps "5 of 8" apps healthy (a dot per app), On AT&T "2 of 7" regions private (the ring), Egress "$89,600/mo" today with the fork to "$51,100/mo" in 90 days, Exposed "54 of 303" workloads exposed, Discover's own word (a hundred cells, 18 lit).
- **Waiting on you** lists only what still waits: three chips, each with **Accept**: "5 regions send no flow logs", "1 region runs above the latency SLO", "6 paths send no telemetry". The IPsec finding is already acknowledged, so it is in Your actions, not here; "All 4 in Your actions ›" opens them. Each role sees its own work: "Azure eastus has one path" is the Architect's.
- At the fold: "What you have", "1 connection down", "5 regions without flow logs", then Connect's network map below. The home has no Lens control, so its wires say whose path each is ("AT&T and private paths", "public internet (dashed)") and each cloud's dot is Health's state, keyed: Azure's square is red (Down), AWS's dot purple (Over SLO).
- Click **Executive** in the role chips: "$41,500/mo on the table", "3 moves · 1 outage on Finance", and Egress leads the cards. Click **Network Eng** to come back.

Say: one page for every role. The role changes the take-away and the cards; no card repeats the take-away, and every figure opens the page that prints it.

## 1. Discover: add a source, and discovery finds it

- Rail: **Sources**. Let the scan finish (four beats, about three seconds).
- **+ Add a source**, pick **Oracle**, then **Add and scan**.
- The alert reads "Discovery found 2 Oracle regions, 3 VCNs and 70 workloads. Both ride the public internet."
- The counts at the top move: 4 clouds, 9 regions, 373 workloads.
- **See what it found** drills into Oracle in place: us-ashburn-1 and eu-frankfurt-1.

Say: a new source is a credential, not a project. The hierarchy and the workloads arrive with it.

## 2. Your sites and Your clouds

- **Your sites**: region, then state, then the state's sites with their service and bandwidth. Never a flat list.
- **Your clouds**: the tiles count clouds and how they attach, and they follow the drill. Each cloud and region carries its egress a month, the number Cost shows for it: AWS reads $51,000/mo egress.
- **At a glance**: every count is a door. Click "70 workloads exposed" on the Apps ring: Your clouds lists exactly those 70, named "Exposed workloads", with **Set policy** and **Ask Andi** beside them. Set policy carries the 70 into Govern: Simulate reads "70 matched". Spend beside the rings reads $135,650/mo, Cost's own figure.

Say: every number opens what it counts, and where it lands you can act on it.

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

- Tab: **Capacity**. Each connection shows what was bought, the peak, the 6-month average, the headroom, and when it fills. The average is the same figure in the drawer and in Cost > Optimize, whatever Since reads.
- AWS us-east-1 is bought bigger than it is used: 3 x 10 Gbps, peak 41%. Two ports hold the peak.
- Optional: click the AWS us-east-1 row. Its panel opens in place; **Modify bandwidth** is its first action. The drawer is NetBond Advanced's: pick 2 x 10 Gbps and the price stays $1,800/mo, the one Cost bills for the region. **Apply change** asks for approval (j.martinez on the estate's domain), **Submit** places the order, and **View in Orders** shows it under Connect > Orders, Submitted for approval, taking effect the next business day. A size short of the peak reads red and asks a second time. Escape or a click outside closes it.
- If you rehearse the order, **Reset demo** clears it.

## 6. Cost: what should I change first

- Rail: **Optimize**. Four moves in the stakeholder's words: Spend, **Update connection type**; Routing, **Update routing policy**; Resiliency, **Add backup path**; Capacity, **Resize**.
- Spend plus Routing equals the Observe head's potential savings.
- Tab: **By leg**. Site access, Cloud connectivity, Cloud provider. AT&T charges are catalog prices. Other providers' list prices wear **Modelled**, and the source for each price is in the code. Spend this month stays egress.

## 7. Insights: Signals, Your actions and Operations

- Rail: **Insights**. It lands on **Signals** for Network Eng: **Health** ("2 problems · 2 apps affected"), **Latency over SLO** and **Capacity** lead. Each row carries its move beside its figure: **Trace** on the eastus flap and the eu-west-1 spike, **Attach** on the westeurope flows over the 100 ms SLO (westeurope is not on AT&T yet), **Resize** on us-east-1. Cloud-to-cloud offers **Steer** only on us-east-1 to eastus, whose two ends are on AT&T.
- Every figure is a door. A row opens the one thing it counts, a card's title opens its full list in place, and the count at its foot opens those findings. The role chips over the cards change which three lead.
- Tab: **Your actions**, that role's findings, each with its recommendation. **Do it** is visible, disabled, and reads "Coming soon". **Accept** and **Defer** work; Defer snoozes the finding to the next monthly briefing.
- Tab: **Operations**. "1 Sev 1 open now. N tickets open. Fixes took 20h 31m on average." The fixed list is labelled sample history.
- Tab: **Tickets**. The eastus incident carries the T-nnnn Health showed in beat 4, opened by Andi. With Andi off, an incident with no ticket still lists here as "No ticket yet", and the line counts it as an incident, not a ticket.
- Optional: **Monthly briefing**, Andi's four to six sentences for the role, built from the same figures. Nothing sends.

## 8. The Estate switch (F2)

- Rail: **Recommended**. It prints the Connect verdict: Growing reads "7 of 9 regions still ride the public internet" (Oracle's two regions joined it in beat 1).
- Rail: **NaaS**. The On AT&T card reads "2 of 9" now that Oracle is in.
- Estate, at the foot of the rail: **Established**, while on the home. Every figure recomputes: the take-away leads with the outage, "AWS eu-central-1 is down", "2 apps ride it · 96 workloads", On AT&T reads "7 of 8", and Waiting on you lists Established's "3 paths send no telemetry", not Growing's rows.
- Rail: **Recommended**: "1 of 8 regions still ride the public internet."
- The answer to the stakeholder's question is Appendix A of the plan (docs/superpowers/plans/2026-09-30-notes-monday-demo.md).

## If something goes sideways

- **Reset demo** clears tickets, deferrals, tags, added sources and bandwidth changes, and turns Andi's tickets back on. Oracle comes off with it.
- A time on the page reads today's clock. Problems start 22 and 47 minutes before now, so the story holds whenever you run it.
- Things that are shown but not live yet: ticket sending, briefing sending, Do it, and the reference design for Your actions (still owed by the stakeholder).

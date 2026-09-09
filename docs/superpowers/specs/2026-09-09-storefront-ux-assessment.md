# NaaS storefront: UX, UI, task-flow and product-strategy assessment

Date: 2026-09-09, 13:50 CDT, against live build 30
Method: walked home and the four pages at 1440 with the rail open and Andi closed; measured page height, cards and buttons per page; tested the drills a user would try; read every dollar figure on screen.

## Measurements

| Page | Height (px) | Cards | Buttons | Dollar figures on screen |
|---|---|---|---|---|
| Home | 957 | 4 | 11 | 1 ($61,400/mo already saved) |
| Connect | 1,473 | 0 | 14 | 3 rates ($/GB) |
| Observe | 2,790 | 8 | 16 | 1 total, 10 rates |
| Govern | 1,285 | 0 | 10 | 0 |
| Cost | 2,622 | 5 | 15 | many, in tables |

Drills tested: on Connect, clicking a region opens its VPCs in the picture and clicking Branches opens its metros. Both work. Nothing on the picture says they will.

## Micah's two questions

**Why can't I drill down into the Connect graph?** It drills, but it does not look like it. On Connect the picture wears the lens overlay: edge labels "private" and "public" sit on the wires, the legend says "hover a region to compare the three paths," and hovering opens a compare card that competes with the click. There is no affordance for the drill: no chevron on a row, no cursor cue, no hint, no first-run reveal. And the drill state is global: drilling on Connect and then opening Cost shows Cost with the picture already drilled to Branches and us-east-1, with a breadcrumb the Cost page never asked for. The picture is one object, but each page dresses it differently, so a user reads it as five graphs, none of them obviously interactive.

**Why is page content inside other pages?** Because the pages became stacks. Observe is 2,790 pixels with eight cards: tiles, an alert, a connections table, an impact panel, a Sankey, five pattern lists, a records table that opens inside, and a "next stop" that argues the next page's case. Connect carries a catalog of three products and a finding box beneath its own picture. Cost has eight sections. The model drifted from "one question, one visual, one action" to "everything we know about this word."

## Do executives see where they save?

No, not at a glance. Money appears once on home, as a past tense total. Where it is saved and where it could be saved lives on Cost, in tables, 2,600 pixels deep. The picture, the one thing an executive will look at, carries no money at all except a $/GB rate on the Connect lens. Ramesh said the landing presents "the baseline and value AT&T can upgrade." The baseline is on the picture. The upgrade value is not.

## Can I drill down from above?

Inside the picture, yes, both sides, and the Sankey splits. From above, no. The numbers on home and on the tiles do not drill; they jump to a page that restarts the story with its own copy of the picture. A dollar figure never leads to the region that produces it. A degraded count never leads to the edge that is degraded. The picture and the Sankey drill independently of each other and of the numbers.

## Is this an actionable story?

Half. The loop is in the copy: every page ends with the next word. The actions are not in the flow: Observe offers 16 buttons, Cost 15 with Attach three times and Steer four times, Connect a catalog. Ramesh framed each bucket with two questions, "what can I show you, what actions do I want you to take." Today each page shows a lot and asks for many things. No page has one primary action that the drill leads to.

## Product strategy, re-assessed

The product is the fabric picture as the console. The selling motion is visibility-led, so the picture must carry the two things a buyer pays for: risk and money. Everything else is a drawer.

1. **One page model.** The picture on top, always the same object with its own state per page, never leaking. Under it one question line in the estate's numbers, one primary action, one supporting panel. Detail on selection opens beside the picture, not below it.
2. **Money on the picture.** Public edges carry "$N/mo on the table." Fabric edges carry "$N/mo saved." The band carries the total. This is the executive's five seconds.
3. **Drill from above.** Numbers are the top of the drill. "$61,400/mo" highlights the edges that produce it. "1 of 7 connections degraded" highlights the amber edge and selects it. The Sankey follows the picture's selection. Records open in the drawer for the selected thing.
4. **Observe more visual.** Utilization belongs on the edges: thickness is used, outline is purchased. The connections table becomes a strip of bars beside the picture. The five pattern lists collapse into the Sankey's destinations. One chart, not nine cards.
5. **Cut.** Connect keeps the picture, the verdict and Attach. Govern keeps the picture, the violations and Author. Cost keeps the picture with money on it and one arbitrage table. Observe keeps the picture with utilization, the Sankey and the impact drawer.
6. **Affordance.** Rows that open get a chevron. The first visit reveals a drill once. The legend says "click," not "hover."

## The story, as it should read

Existing customer: home shows the picture with $ on the edges and one amber link. Headline: "$40,800/mo on the table. One connection degraded, 96 workloads behind it." Click the dollar: the public edges light. Click a region: its VPCs. Click Attach. Click the amber link: the impacted workloads, the policy that would hold them, Author. Four clicks, two actions, never leaving the picture.

New customer: Connect asks for one credential, scans, and the picture draws itself. Then the same story.

## What to keep from today

The lane outside the fabric, the in-place drills, the Sankey split, the two confidence levels on impact, the four words, the honest data rules (resource names for private, unresolved for public, no Shadow SaaS).

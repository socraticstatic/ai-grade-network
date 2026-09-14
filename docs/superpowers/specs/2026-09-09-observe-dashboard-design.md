# Observe dashboard: deep-drillable

Date: 2026-09-09
Status: design for approval, not built
Frame: a dashboard, one of five. No narration. Numbers, states, deltas, a queue, a panel, actions on the thing.

## Layout (1440, rail open)

```
tiles      Throughput · Utilization vs purchased · P95 · Loss · On fabric · each with delta, each a filter
queue      degraded · saturating · blind · over SLO   (state, age, one action each)
map        the live flow map, full width, drillable to the flow record
strip      connections as live gauges under the map (used vs purchased, 24h line, state)
panel      right side, on selection: Overview · Impact · Records · Actions, with the drill trail
```

Time is a control across all of it: window (7d, 30d, 90d), a scrubber for the last 24h with replay, refresh.

## The live flow map

The Sankey becomes the primary visual and the drill surface.

- Three bands: sources (sites by class, workload groups by tag, cloud-to-cloud), paths (AT&T fabric, outside the fabric), destinations (cloud regions, AI endpoints, object storage, internet, inter-cloud).
- Ribbons animate with throughput and are colored by state: fabric blue, public slate, degraded amber pulse, over SLO red sleeve. Thickness is Gbps.
- **Semantic zoom.** Click a node and it opens in place: its children replace it, siblings fade to 30 percent, the rest of the map holds. Site class → metro → site → circuit. Tag → region → VPC → subnet → workload. Destination → resource (private) or ip (public, unresolved). Every level is one click; Escape or the trail climbs back.
- **Follow the flow.** Hover a node and every ribbon through it lights; the tiles re-count for that node only.
- **Compare.** Pin two nodes (shift-click) and the panel shows them side by side.
- **What changed.** A toggle recolors ribbons by delta against the prior window: grew, shrank, new, gone.
- Keyboard: arrows move between siblings, Enter opens, Backspace climbs, / opens Jump (any region, site, VPC, workload by name).

## Connections strip

One gauge per attached connection: ring of used against purchased, the 24h line inside, state dot, BGP and drops on hover. Click selects the connection: the map filters to its traffic and the panel opens on Impact. Saturating gauges carry Add a port.

## Panel (on selection)

- **Overview.** The numbers for the selection under the window: Gbps, P95, loss, on-fabric share, $/GB, deltas.
- **Impact.** For a connection or region: the two confidence levels (directly impacted, possible impact by account), the resilience line, the VPCs and workloads behind it, the partners they talk to. Each row drills the map.
- **Records.** Flow logs for the selection, private destinations as resource names, public as ip. Group by, export.
- **Actions.** The one or two that fit: Add a port, Steer, Attach, Author a policy for these workloads.
- The trail across the top of the panel is the drill (Branches › Atlanta › BR-ATL-0100 › AWS us-east-1) and climbs on click.

## Tiles and queue

Tiles: value, unit, delta against the prior window, state color. Click filters the map (Loss colors ribbons by loss; Utilization colors connections by headroom). Queue rows: what, where, how long, one action; click selects on the map.

## Data honesty

Nothing shown the data cannot say. Public destinations stay unresolved. Application layer stays out. Every figure derives from the same flows the map draws.

## Not in this design

The five pattern lists (folded into destinations), the connections table (now gauges), Anomalies, Event stream, Flows and paths, next-stop rows, verdict sentences.

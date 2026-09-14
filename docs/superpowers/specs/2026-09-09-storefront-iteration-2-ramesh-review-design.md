# NaaS guided storefront, iteration 2: what Ramesh prescribed

Date: 2026-09-09
Status: approved in conversation (Micah, 12:26 CDT), building
Applies to: the static prototype in `socraticstatic/naas-design-scope` (`NaaS Storefront.dc.html`, `naas-*.js`). Not the React app.
Source: `docs/meetings/2026-09-09-ramesh-storefront-review-transcript.md` (timestamps below refer to it)
Constraints from Micah: keep the shell, keep the fx filter grammar, so the Israel team can port it. Start with less.

---

## 1. What Ramesh prescribed

- **Start with less. Three sections** (4:15). The top-level page, one Observe section "similar to what we just went through with the AI Fabric," and a Govern section.
- **Four launch-off points** (5:18, 23:09): Connect, Observe, Govern, Cost. A new customer goes to Connect. An existing customer goes to Observe. Observe starts the flywheel and pushes toward Govern.
- **The top-level view** (1:44, 22:47). Left: sites and users. Middle: what rides the AT&T fabric. Also a lane for what does not, tagged third party or internet. Right: where it goes. Left explodes on Santosh's view, right on the discovery tree, without losing context. Grouping logic at scale.
- **The landing is baseline plus upgrade** (2:25, Dev). Not "see what I have." The unknowns: overutilized links, degraded links, links the fabric would carry for less, compliance gaps. Buckets: connectivity, performance and reliability, cost, security and governance (0:06).
- **Observe shows both layers** (9:24). "Here the network is the main product." The network level is what Dev showed in NetBond Advanced's monitor: utilization current and average, in and out, up or down, BGP, packet drops. Then the correlation: "you had five connections of which one is experiencing this problem. Here are the workloads impacted. These workloads talk to these other workloads."
- **Two confidence levels** (10:05, Dev). AT&T terminates in the VPC or VNet: directly impacted, resilience-aware. Customer-owned Direct Connect or ExpressRoute: visibility ends at the gateway, so "possible impact in account X."
- **Purchased versus utilized** (12:14). Correlate what they bought with utilization, recommend the upgrade. Cloud side now, access side later.
- **The insights cards go in Observe** (18:36). They launch the five patterns: stays in the region, across regions, across clouds, out to the internet, coming in. Each goes to Logs.
- **Data limits** (19:51, Santosh). Shadow SaaS and New destinations cannot be supported: IPs only, sampled NetFlow. Private endpoints resolve to resource names through the discovery mapping. Public stays unresolved and is not shown as an insight.
- **The demo environment is the two experiences** (22:27): pieces working today plus mock data for the art of the possible.

Where he was silent, nothing changes. He did not mention the Sankey, the store screens (Compose, Recommend, Review, Marketplace), Explore 360, or the estate presets. They stay as built.

---

## 2. Changes

### 2.1 Landing: four launch cards replace the success-metrics strip

Screen: S2 floor (`<div aria-label="Success metrics">`, `rollup` in `naas-app.js`). Same grid, same tile grammar (label, value, sub, bar), four tiles instead of six.

| Card | Baseline line (value + sub) | Door |
|---|---|---|
| Connect | `{public} of {total} regions` · "still ride the public internet" | Fabric (`s3` cloud/connect) |
| Observe | `{degraded} of {attached} connections` · "degraded · {wl} workloads impacted" (or "healthy · {gbps} Gbps on the fabric") | Observe, Performance & Reliability |
| Govern | `{violations}` · "policy violations across {n} policies" | Policies |
| Cost | `{save}/mo` · "on the table across {n} findings" | Cost |

Emphasis follows the customer. Empty stage: Connect carries the primary tint and reads "Nothing connected yet" / "Start here". Every other stage: Observe carries it. The one-finding card that already sits under the strip stays.

### 2.2 Hero: a lane for traffic outside the fabric

Geometry in `heroLayout` (`naas-logic.js`). The band keeps x 560 to 800. Its height drops from 392 to 300 (four strata of 75; strata card rect 64 tall, text sizes unchanged). Beneath it, y 340 to 416, a second slab the same width: slate fill (`var(--bg-wash)` light, `#1a2431` dark), hairline border, label "Outside the AT&T fabric", sub "third party · internet".

Edge routing: a site with `priv: false` sends its ingress edge to the lane, not the band. A region with `priv: false` receives its egress edge from the lane's right edge. The internet edge starts from the lane. Private edges are untouched. Dashed styling, crawl, chips and shields all keep their current rules, so the only visible change is where public paths enter and leave. The lane is not a button in this drop.

### 2.3 Rail: the Observe group mirrors the AI Fabric rail

`railGroups` in `shellVals`. NaaS Observe group becomes: Performance & Reliability, Cost, Security & Governance (same icons as the AI Fabric group). Deep dive keeps Logs. Connect and Govern groups are unchanged. Page title for Observe reads the page name, as the AI Fabric side already does.

### 2.4 Observe: one section in the AI Fabric's shape

State: `obPage` in {`perf`, `sec`}; Cost stays the existing Cost tab (`tab: 'cost'`), reached from the Observe rail group like the AI Fabric's Cost item.

**Performance & Reliability** (default), top to bottom:

1. Scope filter row (existing fx-filters, unchanged) with the live dot.
2. Four `fx-kpi` tiles: Throughput, Utilization (of attached capacity), P95 latency, Packet loss. Dollar tiles leave this page; they are Cost's.
3. The Act on it strip (existing `fx-alert`), text now leads with the degraded connection when there is one.
4. **Connections** card (new, the network layer). One `fx-row` per attached region: label `{cloud} {region}`, sub `{ramp} · {ports} × 10 Gbps purchased`; a 24-point in/out utilization sparkline for the window; value `{pct}%` with `cur {gbps} · avg {avg} Gbps`; state pill Up / Degraded / Saturating; BGP Established / Flapping; drops. Rows sort degraded first. Clicking a row selects it (`obConn`). Above 80 percent the row's door reads "Add a port" (existing compose door). Header sub: "{n} connections · {degraded} degraded".
5. **Impacted workloads** panel beside the Connections card (two-column grid, 3fr 2fr). For the selected connection: certainty line, then the list.
   - AT&T-terminated (`ramp` NetBond, EQX, hosted): "Directly impacted. AT&T terminates this connection in your VPC."
   - Customer gateway (`ramp` DX, ER): "Possible impact. Visibility ends at your gateway. {cloud} account {acct}."
   - Resilience: `paths: 2` reads "Access holds: a second path carries {gbps} Gbps at {pct}% while this one degrades." `paths: 1` reads "Single path. Access to these workloads is lost if this link fails."
   - List: the region's VPCs from `A.inventory` (name, workload count, tags), then "These talk to" with the partner regions from `est.arcs` and their VPCs. Doors: "Open Logs" (scoped to the region) and "Ask Andi".
   - Empty state when the selected connection is healthy: "No impact. {n} workloads reach the fabric through this connection at {pct}% utilization."
6. **Traffic flow**: the three-band Sankey with its sub-verdict and legend, alone. The seven-tab strip goes.
7. **Patterns** heading, five `fx-card sm` cards, one per pattern, each with a Logs door:
   - Stays in the region: per-region east-west Gbps, top five.
   - Across regions: flows to object storage in another region.
   - Across clouds: the cloud-to-cloud rows (existing `multi`).
   - Out to the internet: public-internet and AI-endpoint flows by source group (existing talkers logic restricted to public).
   - Coming in: sites reaching the clouds, by site, via the fabric or the internet (from `est.sites` and `P.path`).
   Private destinations render the resource name with the IP small beneath (`R.endpointsFor`). Public destinations render the IP with "unresolved" in the sub.

Removed from Observe: Throughput, Latency, Loss, Egress, Trend and Control tabs; the Anomalies section (its one sentence folds into the Act on it strip); the Utilization by connection card (replaced by Connections); Top talkers, New destinations, Shadow SaaS, Egress growth, Multi-cloud paths, Latency over SLO cards (replaced by the five pattern cards); Flows and paths steer table; Event stream.

**Logs** (Deep dive rail item, `obTab: 'control'` today) becomes its own page: pattern chips (the five, plus All), the records table as built, destinations resolved per the rule above.

**Security & Governance**: the audit. The Govern findings for the layer as the existing finding cards, then a "Policy audit" rows list from `policies` (name, matched, violations, state), door "Open Policies". No new derivation.

### 2.5 Data

`REG` gains optional fields, set in `naas-data.js` on a few regions per estate:
- `link`: `'degraded'` on one attached region per non-empty estate (partial: eastus; mature: eu-central-1; trust: us-east-2).
- `paths`: 1 or 2 (default 1). NetBond and EQX regions default to 2 where the estate is mature.
- `acct`: an account or subscription id string for DX and ER regions.

`R.health` treats `link === 'degraded'` as amber with an attached-path incident sentence ("{cloud} {region} · BGP flapping on {ramp} · 22 min"). The hero's amber sleeve and the Observe door already follow amber.

### 2.6 Copy

- Tiles: Throughput, Utilization, P95 latency, Packet loss. Never "Cost" as a tile label.
- States: Up, Degraded, Saturating. BGP: Established, Flapping.
- Certainty: "Directly impacted" and "Possible impact." Never "might be affected."
- Patterns, exactly: Stays in the region · Across regions · Across clouds · Out to the internet · Coming in.
- Connect is the place; attach is the verb.

---

## 3. Testing

- Chromium at 1440 and 1728, light and dark, on the four estates (`?view=empty|partial|mature`, `?estate=meridian`).
- Per-section open/close tag count for div, section, span, button, sc-if, sc-for after every markup patch; screenshot Compose (a later section) after each patch.
- Console: zero errors on load and after clicking a Connections row, a pattern Logs door, and each rail item.
- Landing cards and the Observe Connections header agree on the degraded count.

## 4. Out of scope (Drop 2 and later)

- Explode-in-place drills on the hero, left by site class, metro, site, circuit; right by the discovery tree.
- Access-side purchased versus utilized (ADI, AVPN interface utilization).
- Application-layer impact. Shadow SaaS. Public destination resolution.
- Any change to Connect, Govern, Cost page bodies, the store screens, or Explore 360.

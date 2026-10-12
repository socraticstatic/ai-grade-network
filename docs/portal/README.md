# Portal MVP

The NaaS storefront pared to the data the portal has today: last mile circuits, AT&T cloud connections, and the cloud inventory. Nothing on these pages needs a workload, an app, a flow log, a policy or a price.

Open `portal.dc.html` from this folder (any static server; `python3 -m http.server 8787` will do). Two fixtures and two states are built in:

| URL | Shows |
|---|---|
| `portal.dc.html` | Calloway Freight, the confirmed fields only (Set 1) |
| `portal.dc.html?fixture=scale&state=b` | a synthetic bank-scale estate (30 networks, 3,000 circuits) with the "maybe" fields (Set 2) |
| `portal.dc.html?data=./your-export.json` | your own export, in the shape below |
| `?page=lastmile|links|discovery|recommended` and `?theme=dark` | deep links |

## The four pages

- **Last mile.** One row per circuit, grouped by network then state. Confirmed: site ID, address, network, service (ADI, ABF, ASEoD, AVPN), bandwidth. Set 2 adds health, peak and p95.
- **Cloud connections.** One row per AT&T cloud connection: cloud, POP, region (from the lookup, else Unmapped), bandwidth. Set 2 adds the service (L3-VPN) and the AVPN network it belongs to.
- **Cloud discovery.** Cloud, region, VPC/VNet, subnet. Each region says how it reaches AT&T (from the join below). Set 2 adds bytes in and out per region and per subnet, and what each subnet reaches (AT&T, the cloud, other telco). A region not on AT&T offers Connect with AT&T.
- **Recommended.** For a region: the option list, four questions (purpose, traffic, security, routing), the ranked compare table, the weights and rules in words, Request this. The options shown are AT&T's modeled ways (see `ways.json`) and stand in until your option list arrives.

A field you do not send removes its column, never its row.

## The data contract

One JSON object. Optional fields carry `?`.

```
{
  "name": "Customer name",
  "circuits":   [{ "siteId", "address": { "line", "city", "state", "zip" }, "network": { "id", "name" } | null,
                  "service": "ADI" | "ABF" | "ASEoD" | "AVPN", "bandwidthMbps",
                  "health?": "ok" | "down", "peakMbps?", "p95Mbps?" }],
  "cloudLinks": [{ "csp": "AWS" | "Azure" | "GCP" | "Oracle", "pop": { "provider", "facility", "metro" }, "region?",
                  "bandwidthMbps", "service?": "L3-VPN", "network?": { "id", "name" } }],
  "discovery":  [{ "csp", "region", "bytesIn?", "bytesOut?",
                  "vpcs": [{ "id", "name", "subnets": [{ "id", "cidr", "affinity?": "att" | "csp" | "other", "bytesIn?", "bytesOut?" }] }] }]
}
```

Region names may be API names (`eastus`) or display names (`East US`); the page shows display names.

## The two files

- `pop-regions.json`: which regions a cloud serves from each peering location, as each cloud publishes it. This is the join between cloud connections (which carry a POP, not a region) and discovery (which carries regions). Microsoft's row for Washington DC (Equinix DC2, DC6 → East US, East US 2) is confirmed against the ExpressRoute locations table; rows marked `verify` are not yet checked. A POP not in the table degrades the join to the cloud level ("AT&T · Azure at Ashburn"), never to a guess.
- `ways.json`: AT&T's modeled ways to connect, with monthly per cloud, setup level, who does it, the four questions, the five criteria and the ranking rules in words. A starting point for your option list, not a source.

## What is not here, on purpose

Workloads, app health, flow logs, policies, egress dollars, personas, the assistant, the order lifecycle. Each needs data the portal does not have. The concept storefront keeps them; this page does not pretend to.

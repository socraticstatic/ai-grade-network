# Tunnels as a way to reach the cloud

2026-10-05, v2. v1 was assessed and rejected the same day (reasons at the end).

## Why

A stakeholder's marked-up Connect picture shows three ways a site reaches a cloud:

1. **Private.** AVPN access → AT&T PE → AT&T backbone → NetBond / ExpressRoute → cloud. (AT&T: NetBond "extend[s] your MPLS VPN" to the cloud.)
2. **SD-WAN tunnel.** Business Fiber access → overlay over the internet → the SD-WAN appliance in the cloud (Azure Virtual WAN hub NVA; on AWS an appliance in a transit VPC behind Transit Gateway Connect).
3. **IPsec tunnel.** Dedicated Internet access → IPsec over the internet → the cloud's VPN gateway (AWS Site-to-Site VPN: one connection, two tunnels, $0.05/hour, traffic billed as internet egress).

The storefront draws only the first for AT&T-access sites. Every ABF and ADI site is drawn through PE, backbone and NetBond.

## Rule: a tunnel is stated, never inferred

SD-WAN rides any transport (AT&T lists broadband, LTE, MPLS) and Dedicated Internet often reaches clouds with no tunnel at all. So **no access product implies a tunnel.** A site rides a tunnel only when its data says so. Every other site keeps exactly what it has today.

## The model: existing fields, one meaning each

No new competing field. A tunnel site in naas-data.js is:

```js
{ name, access: 'ABF (Business Fiber)', services: [...], priv: false, tunnel: 'SD-WAN', tunnelTo: 'AWS us-west-2', ... }
{ name, access: 'ADI (Dedicated Internet)', services: [...], priv: false, tunnel: 'IPsec', tunnelTo: 'Azure westeurope', ... }
```

- `priv: false` because the path is not private. That keeps all 396 `.priv` reads agreeing with the picture without touching them.
- `tunnel` already exists (the five non-AT&T IPsec branches carry `tunnel: 'IPsec'`). It gains the value `'SD-WAN'`.
- `tunnelTo` (new, required with `tunnel`) names the one region the tunnel lands in. Today's non-AT&T branches get it too, from their bucket's cloud, so nothing has to guess a destination.
- **Access ownership does not change.** ABF and ADI stay AT&T access (`attInternet`, naas-things.js:30): AT&T still holds the access SLA, and the site still counts as "AT&T" in "N AT&T · M non-AT&T".

### Code that has to learn this (and only this)

| where | today | change |
|---|---|---|
| naas-logic.js:39 `siteModeOf` | sdwan only by access text; ipsec only if tpa or tunnel | `tunnel: 'SD-WAN'` → sdwan; `tunnel: 'IPsec'` → ipsec, whoever owns the access |
| naas-things.js:32 `entersAtt` | `priv \|\| attInternet` | add `&& !x.tunnel` for the **core** question: a tunnel site enters AT&T's access, not its backbone. Split into `attAccess(x)` (ring, counts) and `attCore(x)` (routing). |
| naas-flowmap.js:59 `isTunnel` | `!priv && (tunnel \|\| tpa)` | splits into `ipsecV` and `sdwanV` by `tunnel` |
| naas-sites.js:185 `servicesOf` | ipsec → tpa | a tunnel on AT&T access keeps its own service (ABF, ADI); tpa stays for non-AT&T access only |
| naas-round2.js:444 `ipsecCloud` | cloud of the ipsec bucket | reads `tunnelTo` |

Then every surface below reads these. A grep for `entersAtt`, `attInternet`, `isTunnel`, `siteModeOf` and `tunnel` is the full call list; each call site is classified ring/count (keeps `attAccess`) or path (moves to `attCore`) in the plan.

## The sites that change (Growing only)

| site | access | becomes | lands in |
|---|---|---|---|
| Boston office | ABF | SD-WAN tunnel | AWS us-west-2 |
| Houston office | ABF | SD-WAN tunnel | AWS us-west-2 |
| Minneapolis office | ADI | IPsec tunnel | Azure westeurope |
| Dublin office | ADI | IPsec tunnel | Azure westeurope |

Both destinations are public today (no NetBond), which is why a tunnel exists. Atlanta and Los Angeles (ABF) and Mumbai (ADI) stay as they are, so Growing shows all three ways side by side. Small, Mature, Bank scale and Empty are untouched. The five non-AT&T IPsec branches only gain `tunnelTo`.

## Surfaces

**Connect picture** (naas-logic.js `heroLayout`, naas-things.js, naas-segments.js)
- The Access thing stays on the AT&T track (Business Fiber, Dedicated Internet).
- The line runs from Access **straight to the cloud card**, skipping Edge and Core, labelled on the wire "SD-WAN tunnel" or "IPsec tunnel". It ends at a right-hand Access thing named for what terminates it: "SD-WAN hub" or "VPN gateway".
- The non-AT&T lane is unchanged.
- Segment table: the existing `ipsec` row (owner customer, "Cloud VPN metrics", unmeasured) covers both tunnel kinds, renamed "Tunnels (IPsec, SD-WAN)". No new row, so segment-model's nine rows hold.

**Flow map** (naas-flowmap.js)
- Mids: ramps, WAN, **"SD-WAN tunnel"** (new), "IPsec tunnel" (renamed from "IPsec over internet"; it holds both AT&T-access and non-AT&T IPsec), Internet.
- The tunnel sites' volume moves from the fabric to the tunnel mids. Conservation at every level is the gate (flowmap.test.mjs:129, sankey-conserves).

**Observe** (naas-paths.js, naas-observe-dash.js, naas-flowmap.js `perfOf`)
- `P.path` for a tunnel site: AT&T access → internet (unmeasured) → SD-WAN hub or VPN gateway. No on-net PoP, no fabric hop.
- Who answers: AT&T for access, nobody for the middle (stated as a blind spot), the cloud for its gateway.
- p95 reads the public latency and the public SLO (100 ms), as `mid:ipsec` does today.

**Cost** (naas-round2.js, naas-moves.js)
- IPsec: $36.50 per **VPN connection** per month (the existing `CSP_VPN`; the word "tunnel" in labels becomes "connection").
- SD-WAN: the existing catalog SD-WAN price per site.
- Egress for the four sites: the public rate (`$0.09`) on their modelled volume, labelled modelled. These are the only new figures, and each is listed in the plan with how it is derived.
- Recommended: one site-set move per tunnel kind ("Move 2 SD-WAN sites to AVPN to Cloud", "Move 2 IPsec sites to AVPN to Cloud"), same machinery as today's ipsec move. Connect type asked for: AVPN to Cloud.

**Govern** (naas-govern.js)
- A tunnel site breaks "No direct internet path" and counts toward "PCI on public paths" where its workloads carry PCI. The finding names the tunnel: "reaches Azure westeurope over an IPsec tunnel on the internet".

**Connect types** (naas-connect-flow.js)
- AVPN to Cloud: AVPN sites (shipped).
- Internet to Cloud: IPsec-tunnel sites and public regions.
- Site to Cloud (coming soon): SD-WAN-tunnel sites.

## Hand-written figures that move (Growing)

Recomputed from the model after the change, never edited by eye; the plan lists each with its before and after:
- `privatePct` 40, `savedMo`, `observedPct`, `fabricAttachPct`.
- Findings `ipsec` and `ipsecegress` ("5 IPsec sites", $8,600 bucket): they stay about the five non-AT&T branches. A new finding covers the four AT&T-access tunnel sites, so the old figures stay true.
- Connect header "5 of 7 regions still ride the public internet": regions don't change, so it holds.
- FinOps audit (cost.mjs + check.py) re-run; every Cost page still adds up.

## Fit the fold

The tunnel wires reuse the existing row slots: a tunnel site sits in its region card's row like any other. The wire skips columns instead of adding things. The only new things are two right-hand Access items (SD-WAN hub, VPN gateway) in the existing column, and they fold like the rest. `scripts/fold.mjs`: 0 FAIL, all pages × 5 estates × light/dark.

## Out of scope

NetBond Advanced and Cloud_Designer. Re-marking sites in other estates. A UI to set a tunnel. SASE.

## Done means

- `npm test` green; every moved pin carries a comment saying why.
- fold.mjs 0 FAIL; flow map adds up on all five estates; FinOps audit clean.
- Headless screenshots on Growing: Connect picture with both tunnel wires, Traffic with both tunnel mids, a tunnel site's path in Observe, Recommended's two moves, Govern's tunnel finding.
- Deployed to main; live file checked.

## Why v1 was rejected

It defaulted every Business Fiber site to SD-WAN and every Dedicated Internet site to IPsec, with no evidence. That moved Small and Mature wholesale and put SD-WAN tunnels on cloud VPN gateways, which is wrong. It also kept `priv: true` on tunnel sites beside a new field that could disagree with it, and left out the hand-written figures it would falsify.

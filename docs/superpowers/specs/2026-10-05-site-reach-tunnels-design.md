# Site reach: private, SD-WAN tunnel, IPsec tunnel

2026-10-05. Approved in chat by Micah ("go for it").

## Why

A stakeholder's notes, with a marked-up Connect picture: a site reaches a cloud one of three ways, and the storefront draws only one.

1. **Private.** AVPN (or ASE on Demand) access → AT&T PE → AT&T backbone → NetBond / ExpressRoute → cloud gateway.
2. **SD-WAN tunnel.** Business Fiber access → overlay over the internet → the cloud's VPN gateway. Never touches PE, backbone or NetBond.
3. **IPsec tunnel.** Dedicated Internet access → IPsec over the internet → the cloud's VPN gateway. Same bypass.

Today "on AT&T" is decided by the access product (`attInternet` in naas-things.js:30, `entersAtt` :32, `onAtt` naas-logic.js:87). So ABF and ADI sites draw through PE, backbone and NetBond, which is wrong: their access is AT&T's, their middle is the internet. IPsec exists only for non-AT&T branches (`tpa`), and SD-WAN never draws as a tunnel.

The same week the "VPN to Cloud" type became "AVPN to Cloud, private connectivity over AT&T MPLS" (80b507a). This spec finishes that thought across the product.

## The model: one field, `reachOf(site)`

New in naas-logic.js, next to `siteModeOf`. Returns one of:

| reach | meaning | default from primary access |
|---|---|---|
| `private` | AT&T access, PE, backbone, on-ramp | AVPN, ASE / ASE on Demand, SD-WAN over AVPN, Mobility (private APN) |
| `sdwan` | AT&T access, SD-WAN tunnel over the internet to the cloud VPN gateway | ABF (Business Fiber), plain "SD-WAN" on AT&T access |
| `ipsec` | AT&T access, IPsec tunnel over the internet to the cloud VPN gateway | ADI (Dedicated Internet), AIA-B |
| `outside` | not AT&T access (today's `tpa`, `accessSla: 'third'`, `core: 'third'`) | unchanged |

- Decided by the site's **primary** service. A backup service never changes reach.
- A site may override with `reach: '<value>'` in naas-data.js. None does at first; the field exists so the odd site (an ABF site on NetBond) is one word, not a code change.
- `siteModeOf` keeps its four answers but derives from `reachOf` (`private` → `att`, `outside` → `third`, tunnels → their own names). Every existing caller keeps working.
- `onAtt(site)` keeps meaning **"AT&T holds the access SLA"**. A tunnel site is still on AT&T for the access ring and the "N AT&T · M non-AT&T" counts. What changes is the **path**: a new `onCore(site) = reachOf(site) === 'private'` answers "does it ride the AT&T backbone", and the routing code asks that instead of `entersAtt`.
- `isTunnel` in naas-flowmap.js:59 is replaced by `reachOf`: `sdwan` and `ipsec` are tunnels; an `outside` site keeps today's rule (its tpa IPsec still counts as IPsec, on another carrier's internet).

## Surfaces

### Connect picture (naas-logic.js `heroLayout`, naas-things.js, naas-segments.js)
- Tunnel sites keep their Access thing on the AT&T track (Business Fiber, Dedicated Internet).
- From Access their line runs **straight to the cloud gateway**, bypassing Edge, Core and the on-ramp, labelled "SD-WAN tunnel" or "IPsec tunnel" on the wire. Builds on the existing third-core precedent (`:394-406`), but the draft skips the Core column instead of passing through it.
- Right-hand Access gets the cloud's **VPN gateway** as a thing where a tunnel lands (AWS VPN gateway, Azure VPN gateway, GCP Cloud VPN), distinct from the on-ramp's gateway.
- Segment table (naas-segments.js): the existing `ipsec` row ("Cloud VPN metrics", owner customer) covers tunnel sites of both kinds; a `sdwan` row is added beside it the same way. Edge and Backbone cells count only `onCore` sites.
- "Outside the AT&T network" lane is unchanged: still non-AT&T access only.

### Flow map (naas-flowmap.js)
- Mids: `mid:<ramp>` (NetBond etc.), `mid:wan`, **`mid:sdwan` "SD-WAN tunnel"**, `mid:ipsec` "IPsec tunnel", `mid:internet`.
- A site's volume splits by reach: private → fabric; sdwan → `sdwanV`; ipsec → `ipsecV`; outside → today's rule. Carried through scaling and folding exactly as `ipsecV` is today (:347, :363, :384, :410, :435).
- Conservation holds at every level; tests/flowmap.test.mjs:129 and sankey-conserves keep passing with the new mid.

### Observe (naas-observe-dash.js, naas-flowmap.js `perfOf`, naas-paths.js)
- `P.path` for a tunnel site: Access (AT&T) → **Internet (unmeasured)** → cloud VPN gateway. No "AT&T on-net" PoP hop, no fabric hop.
- Who answers: AT&T for the access, "Public internet" for the middle, the cloud for its gateway. The middle is a blind spot (no flow logs), stated, not hidden.
- p95 for tunnel mids reads the public latency (`pub`), as `mid:ipsec` does today; the SLO is the public one (100 ms), never the private 20 ms.

### Cost (naas-round2.js, naas-moves.js)
- Tunnel legs priced from what is already in the model: `CSP_VPN` ($36.50 per tunnel per month, cloud list) per tunnel, SD-WAN at the catalog sdwan price per site, egress at the public rate ($0.09/GB vs $0.02 private) on the site's modelled volume. Every figure is labelled modelled; no new numbers are invented.
- The existing partial `ipsec` bucket ($8,600) stays the IPsec-over-third-party figure; new tunnel volume is computed, not added to the bucket by hand.
- Recommended: tunnel sites become a site-set move "Move N tunnel sites to AVPN to Cloud", the saving = tunnel cost + public egress − AVPN/NetBond cost, same machinery as today's ipsec move (`siteMoves`, :197-240). The Connect type it asks for is **AVPN to Cloud**.

### Govern (naas-govern.js, naas-data.js)
- A tunnel site breaks "No direct internet path" and counts toward "PCI on public paths" when its workloads carry PCI, exactly as a non-AT&T site does today (naas-govern.js:114 asks `onCore`, not `onAtt`).
- The finding words name the tunnel: "reaches the cloud over an SD-WAN tunnel on the internet" / "over an IPsec tunnel on the internet".

### Connect types (naas-connect-flow.js)
- AVPN to Cloud fits `private` AVPN sites (shipped).
- Internet to Cloud fits IPsec-reach sites as well as public regions.
- Site to Cloud (SD-WAN, coming soon) counts SD-WAN-reach sites.

## What moves in the data

- **partial:** 4 ABF sites → sdwan, 3 ADI sites → ipsec (all `priv: true` today; `priv` stays as stored, `reachOf` decides the path). Backup ABF/ADI on ASE/AVPN sites stay private.
- **small:** Dallas HQ (ABF) → sdwan, Houston (ADI) → ipsec. Small's flow map gains tunnel mids beside Internet.
- **mature:** Austin (ABF) → sdwan, Singapore DC (ADI) → ipsec. SD-WAN over AVPN stays private.
- **trust:** SD-WAN East/Central (`priv: false`) → sdwan; SD-WAN West (`priv: true`) → sdwan unless it states AVPN. Mobility stays as is.
- **empty:** nothing.

Pinned counts that move (update with a comment saying why, never loosen): classify.test.mjs:33-36, segments.test.mjs:89-110, site-services.test.mjs:38-66 (Singapore no longer meets Core), segment-model.test.mjs:55, sankey-conserves.test.mjs:94 (Small's mids), discover-drill-r2, cost-verdict:245, cost-third-read:91-97, moves.test.mjs:59, govern-drill:107,134.

## Out of scope
- NetBond Advanced and Cloud_Designer (Micah: storefront only).
- New pricing sources. SASE PoPs as overlay ends.
- A UI to set a site's reach; the override is data only.

## Done means
- `npm test` green, with every moved pin explained in its test.
- `scripts/fold.mjs` 0 FAIL (all pages × 5 estates × light/dark, no scroll).
- Flow map adds up on all five estates.
- Headless screenshots: Connect picture on Growing and Small showing tunnel wires to the VPN gateways; Traffic with SD-WAN and IPsec mids; Recommended's tunnel move; Govern's tunnel finding.
- Deployed to main, live file checked.

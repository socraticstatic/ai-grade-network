# Policies between two assets

Date: 2026-10-01. Status: approved in conversation ("proceed").

## Why

Micah: "if i have a private cloud equinix, and i have an HSP elsewhere, i need a policy between these two assets". He also wants to "allow deny multipath/multicloud/prem to cloud/cloud to cloud routing/optimization service insertion", to "allow deny manipulate advertise (community values)", and a "policy engine with outcome tips".

## What exists

- **The policy sentence.** Every Govern policy is "When `match` reaches `scope`, require X": side A, side B and a rule. Today `scope` is almost always "any cloud".
- **Layers.** Each policy is drawn across four layers: Sites & first mile, AT&T edge, AT&T core, Cloud & workload (`naas-policy-layers.js`). These are the path between the two sides.
- **Assets.** Sites, including data centers. Cloud regions. Tags. Business units. Equinix appears as a third-party path (Equinix Fabric, Equinix SE2).
- **Simulate and violations.**
- **Connect order types:** Colo to Colo, DataCenter/CoLocation to Cloud, Cloud to Cloud.

## What this adds

1. **Private cloud as an asset.** A data center can be a private cloud hosted at a colo. It carries the provider (Equinix), the facility (DC2) and the metro. A policy can name it, and the path model knows its first mile is a colo cross-connect.
2. **Two-sided composer.** Govern's composer picks side A and side B from the same asset list: a private cloud, a site, a data center, a cloud region, a tag or a business unit.
3. **Verbs, each on the layer that enforces it.**
   - **Allow / deny:** only listed tags, or none. Enforced at the AT&T edge, or at an inspection point.
   - **Path:** via the AT&T network, via Equinix Fabric, never the internet, with a failover order. Enforced in the core and at the edge.
   - **Insert a service:** an NGFW in the path. Enforced at the edge.
   - **Advertise (Advanced):** a prefix filter, a community value, an AS prepend, static routes. These are NetBond Advanced's Layer 3 policy fields, on the connection that carries the pair.
4. **Simulate the pair.** It shows:
   - the path today: how it rides, its p95, its cost;
   - the path with the policy;
   - the per-layer rules it pushes;
   - the price change;
   - any missing piece (for example "needs a cross-connect at Equinix DC2"), linked to the Connect order that adds it.

## NetBond Advanced's route policy, as the Advanced verbs

Source: `att-netbond-sdci/src/components/configure/policies/tabs/RestrictedIPv4Policy.tsx` (Layer 3 IPv4/IPv6 are the same model). Each rule is a toggle with two directions: **On Premise → Partner** (your side out to the cloud) and **Partner → On Premise** (the cloud back to you). That is the "to / from / between" in the ask.

| Section | Rule | On prem → Partner | Partner → On prem |
|---|---|---|---|
| Deny | Matching routes | yes | yes |
| Deny | Block default routes | yes | no |
| Deny | Community value filter, customer-provided BGP CVs | yes | yes |
| Deny | Community value filter, AT&T-provided BGP CVs | no | yes |
| Manipulations | Prepend advertisements with extra BGP ASNs | yes | yes |
| Manipulations | Selective CV tagging to routes/prefixes | yes | no |
| Manipulations | Community value to tag routes | no | yes |
| Allow | Matching routes | yes | yes |
| Allow | Community value filters (customer, AT&T) | as Deny | as Deny |
| Advanced | Advertise static routes | yes | yes |

The composer's Advanced panel uses these sections, rule names and directions as they are, so a policy written here reads the same on the connection's Policies tab in NetBond Advanced. Side A of a policy is "On Premise" when it is a site or a private cloud; side B is "Partner" when it is a cloud region. Between two clouds, each connection gets its own pair of directions.

## Boundary

AT&T enforces only what crosses its network: the on-ramps, the core, NetBond route policy, and hosted services. Rules inside the customer's cloud (security groups, cloud route tables) appear as "recommended change in your cloud", never as pushed.

## Worked example (Growing)

> When **Private cloud · Equinix DC2, Ashburn** reaches **AWS us-east-1**: allow only **tag Prod**; path **via the AT&T network**, fail over to **Equinix Fabric**, never the internet; insert **NGFW**; advertise only **10.20.0.0/16** tagged **65000:120**.

## Steps

1. Private cloud as an asset: data, a helper and its test. *(this commit)*
2. The two-sided composer and the verbs, in Govern.
3. Simulate the pair, with outcome tips and links to the missing orders.

## Out of scope

- Pushing into cloud accounts.
- Conflict precedence across many policies.
- Approval workflows.

# Tunnels as a way to reach the cloud: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four Growing sites reach their cloud over a stated SD-WAN or IPsec tunnel, and every surface (picture, flow map, Observe, Cost, Recommended, Govern, Connect types) says so.

**Architecture:** No new competing field. A tunnel site is `priv: false` + `tunnel: 'SD-WAN' | 'IPsec'` + `tunnelTo: '<Cloud> <region>'`. `siteModeOf` reads `tunnel`; a new `tunnelOf(site)` in naas-logic.js returns `{ kind, cloud, region }` or null and is the one reader every surface uses.

**Tech Stack:** vanilla ES modules, node:test, dc-runtime markup in `NaaS Storefront.dc.html`, headless Playwright (scripts/fold.mjs).

**Spec:** docs/superpowers/specs/2026-10-05-site-reach-tunnels-design.md

## Global Constraints

- A tunnel is stated in data, never inferred from an access product.
- Only Growing's Boston office, Houston office (SD-WAN → AWS us-west-2), Minneapolis office, Dublin office (IPsec → Azure westeurope) change. Other estates untouched except `tunnelTo` on non-AT&T IPsec branches.
- ABF and ADI stay AT&T access: `onAtt` and "N AT&T · M non-AT&T" counts do not change.
- **Correction to the spec's picture section:** Micah ruled 2026-09-28 "ADI always goes through AT&T core" (naas-things.js:25). AT&T's own internet does ride the AT&T backbone. So a tunnel wire runs Access → AT&T PE → AT&T backbone → **Internet** (cloud-side Edge) → **VPN gateway / SD-WAN hub** (cloud-side Access). What it skips is NetBond and the on-ramp, which is the stakeholder's point.
- IPsec ends on the cloud VPN gateway; SD-WAN on the cloud SD-WAN hub (Azure Virtual WAN hub NVA, AWS Transit Gateway Connect appliance).
- IPsec priced per VPN connection ($36.50, `CSP_VPN`); the word is "connection", not "tunnel", where it is a price.
- No em dashes in copy. 1440×900, no page scroll (fold.mjs).
- Every moved test pin gets a comment saying why. Stage by path, never `git add -A`.

## Review Focus

- A region card (US East etc.) holding both a tunnel ABF site and a plain ABF site must draw two lines, not merge them (linesOf keys by access thing only today).
- A tunnel site drilled to its own card must still route its tunnel to the provider card at the root and to the region in a drill.
- Flow map conservation with a new mid on every estate (Growing gains SD-WAN; others unchanged).
- The five non-AT&T IPsec branches must stay in the "Outside the AT&T network" lane and keep the $8,600 / "5 IPsec sites" findings.
- Dark theme: new things and wire labels read in both themes.

---

### Task 1: The model

**Files:** naas-data.js (partial sites + the 5 branches), naas-logic.js (`siteModeOf`, new `tunnelOf`), naas-flowmap.js:59 (`isTunnel` → `tunnelOf`), tests/tunnels.test.mjs (new)

**Produces:** `tunnelOf(site) -> { kind: 'SD-WAN'|'IPsec', cloud, region, name } | null`; `siteModeOf` returns `'sdwan'` for `tunnel: 'SD-WAN'`, `'ipsec'` for `tunnel: 'IPsec'`.

- [ ] Test: `tunnelOf` on Boston office = `{ kind: 'SD-WAN', cloud: 'AWS', region: 'us-west-2' }`; Minneapolis = IPsec Azure westeurope; Atlanta office = null; Charlotte branch = IPsec AWS us-west-2; `onAtt(Boston)` true; `siteModeOf(Boston)` 'sdwan', `(Minneapolis)` 'ipsec'; Small, Mature, Trust site modes unchanged (snapshot taken before the edit).
- [ ] Data: the four sites get `priv: false, tunnel, tunnelTo`; the five branches get `tunnelTo: 'AWS us-west-2'` (their bucket's cloud).
- [ ] Code, run `npm test`, move pins that move (with a comment), commit.

### Task 2: Connect picture

**Files:** naas-things.js (`tunnelEdgeThing`, `tunnelEndThing`), naas-logic.js (`linesOf` key + fields, `heroLayout` site drafts), `NaaS Storefront.dc.html` (wire label if the route renderer needs one), naas-segments.js (ipsec row label "Tunnels (IPsec, SD-WAN)", counts tunnel sites), tests/tunnels.test.mjs

- `tunnelEdgeThing() = T('ce:internet', 'Internet', 'third', 'Public internet; nobody answers for this leg')`.
- `tunnelEndThing(kind, cloud)`: IPsec → `'<Cloud> VPN gateway'`; SD-WAN → `'<Cloud> SD-WAN hub'`; owner 'cloud'.
- `linesOf` key: `t.id + (tunnel ? '>' + tunnel + '>' + tunnelTo : '')`, and carries `tunnel`, `tunnelTo`.
- heroLayout: a site with a tunnel builds a `side: 'path'` draft like the third-core case: `[...siteChain, tunnelEdgeThing(), tunnelEndThing(kind, cloud)]` to the card/region holding `tunnelTo`, with `tunnel` on the draft for its label.
- [ ] Test: Growing root layout has a route through 'Internet' ending at 'AWS SD-WAN hub' and one ending at 'Azure VPN gateway'; neither route uses a NetBond or ExpressRoute thing; US East card draws separate lines for tunnel and non-tunnel ABF; Phoenix third-core routes unchanged.
- [ ] Implement, headless screenshot of Growing's Connect picture, commit.

### Task 3: Flow map

**Files:** naas-flowmap.js (leftRoots, site leaves :232, mids :503-536, carriers :347/363/384/410/435), naas-app.js hover words for the mid (:2577), tests

- `sdwanV` beside `ipsecV`; mid `mid:sdwan` "SD-WAN tunnel"; `mid:ipsec` renamed "IPsec tunnel"; tunnel share 0.9 of a tunnel site's volume as today.
- [ ] Test: Growing mids include 'SD-WAN tunnel' and 'IPsec tunnel'; every mid adds up both sides on all five estates (existing flowmap/sankey tests stay green); Small's mids unchanged.
- [ ] Implement, commit.

### Task 4: Observe

**Files:** naas-paths.js `path()`, naas-observe-dash.js site detail
- Tunnel site to its `tunnelTo` region: site → access (public first mile, AT&T) → PoP (AT&T on-net) → "Public internet" (unmeasured) → "<Cloud> VPN gateway" or "SD-WAN hub" → region.
- [ ] Test: `path(Minneapolis, westeurope)` hop names in that order, no 'fabric' or 'ramp' hop. Implement, commit.

### Task 5: Cost and Recommended

**Files:** naas-round2.js (`ipsecCloud`, connect legs words), naas-moves.js (`siteMoves` includes AT&T-access tunnel sites), tests
- Recommended: tunnel sites on AT&T access form their own set per kind ("2 sites on an SD-WAN tunnel", "2 sites on an IPsec tunnel"), tiers ask for AVPN to Cloud.
- [ ] Test: Growing's moveList has a sites move covering Boston+Houston and one covering Minneapolis+Dublin; their AVPN tier's conn is 'AVPN to Cloud'; Cost legs price 2 IPsec connections at $36.50 and 2 SD-WAN sites at the catalog price; FinOps audit (cost.mjs + check.py) clean.
- [ ] Implement, commit.

### Task 6: Govern and the finding

**Files:** naas-govern.js:114 (breaker: `!onAtt(s) || tunnelOf(s)`), naas-data.js finding `tunnel` (layer cloud, tab govern) + KINDS entry "Tunnels on the internet"
- [ ] Test: "No direct internet path" violations on Growing include the four tunnel sites; the finding reads "4 AT&T sites reach the cloud over tunnels on the internet"; the `ipsec`/`ipsecegress` findings still say 5 sites.
- [ ] Implement, commit.

### Task 7: Figures, fold, ship

- [ ] Recompute Growing's `privatePct`, `observedPct`, `fabricAttachPct`, `savedMo` from the model; list before/after in the commit.
- [ ] `npm test` green; `node scripts/fold.mjs` 0 FAIL; headless screenshots of each surface on Growing.
- [ ] Push to main; check the live file.

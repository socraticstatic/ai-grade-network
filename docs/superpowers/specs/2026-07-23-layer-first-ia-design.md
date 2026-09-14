# Layer-First IA — "The Stack" Design

**Date:** 2026-07-23
**Approved direction:** B for the concept, A for the mechanics (Micah, this session).

## The problem

The current nav renders nine flat links: Discover, then NaaS and AI Fabric each
carrying identical verb labels (Connect / Govern / Observe / Cost). Eight links,
four distinct words, disambiguated only by 10px group captions. Verbs are not
destinations — users navigate to things, then act on them. The object model
(/manage, /groups, /pools, /cloud-routers…) was flattened into /discover.

## The model

A table nobody ever sees as a table:

- **Columns (lifecycle):** Connect · Govern · Observe · Cost. Constant across
  every row. NetBond's create/manage/monitor/configure is the same arc.
- **Rows (network layers):** everything AT&T runs, bottom to top:
  1. **Transport & Access** — lit fiber, dark fiber, PON, 5G / private
     cellular, FirstNet, satellite. Access media are siblings (parallel tiles
     at the base of the elevation), not layers of each other.
  2. **Network services (NaaS)** — mid-mile fabric, NetBond-style tenanted
     paths, SD-WAN, SASE.
  3. **Cloud** — on-ramps, managed VPC, Equinix attach, L3 to neoclouds.
  4. **AI Fabric** — model endpoints, agents, tokens, budgets.

**The rule that fixes the nav: enter through rows, act through columns.**
A verb is never a top-level destination. Every top-level label is unique.

**Why not verbs on top with layer submenus (Create / Manage / Monitor /
Configure)?** Unique labels, yes — but the busy axis gets the toll booth. A
session crosses verbs constantly inside one layer (health → policy → cost)
and crosses layers rarely; verb-first re-asks "which layer?" on every verb
switch. Layers are also personas (network team vs AI team, matching RBAC);
verb-first re-merges what the email asked to separate. The cross-layer
"monitor everything" case is Discover's job. Where verb-first IS right:
**global actions.** The top-bar "+ Create" is one verb-first menu of every
creatable object across layers, each entry naming its layer. Verbs work as
commands, not as addresses.

**Scope honesty:** the app nav ships only rows with real screens today — AI
Fabric (/ai/*) and NaaS (/naas/*). Cloud and Transport & Access appear in the
concept deck and the Discover stack as clearly-labeled vision strata; the Cloud
band deep-links to /naas/connect, where cloud attach actually lives today. No
nav item points at a page that does not exist.

## Components

### 1. navItems.ts → NAV_LAYERS
`NavDomain` becomes `NavLayer` (key, label, blurb, items — unchanged shape,
plus `tagline` for the rail/stack). Routes unchanged (/ai/*, /naas/*). New
helper `counterpartPath(pathname, layerKey)`: same verb, other layer
(/ai/cost ↔ /naas/cost); falls back to the layer's first item for non-verb
paths. `NAV_ITEMS` flat export stays for consumers that need render order.

### 2. MainNav — layer dropdowns (mechanics A)
Desktop bar: Discover link + one dropdown trigger per layer. Trigger shows the
layer name; panel shows the layer blurb and its four verbs (icon, label,
description). Open on hover or click; Esc and outside-click close; full
keyboard path (trigger Enter/Space/ArrowDown opens, arrows move, Esc returns);
aria-expanded / role="menu" semantics. Trigger carries the active state when
the pathname is inside its layer. The flat row and its duplicate visible
labels are gone. TourLauncher and the right-side cluster are untouched.

### 3. StackRail — vertical traversal (concept B, in-app)
A thin fixed rail on the left edge of /ai/* and /naas/* pages, desktop
(≥1280px) only. Renders the stack top-to-bottom: AI Fabric, a slim dashed
Cloud slot labeled "Cloud — next" (non-interactive roadmap marker), NaaS.
Current layer lit. Clicking the other layer navigates to counterpartPath —
same verb, other layer. Tooltip states exactly that ("Cost, on the network
layer"). This is the email's story made navigable: move vertically, keep
your place in the lifecycle.

### 4. Discover — the stack as the front door
A stack panel on /discover: four bands in elevation order (AI Fabric, Cloud,
NaaS, Transport & Access). AI Fabric and NaaS bands are live — each names its
four verbs and navigates into the layer. Cloud band deep-links to
/naas/connect with a caption saying where cloud attach lives today. Transport
& Access band is a labeled vision stratum showing the media tiles (Fiber ·
Dark fiber · Wireless · Satellite), non-navigating. Existing Discover content
(estate, sites, AI exposure — with their data-tour anchors) stays below.

### 5. /stack — the concept deck (standalone)
A standalone page in the strict Flywheel + Intent-deck language (navy #001a3d
cover, white sections, quiet #f8fafb cards, SectionLabel kickers, BigStat,
when/then rule cards, print-ready, ATT Aleck Sans). Routed outside
DashboardLayout like /onboarding. Sections:

1. **Cover** — "Enter through the layer. Act through the lifecycle." Kicker:
   Information architecture · Cloud Connect.
2. **The premise** — verbs are not destinations; the door you pick is an
   answer (Intent's own premise, applied to nav). BigStats: 4 verbs, one
   experience · N rows, everything AT&T runs · 1 label per destination.
3. **The table** — the core visual, analog of Intent's step rail: the full
   lifecycle × layer matrix, every cell stating what that verb means on that
   row. Row/column hover highlighting. Live rows (AI, NaaS) link into the app;
   Cloud and Transport & Access rendered as vision rows, visibly distinct.
4. **The stack** — the elevation drawing: four strata, access media as
   parallel tiles at the base. The email's two journeys drawn down the stack:
   *Simple* (direct cloud-connect: region attach → managed VPC → transparent
   Equinix → L3 to neocloud) and *Predictable* (NetBond-style tenanted:
   private, performance-backed, data-driven).
5. **The rules** — when/then/example cards: enter through rows, act through
   columns · a verb is never a destination · every top-level label unique ·
   same verb across layers = one rail hop · objects live in their layer.
6. **Before / after** — the old nine-link bar and the new bar, drawn in HTML,
   with the failure stated plainly (8 links, 4 words).
7. **What makes us sticky** — the email's closing line mapped onto the
   columns: control → Govern, security → Govern, observability → Observe,
   cost-control → Cost, all riding Connect.

## Out of scope
Restoring the object detail pages; building Cloud / Transport & Access verb
pages; renaming NaaS. Each is a follow-on with its own spec.

## Testing
- Unit: navItems (layers, counterpartPath), MainNav dropdown semantics +
  keyboard, StackRail routing, Discover stack panel, /stack renders all
  sections.
- e2e sweep: domain-split, mobile-nav, tour, smoke, discover-routes updated to
  the dropdown nav; new stack.spec.ts walking Discover → layer → dropdown →
  rail hop → /stack.
- `npm run verify` green; then walked in a real browser as a user.

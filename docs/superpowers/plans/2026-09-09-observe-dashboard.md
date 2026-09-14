# Observe dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the storefront's Observe page as a dashboard whose primary visual is a live flow map you can open in place, node by node, down to the flow record, with gauges for connections and a detail panel on selection.

**Architecture:** One new pure module `naas-flowmap.js` builds the drillable map (nodes, ribbons, trail) from the estate, the inventory and the flows given an open set and a selection. `naas-app.js` maps state to template values; the Observe markup is replaced. Everything else in the storefront stays.

**Tech Stack:** dc-runtime templates, SVG, ES modules, `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-09-observe-dashboard-design.md`

## Global Constraints

- Dashboard, not presentation: no verdict sentences, no next-stop rows, no eyebrows. Numbers, states, deltas, a queue, a panel, actions on the thing.
- Keep the shell and the fx grammar. New elements use `fx-kpi`, `fx-card`, `fx-btn`, `fx-chip`, `fx-alert` only.
- Data honesty: public destinations stay unresolved ips; private resolve to resource names.
- After markup patches: tag-balance scan per section; screenshot Compose; zero console errors on the four estates.

---

### Task 1: `naas-flowmap.js` with tests
Build `buildMap(est, inv, flows, { open, filterRegion, mode, t })` → `{ W, H, heads, nodes, ribbons }` and `trail(key)`, `childrenOf(node)`. Tests: roots, open a site class (metros), open a metro (sites), open a tag (regions → vpcs → subnets → workloads), open a destination, ribbons carry from/to keys, filterRegion narrows, delta and state on nodes.

### Task 2: gauges and queue derivations
`gauges(conns)` → ring geometry per connection; `queue(est, ob, conns, hp)` → rows with state, age, action key. Tests.

### Task 3: panel derivation
`panelFor(key, ctx)` → `{ trail, overview, impact, records, actions }` for a node key or a connection id. Tests for a connection, a region node, a workload leaf.

### Task 4: markup and wiring
Replace the Observe perf block: tiles with deltas (filters), queue, map card with controls (state/delta, scrubber, play, trail, keyboard), gauges strip, panel. State keys: `mapOpen`, `mapSel`, `mapHov`, `mapPins`, `mapMode`, `mapRegion`, `mapT`, `mapPlay`, `panelTab`. Remove patterns, connections table, impact card, logs section, next stop, act-on-it.

### Task 5: verify, deploy, handoff note
Playwright walk: open five levels, select, panel tabs, gauge click filters, tile click recolors, keyboard, scrub. Commit, push, deploy, live capture. PATCHES.md section 9.

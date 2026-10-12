# Portal MVP, drop 2: the journey and the visuals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The portal MVP gets the task flow (the existing customer's journey, six beats on the portal's own data) and a visual grammar on every page, without inventing a field the portal does not have.

**Architecture:** `naas-portal-journey.js` is the pure beats model (today, source, found, intent, recommend, request) over the contract's lists; `naas-portal-app.js` turns it into the stage the storefront already draws (`.js-steps`, `.js-stage`, `.js-node`, `.js-wire`, `.js-net`, `.js-opts`, `.js-intent`, `.js-act`, all in storefront.css) and gives every page a picture band: the path strip (`.ps big`) with the page's station lit and a legend of that page's counts as glyphs. Recommended's score cell becomes the `.js-score.md` ring.

**Spec:** docs/superpowers/specs/2026-10-12-portal-mvp-design.md, section 4 ("the journey, six beats") and Micah, 2026-10-12 12:29: "There's no task flow in the mvp. No journey. No visuals."

## Global Constraints
As drop 1: fold at 1440x900, nothing boxed, no em dashes, no orange or purple, nothing below 12px, no sc-for in table/svg/select, vocabulary circuits/networks/POPs/VPCs/subnets/bytes, a missing field removes its column. Reuse the storefront's `.js-*` and `.ps` classes; add portal-only rules in portal.dc.html's style block only where no class exists.

## Review Focus
1. A fixture with no discovery for the picked cloud: the scan ends on "Nothing found for AWS" and offers another cloud; never a blank node. (Task 1)
2. Connect with AT&T from Discovery lands in the journey at Found with that region picked; Back from Found returns to Discovery, not to Today. (Task 2)
3. Request on the journey writes the same record Recommended writes, once; the page's Recommended then reads Requested. (Task 2)
4. The picture band plus 12 rows ends inside 900 on every page, both fixtures, both states, both themes. (Task 3)
5. The journey's stage with 3,000 circuits draws a sample of glyphs, not 3,000; the count stays exact. (Task 1)

### Task 1: the beats model
Create `naas-portal-journey.js`, `tests/portal-journey.test.mjs`. Produces: `BEATS` (keys today, source, found, intent, recommend, request; label, short, icon, title), `todayOf(circuits)` → `{ circuits, sites, networks, groups: [{ key, label, icon, ink, n, nF }], cells: [{ icon, ink, title }] (≤ 20, proportional) }`, `PROVIDERS` (Azure, AWS, GCP, Oracle: key, name, mark, cred), `providersOf(discovery)` → each with `live` when discovery carries it, `foundOf(data, cloud)` → `{ has, name, mark, regions: [{ key, csp, region, label, vpcs, subnets, on, att, bytesOut? }], vpcs, subnets, bytesOut? }` using `attJoin`, `lineOf(beat, ctx)` → one sentence ≤ 9 words.

### Task 2: the stage, the beats, the doors
Modify `naas-portal-app.js` (state `journey`, `jStep`, `jProv`, `jScan`, `jRegion`, `jPick`; `journey(d, s, set)` → `jr` with `steps`, `line`, `stage`, `sites`, `cloud`, `providers`, `scan`, `regions`, `intent` (shared `answers`), `options` (top 3 with ring values, pick), `act`, `back`, `exit`, `requestedLine`), `portal.dc.html` (the `<section class="js">` under `journeyOn`, the rail hidden, the header's Dashboard exit), rail item `Connect a cloud` at the top, Connect with AT&T → journey at Found. Tests `tests/portal-journey-app.test.mjs`. fold.mjs `--page portal` walks the beats.

### Task 3: the picture band and the ring
Modify `naas-portal-app.js` (`pic` per page: `strip: [{ key, icon, short, state }]` five stations with the page's lit `set`, `legend: [{ icon, ink, n, label }]`), `portal.dc.html` (band above each table; Recommended's score cell as `.js-score.md`), `PAGE_ROWS` 15 → 12. Tests `tests/portal-pic.test.mjs`. Fold both fixtures, states, themes.

### Task 4: ship
Zip rebuilt and cold-booted (git rm the old one), push, live walk, memory.

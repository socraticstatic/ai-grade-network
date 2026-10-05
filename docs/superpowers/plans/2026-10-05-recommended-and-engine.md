# Recommended uncrowded; the Policy engine on NetBond Advanced's verbs

Micah, 2026-10-05: "'Recommended' is way too crowded, and 'Policy Engine' doesn't look like a good
engine with AT&T's allow, deny, manipulate, advertise that's on netbond advanced. you were supposed
to use that as a foundation."

## Recommended (Connect)

Today every row draws Today and three tiers, six lines each: 120 cells on a page of five.
After: one move open at a time. A collapsed row is one line of two: rank square, title and counts,
Today (strip + path word) → the picked tier (strip + label + price), what it saves, Attach, a chevron.
The open row draws Today and the three tiers side by side, four equal columns, roomier rows.
The first row on the page opens by default; a tier pick works inside the open row; paging resets.

- naas-app.js movesVals: `open`, `toggleOpen`, `pick` (the picked tier) per move; `moveOpen` state.
- NaaS Storefront.dc.html: the row becomes a header line plus an `sc-if mv.open` detail block.
- tests: moves-open.test.mjs (new), moves-strip.test.mjs (row plan), markup.test.mjs census.

## Policy engine (Govern)

NetBond Advanced's Configure > Policies sheet (Deny actions, Manipulations, Allow actions, Advanced;
a wash row per rule with a toggle per direction) becomes the engine's result for the picked flow:
each toggle is on when a policy that matches the flow pushes that rule in that direction, and the
row names the policy that sets it (first in precedence). The verdict, the strip and the trace move
to the right column; the trace reads as NetBond's Connection > Policies list: precedence square,
name, verb badges, Won / Overridden.

Estate policies carry no `route`; `routeRulesOf(p)` derives NetBond's rules from what a policy
requires (private path → deny block default routes, allow matching routes; inspection → selective CV
tagging and CV-to-tag; segmentation → CV filters; SLO/two paths → prepend ASNs; egress → block
default routes, advertise static routes). verbBadges and the per-connection compile read it, so the
Policies list, the engine summary and the sheet agree.

- naas-policy-layers.js: `routeRulesOf`, `flowSheet`; verbBadges / contributions / evalPolicies read routeRulesOf.
- naas-app.js engine block: `engSheet`, trace rows with `prio` and `badges`.
- markup: left panel = picker + sheet; right = verdict + strip, trace, conflicts, shadowed, intended.
- tests: policy-sheet.test.mjs (new), engine-flywheel.test.mjs (markup anchors), markup census.

## Gates

node --test tests/*.test.mjs green; scripts/fold.mjs on connect and govern for every estate, both
themes, 0 FAIL; headless screenshots of both pages before and after.

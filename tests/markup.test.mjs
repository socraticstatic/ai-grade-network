import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
const count = (re) => (HTML.match(re) || []).length;

test('the page title row leads with the verdict and demotes the stat line', () => {
  const i = HTML.indexOf('{{ pageTitle }}');
  assert.ok(i > 0, 'the page title row is gone');
  const row = HTML.slice(i, i + 900);
  assert.ok(row.includes('{{ pageVerdict }}'), 'the written verdict is not bound in the title row');
  // The stat line restated the four tiles directly beneath it: "1 of 8 regions
  // public · 16 attached · 7 sites" over a CONNECT tile reading "1 of 8 regions".
  assert.equal(HTML.includes('{{ pageStat }}'), false, 'the stat line is back, and the tiles still say it');
  assert.equal(HTML.includes('{{ pageSub }}'), false, 'pageSub is retired');
  // deptVerdict was the same ternary under a name nothing bound. One copy, or it drifts.
  assert.equal(APP.includes('deptVerdict'), false, 'deptVerdict was renamed to pageVerdict, not duplicated by it');
});

// The census. A stray closing tag has twice shipped in this file and silently
// killed every screen below the edit, so the counts are pinned and not merely
// balanced: a markup change that moves one of them has to come here and say so.
// Wave 1 closed at div 855 / span 634 / button 245 / sc-if 282 / sc-for 172.
// Wave 2 Task 8 adds the drawer's crumb row - one div, one sc-for, one button,
// one span, three sc-ifs (isLevel, hasCrumbs, notLast) - and three capability
// sc-ifs around search, the chip rows and the Select all bar. Fix round 1
// splits that last one in two - capSearch over the count, capBulk over Select
// all alone - for a sixth: sc-if 282 -> 289.
// Task 10 turns the three column headers (SITES, CLOUDS, band) into flex rows:
// each gains one wrapping div, its door button under an sc-if (has), and its
// ruling-1 disabled span under a second sc-if (hasNot). Three headers, so
// div 856 -> 859, span 635 -> 638, sc-if 289 -> 295, button 246 -> 249.
// Task 11 swaps the band's dead `+N more` div for a `<button>` at the same
// spot inside its foreignObject: one element, div -1 / button +1, nothing
// else moves. div 859 -> 858, button 249 -> 250.
// Task 12 splits the one `crumbs` row into two trails (site + cloud, joined
// by `·`) and replaces the dangling `›` with a per-crumb `notLast` gate on
// both trails, dropping the static `{{ layerLabel }}` span entirely. Net
// over the old four lines: +1 sc-for (the new cloudCrumbs loop), +2 sc-if
// (cr.notLast, plus hasCloudCrumbs wrapping a second cc.notLast - the old
// sS3/layerLabel sc-if it replaces was already counted), +1 button (the
// cloud trail's own crumb button), +2 span (the cloud trail's wrapping span
// and its `·` separator span). sc-if 295 -> 297, sc-for 173 -> 174,
// button 250 -> 251, span 638 -> 640.
// Wave 4 Task 5 replaces the title row's "Updated Xm ago" button with a
// single label that IS the cadence control (the Re-discover button beside
// it is untouched, unchanged since before this task): the visible
// "Scanned … · next …" text and a link-coloured caret sit inside the label
// as two spans, with a transparent <select> absolutely positioned over the
// whole label so a click anywhere on the phrase opens the cadence menu
// (fix round 1 - the brief's first cut drew the phrase and the picker as
// separate elements, which widened the controls group enough to wrap the
// verdict line on Observe and Cost). Net -1 button (the "Updated" button
// is gone, nothing replaces it as a button), +2 span landing inside the
// one +1 label (its own opening <label> is new; the select and its six
// options are not pinned here). button 251 -> 250, span 640 -> 641,
// label 26 -> 27.
// Wave 4 Task 6 gives the Accounts card a Next scan column and a per-row
// cadence cell: two new header cells (div +2) and, per body row, a Next
// scan div plus a cadence cell div holding two sc-ifs (canSchedule,
// noSchedule) - a five-option <select> for the scheduled case and a
// fallback <span> for the AT&T inventory rows (select and option are not
// pinned). div 858 -> 862, sc-if 297 -> 299, span 641 -> 642.
// Wave 4 Task 9 closes the loop at intake: the end-of-scan "Keep it current"
// card is a new sc-if wrapping an fx-alert - the wrapper div, the
// fx-alert-body div, its text-column div, and the fx-alert-title and
// fx-alert-text divs inside that (div +5); the alert icon span and the
// cadence field's fx-label span (span +2); the fx-filter label around the
// cadence field (label +1); a five-option <select> for the cadence picker
// (select and option are not pinned); and the "Keep this cadence" button
// (button +1). The three "refreshed daily" copy swaps add and remove no
// tags. div 862 -> 867, span 642 -> 644, sc-if 299 -> 300, label 27 -> 28,
// button 250 -> 251.
// Wave 3 Task 4: the AT&T network band's empty state is a new sibling sc-if inside
// fabOpen, one card - a wrapper div, its head div, its copy div (div +3), a
// foreignObject (not pinned here), and the "Attach a region" button
// (button +1). div 867 -> 870, sc-if 300 -> 301, button 251 -> 252.
// The sub layer: one aside wrapping the three blocks that were stacked under
// Discover's picture. Its own chrome is the aside, a header div, a body div,
// the title h2, a subTabs sc-for with its button, and a Close button. The run
// panel adds a wrapper div, a scanLine sc-if with its div, and a scanSteps
// sc-for whose row is a div, a span and two divs. Three panel gates (sources,
// run, found) plus the subOpen gate. Nothing inside the three blocks moved.
// div 870 -> 878, span 644 -> 645, sc-if 301 -> 306, sc-for 174 -> 176,
// button 252 -> 254, aside 9 -> 10.
// Personas and states: the discovery bar is gated to Discover and the telemetry
// window to Observe and Cost (sc-if +2), and the stat line that restated the
// four tiles is deleted (div -1). div 878 -> 877, sc-if 306 -> 308.
// Observe and Cost layer their drill-downs: Insights, Logs, Forecast and
// Charges move into the sub layer, each under a panel gate. Insights and
// Charges carry their own guards (hasAnomalies, hasAttCharges) with them.
// Pure move plus four gates. sc-if 308 -> 312.
// Observe and Cost layer their drill-downs: Insights, Logs, Forecast and
// Charges move into the sub layer, each under a panel gate. Insights and
// Charges carry their own guards (hasAnomalies, hasAttCharges) with them.
// Pure move plus four gates. sc-if 308 -> 312.
// The middle becomes the path: five segments (Access, Edge, Core, Edge, Access)
// replace the four product-layer cards. Each card was a g with a rect and a
// foreignObject holding four divs, three spans and two sc-ifs (findings,
// fabOpen); each segment is a g, a rect, a line and a text, none of them
// pinned here. The segment label is a foreignObject with one div, because the
// runtime wraps an interpolation in an HTML span and a span inside SVG <text>
// draws nothing. div 877 -> 874, span 645 -> 642, sc-if 312 -> 310.
// Stage 2: routes cross the segments. A legs loop draws each leg and, where it
// names an on-ramp, a chip (one sc-if, one foreignObject div); a handoffs loop
// draws a dot where the owner changes. div 874 -> 875, sc-if 310 -> 311,
// sc-for 176 -> 178.
// The customer's own cross-connect, marked on its handoff (one loop): sc-for 178 -> 179.
// Things in each segment: the legs loop (and its chip: one sc-if, one div) and the
// bends loop become a pieces loop and a things loop (a pill: two divs).
// div 875 -> 876, sc-if 311 -> 310, sc-for unchanged at 179.
// Provider cards, the first level on the right (one loop; a mark sc-if, a mark
// span and a caret span, four divs): div 876 -> 880, span 642 -> 644,
// sc-if 310 -> 311, sc-for 179 -> 180.
// The center band: each segment label and each thing gets a span (a pill and an
// owner dot), and a loop runs traffic along every route: span 644 -> 646,
// sc-for 180 -> 181.
// The fold: a folded side's name reads on end (one div): div 880 -> 881.
// Folded names moved to their own loop above the lines, as upright pills (one
// loop, two divs where one was): div 881 -> 882, sc-for 181 -> 182.
// A provider with no mark gets a monogram tile so titles align (one sc-if, one
// span): span 646 -> 647, sc-if 311 -> 312.
// Sources is a page for a customer with none (a tile loop with a mark or a
// monogram, and one button for discovery, where one box and one button were):
// div 882 -> 886, span 647 -> 653, sc-if 312 -> 314, sc-for 182 -> 183, button 254 -> 255.
// Source management: the accounts table moved from the drawer to the Sources
// page, and the drawer became an add-or-edit form (provider tiles, credential
// pills, scope and schedule, save and re-scan): div 886 -> 896, span 653 -> 658,
// sc-if 314 -> 321, sc-for 183 -> 185, button 255 -> 258, label 28 -> 27.
// Persona, estate and theme moved from the account menu to the rail's foot (a
// footer div, a label span, and gates for the rail width and the two icons):
// div 896 -> 897, span 658 -> 659, sc-if 321 -> 325.
// The breadcrumb row above the tiles became depth ladders above the picture (two
// loops of stepped buttons, a bar div) and the drilled columns got tint rects:
// div 897 -> 898, span 659 -> 663, sc-if 325 -> 322, button 258 -> 257.
// The ladders came out again the same day: each column's header became its
// breadcrumb (a nav, two gates for link or current) and the accent edges went:
// div 898 -> 897, span 663 -> 659, sc-if 322 -> 326, button 257 -> 255.
// "Really shoved in and sloppy": the trails left the headers for one row of
// their own above the picture (a div), and the headers got their titles back:
// div 897 -> 898, span 659 -> 661. The Sites and Clouds headers then took a
// spacer and a shrinking tail each, so a long door slides past the card edge
// instead of under the title: span 661 -> 665.
// The six insight cards come back in the Observe drawer (2026-09-28): a grid
// div and the cards' own markup from iteration 1, one new gate (hasIw) and the
// findings card's gate renamed in place:
// div 898 -> 942, span 665 -> 705, sc-if 326 -> 330, sc-for 185 -> 191, button 255 -> 261.
// The Observe drawer's Records tab gives way to Policies and Tags (2026-09-28):
// two panels, each a gate, a card, a header row, a row loop and an empty state:
// div 942 -> 956, span 705 -> 726, sc-if 330 -> 336, sc-for 191 -> 193, button 261 -> 264.
// Their cards dropped the title the drawer already shows: div 956 -> 954.
// Estate's Act on it strip became two rows of insight widgets (2026-09-28), a
// head with the window, two grids and their cards, rows and moves:
// div 954 -> 967, span 726 -> 734, sc-for 193 -> 197, button 264 -> 265.
// Observe Insights left the drawer for a page and its findings shed their
// why, did and do lines (2026-09-28): div 967 -> 965. Logs followed it to a
// page of its own, in a page wrapper: div 965 -> 966. Each insight card drills
// to its findings (a link per card, a focus chip on Findings): sc-if 336 -> 337,
// button 265 -> 272. The map's head traded its subtitle, persona line and
// pattern/colour blocks for six rollup tiles and two segmented controls, and
// Health stopped describing itself: div 966 -> 961, span 734 -> 730,
// sc-if 337 -> 336, sc-for 197 -> 198, button 272 -> 271. Each path in the
// map's middle says what it is doing on a second line: div 961 -> 962.
// Cards that open carry a count pill that reads Open on hover, the folded
// stacks a +, and a first visit one hint: span 730 -> 745, sc-if 336 -> 341,
// button 271 -> 272. Traffic gained an Over time card (daily, weekly,
// monthly): div 962 -> 970, span 745 -> 755, sc-if 341 -> 342,
// sc-for 198 -> 201, button 272 -> 273. Help & Resources became a page with a
// ? in the header (hero, guides, resources, glossary): div 970 -> 993,
// span 755 -> 768, sc-if 342 -> 349, sc-for 201 -> 207, button 273 -> 279,
// section 11 -> 12, label 27 -> 28. The review pass (2026-09-28): Cost's
// paragraph became two move cards, the Through AT&T column and its mislabelled
// table left Traffic, the Insights cards kept one action each, and Help's four
// Coming soon cards folded into a line: div 993 -> 989, span 768 -> 756,
// sc-if 349 -> 348, button 279 -> 271. The move cards got a row inside them:
// div 989 -> 990.
// No scrolling, part two (2026-09-28): Insights, Help and Govern got tab rows
// (sc-for +2, button +2 net of the removed eyebrows and tag row), Logs tables
// sit in capped frames, Govern's table in a gov-frame, Connect's Scope moved
// beside "What you have" and its bottom row left, the empty front door lost
// its second title (section 12 -> 11), the scan skeleton became a tab row and
// three cards, and the title divider got a gate: div 966 -> 955,
// span 734 -> 732, sc-if 357 -> 364, sc-for 208 -> 210, button 269 -> 271.
// Connect views and the Options page (notes, 2026-09-29): div 955 -> 971, span 732 -> 736, sc-if 364 -> 368, sc-for 210 -> 214, button 271 -> 273.
// One findings list with a life each, and the finding drawer (notes, 2026-09-29): div 971 -> 996, span 736 -> 758, sc-if 368 -> 376, sc-for 214 -> 217, button 273 -> 278, aside 10 -> 11.
// Cost · Banked (notes, 2026-09-29): div 996 -> 1002, span 758 -> 765, sc-if 376 -> 377, sc-for 217 -> 219.
// Group sites by access type (notes, 2026-09-29): span 765 -> 766, sc-if 377 -> 378, label 28 -> 29.
// Business units: Estate tab, Group option (notes, 2026-09-29): div 1002 -> 1012, span 766 -> 773, sc-if 378 -> 381, sc-for 219 -> 221, button 278 -> 281.
// Savings grouped by region, business unit, cloud (notes, 2026-09-29): div 1012 -> 1019, span 773 -> 783, sc-for 221 -> 222, label 29 -> 30.
// Consistency pass: one tab style, one time control, no repeated headers (2026-09-29): div 1019 -> 1014, span 783 -> 782.
// Product views tab row (no-scroll, 2026-09-29): div 1014 -> 1015, sc-if 381 -> 382, sc-for 222 -> 223, button 281 -> 282.
// Forecast a Cost tab; Logs uncontained, paged (Micah, 2026-09-29): span 782 -> 784, button 282 -> 286.
// Forecast: one card, two columns (2026-09-29): div 1015 -> 1014.
// Nothing boxed: lists page on the page, drawer views became tabs (Micah, 2026-09-29): div 1014 -> 1000, span 784 -> 776, sc-if 382 -> 383, sc-for 223 -> 220, button 286 -> 293.
// Tags pager (2026-09-29): div 1000 -> 1001, span 776 -> 777, sc-if 383 -> 384, button 293 -> 295.
// Ways to connect unboxed; Lens in the tab row (2026-09-29): div 1001 -> 996, span 777 -> 776, sc-if 384 -> 385, sc-for 220 -> 219, button 295 -> 294, label 30 -> 31.
// Your sites drill by place (Micah, 2026-09-29): div 996 -> 975, span 776 -> 716, sc-if 385 -> 366, sc-for 219 -> 205, button 294 -> 273.
// Your clouds drill + rollup, tree and filters row retired (audit, 2026-09-29): div 975 -> 881, span 716 -> 608, sc-if 366 -> 331, sc-for 205 -> 182, button 273 -> 245, aside 11 -> 10, label 31 -> 30.
// The site filter row over the picture (2026-09-29 audit): div 881 -> 884, span 608 -> 613, sc-if 331 -> 334, sc-for 182 -> 185, button 245 -> 252.
// Scope dropdowns off Connect, Govern, Cost (2026-09-29 audit): span 613 -> 610, sc-for 185 -> 182, label 30 -> 27.
// Window badges on the Traffic tiles (2026-09-29 audit): span 610 -> 611, sc-if 334 -> 335.
// Clear filters only with filters (2026-09-29 audit): sc-if 335 -> 336.
// Traffic overlays: jump, scope picker, zoom trail (2026-09-29 audit): div 884 -> 885.
// Cost: one slot per panel, no expanders (2026-09-29 audit): div 885 -> 884, span 611 -> 607, sc-if 336 -> 340, button 252 -> 254.
// Authoring hides the findings rows (2026-09-29 audit): sc-if 340 -> 341.
// NaaS home is Your network; Connect is its own page (Micah, 2026-09-29): sc-if 341 -> 342.
// Logs pagers only with more than one page (2026-09-29 audit): sc-if 342 -> 344.
// Explain parts as one line of chips (2026-09-29 audit): div 884 -> 883, span 607 -> 604, button 254 -> 255.
// The drill traces through the map (2026-09-29): sc-for 182 -> 183.
// Map values and path lines sit on a backing (2026-09-29): span 604 -> 605.
// Sankey views, legend and Health (2026-09-29): div 883 -> 884, span 605 -> 602, sc-for 183 -> 185, button 255 -> 256.
// Spend joins Savings and Forecast (2026-09-29): div 884 -> 878, span 602 -> 597, sc-if 344 -> 343, sc-for 185 -> 186.
// Spend joins Savings and Forecast; charges in two columns (2026-09-29): div 878 -> 880.
// Policies by layer (2026-09-29): div 880 -> 884, span 597 -> 604, sc-if 343 -> 344, sc-for 186 -> 190.
// Findings: pictures and a table (2026-09-29): div 884 -> 894, span 604 -> 623, sc-if 344 -> 345, sc-for 190 -> 195, button 256 -> 258.
// At a glance: rings and apps (2026-09-29): div 894 -> 889, span 623 -> 643, sc-if 345 -> 346, button 258 -> 261.
// At a glance: rings and apps (2026-09-29): span 643 -> 644.
// Connections: bandwidth in the open, in the Observe card (2026-09-29): span 644 -> 660, sc-for 195 -> 197.
// Reset demo at the rail foot (2026-09-30): button 261 -> 262.
// Your sites: Service and Bandwidth columns (2026-09-30): span 660 -> 662.
// Your clouds: How they connect (2026-09-30): div 889 -> 892, span 662 -> 665, sc-for 197 -> 199.
// Cost > Optimize replaced the two-moves strip (2026-09-30): div 892 -> 896, span 665 -> 666, sc-if 346 -> 351, sc-for 199 -> 200, button 262 -> 262.
// Observe > Health, and the Queue drawer retired (2026-09-30): div 896 -> 900, span 666 -> 681, sc-if 351 -> 356, sc-for 200 -> 204, button 262 -> 265, aside 10 -> 9.
// The Health legend (2026-09-30): div 900 -> 901, span 681 -> 687.
// Capacity's empty state (2026-09-30): sc-if 356 -> 357.
// Discovery found (2026-09-30): div 901 -> 906, span 687 -> 688, sc-if 357 -> 358, button 265 -> 267.
// Remove on an added source (2026-09-30): sc-if 358 -> 359, button 267 -> 268.
// Health by segment (2026-09-30): the By app | By segment toggle, the nine rows and their in-place drill: div 906 -> 912, span 688 -> 708, sc-if 359 -> 365, sc-for 204 -> 208, button 268 -> 274.
// Cost by leg (2026-09-30): three leg tiles over three paged lists, the Modelled mark, and the Cost view's door to them: div 912 -> 927, span 708 -> 726, sc-if 365 -> 375, sc-for 208 -> 212, button 274 -> 281.
// Paths and Changes (2026-09-30): the hop table with Site to app, the changes strip as positioned divs, and the changes list: div 927 -> 944, span 726 -> 751, sc-if 375 -> 383, sc-for 212 -> 219, button 281 -> 286.
// Insights > Operations (2026-09-30): four underline subtabs, tiles, the sample fixes, tickets with the Andi toggle, availability, maintenance and changes: div 944 -> 977, span 751 -> 812, sc-if 383 -> 401, sc-for 219 -> 226, button 286 -> 297.
// Your actions and Monthly briefing (2026-09-30): role chips, the role's visuals and actions (Do it disabled), the briefing, who gets it, the longhand cadence select: div 977 -> 1005, span 812 -> 825, sc-if 401 -> 413, sc-for 226 -> 231, button 297 -> 310, label 27 -> 28.
// Down and Over SLO apart (review, 2026-09-30): each problem row prints its state word beside the dot: span 825 -> 827.
// Resize reviews the real change (final review, 2026-09-30): the totals and the term saving hide when the order carries no price, and its price line shows instead: div 1005 -> 1006, sc-if 413 -> 416 (merged after the state words: span stays 827).
// Every order review reads true (review round 2, 2026-09-30): the policy table hides behind hasOrderPolicies when the order ships none, and the term chips move inside the existing orderPriced gate (no new tag): sc-if 416 -> 417.
// The NaaS home (2026-09-30): the launch-points strip left Connect (its gate, grid, loop, tile button and six spans) and s0
// became one home section: a title row with role chips and a Since label, the persona band (Andi's briefing, Waiting on
// you with Your actions' row pattern), the empty estate's first step, the five-area strip and Now; each half of the band
// ends in its door (Monthly briefing, Your actions):
// div 1006 -> 1027, span 827 -> 837, sc-if 417 -> 429, sc-for 231 -> 234, section 11 -> 12, button 310 -> 322, label 28 -> 29.
// Over time's legend isolates a series (2026-09-30, "outside of at&t is so small its not visible"): two legend spans become one sc-for of buttons, plus the scale line: span 837 -> 836, sc-if 429 -> 430, sc-for 234 -> 235, button 322 -> 323.
// The NaaS home, v2 (2026-09-30, Micah: "home page is too wordy! this isn't a white paper"): the greeting, the
// head, the Since label, the briefing band, the five-area strip and Now left; the role chips and an Andi's briefing
// link, the take-away (icon tile, its h1 a door, the line's parts each a door, the action), four snapshot cards (a head door, the big figure, its unit and
// swatch, a ring of arc buttons, health dots, an egress sparkline, an exposed bar, the foot's figures and legend),
// Waiting on you as three chips (open, Accept, a door) and Empty's one step with its picture came in:
// div 1027 -> 1028, span 836 -> 827, sc-if 430 -> 434, sc-for 235 -> 240, button 323 -> 326, label 29 -> 28.
// Insights opens on Signals, nine cards in one loop (2026-09-30, "Observe insights is light"): the six hand-written cards
// (44 div, 40 span, 5 sc-if, 6 sc-for, 6 button, their rows clickable divs) become the persona chips, the pager, one card
// loop whose title, figures, weeks and count are buttons with each row's move beside its figure, the in-place full list
// an empty card's first step (Capacity with nothing attached offers Attach) and the empty estate's first step
// (25 div, 21 span, 12 sc-if, 9 sc-for, 17 button):
// div 1027 -> 1008, span 836 -> 817, sc-if 430 -> 437, sc-for 235 -> 238, button 323 -> 334.
// Connect > Recommended replaced Options (2026-09-30, Micah: "The options don't make much sense"): the two
// candidate columns (group loop, row loop, pager, Attach per row) became one ranked list of moves: a head row
// with the pager and Attach N selected, the "With AT&T" caption over the tiers, a row per move (rank checkbox,
// title, a counts loop of set doors, the reason, Attach and Compare ways to connect, the attribute labels,
// Today's three figure doors) and a tiers loop of three pickable columns, plus the empty state with its one step:
// div 1027 -> 1030, span 837 -> 863, sc-if 429 -> 431, sc-for 234 -> 235, button 322 -> 331.
// Same day, second pass: each tier's Cost reads its monthly after and what that saves or adds, the way
// Performance reads its ms (a value span and a delta span in a row): span 863 -> 865.
// Recommended merged onto Over time's legend (2026-09-30): both land, so each count is the sum of the two moves: span 865 -> 864, sc-if 431 -> 432, sc-for 235 -> 236, button 331 -> 332.
// The connect flow (2026-09-30, Micah: "ways to connect doesn't work - take from netbond advanced's
// flow", "options and orders is so weird"): Ways to connect became NetBond Advanced's nine
// connection types with a count that opens its set in place, each member a button that starts an
// order with it attached (the three NetBond / SD-WAN / Hyperscaler cards and the path table left
// it); Orders is a new Connect page (placed this session, the order in progress in an aside, No
// orders yet); S4 became the flow: a stepper with honest states, a gate per step (type, provider,
// endpoints, basic, advanced, terms, review) with the path table rebuilt in Connection Profile,
// the policy block, the free-text box kept on Connection Type, the order's "All N" list in the
// main column, a Review total, and "Your order, in progress" (rows, the path picture with its
// ends as buttons, the running price) in place of Composed so far; the six-step wizard's cards
// went with it:
// div 1027 -> 1115, span 837 -> 920, sc-if 429 -> 474, sc-for 234 -> 245, button 322 -> 346, aside 9 -> 10, label 29 -> 31.
// The flow merged onto Recommended (2026-09-30): each count is Recommended's plus the flow's own move: div 1030 -> 1118, span 864 -> 947, sc-if 432 -> 477, sc-for 236 -> 247, button 332 -> 356, aside 9 -> 10, label 29 -> 31.
// The home v2 merged onto the connect flow (2026-09-30): each count is the flow's plus the home's own move: div 1118 -> 1119, span 947 -> 938, sc-if 477 -> 481, sc-for 247 -> 252, button 356 -> 359, label 31 -> 30.
// The home skeptic's fixes (2026-09-30): the Exposed bar's track left for a button of a hundred cells (div 1119 -> 1118),
// and Violations & policies prints its total beside the Policies head, Your actions its count beside its title (span 938 -> 940).
// The home's third skeptic (2026-09-30): the map's legend draws a dot for a Health state as well as a line,
// one more span under one more sc-if (lg.isDot): span 940 -> 941, sc-if 481 -> 482.
// Signals merged onto the connect flow (2026-09-30): each count is the flow's plus Signals' own move: div 1118 -> 1099, span 947 -> 928, sc-if 477 -> 484, sc-for 247 -> 250, button 356 -> 367.
// Signals, second round (2026-09-30): Egress growth's labels under its first and last week became the buttons that open those weeks: span 928 -> 926, button 367 -> 369.
// Signals merged onto the home v2 (2026-09-30): each count is the home's plus Signals' own move: div 1118 -> 1099, span 941 -> 920, sc-if 482 -> 489, sc-for 252 -> 255, button 359 -> 372.
// Cost tells its story (2026-09-30: "what does the 51k even mean"; "cost by leg ... numbers just are confusing";
// "cost by region needs love"): Spend's tiles are buttons, and the 90-day tile holds two figure buttons; the chart's
// columns are buttons with a forecast band, two lines and two end labels, and the month labels are their own row; the
// savings rows are buttons and the Group label went; By leg gains the filter bar (By chips and members), the legend, a
// back row per leg, tiles that are buttons and a swatch on every row, now a button; By region is a new chart of bars
// (buttons) with its chips and legend, and the old savings strip and arithmetic table left:
// div 1027 -> 1006, span 836 -> 848, sc-if 430 -> 437, sc-for 235 -> 241, button 323 -> 340.
// Cost merged onto the connect flow (2026-09-30): both land, so each count is the flow's plus Cost's own move: div 1118 -> 1097, span 947 -> 959, sc-if 477 -> 484, sc-for 247 -> 253, button 356 -> 373.
// Cost v2, the skeptic's fixes (2026-09-30): Spend's right column gates on hasSaveList and holds either the Savings list
// (each row a div with its banked and still-open figures as two buttons) or the banked sources (a back button, a row loop of
// buttons, the empty line, a pager); By region gains the per-region save column beside the bars (its grid and column, a head
// with the arithmetic toggle, a summary loop of rows with today, to save and Attach, an arithmetic loop, a pager); By
// destination's ring and bar are gated: div 1097 -> 1111, span 959 -> 968, sc-if 484 -> 496, sc-for 253 -> 256, button 373 -> 385.
// The skeptic's third read (2026-09-30): Insights' New destinations draws every class in one ink, named in its row, so its
// colour legend (an sc-if, a div and three swatch spans) left: div 1111 -> 1110, span 968 -> 965, sc-if 496 -> 495.
// Cost merged onto Signals and the home (2026-09-30): Cost's own move, less its edit to the old insight cards Signals replaced (div -1, span -3, sc-if -1): div 1099 -> 1092, span 920 -> 941, sc-if 489 -> 508, sc-for 255 -> 264, button 372 -> 401.
// Modify bandwidth (Micah, 2026-09-30: "option to resize bandwidth like the netbond advanced flow"). Capacity's rows stop being one
// button: a row div holds nine figure buttons (name, Ports with its Modify bandwidth line and in-progress note, bar, Avg, Peak,
// Headroom, Trend, Full in, State), inside one new grid div: div +1, span -5, sc-if +2, button +8. The drawer is one aside with its
// head, the current size, three figures (Logs buttons or a plain Headroom), the AWS note, the ports stepper, the size ladder, the
// legend, the price change, a footer row of when (and a pick short of the peak) or the order line beside Cancel / Apply change:
// div +29, span +34, sc-if +9, sc-for +3, button +7, aside +1.
// div 1027 -> 1057, span 836 -> 865, sc-if 430 -> 441, sc-for 235 -> 238, button 323 -> 338, aside 9 -> 10.
// Modify bandwidth merged onto the connect flow (2026-09-30): each count is the flow's plus Modify bandwidth's own move:
// div 1118 -> 1148, span 947 -> 976, sc-if 477 -> 488, sc-for 247 -> 250, button 356 -> 371, aside 10 -> 11.
// Modify bandwidth round 2 (skeptic, 2026-09-30): Capacity's rows are one button again, as on 3659e9a (div -1, span +5,
// sc-if -2, button -8), with the in-progress size under Ports (span +1, sc-if +1); the drawer gains a scrim, a heading,
// the review step (its rows, the drop-traffic note, an Approver label), the second confirm, the sent footer with View in
// Orders, and loses its Logs doors and the per-row Monthly column (div +13, span -7, sc-if +4, sc-for +1, button +5, label +1):
// div 1148 -> 1160, span 976 -> 975, sc-if 488 -> 491, sc-for 250 -> 251, button 371 -> 368, label 31 -> 32.
// Modify bandwidth merged onto Cost, Signals and the home (2026-09-30): each count is theirs plus Modify bandwidth's own move: div 1092 -> 1134, span 941 -> 969, sc-if 508 -> 522, sc-for 264 -> 268, button 401 -> 413, aside 10 -> 11, label 30 -> 31.
// w2-consistency (2026-09-30): the Traffic map's region chip moves into the card head, under its own obPanelMap sc-if, so it no longer wraps the By chips past the fold: sc-if 522 -> 523.
// w2-consistency (2026-09-30): AT&T charges with nothing attached says so and opens By leg (an sc-if, its line div and span, and the button): div 1134 -> 1135, span 969 -> 970, sc-if 523 -> 524, button 413 -> 414.
// Discover's drills merged onto the consistency pass (2026-10-01): each count is integ's plus both moves: div 1135 -> 1140, span 970 -> 963, sc-if 524 -> 530, sc-for 268 -> 279, button 414 -> 447.
// Govern made drillable (w2-govern, 2026-09-30): every count a button that opens its set. The drill under Govern's tabs
// (its wrapper, the trail row with the finding's move, the line and rule, the rows, the pager: div +7, span +7, sc-if +5, sc-for +2, button +6);
// the page head's verdict as parts (div +1, span +1, sc-if +4, sc-for +1, button +1); a finding's head (span +1, sc-if +2,
// sc-for +1, button +1); the policy total and its filter chip (span +2, sc-if +3, button +2); a row's matched (span +2,
// sc-if +2, button +1) and violations (sc-if +2, button +1); the list gates govListPolicies, govListTags and
// govListTemplates (sc-if +3); Tags' line and filter chip (span +3, sc-if +3, sc-for +1, button +2), a row's footprint
// (span +1, sc-if +2, sc-for +1, button +1) and its two exposure figures (span +2, sc-if +4, button +2); a template
// card stops being one button for its figure and Start from this (div +1, span +1, sc-if +2, button +1); Back to Govern
// on Your clouds and Your sites (sc-if +2, button +2); Optimize's figure, its parts and +N more (span +1, sc-if +4,
// button +3): div 1134 -> 1143, span 969 -> 990, sc-if 522 -> 560, sc-for 268 -> 274, button 413 -> 436.
// Discover's figures as doors (skeptic, 2026-10-01): a ring's centre, head and legend entry each a button where a list
// counts them (sc-if +6, button +3, span +1: the legend's button holds its label span); an app's row stops being one
// button to the records and becomes a div of figure buttons, workloads, runs in, on AT&T, exposed and traffic (div +1,
// span +1, sc-if +4, button +4); Back to Discover on Govern (sc-if +1, button +1):
// div 1143 -> 1144, span 990 -> 991, sc-if 560 -> 571, button 436 -> 444.
// A drill's moves, one per region its set sits in (skeptic, 2026-10-01): the one move button becomes a list (sc-for +1):
// sc-for 274 -> 275.
// Govern merged onto Discover's drills (2026-10-01): Discover's rings and apps table win over Govern's own version of them
// (its ring and app-row markup dropped), Govern's Back button rides Discover's filter rows; recounted from the file, every
// tag balanced: div 1140 -> 1149, span 963 -> 984, sc-if 530 -> 569, sc-for 279 -> 286, button 447 -> 471.
// Dev's Insights content (2026-10-01): a role question on the home and on Signals (span +2); the action's outcome replaces its
// save gate and Coming soon moves to the button's title (sc-if -1, span -1): span 984 -> 985, sc-if 569 -> 568.
// Dev's home (2026-10-01): KPI cards, the chart and Do next, Needs attention replace the picture cards and Waiting on you; recounted, every tag balanced.
// The egress chart's unit cost per GB line (Dev's FinOps home, 2026-10-01): span 1001 -> 1002.
// Dev's FinOps view (2026-10-01): the waterfall, what if, who pays and unit cost on the FinOps home and on Signals, with FinOps' own actions; recounted, every tag balanced.
test('every container the markup opens, it closes', () => {
  // Discover > Estate made drillable (2026-09-30, the drill rule): the title pills are buttons (span -1, button +1);
  // each ring is a button, its head and legend entries figure buttons (div -1, span -2, button +3); the Spend card
  // beside the rings (div +3, span +3, sc-for +2, button +3); the apps rows are divs whose seven cells are buttons
  // (div +1, span -7, button +6); a gap's title and line run as figure buttons (sc-for +2, button +2); Your clouds'
  // tiles, mix label, bar and legend are buttons (div -1, span -2, sc-for +1, button +4), its crumb row gains the
  // filter chip, the new-in-Your-sites link and the moves (span +1, sc-if +2, sc-for +1, button +3), and its rows are
  // divs holding a name button, the count parts, the cost and the bandwidth parts (div +1, span +1, sc-if +1,
  // sc-for +2, button +3); Business units' rows are divs with a name and a count button (div +1, span -2, button +1);
  // Your sites gains the same crumb row (span +1, sc-if +2, sc-for +1, button +3) and rows (div +1, span +1, sc-if +1,
  // sc-for +1, button +2); a source's scope is a button (button +1):
  // div 1134 -> 1139, span 969 -> 962, sc-if 522 -> 528, sc-for 268 -> 278, button 413 -> 445.
  // What an added source found reads as figure buttons, one per part of its line (2026-09-30): sc-for 278 -> 279, button 445 -> 446.
  const pairs = [
    ['div', /<div\b/g, /<\/div>/g, 1202],
    ['span', /<span\b/g, /<\/span>/g, 1030],
    ['sc-if', /<sc-if\b/g, /<\/sc-if>/g, 564],
    ['sc-for', /<sc-for\b/g, /<\/sc-for>/g, 290],
    ['section', /<section\b/g, /<\/section>/g, 12],
    ['button', /<button\b/g, /<\/button>/g, 470],
    ['aside', /<aside\b/g, /<\/aside>/g, 11],
    ['label', /<label\b/g, /<\/label>/g, 31],
  ];
  for (const [name, open, close, expected] of pairs) {
    assert.equal(count(open), count(close), `${name} is unbalanced`);
    assert.equal(count(open), expected, `the ${name} census moved to ${count(open)}; pin the new number here if the edit meant it`);
  }
});

test('every page closes the loop with a Next button in its title row', () => {
  // A strip per page became one button beside the title (2026-09-28, no scrolling).
  assert.equal(HTML.indexOf('aria-label="Next stop"'), -1, 'a Next stop strip is back');
  for (const b of ['{{ pageNext.go }}', '{{ pageNext.label }}', '{{ pageNext.text }}']) assert.ok(HTML.includes(b), `${b} is not bound`);
});

test('the station CTA stays bound to the markup', () => {
  // No arithmetic test covers stationCta's attachN count (naas-app.js:745); the
  // regression that actually bites is the binding itself falling out of the
  // markup, same failure mode as the stray closing tag this repo has shipped twice.
  assert.ok(HTML.includes('{{ stationCta.go }}'), 'stationCta.go is not bound anywhere in the markup');
  assert.ok(HTML.includes('{{ stationCta.label }}'), 'stationCta.label is not bound anywhere in the markup');
});

test('the scan shows its four beats and what each one reads', () => {
  const open = '<sc-for list="{{ scanSteps }}" as="sst"';
  const i = HTML.indexOf(open);
  assert.ok(i > 0, 'scanSteps is never rendered');
  const block = HTML.slice(i, HTML.indexOf('</sc-for>', i));
  assert.ok(block.includes('{{ sst.label }}'), 'the step has no label');
  assert.ok(block.includes('{{ sst.src }}'), 'the step never says what it is reading');
  assert.ok(block.includes('{{ sst.mark }}'), 'a finished step is not marked done');
});

// --- Wave 2, Task 8: the drawer header grows crumbs, its controls earn their place ---

const LINES = HTML.split('\n');
function lineWith(marker) {
  const i = LINES.findIndex(l => l.includes(marker));
  assert.ok(i >= 0, `marker not found in the markup: ${marker}`);
  return LINES[i];
}
/**
 * Where the `</tag>` that closes the `<tag` opening at `open` sits, counting
 * nesting on the way. -1 if it never closes.
 *
 * A gate that merely OPENS before the thing it is supposed to wrap proves
 * nothing: `<sc-if x></sc-if>CONTENT` opens before CONTENT, keeps the census
 * identical, and renders CONTENT unconditionally. Containment is the contract,
 * so every gate assertion below asks where the gate CLOSES.
 */
function closeOf(line, open, tag = 'sc-if') {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = open;
  let depth = 0;
  for (let m; (m = re.exec(line)); ) {
    if (m[0][1] === '/') { if (--depth === 0) return m.index; }
    else depth++;
  }
  return -1;
}
/** Assert `<sc-if value="{{ flag }}">` on `line` actually wraps `marker`. */
function assertWraps(line, flag, marker, what) {
  const open = line.indexOf(`<sc-if value="{{ ${flag} }}"`);
  assert.ok(open >= 0, `${what} is not gated on ${flag}`);
  const at = line.indexOf(marker);
  assert.ok(at >= 0, `${what}: ${marker} is gone from the markup`);
  assert.ok(open < at, `${flag} must open before ${what}, not after it`);
  const close = closeOf(line, open);
  assert.ok(close >= 0, `${flag} never closes - a self-closed gate wraps nothing`);
  assert.ok(close > at, `${flag} closes at ${close}, before ${what} at ${at} - the gate wraps nothing and ${what} renders unconditionally`);
}

test('the drawer header renders a clickable crumb trail', () => {
  const header = lineWith('{{ drawer.title }}');
  assert.ok(header.includes('<sc-for list="{{ drawer.crumbs }}"'), 'the header never iterates drawer.crumbs');
  assert.ok(header.includes('{{ dc.name }}'), 'a crumb never prints its display name');
  assert.ok(header.includes('{{ dc.go }}'), 'a crumb does not climb - go is unbound');
  assert.ok(header.includes('{{ dc.notLast }}'), 'the separator is not gated on notLast');
  assert.ok(header.includes('{{ drawer.canBack }}'), 'Back lost its gate, which now respects the column floor');
});

test('the crumb row is gated on a level, so dead crumbs never render', () => {
  // Task 7 leaves hasCrumbs true on the old `workloads` kind, whose crumbs carry
  // no-op `go` handlers. Both flags gate the row, as two nested sc-ifs - the
  // dc-runtime expression language has no `&&`.
  const header = lineWith('{{ drawer.title }}');
  const row = header.indexOf('<sc-for list="{{ drawer.crumbs }}"');
  assert.ok(row >= 0, 'the crumb row is gone');
  const rowEnd = closeOf(header, row, 'sc-for');
  assert.ok(rowEnd > row, 'the crumb sc-for never closes');
  // Both gates must CONTAIN the whole crumb row, not merely precede it.
  for (const flag of ['drawer.isLevel', 'drawer.hasCrumbs']) {
    const open = header.indexOf(`<sc-if value="{{ ${flag} }}"`);
    assert.ok(open >= 0, `the crumb row is not gated on ${flag}`);
    assert.ok(open < row, `${flag} must open before the crumb row`);
    const close = closeOf(header, open);
    assert.ok(close > rowEnd, `${flag} closes at ${close}, before the crumb row ends at ${rowEnd} - the gate wraps nothing and dead crumbs render on every kind`);
  }
  assert.equal((header.match(/<sc-if\b/g) || []).length, (header.match(/<\/sc-if>/g) || []).length, 'the header sc-ifs are unbalanced');
});

test('search, chips and Select all appear only where a level can use them', () => {
  // The count is FEEDBACK, not a bulk control, so it rides capSearch: wherever
  // there is a search box there is a number saying what the search matched.
  // Under capBulk it vanished on every generic level at or above 12 rows - at
  // a 21-port fabric facility you could type into the search, empty the list,
  // and read nothing telling you 0 matched.
  const gates = [
    ['{{ drawer.q }}', 'drawer.capSearch', 'the search box'],
    ['{{ drawer.paths }}', 'drawer.capChips', 'the chip rows'],
    ['{{ drawer.matchingF }}', 'drawer.capSearch', 'the matching count'],
    ['>Select all<', 'drawer.capBulk', 'the Select all bar'],
  ];
  for (const [marker, flag, what] of gates) assertWraps(lineWith(marker), flag, marker, what);
  // and the count must sit OUTSIDE the bulk gate, which is the whole point
  const bar = lineWith('{{ drawer.matchingF }}');
  assert.ok(bar.indexOf('<sc-if value="{{ drawer.capBulk }}"') > bar.indexOf('{{ drawer.matchingF }}'),
    'the capBulk gate opens before the count, so it swallows it again');
  for (const line of [lineWith('{{ drawer.q }}'), lineWith('{{ drawer.paths }}'), bar]) {
    assert.equal((line.match(/<sc-if\b/g) || []).length, (line.match(/<\/sc-if>/g) || []).length, 'the control sc-ifs are unbalanced');
  }
});

// --- Wave 2, Task 10: the three column headers compute their door ---

/**
 * [from, to) indices bounding the region from `fromMarker` to the first
 * `toMarker` that follows it - the brief's helper, not present before this
 * task. `fromMarker` sits on the opening tag (e.g. the hero svg's aria-label
 * attribute) so `to` lands on the matching close, since this markup never
 * nests an element inside another of the same kind between the two.
 */
function block(fromMarker, toMarker) {
  const from = HTML.indexOf(fromMarker);
  assert.ok(from >= 0, `marker not found in the markup: ${fromMarker}`);
  const to = HTML.indexOf(toMarker, from);
  assert.ok(to >= 0, `${toMarker} never follows ${fromMarker}`);
  return [from, to];
}

/** Every open/close tag pair the census tracks balances within [from, to). */
function assertBalanced(from, to, what) {
  const region = HTML.slice(from, to);
  for (const tag of ['div', 'span', 'sc-if', 'sc-for', 'button', 'foreignObject']) {
    const open = (region.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
    const close = (region.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(open, close, `${what}: <${tag}> is unbalanced inside the block (open=${open}, close=${close})`);
  }
}

test('each of the three column headers carries a door', () => {
  for (const b of ['{{ sitesDoor.has }}', '{{ sitesDoor.open }}', '{{ sitesDoor.label }}',
                   '{{ cloudsDoor.has }}', '{{ cloudsDoor.open }}', '{{ cloudsDoor.label }}',
                   '{{ bandDoor.has }}', '{{ bandDoor.open }}', '{{ bandDoor.label }}']) {
    assert.ok(HTML.includes(b), `${b} is bound`);
  }
});

test('the hero svg still balances after the header edits', () => {
  const [from, to] = block('aria-label="AT&amp;T network picture"', '</svg>');
  assertBalanced(from, to, 'the hero svg');
});

// Fix round 1, Minor 1: the census proves tag counts moved by the right
// amount, but never proves WHICH gate wraps WHICH element. A typo gating the
// disabled span on `sitesDoor.has` instead of `.hasNot` keeps every count in
// the file identical (still one sc-if pair, one span, one button per header)
// and would pass the census test today. These containment checks are the
// only thing that catches it: each hasNot gate must exist, and must wrap a
// span - never a button, since the disabled state is not a button at all.
test('each header carries a hasNot gate, and it wraps a span, never a button', () => {
  for (const flag of ['sitesDoor.hasNot', 'cloudsDoor.hasNot', 'bandDoor.hasNot']) {
    const marker = `{{ ${flag} }}`;
    assert.ok(HTML.includes(marker), `${marker} is not bound anywhere in the markup`);
    const line = lineWith(marker);
    const open = line.indexOf(`<sc-if value="{{ ${flag} }}"`);
    assert.ok(open >= 0, `${flag} is not gating an sc-if on its own header line`);
    const close = closeOf(line, open);
    assert.ok(close >= 0, `${flag}'s sc-if never closes - a self-closed gate wraps nothing`);
    const inner = line.slice(open, close);
    assert.ok(inner.includes('<span'), `${flag} must wrap a span (the disabled label)`);
    assert.ok(!inner.includes('<button'), `${flag} wraps a button - the disabled state must never be a button`);
  }
});

// --- Wave 2, Task 11: the band overflow row becomes a door ---

test('the band overflow row is a button, not a dead div', () => {
  const line = LINES.find(l => l.includes('{{ fabMore }}'));
  assert.ok(/<button/.test(line), 'the +N more ports row must be clickable');
  assert.ok(line.includes('{{ openBandLevel }}'));
});

// --- Wave 2, Task 12 / Task 17 item 4, carried onto the column-header breadcrumbs ---
// The breadcrumb above the card became a breadcrumb in each column's own header
// (2026-09-25). The rules it kept still hold: the two columns stay apart, the
// current place binds aria-current, separators are hidden from screen readers.

test('the breadcrumbs keep the two columns apart', () => {
  assert.ok(HTML.includes('<nav aria-label="Sites breadcrumb"') && HTML.includes('<nav aria-label="Clouds breadcrumb"'), 'the two columns share one trail');
  assert.ok(!HTML.includes('{{ layerLabel }}'), 'the layer label is not a crumb at all');
});

test('the current place binds aria-current on both trails, and so does the drawer crumb', () => {
  for (const a of ['tr', 'tc']) {
    const line = LINES.find(l => l.includes(`{{ ${a}.go }}`));
    assert.ok(line && line.includes(`aria-current="{{ ${a}.aria }}"`), `the ${a} trail does not bind aria-current`);
  }
  const dc = LINES.find(l => l.includes('{{ dc.go }}'));
  assert.ok(dc && dc.includes('aria-current="{{ dc.ariaCurrent }}"'), 'the drawer crumb button does not bind aria-current');
});

test('every breadcrumb separator is hidden from screen readers', () => {
  for (const a of ['tr', 'tc']) {
    const line = LINES.find(l => l.includes(`{{ ${a}.go }}`));
    assert.ok(new RegExp(`<sc-if value="\\{\\{ ${a}\\.sep \\}\\}"[^>]*><span aria-hidden="true"[^>]*>›</span>`).test(line), `the ${a} trail's › is not aria-hidden`);
  }
  const dcLine = LINES.find(l => l.includes('{{ dc.go }}'));
  assert.ok(/<sc-if value="\{\{ dc\.notLast \}\}"[^>]*><span aria-hidden="true"[^>]*>›<\/span>/.test(dcLine), 'the drawer crumb\'s › separator is not aria-hidden');
});

// --- Wave 2, Task 15: the compose alert's title becomes a binding ---
//
// Mutation-tested (review round 1): reverting the binding to the static
// string "From the drawer" left the suite green, because nothing pinned it.
// This closes that hole directly.

test('the compose alert title is bound to parsedNoteTitle, not the static default', () => {
  // fx-alert-title is reused by several unrelated alerts (newStrip, connectNext,
  // governNext, nextStop, costStrip, costNext, plus the S6 empty-order banner) -
  // anchor on hasParsedNote, the one gate this specific alert renders under.
  const line = LINES.find(l => l.includes('{{ hasParsedNote }}'));
  assert.ok(line, 'the compose alert (gated on hasParsedNote) is gone');
  assert.ok(/class="fx-alert-title">\{\{ parsedNoteTitle \}\}</.test(line), 'fx-alert-title must bind {{ parsedNoteTitle }}');
  assert.equal(HTML.includes('From the drawer'), false, 'the default lives in JS (wizardVals) now, not as static markup');
});

// renderVals in the markup post-processes values from vals(): it maps them,
// spreads them, reads fields off them. Every test here calls vals() directly
// and never runs renderVals, so retiring a value renderVals still maps passes
// the whole suite and blanks every screen. Retiring the four product-layer
// strata did exactly that. Every `v.X = v.X.map(` must name a list vals() returns.
test('renderVals only maps values that vals() still returns', async () => {
  const { vals } = await import('../naas-app.js');
  const { mkC } = await import('./harness.mjs');
  if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
  const i = HTML.indexOf('renderVals() {');
  assert.ok(i > 0, 'renderVals is gone');
  const body = HTML.slice(i, HTML.indexOf('\n  }\n', i));
  const mapped = [...new Set([...body.matchAll(/v\.(\w+) = v\.\1\.map\(/g)].map(m => m[1]))];
  assert.ok(mapped.length > 3, `only found ${mapped.length} mapped values; the pattern broke, not the code`);
  for (const view of ['empty', 'small', 'mature']) {
    const v = vals(mkC({ view, estateParam: null }));
    for (const k of mapped) assert.ok(Array.isArray(v[k]), `${view}: renderVals maps v.${k}, which vals() returns as ${typeof v[k]}`);
  }
});

// Traffic flows both ways. Every private wire carried two dots and both ran
// site to cloud; a third runs the same wire back, half a cycle out of phase.
test('a private wire animates traffic in both directions', () => {
  const i = HTML.indexOf('<sc-if value="{{ e.priv }}"');
  const block = HTML.slice(i, HTML.indexOf('</sc-if>', i));
  assert.ok(/keyPoints="1;0"/.test(block), 'no dot runs from the cloud back to the site');
  assert.ok(/<animateMotion(?![^>]*keyPoints)[^>]*>/.test(block), 'no dot runs from the site to the cloud');
  assert.ok(block.includes('{{ e.retBegin }}'), 'the return dot is not offset, so the two directions overlap');
});

// Found 2026-09-25: a table pass put the @container block's closing brace after
// .dt instead of after the block, so every rule below it - chips, buttons,
// cards, 94 of them - applied only inside containers under 560px wide, and the
// panel tabs fell back to square browser buttons. Nothing parsed the CSS.
test('every stylesheet in the page balances its braces, so no rule swallows the rest', () => {
  for (const [, css] of HTML.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    let depth = 0, line = 1;
    for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
      if (ch === '\n') line++;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      assert.ok(depth >= 0, `a stray } at style line ${line}`);
    }
    assert.equal(depth, 0, 'a block in the stylesheet is never closed');
  }
});

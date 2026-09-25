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
// Wave 3 Task 4: the fabric band's empty state is a new sibling sc-if inside
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
test('every container the markup opens, it closes', () => {
  const pairs = [
    ['div', /<div\b/g, /<\/div>/g, 898],
    ['span', /<span\b/g, /<\/span>/g, 663],
    ['sc-if', /<sc-if\b/g, /<\/sc-if>/g, 322],
    ['sc-for', /<sc-for\b/g, /<\/sc-for>/g, 185],
    ['section', /<section\b/g, /<\/section>/g, 11],
    ['button', /<button\b/g, /<\/button>/g, 257],
    ['aside', /<aside\b/g, /<\/aside>/g, 10],
    ['label', /<label\b/g, /<\/label>/g, 27],
  ];
  for (const [name, open, close, expected] of pairs) {
    assert.equal(count(open), count(close), `${name} is unbalanced`);
    assert.equal(count(open), expected, `the ${name} census moved to ${count(open)}; pin the new number here if the edit meant it`);
  }
});

test('Observe closes the loop with a Next stop row', () => {
  const start = HTML.indexOf('<sc-if value="{{ tObserve }}"');
  const end = HTML.indexOf('<sc-if value="{{ tCost }}"');
  assert.ok(start > 0 && end > start, 'the Observe tab block is gone');
  const observe = HTML.slice(start, end);
  for (const b of ['{{ nextStop.title }}', '{{ nextStop.text }}', '{{ nextStop.cta }}', '{{ nextStop.go }}']) {
    assert.ok(observe.includes(b), `${b} is not bound inside the Observe tab`);
  }
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
  const [from, to] = block('aria-label="Fabric picture"', '</svg>');
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

// --- Wave 2, Task 12 / Task 17 item 4, carried onto the depth ladders ---
// The breadcrumb above the card became a ladder per column, right above the
// picture (2026-09-25). The rules it kept still hold: the two columns stay
// apart, the step you are on binds aria-current, separators are hidden.

test('the depth ladders keep the two columns apart', () => {
  assert.ok(HTML.includes('<nav aria-label="Sites depth"') && HTML.includes('<nav aria-label="Clouds depth"'), 'the two columns share one trail');
  assert.ok(!HTML.includes('{{ layerLabel }}'), 'the layer label is not a crumb at all');
});

test('every ladder step binds its own aria-current, and so does the drawer crumb', () => {
  for (const a of ['ls', 'lc']) {
    const line = LINES.find(l => l.includes(`{{ ${a}.go }}`));
    assert.ok(line && line.includes(`aria-current="{{ ${a}.aria }}"`), `the ${a} ladder step does not bind aria-current`);
  }
  const dc = LINES.find(l => l.includes('{{ dc.go }}'));
  assert.ok(dc && dc.includes('aria-current="{{ dc.ariaCurrent }}"'), 'the drawer crumb button does not bind aria-current');
});

test('every ladder and crumb separator is hidden from screen readers', () => {
  for (const a of ['ls', 'lc']) {
    const line = LINES.find(l => l.includes(`{{ ${a}.go }}`));
    assert.ok(new RegExp(`<sc-if value="\\{\\{ ${a}\\.sep \\}\\}"[^>]*><span aria-hidden="true"[^>]*>›</span>`).test(line), `the ${a} ladder's › is not aria-hidden`);
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

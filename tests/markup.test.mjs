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
  assert.ok(row.includes('{{ pageStat }}'), 'the stat string is not bound in the title row');
  assert.ok(row.indexOf('{{ pageVerdict }}') < row.indexOf('{{ pageStat }}'), 'the stat line must sit under the verdict');
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
// sc-ifs around search, the chip rows and the Select all bar.
test('every container the markup opens, it closes', () => {
  const pairs = [
    ['div', /<div\b/g, /<\/div>/g, 856],
    ['span', /<span\b/g, /<\/span>/g, 635],
    ['sc-if', /<sc-if\b/g, /<\/sc-if>/g, 288],
    ['sc-for', /<sc-for\b/g, /<\/sc-for>/g, 173],
    ['section', /<section\b/g, /<\/section>/g, 11],
    ['button', /<button\b/g, /<\/button>/g, 246],
    ['aside', /<aside\b/g, /<\/aside>/g, 9],
    ['label', /<label\b/g, /<\/label>/g, 26],
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
  const isLevel = header.indexOf('<sc-if value="{{ drawer.isLevel }}"');
  const hasCrumbs = header.indexOf('<sc-if value="{{ drawer.hasCrumbs }}"');
  assert.ok(isLevel >= 0, 'the crumb row is not gated on drawer.isLevel');
  assert.ok(hasCrumbs >= 0, 'the crumb row is not gated on drawer.hasCrumbs');
  assert.ok(isLevel < row, 'isLevel must open before the crumb row, not after it');
  assert.ok(hasCrumbs < row, 'hasCrumbs must open before the crumb row, not after it');
  assert.equal((header.match(/<sc-if\b/g) || []).length, (header.match(/<\/sc-if>/g) || []).length, 'the header sc-ifs are unbalanced');
});

test('search, chips and Select all appear only where a level can use them', () => {
  const gates = [
    ['{{ drawer.q }}', 'drawer.capSearch', 'the search box'],
    ['{{ drawer.paths }}', 'drawer.capChips', 'the chip rows'],
    ['{{ drawer.matchingF }}', 'drawer.capBulk', 'the Select all bar'],
  ];
  for (const [marker, flag, what] of gates) {
    const line = lineWith(marker);
    const gate = line.indexOf(`<sc-if value="{{ ${flag} }}"`);
    assert.ok(gate >= 0, `${what} is not gated on ${flag}`);
    assert.ok(gate < line.indexOf(marker), `${flag} must open before ${what}, not after it`);
    assert.equal((line.match(/<sc-if\b/g) || []).length, (line.match(/<\/sc-if>/g) || []).length, `${what}: the sc-ifs are unbalanced`);
  }
});

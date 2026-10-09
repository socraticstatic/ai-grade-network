import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, estateFor } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { walkFlow } from './flow-walk.mjs';

// The connect flow's frame (Micah, 2026-10-09: "The connect screens all feel very unorganized, and scrunched"). Each
// step stood in a frame that moved: the entry's note sat above the three columns on the one step that showed it and
// pushed them down 72px; Back and Next landed wherever a step ended; the way card cut its own name with an ellipsis;
// headings ran inline on one step and stacked on the next; the rail said "From your estate:" over what the panel beside
// it already listed. scripts/fold.mjs now measures every step of the order it walks.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const S4 = HTML.slice(HTML.indexOf('<!-- ===== S4 COMPOSE ===== -->'), HTML.indexOf('<!-- ===== S5 RECOMMEND ===== -->'));
const css = (sel) => { const m = HTML.match(new RegExp(`\\${sel}\\{([^}]*)\\}`)); return m ? m[1] : ''; };

test('one frame for every step: the column fills the fold and Back and Next sit at its foot', () => {
  assert.match(css('.cf-main'), /min-height:calc\(100vh - \d+px\)/);
  assert.match(css('.cf-main'), /flex-direction:column/);
  assert.match(css('.cf-foot'), /margin-top:auto/);
  assert.match(css('.cf-foot'), /border-top:1px solid/);
  const main = S4.indexOf('<div class="cf-main">'), foot = S4.indexOf('<div class="cf-foot">');
  assert.ok(main > 0 && foot > main, 'the footer is the column\'s');
  assert.ok(S4.indexOf('{{ cfBack }}', foot) > foot && S4.indexOf('{{ cfNext }}', foot) > foot, 'Back and Next are in the footer');
});

test('the entry\'s note stands in the step\'s column, under the way card, never above the frame', () => {
  const note = S4.indexOf('{{ hasParsedNote }}'), main = S4.indexOf('<div class="cf-main">'), way = S4.indexOf('aria-label="Way to connect"');
  assert.ok(note > main && note > way, 'the note follows the way card inside the column');
  assert.equal(S4.split('{{ hasParsedNote }}').length, 2, 'one note');
});

test('the way card names the way whole, and every step heading is a title over one line', () => {
  const way = S4.slice(S4.indexOf('aria-label="Way to connect"'), S4.indexOf('</div></sc-if>', S4.indexOf('aria-label="Way to connect"')));
  assert.ok(way.includes('{{ cfWay.title }}') && way.includes('{{ cfWay.setup }}'));
  assert.doesNotMatch(way, /text-overflow:ellipsis/, 'nothing on the way card is cut');
  const head = S4.slice(S4.lastIndexOf('<div', S4.indexOf('{{ cfTitle }}')), S4.indexOf('{{ cfDesc }}'));
  assert.match(head, /^<div style="display:grid;gap:2px/, 'the heading stacks on every step');
});

test('the rail says the value; where it came from is its mark and its tooltip', () => {
  const rail = S4.slice(S4.indexOf('aria-label="Steps"'), S4.indexOf('</nav>', S4.indexOf('aria-label="Steps"')));
  assert.match(rail, /title="\{\{ st\.sub \}\}"/);
  assert.match(rail, /<small>\{\{ st\.value \}\}<\/small>/);
});

test('metros sit on an even grid, and Best value rides the card edge so the term keeps one line', () => {
  assert.match(S4, /grid-template-columns:repeat\(auto-fill,minmax\(150px,1fr\)\);gap:8px"><sc-for list="\{\{ cfMetros \}\}"/);
  const best = S4.slice(S4.indexOf('{{ tm.best }}'), S4.indexOf('Best value</span>'));
  assert.match(best, /position:absolute;top:-9px/);
});

test('Review says a way\'s setup once, on its card, and the name\'s placeholder is the name', () => {
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
  vals(c).moves[0].tiers.find(t => t.label === "AT&T's ExpressRoute").connect();
  c.state.compose = walkFlow(c.state.compose, estateFor(c.state));
  const v = vals(c);
  assert.equal(v.cfIsReview, true);
  assert.ok(v.cfWay.has && v.cfWay.setup, 'the way card carries the setup');
  assert.equal(v.cfOutcome.standLine.includes(v.cfWay.setup), false, 'not again under the outcome');
  assert.ok(S4.includes('{{ cfOutcome.standLine }}') && !S4.includes('{{ cfNameHelp }}'));
});

test('the pending banner\'s connectors run between stages, none after the last', () => {
  const o = { id: 'o1', title: 'x', what: 'x', monthly: '$1/mo', at: '09:00', stage: 'Submitted for approval', fromFlow: true, region: 'us-west-2', est: 'partial', type: 'DataCenter/CoLocation to Cloud', way: 'att' };
  const st = vals(mkC({ view: 'partial', estateParam: null, screen: 's2', submitted: true, orders: [o] })).pendingStages;
  assert.equal(st.at(-1).line, 'transparent');
  assert.ok(st.slice(0, -1).every(x => x.line !== 'transparent'));
  assert.match(HTML, /<li style="display:flex;align-items:center;flex:1 1 auto;gap:8px">/, 'each stage as wide as its words, the rest shared, so the connectors match');
});

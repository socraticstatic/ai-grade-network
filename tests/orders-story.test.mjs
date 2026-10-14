import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import * as BW from '../naas-bandwidth.js';
import { mkC } from './harness.mjs';

// Connect > Orders as a story (2026-10-13, Micah: "Do this for more pages! Great space, great layout, calls to action on
// all widgets"; "Each page should be its own gorgeous, extremely beautiful story, with calls to action on each"; "tell
// the story with less words, and more visualizations, animations and icons"). The verdict first: where the orders stand,
// as the lifecycle road (in progress, Ordered, Provision, Live, Insight), each station a glyph and a number and a door.
// Then the evidence: every order a card with its way's mark, its path strip labelled from its own ends, its monthly
// figure and its lifecycle. Then the moves: Resume, Go live, Open its connection. With nothing placed, the page is the
// three doors that start an order (Recommended, Ways to connect, a finding), each with its mark and its count.
// Never invented: an order exists only once placed, and every count is the estate's own.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ORDERS = HTML.slice(HTML.indexOf('<sc-if value="{{ cnIsOrders }}"'), HTML.indexOf('<sc-if value="{{ cnIsOptions }}"'));
const at = (view = 'partial', extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders', ...extra });
const toOrders = (c) => Object.assign(c.state, { screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders' });
const station = (v, k) => v.ordRoad.find(x => x.key === k);

// The flow, walked as a person walks it: the first choice each step needs, then Next, to Place order.
function decide(c, v) {
  const k = v.cfKey;
  if (k === 'type' && v.cfBlock) v.cfTypes.find(t => !t.disabled).pick();
  if (k === 'provider' && v.cfBlock) v.cfClouds.flatMap(g => g.regions).find(r => !r.off).pick();
  if (k === 'basic') {
    let w = vals(c);
    if (/Maximum is live/.test(w.cfBlock)) { w.cfTiers.find(t => t.tier === 'Standard').pick(); w = vals(c); }
    while (/metro|location|two/i.test(w.cfBlock || '') && w.cfMetros.some(m => !m.on && m.pickable)) { w.cfMetros.find(m => !m.on && m.pickable).pick(); w = vals(c); }
    if (/bandwidth/.test(w.cfBlock || '')) w.cfBandwidths[0].pick();
  }
  if ((k === 'advanced' || k === 'confirm' || k === 'review') && /always be true/.test(vals(c).cfBlock || '')) vals(c).cfPolicy[0].pick();
  if (k === 'terms' && vals(c).cfBlock) vals(c).cfTerms.find(t => t.m === 36).pick();
}
function place(c) {
  for (let i = 0; i < 16; i++) {
    const v = vals(c);
    if (v.cfIsReview && !v.cfBlock) { v.cfPlace(); return; }
    decide(c, v);
    const w = vals(c);
    if (w.cfIsReview) continue;
    if (w.cfBlock) throw new Error(`stuck at ${w.cfKey}: ${w.cfBlock}`);
    w.cfNext();
  }
  throw new Error('never reached Review');
}
// Start the best way on Ways to connect and place it: the walk the brief names.
const startTop = (c) => { Object.assign(c.state, { screen: 's3', cnPage: 'ways' }); const w = vals(c).wayGroups.flatMap(g => g.cards).find(x => x.top); w.start(); return w; };

test('a way started is an order in progress: Orders shows it and Resume walks back into it', () => {
  const c = at();
  const w = startTop(c);
  assert.equal(c.state.screen, 's4');
  toOrders(c);
  const v = vals(c);
  assert.equal(v.ordInProgress.has, true, 'Start on a way card is an order in progress before a step is passed');
  assert.equal(v.noOrders, false);
  const d = v.ordCards[0];
  assert.equal(d.kind, 'draft', 'the order in progress leads the cards');
  assert.equal(d.tileIcon, w.icon, 'it wears its way\'s mark');
  assert.equal(d.move.label, 'Resume');
  assert.ok(d.steps.length >= 4 && d.steps.every(st => st.icon && st.title && ['done', 'set', 'any'].includes(st.state)), 'its wizard steps are glyphs with their names in titles');
  d.move.go();
  assert.equal(c.state.screen, 's4');
  assert.equal(c.state.compose.way, w.key, 'Resume keeps the way it started with');
});

test('the verdict is where the orders stand: five stations of glyph and number, each a door', () => {
  const c = at();
  let v = vals(c);
  assert.deepEqual(v.ordRoad.map(x => x.key), ['draft', 'ordered', 'provisioning', 'live', 'insight']);
  assert.deepEqual(v.ordRoad.map(x => x.icon), ['pencil', 'shopping-bag', 'wrench', 'verified', 'lightbulb'], 'the lifecycle\'s own glyphs (ORDER_PHASES)');
  for (const x of v.ordRoad) { assert.equal(x.n, 0, `${x.key} counts an order nobody placed`); assert.ok(x.label && x.title && typeof x.go === 'function', x.key); }
  assert.equal(v.ordHead.empty, true);
  assert.equal(v.ordHead.word, 'No orders yet');
  // Place one, start another: one in progress, one ordered and provisioning, nothing live yet.
  startTop(c); place(c);
  assert.equal(c.state.cnPage, 'orders', 'Place order lands on Orders');
  startTop(c); toOrders(c);
  v = vals(c);
  assert.deepEqual(v.ordRoad.map(x => x.n), [1, 1, 1, 0, 0]);
  assert.equal(station(v, 'ordered').pct, 100);
  assert.equal(v.ordHead.n, 1);
  assert.equal(v.ordHead.empty, false);
  assert.match(v.ordHead.money, /^\$[\d,]+$/, 'the placed order\'s monthly, modelled, as one figure');
  // Go live: it moves from Provision to Live, and Insight lights with its first flow logs.
  v.ordCards.find(x => x.kind === 'order').move.go();
  v = vals(c);
  assert.deepEqual(v.ordRoad.map(x => x.n), [1, 1, 0, 1, 1]);
  // The in-progress station is a door back into the order; with nothing in progress, into Ways to connect.
  station(v, 'draft').go();
  assert.equal(c.state.screen, 's4');
});

test('each placed order is a card: its way\'s mark, its path from its own ends, its monthly figure, its lifecycle', () => {
  const c = at();
  const w = startTop(c); place(c);
  const rec = c.state.orders[0];
  // The record keeps what it carried, as plain data, so the card never re-derives it from a flow that is gone.
  assert.ok(Array.isArray(rec.path) && rec.path.length >= 4, JSON.stringify(rec.path));
  assert.deepEqual(JSON.parse(JSON.stringify(rec.path)), rec.path);
  assert.equal(typeof rec.monthlyN, 'number');
  const v = vals(c);
  const k = v.ordCards[0];
  assert.equal(k.kind, 'order');
  assert.equal(k.tileIcon, w.icon);
  assert.ok(k.path.nodes.length === 5, 'sites, edge, core, where the way joins, the cloud');
  for (const n of k.path.nodes) assert.ok(n.label && n.title && (n.hasIcon || n.hasMark), `${n.key}: a station with no glyph or no label`);
  const end = k.path.nodes.at(-1);
  assert.equal(end.hasMark, true, 'the cloud end wears the provider\'s mark');
  assert.match(end.markSrc, /^brand\/providers\//);
  assert.equal(end.label, rec.region, 'the cloud end is labelled with the region it reaches');
  assert.equal(k.path.nodes.find(n => n.key === 'join').icon, 'cable', 'the way joins with its own glyph');
  assert.equal(k.fig.has, true);
  assert.equal(k.fig.big, `$${rec.monthlyN.toLocaleString('en-US')}`);
  assert.equal(k.fig.unit, '/mo');
  assert.deepEqual(k.phases.map(p => [p.key, p.state]), [['ordered', 'done'], ['provisioning', 'set'], ['live', 'any'], ['insight', 'any']]);
  assert.equal(k.move.label, 'Go live');
  assert.equal(k.stage, 'provisioning');
  k.move.go();
  const k2 = vals(c).ordCards[0];
  assert.equal(k2.stage, 'live');
  assert.equal(k2.live, true);
  assert.deepEqual(k2.phases.map(p => p.state), ['done', 'done', 'done', 'set']);
  assert.equal(k2.move.label, 'Open connection');
  // Its Insight phase is a door to the path's first flow logs.
  const ins = k2.phases.find(p => p.key === 'insight');
  assert.equal(ins.hasDoor, true);
  ins.go();
  assert.deepEqual([c.state.tab, c.state.obPage, c.state.pathPin], ['observe', 'perf', '|' + rec.region]);
  // Open connection opens the region it reaches on the Connections map.
  toOrders(c);
  vals(c).ordCards[0].move.go();
  assert.deepEqual([c.state.tab, c.state.cnPage, c.state.cloudDrill], ['connect', 'picture', [rec.region]]);
  // Every figure is a door: the monthly opens the catalog product its price starts from.
  toOrders(c);
  assert.ok(rec.product, 'the record keeps its product');
  vals(c).ordCards[0].fig.go();
  assert.deepEqual([c.state.screen, c.state.product], ['s8', rec.product]);
});

test('one filled move on the page: the verdict carries the next thing to do, and the card it acts on is marked', () => {
  const c = at();
  assert.equal(vals(c).ordLead.label, 'Ways to connect', 'with nothing placed, the verdict starts one');
  startTop(c); place(c);
  let v = vals(c);
  assert.equal(v.ordLead.label, 'Go live');
  assert.deepEqual(v.ordCards.map(x => x.top), [true]);
  assert.ok(v.ordCards.every(x => !x.move.primary), 'the verdict holds the one filled move');
  v.ordLead.go();
  assert.equal(vals(c).ordCards[0].live, true, 'the verdict\'s Go live is the card\'s');
  startTop(c); toOrders(c);
  v = vals(c);
  assert.equal(v.ordLead.label, 'Resume', 'an order in progress is the next thing to finish');
  assert.deepEqual(v.ordCards.map(x => x.top), [true, false]);
  v = vals(at());
  assert.equal(v.ordLead.label, 'Ways to connect');
});

test('a station lights its set: the cards elsewhere dim, and pressing it again clears', () => {
  const c = at();
  startTop(c); place(c);
  vals(c).ordCards[0].move.go(); // live
  Object.assign(c.state, { screen: 's3', cnPage: 'ways' });
  vals(c).wayGroups.flatMap(g => g.cards).filter(x => x.notSoon)[1].start(); place(c); // provisioning
  let v = vals(c);
  assert.deepEqual(v.ordCards.map(x => x.stage), ['provisioning', 'live'], 'newest first');
  station(v, 'live').go();
  v = vals(c);
  assert.equal(c.state.ordStage, 'live');
  assert.equal(station(v, 'live').on, true);
  assert.deepEqual(v.ordCards.map(x => x.dim), [true, false]);
  station(v, 'live').go();
  v = vals(c);
  assert.equal(c.state.ordStage, null);
  assert.deepEqual(v.ordCards.map(x => x.dim), [false, false]);
  // The headline figure is the door to every order.
  station(v, 'provisioning').go();
  vals(c).ordHead.go();
  assert.equal(c.state.ordStage, null);
});

test('No orders yet is a story: the three doors that start an order, each with its mark and its count', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const c = at(view);
    const v = vals(c);
    assert.equal(v.noOrders, true);
    assert.deepEqual(v.ordCards, [], `${view}: an order drawn that nobody placed`);
    assert.equal(v.ordDoorsBig, true);
    assert.deepEqual(v.ordDoors.map(d => d.key), ['recommended', 'ways', 'finding']);
    assert.deepEqual(v.ordDoors.map(d => d.icon), ['bullseye', 'cable', 'exclamation-circle'], 'each door wears its tab\'s glyph');
    // The counts are the pages' own.
    const recs = vals(at(view, { cnPage: 'options' })).moveList.length;
    const ways = vals(at(view, { cnPage: 'ways' })).wayGroups.flatMap(g => g.cards).filter(x => x.notSoon).length;
    assert.deepEqual(v.ordDoors.map(d => d.n), [recs, ways, v.ordDoors[2].n]);
    assert.ok(v.ordDoors[2].n > 0, `${view}: no finding offers an order`);
    for (const d of v.ordDoors) {
      assert.ok(d.title && d.unit && d.cta && d.cta.label && typeof d.cta.go === 'function', `${view} ${d.key}: a door with no move`);
      // Two entries a door (2026-10-14, after "Words went up" on the empty page: nine entries became six).
      assert.ok(d.rows.length >= 1 && d.rows.length <= 2, `${view} ${d.key}: ${d.rows.length} rows`);
      for (const r of d.rows) assert.ok(r.label && r.title && typeof r.go === 'function' && (r.hasMark || r.hasIcon), `${view} ${d.key}: a row that is not a door`);
    }
  }
  // Each door opens where its count lives; a way's row starts that way's order.
  const c = at();
  vals(c).ordDoors[0].cta.go(); assert.equal(c.state.cnPage, 'options');
  toOrders(c); vals(c).ordDoors[1].cta.go(); assert.equal(c.state.cnPage, 'ways');
  toOrders(c); vals(c).ordDoors[2].cta.go(); assert.deepEqual([c.state.tab, c.state.obPage, c.state.insPanel], ['observe', 'insights', 'findings']);
  toOrders(c);
  const top = vals(c).ordDoors[1].rows[0];
  top.go();
  assert.equal(c.state.screen, 's4');
  assert.ok(c.state.compose.way, 'a way row starts that way');
  // Once something is ordered the doors stay, compact, as the way to start another.
  place(c);
  const v = vals(c);
  assert.equal(v.ordDoorsBig, false);
  assert.equal(v.ordDoors.length, 3);
});

test('an estate with nothing found still offers the ways, and says what Recommended needs', () => {
  const v = vals(at('empty'));
  const [rec, ways, fin] = v.ordDoors;
  assert.equal(rec.n, 0);
  assert.equal(ways.n, 6);
  assert.equal(fin.n, 0);
  assert.equal(rec.cta.label, 'Add a source', 'with nothing discovered, the move is the one that finds something');
  assert.ok(rec.rows.length >= 1 && fin.rows.length >= 1, 'an empty door still says what it waits for, as a row');
});

test('a bandwidth change is a card of its own: now, then, the cloud, on the one clock', () => {
  // Placed the way a person places it: Modify bandwidth on Traffic, Apply change, Submit (tests/modify-bandwidth).
  const c = mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'conn', bwFor: 'cx-us-east-1', bwPick: { id: 'cx-us-east-1', ports: 2, mbps: 10000 } });
  vals(c).bw.apply(); vals(c).bw.submit();
  assert.equal(BW.ordersOf(c.state.orders, 'partial').length, 1);
  c.setState({ bwFor: null, bwStep: null, tab: 'connect', cnPage: 'orders', obPage: null });
  const v = vals(c);
  const k = v.ordCards.find(x => x.kind === 'bandwidth');
  assert.ok(k, JSON.stringify(v.ordCards.map(x => x.kind)));
  assert.deepEqual(k.path.nodes.map(n => n.label), ['3 × 10 Gbps', '2 × 10 Gbps', 'us-east-1'], 'today, the size ordered, the region');
  assert.equal(k.path.nodes.at(-1).hasMark, true);
  assert.deepEqual(k.phases.map(p => p.state), ['done', 'set', 'any', 'any'], 'pending until its day');
  assert.equal(k.fig.big, '$1,900');
  assert.equal(k.move.label, 'Open connection');
});

test('the Orders markup binds the story: the road, the cards with their strips, the doors; nothing boxed or invented', () => {
  for (const b of ['list="{{ ordRoad }}"', 'list="{{ ordCards }}"', 'list="{{ ordDoors }}"', '{{ ordLead.go }}', '{{ ordHead.go }}']) assert.ok(ORDERS.includes(b), `${b} is not bound on Orders`);
  assert.match(ORDERS, /class="ps[^"]*"[^>]*>\s*<sc-for list="\{\{ oc\.path\.nodes \}\}"/, 'the path strip is a .ps');
  for (const m of ORDERS.matchAll(/<(svg|table|select)\b[\s\S]*?<\/\1>/g)) assert.ok(!m[0].includes('<sc-for'), `an sc-for inside a <${m[1]}> never renders`);
  assert.ok(!/<div class="dt"/.test(ORDERS), 'the table left: every order is a card');
  // The sentence went into a title (fewer words, 2026-10-07): the page says it with the doors.
  assert.ok(!ORDERS.includes('>{{ ordersEmptyLine }}<'), 'the empty state is not a sentence any more');
  assert.ok(!/#8f2199|rgba\(175,41,187|purple|orange/i.test(ORDERS), 'no purple or orange on Orders');
});

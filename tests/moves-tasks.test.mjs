import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Task rows (Micah, 2026-10-05: "we need this to be task oriented"; "on connect then the flow (resiliency, bandwidth, etc),
// provisioning phase, then insight"). Connect starts the order for the move; once placed, the row shows its phase strip
// in place of Connect; when the region lands, the move leaves the ranked list and stays as a done row with Insight lit.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const on = (view, extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', ...extra });

test('a move with no order offers Connect; Connect opens the flow at the profile step with the set prefilled', () => {
  const c = on('mature');
  const m = vals(c).moves[0];
  assert.equal(m.canConnect, true); assert.equal(m.hasTask, false); assert.deepEqual(m.phases, []);
  m.attach();
  assert.equal(c.state.screen, 's4');
  assert.deepEqual(c.state.compose.moveKeys, [m.key]);
  assert.equal(c.state.compose.moveTitles[m.key], m.title);
});

test('an order for the move turns Connect into the phase strip: Ordered done, Provision current; landing lights Live and Insight', () => {
  const c = on('mature');
  const m = vals(c).moves[0], region = m.regions[0];
  c.setState({ orders: [{ id: 'o1', title: 'NetBond', what: 'x', monthly: '$1,800/mo', at: '09:00', stage: 'Submitted for approval', region, fromFlow: true, moveKeys: [m.key], moveTitles: { [m.key]: m.title } }] });
  let v = vals(c);
  const row = v.moves.find(x => x.key === m.key);
  assert.ok(row, 'the move stays listed while its region is still public');
  assert.equal(row.hasTask, true); assert.equal(row.canConnect, false);
  assert.deepEqual(row.phases.map(p => [p.key, p.state]), [['ordered', 'ok'], ['provisioning', 'set'], ['live', 'any'], ['insight', 'any']]);
  assert.ok(row.phases[0].hasDoor && !row.phases[2].hasDoor && !row.phases[3].hasDoor);
  row.phases[0].go(); assert.equal(c.state.cnPage, 'orders');
  // The region lands: the move is done, and Insight is the door to its path.
  c.setState({ cnPage: 'options', landed: region });
  v = vals(c);
  assert.ok(!v.moves.some(x => x.key === m.key), 'a landed region is no longer a move');
  assert.equal(v.doneMoves.length, 1);
  const d = v.doneMoves[0];
  assert.equal(d.title, m.title);
  assert.deepEqual(d.phases.map(p => p.state), ['ok', 'ok', 'ok', 'set']);
  assert.ok(d.phases[3].hasDoor);
  d.phases[3].go();
  assert.equal(c.state.tab, 'observe'); assert.equal(c.state.pathPin, '|' + region);
  // A done row takes a slot, and so does the summary of how the estate connects (2026-10-06), so the page keeps the fold.
  assert.equal(v.movesPageSize, 3, 'a done row takes a slot so the page keeps the fold');
});

test('the markup draws Connect or the phase strip on the right, and the done rows after the list', () => {
  const a = HTML.indexOf('<sc-if value="{{ cnIsOptions }}"'), b = HTML.indexOf('<!-- /Recommended -->', a);
  const blk = HTML.slice(a, b);
  assert.match(blk, /<sc-if value="\{\{ mv\.canConnect \}\}"[^>]*><button onClick="\{\{ mv\.attach \}\}"[^>]*>Connect<\/button><\/sc-if>/);
  assert.match(blk, /<sc-if value="\{\{ mv\.hasTask \}\}"[^>]*>[\s\S]*?<sc-for list="\{\{ mv\.phases \}\}" as="ph"/);
  assert.match(blk, /<sc-for list="\{\{ doneMoves \}\}" as="dn"/);
  assert.ok(blk.indexOf('{{ doneMoves }}') > blk.indexOf('<sc-for list="{{ moves }}"'));
  assert.match(blk, /<button class="ps-node" onClick="\{\{ ph\.go \}\}" disabled="\{\{ ph\.noDoor \}\}"/);
});

test('Orders carries Go live on a placed order, and it lights the task', () => {
  const c = on('mature', { cnPage: 'orders' });
  const m = vals(on('mature')).moves[0], region = m.regions[0];
  c.setState({ orders: [{ id: 'o1', title: 'NetBond', what: 'x', monthly: '$1,800/mo', at: '09:00', stage: 'Submitted for approval', region, fromFlow: true, moveKeys: [m.key], moveTitles: { [m.key]: m.title } }] });
  const row = vals(c).ordRows[0];
  assert.equal(row.canGoLive, true);
  row.goLive();
  assert.equal(c.state.landed, region);
  assert.equal(vals(c).ordRows[0].stage, 'Validated · live');
  assert.equal(vals(c).ordRows[0].canGoLive, false);
  c.setState({ cnPage: 'options' });
  assert.deepEqual(vals(c).doneMoves[0].phases.map(p => p.state), ['ok', 'ok', 'ok', 'set']);
});

test('a landed region\'s second-path move does not inherit the old order; the pending banner stays off Recommended', () => {
  const c = on('mature');
  const m = vals(c).moves[0], region = m.regions[0];
  c.setState({ orders: [{ id: 'o1', title: 'NetBond', what: 'x', monthly: '$1,800/mo', at: '09:00', stage: 'Submitted for approval', region, fromFlow: true, moveKeys: [m.key], moveTitles: { [m.key]: m.title } }], submitted: true, landed: region });
  const v = vals(c);
  const second = v.moves.find(x => x.regions && x.regions.includes(region));
  if (second) { assert.equal(second.hasTask, false, `${second.title} claims the landed order`); assert.equal(second.canConnect, true); }
  assert.equal(v.doneMoves.length, 1);
  assert.equal(v.showPending, false);
  assert.equal(vals(on('mature', { cnPage: 'picture', submitted: true, landed: region, orders: c.state.orders })).showPending, true, 'the banner still shows elsewhere');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Health and Operations agree on tickets (final review, 2026-09-30). Health
// offered Open ticket on both Growing problems while Operations > Tickets listed
// them as opened by Andi, and after one Open ticket Health showed one ticket
// while Overview read "2 tickets open". One function now decides a problem's
// ticket and both pages read it: a ticket you opened reads "T-nnnn · In
// progress"; else, with Andi's toggle On, "T-nnnn · opened by Andi"; else none,
// and only then does Open ticket show, on Health and Operations alike.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const NOW = '2026-10-05T15:00:00Z';
const HEALTH = { screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', obPanel: 'health' };
const OPS = { screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', opsPanel: 'tickets' };
const growing = (patch = {}) => mkC({ view: 'partial', estateParam: null, nowIso: NOW, obWindow: '30d', ...HEALTH, ...patch });
// Growing has one problem since the delay figures left (2026-10-15): the eastus flap. The
// agreement between two problems is read on Established, its us-west-2 port near full and
// its eu-central-1 link down.
const established = (patch = {}) => growing({ view: 'mature', ...patch });

// Each page's ticket cell, read the way the markup shows it: Health prints
// ticketF only when the row is ticketed; Operations prints it always, and
// "No ticket yet" is no ticket.
// Health pages three to a page; every page is read (w2 second pass, 2026-09-30).
function both(c) {
  c.setState({ ...HEALTH, probPage: 0 });
  let hv = vals(c); const h = [...hv.problemRows];
  while (hv.probPager.many && hv.probPager.nextOp === 1) { hv.probPager.next(); hv = vals(c); h.push(...hv.problemRows); }
  c.setState(OPS);
  const o = vals(c);
  const health = Object.fromEntries(h.map(r => [r.key, { ticket: r.ticketed ? r.ticketF : null, button: !!r.canTicket }]));
  const ops = Object.fromEntries(o.ticketAll.map(r => [r.key, { ticket: r.ticketF === 'No ticket yet' ? null : r.ticketF, button: !!r.canTicket }]));
  return { health, ops, o };
}
const openTile = (o) => o.opsTiles.find(t => t.key === 'open').v;

test('Andi On, the default: every problem carries Andi\'s ticket on Health and on Operations, and none offers Open ticket', () => {
  const g = both(growing());
  assert.deepEqual(g.health, g.ops);
  assert.deepEqual(Object.keys(g.health), ['an-link-eastus']);
  assert.equal(g.o.opsLine, '1 Sev 1 open now. 1 ticket open. Fixes took 20h 31m on average.');
  const { health, ops, o } = both(established());
  assert.deepEqual(health, ops);
  assert.deepEqual(Object.keys(health).sort(), ['an-link-eu-central-1', 'an-sat-us-west-2']);
  for (const k of Object.keys(health)) {
    assert.match(health[k].ticket || '', /^T-\d{4} · opened by Andi$/, k);
    assert.equal(health[k].button, false, k);
  }
  assert.equal(o.opsLine, '1 Sev 1 open now. 2 tickets open. Fixes took 17h 27m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 2');
  assert.equal(openTile(o), '2');
});

test('Andi Off: no ticket on either page, Open ticket on both, and the line calls them incidents, not tickets', () => {
  const { health, ops, o } = both(established({ andiTickets: false }));
  assert.deepEqual(health, ops);
  for (const k of Object.keys(health)) assert.deepEqual(health[k], { ticket: null, button: true }, k);
  assert.equal(o.opsLine, '1 Sev 1 open now. 0 tickets open, 2 incidents without one. Fixes took 17h 27m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 0');
  assert.equal(openTile(o), '0');
  assert.equal(o.ticketAll.length, 2, 'an incident with no ticket still lists under Tickets');
  assert.ok(o.ticketAll.every(r => r.ticketF === 'No ticket yet'));
});

test('Open ticket on Health, Andi Off: eu-central-1 reads In progress on both pages, us-west-2 still offers Open ticket, and the counts say one', () => {
  const c = established({ andiTickets: false });
  vals(c).problemRows.find(r => r.key === 'an-link-eu-central-1').ticket();
  const { health, ops, o } = both(c);
  assert.deepEqual(health, ops);
  assert.match(health['an-link-eu-central-1'].ticket || '', /^T-\d{4} · In progress$/);
  assert.equal(health['an-link-eu-central-1'].button, false);
  assert.deepEqual(health['an-sat-us-west-2'], { ticket: null, button: true });
  assert.equal(o.opsLine, '1 Sev 1 open now. 1 ticket open, 1 incident without one. Fixes took 17h 27m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 1');
  assert.equal(openTile(o), '1');
});

test('a ticket opened on Operations keeps Andi\'s number, and turning Andi back On leaves both pages agreeing', () => {
  const c = established();
  const andi = both(c).ops;
  const num = (k) => andi[k].ticket.match(/^T-\d{4}/)[0];
  c.setState(OPS);
  vals(c).toggleAndiTickets();
  vals(c).ticketAll.find(r => r.key === 'an-link-eu-central-1').ticket();
  vals(c).toggleAndiTickets();
  const { health, ops, o } = both(c);
  assert.deepEqual(health, ops);
  assert.deepEqual(health['an-link-eu-central-1'], { ticket: `${num('an-link-eu-central-1')} · In progress`, button: false });
  assert.deepEqual(health['an-sat-us-west-2'], { ticket: `${num('an-sat-us-west-2')} · opened by Andi`, button: false });
  assert.equal(o.opsLine, '1 Sev 1 open now. 2 tickets open. Fixes took 17h 27m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 2');
});

test('every estate: the open-ticket count is the rows that carry a ticket, on both pages, with Andi On and Off', () => {
  for (const view of ['partial', 'mature', 'trust', 'small', 'empty']) {
    for (const andiTickets of [true, false]) {
      const { health, ops, o } = both(growing({ view, andiTickets }));
      assert.deepEqual(health, ops, `${view} ${andiTickets}`);
      const n = Object.values(ops).filter(r => r.ticket).length;
      assert.equal(o.opsFacts.openN, n, `${view} ${andiTickets}`);
      assert.equal(o.opsPanels[1].label, `Tickets · ${n}`, `${view} ${andiTickets}`);
      assert.equal(openTile(o), String(n), `${view} ${andiTickets}`);
      assert.ok(Object.values(ops).every(r => r.button === !r.ticket), `${view} ${andiTickets}: Open ticket shows only where there is no ticket`);
    }
  }
});

test('Reset demo turns Andi back On, so the Monday walk opens on Andi\'s tickets', () => {
  const c = growing({ andiTickets: false });
  vals(c).resetDemo();
  assert.equal(c.state.andiTickets, true);
});

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

// Each page's ticket cell, read the way the markup shows it: Health prints
// ticketF only when the row is ticketed; Operations prints it always, and
// "No ticket yet" is no ticket.
function both(c) {
  c.setState(HEALTH);
  const h = vals(c).problemRows;
  c.setState(OPS);
  const o = vals(c);
  const health = Object.fromEntries(h.map(r => [r.key, { ticket: r.ticketed ? r.ticketF : null, button: !!r.canTicket }]));
  const ops = Object.fromEntries(o.ticketAll.map(r => [r.key, { ticket: r.ticketF === 'No ticket yet' ? null : r.ticketF, button: !!r.canTicket }]));
  return { health, ops, o };
}
const openTile = (o) => o.opsTiles.find(t => t.key === 'open').v;

test('Andi On, the default: both Growing problems carry Andi\'s ticket on Health and on Operations, and neither offers Open ticket', () => {
  const { health, ops, o } = both(growing());
  assert.deepEqual(health, ops);
  assert.deepEqual(Object.keys(health).sort(), ['an-eu-west-1', 'an-link-eastus']);
  for (const k of Object.keys(health)) {
    assert.match(health[k].ticket || '', /^T-\d{4} · opened by Andi$/, k);
    assert.equal(health[k].button, false, k);
  }
  assert.equal(o.opsLine, '1 Sev 1 open now. 2 tickets open. Fixes took 20h 31m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 2');
  assert.equal(openTile(o), '2');
});

test('Andi Off: no ticket on either page, Open ticket on both, and the line calls them incidents, not tickets', () => {
  const { health, ops, o } = both(growing({ andiTickets: false }));
  assert.deepEqual(health, ops);
  for (const k of Object.keys(health)) assert.deepEqual(health[k], { ticket: null, button: true }, k);
  assert.equal(o.opsLine, '1 Sev 1 open now. 0 tickets open, 2 incidents without one. Fixes took 20h 31m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 0');
  assert.equal(openTile(o), '0');
  assert.equal(o.ticketAll.length, 2, 'an incident with no ticket still lists under Tickets');
  assert.ok(o.ticketAll.every(r => r.ticketF === 'No ticket yet'));
});

test('Open ticket on Health, Andi Off: eastus reads In progress on both pages, eu-west-1 still offers Open ticket, and the counts say one', () => {
  const c = growing({ andiTickets: false });
  vals(c).problemRows.find(r => r.key === 'an-link-eastus').ticket();
  const { health, ops, o } = both(c);
  assert.deepEqual(health, ops);
  assert.match(health['an-link-eastus'].ticket || '', /^T-\d{4} · In progress$/);
  assert.equal(health['an-link-eastus'].button, false);
  assert.deepEqual(health['an-eu-west-1'], { ticket: null, button: true });
  assert.equal(o.opsLine, '1 Sev 1 open now. 1 ticket open, 1 incident without one. Fixes took 20h 31m on average.');
  assert.equal(o.opsPanels[1].label, 'Tickets · 1');
  assert.equal(openTile(o), '1');
});

test('a ticket opened on Operations keeps Andi\'s number, and turning Andi back On leaves both pages agreeing', () => {
  const c = growing();
  const andi = both(c).ops;
  const num = (k) => andi[k].ticket.match(/^T-\d{4}/)[0];
  c.setState(OPS);
  vals(c).toggleAndiTickets();
  vals(c).ticketAll.find(r => r.key === 'an-link-eastus').ticket();
  vals(c).toggleAndiTickets();
  const { health, ops, o } = both(c);
  assert.deepEqual(health, ops);
  assert.deepEqual(health['an-link-eastus'], { ticket: `${num('an-link-eastus')} · In progress`, button: false });
  assert.deepEqual(health['an-eu-west-1'], { ticket: `${num('an-eu-west-1')} · opened by Andi`, button: false });
  assert.equal(o.opsLine, '1 Sev 1 open now. 2 tickets open. Fixes took 20h 31m on average.');
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

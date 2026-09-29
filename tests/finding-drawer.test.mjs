import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Notes, 2026-09-29: "in such options we can show or simulate changes, show
// evidence where and how before a user completes the actions", and "add
// timeline so a user know when they were found and if any actions were taken".
// One findings list: what AT&T found to act on, and what happened. The card
// stays one line and a state; the drawer carries the rest.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (patch = {}) => mkC({ view: 'partial', screen: 's3', tab: 'observe', obPage: 'insights', insPanel: 'findings', estateParam: null, ...patch });
const row = (v, key) => v.findAll.find(r => r.key === key);

test('one list: every actionable finding and every event, each with its state, owner and age', () => {
  const v = vals(at({ findFilter: 'all' }));
  // Partial also carries two findings closed before today (the history that banked money).
  assert.equal(v.findAll.length, v.findingsAllN + v.eventsN + 2);
  for (const r of v.findAll) {
    assert.ok(r.stateLabel && r.owner && /^\d+d$/.test(r.age), r.key);
    assert.equal(typeof r.open, 'function', r.key);
  }
  assert.ok(row(v, 'avoidable') && row(v, 'an-egress'), 'a finding and an event');
});

test('the card is terse: a headline, a state, one move; the why lives in the drawer', () => {
  const a = HTML.indexOf('<sc-for list="{{ insightRows }}"');
  const block = HTML.slice(a, HTML.indexOf('</sc-for>', a));
  for (const b of ['ins.why', 'ins.act', 'ins.did']) assert.ok(!block.includes(b), b);
  assert.ok(block.includes('ins.stateLabel') && block.includes('ins.open'));
});

test('a priced finding opens with a preview of the change, its evidence and its timeline', () => {
  const c = at();
  row(vals(c), 'avoidable').open();
  const d = vals(c).fd;
  assert.equal(vals(c).fdOpen, true);
  assert.ok(d.hasPreview);
  assert.match(d.before.money, /^\$[\d,]+\/mo$/);
  assert.match(d.after.money, /^\$[\d,]+\/mo$/);
  assert.match(d.deltaLine, /^Saves \$23,200\/mo$/);
  assert.ok(d.evidence.length >= 1 && d.evidence.length <= 5);
  assert.ok(d.timeline.length >= 3, 'found, acknowledged, in progress');
  assert.equal(d.stateLabel, 'In progress');
});

test('Acknowledge moves the state, adds a timeline row, and survives a reload', () => {
  const c = at();
  row(vals(c), 'ipsecegress').open();
  const before = vals(c).fd.timeline.length;
  vals(c).fd.actions.find(a => a.label === 'Acknowledge').go();
  const d = vals(c).fd;
  assert.equal(d.stateLabel, 'Acknowledged');
  assert.equal(d.timeline.length, before + 1);
  assert.match(store['naas.life'], /ipsecegress/);
});

test('the primary move places the order and marks the finding in progress', () => {
  const c = at();
  row(vals(c), 'crosscloud').open();
  const d = vals(c).fd;
  assert.ok(d.primary && d.primary.label);
  d.primary.go();
  assert.ok(['s4', 's8'].includes(c.state.screen), c.state.screen);
  const life = c.state.findingLife.partial.crosscloud;
  assert.equal(life.events[life.events.length - 1].state, 'progress');
});

test('snoozing takes it off the open count, and the head follows', () => {
  const c = at();
  const n0 = vals(c).openFindingsN;
  row(vals(c), 'crosscloud').open();
  vals(c).fd.actions.find(a => a.label === 'Snooze 7 days').go();
  assert.equal(vals(c).openFindingsN, n0 - 1);
  assert.match(vals(c).pageVerdict, new RegExp(`^${n0 - 1} findings open\\. \\$28,700/mo potential savings\\.$`));
});

test('filter chips count the same list the head counts, and closed history shows under Closed', () => {
  const v = vals(at());
  assert.deepEqual(v.findChips.map(x => x.label.replace(/ · \d+$/, '')), ['Open', 'Snoozed', 'Closed', 'All']);
  assert.equal(v.findChips[0].label, `Open · ${v.openFindingsN}`);
  const closed = vals(at({ findFilter: 'closed' }));
  assert.ok(closed.insightRows.length >= 2 && closed.insightRows.every(r => ['Resolved', 'Dismissed'].includes(r.stateLabel)));
  assert.ok(closed.insightRows.some(r => /hairpinned/.test(r.head)), 'history from before today');
});

test('a Signals card drills to the actionable findings behind it', () => {
  const c = at({ insPanel: 'signals' });
  vals(c).insDrill.growth.go();
  const v = vals(c);
  const keys = v.insightRows.map(r => r.key);
  assert.ok(keys.includes('avoidable') && keys.includes('an-egress'), keys.join(','));
});

test('placing the order closes the drawer, and the timeline says who did what', () => {
  const c = at();
  row(vals(c), 'ipsecegress').open();
  const label = vals(c).fd.primary.label;
  vals(c).fd.primary.go();
  assert.equal(c.state.fdKey, null, 'the drawer stays open over the order');
  c.state.screen = 's3'; c.state.tab = 'observe'; c.state.fdKey = 'ipsecegress';
  const last = vals(c).fd.timeline.at(-1);
  assert.equal(last.label, 'In progress');
  // Starting an order is not placing one (review, 2026-09-29).
  assert.equal(last.note, `· Started an order: ${label}`);
});

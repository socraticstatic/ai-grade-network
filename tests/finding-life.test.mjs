import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { STATES, STATE_LABEL, lifeFor, lifeOf, transition, openFindings, closedFindings, banked } from '../naas-lifecycle.js';

// "For findings: let us add timeline so a user know when they were found and if
// any actions were taken ... Open → Acknowledged → In progress → Resolved →
// Snoozed → Dismissed, who was owner, how old is finding" (notes, 2026-09-29).

const NOW = new Date('2026-09-29T12:00:00Z');
const P = D.ESTATES.partial;
const f = (kind, est = P) => est.findings.find(x => x.kind === kind);

test('six states, named as the notes name them', () => {
  assert.deepEqual(STATES, ['open', 'ack', 'progress', 'resolved', 'snoozed', 'dismissed']);
  assert.deepEqual(STATES.map(k => STATE_LABEL[k]), ['Open', 'Acknowledged', 'In progress', 'Resolved', 'Snoozed', 'Dismissed']);
});

test('every finding has a state, an owner, a found date and an age in days', () => {
  for (const est of Object.values(D.ESTATES)) {
    const life = lifeFor(est);
    for (const x of est.findings) {
      const l = lifeOf(x, life, NOW);
      assert.ok(STATES.includes(l.state), x.kind);
      assert.ok(l.owner && l.owner.includes(' · '), `${est.id} ${x.kind}: ${l.owner}`);
      assert.ok(Number.isInteger(l.ageDays) && l.ageDays >= 0, x.kind);
      assert.ok(l.events.length >= 1 && l.events[0].state === 'open', 'the first event is when it was found');
    }
  }
});

test('the age counts days from when it was found', () => {
  const life = { x: { events: [{ at: '2026-09-17', state: 'open', by: 'Discovery' }] } };
  assert.equal(lifeOf({ kind: 'x', persona: 'FinOps' }, life, NOW).ageDays, 12);
});

test('the forward path and the side exits are allowed; nothing else is', () => {
  let life = { x: { events: [{ at: '2026-09-01', state: 'open', by: 'Discovery' }] } };
  for (const to of ['ack', 'progress', 'resolved']) life = transition(life, 'x', to, { by: 'J. Rivera', now: NOW });
  assert.deepEqual(life.x.events.map(e => e.state), ['open', 'ack', 'progress', 'resolved']);
  assert.equal(transition(life, 'x', 'ack', { by: 'J. Rivera', now: NOW }), life, 'resolved cannot be acknowledged');
  life = transition(life, 'x', 'open', { by: 'J. Rivera', now: NOW });
  assert.equal(life.x.events.at(-1).state, 'open', 'a resolved finding can be reopened');
  const d = transition(life, 'x', 'dismissed', { by: 'J. Rivera', now: NOW, note: 'accepted risk' });
  assert.equal(d.x.events.at(-1).note, 'accepted risk');
  assert.equal(d.x.events.at(-1).by, 'J. Rivera');
  assert.equal(d.x.events.at(-1).at, '2026-09-29');
});

test('a snooze ends on its date and the finding counts as open again', () => {
  let life = { x: { events: [{ at: '2026-09-01', state: 'open', by: 'Discovery' }] } };
  life = transition(life, 'x', 'snoozed', { by: 'J. Rivera', now: new Date('2026-09-20T12:00:00Z'), snoozeDays: 7 });
  const fx = { kind: 'x', persona: 'FinOps' };
  assert.equal(lifeOf(fx, life, new Date('2026-09-25T12:00:00Z')).state, 'snoozed');
  assert.equal(lifeOf(fx, life, NOW).state, 'open');
  assert.equal(lifeOf(fx, life, NOW).snoozeEnded, true);
});

test('open findings are open, acknowledged and in progress; never resolved, dismissed or still snoozed', () => {
  const life = lifeFor(P);
  const open = openFindings(P, life, NOW);
  for (const x of open) assert.ok(['open', 'ack', 'progress'].includes(lifeOf(x, life, NOW).state), x.kind);
  const shut = P.findings.filter(x => !open.includes(x));
  assert.ok(shut.length >= 1, 'the demo has something snoozed');
  // The priced open findings are the Cost verdict's figure: nothing banked is double-counted.
  assert.equal(open.filter(x => x.priced).reduce((a, x) => a + x.save, 0), 41500);
});

test('closed history: the partial estate has resolved findings with the savings they banked', () => {
  const closed = closedFindings(P);
  assert.ok(closed.length >= 2);
  for (const x of closed) { assert.ok(x.head && x.save > 0 && x.resolvedAt, x.kind); }
});

test('banked is a running total that never falls, twelve months, ending this month', () => {
  const b = banked(P, lifeFor(P), NOW);
  assert.equal(b.length, 12);
  assert.equal(b.at(-1).month, '2026-09');
  for (let i = 1; i < b.length; i++) assert.ok(b[i].cumulative >= b[i - 1].cumulative, b[i].month);
  assert.ok(b.at(-1).saved >= P.savedMo, 'this month banks at least what the network already saves');
});

test('resolving a priced finding banks its saving from that month; dismissing one banks nothing', () => {
  const life0 = lifeFor(P);
  const base = banked(P, life0, NOW).at(-1).saved;
  let life = transition(life0, 'avoidable', 'resolved', { by: 'J. Rivera', now: NOW });
  assert.equal(banked(P, life, NOW).at(-1).saved, base + f('avoidable').save);
  life = transition(life0, 'crosscloud', 'dismissed', { by: 'J. Rivera', now: NOW });
  assert.equal(banked(P, life, NOW).at(-1).saved, base);
});

test('a customer with nothing on AT&T has banked nothing', () => {
  assert.ok(banked(D.ESTATES.empty, lifeFor(D.ESTATES.empty), NOW).every(m => m.cumulative === 0));
});

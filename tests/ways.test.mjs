import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../naas-ways.js';

// The connect options session (2026-10-06): six ways to connect for a new
// customer, the best three for a cloud on Recommended in the session's order, Azure three and Google two.

test('the ways are the session\'s six, transit gateway the placeholder', () => {
  assert.deepEqual(W.WAYS.map(w => w.key), ['byo', 'att', 'peer', 'privatelink', 'cloudwan', 'transit']);
  assert.equal(W.wayOf('transit').soon, true);
  assert.equal(W.WAYS.filter(w => w.soon).length, 1);
});

test('Azure and AWS recommend three in priority order; Google two and says which it cannot have', () => {
  assert.deepEqual(W.recommendedFor('Azure').map(r => r.key), ['byo', 'att', 'peer']);
  assert.deepEqual(W.recommendedFor('AWS').map(r => r.key), ['byo', 'att', 'peer']);
  const g = W.recommendedFor('GCP');
  assert.deepEqual(g.filter(r => !r.unavailable).map(r => r.key), ['byo', 'peer']);
  assert.match(g.find(r => r.unavailable).unavailable, /Not on Google Cloud/);
  assert.equal(W.wayAvailable('att', 'GCP'), false);
  assert.equal(W.wayAvailable('att', 'Azure'), true);
});

test('each way is labelled the way its cloud names the port', () => {
  assert.equal(W.wayLabel('byo', 'Azure'), 'Your ExpressRoute');
  assert.equal(W.wayLabel('att', 'Azure'), "AT&T's ExpressRoute");
  assert.equal(W.wayLabel('peer', 'Azure'), 'Hosted VNet peering');
  assert.equal(W.wayLabel('byo', 'AWS'), 'Your Direct Connect');
  assert.equal(W.wayLabel('peer', 'AWS'), 'Hosted VPC peering');
});

test('prices come from the catalog: NetBond alone, plus the AT&T port, plus the hosted VNet', () => {
  assert.equal(W.wayMonthly('byo', 'Azure'), 1800);
  assert.equal(W.wayMonthly('att', 'Azure'), 2100);
  assert.equal(W.wayMonthly('peer', 'Azure'), 4200);
  assert.equal(W.wayMonthly('privatelink', 'Azure'), 4500);
  assert.equal(W.wayMonthly('cloudwan', 'Azure'), null, 'Cloud WAN is priced after a survey');
  assert.deepEqual(W.wayProducts('peer', 'Azure', 2), [['netbond', 2], ['hosted-vnet', 2]]);
  assert.deepEqual(W.wayExtras('att', 'Azure').map(p => p.id), ['port-att']);
  assert.deepEqual(W.wayExtras('byo', 'Azure'), []);
});

test('every card scores the five criteria; cost runs cheapest 5 to dearest 1; the placeholder is unscored', () => {
  const cards = W.wayCards();
  for (const c of cards.filter(x => !x.soon)) {
    assert.deepEqual(c.rows.map(r => r.key), ['cost', 'perf', 'sec', 'effort', 'time'], c.key);
    c.rows.filter(r => r.key !== 'cost' || c.monthly !== null).forEach(r => assert.ok(r.score >= 1 && r.score <= 5, `${c.key} ${r.key}`));
    c.rows.forEach(r => assert.equal(r.segs.length, 5));
  }
  const cost = Object.fromEntries(cards.map(c => [c.key, c.rows[0].score]));
  assert.ok(cost.byo > cost.att && cost.att > cost.peer && cost.peer > cost.privatelink, JSON.stringify(cost));
  assert.ok(cards.find(c => c.key === 'transit').rows.every(r => r.score === null));
});

test('peering across zones reads slower and says the cloud bills the transfer', () => {
  const intra = W.wayCards('intra').find(c => c.key === 'peer'), inter = W.wayCards('inter').find(c => c.key === 'peer');
  assert.ok(intra.rows[1].score > inter.rows[1].score);
  assert.match(inter.rows[0].value, /zone transfer/);
  assert.doesNotMatch(intra.rows[0].value, /zone transfer/);
});

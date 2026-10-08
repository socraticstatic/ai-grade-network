import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../naas-ways.js';
import { CATALOG } from '../naas-data.js';

// The ways to connect, as the stakeholder's deck has them (Cloud Connectivity Decision Matrix, landed 2026-10-08,
// replacing the 2026-10-06 session's estimates): NetBond Advanced on your port or AT&T's, and five AT&T-hosted ways that
// share one AT&T on-ramp into AT&T's hub and differ only in the last hop into your VPC. Priced at 1 Gbps on us-east-1
// list rates; the hosted figures are cloud pass-through, the hub (vSRX, compute, AT&T margin) priced at review.

test('the ways are the deck\'s columns plus the session\'s AT&T-provided port; transit gateway is real now', () => {
  assert.deepEqual(W.WAYS.map(w => w.key), ['byo', 'att', 'peer', 'transit', 'cloudwan', 'privatelink']);
  assert.equal(W.WAYS.filter(w => w.soon).length, 0);
  assert.deepEqual(W.WAYS.filter(w => w.hosted).map(w => w.key), ['peer', 'transit', 'cloudwan', 'privatelink']);
});

test('Azure and AWS recommend three in priority order; Google two (its own port, PrivateLink) and says which it cannot have', () => {
  assert.deepEqual(W.recommendedFor('Azure').map(r => r.key), ['byo', 'att', 'peer']);
  assert.deepEqual(W.recommendedFor('AWS').map(r => r.key), ['byo', 'att', 'peer']);
  const g = W.recommendedFor('GCP');
  assert.deepEqual(g.filter(r => !r.unavailable).map(r => r.key), ['byo', 'privatelink']);
  assert.match(g.find(r => r.unavailable).unavailable, /Not on Google Cloud/);
  assert.equal(W.wayAvailable('att', 'GCP'), false);
  assert.equal(W.wayAvailable('peer', 'GCP'), false, 'the deck peers on AWS and Azure only');
  assert.equal(W.wayAvailable('privatelink', 'GCP'), true);
});

test('each way is labelled the way its cloud names the port', () => {
  assert.equal(W.wayLabel('byo', 'Azure'), 'Your ExpressRoute');
  assert.equal(W.wayLabel('att', 'Azure'), "AT&T's ExpressRoute");
  assert.equal(W.wayLabel('peer', 'Azure'), 'Hosted VNet peering');
  assert.equal(W.wayLabel('peer', 'AWS'), 'Hosted VPC peering');
  assert.equal(W.wayLabel('transit', 'AWS'), 'Hosted transit gateway');
});

test('prices are the deck\'s at 1 Gbps: NetBond $1,900; the on-ramp $2,190 plus each last hop', () => {
  assert.equal(CATALOG.find(p => p.id === 'netbond').price, 1900);
  assert.equal(W.wayMonthly('byo', 'Azure'), 1900);
  assert.equal(W.wayMonthly('att', 'Azure'), 2200, 'the AT&T-provided port stays the session\'s $300 estimate');
  assert.equal(W.wayMonthly('peer', 'AWS', 'intra'), 2190, 'same-AZ: the last hop is free');
  assert.equal(W.wayMonthly('peer', 'AWS', 'inter'), 4161);
  assert.equal(W.wayMonthly('peer', 'Azure', 'intra'), 4161, 'Azure has no same-AZ rung, so it peers across AZs');
  assert.equal(W.wayMonthly('transit', 'AWS'), 4234);
  assert.equal(W.wayMonthly('cloudwan', 'AWS'), 4599);
  assert.equal(W.wayMonthly('privatelink', 'AWS'), 4708);
  assert.deepEqual(W.wayProducts('peer', 'Azure', 2), [['onramp-att', 2], ['lh-cross', 2]]);
  assert.deepEqual(W.wayExtras('att', 'Azure').map(p => p.id), ['port-att']);
  assert.deepEqual(W.wayExtras('byo', 'Azure'), []);
  assert.deepEqual(W.wayExtras('transit', 'AWS').map(p => [p.id, p.price]), [['onramp-att', 2190], ['lh-tgw', 2044], ['hub-att', null]], 'the hub is a line priced at review');
});

test('each way draws its path and says who sets it up, at the deck\'s level and time; only NetBond\'s time is proven', () => {
  assert.deepEqual(W.wayStrip('byo').map(n => [n.short, n.state]), [['Sites', 'set'], ['Edge', 'set'], ['Core', 'set'], ['Your port', 'nodata'], ['Cloud', 'set']]);
  assert.equal(W.wayStrip('att')[3].short, 'AT&T port');
  assert.equal(W.wayStrip('transit')[3].short, 'TGW');
  assert.equal(W.wayWho('byo').icon, 'user-access');
  assert.equal(W.wayWho('peer').icon, 'hub');
  assert.equal(W.wayWho('peer').level, 'Click + approve');
  assert.match(W.waySetup('byo'), /^Guided reconfig · <15 min on AT&T's side/);
  assert.match(W.waySetup('transit'), /30-60 min, a proof-of-concept target$/);
  assert.equal(W.wayYouDo('peer').words, 'Accept the peering and add one route');
});

test('every card scores the deck\'s five criteria and a weighted score out of 100; cost runs cheapest 5 to dearest 1', () => {
  assert.deepEqual(W.CRITERIA.map(c => [c.key, c.weight]), [['cost', 30], ['perf', 20], ['sec', 20], ['setup', 15], ['scale', 15]]);
  const cards = W.wayCards('inter');
  for (const c of cards) {
    assert.deepEqual(c.rows.map(r => r.key), ['cost', 'perf', 'sec', 'setup', 'scale'], c.key);
    c.rows.forEach(r => { assert.ok(r.score >= 1 && r.score <= 5, `${c.key} ${r.key}`); assert.equal(r.segs.length, 5); });
    assert.equal(c.points, Math.round(c.rows.reduce((a, r) => a + r.weight * r.score / 5, 0)), c.key);
  }
  const cost = Object.fromEntries(cards.map(c => [c.key, c.rows[0].score]));
  assert.ok(cost.byo > cost.att && cost.att > cost.peer && cost.peer > cost.transit && cost.transit > cost.privatelink, JSON.stringify(cost));
  assert.ok(cards.filter(c => c.hosted).every(c => / \+ hub$/.test(c.rows[0].value)), 'a hosted way says its hub is extra');
  assert.match(cards.find(c => c.key === 'peer').rows[0].title, /pass-through/);
});

test('peering\'s zones are the deck\'s: same AZ free and AWS only, across AZs zone-redundant at $0.01/GB each way', () => {
  const intra = W.wayCards('intra').find(c => c.key === 'peer'), inter = W.wayCards('inter').find(c => c.key === 'peer');
  assert.equal(intra.monthly, 2190); assert.equal(inter.monthly, 4161);
  assert.ok(intra.rows[0].score > inter.rows[0].score, 'same AZ is cheaper');
  assert.ok(intra.rows.find(r => r.key === 'scale').score < inter.rows.find(r => r.key === 'scale').score, 'and gives up a zone');
  assert.equal(intra.zoneLabel, 'Same AZ');
});

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
  // Regional peering (the storyboards, 2026-10-16, slide 2): the on-ramp plus the peering data, $0.01/GB each way at 50%
  // utilization: $3,240 at 1 Gbps, $16,200 at 5, $32,400 at 10. PrivateLink (slide 9): $5,564 / $26,607 / $48,023, formula not shared.
  assert.equal(W.wayMonthly('peer', 'AWS'), 5430);
  assert.equal(W.wayMonthly('peer', 'Azure'), 5430);
  assert.equal(W.wayMonthly('transit', 'AWS'), 4234);
  assert.equal(W.wayMonthly('cloudwan', 'AWS'), 4599);
  assert.equal(W.wayMonthly('privatelink', 'AWS'), 7754);
  assert.deepEqual(W.HOSTED_BANDWIDTHS, ['1 Gbps', '5 Gbps', '10 Gbps'], 'the reviewer priced three sizes; a hosted order offers those');
  assert.equal(W.hopPrice('lh-peer', '5 Gbps'), 16200);
  assert.equal(W.hopPrice('lh-pl', '10 Gbps'), 48023);
  assert.equal(W.hopPrice('lh-tgw', '5 Gbps'), 2044, 'a hop with no ladder keeps its one figure');
  assert.deepEqual(W.hostedLines('peer', '5 Gbps').map(p => [p.id, p.price]), [['onramp-att', null], ['lh-peer', 16200], ['hub-att', null]], 'above 1 Gbps the on-ramp is AT&T\'s to price');
  assert.deepEqual(W.hostedLines('privatelink', '1 Gbps').map(p => [p.id, p.price]), [['onramp-att', 2190], ['lh-pl', 5564], ['hub-att', null]]);
  // The reviewer's call on PrivateLink (the storyboards, slide 9): weak on every attribute, no per-service framing.
  const pl = W.WAYS.find(w => w.key === 'privatelink');
  assert.deepEqual(Object.values(pl.score).map(s => s[0]), [2, 2, 2, 2]);
  assert.ok(!JSON.stringify(pl).includes('svc') && !JSON.stringify(pl).includes('per AZ'));
  assert.deepEqual(W.wayProducts('peer', 'Azure', 2), [['onramp-att', 2], ['lh-peer', 2]]);
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
  assert.match(W.wayYouDo('peer').words, /grant AT&T access.*address space.*accept the peering in your console/i);
  assert.match(W.wayYouDo('privatelink').words, /grant AT&T access.*destination/i, 'AT&T builds the endpoints after the grant');
});

// The storyboards (2026-10-16): a hosted way is a managed service; peering takes 15-20 min, Private Link 30-45; no row
// says Inspected (question 1 to AT&T), Per service, One AZ or One zone.
test('hosted ways read AT&T-managed, with the storyboards\' times and words', () => {
  for (const w of W.WAYS.filter(x => x.hosted)) assert.equal(w.kicker, 'AT&T-managed', w.key);
  assert.equal(W.wayOf('peer').time, '15-20 min');
  assert.equal(W.wayOf('privatelink').time, '30-45 min');
  assert.match(W.waySetup('peer'), /15-20 min/);
  const rows = (k) => Object.fromEntries(W.wayCards().find(c => c.key === k).rows.map(r => [r.key, r.value]));
  assert.equal(rows('peer').setup, 'Approve · 15-20 min');
  assert.equal(rows('privatelink').setup, 'Approve · 30-45 min');
  assert.equal(rows('privatelink').sec, 'One endpoint per destination');
  assert.equal(rows('privatelink').scale, 'Per destination');
  assert.equal(rows('peer').sec, "Private in AT&T's hub");
  // The two ways the storyboards reviewed; Transit gateway's 'Inspected' shares question 1 and waits on the same answer.
  for (const c of W.wayCards().filter(x => ['peer', 'privatelink'].includes(x.key))) for (const r of c.rows) assert.ok(!/Inspected|Per service|One AZ|One zone/.test(r.value), `${c.key} ${r.key}: ${r.value}`);
});

test('every card scores the deck\'s five criteria and a weighted score out of 100; cost runs cheapest 5 to dearest 1', () => {
  assert.deepEqual(W.CRITERIA.map(c => [c.key, c.weight]), [['cost', 30], ['perf', 20], ['sec', 20], ['setup', 15], ['scale', 15]]);
  const cards = W.wayCards();
  for (const c of cards) {
    assert.deepEqual(c.rows.map(r => r.key), ['cost', 'perf', 'sec', 'setup', 'scale'], c.key);
    c.rows.forEach(r => { assert.ok(r.score >= 1 && r.score <= 5, `${c.key} ${r.key}`); assert.equal(r.grade, W.GRADES[r.score], `${c.key} ${r.key}`); });
    // Scored as Recommended scores (2026-10-09): the default answers add five to a way that meets your BGP, the soft preference.
    assert.equal(c.points, Math.min(100, Math.round(c.rows.reduce((a, r) => a + r.weight * r.score / 5, 0)) + (W.wayHosted(c.key) ? 0 : 5)), c.key);
  }
  const cost = Object.fromEntries(cards.map(c => [c.key, c.rows[0].score]));
  // The reviewer's figures (2026-10-16): peering $5,430 and PrivateLink $7,754 at 1 Gbps are the dearest, below the transit gateway.
  assert.ok(cost.byo > cost.att && cost.att > cost.transit && cost.transit > cost.peer && cost.peer >= cost.privatelink, JSON.stringify(cost));
  assert.ok(cards.filter(c => c.hosted).every(c => / \+ hub$/.test(c.rows[0].value)), 'a hosted way says its hub is extra');
  assert.match(cards.find(c => c.key === 'peer').rows[0].title, /pass-through/);
});

// Zones are not a dimension (the storyboards, 2026-10-16: "vNETs are regional constructs and span across multiple
// zones as is"). The constraint is the hub: a hosted way reaches only a region where AT&T has deployed one.
test('peering has no zones; hosted ways are gated by where AT&T has a hub', () => {
  assert.equal(W.wayOf('peer').zones, undefined);
  for (const c of W.wayCards()) { assert.equal(c.zoneLabel, undefined, c.key); assert.equal(c.zone, undefined, c.key); }
  assert.equal(W.wayLabel('peer', 'AWS'), 'Hosted VPC peering');
  assert.equal(W.wayLabel('peer', 'Azure'), 'Hosted VNet peering');
  assert.equal(W.wayCards().find(c => c.key === 'peer').rows.find(r => r.key === 'perf').value, 'Regional');
  assert.ok(Array.isArray(W.HUB_REGIONS.AWS) && Array.isArray(W.HUB_REGIONS.Azure));
  assert.equal(W.hubIn('Azure', 'eastus'), true);
  assert.equal(W.hubIn('Azure', 'australiaeast'), false);
  assert.equal(W.hubIn('GCP', 'us-central1'), false, 'no Google hub until AT&T says so');
});

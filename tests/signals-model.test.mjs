import test from 'node:test';
import assert from 'node:assert/strict';
import * as SG from '../naas-signals.js';
import { HEALTH_INK, HEALTH_WORD, healthRadius } from '../naas-flowmap.js';

// Signals (notes, 2026-09-30): "Observe insights is light"; "all need to be
// useful and action oriented"; "make sure mock data matches persona". Nine
// cards, the persona picks which three lead, and every row carries its move.
// These are the pure rules; tests/signals.test.mjs walks them on the page.

const PERSONAS = ['architect', 'neteng', 'security', 'finops', 'exec'];

test('nine cards, and each persona orders all nine with no repeats', () => {
  assert.deepEqual(SG.CARDS.slice().sort(), ['capacity', 'growth', 'health', 'multi', 'newdest', 'shadow', 'slo', 'spend', 'talkers']);
  for (const p of PERSONAS) {
    const o = SG.orderOf(p);
    assert.equal(o.length, 9, p);
    assert.deepEqual(o.slice().sort(), SG.CARDS.slice().sort(), `${p} repeats or drops a card`);
  }
  assert.deepEqual(SG.orderOf('nobody'), SG.orderOf('neteng'), 'an unknown persona reads as Network Eng, as roleKeyOf does');
});

test('the persona picks the three that lead, by the concerns the owner named', () => {
  const lead = (p) => SG.orderOf(p).slice(0, SG.LEAD_N).sort();
  assert.deepEqual(lead('security'), ['newdest', 'shadow', 'talkers'], 'Security: new destinations, shadow SaaS, exposure');
  assert.deepEqual(lead('finops'), ['growth', 'spend', 'talkers'], 'FinOps: egress growth, spend, talkers by egress');
  assert.deepEqual(lead('neteng'), ['capacity', 'health', 'slo'], 'Network Eng: health, latency, capacity');
  assert.deepEqual(lead('architect'), ['capacity', 'multi', 'talkers'], 'Architect: cloud to cloud, coverage');
  assert.deepEqual(lead('exec'), ['health', 'spend', 'talkers'], 'Executive: spend, health, how much rides AT&T');
  // By egress, not by cost (second round, 2026-09-30): the buckets price egress by cloud, so a dollar per region contradicted Spend.
  assert.equal(SG.lensOf('finops'), 'egress');
  assert.equal(SG.lensOf('security'), 'exposure');
  assert.equal(SG.lensOf('architect'), 'coverage');
  assert.equal(SG.lensOf('exec'), 'coverage');
  assert.equal(SG.lensOf('neteng'), 'share');
});

// Four regions: two on AT&T, two on the public internet.
const T = [
  { key: 'a', region: 'a', cloud: 'AWS', label: 'AWS a', sub: 'NetBond · PCI', gbps: 10, share: '40%', priv: true },
  { key: 'b', region: 'b', cloud: 'AWS', label: 'AWS b', sub: 'public internet · Prod', gbps: 6, share: '24%', priv: false },
  { key: 'c', region: 'c', cloud: 'GCP', label: 'GCP c', sub: 'public internet · AI', gbps: 2, share: '8%', priv: false },
  { key: 'd', region: 'd', cloud: 'Azure', label: 'Azure d', sub: 'ExpressRoute · Finance', gbps: 7, share: '28%', priv: true },
];

// Second round (2026-09-30): "Top talkers by cost" shared the buckets' public egress
// by Gbps, and a region's modelled dollars contradicted Spend by bucket beside it
// (GCP us-central1 $16,700 against a $31,200 GCP bucket). The buckets price by cloud,
// so the rows carry the Gbps that bills as public egress and the total carries the dollars.
test('Top talkers by egress: the Gbps that bills as public egress, and the buckets\' dollars as its total', () => {
  const t = SG.talkers(T, 'egress', { pubMo: 8000, covPct: 68 });
  assert.equal(t.title, 'Top talkers by egress');
  // The head is Growth's this week, dollars and Gbps, and names no region count the dollars are not split by (third round, 2026-09-30).
  assert.equal(t.head, '$8,000/mo public egress · 8.0 Gbps');
  const pub = t.rows.filter(r => !r.priv);
  assert.deepEqual(pub.map(r => r.key), ['b', 'c'], 'the most public first');
  assert.deepEqual(pub.map(r => [r.v, r.v2]), [['6.0 Gbps', '75% of public'], ['2.0 Gbps', '25% of public']]);
  assert.ok(t.rows.every(r => !/\$/.test(r.v + r.v2)), 'no dollar on a region');
  assert.deepEqual(pub.map(r => r.segs[0].w), ['100.0%', '33.3%'], 'on the public regions\' own scale');
  assert.ok(t.rows.filter(r => r.priv).every(r => r.v2 === 'On AT&T' && r.act === 'Ask Andi' && !r.segs.length));
  assert.ok(pub.every(r => r.act === 'Optimize' && r.actKind === 'optimize'));
  assert.equal(SG.talkers(T, 'egress', { pubMo: 0 }).head, '8.0 Gbps public egress', 'scoped: no dollars it cannot split');
});

test('Top talkers by exposure: the public internet first, each with Set policy', () => {
  const t = SG.talkers(T, 'exposure', { pubMo: 8000, covPct: 68 });
  assert.match(t.title, /exposure/);
  assert.deepEqual(t.rows.map(r => r.key), ['b', 'c', 'a', 'd']);
  assert.ok(t.rows.filter(r => !r.priv).every(r => r.act === 'Set policy' && r.actKind === 'policy-region'));
  assert.ok(t.rows.filter(r => r.priv).every(r => r.act === 'Policies' && r.actKind === 'policies'));
  // The public Gbps and its share of traffic, Coverage's complement (third round, 2026-09-30).
  assert.equal(t.head, '8.0 Gbps public · 32% of traffic');
});

test('Top talkers by coverage: what rides AT&T, and Attach for what does not', () => {
  const t = SG.talkers(T, 'coverage', { pubMo: 8000, covPct: 68 });
  assert.equal(t.head, '2 of 4 regions on AT&T · 68% of traffic');
  assert.deepEqual(t.rows.map(r => r.key), ['a', 'd', 'b', 'c'], 'by traffic');
  assert.ok(t.rows.filter(r => !r.priv).every(r => r.act === 'Attach' && r.actKind === 'attach'));
  assert.ok(t.rows.filter(r => r.priv).every(r => r.act === 'Ask Andi'));
});

test('Top talkers by share is yesterday\'s card', () => {
  const t = SG.talkers(T, 'share', { pubMo: 0, covPct: 68 });
  assert.equal(t.title, 'Top talkers');
  assert.equal(t.head, 'AWS a · 40% of traffic');
  assert.deepEqual(t.rows.map(r => r.v), ['40%', '28%', '24%', '8%']);
  assert.ok(t.rows.every(r => r.fig === 'map' && r.region));
});

test('Spend: each bucket is today split into the AT&T rate and what is avoidable', () => {
  const B = [{ id: 'base', name: 'Committed base', cloud: 'AWS', today: 18000, fabric: 18000 }, { id: 'gpu', name: 'GPU inference egress', cloud: 'GCP', today: 31200, fabric: 12400 }, { id: 'misc', name: 'Misc internet egress', cloud: 'AWS', today: 9600, fabric: 5200 }];
  const sp = SG.spend(B);
  assert.deepEqual(sp.rows.map(r => r.key), ['gpu', 'misc', 'base'], 'the most avoidable first');
  // Save, not cost: the figure leads with what moving saves.
  assert.equal(sp.head, 'Save $23,200/mo of $58,800/mo egress');
  const gpu = sp.rows[0];
  assert.equal(gpu.v, '$31,200/mo');
  assert.equal(gpu.segs.length, 2);
  // A saving is --success, as Cost paints it (2026-09-30): --viz-4 is --warning's value.
  assert.deepEqual(gpu.segs.map(x => x.fill), ['var(--viz-1)', 'var(--success)']);
  assert.equal(gpu.v2, 'save $18,800');
  assert.equal(gpu.act, 'Optimize');
  assert.equal(sp.rows[2].act, 'By bucket', 'nothing to save is not an Optimize');
  assert.equal(sp.rows[2].segs.length, 1);
});

test('Capacity: Add a port above 80%, Resize where one fewer port holds the peak, Ask Andi otherwise', () => {
  const cap = [
    { id: 'cx-1', region: 'r1', cloud: 'AWS', ramp: 'NetBond', ports: 2, portG: 10, capG: 20, peakG: 16.8, peakPct: 84, fullIn: 'in 5 weeks', state: 'risk', oversized: false },
    { id: 'cx-2', region: 'r2', cloud: 'GCP', ramp: 'NetBond', ports: 5, portG: 10, capG: 50, peakG: 20, peakPct: 40, fullIn: 'Over a year', state: 'ok', oversized: true, resizeTo: 4, resizePct: 50 },
    { id: 'cx-3', region: 'r3', cloud: 'Azure', ramp: 'ExpressRoute', ports: 1, portG: 10, capG: 10, peakG: 6.2, peakPct: 62, fullIn: 'in 4 months', state: 'down', oversized: false },
  ];
  const c = SG.capacity(cap);
  assert.deepEqual(c.rows.map(r => r.key), ['cx-1', 'cx-3', 'cx-2'], 'fullest first');
  // A Down connection is traced, as Health traces it, never planned for (2026-09-30).
  assert.deepEqual(c.rows.map(r => r.act), ['Add a port', 'Trace', 'Resize']);
  assert.equal(c.rows[1].probKey, 'an-link-r3');
  assert.deepEqual(c.rows.map(r => r.v2), ['2 × 10 Gbps', '1 × 10 Gbps', '5 × 10 Gbps']);
  assert.deepEqual(c.rows.map(r => r.segs[0].fill), [HEALTH_INK.risk, HEALTH_INK.down, 'var(--viz-2)']);
  assert.ok(c.rows.every(r => r.track), 'a gauge, on its track');
  assert.equal(c.head, '1 of 3 above 80% at peak · 1 could shrink');
  assert.equal(c.rows[1].sub, 'Down · BGP flapping', 'Down never rests on colour alone');
});

test('Health: problems ranked by apps affected, in the one health ink and word', () => {
  const P = [
    { key: 'an-x', state: 'risk', where: 'AWS x', thing: 'Public internet', what: 'Latency spike', appsN: 1, wlN: 31 },
    { key: 'an-link-y', state: 'down', where: 'Azure y', thing: 'ExpressRoute', what: 'BGP flapping · 0.31% drops', appsN: 3, wlN: 120 },
  ];
  const h = SG.health(P);
  assert.deepEqual(h.rows.map(r => r.key), ['an-link-y', 'an-x']);
  assert.equal(h.rows[0].sub, `${HEALTH_WORD.down} · BGP flapping · 0.31% drops`);
  assert.equal(h.rows[0].segs[0].fill, HEALTH_INK.down);
  assert.equal(h.rows[0].rad, healthRadius('down'));
  assert.ok(h.rows.every(r => r.act === 'Trace' && r.fig === 'finding'));
  assert.equal(h.head, '2 problems · 4 apps affected');
  assert.deepEqual(h.legend.map(l => l.label), [HEALTH_WORD.down, HEALTH_WORD.risk], 'the states present, worst first');
});

test('the findings behind each card belong to it; the talkers follow the lens', () => {
  const ctx = { spikeKeys: new Set(['an-eu-west-1', 'an-us-west-2']), spikesOver: new Set(['an-eu-west-1']) };
  const hit = (card, lens) => (k) => SG.findsOf(card, lens, ctx)(k);
  assert.ok(hit('slo', 'share')('an-eu-west-1'));
  assert.ok(!hit('slo', 'share')('an-us-west-2'), 'At risk is not over SLO');
  assert.ok(!hit('slo', 'share')('an-link-eastus'), 'a BGP flap is Health, not latency');
  assert.ok(!hit('slo', 'share')('an-sat-us-west-2'), 'a full port is Capacity, not latency');
  assert.ok(hit('health', 'share')('an-link-eastus') && hit('health', 'share')('an-us-west-2') && hit('health', 'share')('unmonitored'));
  assert.ok(hit('capacity', 'share')('an-sat-us-west-2') && !hit('capacity', 'share')('an-link-eastus'));
  assert.ok(hit('talkers', 'egress')('ipsecegress') && !hit('talkers', 'egress')('pci'));
  assert.ok(hit('talkers', 'exposure')('pci') && !hit('talkers', 'exposure')('avoidable'));
  // A lead card opens its persona's own work (2026-09-30): cross-cloud and the Oracle regions are
  // the Architect's, on Cloud-to-cloud and coverage; Spend keeps FinOps' egress findings.
  assert.ok(!hit('spend', 'share')('crosscloud') && !hit('spend', 'share')('newcloud-oracle') && hit('spend', 'share')('avoidable'));
  assert.ok(hit('multi', 'share')('crosscloud') && hit('talkers', 'coverage')('newcloud-oracle') && hit('talkers', 'coverage')('single'));
  assert.ok(!hit('health', 'share')('single'), 'one path is topology, the Architect\'s');
  assert.ok(hit('talkers', 'share')('ipsec') && !hit('talkers', 'coverage')('ipsec'), 'IPsec sites are Network Eng\'s');
  for (const k of SG.CARDS) assert.equal(typeof SG.findsOf(k, 'share', ctx), 'function', k);
});

test('only the traffic cards may open Logs', () => {
  assert.deepEqual([...SG.TRAFFIC].sort(), ['growth', 'multi', 'newdest', 'shadow', 'slo', 'talkers']);
});

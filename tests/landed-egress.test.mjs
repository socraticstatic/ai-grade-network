import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as D from '../naas-data.js';
import * as J from '../naas-journey.js';
import * as LC from '../naas-lifecycle.js';
import { withSources } from '../naas-schedule.js';

// A landed region keeps its egress share (2026-10-15, found while making the journey connect one region at a time):
// a cloud's egress lives in one bucket, and landing a region changed neither the bucket nor the finding that prices
// it, so the whole bill re-spread over the regions still public. On Calloway, East US saves $2,453 on its own; once
// West Europe landed it claimed all $16,800 of Azure's egress and "Save $5,500 a month".
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
if (typeof globalThis.requestAnimationFrame === 'undefined') globalThis.requestAnimationFrame = () => 0;
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];
const B = Object.fromEntries(J.BEATS.map((b, i) => [b.key, i]));
const n = (s) => +String(s).replace(/[^0-9.]/g, '');
const money = (s) => { const m = String(s).match(/\$([\d,]+)/); return m ? +m[1].replace(/,/g, '') : null; };
const sum = (xs, k) => xs.reduce((a, x) => a + x[k], 0);

const raw = () => withSources(D.ESTATES.lastmile, AZURE);
const landedRegs = (est, ids) => est.regionsList.map(r => (ids.includes(r.region) ? { ...r, priv: true, landed: true } : r));

// The data contract (naas-data.js, Trinity Supply's buckets): a bucket's finding saves exactly the bucket's premium over
// your AT&T rate; a move then nets the connection off it. Azure's and AWS's found sources said $7,400 and $5,600, their
// premiums less the NetBond ports, so the ports came off twice and Recommended's "AT&T price" disagreed with By bucket.
test('every found source\'s finding saves its bucket\'s premium, as every seed estate\'s does', () => {
  for (const [k, src] of Object.entries(D.FOUND_SOURCES)) assert.equal(src.finding.save, src.bucket.today - src.bucket.fabric, `${k}: ${src.finding.save} vs ${src.bucket.today} - ${src.bucket.fabric}`);
});

test('a landed region takes its share of its cloud\'s public bucket, billed at the AT&T rate; the rest stays public', () => {
  const est = raw(), regs = landedRegs(est, ['westeurope']);
  const out = LC.afterLandings(est, regs);
  const pub = out.buckets.find(b => b.id === 'azr'), att = out.buckets.find(b => b.id === 'azr:landed');
  // 40 and 28 workloads: $16,800 today splits $9,882 / $6,918, $5,600 at the AT&T rate $3,294 / $2,306.
  assert.deepEqual([pub.today, pub.fabric], [9882, 3294], 'East US keeps its own share, public');
  assert.deepEqual([att.today, att.fabric, att.cloud], [2306, 2306, 'Azure'], 'West Europe now bills at the AT&T rate');
  assert.equal(sum(out.buckets, 'fabric'), 5600, 'the AT&T-rate bill is conserved');
  assert.equal(sum(out.buckets, 'today'), 16800 - (6918 - 2306), 'today drops by what the landing saves');
  const after = { ...est, regionsList: regs, ...out };
  assert.deepEqual([LC.bucketInk(after, pub), LC.bucketInk(after, att)], ['public', 'att']);
  assert.equal(out.findings.find(f => f.kind === 'newcloud-azure').save, 6588, 'the open finding keeps East US\'s share of its $11,200');
});

test('both regions landed: nothing of Azure stays public, and its finding has nothing left to save', () => {
  const est = raw(), out = LC.afterLandings(est, landedRegs(est, ['eastus', 'westeurope']));
  assert.equal(out.buckets.some(b => b.id === 'azr'), false, 'no public remainder');
  const att = out.buckets.find(b => b.id === 'azr:landed');
  assert.deepEqual([att.today, att.fabric], [5600, 5600]);
  assert.equal(out.findings.find(f => f.kind === 'newcloud-azure').save, 0);
});

test('no landing changes nothing; a bucket with no premium is not split', () => {
  const est = raw(), out = LC.afterLandings(est, est.regionsList);
  assert.deepEqual(out.buckets, est.buckets); assert.deepEqual(out.findings, est.findings);
  // Trinity Supply's committed base bills the same either way, so landing us-east-1 leaves it whole.
  const small = D.ESTATES.small, s2 = LC.afterLandings(small, landedRegs(small, ['us-east-1']));
  assert.deepEqual(s2.buckets.find(b => b.id === 'base'), small.buckets.find(b => b.id === 'base'));
  assert.deepEqual(s2.buckets.find(b => b.id === 'misc'), { ...small.buckets.find(b => b.id === 'misc'), today: 960, fabric: 360 });
  assert.deepEqual(['today', 'fabric'].map(k => s2.buckets.find(b => b.id === 'misc:landed')[k]), [540, 540]);
});

test('the journey: East US\'s pass reads its own money after West Europe lands', () => {
  const c = mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', jStep: B.connect, jRegion: 'westeurope', addedSources: AZURE });
  vals(c).jActGo(); vals(c).jActGo(); vals(c).jActGo();
  assert.deepEqual(c.state.landed.map(e => e.region), ['westeurope']);
  c.setState({ jRegion: 'eastus', jStep: B.recommend, jPick: null });
  const v = vals(c);
  // $9,882 today; $3,294 at the AT&T rate plus a $1,900 port: $4,688 a month, the same before or after West Europe lands.
  assert.equal(v.jLine, 'Move Azure eastus onto AT&T. Save $4,688 a month.');
  assert.deepEqual([v.jMoney.before, v.jMoney.after], ['$9,882/mo', '$5,194/mo']);
});

// The relations finops-math.test.mjs holds on the seed estates, held after a landing too.
const landedStates = () => {
  const west = mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', jStep: B.connect, jRegion: 'westeurope', addedSources: AZURE });
  vals(west).jActGo(); vals(west).jActGo(); vals(west).jActGo();
  const both = mkC({ ...west.state });
  both.setState({ jRegion: 'eastus', jStep: B.connect, jPick: null }); vals(both).jActGo(); vals(both).jActGo(); vals(both).jActGo();
  const small = mkC({ view: 'small', estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'orders',
    orders: [{ id: 'o1', title: 'x', what: 'x', monthly: '$1/mo', at: '09:00', stage: 'Submitted for approval', fromFlow: true, region: 'us-east-1', est: 'small', type: 'DataCenter/CoLocation to Cloud', way: 'byo' }] });
  vals(small).ordRows[0].goLive();
  return { 'lastmile, West Europe landed': west.state, 'lastmile, both landed': both.state, 'small, us-east-1 landed': small.state };
};

test('after a landing, By bucket, Spend and Optimize still quote one saving, and By bucket adds up', () => {
  for (const [name, st] of Object.entries(landedStates())) {
    const at = (costPanel) => vals(mkC({ ...st, journey: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel }));
    const sp = at('spend'), could = n((sp.spendTiles.find(t => /Could save/.test(t.l)) || {}).v), spend = n((sp.spendTiles.find(t => /Spend this month/.test(t.l)) || {}).v);
    const rows = at('bucket').buckets;
    for (const r of rows) assert.equal(r.today - r.fabric, r.saved, `${name}: ${r.name}`);
    assert.equal(sum(rows, 'today'), spend, `${name}: buckets today vs Spend tile`);
    // The tile prints Optimize's figure to the hundred (R.optimizeRows' money()); a landed share is rarely a whole hundred.
    assert.equal(Math.round(sum(rows, 'saved') / 100) * 100, could, `${name}: buckets save vs Could save tile`);
    const opt = at('optimize');
    const saves = opt.optRows.filter(r => /^Save \$/.test(r.figureF || '')).map(r => money(r.figureF));
    if (/^Save \$/.test(opt.optLine || '')) assert.equal(money(opt.optLine), saves.reduce((a, b) => a + b, 0), `${name}: Optimize`);
  }
});

test('after a landing, Spend this month is the bill as it now stands', () => {
  const st = landedStates();
  const spend = (s) => n(vals(mkC({ ...s, journey: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend' })).spendTiles.find(t => /Spend this month/.test(t.l)).v);
  assert.equal(spend(st['lastmile, West Europe landed']), 12188, '$9,882 still public, $2,306 at the AT&T rate');
  assert.equal(spend(st['lastmile, both landed']), 5600, 'all of Azure at the AT&T rate');
  assert.equal(spend(st['small, us-east-1 landed']), 960 + 540 + 1800, 'us-west-2\'s share public, us-east-1\'s at the AT&T rate, the base whole');
});

test('after West Europe lands, By region, Recommended, the home and the flow map read the same East US', () => {
  const st = landedStates()['lastmile, West Europe landed'];
  const dash = (extra) => vals(mkC({ ...st, journey: null, ...extra }));
  // By region: only East US is still outside AT&T; its row says the AT&T price By bucket implies.
  const rows = dash({ screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'money' }).regionSaveRows;
  assert.deepEqual(rows.map(r => [r.regionId, r.nowN, r.saveN, r.afterN]), [['eastus', 9882, 6588, 3294]]);
  // Recommended: East US's move starts from the same $9,882 and lands on the same $3,294.
  const rec = dash({ screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
  const east = rec.moveList.find(m => m.key === 'region:Azure:eastus');
  assert.equal(east.today.mo, 9882);
  assert.equal(east.tiers.find(t => t.way === 'byo').egress, 3294);
  assert.equal(rec.moveList.some(m => (m.regions || []).includes('westeurope') && m.kind === 'region'), false, 'West Europe has no move left');
  // The home's egress is Spend this month.
  const home = dash({ screen: 's0' }).homeCards.find(x => x.key === 'egress');
  assert.equal(n(home.value), 12188);
  // The flow map still adds up, left and right.
  const map = dash({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow' }).mapNodes;
  const col = (side) => map.filter(x => x.side === side).reduce((a, x) => a + x.v, 0);
  assert.ok(Math.abs(col('l') - col('r')) < 1e-6, `left ${col('l')} right ${col('r')}`);
});

// Saved on AT&T read a third formula for a landing (workloads × 0.14 Gbps × $190: $745 for West Europe) while the bill
// fell $4,612. A landing now carries what it took off the bill: its share today less its share at the AT&T rate.
test('Saved on AT&T counts what a landing took off the bill', () => {
  const st = landedStates();
  const carries = (s) => vals(mkC({ ...s, journey: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'charges' })).chargeTiles.find(t => t.key === 'carries').v;
  assert.equal(carries(st['lastmile, West Europe landed']), '$4,612', '$6,918 today, $2,306 at the AT&T rate');
  assert.equal(carries(st['lastmile, both landed']), '$11,200', 'all of Azure\'s premium');
  assert.equal(carries(st['small, us-east-1 landed']), '$900', 'us-east-1\'s share of the misc bucket: $1,440 today, $540 on AT&T');
  const est = raw(), out = LC.afterLandings(est, landedRegs(est, ['westeurope']));
  assert.equal(out.buckets.find(b => b.id === 'azr:landed').carries, 4612);
});

// Banked read $0 after the landing took $4,612 off this month's bill: the ledger knew the seed's history and resolved
// findings only. A landing banks what it carries from the month it landed, in the regions it took.
test('a landing banks what it carries from this month, in the regions it took, and opens as its own source', () => {
  const st = landedStates()['lastmile, West Europe landed'];
  const sp = (extra = {}) => vals(mkC({ ...st, journey: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend', ...extra }));
  const tile = sp().spendTiles.find(t => t.key === 'banked');
  assert.equal(tile.v, '$4,612'); assert.match(tile.sub, /^\$4,612 this month/);
  const v = sp({ spendList: 'banked' });
  const row = v.bankRows.find(r => r.kind === 'landing');
  assert.ok(row, 'the landing is a banked source');
  assert.deepEqual([row.label, row.moN, row.months], ['Azure egress on AT&T', 4612, 1]);
  const c = mkC({ ...st, journey: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend', spendList: 'banked' });
  vals(c).bankRows.find(r => r.kind === 'landing').go();
  assert.equal(c.state.screen, 's3'); assert.equal(c.state.costPanel, 'spend'); assert.equal(c.state.bankSource, row.key, 'it opens its own share by place, not the closed findings');
  const west = sp().saveRows.find(r => r.label === 'Azure westeurope');
  assert.equal(west.bankedN, 4612, 'banked where it landed');
  assert.equal(sp().saveRows.find(r => r.label === 'Azure eastus').bankedN, 0);
});

// Spend's history back-projected this month's bill over every past month, so a landing this month rewrote last year:
// September read $11.8K, mostly blue. Months before the landing are the bill as it stood before it.
test('Spend\'s history keeps the bill as it stood before this month\'s landing', async () => {
  const R = await import('../naas-round2.js');
  const st = landedStates()['lastmile, West Europe landed'];
  const cols = vals(mkC({ ...st, journey: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend' })).spendCols.filter(x => x.kind === 'past');
  const now = cols.at(-1), before = cols.at(-2);
  assert.deepEqual([now.spendN, now.attN, now.topN], [12188, 2306, 4612], 'this month: paid, of it at the AT&T rate, and banked');
  assert.equal(before.spendN, Math.round(16800 / (1 + R.SPEND_GROWTH)), 'last month: the whole $16,800 bill, back-projected');
  assert.deepEqual([before.attN, before.topN], [0, 0], 'nothing was on AT&T before this month');
  // An estate with nothing landed keeps one model for every month.
  const p = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend' })).spendCols.filter(x => x.kind === 'past');
  assert.equal(p.at(-2).spendN, Math.round(p.at(-1).spendN / (1 + R.SPEND_GROWTH)));
});

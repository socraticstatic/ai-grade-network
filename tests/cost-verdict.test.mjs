import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import * as CV from '../naas-cost-view.js';
import * as LC from '../naas-lifecycle.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's read of Cost v2 (2026-09-30), fixed one by one: the egress split
// by region follows the Savings list, one colour means one thing, nothing claims
// On AT&T where nothing is attached, a picked member reads its own shares, a $0
// row and a $0 cloud still show, the Banked and Could save doors open exactly
// what they count, Europe is one place, and the old By region's per-region
// Attach door and its arithmetic are back.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', ...patch });
const money = (s) => +String(s).replace(/[^0-9.]/g, '');
const near = (a, b, eps = 0.01) => Math.abs(a - b) < eps;
const legsOf = (view) => { const e = D.ESTATES[view], inv = A.inventory(e), ob = A.observe(e, [], inv); return R.costLegs(e, inv, ob.utilRows); };
const BUCKETED = ['partial', 'mature', 'trust', 'small'];
const egressIn = (e, L, key, ink) => { const row = CV.sliceLegs(e, L, 'region', key).cloud.rows.find(r => r.key === 'egress'); return row ? row.parts.filter(p => !ink || p.ink === ink).reduce((a, p) => a + p.v, 0) : 0; };

// ---------- P1: egress by region takes the Savings list's split ----------

// Re-pinned (2026-09-30, the skeptic's third read): pooling every bucket of one ink across the estate put
// GCP's egress in AWS and Azure regions. Each bucket now lands in its own cloud's regions only (LC.egressByRegion):
// at the AT&T price in the attached ones; outside AT&T in the public ones, or the attached ones where its cloud
// has none public. tests/cost-own-cloud.test.mjs pins By region summed by cloud against By cloud.
test('egress by region: each bucket in its own cloud\'s regions, by workloads, and a place holds what its regions hold', () => {
  for (const view of BUCKETED) {
    const e = D.ESTATES[view], L = legsOf(view);
    const regs = e.regionsList;
    const outOf = LC.egressByRegion(e, 'public').byRegion, attOf = LC.egressByRegion(e, 'att').byRegion;
    const members = CV.costMembers(e, L, 'region');
    for (const m of members) {
      const inGeo = regs.map((r, i) => [r, i]).filter(([r]) => CV.geoOfRegion(r.region) === m.key);
      const wantOut = inGeo.reduce((a, [, i]) => a + outOf[i], 0), wantAtt = inGeo.reduce((a, [, i]) => a + attOf[i], 0);
      assert.ok(near(egressIn(e, L, m.key, 'public'), wantOut, 0.5), `${view} ${m.key}: outside ${egressIn(e, L, m.key, 'public')} vs ${wantOut}`);
      assert.ok(near(egressIn(e, L, m.key, 'att'), wantAtt, 0.5), `${view} ${m.key}: on AT&T ${egressIn(e, L, m.key, 'att')} vs ${wantAtt}`);
      if (!inGeo.some(([r]) => r.priv)) assert.equal(egressIn(e, L, m.key, 'att'), 0, `${view} ${m.key} has nothing attached, so no egress at the AT&T price`);
    }
  }
  // The skeptic's cases: Established's US East is all attached, so none of its egress is outside AT&T.
  assert.equal(egressIn(D.ESTATES.mature, legsOf('mature'), 'US East', 'public'), 0);
  assert.ok(egressIn(D.ESTATES.mature, legsOf('mature'), 'Asia Pacific', 'public') > 0, 'ap-southeast-1 carries it');
});

test('a regional egress share is a model, so it is hatched, and it names its cloud regions, not every bucket', () => {
  const e = D.ESTATES.partial, L = legsOf('partial');
  const eg = CV.sliceLegs(e, L, 'region', 'US West').cloud.rows.find(r => r.key === 'egress');
  assert.ok(eg.parts.length > 0 && eg.parts.every(p => p.modelled && p.kind === 'region'), JSON.stringify(eg.parts.map(p => [p.kind, p.region, p.modelled])));
  assert.deepEqual(eg.parts.map(p => p.region), ['us-west-2']);
  const bar = CV.memberBars(e, L, 'region').find(b => b.key === 'US West');
  assert.ok(bar.segs.some(s => s.ink === 'public' && s.modelled), 'the bar hatches the modelled share');
  // Whole estate and By cloud stay measured, bucket by bucket.
  assert.ok(L.cloud.rows.find(r => r.key === 'egress').parts.every(p => p.kind === 'bucket' && !p.modelled));
});

// ---------- P2 / R2 / P3: one colour, one meaning, on By destination and By first mile too ----------

const TOKENS = (() => { const m = /\[data-theme="light"\]\{([^}]*)\}/.exec(HTML); return Object.fromEntries(m[1].split(';').filter(Boolean).map(x => x.split(':').map(s => s.trim()))); })();
const resolve = (c) => String(c).replace(/var\((--[\w-]+)\)/g, (_, t) => TOKENS[t] || t).toLowerCase();

test('By destination: no two measures share a colour, and no category borrows a money colour', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const v = vals(cost(view, { costPanel: 'dest' }));
    const titles = v.costDonuts.map(d => d.title);
    assert.ok(!titles.includes('How it leaves the building'), `${view}: the first-mile split lives on By first mile, not beside the rate split`);
    const byColour = {};
    for (const d of v.costDonuts) for (const r of d.rows) (byColour[resolve(r.color)] = byColour[resolve(r.color)] || new Set()).add(r.meaning || r.label);
    for (const [c, ms] of Object.entries(byColour)) assert.equal(ms.size, 1, `${view}: ${c} means ${[...ms].join(' and ')}`);
    const dest = v.costDonuts.find(d => d.key === 'dest');
    const money = ['--viz-1', '--viz-2', '--viz-3', '--viz-4', '--success', '--warning'].map(t => TOKENS[t].toLowerCase());
    for (const r of dest.rows) for (const hex of money) assert.ok(!resolve(r.color).includes(hex), `${view} ${r.label} wears ${hex}`);
    // The destination rows are one modelled ink, told apart by their names and bars.
    assert.equal(new Set(dest.rows.map(r => r.color)).size, 1);
    assert.ok(dest.rows.every(r => r.meaning === 'modelled' && /%$/.test(r.w)));
  }
});

test('By first mile draws no money colour: its split is a model of where the bill starts, not who is paid', () => {
  const v = vals(cost('partial', { costPanel: 'mile' }));
  const money = ['--viz-1', '--viz-2', '--viz-3', '--viz-4', '--success', '--warning'].map(t => TOKENS[t].toLowerCase());
  for (const r of v.bySite) for (const hex of money) assert.ok(!resolve(r.fill).includes(hex), `${r.label} wears ${hex}`);
  const a = HTML.indexOf('<sc-if value="{{ costPanelMile }}"'), b = HTML.indexOf('</sc-if>', HTML.indexOf('aria-label="Egress by site class"'));
  const panel = HTML.slice(a, b + 800);
  assert.doesNotMatch(panel, /var\(--viz-1\)|var\(--warning\)/, 'the panel names no money ink');
  assert.match(v.bySite[0].sub, /on AT&T/, 'the on-AT&T count stays, in words');
});

// ---------- P4 / R3: nothing claims On AT&T where nothing is attached ----------

test('a bucket is On AT&T only when its cloud has a region attached', () => {
  const small = D.ESTATES.small;
  for (const b of small.buckets) assert.equal(CV.bucketInk(small, b), 'public', b.id);
  assert.equal(CV.bucketInk(D.ESTATES.partial, D.ESTATES.partial.buckets.find(b => b.id === 'base')), 'att');
  const sp = vals(cost('small', { costPanel: 'spend' }));
  assert.ok(sp.spendCols.every(c => (c.attN || 0) === 0), 'no column is part On AT&T');
  assert.ok(!sp.spendLegend.some(l => l.meaning === 'att'), 'and the legend does not offer it');
  const L = legsOf('small');
  assert.ok(L.cloud.rows.find(r => r.key === 'egress').parts.every(p => p.ink === 'public'));
  const rg = vals(cost('small', { costPanel: 'money' }));
  // The blue left on Small business is what AT&T bills (its ADI and Business Fiber at catalog price), and it says so:
  // the legend reads AT&T price, never On AT&T.
  const attSegs = rg.regionBars.reduce((a, b) => a + b.segs.filter(s => s.ink === 'att').reduce((x, s) => x + s.v, 0), 0);
  assert.equal(attSegs, L.access.rows.filter(r => !r.carrier).reduce((a, r) => a + r.v, 0), 'only the AT&T access circuits are blue');
  for (const view of ['small', 'partial']) for (const panel of ['legs', 'money', 'spend']) {
    const v = vals(cost(view, { costPanel: panel }));
    for (const l of [...(v.costLegend || []), ...(v.spendLegend || [])]) assert.doesNotMatch(l.label, /^On AT&T$/, `${view} ${panel}: blue is AT&T's price, not a claim about the network`);
  }
  const bk = vals(cost('small', { costPanel: 'bucket' }));
  assert.ok(bk.buckets.every(b => b.savedF !== 'On AT&T' && b.action !== 'Already steered'), bk.buckets.map(b => b.savedF + '/' + b.action).join(', '));
  const dest = vals(cost('small', { costPanel: 'dest' })).costDonuts.find(d => d.key === 'move');
  assert.ok(!dest.rows.some(r => /AT&T rate/.test(r.label)), dest.rows.map(r => r.label).join(', '));
});

// ---------- P5: a picked member's tiles are shares of that member ----------

test('with a member picked, the leg tiles read shares of that member and add to 100%', () => {
  for (const [view, by, key] of [['partial', 'region', 'US East'], ['trust', 'region', 'US West'], ['partial', 'cloud', 'AWS']]) {
    const v = vals(cost(view, { costPanel: 'legs', costBy: by, costPick: key }));
    const tot = v.legTiles.reduce((a, t) => a + money(t.v), 0);
    let sum = 0;
    for (const t of v.legTiles) { const pct = +/^(\d+)%/.exec(t.sub)[1]; sum += pct; assert.ok(Math.abs(pct - money(t.v) / tot * 100) <= 0.5, `${view} ${key} ${t.key}: ${t.sub}`); assert.match(t.sub, new RegExp(`of ${key}$`)); }
    assert.ok(Math.abs(sum - 100) <= 2, `${view} ${key}: ${sum}`);
  }
  assert.match(vals(cost('partial', { costPanel: 'legs' })).legTiles[0].sub, /% of the total$/);
});

// ---------- P6 / P15: the figure that matters is never cut off; shorten the words ----------

test('an egress row leads with its figure, and a member row\'s service list is short enough to read whole', () => {
  const e = D.ESTATES.partial, L = legsOf('partial');
  // A mixed row leads with its outside-AT&T figure; a row of one kind says so without repeating the row's value.
  for (const key of ['US East', 'Europe', 'US West']) {
    const eg = CV.sliceLegs(e, L, 'region', key).cloud.rows.find(r => r.key === 'egress');
    assert.match(CV.rowWords(eg), /^(\$[\d,]+ outside AT&T|All outside AT&T|All at your AT&T rate) · /, CV.rowWords(eg));
  }
  const t = D.ESTATES.trust, TL = legsOf('trust');
  // Re-pinned (2026-09-30, the skeptic's third read): Bank scale's US Central holds GCP's $84,000 and Azure's $38,000,
  // both outside AT&T, not a pooled mix of every cloud's buckets.
  assert.match(CV.rowWords(CV.sliceLegs(t, TL, 'region', 'US Central').cloud.rows.find(r => r.key === 'egress')), /^All outside AT&T · 2 cloud regions/, 'Bank scale US Central is its own clouds\' egress');
  assert.match(CV.rowWords(L.cloud.rows.find(r => r.key === 'egress')), /^\$[\d,]+ outside AT&T/);
  for (const view of ['partial', 'mature', 'trust']) for (const by of ['region', 'cloud']) {
    const v = vals(cost(view, { costPanel: 'legs', costBy: by }));
    for (const r of [...v.legAccessRows, ...v.legConnectRows, ...v.legCloudRows]) assert.ok(r.sub.length <= 44, `${view} ${by} ${r.label}: ${r.sub}`);
  }
});

// ---------- P7 / P8: a $0 row is not On AT&T, and a $0 cloud is still a member ----------

test('CoreWeave, $0 and 2 ports, is a By cloud member, and its row is not drawn On AT&T', () => {
  const e = D.ESTATES.mature, L = legsOf('mature');
  const ms = CV.costMembers(e, L, 'cloud');
  assert.ok(ms.some(m => m.key === 'CoreWeave'), ms.map(m => m.key).join(', '));
  const cw = CV.sliceLegs(e, L, 'cloud', 'CoreWeave').cloud.rows.find(r => r.cloud === 'CoreWeave');
  assert.equal(cw.n, 2);
  const v = vals(cost('mature', { costPanel: 'legs' }));
  const row = [...v.legCloudRows, ...vals(cost('mature', { costPanel: 'legs', legPPage: 1 })).legCloudRows].find(r => /CoreWeave/.test(r.label));
  assert.ok(row, 'the row shows');
  assert.notEqual(row.swatch, CV.fillOf('att', false), 'a CoreWeave port is not On AT&T');
  assert.match(row.edge, /solid/, 'it wears the not-priced-here outline');
  assert.ok(vals(cost('mature', { costPanel: 'money', costBy: 'cloud' })).regionBars.some(b => b.key === 'CoreWeave'), 'and it has a bar');
});

// ---------- P9: the Banked doors open what Banked counts ----------

test('Banked opens the sources it counts: the network since the first attach and each closed finding, to the dollar', () => {
  const c = cost('partial', { costPanel: 'spend' });
  const tile = vals(c).spendTiles.find(t => t.l === 'Banked to date');
  tile.go();
  assert.equal(c.state.costPanel, 'spend', 'it stays on Spend');
  const v = vals(c);
  assert.equal(v.spendListBanked, true);
  const rows = v.bankRows;
  assert.equal(rows.reduce((a, r) => a + r.toDateN, 0), money(tile.v), 'to date adds up to the tile');
  assert.equal(rows.reduce((a, r) => a + r.moN, 0), money(v.bankTiles.find(t => t.l === 'This month').v), 'this month adds up too');
  assert.ok(rows.some(r => r.kind === 'network') && rows.filter(r => r.kind === 'finding').length === 2, rows.map(r => r.label).join(' | '));
  // A closed finding opens that finding; the network's own saving opens what is on AT&T.
  const f = rows.find(r => r.kind === 'finding');
  f.go();
  assert.deepEqual([c.state.obPage, c.state.insPanel, c.state.findFilter, c.state.fdKey], ['insights', 'findings', 'closed', f.key.replace(/^f:/, '')]);
  // Re-pinned (2026-09-30, the skeptic's third read): Connect > Your network shows no dollar figure, so the
  // network's own saving opens its share in each place, on Spend (tests/cost-banked-doors.test.mjs).
  const d = cost('partial', { costPanel: 'spend', spendList: 'banked' });
  vals(d).bankRows.find(r => r.kind === 'network').go();
  assert.deepEqual([d.state.tab, d.state.costPanel, d.state.bankSource], ['cost', 'spend', 'network']);
});

test('a Savings row opens what each figure counts: banked its share of the sources, still open the moves', () => {
  const c = cost('partial', { costPanel: 'spend' });
  const row = vals(c).saveRows.find(r => r.bankedN > 0);
  row.goBanked();
  const v = vals(c);
  assert.equal(v.spendListBanked, true);
  assert.equal(v.bankRows.reduce((a, r) => a + r.moN, 0), row.bankedN, `${row.label}: the scoped sources add to its ${row.bankedF}`);
  assert.match(v.bankHead, new RegExp(row.label));
  const d = cost('partial', { costPanel: 'spend' });
  vals(d).saveRows.find(r => r.openN > 0).goOpen();
  assert.equal(d.state.costPanel, 'optimize');
  assert.match(HTML, /onClick="\{\{ sr\.goBanked \}\}"/); assert.match(HTML, /onClick="\{\{ sr\.goOpen \}\}"/);
});

// ---------- P10: Could save counts what Optimize shows ----------

test('Could save is Optimize\'s priced moves, by name, and its figure is Optimize\'s line', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const o = vals(cost(view, { costPanel: 'optimize' }));
    const priced = o.optRows.filter(r => r.figure > 0 && /^Save/.test(r.figureF));
    const t = vals(cost(view, { costPanel: 'spend' })).spendTiles.find(x => x.l === 'Could save');
    assert.equal(money(t.v), money(o.optLine), `${view}: ${t.v} vs ${o.optLine}`);
    for (const r of priced) assert.match(t.sub, new RegExp(r.label), `${view}: ${t.sub}`);
    assert.doesNotMatch(t.sub, /\d+ open moves?/, `${view}: a count Optimize does not show`);
  }
});

// ---------- P11: Europe is every European region ----------

test('By region: Europe groups every European region and site; us-east-2 is US East', () => {
  const m = CV.costMembers(D.ESTATES.mature, legsOf('mature'), 'region');
  const eu = m.find(x => x.key === 'Europe');
  assert.ok(eu, m.map(x => x.key).join(', '));
  for (const r of ['eu-central-1', 'westeurope']) assert.ok(eu.regions.includes(r), r);
  assert.ok(eu.sites.includes('Frankfurt DC'));
  assert.ok(!m.some(x => x.key === 'International'), 'no International bar beside Europe');
  assert.equal(CV.geoOfRegion('us-east-2'), 'US East');
  assert.equal(CV.geoOfRegion('centralus'), 'US Central');
  assert.equal(CV.geoOfRegion('ap-southeast-1'), 'Asia Pacific');
  assert.ok(CV.costMembers(D.ESTATES.trust, legsOf('trust'), 'region').find(x => x.key === 'US East').regions.includes('us-east-2'));
});

// ---------- P12: the legend says what the hatch is, and IPsec tunnels belong to their cloud ----------

test('the list-price swatch covers every list price it paints, and By cloud puts IPsec tunnels with their cloud', () => {
  const v = vals(cost('partial', { costPanel: 'legs' }));
  const list = v.costLegend.find(l => l.meaning === 'list');
  assert.doesNotMatch(list.label, /cloud provider/i);
  assert.match(list.title, /cross-connect/);
  const e = D.ESTATES.partial, L = legsOf('partial');
  const aws = CV.sliceLegs(e, L, 'cloud', 'AWS').connect.rows.find(r => r.key === 'ipsec');
  assert.ok(aws && aws.n === 5, 'the five tunnels bill in AWS, beside the IPsec egress bucket');
  assert.ok(!CV.sliceLegs(e, L, 'cloud', CV.SITES).connect.rows.some(r => r.key === 'ipsec'));
});

// ---------- P13: a list price is hatched on the Traffic Cost view too ----------

test('the Traffic Cost view hatches direct connect at its list price', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', mapMode: 'cost' }));
  const list = v.mapLegend.find(l => l.meaning === 'list');
  assert.match(list.bg, /repeating-linear-gradient/);
  const direct = v.mapRibbons.filter(r => r.ink === CV.COST_INK.list.color);
  assert.ok(direct.length >= 2 && direct.every(r => r.fill === 'url(#cost-hatch-list)'), direct.map(r => r.fill).join(', '));
  assert.match(HTML, /<pattern id="cost-hatch-list"/);
});

// ---------- P14: empty says so once ----------

test('the empty estate says No egress once, and Spend draws no empty savings list', () => {
  const rg = vals(cost('empty', { costPanel: 'money' }));
  assert.equal(rg.noRegionBars, false, 'the page\'s own No egress seen yet stands alone');
  assert.equal(vals(cost('empty', { costPanel: 'legs' })).noLegs, false);
  const sp = vals(cost('empty', { costPanel: 'spend' }));
  assert.equal(sp.hasSaveList, false);
  assert.equal(vals(cost('partial', { costPanel: 'spend' })).hasSaveList, true);
});

// ---------- R1: By region keeps its per-region Attach door and its arithmetic ----------

test('By region lists what each region could save, with an Attach or Steer door and the arithmetic', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const e = D.ESTATES[view], c = cost(view, { costPanel: 'money' });
    const v = vals(c);
    // Re-pinned (2026-09-30, the skeptic's third read): every region carrying egress outside AT&T has a row, its own
    // cloud's buckets only, so Bank scale's attached GCP us-central1 (GCP has no public region) is one too, and steers.
    const out = LC.egressByRegion(e, 'public').byRegion;
    assert.equal(v.regionSaveRows.length, e.regionsList.filter((r, i) => out[i] > 0).length, view);
    // Each row's saving is the Savings list's still-open figure for that region, to the dollar.
    const open = Object.fromEntries(LC.savingsBy(e, 'region', { open: e.findings.filter(f => f.priced) }).map(o => [o.label, o.open]));
    for (const r of v.regionSaveRows) {
      assert.equal(r.saveN, open[r.label], `${view} ${r.label}`);
      assert.equal(r.nowN - r.saveN, r.afterN, `${view} ${r.label}: today less the saving is the AT&T price`);
      assert.match(r.math, /workloads/);
    }
    // Today, per region, is the bar's egress outside AT&T there.
    const L = legsOf(view);
    for (const b of CV.memberBars(e, L, 'region')) {
      const rows = v.regionSaveRows.filter(r => CV.geoOfRegion(r.regionId) === b.key);
      assert.ok(near(rows.reduce((a, r) => a + r.nowN, 0), egressIn(e, L, b.key, 'public'), 0.5), `${view} ${b.key}`);
    }
    const r0 = v.regionSaveRows[0];
    // Today opens that region's egress in By leg, where the same figure stands on its row; to save opens the moves.
    const d = cost(view, { costPanel: 'money' });
    vals(d).regionSaveRows[0].goNow();
    assert.deepEqual([d.state.costPanel, d.state.costBy, d.state.costPick], ['legs', 'region', CV.geoOfRegion(r0.regionId)]);
    const part = vals(d).legCloudRows.find(x => x.isPart && x.label === r0.label);
    assert.ok(part && part.vF === r0.nowF, `${view}: ${r0.label} ${r0.nowF} in By leg reads ${part && part.vF}`);
    vals(d).regionSaveRows[0].goSave();
    assert.equal(d.state.costPanel, 'optimize');
    r0.attach();
    assert.equal(c.state.screen, 's4', `${view}: Attach opens the order`);
    assert.equal(c.state.compose.prefillRegion, r0.label, `${view}: Attach prefills its own region`);
  }
  const html = HTML.slice(HTML.indexOf('<sc-if value="{{ costPanelMoney }}"'), HTML.indexOf('<sc-if value="{{ hasBuckets }}"', HTML.indexOf('<sc-if value="{{ costPanelMoney }}"')));
  assert.match(html, /onClick="\{\{ rs2\.attach \}\}"/);
  assert.match(html, /\{\{ costDetailWord \}\}/);
  assert.match(html, /\{\{ rs2\.math \}\}/);
});

test('Recommended\'s egress for a region move is the By region figure its door opens', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const c = mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' });
    const v = vals(c);
    const rows = vals(cost(view, { costPanel: 'money' })).regionSaveRows;
    for (const m of (v.moveList || []).filter(x => x.kind === 'region')) {
      const want = rows.filter(r => m.regions.includes(r.regionId)).reduce((a, r) => a + r.nowN, 0);
      assert.equal(m.today.egress, want, `${view} ${m.title}`);
    }
  }
});

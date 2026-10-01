import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as LC from '../naas-lifecycle.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's third read of Banked (2026-09-30, P9 partly fixed): the largest
// source, Your connections on AT&T, opened Connect > Your network, which shows no
// dollar figure; a scoped list credited findings to places they do not name (Azure
// eastus held a share of a hairpin to us-east-1, CoreWeave of an object-storage
// steer); a $0 banked figure was still a door to three $0 rows; the scoped rows'
// to-date missed their own arithmetic by a few dollars, and the head and row words
// were cut off at the column's edge.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const cost = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'cost', costPanel: 'spend', ...patch });
const money = (s) => +String(s).replace(/[^0-9.]/g, '');
const PAGERS = { saveRows: ['savePager', 'savePage'], bankRows: ['bankPager', 'bankPage'] };
// Every row of a paged list, page by page, then back to the first page.
const every = (c, key) => { const [pager, page] = PAGERS[key]; let rows = [], guard = 0; c.state[page] = 0; for (;;) { const w = vals(c); rows = rows.concat(w[key]); if (w[pager].nextOp < 1 || ++guard > 30) break; w[pager].next(); } c.state[page] = 0; return rows; };

test('a scoped Banked list holds only what its place banked, each row exact: its share a month × its months is its to date', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const dim of ['region', 'bu', 'cloud']) {
    const base = cost(view, { saveGroup: dim });
    for (const r of every(base, 'saveRows').filter(x => x.bankedN > 0)) {
      const c = cost(view, { saveGroup: dim });
      every(c, 'saveRows').find(x => x.key === r.key).goBanked();
      const rows = every(c, 'bankRows');
      assert.ok(rows.length > 0, `${view} ${dim} ${r.label}`);
      assert.equal(rows.reduce((a, x) => a + x.moN, 0), r.bankedN, `${view} ${dim} ${r.label}: the rows add to its banked figure`);
      for (const x of rows) {
        assert.ok(x.moN > 0, `${view} ${dim} ${r.label}: ${x.label} is $0 here`);
        assert.equal(x.toDateN, x.moN * x.months, `${view} ${dim} ${r.label} ${x.label}: ${x.toDateF} is not ${x.moF} × ${x.months}`);
        assert.match(x.sub, new RegExp(`^${x.months} months? since `), x.sub);
      }
    }
  }
});

test('a closed finding is credited only to the places it names, or, naming none, where AT&T carries your egress', () => {
  const p = cost('partial', { saveGroup: 'region' });
  p.setState({ spendList: 'banked', bankScope: { dim: 'region', key: 'Azure eastus', label: 'Azure eastus' } });
  const az = every(p, 'bankRows').map(x => x.label);
  assert.ok(!az.some(l => /hairpinned/.test(l)), `Azure eastus holds ${az.join(' | ')}`);
  assert.ok(az.includes('Your connections on AT&T'), 'its share of the network stays');
  const q = cost('partial', { saveGroup: 'region' });
  q.setState({ spendList: 'banked', bankScope: { dim: 'region', key: 'AWS us-east-1', label: 'AWS us-east-1' } });
  assert.ok(every(q, 'bankRows').some(x => /hairpinned/.test(x.label)), 'the hairpin is us-east-1\'s');
  const m = cost('mature', { saveGroup: 'cloud' });
  m.setState({ spendList: 'banked', bankScope: { dim: 'cloud', key: 'CoreWeave', label: 'CoreWeave' } });
  const cw = every(m, 'bankRows').map(x => x.label);
  assert.ok(!cw.some(l => /Object storage/.test(l)), `CoreWeave holds ${cw.join(' | ')}`);
  // Bank scale's AWS to Azure replication names two clouds: AWS and Azure hold it, GCP does not.
  const t = cost('trust', { saveGroup: 'cloud' });
  t.setState({ spendList: 'banked', bankScope: { dim: 'cloud', key: 'GCP', label: 'GCP' } });
  assert.ok(!every(t, 'bankRows').some(x => /AWS to Azure/.test(x.label)));
});

test('a $0 banked figure is not a door', () => {
  const c = cost('partial', { saveGroup: 'region' });
  const zero = every(c, 'saveRows').find(r => r.bankedN === 0);
  assert.ok(zero, 'Growing has a public region with nothing banked');
  assert.equal(zero.bankedOff, true);
  const before = JSON.stringify([c.state.spendList, c.state.bankScope]);
  zero.goBanked();
  assert.equal(JSON.stringify([c.state.spendList, c.state.bankScope]), before, 'it opens nothing');
  assert.ok(every(c, 'saveRows').filter(r => r.bankedN > 0).every(r => r.bankedOff === false));
  assert.match(HTML, /onClick="\{\{ sr\.goBanked \}\}" disabled="\{\{ sr\.bankedOff \}\}"/);
});

test('Your connections on AT&T opens what it counts: its share in each place, adding to its figure, each opening that place', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const c = cost(view, { spendList: 'banked' });
    const net = vals(c).bankRows.find(r => r.kind === 'network');
    net.go();
    assert.deepEqual([c.state.tab, c.state.costPanel, c.state.spendList, c.state.bankSource], ['cost', 'spend', 'banked', 'network'], view);
    const v = vals(c);
    assert.match(v.bankHead, /^Your connections on AT&T: /);
    const places = every(c, 'bankRows');
    assert.equal(places.reduce((a, x) => a + x.moN, 0), net.moN, `${view}: the places add to ${net.moF}`);
    assert.equal(places.reduce((a, x) => a + x.toDateN, 0), net.toDateN, `${view}: and to its to date`);
    // A place opens that place's sources, where the network's row reads the same figure.
    const p0 = places[0];
    p0.go();
    assert.equal((c.state.bankScope || {}).key, p0.label, view);
    assert.equal(c.state.bankSource, null);
    const back = every(c, 'bankRows').find(x => x.kind === 'network');
    assert.equal(back.moN, p0.moN, `${view}: ${p0.label} reads ${p0.moF} in both lists`);
    // And a scoped source row opens that source by place, where this place reads the same figure.
    back.go();
    assert.equal(c.state.bankSource, 'network');
    assert.equal(every(c, 'bankRows').find(x => x.label === p0.label).moN, p0.moN);
  }
});

test('the head and every row read whole in the 300px column: the scope in the head, the arithmetic in the row', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const dim of ['region', 'bu', 'cloud']) {
    const c = cost(view, { saveGroup: dim });
    const r = every(c, 'saveRows').find(x => x.bankedN > 0);
    r.goBanked();
    const v = vals(c);
    assert.ok(v.bankHead.startsWith(`${r.label}'s share: ${r.bankedF} of `), v.bankHead);
    for (const x of every(c, 'bankRows')) assert.ok(x.sub.length <= 26, `${view} ${dim}: ${x.sub}`);
  }
  // The head may wrap to two lines; it is never cut off on one.
  const a = HTML.indexOf('<button class="cost-back" onClick="{{ bankBack }}"');
  assert.match(HTML.slice(a, HTML.indexOf('</button>', a)), /<small style="white-space:normal[^"]*">\{\{ bankHead \}\}<\/small>/);
});

test('the scoped list and the Savings list read one model: LC.savingsBy\'s bySource', () => {
  const est = D.ESTATES.trust;
  const c = cost('trust', { saveGroup: 'bu' });
  const r = every(c, 'saveRows').find(x => x.bankedN > 0);
  r.goBanked();
  const want = LC.savingsBy(est, 'bu', { sources: LC.bankedSources(est, LC.lifeFor(est), new Date('2026-09-29T12:00:00Z')), open: [] }).find(x => x.key === r.key).bySource;
  for (const x of every(c, 'bankRows')) assert.equal(x.moN, want[x.key], x.label);
  void money;
});

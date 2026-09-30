import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as F from '../naas-flowmap.js';
import * as SCH from '../naas-schedule.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Add a source, and discovery finds it (notes, 2026-09-30, Task 2.8): "Under
// Discover : Sources, add a new source, and rerun discovery, can we add new
// cloud hierarchy with workload info to showcase how discovery with this
// feature will work together?" Oracle is the demo: two regions, ERP on them.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const NOW = '2026-10-05T15:00:00Z';
const sources = (view) => mkC({ view, estateParam: null, screen: 's1', discoverView: 'sources', nowIso: NOW });
const addOracle = (c) => { vals(c).openAddSource(); vals(c).sourceTiles.find(t => /Oracle/.test(t.name)).pick(); vals(c).addSource(); };
import { readFileSync } from 'node:fs';
const require_html = () => readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const pill = (v, key) => String(v.invStats.find(p => p.key === key).v);

test('Growing: add Oracle, and the account, its regions, its workloads and its app appear', () => {
  const c = sources('partial');
  const before = vals(c);
  assert.deepEqual([pill(before, 'c'), pill(before, 'r'), pill(before, 'w')], ['3', '7', '303']);
  addOracle(c);
  const v = vals(c);
  const row = v.sources.find(r => r.name === 'Oracle account');
  assert.ok(row, v.sources.map(r => r.name).join(', '));
  assert.equal(row.state, 'Connected');
  assert.equal(row.cred, 'API signing key');
  assert.equal(row.scope, 'Read-only · 2 regions');
  assert.equal(row.seen, 'just now');
  assert.deepEqual([pill(v, 'c'), pill(v, 'r'), pill(v, 'w')], ['4', '9', '373']);
  assert.match(v.foundLine, /^Discovery found 2 Oracle regions, \d+ VCNs and 70 workloads\. Both ride the public internet\.$/);
  c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' });
  assert.ok(vals(c).pathFlowAll.some(r => r.tag === 'erp'), 'ERP shows up as an app group');
});

// Final review, 2026-09-30, finding 2: Health read "erp → storefront-web". The
// stakeholder's example is "Finance → ERP"; an ERP group names ERP apps.
test('the ERP app group names the ERP apps Oracle found, never a generic one', () => {
  const c = sources('partial');
  addOracle(c);
  c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' });
  const seeds = new Set(D.FOUND_SOURCES.Oracle.regions.flatMap(r => (r.apps || []).map(x => x[0])));
  const generic = ['storefront-web', 'redis', 'batch-runner', 'triton-server', 'embed-worker'];
  const row = vals(c).pathFlowAll.find(r => r.tag === 'erp');
  assert.ok(row, 'ERP shows up as an app group');
  const top = row.label.split(' → ')[1];
  assert.ok(!generic.includes(top), `erp group reads "${row.label}"`);
  assert.ok(seeds.has(top), `erp top app ${top} is one of the Oracle seed apps (${[...seeds].join(', ')})`);
  // Every Oracle workload's apps are Oracle's, in every app group, so no ERP region carries a storefront.
  const inv = A.inventory(SCH.withSources(D.ESTATES.partial, [{ provider: 'Oracle', at: Date.parse(NOW), estId: 'partial' }]));
  const ora = inv.find(cl => cl.name === 'Oracle');
  const apps = ora.regions.flatMap(r => r.vpcs.flatMap(v => v.subnets.flatMap(s => s.workloads.flatMap(w => w.endpoints.map(e => e.app)))));
  assert.equal(apps.length, 70, 'one app per Oracle workload');
  assert.ok(apps.every(a => seeds.has(a)), [...new Set(apps.filter(a => !seeds.has(a)))].join(', '));
});

test('See what it found drills into the new cloud, in place', () => {
  const c = sources('partial');
  addOracle(c);
  vals(c).seeFound();
  assert.equal(c.state.screen, 's1');
  assert.deepEqual(c.state.cloudTrailE, ['cloud:Oracle']);
  assert.ok(vals(c).cloudRows.some(r => r.name === 'Oracle us-ashburn-1'));
});

test('another estate is untouched, and Remove puts the counts back', () => {
  const c = sources('partial');
  addOracle(c);
  c.setState({ view: 'mature' });
  assert.equal(pill(vals(c), 'c'), '4', 'Established keeps its own four clouds');
  assert.ok(!vals(c).sources.some(r => r.name === 'Oracle account'));
  c.setState({ view: 'partial' });
  vals(c).sources.find(r => r.name === 'Oracle account').remove();
  assert.equal(pill(vals(c), 'c'), '3');
  assert.ok(require_html().includes('onClick="{{ sr.remove }}">Remove<'), 'Remove is on the page');
});

test('the found account never backdates itself or its runs', () => {
  const est = SCH.withSources(D.ESTATES.partial, [{ provider: 'Oracle', name: 'Oracle account', cred: 'API signing key', cadence: 'nightly', at: Date.parse(NOW), estId: 'partial' }]);
  const v = SCH.scheduleView(est, Date.parse(NOW), {});
  const acct = v.accounts.find(a => a.cloud === 'Oracle');
  assert.ok(acct.lastRun >= Date.parse(NOW), 'no last run before it was added');
  assert.ok((v.runs || []).every(r => !r.accountIds.includes(acct.id) || r.at >= Date.parse(NOW)));
});

test('the map conserves with Oracle, and the new regions collide with nothing', () => {
  const est = SCH.withSources(D.ESTATES.partial, [{ provider: 'Oracle', at: Date.parse(NOW), estId: 'partial' }]);
  const inv = A.inventory(est), ob = A.observe(est, [], inv);
  const m = F.buildMap(est, inv, ob.flows, {});
  const l = m.nodes.filter(n => n.side === 'l').reduce((a, n) => a + n.v, 0), r = m.nodes.filter(n => n.side === 'r').reduce((a, n) => a + n.v, 0);
  assert.ok(Math.abs(l - r) < 1e-6, `${l} vs ${r}`);
  assert.ok(m.nodes.some(n => n.side === 'r' && /Oracle/.test(n.name)));
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const x of D.FOUND_SOURCES.Oracle.regions) assert.ok(!D.ESTATES[view].regionsList.some(y => y.region === x.region), `${view}: ${x.region}`);
  }
});

test('the new finding reads today, and Cost and Optimize follow it', () => {
  const c = sources('partial');
  addOracle(c);
  c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'findings', findFilter: 'all' });
  const f = vals(c).findAll.find(r => r.key === 'newcloud-oracle');
  assert.ok(f, 'the Oracle finding is on the list');
  assert.equal(f.age, '0d');
  c.setState({ tab: 'observe', obPage: 'perf' });
  const head = vals(c).pageVerdict.match(/\$([\d,]+)\/mo/)[1].replace(/,/g, '');
  c.setState({ tab: 'cost' });
  const r = vals(c).optRows;
  assert.equal(r[0].figure + r[1].figure, +head, 'Spend plus Routing still equals the head');
});

test('adding AT&T inventory adds no row; it is already live', () => {
  const c = sources('partial');
  const n = vals(c).sources.length;
  vals(c).openAddSource(); vals(c).setSource('inventory')(); vals(c).addSource();
  assert.equal(vals(c).sources.length, n);
});

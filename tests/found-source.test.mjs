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
  // Every workload in an Oracle ERP VCN runs one of Oracle's ERP apps, so no ERP VCN carries a
  // storefront (review 2, 2026-10-01: the seed stays on the VCNs tagged erp or finance; the
  // Data lake VCN keeps its own apps, below).
  const inv = A.inventory(SCH.withSources(D.ESTATES.partial, [{ provider: 'Oracle', at: Date.parse(NOW), estId: 'partial' }]));
  const ora = inv.find(cl => cl.name === 'Oracle');
  const erpVpcs = ora.regions.flatMap(r => r.vpcs.filter(v => ['erp', 'finance'].includes(v.tags[0])));
  assert.equal(erpVpcs.length, 2, 'one ERP VCN in Ashburn, one in Frankfurt');
  const erpWl = erpVpcs.flatMap(v => v.subnets.flatMap(s => s.workloads));
  assert.ok(erpWl.length > 0 && erpWl.every(w => w.endpoints.length === 1 && seeds.has(w.endpoints[0].app)), 'one ERP app per workload in an ERP VCN');
});

// Review 2, 2026-10-01: the Oracle seed ran region-wide, so Ashburn's Data lake VCN
// (tags analytics, erp) ran ERP app servers and the analytics group read
// "analytics → erp-ledger". The seed runs only where the VCN's own tag is erp or
// finance; analytics keeps its own apps, on every estate Oracle is added to.
for (const view of ['partial', 'small', 'empty']) {
  test(`${view}: with Oracle added, erp reads erp → erp-ledger and analytics keeps its own apps`, () => {
    const seeds = new Set(D.FOUND_SOURCES.Oracle.regions.flatMap(r => (r.apps || []).map(x => x[0])));
    const c = sources(view);
    const health = () => { c.setState({ screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obPanel: 'health' }); return vals(c).pathFlowAll; };
    const before = health().find(r => r.tag === 'analytics');
    c.setState({ screen: 's1', discoverView: 'sources' });
    addOracle(c);
    const rows = health();
    assert.equal((rows.find(r => r.tag === 'erp') || {}).label, 'erp → erp-ledger');
    const analytics = rows.find(r => r.tag === 'analytics');
    assert.ok(analytics, 'Ashburn\'s Data lake VCN is an analytics group');
    const top = analytics.label.split(' → ')[1];
    assert.ok(top && !seeds.has(top), `analytics reads "${analytics.label}"`);
    if (before) assert.equal(analytics.label, before.label, 'Oracle leaves the analytics group reading as it did');
    const inv = A.inventory(SCH.withSources(D.ESTATES[view], [{ provider: 'Oracle', at: Date.parse(NOW), estId: view }]));
    const lake = inv.find(cl => cl.name === 'Oracle').regions.flatMap(r => r.vpcs).filter(v => v.tags[0] === 'analytics');
    assert.equal(lake.length, 1, 'one Data lake VCN, in Ashburn');
    const apps = lake.flatMap(v => v.subnets.flatMap(s => s.workloads.flatMap(w => w.endpoints.map(e => e.app))));
    assert.ok(apps.length && apps.every(a => !seeds.has(a)), [...new Set(apps.filter(a => seeds.has(a)))].join(', '));
  });
}

// Review 2, 2026-10-01: endpointsFor named only Azure and GCP, so an Oracle
// workload fell through to AWS (arn:aws, EC2, EKS) in the inventory tree, and so
// did a CoreWeave one. Each reads in its own cloud's names.
const treeWls = (v, cloud) => v.invTree.filter(cl => cl.name === cloud).flatMap(cl => cl.regions.flatMap(r => r.vpcs.flatMap(vp => vp.azGroups.flatMap(az => az.subnets.flatMap(sn => sn.wls))))).map(w => ({ endpoint: w.endpoint, resource: w.resource }));
test('an Oracle workload reads in OCI names, never AWS ones', () => {
  const c = sources('partial');
  addOracle(c);
  c.setState({ inv: {} });
  vals(c).expandAll();
  const wls = treeWls(vals(c), 'Oracle');
  assert.equal(wls.length, 70, 'every Oracle workload is in the tree');
  for (const w of wls) {
    assert.doesNotMatch(JSON.stringify(w), /aws|arn:|\bEC2\b|\bEKS\b|\bENI\b/i);
    assert.match(w.resource.arn, /^ocid1\.[a-z]+\.oc1\./);
  }
  const svcs = new Set(wls.map(w => w.resource.svc));
  for (const s of ['Compute', 'OKE', 'Load Balancer']) assert.ok(svcs.has(s), `${s} is among ${[...svcs].join(', ')}`);
  assert.ok(wls.some(w => /^ocid1\.instance\.oc1\./.test(w.resource.arn)), 'a compute instance reads ocid1.instance.oc1');
});

test('a CoreWeave workload never reads as AWS either', () => {
  const c = mkC({ view: 'mature', estateParam: null, screen: 's1', nowIso: NOW, inv: {} });
  vals(c).expandAll();
  const wls = treeWls(vals(c), 'CoreWeave');
  assert.ok(wls.length > 0, 'Established carries CoreWeave workloads');
  for (const w of wls) assert.doesNotMatch(JSON.stringify(w), /aws|arn:|\bEC2\b|\bEKS\b|p5\.48xl/i);
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

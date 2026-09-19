import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC as mkCBase } from './harness.mjs';

// Task 14: gate Explore 360's invTree on open state. The markup only ever
// renders cl.regions / rg.vpcs / vp.azGroups when the parent is open
// (NaaS Storefront.dc.html:658, :695, :716), so vals() should not build
// those arrays until then. Shared harness (tests/harness.mjs), with
// screen: 's1' (Explore 360's screen: NaaS Storefront.dc.html:562 `sS1`)
// in place of the shared default's s3.
const mkC = (extra = {}) => mkCBase(extra, { screen: 's1' });

// trust: c-AWS (3 regions x 3 vpcs), c-Azure (2 regions x 3 vpcs), c-GCP (1 region x 3 vpcs).
const CLOUD_IDS = ['c-AWS', 'c-Azure', 'c-GCP'];
const REGION_IDS = ['r-AWS-us-east-1', 'r-AWS-us-east-2', 'r-AWS-us-west-2', 'r-Azure-eastus', 'r-Azure-centralus', 'r-GCP-us-central1'];
const VPC_IDS = ['vpc-0-0', 'vpc-0-1', 'vpc-0-2', 'vpc-1-0', 'vpc-1-1', 'vpc-1-2', 'vpc-2-0', 'vpc-2-1', 'vpc-2-2', 'vnet-3-0', 'vnet-3-1', 'vnet-3-2', 'vnet-4-0', 'vnet-4-1', 'vnet-4-2', 'vpc-5-0', 'vpc-5-1', 'vpc-5-2'];

test('all closed: every cloud\'s regions is empty, the cloud count is untouched', () => {
  const v = vals(mkC({ inv: {} }));
  assert.equal(v.invTree.length, CLOUD_IDS.length);
  for (const cl of v.invTree) assert.equal(cl.regions.length, 0, `${cl.key} regions must be [] while closed`);
});

test('cloud open: its regions populate, each region\'s vpcs stays empty', () => {
  const v = vals(mkC({ inv: { 'c-AWS': true } }));
  const aws = v.invTree.find(cl => cl.key === 'c-AWS');
  assert.equal(aws.regions.length, 3, 'AWS has 3 regions');
  for (const rg of aws.regions) assert.equal(rg.vpcs.length, 0, `${rg.key} vpcs must be [] while its region is closed`);
  // sibling clouds are still gated shut
  const azure = v.invTree.find(cl => cl.key === 'c-Azure');
  assert.equal(azure.regions.length, 0);
});

test('cloud + region open: that region\'s vpcs populate, each vpc\'s azGroups stays empty', () => {
  const v = vals(mkC({ inv: { 'c-AWS': true, 'r-AWS-us-east-1': true } }));
  const aws = v.invTree.find(cl => cl.key === 'c-AWS');
  const east1 = aws.regions.find(rg => rg.key === 'r-AWS-us-east-1');
  assert.equal(east1.vpcs.length, 3, 'us-east-1 has 3 vpcs');
  for (const vp of east1.vpcs) assert.equal(vp.azGroups.length, 0, `${vp.key} azGroups must be [] while its vpc is closed`);
  // the sibling region opened by nothing stays shut
  const east2 = aws.regions.find(rg => rg.key === 'r-AWS-us-east-2');
  assert.equal(east2.vpcs.length, 0);
});

test('cloud + region + vpc open: azGroups populate with real subnets', () => {
  const v = vals(mkC({ inv: { 'c-AWS': true, 'r-AWS-us-east-1': true, 'vpc-0-0': true } }));
  const aws = v.invTree.find(cl => cl.key === 'c-AWS');
  const east1 = aws.regions.find(rg => rg.key === 'r-AWS-us-east-1');
  const vpc = east1.vpcs.find(vp => vp.key === 'vpc-0-0');
  assert.ok(vpc.azGroups.length > 0, 'azGroups must populate once the vpc is open');
  const subnetCount = vpc.azGroups.reduce((n, az) => n + az.subnets.length, 0);
  assert.equal(subnetCount, 6, 'vpc-0-0 has 6 subnets across its az groups');
  // the sibling vpc opened by nothing stays shut
  const vpc1 = east1.vpcs.find(vp => vp.key === 'vpc-0-1');
  assert.equal(vpc1.azGroups.length, 0);
});

test('expandAll opens every cloud, region and vpc, but no subnet and no gateway', () => {
  const c = mkC({ inv: {} });
  let v = vals(c);
  v.expandAll();
  const openIds = Object.keys(c.state.inv).filter(k => c.state.inv[k]);
  for (const id of [...CLOUD_IDS, ...REGION_IDS, ...VPC_IDS]) assert.ok(openIds.includes(id), `expandAll must open ${id}`);
  assert.equal(openIds.length, CLOUD_IDS.length + REGION_IDS.length + VPC_IDS.length, 'no extra keys - not a subnet id (vpc-0-0-pub-0) and not a gateway composite key (vpcId + gw name, e.g. vpc-0-0dxgw-prod)');
  // belt and suspenders: both subnet ids and gateway composite keys are
  // built by prefixing a vpc id, so neither can slip in unnoticed.
  for (const id of openIds) assert.ok(!VPC_IDS.some(vpcId => id !== vpcId && id.startsWith(vpcId)), `expandAll must not open a subnet or gateway key, got ${id}`);
  // re-render after expandAll: every cloud/region/vpc level actually renders
  // open. The vpc's own open state IS one of the three levels expandAll
  // opens (its id is in openKeys), so its detail panel - azGroups, with
  // subnets - renders; what stays shut is each subnet's own open state
  // (its workload list), since no subnet id is in openKeys.
  v = vals(c);
  assert.ok(v.invTree.every(cl => cl.regions.length > 0), 'every cloud renders open');
  assert.ok(v.invTree.every(cl => cl.regions.every(rg => rg.vpcs.length > 0)), 'every region renders open');
  assert.ok(v.invTree.every(cl => cl.regions.every(rg => rg.vpcs.every(vp => vp.azGroups.length > 0))), 'every vpc renders its azGroups/subnets');
  assert.ok(v.invTree.every(cl => cl.regions.every(rg => rg.vpcs.every(vp => vp.azGroups.every(az => az.subnets.every(sn => sn.open === false))))), 'subnets stay closed - a subnet\'s workload list opens on its own click');
});

// M1 (review round 1) - a button labelled "Expand all" must never close
// anything the user already opened. Before the fix, expandAll replaced
// `inv` wholesale with `openKeys` (clouds/regions/vpcs only), so a subnet
// the user had opened by hand - not in openKeys - would be dropped and
// snap shut on the next Expand all click.
test('expandAll merges into what is already open - a hand-opened subnet survives, collapseAll still empties it', () => {
  const openSubnet = 'vpc-0-0-pub-0';
  const c = mkC({ inv: { [openSubnet]: true } });
  let v = vals(c);
  v.expandAll();
  assert.equal(c.state.inv[openSubnet], true, 'expandAll must not close a subnet the user had open');
  for (const id of [...CLOUD_IDS, ...REGION_IDS, ...VPC_IDS]) assert.equal(c.state.inv[id], true, `expandAll must still open ${id}`);
  v = vals(c);
  v.collapseAll();
  assert.deepEqual(c.state.inv, {}, 'collapseAll still empties everything, including the hand-opened subnet');
});

test('tag view lists every tag group with its vpcs live, even fully collapsed', () => {
  const v = vals(mkC({ inv: {}, tagView: true }));
  assert.ok(v.invTree.length > 0, 'tag groups must exist');
  const totalVpcs = v.invTree.reduce((n, g) => n + g.regions.reduce((m, rg) => m + rg.vpcs.length, 0), 0);
  assert.ok(totalVpcs > 0, 'tag groups must carry live vpcs, not gated-empty ones, while every cloud/region is closed');
});

test('new only: invTree keeps only clouds with something new, closed or not, and the new count does not undercount', () => {
  const vOff = vals(mkC({ inv: {}, newOnly: false }));
  const vOn = vals(mkC({ inv: {}, newOnly: true }));
  // trust: every cloud has something new in the default window, so the moved
  // filter (Step 1) must keep all 3 - a regression here would mean the filter
  // is still reading the gated (always-[]-while-closed) `regions` array
  // instead of the raw inv, which would silently empty invTree to [].
  assert.equal(vOn.invTree.length, 3);
  for (const cl of vOn.invTree) assert.equal(cl.regions.length, 0, 'still gated shut while closed');
  // newN is read off the raw inv (naas-app.js:872-877), never off the gated
  // tree, so the pill's count must not move when everything is collapsed.
  assert.equal(vOn.newStrip.hasNew, vOff.newStrip.hasNew);
  const numOf = (pill) => pill.split(' ')[0];
  assert.equal(numOf(vOn.newStrip.pill), numOf(vOff.newStrip.pill));
});

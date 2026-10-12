import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, defaults, discovery, fmtBytes } from '../naas-portal-app.js';

// Cloud discovery (spec section 4): CSP -> region -> VPC -> subnet, the site-side drill grammar; each region says
// whether it rides an AT&T connection (the join); state B adds bytes and subnet affinity; Connect with AT&T on a
// region without one opens Recommended for it.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const at = (fixture, stateB, extra = {}) => mkC({ fixture, stateB, page: 'discovery', ...extra });
const labels = (cols) => cols.filter(c => c.present).map(c => c.label);
const cell = (row, key) => row.cells.find(x => x.key === key).text;
const row = (v, csp, region) => v.dv.rows.find(r => r.csp === csp && r.regionKey === region);

test('the regions, by cloud, each saying how it reaches AT&T from the join', () => {
  const v = vals(at('scale', false));
  assert.deepEqual([v.dv.counts.regions, v.dv.counts.onAtt], ['8', '7']);
  assert.deepEqual(labels(v.dv.cols), ['Cloud', 'Region', 'VPCs', 'Subnets', 'AT&T']);
  assert.equal(cell(row(v, 'Azure', 'eastus'), 'att'), 'On AT&T · Equinix DC2');
  assert.equal(cell(row(v, 'Azure', 'westeurope'), 'att'), 'AT&T · Azure at Ashburn', 'the CSP-level join, short enough for one line');
  assert.equal(cell(row(v, 'AWS', 'us-west-2'), 'att'), 'On AT&T · Equinix SE2');
  assert.equal(row(v, 'Azure', 'eastus').region, 'East US', 'the API name reads as the display name');
  assert.ok(v.dv.rows.every(r => !r.canConnect), 'every scale region reaches AT&T somehow');
});

test('Calloway: two Azure regions, neither on AT&T; Connect with AT&T opens the journey at Found for that region', () => {
  const c = at('calloway', false); const v = vals(c);
  assert.deepEqual([v.dv.counts.regions, v.dv.counts.onAtt], ['2', '0']);
  const e = row(v, 'Azure', 'eastus'); assert.equal(cell(e, 'att'), 'Not on AT&T'); assert.equal(e.canConnect, true);
  assert.deepEqual(labels(v.dv.cols), ['Cloud', 'Region', 'VPCs', 'Subnets', 'AT&T', '']);
  e.connect(); assert.equal(c.state.journey, true); assert.equal(c.state.jRegion, 'Azure/eastus'); assert.deepEqual(c.state.region, { csp: 'Azure', region: 'eastus' });
});

test('a region opens its VPCs, a VPC its subnets, with a trail back; state B adds bytes and affinity', () => {
  const c = at('scale', true); let v = vals(c);
  assert.deepEqual(labels(v.dv.cols), ['Cloud', 'Region', 'VPCs', 'Subnets', 'AT&T', 'Bytes in', 'Bytes out']);
  row(v, 'Azure', 'eastus').go(); v = vals(c);
  assert.equal(v.dv.level, 'vpcs'); assert.deepEqual(v.dv.trail.map(t => t.label), ['Cloud discovery', 'Azure · East US']);
  assert.deepEqual(labels(v.dv.cols), ['VPC', 'Name', 'Subnets', 'Bytes in', 'Bytes out']); assert.equal(v.dv.rows.length, 3);
  v.dv.rows[0].go(); v = vals(c);
  assert.equal(v.dv.level, 'subnets'); assert.equal(v.dv.trail.length, 3); assert.equal(v.dv.rows.length, 6);
  assert.deepEqual(labels(v.dv.cols), ['Subnet', 'CIDR', 'Reaches', 'Bytes in', 'Bytes out']);
  assert.ok(v.dv.rows.every(r => ['AT&T', 'Azure', 'Other telco'].includes(cell(r, 'affinity'))));
  assert.match(cell(v.dv.rows[0], 'bytesIn'), /^[\d.,]+ (GB|TB|MB|B)$/);
  v.dv.trail[1].go(); assert.equal(vals(c).dv.level, 'vpcs'); vals(c).dv.trail[0].go(); assert.equal(vals(c).dv.level, 'regions');
  const a = vals(at('scale', false, { dtrail: ['Azure/eastus', 'vnet-core-east'] }));
  assert.deepEqual(labels(a.dv.cols), ['Subnet', 'CIDR'], 'state A subnets carry no affinity or bytes');
});

test('bytes read in the unit that fits', () => {
  assert.equal(fmtBytes(0), '0 B'); assert.equal(fmtBytes(5e8), '500 MB'); assert.equal(fmtBytes(3.21e12), '3.2 TB'); assert.equal(fmtBytes(7.5e9), '7.5 GB');
});

test('the markup binds the drill, the AT&T column and the Connect action', () => {
  const a = HTML.indexOf('aria-label="Cloud discovery"'), blk = HTML.slice(a, HTML.indexOf('</section>', a));
  assert.match(blk, /<sc-for list="\{\{ dv\.trail \}\}" as="t"/); assert.match(blk, /<sc-for list="\{\{ dv\.rows \}\}" as="row"/);
  assert.ok(blk.includes('{{ row.canConnect }}') && blk.includes('{{ row.connect }}') && blk.includes('Connect with AT&amp;T'));
  assert.equal(blk.includes('<table'), false);
});

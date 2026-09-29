import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "when i click on sankey to drill, why can't i see the right side?" (Micah,
// 2026-09-29). The drill used to stop at the middle. Now the drilled branch is
// drawn through to its destinations, the rest steps back, and every node it
// reaches says how much of it is the drilled traffic.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (patch = {}) => mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });

test('clicking a site on the map traces it to the right', () => {
  const c = at();
  const west = vals(c).mapNodes.find(n => /^US West/.test(n.label));
  west.click();
  const v = vals(c);
  assert.ok(v.mapTrace.length > 0, 'a trace is drawn');
  const right = v.mapNodes.filter(n => n.side === 'r');
  const reached = right.filter(n => n.op === 1);
  assert.ok(reached.length > 0 && reached.every(n => / of /.test(n.vF)), reached.map(n => n.label + ' ' + n.vF).join(', '));
  assert.ok(v.mapRibbons.every(r => r.op <= 0.12), 'the rest steps back');
  assert.ok(v.mapTrace.every(t => t.op > 0.6));
});

test('clicking a cloud traces it back to the sites', () => {
  const c = at();
  vals(c).mapNodes.find(n => n.label === 'AWS').click();
  const v = vals(c);
  assert.ok(v.mapTrace.length > 0);
  assert.ok(v.mapNodes.filter(n => n.side === 'l' && n.op === 1).some(n => / of /.test(n.vF)));
});

test('nothing drilled, nothing traced', () => {
  const v = vals(at());
  assert.deepEqual(v.mapTrace, []);
  assert.ok(!v.mapNodes.some(n => / of /.test(n.vF)));
});

test('the trace draws over the ribbons', () => {
  const a = HTML.indexOf('list="{{ mapRibbons }}"'), b = HTML.indexOf('list="{{ mapTrace }}"'), n = HTML.indexOf('list="{{ mapNodes }}"');
  assert.ok(a > 0 && b > a && n > b);
});

// "cloud service providers SHOULD NOT be showing up on the drill down on the
// left" (Micah, 2026-09-29). A cloud drill's trail (AWS › us-east-1) sat over
// the SITES column. The trail sits over the column that was drilled.
test('a cloud drill keeps its trail over the destinations, a site drill over the sites', () => {
  const c = at();
  vals(c).mapNodes.find(n => n.label === 'AWS').click();
  let v = vals(c);
  assert.ok(v.mapTrail.some(t => /AWS/.test(t.name)));
  assert.equal(v.mapTrailSide, 'r');
  assert.match(v.mapTrailPos, /right:/);
  assert.doesNotMatch(v.mapTrailPos, /left:\d/);
  const c2 = at();
  vals(c2).mapNodes.find(n => /^US West/.test(n.label)).click();
  v = vals(c2);
  assert.equal(v.mapTrailSide, 'l');
  assert.match(v.mapTrailPos, /left:/);
  assert.ok(HTML.includes('{{ mapTrailPos }}'));
});

test('a node with no path line draws no empty backing', () => {
  const v = vals(at());
  for (const n of v.mapNodes) if (!n.pathSay) { assert.equal(n.pathBg, 'transparent', n.label); assert.equal(n.pathPad, '0'); }
  assert.ok(v.mapNodes.some(n => n.pathSay && n.pathBg === 'var(--bg-base)'));
});

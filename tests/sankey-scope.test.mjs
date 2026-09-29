import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import * as S from '../naas-sites.js';

// "by first mile, for example, on sankey, it doesn't work" (Micah, 2026-09-29).
// A By chip regroups the map the moment it is pressed; its picker narrows to
// one and then gets out of the way.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const at = (patch = {}) => mkC({ view: 'mature', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', obTab: 'flow', ...patch });
const chip = (c, label) => vals(c).scopeDims.find(d => d.label.startsWith(label));
const side = (v, sd) => v.mapNodes.filter(n => n.side === sd);
const LABELS = Object.values(S.ACCESS_CLASS).map(a => a.label);

test('By first mile regroups the sites by first mile, at once', () => {
  const c = at();
  chip(c, 'By first mile').go();
  const v = vals(c);
  assert.ok(chip(c, 'By first mile').on);
  assert.ok(!chip(c, 'Whole estate').on);
  assert.ok(side(v, 'l').every(n => LABELS.some(l => n.label.startsWith(l + ' · '))), side(v, 'l').map(n => n.label).join(', '));
  assert.ok(v.hasScopeMembers, 'the picker opens');
});

test('picking one first mile narrows the map and closes the picker', () => {
  const c = at();
  chip(c, 'By first mile').go();
  vals(c).scopeMembers.find(m => m.label === 'AVPN (MPLS VPN)').go();
  const v = vals(c);
  assert.equal(v.hasScopeMembers, false);
  assert.deepEqual(side(v, 'l').map(n => n.label.split(' · ')[0]), ['AVPN (MPLS VPN)']);
  assert.match(chip(c, 'By first mile').label, /AVPN/);
  chip(c, 'By first mile').go();
  assert.equal(vals(c).hasScopeMembers, true, 'pressing the chip again reopens its picker');
});

test('By site groups by site type', () => {
  const c = at();
  chip(c, 'By site').go();
  assert.ok(side(vals(c), 'l').every(n => /^(Data centers|Campuses|Remote sites|Field \(wireless\)) · /.test(n.label)), side(vals(c), 'l').map(n => n.label).join(', '));
});

test('By app groups the destinations by app; one app narrows the whole map', () => {
  const c = at();
  const whole = vals(c).mapTotal;
  chip(c, 'By app').go();
  let v = vals(c);
  assert.ok(side(v, 'r').filter(n => !/data centers/.test(n.label)).every(n => ['PCI', 'Prod', 'Finance', 'AI', 'GPU', 'Internet-facing', 'Untagged'].includes(n.label)), side(v, 'r').map(n => n.label).join(', '));
  v.scopeMembers.find(m => m.label === 'PCI').go();
  v = vals(c);
  assert.deepEqual(side(v, 'r').map(n => n.label), ['PCI']);
  assert.ok(v.mapTotal < whole, `${v.mapTotal} vs ${whole}`);
});

test('By cloud narrows to one cloud; Whole estate puts the regions back', () => {
  const c = at();
  chip(c, 'By cloud').go();
  vals(c).scopeMembers.find(m => m.label === 'AWS').go();
  assert.deepEqual(side(vals(c), 'r').map(n => n.label), ['AWS']);
  chip(c, 'Whole estate').go();
  const v = vals(c);
  assert.ok(side(v, 'l').every(n => /^(US East|US Central|US West|International|Nationwide) · /.test(n.label)));
  assert.equal(v.hasScopeMembers, false);
});

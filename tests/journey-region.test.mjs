import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
// Micah, 2026-10-13 05:52: "the old existing customer flow back, but with 'Not on AT&T network' on the red dotted line and
// the ability to select which region you're doing things to."
const AZURE = [{ provider: 'Azure', estId: 'lastmile', name: 'Microsoft Azure subscription', cadence: 'daily', at: 1 }];
const journey = (extra = {}) => mkC({ view: 'lastmile', estateParam: null, journey: 'existing', screen: 'sj', jStep: 0, ...extra });
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

test('the red dotted path reads Not on AT&T network', () => {
  const v = vals(journey({ jStep: 2, addedSources: AZURE }));
  assert.equal(v.jNetWord, 'Not on AT&T network');
});

test('Needs offers the regions as a picker; the first is picked by default and the headline names it', () => {
  const v = vals(journey({ jStep: 3, addedSources: AZURE }));
  assert.equal(v.jHasRegionPick, true);
  assert.deepEqual(v.jRegionPick.map(r => [r.label, r.on]), [['eastus', true], ['westeurope', false]]);
  assert.equal(v.jLine, 'What does eastus need?');
  assert.match(v.jNeeds.hint, /eastus/);
  assert.match(HTML, /jRegionPick/);
});

test('picking a region moves the questions to it; each region keeps its own answers', () => {
  const c = journey({ jStep: 3, addedSources: AZURE });
  let v = vals(c);
  v.jIntentQs.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').go();
  v = vals(c);
  assert.equal(v.jIntentQs.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').on, true, 'eastus answered');
  v.jRegionPick[1].go(); v = vals(c);
  assert.equal(v.jLine, 'What does westeurope need?');
  assert.equal(v.jRegionPick[1].on, true);
  assert.equal(v.jIntentQs.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').on, false, 'westeurope starts from its own defaults');
  v.jIntentQs.find(q => q.key === 'security').opts.find(o => o.key === 'private').go(); v = vals(c);
  v.jRegionPick[0].go(); v = vals(c);
  assert.equal(v.jIntentQs.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').on, true, 'eastus kept its answer');
  assert.deepEqual(Object.keys(c.state.jIntents).sort(), ['eastus', 'westeurope']);
});

test('the picker stays on the beats after Needs so the recommendation is for the picked region', () => {
  const v = vals(journey({ jStep: 4, addedSources: AZURE, jRegion: 'westeurope' }));
  assert.equal(v.jHasRegionPick, true);
  assert.equal(v.jRegionPick[1].on, true);
});

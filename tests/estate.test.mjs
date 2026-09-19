import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { estateFor, defaults, vals, shouldScan, runScan } from '../naas-app.js';
import { mkC } from './harness.mjs';

const st = (patch) => ({ ...defaults(), ...patch });

test('?estate= picks the estate whatever the view is', () => {
  assert.equal(estateFor(st({ view: 'mature', estateParam: 'trust' })).id, 'trust');
  assert.equal(estateFor(st({ view: 'live', estateParam: 'trust' })).id, 'trust');
  assert.equal(estateFor(st({ view: 'live', estateParam: null })).id, 'partial');
  assert.equal(estateFor(st({ view: 'small', estateParam: null })).id, 'small');
  assert.equal(estateFor(st({ view: 'nope', estateParam: null })).id, 'mature');
  assert.equal(estateFor(st({ view: 'mature', estateParam: 'nonsense' })).id, 'mature');
});

test('setView clears the estate override and every drill trail', () => {
  const c = mkC({ cloudDrill: ['us-east-1'], fabDrill: ['fab', 'N. Virginia'], drill: ['Branch#1'] });
  vals(c).setView({ target: { value: 'small' } });
  assert.equal(c.state.view, 'small');
  assert.equal(c.state.estateParam, null);
  assert.deepEqual(c.state.drill, []);
  assert.deepEqual(c.state.cloudDrill, []);
  assert.deepEqual(c.state.fabDrill, []);
});

test('a scan only runs where there is something to find', () => {
  assert.equal(shouldScan(D.ESTATES.empty), false);
  assert.equal(shouldScan(D.ESTATES.small), true);
  assert.equal(shouldScan(D.ESTATES.partial), true);
  assert.equal(shouldScan(D.ESTATES.trust), true);
  assert.equal(shouldScan(null), false);
  assert.equal(shouldScan(undefined), false);
});

test('the rail ticks Connect only when something is attached', () => {
  const tick = (view) => vals(mkC(st({ view }))).rail.find(r => r.label === 'Connect').done;
  assert.equal(tick('empty'), false);
  assert.equal(tick('small'), false);
  assert.equal(tick('partial'), true);
  assert.equal(tick('trust'), true);
});

test('an estate with nothing to find lands on the finished state, it does not sit in the skeleton', () => {
  // Discover's whole body is behind <sc-if scanDone> at html:582 and the
  // skeleton is behind <sc-if scanning> at :573, so skipping the scan without
  // reaching step 4 would spin forever.
  const seen = [];
  const c = { state: { scanStep: 0 }, setState: (p) => seen.push(p) };
  runScan(c, D.ESTATES.empty);
  assert.deepEqual(seen, [{ scanStep: 4, scanBusy: false }]);
  runScan(c, null);
  assert.deepEqual(seen, [{ scanStep: 4, scanBusy: false }, { scanStep: 4, scanBusy: false }]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, defaults } from '../naas-app.js';

// Wave 2, Task 12: the breadcrumb above the card splits into two trails -
// crumbs (the site path) and cloudCrumbs (the cloud path). The markup test
// cannot catch the indexing bug (the old `Math.max(1, i)` slice that kept
// clicking "AWS" from clearing the cloud drill), so these assert on vals()
// directly. Same mkC() harness as tests/level-drawer.test.mjs.

function mkC(extra = {}) {
  const state = { ...defaults(), view: 'trust', screen: 's3', layer: 'cloud', tab: 'connect', ...extra };
  return { state, setState: (p) => Object.assign(state, p) };
}

test('cloudCrumbs is indexed off the drill, not off Math.max(1, i), so AWS clears it', () => {
  const c = mkC({ cloudDrill: ['us-east-1'] });
  const v = vals(c);
  assert.equal(v.cloudCrumbs.length, 2, 'AWS and us-east-1');
  assert.equal(v.cloudCrumbs[0].label, 'AWS');
  assert.equal(v.cloudCrumbs[1].label, 'us-east-1');
  assert.equal(v.cloudCrumbs[0].notLast, true);
  assert.equal(v.cloudCrumbs[1].notLast, false);

  v.cloudCrumbs[0].go();
  assert.deepEqual(c.state.cloudDrill, [], 'clicking AWS must clear the cloud drill entirely - this is the bug');
});

test('the deeper cloud crumb returns to its own depth', () => {
  const c = mkC({ cloudDrill: ['us-east-1'] });
  const v = vals(c);
  v.cloudCrumbs[1].go();
  assert.deepEqual(c.state.cloudDrill, ['us-east-1']);
});

test('the site trail carries no cloud crumbs, and only the last is notLast: false', () => {
  const c = mkC({ drill: ['Branch#1', 'Branch:1:Atlanta'], cloudDrill: [] });
  const v = vals(c);
  assert.deepEqual(v.crumbs.map(x => x.label), ['Home', 'Remote sites, East', 'Atlanta']);
  assert.deepEqual(v.crumbs.map(x => x.notLast), [true, true, false]);
  assert.equal(v.hasCloudCrumbs, false);
  assert.equal(v.cloudCrumbs.length, 0);
  for (const cr of v.crumbs) assert.ok(!/AWS|us-east|GCP|Azure/.test(cr.label), 'a cloud name leaked into the site trail');
});

test('both drilled: the two trails populate independently and stay split', () => {
  const c = mkC({ drill: ['Branch#1', 'Branch:1:Atlanta'], cloudDrill: ['us-east-1'] });
  const v = vals(c);
  assert.deepEqual(v.crumbs.map(x => x.label), ['Home', 'Remote sites, East', 'Atlanta']);
  assert.deepEqual(v.crumbs.map(x => x.notLast), [true, true, false]);
  assert.deepEqual(v.cloudCrumbs.map(x => x.label), ['AWS', 'us-east-1']);
  assert.deepEqual(v.cloudCrumbs.map(x => x.notLast), [true, false]);
  assert.equal(v.hasCloudCrumbs, true);
  for (const cr of v.crumbs) assert.ok(!/AWS|us-east/.test(cr.label), 'the split is real, not a filter - crumbs must never carry a cloud entry');
});

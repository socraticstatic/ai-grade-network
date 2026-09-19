import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { estateFor, defaults, vals } from '../naas-app.js';
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

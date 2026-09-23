import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, STOPS } from '../naas-app.js';
import { mkC } from './harness.mjs';

if (typeof globalThis.window === 'undefined') {
  globalThis.window = { scrollTo: () => {}, scrollY: 0 };
}

test('the lifecycle is five stops, in the order the work happens', () => {
  assert.deepEqual(STOPS.map(s => s.label), ['Discover', 'Connect', 'Observe', 'Govern', 'Cost']);
});

test('Discover is the inventory, not the connect work', () => {
  const c = mkC({ screen: 's3', tab: 'connect' });
  const discover = vals(c).railGroups.find(g => g.title === 'Discover');
  assert.ok(discover, 'there is no Discover stop');
  discover.titleGo();
  assert.equal(c.state.screen, 's1', 'Discover did not go to the inventory');
});

test('Connect has its own name back', () => {
  const c = mkC({ screen: 's1' });
  const connect = vals(c).railGroups.find(g => g.title === 'Connect');
  assert.ok(connect, 'there is no Connect stop');
  connect.titleGo();
  assert.equal(c.state.screen, 's3');
  assert.equal(c.state.tab, 'connect');
});

test('no stop is labelled with another stop\'s job', () => {
  const titles = vals(mkC()).railGroups.filter(g => g.hasTitle).map(g => g.title);
  assert.equal(new Set(titles).size, titles.length, 'two stops share a label');
  assert.equal(titles.includes('Explore 360'), false, 'the inventory is still hiding under another name');
});

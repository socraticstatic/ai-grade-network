import test from 'node:test';
import assert from 'node:assert/strict';
import { vals, SECTIONS, STOPS } from '../naas-app.js';
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

test('every stop offers exactly two sub-tasks', () => {
  for (const stop of STOPS) {
    const links = SECTIONS[stop.key] || [];
    assert.equal(links.length, 2, `${stop.label} offers ${links.length}: ${links.map(l => l[1]).join(', ')}`);
  }
});

test('the rail renders five stops and ten links, and nothing else', () => {
  const groups = vals(mkC()).railGroups.filter(g => g.hasTitle);
  assert.equal(groups.length, 5);
  assert.equal(groups.reduce((a, g) => a + g.items.length, 0), 10);
});

test('Discover offers the two views the inventory actually has', () => {
  const c = mkC({ screen: 's1' });
  const [tree, map] = vals(c).railGroups.find(g => g.title === 'Discover').items;
  assert.equal(tree.label, 'Tree');
  assert.equal(map.label, 'Map');
  map.go();
  assert.equal(vals(c).isMap, true, 'the Map link does not switch the view');
  tree.go();
  assert.equal(vals(c).isTree, true, 'the Tree link does not switch back');
});

test('a sub-task link lands on the stop that owns it', () => {
  const c = mkC({ screen: 's1' });
  const logs = vals(c).railGroups.find(g => g.title === 'Observe').items.find(r => r.label === 'Logs');
  logs.go();
  assert.equal(c.state.tab, 'observe', 'Logs did not take you to Observe');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Instead of records on the drawer, we need 'policies'. Additionally, we need
// a 'tags' tab" (Micah, 2026-09-28). The Observe drawer reads Insights |
// Policies | Tags. Records keeps its rail link and its "All records" doors; it
// opens in the drawer but no longer holds a tab.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (panel, patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'observe', estateParam: null, sub: { page: 'observe', panel }, ...patch });
const gate = (name) => { const a = HTML.indexOf(`<sc-if value="{{ ${name} }}"`); assert.ok(a > 0, `${name} gate missing`); return HTML.slice(a, a + 12000); };

test('the Observe drawer tabs read Policies, Tags; Insights is a page of its own', () => {
  assert.deepEqual(vals(at('policies')).subTabs.map(t => t.label), ['Policies', 'Tags']);
});

test('Policies lists the estate\'s own policies, with what each matched and broke', () => {
  const v = vals(at('policies'));
  assert.equal(v.subIsPolicies, true);
  assert.ok(v.drawerPolicies.length > 0);
  const p = v.drawerPolicies[0];
  for (const k of ['name', 'rule', 'stateWord', 'matched', 'viol', 'dot', 'go']) assert.ok(p[k] !== undefined, k);
  assert.match(v.drawerPolicySub, /\d+ polic/);
  const trust = vals(at('policies', { view: 'trust' }));
  assert.ok(trust.drawerPolicies.some(x => x.viol !== '0'), 'the trust estate shows its violations');
});

test('Tags lists every tag with its footprint, exposure and cover', () => {
  const v = vals(at('tags'));
  assert.equal(v.subIsTags, true);
  assert.ok(v.drawerTags.length > 0);
  const t = v.drawerTags.find(x => x.name === 'pci');
  assert.ok(t, v.drawerTags.map(x => x.name).join(', '));
  assert.match(t.sub, /VPC/);
  assert.equal(t.covered, true, 'tag PCI has a policy');
  assert.match(t.coverLabel, /PCI private path/);
  assert.match(t.exposure, /on the fabric|public internet/);
  assert.ok(v.drawerTags.every((x, i, a) => i === 0 || a[i - 1].wl >= x.wl), 'largest footprint first');
});

test('a tag with no policy offers to author one, and leaving closes the drawer', () => {
  const c = at('tags');
  const bare = vals(c).drawerTags.find(x => !x.covered);
  assert.ok(bare, 'every tag already has a policy');
  bare.go();
  assert.equal(c.state.sub, null);
  assert.equal(c.state.tab, 'govern');
  assert.equal(c.state.authoring.match, 'tag ' + bare.name);
});

test('a policy row opens it in Govern and closes the drawer', () => {
  const c = at('policies');
  vals(c).drawerPolicies[0].go();
  assert.equal(c.state.sub, null);
  assert.equal(c.state.tab, 'govern');
});

test('each new panel renders its rows, behind its own gate', () => {
  assert.match(gate('subIsPolicies'), /<sc-for list="\{\{ drawerPolicies \}\}"/);
  assert.match(gate('subIsTags'), /<sc-for list="\{\{ drawerTags \}\}"/);
});

test('an estate with nothing yet says so instead of an empty list', () => {
  const v = vals(at('tags', { view: 'empty' }));
  assert.equal(v.hasDrawerTags, false);
  assert.match(gate('subIsTags'), /hasDrawerTagsNot/);
});

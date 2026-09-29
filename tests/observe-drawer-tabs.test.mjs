import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Instead of records on the drawer, we need 'policies'. Additionally, we need
// a 'tags' tab" (Micah, 2026-09-28). Then "what else is boxed? ... go"
// (2026-09-29): no page view lives in a drawer. Tags is a Govern tab (tag to
// policy cover is governance); Observe's Policies repeated Govern's own policy
// table, so it left.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (panel, patch = {}) => mkC({ view: 'mature', screen: 's3', tab: 'govern', govPanel: 'tags', estateParam: null, ...patch });
const gate = (name) => { const a = HTML.indexOf(`<sc-if value="{{ ${name} }}"`); assert.ok(a > 0, `${name} gate missing`); return HTML.slice(a, a + 12000); };

test('Observe has no drawer tabs; Tags is a Govern tab and Policies is Govern\'s own table', () => {
  assert.deepEqual(vals(mkC({ view: 'mature', screen: 's3', tab: 'observe', estateParam: null, sub: { page: 'observe', panel: 'tags' } })).subTabs, []);
  const g = vals(at('tags'));
  assert.deepEqual(g.govPanels.map(p => p.label), ['Violations & policies', 'Templates', 'Tags']);
  assert.equal(g.govPanelTags, true);
  assert.equal(HTML.indexOf('subIsPolicies'), -1);
});

test('Tags lists every tag with its footprint, exposure and cover', () => {
  const v = vals(at('tags'));
  assert.equal(v.govPanelTags, true);
  assert.ok(v.drawerTags.length > 0);
  const t = v.drawerTags.find(x => x.name === 'pci');
  assert.ok(t, v.drawerTags.map(x => x.name).join(', '));
  assert.match(t.sub, /VPC/);
  assert.equal(t.covered, true, 'tag PCI has a policy');
  assert.match(t.coverLabel, /PCI private path/);
  assert.match(t.exposure, /on AT&T|public internet/);
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

test('the Tags tab renders its rows, behind its own gate', () => {
  assert.match(gate('govPanelTags'), /<sc-for list="\{\{ drawerTags \}\}"/);
});

test('an estate with nothing yet says so instead of an empty list', () => {
  const v = vals(at('tags', { view: 'empty' }));
  assert.equal(v.hasDrawerTags, false);
  assert.match(gate('govPanelTags'), /hasDrawerTagsNot/);
});

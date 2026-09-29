import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import { accessRows, heroLayout } from '../naas-logic.js';
import { countOf, labelOfKey } from '../naas-sites.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "Grouping for access side of the network on main Fabric page" (notes,
// 2026-09-29): group the picture's sites by how they attach, then by region.
// Groups follow the service catalog; Third Party Access sits outside AT&T.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const total = (est) => (est.sites || []).reduce((a, x) => a + countOf(x.name), 0);
const at = (patch = {}) => mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null, ...patch });

test('every site lands in exactly one access group; the groups add up to the estate', () => {
  for (const id of ['partial', 'mature', 'trust', 'small']) {
    const est = D.ESTATES[id];
    const rows = accessRows(est);
    assert.equal(rows.reduce((a, r) => a + r.count, 0), total(est), id);
    for (const r of rows) assert.match(r.access, /^[\d,]+ sites? · [\d,]+ metros?$/, `${id} ${r.name}: ${r.access}`);
  }
});

test('AT&T services come first, in catalog order; Third Party Access sits outside AT&T', () => {
  const rows = accessRows(D.ESTATES.partial);
  const names = rows.map(r => r.name);
  const firstOutside = rows.findIndex(r => !r.onAtt);
  assert.ok(firstOutside > 0 && rows.slice(firstOutside).every(r => !r.onAtt), names.join(', '));
  const tpa = rows.find(r => r.key === 'tpa');
  assert.ok(tpa && !tpa.onAtt && tpa.count === 5, 'the five IPsec sites');
});

test('the picture never resizes when the grouping changes', () => {
  for (const id of ['partial', 'mature', 'trust']) {
    const est = D.ESTATES[id];
    assert.equal(heroLayout(est, { groupBy: 'access' }).H, heroLayout(est, {}).H, id);
  }
});

test('Group: Access type draws access cards; opening one shows its regions, then its sites', () => {
  const c = at();
  vals(c).setSiteGroup({ target: { value: 'access' } });
  let v = vals(c);
  assert.equal(c.state.siteGroup, 'access');
  assert.ok(v.heroSites.some(x => x.name === 'Third Party Access'), v.heroSites.map(x => x.name).join(', '));
  v.heroSites.find(x => x.name === 'Third Party Access').click();
  v = vals(c);
  assert.deepEqual(c.state.drill, ['access:tpa']);
  assert.ok(v.heroSites.filter(x => !x.more).every(x => /^(US East|US Central|US West|Europe|Asia Pacific)$/.test(x.name)), v.heroSites.map(x => x.name).join(', '));
  assert.equal(labelOfKey(D.ESTATES.partial, 'access:tpa'), 'Third Party Access');
});

test('changing the grouping closes any open drill; Region stays the default', () => {
  const c = at({ drill: ['region:US East'] });
  assert.equal(vals(c).siteGroupValue, 'region');
  vals(c).setSiteGroup({ target: { value: 'access' } });
  assert.deepEqual(c.state.drill, []);
});

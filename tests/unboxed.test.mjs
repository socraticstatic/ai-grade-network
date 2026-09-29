import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals, SUB_PANELS } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "What else is boxed?" ... "go" (Micah, 2026-09-29). A list or a table is the
// page: no box that scrolls inside it, no card around it. Long lists page to
// fit the fold. A view is a tab on its page, never a drawer. Charts may sit in
// a card; lists and tables do not.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (patch = {}) => mkC({ view: 'partial', estateParam: null, ...patch });
const open = (tag) => { const i = HTML.indexOf(tag); return HTML.slice(i, HTML.indexOf('>', i) + 1); };

test('no box scrolls inside a page', () => {
  for (const cls of ['find-frame', 'cand-frame', 'gov-frame', 'est-frame', 'log-frame']) assert.equal(HTML.indexOf(`class="${cls}"`), -1, cls);
  assert.ok(!/#sec-your-sites\{[^}]*overflow/.test(HTML), 'Your sites scrolls in a box');
});

test('lists and tables sit on the page, not in a card', () => {
  assert.ok(!open('<div id="sec-insights"').includes('fx-card'), 'Findings');
  assert.ok(!open('<div id="sec-accounts"').includes('fx-card'), 'Connected accounts');
  assert.ok(!open('<div class="fx-card" aria-label="{{ cg.label }}"').includes('cg.label'), 'Options columns');
  assert.equal(HTML.indexOf('aria-label="Sites by business unit" style'), HTML.indexOf('<div aria-label="Sites by business unit"') + 5, 'Business units list');
});

const pages = (v, rows, pager, size) => {
  assert.ok(v[rows].length <= v[size], `${rows}: ${v[rows].length} > ${v[size]}`);
  assert.match(v[pager].label, /^(\d+–\d+|0) of \d+$/);
};

test('long lists page to fit the fold', () => {
  pages(vals(at({ screen: 's3', tab: 'observe', obPage: 'insights', insPanel: 'findings' })), 'insightRows', 'findPager', 'findPageSize');
  pages(vals(at({ screen: 's1', estPanel: 'bu' })), 'buSites', 'buPager', 'buPageSize');
  pages(vals(at({ screen: 's3', tab: 'govern' })), 'polRows', 'polPager', 'polPageSize');
  pages(vals(at({ screen: 's3', tab: 'cost', costPanel: 'banked' })), 'saveRows', 'savePager', 'savePageSize');
  pages(vals(at({ screen: 's1', discoverView: 'sources' })), 'sources', 'srcPager', 'srcPageSize');
  const o = vals(at({ screen: 's3', tab: 'connect', cnPage: 'options' }));
  for (const g of o.candGroups) { assert.ok(g.rows.length <= o.candPageSize, g.label); assert.match(g.pager.label, /of/); }
});

test('paging moves, and a new filter starts at the first page', () => {
  const c = at({ screen: 's3', tab: 'observe', obPage: 'insights', insPanel: 'findings', findFilter: 'all' });
  const first = vals(c).insightRows[0].key;
  vals(c).findPager.next();
  assert.notEqual(vals(c).insightRows[0].key, first);
  vals(c).findChips[0].go();
  assert.match(vals(c).findPager.label, /^1–/);
});

test('Your sites drills in place: opening a class or a metro sets its siblings aside', () => {
  const c = at({ screen: 's1', estPanel: 'sites' });
  const v = vals(c);
  assert.ok(v.siteTree.length > 1);
  v.siteTree[0].toggle();
  const w = vals(c);
  assert.equal(w.siteTree.length, 1);
  if (w.siteTree[0].metros.length > 1) { w.siteTree[0].metros[0].toggle(); assert.equal(vals(c).siteTree[0].metros.length, 1); }
  vals(c).siteTree[0].toggle();
  assert.equal(vals(c).siteTree.length, v.siteTree.length, 'closing brings them back');
});

test('no page view lives in a drawer; the drawer only adds or edits a source', () => {
  for (const k of ['connect', 'observe', 'govern', 'cost']) assert.deepEqual(SUB_PANELS[k] || [], [], k);
  const g = vals(at({ screen: 's3', tab: 'govern' }));
  assert.ok(g.govPanels.some(p => p.label === 'Tags'));
  const cst = vals(at({ screen: 's3', tab: 'cost' }));
  assert.ok(cst.costPanels.some(p => p.label === 'AT&T charges'));
  const cn = vals(at({ screen: 's3', tab: 'connect' }));
  assert.ok(cn.cnPanels.some(p => p.label === 'Ways to connect'));
  for (const g2 of ['subIsFound', 'subIsPolicies', 'subIsTags', 'subIsCharges']) assert.equal(HTML.indexOf(g2), -1, g2);
});

test('the old doors land on the pages that replaced the drawer', () => {
  const c = at({ screen: 's3', tab: 'connect' });
  vals(c).openFindings();
  assert.equal(c.state.cnPage, 'options');
  assert.equal(c.state.sub, null);
});

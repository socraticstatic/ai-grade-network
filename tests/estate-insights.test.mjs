import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Discover → Estate (Micah, 2026-09-28): "insights is critical on top"; "what
// you have and what you don't have"; "remove act on it, and widgets of what was
// discovered"; "not just 'what do you have', but the 'so what'". Each widget
// leads with its consequence, shows its evidence as rows, and offers one move.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const at = (view = 'partial') => vals(mkC({ view, screen: 's1', estateParam: null }));

test('Estate opens on two rows of insight widgets: what you have, what you don\'t', () => {
  const v = at();
  assert.deepEqual(v.haveCards.map(c => c.title), ['Sites by service', 'Cloud connections', 'New in the last 30 days']);
  assert.deepEqual(v.lackCards.map(c => c.title), ['Private path for 5 sites', 'Private connection in 5 regions', 'A backup path at 13 sites']);
});

test('every widget says so what, shows its evidence, and offers one move', () => {
  const v = at();
  for (const c of [...v.haveCards, ...v.lackCards]) {
    assert.ok(c.soWhat && c.soWhat.length < 110, `${c.title}: so what is missing or long (${c.soWhat})`);
    assert.ok(c.rows.length > 0, `${c.title}: no rows`);
    assert.ok(c.cta && typeof c.go === 'function', `${c.title}: no move`);
    for (const r of c.rows) assert.ok(r.label && r.value !== undefined && r.w, `${c.title}: a row without a label, value or bar`);
  }
});

test('the IPsec sites name their egress bill and their exposure', () => {
  const ipsec = at().lackCards[0];
  assert.match(ipsec.soWhat, /\$8,600\/mo/);
  assert.equal(ipsec.rows.length, 5);
  assert.ok(ipsec.rows.every(r => r.value === 'IPsec'), ipsec.rows.map(r => r.value).join(', '));
});

test('connections carry their bandwidth, and a public region says it has none', () => {
  const conn = at().haveCards[1];
  assert.ok(conn.rows.some(r => /10G/.test(r.value)), conn.rows.map(r => r.value).join(', '));
  assert.ok(conn.rows.some(r => r.value === 'Internet'));
});

test('an estate that declares no services drops the backup widget, not the row', () => {
  const v = at('mature');
  assert.ok(!v.lackCards.some(c => /backup/.test(c.title)));
  assert.ok(v.lackCards.length >= 1);
});

test('the Act on it strip is gone from Estate; the window and Review new live in the insights head', () => {
  const a = HTML.indexOf('aria-label="Discovered in the window"');
  assert.equal(a, -1, 'the Estate still carries its Act on it strip');
  const ins = HTML.slice(HTML.indexOf('aria-label="Estate insights"'), HTML.indexOf('aria-label="Estate insights"') + 6000);
  assert.match(ins, /setRange/);
  assert.match(ins, /<sc-for list="\{\{ haveCards \}\}"/);
  assert.match(ins, /<sc-for list="\{\{ lackCards \}\}"/);
});


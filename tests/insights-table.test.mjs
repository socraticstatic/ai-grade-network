import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "make insights more visual less texty, with a beautiful table underneath
// (evidence, actions, etc)" (Micah, 2026-09-29). The findings open on three
// pictures (what is on the table, where each finding is in its life, how long
// they have waited) and a table: the finding, its evidence, its impact, who
// owns it, its state, and the next thing to do.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ins = (patch = {}) => mkC({ view: 'partial', estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'findings', nowIso: '2026-09-29T12:00:00Z', ...patch });
const money = (s) => +String(s).replace(/[^0-9]/g, '');

test('three pictures head the findings, and their numbers are the page\'s', () => {
  const v = vals(ins());
  assert.deepEqual(v.insBand.map(b => b.key), ['savings', 'life', 'age']);
  const [sv, life, age] = v.insBand;
  assert.match(v.pageVerdict, new RegExp(sv.total.replace('$', '\\$')), `${sv.total} vs ${v.pageVerdict}`);
  const w = sv.segs.reduce((a, s) => a + parseFloat(s.w), 0);
  assert.ok(Math.abs(w - 100) < 0.5, `savings segments fill the bar: ${w}`);
  assert.ok(sv.segs.every(s => /\$[\d,]+\/mo/.test(s.title)));
  assert.equal(life.segs.reduce((a, s) => a + s.n, 0), v.findAll.length, 'every finding sits in one state');
  assert.equal(age.cols.length, 4);
  assert.equal(age.cols.reduce((a, c) => a + c.n, 0), v.openFindingsN, 'the open ones, by how long they have waited');
});

test('each row carries its evidence, impact, owner, state and next step', () => {
  const v = vals(ins());
  for (const r of v.insightRows) {
    assert.ok(r.head && r.kind && r.owner && r.age && r.stateLabel, r.key);
    assert.match(r.evLine, /^\d+ flow records?|^No flow records/, r.key);
    assert.ok(r.actLabel && typeof r.actGo === 'function', r.key);
    if (r.hasSave) assert.ok(parseFloat(r.impW) > 0 && parseFloat(r.impW) <= 100, r.key);
  }
});

test('the next step moves the finding along', () => {
  const c = ins();
  const row = vals(c).insightRows.find(r => r.actLabel === 'Acknowledge');
  assert.ok(row, 'an open finding offers Acknowledge');
  row.actGo();
  assert.equal(vals(c).findAll.find(r => r.key === row.key).stateLabel, 'Acknowledged');
});

test('the markup: pictures, then a table with its columns; no card per finding', () => {
  const a = HTML.indexOf('<div id="sec-insights"'), b = HTML.indexOf('</sc-if>\n  <sc-if value="{{ noInsights }}"', a);
  const panel = HTML.slice(a, b > 0 ? b : a + 12000);
  assert.match(panel, /aria-label="Findings at a glance"/);
  assert.match(panel, /aria-label="Findings table"/);
  for (const h of ['Finding', 'Evidence', 'Impact', 'Owner', 'State', 'Next step']) assert.ok(panel.includes(`>${h}<`), h);
  assert.ok(!/border-left:3px solid \{\{ ins\.tone \}\}/.test(panel), 'the text cards are gone');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Recommended, one move open at a time (Micah, 2026-10-05: "way too crowded"). A collapsed row reads rank, the set,
// Today against the picked tier and what it saves; the open row draws Today and the three tiers side by side.
// The first row on the page opens by default; opening another closes it; paging resets to the first.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const on = (view, extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', ...extra });

test('the first move on the page is open; the rest are collapsed and carry the picked tier', () => {
  const v = vals(on('mature'));
  assert.ok(v.moves.length > 1);
  assert.deepEqual(v.moves.map(m => m.open), v.moves.map((_, i) => i === 0));
  for (const m of v.moves) {
    assert.equal(m.pick.tier, 'Recommended', `${m.title}: the picked tier is Recommended by default`);
    assert.equal(m.pick.strip.length, 4);
    assert.ok(m.mark.icon && m.pick.mark.icon, `${m.title}: the header line carries a mark per side`);
    assert.ok(m.pick.label && m.pick.cost.value, m.title);
    assert.ok(m.chevron, 'the row carries a chevron glyph');
    assert.equal(typeof m.toggleOpen, 'function');
  }
});

test('opening a move closes the open one; opening the open one leaves none open; a tier pick follows into the header', () => {
  const c = on('mature');
  vals(c).moves[2].toggleOpen();
  let v = vals(c);
  assert.deepEqual(v.moves.map(m => m.open), v.moves.map((_, i) => i === 2));
  v.moves[2].tiers[2].pick();
  v = vals(c);
  assert.equal(v.moves[2].pick.tier, 'Full control');
  assert.equal(v.moves[2].open, true, 'picking a tier keeps the row open');
  v.moves[2].toggleOpen();
  v = vals(c);
  assert.ok(v.moves.every(m => !m.open));
});

test('paging opens the first move of the new page', () => {
  const c = on('mature');
  vals(c).moves[3].toggleOpen();
  assert.ok(vals(c).movesPager.many, 'Established has more than one page of moves');
  vals(c).movesPager.next();
  const v = vals(c);
  assert.deepEqual(v.moves.map(m => m.open), v.moves.map((_, i) => i === 0));
});

test('the markup draws a header line per move and the four columns only under sc-if mv.open', () => {
  const a = HTML.indexOf('<sc-if value="{{ cnIsOptions }}"'), b = HTML.indexOf('<!-- /Recommended -->', a);
  const blk = HTML.slice(a, b);
  const open = blk.indexOf('<sc-if value="{{ mv.open }}"');
  assert.ok(open > 0, 'no open gate');
  assert.ok(blk.indexOf('<sc-for list="{{ mv.tiers }}"') > open, 'the tiers draw only in the open row');
  assert.ok(blk.indexOf('{{ mv.pick.label }}') < open, 'the header line carries the picked tier');
  assert.match(blk, /class="fw-prio sm"[^>]*>\{\{ mv\.rankF \}\}/);
  assert.match(blk, /aria-expanded="\{\{ mv\.open \}\}"/);
  assert.match(blk, /\{\{ mv\.pick\.mark\.icon \}\}/);
  assert.ok(blk.indexOf('{{ mv.strip }}') > open, 'the header line carries a mark, not a strip; the strips draw in the open row');
});

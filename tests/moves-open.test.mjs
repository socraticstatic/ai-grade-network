import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Recommended as one hero at a time (Micah, 2026-10-07: "I don't see the changes that were requested for Recommended";
// "make the page more beautiful, open, spacious. It can be the only option"). The page draws one move: its mark and
// name, Today, and the cloud's three ways as large cards, each with its own Connect. A stepper walks the rest in rank
// order. A move the account team pinned (the session's Azure example) leads, and says so.
// Replaces the one-open-row list (2026-10-05), whose header lines and chevrons left the markup.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const on = (view, extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', ...extra });

test('one move at a time; on Growing the pinned Azure move leads with its three ways', () => {
  const v = vals(on('partial'));
  assert.equal(v.movesPageSize, 1);
  assert.equal(v.moves.length, 1);
  const az = v.moves[0];
  assert.equal(az.key, 'region:Azure');
  assert.equal(az.hasPin, true);
  assert.equal(az.rank, 1);
  assert.deepEqual(az.tiers.map(t => t.way), ['byo', 'att', 'peer'], 'the whiteboard\'s three Azure options');
  assert.deepEqual(az.tiers.map(t => t.tier), ['Recommended', 'Option 2', 'Option 3']);
  assert.equal(v.movesPager.label, `1 of ${v.moveList.length}`);
  // Each card reads as glyph rows, not prose: security, performance, cost, who sets it up.
  for (const t of az.tiers) {
    assert.deepEqual(t.metrics.map(x => x.key), ['sec', 'perf', 'cost', 'setup'], t.label);
    for (const x of t.metrics) assert.ok(x.icon && x.v && x.title, `${t.label} ${x.key}`);
  }
  assert.deepEqual(az.todayMetrics.map(x => x.key), ['sec', 'perf', 'cost', 'setup']);
});

test('an estate with no pin leads with its biggest saving, and nothing claims a pin', () => {
  const v = vals(on('mature'));
  assert.equal(v.moves[0].key, v.moveList[0].key);
  assert.ok(v.moveList.every(m => !m.hasPin));
});

test('the stepper walks every move in rank order and stops at both ends', () => {
  const c = on('partial');
  const keys = vals(c).moveList.map(m => m.key);
  const seen = [vals(c).moves[0].key];
  for (let i = 1; i < keys.length; i++) {
    vals(c).movesPager.next();
    const v = vals(c);
    seen.push(v.moves[0].key);
    assert.equal(v.movesPager.label, `${i + 1} of ${keys.length}`);
  }
  assert.deepEqual(seen, keys);
  vals(c).movesPager.next();
  assert.equal(vals(c).moves[0].key, keys[keys.length - 1], 'next stops at the last');
  vals(c).movesPager.prev();
  assert.equal(vals(c).moves[0].key, keys[keys.length - 2]);
});

test('each card\'s Connect orders that way, whichever card is picked', () => {
  const c = on('partial');
  const az = vals(c).moves[0];
  assert.equal(az.tiers.filter(t => t.ctaPrimary).length, 1, 'the picked card\'s Connect is the primary one');
  az.tiers[2].connect();
  assert.equal(c.state.screen, 's4');
  assert.equal(c.state.compose.way, 'peer');
  assert.deepEqual(c.state.compose.moveKeys, ['region:Azure']);
  const c2 = on('partial');
  vals(c2).moves[0].tiers[1].connect();
  assert.equal(c2.state.compose.way, 'att');
});

test('a metric value is pared to its figure; the full value stays in its title', () => {
  const az = vals(on('partial')).moves[0];
  for (const x of [...az.todayMetrics, ...az.tiers.flatMap(t => t.metrics)]) {
    assert.doesNotMatch(x.v, / ms p95$|\/mo egress$/, x.title);
    assert.ok(x.title.length >= x.v.length, x.title);
  }
});

test('the markup draws the move as a hero: mark, Today, the cards and their Connect; no header line or open gate', () => {
  const a = HTML.indexOf('<sc-if value="{{ cnIsOptions }}"'), b = HTML.indexOf('<!-- /Recommended -->', a);
  const blk = HTML.slice(a, b);
  assert.match(blk, /<section class="rec-hero" aria-label="\{\{ mv\.title \}\}">/);
  assert.match(blk, /<h2 class="rec-name"[^>]*>\{\{ mv\.short \}\}<\/h2>/);
  assert.match(blk, /\{\{ mv\.markSrc \}\}/);
  assert.match(blk, /<div class="rec-card today"/);
  assert.match(blk, /<sc-for list="\{\{ mv\.tiers \}\}" as="tr"[^>]*>\s*<div class="rec-card" data-on="\{\{ tr\.on \}\}"/);
  assert.match(blk, /<button class="rec-cta" data-primary="\{\{ tr\.ctaPrimary \}\}" onClick="\{\{ tr\.connect \}\}"/);
  assert.match(blk, /<sc-for list="\{\{ tr\.metrics \}\}"/);
  assert.match(blk, /aria-label="Next recommendation"/);
  assert.doesNotMatch(blk, /\{\{ mv\.open \}\}|mv\.toggleOpen|mv\.openRows|mv\.chevron/);
});

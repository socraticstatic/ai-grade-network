import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { heightProblems, HOME_PAGE, TAIL } from '../scripts/fold-rule.mjs';

// The fold rule, pinned (2026-09-30). Every page fits 900 with no page scroll
// (dashboard-fits-the-fold, 2026-09-28). The one exception Micah approved: the
// NaaS home repeats the Connect network map "below all the good stuff", so the
// home alone may scroll, and only by that map. Everything above the map fits
// 900. The rule lives in one pure module that scripts/fold.mjs and
// scripts/demo-walk.mjs both read.

const H = 900;

test('a page with no map below fits 900, the home included', () => {
  assert.deepEqual(heightProblems({ page: 'discover/Estate', scrollHeight: 900, limit: H }), []);
  assert.deepEqual(heightProblems({ page: 'discover/Estate', scrollHeight: 901, limit: H }), ['scroll 901']);
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 901, limit: H }), ['scroll 901'], 'Empty\'s home has no map, so it fits 900');
});

test('the home may run past 900 only by the map: everything above it fits, nothing follows it', () => {
  const below = { top: 700, bottom: 1250 };
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1250 + TAIL, limit: H, below, aboveBottom: 660 }), []);
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1250 + TAIL, limit: H, below, aboveBottom: 905 }), ['above the map 905']);
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1250 + TAIL + 1, limit: H, below, aboveBottom: 660 }), [`past the map ${1250 + TAIL + 1}`]);
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1250 + TAIL, limit: H, below: { top: 640, bottom: 1250 }, aboveBottom: 660 }), ['the map overlaps what is above it']);
});

test('the allowance is the home\'s alone: a fold marker on any other page fails', () => {
  const below = { top: 700, bottom: 1250 };
  assert.deepEqual(heightProblems({ page: 'connect/Options', scrollHeight: 1250, limit: H, below, aboveBottom: 660 }), ['scroll 1250', 'a map below the fold off the home']);
  assert.deepEqual(heightProblems({ page: 'connect/Options', scrollHeight: 900, limit: H, below: { top: 100, bottom: 800 }, aboveBottom: 90 }), ['a map below the fold off the home']);
});

test('a lower limit still bites the home: FOLD_LIMIT proves the check', () => {
  const below = { top: 700, bottom: 1250 };
  assert.deepEqual(heightProblems({ page: HOME_PAGE, scrollHeight: 1250 + TAIL, limit: 650, below, aboveBottom: 660 }), ['above the map 660']);
});

test('fold.mjs and demo-walk.mjs both read the rule', () => {
  for (const f of ['../scripts/fold.mjs', '../scripts/demo-walk.mjs']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.match(src, /from '\.\/fold-rule\.mjs'/, `${f} does not import the fold rule`);
    assert.match(src, /heightProblems\(/, `${f} does not apply it`);
  }
});

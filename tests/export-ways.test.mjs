import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { waysExport } from '../scripts/export-ways.mjs';
import * as W from '../naas-ways.js';

// The ways model as JSON for the portal team (spec section 2, point 4): every way, its clouds, monthly per cloud, setup
// level, who, fit, the intent questions, the criteria, and the ranking rules in words. A starting point for their review.

test('the export carries every way with a monthly per cloud, the four questions, the five criteria and the rules in words', () => {
  const x = waysExport();
  assert.equal(x.placeholder, true); assert.equal(x.source, 'naas-ways.js');
  assert.equal(x.ways.length, W.WAYS.length);
  for (const w of x.ways) { assert.ok(w.key && w.title && Array.isArray(w.clouds)); for (const c of w.clouds) assert.ok(c in w.monthly, `${w.key} ${c}`); assert.ok(w.setup && w.who, w.key); }
  assert.deepEqual(x.intent.map(q => q.key), ['purpose', 'traffic', 'security', 'routing']);
  assert.equal(x.criteria.length, 5); assert.equal(x.criteria.reduce((a, c) => a + c.weight, 0), 100);
  assert.ok(x.rules.find(r => r.answer === 'inspected').removes.includes('No inspection in path'));
  assert.ok(x.rules.find(r => r.answer === 'bgp').prefers, 'a soft preference in words');
  assert.ok(x.ranking.length > 40, 'the ranking rule in words');
});

test('running the script writes docs/portal/ways.json and it parses to the same export', () => {
  execFileSync('node', ['scripts/export-ways.mjs'], { cwd: new URL('..', import.meta.url).pathname });
  const p = new URL('../docs/portal/ways.json', import.meta.url);
  assert.ok(existsSync(p));
  const j = JSON.parse(readFileSync(p, 'utf8'));
  assert.equal(j.ways.length, W.WAYS.length); assert.ok(j.generated);
});

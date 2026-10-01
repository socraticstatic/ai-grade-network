import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// From Dev's Insights screens (Micah's "insights" email, 2026-10-01): each role gets the one
// question its view answers, and each action says what it gets you, not "Coming soon".
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];

test('each role reads its own question, on the home and on Signals', () => {
  const qs = ROLES.map(p => vals(mkC({ view: 'partial', estateParam: null, screen: 's0', persona: p })).roleQuestion);
  assert.equal(new Set(qs).size, 5, qs.join(' | '));
  for (const q of qs) assert.match(q, /^For [\w& ]+: .+\?$/, q);
  assert.equal(qs[4], 'For Executive: Is the network helping or hurting the business?');
  assert.equal((HTML.match(/\{\{ roleQuestion \}\}/g) || []).length, 2, 'the home and Signals both print it');
});

test('every action says what it gets you', () => {
  for (const view of ['partial', 'mature', 'trust']) for (const p of ROLES) {
    const v = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'role', persona: p }));
    for (const r of v.roleActAll) {
      assert.ok(r.outcome, `${view} ${p}: "${r.head}" says nothing it gets you`);
      if (r.hasSave) assert.equal(r.outcome, r.saveLine);
    }
  }
  assert.ok(!/>Coming soon</.test(HTML.slice(HTML.indexOf('roleActRows'), HTML.indexOf('roleActRows') + 3000)), 'the action row still reads Coming soon');
});

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
  // Fewer words (2026-10-07): the question left the page and is each role chip's title, on the home and on Signals.
  assert.equal((HTML.match(/\{\{ roleQuestion \}\}/g) || []).length, 0, 'the question is a title now, not a line');
  assert.ok(HTML.includes('title="{{ rc.title }}"') && HTML.includes('title="{{ pc.title }}"'), 'the role chips carry the question');
  const chips = vals(mkC({ view: 'partial', estateParam: null, screen: 's0', persona: 'exec' })).roleChips;
  assert.equal(chips.find(r => r.key === 'exec').title, 'For Executive: Is the network helping or hurting the business?');
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

test('the FinOps home steps from today to optimized, and the steps add up', () => {
  const v = vals(mkC({ view: 'partial', estateParam: null, screen: 's0', persona: 'finops' }));
  assert.equal(v.homeFin, true);
  const n = (t) => Number(String(t).replace(/[^\d]/g, ''));
  const [today, ...rest] = v.finWf, after = rest.pop();
  assert.equal(n(today.valF) - rest.reduce((a, w) => a + n(w.valF), 0), n(after.valF));
  assert.ok(rest.every(w => w.owner && !/^[a-z]+$/.test(w.label)), rest.map(w => w.label).join(', '));
  assert.ok(v.finBuRows.length > 0 && v.finActs.length >= 3);
  assert.equal(vals(mkC({ view: 'partial', estateParam: null, screen: 's0', persona: 'neteng' })).homeFin, false);
});

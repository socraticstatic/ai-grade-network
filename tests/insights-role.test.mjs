import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Insights > Your actions (notes, 2026-09-30, C2): one page per role, visuals on
// the left, that role's actions on the right. Do it is visible, not enabled;
// Accept and Defer move the finding's life. A stand-in until the stakeholder's
// reference file arrives (D-10).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const NOW = '2026-10-05T15:00:00Z';
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', nowIso: NOW, ...patch });
const ROLES = ['architect', 'neteng', 'security', 'finops', 'exec'];

test('Insights lands on Your actions, in the stakeholder\'s tab order; the chips set the persona', () => {
  const c = ins('partial');
  const v = vals(c);
  assert.deepEqual(v.insPanels.map(p => p.label.replace(/ · \d+$/, ' · N')), ['Your actions', 'Operations', 'Findings · N', 'Signals', 'Monthly briefing']);
  assert.ok(v.insPanelRole);
  assert.deepEqual(v.roleChips.map(r => r.label), ['Architect', 'Network Eng', 'Security', 'FinOps & SRE', 'Executive']);
  v.roleChips.find(r => r.label === 'Security').go();
  assert.equal(c.state.persona, 'security');
  assert.equal(vals(c).roleTitle, 'Actions for Security');
});

test('every role has a visual and an action on Growing and Bank scale; empty says so', () => {
  for (const view of ['partial', 'trust']) {
    for (const p of ROLES) {
      const v = vals(ins(view, { persona: p }));
      assert.ok(v.roleVisuals.length >= 1 && v.roleVisuals.every(x => x.rows.length > 0), `${view} ${p} visuals`);
      assert.ok(v.roleActAll.length >= 1, `${view} ${p} actions`);
      assert.ok(v.roleHead.length > 0, `${view} ${p} headline`);
    }
  }
  const e = vals(ins('empty', { persona: 'neteng' }));
  assert.equal(e.roleActAll.length, 0);
  assert.match(e.roleEmpty, /Nothing to act on yet/);
});

test('actions are findings, never events, paged at four', () => {
  const v = vals(ins('trust', { persona: 'neteng' }));
  assert.ok(v.roleActAll.every(a => !/^an-/.test(a.key)), v.roleActAll.map(a => a.key).join(', '));
  assert.ok(v.roleActRows.length <= 4 && v.rolePageSize === 4);
});

test('Accept acknowledges an open finding; Accept is gone once acknowledged or in progress', () => {
  const c = ins('partial', { persona: 'finops' });
  const a = vals(c).roleActAll.find(x => x.canAccept && x.stateLabel === 'Open');
  a.accept();
  const b = vals(c).roleActAll.find(x => x.key === a.key);
  assert.equal(b.stateLabel, 'Acknowledged');
  assert.ok(!b.canAccept && b.canStart && b.canSnooze);
  b.start();
  const d = vals(c).roleActAll.find(x => x.key === a.key);
  assert.equal(d.stateLabel, 'In progress');
  assert.ok(!d.canAccept);
});

test('Defer snoozes to the next briefing: one fewer open, and the priced head moves', () => {
  const c = ins('partial', { persona: 'exec' });
  const before = vals(c);
  const top = before.roleActAll[0];
  assert.ok(top.saveLine, 'the Executive list is priced');
  top.defer();
  const after = vals(c);
  assert.equal(after.roleActAll.find(x => x.key === top.key), undefined, 'a deferred priced finding leaves the top three');
  assert.equal(after.openFindingsN, before.openFindingsN - 1);
  const dollars = (t) => +(String(t).match(/\$([\d,]+)\/mo/) || [0, '0'])[1].replace(/,/g, '');
  c.setState({ obPage: 'perf' });
  const head = vals(c).pageVerdict;
  assert.ok(dollars(head) < dollars(vals(ins('partial', { obPage: 'perf' })).pageVerdict), head);
  const snoozed = c.state.findingLife.partial[top.key];
  assert.equal(snoozed.events[snoozed.events.length - 1].until, '2026-11-01');
});

test('Do it is there, disabled, and says Coming soon; Executive with nothing priced says so', () => {
  const a = HTML.indexOf('aria-label="Your actions"');
  const panel = HTML.slice(a, HTML.indexOf('{{ rolePager.many }}', a));
  assert.ok(a > 0 && panel.length > 0);
  // The runtime drops a bare disabled attribute; it must be bound (2026-09-30, headless: 0 disabled buttons).
  assert.match(panel, /<button[^>]*disabled="\{\{ comingSoon \}\}"[^>]*>Do it<\/button>/);
  assert.equal(vals(ins('partial')).comingSoon, true);
  assert.ok(panel.includes('Coming soon'));
  const v = vals(ins('empty', { persona: 'exec' }));
  assert.equal(v.roleEmpty, 'Nothing priced on the table.');
  v.roleEmptyGo();
});

test('Architect sees private reach, cross-cloud and ports at 80% or more', () => {
  const v = vals(ins('trust', { persona: 'architect' }));
  assert.ok(v.roleActAll.some(a => /Add a port/.test(a.rec)), v.roleActAll.map(a => a.rec).join(' | '));
});

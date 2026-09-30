import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { briefingFor } from '../naas-verdicts.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Andi's monthly briefing (notes, 2026-09-30, C3): four to six sentences per role,
// built from the figures the page already shows. Nothing sends; Send a test is disabled.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const NOW = '2026-10-05T15:00:00Z';
const brief = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'brief', nowIso: NOW, ...patch });
const sentences = (t) => t.split(/(?<=\.)\s+/).filter(Boolean).length;

test('briefingFor writes four to six sentences with no em dashes', () => {
  const t = briefingFor('exec', { open: 3, onTableF: '$1,000', bankedLastF: '$500', found: 1, resolved: 2, sev1: 0, ticketsOpen: 1, mttrF: '2h 0m', availMet: 3, availN: 3, top: ['A', 'B'], nextMaint: '' });
  assert.ok(sentences(t) >= 4 && sentences(t) <= 6, t);
  assert.ok(!t.includes('\u2014'));
  // No sentence may start with a figure after one ends in one: 'resolved 0. 1 Sev 1' read as 0.1 (2026-09-30).
  assert.ok(!/\d\. \d/.test(t), t);
  assert.match(t, /resolved 2 findings/);
  assert.match(briefingFor('exec', { open: 0, found: 0, resolved: 0, sev1: 0, ticketsOpen: 0, availN: 0, top: [] }), /found none and resolved none/);
});

test('the briefing cites the head\'s dollars, the open count and the operations line', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(brief(view));
    const head = vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'perf', nowIso: NOW })).pageVerdict;
    const usd = head.match(/\$[\d,]+\/mo/);
    if (usd) assert.ok(v.briefText.includes(usd[0]), `${view}: ${usd[0]} in ${v.briefText}`);
    assert.ok(v.briefText.includes(`${v.openFindingsN} findings`), `${view}: ${v.openFindingsN} findings`);
    const [, sev1, open] = v.opsLine.match(/^(\d+) Sev 1 open now\. (\d+) tickets? open/);
    assert.ok(v.briefText.includes(`${sev1} Sev 1`) && new RegExp(`\\b${open} tickets? open`).test(v.briefText), v.briefText);
    const mttr = (v.opsLine.match(/Fixes took (.+?) on average/) || [])[1];
    if (mttr) assert.ok(v.briefText.includes(mttr), mttr);
    const n = sentences(v.briefText);
    assert.ok(n >= 4 && n <= 6, `${view}: ${n} sentences`);
  }
});

test('who gets it: five roles, a mailbox on the estate\'s own domain', () => {
  const v = vals(brief('partial'));
  assert.equal(v.briefWho.length, 5);
  assert.ok(v.briefWho.every(w => /@acme\.com$/.test(w.mail)), v.briefWho.map(w => w.mail).join(', '));
  assert.ok(!JSON.stringify(v.briefWho).includes('meridianlogistics.com'));
});

test('the cadence is longhand, last and next sends read the one clock, and nothing sends', () => {
  const c = brief('partial');
  const v = vals(c);
  assert.equal(v.briefLast, 'Oct 1, 08:00');
  assert.equal(v.briefNext, 'Nov 1, 08:00');
  assert.ok(HTML.includes('<option value="monthly">Monthly on the 1st at 08:00</option>') && HTML.includes('<option value="off">Off</option>'));
  assert.match(HTML, /<button[^>]*disabled="\{\{ comingSoon \}\}"[^>]*>Send a test<\/button>/);
  v.setBriefCadence({ target: { value: 'off' } });
  assert.equal(vals(c).briefNext, 'Off');
});

test('Andi carries the briefing, and the page says Andi, never an em dash', () => {
  const v = vals(brief('partial'));
  assert.equal(v.andiSub, v.briefText);
  const text = JSON.stringify([v.briefText, v.briefTitle, v.roleHead, v.roleActAll.map(a => [a.head, a.rec])]);
  assert.ok(!text.includes('\u2014'));
  assert.match(v.briefTitle, /^Andi/);
});

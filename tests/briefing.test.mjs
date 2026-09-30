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

// Review, 2026-09-30, finding 9: the actions sentence joined whole finding heads
// with "start with" and one "and", so it read "start with 5 sites ..., Azure eastus
// has one path, and finance rides it and 6 paths ...", and a zero month read
// "Acting banked $0 last month". The heads are clauses; they go in a list.
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const lead = (h) => String(h).split(/(?<=\.)\s+/)[0].replace(/\.$/, '');
const readsAsEnglish = (t, where) => {
  assert.ok(!/start with \d/.test(t), `${where}: "start with" a figure: ${t}`);
  assert.ok(!/\$0 last month/.test(t), `${where}: $0 banked: ${t}`);
  assert.ok(!/, and [^;:.]* and /.test(t), `${where}: double and: ${t}`);
  assert.ok(!t.includes('\u2014'), `${where}: em dash`);
  const ss = t.split(/(?<=\.)\s+/).filter(Boolean);
  assert.ok(ss.length >= 4 && ss.length <= 6, `${where}: ${ss.length} sentences: ${t}`);
  ss.forEach((x, i) => {
    const figure = /^[\d$]/.test(x), prevFigure = i > 0 && /\d\.$/.test(ss[i - 1]);
    assert.ok(/^[A-Z]/.test(x) || (figure && !prevFigure), `${where}: sentence ${i + 1} starts "${x.slice(0, 24)}" after "${i ? ss[i - 1].slice(-16) : ''}"`);
  });
};

test('briefingFor lists the actions: a count word, clauses split by semicolons, and zero banked in words', () => {
  const base = { open: 3, onTableF: '', bankedLastF: '$500', found: 0, resolved: 0, sev1: 0, ticketsOpen: 1, mttrF: '', availMet: 1, availN: 1, nextMaint: '' };
  assert.match(briefingFor('neteng', { ...base, top: ['5 sites reach the cloud over IPsec on the public internet', 'Azure eastus has one path, and finance rides it', '6 paths send no telemetry'] }),
    /For network engineering, three things wait: 5 sites reach the cloud over IPsec on the public internet; Azure eastus has one path, and finance rides it; and 6 paths send no telemetry\./);
  assert.match(briefingFor('neteng', { ...base, top: ['Both regions ride the public internet'] }), /For network engineering, one thing waits: both regions ride the public internet\./);
  assert.match(briefingFor('security', { ...base, top: ['96 PCI-tagged workloads reach the internet directly', 'Finance and non-finance workloads share a routing domain'] }),
    /For security, two things wait: 96 PCI-tagged workloads reach the internet directly; and finance and non-finance workloads share a routing domain\./);
  assert.match(briefingFor('architect', { ...base, top: ['AWS us-west-2 peaks at 84% of 2 \u00d7 10 Gbps'] }), /one thing waits: AWS us-west-2 peaks/);
  // Five wait and three are named: the count is the page's, and a two-sentence head gives its lead.
  assert.match(briefingFor('finops', { ...base, top: ['5 regions send no flow logs. 60% of your traffic is unseen.', '1 region runs above the latency SLO.', '$8,600/mo of egress rides IPsec tunnels over the internet', 'D', 'E'] }),
    /Of five things waiting on FinOps, three come first: 5 regions send no flow logs; 1 region runs above the latency SLO; and \$8,600\/mo of egress rides IPsec tunnels over the internet\./);
  for (const bankedLastF of ['$0', '']) {
    const t = briefingFor('exec', { ...base, bankedLastF, top: [] });
    assert.match(t, /Nothing was banked last month/, t);
    readsAsEnglish(t, `banked ${bankedLastF || 'blank'}`);
  }
});

test('the briefing reads as English on every estate, for every role', () => {
  for (const view of ['partial', 'mature', 'trust', 'small', 'empty']) {
    for (const persona of ['architect', 'neteng', 'security', 'finops', 'exec']) {
      const where = `${view}/${persona}`;
      const v = vals(brief(view, { persona }));
      const t = v.briefText, acts = v.roleActAll || [];
      readsAsEnglish(t, where);
      if (['small', 'empty'].includes(view)) assert.match(t, /Nothing was banked last month/, where);
      else assert.match(t, /Acting banked \$[1-9][\d,]* last month/, where);
      const n = acts.length, w = COUNT[n] || String(n);
      if (!n) assert.match(t, /Nothing waits on /, where);
      else if (n <= 3) assert.ok(t.includes(`, ${w} ${n === 1 ? 'thing waits' : 'things wait'}: `), `${where}: ${n} waiting: ${t}`);
      else assert.ok(t.includes(`Of ${w} things waiting on `) && t.includes(', three come first: '), `${where}: ${n} waiting: ${t}`);
      for (const a of acts.slice(0, 3)) {
        const c = lead(a.head);
        assert.ok(t.includes(c) || t.includes(c[0].toLowerCase() + c.slice(1)), `${where}: "${c}" missing from ${t}`);
      }
    }
  }
});

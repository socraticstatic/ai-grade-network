import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from '../naas-data.js';
import * as OD from '../naas-observe-dash.js';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Insights > Operations (notes, 2026-09-30, C1): tickets open and fixed, how long
// fixes take, availability against each holder's target, and what changed. The
// closed-ticket history is a sample, relative to now, and says so.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const NOW = '2026-10-05T15:00:00Z';
const ops = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'ops', nowIso: NOW, ...patch });

test('Operations is an Insights tab with four underline subtabs', () => {
  const v = vals(ops('partial'));
  assert.ok(v.insPanels.some(p => p.label === 'Operations'));
  assert.ok(v.insPanelOps);
  assert.deepEqual(v.opsPanels.map(p => p.label.replace(/ · \d+$/, ' · N')), ['Overview', 'Tickets · N', 'Availability', 'Maintenance & Changes']);
  assert.ok(v.opsPanels.every(p => 'line' in p), 'underline tabs');
});

test('Growing at 30 days: fixes took 20h 31m, and the open count is the Tickets list', () => {
  const c = ops('partial', { obWindow: '30d' });
  const v = vals(c);
  assert.match(v.opsLine, /Fixes took 20h 31m on average\.$/);
  const open = +v.opsLine.match(/(\d+) tickets? open/)[1];
  c.setState({ opsPanel: 'tickets' });
  const t = vals(c);
  // The count is the rows that carry a ticket (final review, 2026-09-30); with Andi On that is every row.
  assert.equal(t.ticketAll.filter(r => r.ticketed).length, open);
  assert.equal(t.ticketAll.length, open);
  assert.equal(t.opsPanels[1].label, `Tickets · ${open}`);
  assert.match(t.opsLine, /^1 Sev 1 open now\./);
});

test('Since moves fixes and time to fix, never what is open now', () => {
  const line = (w) => vals(ops('partial', { obWindow: w })).opsLine;
  const head = (l) => l.split('Fixes')[0];
  assert.equal(head(line('7d')), head(line('30d')));
  assert.equal(head(line('24h')), head(line('90d')));
  assert.notEqual(line('7d'), line('30d'));
  const fixed = (w) => vals(ops('partial', { obWindow: w })).opsTiles.find(t => t.key === 'fixed').v;
  assert.deepEqual(['24h', '7d', '30d', '90d'].map(fixed), ['1', '3', '7', '15']);
});

test('availability stays inside 0 to 100%, and each row names who holds the SLA', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    for (const r of vals(ops(view, { opsPanel: 'avail' })).availAll) {
      assert.ok(r.uptime >= 0 && r.uptime <= 1, `${view} ${r.where} ${r.uptime}`);
      assert.ok(['AT&T', 'Cloud provider', 'Third party', 'Public internet'].includes(r.owner), `${view} ${r.where} ${r.owner}`);
      assert.ok([99.99, 99.9, 99.5].includes(r.target), `${view} ${r.where} ${r.target}`);
    }
  }
  for (const view of ['partial', 'mature', 'trust', 'small']) assert.ok(D.ESTATES[view].regionsList.every(r => r.slaHolder), `${view}: every region states its SLA holder`);
  const eastus = vals(ops('partial', { opsPanel: 'avail' })).availAll.find(r => r.where === 'Azure eastus');
  assert.ok(eastus.uptime < 1, 'the open Sev 1 costs eastus uptime');
});

test('maintenance only on AT&T-held connections, and Coming up is after now', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    const v = vals(ops(view, { opsPanel: 'changes' }));
    const regs = D.ESTATES[view].regionsList;
    for (const m of v.maintAll) assert.equal(regs.find(r => `${r.cloud} ${r.region}` === m.touched).slaHolder, 'att', `${view} ${m.touched}`);
    assert.ok(v.comingUp.every(m => m.at > Date.parse(NOW)), view);
  }
});

test('the empty estate reads in lines, never NaN or 0 of 0', () => {
  const v = vals(ops('empty'));
  const text = JSON.stringify([v.opsLine, v.opsTiles, v.ticketRows, v.fixRows, v.availRows, v.opsChangeRows]);
  assert.ok(!/NaN|undefined|0 of 0/.test(text), text);
  assert.equal(v.opsLine, 'No tickets yet. Nothing has been opened or fixed.');
});

test('lists page', () => {
  const c = ops('trust', { opsPanel: 'avail' });
  const v = vals(c);
  assert.ok(v.availRows.length <= v.availPageSize);
  assert.ok(v.ticketPageSize > 0 && v.fixPageSize > 0 && v.opsChangePageSize > 0);
});

test('the history is labelled sample, and Andi opening tickets is a session toggle', () => {
  const c = ops('partial');
  const v = vals(c);
  assert.match(v.fixLabel, /sample/i);
  assert.equal(v.andiTicketsLabel, 'Andi opens a ticket for each new incident: On');
  v.toggleAndiTickets();
  assert.equal(vals(c).andiTicketsLabel, 'Andi opens a ticket for each new incident: Off');
  assert.ok(OD.HISTORY.partial.length > 0);
});

test('Operations paints from theme tokens, like the cards above it', () => {
  const a = HTML.indexOf('<sc-if value="{{ obIsInsights }}"');
  const panel = HTML.slice(a, HTML.indexOf('id="sec-insights"', a));
  assert.ok(panel.includes('{{ insPanelOps }}'), 'Operations sits before the findings list');
  assert.doesNotMatch(panel, /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i);
});

test('sample Sev 1 history lands on the estate\'s troubled connection, never a healthy one', () => {
  for (const view of ['partial', 'mature', 'trust', 'small']) {
    const regs = D.ESTATES[view].regionsList;
    for (const r of vals(ops(view, { opsPanel: 'avail', obWindow: '90d' })).availAll.filter(a => a.outageMin > 0)) {
      const g = regs.find(x => r.where === `${x.cloud} ${x.region}`);
      assert.ok(g.link === 'degraded' || g.rel === 'warn', `${view}: ${r.where} lost uptime but is healthy`);
    }
  }
  const v = vals(ops('partial', { opsPanel: 'avail' }));
  assert.equal(v.availAll.find(r => r.where === 'AWS us-east-1').uptime, 1);
  assert.match(v.availLine, /sample/i);
});

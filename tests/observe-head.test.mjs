import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// "On the top of the Observe page we might want to show something like this
// 'xx findings open. $xx/mo potential savings'" (notes, 2026-09-29).

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const at = (view, patch = {}) => mkC({ view, screen: 's3', tab: 'observe', estateParam: null, ...patch });

test('Observe leads with findings open and potential savings', () => {
  assert.match(vals(at('partial')).pageVerdict, /^\d+ findings? open\. \$[\d,]+\/mo potential savings\.$/);
});

test('the count and the dollars are the open findings, the same figure Cost puts on the table', () => {
  const v = vals(at('partial'));
  // One list: the app's findings (data plus Observe's own) and the events; one partial finding is snoozed.
  assert.equal(v.findingsAllN + v.eventsN - v.openFindingsN, 1);
  assert.equal(v.pageVerdict, `${v.openFindingsN} findings open. $41,500/mo potential savings.`);
  assert.match(vals(at('partial', { tab: 'cost' })).pageVerdict, /^\$41,500\/mo on the table/);
});

test('findings with no price still count as open; an estate with none keeps the old line', () => {
  // Established prices its savings since 2026-09-30; snooze both priced findings to leave only unpriced ones open.
  const c = at('mature', { obPage: 'insights', insPanel: 'findings' });
  for (const k of ['avoidable', 'crosscloud']) { vals(c).findAll.find(r => r.key === k).open(); vals(c).fd.actions.find(a => a.label === 'Snooze 7 days').go(); }
  const v = vals(c);
  assert.equal(v.pageVerdict, `${v.openFindingsN} ${v.openFindingsN === 1 ? 'finding' : 'findings'} open.`, 'nothing priced, so no dollar clause');
  assert.equal(vals(at('empty')).pageVerdict, 'No telemetry yet.');
});

test('the head is a door to the findings', () => {
  const c = at('partial');
  const v = vals(c);
  assert.equal(v.verdictRole, 'button');
  v.verdictGo();
  assert.equal(c.state.obPage, 'insights');
  assert.equal(c.state.insPanel, 'findings');
});

test('the Connect head is a door to Options', () => {
  const c = mkC({ view: 'partial', screen: 's3', tab: 'connect', estateParam: null });
  vals(c).verdictGo();
  assert.equal(c.state.cnPage, 'options');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The skeptic's second pass on w2-consistency (2026-09-30, on 0d7472b). Each
// test names the problem it pins: a page past the fold, a door that lands on a
// set other than the one it counts, one connection with two moves, a landed
// size misread, a colour that means two things, a briefing that says a thing
// is under way when it is snoozed.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const store = {};
globalThis.localStorage = globalThis.localStorage || { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const VIEWS = ['partial', 'mature', 'trust', 'small'];
const ins = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', insPanel: 'signals', ...patch });
const card = (v, k) => (v.sigAll || []).find(x => x.key === k);

test('Logs with an explanation: the filters are shut when the toggle says Show, and the page is sized for what shows', () => {
  for (const view of VIEWS) {
    const c = ins(view, { persona: 'neteng' });
    card(vals(c), 'talkers').all[0].figGo();
    let v = vals(c);
    assert.equal(c.state.obPage, 'logs');
    assert.ok(v.explainOn, `${view}: no explanation on the landing`);
    assert.equal(v.logFiltersOpen, !v.logFiltersShut, `${view}: the filters render ${v.logFiltersOpen ? 'open' : 'shut'} while the page sizes them ${v.logFiltersShut ? 'shut' : 'open'}`);
    assert.equal(v.logFilterToggleWord, v.logFiltersOpen ? 'Hide' : 'Show', `${view}: the toggle reads ${v.logFilterToggleWord} over filters that are ${v.logFiltersOpen ? 'open' : 'shut'}`);
    // Opened by hand, the page drops rows to keep the fold.
    const shut = v.logPageSize;
    v.toggleLogFilters();
    v = vals(c);
    assert.ok(v.logFiltersOpen, `${view}: Show does not open the filters`);
    assert.ok(v.logPageSize < shut, `${view}: the open filters keep ${v.logPageSize} rows, as many as shut (${shut})`);
  }
});

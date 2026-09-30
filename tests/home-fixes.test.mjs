import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The home skeptic's six findings (2026-09-30), each pinned. The home was
// rebuilt the same afternoon (v2: take-away, snapshot cards, the map below);
// D1, D4, D5 and D6 named parts of v1 that left, so each is pinned here in
// the form it takes on v2.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', ...patch });
const block = () => { const i = HTML.indexOf('aria-label="NaaS home"'); return HTML.slice(i, HTML.indexOf('</section>', i)); };

test('D1 (v2): the briefing is one link at the top of the home, never a band of prose', () => {
  const b = block();
  assert.ok(!b.includes('aria-label="Andi\'s briefing"'), 'the briefing band is back');
  const at = b.indexOf('{{ homeBriefGo }}'), take = b.indexOf('aria-label="Take-away"');
  assert.ok(at > 0 && take > at, 'the briefing link sits in the top row, above the take-away');
});

test('D2: the Connect group title opens the network map', () => {
  const c = home('partial');
  const g = vals(c).railGroups.find(x => x.title === 'Connect');
  g.titleGo();
  assert.equal(c.state.screen, 's3'); assert.equal(c.state.tab, 'connect'); assert.equal(c.state.cnPage, 'picture');
});

test('D3: every Home door goes home', () => {
  const c = home('mature', { screen: 's7' });
  vals(c).goHome();
  assert.equal(c.state.screen, 's0');
  assert.ok(!/goFloor \}\}"[^>]*>Home</.test(HTML) && /goHome \}\}"[^>]*>Home</.test(HTML), 'the Home label is bound to goHome');
});

test('D4 (v2): Empty claims no health it has no data for: no cards, no map', () => {
  const v = vals(home('empty'));
  assert.deepEqual(v.homeCards, []);
  assert.equal(v.heroVisible, false);
  assert.equal(v.homeTake, null);
});

test('D5 (v2): Small, nothing attached, never calls its apps healthy on AT&T and draws no private region', () => {
  const v = vals(home('small'));
  const apps = v.homeCards.find(x => x.key === 'apps');
  assert.equal(apps.value, '1 of 2', 'Small counts its own two apps');
  const on = v.homeCards.find(x => x.key === 'onatt');
  assert.ok(!on.segs.some(g => g.key === 'priv'), 'a private arc on an estate with none');
});

test('D6 (v2): no card on the home looks selected', () => {
  for (const view of ['partial', 'small']) for (const t of vals(home(view)).homeCards) assert.equal(t.edge, 'var(--border-secondary)', `${view} ${t.key}`);
});

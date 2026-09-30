import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// The home skeptic's six findings (2026-09-30), each pinned.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const home = (view, patch = {}) => mkC({ view, estateParam: null, screen: 's0', ...patch });

test('D1: the briefing door sits under the prose, not floated to the band floor', () => {
  const a = HTML.indexOf('aria-label="Andi\'s briefing"'), b = HTML.indexOf('aria-label="Waiting on you"', a);
  const band = HTML.slice(a, b);
  assert.ok(a > 0 && !/align-self:end/.test(band) && !/grid-template-rows:auto auto 1fr/.test(band), band.slice(0, 300));
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

test('D4: Empty claims no health it has no data for', () => {
  const v = vals(home('empty'));
  assert.equal(v.homeNowNone, 'No telemetry yet. It starts with the first attach.');
  assert.equal(v.homeNowNoneDot, 'transparent');
});

test('D5: Small, nothing attached, never says "No telemetry" above a latency problem', () => {
  const v = vals(home('small'));
  const obs = v.homeStrip.find(t => t.key === 'observe');
  if ((v.homeNow || []).length) assert.doesNotMatch(`${obs.value} ${obs.sub}`, /No telemetry/, `${obs.value} · ${obs.sub}`);
  assert.equal(obs.value, 'Public paths only');
});

test('D6: no tile on the home looks selected', () => {
  for (const view of ['partial', 'small', 'empty']) for (const t of vals(home(view)).homeStrip) {
    assert.equal(t.edge, 'var(--border-secondary)', `${view} ${t.key}`); assert.equal(t.ring, 'none', `${view} ${t.key}`);
  }
});

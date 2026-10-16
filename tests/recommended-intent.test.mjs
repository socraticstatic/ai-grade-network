import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Recommended speaks the journey (Micah, 2026-10-09: "continue to beautiful and integrate into the rest of the site"): one
// ranking, one answer store, the journey's score ring, reason chips and Why panel, and its four questions in the hero.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const on = (view, extra = {}) => mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options', ...extra });

test('an answer on Recommended re-ranks the estate, as the journey does, and is kept for that estate alone', () => {
  const c = on('partial');
  let mv = vals(c).moves[0];
  assert.deepEqual(mv.tiers.map(t => t.way), ['byo', 'att', 'transit']);
  assert.deepEqual(mv.intentChips.map(x => x.icon), ['apps', 'smart-meter', 'padlock', 'router'], 'Production, Standard, Private, Your BGP');
  mv.intentToggle(); mv = vals(c).moves[0];
  assert.equal(mv.intentOpen, true);
  mv.intentQs.find(q => q.key === 'security').opts.find(o => o.key === 'inspected').go();
  assert.deepEqual(c.state.intents, { partial: { security: 'inspected' } });
  mv = vals(c).moves[0];
  assert.deepEqual(mv.tiers.map(t => t.way), ['transit', 'peer', 'cloudwan'], 'inspection required: the hosted transit gateway first');
  assert.deepEqual(vals(on('mature')).moves[0].tiers.map(t => t.way).slice(0, 1), ['byo'], 'another estate keeps its own answers');
});

test('each card wears the ring and its reasons; the reasons open the journey\'s Why over the hero', () => {
  const c = on('partial');
  let mv = vals(c).moves[0];
  const [pick, alt] = mv.tiers;
  assert.deepEqual([pick.pts, pick.ptsPct, pick.out], ['100', '100%', false]);
  assert.ok(pick.hasWhy && pick.wchips[0].word && !pick.wchips[1].word, 'the first chip keeps its word, the next is a glyph');
  assert.equal(alt.wchips[0].ok, true);
  pick.whyGo(); mv = vals(c).moves[0];
  assert.equal(mv.whyOpen, true);
  assert.deepEqual(mv.why.pairs.map(p => [p.aLabel, p.kind]), [['Production', 'quiet'], ['Standard', 'quiet'], ['Private', 'ok'], ['Your BGP', 'ok']]);
  assert.equal(mv.why.label, 'Your ExpressRoute');
  mv.whyClose(); assert.equal(vals(c).moves[0].whyOpen, false);
  assert.match(HTML, /<sc-if value="\{\{ mv\.whyOpen \}\}"[^>]*><div class="js-whyp" role="dialog" aria-label="Why \{\{ mv\.why\.label \}\}"/);
  assert.match(HTML, /<span class="js-score md" style="--p:\{\{ tr\.ptsPct \}\}" data-out="\{\{ tr\.out \}\}"/);
  assert.match(HTML, /<button class="rec-needs" onClick="\{\{ mv\.intentToggle \}\}"/);
  assert.doesNotMatch(HTML, /class="way-pts sm" title="\{\{ tr\.ptsTitle \}\}"/, 'the pill is gone from Recommended');
});

test('the journey\'s estate shares one store: its Intent beat and its Recommended edit one object', () => {
  const c = on('lastmile', { addedSources: [{ provider: 'Azure', estId: 'lastmile', name: 'x', cadence: 'daily', at: 1 }] });
  const mv = vals(c).moves[0];
  mv.intentQs.find(q => q.key === 'routing').opts.find(o => o.key === 'hub').go();
  // Answers live per region since 2026-10-13 (the journey's region picker); the journey's estate has a move a region since
  // 2026-10-15, and an answer on a move is that region's.
  assert.deepEqual(Object.values(c.state.jIntents)[0], { routing: 'hub' });
  assert.ok(vals(c).moves[0].tiers.every(t => ['transit', 'peer', 'cloudwan', 'privatelink'].includes(t.way)), 'AT&T\'s hub: hosted ways only');
});

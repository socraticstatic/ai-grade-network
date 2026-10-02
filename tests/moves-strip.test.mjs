import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
import { stripOf } from '../naas-moves.js';

// Connect > Recommended on Govern's grammar (2026-10-02): each move's Today and each tier draw the four stations as the
// tiny strip, so the comparison is a shape before it is three columns of words; the set's glyph leads the title.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const at = (view) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'connect', cnPage: 'options' }));

test('the public internet has no AT&T edge and a core at risk; AT&T\'s path sets every station', () => {
  assert.deepEqual(stripOf('internet').map(n => n.state), ['set', 'none', 'risk', 'set']);
  assert.deepEqual(stripOf('netbond').map(n => n.state), ['set', 'set', 'set', 'set']);
  assert.deepEqual(stripOf('third').map(n => n.state), ['set', 'nodata', 'nodata', 'set']);
  assert.equal(stripOf('netbond', { inspect: true })[1].icon, 'check-shield');
  for (const n of stripOf('internet')) assert.ok(onDisk(n.icon), n.icon);
});

test('every move on Growing draws its today and its three tiers, and the Full control tier is inspected', () => {
  const v = at('partial');
  assert.ok(v.moves.length > 0);
  for (const mv of v.moves) {
    assert.ok(onDisk(mv.kindIcon), mv.kindIcon);
    assert.equal(mv.strip.length, 4);
    assert.equal(mv.tiers.length, 3);
    for (const t of mv.tiers) { assert.equal(t.strip.length, 4); for (const n of t.strip) assert.ok(onDisk(n.icon), n.icon); }
  }
  const gcp = v.moves.find(m => /GCP/.test(m.title));
  assert.ok(gcp, 'the GCP regions move');
  assert.deepEqual(gcp.strip.map(n => n.state), ['set', 'none', 'risk', 'set'], 'today rides the public internet');
  assert.deepEqual(gcp.tiers[1].strip.map(n => n.state), ['set', 'set', 'set', 'set'], 'Recommended rides AT&T');
  assert.equal(gcp.tiers[2].strip[1].icon, 'check-shield', 'Full control inspects at the edge');
});

test('the markup draws the strip in Today and in each tier, on the row the labels leave for it', () => {
  assert.match(HTML, /<div class="ps xs" aria-label="Today's path"/);
  assert.match(HTML, /<span class="ps xs" aria-label="\{\{ tr\.tier \}\}: the path"/);
  assert.equal((HTML.match(/grid-template-rows:15px 16px 24px 16px 16px 16px/g) || []).length, 3, 'the labels, Today and the tiers share one row plan');
});

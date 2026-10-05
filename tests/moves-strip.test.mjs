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
    for (const n of mv.strip) assert.ok(n.short, 'every node names its station');
    assert.ok(onDisk(mv.mark.icon), mv.mark.icon);
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
  // The header line carries the tiny strips (2026-10-05); the open row's four columns carry the small ones on one row plan.
  // The header line carries one mark per side (Micah, 2026-10-05: "barely viewable icons, thick circle lines"); the open
  // row's strips run the column's width at 28px with the station word under each node.
  assert.match(HTML, /class="ic-tile s28" style="background:\{\{ mv\.mark\.bg \}\}/);
  assert.match(HTML, /class="ic-tile s28" style="background:\{\{ mv\.pick\.mark\.bg \}\}/);
  assert.match(HTML, /<div class="ps" aria-label="Today's path"[^>]*><sc-for list="\{\{ mv\.strip \}\}"[^>]*><span[^>]*><i><span class="ic s16"/);
  assert.match(HTML, /<span class="ps" aria-label="\{\{ tr\.tier \}\}: the path"[^>]*><sc-for list="\{\{ tr\.strip \}\}"[^>]*><span[^>]*><i><span class="ic s16"[^>]*><\/span><\/i><small>\{\{ tn\.short \}\}<\/small>/);
  assert.equal((HTML.match(/grid-template-rows:38px 56px 24px 24px 24px/g) || []).length, 3, 'the glyph column, Today and the tiers share one row plan');
});

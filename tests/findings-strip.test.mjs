import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';

// Findings and Your actions on Govern's grammar (2026-10-02): each finding's kind as a badge in the verb inks, and the strip
// saying where on the path it sits; each action carries the same strip beside its head.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const onDisk = (n) => existsSync(new URL(`../brand/icons/${n}.svg`, import.meta.url));
const ins = (view, extra = {}) => vals(mkC({ view, estateParam: null, screen: 's3', layer: 'cloud', tab: 'observe', obPage: 'insights', ...extra }));

test('every finding carries a badge class and a four-station strip with glyphs on disk', () => {
  const v = ins('partial', { insPanel: 'findings' });
  assert.ok(v.insightRows.length > 0);
  for (const r of v.insightRows) {
    assert.ok(['', 'allow', 'manip'].includes(r.badgeCls), r.badgeCls);
    assert.equal(r.strip.length, 4);
    for (const n of r.strip) { assert.ok(onDisk(n.icon), n.icon); assert.ok(['set', 'none', 'risk', 'nodata', 'slo'].includes(n.state), n.state); }
  }
  const ev = v.findAll.find(r => r.kind === 'Event'); if (ev) assert.equal(ev.badgeCls, 'manip');
  const ipsec = v.findAll.find(r => /IPsec/.test(r.kind)); assert.ok(ipsec, 'an IPsec finding');
  assert.deepEqual(ipsec.strip.map(n => n.state), ['set', 'none', 'risk', 'set'], 'IPsec rides the public internet');
  const blind = v.findAll.find(r => /Blind|Unmon/.test(r.kind)); assert.ok(blind, 'a blind spot');
  assert.equal(blind.strip[2].state, 'nodata', 'a blind spot is a core AT&T cannot yet see');
});

test('every action for a role carries the strip', () => {
  const v = ins('partial', { insPanel: 'role', persona: 'neteng' });
  assert.ok(v.roleActRows.length > 0);
  for (const r of v.roleActRows) { assert.equal(r.strip.length, 4); for (const n of r.strip) assert.ok(onDisk(n.icon), n.icon); }
});

test('the markup draws the badge and the strip on both', () => {
  assert.match(HTML, /<span class="fw-badge \{\{ ins\.badgeCls \}\}"/);
  assert.match(HTML, /<sc-for list="\{\{ ins\.strip \}\}" as="fs"/);
  assert.match(HTML, /<sc-for list="\{\{ ra\.strip \}\}" as="rs"/);
});

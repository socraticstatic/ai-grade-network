import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// The middle of the picture is the AT&T network, not the AT&T fabric. It is
// access, edge and core, and some of it is not even AT&T's glass; "fabric"
// named one product layer as if it were the whole path. A verdict reading "on
// the AT&T fabric" under a column titled AT&T network is the drift this pins.
// Comments are not user-facing and "AI Fabric" is a different product.
test('no user-facing string names the middle "AT&T fabric"', () => {
  const root = new URL('../', import.meta.url);
  const files = [...readdirSync(root).filter(f => /^naas-.*\.js$/.test(f)), 'NaaS Storefront.dc.html'];
  const hits = [];
  for (const f of files) {
    readFileSync(new URL(f, root), 'utf8').split('\n').forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (/AT&(amp;)?T fabric/i.test(line)) hits.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, [], `still says AT&T fabric at ${hits.length} places`);
});

test('AI Fabric keeps its name', () => {
  const data = readFileSync(new URL('../naas-data.js', import.meta.url), 'utf8');
  assert.ok(data.includes("label: 'AI Fabric'"), 'the AI Fabric product layer was renamed by mistake');
});

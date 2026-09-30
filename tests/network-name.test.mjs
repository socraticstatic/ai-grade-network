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

// ---- stricter guards (notes, 2026-09-30, Task 0.5) ----
import { vals } from '../naas-app.js';
import { mkC } from './harness.mjs';
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };

// The user-facing strings of every naas-*.js file and the markup: string
// literals with comments and ${...} interpolations stripped, and the markup's
// text, aria-label, title and placeholder values.
function copyStrings() {
  const root = new URL('../', import.meta.url);
  const files = [...readdirSync(root).filter(f => /^naas-.*\.js$/.test(f)), 'NaaS Storefront.dc.html'];
  const out = [];
  for (const f of files) {
    const src = readFileSync(new URL(f, root), 'utf8');
    const html = f.endsWith('.html');
    const blank = (m) => m.replace(/[^\n]/g, ' ');
    const text = html ? src.replace(/<!--[\s\S]*?-->/g, blank).replace(/<script[\s\S]*?<\/script>/g, blank).replace(/<style[\s\S]*?<\/style>/g, blank)
      : src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
    text.split('\n').forEach((line, i) => {
      const strs = html ? [...line.matchAll(/(?:aria-label|title|placeholder)="([^"]*)"|>([^<>]*)</g)].map(m => m[1] || m[2] || '')
        : [...line.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|"((?:[^"\\\n]|\\.)*)"/g)].map(m => m[1] ?? m[2] ?? m[3] ?? '');
      for (const s of strs) out.push({ at: `${f}:${i + 1}`, s: s.replace(/\$\{[^}]*\}/g, ' ').replace(/\{\{[^}]*\}\}/g, ' ') });
    });
  }
  return out;
}

test('no user-facing string says fabric, except the products AI Fabric and Equinix Fabric', () => {
  const hits = copyStrings().filter(({ s }) => /\s/.test(s) && /\bfabric\b/i.test(s.replace(/(AI|Equinix) Fabric/g, '')));
  assert.deepEqual(hits.map(h => `${h.at}: ${h.s.trim().slice(0, 60)}`), []);
});

test('no user-facing sentence carries an em dash', () => {
  // A lone dash that stands for "no value" is a glyph, not punctuation.
  const hits = copyStrings().filter(({ s }) => s.includes('—') && /[A-Za-z]/.test(s));
  assert.deepEqual(hits.map(h => `${h.at}: ${h.s.trim().slice(0, 60)}`), []);
});

test('region rows name the connection, never the ER or DX code', () => {
  for (const view of ['partial', 'mature', 'trust']) {
    for (const cloud of ['AWS', 'Azure']) {
      const v = vals(mkC({ view, estateParam: null, screen: 's1', estPanel: 'clouds', cloudTrailE: ['cloud:' + cloud] }));
      const subs = (v.cloudRows || []).map(r => r.sub || '');
      assert.ok(subs.length, `${view}/${cloud} has region rows`);
      assert.ok(subs.every(t => !/\b(ER|DX|EQX)\b/.test(t)), `${view}/${cloud}: ${subs.join(' | ')}`);
    }
  }
  const src = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
  assert.ok(!/\$\{r\.ramp \|\| /.test(src), 'a template still prints the raw ramp code');
});

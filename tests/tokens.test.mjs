import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');

const theme = (name) => {
  const head = `[data-theme="${name}"]{`;
  const i = HTML.indexOf(head);
  assert.ok(i > 0, `no ${name} theme block`);
  const body = HTML.slice(i + head.length, HTML.indexOf('}', i));
  return Object.fromEntries(body.split(';').filter(Boolean).map(d => d.split(':').map(x => x.trim())));
};

// Flywheel 3, from ~/Developer/att-netbond-sdci/tailwind.config.js (Figma-matched from SDCI.fig).
const FLYWHEEL = {
  '--success': '#2d7e24',          // green-600
  '--viz-3': '#2d7e24',            // green-600
  '--border-primary': '#bdc2c7',   // gray-400
  '--text-disabled': '#878c94',    // gray-500
  '--viz-6': '#878c94',            // gray-500
  '--border-secondary': '#dcdfe3', // gray-300
  '--sidebar-accent': '#e6f0fa',   // cobalt-100
  '--bg-neutral': '#f3f4f6',       // gray-200
};

test('the light theme carries Flywheel 3 values for the eight drifted tokens', () => {
  const t = theme('light');
  for (const [k, v] of Object.entries(FLYWHEEL)) assert.equal(t[k], v, k);
});

test('the four tokens Flywheel has no answer for are left alone until a human rules', () => {
  const t = theme('light');
  assert.equal(t['--warning'], '#b85f00', 'fw orange-600 #ea712f is markedly louder; deferred');
  assert.equal(t['--viz-4'], '#b85f00', 'same as --warning; deferred');
  assert.equal(t['--error'], '#c23131', 'fw red-600 #c70032 is markedly louder; deferred');
  assert.equal(t['--viz-5'], '#7d3f98', 'Flywheel has no purple; deferred');
});

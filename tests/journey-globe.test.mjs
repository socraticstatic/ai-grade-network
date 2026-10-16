// The journey's AT&T node on the Today beat carries the AT&T globe, not the
// hub glyph (Micah, 2026-10-16: "Globe too", after the tour's backbone node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');

test('the journey AT&T node shows the AT&T globe and no hub glyph', () => {
  const i = HTML.indexOf('class="js-node js-att"');
  assert.ok(i > 0, 'the AT&T node is gone');
  const node = HTML.slice(i, HTML.indexOf('</div>', i));
  assert.ok(node.includes('js-globe-mark'), 'the node does not carry the globe mark');
  assert.match(CSS, /\.js-globe-mark\{[^}]*background:url\('brand\/att-globe\.svg'\)/, 'the globe mark does not draw brand/att-globe.svg');
  assert.equal(node.includes('hub.svg'), false, 'the hub glyph is still there');
  assert.equal(/class="ic"/.test(node), false, 'the globe must not go through the currentColor mask');
  // The ring and fill that framed a glyph would recolour a logo: the globe sits bare.
  assert.match(CSS, /\.js-att \.js-hub\.js-globe\{[^}]*background:none/, 'the globe node still has a fill');
});

test('in dark mode the globe is white: the logo as a mask filled white', () => {
  // Micah, 2026-10-16: "On dark mode, the globe should be white".
  const rule = CSS.match(/\[data-theme="dark"\] \.js-globe-mark\{([^}]*)\}/);
  assert.ok(rule, 'no dark rule for the globe mark');
  assert.match(rule[1], /mask:url\('brand\/att-globe\.svg'\)/, 'the dark globe is not the logo as a mask');
  assert.match(rule[1], /background(-color)?:#fff\b/, 'the dark globe is not white');
});

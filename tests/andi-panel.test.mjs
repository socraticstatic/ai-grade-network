import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Andi clipped its words on Govern (2026-10-01): the panel's middle grid sized its one column to the
// widest no-wrap button (Govern's long tier names), so every line ran past the 340px panel.
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const a = HTML.indexOf('<aside aria-label="Andi"'), panel = HTML.slice(a, HTML.indexOf('</aside>', a));

test('Andi\'s column cannot grow past the panel, and its words wrap', () => {
  assert.match(panel, /overflow:auto;padding:16px;display:grid;grid-template-columns:minmax\(0,1fr\)/);
  for (const k of ['a.label', 'm.head', 'q.q', 't.name']) {
    const i = panel.indexOf(`{{ ${k} }}`), open = panel.lastIndexOf('<button', i);
    assert.doesNotMatch(panel.slice(open, i), /white-space:nowrap/, `${k} cannot wrap`);
  }
  assert.doesNotMatch(panel.slice(panel.indexOf('andiScopeLabel') - 400, panel.indexOf('andiScopeLabel')), /text-overflow:ellipsis/, 'the scope chip cuts its words');
});

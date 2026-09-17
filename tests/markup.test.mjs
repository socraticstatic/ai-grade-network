import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../naas-app.js', import.meta.url), 'utf8');
const count = (re) => (HTML.match(re) || []).length;

test('the page title row leads with the verdict and demotes the stat line', () => {
  const i = HTML.indexOf('{{ pageTitle }}');
  assert.ok(i > 0, 'the page title row is gone');
  const row = HTML.slice(i, i + 900);
  assert.ok(row.includes('{{ pageVerdict }}'), 'the written verdict is not bound in the title row');
  assert.ok(row.includes('{{ pageStat }}'), 'the stat string is not bound in the title row');
  assert.ok(row.indexOf('{{ pageVerdict }}') < row.indexOf('{{ pageStat }}'), 'the stat line must sit under the verdict');
  assert.equal(HTML.includes('{{ pageSub }}'), false, 'pageSub is retired');
  // deptVerdict was the same ternary under a name nothing bound. One copy, or it drifts.
  assert.equal(APP.includes('deptVerdict'), false, 'deptVerdict was renamed to pageVerdict, not duplicated by it');
});

test('every container the markup opens, it closes', () => {
  const pairs = [
    ['div', /<div\b/g, /<\/div>/g],
    ['sc-if', /<sc-if\b/g, /<\/sc-if>/g],
    ['sc-for', /<sc-for\b/g, /<\/sc-for>/g],
    ['section', /<section\b/g, /<\/section>/g],
    ['button', /<button\b/g, /<\/button>/g],
  ];
  for (const [name, open, close] of pairs) assert.equal(count(open), count(close), `${name} is unbalanced`);
});

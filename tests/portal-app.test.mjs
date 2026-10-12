import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { vals, init, defaults } from '../naas-portal-app.js';

// The portal MVP page (2026-10-12): its own small page on the storefront's stylesheet, a four-item rail, two
// fixtures and two states by URL. Spec sections 2 and 4.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };

test('the rail is the journey then the four pages, in order, and Last mile is home', () => {
  const v = vals(mkC());
  assert.deepEqual(v.rail.map(r => r.label), ['Connect a cloud', 'Last mile', 'Cloud connections', 'Cloud discovery', 'Recommended']);
  assert.deepEqual(v.rail.map(r => r.cur), [false, true, false, false, false]);
  const c = mkC(); vals(c).rail[3].go(); assert.equal(c.state.page, 'discovery'); assert.equal(vals(c).rail[3].cur, true);
});

test('?fixture=scale&state=b loads the synthetic estate in state B; the default is Calloway in state A', () => {
  const c = mkC(); init(c, 'fixture=scale&state=b&theme=dark');
  assert.equal(c.state.fixture, 'scale'); assert.equal(c.state.stateB, true); assert.equal(c.state.theme, 'dark');
  const v = vals(c); assert.equal(v.fixtureName, 'Bank scale'); assert.equal(v.synthetic, true); assert.equal(v.stateB, true);
  const d = mkC(); init(d, ''); const w = vals(d);
  assert.equal(d.state.fixture, 'calloway'); assert.equal(w.stateB, false); assert.equal(w.synthetic, false); assert.equal(w.fixtureName, 'Calloway Freight');
});

test('the page shares the storefront stylesheet; the storefront no longer inlines it', () => {
  assert.ok(existsSync(new URL('../storefront.css', import.meta.url)));
  assert.ok(HTML.includes('<link rel="stylesheet" href="./storefront.css">'));
  assert.ok(STORE.includes('<link rel="stylesheet" href="./storefront.css">'));
  assert.equal(STORE.includes('.dt{display:table'), false, 'the table rules live in the file now');
  const css = readFileSync(new URL('../storefront.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.dt{display:table') && css.includes('.hdr-cust{'));
});

test('the storefront rail foot links to the portal page; the portal header marks Portal MVP as the page you are on and NaaS as the way back', () => {
  assert.ok(STORE.includes('href="portal.dc.html"'));
  const nav = HTML.slice(HTML.indexOf('aria-label="Products"'), HTML.indexOf('</nav>'));
  assert.match(nav, /<span aria-current="page"[^>]*background:var\(--bg-accent\)[^>]*>Portal MVP<\/span>/);
  assert.match(nav, /<a href="NaaS Storefront.dc.html"[^>]*background:transparent[^>]*>NaaS<\/a>/);
});

test('the portal logic class parses as the runtime evals it, and the markup binds the rail and the four pages', () => {
  const open = HTML.indexOf('<script type="text/x-dc" data-dc-script>');
  const body = HTML.slice(HTML.indexOf('>', open) + 1, HTML.indexOf('</script>', open));
  class DCLogic { constructor(p) { this.props = p; } setState() {} }
  assert.doesNotThrow(() => new Function('DCLogic', `${body}\nreturn Component;`)(DCLogic));
  assert.match(HTML, /<sc-for list="\{\{ rail \}\}" as="r"/);
  for (const k of ['pgLastmile', 'pgLinks', 'pgDiscovery', 'pgRecommended']) assert.ok(HTML.includes(`{{ ${k} }}`), k);
  assert.ok(HTML.includes('{{ setFixture }}') && HTML.includes('{{ setStateB }}'));
  assert.equal(/sc-for[^>]*>[\s\S]*?<\/sc-for>/.test(HTML.slice(HTML.indexOf('<table'), HTML.indexOf('</table>'))) && HTML.includes('<table'), false, 'no sc-for inside a table');
});

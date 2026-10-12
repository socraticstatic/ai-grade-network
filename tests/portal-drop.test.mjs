import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { defaults, useData, vals } from '../naas-portal-app.js';

// The handoff (spec section 7): a portal-only zip by the drop recipe, the lookup and ways files, a README, and a way for
// the team to feed the page their own JSON (?data=<url>, or useData).
const ROOT = new URL('..', import.meta.url).pathname;
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };

test('the portal drop stages the page, its modules, the shared chrome and docs/portal, and nothing of the concept app', () => {
  const list = execFileSync('bash', ['scripts/make-drop.sh', '--portal', '--list'], { cwd: ROOT }).toString().trim().split('\n');
  for (const f of ['portal.dc.html', 'naas-portal.js', 'naas-portal-app.js', 'naas-ways.js', 'naas-data.js', 'naas-sites.js', 'naas-logic.js', 'naas-things.js', 'storefront.css', 'support.js', 'vendor/react.production.min.js', 'brand/icons/cloud.svg', 'brand/providers/azure.svg', 'fonts/README.txt', 'NOTICE', 'docs/portal/README.md', 'docs/portal/ways.json', 'docs/portal/pop-regions.json']) assert.ok(list.includes(f), f);
  for (const f of ['NaaS Storefront.dc.html', 'naas-app.js', 'personas.html', 'index.html']) assert.ok(!list.includes(f), `${f} rode along`);
  assert.ok(!list.some(f => f.startsWith('tests/') || f.startsWith('scripts/') || f.startsWith('.github/') || /\.(woff2|ttf)$/.test(f)));
});

test('the deploy workflow carries the portal zip beside the storefront zip', () => {
  const wf = readFileSync(`${ROOT}.github/workflows/gh-pages.yml`, 'utf8');
  assert.ok(wf.includes('portal-latest.zip'));
});

test('pop-regions.json is the lookup, and the README names the contract and the two files', () => {
  const pr = JSON.parse(readFileSync(`${ROOT}docs/portal/pop-regions.json`, 'utf8'));
  assert.ok(pr.rows.find(r => r.csp === 'Azure' && r.facility === 'DC2' && r.regions.includes('East US 2')));
  assert.ok(pr.rows.some(r => r.verify === true), 'unverified rows say so');
  const md = readFileSync(`${ROOT}docs/portal/README.md`, 'utf8');
  for (const w of ['circuits', 'cloudLinks', 'discovery', 'ways.json', 'pop-regions.json', '?data=']) assert.ok(md.includes(w), w);
});

test('useData installs the team\'s JSON as the fixture the page reads', () => {
  const state = { ...defaults() }; const c = { state, setState: (p) => Object.assign(state, p) };
  useData(c, { name: 'Their export', circuits: [{ siteId: 'X-1', address: { line: '1 Main', city: 'Dallas', state: 'TX', zip: '75201' }, network: null, service: 'ADI', bandwidthMbps: 500 }], cloudLinks: [], discovery: [] });
  const v = vals(c); assert.equal(v.fixtureName, 'Their export'); assert.equal(v.counts.circuits, '1'); assert.equal(v.synthetic, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { vals, init, defaults, useData } from '../naas-portal-app.js';
import * as P from '../naas-portal.js';
import { run, runCss } from '../scripts/type-consumer.mjs';

// The review's fix pass (2026-10-12): the join's case, the action rows and the fold, the stylesheet's cache-bust,
// the ?data= loader's guard and error line, the paged picker, the export's out-dir, the consumer-type gate.
if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0, location: { search: '' } };
const HTML = readFileSync(new URL('../portal.dc.html', import.meta.url), 'utf8');
const ROOT = new URL('..', import.meta.url).pathname;
const mkC = (extra = {}) => { const state = { ...defaults(), ...extra }; return { state, setState: (p) => Object.assign(state, typeof p === 'function' ? p(state) : p) }; };
const good = (id, st = 'TX') => ({ siteId: id, address: { line: '1 Main', city: 'Dallas', state: st, zip: '75201' }, network: null, service: 'ADI', bandwidthMbps: 500 });
const regions = (k) => Array.from({ length: k }, (_, i) => ({ csp: 'Azure', region: `region${i}`, vpcs: [{ id: `v${i}`, name: `v${i}`, subnets: [{ id: `s${i}`, cidr: '10.0.0.0/24' }] }] }));

test('the join reads the cloud whatever its spelling: azure, Microsoft Azure, AWS, google', () => {
  const j = P.attJoin([{ csp: 'azure', pop: { provider: 'equinix', facility: 'dc2' }, bandwidthMbps: 1000 }], [{ csp: 'Azure', region: 'eastus', vpcs: [] }]);
  assert.equal(j.get('Azure/eastus').on, true);
  assert.deepEqual(P.regionsOfPop('Microsoft Azure', { provider: 'Equinix', facility: 'DC2' }), ['East US', 'East US 2']);
  assert.deepEqual(P.regionsOfPop('Amazon Web Services', { provider: 'Equinix', facility: 'DC2' }), ['us-east-1']);
  assert.equal(P.cspOf('google cloud'), 'GCP'); assert.equal(P.cspOf('Oracle Cloud'), 'Oracle'); assert.equal(P.cspOf('AWS'), 'AWS');
  const c = mkC(); useData(c, { circuits: [], cloudLinks: [{ csp: 'azure', pop: { provider: 'equinix', facility: 'dc2' }, bandwidthMbps: 1000 }], discovery: [{ csp: 'AZURE', region: 'eastus', vpcs: [] }] });
  const v = vals(c); assert.equal(v.cl.rows[0].cloud, 'Microsoft Azure'); assert.ok(v.cl.rows[0].mark.endsWith('azure.svg')); assert.equal(v.dv.rows[0].on, true);
});

test('an action cell is compact so a row with a button stays 42px, and the picker and discovery page to the fold', () => {
  const c = mkC(); useData(c, { circuits: [], cloudLinks: [], discovery: regions(22) });
  c.state.page = 'discovery'; const d = vals(c).dv;
  assert.ok(d.rows[0].cells.find(x => x.key === 'act').cls.includes('po-actc'));
  assert.equal(d.rows.length, 12); assert.equal(d.pager, '1–12 of 22');
  c.state.page = 'recommended'; const r = vals(c).rc;
  assert.equal(r.pick.rows.length, 11, 'one fewer: the lead line sits above the picker'); assert.equal(r.pick.pager, '1–11 of 22'); assert.equal(r.pick.hasNext, true);
  r.pick.next(); assert.equal(vals(c).rc.pick.pager, '12–22 of 22');
  c.state.region = { csp: 'Azure', region: 'region0' }; const o = vals(c).rc.options[0];
  assert.ok(o.cells.find(x => x.key === 'act').cls.includes('po-actc'));
  assert.ok(HTML.includes('{{ rc.pick.pager }}'));
});

test('the deploy stamp cache-busts storefront.css on both pages', () => {
  // The stamp copies the whole working tree (about 530MB): remove it, or every test run leaves one behind
  // (2026-10-16: 57 runs had filled 28GB of the temp folder and the disk).
  const out = mkdtempSync(join(tmpdir(), 'stamp-'));
  try {
    execFileSync('bash', ['scripts/stamp-version.sh', out], { cwd: ROOT, stdio: 'ignore' });
    for (const f of ['portal.dc.html', 'NaaS Storefront.dc.html']) { const t = readFileSync(join(out, f), 'utf8'); assert.match(t, /href="\.\/storefront\.css\?v=[0-9a-f]+"/, f); assert.ok(!/storefront\.css\?v=[0-9a-f]+\?v=/.test(t)); }
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('useData keeps the page up on bad rows and says what it skipped; a failed fetch says so; the select shows Your data', async () => {
  const c = mkC();
  assert.doesNotThrow(() => useData(c, { circuits: [{ siteId: 'NOADDR' }, good('A-1'), 'junk'], cloudLinks: {}, discovery: [{ csp: 'Azure' }, { csp: 'Azure', region: 'eastus' }] }));
  const v = vals(c);
  assert.equal(v.fixture, 'remote'); assert.equal(v.counts.circuits, '1'); assert.equal(v.dv.rows.length, 1);
  assert.match(v.dataNote, /1 of 3 circuits/); assert.match(v.dataNote, /1 of 2 regions/); assert.equal(v.hasDataNote, true);
  assert.ok(HTML.includes('<option value="remote">Your data</option>') && HTML.includes('{{ dataNote }}') && HTML.includes('{{ dataError }}'));
  const d = mkC(); const was = globalThis.fetch; globalThis.fetch = async () => ({ ok: false, status: 404 });
  try { init(d, 'data=./missing.json'); await new Promise(r => setTimeout(r, 10)); } finally { globalThis.fetch = was; }
  assert.match(d.state.dataError, /Could not load \.\/missing\.json \(404\)/); assert.equal(vals(d).hasDataError, true); assert.equal(vals(d).fixtureName, 'Calloway Freight', 'the page stays up');
});

test('the export writes where it is told, so a test run never dirties the handoff files', () => {
  const out = mkdtempSync(join(tmpdir(), 'ways-'));
  try {
    execFileSync('node', ['scripts/export-ways.mjs', out], { cwd: ROOT, stdio: 'ignore' });
    assert.ok(existsSync(join(out, 'ways.json')) && existsSync(join(out, 'pop-regions.json')));
  } finally { rmSync(out, { recursive: true, force: true }); }
  const status = execFileSync('git', ['status', '--porcelain', 'docs/portal/ways.json', 'docs/portal/pop-regions.json'], { cwd: ROOT }).toString().trim();
  assert.equal(status, '', `the tracked files moved: ${status}`);
});

test('the consumer-type gate reads the stylesheet file and a page with no style block', () => {
  assert.equal(run('<p style="font-size:10px">x</p>'), '<p style="font-size:12px">x</p>');
  assert.equal(runCss('.a{font-size:10px}'), '.a{font-size:12px}');
  const page = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
  assert.equal(run(page).length, page.length, 'the storefront already passes, and the run is not a no-op by accident');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vals } from '../naas-app.js';
import { TIERS, CONN_TYPES } from '../naas-moves.js';
import * as D from '../naas-data.js';
import * as R from '../naas-round2.js';
import * as F from '../naas-flowmap.js';
import { siteModeOf, filterSites, onAtt, fmt } from '../naas-logic.js';
import { countOf, servicesOf } from '../naas-sites.js';
import { mkC } from './harness.mjs';

// Connect > Recommended (Micah, 2026-09-30): "The options don't make much sense";
// "discover options - show attributes of cost, performance and security"; "with
// AT&T tier options here's what you'd get." The page is one ranked list of moves,
// each a set grouped where one order serves it, each with three AT&T tiers.

if (typeof globalThis.window === 'undefined') globalThis.window = { scrollTo: () => {}, scrollY: 0 };
const HTML = readFileSync(new URL('../NaaS Storefront.dc.html', import.meta.url), 'utf8');
const ESTATES = ['partial', 'mature', 'trust', 'small'];
const on = (view, extra = {}) => mkC({ view, screen: 's3', tab: 'connect', cnPage: 'options', estateParam: null, ...extra });
const listOf = (view, extra) => vals(on(view, extra)).moveList;
const cat = (id) => D.CATALOG.find(p => p.id === id);
const pub = (est) => est.regionsList.filter(r => !r.priv);

// ---- each estate's moves come from its own data ----

test('Growing: the IPsec move is the five IPsec branches and the ipsec bucket', () => {
  const est = D.ESTATES.partial;
  const mv = listOf('partial').find(m => m.kind === 'sites');
  assert.ok(mv, 'no site move on Growing');
  const ipsec = est.sites.filter(x => siteModeOf(x) === 'ipsec').map(x => x.name);
  assert.deepEqual(mv.sites, ipsec);
  assert.equal(ipsec.length, 5);
  assert.match(mv.title, /^Move 5 IPsec branches onto AT&T access$/);
  const b = est.buckets.find(x => x.id === 'ipsec');
  assert.equal(mv.today.egress, b.today, 'the egress before is the ipsec bucket');
  assert.equal(b.today, 8600);
  assert.match(mv.today.cost.value, /\$8,600\/mo/);
});

test('every public region is in exactly one region move, grouped per cloud', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    const moves = listOf(view).filter(m => m.kind === 'region');
    const got = moves.flatMap(m => m.regions).sort();
    assert.deepEqual(got, pub(est).map(r => r.region).sort(), view);
    for (const m of moves) {
      const rs = est.regionsList.filter(r => m.regions.includes(r.region));
      assert.equal(new Set(rs.map(r => r.cloud)).size, 1, `${view}: ${m.title} mixes clouds`);
      assert.equal(m.wl, rs.reduce((a, r) => a + r.wl, 0), `${view}: ${m.title} workloads`);
    }
  }
});

test('every public site not on AT&T access is in exactly one site move, one per shared situation', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    const want = est.sites.filter(x => !onAtt(x) && servicesOf(x).some(v => v.key === 'tpa')).map(x => x.name).sort();
    const moves = listOf(view).filter(m => m.kind === 'sites');
    assert.deepEqual(moves.flatMap(m => m.sites).sort(), want, view);
    const modes = moves.map(m => m.mode);
    assert.equal(new Set(modes).size, modes.length, `${view}: two site moves share a situation`);
    for (const m of moves) assert.equal(m.n, est.sites.filter(x => m.sites.includes(x.name)).reduce((a, x) => a + countOf(x.name), 0), view);
  }
});

test('a business-critical region on one path, or a down link, gets a second-path move', () => {
  // Growing: finance rides one ExpressRoute into eastus, and it is flapping.
  const g = listOf('partial').filter(m => m.kind === 'second');
  assert.deepEqual(g.map(m => m.regions), [['eastus']]);
  assert.equal(g[0].title, 'Put Azure eastus on a second path');
  assert.equal(g[0].finding, 'single', 'the single-path finding backs it');
  // Established: eu-central-1 is down; eastus and westeurope carry finance on one path.
  assert.deepEqual(listOf('mature').filter(m => m.kind === 'second').flatMap(m => m.regions).sort(), ['eastus', 'eu-central-1', 'westeurope']);
  // A saturating connection that is not single-path gets a port.
  assert.deepEqual(listOf('mature').filter(m => m.kind === 'port').flatMap(m => m.regions), ['us-west-2']);
});

test('Small reads its one move off its Connect finding; Empty has none and says the one step', () => {
  const sm = listOf('small');
  assert.equal(sm.length, 1);
  assert.deepEqual(sm[0].regions, ['us-east-1', 'us-west-2']);
  assert.equal(sm[0].finding, 'onecloud');
  assert.deepEqual(sm[0].tiers.map(t => t.rung), D.ESTATES.small.findings.find(f => f.kind === 'onecloud').ladder);
  const e = vals(on('empty'));
  assert.equal(e.moveList.length, 0);
  assert.equal(e.noMoves, true);
  assert.equal(e.movesStep.label, 'Add a source');
  e.movesStep.go();
});

// ---- the before values are the current path's own figures ----

test('before values: a public region set reads its public latency and its Cost-page egress', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    const c = on(view);
    const v = vals(c);
    const bT = est.buckets.reduce((a, b) => a + b.today, 0), bF = est.buckets.reduce((a, b) => a + b.fabric, 0);
    const arb = R.arbitrage(est, bT, bT - bF);
    for (const m of v.moveList.filter(x => x.kind === 'region')) {
      const rs = est.regionsList.filter(r => m.regions.includes(r.region));
      assert.equal(m.today.egress, arb.filter(a => m.regions.includes(a.regionId)).reduce((s, a) => s + Math.round(+a.now.replace(/[$,]/g, '')), 0), `${view} ${m.title}`);
      assert.ok(rs.some(r => r.pub === m.today.ms), `${view} ${m.title}: ${m.today.ms} ms is none of its regions' public latency`);
      assert.equal(m.today.path, 'internet');
    }
    for (const m of v.moveList.filter(x => x.kind === 'second')) {
      const r = est.regionsList.find(x => x.region === m.regions[0]);
      assert.equal(m.today.ms, r.fab, `${view} ${m.title}`);
    }
  }
});

// ---- three AT&T tiers, priced from the catalog, each on its own path ----

test('every move offers exactly three tiers in the house order, Recommended preselected', () => {
  for (const view of ESTATES) for (const m of listOf(view)) {
    assert.deepEqual(m.tiers.map(t => t.tier), TIERS, `${view} ${m.title}`);
    assert.deepEqual(TIERS, ['Start here', 'Recommended', 'Full control']);
    assert.equal(m.tiers.filter(t => t.on).length, 1);
    assert.equal(m.tiers[1].on, true, `${view} ${m.title}: Recommended is not preselected`);
    for (const t of m.tiers) {
      assert.equal(t.intro, `With AT&T ${t.label} (${t.tier}), here's what you'd get:`);
      assert.ok(t.fit && t.sec.value && t.perf.value && t.cost.value, `${view} ${m.title} ${t.tier}`);
    }
  }
});

test('a finding on the Connect tab lends its ladder; otherwise the catalog serves the set, cheapest to fullest', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    for (const m of listOf(view)) {
      const f = m.finding && est.findings.find(x => x.kind === m.finding);
      if (f) { assert.equal(f.tab, 'connect'); assert.deepEqual(m.tiers.map(t => t.rung), f.ladder, `${view} ${m.title}`); continue; }
      const priced = m.tiers.map(t => t.monthly);
      assert.ok(priced.every(p => p !== null), `${view} ${m.title}: a catalog tier has no price`);
      assert.ok(priced[0] <= priced[1] && priced[1] <= priced[2], `${view} ${m.title}: ${priced.join(' > ')}`);
      for (const t of m.tiers) for (const p of t.products) assert.ok(cat(p.id), `${view}: ${p.id} is not in the catalog`);
    }
  }
});

test('each tier is priced at its catalog price, or reads Priced after survey', () => {
  for (const view of ESTATES) for (const m of listOf(view)) for (const t of m.tiers) {
    if (t.monthly === null) { assert.equal(t.price, 'Priced after survey', `${view} ${m.title} ${t.tier}`); continue; }
    const sum = t.products.reduce((a, p) => a + cat(p.id).price * p.n, 0);
    assert.equal(t.monthly, sum, `${view} ${m.title} ${t.tier}`);
    assert.equal(t.price, `Starting at ${fmt(sum)}/mo`);
  }
});

test('each tier\'s after-values follow its product\'s path', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    for (const m of listOf(view).filter(x => x.kind === 'region')) {
      const rs = est.regionsList.filter(r => m.regions.includes(r.region));
      for (const t of m.tiers.filter(x => x.covers.length === rs.length && x.monthly !== null)) {
        const path = R.PATHS.find(p => p.id === t.path);
        assert.ok(path, `${view} ${m.title} ${t.tier}: ${t.path} is not a path`);
        assert.ok(rs.some(r => path.lat(r) === t.ms), `${view} ${m.title} ${t.tier}: ${t.ms} ms is not ${t.path}'s latency`);
        // Re-pinned (2026-09-30, Cost v2: one figure, one value): a region's egress is Cost > By region's row
        // (R.arbitrage, off the buckets); a private path carries it at the AT&T price that row shows, the internet at today's.
        const arb = Object.fromEntries(R.arbitrage(est).map(a => [a.regionId, a]));
        assert.equal(t.egress, rs.reduce((a, r) => a + (path.id === 'internet' ? arb[r.region].nowN : arb[r.region].fabricN), 0), `${view} ${m.title} ${t.tier}: egress is not By region's ${path.id === 'internet' ? 'today' : 'AT&T price'}`);
      }
    }
  }
});

test('Growing\'s cheapest tier is Internet to Cloud; NetBond is Recommended; the full tier holds a hosted VPC', () => {
  const aws = listOf('partial').find(m => m.kind === 'region' && m.cloud === 'AWS');
  assert.deepEqual(aws.tiers.map(t => t.products.map(p => p.id).join('+')), ['i2c', 'netbond', 'netbond+hosted-vpc']);
  assert.deepEqual(aws.tiers.map(t => t.path), ['internet', 'netbond', 'netbond']);
  const ipsec = listOf('partial').find(m => m.kind === 'sites');
  assert.deepEqual(ipsec.tiers.map(t => t.products.map(p => p.id).join('+')), ['adi', 'ase', 'avpn']);
});

// ---- ranking ----

// Down, Over SLO, near full, then exposed or one path (a business-critical region with no backup).
const RISK = { down: 4, slo: 3, full: 2, exposed: 1, single: 1, none: 0 };
test('moves rank by net dollars saved, then by the risk they close, and show the rank', () => {
  for (const view of ESTATES) {
    const l = listOf(view);
    l.forEach((m, i) => assert.equal(m.rank, i + 1));
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1], b = l[i];
      const da = Math.max(0, a.impact), db = Math.max(0, b.impact);
      assert.ok(da > db || (da === db && RISK[a.risk] >= RISK[b.risk]), `${view}: ${a.title} (${da}, ${a.risk}) before ${b.title} (${db}, ${b.risk})`);
    }
    for (const m of l) assert.equal(m.impact, m.tiers[1].net, `${view}: impact is not Recommended's net`);
  }
  // Growing: the two priced cloud moves lead; the flapping finance path outranks the IPsec branches.
  const g = listOf('partial').map(m => m.key);
  assert.ok(g.indexOf('second:eastus') < g.indexOf('sites:ipsec'));
});

// ---- the page ----

test('one ranked list, paged to the fold; no row repeats another\'s reason', () => {
  for (const view of ESTATES) {
    const v = vals(on(view));
    assert.ok(v.moves.length <= v.movesPageSize);
    assert.match(v.movesPager.label, /^\d+–\d+ of \d+$/);
    const reasons = v.moveList.map(m => m.reason);
    assert.equal(new Set(reasons).size, reasons.length, `${view} repeats a reason`);
    for (const r of reasons) assert.doesNotMatch(r, /—|\b(?:ER|DX|EQX|GCI)\b/);
  }
});

test('Empty and Small read in words: no zero anywhere a figure would be', () => {
  for (const view of ['small', 'empty']) {
    const v = vals(on(view));
    const words = [v.movesHead, v.movesSub, v.movesEmpty, v.movesAttachLabel, ...v.moveList.flatMap(m => [m.title, m.reason, ...m.counts.map(x => x.label), m.today.sec.value, m.today.perf.value, m.today.cost.value, ...m.tiers.flatMap(t => [t.price, t.sec.value, t.perf.value, t.cost.value])])].filter(Boolean);
    for (const w of words) assert.doesNotMatch(w, /(^|[^\d.,])\$?0(?![\d.,])/, `${view}: "${w}"`);
  }
});

test('every count on a move is a button that lands on its set', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    for (const m of listOf(view)) {
      assert.ok(m.counts.length > 0, `${view} ${m.title} has no count`);
      for (const n of m.counts) {
        assert.match(n.label, /^\d[\d,]* /);
        const c = on(view);
        const mv = vals(c).moveList.find(x => x.key === m.key);
        mv.counts.find(x => x.key === n.key).go();
        if (n.kind === 'sites') {
          assert.equal(c.state.cnPage, 'picture', `${view} ${n.label}`);
          assert.deepEqual(filterSites(est.sites, c.state.siteFilter).map(x => x.name).sort(), [...m.sites].sort(), `${view} ${n.label}`);
        } else {
          assert.equal(c.state.screen, 's1');
          assert.equal(c.state.estPanel, 'clouds');
          const tr = c.state.cloudTrailE;
          assert.equal(tr[0], 'cloud:' + m.cloud, `${view} ${n.label}`);
          if (m.regions.length === 1) assert.equal(tr[1], 'region:' + m.regions[0]);
        }
      }
    }
  }
});

test('Today\'s figures are doors: latency opens the path it reports, cost opens Cost, security the set', () => {
  for (const view of ['partial', 'mature']) {
    for (const m of listOf(view).filter(x => x.kind !== 'sites')) {
      const c = on(view);
      vals(c).moveList.find(x => x.key === m.key).tPerf.go();
      assert.equal(c.state.tab, 'observe', `${view} ${m.title}`);
      assert.equal(c.state.obPanel, 'paths');
      const row = vals(c).pathTimeRows.find(r => r.sel);
      assert.ok(row, `${view} ${m.title}: no path row selected`);
      // The row is the path of the region the p95 names (Paths adds the busiest site's own access hops to it).
      assert.equal(row.key, '|' + m.today.msRegion, `${view} ${m.title}: ${row.key}`);
      assert.ok(m.regions.includes(m.today.msRegion));
    }
  }
  const c = on('partial');
  vals(c).moveList.find(m => m.kind === 'region').tCost.go();
  assert.equal(c.state.tab, 'cost');
  assert.equal(c.state.costPanel, 'money', 'a region\'s egress opens Cost > By region');
  const c2 = on('partial');
  vals(c2).moveList.find(m => m.kind === 'sites').tCost.go();
  assert.equal(c2.state.costPanel, 'bucket', 'the IPsec egress opens Cost > By bucket');
});

test('picking a tier swaps the row\'s selection and ticks the row', () => {
  const c = on('partial');
  const m = vals(c).moves[0];
  vals(c).moves[0].tiers[2].pick();
  const after = vals(c).moves.find(x => x.key === m.key);
  assert.deepEqual(after.tiers.map(t => t.on), [false, false, true]);
  assert.equal(after.sel, true);
});

// ---- the order: one compose for everything selected (the contract with connect-flow) ----

const setsOf = (c) => c.state.compose.prefillSets;
test('Attach N selected composes one order that carries every selected set', () => {
  const c = on('partial');
  const v0 = vals(c);
  assert.equal(v0.movesAttachOff, true, 'nothing selected, and Attach is live');
  const ipsec = v0.moveList.find(m => m.kind === 'sites'), aws = v0.moveList.find(m => m.kind === 'region' && m.cloud === 'AWS');
  // The IPsec move may sit on the second page; toggles work from the full list.
  ipsec.toggle(); vals(c).moveList.find(m => m.key === aws.key).toggle();
  const v = vals(c);
  assert.equal(v.movesAttachOff, false);
  assert.equal(v.movesAttachLabel, 'Attach 2 selected');
  v.movesAttach();
  assert.equal(c.state.screen, 's4');
  assert.deepEqual(setsOf(c), { sites: ipsec.sites, regions: aws.regions, tier: 'standard', connectionType: 'Layer 2 to Cloud', sourceLabel: 'Options' });
  // Sites arrive as sites, each one the estate knows with its metro.
  for (const n of setsOf(c).sites) assert.ok(D.ESTATES.partial.sites.find(x => x.name === n && x.metro), n);
});

test('a tick stays with its estate: switching estates never carries it', () => {
  const c = on('partial');
  vals(c).moveList.find(m => m.kind === 'region' && m.cloud === 'AWS').toggle();
  assert.equal(vals(c).movesAttachLabel, 'Attach 1 selected');
  c.setState({ view: 'small' });
  assert.equal(vals(c).movesAttachOff, true, 'Small inherited Growing\'s AWS tick');
  c.setState({ view: 'partial' });
  assert.equal(vals(c).movesAttachLabel, 'Attach 1 selected', 'Growing lost its tick');
});

test('a single move\'s Attach carries its own set; a second path asks for maximum resiliency', () => {
  const c = on('partial');
  vals(c).moveList.find(m => m.kind === 'second').attach();
  assert.deepEqual(setsOf(c), { sites: [], regions: ['eastus'], tier: 'maximum', connectionType: 'DataCenter/CoLocation to Cloud', sourceLabel: 'Options' });
  const c2 = on('partial');
  const aws = vals(c2).moveList.find(m => m.kind === 'region' && m.cloud === 'AWS');
  aws.attach();
  assert.deepEqual(setsOf(c2).regions, aws.regions);
  assert.equal(setsOf(c2).tier, 'standard');
  assert.equal(setsOf(c2).connectionType, 'DataCenter/CoLocation to Cloud');
  for (const t of CONN_TYPES) assert.ok(['Layer 2 to Cloud', 'VPN to Cloud', 'DataCenter/CoLocation to Cloud', 'Cloud to Cloud'].includes(t));
});

test('the picked tier sets the connection type a site set asks for', () => {
  const c = on('partial');
  const m = vals(c).moveList.find(x => x.kind === 'sites');
  m.tiers[2].pick();
  vals(c).moveList.find(x => x.key === m.key).attach();
  assert.equal(setsOf(c).connectionType, 'VPN to Cloud', 'AVPN is VPN to Cloud');
});

test('each move links to Ways to connect', () => {
  const c = on('partial');
  vals(c).moves[0].compare();
  assert.equal(c.state.cnPage, 'ways');
  assert.equal(c.state.tab, 'connect');
});

// ---- the markup ----

test('the markup draws Recommended as one list of moves with three tier columns', () => {
  const a = HTML.indexOf('<sc-if value="{{ cnIsOptions }}"');
  assert.ok(a > 0, 'the Recommended gate is gone');
  const b = HTML.indexOf('<!-- /Recommended -->', a);
  assert.ok(b > a, 'the Recommended block has no end marker');
  const blk = HTML.slice(a, b);
  assert.match(blk, /<sc-for list="\{\{ moves \}\}"/);
  assert.match(blk, /<sc-for list="\{\{ mv\.tiers \}\}"/);
  assert.match(blk, /<sc-for list="\{\{ mv\.counts \}\}"/);
  assert.match(blk, /disabled="\{\{ movesAttachOff \}\}"/);
  assert.doesNotMatch(blk, /candGroups/);
  // Nothing loops inside an svg, a table or a select (the dc-runtime foster-parents it).
  assert.doesNotMatch(blk, /<(svg|table|select)\b/);
});

// ---- second pass (2026-09-30, after the restart): before -> after on every attribute, nothing said twice ----

test('Cost reads today\'s monthly, then each tier\'s monthly after it and what that saves or adds', () => {
  for (const view of ESTATES) for (const m of listOf(view)) {
    if (m.today.mo !== null) assert.ok(m.today.cost.value.startsWith(`${fmt(m.today.mo)}/mo`), `${view} ${m.title}: ${m.today.cost.value}`);
    else assert.equal(m.today.cost.value, 'Not priced today', `${view} ${m.title}`);
    for (const t of m.tiers) {
      const at = `${view} ${m.title} ${t.tier}`;
      if (t.monthly === null) { assert.equal(t.cost.value, 'Priced after survey', at); assert.equal(t.mo, null, at); continue; }
      if (m.today.mo === null) { assert.equal(t.mo, null, at); assert.equal(t.cost.value, `Adds ${fmt(t.monthly)}/mo`, at); continue; }
      assert.equal(t.mo, m.today.mo - t.net, at);
      assert.equal(t.cost.value, `${fmt(t.mo)}/mo`, at);
      assert.equal(t.cost.delta, t.net > 0 ? `saves ${fmt(t.net)}` : t.net < 0 ? `adds ${fmt(-t.net)}` : 'same', at);
    }
  }
  // A region set after the move pays the egress at the AT&T rate plus the product.
  const aws = listOf('partial').find(m => m.kind === 'region' && m.cloud === 'AWS');
  for (const t of aws.tiers) assert.equal(t.mo, t.egress + t.monthly, t.tier);
});

test('no two moves share a clause of their reason, and a rollup reads as many', () => {
  for (const view of ESTATES) {
    const seen = new Map();
    for (const m of listOf(view)) {
      for (const cl of m.reason.replace(/\.$/, '').split(/; |\. /)) {
        assert.ok(!seen.has(cl), `${view}: "${cl}" in ${m.title} and in ${seen.get(cl)}`);
        seen.set(cl, m.title);
      }
      assert.doesNotMatch(m.reason, /\b(devices|sites|branches|offices|yards) reaches\b/, `${view} ${m.title}`);
    }
  }
  // Bank scale's Edge devices send most to us-west-2 (P.gbps), so that move names them and Azure's does not.
  const t = listOf('trust');
  assert.match(t.find(m => m.key === 'region:AWS').reason, /Edge devices reach it over/);
  assert.doesNotMatch(t.find(m => m.key === 'region:Azure').reason, /Edge devices/);
});

test('a hosted VPC names a policy only when that policy is enforced on the set\'s tags', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    for (const m of listOf(view).filter(x => x.kind === 'region')) {
      const tags = est.regionsList.filter(r => m.regions.includes(r.region)).flatMap(r => r.tags || []).map(x => x.toLowerCase());
      for (const t of m.tiers) {
        const hit = /Enforces your (.+) policy/.exec(t.fit);
        if (!hit) continue;
        const tag = hit[1].toLowerCase();
        assert.ok(tags.includes(tag), `${view} ${m.title}: ${hit[1]} is not a tag of the set`);
        assert.ok((est.policies || []).some(p => p.state === 'enforced' && p.match.toLowerCase() === 'tag ' + tag), `${view} ${m.title}: no enforced ${hit[1]} policy`);
      }
    }
  }
  // Growing's GCP regions carry AI and GPU; neither policy is enforced, so the tier says what it does instead.
  const gcp = listOf('partial').find(m => m.key === 'region:GCP');
  assert.doesNotMatch(gcp.tiers[2].fit, /policy/);
  assert.match(listOf('partial').find(m => m.key === 'region:AWS').tiers[2].fit, /^Enforces your Prod policy in path$/);
});

test('within a move no two tiers read as the same product', () => {
  for (const view of ESTATES) for (const m of listOf(view)) {
    assert.equal(new Set(m.tiers.map(t => t.label)).size, 3, `${view} ${m.title}: ${m.tiers.map(t => t.label).join(' / ')}`);
    for (const t of m.tiers) assert.ok(t.label.length <= 26, `${view} ${m.title}: "${t.label}" is too long for its column`);
  }
  assert.deepEqual(listOf('partial').find(m => m.kind === 'second').tiers.map(t => t.label), ['NetBond', 'NetBond, second metro', 'Maximum resiliency']);
  assert.deepEqual(listOf('trust').find(m => m.kind === 'sites').tiers.map(t => t.label), ['1 Connection Hub', '2 Connection Hubs', 'Hubs + SD-WAN steer']);
  assert.deepEqual(listOf('small')[0].tiers.map(t => t.label), ['NetBond, us-east-1', 'NetBond', 'Connection Hub + NetBond']);
});

test('a port move offers capacity at every tier', () => {
  const p = listOf('mature').find(m => m.kind === 'port');
  assert.deepEqual(p.tiers.map(t => t.products.map(x => `${x.id}x${x.n}`).join('+')), ['i2cx1', 'netbondx1', 'netbondx2']);
  for (const t of p.tiers) assert.match(t.perf.value, /^\d+% of \d+ Gbps$/, t.tier);
  assert.equal(p.tiers[2].label, 'NetBond, 2 ports');
});

test('a second path\'s Today reads its region\'s own health', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    for (const m of listOf(view).filter(x => x.kind === 'second')) {
      const r = est.regionsList.find(x => x.region === m.regions[0]);
      if (m.risk === 'down') assert.match(m.today.perf.value, /· Down$/, `${view} ${m.title}`);
      else if (F.regionState(r) === 'slo') assert.match(m.today.perf.value, /· over SLO$/, `${view} ${m.title}`);
      else assert.doesNotMatch(m.today.perf.value, /SLO|Down/, `${view} ${m.title}`);
    }
  }
  // Established's westeurope runs 21 ms against the 20 ms private SLO.
  assert.equal(listOf('mature').find(m => m.key === 'second:westeurope').today.perf.value, '21 ms · over SLO');
});

test('the compose screen reads the sets: regions bring their on-ramp metros, sites come as sites', () => {
  const c = on('partial');
  vals(c).moveList.find(m => m.kind === 'second').attach();
  assert.deepEqual(c.state.compose.metros, ['Ashburn'], 'eastus meets AT&T in Ashburn');
  assert.equal(c.state.compose.prefillRegion, 'Azure eastus');
  assert.equal(c.state.compose.resiliency, 'Maximum');
  const c2 = on('partial');
  vals(c2).moveList.find(m => m.kind === 'sites').attach();
  assert.deepEqual(c2.state.compose.source, ['Sites']);
  assert.deepEqual(c2.state.compose.dest, ['Clouds']);
  // None of the five branch metros is an on-ramp metro: the order asks, it never guesses.
  assert.deepEqual(c2.state.compose.metros, []);
  assert.equal(c2.state.compose.prefillRegion, null);
});

test('every tier asks the compose flow for the connection type its set and product imply', () => {
  for (const view of ESTATES) {
    const est = D.ESTATES[view];
    for (const m of listOf(view)) for (const t of m.tiers) {
      const at = `${view} ${m.title} ${t.tier}`;
      assert.ok(CONN_TYPES.includes(t.conn), at);
      if (m.kind !== 'sites') { assert.equal(t.conn, t.products.some(p => p.id === 'c2c') ? 'Cloud to Cloud' : 'DataCenter/CoLocation to Cloud', at); continue; }
      const dcs = est.sites.filter(x => m.sites.includes(x.name)).every(x => /data center/i.test(x.cls || ''));
      if (dcs) assert.equal(t.conn, 'DataCenter/CoLocation to Cloud', at);
      else assert.equal(t.conn, t.products.some(p => p.id === 'ase') ? 'Layer 2 to Cloud' : 'VPN to Cloud', at);
    }
  }
});

test('each tier shows its catalog price in its column, and the page says they are Starting at prices', () => {
  const v = vals(on('partial'));
  assert.match(v.movesWith, /Starting at/);
  for (const m of v.moveList) for (const t of m.tiers) assert.equal(t.priceShort, t.monthly === null ? '' : `${fmt(t.monthly)}/mo`);
});

/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// Connect > Recommended (Micah, 2026-09-30: "The options don't make much sense";
// "discover options - show attributes of cost, performance and security"; "with
// AT&T tier options here's what you'd get"). The estate as ranked MOVES: each a
// set that one order serves, each with three AT&T tiers and, for every tier, what
// Security, Performance and Cost would read after it against today.
//
// Pure: the view decorates. Every number comes from the estate and the models the
// other pages read: the buckets and the arbitrage split (Cost > By region), the
// path latencies (region fab and pub ms, P.path), the catalog's "Starting at",
// the cloud providers' list prices (R.CSP_PORT, R.CSP_VPN, marked modelled), the
// capacity rows (Observe > Capacity) and the open findings.
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';
import * as F from './naas-flowmap.js';
import * as R from './naas-round2.js';
import { CATALOG } from './naas-data.js';
import { fmt, siteModeOf, onAtt, regionOf } from './naas-logic.js';
import { rampName } from './naas-things.js';

/**
 * The four stations a path crosses, for the strip Govern draws (2026-10-02): today's path or a tier's.
 * The public internet has no AT&T edge and a core at risk; a third party's path is one AT&T cannot see
 * into; a hyperscaler-native path has the cloud's own edge; AT&T's path sets every station.
 */
const STATION = { site: 'Sites', edge: 'AT&T edge', core: 'AT&T core', cloud: 'Cloud' };
export function stripOf(path, opts = {}) {
  const pub = path === 'internet' || path === 'ipsec', third = path === 'sdwan' || path === 'third', nat = path === 'native';
  const word = { set: 'on the AT&T network', none: 'not on this path', risk: 'the public internet', nodata: 'not AT&T\'s to see' };
  return [
    { key: 'site', icon: 'large-building', state: 'set' },
    { key: 'edge', icon: opts.inspect ? 'check-shield' : 'firewall', state: pub ? 'none' : third || nat ? 'nodata' : 'set' },
    { key: 'core', icon: 'hub', state: pub ? 'risk' : third ? 'nodata' : 'set' },
    { key: 'cloud', icon: 'cloud', state: 'set' },
  ].map(n => ({ ...n, title: `${STATION[n.key]}: ${n.key === 'edge' && opts.inspect ? 'inspected' : n.key === 'site' || n.key === 'cloud' ? 'yours' : word[n.state]}` }));
}
/** A tier's strip: its path, inspected where a hosted product sits in it. */
export const tierStrip = (t) => stripOf(t.path, { inspect: (t.products || []).some(p => (PROD[p.id] || {}).inspect) });

/** The house tier words (naas-app.js reads these). */
export const TIERS = ['Start here', 'Recommended', 'Full control'];
/** NetBond Advanced's connection types, the contract with the compose flow. */
export const CONN_TYPES = ['Layer 2 to Cloud', 'VPN to Cloud', 'DataCenter/CoLocation to Cloud', 'Cloud to Cloud'];
/** Ranking weight of the risk a move closes, used only where dollars tie. */
export const RISK = { down: 4, slo: 3, full: 2, exposed: 1, single: 1, none: 0 };
const REC = 1;

const cat = (id) => CATALOG.find(p => p.id === id) || null;
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const plural = (n, one, many) => `${nf(n)} ${n === 1 ? one : many}`;
const andList = (xs) => (xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const lowerFirst = (t) => (t && /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t || '');
const ACRONYM = { pci: 'PCI', gpu: 'GPU', ai: 'AI', erp: 'ERP' };
const tagWord = (t, r) => { const own = ((r && r.tags) || []).find(x => x.toLowerCase() === String(t).toLowerCase()); return own || ACRONYM[String(t).toLowerCase()] || String(t).charAt(0).toUpperCase() + String(t).slice(1); };
const pathOf = (id) => R.PATHS.find(p => p.id === id);
const uptimeOf = (id) => { const p = cat(id); const u = p && (p.proof || []).find(x => /uptime/.test(x)); return u ? u.replace(/ uptime$/, '') : null; };

/**
 * What each product is, for a tier: the path its traffic takes (R.PATHS), what
 * it is bought by, the connection type it asks the compose flow for.
 */
const PROD = {
  i2c: { name: 'Internet to Cloud', path: 'internet', conn: 'VPN to Cloud', gbps: 1 },
  adi: { name: 'ADI', path: 'internet', conn: 'VPN to Cloud' },
  ase: { name: 'ASE on Demand', path: 'netbond', conn: 'Layer 2 to Cloud' },
  avpn: { name: 'AVPN', path: 'netbond', conn: 'VPN to Cloud' },
  netbond: { name: 'NetBond', path: 'netbond', gbps: 10 },
  'hosted-vpc': { name: 'Hosted VPC', path: 'netbond', inspect: true },
  'hosted-vnet': { name: 'Hosted VNet', path: 'netbond', inspect: true },
  'oracle-fc': { name: 'Oracle FastConnect', path: 'netbond' },
  neocloud: { name: 'Equinix Fabric reach', path: 'netbond' },
  lmcc: { name: 'Interconnect Last Mile', path: 'native' },
  hub: { name: 'Connection Hub', path: 'netbond', conn: 'VPN to Cloud' },
  c2c: { name: 'Cloud to Cloud', path: 'netbond', conn: 'Cloud to Cloud' },
};

/** The traffic-weighted 95th percentile of a set of paths: [{ ms, w }]. */
export function p95(pts) {
  const xs = pts.filter(p => p.w > 0).sort((a, b) => a.ms - b.ms);
  if (!xs.length) return 0;
  const tot = xs.reduce((a, p) => a + p.w, 0);
  let cum = 0;
  for (const p of xs) { cum += p.w; if (cum >= tot * 0.95) return p.ms; }
  return xs[xs.length - 1].ms;
}

/**
 * Each region's egress a month, read off Cost > By region's rows (R.arbitrage,
 * 2026-09-30): now is what it pays outside AT&T today, its own cloud's buckets only,
 * fabric what the AT&T price would carry it for once the open findings are acted on.
 * `open` is the open priced findings Cost counts as Still open, so a resolved finding
 * moves both pages alike (the skeptic, 2026-09-30: Recommended split the whole premium
 * while Cost split what was still open). A region carrying none reads $0.
 * gb is the volume that AT&T price buys at $0.02/GB, kept for the tiers' words.
 */
export function egressOf(est, base, open) {
  const arb = Object.fromEntries(R.arbitrage(est, base, open).map(a => [a.regionId, a]));
  return Object.fromEntries((est.regionsList || []).map(r => { const a = arb[r.region]; return [r.region, a ? { gb: Math.round(a.fabricN / 0.02), now: a.nowN, fabric: a.fabricN } : { gb: 0, now: 0, fabric: 0 }]; }));
}

// ---------- tiers ----------

/** A tier from its products ([[id, n]]), priced at the catalog's "Starting at". */
function tierOf(i, products, extra = {}) {
  const prods = products.map(([id, n]) => ({ id, n }));
  const priced = prods.length > 0 && prods.every(p => cat(p.id) && typeof cat(p.id).price === 'number');
  const monthly = priced ? prods.reduce((a, p) => a + cat(p.id).price * p.n, 0) : null;
  const label = extra.label || prods.map(p => (PROD[p.id] || {}).name || cat(p.id).name).join(' + ');
  const path = extra.path || (prods[0] ? (PROD[prods[0].id] || {}).path : 'netbond') || 'netbond';
  const conn = extra.conn || prods.map(p => (PROD[p.id] || {}).conn).find(Boolean) || 'DataCenter/CoLocation to Cloud';
  const breakdown = prods.map(p => `${p.n > 1 ? `${nf(p.n)} × ` : ''}${cat(p.id) ? cat(p.id).name : p.id} at ${cat(p.id) && cat(p.id).price != null ? fmt(cat(p.id).price) : 'a surveyed price'}`).join(' + ');
  return { i, tier: TIERS[i], rung: extra.rung || null, label, products: prods, path, conn, monthly,
    price: monthly === null ? 'Priced after survey' : `Starting at ${fmt(monthly)}/mo`,
    intro: `With AT&T ${label} (${TIERS[i]}), here's what you'd get:`, breakdown, fit: extra.fit || '', covers: extra.covers || [] };
}

/**
 * A Connect-tab finding lends its ladder to the move it names (the rungs are what
 * the finding said to do for this set); each rung is read for the product it buys.
 * A rung with no product reads Priced after survey.
 */
function rungProducts(rung, ctx) {
  const t = String(rung).toLowerCase(), n = ctx.regions.length || 1;
  const metros = (/\bin ([A-Z][\w ]*(?: and [A-Z][\w ]*)*)$/.exec(rung) || [])[1];
  const nMetros = metros ? metros.split(/ and /).length : 1;
  // A rung with no product is priced after a survey; its column still names it in a word or two.
  if (/second provider/.test(t)) return { products: [], path: 'native', label: /maximum/.test(t) ? 'Maximum resiliency' : 'Second provider' };
  if (/sd-?wan steer/.test(t)) return { products: [], path: 'netbond', label: /hubs/.test(t) ? 'Hubs + SD-WAN steer' : 'SD-WAN steer' };
  if (/fastconnect/.test(t)) return { products: [['oracle-fc', n]] };
  if (/multi.?cloud routing|cloud to cloud/.test(t)) return { products: [['netbond', n], ['c2c', 1]] };
  if (/connection hubs?/.test(t)) return ctx.kind === 'region'
    ? { products: [['hub', nMetros], ['netbond', n]], metros: metros ? metros.split(/ and /) : [] }
    : { products: [['hub', nMetros]], metros: metros ? metros.split(/ and /) : [], label: `${nMetros} Connection ${nMetros === 1 ? 'Hub' : 'Hubs'}` };
  if (/attach|netbond|second path|second metro|geodiversity/.test(t)) {
    const named = ctx.regions.filter(r => t.includes(r.region.toLowerCase()));
    const both = /both|every|all/.test(t);
    const cov = !both && named.length ? named : ctx.regions;
    const part = ctx.kind === 'region' && cov.length < ctx.regions.length;
    return { products: [['netbond', ctx.kind === 'region' ? cov.length : 1]], covers: cov.map(r => r.region),
      label: /second metro|geodiversity/.test(t) ? 'NetBond, second metro' : part ? `NetBond, ${andList(cov.map(r => r.region))}` : undefined };
  }
  return { products: [], label: rung };
}
function ladderTiers(f, ctx) {
  return f.ladder.slice(0, 3).map((rung, i) => {
    const rp = rungProducts(rung, ctx);
    const covers = rp.covers || ((rp.metros || []).length && ctx.kind === 'sites' ? ctx.sitesIn(rp.metros) : ctx.all);
    return tierOf(i, rp.products, { rung, fit: rung, path: rp.path, covers, label: rp.label });
  });
}

// ---------- the three attributes ----------

const TONE_OF_HEALTH = { ok: 'good', risk: 'risk', slo: 'slo', down: 'bad' };
/**
 * Cost after a tier: the set's monthly after it (today's less what the tier nets)
 * and the change, the way Performance reads its ms. With nothing priced today,
 * only what the tier adds can be said; a tier with no catalog price waits on a survey.
 */
const moneyAfter = (before, net, monthly) => (monthly === null || net === null ? null : before === null ? null : before - net);
function moneyCell(before, net, monthly) {
  if (monthly === null || net === null) return { value: 'Priced after survey', tone: 'same' };
  if (before === null) return { value: `Adds ${fmt(monthly)}/mo`, tone: 'risk' };
  const tone = net > 0 ? 'good' : net < 0 ? 'risk' : 'same';
  return { value: `${fmt(before - net)}/mo`, delta: net > 0 ? `saves ${fmt(net)}` : net < 0 ? `adds ${fmt(-net)}` : 'same', tone, dtone: tone };
}
const msDelta = (before, after) => (after < before ? { delta: `−${before - after} ms`, dtone: 'good' } : after > before ? { delta: `+${after - before} ms`, dtone: 'bad' } : { delta: 'same', dtone: 'same' });
const healthWord = (h) => (h === 'slo' ? ' · over SLO' : h === 'risk' ? ' · at risk' : '');

// ---------- the moves ----------

const MODE = {
  ipsec: { title: (n, noun) => `Move ${nf(n)} IPsec ${noun} onto AT&T access`, word: 'IPsec over the internet', find: /ipsec/i },
  sdwan: { title: (n, noun) => `Bring ${nf(n)} SD-WAN ${noun} onto AT&T`, word: 'SD-WAN over the internet', find: /sd-?wan/i },
  third: { title: (n, noun, carrier) => `Bring ${nf(n)} ${carrier ? carrier + ' ' : ''}${noun} onto AT&T access`, word: "Another carrier's access", find: /lumen|third/i },
};
const BACKS = { sites: ['nothub'], region: ['onecloud'], second: ['single'] };
const backsKind = (f, kind) => (BACKS[kind] || []).includes(f.kind) || (kind === 'region' && /^newcloud-/.test(f.kind));
const textOf = (f) => `${f.head || ''} ${f.ev || ''} ${f.pathSrc || ''} ${f.pathDst || ''}`;
const connectFinding = (findings, kind, test) => findings.find(f => f.tab === 'connect' && Array.isArray(f.ladder) && f.ladder.length >= 3 && backsKind(f, kind) && test(textOf(f)));

function siteMoves(est, ctx) {
  const off = (est.sites || []).filter(x => !onAtt(x) && S.servicesOf(x).some(v => v.key === 'tpa'));
  const modes = [...new Set(off.map(siteModeOf))];
  const bucket = (est.buckets || []).find(b => b.id === 'ipsec');
  const onAvpn = (est.sites || []).filter(x => onAtt(x) && S.servicesOf(x).some(v => v.key === 'avpn')).reduce((a, x) => a + S.countOf(x.name), 0);
  return modes.map(mode => {
    const members = off.filter(x => siteModeOf(x) === mode);
    const n = members.reduce((a, x) => a + S.countOf(x.name), 0);
    const cls = [...new Set(members.map(S.classOf))];
    const noun = cls.length === 1 && cls[0] === 'Branch' ? (n === 1 ? 'branch' : 'branches') : cls.length === 1 && cls[0] === 'Data center' ? (n === 1 ? 'data center' : 'data centers') : (n === 1 ? 'site' : 'sites');
    const carriers = [...new Set(members.map(x => x.carrier).filter(Boolean))];
    const carrier = carriers.length === 1 ? carriers[0] : '';
    const M = MODE[mode] || MODE.third;
    // Rollups that share a stem read as one phrase: "Remote sites East and Central".
    const bare = members.map(x => x.name.replace(/\s*\([\d,]+\)\s*$/, ''));
    const stems = [...new Set(bare.map(x => x.split(', ')[0]))];
    const labels = stems.length === 1 && bare.every(x => x.includes(', ')) ? [`${stems[0]} ${andList(bare.map(x => x.split(', ')[1]))}`] : bare;
    const f = connectFinding(ctx.findings, 'sites', (t) => M.find.test(t));
    const behind = ctx.findings.find(x => x.tab !== 'connect' && M.find.test(textOf(x)) && !x.priced);
    const egBefore = mode === 'ipsec' && bucket ? bucket.today : null;
    const tunnels = mode === 'ipsec' ? members.filter(x => x.tunnel).reduce((a, x) => a + S.countOf(x.name), 0) || n : 0;
    const dcOnly = cls.length === 1 && cls[0] === 'Data center';
    // Performance: each site's path to each region, weighted by what it sends (P.path, P.gbps).
    const pts = members.flatMap(x => est.regionsList.map(r => ({ ms: P.path(x, r).ms, w: P.gbps(est, x, r) * S.countOf(x.name) })));
    const ms = p95(pts);
    const hToday = F.healthOf(ms, F.SLO);
    const dest = (behind && behind.pathDst) || andList([...new Set(est.regionsList.map(r => r.cloud))]);
    // The cloud that bills the tunnels is named, the one Cost > By cloud puts them in (R.ipsecCloud, 2026-09-30).
    const tunnelCloud = mode === 'ipsec' ? R.ipsecCloud(est) : null;
    const reason = mode === 'ipsec'
      ? `${andList(members.map(x => x.metro))} reach ${dest} over IPsec on another carrier's internet${tunnelCloud ? `; ${tunnelCloud} bills their ${plural(tunnels, 'tunnel', 'tunnels')}${egBefore ? ` and ${fmt(egBefore)}/mo of their egress at internet rates` : ''}` : egBefore ? `; ${fmt(egBefore)}/mo of their egress bills at internet rates` : ''}.`
      : mode === 'sdwan'
        ? `${andList(labels)} reach the clouds over SD-WAN on another carrier's internet${f ? `; ${lowerFirst(f.head)}` : ''}.`
        : `${members.map(x => `${x.name} rides ${x.carrier || x.access}${x.xc && x.xc.at ? `, cross-connected at ${x.xc.at}` : x.via ? ` end to end into ${x.via}` : ''}`).join('; ')}. ${carrier || 'Another carrier'} holds their SLA, not AT&T.`;
    // A hub serves the rollups in its own region (Atlanta: US East).
    const ctxT = { kind: 'sites', regions: [], all: members.map(x => x.name), sitesIn: (metros) => { const regs = metros.map(m => regionOf({ metro: m, name: '' })); return members.filter(x => regs.includes(regionOf(x))).map(x => x.name); } };
    const tiers = (f ? ladderTiers(f, ctxT) : [['adi'], ['ase'], ['avpn']].map((ps, i) => tierOf(i, ps.map(id => [id, n]), { covers: ctxT.all }))).map(t => {
      const cov = t.covers.length ? members.filter(x => t.covers.includes(x.name)) : members;
      const covN = cov.reduce((a, x) => a + S.countOf(x.name), 0);
      const priv = t.path !== 'internet' && t.products.length > 0;
      const ids = t.products.map(p => p.id);
      // Why the tier fits this set, short enough to read in its column (the tooltip carries the rest).
      const fit = t.fit || (ids[0] === 'adi' ? (mode === 'ipsec' ? `Tunnels on AT&T's own internet` : `AT&T internet, not ${carrier || 'a third party'}'s`)
        : ids[0] === 'ase' ? 'Ethernet to on-ramps, same day'
          : onAvpn ? `Joins your ${nf(onAvpn)} AVPN ${onAvpn === 1 ? 'site' : 'sites'}` : 'Private WAN to every site');
      const egAfter = egBefore === null ? null : priv && covN === n ? bucket.fabric : egBefore;
      const retired = priv && mode === 'ipsec' ? tunnels * R.CSP_VPN : 0;
      const net = t.monthly === null ? null : Math.round((egBefore === null ? 0 : egBefore - egAfter) - t.monthly + retired);
      const sec = !t.products.length && !priv ? { value: `Private for ${nf(covN)}`, delta: 'steered', tone: 'good' }
        : priv ? (mode === 'third' ? { value: "AT&T's SLA end to end", delta: '', tone: 'good' }
          : ids[0] === 'hub' ? { value: `Private for ${nf(covN)}`, delta: covN === n ? '' : `of ${nf(n)}`, tone: covN === n ? 'good' : 'risk' }
            : { value: 'Private first mile', delta: mode === 'ipsec' ? `${nf(Math.min(tunnels, covN))} closed` : '', tone: covN === n ? 'good' : 'risk' })
          : mode === 'third' ? { value: 'AT&T internet, encrypted', delta: '', tone: 'bad' }
            : { value: `${mode === 'ipsec' ? 'IPsec' : 'SD-WAN'} on AT&T internet`, delta: '', tone: 'risk' };
      const mo = moneyAfter(egBefore, net, t.monthly);
      return { ...t, fit, covers: cov.map(x => x.name), ms, egress: egAfter, net, mo, modelled: retired > 0,
        sec, perf: { value: `${ms} ms p95`, delta: 'same', dtone: 'same', tone: TONE_OF_HEALTH[F.healthOf(ms, F.SLO)] },
        cost: moneyCell(egBefore, net, t.monthly),
        perfTitle: `The first mile moves to AT&T; the clouds these sites reach stay where they are, so the p95 across their paths holds at ${ms} ms against the ${F.SLO} ms SLO`,
        costTitle: [egBefore !== null ? `Egress ${fmt(egBefore)} to ${fmt(egAfter)}/mo` : 'No egress priced for these sites', t.monthly !== null ? `${t.breakdown} a site = ${fmt(t.monthly)}/mo` : 'Priced after a site survey', retired ? `${nf(tunnels)} IPsec tunnels retired at the $${R.CSP_VPN.toFixed(2)} cloud VPN list price (modelled)` : '', mo !== null ? `${fmt(mo)}/mo after, ${net >= 0 ? 'saves' : 'adds'} ${fmt(Math.abs(net))}` : ''].filter(Boolean).join(' · '),
        // Sites reach the clouds over a VPN, or Layer 2 on Switched Ethernet; data centers alone are colocation.
        conn: dcOnly ? 'DataCenter/CoLocation to Cloud' : t.products.length ? t.conn : 'VPN to Cloud' };
    });
    return {
      key: 'sites:' + mode, kind: 'sites', mode, title: M.title(n, noun, carrier), reason, finding: f ? f.kind : null,
      sites: members.map(x => x.name), regions: [], n, wl: 0, size: n, need: 'standard',
      risk: mode === 'third' ? 'none' : hToday === 'slo' ? 'slo' : 'exposed',
      today: { path: mode === 'ipsec' ? 'ipsec' : mode === 'sdwan' ? 'sdwan' : 'third', pathWord: M.word, ms, egress: egBefore, mo: egBefore,
        sec: mode === 'third' ? { value: `Private on ${carrier || 'another carrier'}`, tone: 'same' } : { value: mode === 'ipsec' ? `IPsec · ${plural(tunnels, 'endpoint', 'endpoints')} public` : `Internet · ${nf(n)} exposed`, tone: 'risk' },
        perf: { value: `${ms} ms p95${healthWord(hToday)}`, tone: TONE_OF_HEALTH[hToday] },
        cost: egBefore !== null ? { value: `${fmt(egBefore)}/mo egress`, tone: 'same' } : { value: 'Not priced today', tone: 'same' } },
      counts: [{ key: 'sites', kind: 'sites', label: `${nf(n)} ${noun}` }],
      tiers,
    };
  });
}
// The catalog products that serve a public region set, cheapest to fullest, each with
// the short name its column can hold (the full catalog name is in the tooltip).
function regionLadder(cloud) {
  if (/CoreWeave|Lambda|Nebius/.test(cloud)) return [[['i2c']], [['neocloud']], [['neocloud', 'c2c'], 'Neocloud + multi-cloud']];
  if (/Oracle/.test(cloud)) return [[['i2c']], [['oracle-fc']], [['oracle-fc', 'c2c'], 'FastConnect + multi-cloud']];
  const hosted = ['hosted-vpc', 'hosted-vnet'].find(id => (cat(id).tags || []).includes(cloud === 'Google Cloud' ? 'GCP' : cloud));
  return [[['i2c']], [['netbond']], hosted ? [['netbond', hosted]] : [['netbond', 'c2c'], 'NetBond + multi-cloud']];
}
function appsIn(inv, ids) {
  const n = {};
  (inv || []).forEach(c => (c.regions || []).filter(r => ids.includes(r.region)).forEach(r => (r.vpcs || []).forEach(v => (v.subnets || []).forEach(sn => (sn.workloads || []).forEach(w => (w.endpoints || []).forEach(e => { if (e.app && e.app !== 'otel-agent') n[e.app] = (n[e.app] || 0) + 1; }))))));
  return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
}

function regionMoves(est, ctx) {
  const pubRs = (est.regionsList || []).filter(r => !r.priv);
  const clouds = [...new Set(pubRs.map(r => r.cloud))];
  const eg = ctx.egress;
  // A site already on AT&T access whose cloud leg is public belongs to the public
  // region it sends the most to (P.gbps), so one move names it and no other does.
  const homeOf = (x) => pubRs.reduce((best, r) => (P.gbps(est, x, r) > P.gbps(est, x, best) ? r : best), pubRs[0]).region;
  const viaAll = (est.sites || []).filter(x => !x.priv && onAtt(x)).map(x => ({ x, home: homeOf(x) }));
  // An internet arc between two regions is told once, by the first move that touches it.
  const arcsTold = new Set();
  const policyTags = new Set((est.policies || []).filter(p => p.state === 'enforced' && /^tag /.test(p.match || '')).map(p => p.match.slice(4).toLowerCase()));
  return clouds.map(cloud => {
    const rs = pubRs.filter(r => r.cloud === cloud), ids = rs.map(r => r.region);
    const wl = rs.reduce((a, r) => a + r.wl, 0);
    const tags = [...new Set(rs.flatMap(r => r.tags || []))];
    const apps = appsIn(ctx.inv, ids);
    const f = connectFinding(ctx.findings, 'region', (t) => ids.every(id => t.includes(id)));
    const w = (r) => r.wl || 1;
    const ms = p95(rs.map(r => ({ ms: r.pub, w: w(r) })));
    const hToday = F.healthOf(ms, F.SLO);
    const egNow = rs.reduce((a, r) => a + eg[r.region].now, 0);
    // The finding behind it, specific to these regions: an open finding (not a Connect ladder) that names one of them.
    const behind = ctx.findings.find(x => x.tab !== 'connect' && !/^(unmonitored|blindspots|degraded|avoidable|crosscloud|onecloud)$/.test(x.kind) && !/^newcloud-/.test(x.kind) && ids.some(id => textOf(x).includes(id)));
    const arc = (est.arcs || []).find(a => !a.priv && (ids.includes(a.from) || ids.includes(a.to)) && !arcsTold.has(`${a.from}>${a.to}`));
    const over = rs.filter(r => r.pub > F.SLO).map(r => r.region);
    const extra = behind ? lowerFirst(behind.head) : over.length ? `${andList(over)} ${over.length === 1 ? 'runs' : 'run'} over the ${F.SLO} ms SLO` : arc ? `${arc.from} to ${arc.to} crosses the internet too` : '';
    if (arc && extra.startsWith(`${arc.from} to ${arc.to}`)) arcsTold.add(`${arc.from}>${arc.to}`);
    // Sites already on AT&T access whose public leg is this cloud side: this move is theirs, so it names them.
    const via = viaAll.filter(v => ids.includes(v.home)).map(v => v.x);
    const viaNames = via.slice(0, 2).map(x => x.name.replace(/\s*\([\d,]+\)\s*$/, '')).concat(via.length > 2 ? [`${via.length - 2} more`] : []);
    const viaMany = via.length > 1 || (via[0] && S.countOf(via[0].name) > 1);
    const viaClause = via.length ? `${andList(viaNames)} ${viaMany ? 'reach' : 'reaches'} ${rs.length === 1 ? 'it' : 'them'} over ${andList([...new Set(via.map(x => S.servicesOf(x)[0].label))])}` : '';
    const reason = `${plural(wl, 'workload', 'workloads')}${tags.length ? ` (${tags.join(', ')})` : ''} in ${andList(ids)}${apps.length ? ` run ${andList(apps)}` : ''} over the public internet at ${andList([...new Set(rs.map(r => r.pub))].map(String))} ms${[extra, viaClause].filter(Boolean).map(x => `; ${x}`).join('')}.`;
    const ctxT = { kind: 'region', regions: rs, all: ids };
    const ladder = f ? ladderTiers(f, ctxT) : regionLadder(cloud).map(([ps, label], i) => tierOf(i, ps.map(id => [id, id === 'c2c' ? 1 : rs.length]), { covers: ids, label }));
    const tiers = ladder.map(t => {
      const cov = t.covers.length ? rs.filter(r => t.covers.includes(r.region)) : rs;
      const P0 = pathOf(t.path) || pathOf('netbond');
      const lat = (r) => (cov.includes(r) && t.products.length ? P0.lat(r) : r.pub);
      const msA = p95(rs.map(r => ({ ms: lat(r), w: w(r) })));
      const allPriv = cov.length === rs.length && t.path !== 'internet' && t.products.length > 0;
      const hA = F.healthOf(msA, allPriv ? F.SLO_PRIVATE : F.SLO);
      // A private path carries a covered region's egress at the AT&T price Cost shows; the internet keeps today's bill.
      const egA = rs.reduce((a, r) => a + (cov.includes(r) && t.products.length && P0.id !== 'internet' ? eg[r.region].fabric : eg[r.region].now), 0);
      const net = t.monthly === null ? null : egNow - egA - t.monthly;
      const inspect = t.products.some(p => (PROD[p.id] || {}).inspect);
      const ids0 = t.products.map(p => p.id);
      // A hosted VPC enforces a policy in path only where one is enforced on these tags (Govern > Policies).
      const enforced = tags.find(tg => policyTags.has(String(tg).toLowerCase()));
      const hostedWord = ids0.includes('hosted-vnet') ? 'VNet' : 'VPC';
      const fit = t.fit || (ids0[0] === 'i2c' ? `Encrypted, up to 1 Gbps a region`
        : inspect ? (enforced ? `Enforces your ${enforced} policy in path` : `Inspected in AT&T's ${hostedWord}`)
          : ids0.includes('c2c') ? 'Joined to your other clouds'
            : `${plural(wl, 'workload', 'workloads')} at $0.02/GB`);
      const sec = t.path === 'internet' ? { value: 'Encrypted, still public', delta: '', tone: 'risk' }
        : !t.products.length ? { value: 'Private, two providers', delta: '', tone: 'good' }
          : cov.length < rs.length ? { value: `Private for ${cov.length} of ${rs.length}`, delta: `${rs.length - cov.length} public`, tone: 'risk' }
            : { value: inspect ? 'Private and inspected' : t.path === 'native' ? 'Private, two paths' : 'Private, off the internet', delta: '', tone: 'good' };
      const mo = moneyAfter(egNow, net, t.monthly);
      return { ...t, fit, covers: cov.map(r => r.region), ms: msA, egress: egA, net, mo,
        sec, perf: { value: `${msA} ms p95${healthWord(hA)}`, ...msDelta(ms, msA), tone: TONE_OF_HEALTH[hA] },
        cost: moneyCell(egNow, net, t.monthly),
        perfTitle: `p95 across ${andList(ids)}, weighted by workloads, ${ms} to ${msA} ms; ${allPriv ? `a private path is held to the ${F.SLO_PRIVATE} ms SLO` : `a public path to the ${F.SLO} ms SLO`}`,
        costTitle: [`Egress ${fmt(egNow)} to ${fmt(egA)}/mo (${t.path === 'internet' || !t.products.length ? 'at public rates' : 'at the AT&T price Cost > By region shows'}, modelled)`, t.monthly !== null ? `${t.breakdown} = ${fmt(t.monthly)}/mo` : 'Priced after survey', mo !== null ? `${fmt(mo)}/mo after, ${net >= 0 ? 'saves' : 'adds'} ${fmt(Math.abs(net))}` : ''].filter(Boolean).join(' · ') };
    });
    return {
      key: 'region:' + cloud, kind: 'region', cloud, title: rs.length === 1 ? `Put ${cloud} ${ids[0]} on the AT&T network` : `Put ${rs.length} ${cloud} regions on the AT&T network`,
      reason, finding: f ? f.kind : null, sites: [], regions: ids, n: 0, wl, size: wl, need: 'standard',
      gb: Object.fromEntries(rs.map(r => [r.region, eg[r.region].gb])),
      risk: rs.some(r => F.regionState(r) === 'slo') ? 'slo' : 'exposed',
      today: { path: 'internet', pathWord: 'Public internet', ms, msRegion: (rs.find(r => r.pub === ms) || rs[0]).region, egress: egNow, mo: egNow,
        sec: { value: `Public · ${plural(wl, 'workload', 'workloads')}`, tone: 'risk' },
        perf: { value: `${ms} ms p95${healthWord(hToday)}`, tone: TONE_OF_HEALTH[hToday] },
        cost: { value: `${fmt(egNow)}/mo egress`, tone: 'same' } },
      counts: [{ key: 'regions', kind: 'regions', label: plural(rs.length, 'region', 'regions') }, { key: 'workloads', kind: 'workloads', label: plural(wl, 'workload', 'workloads') }],
      tiers: tiers.map(t => ({ ...t, conn: t.conn === 'Cloud to Cloud' ? 'Cloud to Cloud' : 'DataCenter/CoLocation to Cloud' })),
    };
  });
}

/** The regions an enforced policy makes business-critical that ride one path (the Cost > Optimize Resiliency rule). */
export function criticalSingles(est, apps) {
  const critical = new Set((est.policies || []).filter(p => p.state === 'enforced').map(p => String(p.match || '').replace(/^(tag|remote-site)\s+/, '').toLowerCase()));
  const by = {};
  (apps || []).filter(a => critical.has(String(a.tag).toLowerCase())).forEach(a => (a.parts || []).filter(pt => pt.share >= 0.05).forEach(pt => {
    const r = (est.regionsList || []).find(x => x.region === pt.region);
    if (r && r.priv && (r.paths || 1) < 2) (by[r.region] = by[r.region] || []).push(a.tag);
  }));
  return by;
}
// The current connection's own monthly: AT&T's NetBond on-ramp at the catalog, a cloud port at its list price (modelled).
function portCost(r, capRow) {
  if (r.ramp === 'NetBond' || !r.ramp) return { v: cat('netbond').price, modelled: false, word: 'NetBond' };
  const L = R.CSP_PORT[r.cloud];
  if (!L || r.ramp === 'EQX') return null;
  const ports = (capRow && capRow.ports) || 1, size = capRow && capRow.portG === 1 ? '1G' : '10G';
  return { v: ports * (L[size] || L['10G']) + (L.vlan || 0), modelled: true, word: rampName(r) };
}
// A second path: an encrypted backup, a NetBond beside it, then two metros (AWS's
// managed Last Mile where the cloud offers it). A port: overflow, one more port, two.
// Each rung: [[product, count], ...] and, where the products alone would read alike, a label.
function resilLadder(r) {
  return [[[['i2c', 1]]], [[['netbond', 1]]], r.cloud === 'AWS' ? [[['lmcc', 1]]] : [[['netbond', 2]], 'NetBond, two metros']];
}
const PORT_LADDER = [[[['i2c', 1]]], [[['netbond', 1]]], [[['netbond', 2]], 'NetBond, 2 ports']];

function pathMoves(est, ctx) {
  const single = criticalSingles(est, ctx.apps);
  const capBy = Object.fromEntries((ctx.capacity || []).map(c => [c.region, c]));
  const out = [];
  for (const r of (est.regionsList || []).filter(x => x.priv)) {
    const cap = capBy[r.region];
    const down = F.regionState(r) === 'down' || (cap && cap.state === 'down');
    const full = cap && cap.state === 'risk';
    const f = connectFinding(ctx.findings, 'second', (t) => t.includes(r.region));
    const one = (r.paths || 1) < 2;
    const isSecond = (one && (single[r.region] || down)) || !!f || (down && !one);
    const isPort = !isSecond && full;
    if (!isSecond && !isPort) continue;
    const kind = isSecond ? 'second' : 'port';
    const tagsC = [...new Set(single[r.region] || [])].map(t => tagWord(t, r));
    const apps = appsIn(ctx.inv, [r.region]);
    const ramp = rampName(r);
    const ms = r.fab;
    const curPath = R.regionPath(r);
    const relBefore = (pathOf(curPath) || {}).rel;
    const pc = portCost(r, cap);
    const subject = tagsC.length ? andList(tagsC) : `${plural(r.wl, 'workload', 'workloads')}`;
    const reason = kind === 'second'
      ? `${subject} ${tagsC.length === 1 ? 'rides' : 'ride'} ${one ? 'one' : 'a'} ${ramp} into ${r.region}${tagsC.length ? ` (${plural(r.wl, 'workload', 'workloads')}${apps.length ? `: ${andList(apps)}` : ''})` : ''}${down ? ', and BGP is flapping on it now' : ''}${full ? `; it peaks at ${cap.peakPct}% of ${cap.capG} Gbps` : ''}.`
      : `${r.cloud} ${r.region}'s ${ramp} peaks at ${cap.peakPct}% of ${cap.capG} Gbps and fills ${cap.fullIn === 'Now' ? 'now' : cap.fullIn}; ${(r.tags || []).length ? (r.tags || []).join(', ') + ' ' : ''}(${plural(r.wl, 'workload', 'workloads')}) ${r.wl === 1 ? 'rides' : 'ride'} it.`;
    const ctxT = { kind: 'second', regions: [r], all: [r.region] };
    const ladder = f ? ladderTiers(f, ctxT) : (kind === 'port' ? PORT_LADDER : resilLadder(r)).map(([ps, label], i) => tierOf(i, ps, { covers: [r.region], label }));
    const before = pc ? Math.round(pc.v) : null;
    const tiers = ladder.map(t => {
      const ids = t.products.map(p => p.id);
      const addG = t.products.reduce((a, p) => a + ((PROD[p.id] || {}).gbps || 0) * p.n, 0);
      const up = ids.length ? uptimeOf(ids[0]) : null;
      const net = t.monthly === null ? null : -t.monthly;
      const twoMetro = kind === 'second' && ((ids[0] === 'netbond' && t.products[0].n > 1) || ids[0] === 'lmcc' || /second metro|geodiversity/i.test(t.rung || ''));
      const beside = ramp === 'NetBond' ? 'A second NetBond path' : `Beside the ${ramp}`;
      const fit = t.fit || (kind === 'port' ? (ids[0] === 'i2c' ? 'Takes 1 Gbps of overflow' : `Adds ${addG} Gbps beside it`)
        : ids[0] === 'i2c' ? 'Encrypted backup, up to 1 Gbps'
          : ids[0] === 'lmcc' ? 'Two metros, managed failover'
            : twoMetro ? 'Survives a metro outage' : beside);
      // A port changes headroom, not exposure: only overflow onto the internet reads public.
      const sec = kind === 'port' ? (t.path === 'internet' ? { value: 'Overflow rides public', delta: '', tone: 'risk' } : { value: 'Private, as today', delta: '', tone: 'good' })
        : t.path === 'internet' ? { value: 'Encrypted backup, public', delta: '', tone: 'risk' }
          : { value: !ids.length ? 'Private, two providers' : twoMetro ? 'Private, two metros' : 'Private, two paths', delta: '', tone: 'good' };
      const perf = kind === 'port' && addG
        ? { value: `${Math.round(cap.peakG / (cap.capG + addG) * 100)}% of ${cap.capG + addG} Gbps`, delta: `+${addG} Gbps`, dtone: 'good', tone: 'good' }
        : { value: up ? `${ms} ms, backup ${up}` : `${ms} ms, survives a drop`, delta: '', tone: TONE_OF_HEALTH[F.healthOf(ms, F.SLO_PRIVATE)] };
      const mo = moneyAfter(before, net, t.monthly);
      return { ...t, fit, ms, egress: null, net, mo, sec, perf, cost: moneyCell(before, net, t.monthly),
        perfTitle: kind === 'port' ? `Peak ${cap.peakG} Gbps over ${cap.capG} Gbps today${addG ? `, over ${cap.capG + addG} Gbps with ${addG} more` : ''}` : `${ms} ms on the ${ramp} stays; a second path keeps it up when one drops${up ? ` (${up} uptime, the catalog's figure)` : ''}`,
        costTitle: t.monthly !== null ? `${t.breakdown} = ${fmt(t.monthly)}/mo, beside ${pc ? `the ${fmt(pc.v)}/mo ${pc.word}${pc.modelled ? ' (list price, modelled)' : ''}` : `the ${ramp}`}${mo !== null ? ` · ${fmt(mo)}/mo after` : ''}` : 'Priced after survey',
        conn: 'DataCenter/CoLocation to Cloud' };
    });
    const state = down ? 'down' : F.regionState(r);
    out.push({
      key: kind + ':' + r.region, kind, cloud: r.cloud, title: kind === 'second' ? `Put ${r.cloud} ${r.region} on a second path` : `Add a port to ${r.cloud} ${r.region}`,
      reason, finding: f ? f.kind : null, sites: [], regions: [r.region], n: 0, wl: r.wl, size: r.wl, need: kind === 'second' ? 'maximum' : 'standard',
      risk: down ? 'down' : state === 'slo' ? 'slo' : full ? 'full' : 'single',
      today: { path: curPath, pathWord: `${ramp}${one ? ', one path' : `, ${r.paths} paths`}`, ms, msRegion: r.region, egress: null, mo: before,
        sec: { value: `Private · ${one ? 'one path' : `${r.paths} paths`}`, tone: one ? 'risk' : 'same' },
        // The region's own health (the one latency rule): Down, over the private SLO, or its path's uptime.
        perf: kind === 'port' ? { value: `${cap.peakPct}% of ${cap.capG} Gbps`, tone: 'risk' }
          : { value: `${ms} ms · ${down ? 'Down' : state === 'slo' ? 'over SLO' : `${relBefore}%`}`, tone: down ? 'bad' : state === 'slo' ? 'slo' : 'same' },
        cost: pc ? { value: `${fmt(before)}/mo ${pc.word === 'NetBond' ? 'NetBond' : cap && cap.ports > 1 ? 'ports' : 'port'}`, tone: 'same', modelled: pc.modelled } : { value: 'Not priced today', tone: 'same' } },
      counts: [{ key: 'workloads', kind: 'workloads', label: plural(r.wl, 'workload', 'workloads') }],
      tiers,
    });
  }
  return out;
}

/**
 * The estate as ranked moves. ctx: { findings (open, non-event), capacity
 * (OD.capacity rows), apps (appsOf), inv (A.inventory), base (the egress base) }.
 * Ranked by what the Recommended tier nets a month (never below zero), then by
 * the risk it closes: Down, Over SLO, near full, exposed or one path.
 */
export function movesOf(est, ctx = {}) {
  if (!est || est.stage === 'empty' || !(est.regionsList || []).length) return [];
  const findings = (ctx.findings || est.findings || []).filter(f => !f.event);
  // The open findings price the egress after, as Cost's Still open does.
  const c = { findings, capacity: ctx.capacity || [], apps: ctx.apps || [], inv: ctx.inv || [], egress: egressOf(est, ctx.base, findings.filter(f => f.priced)) };
  const moves = [...regionMoves(est, c), ...pathMoves(est, c), ...siteMoves(est, c)]
    .map(m => ({ ...m, impact: m.tiers[REC].net, tiers: m.tiers.map(t => ({ ...t, rec: t.i === REC })) }));
  moves.sort((a, b) => Math.max(0, b.impact || 0) - Math.max(0, a.impact || 0) || RISK[b.risk] - RISK[a.risk] || b.size - a.size || a.title.localeCompare(b.title));
  return moves.map((m, i) => ({ ...m, rank: i + 1 }));
}

/**
 * The one order for everything picked (the contract with the compose flow):
 * sites as the estate's sites, regions as region ids, the resiliency the moves
 * need, and the connection type the picked tier asks for. Sites decide the type
 * when an order carries any. picks: [{ move, tier }] in rank order.
 */
export function attachSets(picks) {
  const uniq = (xs) => [...new Set(xs)];
  const lead = picks.find(p => p.move.sites.length) || picks[0];
  return {
    sites: uniq(picks.flatMap(p => p.move.sites)),
    regions: uniq(picks.flatMap(p => p.move.regions)),
    tier: picks.some(p => p.move.need === 'maximum') ? 'maximum' : picks.some(p => p.move.need === 'geodiversity') ? 'geodiversity' : 'standard',
    connectionType: lead ? lead.move.tiers[lead.tier].conn : 'DataCenter/CoLocation to Cloud',
    sourceLabel: 'Options',
  };
}

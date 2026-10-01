/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
import * as S from './naas-sites.js';
// Stakeholder round 2: path tradeoffs, health, endpoints/resources, Observe cuts, Cost arbitrage.
import { fmt, pct, connModeOf, attHolds, siteModeOf } from './naas-logic.js';
import { CATALOG } from './naas-data.js';
import { agoOf, hhmm, startOf, INCIDENT_MIN } from './naas-schedule.js';
import { regionState, RAMP_NAME, HEALTH_INK, healthOf, SLO as SLO_PUBLIC, SLO_PRIVATE } from './naas-flowmap.js';
import { rampName } from './naas-things.js';
import { bucketInk } from './naas-cost-view.js';
import { egressByRegion, openByRegion, bucketWeights } from './naas-lifecycle.js';

// ---------- Three paths x four lenses ----------
export const PATHS = [
  { id: 'netbond', name: 'NetBond on the AT&T network', short: 'NetBond', rel: 99.99, relLabel: '99.99% · dual PE, managed failover', lat: (r) => r.fab, latLabel: (r) => `${r.fab} ms · deterministic`, egress: 0.02, sec: 'Private · never on the internet · inline inspection available', secScore: 3, relScore: 3, latScore: 3, costScore: 3, setup: 'From 10 business days · AT&T provisions both ends', tone: '#0057b8' },
  { id: 'native', name: 'Hyperscaler-native (Direct Connect, ExpressRoute, Interconnect)', short: 'Hyperscaler-native', rel: 99.9, relLabel: '99.9% · single circuit unless you buy two', lat: (r) => r.fab + 3, latLabel: (r) => `${r.fab + 3} ms · deterministic`, egress: 0.02, sec: 'Private · one cloud at a time · you run the routers', secScore: 2, relScore: 2, latScore: 3, costScore: 2, setup: '4 to 8 weeks · you order the port, the LOA, the cross-connect', tone: '#5d6f80' },
  { id: 'internet', name: 'Internet attach (IPsec over public transit)', short: 'Internet attach', rel: 99.5, relLabel: '99.5% · best effort, no SLA on the middle', lat: (r) => r.pub, latLabel: (r) => `${r.pub} ms · varies by hour`, egress: 0.09, sec: 'Encrypted but exposed · hyperscaler egress path · no inspection', secScore: 1, relScore: 1, latScore: 1, costScore: 1, setup: 'Same day · nothing to order', tone: '#8a949c' },
];
export const LENSES = [
  { id: 'security', label: 'Security', q: 'Does it ever touch the public internet?' },
  { id: 'performance', label: 'Performance', q: 'What latency, and is it the same at 3pm and 3am?' },
  { id: 'reliability', label: 'Reliability', q: 'What uptime, and who fixes it?' },
  { id: 'cost', label: 'Cost', q: 'What does a GB cost to move, and what does the path cost to keep?' },
];
const GB_PER_WL_MO = 42;
// Scale GB per workload so that public regions' egress at $0.09 equals the estate's public egress spend.
function gbPerWl(est, base) { const pubWl = est.regionsList.filter(r => !r.priv).reduce((a, r) => a + r.wl, 0); const totalWl = est.regionsList.reduce((a, r) => a + r.wl, 0) || 1; const pubShare = pubWl / totalWl; const pubSpend = base * (pubShare * 0.09 / (pubShare * 0.09 + (1 - pubShare) * 0.02) || 0); return pubWl && base ? pubSpend / 0.09 / pubWl : GB_PER_WL_MO; }
export function regionPath(r) { const m = connModeOf(r); return m === 'netbond' ? 'netbond' : m === 'internet' ? 'internet' : 'native'; }
export function compareRegion(r, base, est) {
  const gb = Math.round(r.wl * (r.gbPerWl || GB_PER_WL_MO)), cur = regionPath(r);
  return PATHS.map(p => ({ ...p, cur: p.id === cur, egressMo: Math.round(gb * p.egress), latMs: p.lat(r), latText: p.latLabel(r), gbF: gb.toLocaleString('en-US'), math: `${gb.toLocaleString('en-US')} GB × $${p.egress.toFixed(2)} = ${fmt(Math.round(gb * p.egress))}/mo` }));
}
export function lensScore(r, lens) {
  const p = PATHS.find(x => x.id === regionPath(r));
  const s = { security: p.secScore, performance: r.rel === 'warn' ? 1 : p.latScore, reliability: r.rel === 'warn' ? 1 : p.relScore, cost: p.costScore }[lens];
  return s; // 3 good, 2 fair, 1 poor
}
export const SCORE_COLOR = { 3: 'var(--success)', 2: 'var(--warning)', 1: 'var(--error)' };
export const SCORE_WORD = { 3: 'good', 2: 'fair', 1: 'poor' };
export function lensVerdict(est, lens) {
  const rs = est.regionsList; if (!rs.length) return 'Nothing connected yet.';
  const poor = rs.filter(r => lensScore(r, lens) === 1), fair = rs.filter(r => lensScore(r, lens) === 2);
  const gbPub = rs.filter(r => !r.priv).reduce((a, r) => a + r.wl * GB_PER_WL_MO, 0);
  return {
    security: `${poor.length} of ${rs.length} regions touch the public internet. ${rs.length - poor.length} never do.`,
    performance: `${poor.length} ${poor.length === 1 ? 'region runs' : 'regions run'} above 100 ms or with loss; the AT&T network path to the same regions is ${Math.min(...rs.map(r => r.fab))}–${Math.max(...rs.map(r => r.fab))} ms, every hour.`,
    reliability: `${rs.length - poor.length - fair.length} regions at 99.99%, ${fair.length} at 99.9% on a single native circuit, ${poor.length} best-effort.`,
    cost: `${gbPub.toLocaleString('en-US')} GB/mo leaves on public rates at $0.09. The same bytes on AT&T: $0.02, ${fmt(Math.round(gbPub * 0.07))}/mo less.`,
  }[lens];
}

// ---------- Health ----------
export function health(est, ob, steered, now = Date.now()) {
  const rs = est.regionsList;
  const age = (k) => agoOf(startOf(k, now, INCIDENT_MIN[k]), now);
  const regionHealth = {};
  // One rule (2026-09-30): a degraded link is red, over SLO or a latency spike is amber.
  rs.forEach(r => { const st = regionState(r); regionHealth[r.region] = st === 'down' ? 'red' : st === 'slo' || r.rel === 'warn' ? 'amber' : 'green'; });
  const amber = Object.values(regionHealth).filter(h => h !== 'green').length;
  // Incidents come from the one list, OD.problems (2026-09-30).
  const incidents = [];
  const uptime = rs.length ? (rs.reduce((a, r) => a + (r.priv ? 99.99 : 99.5), 0) / rs.length).toFixed(2) : '';
  return { regionHealth, amber, incidents, strip: rs.length ? [
    { key: 'up', l: 'Uptime', v: uptime + '%', tone: 'var(--success)' },
    { key: 'p95', l: 'P95 latency', v: ob.kpis[1].v + ' ms', tone: +ob.kpis[1].v > 100 ? 'var(--warning)' : 'var(--success)' },
    { key: 'loss', l: 'Packet loss', v: ob.kpis[2].v + '%', tone: +ob.kpis[2].v > 0.1 ? 'var(--warning)' : 'var(--success)' },
    { key: 'inc', l: 'Incidents', v: String(incidents.length), tone: incidents.length ? 'var(--warning)' : 'var(--success)' },
    { key: 'ctl', l: 'On AT&T', v: ob.covPct + '%', tone: 'var(--link)' },
  ] : [] };
}

// ---------- Endpoints and resources (below subnet) ----------
const RES = { alb: ['ALB', 'Load balancer'], api: ['API GW', 'API gateway'], web: ['EC2', 'Web tier'], nat: ['Bastion', 'Bastion host'], app: ['EKS', 'App service'], db: ['RDS', 'Database'], cache: ['ElastiCache', 'Cache'], worker: ['Batch', 'Batch worker'], gpu: ['p5.48xl', 'GPU inference'], queue: ['SQS', 'Message queue'] };
// Each cloud's own name for the service RES names in AWS. Oracle and CoreWeave fell
// through to AWS (review 2, 2026-10-01): arn:aws, EC2 and EKS on an Oracle workload.
const SVC_OF = {
  Azure: { EC2: 'VM', EKS: 'AKS', RDS: 'Azure SQL', ElastiCache: 'Redis Cache', ALB: 'App Gateway', 'API GW': 'APIM', SQS: 'Service Bus' },
  GCP: { EC2: 'GCE', EKS: 'GKE', RDS: 'Cloud SQL', ElastiCache: 'Memorystore', ALB: 'Cloud LB', 'API GW': 'Apigee', SQS: 'Pub/Sub' },
  Oracle: { EC2: 'Compute', VM: 'Compute', Batch: 'Compute', EKS: 'OKE', RDS: 'Base Database', ElastiCache: 'OCI Cache', ALB: 'Load Balancer', 'API GW': 'API Gateway', SQS: 'Queue', 'p5.48xl': 'BM.GPU.H100.8' },
  // CoreWeave runs its workloads on its Kubernetes service; a GPU one is an H100 node.
  CoreWeave: { EC2: 'CKS', VM: 'CKS', Batch: 'CKS', EKS: 'CKS', RDS: 'CKS', ElastiCache: 'CKS', 'API GW': 'CKS', SQS: 'CKS', ALB: 'Load Balancer', 'p5.48xl': 'gd-8xh100ib-i128' },
};
// The OCID resource type an OCI service's resources carry; everything else is a compute instance.
const OCID_TYPE = { 'Load Balancer': 'loadbalancer', 'Base Database': 'dbsystem', 'OCI Cache': 'rediscluster', 'API Gateway': 'apigateway', Queue: 'queue', Bastion: 'bastion' };
export function endpointsFor(w, cloud) {
  const kind = w.name.split('-')[0];
  const [svc, role] = RES[kind] || ['VM', 'Compute'];
  const svcName = (SVC_OF[cloud] || {})[svc] || svc;
  const tag = w.tag || 'default', uid = `${(w.ip || '').split('.').slice(2).join('')}${kind.length}a`;
  const oci = cloud === 'Oracle';
  const arn = cloud === 'Azure' ? `/subscriptions/…/resourceGroups/${tag}/providers/${svcName}/${w.name}`
    : cloud === 'GCP' ? `projects/${tag}/zones/…/${svcName.toLowerCase()}/${w.name}`
    : oci ? `ocid1.${OCID_TYPE[svcName] || 'instance'}.oc1.…${uid}`
    : cloud === 'CoreWeave' ? `/api/v1/namespaces/${tag}/${svcName === 'Load Balancer' ? 'services' : 'pods'}/${w.name}`
    : `arn:aws:${svc.toLowerCase().replace(/\s/g, '')}:…:${w.name}`;
  return {
    endpoint: { name: (oci ? 'vnic-' : 'eni-') + uid, type: oci ? (w.exposed ? 'Public VNIC · public IP' : 'Private VNIC') : w.exposed ? 'Public ENI · EIP attached' : 'Private ENI', ip: w.ip, dns: `${w.name}.${tag}.${oci ? 'oraclevcn.com' : 'internal'}`, sg: `${oci ? 'nsg' : 'sg'}-${kind}-${tag}`.toLowerCase(), ports: w.exposed ? '443, 80' : kind === 'db' ? '5432' : kind === 'cache' ? '6379' : '8080' },
    resource: { name: `${tag}/${w.name}`, arn, svc: svcName, role, owner: ({ pci: 'payments-platform', prod: 'platform-eng', finance: 'fin-systems', 'internet-facing': 'web-team', gpu: 'ml-infra', ai: 'ml-infra' })[tag.toLowerCase()] || 'platform-eng' },
  };
}

// ---------- Observe cuts: scope, trends, anomalies, insights ----------
export function scopes(est) {
  return [{ key: 'all', label: 'Whole estate', kind: 'all' }, ...est.regionsList.reduce((acc, r) => acc.find(x => x.label === r.cloud) ? acc : [...acc, { key: 'cloud:' + r.cloud, label: r.cloud, kind: 'cloud' }], []), ...est.sites.filter(s => !s.rollup).slice(0, 4).map(s => ({ key: 'site:' + s.name, label: s.name, kind: 'site' }))];
}
export function applyScope(est, scope) {
  if (!scope || scope === 'all') return est;
  const [kind, name] = scope.split(':');
  if (kind === 'cloud') return { ...est, regionsList: est.regionsList.filter(r => r.cloud === name), sites: est.sites };
  if (kind === 'site') { const site = est.sites.find(s => s.name === name); return { ...est, sites: est.sites.filter(s => s.name === name), regionsList: est.regionsList.filter((r, i) => site && site.priv ? r.priv || i % 2 === 0 : i % 2 === 1 || !r.priv) }; }
  if (kind === 'first') return { ...est, sites: est.sites.filter(s => S.accessOf(s) === name) };
  if (kind === 'app') {
    // An app tag spans regions and clouds; scoping to it keeps the regions
    // that carry it and drops the rest.
    const keep = est.regionsList.filter(r => (r.tags || []).some(t => String(t).toLowerCase() === name.toLowerCase()));
    return { ...est, regionsList: keep.length ? keep : est.regionsList };
  }
  return est;
}
// Every window Since offers compares (2026-09-29 audit): the hour and day barely move, the year a lot.
const TREND = { '1h': [0.01, -0.01, 0, 0.01, 0, 0.01, 0], '24h': [0.02, -0.02, 0.01, 0.03, 0.01, 0.02, 0.01], '7d': [0.04, -0.03, 0.01, 0.06, 0.02, 0.05, 0.03], '30d': [0.11, -0.08, -0.02, 0.18, 0.06, 0.14, 0.09], '90d': [0.31, -0.19, -0.05, 0.42, 0.15, 0.36, 0.22], '6m': [0.52, -0.24, -0.07, 0.66, 0.21, 0.55, 0.34], '12m': [0.88, -0.31, -0.1, 1.05, 0.33, 0.9, 0.51] };
/** How much traffic grew across a Since window: the Sankey averages and replays it. */
export const growthOf = (window) => (TREND[window] || [0])[0];
export function trends(ob, window) {
  const f = { '7d': 1, '30d': 1, '90d': 1 }[window] || 1;
  const d = TREND[window] || [0, 0, 0, 0, 0, 0, 0];
  return ob.kpis.map((k, i) => { const delta = d[i] || 0; const good = (i === 1 || i === 2 || i === 3) ? delta <= 0 : delta >= 0; return { ...k, delta: (delta >= 0 ? '+' : '') + Math.round(delta * 100) + '%', deltaTone: good ? 'var(--success)' : 'var(--warning)', arrow: delta >= 0 ? '↑' : '↓', vs: `vs prior ${window}`, vsShort: `vs ${window}` }; });
}
export function anomalies(est, ob, now = Date.now()) {
  const out = [];
  const spike = startOf('spike', now, INCIDENT_MIN.spike);
  est.regionsList.filter(r => r.rel === 'warn').forEach(r => out.push({ key: 'an-' + r.region, when: `Started ${hhmm(spike)} · ${agoOf(spike, now)}`, sev: 'amber', head: `Latency spike on ${r.cloud} ${r.region}`, cause: `Upstream transit congestion between the hyperscaler edge and your users; p95 rose from ${r.pub} to ${r.pub + 40} ms with 0.3% loss.`, did: 'AT&T flagged the event and confirmed the AT&T network path to the same region held at ' + r.fab + ' ms.', can: 'Attach the region and set a latency SLO; the AT&T network re-routes before the ceiling is hit.', region: r.region }));
  const newDest = est.regionsList.find(r => !r.priv && (r.tags || []).includes('Prod'));
  if (newDest) out.push({ key: 'an-dest', when: 'Yesterday', sev: 'amber', head: `New destination from ${newDest.region}: files.slack-edge.com`, cause: `Workloads tagged Prod began sending 3.1 GB/day to a destination not seen in the prior 30 days.`, did: 'Logged and classified as SaaS; no policy matched, so nothing was blocked.', can: 'Author a policy: when tag Prod reaches the Internet, require inline inspection.', region: newDest.region });
  // The same series the Signals card draws (2026-09-30): the card's drill lands here.
  const ew = egressWeeks(ob), ePct = ew[0].pub > 0 ? Math.round((ew[11].pub / ew[0].pub - 1) * 100) : 0;
  if (ob.pub > 0) out.push({ key: 'an-egress', when: 'This week', sev: 'info', head: `Public egress ${(ePct >= 0 ? '+' : '') + ePct}% in 11 weeks`, cause: `Growth is concentrated in object-storage reads from ${est.regionsList.filter(r => !r.priv).map(r => r.region).slice(0, 2).join(' and ') || 'unattached regions'}.`, did: 'Priced the same bytes on AT&T.', can: `Steer the object-storage flow: ${fmt(Math.round(ob.pub * 1000 * 0.07 * 30 / 10) * 10)}/mo back.` });
  return out;
}
export function insights(est, ob) {
  const rs = est.regionsList; if (!rs.length) return [];
  const top = rs.slice().sort((a, b) => b.wl - a.wl)[0];
  const pubRs = rs.filter(r => !r.priv);
  return [
    { key: 'talkers', kicker: 'Top talkers', head: `${top.cloud} ${top.region} carries ${pct(top.wl, rs.reduce((a, r) => a + r.wl, 0))}% of all traffic`, body: `${top.wl} workloads; ${top.priv ? 'already on AT&T' : 'still on public transit'}. ${top.tags.join(', ') || 'Untagged'}.` },
    { key: 'newdest', kicker: 'New destinations · 30d', head: `${3 + pubRs.length} destinations not seen before`, body: 'Two SaaS (Slack edge, Datadog intake), one AI endpoint (api.anthropic.com), the rest object storage in other regions.' },
    { key: 'shadow', kicker: 'Shadow SaaS', head: `${2 + Math.round(pubRs.length / 2)} SaaS domains with no policy`, body: 'Reached directly from cloud workloads over the hyperscaler exit. No inspection, no owner recorded.' },
    { key: 'growth', kicker: 'Egress growth', head: `Public egress grows ${Math.round(6 + ob.pub * 2)}% a month`, body: `At this rate you add ${fmt(Math.round(ob.egressMo * 0.08))}/mo of egress spend each quarter unless the object-storage flow is steered.` },
    { key: 'multi', kicker: 'Multi-cloud paths', head: `${(est.arcs || []).length} cloud-to-cloud paths, ${(est.arcs || []).filter(a => a.priv).length} on AT&T`, body: 'Cloud-to-cloud over the public internet pays egress twice, once out of each cloud.' },
    { key: 'idle', kicker: 'Idle capacity', head: `${Math.max(1, Math.round(rs.filter(r => r.priv).length / 3))} committed on-ramps under 30% utilised`, body: 'Consolidating two 5 Gbps ports into one 10 Gbps saves the second port fee; AT&T can re-home the VLANs.' },
  ];
}

// ---------- Cost: arbitrage, destination classes, forecast ----------
const DEST_CLASSES = [
  { key: 'ai', label: 'AI endpoints', share: 0.32, hyper: 0.09, fabric: 0.02 },
  { key: 'obj', label: 'Object storage (cross-region)', share: 0.28, hyper: 0.09, fabric: 0.02 },
  { key: 'inet', label: 'Public internet · SaaS', share: 0.22, hyper: 0.09, fabric: 0.05 },
  { key: 'x', label: 'Inter-cloud', share: 0.18, hyper: 0.18, fabric: 0.02 },
];
/**
 * What each cloud region pays outside AT&T and could save (Cost > By region, its rows
 * and their arithmetic). Read off the buckets, each in its own cloud's regions by
 * workloads (LC.egressByRegion; the skeptic, 2026-09-30: pooled across the estate,
 * Azure centralus read $80,067 where Azure's whole egress is $38,000). Today is the
 * region's egress outside AT&T, its By region bar's; to save is what the open priced
 * findings save on its own cloud's buckets there (LC.openByRegion), its Savings list
 * row; today less the saving is what the AT&T price would carry it for. Every region
 * carrying egress outside AT&T has a row: a public one attaches; an attached one whose
 * cloud bills outside AT&T anyway (Bank scale's GCP) steers.
 * `open` is the open priced findings (Cost's Still open); it defaults to every priced
 * finding of the estate. Connect > Recommended prices a region move from these rows
 * (M.egressOf) with the same open findings, so the two agree after a finding is resolved.
 */
export function arbitrage(est, base, open) {
  void base;
  const regs = est.regionsList || [], bks = est.buckets || [];
  const openF = (open == null ? est.findings || [] : open).filter(f => f.priced);
  const nowD = egressByRegion(est, 'public').byRegion, saveD = openByRegion(est, openF).byRegion;
  const nf = (n) => n.toLocaleString('en-US');
  return regs.map((r, i) => ({ r, i })).filter(({ i }) => nowD[i] > 0).map(({ r, i }) => {
    const now = nowD[i], save = Math.min(saveD[i], now), after = now - save;
    // The pool this share comes from: its own cloud's buckets outside AT&T, over the regions they land in.
    const pool = bks.filter(b => b.cloud === r.cloud && bucketInk(est, b) === 'public' && bucketWeights(est, b)[i] > 0);
    const w = pool.length ? bucketWeights(est, pool[0]) : regs.map((x, j) => (j === i ? (x.wl || 1) : 0)), wSum = w.reduce((a, x) => a + x, 0);
    const out = pool.reduce((a, b) => a + b.today, 0) || now, saveAll = w.reduce((a, x, j) => a + (x > 0 ? saveD[j] : 0), 0);
    const nearby = regs.find(x => x.priv && x.cloud === r.cloud);
    const share = `${nf(r.wl)} of ${nf(wSum)} ${r.cloud} workloads in ${r.priv ? 'attached' : 'public'} regions`;
    return { key: 'arb-' + r.region, region: `${r.cloud} ${r.region}`, label: `${r.cloud} ${r.region}`, cloud: r.cloud, regionId: r.region, wl: r.wl, priv: !!r.priv,
      act: r.priv ? 'Steer' : 'Attach',
      nowN: now, now: fmt(now), fabricN: after, fabric: fmt(after), saveN: save, save: fmt(save), share,
      math: `${share}: ${fmt(out)} × ${nf(r.wl)}/${nf(wSum)} = ${fmt(now)} outside AT&T; ${fmt(saveAll)} × ${nf(r.wl)}/${nf(wSum)} = ${fmt(save)} to save; ${fmt(now)} − ${fmt(save)} = ${fmt(after)} at the AT&T price`,
      alt: r.priv ? `Already attached: steer ${r.cloud}'s egress onto AT&T here, no new circuit.`
        : nearby ? `Or move the workload to ${nearby.region}, already attached: same saving, no new circuit, +${Math.abs(nearby.fab - r.fab)} ms.` : 'No attached region in this cloud yet; the attach is the move.' };
  }).sort((a, b) => b.saveN - a.saveN || b.nowN - a.nowN);
}
/**
 * One donut, as a conic-gradient string plus its legend. Ramesh's room reads
 * a ring faster than a stacked bar, and a stacked bar in four tints of one
 * blue asks them to rank opacities. Colours come from the Flywheel viz
 * tokens so the dark skin can restate them without touching this file.
 */
export function donut(rows, opts = {}) {
  const live = rows.filter(r => r.v > 0);
  const tot = live.reduce((a, r) => a + r.v, 0) || 1;
  let acc = 0;
  const seg = live.map((r, i) => {
    const from = acc / tot * 100; acc += r.v; const to = acc / tot * 100;
    return { ...r, color: r.color || `var(--viz-${(i % 6) + 1})`, from, to, pct: r.v / tot * 100 };
  });
  return {
    key: opts.key || 'donut',
    title: opts.title || '', sub: opts.sub || '',
    centre: opts.centre || '', centreSub: opts.centreSub || '',
    ring: seg.length ? `conic-gradient(${seg.map(s => `${s.color} ${s.from.toFixed(2)}% ${s.to.toFixed(2)}%`).join(',')})` : 'var(--bg-neutral)',
    rows: seg.map(s => ({ ...s, pctF: (s.pct < 1 ? s.pct.toFixed(1) : Math.round(s.pct)) + '%', valF: s.valF || fmt(s.v) })),
    total: tot,
  };
}

export function destClasses(ob, base, targetSave) {
  const today = base || ob.egressMo || 0;
  const ifAll = Math.max(0, today - (targetSave || 0));
  return DEST_CLASSES.map(d => { const now = Math.round(today * d.share), after = Math.round(ifAll * d.share); const gb = Math.round(now / (d.hyper * 0.6 + d.fabric * 0.4)); return { ...d, gbF: gb.toLocaleString('en-US'), hyperF: '$' + d.hyper.toFixed(2), fabricF: '$' + d.fabric.toFixed(2), nowF: fmt(now), ifAllF: fmt(after), w: Math.round(d.share * 100) + '%' }; });
}
export function forecast(ob, arb) {
  const months = 3, growth = 0.06, base = ob.egressMo || 1000, moveSave = Math.min(base * 0.9, arb.reduce((a, r) => a + r.saveN, 0));
  const W = 600, H = 160;
  const pts = (fn) => Array.from({ length: months * 30 + 1 }, (_, d) => fn(d));
  const asIs = pts(d => base * Math.pow(1 + growth, d / 30));
  const moved = pts(d => Math.max(0, (base - moveSave * Math.min(1, d / 20)) * Math.pow(1 + growth * 0.4, d / 30)));
  const max = Math.max(...asIs) * 1.1;
  const path = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (arr.length - 1) * W).toFixed(1)},${(H - v / max * (H - 16)).toFixed(1)}`).join(' ');
  const q = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  return { W, H, asIs: path(asIs), moved: path(moved), asIsQ: fmt(q(asIs)), movedQ: fmt(q(moved)), diffQ: fmt(q(asIs) - q(moved)), maxLabel: fmt(Math.round(max)) };
}
/** Spend, savings and forecast as one story (Micah, 2026-09-29: "combine
 *  savings and forecast with spend"). Twelve months back at the forecast's own
 *  growth, each with what acting banked that month; three months ahead as is
 *  and if you act. series: LC.banked's months.
 *  If you act (Micah, 2026-09-30: "what does the 51k even mean - make the
 *  forecast make sense"): the open moves come off this month, then the bytes
 *  grow at the same rate as is. The old curve phased the moves in over 20 days
 *  and grew at 40% of the rate, so its $51,100 matched nothing on the page; now
 *  the gap between the two lines is Could save, grown with the bytes. */
export const SPEND_GROWTH = 0.06;
export function spendStory({ base, moveSave, series }) {
  const g = SPEND_GROWTH, left = Math.max(0, base - Math.max(0, moveSave || 0));
  const past = (series || []).map((b, i, a) => ({ key: b.month, month: b.month, kind: 'past', spend: Math.round(base / Math.pow(1 + g, a.length - 1 - i)), saved: Math.round(b.saved || 0) }));
  const next = [1, 2, 3].map(m => { const f = Math.pow(1 + g, m); return { key: 'next' + m, kind: 'next', m, asIs: Math.round(base * f), moved: Math.round(left * f) }; });
  return { past, next };
}
export function commitments(est, base) {
  const g = gbPerWl(est, base) || GB_PER_WL_MO;
  return est.regionsList.filter(r => r.priv).slice(0, 3).map((r, i) => { const gb = Math.round(r.wl * g); const metered = Math.round(gb * 0.02); const committed = Math.round(1200 + gb * 0.008); const better = committed < metered; return { key: 'cm-' + r.region, region: `${r.cloud} ${r.region}`, gbF: gb.toLocaleString('en-US'), metered: fmt(metered), committed: fmt(committed), verdict: better ? `Commit: saves ${fmt(metered - committed)}/mo at this volume` : `Stay metered: commitment breaks even at ${Math.round(1200 / 0.012).toLocaleString('en-US')} GB/mo`, tone: better ? 'var(--success)' : 'var(--text-body)' }; });
}

export function gbPerWlExport(est, base) { return gbPerWl(est, base); }


// ---------- Insight widgets: data shaped for drawing, not reading ----------
/** Twelve weeks of egress, AT&T under public, from this window's volumes (2026-09-30:
 *  one series for the Signals card and the an-egress finding; no 1.0 Gbps stand-ins). */
// This week is the window's own volumes, to the tenth (third round, 2026-09-30: it
// read 0.5% under them, 27.4 Gbps public beside Top talkers' 27.5); the weeks
// before keep the same shape, so every ratio and dollar holds.
export function egressWeeks(ob) {
  const pub = ob.pub || 0, fab = ob.fab || 0;
  const p = (i) => Math.pow(1.02, i) * (0.9 + 0.1 * Math.sin(i)), f = (i) => 0.97 + 0.03 * Math.cos(i * 0.6);
  return Array.from({ length: 12 }, (_, i) => ({ pub: i === 11 ? pub : pub * p(i) / p(11), fab: i === 11 ? fab : fab * f(i) / f(11) }));
}
export function insightWidgets(est, ob, win = 30, price = {}) {
  const rs = est.regionsList; if (!rs.length) return null;
  const flows = ob.flows || [];
  // 1. Top talkers: the same per-region flows the Sankey draws.
  const regGbps = (r) => { const i = rs.indexOf(r); return +flows.filter(f => f.id.startsWith(`f-${i}-`)).reduce((a, f) => a + f.gbps, 0).toFixed(1); };
  // Every region, so Signals' full list holds what the card counts (2026-09-30); the card draws five.
  const tk = rs.map(r => ({ r, gbps: regGbps(r) })).sort((a, b) => b.gbps - a.gbps);
  const tMax = Math.max(1, ...tk.map(t => t.gbps)), tTot = ob.total || 1;
  // What each region sends outside AT&T, its cross-cloud pairs included at their first
  // end (third round, 2026-09-30): Top talkers by egress and by exposure gave all public
  // traffic to the public regions while Cloud-to-cloud and Coverage counted a public pair
  // between two attached ones. The sum is ob.pub, Egress growth's this week.
  const pubOf = (r) => +flows.filter(f => !f.controlled && f.region === `${r.cloud} ${r.region}`).reduce((a, f) => a + f.gbps, 0).toFixed(1);
  const talkersAll = tk.map(({ r, gbps }) => ({ key: r.region, region: r.region, cloud: r.cloud, label: `${r.cloud} ${r.region}`, sub: `${r.priv ? rampName(r) : 'public internet'} · ${r.tags.slice(0, 2).join(' · ') || 'untagged'}`, gbps, v: gbps.toFixed(1) + ' Gbps', share: pct(gbps, tTot) + '%', w: Math.round(gbps / tMax * 100) + '%', priv: r.priv, fill: r.priv ? 'var(--viz-1)' : 'var(--viz-6)',
    ramp: r.priv ? rampName(r) : '', pubG: pubOf(r) }));
  const talkers = talkersAll.slice(0, 5);
  // The region a flow belongs to, so its row opens that region on the map.
  const regionOf = (f) => (rs.find(r => `${r.cloud} ${r.region}` === f.region) || {}).region || null;
  // 2. New destinations inside the window, by volume.
  const pubN = rs.filter(r => !r.priv).length;
  const DEST = [{ d: 3, n: 'api.anthropic.com', c: 'ai', gb: 4.6 }, { d: 8, n: 'files.slack-edge.com', c: 'saas', gb: 3.1 }, { d: 11, n: 's3.eu-west-1.amazonaws.com', c: 'obj', gb: 12.4 }, { d: 17, n: 'intake.datadoghq.com', c: 'saas', gb: 2.4 }, { d: 22, n: 'blob.core.windows.net', c: 'obj', gb: 8.8 }, { d: 26, n: 'api.openai.com', c: 'ai', gb: 2.2 }, { d: 41, n: 'api.mistral.ai', c: 'ai', gb: 1.1 }, { d: 63, n: 'storage.googleapis.com', c: 'obj', gb: 6.2 }].slice(0, 5 + pubN);
  // One ink for every class, told apart by its name (the skeptic, 2026-09-30: SaaS wore the outside-AT&T orange and object
  // storage the list-price cyan, Cost's money colours); a destination's class is a category, not who is paid.
  const CLASS = { ai: ['AI endpoint', 'var(--text-light)'], saas: ['SaaS', 'var(--text-light)'], obj: ['Object storage', 'var(--text-light)'] };
  const inWin = DEST.filter(x => x.d <= win).sort((a, b) => b.gb - a.gb); const dMax = Math.max(1, ...inWin.map(x => x.gb));
  const when = (d) => d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
  // None has a policy yet, so each needs attention: --warning, the ink Signals and Your actions key as No policy (2026-09-30).
  const newDest = inWin.map(x => ({ key: x.n, name: x.n, sub: `${CLASS[x.c][0]} · first seen ${when(x.d)}`, v: x.gb + ' GB/d', w: Math.round(x.gb / dMax * 100) + '%', fill: 'var(--warning)', cls: CLASS[x.c][0], day: x.d }));
  // 3. Shadow SaaS: domains by volume, colored by whether a policy covers them.
  const SAAS = [['slack-edge.com', 3.1, false], ['datadoghq.com', 2.4, false], ['zoom.us', 1.8, true], ['github.com', 1.6, true], ['notion.so', 0.9, false], ['figma.com', 0.7, false]].slice(0, 3 + Math.min(3, pubN));
  const sMax = Math.max(...SAAS.map(s => s[1]));
  const shadow = SAAS.map(([n, gb, covered]) => ({ key: n, name: n, sub: covered ? 'covered by a policy' : 'no policy matches', v: gb + ' GB/d', w: Math.round(gb / sMax * 100) + '%', fill: covered ? 'var(--viz-1)' : 'var(--warning)', covered })).sort((a, b) => (a.covered === b.covered ? 0 : a.covered ? 1 : -1));
  const shadowN = shadow.filter(s => !s.covered).length, shadowGb = SAAS.filter(s => !s[2]).reduce((a, s) => a + s[1], 0);
  // 4. Egress growth: twelve weekly columns, fabric under public.
  const wk = egressWeeks(ob);
  const mx = Math.max(...wk.map(w => w.pub + w.fab)) || 1;
  // Dollars at the estate's public egress rate, anchored to this week (price.pubRate, $/mo per public Gbps).
  const rate = +price.pubRate || 0, mo = (g) => g * rate, money = (v) => fmt(Math.round(v / 100) * 100);
  // Each week carries its own figures, so a week opens as a row in the list (2026-09-30).
  const wkLabel = (i) => (i === 11 ? 'This week' : `${11 - i} ${11 - i === 1 ? 'week' : 'weeks'} ago`);
  const weeks = wk.map((w, i) => ({ key: 'w' + i, label: wkLabel(i), pub: w.pub, fab: w.fab, moF: rate && w.pub ? `${money(mo(w.pub))}/mo` : '', fabH: Math.round(w.fab / mx * 100) + '%', pubH: Math.round(w.pub / mx * 100) + '%', title: `${wkLabel(i)} · AT&T ${w.fab.toFixed(1)} Gbps · public ${w.pub.toFixed(1)} Gbps${rate && w.pub ? `, ${money(mo(w.pub))}/mo` : ''}` }));
  const sgn = (n) => (n >= 0 ? '+' : '') + n + '%';
  const pctOf = (a, b) => (b > 0 ? sgn(Math.round((a / b - 1) * 100) || 0) : '');
  const thenMo = mo(wk[0].pub), nowMo = mo(wk[11].pub), deltaMo = nowMo - thenMo, priced = rate > 0 && nowMo > 0;
  const pubPctF = pctOf(wk[11].pub, wk[0].pub), fabPctF = pctOf(wk[11].fab, wk[0].fab);
  // The change runs from the first column, 11 weeks ago, to this week: the head says 11 (third round, 2026-09-30).
  const growth = { weeks, pubPct: (wk[0].pub > 0 ? Math.round((wk[11].pub / wk[0].pub - 1) * 100) : 0), fabPct: (wk[0].fab > 0 ? Math.round((wk[11].fab / wk[0].fab - 1) * 100) : 0), pubNow: wk[11].pub.toFixed(1), fabNow: wk[11].fab.toFixed(1), pubThen: wk[0].pub.toFixed(1), pubPctF, fabPctF,
    thenMo, nowMo, deltaMo, thenF: priced ? money(thenMo) : '', nowF: priced ? money(nowMo) : '', deltaF: priced ? (deltaMo >= 0 ? '+' : '-') + money(Math.abs(deltaMo)) : '',
    subF: priced ? `Public egress ${(deltaMo >= 0 ? '+' : '-') + money(Math.abs(deltaMo))}/mo in 11 weeks · ${pubPctF}` : `Public ${pubPctF || 'none'} · AT&T ${fabPctF || 'none'}`,
    thenLabel: priced ? `${money(thenMo)}/mo · 11 weeks ago` : '11 weeks ago', nowLabel: priced ? `this week · ${money(nowMo)}/mo` : 'this week' };
  // 5. Multi-cloud paths: every cloud-to-cloud flow.
  // A flow can be steered onto AT&T only where one of its own ends is on AT&T (third
  // round, 2026-09-30: Growing offered Steer on us-west-2 to us-central1 and on the
  // westeurope flows, none of them attached, and one click put them "on AT&T");
  // otherwise its first step is Attach. An App flow's one end is its region.
  const privName = new Set(rs.filter(r => r.priv).map(r => `${r.cloud} ${r.region}`));
  const endsOf = (f) => (f.kind === 'App' ? [f.region] : f.name.split(' ↔ '));
  const canSteer = (f) => !!f.steerable && !f.controlled && endsOf(f).some(n => privName.has(n));
  const pathOf = (f) => (f.controlled ? 'on AT&T' : 'public internet');
  // A cloud-to-cloud pair reads by its regions, its clouds on the line under it, so
  // "GCP us-central1 ↔ CoreWeave us-east-04" never clips on a card (2026-09-30).
  const pairOf = (f) => (f.kind === 'App' ? null : f.name.split(' ↔ ').map(x => { const i = x.indexOf(' '); return { cloud: x.slice(0, i), region: x.slice(i + 1) }; }));
  const labelOf = (f) => { const p = pairOf(f); return p && p.length === 2 ? `${p[0].region} ↔ ${p[1].region}` : f.name; };
  const cloudsOf = (f) => { const p = pairOf(f); return p && p.length === 2 ? (p[0].cloud === p[1].cloud ? p[0].cloud : `${p[0].cloud} ↔ ${p[1].cloud}`) : ''; };
  const xflows = flows.filter(f => f.kind !== 'App'); const xMax = Math.max(1, ...xflows.map(f => f.gbps));
  const multiRows = xflows.map(f => ({ key: f.id, id: f.id, region: regionOf(f), name: f.name, label: labelOf(f), clouds: cloudsOf(f), path: pathOf(f), ms: f.latency, sub: `${pathOf(f)} · ${f.latency} ms`, v: f.gbps.toFixed(1) + ' Gbps', w: Math.round(f.gbps / xMax * 100) + '%', fill: f.controlled ? 'var(--viz-1)' : 'var(--viz-6)', controlled: f.controlled, steerable: canSteer(f) }));
  const multi = { rows: multiRows, privN: multiRows.filter(m => m.controlled).length, totalN: multiRows.length };
  // 6. Latency over SLO, worst first, in the Over SLO ink (review round 2, 2026-09-30):
  // red is Down's alone. By the one rule Health uses (second round, 2026-09-30): a
  // flow is over when healthOf calls it over against its path's SLO, 20 ms on AT&T
  // and 100 ms outside; the flat 100 ms missed westeurope at 21 ms on AT&T.
  // sloN counts every flow over, not the five the card draws (2026-09-30: it undercounted past five).
  const sloOf = (f) => (f.controlled ? SLO_PRIVATE : SLO_PUBLIC);
  const over = flows.filter(f => healthOf(f.latency, sloOf(f)) === 'slo').sort((a, b) => b.latency - a.latency); const lMax = Math.max(1, ...over.map(f => f.latency));
  const sloAll = over.map(f => ({ key: f.id, id: f.id, region: regionOf(f), where: f.region, name: f.name, label: labelOf(f), path: pathOf(f), ms: f.latency, slo: sloOf(f), gbps: f.gbps, controlled: f.controlled, sub: `${pathOf(f)} · ${f.gbps.toFixed(1)} Gbps`, v: f.latency + ' ms', w: Math.round(f.latency / lMax * 100) + '%', fill: HEALTH_INK.slo, steerable: canSteer(f) }));
  // How close the closest flow runs to its SLO, for a card with none over.
  const closest = flows.slice().sort((a, b) => b.latency / sloOf(b) - a.latency / sloOf(a))[0] || null;
  return { talkers, talkersAll, newDest, newDestN: newDest.length, shadow, shadowAll: shadow, shadowN, shadowGb: shadowGb.toFixed(1), growth, multi, slo: sloAll.slice(0, 5), sloAll, sloN: sloAll.length, sloTotal: flows.length, sloClosest: closest ? { name: closest.name, where: closest.region, ms: closest.latency, slo: sloOf(closest) } : null };
}

/** What AT&T bills for the cloud side (2026-09-30: one function for the AT&T
 *  charges tab, the Traffic Cost view and the cost legs). A NetBond on-ramp is
 *  billed for NetBond regions only (attHolds, D-6 restored 2026-09-30); a Direct
 *  Connect, ExpressRoute, Interconnect or Equinix port is not AT&T's to bill. */
export function attChargeRows(est, invAll) {
  const nb = new Set(est.regionsList.filter(attHolds).map(r => r.region));
  // NetBond or an AT&T-hosted VPC, never both in one region (Micah, 2026-09-30: "either, not and").
  // A customer L3 attach exists only beside a hosted VPC, so it is counted only where one runs.
  const regsIn = (invAll || []).flatMap(c => (c.regions || []).filter(r => nb.has(r.region)));
  const hostedRegs = regsIn.filter(r => (r.vpcs || []).some(v => v.managed));
  const hostedN = hostedRegs.flatMap(r => r.vpcs || []).filter(v => v.managed).length, l3N = hostedRegs.flatMap(r => r.vpcs || []).filter(v => v.priv && !v.managed).length;
  const nbOnly = new Set([...nb].filter(g => !hostedRegs.some(r => r.region === g)));
  // Each row carries what it counts, one part per region (Cost by region and by cloud, 2026-09-30).
  const perReg = (test, rate) => hostedRegs.map(r => { const n = (r.vpcs || []).filter(test).length; return { key: r.region, kind: 'region', region: r.region, n, v: n * rate }; }).filter(p => p.n > 0);
  return [
    { key: 'nb', label: 'NetBond on-ramps', sub: `${nbOnly.size} ${nbOnly.size === 1 ? 'region' : 'regions'} × $1,800`, v: nbOnly.size * 1800, regions: [...nbOnly], parts: [...nbOnly].map(g => ({ key: g, kind: 'region', region: g, n: 1, v: 1800 })) },
    { key: 'hv', label: 'Hosted VPC / VNet', sub: `${hostedN} × $2,400`, v: hostedN * 2400, parts: perReg(v => v.managed, 2400) },
    { key: 'l3', label: 'Customer L3 attach', sub: `${l3N} × $400`, v: l3N * 400, parts: perReg(v => v.priv && !v.managed, 400) },
  ].filter(r => r.v > 0);
}

// ---------- Cost in three legs (notes, 2026-09-30, A2) ----------
// What the estate costs end to end: the sites' access, the connectivity into the
// clouds, and what the cloud provider bills. AT&T charges read the catalog; any
// price we apply for someone else is a public list price, marked modelled.
//
// Cloud provider port list prices, per port per month, US, verified 2026-09-30:
//   AWS Direct Connect dedicated: 1G $219.00, 10G $1,642.50 (https://aws.amazon.com/directconnect/pricing/,
//     Price List API us-east-1 published 2026-09-17). Flat rate (announced 2026-09-15, 10G and 100G dedicated only,
//     transfer out included): 10G Tier 1 $10.96/hr, about $8,001/mo (https://aws.amazon.com/directconnect/pricing/flat-rate/).
//   Azure ExpressRoute Standard Metered, Zone 1: 1G $436, 10G $3,400 (https://azure.microsoft.com/en-us/pricing/details/expressroute/,
//     read through https://prices.azure.com/api/retail/prices because the page renders "$-" without script).
//   Google Cloud Dedicated Interconnect: 10G $1,699.44, plus $73.00 per VLAN attachment
//     (https://cloud.google.com/network-connectivity/docs/interconnect/pricing).
//   Oracle FastConnect port: 1G $155.13, 10G $930.75 (https://www.oracle.com/cloud/networking/pricing/, part B88326).
//   AWS Site-to-Site VPN: $36.50 per connection (https://aws.amazon.com/vpn/pricing/).
export const CSP_PORT = {
  AWS: { product: 'AWS Direct Connect', '1G': 219, '10G': 1642.5, flat10G: 8001 },
  Azure: { product: 'Azure ExpressRoute', '1G': 436, '10G': 3400 },
  GCP: { product: 'Google Cloud Interconnect', '10G': 1699.44, vlan: 73 },
  Oracle: { product: 'Oracle FastConnect', '1G': 155.13, '10G': 930.75 },
};
export const CSP_VPN = 36.5;
// Not a vendor list price: a typical colo cross-connect, modelled.
const XC_RATE = 350;
// A rolled-up remote site buys a smaller circuit than a named one: 0.3x the catalog "Starting at".
const REMOTE_RATE = 0.3;
const PRICE_OF = { avpn: 'avpn', aseod: 'ase', adi: 'adi', abf: 'abf', aiab: 'mobility' };
const catPrice = (id) => ((CATALOG.find(p => p.id === id) || {}).price) || 0;
// The words each AT&T charge counts in (By leg reads count × unit, 2026-09-30).
const ATT_WORDS = { nb: { unit: 1800, nouns: ['region', 'regions'] }, hv: { unit: 2400, nouns: ['hosted VPC', 'hosted VPCs'] }, l3: { unit: 400, nouns: ['L3 attach', 'L3 attaches'] } };
const each = (v) => (Number.isInteger(v) ? fmt(v) : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
/**
 * The cloud that bills an estate's IPsec tunnels: the cloud of its IPsec egress bucket,
 * whose VPN list price Cost applies. By cloud and Connect > Recommended both read it
 * (the skeptic, 2026-09-30: By cloud put every tunnel in AWS while Recommended said the
 * sites reach Azure over IPsec, naming no cloud that bills them).
 */
export const ipsecCloud = (est) => ((est.buckets || []).find(b => b.id === 'ipsec') || {}).cloud || null;

export function costLegs(est, inv, utilRows) {
  const sites = est.sites || [], regs = est.regionsList || [];
  const leg = (key, label, rows) => ({ key, label, rows, total: rows.reduce((a, r) => a + r.v, 0) });
  // Every row carries its parts, what it counts, priced in the same loop (2026-09-30):
  // the sites, regions or buckets behind it. Cost slices and drills by them, so a
  // slice can never disagree with the row it came from. ink: who is paid (att, list,
  // public, other); modelled: a list price or rate applied, not a bill.
  // Site access: every service a site buys, primary and backup, at the catalog's "Starting at".
  const acc = {};
  for (const st of sites) {
    const n = S.countOf(st.name), remote = n > 1;
    for (const sv of S.servicesOf(st)) {
      const id = PRICE_OF[sv.key], carrier = !id;
      const key = carrier ? sv.key : sv.key + (remote ? ':remote' : '');
      const g = acc[key] = acc[key] || { key, label: carrier ? sv.label : sv.label + (remote ? ' · remote sites' : ''), n: 0, primary: 0, backup: 0, unit: carrier ? 0 : catPrice(id) * (remote ? REMOTE_RATE : 1), carrier, modelled: remote && !carrier, parts: [] };
      g.n += n; g[sv.role === 'backup' ? 'backup' : 'primary'] += n;
      g.parts.push({ key: st.name, kind: 'site', site: st.name, n, role: sv.role === 'backup' ? 'backup' : 'primary' });
    }
  }
  const access = Object.values(acc).map(g => ({ key: g.key, label: g.label, n: g.n, v: g.unit * g.n, modelled: g.modelled, unit: g.unit, backup: g.backup, carrier: g.carrier,
    nouns: ['circuit', 'circuits'], eachWord: true, rateWords: g.modelled ? 'the remote-site rate' : '',
    parts: g.parts.map(p => ({ ...p, v: g.unit * p.n, ink: g.carrier ? 'other' : 'att', modelled: g.modelled })),
    sub: `${g.n.toLocaleString('en-US')} ${g.n === 1 ? 'circuit' : 'circuits'}${g.backup ? ` · ${g.backup.toLocaleString('en-US')} backup` : ''} · ${g.carrier ? 'billed by another carrier' : `${each(g.unit)} each${g.modelled ? ' at the remote-site rate' : ''}`}` }))
    .sort((a, b) => b.v - a.v || b.n - a.n);
  // Cloud connectivity: the AT&T charges, then what the customer runs themselves.
  const xcRegs = regs.filter(r => r.priv && r.xc && r.xc.by === 'yours'), xcSites = sites.filter(x => x.xc && x.xc.by === 'yours');
  const xcN = xcRegs.length + xcSites.length;
  const ipsecSites = sites.filter(x => siteModeOf(x) === 'ipsec'), sdwanSites = sites.filter(x => siteModeOf(x) === 'sdwan');
  const ipsecN = ipsecSites.reduce((a, x) => a + S.countOf(x.name), 0);
  const sdwanN = sdwanSites.reduce((a, x) => a + S.countOf(x.name), 0);
  const siteParts = (xs, rate, ink, modelled) => xs.map(x => { const n = S.countOf(x.name); return { key: x.name, kind: 'site', site: x.name, n, v: n * rate, ink, modelled }; });
  const connect = [
    ...attChargeRows(est, inv).map(r => ({ ...r, n: r.key === 'nb' ? r.regions.length : +String(r.sub).split(' ')[0] || 1, modelled: false, ...ATT_WORDS[r.key], parts: r.parts.map(p => ({ ...p, ink: 'att', modelled: false })) })),
    ...(sdwanN ? [{ key: 'sdwan', label: 'SD-WAN', n: sdwanN, v: sdwanN * catPrice('sdwan'), sub: `${sdwanN.toLocaleString('en-US')} sites × ${fmt(catPrice('sdwan'))}`, modelled: false, unit: catPrice('sdwan'), nouns: ['site', 'sites'], parts: siteParts(sdwanSites, catPrice('sdwan'), 'att', false) }] : []),
    ...(xcN ? [{ key: 'xc', label: 'Your cross-connects', n: xcN, v: xcN * XC_RATE, sub: `${xcN} × ${fmt(XC_RATE)} at a typical colo rate`, modelled: true, unit: XC_RATE, nouns: ['cross-connect', 'cross-connects'], rateWords: 'a typical colo rate',
      parts: [...xcRegs.map(r => ({ key: r.region, kind: 'region', region: r.region, n: 1, v: XC_RATE, ink: 'list', modelled: true })), ...xcSites.map(x => ({ key: x.name, kind: 'site', site: x.name, n: 1, v: XC_RATE, ink: 'list', modelled: true }))] }] : []),
    // A tunnel ends on a cloud's VPN gateway and that cloud bills it: the cloud of the IPsec
    // egress bucket, whose VPN list price we apply (By cloud, 2026-09-30: "by csp").
    ...(ipsecN ? [{ key: 'ipsec', label: 'IPsec tunnels', n: ipsecN, v: ipsecN * CSP_VPN, sub: `${ipsecN.toLocaleString('en-US')} tunnels × ${each(CSP_VPN)} cloud VPN list price`, modelled: true, unit: CSP_VPN, nouns: ['tunnel', 'tunnels'], rateWords: 'the cloud VPN list price',
      parts: siteParts(ipsecSites, CSP_VPN, 'list', true).map(p => ({ ...p, cloud: ipsecCloud(est) || undefined })) }] : []),
  ];
  // Cloud provider: each cloud's ports at its list price, then this month's egress.
  // direct: the share of it that is direct-connect regions' ports, which the
  // Traffic Cost view prices its direct connect path at (2026-09-30, owner decision a).
  const ports = {};
  for (const u of utilRows || []) {
    const r = regs.find(x => x.region === u.region); if (!r || !r.priv) continue;
    const P = CSP_PORT[r.cloud], size = /(^|\D)1G/.test(u.bwShort || '') && !/10G/.test(u.bwShort || '') ? '1G' : '10G';
    const key = P ? P.product : r.cloud;
    const g = ports[key] = ports[key] || { key: 'port:' + r.cloud, label: P ? P.product : r.cloud, cloud: r.cloud, n: 0, v: 0, direct: 0, regions: 0, priced: !!P, parts: [] };
    g.n += u.ports || 1; g.regions += 1;
    const mo = P ? (u.ports || 1) * (P[size] || P['10G']) + (P.vlan || 0) : 0;
    if (P) { g.v += mo; if (connModeOf(r) === 'direct') g.direct += mo; }
    // A port on no public price list is counted, not priced: the not-priced-here outline, never a fill.
    g.parts.push({ key: r.region, kind: 'region', region: r.region, n: u.ports || 1, v: mo, ink: P ? 'list' : 'other', modelled: !!P });
  }
  const cloudRows = Object.values(ports).map(g => { const P = CSP_PORT[g.cloud];
    const ports = `${g.n} ${g.n === 1 ? 'port' : 'ports'}`, regions = `${g.regions} ${g.regions === 1 ? 'region' : 'regions'}`;
    const sub = !g.priced ? `${ports} · not on a public price list` : `${ports} × ${each(P['10G'])}${P.vlan ? ` + ${fmt(P.vlan)} a region` : ''}${P.flat10G ? ' · flat rate offered' : ''}`;
    const title = !g.priced ? sub : `${ports} in ${regions} at the ${g.label} list price, ${each(P['10G'])} per 10G port${P.vlan ? `, plus ${fmt(P.vlan)} per VLAN attachment` : ''}. Metered.${P.flat10G ? ` A flat rate is offered at about ${fmt(P.flat10G)} per 10G port a month, transfer out included.` : ''}`;
    return { key: g.key, label: g.label, cloud: g.cloud, n: g.n, v: g.v, direct: g.direct, sub, title, modelled: g.priced, billing: P && P.flat10G ? 'metered' : undefined, parts: g.parts,
      nouns: ['port', 'ports'], unit: P ? P['10G'] : 0, perRegion: P && P.vlan ? P.vlan : 0, rateWords: P ? `list price${P.flat10G ? ' · flat rate offered' : ''}` : '' }; }).sort((a, b) => b.v - a.v);
  const egress = (est.buckets || []).reduce((a, b) => a + b.today, 0);
  // Egress by bucket: On AT&T only when its cloud is attached and it already pays your AT&T rate (CV.bucketInk).
  const eParts = (est.buckets || []).map(b => ({ key: b.id, kind: 'bucket', bucket: b.id, label: b.name, cloud: b.cloud, n: 1, v: b.today, ink: bucketInk(est, b), modelled: false }));
  const cloud = [...cloudRows, ...(egress || regs.length ? [{ key: 'egress', label: 'Egress', n: (est.buckets || []).length, v: egress, sub: 'Data out of the clouds, this month', modelled: false, parts: eParts }] : [])];
  const L = { access: leg('access', 'Site access', access), connect: leg('connect', 'Cloud connectivity', connect), cloud: leg('cloud', 'Cloud provider', cloud) };
  return { ...L, total: L.access.total + L.connect.total + L.cloud.total };
}

// ---------- What should I change first (notes, 2026-09-30) ----------
// Cost > Optimize: four moves in the stakeholder's order and words. Spend and
// Routing read the open priced findings (so a snoozed or dismissed one leaves
// its row, and the two add up to the Observe head's savings); Resiliency reads
// the apps an enforced policy calls business-critical that ride one path;
// Capacity reads the one capacity function.
const STATE_WORD = { ack: 'Acknowledged', progress: 'In progress' };
export function optimizeRows(est, { open = [], capacity = [], apps = [] } = {}) {
  const money = (v) => fmt(Math.round(v / 100) * 100);
  const pick = (kinds) => open.filter(f => kinds.includes(f.kind));
  const chip = (fs) => [...new Set(fs.map(f => STATE_WORD[f.state]).filter(Boolean))].join(' · ');
  const sum = (fs) => fs.reduce((a, f) => a + (f.save || 0), 0);
  const spendF = open.filter(f => ['ipsecegress', 'avoidable'].includes(f.kind) || /^newcloud-/.test(f.kind)), routF = pick(['crosscloud']);
  const critical = new Set((est.policies || []).filter(p => p.state === 'enforced').map(p => String(p.match || '').replace(/^(tag|remote-site)\s+/, '').toLowerCase()));
  const byReg = {};
  apps.filter(a => critical.has(String(a.tag).toLowerCase())).forEach(a => (a.parts || []).filter(pt => pt.share >= 0.05).forEach(pt => {
    const r = (est.regionsList || []).find(x => x.region === pt.region);
    if (r && r.priv && (r.paths || 1) < 2) (byReg[r.region] = byReg[r.region] || { r, apps: [] }).apps.push(a.tag);
  }));
  const resil = Object.values(byReg).sort((a, b) => b.r.wl - a.r.wl);
  const over = capacity.filter(c => c.oversized), hot = capacity.filter(c => c.state === 'risk');
  const resilWl = resil.reduce((a, x) => a + (x.r.wl || 0), 0), spare = over.reduce((a, c) => a + c.portG, 0);
  return [
    { key: 'spend', label: 'Spend', cta: 'Update connection type', figure: sum(spendF), figureF: sum(spendF) ? `Save ${money(sum(spendF))}/mo` : '', lines: spendF.map(f => f.head), state: chip(spendF),
      head: spendF.length ? 'Egress through the cloud provider costs more than it would on AT&T' : 'Every connection already takes the cheaper path', empty: !spendF.length },
    { key: 'routing', label: 'Routing', cta: 'Update routing policy', figure: sum(routF), figureF: sum(routF) ? `Save ${money(sum(routF))}/mo` : '', lines: routF.map(f => f.head), state: chip(routF),
      head: routF.length ? 'Cross-cloud traffic takes the public internet' : 'Every route already takes the cheapest path', empty: !routF.length },
    { key: 'resiliency', label: 'Resiliency', cta: 'Add backup path', figure: resilWl, figureF: resilWl ? `${resilWl.toLocaleString('en-US')} workloads on one path` : '', lines: resil.map(x => `${x.r.cloud} ${x.r.region} · ${x.apps.join(', ')} · critical by your enforced policies`), state: '',
      head: resil.length ? `${resil.length} business-critical ${resil.length === 1 ? 'path has' : 'paths have'} no backup` : 'Every business-critical app has a second path', empty: !resil.length, target: resil.length ? resil[0].r : null },
    { key: 'capacity', label: 'Capacity', cta: over.length || !hot.length ? 'Resize' : 'Add a port', figure: spare, figureF: over.length ? `${spare} Gbps to spare` : hot.length ? `${hot.length} near full` : '', state: '',
      lines: over.length ? over.map(c => `${c.cloud} ${c.region}: ${c.ports} × ${c.portG} Gbps bought, peak ${c.peakPct}%, ${c.avg6mPct}% on average over 6 months. ${c.resizeTo} × ${c.portG} Gbps holds the peak at ${c.resizePct}%.`) : hot.map(c => `${c.cloud} ${c.region}: ${c.peakPct}% of ${c.capG} Gbps at peak, full ${c.fullIn}.`),
      head: over.length ? `${over.length} ${over.length === 1 ? 'connection is' : 'connections are'} bought bigger than ${over.length === 1 ? 'it is' : 'they are'} used` : hot.length ? `${hot.length} ${hot.length === 1 ? 'connection runs' : 'connections run'} near full` : 'Every port is sized to what it carries',
      empty: !over.length && !hot.length, target: over[0] || hot[0] || null, resize: !!over.length },
  ];
}

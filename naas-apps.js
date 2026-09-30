// The app level (Micah, 2026-09-29: "go down to the app level"). An app is the
// workloads that carry its tag. Its traffic is its workloads' share of their
// regions' traffic on the map, so the apps add up to what the map sends to the
// clouds; its p95 is the latency its traffic sees, against the SLO of the path
// it takes. Pure: the view reads it.
import * as F from './naas-flowmap.js';

const SLO_OF = (priv) => (priv ? F.SLO_PRIVATE : F.SLO);
const healthOf = F.healthOf;
// A metrics sidecar rides every workload; it is not what anyone calls the app (2026-09-30).
const SIDECARS = new Set(['otel-agent']);

export function appsOf(est, inv, flows) {
  const regs = est.regionsList || [];
  // Each region's traffic on the map, now, whole estate: the destinations' own parts.
  const gbpsOf = {};
  F.rightRoots(est, flows).forEach(n => (n.parts || []).forEach(p => { gbpsOf[p.r.region] = (gbpsOf[p.r.region] || 0) + p.fab + p.pub; }));
  const listed = {};
  (inv || []).forEach(c => (c.regions || []).forEach(r => { listed[r.region] = (r.vpcs || []).reduce((a, v) => a + (v.subnets || []).reduce((b, s) => b + (s.workloads || []).length, 0), 0); }));
  const by = {};
  (inv || []).forEach(c => (c.regions || []).forEach(r => {
    const reg = regs.find(x => x.region === r.region) || r;
    const per = (gbpsOf[r.region] || 0) / (listed[r.region] || 1);
    (r.vpcs || []).forEach(v => (v.subnets || []).forEach(sn => (sn.workloads || []).forEach(w => {
      const k = w.tag || 'untagged';
      const g = by[k] = by[k] || { tag: k, wl: 0, priv: 0, exposed: 0, gbps: 0, regions: {}, clouds: {}, apps: {}, lat: [], regG: {}, regN: {} };
      // On AT&T means its region is attached: the same count as Attach and the gaps (2026-09-29).
      const onAtt = !!reg.priv;
      g.wl++; if (onAtt) g.priv++; if (w.exposed) g.exposed++;
      g.gbps += per; g.regG[r.region] = (g.regG[r.region] || 0) + per; g.regN[r.region] = (g.regN[r.region] || 0) + 1;
      g.regions[`${reg.cloud} ${r.region}`] = (g.regions[`${reg.cloud} ${r.region}`] || 0) + 1;
      g.clouds[reg.cloud] = (g.clouds[reg.cloud] || 0) + 1;
      (w.endpoints || []).forEach(e => { g.apps[e.app] = (g.apps[e.app] || 0) + 1; });
      g.lat.push({ v: per || 1e-6, ms: onAtt ? reg.fab : reg.pub, slo: SLO_OF(onAtt) });
    })));
  }));
  return Object.values(by).map(g => {
    // p95: the latency 95% of the app's traffic stays under; health: its worst material path.
    // One sample per path, not per workload: a path is material at 5% of the app's traffic.
    const grp = {}; g.lat.forEach(x => { const k = `${x.ms}|${x.slo}`; (grp[k] = grp[k] || { ms: x.ms, slo: x.slo, v: 0 }).v += x.v; });
    const byMs = Object.values(grp).sort((a, b) => a.ms - b.ms), tot = byMs.reduce((a, x) => a + x.v, 0);
    let cum = 0, at = byMs[byMs.length - 1];
    for (const x of byMs) { cum += x.v; if (cum >= tot * 0.95) { at = x; break; } }
    const rank = { ok: 0, risk: 1, slo: 2 };
    const health = [...byMs.filter(x => x.v >= tot * 0.05), ...(at ? [at] : [])].map(x => healthOf(x.ms, x.slo)).reduce((w, h) => (rank[h] > rank[w] ? h : w), 'ok');
    const sortDesc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return { tag: g.tag, wl: g.wl, onAtt: g.wl ? g.priv / g.wl : 0, exposed: g.exposed, gbps: g.gbps,
      regions: sortDesc(g.regions).map(([k]) => k), clouds: sortDesc(g.clouds).map(([k]) => k),
      topApps: sortDesc(g.apps).filter(([k]) => !SIDECARS.has(k)).slice(0, 3).map(([k]) => k),
      // Each region's share of the app's traffic (by workloads when it sends none), for grids that read an app by path.
      parts: Object.keys(g.regN).map(region => ({ region, gbps: g.regG[region] || 0, share: g.gbps > 0 ? (g.regG[region] || 0) / g.gbps : g.regN[region] / g.wl })), p95: Math.round(at ? at.ms : 0), slo: at ? at.slo : F.SLO, health };
  }).sort((a, b) => b.wl - a.wl);
}

/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-flowmap.js — the live flow map: a Sankey you can open in place, node
// by node, down to the flow record. Pure data. Added 2026-09-09 for the
// Observe dashboard (Micah: "deep-drillable, with cutting edge UX").
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';
import { regionOf as siteRegion, regionRows } from './naas-logic.js';

const PER_SITE = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.04, Edge: 0.005, Field: 0.3 };
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const n = (x) => x.toLocaleString('en-US');
export const SLO = 100;
const PUBLIC_IPS = ['104.18.32.7', '142.250.72.14', '3.5.140.2', '52.94.236.248', '20.60.132.10', '35.190.247.10'];
const AI_HOSTS = ['api.openai.com', 'api.anthropic.com', 'bedrock-runtime', 'aiplatform.googleapis.com'];

/** Seeded delta against the prior window, in percent, for the "what changed" mode. */
export const deltaOf = (key) => ((hash(key + ':d') % 70) - 25);
/** Seeded 24h shape, 0..1 → multiplier, for the scrubber. */
export const shapeAt = (key, t) => { const a = (hash(key + ':a') % 40) / 100, ph = (hash(key + ':p') % 628) / 100; return 0.75 + a * (1 + Math.sin(t * 6.283 + ph)) / 2 + 0.05 * Math.sin(t * 25 + ph); };

function regionOf(est, name) { return est.regionsList.find(r => r.region === name); }
/**
 * Hand a parent's fabric volume to its children without inventing or losing
 * any. Private children fill first; whatever is left spills onto the public
 * ones. A Sankey that does not add back up to the row above it is a picture,
 * not a measurement.
 */
function shareFab(rows, fabTotal) {
  const pv = rows.filter(r => r.priv).reduce((a, r) => a + r.v, 0);
  const uv = rows.filter(r => !r.priv).reduce((a, r) => a + r.v, 0);
  const onPriv = Math.min(fabTotal, pv), spill = Math.max(0, fabTotal - pv);
  return rows.map(r => ({ ...r, fabV: r.priv ? (pv ? onPriv * r.v / pv : 0) : (uv ? spill * r.v / uv : 0) }));
}
function invRegion(inv, name) { return inv.flatMap(c => c.regions).find(r => r.region === name); }
function stateOfRegion(est, name) { const r = regionOf(est, name); if (!r) return 'ok'; if (r.link === 'degraded') return 'degraded'; if (!r.priv && (r.pub || 0) > SLO) return 'slo'; if (r.rel === 'warn') return 'slo'; return 'ok'; }

/** A site that reaches the cloud over IPsec on someone else's internet. */
const isTunnel = (x) => !x.priv && (!!x.tunnel || S.servicesOf(x).some(v => v.key === 'tpa'));
/** Root nodes on the left: site regions, the grouping every other view uses (Micah, 2026-09-28). */
export function leftRoots(est, flows) {
  const sg = {};
  (est.sites || []).forEach(s => { const r = siteRegion(s); const count = S.countOf(s.name); const v = (PER_SITE[S.classOf(s)] || 0.5) * count;
    const g = sg[r] = sg[r] || { kind: 'site', key: 'site:' + r, cls: 'region:' + r, region: r, count: 0, v: 0, fabV: 0, ipsecV: 0 };
    g.count += count; g.v += v; g.fabV += s.priv ? v : v * 0.1; if (isTunnel(s)) g.ipsecV += v * 0.9; });
  const order = regionRows(est).map(r => r.name);
  void flows;
  return Object.values(sg).map(g => ({ ...g, name: `${g.region} · ${n(g.count)} ${g.count === 1 ? 'site' : 'sites'}`, group: 'sites', hasChildren: true, state: 'ok' }))
    .sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region));
}

/**
 * The whole-estate traffic mix, computed from the flows themselves rather
 * than from the ribbons the map happens to draw. Dev's note takes cloud
 * sources off the map entirely, so the picture is sites-to-clouds - but the
 * readout still has to answer for every byte the estate carries, including
 * the cloud egress that no longer appears as a ribbon.
 */
export function mixOf(est, flows) {
  const LOCAL = 0.6;
  const tagsV = flows.filter(f => f.kind === 'App').reduce((a, f) => a + f.gbps, 0);
  const dm = {};
  flows.forEach(f => { const d = dm[f.to] = dm[f.to] || { key: 'dest:' + f.to, name: f.to, v: 0, fab: 0, from: {} }; d.v += f.gbps; if (f.controlled) d.fab += f.gbps; d.from[f.from] = (d.from[f.from] || 0) + f.gbps; });
  const left = leftRoots(est, flows);
  const sitesV = left.filter(x => x.kind === 'site').reduce((a, x) => a + x.v, 0);
  const sitesFab = left.filter(x => x.kind === 'site').reduce((a, x) => a + x.fabV, 0);
  const buckets = [
    { key: 'dest:local', name: 'local', v: tagsV * LOCAL, fab: 0, local: true, from: {} },
    { key: 'dest:regions', name: 'regions', v: sitesV, fab: sitesFab, from: {} },
    ...Object.values(dm),
  ].filter(b => b.v > 0.001);
  const total = buckets.reduce((a, b) => a + b.v, 0) || 1;
  const localV = tagsV * LOCAL;
  const fabAll = buckets.filter(b => !b.local).reduce((a, b) => a + b.fab, 0);
  const crossed = total - localV;
  return { buckets, total, localV, fabAll, pubAll: crossed - fabAll, crossed };
}

/** The cloud-origin sources folded under the on-ramp row: tags, then pairs. */
export function onrampChildren(est, flows) {
  const tg = {}; flows.filter(f => f.kind === 'App').forEach(f => { const g = tg[f.from] = tg[f.from] || { kind: 'tag', key: 'onramp:all/' + f.from, name: f.from, v: 0, fabV: 0, regions: new Set() }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; g.regions.add(f.region); });
  const tags = Object.values(tg).map(g => ({ ...g, hasChildren: true, parentKey: 'onramp:all', state: [...g.regions].map(r => stateOfRegion(est, r.split(' ')[1] || r)).find(x => x !== 'ok') || 'ok' })).sort((a, b) => b.v - a.v);
  const rg = {}; flows.filter(f => f.kind !== 'App').forEach(f => { const g = rg[f.from] = rg[f.from] || { kind: 'c2c', key: 'onramp:all/' + f.from, name: f.from, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; });
  const c2c = Object.values(rg).map(g => ({ ...g, hasChildren: false, parentKey: 'onramp:all', state: stateOfRegion(est, g.name.split(' ')[1] || g.name) })).sort((a, b) => b.v - a.v);
  return [...tags, ...c2c];
}

export const RAMP_NAME = { NetBond: 'NetBond', ER: 'ExpressRoute', DX: 'Direct Connect', Interconnect: 'Interconnect', EQX: 'Equinix Fabric' };
const rampOf = (r) => RAMP_NAME[r.ramp] || 'NetBond';
/** Your own data centers take a share of what the other sites send, over the private WAN. */
export const DC_SHARE = 0.15;
const dcSites = (est) => (est.sites || []).filter(x => S.classOf(x) === 'Data center');
/** How the site traffic splits, once, so the left, the middle and the right all agree. */
export function flowSplit(est, flows) {
  const left = leftRoots(est, flows);
  const sitesV = left.reduce((a, x) => a + x.v, 0), sitesFab = left.reduce((a, x) => a + x.fabV, 0), ipsec = left.reduce((a, x) => a + x.ipsecV, 0);
  const dc = dcSites(est).length ? DC_SHARE : 0;
  const pubV = Math.max(0, sitesV - sitesFab);
  return { sitesV, sitesFab, ipsec, inet: Math.max(0, pubV - ipsec), pubV, dc, cloudFab: sitesFab * (1 - dc), dcV: sitesFab * dc };
}
/** Root nodes on the right: only destinations - clouds, neoclouds, your data centers (Micah, 2026-09-28). */
export function rightRoots(est, flows) {
  const sp = flowSplit(est, flows);
  const priv = est.regionsList.filter(r => r.priv), pub = est.regionsList.filter(r => !r.priv);
  const privWl = priv.reduce((a, r) => a + (r.wl || 0), 0) || 1, pubWl = pub.reduce((a, r) => a + (r.wl || 0), 0) || 1;
  const byCloud = {};
  const at = (c) => (byCloud[c] = byCloud[c] || { cloud: c, byRamp: {}, fabV: 0, pubV: 0 });
  priv.forEach(r => { const c = at(r.cloud); const v = sp.cloudFab * (r.wl || 0) / privWl; c.byRamp[rampOf(r)] = (c.byRamp[rampOf(r)] || 0) + v; c.fabV += v; });
  // What leaves AT&T lands on the regions it can reach: the public ones.
  (pub.length ? pub : priv).forEach(r => { const c = at(r.cloud); c.pubV += sp.pubV * (r.wl || 0) / (pub.length ? pubWl : privWl); });
  const clouds = Object.values(byCloud).map(c => ({ kind: 'cloud', key: 'cloud:' + c.cloud, name: c.cloud, cloud: c.cloud, v: c.fabV + c.pubV, fabV: c.fabV, pubV: c.pubV, byRamp: c.byRamp,
    hasChildren: true, state: c.pubV > c.fabV ? 'slo' : 'ok' })).filter(c => c.v > 0.001).sort((a, b) => b.v - a.v);
  const dcs = dcSites(est);
  const dc = sp.dcV > 0.001 ? [{ kind: 'dc', key: 'dc:yours', name: `Your data centers · ${dcs.length}`, v: sp.dcV, fabV: sp.dcV, pubV: 0, byRamp: {}, wan: sp.dcV, hasChildren: dcs.length > 1, state: 'ok' }] : [];
  return [...clouds, ...dc];
}

/** Children of a node, one level down. Every level is honest about what the data can name. */
export function childrenOf(node, est, inv, flows) {
  const parts = node.key.split('/');
  if (node.kind === 'site') {
    // Children of a first-mile group are the sites on it, by metro where a
    // metro holds more than one. siteTree groups by building class, which is
    // exactly the thing the network cannot see, so this descends on its own.
    const mine = (est.sites || []).filter(x => (node.region ? siteRegion(x) === node.region : S.accessOf(x) === node.cls));
    if (!mine.length) return [];
    // A row that stands for many sites ("Remote sites (212)") carries no real
    // metro; siteTree already splits those into the metros they are in, so
    // borrow them rather than lumping 212 buildings under "Various".
    const tree = S.siteTree(est);
    const byMetro = {};
    // A first mile holds whatever buildings happen to sit on it. Acme's ADI
    // row is a data center and a plant; weighting the plant as a data center
    // read 12.0 Gbps against a parent that said 7.5. Each site carries its
    // own class weight, and the volumes are summed rather than multiplied.
    mine.forEach(x => {
      const count = S.countOf(x.name);
      const cls = S.classOf(x);
      const per = PER_SITE[cls] || 0.5;
      const kids = count > 1 ? ((tree.find(c => c.cls === cls) || {}).children || []).filter(k => k.kind === 'metro') : [];
      if (kids.length) {
        kids.forEach(k => {
          const g = byMetro[k.name] = byMetro[k.name] || { metro: k.name, count: 0, onFabric: 0, only: null, cls, per, v: 0, fabV: 0 };
          g.count += k.count; g.onFabric += k.onFabric || 0;
          g.v += per * k.count; g.fabV += x.priv ? per * k.count : per * k.count * 0.1;
        });
        return;
      }
      const m = x.metro || 'Various';
      const g = byMetro[m] = byMetro[m] || { metro: m, count: 0, onFabric: 0, only: x, cls, per, v: 0, fabV: 0 };
      g.count += count; g.onFabric += x.priv ? count : 0;
      g.v += per * count; g.fabV += x.priv ? per * count : per * count * 0.1;
      if (g.count > count) g.only = null;
    });
    return Object.values(byMetro).map(g => g.only && g.count === 1
      ? { kind: 'sitename', key: `${node.key}/${g.only.name}`, cls: node.cls, siteCls: g.cls, siteName: g.only.name, name: g.only.name, sub: S.servicesOf(g.only).map(v => v.label).join(' + '), v: g.v, fabV: g.fabV, ipsecV: isTunnel(g.only) ? g.v * 0.9 : 0, hasChildren: true, state: g.only.priv ? 'ok' : 'slo', parentKey: node.key }
      : { kind: 'metro', key: `${node.key}/${g.metro}`, cls: node.cls, siteCls: g.cls, metro: g.metro, count: g.count, name: `${g.metro} · ${n(g.count)}`, v: g.v, fabV: g.fabV, hasChildren: true, state: g.onFabric < g.count / 2 ? 'slo' : 'ok', parentKey: node.key }
    ).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'metro') {
    // node.cls is the first mile (adi, sdwan). siteTree is keyed by building
    // class (Branch, Plant). Matching one against the other found nothing, so
    // a metro row never opened at all. siteCls carries the building class.
    const bcls = node.siteCls || node.cls;
    const cls = S.siteTree(est).find(c => c.cls === bcls); const m = cls && cls.children.find(ch => ch.kind === 'metro' && ch.name === node.metro); if (!m) return [];
    const per = node.count ? node.v / node.count : (PER_SITE[bcls] || 0.5);
    const rows = m.sites.map(x => ({ kind: 'sitename', key: `${node.key}/${x.id}`, cls: node.cls, siteCls: bcls, siteName: x.id, name: x.id, sub: x.address, v: per, priv: !!x.priv, hasChildren: true, state: x.priv ? 'ok' : 'slo', parentKey: node.key }));
    const more = Math.max(0, node.count - rows.length);
    if (more) rows.push({ kind: 'more', key: `${node.key}/more`, siteCls: bcls, metro: node.metro, name: `+${n(more)} more`, v: per * more, priv: m.onFabric >= m.count, hasChildren: false, state: 'ok', parentKey: node.key });
    return shareFab(rows, node.fabV);
  }
  if (node.kind === 'sitename') {
    const site = P.allSites(est).find(x => x.id === node.siteName || x.name === node.siteName); if (!site) return [];
    // gbps() adds a cross-geography share on top of the class weight, so a
    // site's regions summed to 124% of the site and the level overshot its
    // own parent. The shape of the split is right; the scale is the row above.
    const rows = P.siteRegions(est, site, est.regionsList.length).rows;
    const tot = rows.reduce((a, x) => a + x.gbps, 0) || 1;
    return shareFab(rows.map(x => { const ms = P.path(site, x.region).ms; return {
      kind: 'circuit', key: `${node.key}/${x.region.region}`, name: `→ ${x.region.cloud} ${x.region.region}`,
      sub: `${site.access || 'Access'} · ${x.region.priv ? 'on the fabric' : 'public path'} · ${ms} ms`,
      v: node.v * x.gbps / tot, priv: !!x.region.priv, hasChildren: false,
      state: x.region.priv ? 'ok' : (ms > SLO ? 'slo' : 'ok'), parentKey: node.key, region: x.region.region };
    }), node.fabV).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'tag') {
    const m = {}; flows.filter(f => f.kind === 'App' && f.from === node.name).forEach(f => { const rn = f.region; const g = m[rn] = m[rn] || { kind: 'tagregion', key: `${node.key}/${rn}`, tag: node.name, regionName: rn, name: rn, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; });
    return Object.values(m).map(g => ({ ...g, hasChildren: true, state: stateOfRegion(est, g.regionName.split(' ')[1] || g.regionName), parentKey: node.key })).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'tagregion') {
    const rname = node.regionName.split(' ')[1] || node.regionName; const ir = invRegion(inv, rname); if (!ir) return [];
    const sum = ir.vpcs.reduce((a, v) => a + v.wl, 0) || 1; const fabShare = node.v ? node.fabV / node.v : 0;
    return ir.vpcs.map(v => ({ kind: 'vpc', key: `${node.key}/${v.id}`, panelSel: `vpc:${rname}|${v.id}`, tag: node.tag, regionName: rname, vpcId: v.id, name: v.name, sub: `${v.purpose} · ${n(v.wl)} workloads`, v: node.v * v.wl / sum, fabV: node.v * v.wl / sum * (v.priv ? Math.max(fabShare, 0.9) : Math.min(fabShare, 0.1)), hasChildren: true, state: v.priv ? stateOfRegion(est, rname) : 'slo', parentKey: node.key }));
  }
  if (node.kind === 'vpc') {
    const ir = invRegion(inv, node.regionName); const vpc = ir && ir.vpcs.find(v => v.id === node.vpcId); if (!vpc) return [];
    const sum = vpc.subnets.reduce((a, s) => a + s.wl, 0) || 1; const fabShare = node.v ? node.fabV / node.v : 0;
    return vpc.subnets.map(sn => ({ kind: 'subnet', key: `${node.key}/${sn.id}`, panelSel: `sn:${node.regionName}|${node.vpcId}|${sn.id}`, regionName: node.regionName, vpcId: node.vpcId, subnetId: sn.id, name: sn.name, sub: `${sn.cidr} · ${sn.az} · ${n(sn.wl)} workloads`, v: node.v * sn.wl / sum, fabV: node.v * sn.wl / sum * (sn.pub ? Math.min(fabShare, 0.2) : fabShare), hasChildren: true, state: sn.pub ? 'slo' : stateOfRegion(est, node.regionName), parentKey: node.key }));
  }
  if (node.kind === 'subnet') {
    const ir = invRegion(inv, node.regionName); const vpc = ir && ir.vpcs.find(v => v.id === node.vpcId); const sn = vpc && vpc.subnets.find(x => x.id === node.subnetId); if (!sn) return [];
    const all = sn.workloads || []; const ws = all.slice(0, 6); const each = node.v / Math.max(1, all.length); const fabShare = node.v ? node.fabV / node.v : 0;
    const rows = ws.map(w => ({ kind: 'workload', key: `${node.key}/${String(w.id).replace(/\//g, '_')}`, regionName: node.regionName, wlSel: `wl:${node.regionName}|${node.vpcId}|${w.id}`, panelSel: `wl:${node.regionName}|${node.vpcId}|${w.id}`, name: `${w.tag || vpc.name}/${w.name}`, sub: `${w.type} · ${(w.endpoints || []).map(e => e.app).slice(0, 2).join(', ') || w.ip}`, ip: w.ip, resource: `${w.tag || vpc.name}/${w.name}`, v: each, fabV: each * (w.exposed ? Math.min(fabShare, 0.1) : fabShare), hasChildren: false, state: w.exposed ? 'slo' : 'ok', parentKey: node.key }));
    // The map samples six and hands the rest to the drawer, exactly as the
    // site side already does with its 'more' node. Same door, other column.
    if (all.length > rows.length) rows.push({ kind: 'wlmore', key: `${node.key}/wlmore`, regionName: node.regionName, vpcId: node.vpcId, subnetId: node.subnetId, name: `See all ${all.length} workloads`, sub: 'every app in this subnet', v: each * (all.length - rows.length), fabV: each * (all.length - rows.length) * fabShare, hasChildren: false, state: 'ok', parentKey: node.key });
    return rows;
  }
  if (node.kind === 'onramp') return onrampChildren(est, flows);
  if (node.kind === 'cloud') {
    const mine = est.regionsList.filter(r => r.cloud === node.cloud);
    const pr = mine.filter(r => r.priv), pu = mine.filter(r => !r.priv);
    const pw = pr.reduce((a, r) => a + (r.wl || 0), 0) || 1, uw = pu.reduce((a, r) => a + (r.wl || 0), 0) || 1;
    return [...pr.map(r => { const v = node.fabV * (r.wl || 0) / pw; return { kind: 'endpoint', key: `${node.key}/${r.region}`, name: `${r.cloud} ${r.region}`, sub: `${rampOf(r)} · ${r.fab} ms`, v, fabV: v, pubV: 0, byRamp: { [rampOf(r)]: v }, hasChildren: false, state: stateOfRegion(est, r.region), parentKey: node.key, region: r.region }; }),
      ...(pu.length ? pu : []).map(r => { const v = node.pubV * (r.wl || 0) / uw; return { kind: 'endpoint', key: `${node.key}/${r.region}`, name: `${r.cloud} ${r.region}`, sub: `internet · ${r.pub} ms`, v, fabV: 0, pubV: v, byRamp: {}, hasChildren: false, state: stateOfRegion(est, r.region), parentKey: node.key, region: r.region }; }),
    ].filter(x => x.v > 0.0005).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'dc') {
    const dcs = dcSites(est);
    return dcs.map(x => ({ kind: 'endpoint', key: `${node.key}/${x.name}`, name: x.name, sub: S.servicesOf(x).map(v => v.label).join(' + '), v: node.v / dcs.length, fabV: node.v / dcs.length, pubV: 0, byRamp: {}, wan: node.v / dcs.length, hasChildren: false, state: 'ok', parentKey: node.key }));
  }
  if (node.key === 'dest:public internet') {
    // The band that misses the fabric used to dead-end. It lands somewhere,
    // and the somewhere is the regions we have no private path into.
    const rs = est.regionsList.filter(r => !r.priv);
    const tot = rs.reduce((a, r) => a + (r.wl || 0), 0) || 1;
    return rs.map(r => ({ kind: 'endpoint', key: `${node.key}/${r.region}`, name: `${r.cloud} ${r.region}`,
      sub: `${n(r.wl)} workloads · public path · ${r.pub} ms`,
      v: node.v * (r.wl || 0) / tot, fabV: 0, hasChildren: false,
      state: stateOfRegion(est, r.region), parentKey: node.key, region: r.region })).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'dest') {
    const per = (k) => node.v / k, fper = (k) => node.fabV / k;
    if (node.name === 'AI endpoints') return AI_HOSTS.map((h, i) => ({ kind: 'endpoint', key: `${node.key}/${i}`, name: PUBLIC_IPS[i], sub: `unresolved · public · likely ${h}`, v: per(4) * (1 - i * 0.15), fabV: fper(4) * (1 - i * 0.15), hasChildren: false, state: 'ok', parentKey: node.key, unresolved: true }));
    if (node.name === 'public internet') return PUBLIC_IPS.slice(0, 5).map((ip, i) => ({ kind: 'endpoint', key: `${node.key}/${i}`, name: ip, sub: 'unresolved · public', v: per(5) * (1 - i * 0.12), fabV: fper(5) * (1 - i * 0.12), hasChildren: false, state: 'ok', parentKey: node.key, unresolved: true }));
    if (node.name === 'object storage') { const rs = est.regionsList.slice(0, 5); return rs.map((r, i) => ({ kind: 'endpoint', key: `${node.key}/${r.region}`, name: r.cloud === 'Azure' ? `blob · ${r.region}` : r.cloud === 'GCP' ? `gcs · ${r.region}` : `s3 · ${r.region}`, sub: r.priv ? 'private endpoint · resolved' : 'public endpoint', v: per(rs.length) * (1 - i * 0.1), fabV: r.priv ? per(rs.length) * (1 - i * 0.1) : 0, hasChildren: false, state: r.priv ? 'ok' : 'slo', parentKey: node.key })); }
    if (node.name === 'inter-cloud') { const arcs = est.arcs || []; return arcs.map((a, i) => ({ kind: 'endpoint', key: `${node.key}/${i}`, name: `${a.from} ↔ ${a.to}`, sub: a.priv ? 'AT&T mid-mile' : 'public internet', v: per(arcs.length || 1), fabV: a.priv ? per(arcs.length || 1) : 0, hasChildren: false, state: a.priv ? 'ok' : 'slo', parentKey: node.key })); }
    if (node.name === 'Cloud regions (from sites)') { const rs = est.regionsList; const tot = rs.reduce((a, r) => a + r.wl, 0) || 1; return rs.map(r => ({ kind: 'endpoint', key: `${node.key}/${r.region}`, name: `${r.cloud} ${r.region}`, sub: r.priv ? `${r.ramp || 'NetBond'} · ${r.fab} ms` : `public · ${r.pub} ms`, v: node.v * r.wl / tot, fabV: r.priv ? node.v * r.wl / tot : 0, hasChildren: false, state: stateOfRegion(est, r.region), parentKey: node.key, region: r.region })); }
  }
  return [];
}

/** Replace every open node by its children, recursively. */
function expand(list, open, est, inv, flows, depth = 0) {
  // Below the roots, an open node's siblings fold into one row so the map's height stays bounded at volume (Micah, 16:23).
  const CAP = 6;
  const openHere = depth > 0 ? list.filter(nd => open.has(nd.key) && nd.hasChildren) : [];
  let fold = openHere.length ? list.filter(nd => !open.has(nd.key)) : [];
  let keep = openHere.length ? list.filter(nd => open.has(nd.key)) : list;
  // Nothing open at this level: keep the largest few and fold the tail, so a
  // level with thirty rows is readable before you have touched anything.
  if (depth > 0 && !openHere.length && keep.length > CAP) {
    const ranked = keep.slice().sort((a, b) => b.v - a.v);
    keep = ranked.slice(0, CAP);
    fold = ranked.slice(CAP);
  }
  const out = keep.flatMap(nd => { const node = { ...nd, depth, group: nd.group || rootGroup(nd) }; if (open.has(node.key) && node.hasChildren) { const kids = childrenOf(node, est, inv, flows).map(k => ({ ...k, group: node.group })); return kids.length ? expand(kids, open, est, inv, flows, depth + 1) : [node]; } return [node]; });
  if (fold.length) { const first = openHere[0] || keep[0] || fold[0]; const kindWord = { metro: 'metros', sitename: 'sites', site: 'first miles', tag: 'workload tags', c2c: 'cloud pairs', tagregion: 'regions', vpc: 'VPCs', subnet: 'subnets', workload: 'workloads', endpoint: 'endpoints', dest: 'destinations' }[fold[0].kind] || ''; out.push({ kind: 'rollup', key: `${(fold[0].parentKey || (first && first.key ? first.key.split('/')[0] : 'lvl' + depth))}/rollup`, name: kindWord ? `+${fold.length} other ${kindWord}` : `+${fold.length} others`, sub: 'click to fold back', v: fold.reduce((a, x) => a + x.v, 0), fabV: fold.reduce((a, x) => a + x.fabV, 0), hasChildren: false, state: 'ok', depth, group: fold[0].group || rootGroup(fold[0]), parentKey: fold[0].parentKey, ipsecV: fold.reduce((a, x) => a + (x.ipsecV || 0), 0), pubV: fold.reduce((a, x) => a + (x.pubV || 0), 0), wan: fold.reduce((a, x) => a + (x.wan || 0), 0), byRamp: fold.reduce((m, x) => { Object.entries(x.byRamp || {}).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); return m; }, {}), foldsKey: first && first.key ? first.key : null, tailOnly: !openHere.length , tagV: fold.reduce((a, x) => a + (x.kind === 'c2c' ? 0 : (x.tagV != null ? x.tagV : x.v)), 0)}); }
  return out;
}

/** The map. open: keys to expand. filterRegion: keep only what touches a region. t: 0..1 scrubber, null = window. */
export function buildMap(est, inv, flows0, opts = {}) {
  const open = new Set(opts.open || []);
  const flows = opts.filterRegion ? flows0.filter(f => (f.region || '').includes(opts.filterRegion) || f.name.includes(opts.filterRegion)) : flows0;
  let L0 = leftRoots(est, flows), R0 = rightRoots(est, flows);
  // The region filter shrank the egress classes (their volumes ride the flow
  // list) and left the site rows and cloud nodes at full size, because those
  // are sized from the estate. Filtering to eu-central-1 now scales the sites
  // to the share of traffic that touches the matched regions, keeps only the
  // clouds that own one, and re-splits the site traffic across them.
  if (opts.filterRegion) {
    const q = String(opts.filterRegion);
    const match = est.regionsList.filter(r => r.region.includes(q) || `${r.cloud} ${r.region}`.includes(q));
    const wlTot = est.regionsList.reduce((a, r) => a + (r.wl || 0), 0) || 1;
    const share = match.reduce((a, r) => a + (r.wl || 0), 0) / wlTot;
    const matchWl = {}; match.forEach(r => { matchWl[r.cloud] = (matchWl[r.cloud] || 0) + (r.wl || 0); });
    const totMatch = Object.values(matchWl).reduce((a, v) => a + v, 0) || 1;
    L0 = L0.map(x => x.kind === 'site' ? { ...x, v: x.v * share, fabV: x.fabV * share } : x);
    const sitesVs = L0.filter(x => x.kind === 'site').reduce((a, x) => a + x.v, 0);
    const sitesFabs = L0.filter(x => x.kind === 'site').reduce((a, x) => a + x.fabV, 0);
    const fab0 = R0.filter(x => x.kind === 'cloud').reduce((a, x) => a + x.fabV, 0) || 1, pub0 = R0.filter(x => x.kind === 'cloud').reduce((a, x) => a + x.pubV, 0) || 1;
    L0 = L0.map(x => ({ ...x, ipsecV: (x.ipsecV || 0) * share }));
    R0 = R0.filter(x => x.kind === 'cloud' && matchWl[x.cloud]).map(x => { const k = matchWl[x.cloud] / totMatch, f = sitesFabs * k, u = Math.max(0, sitesVs - sitesFabs) * k;
      const rs = x.fabV ? f / x.fabV : 0; return { ...x, fabV: f, pubV: u, v: f + u, byRamp: Object.fromEntries(Object.entries(x.byRamp || {}).map(([r, v]) => [r, v * rs])) }; });
    void fab0; void pub0;
  }
  const L = expand(L0, open, est, inv, flows), R = expand(R0, open, est, inv, flows);
  const scale = (nd) => opts.t == null ? nd : { ...nd, v: nd.v * shapeAt(nd.key, opts.t), fabV: nd.fabV * shapeAt(nd.key, opts.t) };
  // Ramesh's first pattern (19:09): what stays within the region. Workload groups carry east-west traffic that never leaves the region; it gets its own band.
  const LOCAL = 0.6;
  const Ls = L.map(scale).map(x => ({ ...x, locV: 0 }));
  void LOCAL;
  const localV = Ls.reduce((a, x) => a + (x.locV || 0), 0);
  // The east-west node used to carry its volume twice - v AND locV - so the
  // sizer (which reads v + locV) drew it double height and the label printed
  // 147.7 against a real 73.9. One volume, one field.
  const Rs = [...R.map(scale), ...(localV > 0.001 ? [{ kind: 'dest', key: 'dest:local', name: 'Same region (east-west)', v: localV, fabV: 0, locV: 0, hasChildren: false, state: 'ok' }] : [])];
  const W = 900, colW = 12, minH = 14, pad = 5, headH = 16, gap = 14, top = 20, H0 = 500;
  const groups = [['sites', '']].map(([g, head]) => ({ g, head, nodes: Ls.filter(x => (x.group || rootGroup(x)) === g) })).filter(x => x.nodes.length);
  const T = Ls.reduce((a, x) => a + x.v + (x.locV || 0), 0) || 1, fabV = Ls.reduce((a, x) => a + x.fabV, 0);
  // Fixed frame (Micah, 16:35: "zoom on click"): the map keeps its height. With a zoom, the focused subtree takes
  // 55 percent of the row budget and everything else compresses into the rest; ribbons taper, so they still attach.
  const nLeft = Ls.length;
  const zoom = opts.zoom || null;
  const inZoom = (k) => !!zoom && (k === zoom || k.startsWith(zoom + '/'));
  const rowsBudget = (n, nGroups) => Math.max(100, H0 - top - nGroups * (headH + gap) - Math.max(0, n - nGroups) * pad);
  const subTot = zoom ? [...Ls, ...Rs].filter(x => inZoom(x.key) && x.kind !== 'more').reduce((a, x) => a + x.v + (x.locV || 0), 0) : 0;
  const scBase = Math.max(0.05, rowsBudget(nLeft, groups.length) / T);
  const zf = subTot > 0 ? Math.max(1, (rowsBudget(nLeft, groups.length) * 0.55) / (subTot * scBase)) : 1;
  const heightsFor = (arr, budgetPx) => {
    const nZ = arr.filter(x => inZoom(x.key) && x.kind !== 'more').length, nO = arr.filter(x => !inZoom(x.key) && x.kind !== 'more').length, nM = arr.filter(x => x.kind === 'more').length;
    const bz = nZ ? budgetPx * 0.55 : 0, bo = budgetPx - bz - nM * 18;
    const tz = arr.filter(x => inZoom(x.key) && x.kind !== 'more').reduce((a, x) => a + x.v + (x.locV || 0), 0) || 1;
    const to = arr.filter(x => !inZoom(x.key) && x.kind !== 'more').reduce((a, x) => a + x.v + (x.locV || 0), 0) || 1;
    const minZ = nZ ? Math.max(12, Math.min(22, Math.floor(bz / nZ))) : 12, minOh = nO ? Math.max(7, Math.min(14, Math.floor(bo / nO))) : 7;
    let rows = arr.map(x => { const tot = x.v + (x.locV || 0); const z = inZoom(x.key) && x.kind !== 'more'; const h = x.kind === 'more' ? 18 : z ? Math.max(minZ, tot / tz * bz) : Math.max(minOh, tot / to * (nZ ? bo : budgetPx)); return { ...x, h, tot, zoomed: z }; });
    const sum = rows.reduce((a, r) => a + r.h, 0);
    if (sum > budgetPx && sum > 0) { const f = budgetPx / sum; rows = rows.map(r => ({ ...r, h: Math.max(7, r.h * f) })); }
    return rows;
  };
  const layout = (rows, x, y0) => { let y = y0; return rows.map(r => { const o = { ...r, x, y, x2: x + colW, used: 0 }; y += o.h + pad; return o; }); };
  const leftRows = heightsFor(Ls, rowsBudget(nLeft, groups.length));
  const heads = []; const SS = []; let y = top + 20;
  // One column head for the left band, then a quieter head per group inside
  // it. Emitting three equal heads made the left band read as three columns.
  heads.push({ x: 0, y: top - 4, anchor: 'start', kind: 'col', text: 'Sites' });
  groups.forEach(g => { if (g.head) heads.push({ x: 0, y: y - 4, anchor: 'start', kind: 'group', text: g.head }); const mine = leftRows.filter(r => g.nodes.some(n0 => n0.key === r.key)); const placed = layout(mine, 0, y + headH - 6); SS.push(...placed); if (placed.length) y = placed[placed.length - 1].y + placed[placed.length - 1].h + gap; });
  const leftH = SS.length ? y - gap + 8 : top;
  heads.push({ x: W, y: top - 4, anchor: 'end', kind: 'col', text: 'Destinations' });
  heads.push({ x: W / 2, y: top - 4, anchor: 'middle', kind: 'col', text: 'Path' });
  const DD = layout(heightsFor(Rs, rowsBudget(Rs.length, 1)), W - colW, top + headH - 6);
  const rightH = DD.length ? DD[DD.length - 1].y + DD[DD.length - 1].h + 8 : top;
  const H = Math.max(leftH, rightH, H0);
  // The middle is the path the traffic actually takes (2026-09-28): each AT&T
  // on-ramp, the private WAN to your own data centers, and outside AT&T the
  // IPsec tunnels and the plain internet. Every mid adds up on both sides.
  const rampT = {}; Rs.forEach(d => Object.entries(d.byRamp || {}).forEach(([r, v]) => { rampT[r] = (rampT[r] || 0) + v; }));
  const rampSum = Object.values(rampT).reduce((a, v) => a + v, 0) || 1;
  const wanT = Rs.reduce((a, d) => a + (d.wan || 0), 0);
  const pubT = Rs.reduce((a, d) => a + (d.pubV || 0), 0);
  const ipsecT = Ls.reduce((a, x) => a + (x.ipsecV || 0), 0), inetT = Math.max(0, T - fabV - ipsecT);
  const cloudFabT = Math.max(0, fabV - wanT);
  const mids = [
    ...Object.entries(rampT).sort((a2, b2) => b2[1] - a2[1]).map(([r, v]) => ({ kind: 'mid', key: 'mid:' + r, name: r, ramp: r, v: cloudFabT * v / rampSum, fabV: cloudFabT * v / rampSum, priv: true, state: 'ok', hasChildren: false })),
    ...(wanT > 0.001 ? [{ kind: 'mid', key: 'mid:wan', name: 'Private WAN', v: wanT, fabV: wanT, priv: true, wan: true, state: 'ok', hasChildren: false }] : []),
    ...(ipsecT > 0.0005 ? [{ kind: 'mid', key: 'mid:ipsec', name: 'IPsec over internet', v: ipsecT, fabV: 0, priv: false, ipsec: true, state: 'slo', hasChildren: false }] : []),
    ...(inetT > 0.0005 ? [{ kind: 'mid', key: 'mid:internet', name: 'Internet', v: inetT, fabV: 0, priv: false, state: 'slo', hasChildren: false }] : []),
  ].filter(m => m.v > 0.0005);
  const crossedV = Math.max(0.0001, T - localV);
  const midBudget = rowsBudget(mids.length, 0) - 40;
  const MMh = mids.map(m => ({ ...m, tot: m.v, h: Math.max(minH, m.v / crossedV * midBudget) }));
  const midH = MMh.reduce((a, m) => a + m.h, 0) + pad * (MMh.length - 1);
  const MM = layout(MMh, W / 2 - colW / 2, Math.max(top, (H - midH) / 2));
  const ribbons = [];
  const patternOf = (a, b) => { const g = a.group || rootGroup(a); if (b.key === 'dest:local') return 'region'; if (g === 'sites' || b.kind === 'cloud' || b.key === 'dest:regions') return 'inbound'; if (g === 'c2c' || /inter-cloud/.test(b.name || '')) return 'clouds'; if (/object storage/.test(b.name || '')) return 'regions'; if (/AI endpoints|public internet/.test(b.name || '')) return 'internet'; return 'mixed'; };
  const link = (a, b, v, priv, kindOverride) => { if (v <= 0.0005) return; const sa = a.h / (a.tot || a.v || 1), sb = b.h / (b.tot || b.v || 1); const ay = a.y + a.used * sa, by = b.y + b.used * sb, ah = v * sa, bh = v * sb; a.used += v; b.used += v; const mx = (a.x2 + b.x) / 2; ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv, local: !!kindOverride, v, from: a.key, to: b.key, via: b.kind === 'mid' ? b.name : a.kind === 'mid' ? a.name : '', state: kindOverride ? 'ok' : priv ? 'ok' : (a.state !== 'ok' ? a.state : b.state), delta: deltaOf(a.key + '>' + b.key), pattern: kindOverride || patternOf(a, b) }); };
  const mid = (k) => MM.find(m => m.key === k);
  const wanShare = fabV ? wanT / fabV : 0;
  SS.forEach(s0 => {
    const f = s0.fabV || 0, ip = Math.min(s0.ipsecV || 0, Math.max(0, s0.v - f)), net = Math.max(0, s0.v - f - ip);
    MM.filter(m => m.ramp).forEach(m => link(s0, m, f * (1 - wanShare) * (rampT[m.ramp] / rampSum), true));
    if (mid('mid:wan')) link(s0, mid('mid:wan'), f * wanShare, true);
    if (mid('mid:ipsec')) link(s0, mid('mid:ipsec'), ip, false);
    if (mid('mid:internet')) link(s0, mid('mid:internet'), net, false);
  });
  DD.forEach(d => {
    Object.entries(d.byRamp || {}).forEach(([r, v]) => { const m = mid('mid:' + r); if (m) link(m, d, cloudFabT * v / rampSum, true); });
    if (d.wan && mid('mid:wan')) link(mid('mid:wan'), d, d.wan, true);
    const pv = d.pubV || 0;
    if (pv > 0 && pubT > 0) { const ipShare = ipsecT / Math.max(0.0001, ipsecT + inetT); if (mid('mid:ipsec')) link(mid('mid:ipsec'), d, pv * (pubT ? (ipsecT + inetT) / pubT : 1) * ipShare, false); if (mid('mid:internet')) link(mid('mid:internet'), d, pv * (pubT ? (ipsecT + inetT) / pubT : 1) * (1 - ipShare), false); }
  });
  const nodes = [...SS.map(x => ({ ...x, side: 'l' })), ...MM.map(x => ({ ...x, side: 'm' })), ...DD.map(x => ({ ...x, side: 'r' }))].map(x => ({ ...x, delta: deltaOf(x.key), open: open.has(x.key) }));
  return { W, H, heads, nodes, ribbons, total: T, fabV, localV, open: [...open], zoom, zf };
}
function rootGroup(x) { return x.kind === 'site' || x.kind === 'metro' || x.kind === 'sitename' || x.kind === 'circuit' ? 'sites' : x.kind === 'cloud' || x.kind === 'dest' || x.kind === 'dc' ? 'dest' : 'onramp'; }

/** The trail for a key: every ancestor's name, root first. */
export function trail(key, est, inv, flows) {
  const parts = key.split('/'); const out = []; let acc = '';
  const roots = [...leftRoots(est, flows), ...rightRoots(est, flows)];
  let node = null;
  for (let i = 0; i < parts.length; i++) { acc = i ? acc + '/' + parts[i] : parts[i]; node = i === 0 ? roots.find(r => r.key === acc) : (node ? childrenOf(node, est, inv, flows).find(c => c.key === acc) : null); if (!node) break; out.push({ key: acc, name: node.name, kind: node.kind, node }); }
  return out;
}

/** Keys that a hovered or selected node lights: itself, its ribbons, the mids they touch. */
export function litFor(map, key) {
  if (!key) return null;
  // An opened node is gone from the map; its descendants stand for it.
  const present = map.nodes.some(x => x.key === key);
  const isMine = (k) => present ? k === key : (k === key || k.startsWith(key + '/'));
  const rb = map.ribbons.filter(r => isMine(r.from) || isMine(r.to));
  const keys = new Set([key, ...map.nodes.filter(x => isMine(x.key)).map(x => x.key), ...rb.map(r => r.from), ...rb.map(r => r.to)]);
  return { keys, ribbons: new Set(rb.map((r, i) => map.ribbons.indexOf(r))) };
}

/** The five patterns Ramesh named (19:04), in his order. */
export const PATTERNS = [
  ['region', 'In the region', 'Traffic that starts and ends inside one cloud region. It never crosses a region boundary, so it costs nothing in egress.'],
  ['regions', 'Across regions', 'Traffic between two regions of the SAME cloud — us-east-1 to us-west-2. It leaves a region, so the hyperscaler bills egress on it.'],
  ['clouds', 'Across clouds', 'Traffic between DIFFERENT clouds — AWS to Azure. Billed egress at both ends unless it rides the AT&T network.'],
  ['internet', 'To the internet', 'Traffic leaving your estate for the public internet or SaaS. The most expensive path per GB and the least visible.'],
  ['inbound', 'Coming in', 'Traffic arriving from your sites and users into the cloud. Usually free to receive; the first mile decides how fast it is.'],
];
/** Ribbon indexes and node keys a pattern lights. Mid nodes light when any of their ribbons do. */
export function patternLit(map, pattern) {
  if (!pattern || pattern === 'all') return null;
  const idx = new Set(); const keys = new Set();
  map.ribbons.forEach((r, i) => { if (r.pattern === pattern) { idx.add(i); keys.add(r.from); keys.add(r.to); } });
  // second hop: a destination lit by the pattern also lights the mid→dest ribbons of the same pattern (already tagged), and sources feeding a lit mid keep their own tag.
  return { ribbons: idx, keys };
}

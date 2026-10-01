/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// Govern's one rule (w2-govern, 2026-09-30). What a policy matches and what
// breaks it, read off the estate's own inventory, so every figure Govern prints
// is the size of a set it can open:
//   - `tag X` matches the workloads in the VPCs that carry tag X: the count
//     Govern > Tags prints. `tag RemoteSite` names the remote sites;
//   - `region P` matches the workloads in the regions P names (`*`, or an area
//     such as `eu-*`, which counts each cloud's own name for it);
//   - `remote-site any` matches the remote sites; `remote-site X`, `branch X`
//     and `site X` the sites in business unit X, and nothing is measured until
//     a unit of that name exists;
//   - a path rule (private path, no direct internet path, inline inspection) is
//     broken by a workload that reaches the internet directly: its VPC has no
//     private path to AT&T, or it has a public address with its own route out
//     (Discover's "exposed"). For a site: it reaches the cloud outside AT&T;
//   - a latency SLO is broken by a workload whose region runs above it;
//   - anything else has no source here: "Not yet measured".
// Pure functions; the view binds them.
import { onAtt } from './naas-logic.js';
import * as S from './naas-sites.js';

export const tagKey = (t) => String(t || '').toLowerCase().replace(/\s+/g, '-');
const uniq = (xs) => [...new Set(xs)];
const PATH_REQ = /private path|direct internet|inspection/i;
const SLO_REQ = /latency slo\s*(\d+)/i;

/** The words for each rule, as a drill names its filter: "A workload breaks it when ...". */
export const RULE = {
  path: 'it reaches the internet directly: no private path to AT&T, or a public address with its own route out',
  slo: (ms) => `its region runs above the ${ms} ms latency SLO`,
  site: 'it reaches the cloud outside the AT&T network',
};

/** Every workload in the inventory, with where it sits. */
export function workloadsOf(inv) {
  const out = [];
  (inv || []).forEach(cl => (cl.regions || []).forEach(rg => (rg.vpcs || []).forEach(v => (v.subnets || []).forEach(sn => (sn.workloads || []).forEach(w =>
    out.push({ w, cloud: cl.name, region: rg.region, latency: rg.latency, vpc: v, sn }))))));
  return out;
}

/** One tag's footprint: the VPCs that carry it, their workloads, regions and clouds. */
export function tagSet(inv, tag) {
  const k = tagKey(tag), vpcs = [];
  (inv || []).forEach(cl => (cl.regions || []).forEach(rg => (rg.vpcs || []).forEach(v => {
    if ((v.tags || []).map(tagKey).includes(k)) vpcs.push({ cloud: cl.name, region: rg.region, latency: rg.latency, v });
  })));
  const workloads = vpcs.flatMap(x => (x.v.subnets || []).flatMap(sn => (sn.workloads || []).map(w => ({ w, cloud: x.cloud, region: x.region, latency: x.latency, vpc: x.v, sn }))));
  return {
    vpcs, workloads,
    regions: uniq(vpcs.map(x => `${x.cloud} ${x.region}`)).map(k2 => vpcs.find(x => `${x.cloud} ${x.region}` === k2)),
    clouds: uniq(vpcs.map(x => x.cloud)),
    publicVpcs: vpcs.filter(x => !x.v.priv),
    exposed: workloads.filter(x => x.w.exposed),
  };
}

/** The sites a remote-site rule names: the ones declared remote (class Branch). */
export const remoteSites = (est) => (est.sites || []).filter(st => st.cls === 'Branch');

/** How many a set holds: workloads one each, sites at their rollup count. */
export const count = (rows, unit) => (rows == null ? null : unit === 'site' ? rows.reduce((a, st) => a + S.countOf(st.name), 0) : rows.length);

// A residency rule names an area the way AWS does (`eu-*`); each cloud names it its own way
// (Azure westeurope, GCP europe-west1, Oracle eu-frankfurt-1), so the area counts them all.
const AREA = {
  eu: /^(eu-|europe-|westeurope|northeurope|uk|france|germany|switzerland|norway|sweden|poland|italy|spain)/i,
  ap: /^(ap-|asia-|australia|japan|southeastasia|eastasia|korea|india|central-india|south-india)/i,
};
const glob = (p) => {
  const a = /^([a-z]{2})-\*$/i.exec(String(p).trim());
  if (a && AREA[a[1].toLowerCase()]) return AREA[a[1].toLowerCase()];
  return new RegExp('^' + String(p).trim().split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
};

function matchOf(est, inv, p, opts) {
  const m = String((p && p.match) || '').trim();
  let x;
  if ((x = /^tag\s+(.+)$/i.exec(m))) {
    if (tagKey(x[1]) === 'remotesite') return { unit: 'site', rows: remoteSites(est) };
    return { unit: 'workload', rows: tagSet(inv, x[1]).workloads };
  }
  if ((x = /^region\s+(.+)$/i.exec(m))) { const re = glob(x[1]); return { unit: 'workload', rows: workloadsOf(inv).filter(r => re.test(r.region)) }; }
  if ((x = /^(remote-site|branch|site)\s+(.+)$/i.exec(m))) {
    const who = x[2].trim();
    if (/^any$/i.test(who)) return { unit: 'site', rows: remoteSites(est) };
    const tags = (opts && opts.siteTags) || {};
    const mine = (est.sites || []).filter(st => S.buOf(st, tags) === who);
    return { unit: 'site', rows: mine.length ? mine : null };
  }
  return { unit: null, rows: null };
}

/** What breaks a requirement, for a unit; null where the estate has no source. */
export function breaker(req, unit) {
  const preds = String(req || '').split(/\s+and\s+/i).map(cl => {
    if (unit === 'workload') {
      if (PATH_REQ.test(cl)) return (r) => !r.vpc.priv || !!r.w.exposed;
      const s = SLO_REQ.exec(cl); if (s) return (r) => r.latency > +s[1];
    }
    if (unit === 'site' && PATH_REQ.test(cl)) return (st) => !onAtt(st);
    return null;
  }).filter(Boolean);
  return preds.length ? (r) => preds.some(f => f(r)) : null;
}

/** The sentence a drill prints under its count: when a thing breaks the requirement. */
export function ruleLine(req, unit) {
  const r = String(req || '');
  const words = unit === 'site' ? (PATH_REQ.test(r) ? RULE.site : '') : PATH_REQ.test(r) ? RULE.path : SLO_REQ.test(r) ? RULE.slo(+SLO_REQ.exec(r)[1]) : '';
  return words ? `A ${unit === 'site' ? 'site' : 'workload'} breaks it when ${words}.` : '';
}

/** A policy's sets: what it matches and what breaks it (null: not yet measured). */
export function policySets(est, inv, p, opts = {}) {
  const m = matchOf(est, inv, p, opts);
  if (!m.rows) return { unit: m.unit, matched: null, viol: null };
  const f = breaker(p && p.req, m.unit);
  return { unit: m.unit, matched: m.rows, viol: f ? m.rows.filter(f) : null };
}

/** A policy's two figures, counted the way its sets are listed. */
export function policyFigures(est, inv, p, opts = {}) {
  const ps = policySets(est, inv, p, opts);
  return { unit: ps.unit, matched: count(ps.matched, ps.unit), viol: count(ps.viol, ps.unit) };
}

/** An estate's policies with their figures counted by the rule. */
export function figured(est, inv, opts = {}) {
  return (est.policies || []).map(p => { const f = policyFigures(est, inv, p, opts); return { ...p, matched: f.matched, viol: f.viol, unit: f.unit }; });
}

/** Why one workload breaks a path or latency rule, in a drill row's words. */
export function whyOf(r, req) {
  if (SLO_REQ.test(String(req || ''))) return `${r.latency} ms on its path`;
  if (!r.vpc.priv) return 'Its VPC rides the public internet';
  if (r.w.exposed) return 'Public address, its own route out';
  return 'On a private path';
}

/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// App health as a cloud architect reads it (the connect options session, 2026-10-06): "their app is running in the
// cloud ... the VMs, a database, a load balancer in front of it ... VMs are running hot, 95% utilization, a memory leak
// in the database, the network running 80% transmit and receive traffic, maybe this is not a good sign for this app ...
// based on following parameters we think this is not healthy ... customers say no, this is fine ... maybe you can
// customize your thresholds." The cloud's own monitoring already reads these (Azure's application health, CloudWatch,
// Cloud Monitoring); here they are modelled, and said to be.
//
// An app's health is the worst of its path (the network health the Health grid already reads) and these three signals
// against your thresholds. A signal at or over its threshold is over; within RISK_BAND under it, at risk; a database
// whose memory climbs and is never released is at risk whatever it reads. Pure: the view words and draws it.

export const THRESHOLDS = { vm: 85, db: 85, net: 75 };
export const RISK_BAND = 8;
export const STEP = 5, MIN = 50, MAX = 95;
export const SIGNALS = [
  { key: 'vm', label: 'Compute', unit: 'CPU', icon: 'smart-meter', what: 'VM CPU at the busiest hour' },
  { key: 'db', label: 'Database', unit: 'memory', icon: 'database', what: 'database memory in use' },
  { key: 'net', label: 'Network', unit: 'TX/RX', icon: 'cloud-transfer', what: 'transmit and receive, as a share of the link' },
];

// The estates' own signals where the story needs them, each set on an app whose path was not healthy then, so the
// default counts read as before and only your thresholds moved them. Since the delay figures left (2026-10-15) some of
// those paths read Healthy, so their apps read At risk or Over on these signals alone, and Health's row says which.
// Growing's finance app is the session's example.
const DESIGNED = {
  partial: { finance: { vm: 95, db: 91, leak: true, net: 80 }, 'internet-facing': { vm: 74, db: 58, net: 71 }, 'shared-services': { vm: 79, db: 52, net: 47 } },
  mature: { analytics: { vm: 64, db: 93, leak: true, net: 58 }, prod: { vm: 91, db: 66, net: 82 }, finance: { vm: 71, db: 80, net: 79 }, 'internet-facing': { vm: 78, db: 49, net: 61 } },
  trust: { pci: { vm: 96, db: 72, net: 84 }, 'internet-facing': { vm: 88, db: 70, net: 77 }, 'finance-invoices': { vm: 69, db: 90, leak: true, net: 55 }, analytics: { vm: 77, db: 61, net: 68 }, prod: { vm: 80, db: 55, net: 52 }, ai: { vm: 83, db: 47, net: 63 } },
  small: { 'internet-facing': { vm: 79, db: 44, net: 39 } },
};
// Everything else reads a steady, unremarkable value from its name: 22% to 62%, under any threshold you may set.
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const steady = (estId, tag, key) => 22 + (hash(`${estId}|${tag}|${key}`) % 41);

/** Your thresholds, clamped and filled from the defaults. */
export function thresholdsOf(t) {
  const out = { ...THRESHOLDS };
  for (const k of Object.keys(THRESHOLDS)) if (t && Number.isFinite(+t[k])) out[k] = Math.max(MIN, Math.min(MAX, Math.round(+t[k])));
  return out;
}
const RANK = { ok: 0, risk: 1, over: 2, down: 3 };
const worst = (xs) => xs.reduce((w, s) => (RANK[s] > RANK[w] ? s : w), 'ok');

/** One app's three signals against the thresholds, and their worst. */
export function signalsOf(est, tag, t) {
  const th = thresholdsOf(t), d = ((DESIGNED[est && est.id] || {})[tag]) || {};
  const sig = SIGNALS.map(s => {
    const value = Number.isFinite(d[s.key]) ? d[s.key] : steady((est && est.id) || '', tag, s.key);
    const leak = s.key === 'db' && !!d.leak;
    const state = value >= th[s.key] ? 'over' : value >= th[s.key] - RISK_BAND || leak ? 'risk' : 'ok';
    const why = state === 'over' ? `${s.label} ${value}% ${s.unit}, over your ${th[s.key]}%` : leak ? `${s.label} memory climbs and is never released (${value}%)` : state === 'risk' ? `${s.label} ${value}% ${s.unit}, near your ${th[s.key]}%` : '';
    return { ...s, value, threshold: th[s.key], leak, state, why };
  });
  return { signals: sig, state: worst(sig.map(x => x.state)), reasons: sig.filter(x => x.state !== 'ok').map(x => x.why) };
}

/** Every app's signals, keyed by its tag, for the health context. */
export function resourceOf(est, apps, t) {
  return Object.fromEntries((apps || []).map(a => [a.tag, signalsOf(est, a.tag, t)]));
}
export { worst as worstState };

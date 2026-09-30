/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-bandwidth.js — Modify bandwidth (Micah, 2026-09-30: "option to resize
// bandwidth like the netbond advanced flow"). Pure data.
//
// Transcribed, not re-invented, from NetBond Advanced on this machine:
//   ~/Developer/att-netbond-sdci/src/components/connection/modals/ModifyBandwidthModal.tsx
//     the flow: Current Bandwidth with the provider's burst note, the AWS
//     hosted-connection warning, New Bandwidth from the provider's list, the
//     cost impact (Current monthly, New monthly, Difference) once the size
//     changes, Cancel and Apply Change (disabled until it changes, Done after).
//     Its menu item (ConnectionOverflowMenu.tsx) reads "Modify Bandwidth" and is
//     disabled while the connection is Provisioning: here a change in progress
//     locks the choices until it lands.
//   ~/Developer/att-netbond-sdci/src/data/providerBandwidth.ts
//     the choices per provider, their labels and the burst model and note.
// House words are sentence case ("Modify bandwidth", "Apply change").
//
// Three readings the storefront adds, each said where it shows:
//   - A storefront connection is ports × a port size (3 × 10 Gbps). The
//     provider's list is the size of each port, as NetBond Advanced sizes one
//     connection; the port count is the storefront's own (Optimize's Resize
//     removes one, Add a port adds one).
//   - The price is the catalog's: NetBond for Cloud at $1,800 a month for up to
//     10 Gbps, read per Mbps the way NetBond Advanced prices (Mbps × a rate).
//     A list price applied to a size, so every figure it makes is Modelled.
//   - When it lands: the Resize order this flow replaces took 1 business day
//     (naas-app.js, the s6 order it built, 2026-09-30), so a change takes
//     effect the next business day, Central time like the Changes list.
import { CATALOG } from './naas-data.js';
import { attHolds, fmt } from './naas-logic.js';

const T = (mbps, label) => ({ mbps, label });
// providerBandwidth.ts AWS_HOSTED, AZURE_CIRCUIT, GOOGLE_PARTNER, ORACLE_PARTNER, DEFAULT_BANDWIDTH.
export const TIERS = {
  AWS: [T(50, '50 Mbps'), T(100, '100 Mbps'), T(200, '200 Mbps'), T(300, '300 Mbps'), T(400, '400 Mbps'), T(500, '500 Mbps'), T(1000, '1 Gbps'), T(2000, '2 Gbps'), T(5000, '5 Gbps'), T(10000, '10 Gbps'), T(25000, '25 Gbps')],
  Azure: [T(50, '50 Mbps'), T(100, '100 Mbps'), T(200, '200 Mbps'), T(500, '500 Mbps'), T(1000, '1 Gbps'), T(2000, '2 Gbps'), T(5000, '5 Gbps'), T(10000, '10 Gbps')],
  GCP: [T(50, '50 Mbps'), T(100, '100 Mbps'), T(200, '200 Mbps'), T(300, '300 Mbps'), T(500, '500 Mbps'), T(1000, '1 Gbps'), T(2000, '2 Gbps'), T(5000, '5 Gbps'), T(10000, '10 Gbps'), T(20000, '20 Gbps'), T(50000, '50 Gbps')],
  Oracle: [T(1000, '1 Gbps'), T(2000, '2 Gbps'), T(5000, '5 Gbps'), T(10000, '10 Gbps')],
};
export const DEFAULT_TIERS = [T(100, '100 Mbps'), T(500, '500 Mbps'), T(1000, '1 Gbps'), T(2000, '2 Gbps'), T(5000, '5 Gbps'), T(10000, '10 Gbps')];
// providerBandwidth.ts PROVIDER_CONFIGS: the burst model and its note, verbatim.
// NetBond Advanced calls GCP 'Google'; the storefront's cloud is 'GCP'.
const BURST = {
  AWS: { model: 'fixed', x: 1, note: 'Traffic exceeding provisioned rate is dropped (traffic policing).' },
  Azure: { model: 'burstable', x: 2, note: 'Can burst up to 2x provisioned bandwidth using redundancy link. Not for sustained use.' },
  GCP: { model: 'soft', x: 1, note: 'Capacity is approximate. Attachments may exceed provisioned bandwidth. Rate limiting on your router recommended.' },
  Oracle: { model: 'fixed', x: 1, note: 'Fixed provisioned bandwidth. Can be modified after creation.' },
};
const BURST_DEFAULT = { model: 'fixed', x: 1, note: 'Fixed provisioned bandwidth.' };
// ModifyBandwidthModal.tsx: a classic AWS hosted connection is replaced at the new speed.
export const AWS_HOSTED_NOTE = 'AWS hosted connections require provisioning new connections at the new speed. Existing connections will be replaced.';
export const EFFECT_DAYS = 1;

export const tiersFor = (cloud) => TIERS[cloud] || DEFAULT_TIERS;
export const burstFor = (cloud) => BURST[cloud] || BURST_DEFAULT;
export const burstNoteFor = (cloud) => burstFor(cloud).note;

/** AT&T sells the bandwidth where it holds the on-ramp: NetBond, never a cloud provider's or Equinix's port. The one rule (naas-logic.js attHolds). */
export const sells = (row) => !!row && attHolds({ priv: true, ramp: row.ramp });

// The catalog's NetBond for Cloud: its price, for up to the Gbps its line says.
const NB = CATALOG.find(p => p.id === 'netbond') || { price: 0, included: [] };
const UP_TO = (NB.included || []).map(x => /^Up to (\d+) Gbps$/.exec(x)).find(Boolean);
export const RATE = { product: NB.name, price: NB.price, upToMbps: UP_TO ? +UP_TO[1] * 1000 : 10000, modelled: true };
RATE.perMbps = RATE.price / RATE.upToMbps;
export const MODELLED_TITLE = `${RATE.product} at ${fmt(RATE.price)} a month for up to ${RATE.upToMbps / 1000} Gbps, read per Mbps. A list price applied to a size, not a quote.`;

/** 150 Mbps, 1.2 Gbps, 30 Gbps; negative when a size is short of the peak. */
export function bwF(mbps) {
  const neg = mbps < 0, m = Math.abs(mbps);
  const s = m < 1000 ? `${Math.round(m)} Mbps` : `${+(m / 1000).toFixed(1)} Gbps`;
  return (neg ? '-' : '') + s;
}
/** '3 × 10 Gbps', or '10 Gbps' on one port. */
export const sizeF = (ports, mbps) => (ports > 1 ? `${ports} × ` : '') + bwF(mbps);
/** '3 × 10G' for the tight Capacity column, the way its Ports cell reads. */
export const sizeShort = (ports, mbps) => (ports > 1 ? `${ports} × ` : '') + (mbps < 1000 ? `${mbps}M` : `${+(mbps / 1000).toFixed(1)}G`);
const perMo = (v) => fmt(v) + '/mo';
const diffMo = (v) => (v > 0 ? '+' : v < 0 ? '-' : '') + fmt(Math.abs(v)) + '/mo';
export const monthlyOf = (ports, mbps) => ports * mbps * RATE.perMbps;

// What a size does to the peak. Over the port: dropped where the provider
// polices, a burst where it lets you (Azure, up to 2x, not for sustained use).
export const FIT_WORD = { ok: 'Holds the peak', risk: 'Over 80% at peak', down: 'Short of the peak' };
const fitOf = (peakPct, burst) => (peakPct > 100 * burst.x ? 'down' : peakPct > 80 ? 'risk' : 'ok');

/** The ports stepper's bounds: at least one port; at most twice today's (four more on a small one). A bound on the control, not a product limit. */
export const portsRange = (nowPorts) => ({ min: 1, max: Math.max(nowPorts * 2, nowPorts + 4) });

/**
 * What each size does to one connection. cp is a row of the one capacity
 * function (naas-observe-dash.js capacity): ports, port size, the peak and the
 * 6-month average. pick is { ports, mbps } per port, or nothing for today's.
 */
export function plan(cp, pick) {
  const tiers = tiersFor(cp.cloud), burst = burstFor(cp.cloud);
  const nowMbps = Math.round((cp.portG || 10) * 1000), nowPorts = cp.ports || 1;
  const range = portsRange(nowPorts);
  const ports = Math.min(range.max, Math.max(range.min, (pick && pick.ports) || nowPorts));
  const mbps = (pick && pick.mbps) || nowMbps;
  const peakMbps = Math.round((cp.peakG || 0) * 1000);
  const capNow = nowPorts * nowMbps;
  const avgG = +((cp.capG || capNow / 1000) * (cp.avg6mPct || 0) / 100).toFixed(1);
  const avgMbps = avgG * 1000;
  const now = { ports: nowPorts, mbps: nowMbps, capMbps: capNow, label: sizeF(nowPorts, nowMbps), short: sizeShort(nowPorts, nowMbps), capF: bwF(capNow), monthly: monthlyOf(nowPorts, nowMbps) };
  now.monthlyF = fmt(now.monthly);
  const choice = (t) => {
    const capMbps = ports * t.mbps, peakPct = capMbps ? peakMbps / capMbps * 100 : 0, avgPct = capMbps ? avgMbps / capMbps * 100 : 0;
    const headroomMbps = capMbps - peakMbps, state = fitOf(peakPct, burst), monthly = monthlyOf(ports, t.mbps);
    return { key: 't' + t.mbps, mbps: t.mbps, label: t.label, total: sizeF(ports, t.mbps), capMbps, capF: bwF(capMbps), peakPct, avgPct, headroomMbps, headroomF: bwF(headroomMbps), state, fitWord: FIT_WORD[state],
      monthly, monthlyF: fmt(monthly), diff: monthly - now.monthly, now: ports === nowPorts && t.mbps === nowMbps, on: t.mbps === mbps };
  };
  const choices = tiers.map(choice);
  // A size the provider list lacks still reads (a port bought before the list changed).
  const chosen = choices.find(c => c.on) || choice({ mbps, label: bwF(mbps) });
  const pickRow = { ...chosen, label: sizeF(ports, mbps), short: sizeShort(ports, mbps) };
  const changed = ports !== nowPorts || mbps !== nowMbps;
  const diff = pickRow.monthly - now.monthly;
  return {
    id: cp.id, where: `${cp.cloud} ${cp.region}`, cloud: cp.cloud, region: cp.region, ramp: cp.ramp,
    now, ports, mbps, range, choices, pick: pickRow, changed, diff, diffF: diffMo(diff), nowMonthlyF: perMo(now.monthly), newMonthlyF: perMo(pickRow.monthly),
    peakMbps, peakF: bwF(peakMbps), peakPct: cp.peakPct, avgMbps, avgF: `${avgG} Gbps`, avgPct: cp.avg6mPct,
    headroomMbps: capNow - peakMbps, headroomF: bwF(capNow - peakMbps),
    burstNote: burst.note, burstModel: burst.model, hostedNote: cp.cloud === 'AWS' ? AWS_HOSTED_NOTE : '',
  };
}

const DOW = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Chicago' });
const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
/** The business day a change ordered at `at` takes effect: EFFECT_DAYS out, past a weekend. */
export function effectiveAt(at) {
  let t = at, left = EFFECT_DAYS;
  while (left > 0) { t += 86400000; if (!/^(Sat|Sun)/.test(DOW.format(new Date(t)))) left--; }
  return t;
}
export const dayF = (t) => DAY.format(new Date(t));

/** The order Apply change records: the change, in progress, the business day it lands. est scopes it to one estate. */
export function orderOf(cp, pick, at, est = null) {
  const p = plan(cp, pick), on = effectiveAt(at);
  return { key: `bw:${est || ''}:${cp.id}:${at}`, est, id: cp.id, where: p.where, cloud: cp.cloud, region: cp.region, from: p.now.label, to: p.pick.label, toShort: p.pick.short,
    ports: p.ports, mbps: p.mbps, monthlyFrom: p.now.monthly, monthlyTo: p.pick.monthly, diff: p.diff, at, days: EFFECT_DAYS, effectiveAt: on, effectiveF: dayF(on), state: 'progress', stateWord: 'In progress' };
}

/** The change in progress on one connection of one estate, if any. */
export const inFlight = (orders, est, id) => (orders || []).find(o => o.est === est && o.id === id && o.state === 'progress') || null;

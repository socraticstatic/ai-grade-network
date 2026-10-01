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
//     changes, Cancel and Apply Change. Its menu item
//     (ConnectionOverflowMenu.tsx) reads "Modify Bandwidth" and is disabled
//     while the connection is Provisioning: here an order not yet landed
//     locks the choices until it lands.
//   ~/Developer/att-netbond-sdci/src/data/providerBandwidth.ts
//     the choices per provider, their labels and the burst model and note.
// House words are sentence case ("Modify bandwidth", "Apply change").
//
// What the storefront adds, each said where it shows:
//   - A storefront connection is ports × a port size (3 × 10 Gbps). The
//     provider's list sizes each port, as NetBond Advanced sizes one
//     connection; the port count is the storefront's own (Optimize's Resize
//     removes one, Add a port adds one).
//   - One price for one connection (skeptic, 2026-09-30): the price Cost > By
//     leg and AT&T charges bill, NetBond on-ramps at one catalog price per
//     region (naas-round2.js attChargeRows). A size inside the catalog's
//     "Up to 10 Gbps" a port keeps that price; a port past it is not in the
//     catalog, so AT&T prices it after review. Nothing is read per Mbps.
//   - The approval step the retired Resize had (Review: Timeline, Notify,
//     Approver, Submit) comes back inside the drawer, and Submit places an
//     order in the app's one order list, the one Connect > Orders shows.
//   - When it lands: 1 business day, as that Resize order took, Central time
//     like the Changes list. Every stage reads the one clock (SCH.nowOf):
//     before its day an order is Submitted for approval, from its day it is
//     Live and the connection is the size it was changed to.
import { CATALOG } from './naas-data.js';
import { attHolds, fmt } from './naas-logic.js';
import { HEALTH_INK, RAMP_NAME } from './naas-flowmap.js';
import { ORDER_STAGE, PRICE_NOTE, ceilMbpsOf } from './naas-connect-flow.js';

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

// The catalog's NetBond for Cloud: "Up to 10 Gbps" is the size its one price covers, a port.
// The connect flow reads the same line for a new connection (naas-connect-flow.js ceilMbpsOf).
const NB = CATALOG.find(p => p.id === 'netbond') || { included: [] };
export const PORT_CEIL_MBPS = isFinite(ceilMbpsOf(NB)) ? ceilMbpsOf(NB) : 10000;

/** What Cost bills one NetBond connection a month: its region's share of the NetBond on-ramps line (attChargeRows). Null where that line does not bill it. */
export function unitOf(chargeRows, region) {
  const nb = (chargeRows || []).find(r => r.key === 'nb');
  return nb && (nb.regions || []).includes(region) ? nb.v / nb.regions.length : null;
}

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

// What a size does to the peak. Over the port: dropped where the provider
// polices, a burst where it lets you (Azure, up to 2x, not for sustained use).
export const FIT_WORD = { ok: 'Holds the peak', risk: 'Over 80% at peak', down: 'Short of the peak' };
// Round 3 (skeptic, 2026-09-30): a size short of the peak reads in the error ink, as Capacity's
// Degraded does, so amber means only over 80%. It keeps its own square mark (F.healthRadius).
export const FIT_INK = { ok: HEALTH_INK.ok, risk: HEALTH_INK.risk, down: HEALTH_INK.down };
/** Short of the peak drops traffic where the provider polices or the burst runs out; GCP's capacity is approximate, so there it is only short. */
export const dropsTraffic = (cloud) => burstFor(cloud).model !== 'soft';
export const downWordFor = (cloud) => (dropsTraffic(cloud) ? 'Short of the peak, drops traffic' : 'Short of the peak');
export const confirmHeadFor = (cloud) => (dropsTraffic(cloud) ? 'This size drops traffic' : 'This size is short of the peak');
const fitOf = (peakPct, burst) => (peakPct > 100 * burst.x ? 'down' : peakPct > 80 ? 'risk' : 'ok');

/** The ports stepper's bounds: at least one port; at most twice today's (four more on a small one). A bound on the control, not a product limit. */
export const portsRange = (nowPorts) => ({ min: 1, max: Math.max(nowPorts * 2, nowPorts + 4) });

/**
 * What each size does to one connection. cp is a row of the one capacity
 * function (naas-observe-dash.js capacity): ports, port size, the peak and the
 * window's average. pick is { ports, mbps } per port, or nothing for today's.
 * unit is what Cost bills the connection a month (unitOf), or null.
 */
export function plan(cp, pick, unit = null) {
  const tiers = tiersFor(cp.cloud), burst = burstFor(cp.cloud);
  const nowMbps = Math.round((cp.portG || 10) * 1000), nowPorts = cp.ports || 1;
  const range = portsRange(nowPorts);
  const ports = Math.min(range.max, Math.max(range.min, (pick && pick.ports) || nowPorts));
  const mbps = (pick && pick.mbps) || nowMbps;
  const peakMbps = Math.round((cp.peakG || 0) * 1000);
  const capNow = nowPorts * nowMbps;
  const priceOf = (m) => (unit === null || m > PORT_CEIL_MBPS ? null : unit);
  const now = { ports: nowPorts, mbps: nowMbps, capMbps: capNow, label: sizeF(nowPorts, nowMbps), short: sizeShort(nowPorts, nowMbps), capF: bwF(capNow), monthly: priceOf(nowMbps) };
  const choice = (t) => {
    const capMbps = ports * t.mbps, peakPct = capMbps ? peakMbps / capMbps * 100 : 0;
    const headroomMbps = capMbps - peakMbps, state = fitOf(peakPct, burst);
    return { key: 't' + t.mbps, mbps: t.mbps, label: t.label, total: sizeF(ports, t.mbps), capMbps, capF: bwF(capMbps), peakPct, headroomMbps, headroomF: bwF(headroomMbps), state, fitWord: FIT_WORD[state],
      monthly: priceOf(t.mbps), now: ports === nowPorts && t.mbps === nowMbps, on: t.mbps === mbps };
  };
  const choices = tiers.map(choice);
  // A size the provider list lacks still reads (a port bought before the list changed).
  const chosen = choices.find(c => c.on) || choice({ mbps, label: bwF(mbps) });
  const pickRow = { ...chosen, label: sizeF(ports, mbps), short: sizeShort(ports, mbps) };
  const changed = ports !== nowPorts || mbps !== nowMbps;
  const diff = pickRow.monthly === null || now.monthly === null ? null : pickRow.monthly - now.monthly;
  const perMo = (v) => (v === null ? 'After review' : fmt(v) + '/mo');
  return {
    id: cp.id, where: `${cp.cloud} ${cp.region}`, cloud: cp.cloud, region: cp.region, ramp: cp.ramp,
    now, ports, mbps, range, choices, pick: pickRow, changed, burst,
    diff, diffF: diff === null ? 'After review' : diff === 0 ? 'No change' : (diff > 0 ? '+' : '-') + fmt(Math.abs(diff)) + '/mo',
    nowMonthlyF: perMo(now.monthly), newMonthlyF: perMo(pickRow.monthly), unit,
    peakMbps, peakF: bwF(peakMbps), peakPct: cp.peakPct,
    headroomMbps: capNow - peakMbps, headroomF: bwF(capNow - peakMbps),
    burstNote: burst.note, burstModel: burst.model, hostedNote: cp.cloud === 'AWS' ? AWS_HOSTED_NOTE : '',
  };
}

/** The line beside Apply change: nothing when the pick holds the peak. */
export function fitLine(p) {
  const st = p.pick.state;
  return st === 'down' ? `Short of the ${p.peakF} peak.` : st === 'risk' ? `Over 80% at the ${p.peakF} peak.` : '';
}
/** What a size short of the peak does, in the provider's words: said again on the confirm and on approval. */
export const dropLine = (p) => (p.pick.state === 'down' ? `Short of the ${p.peakF} peak. ${p.burstNote}` : '');
/** Monthly, in the words Review and Orders use: "$1,800/mo, no change". */
export function monthlyWords(p) {
  if (p.pick.monthly === null) return PRICE_NOTE;
  return `${fmt(p.pick.monthly)}/mo${p.diff === 0 ? ', no change' : ''}`;
}
/** Whose price it is, said once under the price change. */
export function priceLine(p) {
  if (p.unit === null) return PRICE_NOTE + '.';
  if (p.pick.monthly === null) return `${bwF(p.mbps)} a port is past the catalog's ${PORT_CEIL_MBPS / 1000} Gbps line. Priced by AT&T after review.`;
  return `1 region × ${fmt(p.unit)} for ports up to ${PORT_CEIL_MBPS / 1000} Gbps, as Cost bills NetBond.`;
}

const DOW = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Chicago' });
const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
const HHMM = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Chicago' });
/** The business day a change ordered at `at` takes effect: EFFECT_DAYS out, past a weekend. */
export function effectiveAt(at) {
  let t = at, left = EFFECT_DAYS;
  while (left > 0) { t += 86400000; if (!/^(Sat|Sun)/.test(DOW.format(new Date(t)))) left--; }
  return t;
}
export const dayF = (t) => DAY.format(new Date(t));

/**
 * The order Submit places, in the shape of the app's one order list (the
 * connect flow's placedRecord): id, title, type, what, monthly, term, policy,
 * at, stage. kind, est and conn say which connection of which estate it
 * changes; atMs and effectiveAt put it on the one clock.
 */
export function orderOf(cp, pick, at, est = null, { n = 1, id = '', approver = '', unit = null } = {}) {
  const p = plan(cp, pick, unit), on = effectiveAt(at);
  return { id: id || `o${n}`, kind: 'bandwidth', est, conn: cp.id, title: `Modify bandwidth, ${p.where}`, type: RAMP_NAME[cp.ramp] || cp.ramp, what: `${p.now.label} to ${p.pick.label}`,
    monthly: monthlyWords(p), term: '', policy: '', at: HHMM.format(new Date(at)), atMs: at, stage: ORDER_STAGE, approver,
    where: p.where, cloud: cp.cloud, region: cp.region, from: p.now.label, to: p.pick.label, toShort: p.pick.short, ports: p.ports, mbps: p.mbps,
    days: EFFECT_DAYS, effectiveAt: on, effectiveF: dayF(on) };
}

/**
 * The next bandwidth order's id (w2, 2026-09-30): orders.length + 1 repeated an id once Reset
 * demo had cleared the bandwidth changes and kept a connect flow order (o2 and o2). Bandwidth
 * orders count their own ids, and never share the connect flow's o-numbers.
 */
export const nextId = (orders) => 'bw' + (1 + Math.max(0, ...(orders || []).map(o => +((/^bw(\d+)$/.exec((o && o.id) || '') || [])[1] || 0))));
/** An order's stage on the one clock: pending before its day, live from it. */
export const stageOf = (o, now) => (now >= o.effectiveAt ? 'live' : 'pending');
/** The bandwidth orders of one estate, from the app's one order list. */
export const ordersOf = (orders, est) => (orders || []).filter(o => o && o.kind === 'bandwidth' && o.est === est);
/** The change not yet landed on one connection of one estate, if any. */
export const inFlight = (orders, est, id, now) => ordersOf(orders, est).find(o => o.conn === id && stageOf(o, now) === 'pending') || null;

/**
 * The estate's utilization rows with every landed change applied (A.observe's
 * utilRows): the ports and the port size it was changed to, and the share of
 * that the same traffic fills. Everything that reads a connection's size reads
 * these rows, so Capacity, the panel, Optimize and the drawer agree.
 *
 * Round 3 (skeptic, 2026-09-30): a resize changes the port, never the traffic.
 * `was` keeps the size and share the peak was measured on, so X.connections
 * reads the same peak in Gbps whatever the new size; its share of the new size
 * is not capped, so a size short of the peak reads over 100%, as it is.
 */
export function landUtil(ob, orders, est, now) {
  const done = ordersOf(orders, est).filter(o => stageOf(o, now) === 'live').sort((a, b) => a.effectiveAt - b.effectiveAt);
  if (!ob || !done.length || !(ob.utilRows || []).length) return ob;
  const rows = ob.utilRows.map(u => {
    const o = done.filter(x => x.region === u.region).pop();
    if (!o) return u;
    const portG = o.mbps / 1000, cap = o.ports * portG, was = { cap: u.cap, pct: u.pct }, peakG = +(u.cap * u.pct / 100).toFixed(1);
    return { ...u, ports: o.ports, portG, cap, bw: sizeF(o.ports, o.mbps), bwShort: sizeShort(o.ports, o.mbps), was, pct: Math.round(peakG / cap * 100) };
  });
  const capGbps = rows.reduce((a, u) => a + u.cap, 0);
  return { ...ob, utilRows: rows, capGbps, util: capGbps ? Math.min(99, Math.round(rows.reduce((a, u) => a + u.gbps, 0) / capGbps * 100)) : 0 };
}

/** A move over several connections says how many are under way: '', 'In progress', or '1 of 2 in progress'. */
export function moveState(targets, orders, est, now) {
  const n = (targets || []).length, k = (targets || []).filter(t => inFlight(orders, est, t.id, now)).length;
  return !k ? '' : k === n ? 'In progress' : `${k} of ${n} in progress`;
}

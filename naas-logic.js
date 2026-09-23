/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// Layout and derivation helpers for the NaaS storefront. Pure functions, no DOM.
export const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
/** "1 cloud" / "2 clouds" / "4,120 sites". Every count in the copy goes through this. */
export const plural = (n, one, many) => `${Number(n).toLocaleString('en-US')} ${n === 1 ? one : many}`;
/** What discovery found, in one phrase. */
export const estatePhrase = (est) => `${plural(est.clouds, 'cloud', 'clouds')}, ${plural(est.regions, 'region', 'regions')}, ${plural(est.workloads, 'workload', 'workloads')}`;

const CLOUD_ORDER = ['AWS', 'Azure', 'GCP', 'CoreWeave', 'Oracle'];

// Who holds the SLA for each segment of a path. NetBond is AT&T's edge (the IPE);
// Direct Connect and ExpressRoute are the hyperscaler's; Equinix is a third
// party. Every access product on these estates is AT&T's today; a Lumen or other
// carrier last mile is a third party even when it hands off onto AT&T's edge.
export const RAMP_EDGE = { NetBond: 'att', DX: 'cloud', ER: 'cloud', Interconnect: 'cloud', EQX: 'third' };
export const accessOwner = (access) => (/lumen/i.test(access || '') ? 'third' : 'att');

// A mixed-carrier estate needs its third-party sites on the picture, not folded
// into "+N more", so the root shows up to nine. A drill level keeps its sample
// of seven: the full list lives in the drawer, and the sample size is what the
// drawer's "hidden" count is measured against.
const ROOT_SITES = 9, DRILL_SITES = 7;

export function heroLayout(est, opts) {
  // The canvas is derived from the estate, not fixed. A full estate fills
  // every one of these numbers, so they are the maxima; a two-site estate
  // gets a picture sized to it instead of 88% whitespace.
  //
  // BAND_H_MIN is measured, not chosen: the stratum card at html:381 holds
  // 84px of content (18 + 14 + 20, two gaps, two pads), the card is
  // bandH/4 - 12, and the compact card closes its pads and gaps to fit 70px
  // into 72px. Four strata of 84 is the floor.
  //
  // The measurement reads the ROOT rows, never opts.siteRows / opts.regionRows,
  // so the picture never changes height under a click.
  const W = 1392, H_MAX = 560, BAND_H_MAX = 396, BAND_H_MIN = 336;
  const LANE_GAP = 16, LANE_H = 76, FOOT = 44, COL_TOP = 30, CARD_H = 36, GAP_MAX = 66, INET_OVER_LANE = 60;
  const rowH = 34, groupHead = 20, groupGap = 12;
  const bandX = opts.bandX || 560, bandW = opts.bandW || 240, bandY = 28;
  const empty = !est || est.stage === 'empty';
  // Row pitch is measured against the tallest canvas, never the derived one,
  // so shrinking the picture never re-spaces a full estate's rows.
  const pitch = (k) => k > 1 ? Math.min(GAP_MAX, (H_MAX - 120) / (k - 1)) : 0;

  const rootN = empty ? 3 : Math.min(ROOT_SITES, (est.sites || []).length);
  const sitesEnd = rootN ? COL_TOP + (rootN - 1) * pitch(rootN) + CARD_H : 0;
  const rootRegs = empty ? 2 : (est.regionsList || []).length;
  const rootClouds = empty ? 2 : new Set((est.regionsList || []).map(r => r.cloud)).size;
  const cloudsEnd = COL_TOP + rootClouds * (groupHead + groupGap) + rootRegs * rowH + (!empty && est.regionsExtra ? rowH : 0);
  const bandH = Math.max(BAND_H_MIN, Math.min(BAND_H_MAX, Math.max(sitesEnd, cloudsEnd) + 28));
  const strataH = bandH / 4;
  // Beneath the band: the lane for traffic that never touches the AT&T fabric (third party, internet). Ramesh, 2026-09-09.
  const lane = { x: bandX, y: bandY + bandH + LANE_GAP, w: bandW, h: LANE_H };
  const H = lane.y + lane.h + FOOT;
  const internetFloor = lane.y - INET_OVER_LANE;

  const out = { W, H, bandX, bandW, bandY, bandH, lane, sites: [], groups: [], regions: [], workloads: [], edges: [], arcs: [], internet: null, strata: [], ghost: false };
  const clampBand = (y) => Math.round(Math.min(bandY + bandH - 24, Math.max(bandY + 24, y)));
  const clampLane = (y) => Math.round(Math.min(lane.y + lane.h - 14, Math.max(lane.y + 14, y)));
  out.ghost = empty;

  const rawSites = empty ? [{ name: 'Your data centers', access: 'AVPN, ASE', ghost: true }, { name: 'Your sites', access: 'ADI, ABF, SD-WAN', ghost: true }, { name: 'Your internet sites', access: 'Internet first mile', ghost: true }] : (opts.siteRows || est.sites);
  const cap = opts.siteRows ? DRILL_SITES : ROOT_SITES;
  const sites = rawSites.length > cap ? [...rawSites.slice(0, cap - 1), { name: `+${fmtN(rawSites.length - (cap - 1))} more`, access: 'open the list ›', more: true, rollup: false }] : rawSites;
  const n = sites.length;
  const gap = pitch(n);
  const top = 48 + ((H - 96) - (n - 1) * gap) / 2 - 18;
  // Where a site enters the band. Clamping each one separately is right while the
  // column fits the band, but once it is taller every site below the band's floor
  // lands on the same pixel, and two routes enter on top of each other. Then the
  // column is spread across the band's height instead.
  const colTop = top + 18, colBot = top + (n - 1) * gap + 18, usable = bandH - 48;
  // Taller than the band can hold, not merely offset from it: an offset column
  // still clamps cleanly, and re-spacing it would move estates that were fine.
  const overflows = n > 1 && colBot - colTop > usable;
  const enterBand = (y) => overflows ? Math.round(bandY + 24 + (y - colTop) / (colBot - colTop) * usable) : clampBand(y);
  sites.forEach((s, i) => {
    const y = Math.round(top + i * gap);
    out.sites.push({ ...s, i, y, cy: y + 18, key: 'site' + i });
    const viaLane = !s.priv && !s.ghost;
    out.edges.push({ id: 'in' + i, kind: 'ingress', priv: !!s.priv, ghost: !!s.ghost, viaLane, x1: 224, y1: y + 18, x2: bandX, y2: viaLane ? clampLane(y + 18) : enterBand(y + 18), site: s });
  });

  const regs = empty ? [{ cloud: 'Clouds', region: 'Your regions', ghost: true, wl: 0 }, { cloud: 'Neoclouds', region: 'Your GPU regions', ghost: true, wl: 0 }] : (opts.regionRows || est.regionsList);
  const byCloud = {};
  regs.forEach(r => { (byCloud[r.cloud] = byCloud[r.cloud] || []).push(r); });
  const ord = (c) => { const i = CLOUD_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  const clouds = Object.keys(byCloud).sort((a, b) => ord(a) - ord(b));
  let y = COL_TOP;
  clouds.forEach(c => {
    out.groups.push({ cloud: c, y, count: byCloud[c].length });
    y += groupHead;
    byCloud[c].forEach((r, j) => {
      const ry = y;
      out.regions.push({ ...r, y: ry, cy: ry + 14, key: (r.child ? 'c:' : '') + r.region });
      const viaLane = !r.priv && !r.ghost;
      if (!r.noEdge && !r.other) out.edges.push({ id: 'eg' + out.regions.length, kind: 'egress', priv: !!r.priv, ghost: !!r.ghost, viaLane, x1: bandX + bandW, y1: viaLane ? clampLane(ry + 14) : Math.round(Math.min(bandY + bandH - 40, Math.max(bandY + 24, ry + 14))), x2: 980, y2: ry + 14, chip: r.ramp, shield: !!r.priv && (r.ramp === 'NetBond' || r.ramp === 'ER'), region: r, dur: r.fab ? Math.max(1.2, r.fab / 6) : 3 });
      if (r.wl) out.workloads.push({ region: r.region, y: ry + 3, label: r.wlLabel || (r.wl.toLocaleString('en-US') + ' workloads'), key: 'wl' + (r.child ? 'c:' : '') + r.region, tags: r.tags });
      y += rowH;
    });
    y += groupGap;
  });
  if (!empty && est.regionsExtra && !opts.regionRows) { out.regions.push({ cloud: '', region: `${est.regionsExtra} smaller regions rolled up`, rollup: true, muted: true, y, cy: y + 14, key: 'more' }); y += rowH; }
  out.internet = { y: Math.min(H - 36, Math.max(y + 8, internetFloor)) };
  out.edges.push({ id: 'inet', kind: 'internet', priv: false, ghost: empty, viaLane: true, x1: bandX + bandW, y1: lane.y + lane.h - 14, x2: 980, y2: out.internet.y + 14, internet: true });
  (est && est.arcs || []).forEach((a, i) => {
    const r1 = out.regions.find(r => r.region === a.from), r2 = out.regions.find(r => r.region === a.to);
    if (r1 && r2) out.arcs.push({ id: 'arc' + i, priv: a.priv, y1: r1.cy, y2: r2.cy, from: a.from, to: a.to });
  });
  out.strata = [0, 1, 2, 3].map(i => ({ i, y: bandY + i * strataH, h: strataH }));
  // The path a packet takes, left to right. Core is singular and shared; the
  // two sides mirror it. Integer widths that tile the band exactly, with any
  // remainder given to Core so the mirror stays exact.
  const SEG = [['Access', 'site'], ['Edge', 'site'], ['Core', 'core'], ['Edge', 'cloud'], ['Access', 'cloud']];
  const side = Math.floor(bandW / SEG.length);
  const coreW = bandW - side * (SEG.length - 1);
  let sx = bandX;
  out.segments = SEG.map(([label, sd], i) => {
    const w = i === 2 ? coreW : side;
    const seg = { key: 'seg' + i, i, label, side: sd, x: sx, w, cx: sx + w / 2 };
    sx += w;
    return seg;
  });
  // Routes through the segments. Sites and regions are not paired and do not
  // need to be: Core is shared. A site crosses Access and Edge into Core; a
  // region leaves Core across Edge and Access. Each leg is owned by whoever
  // holds the SLA for it, and a handoff is marked where the owner changes.
  const [sA, sE, sC, cE, cA] = out.segments;
  // Two tracks per segment: AT&T on the row, not-AT&T a step below it. A route
  // runs on the track of whoever owns the segment and bends where that changes,
  // so where the line drops is how far AT&T stays accountable. An owner change
  // that stays off AT&T (Equinix to CoreWeave) is a colour change, not a bend.
  const DROP = 14;
  const trackOf = (owner) => (owner === 'att' ? 'att' : 'other');
  out.legs = []; out.bends = [];
  const place = (path, baseY, who, side) => {
    let prev = null;
    path.forEach(g => {
      const track = trackOf(g.owner);
      const y = track === 'att' ? baseY : baseY + DROP;
      if (g.w) out.legs.push({ ...g, ...who, key: `l:${who.site || who.region}:${g.seg}`, y, track, side, d: `M${g.x},${y} L${g.x + g.w},${y}` });
      if (prev && prev.track !== track) {
        out.bends.push({ ...who, key: `b:${who.site || who.region}:${prev.seg}>${g.seg}`, x: g.x, y1: prev.y, y2: y,
          between: [prev.seg, g.seg], d: `M${g.x - 10},${prev.y} C${g.x},${prev.y} ${g.x},${y} ${g.x + 10},${y}` });
      }
      prev = { seg: g.seg, track, y };
    });
  };
  out.edges.filter(e => e.kind === 'ingress' && e.priv && !e.ghost && !e.viaLane && e.site && !e.site.more && e.site.core !== 'third').forEach(e => {
    place([
      { seg: 'Access', x: sA.x, w: sA.w, owner: accessOwner(e.site.access) },
      { seg: 'Edge', x: sE.x, w: sE.w, owner: 'att' },
      { seg: 'Core', x: sC.x, owner: 'att' },
    ], e.y2, { site: e.site.name }, 'site');
  });
  out.edges.filter(e => e.kind === 'egress' && e.priv && !e.ghost && !e.viaLane && e.region).forEach(e => {
    place([
      { seg: 'Core', x: sC.x + sC.w, owner: 'att' },
      { seg: 'Edge', x: cE.x, w: cE.w, owner: RAMP_EDGE[e.region.ramp] || 'cloud', label: e.region.ramp || '' },
      { seg: 'Access', x: cA.x, w: cA.w, owner: 'cloud' },
    ], e.y1, { region: e.region.region, cloud: e.region.cloud }, 'cloud');
    // The wire out to the cloud leaves from wherever the last leg ended, or the
    // two meet with a jog at the band's edge.
    const last = out.legs.filter(g => g.region === e.region.region).pop();
    if (last) e.y1 = last.y;
  });
  // A third-party core is not the shared AT&T backbone, so its route cannot meet
  // the others there. It runs site to region on the not-AT&T track through all
  // five segments and bends across Core from its site's row to its region's.
  out.edges.filter(e => e.kind === 'ingress' && e.priv && !e.viaLane && e.site && e.site.core === 'third').forEach(e => {
    const target = out.regions.find(r => r.region === e.site.via);
    if (!target) return;
    const name = e.site.name, y1 = e.y2 + DROP;
    const regionEdge = out.edges.find(x => x.kind === 'egress' && x.region && x.region.region === target.region);
    const y2 = (regionEdge ? regionEdge.y1 : clampBand(target.cy)) + DROP;
    const leg = (seg, x, w, owner, y, extra = {}) => out.legs.push({ seg, x, w, owner, y, track: 'other', site: name, side: 'path',
      key: `l:${name}:${seg}:${x}`, d: `M${x},${y} L${x + w},${y}`, ...extra });
    leg('Access', sA.x, sA.w, accessOwner(e.site.access), y1);
    leg('Edge', sE.x, sE.w, 'third', y1);
    const mx = sC.x + sC.w / 2;
    leg('Core', sC.x, sC.w, 'third', y1, { y2, d: `M${sC.x},${y1} C${mx},${y1} ${mx},${y2} ${sC.x + sC.w},${y2}` });
    leg('Edge', cE.x, cE.w, 'third', y2, { label: e.site.viaRamp || '', region: target.region });
    leg('Access', cA.x, cA.w, 'cloud', y2, { region: target.region, cloud: target.cloud });
    out.edges.push({ id: 'lumen' + name, kind: 'egress', lumen: true, priv: true, x1: cA.x + cA.w, y1: y2, x2: 980, y2: target.cy, site: e.site, dur: 3 });
  });
  // Every site arrives on the track its first leg runs on.
  out.edges.filter(e => e.kind === 'ingress' && e.site).forEach(e => {
    const first = out.legs.find(g => g.site === e.site.name);
    if (first) e.y2 = first.y;
  });
  return out;
}

export function edgePath(e) {
  const mx = (e.x1 + e.x2) / 2;
  return `M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`;
}
export function arcPath(a) {
  return `M1220,${a.y1} C1246,${a.y1} 1246,${a.y2} 1220,${a.y2}`;
}

const STATES = { East: ['Georgia', 'Florida', 'North Carolina', 'Virginia', 'New York', 'Pennsylvania', 'New Jersey', 'Massachusetts'], Central: ['Texas', 'Illinois', 'Ohio', 'Missouri', 'Minnesota', 'Michigan', 'Tennessee', 'Oklahoma'], West: ['California', 'Washington', 'Arizona', 'Colorado', 'Oregon', 'Nevada', 'Utah'] };
const METROS = { Georgia: ['Atlanta', 'Savannah', 'Augusta'], Florida: ['Miami', 'Tampa', 'Orlando', 'Jacksonville'], 'North Carolina': ['Charlotte', 'Raleigh'], Virginia: ['Richmond', 'Norfolk', 'Ashburn'], 'New York': ['New York City', 'Buffalo', 'Albany'], Pennsylvania: ['Philadelphia', 'Pittsburgh'], 'New Jersey': ['Newark', 'Jersey City'], Massachusetts: ['Boston', 'Worcester'], Texas: ['Dallas', 'Houston', 'Austin', 'San Antonio'], Illinois: ['Chicago', 'Springfield'], Ohio: ['Columbus', 'Cleveland', 'Cincinnati'], Missouri: ['St. Louis', 'Kansas City'], Minnesota: ['Minneapolis', 'St. Paul'], Michigan: ['Detroit', 'Grand Rapids'], Tennessee: ['Nashville', 'Memphis'], Oklahoma: ['Oklahoma City', 'Tulsa'], California: ['Los Angeles', 'San Francisco', 'San Jose', 'San Diego', 'Sacramento'], Washington: ['Seattle', 'Spokane'], Arizona: ['Phoenix', 'Tucson'], Colorado: ['Denver', 'Colorado Springs'], Oregon: ['Portland', 'Eugene'], Nevada: ['Las Vegas', 'Reno'], Utah: ['Salt Lake City', 'Provo'] };
const DISTRICTS = ['Downtown', 'Midtown', 'North', 'South', 'Airport', 'Suburbs'];
const STREETS = ['Peachtree St', 'Main St', 'Market St', 'Broadway', 'Commerce Ave', 'Elm St', 'Lake Shore Dr', 'Congress Ave', 'Pine St', 'Oak Blvd', 'Union Ave', 'Harbor Way'];
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0); };
const rnd = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
const countOf = (label) => { const m = /\(([\d,]+)\)/.exec(label); return m ? parseInt(m[1].replace(/,/g, ''), 10) : 1; };
const stripCount = (label) => label.replace(/\s*\([\d,]+\)\s*$/, '');
const fmtN = (n) => n.toLocaleString('en-US');

// Deterministic split of `total` across `names`, min 1 each, weighted by a seeded RNG.
function split(total, names, seed) {
  const r = rnd(seed);
  const n = Math.min(names.length, total);
  const w = Array.from({ length: n }, () => 0.4 + r());
  const sum = w.reduce((a, b) => a + b, 0);
  let left = total;
  return names.slice(0, n).map((nm, i) => { const c = i === n - 1 ? left : Math.max(1, Math.min(left - (n - 1 - i), Math.round(total * w[i] / sum))); left -= c; return { name: nm, count: c }; });
}

// Level of a drill trail: class → region → state → metro → district → site (street).
// `trail` is the list of clicked labels, e.g. ["Branches, East (1,640)", "Georgia (212)", "Atlanta (96)"].
export function drillLevel(trail) {
  const depth = trail.length;
  const top = stripCount(trail[0]);
  const hasRegion = /, (East|Central|West)$/.test(top);
  const cls = top.replace(/, (East|Central|West)$/, '').replace(/s$/, '');
  const chain = hasRegion ? ['state', 'metro', 'district', 'site'] : ['region', 'state', 'metro', 'district', 'site'];
  const total = countOf(trail[0]);
  if (total <= 8 && depth === 1) return { level: 'site', label: 'Sites', rows: sites(cls, trail, total) };
  const level = chain[Math.min(depth - 1, chain.length - 1)];
  return { level, label: { region: 'Regions', state: 'States', metro: 'Metros', district: 'Districts', site: 'Sites' }[level], rows: rowsFor(level, cls, trail) };
}

function rowsFor(level, cls, trail) {
  const last = trail[trail.length - 1], total = countOf(last), seed = hash(trail.join('/'));
  const parent = stripCount(last);
  const access = ['SD-WAN', 'ADI (Dedicated Internet)', 'ABF (Business Fiber)', 'AVPN (MPLS VPN)'];
  const mk = (arr) => arr.map((c, i) => ({ name: `${c.name} (${fmtN(c.count)})`, cls, access: access[(seed + i) % access.length], priv: (seed + i) % 3 === 0, rollup: true, count: c.count }));
  if (level === 'region') return mk(split(total, ['East', 'Central', 'West'], seed));
  if (level === 'state') { const region = /(East|Central|West)/.exec(trail.map(stripCount).join(' ')); const list = STATES[region ? region[1] : 'East']; return mk(split(total, list, seed)); }
  if (level === 'metro') return mk(split(total, METROS[parent] || ['Metro A', 'Metro B', 'Metro C'], seed));
  if (level === 'district') return total <= 6 ? sites(cls, trail, total) : mk(split(total, DISTRICTS, seed));
  return sites(cls, trail, total);
}

function sites(cls, trail, total) {
  const seed = hash(trail.join('/') + '#sites'), r = rnd(seed);
  const metro = trail.map(stripCount).find(t => Object.values(METROS).some(m => m.includes(t))) || 'Dallas';
  const access = ['SD-WAN', 'ADI (Dedicated Internet)', 'ABF (Business Fiber)', 'Mobility first mile'];
  return Array.from({ length: Math.min(total, 60) }, (_, i) => ({ name: `${100 + Math.floor(r() * 9800)} ${STREETS[Math.floor(r() * STREETS.length)]}, ${metro}`, cls, access: access[Math.floor(r() * access.length)], priv: r() > 0.55, rollup: false, count: 1 }));
}

export function drillChildren(label, depth) { return drillLevel([label]).rows; }

export function sankey(est) {
  const W = 900, H = 260, colW = 14;
  const srcs = est.sites.map(s => ({ name: s.name, v: Math.max(1, s.rollup ? 3 : 1), priv: s.priv }));
  const dsts = est.regionsList.map(r => ({ name: r.cloud + ' ' + r.region, v: r.wl || 1, priv: r.priv }));
  const total = dsts.reduce((a, b) => a + b.v, 0);
  const st = srcs.reduce((a, b) => a + b.v, 0);
  srcs.forEach(s => (s.v = s.v / st * total));
  const privV = dsts.filter(d => d.priv).reduce((a, b) => a + b.v, 0);
  const mids = [{ name: 'AT&T network', v: privV, priv: true }, { name: 'Public internet', v: total - privV, priv: false }];
  const stack = (arr, x) => { let y = 10; const pad = 8; const scale = (H - 20 - pad * (arr.length - 1)) / total; return arr.map(a => { const h = a.v * scale; const o = { ...a, x, y, h, x2: x + colW, used: 0 }; y += h + pad; return o; }); };
  const S = stack(srcs, 0), M = stack(mids, W / 2 - colW / 2), D = stack(dsts, W - colW);
  const ribbons = [];
  const link = (a, b, v, priv) => {
    const scaleA = a.h / a.v, scaleB = b.h / b.v;
    const ay = a.y + a.used * scaleA, by = b.y + b.used * scaleB, ah = v * scaleA, bh = v * scaleB;
    a.used += v; b.used += v;
    const mx = (a.x2 + b.x) / 2;
    ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv });
  };
  const privShareSrc = privV / total;
  S.forEach(s => { const toFab = s.priv ? s.v * 0.85 : s.v * 0.25; const a = Math.min(toFab, privV); link(s, M[0], toFab, true); link(s, M[1], s.v - toFab, false); });
  D.forEach(d => link(d.priv ? M[0] : M[1], d, d.v, d.priv));
  return { W, H, nodes: [...S, ...M, ...D], ribbons };
}

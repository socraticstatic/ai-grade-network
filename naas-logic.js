/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// Layout and derivation helpers for the NaaS storefront. Pure functions, no DOM.
import { siteChain, cloudEdgeThing, cloudAccessThing, coreThing, accessThing } from './naas-things.js';
export const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
/** "1 cloud" / "2 clouds" / "4,120 sites". Every count in the copy goes through this. */
export const plural = (n, one, many) => `${Number(n).toLocaleString('en-US')} ${n === 1 ? one : many}`;
/** What discovery found, in one phrase. */
export const estatePhrase = (est) => `${plural(est.clouds, 'cloud', 'clouds')}, ${plural(est.regions, 'region', 'regions')}, ${plural(est.workloads, 'workload', 'workloads')}`;

const CLOUD_ORDER = ['AWS', 'Azure', 'GCP', 'CoreWeave', 'Oracle'];

// Who holds the SLA for each segment of a path. NetBond is AT&T's edge (the IPE);
// Direct Connect and ExpressRoute are the hyperscaler's; Equinix is a third
// party. The last mile is whoever the site says answers for it: an off-net
// circuit AT&T ordered from Lumen is AT&T's, the same wire bought by the
// customer is Lumen's. It used to be read off the word "Lumen" in the label,
// which put AT&T's off-net circuits on the not-AT&T track.
export const RAMP_EDGE = { NetBond: 'att', DX: 'cloud', ER: 'cloud', Interconnect: 'cloud', EQX: 'third' };
export const accessOwner = (site) => ((site && site.accessSla) || 'att');

// The left column starts at regions. A site is placed by its metro, or, for a
// nationwide rollup, by the region its own name carries ("Remote sites, East").
// Denver and Phoenix are West, as the drill's state table already has it.
const METRO_REGION = {
  Ashburn: 'US East', Atlanta: 'US East',
  Austin: 'US Central', Chicago: 'US Central', Dallas: 'US Central', Houston: 'US Central',
  Denver: 'US West', Phoenix: 'US West', 'Salt Lake City': 'US West', 'San Jose': 'US West',
  Frankfurt: 'International', Singapore: 'International',
};
const REGION_ORDER = ['US East', 'US Central', 'US West', 'International', 'Nationwide'];
export function regionOf(site) {
  if (METRO_REGION[site.metro]) return METRO_REGION[site.metro];
  const m = /,\s*(East|Central|West)\b/.exec(site.name || '');
  return m ? 'US ' + m[1] : 'Nationwide';
}
// The path a site's traffic takes, as a key: its access owner, then its core
// owner, or 'public' if it never enters a private network at all.
const patternOf = (site) => (!site.priv ? 'public' : `${accessOwner(site)}>${site.core === 'third' ? 'third' : 'att'}`);
const PATTERN_ORDER = ['att>att', 'third>att', 'third>third', 'public'];
export function regionRows(est) {
  const by = {};
  (est.sites || []).forEach(site => { (by[regionOf(site)] = by[regionOf(site)] || []).push(site); });
  return REGION_ORDER.filter(r => by[r]).map(name => {
    const sites = by[name];
    const seen = {};
    sites.forEach(site => { const k = patternOf(site); if (!seen[k]) seen[k] = site; });
    const patterns = PATTERN_ORDER.filter(k => seen[k]).map(k => {
      const rep = seen[k];
      return { key: k === 'att>att' ? 'att' : k, priv: !!rep.priv, access: rep.access, accessSla: rep.accessSla, carrier: rep.carrier, core: rep.core, via: rep.via, viaRamp: rep.viaRamp };
    });
    // The lines a region card draws: one per circuit its sites use (and one for
    // the internet), so the root shows which things a region runs through, not
    // just whose they are.
    const lineSeen = {};
    sites.forEach(site => { const t = accessThing(site); const k = t ? t.id + (site.core === 'third' ? '>third' : '') : 'public'; if (!lineSeen[k]) lineSeen[k] = site; });
    const lines = Object.entries(lineSeen).map(([k, rep]) => ({ key: k, priv: !!rep.priv, access: rep.access, accessSla: rep.accessSla, carrier: rep.carrier, core: rep.core, via: rep.via, viaRamp: rep.viaRamp, xc: rep.xc }));
    const count = sites.reduce((a, s2) => a + countOf(s2.name), 0);
    return { name, sites, patterns, lines, count };
  });
}

// A mixed-carrier estate needs its third-party sites on the picture, not folded
// into "+N more", so the root shows up to nine. A drill level keeps its sample
// of seven: the full list lives in the drawer, and the sample size is what the
// drawer's "hidden" count is measured against.
const ROOT_SITES = 9, DRILL_SITES = 7;

// The right column's left edge. The workloads column that sat beyond it moved
// into the hover titles (2026-09-23), so the column moved right into its space
// and the band widened, which is the breathing room the picture was missing.
export const RX = 1100;
// A folded Access or Edge column, wide enough to read as a stack of cards.
export const FOLDED_SIDE = 52;

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
  const FAN = 18;
  const LANE_GAP = 16, LANE_H = 76, FOOT = 44, COL_TOP = 30, CARD_H = 36, GAP_MAX = 66, INET_OVER_LANE = 60;
  // Cards are drawn CARD tall on rows ROW apart (2026-09-23: taller, so logos and
  // titles read larger). The canvas is still measured with CARD_H, so it did not grow.
  const CARD = 44, HALF = CARD / 2;
  const rowH = 34, groupHead = 20, groupGap = 12;
  const bandX = opts.bandX || 560, bandW = opts.bandW || 240, bandY = 28;
  const empty = !est || est.stage === 'empty';
  // Row pitch is measured against the tallest canvas, never the derived one,
  // so shrinking the picture never re-spaces a full estate's rows.
  const pitch = (k) => k > 1 ? Math.min(GAP_MAX, (H_MAX - 120) / (k - 1)) : 0;

  const rootN = empty ? 3 : Math.min(ROOT_SITES, regionRows(est).length);
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

  const out = { W, H, bandX, bandW, bandY, bandH, lane, rightX: RX, sites: [], groups: [], regions: [], workloads: [], edges: [], arcs: [], internet: null, strata: [], ghost: false };
  const clampBand = (y) => Math.round(Math.min(bandY + bandH - 24, Math.max(bandY + 24, y)));
  const clampLane = (y) => Math.round(Math.min(lane.y + lane.h - 14, Math.max(lane.y + 14, y)));
  out.ghost = empty;

  const rawSites = empty ? [{ name: 'Your data centers', access: 'AVPN, ASE', ghost: true }, { name: 'Your sites', access: 'ADI, ABF, SD-WAN', ghost: true }, { name: 'Your internet sites', access: 'Internet first mile', ghost: true }] : (opts.siteRows || regionRows(est).map(r => {
    // A region card names who carries its traffic; the internet is a carrier here, not a verdict.
    const carriers = [...new Set(r.patterns.map(p => (p.key === 'public' ? 'internet' : p.key.startsWith('third') ? (p.carrier || 'third party') : 'AT&T')))];
    return { name: r.name, access: `${r.count.toLocaleString('en-US')} ${r.count === 1 ? 'site' : 'sites'} · ${carriers.join(', ')}`,
      priv: r.patterns.some(p => p.priv), drillKey: 'region:' + r.name, rollup: true, region: true, patterns: r.patterns, lines: r.lines, groups: r.sites.length };
  }));
  const cap = opts.siteRows ? DRILL_SITES : ROOT_SITES;
  const sites = rawSites.length > cap ? [...rawSites.slice(0, cap - 1), { name: `+${fmtN(rawSites.length - (cap - 1))} more`, access: 'open the list ›', more: true, rollup: false }] : rawSites;
  const n = sites.length;
  // One set of rows runs across the whole picture, ROW apart inside the band:
  // cards on the left, things in the band and provider cards on the right all
  // sit on them, so a card, the things it uses and its cloud can share a line.
  // A column takes every other row when it has room, and is centred on them.
  const ROW = 52, rowTop = bandY + 30, rows = Math.max(1, Math.floor((bandY + bandH - 12 - rowTop) / ROW) + 1);
  const rowY = (i) => rowTop + i * ROW;
  // Cards may use the rows that continue below the band, beside the lane, so a
  // column of cards gets every other row; the things stay on the band's rows.
  const cardRows = Math.max(rows, Math.floor((H - FOOT + 4 - HALF - rowTop) / ROW) + 1);
  const onRows = (k) => {
    const step = k > 1 ? Math.min(2, Math.floor((cardRows - 1) / (k - 1))) : 0;
    if (k > 1 && step < 1) return null; // taller than the canvas: fall back to spacing
    const start = Math.floor(((cardRows - 1) - (k - 1) * step) / 2);
    return (i) => rowY(start + i * step);
  };
  const siteRow = onRows(n);
  const gap = siteRow ? (n > 1 ? siteRow(1) - siteRow(0) : 0) : pitch(n);
  const top = siteRow ? siteRow(0) - HALF : 48 + ((H - 96) - (n - 1) * gap) / 2 - HALF;
  // Where a site enters the band. Clamping each one separately is right while the
  // column fits the band, but once it is taller every site below the band's floor
  // lands on the same pixel, and two routes enter on top of each other. Then the
  // column is spread across the band's height instead.
  const colTop = top + HALF, colBot = top + (n - 1) * gap + HALF, usable = bandH - 48;
  // Taller than the band can hold, not merely offset from it: an offset column
  // still clamps cleanly, and re-spacing it would move estates that were fine.
  const overflows = n > 1 && colBot - colTop > usable;
  const enterBand = (y) => overflows ? Math.round(bandY + 24 + (y - colTop) / (colBot - colTop) * usable) : clampBand(y);
  sites.forEach((s, i) => {
    const y = Math.round(top + i * gap);
    out.sites.push({ ...s, i, y, cy: y + HALF, h: CARD, key: 'site' + i });
    // A region card draws one line per distinct path in it, fanned around its
    // entry, each carrying a stand-in site with that path's access, core and
    // on-ramp, so the routing below draws a region exactly as it draws a site.
    const lines = s.lines ? s.lines.map((p, k) => ({ k, n: s.lines.length,
      site: { ...p, name: `${s.name} · ${p.key}`, label: s.name, region: s.name } }))
      : [{ k: 0, n: 1, site: s }];
    lines.forEach(({ k, n: np, site }) => {
      const viaLane = !site.priv && !site.ghost;
      const fan = (k - (np - 1) / 2) * FAN;
      out.edges.push({ id: 'in' + i + (np > 1 ? '.' + k : ''), kind: 'ingress', priv: !!site.priv, ghost: !!site.ghost, viaLane, x1: 224, y1: y + HALF,
        x2: bandX, y2: viaLane ? clampLane(y + HALF) : enterBand(y + HALF) + fan, site });
    });
  });

  const regs = empty ? [{ cloud: 'Your clouds', region: 'Your regions', ghost: true, wl: 0 }, { cloud: 'Your neoclouds', region: 'Your GPU regions', ghost: true, wl: 0 }] : (opts.regionRows || est.regionsList);
  const byCloud = {};
  regs.forEach(r => { (byCloud[r.cloud] = byCloud[r.cloud] || []).push(r); });
  const ord = (c) => { const i = CLOUD_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  const clouds = Object.keys(byCloud).sort((a, b) => ord(a) - ord(b));
  let y = COL_TOP;
  // The first level on the right is cloud providers, as the left's is regions.
  // A provider card fans one wire per on-ramp its regions use, and one for the
  // internet, each carrying its regions' numbers so the lenses still read. The
  // canvas is still measured from every region, so a drill never resizes it.
  const cardRoot = !opts.regionRows;
  if (cardRoot) {
    const k = clouds.length, cardRow = onRows(k), gapR = cardRow ? (k > 1 ? cardRow(1) - cardRow(0) : 0) : pitch(k);
    const topR = cardRow ? cardRow(0) - HALF : Math.round(48 + ((H - 96) - (k - 1) * gapR) / 2 - HALF);
    clouds.forEach((c, j) => {
      const rs = byCloud[c], ry = Math.round(topR + j * gapR), cy = ry + HALF;
      const card = { cloud: c, region: c, card: true, ghost: !!rs[0].ghost, key: 'cloud:' + c, regions: rs.map(r => r.region), count: rs.length,
        wl: rs.reduce((a2, r) => a2 + (r.wl || 0), 0), priv: rs.some(r => r.priv), link: rs.some(r => r.link === 'degraded') ? 'degraded' : 'ok', y: ry, cy };
      out.regions.push(card);
      // Before it is opened a provider draws one wire (Micah, 2026-09-23: "the
      // AWS line one line by default pre-expand"). Inside the band each on-ramp
      // still runs its own route into the provider's gateway; out of the band,
      // one wire carries them all. A provider with nothing private draws its
      // one wire through the lane instead.
      const privRegs = rs.filter(r => r.priv), lr = privRegs.length ? privRegs : rs, priv = privRegs.length > 0, viaLane = !priv;
      const byLine = {};
      privRegs.forEach(r => { const line = cloudEdgeThing(r).id; (byLine[line] = byLine[line] || []).push(r); });
      const lines = Object.entries(byLine).map(([line, xs]) => ({ line, cloud: c, ramp: xs[0].ramp, regions: xs.map(r => r.region), xc: (xs.find(r => r.xc) || {}).xc || null }));
      card.lines = lines.map(l2 => l2.line);
      const avg = (f) => Math.round(lr.reduce((a2, r) => a2 + (r[f] || 0), 0) / lr.length);
      const stand = { cloud: c, region: c, card: true, priv, ramp: lines.length === 1 ? lines[0].ramp : null, lines: priv ? lines : null, regions: lr.map(r => r.region),
        wl: lr.reduce((a2, r) => a2 + (r.wl || 0), 0), fab: avg('fab'), pub: avg('pub'), tags: [...new Set(lr.flatMap(r => r.tags || []))],
        link: lr.some(r => r.link === 'degraded') ? 'degraded' : 'ok', cy };
      out.edges.push({ id: `eg:${c}`, kind: 'egress', priv, ghost: card.ghost, viaLane: viaLane && !card.ghost, x1: bandX + bandW,
        y1: viaLane ? clampLane(cy) : Math.round(Math.min(bandY + bandH - 40, Math.max(bandY + 24, cy))), x2: RX, y2: cy,
        chip: null, shield: false, region: stand, dur: stand.fab ? Math.max(1.2, stand.fab / 6) : 3 });
      if (card.wl) out.workloads.push({ region: c, y: ry + 7, label: card.wl.toLocaleString('en-US') + ' workloads', key: 'wl' + c, tags: [] });
    });
    y = k ? topR + (k - 1) * gapR + CARD + groupGap : COL_TOP;
  }
  if (!cardRoot) clouds.forEach(c => {
    out.groups.push({ cloud: c, y, count: byCloud[c].length });
    y += groupHead;
    byCloud[c].forEach((r, j) => {
      const ry = y;
      out.regions.push({ ...r, y: ry, cy: ry + 14, key: (r.child ? 'c:' : '') + r.region });
      const viaLane = !r.priv && !r.ghost;
      if (!r.noEdge && !r.other) out.edges.push({ id: 'eg' + out.regions.length, kind: 'egress', priv: !!r.priv, ghost: !!r.ghost, viaLane, x1: bandX + bandW, y1: viaLane ? clampLane(ry + 14) : Math.round(Math.min(bandY + bandH - 40, Math.max(bandY + 24, ry + 14))), x2: RX, y2: ry + 14, chip: r.ramp, shield: !!r.priv && (r.ramp === 'NetBond' || r.ramp === 'ER'), region: r, dur: r.fab ? Math.max(1.2, r.fab / 6) : 3 });
      if (r.wl) out.workloads.push({ region: r.region, y: ry + 3, label: r.wlLabel || (r.wl.toLocaleString('en-US') + ' workloads'), key: 'wl' + (r.child ? 'c:' : '') + r.region, tags: r.tags });
      y += rowH;
    });
    y += groupGap;
  });
  if (!empty && est.regionsExtra && !opts.regionRows) { out.regions.push({ cloud: '', region: `${est.regionsExtra} smaller regions rolled up`, rollup: true, muted: true, y, cy: y + 14, key: 'more' }); y += rowH; }
  out.internet = { y: Math.min(H - 36, Math.max(y + 8, internetFloor)) };
  out.edges.push({ id: 'inet', kind: 'internet', priv: false, ghost: empty, viaLane: true, x1: bandX + bandW, y1: lane.y + lane.h - 14, x2: RX, y2: out.internet.y + 14, internet: true });
  (est && est.arcs || []).forEach((a, i) => {
    const r1 = out.regions.find(r => r.region === a.from), r2 = out.regions.find(r => r.region === a.to);
    if (r1 && r2) out.arcs.push({ id: 'arc' + i, priv: a.priv, y1: r1.cy, y2: r2.cy, from: a.from, to: a.to });
  });
  out.strata = [0, 1, 2, 3].map(i => ({ i, y: bandY + i * strataH, h: strataH }));
  // The path a packet takes, left to right. Core is singular and shared; the
  // two sides mirror it. Integer widths that tile the band exactly, with any
  // remainder given to Core so the mirror stays exact.
  const SEG = [['Access', 'site'], ['Edge', 'site'], ['Core', 'core'], ['Edge', 'cloud'], ['Access', 'cloud']];
  // Folded, Access and Edge narrow to a stack of card edges and Core takes the
  // width they give up; unfolded, all five share the band.
  const FOLD_W = FOLDED_SIDE;
  const side = opts.folded ? FOLD_W : Math.floor(bandW / SEG.length);
  const coreW = bandW - side * (SEG.length - 1);
  let sx = bandX;
  out.segments = SEG.map(([label, sd], i) => {
    const w = i === 2 ? coreW : side;
    const seg = { key: 'seg' + i, i, label, side: sd, x: sx, w, cx: sx + w / 2 };
    sx += w;
    return seg;
  });
  // Sites and regions are not paired and do not need to be: Core is shared.
  // Each segment holds things - a circuit, a router, a backbone, an on-ramp, a
  // gateway - and each thing is AT&T's or not. A route is the chain of things it
  // uses, one per segment; routes that use the same thing meet at it. A thing
  // sits at the average height of what uses it, so lines run as straight as they
  // can, and things in one segment never overlap.
  out.nodes = []; out.pieces = []; out.routes = []; out.xconnects = [];
  const byId = {};
  const want = (thing, i, y) => {
    if (!byId[thing.id]) { byId[thing.id] = { ...thing, seg: i, ys: [], users: [] }; out.nodes.push(byId[thing.id]); }
    byId[thing.id].ys.push(y);
    return byId[thing.id];
  };
  const use = (n, who) => { if (!n.users.includes(who)) n.users.push(who); };
  const drafts = [];
  // Sites: Access, Edge, into Core. A third-party core runs all five, site to region.
  out.edges.filter(e => e.kind === 'ingress' && e.priv && !e.ghost && !e.viaLane && e.site && !e.site.more).forEach(e => {
    const site = e.site, y = e.y1, who = site.name, label = site.label || site.name;
    const chain = siteChain(site);
    if (!chain) return;
    if (site.core === 'third') {
      // A provider card stands in for every region it holds.
      const target = out.regions.find(r => r.region === site.via) || out.regions.find(r => r.card && r.regions.includes(site.via));
      if (!target) return;
      const full = [...chain, cloudEdgeThing(target, site.carrier || site.viaRamp), cloudAccessThing(target)];
      const ys = [y, y, (y + target.cy) / 2, target.cy, target.cy];
      drafts.push({ who, label, side: 'path', region: site.region, e, target, xc: site.xc, nodes: full.map((t, i) => want(t, i, ys[i])) });
    } else drafts.push({ who, label, side: 'site', region: site.region, e, xc: site.xc, nodes: chain.map((t, i) => want(t, i, y)) });
  });
  // Regions: out of Core, across the on-ramp, into the cloud's own gateway.
  out.edges.filter(e => e.kind === 'egress' && e.priv && !e.ghost && !e.viaLane && e.region).forEach(e => {
    const r = e.region, y = r.cy != null ? r.cy : e.y2;
    // A provider's one wire carries a route per on-ramp; they share the wire.
    (r.lines || [r]).forEach((part, pi) => {
      const chain = [coreThing(null), cloudEdgeThing({ ...part, cloud: r.cloud }), cloudAccessThing(r)];
      drafts.push({ who: r.lines ? `${r.region} · ${part.line}` : r.region, label: r.card ? r.cloud : `${r.cloud} ${r.region}`, side: 'region', region: r.region, e, shared: pi > 0, xc: part.xc, nodes: chain.map((t, i) => want(t, i + 2, y)) });
    });
  });
  drafts.forEach(d => d.nodes.forEach(n => use(n, d.label)));
  // Place: each thing at the mean height of what uses it, then spread apart in
  // its segment, clear of the segment label above and the band floor below.
  const NODE_GAP = 24, nodeTop = bandY + 30, nodeBot = bandY + bandH - 12;
  for (let i = 0; i < SEG.length; i++) {
    const col = out.nodes.filter(n => n.seg === i).map(n => { n.y = n.ys.reduce((a2, b2) => a2 + b2, 0) / n.ys.length; return n; }).sort((p, q) => p.y - q.y);
    if (col.length <= rows) {
      // Each thing takes the row nearest what uses it, in order, one per row.
      const at = col.map(n => Math.max(0, Math.min(rows - 1, Math.round((n.y - rowTop) / ROW))));
      at.forEach((r, k) => { at[k] = Math.max(r, k ? at[k - 1] + 1 : 0); });
      for (let k = at.length - 1; k >= 0; k--) at[k] = Math.min(at[k], k === at.length - 1 ? rows - 1 : at[k + 1] - 1);
      col.forEach((n, k) => { n.y = rowY(at[k]); });
    } else {
      // More things than rows: down from the top, then up from the floor, then
      // down once more, so the column keeps its gaps and only overhangs the floor.
      col.forEach((n, k) => { n.y = Math.max(n.y, k ? col[k - 1].y + NODE_GAP : nodeTop); });
      for (let k = col.length - 1; k >= 0; k--) col[k].y = Math.min(col[k].y, k === col.length - 1 ? nodeBot : col[k + 1].y - NODE_GAP);
      col.forEach((n, k) => { n.y = Math.max(n.y, nodeTop + k * NODE_GAP); });
    }
    col.forEach(n => { n.y = Math.round(n.y); const sg = out.segments[i]; n.x = sg.x; n.w = sg.w; n.cx = sg.cx; });
  }
  out.nodes.forEach(n => { delete n.ys; });
  // Draw: one piece per thing on a route, from boundary to boundary. Where the
  // next thing sits at another height the piece ends in the first half of an S
  // and the next begins with the second half, so a route is one smooth line
  // that changes colour exactly at the handoff.
  // The S between two things is as wide as the narrowest segment allows, so a
  // folded band draws the same curves in less room, and the shape interpolates.
  const B = Math.min(18, Math.min(...out.segments.map(sg => sg.w)) / 4);
  const half1 = (e2, y, yn) => ` L${e2 - B},${y} C${e2 - B / 2},${y} ${e2 - B / 4},${(3 * y + yn) / 4} ${e2},${(y + yn) / 2}`;
  const half2 = (b2, yp, y) => `M${b2},${(yp + y) / 2} C${b2 + B / 4},${(yp + 3 * y) / 4} ${b2 + B / 2},${y} ${b2 + B},${y}`;
  // Wires that share a first (or last) thing spread a few pixels apart at the
  // band's edge and ease into it, so a shared circuit reads as a bundle, not a
  // knot, and each wire's chips and dots keep their own height.
  // Folded, the sides are card stacks, not rows of things: a line runs flat
  // through them on its backbone's row, and all the converging happens in the
  // wide Core and in the wires outside, so the fold reads as one clean pipe.
  const folded = !!opts.folded;
  const coreOf = (d) => d.nodes.find(x => x.seg === 2);
  const yOf = (n, d) => (folded && n.seg !== 2 ? coreOf(d).y : n.y);
  const fanOf = {};
  drafts.forEach(d => {
    if (d.shared) return;
    const n = folded ? coreOf(d) : d.side === 'region' ? d.nodes[d.nodes.length - 1] : d.nodes[0];
    const k = (d.side === 'region' ? 'out:' : 'in:') + n.id;
    (fanOf[k] = fanOf[k] || []).push(d);
  });
  Object.values(fanOf).forEach(ds => {
    ds.sort((p, q) => (p.side === 'region' ? p.e.region.cy : p.e.y1) - (q.side === 'region' ? q.e.region.cy : q.e.y1));
    const step = ds.length > 1 ? Math.min(ds[0].side === 'region' ? 10 : 6, (ROW - 8) / (ds.length - 1)) : 0;
    ds.forEach((d, k) => { d.fan = Math.round((k - (ds.length - 1) / 2) * step); });
  });
  // Routes that share a wire leave the band where that wire does.
  drafts.forEach(d => { if (d.shared) d.fan = drafts.find(x => x.e === d.e && !x.shared).fan; });
  const pieceKeys = {};
  drafts.forEach(d => {
    const ns = d.nodes, last = ns.length - 1;
    const xStart = d.side === 'region' ? ns[0].cx : bandX;
    const xEnd = d.side === 'site' ? ns[last].cx : bandX + bandW;
    const fan = d.fan || 0;
    const keys = ns.map((n, i) => {
      const prev = ns[i - 1], next = ns[i + 1], y = yOf(n, d);
      // Every piece has the same commands folded or not - a flat curve where
      // nothing changes height - so the browser can ease one into the other.
      const fansIn = i === 0 && d.side !== 'region', fansOut = i === last && d.side === 'region';
      let path = prev ? half2(n.x, yOf(prev, d), y)
        : fansIn ? `M${xStart},${y + fan} C${xStart + B},${y + fan} ${xStart + B},${y} ${xStart + 2 * B},${y}` : `M${xStart},${y}`;
      path += next ? half1(next.x, y, yOf(next, d))
        : fansOut ? ` L${xEnd - 2 * B},${y} C${xEnd - B},${y} ${xEnd - B},${y + fan} ${xEnd},${y + fan}` : ` L${xEnd},${y}`;
      // A piece where a wire meets the band belongs to that wire alone; the rest
      // are named by the things either side, and routes that share them share them.
      const key = fansIn ? 'in|' + d.who : fansOut ? 'out|' + d.who : [n.id, prev ? prev.id : '', next ? next.id : ''].join('|');
      if (!pieceKeys[key]) { pieceKeys[key] = { key, d: path, node: n.id, owner: n.owner, users: [] }; out.pieces.push(pieceKeys[key]); }
      if (!pieceKeys[key].users.includes(d.label)) pieceKeys[key].users.push(d.label);
      return key;
    });
    // The whole route as one path, for the traffic that runs along it: the
    // pieces join end to end, so each one after the first drops its move.
    const routeD = keys.map((k2, i) => (i ? pieceKeys[k2].d.replace(/^M[^A-Za-z]*/, ' ') : pieceKeys[k2].d)).join('');
    out.routes.push({ who: d.who, label: d.label, side: d.side, region: d.region, nodes: ns.map(n => n.id), pieces: keys, d: routeD });
    // The wires in and out of the band meet the route's first and last thing.
    if (d.side !== 'region') d.e.y2 = yOf(ns[0], d) + fan;
    if (d.side === 'region') d.e.y1 = yOf(ns[last], d) + fan;
    // Folded, a third-party core keeps its own row to the band's edge, so it
    // reaches its cloud on its own wire rather than stopping short of the AT&T one.
    if (d.side === 'path' && (folded || !out.edges.some(x => x.kind === 'egress' && x.priv && x.region && x.region.region === d.target.region)))
      out.edges.push({ id: 'via' + d.who, kind: 'egress', priv: true, x1: bandX + bandW, y1: yOf(ns[last], d), x2: RX, y2: d.target.cy, region: d.target, dur: 3 });
    // A customer's own cross-connect is a cable on a handoff, not a thing: a
    // site's lands between its circuit and the AT&T edge, a region's between
    // the backbone and the cloud's on-ramp.
    if (d.xc) {
      const [p, q] = ns;
      out.xconnects.push({ key: 'xc:' + d.who, ...(d.side === 'region' ? { region: d.region, cloud: d.e.region.cloud, ramp: d.e.region.ramp } : { site: d.who }), ...d.xc, x: q.x, y: Math.round((yOf(p, d) + yOf(q, d)) / 2) });
    }
  });
  return out;
}

export function edgePath(e) {
  const mx = (e.x1 + e.x2) / 2;
  return `M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`;
}
export function arcPath(a) {
  const x = RX + 240;
  return `M${x},${a.y1} C${x + 26},${a.y1} ${x + 26},${a.y2} ${x},${a.y2}`;
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

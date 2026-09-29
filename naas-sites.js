/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-sites.js — the sites side of Explore 360, drilled the way the cloud
// side is: class → metro → site. Pure data; the app decorates it with
// open state, carets and doors. Added 2026-09-08 (Micah: "dive from top to
// bottom, region to ATM").

const METROS = ['Dallas', 'Houston', 'Atlanta', 'Chicago', 'Phoenix', 'Denver', 'Seattle', 'Miami', 'Charlotte', 'Nashville'];
const METRO_ABBR = { Dallas: 'DAL', Houston: 'HOU', Atlanta: 'ATL', Chicago: 'CHI', Phoenix: 'PHX', Denver: 'DEN', Seattle: 'SEA', Miami: 'MIA', Charlotte: 'CLT', Nashville: 'BNA' };
const STREETS = {
  Dallas: ['Ross Ave', 'Main St', 'Elm St', 'Commerce St', 'Greenville Ave', 'Belt Line Rd'],
  Houston: ['Westheimer Rd', 'Main St', 'Kirby Dr', 'Richmond Ave', 'Bellaire Blvd', 'Louisiana St'],
  Atlanta: ['Peachtree St', 'Ponce de Leon Ave', 'Piedmont Ave', 'Roswell Rd', 'Memorial Dr', 'Northside Dr'],
  Chicago: ['Michigan Ave', 'State St', 'Clark St', 'Halsted St', 'Milwaukee Ave', 'Western Ave'],
  Phoenix: ['Camelback Rd', 'Central Ave', 'Indian School Rd', 'Bell Rd', 'Thomas Rd', 'McDowell Rd'],
  Denver: ['Colfax Ave', 'Broadway', 'Federal Blvd', 'Colorado Blvd', 'Speer Blvd', 'Evans Ave'],
  Seattle: ['Pike St', 'Rainier Ave', 'Aurora Ave', 'Denny Way', 'Mercer St', '4th Ave'],
  Miami: ['Biscayne Blvd', 'Flagler St', 'Coral Way', 'Brickell Ave', 'Collins Ave', 'Calle Ocho'],
  Charlotte: ['Tryon St', 'Trade St', 'Independence Blvd', 'South Blvd', 'Providence Rd', 'Park Rd'],
  Nashville: ['Broadway', 'West End Ave', 'Charlotte Ave', 'Nolensville Pike', 'Gallatin Pike', '8th Ave'],
};
const STATE = { Dallas: 'TX', Houston: 'TX', Austin: 'TX', Atlanta: 'GA', Chicago: 'IL', Phoenix: 'AZ', Denver: 'CO', Seattle: 'WA', Miami: 'FL', Charlotte: 'NC', Nashville: 'TN', Ashburn: 'VA', 'San Jose': 'CA', Frankfurt: 'DE', Singapore: 'SG',
  'New York': 'NY', Boston: 'MA', 'Salt Lake City': 'UT', Minneapolis: 'MN', 'Kansas City': 'MO', 'Los Angeles': 'CA', London: 'GB', Amsterdam: 'NL', Paris: 'FR', Dublin: 'IE', Madrid: 'ES', Tokyo: 'JP', Sydney: 'AU', Mumbai: 'IN', Seoul: 'KR', Manila: 'PH' };
// The second level under a region: a US state, or a country outside the US.
const PLACE_NAME = { TX: 'Texas', GA: 'Georgia', IL: 'Illinois', AZ: 'Arizona', CO: 'Colorado', WA: 'Washington', FL: 'Florida', NC: 'North Carolina', TN: 'Tennessee', VA: 'Virginia', CA: 'California', NY: 'New York', MA: 'Massachusetts', MN: 'Minnesota', MO: 'Missouri', UT: 'Utah',
  DE: 'Germany', SG: 'Singapore', GB: 'United Kingdom', NL: 'Netherlands', FR: 'France', IE: 'Ireland', ES: 'Spain', JP: 'Japan', AU: 'Australia', IN: 'India', KR: 'South Korea', PH: 'Philippines' };
/** A state's or country's name from its code; the code itself when unknown. */
export const placeName = (code) => PLACE_NAME[code] || code || 'Unplaced';
/** Two-letter state (or country) for a metro; the auto-label on every site row. */
export const stateOf = (metro) => STATE[metro] || '';
const HOSTS = ['7-Eleven', 'Kroger', 'Walgreens', 'QuikTrip', 'Costco', 'Target', 'CVS', 'H-E-B'];

export const CLASS = {
  'Data center': { label: 'Data centers', icon: 'router', prefix: 'DC', unit: 'data center', plural: 'data centers' },
  Campus: { label: 'Campuses', icon: 'home', prefix: 'CAM', unit: 'campus', plural: 'campuses' },
  Office: { label: 'Offices', icon: 'home', prefix: 'OFF', unit: 'office', plural: 'offices' },
  Plant: { label: 'Plants', icon: 'gear', prefix: 'PLT', unit: 'plant', plural: 'plants' },
  Branch: { label: 'Remote sites', icon: 'hub', prefix: 'RS', unit: 'remote site', plural: 'remote sites' },
  Edge: { label: 'Edge devices', icon: 'smart-meter', prefix: 'EDG', unit: 'edge device', plural: 'edge devices' },
  Field: { label: 'Field (wireless)', icon: 'cable', prefix: 'FLD', unit: 'field site', plural: 'field sites' },
};
/** A site's class, from its declared class first and its name and access when the data is loose. */
export function classOf(st) {
  if (/atm|kiosk|edge device/i.test(st.name)) return 'Edge';
  if (/field|wireless/i.test(st.name) || /mobility/i.test(st.access || '')) return 'Field';
  return CLASS[st.cls] ? st.cls : 'Branch';
}

export const countOf = (name) => { const m = /\(([\d,]+)\)/.exec(name); return m ? parseInt(m[1].replace(/,/g, ''), 10) : 1; };
const isRollup = (st) => countOf(st.name) > 1;

/** Deterministic split of n sites across k metros, largest first. */
function splitMetros(n, seed) {
  const k = Math.max(1, Math.min(6, Math.min(n, Math.round(n / 40) || 2)));
  const weights = Array.from({ length: k }, (_, i) => 1 / (i + 1.4));
  const total = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map(w => Math.max(1, Math.floor(n * w / total)));
  let left = n - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; i = (i + 1) % k) { counts[i] += 1; left -= 1; }
  return counts.map((c, i) => ({ metro: METROS[(i + seed) % METROS.length], count: c }));
}

/** One site row. Private share follows the class; latency and address are seeded. */
function siteRow(cls, metro, i, priv) {
  const c = CLASS[cls] || CLASS.Branch;
  const id = `${c.prefix}-${METRO_ABBR[metro] || metro.slice(0, 3).toUpperCase()}-${String(100 + i * 37 % 900).padStart(4, '0')}`;
  const host = cls === 'Edge' ? HOSTS[i % HOSTS.length] + ', ' : '';
  const streets = STREETS[metro] || STREETS.Dallas;
  const address = `${host}${1200 + i * 310} ${streets[i % streets.length]}`;
  const ms = priv ? 4 + (i * 5) % 12 : 28 + (i * 9) % 40;
  const since = (i * 71 + (METROS.indexOf(metro) + 2) * 37) % 365; // days since discovery, seeded
  return { id, name: id, address, metro, priv, ms, exposed: !priv, since };
}

/**
 * The tree: one node per site class present in the estate. Named sites
 * (a data center, a campus) are their own rows; rolled-up classes (branches,
 * ATMs) drill through metros to individual sites.
 */
export function siteTree(est) {
  const groups = {};
  (est.sites || []).forEach((st, idx) => {
    const cls = classOf(st);
    const g = groups[cls] = groups[cls] || { cls, ...CLASS[cls], count: 0, onFabric: 0, access: new Set(), named: [], rollups: [] };
    const n = countOf(st.name);
    g.count += n;
    if (st.priv) g.onFabric += n;
    g.access.add(st.access);
    if (isRollup(st)) g.rollups.push({ ...st, n, idx }); else g.named.push({ ...st, idx });
  });
  return Object.values(groups).map((g, gi) => {
    const privShare = g.count ? g.onFabric / g.count : 0;
    let children = [];
    if (g.rollups.length) {
      let seed = gi;
      children = g.rollups.flatMap((r, ri) => splitMetros(r.n, seed++).map((m, mi) => {
        const sites = Array.from({ length: Math.min(m.count, 6) }, (_, i) => siteRow(g.cls, m.metro, i + mi * 6, ((i * 7 + mi * 3) % 10) / 10 < privShare + 0.05));
        const onFabric = privShare >= 1 ? m.count : privShare <= 0 ? 0 : Math.round(m.count * (privShare + ((mi % 3) - 1) * 0.08));
        return {
          kind: 'metro', key: `${g.cls}:${ri}:${m.metro}`, name: m.metro, count: m.count, onFabric: Math.max(0, Math.min(m.count, onFabric)),
          access: r.access, ramp: `${m.metro} PoP`, ms: 4 + (mi * 3) % 9, sites, more: Math.max(0, m.count - sites.length),
          gen: { cls: g.cls, mi, privShare },
        };
      }));
    }
    // Named sites stand beside a class's rollups, never instead of them: a class
    // holding one rollup used to drop every named site in it, which is how Denver
    // (a named Branch beside Remote sites) vanished. And a site keeps the facts
    // that say whose network it rides - core, via, viaRamp - or a drill forgets
    // that Phoenix is Lumen end to end.
    children = children.concat(g.named.map((st, i) => ({ kind: 'site', key: `${g.cls}:${st.name}`, ...siteRow(g.cls, st.metro, i, !!st.priv), name: st.name, address: `${st.metro} · ${st.access}`, metro: st.metro, access: st.access, priv: !!st.priv, since: (st.idx * 97 + 17) % 365,
      core: st.core, via: st.via, viaRamp: st.viaRamp, accessSla: st.accessSla, carrier: st.carrier, xc: st.xc })));
    // The class rolls up from what it contains, so a class badge can never contradict its metros.
    const onFabric = children.reduce((a, ch) => a + (ch.kind === 'metro' ? ch.onFabric : (ch.priv ? 1 : 0)), 0);
    return { kind: 'class', key: g.cls, cls: g.cls, label: g.label, icon: g.icon, unit: g.unit, plural: g.plural, count: g.count, onFabric, access: [...g.access], children };
  });
}

/** Every site in a metro, generated the same way the six-site sample is, so the sample is the list's head. */
export function metroSites(m) {
  if (!m || !m.gen) return (m && m.sites) || [];
  const { cls, mi, privShare } = m.gen;
  return Array.from({ length: m.count }, (_, i) => siteRow(cls, m.name, i + mi * 6, ((i * 7 + mi * 3) % 10) / 10 < privShare + 0.05));
}

/**
 * How a site attaches, which is the only thing the network can actually say
 * about it. Ramesh, on the site classes: "we dont have ATM category so it
 * will just be sites - i dont think we may be able to tell datacenter or
 * campus either."
 *
 * He is right, and it changes the model rather than the words. A network
 * product does not know what a building is for. It knows how the building
 * attaches: AVPN, ASE, ADI, business fiber, SD-WAN, mobility. That is the
 * honest grouping, and the one an architect can act on.
 */
/**
 * What a site buys, as AT&T sells it (2026-09-28). Every service but Third
 * Party Access enters the AT&T network: ADI and AIA-B are AT&T's own internet
 * and run through the AT&T core. `access` is the canonical string the path
 * model (naas-things accessThing) reads.
 */
export const SERVICE = {
  avpn:  { key: 'avpn',  label: 'AVPN',               name: 'AT&T VPN (MPLS)',                 onAtt: true,  access: 'AVPN' },
  aseod: { key: 'aseod', label: 'ASE on Demand',      name: 'AT&T Switched Ethernet on Demand', onAtt: true,  access: 'ASE on Demand' },
  adi:   { key: 'adi',   label: 'ADI',                name: 'AT&T Dedicated Internet',          onAtt: true,  access: 'ADI' },
  abf:   { key: 'abf',   label: 'Business Fiber',     name: 'AT&T Business Fiber',              onAtt: true,  access: 'Business Fiber' },
  aiab:  { key: 'aiab',  label: 'AIA-B',              name: 'AT&T Internet Air for Business',   onAtt: true,  access: 'AIA-B' },
  tpa:   { key: 'tpa',   label: 'Third Party Access', name: 'Another carrier\'s access',        onAtt: false, access: 'Third Party Access' },
};
const SERVICE_OF_ACCESS = { avpn: 'avpn', ase: 'aseod', adi: 'adi', abf: 'abf', sdwan: 'avpn', mobility: 'aiab', ipsec: 'tpa', aiab: 'aiab' };
/**
 * A site's services, primary first. Sites that declare them (Growing) keep
 * theirs; the rest read one from their access string, so every estate answers.
 * A third-party circuit (accessSla third) or a public site on an unknown first
 * mile is Third Party Access.
 */
export function servicesOf(st) {
  if (!st) return [];
  if (Array.isArray(st.services) && st.services.length) return st.services.map((x, i) => ({ ...SERVICE[x.svc || x], role: x.role || (i ? 'backup' : 'primary') }));
  const k = st.accessSla === 'third' ? 'tpa' : SERVICE_OF_ACCESS[accessOf(st)];
  if (k) return [{ ...SERVICE[k], role: 'primary' }];
  // A circuit the catalog does not name (Lumen off-net) keeps its own words.
  return [{ key: 'other', label: st.access || 'Access', name: st.access || 'Access', onAtt: !!st.priv, access: st.access, role: 'primary' }];
}

export const ACCESS_CLASS = {
  avpn:     { label: 'AVPN (MPLS VPN)',     unit: 'site on AVPN',   plural: 'sites on AVPN' },
  ase:      { label: 'Switched Ethernet',   unit: 'site on ASE',    plural: 'sites on ASE' },
  adi:      { label: 'Dedicated Internet',  unit: 'site on ADI',    plural: 'sites on ADI' },
  abf:      { label: 'Business Fiber',      unit: 'site on fiber',  plural: 'sites on fiber' },
  sdwan:    { label: 'SD-WAN',              unit: 'SD-WAN site',    plural: 'SD-WAN sites' },
  ipsec:    { label: 'IPsec over internet', unit: 'IPsec site',     plural: 'IPsec sites' },
  aiab:     { label: 'Internet Air',        unit: 'site on AIA-B',  plural: 'sites on AIA-B' },
  mobility: { label: 'Mobility first mile', unit: 'wireless site',  plural: 'wireless sites' },
  other:    { label: 'Other first mile',    unit: 'site',           plural: 'sites' },
};

/** A site's first mile, read from its access string. */
export function accessOf(st) {
  const a = String(st.access || '').toLowerCase();
  if (/ipsec/.test(a)) return 'ipsec';
  if (/aia-b|internet air/.test(a)) return 'aiab';
  if (/sd-wan|sdwan/.test(a)) return 'sdwan';
  if (/mobility|wireless/.test(a)) return 'mobility';
  if (/avpn|mpls/.test(a)) return 'avpn';
  if (/ase|switched ethernet/.test(a)) return 'ase';
  if (/adi|dedicated internet/.test(a)) return 'adi';
  if (/abf|business fiber/.test(a)) return 'abf';
  return 'other';
}

/** A data center, from its declared class or its name. */
export const isDataCenter = (st) => st.cls === 'Data center' || /\bDC\b|data cent/i.test(st.name || '');
/**
 * What a candidate should move to, and what else would do (notes, 2026-09-29:
 * "options to connect to sites/DC which are candidates for different
 * connectivity options"). A cloud region wants a private on-ramp; a data
 * center wants dedicated Ethernet to the on-ramps; a site wants the private
 * WAN, whatever first mile it rides today.
 */
const OPT = {
  netbond: { key: 'netbond', name: 'NetBond', why: 'private on-ramp, $0.02/GB, from 10 business days' },
  dx: { key: 'dx', name: 'Direct Connect / ExpressRoute', why: 'you run the routers, 4 to 8 weeks' },
  avpn: { key: 'avpn', name: 'AVPN', why: 'private WAN to every site and cloud' },
  aseod: { key: 'aseod', name: 'ASE on Demand', why: 'dedicated Ethernet to the cloud on-ramps, same day' },
  adi: { key: 'adi', name: 'ADI', why: 'AT&T internet through the AT&T core' },
  aiab: { key: 'aiab', name: 'AIA-B', why: 'wireless internet on AT&T, no trench' },
};
export function candidateOptions(c) {
  const pick = (best, ...alts) => ({ best: OPT[best], alts: alts.map(k => OPT[k]) });
  if (c.cloud && c.region) return pick('netbond', 'dx');
  if (isDataCenter(c)) return pick('aseod', 'avpn');
  const acc = accessOf(c);
  if (acc === 'mobility' || acc === 'aiab') return pick('avpn', 'aiab');
  return pick('avpn', 'aseod', 'adi');
}

/**
 * Display label for any drill key. The trail carries identity; the screen
 * carries names, so nothing ever prints "Branch:2:Chicago" at a user.
 * Handles a class key, a rollup-group key (Task 2) and a metro or site key.
 */
export function labelOfKey(est, key) {
  const k = String(key);
  if (CLASS[k]) return CLASS[k].label;
  const hash = k.indexOf('#');
  if (hash > 0) {
    const cls = k.slice(0, hash), ri = parseInt(k.slice(hash + 1), 10);
    const peers = (est && est.sites || []).filter(x => classOf(x) === cls && countOf(x.name) > 1);
    if (peers[ri]) return peers[ri].name.replace(/\s*\([\d,]+\)\s*$/, '');
    return (CLASS[cls] || {}).label || cls;
  }
  // The place drill's keys (2026-09-28): a state reads as its name.
  if (k.startsWith('state:')) return placeName(k.slice(6));
  if (/^(metro|site|svc):/.test(k)) return k.slice(k.indexOf(':') + 1);
  const parts = k.split(':');
  if (parts.length >= 3) return parts.slice(2).join(':');
  if (parts.length === 2) return parts[1];
  return k;
}

/**
 * The stable key for a rolled-up row of `est.sites`. The canvas draws East,
 * Central and West as three rows; `classOf` collapses all three into one
 * class, so without this a click on "Remote sites, East (1,640)" lands on
 * 4,054 sites. Null for a single named site, which is already addressable.
 */
export function rollupKeyOf(est, st) {
  if (!st || countOf(st.name) <= 1) return null;
  const cls = classOf(st);
  const peers = (est && est.sites || []).filter(x => classOf(x) === cls && countOf(x.name) > 1);
  const ri = peers.findIndex(x => x.name === st.name);
  return ri < 0 ? null : `${cls}#${ri}`;
}

/** How many sites are still on a public first mile. Rows are rollups; this counts inside them. */
export function gapSiteCount(est) {
  return (est && est.sites || []).filter(x => !x.priv).reduce((a, x) => a + countOf(x.name), 0);
}

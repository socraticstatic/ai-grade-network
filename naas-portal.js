/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// The portal MVP's model (2026-10-12). The portal team has three lists and nothing else: circuits (a site with a US
// address, an AT&T service, a network, a bandwidth), AT&T cloud connections (a CSP, a POP, a bandwidth) and a cloud
// inventory (CSP, region, VPC, subnet). This module is the contract they fill, the published POP-to-region lookup
// that joins the second list to the third, and two fixtures. Pure data and pure functions; no view words.
// Spec: docs/superpowers/specs/2026-10-12-portal-mvp-design.md.
import * as D from './naas-data.js';
import * as S from './naas-sites.js';

/** The contract, as field lists. Optional fields are the note's "maybe" rows; a missing one removes its column. */
export const CONTRACT = {
  circuit: ['siteId', 'address', 'network', 'service', 'bandwidthMbps', 'health?', 'peakMbps?', 'p95Mbps?'],
  cloudLink: ['csp', 'pop', 'region?', 'bandwidthMbps', 'service?', 'network?'],
  discovery: ['csp', 'region', 'bytesIn?', 'bytesOut?', 'vpcs[]'],
  vpc: ['id', 'name', 'subnets[]'],
  subnet: ['id', 'cidr', 'affinity?', 'bytesIn?', 'bytesOut?'],
};
export const SERVICES = ['ADI', 'ABF', 'ASEoD', 'AVPN'];
/** Services that belong to a named network (the note: customers run many AVPN and ASEoD networks). */
export const NETWORKED = ['AVPN', 'ASEoD'];

// ---- POP to region ----
// Each cloud publishes which regions a peering location serves. Microsoft's ExpressRoute table (read 2026-10-12):
// Washington DC = Equinix DC2 and DC6, local Azure regions East US and East US 2, AT&T NetBond a listed provider.
// Rows marked verify are from memory of the AWS, Google and Azure lists and must be checked row by row before the
// table ships to the team (plan, task 1).
export const POP_REGIONS = [
  { csp: 'Azure', provider: 'Equinix', facility: 'DC2', metro: 'Ashburn', location: 'Washington DC', regions: ['East US', 'East US 2'] },
  { csp: 'Azure', provider: 'Equinix', facility: 'DC6', metro: 'Ashburn', location: 'Washington DC', regions: ['East US', 'East US 2'] },
  { csp: 'Azure', provider: 'Coresite', facility: 'VA2', metro: 'Reston', location: 'Washington DC2', regions: ['East US', 'East US 2'] },
  { csp: 'Azure', provider: 'Equinix', facility: 'CH1', metro: 'Chicago', location: 'Chicago', regions: ['North Central US', 'Central US'], verify: true },
  { csp: 'Azure', provider: 'Equinix', facility: 'DA3', metro: 'Dallas', location: 'Dallas', regions: ['South Central US', 'Central US'], verify: true },
  { csp: 'Azure', provider: 'Equinix', facility: 'SV1', metro: 'San Jose', location: 'Silicon Valley', regions: ['West US', 'West US 2'], verify: true },
  { csp: 'Azure', provider: 'Equinix', facility: 'SE2', metro: 'Seattle', location: 'Seattle', regions: ['West US 2'], verify: true },
  { csp: 'Azure', provider: 'Equinix', facility: 'NY5', metro: 'New York', location: 'New York', regions: ['East US', 'East US 2'], verify: true },
  { csp: 'Azure', provider: 'Equinix', facility: 'AT1', metro: 'Atlanta', location: 'Atlanta', regions: ['East US 2', 'East US'], verify: true },
  { csp: 'AWS', provider: 'Equinix', facility: 'DC2', metro: 'Ashburn', location: 'Ashburn', regions: ['us-east-1'], verify: true },
  { csp: 'AWS', provider: 'CoreSite', facility: 'VA1', metro: 'Reston', location: 'Reston', regions: ['us-east-1'], verify: true },
  { csp: 'AWS', provider: 'Equinix', facility: 'SE2', metro: 'Seattle', location: 'Seattle', regions: ['us-west-2'], verify: true },
  { csp: 'AWS', provider: 'Equinix', facility: 'SV5', metro: 'San Jose', location: 'San Jose', regions: ['us-west-1'], verify: true },
  { csp: 'AWS', provider: 'Equinix', facility: 'CH2', metro: 'Chicago', location: 'Chicago', regions: ['us-east-2'], verify: true },
  { csp: 'AWS', provider: 'Equinix', facility: 'DA2', metro: 'Dallas', location: 'Dallas', regions: ['us-east-1'], verify: true },
  { csp: 'GCP', provider: 'Equinix', facility: 'DC2', metro: 'Ashburn', location: 'Ashburn', regions: ['us-east4'], verify: true },
  { csp: 'GCP', provider: 'Equinix', facility: 'CH1', metro: 'Chicago', location: 'Chicago', regions: ['us-central1'], verify: true },
  { csp: 'GCP', provider: 'Equinix', facility: 'SV1', metro: 'San Jose', location: 'San Jose', regions: ['us-west1', 'us-west2'], verify: true },
  { csp: 'Oracle', provider: 'Equinix', facility: 'DC2', metro: 'Ashburn', location: 'Ashburn', regions: ['us-ashburn-1'], verify: true },
];
/** API names the discovery feed may use, by display name. The join compares display names. */
export const REGION_ALIAS = { eastus: 'East US', eastus2: 'East US 2', westus: 'West US', westus2: 'West US 2', centralus: 'Central US', northcentralus: 'North Central US', southcentralus: 'South Central US', westeurope: 'West Europe', northeurope: 'North Europe' };
export const regionName = (r) => REGION_ALIAS[String(r || '').toLowerCase()] || r;
const cspKey = (csp) => (/google/i.test(csp) ? 'GCP' : csp);
const samePop = (row, pop) => pop && row.provider.toLowerCase() === String(pop.provider || '').toLowerCase() && row.facility.toLowerCase() === String(pop.facility || '').toLowerCase();
/** The regions a cloud serves from a POP, or none when the POP is not in the table. */
export function regionsOfPop(csp, pop) {
  const row = POP_REGIONS.find(r => r.csp === cspKey(csp) && samePop(r, pop));
  return row ? [...row.regions] : [];
}
/** Which discovered regions ride an AT&T connection: on (via a link whose POP serves the region, or whose region is
 *  stated), or not; cspOnly when AT&T connects that cloud somewhere but no link can be tied to the region. */
export function attJoin(cloudLinks = [], discovery = []) {
  const out = new Map();
  for (const d of discovery) {
    const name = regionName(d.region), csp = cspKey(d.csp);
    const via = cloudLinks.find(l => cspKey(l.csp) === csp && (regionName(l.region) === name || regionsOfPop(l.csp, l.pop).includes(name))) || null;
    const cspLink = via ? null : cloudLinks.find(l => cspKey(l.csp) === csp) || null;
    out.set(`${d.csp}/${d.region}`, { on: !!via, via, cspOnly: !via && !!cspLink, cspLink });
  }
  return out;
}

// ---- grouping ----
/** Circuits by network, then the sites and states each one touches. ADI and ABF carry no network. */
export function networksOf(circuits = []) {
  const by = new Map();
  for (const c of circuits) {
    const id = c.network && c.network.id ? c.network.id : null;
    if (!by.has(id)) by.set(id, { id, name: id ? (c.network.name || id) : 'No network', circuits: [] });
    by.get(id).circuits.push(c);
  }
  return [...by.values()].map(n => ({ ...n, sites: new Set(n.circuits.map(c => c.siteId)).size, states: [...new Set(n.circuits.map(c => c.address.state))].sort() }))
    .sort((a, b) => (a.id === null) - (b.id === null) || b.circuits.length - a.circuits.length || a.name.localeCompare(b.name));
}
/** Columns for a table: present only when some row carries the field. `spec` is [[key, label], ...]. */
export const columnsFor = (rows, spec) => spec.map(([key, label]) => ({ key, label, present: rows.some(r => r[key] !== undefined && r[key] !== null) }));

// ---- fixtures ----
const SERVICE_OF = { 'AVPN (MPLS VPN)': 'AVPN', 'ASE on Demand': 'ASEoD', 'ABF (Business Fiber)': 'ABF', 'ADI (Dedicated Internet)': 'ADI' };
const BW_OF = { AVPN: 1000, ASEoD: 2000, ABF: 1000, ADI: 500 };
// The portal carries US addresses only; the journey estate's eight non-US sites are re-homed to US metros here.
const REHOME = { London: 'Phoenix', Amsterdam: 'Miami', Paris: 'Charlotte', Dublin: 'Nashville', Tokyo: 'Portland', Sydney: 'Philadelphia', Mumbai: 'Detroit', Seoul: 'Salt Lake City' };
const STATE_X = { Phoenix: 'AZ', Miami: 'FL', Charlotte: 'NC', Nashville: 'TN', Portland: 'OR', Philadelphia: 'PA', Detroit: 'MI', 'Salt Lake City': 'UT' };
const abbr = (metro) => metro.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
const streets = ['Commerce St', 'Main St', 'Market St', 'Industrial Blvd', 'Harbor Dr', 'Airport Rd', 'Tech Pkwy', 'Union Ave'];
function callowayCircuits() {
  const NET = { AVPN: { id: 'CF-AVPN-01', name: 'Calloway core' }, ASEoD: { id: 'CF-ASE-01', name: 'Calloway metro Ethernet' } };
  const seen = {};
  return D.ESTATES.lastmile.sites.map((st, i) => {
    const metro = REHOME[st.metro] || st.metro, state = STATE_X[metro] || S.stateOf(metro), service = SERVICE_OF[st.access] || 'ADI';
    seen[metro] = (seen[metro] || 0) + 1;
    return { siteId: `${abbr(metro)}-${String(seen[metro]).padStart(3, '0')}`, name: st.name.replace(st.metro, metro),
      address: { line: `${100 + i * 37} ${streets[i % streets.length]}`, city: metro, state, zip: String(10000 + ((i * 7919) % 89999)) },
      network: NETWORKED.includes(service) ? NET[service] : null, service, bandwidthMbps: BW_OF[service] };
  });
}
function callowayDiscovery() {
  const vnet = (id, name, subnets) => ({ id, name, subnets: subnets.map((cidr, i) => ({ id: `${id}-sn${i + 1}`, cidr })) });
  return [
    { csp: 'Azure', region: 'eastus', vpcs: [vnet('vnet-dispatch', 'dispatch-prod', ['10.10.0.0/24', '10.10.1.0/24', '10.10.2.0/24']), vnet('vnet-portal', 'customer-portal', ['10.20.0.0/24', '10.20.1.0/24']), vnet('vnet-shared', 'shared-services', ['10.30.0.0/23', '10.30.2.0/24', '10.30.3.0/24', '10.30.4.0/24'])] },
    { csp: 'Azure', region: 'westeurope', vpcs: [vnet('vnet-eu-portal', 'customer-portal-eu', ['10.120.0.0/24', '10.120.1.0/24']), vnet('vnet-eu-ledger', 'fin-ledger', ['10.130.0.0/24'])] },
  ];
}
// A seeded generator so the synthetic estate is the same on every run.
function rng(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
const US_METROS = ['Dallas', 'Houston', 'Atlanta', 'Chicago', 'Phoenix', 'Denver', 'Seattle', 'Miami', 'Charlotte', 'Nashville', 'San Jose', 'Los Angeles', 'New York', 'Boston', 'Minneapolis', 'Ashburn', 'Portland', 'Philadelphia', 'Detroit', 'Salt Lake City'];
function scaleFixture() {
  const r = rng(20261012);
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  const nets = Array.from({ length: 30 }, (_, i) => ({ id: `BK-${i < 22 ? 'AVPN' : 'ASE'}-${String(i + 1).padStart(2, '0')}`, name: `${['Retail', 'Trading', 'Branch', 'Ops', 'Treasury', 'Mortgage'][i % 6]} ${String.fromCharCode(65 + (i % 26))}`, service: i < 22 ? 'AVPN' : 'ASEoD' }));
  const circuits = [], seen = {};
  for (let i = 0; i < 3000; i++) {
    const metro = pick(US_METROS), state = STATE_X[metro] || S.stateOf(metro);
    seen[metro] = (seen[metro] || 0) + 1;
    const site = `${abbr(metro)}-${String(Math.ceil(seen[metro] / 1.6)).padStart(4, '0')}`; // about 1.6 circuits a site
    const net = r() < 0.86 ? nets[Math.floor(r() * nets.length)] : null;
    const service = net ? net.service : (r() < 0.5 ? 'ADI' : 'ABF');
    const bw = pick(service === 'ASEoD' ? [1000, 2000, 5000, 10000] : service === 'AVPN' ? [100, 200, 500, 1000] : [500, 1000]);
    const p95 = Math.round(bw * (0.2 + r() * 0.7));
    circuits.push({ siteId: site, address: { line: `${100 + Math.floor(r() * 9000)} ${pick(streets)}`, city: metro, state, zip: String(10000 + Math.floor(r() * 89999)) },
      network: net ? { id: net.id, name: net.name } : null, service, bandwidthMbps: bw, health: r() < 0.012 ? 'down' : 'ok', peakMbps: Math.min(bw, Math.round(p95 * (1.05 + r() * 0.3))), p95Mbps: p95 });
  }
  const pops = POP_REGIONS;
  const cloudLinks = [
    ['Azure', 'DC2'], ['Azure', 'DC6'], ['Azure', 'CH1'], ['Azure', 'DA3'], ['AWS', 'DC2'], ['AWS', 'SE2'], ['AWS', 'DA2'], ['AWS', 'CH2'], ['GCP', 'DC2'], ['GCP', 'CH1'], ['Azure', 'XX7'], ['AWS', 'VA1'],
  ].map(([csp, fac], i) => { const row = pops.find(p => p.csp === csp && p.facility === fac); const net = nets[i % 4];
    return { csp, pop: row ? { provider: row.provider, facility: row.facility, metro: row.metro } : { provider: 'Equinix', facility: fac, metro: 'Ashburn' }, bandwidthMbps: [1000, 2000, 5000, 10000][i % 4],
      ...(i % 3 === 0 ? { service: 'L3-VPN', network: { id: net.id, name: net.name } } : {}) }; });
  const sub = (id, cidr) => ({ id, cidr, affinity: pick(['att', 'att', 'csp', 'other']), bytesIn: Math.floor(r() * 4e12), bytesOut: Math.floor(r() * 9e12) });
  const vpc = (id, name, n) => ({ id, name, subnets: Array.from({ length: n }, (_, k) => sub(`${id}-sn${k + 1}`, `10.${Math.floor(r() * 250)}.${k}.0/24`)) });
  const disc = (csp, region, vpcs) => ({ csp, region, bytesIn: Math.floor(r() * 8e13), bytesOut: Math.floor(r() * 2e14), vpcs });
  const discovery = [
    disc('Azure', 'eastus', [vpc('vnet-core-east', 'core-banking', 6), vpc('vnet-web-east', 'online-banking', 4), vpc('vnet-dmz-east', 'dmz', 2)]),
    disc('Azure', 'centralus', [vpc('vnet-dr-central', 'dr-banking', 5)]),
    disc('Azure', 'westeurope', [vpc('vnet-eu', 'eu-cards', 3)]),
    disc('AWS', 'us-east-1', [vpc('vpc-trading', 'trading-prod', 8), vpc('vpc-data', 'data-lake', 5)]),
    disc('AWS', 'us-west-2', [vpc('vpc-ml', 'fraud-ml', 4)]),
    disc('AWS', 'us-east-2', [vpc('vpc-dr', 'trading-dr', 3)]),
    disc('GCP', 'us-east4', [vpc('vpc-gke', 'mobile-api', 5)]),
    disc('GCP', 'us-central1', [vpc('vpc-bq', 'analytics', 3)]),
  ];
  return { name: 'Bank scale', synthetic: true, circuits, cloudLinks, discovery };
}
export const FIXTURES = {
  calloway: { name: 'Calloway Freight', synthetic: false, circuits: callowayCircuits(), cloudLinks: [], discovery: callowayDiscovery() },
  scale: scaleFixture(),
};

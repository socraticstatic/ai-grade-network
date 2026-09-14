import { describe, it, expect } from 'vitest';
import { buildMap, type MapVpc, type MapCloud, type MapRegion } from './buildMap';

const aws: MapCloud = { id: 'aws', name: 'AWS', color: '#ff9900' };
const use1: MapRegion = { id: 'use1', name: 'us-east-1', sub: 'N. Virginia' };

// vpc-prod-01: rd-helion, 3 AZ, attached, no special tag rule
const vpcProd: MapVpc = {
  id: 'vpcprod',
  name: 'vpc-prod-01',
  cidr: '10.0.0.0/16',
  azs: 3,
  attached: true,
  role: 'Production',
  tags: ['rd-helion', 'shared-services'],
};
// vpc-data-02: finance-invoices, 2 AZ, attached (noInternet rule)
const vpcData: MapVpc = {
  id: 'vpcdata',
  name: 'vpc-data-02',
  cidr: '10.1.0.0/16',
  azs: 2,
  attached: true,
  role: 'Data lake',
  tags: ['finance-invoices'],
};
// vpc-dmz-03: classified-helion, 2 AZ, NOT attached (needsInspection rule)
const vpcDmz: MapVpc = {
  id: 'vpcdmz',
  name: 'vpc-dmz-03',
  cidr: '10.2.0.0/16',
  azs: 2,
  attached: false,
  role: 'DMZ',
  tags: ['classified-helion'],
};

const NO_FIXES: Record<string, boolean> = {
  fwInspection: false,
  isolateFinance: false,
};

describe('buildMap', () => {
  it('vpc-prod-01: 3 AZ → 6 subnets, 4 route tables, gateways incl. Direct Connect, zero violations', () => {
    const m = buildMap(vpcProd, aws, use1, NO_FIXES);
    expect(m.subnets).toHaveLength(6); // 3 az × (public+private)
    expect(m.rtables).toHaveLength(4); // rtb-public + 3 private
    // igw, nat×3, s3, dx (attached), tgw
    expect(m.gateways.map(g => g.id)).toEqual(['igw', 'nat-0', 'nat-1', 'nat-2', 's3', 'dx', 'tgw']);
    expect(m.gateways.find(g => g.id === 'dx')?.att).toBe(true);
    expect(m.violations).toHaveLength(0);
    expect(m.primaryTag).toBe('rd-helion');
  });

  it('vpc-data-02 (finance-invoices, unfixed): private egress is s3/dx only and the public-subnet path is the single violation', () => {
    const m = buildMap(vpcData, aws, use1, NO_FIXES);
    expect(m.subnets).toHaveLength(4);
    expect(m.gateways.map(g => g.id)).toEqual(['igw', 'nat-0', 'nat-1', 's3', 'dx', 'tgw']);
    // private route tables must NOT carry a default internet route
    const priv = m.rtables.filter(rt => rt.type === 'Private');
    expect(priv.every(rt => rt.routes.every(([dst]) => dst !== '0.0.0.0/0'))).toBe(true);
    expect(m.violations).toHaveLength(1);
    expect(m.violations[0]).toMatchObject({ rtId: 'rtpub', tag: 'finance-invoices' });
  });

  it('vpc-data-02 (finance-invoices, isolateFinance ON): violation clears', () => {
    const m = buildMap(vpcData, aws, use1, { isolateFinance: true });
    expect(m.violations).toHaveLength(0);
  });

  it('vpc-dmz-03 (classified-helion, uninspected): every private egress is flagged plus the public path — 3 violations, no fw gateway', () => {
    const m = buildMap(vpcDmz, aws, use1, NO_FIXES);
    expect(m.gateways.find(g => g.id === 'fw')).toBeUndefined();
    expect(m.gateways.find(g => g.id === 'dx')).toBeUndefined(); // not attached
    expect(m.rtables.filter(rt => rt.uninspected)).toHaveLength(2);
    expect(m.violations).toHaveLength(3); // 2 uninspected route tables + public path
    expect(m.violations.every(v => v.tag === 'classified-helion')).toBe(true);
  });

  it('vpc-dmz-03 (classified-helion, fwInspection ON): firewall inserted, egress routes through fw, violations clear', () => {
    const m = buildMap(vpcDmz, aws, use1, { fwInspection: true });
    expect(m.gateways.find(g => g.id === 'fw')).toBeDefined();
    const priv = m.rtables.filter(rt => rt.type === 'Private');
    expect(priv.every(rt => rt.routes.some(([dst, gw]) => dst === '0.0.0.0/0' && gw === 'fw'))).toBe(true);
    expect(m.rtables.some(rt => rt.uninspected)).toBe(false);
    expect(m.violations).toHaveLength(0);
  });

  it('is deterministic — identical output across repeated builds', () => {
    expect(buildMap(vpcDmz, aws, use1, NO_FIXES)).toEqual(buildMap(vpcDmz, aws, use1, NO_FIXES));
  });

  it('VNet clouds get ExpressRoute / private-endpoint naming', () => {
    const vnet: MapVpc = { ...vpcProd, id: 'vnetapp', vnet: true, tags: [] };
    const m = buildMap(vnet, aws, use1, NO_FIXES);
    expect(m.gateways.find(g => g.id === 'dx')?.type).toBe('ExpressRoute gateway');
    expect(m.gateways.find(g => g.id === 's3')?.type).toBe('Private endpoint');
    expect(m.gateways.find(g => g.id === 'tgw')?.type).toBe('Virtual WAN hub');
  });
});

import { CC } from '../../engine';

/**
 * Pure port of the original AI-grade network `buildMap(vpc, cloud, region)`
 * (js/discovery.js:18-81). Given one VPC/VNet plus its cloud and region, it
 * synthesizes an AWS-style resource map — subnets grouped by availability
 * zone, route tables with their routes, gateways/connections, and the policy
 * violation surfaces the tag rules produce.
 *
 * Deterministic: no Date.now / Math.random. The only external input is the
 * remediation `fixes` bag, injected as a 4th argument (defaulting to the live
 * engine state) so the function stays a pure map of (vpc, cloud, region,
 * fixes) → model and unit-tests can pin an exact fixes snapshot.
 */

export interface MapVpc {
  id: string;
  name: string;
  cidr: string;
  azs: number;
  attached: boolean;
  role?: string;
  tags?: string[];
  vnet?: boolean;
  ai?: boolean;
}
export interface MapCloud {
  id: string;
  name: string;
  color: string;
}
export interface MapRegion {
  id: string;
  name: string;
  sub?: string;
}

export type GatewayKind = 'igw' | 'nat' | 'dx' | 's3' | 'tgw' | 'fw';

export interface MapSubnet {
  id: string;
  name: string;
  cidr: string;
  kind: 'public' | 'private';
  eni: number;
  az: string;
  tag?: string;
}
/** A route is `[destination, gatewayId]` (e.g. `['0.0.0.0/0', 'igw']`). */
export type Route = [string, string];
export interface MapRtable {
  id: string;
  name: string;
  type: 'Public' | 'Private';
  routes: Route[];
  /** Set when private egress leaves without passing inline inspection. */
  uninspected?: boolean;
}
export interface MapGateway {
  id: string;
  name: string;
  type: string;
  ic: GatewayKind;
  /** Attached via the AI-grade network (Direct Connect / ExpressRoute). */
  att?: boolean;
}
export interface MapViolation {
  rtId: string;
  tag: string;
  msg: string;
}
export interface VpcMapModel {
  subnets: MapSubnet[];
  rtables: MapRtable[];
  gateways: MapGateway[];
  violations: MapViolation[];
  primaryTag?: string;
}

const AZ_SUFFIX = ['a', 'b', 'c'];

export function buildMap(
  vpc: MapVpc,
  cloud: MapCloud,
  region: MapRegion,
  fixes: Record<string, boolean> = CC.fixes,
): VpcMapModel {
  void cloud; // signature parity with the original; cloud isn't read directly
  const base = vpc.cidr.split('.').slice(0, 2).join('.');
  const n = Math.min(vpc.azs, 3);
  const subnets: MapSubnet[] = [];
  const rtables: MapRtable[] = [];
  const gateways: MapGateway[] = [];
  const violations: MapViolation[] = [];
  const primaryTag = (vpc.tags || [])[0];

  const inspected = primaryTag === 'classified-helion' && !!fixes.fwInspection;
  const needsInspection = primaryTag === 'classified-helion' && !fixes.fwInspection;
  const isolated = primaryTag === 'finance-invoices' && !!fixes.isolateFinance;
  const noInternet = primaryTag === 'finance-invoices';

  gateways.push({
    id: 'igw',
    name: vpc.vnet ? 'vnet-gateway' : 'igw-' + vpc.id.slice(-4),
    type: 'Internet gateway',
    ic: 'igw',
  });
  const s3: MapGateway = {
    id: 's3',
    name: vpc.vnet ? 'service-endpoint' : 's3-vpce',
    type: vpc.vnet ? 'Private endpoint' : 'S3 gateway endpoint',
    ic: 's3',
  };
  const rtPub: MapRtable = { id: 'rtpub', name: 'rtb-public', type: 'Public', routes: [['0.0.0.0/0', 'igw']] };
  rtables.push(rtPub);

  for (let i = 0; i < n; i++) {
    const az = region.name + AZ_SUFFIX[i];
    const sp: MapSubnet = {
      id: 'sn-pub-' + i,
      name: 'public-' + AZ_SUFFIX[i],
      cidr: base + '.' + i + '.0/24',
      kind: 'public',
      eni: 6 + i * 2,
      az,
      tag: primaryTag,
    };
    const spr: MapSubnet = {
      id: 'sn-pri-' + i,
      name: 'private-' + AZ_SUFFIX[i],
      cidr: base + '.' + (10 + i) + '.0/24',
      kind: 'private',
      eni: 9 + i * 3,
      az,
      tag: primaryTag,
    };
    subnets.push(sp, spr);

    const nat: MapGateway = { id: 'nat-' + i, name: 'nat-' + AZ_SUFFIX[i], type: 'NAT gateway', ic: 'nat' };
    gateways.push(nat);

    const rtPriv: MapRtable = { id: 'rtpri-' + i, name: 'rtb-private-' + AZ_SUFFIX[i], type: 'Private', routes: [] };
    if (noInternet) {
      rtPriv.routes.push(['s3-prefix', 's3']);
      if (vpc.attached) rtPriv.routes.push(['10.0.0.0/8', 'dx']);
    } else if (inspected) {
      rtPriv.routes.push(['0.0.0.0/0', 'fw'], ['s3-prefix', 's3']);
      if (vpc.attached) rtPriv.routes.push(['10.0.0.0/8', 'dx']);
    } else if (needsInspection) {
      rtPriv.routes.push(['0.0.0.0/0', nat.id], ['s3-prefix', 's3']);
      if (vpc.attached) rtPriv.routes.push(['10.0.0.0/8', 'dx']);
      rtPriv.uninspected = true;
    } else {
      rtPriv.routes.push(['0.0.0.0/0', nat.id], ['s3-prefix', 's3']);
      if (vpc.attached) rtPriv.routes.push(['10.0.0.0/8', 'dx']);
    }
    rtables.push(rtPriv);
  }

  gateways.push(s3);
  if (inspected)
    gateways.push({ id: 'fw', name: 'fw-inspect-01', type: 'Inspection firewall · inserted by policy', ic: 'fw' });
  if (vpc.attached)
    gateways.push({
      id: 'dx',
      name: vpc.vnet ? 'er-circuit' : 'dxgw-' + vpc.id.slice(-4),
      type: vpc.vnet ? 'ExpressRoute gateway' : 'Direct Connect gateway',
      ic: 'dx',
      att: true,
    });
  gateways.push({
    id: 'tgw',
    name: vpc.vnet ? 'vwan-hub' : 'tgw-attach',
    type: vpc.vnet ? 'Virtual WAN hub' : 'Transit gateway',
    ic: 'tgw',
  });

  /* policy violations */
  if (noInternet && !isolated) {
    rtables
      .filter(rt => rt.type === 'Private')
      .forEach(rt => {
        if (rt.routes.some(r => r[1] === 'igw' || r[0] === '0.0.0.0/0'))
          violations.push({ rtId: rt.id, tag: 'finance-invoices', msg: 'route table permits internet egress' });
      });
    violations.push({
      rtId: 'rtpub',
      tag: 'finance-invoices',
      msg: 'public subnet associated — direct internet path exists',
    });
  }
  if (needsInspection) {
    rtables
      .filter(rt => rt.uninspected)
      .forEach(rt => {
        violations.push({ rtId: rt.id, tag: 'classified-helion', msg: 'egress bypasses security inspection' });
      });
    violations.push({ rtId: 'rtpub', tag: 'classified-helion', msg: 'no inline inspection on egress path' });
  }

  return { subnets, rtables, gateways, violations, primaryTag };
}

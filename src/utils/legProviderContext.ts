import type { CloudProvider } from '../types/connection';

/**
 * Provider-native context for a single C2C leg. AT&T's Connection is the primary
 * frame; this surfaces what each cloud leg provisions underneath it (the native
 * interconnect object, its provider-side BGP ASN, and the AT&T transport that
 * carries it). Numbers are from the connection-builder skill (2025-2026 docs).
 */
export interface LegProviderContext {
  /** Provider-native interconnect object provisioned for this leg. */
  nativeObject: string;
  /** What a Cloud to Cloud leg uses for this provider specifically. */
  c2cMechanism: string;
  /** Provider-side (cloud) BGP ASN. Undefined for providers without a fixed ASN. */
  asn?: number;
  /** AT&T transport that typically carries this provider's interconnect. */
  transport: string;
}

const CONTEXT: Partial<Record<CloudProvider, LegProviderContext>> = {
  AWS: {
    nativeObject: 'AWS Direct Connect hosted connection',
    c2cMechanism: 'Transit VIF on AWS Direct Connect',
    asn: 7224,
    transport: 'AT&T MPLS / Ethernet',
  },
  Azure: {
    nativeObject: 'Azure ExpressRoute circuit',
    c2cMechanism: 'ExpressRoute Global Reach',
    asn: 12076,
    transport: 'AT&T MPLS / Ethernet',
  },
  Google: {
    nativeObject: 'Google Cloud Interconnect',
    c2cMechanism: 'Multiple VLAN attachments',
    asn: 16550,
    transport: 'AT&T Ethernet',
  },
  Oracle: {
    nativeObject: 'Oracle FastConnect virtual circuit',
    c2cMechanism: 'Multiple FastConnect virtual circuits',
    asn: 31898,
    transport: 'AT&T Ethernet',
  },
};

const FALLBACK: LegProviderContext = {
  nativeObject: 'Cloud interconnect',
  c2cMechanism: 'Private backbone transit',
  transport: 'AT&T MPLS / Ethernet',
};

export function getLegProviderContext(provider: CloudProvider | string): LegProviderContext {
  return CONTEXT[provider as CloudProvider] ?? FALLBACK;
}

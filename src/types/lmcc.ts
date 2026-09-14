/**
 * LMCC (Last Mile Cloud Connectivity) Type Definitions
 *
 * Product: AT&T AWS Interconnect — Connection Coordinator API model.
 * Customer makes 3 choices: location, bandwidth, AWS account ID.
 * Everything else (BGP ASN, VLAN, IP subnets, MTU) is negotiated
 * automatically between AT&T and AWS. Customers configure nothing else.
 *
 * Two portal flows:
 *   Flow 03 (AT&T-first): Customer starts here, generates ActivationKey, takes it to AWS.
 *   Flow 04 (AWS-first):  Customer starts at AWS, gets ActivationKey there, uploads it here.
 * Both converge at the same 5-stage status progression.
 */

// --- Metro ---

export type LMCCPhase = 'preview' | 'ga';

export interface LMCCMetro {
  id: string;
  name: string;            // "San Jose, CA" | "Northern Virginia"
  datacenters: string[];   // 2 diverse AWS DX colocation sites per metro
  facilities: string[];    // "Equinix" | "CoreSite"
  phase: LMCCPhase;
  awsRegion: string;
  awsRegionLabel: string;
  available: boolean;      // false = infrastructure not yet ready (e.g. LA fiber pending)
  unavailableReason?: string;
}

// --- ActivationKey ---

export interface LMCCActivationKey {
  raw: string;             // base64-encoded key string
  sharedConnectionUuid: string;
  connectionSizeMbps: number;
  destinationAccountId: string;
  destinationEnvironmentUri: string;
  expiresAt: string;       // ISO timestamp — keys are valid 7 days
  generatedAt: string;
}

// --- Flow 03: Intent (AT&T-first) ---

export interface LMCCFlow03Intent {
  metroId: string;
  bandwidthMbps: number;
  awsAccountId: string;    // must be valid 12-digit AWS account ID
}

// --- Key upload error states (Flow 04) ---

export type LMCCKeyUploadError =
  | 'invalid-format'       // locally: not a valid ActivationKey shape
  | 'not-recognised'       // AWS returned keyValid: false — security event
  | 'already-used'         // key already activated a connection
  | 'expired'              // more than 7 days since generation
  | 'wrong-account';       // AWS account in key ≠ authenticated user's account

// --- Path (one of 4 per LMCC connection) ---

export type BGPState =
  | 'idle'
  | 'connect'
  | 'active'
  | 'open-sent'
  | 'open-confirm'
  | 'established';

export type LMCCPathStatus = 'pending' | 'active' | 'warning' | 'down';

export interface LMCCPathSubnet {
  network: string;    // e.g. "169.254.10.0/30"
  attPeerIp: string;  // AT&T router-side peer IP
  awsPeerIp: string;  // AWS-side peer IP
}

export interface LMCCPath {
  id: string;
  ipeId: string;              // Juniper MX-304 identifier
  datacenter: string;
  awsConnectionId: string;
  vlanId: number;             // AWS-assigned — not customer-configured
  bgpState: BGPState;
  physicalPort: string;
  status: LMCCPathStatus;
  subnet?: LMCCPathSubnet;    // /30 BGP peering subnet — auto-assigned by AT&T
}

// --- PRD 5-stage status progression ---
// Applies to BOTH flows once the ActivationKey exchange is complete.

export type ConnectionProvisioningStatus =
  | 'key-generated'       // Flow 03 only: AT&T created pending connection, waiting for AWS
  | 'key-accepted'        // AWS received and validated the key, negotiation starting
  | 'negotiating'         // AT&T and AWS auto-negotiating L3 for all 4 channels
  | 'bgp-forming'         // Parameters agreed, BGP sessions coming up on AT&T hardware
  | 'live';               // Both AT&T and AWS confirmed. Traffic can flow.

// Operational states for an already-live connection
export type LMCCConnectionStatus =
  | ConnectionProvisioningStatus
  | 'degraded'            // 1-3 paths down but service operational
  | 'disconnected';       // All paths down or connection deleted

// --- Contract ---

export type LMCCContractType =
  | 'trial'       // Preview phase only, zero-penalty disconnect
  | 'monthly'
  | 'fixed-12'
  | 'fixed-24'
  | 'fixed-36';

// --- Connection ---

export interface LMCCBilling {
  trigger: 'bgp-established';
  startedAt?: string;
  contractEndDate?: string;
  model: 'fixed-rate' | 'burstable';
}

export interface LMCCBGP {
  partnerASN: number;    // AT&T's ASN (7018) — not customer-configured
  customerASN: number;   // negotiated automatically
  md5Key?: string;       // negotiated automatically
}

export interface LMCCBFD {
  interval: number;
  multiplier: number;
}

export interface LMCCConnection {
  id: string;
  awsAccountId: string;
  metro: LMCCMetro;
  status: LMCCConnectionStatus;
  provisioningStatus?: ConnectionProvisioningStatus;
  contractType: LMCCContractType;
  bandwidth: number;       // Mbps — same for all 4 paths
  transport: 'mpls' | 'internet';
  paths: [LMCCPath, LMCCPath, LMCCPath, LMCCPath];
  bgp: LMCCBGP;
  bfd: LMCCBFD;
  billing: LMCCBilling;
  activationKey?: LMCCActivationKey;
  createdAt: string;
  updatedAt: string;
}

// --- Phase capabilities ---

export interface LMCCPhaseConfig {
  phase: LMCCPhase;
  availableMetros: string[];
  bandwidthOptions: number[];
  contractTypes: LMCCContractType[];
  transports: ('mpls' | 'internet')[];
  operations: ('create' | 'read' | 'update' | 'delete')[];
}

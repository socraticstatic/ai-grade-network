/**
 * LMCC GA two-track model (Design Brief 07062026):
 *   Status — whether the customer can use the connection.
 *   Health — how well we are keeping the resiliency promise. Exists only while Live.
 * The two move independently: a path dropping never moves a Live status while
 * traffic flows; only health moves. Status can lag reality — copy must never
 * promise real-time certainty.
 */

export type CustomerStatus =
  | 'Pending'
  | 'Provisioning'
  | 'Live'
  | 'Needs attention'
  | 'Expired'
  | 'Deleting'
  | 'Deleted';

export type HealthPosture = 'full' | 'reduced-healing' | 'degraded';

export interface CustomerState {
  status: CustomerStatus;
  health: HealthPosture | null;
}

export interface EngineInput {
  provisioningStatus:
    | 'key-generated'
    | 'key-accepted'
    | 'negotiating'
    | 'bgp-forming'
    | 'live'
    | 'failed'
    | 'deleting'
    | 'deleted';
  /** Paths currently up, 0..4 */
  pathsUp: number;
  attConfirmed: boolean;
  awsConfirmed: boolean;
  keyCreatedAt: string; // ISO
  now?: string;         // ISO — injectable for tests
}

const KEY_EXPIRY_DAYS = 7;

export function deriveCustomerState(input: EngineInput): CustomerState {
  const { provisioningStatus, pathsUp, attConfirmed, awsConfirmed } = input;

  if (provisioningStatus === 'deleted') return { status: 'Deleted', health: null };
  if (provisioningStatus === 'deleting') return { status: 'Deleting', health: null };
  if (provisioningStatus === 'failed') return { status: 'Needs attention', health: null };

  if (provisioningStatus === 'key-generated') {
    const created = Date.parse(input.keyCreatedAt);
    const now = input.now ? Date.parse(input.now) : Date.now();
    const ageDays = (now - created) / 86_400_000;
    return { status: ageDays >= KEY_EXPIRY_DAYS ? 'Expired' : 'Pending', health: null };
  }

  if (provisioningStatus !== 'live') {
    // key-accepted / negotiating / bgp-forming: 3-of-4 ready is still not the customer's Live.
    return { status: 'Provisioning', health: null };
  }

  // provisioningStatus === 'live'
  if (!attConfirmed || !awsConfirmed) {
    // Live requires BOTH providers confirmed.
    return { status: 'Provisioning', health: null };
  }
  if (pathsUp <= 0) {
    // Nothing passing traffic: the customer cannot use it.
    return { status: 'Needs attention', health: null };
  }
  const health: HealthPosture = pathsUp >= 4 ? 'full' : pathsUp === 3 ? 'reduced-healing' : 'degraded';
  return { status: 'Live', health };
}

export const STATUS_META: Record<CustomerStatus, { dotClass: string; blurb: string }> = {
  'Pending': {
    dotClass: 'bg-fw-warn',
    blurb: 'Key created. Waiting on you to complete the other side. Not billing.',
  },
  'Provisioning': {
    dotClass: 'bg-fw-link',
    blurb: 'Both providers are bringing it up. Not ready, not billing.',
  },
  'Live': {
    dotClass: 'bg-fw-success',
    blurb: 'Up and passing traffic. Both providers confirmed. Billing has started.',
  },
  'Needs attention': {
    dotClass: 'bg-fw-error',
    blurb: 'Something failed or is blocked and you may need to act.',
  },
  'Expired': {
    dotClass: 'bg-fw-bodyLight',
    blurb: 'The key was never completed within 7 days. Not usable, never billed.',
  },
  'Deleting': {
    dotClass: 'bg-fw-bodyLight',
    blurb: 'On its way out. Recurring billing has ended.',
  },
  'Deleted': {
    dotClass: 'bg-fw-bodyLight',
    blurb: 'Gone. Everything underneath was torn down automatically.',
  },
};

export const HEALTH_META: Record<HealthPosture, { label: string; blurb: string }> = {
  'full': {
    label: 'Full protection',
    blurb: 'All four paths healthy.',
  },
  'reduced-healing': {
    label: 'Reduced — healing',
    blurb: 'One path is repairing itself — no action needed.',
  },
  'degraded': {
    label: 'Degraded',
    blurb: 'Multiple paths are down. Traffic is flowing; we are restoring protection.',
  },
};

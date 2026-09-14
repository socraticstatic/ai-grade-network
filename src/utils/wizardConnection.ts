import type {
  CloudProvider,
  ConnectionLegConfig,
  ConnectionStatus,
  ConnectionType,
} from '../types/connection';
import type { Hub } from '../types/hub';

interface DeriveC2CParams {
  selectedType?: string;
  selectedProviders: CloudProvider[];
  selectedLocations: Record<string, string[]>;
  fallbackLocation?: string;
  bandwidth: string;
  status: ConnectionStatus;
}

interface DerivedConnectionFields {
  type: ConnectionType | string;
  providers?: CloudProvider[];
  locations?: string[];
  legs?: ConnectionLegConfig[];
}

/**
 * Derive the type/providers/locations/legs for a connection being created by the
 * wizard. A Cloud to Cloud selection with two or more clouds becomes a single
 * 'Cloud to Cloud' connection with one leg per cloud (each tied to its location).
 * Anything else stays a single-provider connection.
 */
export function deriveC2CFields({
  selectedType,
  selectedProviders,
  selectedLocations,
  fallbackLocation,
  bandwidth,
  status,
}: DeriveC2CParams): DerivedConnectionFields {
  const isC2C = selectedType === 'Cloud to Cloud' && selectedProviders.length >= 2;

  if (!isC2C) {
    // AWS Last Mile is its own product type — never rewritten to an Internet-to-X label.
    if (selectedType === 'AWS Last Mile') return { type: 'AWS Last Mile' };
    const primary = selectedProviders[0];
    return { type: `Internet to ${primary} Cloud` };
  }

  const legs: ConnectionLegConfig[] = selectedProviders.map((provider) => ({
    provider,
    location: (selectedLocations[provider] || [])[0] ?? fallbackLocation,
    bandwidth,
    status,
  }));

  return {
    type: 'Cloud to Cloud',
    providers: selectedProviders,
    locations: legs.map((l) => l.location ?? '').filter(Boolean),
    legs,
  };
}

const HUB_STATUS: Record<ConnectionStatus, Hub['status']> = {
  Active: 'active',
  Inactive: 'inactive',
  Provisioning: 'provisioning',
  Pending: 'inactive',
  Deleted: 'inactive',
};

interface BuildHubParams {
  connectionId: string;
  name: string;
  location: string;
  status: ConnectionStatus;
  createdAt: string;
}

/**
 * Build the Hub (AT&T Cloud Node) for a newly created connection. The wizard's
 * "Hub Name" names this hub; without it the connection is orphaned and hidden
 * from the hub-grouped manage view. The hub is pre-linked to the connection.
 */
export function buildHubForNewConnection({
  connectionId,
  name,
  location,
  status,
  createdAt,
}: BuildHubParams): Hub {
  return {
    id: `gw-${connectionId}`,
    name,
    description: `Hub for ${name}`,
    status: HUB_STATUS[status],
    location,
    connectionIds: [connectionId],
    links: [],
    createdAt,
  };
}

// src/components/common/ScopePicker.tsx
import { useState } from 'react';
import { ScopePath, buildScopePath, RESELLER_SCOPE } from '../../types/rbac';
import { SCOPE_CATALOG } from '../../data/scopeCatalog';

// Reseller is the broadest pickable tier (platform is not user-assignable).
export type PickableTier = 'reseller' | 'tenant' | 'client' | 'pool' | 'connection' | 'hub';

interface ScopePickerProps {
  label?: string;
  value: ScopePath;
  onChange: (scope: ScopePath) => void;
  helpText?: string;
  allowedTiers?: PickableTier[];
  tenantId?: string;   // default tenant when no tenant picker shown
  error?: string;
}

const TIER_META: Record<PickableTier, { label: string; description: string }> = {
  reseller: {
    label: 'Reseller',
    description: 'Applies across all tenants and resources under the selected reseller account.',
  },
  tenant: {
    label: 'Tenant-wide',
    description: 'Applies to all clients, pools, and resources in this tenant.',
  },
  client: {
    label: 'Client',
    description: 'Applies to all pools and resources within the selected client.',
  },
  pool: {
    label: 'Pool',
    description: 'Applies to all connections and hubs in the selected pool.',
  },
  connection: {
    label: 'Connection',
    description: 'Scoped to a single specific connection.',
  },
  'hub': {
    label: 'Hub',
    description: 'Scoped to a single specific hub.',
  },
};

// ── Cascade state helpers ─────────────────────────────────────────────────────

interface CascadeState {
  tier: PickableTier;
  resellerId: string;
  tenantId: string;   // which tenant — shown even when there's only one
  clientId: string;
  poolId: string;
  resourceId: string;
}

function defaultReseller(): string {
  return SCOPE_CATALOG.reseller[0]?.id ?? '';
}

function defaultTenant(): string {
  return SCOPE_CATALOG.tenant[0]?.id ?? 'TNT-001';
}

function defaultPool(clientId: string): string {
  return SCOPE_CATALOG.pool.find(p => p.clientId === clientId)?.id ?? '';
}

function defaultConnection(poolId: string): string {
  return SCOPE_CATALOG.connection.find(c => c.poolId === poolId)?.id ?? '';
}

function defaultHub(poolId: string): string {
  return SCOPE_CATALOG.hub.find(r => r.poolId === poolId)?.id ?? '';
}

/** Parse an existing ScopePath back into internal cascade state. */
function parseCascadeState(scope: ScopePath, fallbackTenantId: string): CascadeState {
  const segs = scope.segments;

  const resellerIdx = segs.indexOf('resellers');
  const tenantIdx   = segs.indexOf('tenants');
  const clientIdx   = segs.indexOf('clients');
  const poolIdx     = segs.indexOf('pools');
  const connIdx     = segs.indexOf('connections');
  const crIdx       = segs.indexOf('hubs');

  const resellerId  = resellerIdx !== -1 ? segs[resellerIdx + 1] : defaultReseller();
  const tenantId    = tenantIdx   !== -1 ? segs[tenantIdx + 1]   : fallbackTenantId;
  const defaultClient = SCOPE_CATALOG.client[0]?.id ?? '';

  if (connIdx !== -1) {
    const clientId = clientIdx !== -1 ? segs[clientIdx + 1] : defaultClient;
    const poolId   = poolIdx   !== -1 ? segs[poolIdx   + 1] : '';
    return { tier: 'connection', resellerId, tenantId, clientId, poolId, resourceId: segs[connIdx + 1] ?? '' };
  }
  if (crIdx !== -1) {
    const clientId = clientIdx !== -1 ? segs[clientIdx + 1] : defaultClient;
    const poolId   = poolIdx   !== -1 ? segs[poolIdx   + 1] : '';
    return { tier: 'hub', resellerId, tenantId, clientId, poolId, resourceId: segs[crIdx + 1] ?? '' };
  }
  if (poolIdx !== -1) {
    const clientId = clientIdx !== -1 ? segs[clientIdx + 1] : defaultClient;
    return { tier: 'pool', resellerId, tenantId, clientId, poolId: segs[poolIdx + 1] ?? '', resourceId: '' };
  }
  if (clientIdx !== -1) {
    return { tier: 'client', resellerId, tenantId, clientId: segs[clientIdx + 1] ?? defaultClient, poolId: '', resourceId: '' };
  }
  if (resellerIdx !== -1 && tenantIdx === -1) {
    return { tier: 'reseller', resellerId, tenantId, clientId: defaultClient, poolId: '', resourceId: '' };
  }
  return { tier: 'tenant', resellerId, tenantId, clientId: defaultClient, poolId: '', resourceId: '' };
}

/** Build a ScopePath from cascade state. */
function buildScope(state: CascadeState): ScopePath {
  const { tier, resellerId, tenantId, clientId, poolId, resourceId } = state;
  switch (tier) {
    case 'reseller':    return RESELLER_SCOPE(resellerId);
    case 'tenant':      return buildScopePath(`/tenants/${tenantId}`);
    case 'client':      return buildScopePath(`/tenants/${tenantId}/clients/${clientId}`);
    case 'pool':        return buildScopePath(`/tenants/${tenantId}/clients/${clientId}/pools/${poolId}`);
    case 'connection':  return buildScopePath(`/tenants/${tenantId}/clients/${clientId}/pools/${poolId}/connections/${resourceId}`);
    case 'hub':return buildScopePath(`/tenants/${tenantId}/clients/${clientId}/pools/${poolId}/hubs/${resourceId}`);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScopePicker({
  label = 'Scope',
  value,
  onChange,
  helpText,
  allowedTiers = ['tenant', 'client', 'pool', 'connection', 'hub'],
  tenantId: tenantIdProp = 'TNT-001',
  error,
}: ScopePickerProps) {
  const initial = parseCascadeState(value, tenantIdProp);
  const [state, setState] = useState<CascadeState>({
    ...initial,
    tier: allowedTiers.includes(initial.tier) ? initial.tier : allowedTiers[0],
    tenantId: initial.tenantId || tenantIdProp,
  });

  const poolsForClient      = SCOPE_CATALOG.pool.filter(p => p.clientId === state.clientId);
  const connectionsForPool  = SCOPE_CATALOG.connection.filter(c => c.poolId === state.poolId);
  const hubsForPool = SCOPE_CATALOG.hub.filter(r => r.poolId === state.poolId);

  const emit = (next: CascadeState) => {
    setState(next);
    onChange(buildScope(next));
  };

  const handleTierChange = (tier: PickableTier) => {
    const clientId = state.clientId || SCOPE_CATALOG.client[0]?.id || '';
    const poolId =
      tier === 'pool' || tier === 'connection' || tier === 'hub'
        ? (SCOPE_CATALOG.pool.find(p => p.clientId === clientId && p.id === state.poolId)?.id ?? defaultPool(clientId))
        : state.poolId;

    let resourceId = state.resourceId;
    if (tier === 'connection') {
      const valid = SCOPE_CATALOG.connection.find(c => c.poolId === poolId && c.id === resourceId);
      if (!valid) resourceId = defaultConnection(poolId);
    } else if (tier === 'hub') {
      const valid = SCOPE_CATALOG.hub.find(r => r.poolId === poolId && r.id === resourceId);
      if (!valid) resourceId = defaultHub(poolId);
    }

    emit({ ...state, tier, clientId, poolId, resourceId });
  };

  const handleResellerChange = (resellerId: string) => emit({ ...state, resellerId });

  const handleTenantChange = (tenantId: string) => {
    // When tenant changes, reset client to first in catalog (no cross-tenant client mapping in demo)
    const clientId = SCOPE_CATALOG.client[0]?.id ?? '';
    const poolId = defaultPool(clientId);
    emit({ ...state, tenantId, clientId, poolId, resourceId: '' });
  };

  const handleClientChange = (clientId: string) => {
    const poolId = defaultPool(clientId);
    const resourceId =
      state.tier === 'connection' ? defaultConnection(poolId)
      : state.tier === 'hub' ? defaultHub(poolId)
      : '';
    emit({ ...state, clientId, poolId, resourceId });
  };

  const handlePoolChange = (poolId: string) => {
    const resourceId =
      state.tier === 'connection' ? defaultConnection(poolId)
      : state.tier === 'hub' ? defaultHub(poolId)
      : '';
    emit({ ...state, poolId, resourceId });
  };

  const handleResourceChange = (resourceId: string) => emit({ ...state, resourceId });

  const showReseller   = state.tier === 'reseller';
  const showTenant     = state.tier !== 'reseller';
  const showClient     = state.tier !== 'reseller' && state.tier !== 'tenant';
  const showPool       = state.tier === 'pool' || state.tier === 'connection' || state.tier === 'hub';
  const showConnection = state.tier === 'connection';
  const showHub = state.tier === 'hub';

  const selectClass = (hasError = false) =>
    `w-full px-3 py-2 mb-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${
      hasError ? 'border-fw-error' : 'border-fw-secondary'
    }`;

  return (
    <div>
      {label && (
        <label className="block text-figma-sm font-medium text-fw-heading mb-2">
          {label}
        </label>
      )}

      {/* Tier radio buttons */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3">
        {allowedTiers.map(tier => (
          <label key={tier} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              name="scope-tier"
              checked={state.tier === tier}
              onChange={() => handleTierChange(tier)}
              className="text-fw-active focus:ring-fw-active"
            />
            <span className={`text-figma-sm ${state.tier === tier ? 'font-medium text-fw-heading' : 'text-fw-body'}`}>
              {TIER_META[tier].label}
            </span>
          </label>
        ))}
      </div>

      {/* Reseller picker */}
      {showReseller && (
        <select
          aria-label="Reseller"
          value={state.resellerId}
          onChange={e => handleResellerChange(e.target.value)}
          className={selectClass()}
        >
          {SCOPE_CATALOG.reseller.map(r => (
            <option key={r.id} value={r.id}>
              {r.displayName} ({r.id})
            </option>
          ))}
        </select>
      )}

      {/* Tenant picker — shown for all sub-reseller tiers */}
      {showTenant && (
        <select
          aria-label="Tenant"
          value={state.tenantId}
          onChange={e => handleTenantChange(e.target.value)}
          className={selectClass()}
        >
          {SCOPE_CATALOG.tenant.map(t => (
            <option key={t.id} value={t.id}>
              {t.displayName} ({t.id})
            </option>
          ))}
        </select>
      )}

      {/* Client picker */}
      {showClient && (
        <select
          aria-label="Client"
          value={state.clientId}
          onChange={e => handleClientChange(e.target.value)}
          className={selectClass()}
        >
          {SCOPE_CATALOG.client.map(c => (
            <option key={c.id} value={c.id}>
              {c.displayName}{c.description ? ` — ${c.description}` : ''}
            </option>
          ))}
        </select>
      )}

      {/* Pool picker — filtered by selected client */}
      {showPool && (
        <select
          aria-label="Pool"
          value={state.poolId}
          onChange={e => handlePoolChange(e.target.value)}
          className={selectClass()}
        >
          {poolsForClient.length > 0
            ? poolsForClient.map(p => (
                <option key={p.id} value={p.id}>
                  {p.displayName}{p.description ? ` — ${p.description}` : ''}
                </option>
              ))
            : <option value="">No pools in this client</option>
          }
        </select>
      )}

      {/* Connection picker — filtered by selected pool */}
      {showConnection && (
        <select
          aria-label="Connection"
          value={state.resourceId}
          onChange={e => handleResourceChange(e.target.value)}
          className={selectClass(!!error)}
        >
          {connectionsForPool.length > 0
            ? connectionsForPool.map(c => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))
            : <option value="">No connections in this pool</option>
          }
        </select>
      )}

      {/* Hub picker — filtered by selected pool */}
      {showHub && (
        <select
          aria-label="Hub"
          value={state.resourceId}
          onChange={e => handleResourceChange(e.target.value)}
          className={selectClass(!!error)}
        >
          {hubsForPool.length > 0
            ? hubsForPool.map(r => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))
            : <option value="">No hubs in this pool</option>
          }
        </select>
      )}

      <p className={`text-figma-xs ${error ? 'text-fw-error' : 'text-fw-bodyLight'}`}>
        {TIER_META[state.tier].description}
        {helpText && <span className="ml-1">{helpText}</span>}
      </p>
      {error && <p className="mt-1 text-figma-xs text-fw-error">{error}</p>}
    </div>
  );
}

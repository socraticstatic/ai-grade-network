// src/components/configure/users/MultiScopePanel.tsx
// Tabbed multi-entity scope selector used in AssignRoleDrawer.
// Lets the user pick multiple entities at a given tier (e.g. three hubs)
// and configure per-entity resource filters + access conditions.
// Submitting creates one RoleAssignment per selected entity.

import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import {
  ScopePath,
  RESELLER_SCOPE, TENANT_SCOPE, CLIENT_SCOPE, CLIENT_POOL_SCOPE,
  CONNECTION_SCOPE, HUB_SCOPE,
} from '../../../types/rbac';
import { SCOPE_CATALOG, ScopeEntity } from '../../../data/scopeCatalog';
import { PickableTier } from '../../common/ScopePicker';
import {
  ConditionsState,
  emptyConditions,
} from './ConditionsPanel';
import { ScopeDimensionsPanel } from './ScopeDimensionsPanel';

export interface MultiScopeEntry {
  id: string;
  scope: ScopePath;
  entityName: string;
  conditions: ConditionsState;
}

interface EntityOption {
  entity: ScopeEntity & { clientId?: string; poolId?: string };
  scope: ScopePath;
  groupLabel?: string;
}

interface MultiScopePanelProps {
  entries: MultiScopeEntry[];
  onChange: (entries: MultiScopeEntry[]) => void;
  allowedTiers: PickableTier[];
  tenantId?: string;
}

const TIER_LABELS: Record<PickableTier, string> = {
  reseller: 'Reseller',
  tenant: 'Tenant-wide',
  client: 'Client',
  pool: 'Pool',
  connection: 'Connection',
  'hub': 'Hub',
};

function getEntityOptions(tier: PickableTier, tenantId: string): EntityOption[] {
  switch (tier) {
    case 'reseller':
      return SCOPE_CATALOG.reseller.map(e => ({
        entity: e,
        scope: RESELLER_SCOPE(e.id),
      }));
    case 'tenant':
      return SCOPE_CATALOG.tenant.map(e => ({
        entity: e,
        scope: TENANT_SCOPE(e.id),
      }));
    case 'client':
      return SCOPE_CATALOG.client.map(e => ({
        entity: e,
        scope: CLIENT_SCOPE(tenantId, e.id),
      }));
    case 'pool':
      return SCOPE_CATALOG.pool.map(e => {
        const client = SCOPE_CATALOG.client.find(c => c.id === e.clientId);
        return {
          entity: e,
          scope: CLIENT_POOL_SCOPE(tenantId, e.clientId, e.id),
          groupLabel: client?.displayName,
        };
      });
    case 'connection':
      return SCOPE_CATALOG.connection.map(e => {
        const client = SCOPE_CATALOG.client.find(c => c.id === e.clientId);
        return {
          entity: e,
          scope: CONNECTION_SCOPE(tenantId, e.clientId, e.poolId!, e.id),
          groupLabel: client?.displayName,
        };
      });
    case 'hub':
      return SCOPE_CATALOG.hub.map(e => {
        const client = SCOPE_CATALOG.client.find(c => c.id === e.clientId);
        return {
          entity: e,
          scope: HUB_SCOPE(tenantId, e.clientId, e.poolId!, e.id),
          groupLabel: client?.displayName,
        };
      });
  }
}

export function MultiScopePanel({
  entries,
  onChange,
  allowedTiers,
  tenantId = 'TNT-001',
}: MultiScopePanelProps) {
  // Default to the narrowest "meaningful" tier for multi-select.
  // Reseller and tenant selections are uncommon; default to client when available.
  const defaultTier: PickableTier = allowedTiers.includes('client')
    ? 'client'
    : allowedTiers.includes('pool')
    ? 'pool'
    : allowedTiers.includes('tenant')
    ? 'tenant'
    : allowedTiers[0];

  const [tier, setTier] = useState<PickableTier>(defaultTier);
  const [activeTabId, setActiveTabId] = useState<string>('');

  const options = getEntityOptions(tier, tenantId);

  // Group options by parent entity (e.g. client name for pools/connections/routers).
  const groups: Map<string, EntityOption[]> = new Map();
  for (const opt of options) {
    const key = opt.groupLabel ?? '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(opt);
  }

  const isSelected = (scopeRaw: string) => entries.some(e => e.scope.raw === scopeRaw);

  const toggleEntity = (opt: EntityOption) => {
    if (isSelected(opt.scope.raw)) {
      const next = entries.filter(e => e.scope.raw !== opt.scope.raw);
      onChange(next);
      if (activeTabId && !next.find(e => e.id === activeTabId)) {
        setActiveTabId(next[next.length - 1]?.id ?? '');
      }
    } else {
      const newEntry: MultiScopeEntry = {
        id: `ms-${Date.now()}-${opt.entity.id}`,
        scope: opt.scope,
        entityName: opt.entity.displayName,
        conditions: emptyConditions(),
      };
      const next = [...entries, newEntry];
      onChange(next);
      setActiveTabId(newEntry.id);
    }
  };

  const removeEntry = (entryId: string) => {
    const next = entries.filter(e => e.id !== entryId);
    onChange(next);
    if (activeTabId === entryId) {
      setActiveTabId(next[next.length - 1]?.id ?? '');
    }
  };

  const updateConditions = (id: string, conditions: ConditionsState) => {
    onChange(entries.map(e => e.id === id ? { ...e, conditions } : e));
  };

  const copyFromFirst = (targetId: string) => {
    if (entries.length === 0) return;
    const first = entries[0];
    onChange(entries.map(e => e.id === targetId ? { ...e, conditions: { ...first.conditions } } : e));
  };

  const activeTab = entries.find(e => e.id === activeTabId) ?? entries[0];

  return (
    <div className="space-y-3">
      {/* Tier radio row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {allowedTiers.map(t => (
          <label key={t} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              checked={tier === t}
              onChange={() => setTier(t)}
              className="text-fw-active focus:ring-fw-active"
            />
            <span className={`text-figma-sm ${tier === t ? 'font-medium text-fw-heading' : 'text-fw-body'}`}>
              {TIER_LABELS[t]}
            </span>
          </label>
        ))}
      </div>

      {/* Entity checklist */}
      <div className="border border-fw-secondary rounded-lg overflow-hidden">
        {Array.from(groups.entries()).map(([groupLabel, opts]) => (
          <div key={groupLabel || '__root'}>
            {groupLabel && (
              <div className="px-3 py-1.5 bg-fw-wash border-b border-fw-secondary">
                <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
                  {groupLabel}
                </span>
              </div>
            )}
            <div className="divide-y divide-fw-secondary">
              {opts.map(opt => {
                const selected = isSelected(opt.scope.raw);
                return (
                  <label
                    key={opt.entity.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                      selected ? 'bg-fw-accent' : 'hover:bg-fw-wash'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleEntity(opt)}
                      className="text-fw-active focus:ring-fw-active shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-figma-sm font-semibold text-fw-heading leading-tight">
                        {opt.entity.displayName}
                      </div>
                      {opt.entity.description && (
                        <div className="text-figma-xs text-fw-bodyLight truncate">
                          {opt.entity.description}
                        </div>
                      )}
                    </div>
                    <span className="text-figma-xs text-fw-disabled font-mono shrink-0">
                      {opt.entity.id}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Per-entity condition tabs */}
      {entries.length > 0 && (
        <div className="border border-fw-secondary rounded-lg overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-fw-secondary bg-fw-wash">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setActiveTabId(entry.id)}
                className={`group flex items-center gap-1.5 px-3 py-2 text-figma-xs whitespace-nowrap border-r border-fw-secondary transition-colors ${
                  activeTab?.id === entry.id
                    ? 'bg-fw-base font-medium text-fw-heading'
                    : 'text-fw-bodyLight hover:bg-fw-washHover'
                }`}
              >
                {entry.entityName}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={ev => { ev.stopPropagation(); removeEntry(entry.id); }}
                  className="p-0.5 rounded opacity-40 group-hover:opacity-100 hover:bg-fw-errorLight hover:text-fw-error transition-all"
                  title="Remove"
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              </button>
            ))}
          </div>

          {/* Active tab body */}
          {activeTab && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-figma-xs text-fw-bodyLight">Conditions for </span>
                  <span className="text-figma-xs font-semibold text-fw-heading">{activeTab.entityName}</span>
                  <span className="ml-2 text-figma-xs font-mono text-fw-disabled">{activeTab.scope.raw}</span>
                </div>
                {activeTab !== entries[0] && (
                  <button
                    onClick={() => copyFromFirst(activeTab.id)}
                    className="flex items-center gap-1 text-figma-xs text-fw-cobalt-700 hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    Copy from {entries[0].entityName}
                  </button>
                )}
              </div>
              <ScopeDimensionsPanel
                scopeTier={activeTab.scope.tier}
                state={activeTab.conditions}
                onChange={c => updateConditions(activeTab.id, c)}
              />
            </div>
          )}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-figma-xs text-fw-bodyLight px-1">
          Select entities above — each gets its own conditions tab.
        </p>
      )}

      {entries.length > 0 && (
        <p className="text-figma-xs text-fw-bodyLight">
          Will create{' '}
          <span className="font-semibold text-fw-heading">{entries.length}</span>{' '}
          role assignment{entries.length !== 1 ? 's' : ''}.
        </p>
      )}
    </div>
  );
}

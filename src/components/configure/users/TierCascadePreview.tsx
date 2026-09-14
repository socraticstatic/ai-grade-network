// src/components/configure/users/TierCascadePreview.tsx
// Read-only expandable tier cascade preview.
// Shows accessible permission tiers for a scope ceiling, each expandable to full permission list.
// Used in CreateGroupDrawer and GroupDetailDrawer.

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ScopeTier } from '../../../types/rbac';
import { accessibleGroups } from '../../../data/tierPermissions';

function groupByObject(perms: string[]): Record<string, string[]> {
  const g: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!g[obj]) g[obj] = [];
    g[obj].push(action);
  }
  return g;
}

interface TierCascadePreviewProps {
  maxScopeTier: ScopeTier;
}

export function TierCascadePreview({ maxScopeTier }: TierCascadePreviewProps) {
  const groups = accessibleGroups(maxScopeTier);
  const [expanded, setExpanded] = useState<Set<ScopeTier>>(new Set());

  const toggle = (tier: ScopeTier) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  return (
    <div className="bg-fw-wash border border-fw-secondary rounded-lg p-3 space-y-1.5">
      <p className="text-figma-xs font-semibold text-fw-heading mb-2">
        At this ceiling, members can hold roles with access to:
      </p>
      {groups.map(g => {
        const isOpen = expanded.has(g.tier);
        const byObj = groupByObject(g.permissions);
        return (
          <div key={g.tier} className="rounded-lg border border-fw-secondary bg-fw-base overflow-hidden">
            <button
              onClick={() => toggle(g.tier)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-fw-wash transition-colors"
            >
              {isOpen
                ? <ChevronDown className="h-3 w-3 text-fw-bodyLight shrink-0" />
                : <ChevronRight className="h-3 w-3 text-fw-bodyLight shrink-0" />
              }
              <span className="text-figma-xs text-fw-success">✓</span>
              <span className="text-figma-xs font-semibold text-fw-heading">{g.label}</span>
              <span className="text-figma-xs text-fw-disabled ml-1">({g.permissions.length})</span>
              <span className="text-figma-xs text-fw-bodyLight ml-1.5 flex-1 truncate">
                — {g.description}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-fw-secondary space-y-1.5">
                {Object.entries(byObj).sort().map(([obj, actions]) => (
                  <div key={obj} className="flex items-start gap-3">
                    <span className="text-figma-xs font-semibold text-fw-bodyLight w-24 shrink-0 pt-0.5 capitalize">
                      {obj.replace(/-/g, ' ')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {actions.sort().map(action => (
                        <span key={action} className="px-1.5 py-0.5 text-figma-xs bg-fw-wash border border-fw-secondary rounded text-fw-body">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// src/components/configure/users/AssignRoleDrawer.tsx
import { useState } from 'react';
import { Shield, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { ScopePicker, PickableTier } from '../../common/ScopePicker';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import {
  RoleAssignment, ScopePath, Permission, ScopeTier,
  TENANT_SCOPE, CLIENT_SCOPE,
  CLIENT_POOL_SCOPE, CONNECTION_SCOPE, HUB_SCOPE,
} from '../../../types/rbac';
import { SOD_CONSTRAINTS } from '../../../data/roleCatalog';
import { SCOPE_CATALOG } from '../../../data/scopeCatalog';
import { bucketPermissions, TierPermissionGroup } from '../../../data/tierPermissions';
import { UserType } from '../types';
import { AccessGroup } from '../../../types/rbac';
import {
  ConditionsState,
  emptyConditions,
  buildConditions,
  countResourceFilters,
  countAccessConditions,
} from './ConditionsPanel';
import { MultiScopePanel, MultiScopeEntry } from './MultiScopePanel';
import { ScopeDimensionsPanel } from './ScopeDimensionsPanel';

interface AssignRoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserType;
  targetGroup?: AccessGroup;
}

// ── Scope tier helpers ─────────────────────────────────────────────────────────

const ALL_PICKABLE_TIERS: PickableTier[] = ['reseller', 'tenant', 'client', 'pool', 'connection', 'hub'];

const TIER_RANK: Record<string, number> = {
  platform: 0, reseller: 1, tenant: 2, client: 3, pool: 4, connection: 5, 'hub': 5,
};

function allowedTiersForMax(max: string): PickableTier[] {
  const maxRank = TIER_RANK[max] ?? 0;
  return ALL_PICKABLE_TIERS.filter(t => TIER_RANK[t] >= maxRank);
}

function defaultScope(): ScopePath {
  const cId = SCOPE_CATALOG.client[0]?.id ?? 'CLT-A';
  return CLIENT_SCOPE('TNT-001', cId);
}

const REVIEW_CYCLES = [
  { value: 'quarterly', label: 'Quarterly (90 days)' },
  { value: 'annual', label: 'Annual (365 days)' },
] as const;

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

// ── Permission bucket display ──────────────────────────────────────────────────

function PermissionBuckets({
  permissions,
  maxScopeTier,
}: {
  permissions: Permission[];
  maxScopeTier: ScopeTier;
}) {
  const [expanded, setExpanded] = useState(false);
  const buckets = bucketPermissions(permissions, maxScopeTier);
  const summary = buckets.map(b => `${b.granted.length} ${b.group.label.toLowerCase()}`).join(', ');

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-figma-xs text-fw-bodyLight hover:text-fw-body transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        Grants{' '}
        <span className="font-semibold text-fw-heading mx-0.5">{permissions.length}</span>{' '}
        permission{permissions.length !== 1 ? 's' : ''}
        {summary ? ` — ${summary}` : ''}
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 pl-4 border-l-2 border-fw-secondary">
          {buckets.map(({ group, granted }: { group: TierPermissionGroup; granted: Permission[] }) => (
            <div key={group.tier}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-figma-xs font-semibold text-fw-heading">{group.label}</span>
                <span className="text-figma-xs text-fw-bodyLight">
                  {granted.length} of {group.permissions.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {granted.map((p: Permission) => (
                  <span
                    key={p}
                    className="px-1.5 py-0.5 text-figma-xs bg-fw-wash border border-fw-secondary rounded font-mono text-fw-bodyLight"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main drawer ────────────────────────────────────────────────────────────────

type ScopeMode = 'single' | 'multi';

export function AssignRoleDrawer({ isOpen, onClose, targetUser, targetGroup }: AssignRoleDrawerProps) {
  // Derive principal — either a user or a group
  const principal = targetGroup
    ? { id: targetGroup.id, type: 'group' as const, displayName: targetGroup.name }
    : targetUser
    ? { id: targetUser.id, type: 'user' as const, displayName: targetUser.name }
    : null;
  const { addRoleAssignment, roleAssignments, roleDefinitions, currentUserId } = useStore(s => ({
    addRoleAssignment: s.addRoleAssignment,
    roleAssignments: s.roleAssignments,
    roleDefinitions: s.roleDefinitions,
    currentUserId: s.currentUserId,
  }));

  const [role, setRole] = useState('');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('single');
  const [scope, setScope] = useState<ScopePath>(defaultScope());
  const [multiEntries, setMultiEntries] = useState<MultiScopeEntry[]>([]);
  const [justification, setJustification] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());
  const [reviewCycle, setReviewCycle] = useState<'quarterly' | 'annual'>('quarterly');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sodWarning, setSodWarning] = useState<string | null>(null);
  const [conditions, setConditions] = useState<ConditionsState>(emptyConditions());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = countResourceFilters(conditions);
  const activeAccessCount = countAccessConditions(conditions);

  const checkSoD = (selectedRole: string) => {
    const existingRoles = roleAssignments
      .filter(a => a.principal.id === (principal?.id ?? '') && a.status === 'active')
      .map(a => a.role);

    for (const constraint of SOD_CONSTRAINTS) {
      const [roleA, roleB] = constraint.mutuallyExclusiveRoles;
      if (
        (selectedRole === roleA && existingRoles.includes(roleB)) ||
        (selectedRole === roleB && existingRoles.includes(roleA))
      ) {
        setSodWarning(
          `SoD conflict: "${constraint.name}" — ${roleA} and ${roleB} cannot be held simultaneously.`
        );
        return;
      }
    }
    setSodWarning(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!role) e.role = 'Select a role';
    if (!justification.trim()) e.justification = 'Justification is required';
    if (justification.trim().length < 20) e.justification = 'Provide at least 20 characters';
    if (!expiresAt) e.expiresAt = 'Expiry date is required';
    else if (new Date(expiresAt) <= new Date()) e.expiresAt = 'Expiry must be in the future';
    if (scopeMode === 'multi' && multiEntries.length === 0) {
      e.scope = 'Select at least one entity';
    }
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (sodWarning) return;

    const roleDef = roleDefinitions.find(r => r.id === role);
    const base = {
      principal: principal ?? { id: '', type: 'user' as const, displayName: '' },
      role,
      justification: justification.trim(),
      grantedBy: currentUserId,
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      reviewCycle,
      status: 'active' as const,
    };

    if (scopeMode === 'multi') {
      multiEntries.forEach((entry, idx) => {
        const builtConditions = buildConditions(entry.conditions);
        addRoleAssignment({
          ...base,
          id: `ra-${Date.now()}-${idx}`,
          scope: entry.scope,
          ...(builtConditions ? { conditions: builtConditions } : {}),
        });
      });
      window.addToast({
        type: 'success',
        title: `${multiEntries.length} Assignments Created`,
        message: `${roleDef?.displayName ?? role} → ${principal?.displayName ?? ''}`,
        duration: 3000,
      });
    } else {
      const builtConditions = buildConditions(conditions);
      addRoleAssignment({
        ...base,
        id: `ra-${Date.now()}`,
        scope,
        ...(builtConditions ? { conditions: builtConditions } : {}),
      });
      window.addToast({
        type: 'success',
        title: 'Role Assigned',
        message: `${roleDef?.displayName ?? role} assigned to ${principal?.displayName ?? ''}.`,
        duration: 3000,
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setRole('');
    setScopeMode('single');
    setScope(defaultScope());
    setMultiEntries([]);
    setJustification('');
    setExpiresAt(defaultExpiry());
    setReviewCycle('quarterly');
    setErrors({});
    setSodWarning(null);
    setConditions(emptyConditions());
    setFiltersOpen(false);
    onClose();
  };

  const selectedRoleDef = role ? roleDefinitions.find(r => r.id === role) : null;

  const scopeAllowedTiers = selectedRoleDef
    ? allowedTiersForMax(selectedRoleDef.maxScopeTier)
    : ALL_PICKABLE_TIERS;

  const bcRoles = roleDefinitions.filter(r => r.source === 'bc-template');
  const customRoles = roleDefinitions.filter(r => r.source === 'custom');

  const existingAssignments = roleAssignments.filter(
    a => a.principal.id === (principal?.id ?? '') && a.status === 'active'
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={`Assign Role — ${principal?.displayName ?? ''}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Shield} onClick={handleSave} disabled={!!sodWarning}>
            {scopeMode === 'multi' && multiEntries.length > 1
              ? `Assign ${multiEntries.length} Scopes`
              : 'Assign Role'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Least-privilege guidance */}
        <div className="bg-fw-accent border border-fw-active rounded-lg px-3 py-2.5">
          <p className="text-figma-xs text-fw-cobalt-700 font-medium">
            Least privilege: grant the minimum role, narrowest scope, and shortest duration that satisfies the need.
          </p>
        </div>

        {/* Existing assignments for context */}
        {existingAssignments.length > 0 && (
          <div className="bg-fw-wash border border-fw-secondary rounded-lg px-3 py-2.5">
            <p className="text-figma-xs font-semibold text-fw-heading mb-1.5">Already holds:</p>
            <div className="space-y-1">
              {existingAssignments.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-figma-xs bg-fw-base border border-fw-secondary text-fw-heading rounded">
                    {roleDefinitions.find(r => r.id === a.role)?.displayName ?? a.role}
                  </span>
                  <span className="text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role picker */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Role <span className="text-fw-error">*</span>
          </label>
          <select
            value={role}
            onChange={e => {
              const newRole = e.target.value;
              setRole(newRole);
              checkSoD(newRole);
              const def = roleDefinitions.find(r => r.id === newRole);
              if (def) {
                const tiers = allowedTiersForMax(def.maxScopeTier);
                if (tiers.length > 0 && !tiers.includes(scope.tier as PickableTier)) {
                  const cId = SCOPE_CATALOG.client[0]?.id ?? 'CLT-A';
                  setScope(CLIENT_SCOPE('TNT-001', cId));
                }
                // Also clear multi entries that exceed the new role's max tier
                setMultiEntries(prev =>
                  prev.filter(entry => tiers.includes(entry.scope.tier as PickableTier))
                );
              }
            }}
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${
              errors.role ? 'border-fw-error' : 'border-fw-secondary'
            }`}
          >
            <option value="">Select a role…</option>
            {bcRoles.length > 0 && (
              <optgroup label="Business Center Templates">
                {bcRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.displayName}</option>
                ))}
              </optgroup>
            )}
            {customRoles.length > 0 && (
              <optgroup label="Custom Roles">
                {customRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.displayName}</option>
                ))}
              </optgroup>
            )}
          </select>
          {errors.role && <p className="mt-1 text-figma-xs text-fw-error">{errors.role}</p>}

          {selectedRoleDef && (
            <div className="mt-2 space-y-2">
              <div className="flex items-start gap-2">
                <p className="text-figma-xs text-fw-bodyLight flex-1">{selectedRoleDef.description}</p>
                <span className="shrink-0 text-figma-xs text-fw-bodyLight border border-fw-secondary rounded px-1.5 py-0.5">
                  max: {selectedRoleDef.maxScopeTier}
                </span>
              </div>
              <PermissionBuckets
                permissions={selectedRoleDef.permissions}
                maxScopeTier={selectedRoleDef.maxScopeTier as ScopeTier}
              />
            </div>
          )}
        </div>

        {/* SoD warning */}
        {sodWarning && (
          <div className="flex items-start gap-2 bg-fw-errorLight border border-fw-error rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-fw-error mt-0.5 shrink-0" />
            <p className="text-figma-sm text-fw-error">{sodWarning}</p>
          </div>
        )}

        {/* Scope section with single / multi toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-figma-sm font-medium text-fw-heading">
              Where does this role apply?
            </label>
            <div className="flex p-0.5 bg-fw-wash border border-fw-secondary rounded-lg">
              {(['single', 'multi'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScopeMode(mode)}
                  className={`px-2.5 py-0.5 text-figma-xs rounded capitalize transition-colors ${
                    scopeMode === mode
                      ? 'bg-fw-base shadow-sm font-medium text-fw-heading'
                      : 'text-fw-bodyLight hover:text-fw-body'
                  }`}
                >
                  {mode === 'single' ? 'Single' : 'Multi'}
                </button>
              ))}
            </div>
          </div>

          {scopeMode === 'single' ? (
            <ScopePicker
              key={role}
              value={scope}
              onChange={setScope}
              allowedTiers={scopeAllowedTiers}
              helpText={
                selectedRoleDef
                  ? `Max tier for ${selectedRoleDef.displayName}: ${selectedRoleDef.maxScopeTier}`
                  : undefined
              }
            />
          ) : (
            <MultiScopePanel
              entries={multiEntries}
              onChange={setMultiEntries}
              allowedTiers={scopeAllowedTiers}
            />
          )}
          {errors.scope && <p className="mt-1 text-figma-xs text-fw-error">{errors.scope}</p>}
        </div>

        {/* Scope dimensions — unified WHEN/HOW/WHICH panel, single mode only */}
        {scopeMode === 'single' && (
          <div className="border border-fw-secondary rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-fw-wash hover:bg-fw-washHover transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-figma-sm font-medium text-fw-heading">Additional Constraints</span>
                {(activeFilterCount + activeAccessCount) > 0 ? (
                  <span className="text-figma-xs font-medium bg-fw-base border border-fw-secondary text-fw-body rounded-full px-2 py-0.5">
                    {activeFilterCount + activeAccessCount} active
                  </span>
                ) : (
                  <span className="text-figma-xs text-fw-bodyLight">optional — WHEN, HOW, WHICH constraints</span>
                )}
              </div>
              {filtersOpen
                ? <ChevronDown className="h-4 w-4 text-fw-bodyLight" />
                : <ChevronRight className="h-4 w-4 text-fw-bodyLight" />
              }
            </button>
            {filtersOpen && (
              <div className="px-4 py-4">
                <ScopeDimensionsPanel
                  scopeTier={scope.tier ?? 'tenant'}
                  state={conditions}
                  onChange={setConditions}
                />
              </div>
            )}
          </div>
        )}

        {/* Justification */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Justification <span className="text-fw-error">*</span>
          </label>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            rows={3}
            placeholder="Why does this user need this role? Reference ticket or business need."
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${
              errors.justification ? 'border-fw-error' : 'border-fw-secondary'
            }`}
          />
          {errors.justification && (
            <p className="mt-1 text-figma-xs text-fw-error">{errors.justification}</p>
          )}
          <p className="mt-1 text-figma-xs text-fw-bodyLight">
            {justification.trim().length} / 20 chars minimum
          </p>
        </div>

        {/* Expiry + review cycle */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Expires On <span className="text-fw-error">*</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${
                errors.expiresAt ? 'border-fw-error' : 'border-fw-secondary'
              }`}
            />
            {errors.expiresAt && (
              <p className="mt-1 text-figma-xs text-fw-error">{errors.expiresAt}</p>
            )}
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Review Cycle</label>
            <select
              value={reviewCycle}
              onChange={e => setReviewCycle(e.target.value as 'quarterly' | 'annual')}
              className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active"
            >
              {REVIEW_CYCLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

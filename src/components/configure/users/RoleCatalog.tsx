// src/components/configure/users/RoleCatalog.tsx
import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { TerminologyTooltip } from '../../common/TerminologyTooltip';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { OverflowMenu } from '../../common/OverflowMenu';
import { useStore } from '../../../store/useStore';
import { RoleDefinition, Permission, ScopeTier } from '../../../types/rbac';
import { ALL_PERMISSIONS, SOD_CONSTRAINTS } from '../../../data/roleCatalog';
import { permissionResolver } from '../../../utils/permissionResolver';
import { TENANT_SCOPE } from '../../../types/rbac';
import { accessibleGroups, TierPermissionGroup } from '../../../data/tierPermissions';

const SCOPE_TIER_ORDER: ScopeTier[] = ['platform', 'reseller', 'tenant', 'client', 'pool', 'connection', 'hub'];

function groupByObject(perms: Permission[]): Record<string, string[]> {
  const g: Record<string, string[]> = {};
  for (const p of perms) {
    const [obj, action] = p.split(':');
    if (!g[obj]) g[obj] = [];
    g[obj].push(action);
  }
  return g;
}

// ── Read-only permissions display ─────────────────────────────────────────────
function PermissionsMatrix({ permissions }: { permissions: Permission[] }) {
  const grouped = groupByObject(permissions);
  const objects = Object.keys(grouped).sort();
  return (
    <div className="space-y-0">
      {objects.map(obj => (
        <div key={obj} className="flex items-start gap-4 py-2 border-b border-fw-secondary last:border-0">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <span className="text-figma-xs font-semibold text-fw-heading capitalize">
              {obj.replace(/-/g, ' ')}
            </span>
            <span className="text-[9px] text-fw-disabled font-medium px-1 py-0.5 bg-fw-wash border border-fw-secondary rounded">
              {grouped[obj].length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {grouped[obj].sort().map(action => (
              <span
                key={action}
                className="px-2 py-0.5 text-figma-xs text-fw-body bg-fw-wash border border-fw-secondary rounded"
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Editable permissions picker ───────────────────────────────────────────────
export function PermissionsMatrixEditor({
  available,
  selected,
  onToggle,
  disabled,
}: {
  available: Permission[];
  selected: Set<Permission>;
  onToggle: (p: Permission) => void;
  disabled?: boolean;
}) {
  const grouped = groupByObject(available);
  const objects = Object.keys(grouped).sort();
  return (
    <div className="space-y-0">
      {objects.map(obj => (
        <div key={obj} className="flex items-start gap-4 py-2.5 border-b border-fw-secondary last:border-0">
          <span className="text-figma-xs font-semibold text-fw-heading w-28 shrink-0 pt-0.5 capitalize">
            {obj.replace(/-/g, ' ')}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {grouped[obj].sort().map(action => {
              const perm = `${obj}:${action}` as Permission;
              const checked = selected.has(perm);
              return (
                <label key={action} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(perm)}
                    disabled={disabled}
                    className="rounded border-fw-secondary text-fw-active focus:ring-fw-active cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`text-figma-xs ${checked ? 'font-medium text-fw-heading' : 'text-fw-bodyLight'}`}>
                    {action}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tiered permissions editor ─────────────────────────────────────────────────
// Replaces flat PermissionsMatrixEditor in RoleDrawer.
// Shows permissions in tabs by tier — only accessible tiers appear.
// Each tab label shows count of selected permissions.

interface TieredPermissionsEditorProps {
  maxScopeTier: ScopeTier;
  callerPermissions: Permission[];
  isBCTemplate: boolean;
  selected: Set<Permission>;
  onChange: (next: Set<Permission>) => void;
}

function TieredPermissionsEditor({
  maxScopeTier, callerPermissions, isBCTemplate, selected, onChange,
}: TieredPermissionsEditorProps) {
  const groups = accessibleGroups(maxScopeTier);
  const firstWithSelections = groups.find(g => g.permissions.some(p => selected.has(p)));
  const [activeTab, setActiveTab] = useState<ScopeTier>(firstWithSelections?.tier ?? groups[0]?.tier ?? 'client');

  // Ensure activeTab is always valid when tier changes
  useEffect(() => {
    const validTiers = new Set(groups.map(g => g.tier));
    if (!validTiers.has(activeTab)) {
      setActiveTab(groups[0]?.tier ?? 'client');
    }
  }, [maxScopeTier]);

  const toggle = (p: Permission) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p); else next.add(p);
    onChange(next);
  };

  const selectAll = (group: TierPermissionGroup) => {
    const next = new Set(selected);
    group.permissions.forEach(p => {
      if (isBCTemplate || callerPermissions.includes(p)) next.add(p);
    });
    onChange(next);
  };

  const clearAll = (group: TierPermissionGroup) => {
    const next = new Set(selected);
    group.permissions.forEach(p => next.delete(p));
    onChange(next);
  };

  const activeGroup = groups.find(g => g.tier === activeTab);

  const TIER_SCOPE_HINT: Record<string, string> = {
    platform:  'Applies once at platform scope',
    reseller:  'Assign per reseller — multi-select supported',
    tenant:    'Assign per tenant — multi-select supported',
    client:    'Assign per client — multi-select supported',
  };

  return (
    <div>
      {/* Tab bar — segment control */}
      <div className="flex gap-1 p-1 bg-fw-wash border border-fw-secondary rounded-lg mb-3">
        {groups.map(g => {
          const count = g.permissions.filter(p => selected.has(p)).length;
          const isActive = g.tier === activeTab;
          return (
            <button
              key={g.tier}
              onClick={() => setActiveTab(g.tier)}
              className={`flex-1 px-3 py-1.5 text-figma-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white shadow-sm text-fw-heading border border-fw-secondary'
                  : 'text-fw-bodyLight hover:text-fw-heading'
              }`}
            >
              {g.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                  isActive ? 'bg-fw-active text-white' : 'bg-fw-secondary text-fw-body'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      {activeGroup && (
        <div className="pt-3">
          {/* Scope hint + select/clear controls */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-figma-xs text-fw-bodyLight italic">
              {TIER_SCOPE_HINT[activeGroup.tier] ?? ''}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => selectAll(activeGroup)}
                className="text-figma-xs text-fw-cobalt-700 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => clearAll(activeGroup)}
                className="text-figma-xs text-fw-bodyLight hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <PermissionsMatrixEditor
            available={activeGroup.permissions.filter(p =>
              isBCTemplate || callerPermissions.includes(p)
            )}
            selected={selected}
            onToggle={toggle}
          />
        </div>
      )}
    </div>
  );
}

// ── Edit / Create Role Drawer ────────────────────────────────────────────────

interface RoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: RoleDefinition;  // undefined = create new
  onSave: (def: Partial<RoleDefinition>) => void;
  callerPermissions: Permission[];  // permissions the current user holds — can't grant beyond these
}

function RoleDrawer({ isOpen, onClose, initial, onSave, callerPermissions }: RoleDrawerProps) {
  const isEdit = !!initial?.id;
  const isBCTemplate = initial?.source === 'bc-template';

  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [maxScopeTier, setMaxScopeTier] = useState<ScopeTier>(initial?.maxScopeTier ?? 'tenant');
  const [selectedPerms, setSelectedPerms] = useState<Set<Permission>>(
    new Set(initial?.permissions ?? [])
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removedWarning, setRemovedWarning] = useState<string | null>(null);

  // Auto-deselect permissions outside the new tier when maxScopeTier changes
  useEffect(() => {
    const groups = accessibleGroups(maxScopeTier);
    const accessible = new Set(groups.flatMap(g => g.permissions));
    const removed = [...selectedPerms].filter(p => !accessible.has(p));
    if (removed.length > 0) {
      setSelectedPerms(prev => {
        const next = new Set(prev);
        removed.forEach(p => next.delete(p));
        return next;
      });
      setRemovedWarning(
        `${removed.length} permission${removed.length !== 1 ? 's' : ''} removed — not available at ${maxScopeTier} tier`
      );
    } else {
      setRemovedWarning(null);
    }
  }, [maxScopeTier]);

  const togglePerm = (p: Permission) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = 'Name is required';
    if (!description.trim()) e.description = 'Description is required';
    if (selectedPerms.size === 0) e.perms = 'Select at least one permission';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      displayName: displayName.trim(),
      description: description.trim(),
      maxScopeTier,
      permissions: Array.from(selectedPerms),
    });
    handleClose();
  };

  const handleClose = () => {
    setDisplayName(initial?.displayName ?? '');
    setDescription(initial?.description ?? '');
    setMaxScopeTier(initial?.maxScopeTier ?? 'tenant');
    setSelectedPerms(new Set(initial?.permissions ?? []));
    setErrors({});
    onClose();
  };

  const title = isEdit
    ? (isBCTemplate ? `Edit Permissions — ${initial.displayName}` : `Edit Role — ${initial.displayName}`)
    : 'Create Custom Role';

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            {isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {isBCTemplate && (
          <div className="bg-fw-wash border border-fw-secondary rounded-lg p-3">
            <p className="text-figma-xs text-fw-bodyLight">
              BC template — you are editing the AT&T / NetBond default permission mapping for this role.
              These permissions apply to all assignments that use <strong className="text-fw-heading">{initial?.displayName}</strong> unless overridden by a custom role.
            </p>
          </div>
        )}

        {/* Name — only on custom roles */}
        {!isBCTemplate && (
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Role Name <span className="text-fw-error">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Network Engineer — US East Azure"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.displayName ? 'border-fw-error' : 'border-fw-secondary'}`}
            />
            {errors.displayName && <p className="mt-1 text-figma-xs text-fw-error">{errors.displayName}</p>}
          </div>
        )}

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Description <span className="text-fw-error">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.description ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.description && <p className="mt-1 text-figma-xs text-fw-error">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Max Scope Tier</label>
          <select
            value={maxScopeTier}
            onChange={e => setMaxScopeTier(e.target.value as ScopeTier)}
            className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active"
          >
            {SCOPE_TIER_ORDER.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-figma-sm font-medium text-fw-heading">
              Permissions <span className="text-fw-error">*</span>
              {selectedPerms.size > 0 && (
                <span className="ml-2 text-fw-bodyLight font-normal">({selectedPerms.size} selected)</span>
              )}
            </label>
            {!isBCTemplate && (
              <span className="text-figma-xs text-fw-bodyLight">
                Only permissions you hold are grantable
              </span>
            )}
          </div>

          {/* Removed permissions warning */}
          {removedWarning && (
            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg">
              <p className="text-figma-xs text-amber-700">{removedWarning}</p>
              <button
                onClick={() => setRemovedWarning(null)}
                className="text-figma-xs text-amber-700 hover:underline ml-3 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <TieredPermissionsEditor
            maxScopeTier={maxScopeTier}
            callerPermissions={callerPermissions}
            isBCTemplate={isBCTemplate}
            selected={selectedPerms}
            onChange={setSelectedPerms}
          />
          {errors.perms && <p className="mt-1 text-figma-xs text-fw-error">{errors.perms}</p>}
        </div>
      </div>
    </SideDrawer>
  );
}

// ── Main RoleCatalog component ────────────────────────────────────────────────

export function RoleCatalog() {
  const { roleDefinitions, currentUserId, updateRoleDefinition, addCustomRole, deleteCustomRole } =
    useStore(s => ({
      roleDefinitions: s.roleDefinitions,
      currentUserId: s.currentUserId,
      updateRoleDefinition: s.updateRoleDefinition,
      addCustomRole: s.addCustomRole,
      deleteCustomRole: s.deleteCustomRole,
    }));

  const bcTemplates = useMemo(() => roleDefinitions.filter(r => r.source === 'bc-template'), [roleDefinitions]);
  const customRoles = useMemo(() => roleDefinitions.filter(r => r.source === 'custom'), [roleDefinitions]);

  const [selectedId, setSelectedId] = useState<string>(bcTemplates[0]?.id ?? '');
  const [editTarget, setEditTarget] = useState<RoleDefinition | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [cloneSource, setCloneSource] = useState<RoleDefinition | null>(null);

  const selected = roleDefinitions.find(r => r.id === selectedId);

  // Current user's effective permissions (for grantability check)
  const callerPerms = permissionResolver.getEffectivePermissions(
    currentUserId,
    TENANT_SCOPE('TNT-001'),
    {}
  );

  const canEditBC = callerPerms.includes('role:write');
  const canManageCustom = callerPerms.includes('role:write') || callerPerms.includes('role:delete');

  const handleSaveEdit = (updates: Partial<RoleDefinition>) => {
    if (!editTarget) return;
    updateRoleDefinition(editTarget.id, updates);
    setEditTarget(null);
  };

  const handleCreate = (updates: Partial<RoleDefinition>) => {
    const source = cloneSource ?? null;
    addCustomRole({
      id: `custom-${Date.now()}`,
      displayName: updates.displayName ?? 'Custom Role',
      description: updates.description ?? '',
      permissions: updates.permissions ?? source?.permissions ?? [],
      maxScopeTier: updates.maxScopeTier ?? source?.maxScopeTier ?? 'tenant',
      source: 'custom',
      derivedFrom: source?.id,
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
    });
    setCloneSource(null);
    setShowCreate(false);
  };

  const handleClone = (role: RoleDefinition) => {
    setCloneSource(role);
    setShowCreate(true);
  };

  const relevantSoD = selected
    ? SOD_CONSTRAINTS.filter(c => c.mutuallyExclusiveRoles.includes(selected.id))
    : [];

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-4 overflow-auto">
        {/* BC Templates */}
        <div>
          <div className="flex items-center gap-1 mb-2 px-2">
            <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
              Business Center Templates
            </p>
            <TerminologyTooltip termId="bc-template" placement="right" variant="minimal" showIcon={false} />
          </div>
          <div className="space-y-0.5">
            {bcTemplates.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-figma-sm transition-colors ${
                  selectedId === r.id
                    ? 'bg-fw-accent text-fw-cobalt-700 font-semibold'
                    : 'text-fw-body hover:bg-fw-wash'
                }`}
              >
                {r.displayName}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Roles */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wide">
              Custom Roles
            </p>
            {canManageCustom && (
              <button
                onClick={() => { setCloneSource(null); setShowCreate(true); }}
                className="text-fw-link hover:text-fw-active"
                title="Create custom role"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {customRoles.length === 0 ? (
            <p className="text-figma-xs text-fw-disabled px-2">No custom roles yet.</p>
          ) : (
            <div className="space-y-0.5">
              {customRoles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-figma-sm transition-colors ${
                    selectedId === r.id
                      ? 'bg-fw-accent text-fw-cobalt-700 font-semibold'
                      : 'text-fw-body hover:bg-fw-wash'
                  }`}
                >
                  <div>{r.displayName}</div>
                  {r.derivedFrom && (
                    <div className="text-figma-xs text-fw-disabled">from {r.derivedFrom}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 min-w-0 space-y-5 overflow-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-figma-lg font-semibold text-fw-heading">{selected.displayName}</h2>
                <TerminologyTooltip termId="max-scope-tier" placement="bottom">
                  <span className="px-2 py-0.5 text-figma-xs font-medium border border-fw-secondary bg-fw-neutral text-fw-body rounded-md capitalize cursor-help">
                    Max: {selected.maxScopeTier}
                  </span>
                </TerminologyTooltip>
                {selected.source === 'custom' && (
                  <span className="px-2 py-0.5 text-figma-xs font-medium border border-fw-secondary bg-fw-neutral text-fw-bodyLight rounded-md">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-figma-sm text-fw-bodyLight mt-1">{selected.description}</p>
              {selected.derivedFrom && (
                <p className="text-figma-xs text-fw-disabled mt-0.5">
                  Derived from: {selected.derivedFrom}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selected.source === 'bc-template' && canEditBC && (
                <>
                  <Button variant="outline" icon={Pencil} onClick={() => setEditTarget(selected)}>
                    Edit Permissions
                  </Button>
                  <Button variant="outline" icon={Copy} onClick={() => handleClone(selected)}>
                    Clone
                  </Button>
                </>
              )}
              {selected.source === 'custom' && canManageCustom && (
                <OverflowMenu
                  items={[
                    {
                      id: 'edit',
                      label: 'Edit',
                      icon: <Pencil className="h-4 w-4" />,
                      onClick: () => setEditTarget(selected),
                    },
                    {
                      id: 'clone',
                      label: 'Clone',
                      icon: <Copy className="h-4 w-4" />,
                      onClick: () => handleClone(selected),
                    },
                    {
                      id: 'delete',
                      label: 'Delete',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => deleteCustomRole(selected.id),
                      variant: 'destructive' as const,
                    },
                  ]}
                />
              )}
            </div>
          </div>

          {/* Permissions matrix */}
          <div>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-3">
              Permissions ({selected.permissions.length})
            </h3>
            <PermissionsMatrix permissions={selected.permissions} />
          </div>

          {/* SoD constraints */}
          {relevantSoD.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <h3 className="text-figma-sm font-semibold text-fw-heading">SoD Constraints</h3>
                <TerminologyTooltip termId="sod-constraint" placement="top" variant="minimal" showIcon={false} />
              </div>
              <div className="space-y-2">
                {relevantSoD.map(c => {
                  const other = c.mutuallyExclusiveRoles.find(r => r !== selected.id)!;
                  const otherDef = roleDefinitions.find(r => r.id === other);
                  return (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-fw-wash border-l-2 border-fw-error rounded-r-lg">
                      <p className="text-figma-xs text-fw-body">
                        Cannot be held with{' '}
                        <strong className="text-fw-heading">{otherDef?.displayName ?? other}</strong>
                        <span className="text-fw-bodyLight"> — {c.name} ({c.scopeContext})</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit drawer */}
      {editTarget && (
        <RoleDrawer
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={handleSaveEdit}
          callerPermissions={callerPerms}
        />
      )}

      {/* Create / clone drawer — key forces remount when clone source changes so useState reinitializes */}
      <RoleDrawer
        key={cloneSource?.id ?? 'create-blank'}
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCloneSource(null); }}
        initial={cloneSource ? { ...cloneSource, id: '', displayName: `${cloneSource.displayName} (copy)`, source: 'custom' } : undefined}
        onSave={handleCreate}
        callerPermissions={callerPerms}
      />
    </div>
  );
}

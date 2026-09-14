// src/components/configure/users/GroupDetailDrawer.tsx
import { useState } from 'react';
import { Trash2, Pencil, AlertTriangle, UserPlus, Shield } from 'lucide-react';
import { ScopePicker } from '../../common/ScopePicker';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { AccessGroup, AccessGroupMember, AccessGroupPurpose, OwnerlessPolicy, ScopePath, ScopeTier, TENANT_SCOPE } from '../../../types/rbac';
import { ROLE_CATALOG } from '../../../data/roleCatalog';
import { TierCascadePreview } from './TierCascadePreview';
import { detectCeilingConflicts } from '../../../utils/groupEdit';
import { AssignRoleDrawer } from './AssignRoleDrawer';

interface GroupDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: AccessGroup;
  initialEditing?: boolean;
  canEdit?: boolean;
}

const PURPOSE_OPTIONS: { value: AccessGroupPurpose; label: string; description: string }[] = [
  { value: 'organizational',    label: 'Organizational',    description: 'Maps to org structure.' },
  { value: 'resource-cluster',  label: 'Resource Cluster',  description: 'Groups users by resources they manage.' },
  { value: 'project',           label: 'Project',           description: 'Temporary group for a project.' },
  { value: 'audit-engagement',  label: 'Audit Engagement',  description: 'External auditors. Closes when engagement ends.' },
];

const OWNERLESS_POLICIES: { value: OwnerlessPolicy; label: string }[] = [
  { value: 'suspend',               label: 'Suspend group if owner leaves' },
  { value: 'inherit-tenant-admin',  label: 'Transfer to Tenant Admin' },
  { value: 'freeze',                label: 'Freeze (read-only)' },
];

function ceilingTier(group: AccessGroup): ScopeTier {
  return group.scopeCeiling.path?.tier ?? 'tenant';
}

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function GroupDetailDrawer({ isOpen, onClose, group, initialEditing = false, canEdit = true }: GroupDetailDrawerProps) {
  const { updateAccessGroup, removeAccessGroupMember, addAccessGroupMember, addRoleAssignment, roleAssignments, users, currentUserId } = useStore(s => ({
    updateAccessGroup: s.updateAccessGroup,
    removeAccessGroupMember: s.removeAccessGroupMember,
    addAccessGroupMember: s.addAccessGroupMember,
    addRoleAssignment: s.addRoleAssignment,
    roleAssignments: s.roleAssignments,
    users: s.users,
    currentUserId: s.currentUserId,
  }));

  const [editing, setEditing] = useState(initialEditing);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAssignRole, setShowAssignRole] = useState(false);

  // Edit state — initialised from group when entering edit mode
  const [name, setName]               = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [purpose, setPurpose]         = useState<AccessGroupPurpose>(group.purpose);
  const [owner, setOwner]             = useState(group.owner);
  const [reviewCycle, setReviewCycle] = useState<'quarterly' | 'annual'>(group.reviewCycle);
  const [ownerlessPolicy, setOwnerlessPolicy] = useState<OwnerlessPolicy>(group.ownerlessPolicy);
  const [scopeCeiling, setScopeCeiling] = useState<ScopePath>(group.scopeCeiling.path ?? TENANT_SCOPE('TNT-001'));
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [ceilingWarning, setCeilingWarning] = useState<string | null>(null);

  // Users not already in the group — candidates to add
  const existingMemberIds = new Set(group.members.map(m => m.userId));
  const candidateUsers = users.filter(u =>
    !existingMemberIds.has(u.id) &&
    (memberSearch === '' ||
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const handleAddMember = (userId: string, displayName: string) => {
    const member: AccessGroupMember = {
      userId,
      displayName,
      membershipScope: null,
      justification: `Added to ${group.name}`,
      addedBy: currentUserId,
      addedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    };
    addAccessGroupMember(group.id, member);
    window.addToast({ type: 'success', title: 'Member Added', message: displayName, duration: 2000 });
  };

  const groupAssignments = roleAssignments.filter(
    a => a.principal.id === group.id && a.status === 'active'
  );
  const tier = ceilingTier(group);

  const enterEdit = () => {
    setName(group.name);
    setDescription(group.description);
    setPurpose(group.purpose);
    setOwner(group.owner);
    setReviewCycle(group.reviewCycle);
    setOwnerlessPolicy(group.ownerlessPolicy);
    setScopeCeiling(group.scopeCeiling.path ?? TENANT_SCOPE('TNT-001'));
    setErrors({});
    setCeilingWarning(null);
    setEditing(true);
  };

  const handleCeilingChange = (newPath: ScopePath) => {
    setScopeCeiling(newPath);
    // Warn if tightening would invalidate existing assignments
    const conflicts = detectCeilingConflicts(newPath, groupAssignments);
    if (conflicts.length > 0) {
      setCeilingWarning(
        `${conflicts.length} role assignment${conflicts.length !== 1 ? 's' : ''} exceed this ceiling and will be marked exceeds-ceiling on save.`
      );
    } else {
      setCeilingWarning(null);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!owner.trim()) e.owner = 'Owner is required';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    updateAccessGroup(group.id, {
      name: name.trim(),
      description: description.trim(),
      purpose,
      owner: owner.trim(),
      reviewCycle,
      ownerlessPolicy,
      scopeCeiling: { path: scopeCeiling },
    });

    window.addToast({ type: 'success', title: 'Group Updated', message: name.trim(), duration: 3000 });
    setEditing(false);
    setCeilingWarning(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setErrors({});
    setCeilingWarning(null);
  };

  const inputClass = (err?: string) =>
    `w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${err ? 'border-fw-error' : 'border-fw-secondary'}`;

  return (
    <>
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? `Edit: ${group.name}` : group.name}
      size="lg"
      footer={
        editing ? (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
          </div>
        ) : (
          <div className="flex justify-between">
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" icon={Pencil} onClick={enterEdit}>Edit</Button>
              )}
              <Button variant="outline" icon={Shield} onClick={() => setShowAssignRole(true)}>Assign Role</Button>
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      {editing ? (
        /* ── Edit mode ─────────────────────────────────────────────────────── */
        <div className="space-y-5">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Name <span className="text-fw-error">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className={inputClass(errors.name)} />
            {errors.name && <p className="mt-1 text-figma-xs text-fw-error">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Description <span className="text-fw-error">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.description ? 'border-fw-error' : 'border-fw-secondary'}`} />
            {errors.description && <p className="mt-1 text-figma-xs text-fw-error">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Owner <span className="text-fw-error">*</span></label>
            <input type="text" value={owner} onChange={e => setOwner(e.target.value)}
              className={inputClass(errors.owner)} />
            {errors.owner && <p className="mt-1 text-figma-xs text-fw-error">{errors.owner}</p>}
          </div>

          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-2">Purpose</label>
            <div className="space-y-2">
              {PURPOSE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${purpose === opt.value ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary hover:border-fw-active'}`}>
                  <input type="radio" name="edit-purpose" value={opt.value} checked={purpose === opt.value}
                    onChange={() => setPurpose(opt.value)} className="mt-0.5" />
                  <div>
                    <div className="text-figma-sm font-medium text-fw-heading">{opt.label}</div>
                    <div className="text-figma-xs text-fw-bodyLight">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <ScopePicker
            label="Scope Ceiling"
            value={scopeCeiling}
            onChange={handleCeilingChange}
            allowedTiers={['reseller', 'tenant', 'client', 'pool', 'connection', 'hub']}
            helpText="Members cannot be granted access beyond this scope via this group."
          />

          {ceilingWarning && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-fw-warnLight border border-fw-warn rounded-lg">
              <AlertTriangle className="h-4 w-4 text-fw-warn mt-0.5 shrink-0" />
              <p className="text-figma-xs text-fw-warn">{ceilingWarning}</p>
            </div>
          )}

          {scopeCeiling.tier && (
            <TierCascadePreview maxScopeTier={scopeCeiling.tier as ScopeTier} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Review Cycle</label>
              <select value={reviewCycle} onChange={e => setReviewCycle(e.target.value as 'quarterly' | 'annual')}
                className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active">
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">If Owner Leaves</label>
              <select value={ownerlessPolicy} onChange={e => setOwnerlessPolicy(e.target.value as OwnerlessPolicy)}
                className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active">
                {OWNERLESS_POLICIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        /* ── Read mode ──────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Meta */}
          <div className="bg-fw-wash border border-fw-secondary rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-figma-sm">
              <span className="text-fw-bodyLight">Purpose</span>
              <span className="font-medium text-fw-heading capitalize">{group.purpose.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between text-figma-sm">
              <span className="text-fw-bodyLight">Owner</span>
              <span className="font-medium text-fw-heading">{group.owner}</span>
            </div>
            <div className="flex justify-between text-figma-sm">
              <span className="text-fw-bodyLight">Scope Ceiling</span>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded border ${
                  tier === 'tenant'
                    ? 'bg-fw-warnLight text-fw-warn border-fw-warn'
                    : tier === 'client'
                    ? 'bg-fw-successLight text-fw-success border-fw-success'
                    : 'bg-fw-neutral text-fw-disabled border-fw-secondary'
                }`}>
                  {tier}
                </span>
                <span className="font-mono text-figma-xs text-fw-body">
                  {group.scopeCeiling.path?.raw ?? "Uses creator's scope"}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-figma-sm">
              <span className="text-fw-bodyLight">Review Cycle</span>
              <span className="font-medium text-fw-heading capitalize">{group.reviewCycle}</span>
            </div>
            <div className="flex justify-between text-figma-sm">
              <span className="text-fw-bodyLight">Status</span>
              <span className={`font-medium ${group.status === 'active' ? 'text-fw-success' : 'text-fw-warn'}`}>
                {group.status}
              </span>
            </div>
          </div>

          {/* Permission cascade */}
          <div>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">Permission Scope</h3>
            <p className="text-figma-xs text-fw-bodyLight mb-3">
              Members can be granted roles with access to these permission tiers.
            </p>
            <TierCascadePreview maxScopeTier={tier} />
          </div>

          {/* Audit engagement metadata */}
          {group.engagementMetadata && (
            <div className="bg-fw-neutral border border-fw-secondary rounded-lg p-4 space-y-1">
              <p className="text-figma-xs font-semibold text-fw-heading uppercase tracking-wide">Audit Engagement</p>
              <p className="text-figma-sm text-fw-body">{group.engagementMetadata.subject}</p>
              <p className="text-figma-xs text-fw-bodyLight">Audited by {group.engagementMetadata.auditingBody}</p>
              {group.engagementMetadata.closedAt && (
                <p className="text-figma-xs text-fw-disabled">
                  Closed {new Date(group.engagementMetadata.closedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Group role assignments */}
          <div>
            <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">
              Group Role Assignments ({groupAssignments.length})
            </h3>
            {groupAssignments.length === 0 ? (
              <p className="text-figma-sm text-fw-bodyLight">No roles assigned. Use Assignments tab to add.</p>
            ) : (
              <div className="space-y-2">
                {groupAssignments.map(a => {
                  const scopeTier = a.scope.tier;
                  const badgeClass = scopeTier === 'tenant'
                    ? 'bg-fw-warnLight text-fw-warn border-fw-warn'
                    : scopeTier === 'client'
                    ? 'bg-fw-successLight text-fw-success border-fw-success'
                    : 'bg-fw-neutral text-fw-disabled border-fw-secondary';
                  return (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-fw-wash border border-fw-secondary rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded border ${badgeClass}`}>
                          {scopeTier}
                        </span>
                        <span className="text-figma-sm font-medium text-fw-heading">
                          {ROLE_CATALOG[a.role]?.displayName ?? a.role}
                        </span>
                        <span className="text-figma-xs text-fw-bodyLight font-mono">{a.scope.raw}</span>
                      </div>
                      <span className="text-figma-xs text-fw-bodyLight">
                        exp. {new Date(a.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-figma-sm font-semibold text-fw-heading">
                Members ({group.members.length})
              </h3>
              <button
                onClick={() => { setShowMemberPicker(p => !p); setMemberSearch(''); }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-figma-xs font-medium text-fw-cobalt-700 bg-fw-accent border border-fw-active rounded-lg hover:bg-fw-blue-light transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Member
              </button>
            </div>

            {/* Inline member picker */}
            {showMemberPicker && (
              <div className="mb-3 border border-fw-secondary rounded-lg overflow-hidden">
                <div className="p-2 bg-fw-wash border-b border-fw-secondary">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search users to add..."
                    autoFocus
                    className="w-full px-2 py-1.5 text-figma-xs border border-fw-secondary rounded bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-fw-secondary">
                  {candidateUsers.length === 0 ? (
                    <p className="px-3 py-3 text-figma-xs text-fw-bodyLight">
                      {memberSearch ? 'No matching users' : 'All users are already members'}
                    </p>
                  ) : (
                    candidateUsers.slice(0, 8).map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleAddMember(u.id, u.name)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-fw-accent transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-fw-secondary flex items-center justify-center text-[10px] font-semibold text-fw-heading">
                          {u.name[0]}
                        </div>
                        <div>
                          <div className="text-figma-xs font-medium text-fw-heading">{u.name}</div>
                          <div className="text-[10px] text-fw-bodyLight">{u.email}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {group.members.length === 0 && !showMemberPicker ? (
              <p className="text-figma-sm text-fw-bodyLight">No members yet. Use Add Member to add users.</p>
            ) : (
              <div className="space-y-2">
                {group.members.map(m => {
                  const days = daysLeft(m.expiresAt);
                  return (
                    <div key={m.userId} className="flex items-center justify-between px-3 py-2 bg-fw-wash border border-fw-secondary rounded-lg">
                      <div>
                        <span className="text-figma-sm font-medium text-fw-heading">{m.displayName}</span>
                        <span className="ml-2 text-figma-xs text-fw-bodyLight">Added by {m.addedBy}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-figma-xs font-medium ${days <= 14 ? 'text-fw-warn' : 'text-fw-bodyLight'}`}>
                          {days < 0 ? 'Expired' : `${days}d left`}
                        </span>
                        <button
                          onClick={() => {
                            removeAccessGroupMember(group.id, m.userId);
                            window.addToast({ type: 'info', title: 'Member Removed', message: m.displayName, duration: 2000 });
                          }}
                          className="p-1 text-fw-bodyLight hover:text-fw-error transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </SideDrawer>

    {showAssignRole && (
      <AssignRoleDrawer
        isOpen={showAssignRole}
        onClose={() => setShowAssignRole(false)}
        targetGroup={group}
      />
    )}
    </>
  );
}

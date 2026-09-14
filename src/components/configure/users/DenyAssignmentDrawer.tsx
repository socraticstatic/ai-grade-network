// src/components/configure/users/DenyAssignmentDrawer.tsx
import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { PermissionsMatrixEditor } from './RoleCatalog';
import { ScopePicker } from '../../common/ScopePicker';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { DenyAssignment, Permission, ScopePath, TENANT_SCOPE } from '../../../types/rbac';
import { ALL_PERMISSIONS } from '../../../data/roleCatalog';
import {
  ResourceFiltersPanel,
  AccessConditionsPanel,
  ConditionsState,
  emptyConditions,
  buildConditions,
  countResourceFilters,
  countAccessConditions,
} from './ConditionsPanel';

interface DenyAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  prefillUserId?: string;
  prefillUserName?: string;
}

// Default: +48 hours
function default48h(): string {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d.toISOString().slice(0, 16);
}

const SORTED_PERMISSIONS = [...ALL_PERMISSIONS].sort();

export function DenyAssignmentDrawer({ isOpen, onClose, prefillUserId = '', prefillUserName = '' }: DenyAssignmentDrawerProps) {
  const { addDenyAssignment, currentUserId } = useStore(s => ({
    addDenyAssignment: s.addDenyAssignment,
    currentUserId: s.currentUserId,
  }));

  const [principalId, setPrincipalId] = useState(prefillUserId);
  const [principalName, setPrincipalName] = useState(prefillUserName);
  const [selectedPerms, setSelectedPerms] = useState<Set<Permission>>(new Set());
  const [scope, setScope] = useState<ScopePath>(TENANT_SCOPE('TNT-001'));
  const [justification, setJustification] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [expiresAt, setExpiresAt] = useState(default48h());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<ConditionsState>(emptyConditions());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  const activeFilterCount = countResourceFilters(conditions);
  const activeAccessCount = countAccessConditions(conditions);

  const togglePerm = (p: Permission) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!principalId.trim()) e.principal = 'Principal ID is required';
    if (!principalName.trim()) e.principalName = 'Principal name is required';
    if (selectedPerms.size === 0) e.perms = 'Select at least one permission to deny';
    if (!justification.trim()) e.justification = 'Justification is required';
    if (justification.trim().length < 20) e.justification = 'At least 20 characters required';
    if (!approvedBy.trim()) e.approvedBy = 'Approver is required for deny assignments';
    if (!expiresAt) e.expiresAt = 'Expiry is required';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const builtConditions = buildConditions(conditions);

    const deny: DenyAssignment = {
      id: `da-${Date.now()}`,
      principal: { id: principalId.trim(), type: 'user', displayName: principalName.trim() },
      permissions: Array.from(selectedPerms),
      scope,
      ...(builtConditions ? { conditions: builtConditions } : {}),
      justification: justification.trim(),
      grantedBy: currentUserId,
      grantedAt: new Date().toISOString(),
      approvedBy: approvedBy.trim(),
      expiresAt: new Date(expiresAt).toISOString(),
      status: 'active',
    };

    addDenyAssignment(deny);
    window.addToast({
      type: 'warning',
      title: 'Deny Assignment Created',
      message: `${selectedPerms.size} permission(s) denied for ${principalName}`,
      duration: 4000,
    });
    handleClose();
  };

  const handleClose = () => {
    setPrincipalId(prefillUserId); setPrincipalName(prefillUserName);
    setSelectedPerms(new Set()); setScope(TENANT_SCOPE('TNT-001'));
    setJustification(''); setApprovedBy(''); setExpiresAt(default48h());
    setErrors({});
    setConditions(emptyConditions()); setFiltersOpen(false); setAccessOpen(false);
    onClose();
  };


  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Deny Assignment"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={AlertTriangle}
            onClick={handleSave}
            className="bg-fw-error hover:bg-fw-error/90 border-fw-error"
          >
            Create Deny
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="bg-fw-errorLight border border-fw-error rounded-lg p-3">
          <p className="text-figma-sm text-fw-error font-medium">
            Deny assignments override all role grants. Requires an approver. Logged to audit.
          </p>
        </div>

        {/* Principal */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Principal ID <span className="text-fw-error">*</span>
            </label>
            <input
              type="text"
              value={principalId}
              onChange={e => setPrincipalId(e.target.value)}
              placeholder="user-1"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base font-mono focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.principal ? 'border-fw-error' : 'border-fw-secondary'}`}
            />
            {errors.principal && <p className="mt-1 text-figma-xs text-fw-error">{errors.principal}</p>}
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Display Name <span className="text-fw-error">*</span>
            </label>
            <input
              type="text"
              value={principalName}
              onChange={e => setPrincipalName(e.target.value)}
              placeholder="Alice Chen"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.principalName ? 'border-fw-error' : 'border-fw-secondary'}`}
            />
            {errors.principalName && <p className="mt-1 text-figma-xs text-fw-error">{errors.principalName}</p>}
          </div>
        </div>

        {/* Permissions to deny */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-3">
            Permissions to Deny <span className="text-fw-error">*</span>
            {selectedPerms.size > 0 && (
              <span className="ml-2 text-fw-bodyLight font-normal">({selectedPerms.size} selected)</span>
            )}
          </label>
          <PermissionsMatrixEditor
            available={SORTED_PERMISSIONS}
            selected={selectedPerms}
            onToggle={togglePerm}
          />
          {errors.perms && <p className="mt-1 text-figma-xs text-fw-error">{errors.perms}</p>}
        </div>

        {/* Scope — WHERE the deny applies */}
        <ScopePicker
          label="Where does this deny apply?"
          value={scope}
          onChange={setScope}
          helpText="Deny is inherited by all child scopes."
        />

        {/* Resource filters — WHICH assets (collapsible) */}
        <div className="border border-fw-secondary rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-fw-wash hover:bg-fw-washHover transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-figma-sm font-medium text-fw-heading">Resource filters</span>
              {activeFilterCount > 0 ? (
                <span className="text-figma-xs font-medium bg-fw-base border border-fw-secondary text-fw-body rounded-full px-2 py-0.5">
                  {activeFilterCount} active
                </span>
              ) : (
                <span className="text-figma-xs text-fw-bodyLight">optional — narrow which assets this deny covers</span>
              )}
            </div>
            {filtersOpen
              ? <ChevronDown className="h-4 w-4 text-fw-bodyLight" />
              : <ChevronRight className="h-4 w-4 text-fw-bodyLight" />
            }
          </button>
          {filtersOpen && (
            <div className="px-4 py-4">
              <ResourceFiltersPanel state={conditions} onChange={setConditions} />
            </div>
          )}
        </div>

        {/* Access conditions — HOW/WHEN this deny is in effect (collapsible) */}
        <div className="border border-fw-secondary rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAccessOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-fw-wash hover:bg-fw-washHover transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-figma-sm font-medium text-fw-heading">Access conditions</span>
              {activeAccessCount > 0 ? (
                <span className="text-figma-xs font-medium bg-fw-base border border-fw-secondary text-fw-body rounded-full px-2 py-0.5">
                  {activeAccessCount} active
                </span>
              ) : (
                <span className="text-figma-xs text-fw-bodyLight">optional — MFA, time window, IP allowlist</span>
              )}
            </div>
            {accessOpen
              ? <ChevronDown className="h-4 w-4 text-fw-bodyLight" />
              : <ChevronRight className="h-4 w-4 text-fw-bodyLight" />
            }
          </button>
          {accessOpen && (
            <div className="px-4 py-4">
              <AccessConditionsPanel state={conditions} onChange={setConditions} />
            </div>
          )}
        </div>

        {/* Justification */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Justification <span className="text-fw-error">*</span>
          </label>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            rows={3}
            placeholder="Security incident reference, ticket number, or business reason..."
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.justification ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.justification && <p className="mt-1 text-figma-xs text-fw-error">{errors.justification}</p>}
        </div>

        {/* Approver + expiry */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Approved By <span className="text-fw-error">*</span>
            </label>
            <input
              type="text"
              value={approvedBy}
              onChange={e => setApprovedBy(e.target.value)}
              placeholder="CSO or Security Admin user ID"
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.approvedBy ? 'border-fw-error' : 'border-fw-secondary'}`}
            />
            {errors.approvedBy && <p className="mt-1 text-figma-xs text-fw-error">{errors.approvedBy}</p>}
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
              Expires At <span className="text-fw-error">*</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.expiresAt ? 'border-fw-error' : 'border-fw-secondary'}`}
            />
            <p className="mt-1 text-figma-xs text-fw-bodyLight">Default: 48h. Emergency lockouts should be short-lived.</p>
            {errors.expiresAt && <p className="mt-1 text-figma-xs text-fw-error">{errors.expiresAt}</p>}
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}

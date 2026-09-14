// src/components/configure/users/CreateGroupDrawer.tsx
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { ScopePicker } from '../../common/ScopePicker';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { AccessGroup, AccessGroupPurpose, OwnerlessPolicy, ScopePath, ScopeTier, TENANT_SCOPE } from '../../../types/rbac';
import { TierCascadePreview } from './TierCascadePreview';

interface CreateGroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PURPOSE_OPTIONS: { value: AccessGroupPurpose; label: string; description: string }[] = [
  { value: 'organizational', label: 'Organizational', description: 'Maps to org structure (department, business unit).' },
  { value: 'resource-cluster', label: 'Resource Cluster', description: 'Groups users by the resources they manage.' },
  { value: 'project', label: 'Project', description: 'Temporary group for a project with a defined end date.' },
  { value: 'audit-engagement', label: 'Audit Engagement', description: 'External auditors. Closes when engagement ends.' },
];

const OWNERLESS_POLICIES: { value: OwnerlessPolicy; label: string }[] = [
  { value: 'suspend', label: 'Suspend group if owner leaves' },
  { value: 'inherit-tenant-admin', label: 'Transfer to Tenant Admin' },
  { value: 'freeze', label: 'Freeze (read-only, no changes)' },
];

export function CreateGroupDrawer({ isOpen, onClose }: CreateGroupDrawerProps) {
  const { addAccessGroup, currentUserId } = useStore(s => ({
    addAccessGroup: s.addAccessGroup,
    currentUserId: s.currentUserId,
  }));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState<AccessGroupPurpose>('organizational');
  const [scopeCeiling, setScopeCeiling] = useState<ScopePath>(TENANT_SCOPE('TNT-001'));
  const [ownerlessPolicy, setOwnerlessPolicy] = useState<OwnerlessPolicy>('suspend');
  const [reviewCycle, setReviewCycle] = useState<'quarterly' | 'annual'>('quarterly');
  const [auditSubject, setAuditSubject] = useState('');
  const [auditingBody, setAuditingBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!scopeCeiling.raw) e.scopeCeiling = 'Scope ceiling is required';
    if (purpose === 'audit-engagement') {
      if (!auditSubject.trim()) e.auditSubject = 'Audit subject is required';
      if (!auditingBody.trim()) e.auditingBody = 'Auditing body is required';
    }
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const group: AccessGroup = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      purpose,
      owner: currentUserId,
      ownerlessPolicy,
      scopeCeiling: { path: scopeCeiling },
      members: [],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      reviewCycle,
      status: 'active',
      ...(purpose === 'audit-engagement' ? {
        engagementMetadata: { subject: auditSubject.trim(), auditingBody: auditingBody.trim() },
      } : {}),
    };

    addAccessGroup(group);
    window.addToast({ type: 'success', title: 'Group Created', message: group.name, duration: 3000 });
    handleClose();
  };

  const handleClose = () => {
    setName(''); setDescription(''); setPurpose('organizational');
    setScopeCeiling(TENANT_SCOPE('TNT-001')); setOwnerlessPolicy('suspend');
    setReviewCycle('quarterly'); setAuditSubject(''); setAuditingBody('');
    setErrors({});
    onClose();
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Group"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Layers} onClick={handleSave}>Create Group</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Name <span className="text-fw-error">*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Operations Team"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.name ? 'border-fw-error' : 'border-fw-secondary'}`} />
          {errors.name && <p className="mt-1 text-figma-xs text-fw-error">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Description <span className="text-fw-error">*</span></label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What does this group do?"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading resize-none focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.description ? 'border-fw-error' : 'border-fw-secondary'}`} />
          {errors.description && <p className="mt-1 text-figma-xs text-fw-error">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-2">Purpose <span className="text-fw-error">*</span></label>
          <div className="space-y-2">
            {PURPOSE_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${purpose === opt.value ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary hover:border-fw-active'}`}>
                <input type="radio" name="purpose" value={opt.value} checked={purpose === opt.value}
                  onChange={() => setPurpose(opt.value)} className="mt-0.5" />
                <div>
                  <div className="text-figma-sm font-medium text-fw-heading">{opt.label}</div>
                  <div className="text-figma-xs text-fw-bodyLight">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {purpose === 'audit-engagement' && (
          <div className="space-y-4 p-4 bg-fw-wash border border-fw-secondary rounded-lg">
            <h4 className="text-figma-sm font-semibold text-fw-heading">Audit Engagement Details</h4>
            <div>
              <label className="block text-figma-xs font-medium text-fw-heading mb-1">Subject <span className="text-fw-error">*</span></label>
              <input type="text" value={auditSubject} onChange={e => setAuditSubject(e.target.value)}
                placeholder="SOC 2 Type II Q2 Review"
                className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.auditSubject ? 'border-fw-error' : 'border-fw-secondary'}`} />
              {errors.auditSubject && <p className="mt-1 text-figma-xs text-fw-error">{errors.auditSubject}</p>}
            </div>
            <div>
              <label className="block text-figma-xs font-medium text-fw-heading mb-1">Auditing Body <span className="text-fw-error">*</span></label>
              <input type="text" value={auditingBody} onChange={e => setAuditingBody(e.target.value)}
                placeholder="KPMG"
                className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.auditingBody ? 'border-fw-error' : 'border-fw-secondary'}`} />
              {errors.auditingBody && <p className="mt-1 text-figma-xs text-fw-error">{errors.auditingBody}</p>}
            </div>
          </div>
        )}

        <ScopePicker
          label="Scope Ceiling"
          value={scopeCeiling}
          onChange={setScopeCeiling}
          error={errors.scopeCeiling}
          allowedTiers={['reseller', 'tenant', 'client', 'pool', 'connection', 'hub']}
          helpText="Members cannot be granted access beyond this scope via this group."
        />

        {/* Live permission cascade preview */}
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
    </SideDrawer>
  );
}

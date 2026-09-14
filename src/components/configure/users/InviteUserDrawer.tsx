// src/components/configure/users/InviteUserDrawer.tsx
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { SideDrawer } from '../../common/SideDrawer';
import { Button } from '../../common/Button';
import { useStore } from '../../../store/useStore';
import { UserType } from '../types';

interface InviteUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserDrawer({ isOpen, onClose }: InviteUserDrawerProps) {
  const addUser = useStore(s => s.addUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const newUser: UserType = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: 'Viewer', // placeholder — real role assigned via AssignRoleDrawer
      department: department.trim() || undefined,
      status: 'active',
      lastActive: new Date().toISOString(),
      tenantId: 'TNT-001',
      scopePath: `/tenants/TNT-001`,
      connectionAccess: [],
    };

    addUser(newUser);
    window.addToast({ type: 'success', title: 'User Invited', message: `${name} has been invited. Assign a role to grant access.`, duration: 4000 });
    handleClose();
  };

  const handleClose = () => {
    setName(''); setEmail(''); setDepartment(''); setErrors({});
    onClose();
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite User"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={UserPlus} onClick={handleSave}>Invite</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-figma-sm text-fw-body">
          Invite a user by identity only. Assign roles separately from the Assignments tab or from the user's overflow menu.
        </p>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Full Name <span className="text-fw-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.name ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.name && <p className="mt-1 text-figma-xs text-fw-error">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
            Email Address <span className="text-fw-error">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active ${errors.email ? 'border-fw-error' : 'border-fw-secondary'}`}
          />
          {errors.email && <p className="mt-1 text-figma-xs text-fw-error">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">Department</label>
          <input
            type="text"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="Engineering"
            className="w-full px-3 py-2 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:ring-2 focus:ring-fw-active"
          />
        </div>

        <div className="bg-fw-accent border border-fw-active rounded-lg p-3 text-figma-sm text-fw-body">
          <strong className="text-fw-heading">Next step:</strong> After inviting, go to the Assignments tab or use "Assign Role" from this user's menu to grant permissions.
        </div>
      </div>
    </SideDrawer>
  );
}

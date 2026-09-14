import { useState } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { useStore } from '../../../../../store/useStore';

export function UserPermissionsWidget() {
  const users = useStore(state => state.users);
  const [selectedUser, setSelectedUser] = useState(users[0]);

  const permissions = [
    { id: 'view', label: 'View' },
    { id: 'manage', label: 'Manage' },
    { id: 'monitor', label: 'Monitor' },
    { id: 'configure', label: 'Configure' }
  ];

  return (
    <div className="space-y-4">
      {/* User Selector */}
      <select
        value={selectedUser.id}
        onChange={(e) => setSelectedUser(users.find(u => u.id === e.target.value)!)}
        className="w-full text-figma-base border-fw-secondary rounded-lg"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} - {user.role}
          </option>
        ))}
      </select>

      {/* Permissions Grid */}
      <div className="space-y-2">
        {selectedUser.connectionAccess.map((access) => (
          <div key={access.connectionId} className="p-2 bg-fw-wash rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-heading">
                {access.name}
              </span>
              <Shield className="h-4 w-4 text-fw-link" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-1.5 bg-fw-base rounded border border-fw-secondary"
                >
                  <span className="text-figma-sm text-fw-body">{permission.label}</span>
                  {access.permissions.includes(permission.id) ? (
                    <Check className="h-3 w-3 text-fw-success" />
                  ) : (
                    <X className="h-3 w-3 text-fw-bodyLight" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        Manage Permissions
      </button>
    </div>
  );
}

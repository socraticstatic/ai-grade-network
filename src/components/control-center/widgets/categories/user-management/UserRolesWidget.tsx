import { UserPlus, Users, Shield } from 'lucide-react';
import { useStore } from '../../../../../store/useStore';

export function UserRolesWidget() {
  const users = useStore(state => state.users);

  const roles = [
    { id: 'admin', name: 'Administrator', count: users.filter(u => u.role === 'Network Administrator').length },
    { id: 'engineer', name: 'Network Engineer', count: users.filter(u => u.role === 'Network Engineer').length },
    { id: 'security', name: 'Security Analyst', count: users.filter(u => u.role === 'Security Analyst').length },
    { id: 'support', name: 'Support Engineer', count: users.filter(u => u.role === 'Support Engineer').length }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-fw-bodyLight mr-2" />
          <span className="text-figma-base font-medium text-fw-heading">User Roles</span>
        </div>
        <button className="p-1 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral">
          <UserPlus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role.id} className="p-2 bg-fw-wash rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base text-fw-heading">{role.name}</span>
              </div>
              <span className="text-figma-sm font-medium text-fw-bodyLight">
                {role.count} users
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        Manage Roles
      </button>
    </div>
  );
}

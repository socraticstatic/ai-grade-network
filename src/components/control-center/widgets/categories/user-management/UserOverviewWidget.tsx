import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { useStore } from '../../../../../store/useStore';

export function UserOverviewWidget() {
  const users = useStore(state => state.users);

  const activeUsers = users.filter(u => u.status === 'active');
  const recentlyActive = users.filter(u => {
    const lastActive = new Date(u.lastActive);
    const now = new Date();
    return now.getTime() - lastActive.getTime() < 24 * 60 * 60 * 1000; // 24 hours
  });

  return (
    <div className="space-y-4">
      {/* User Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-fw-accent rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <Users className="h-4 w-4 text-fw-link" />
            <span className="text-figma-sm text-fw-link">Total</span>
          </div>
          <div className="text-xl font-semibold text-fw-linkHover">
            {users.length}
          </div>
          <div className="text-figma-sm text-fw-link">Users</div>
        </div>

        <div className="bg-fw-successLight rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <UserCheck className="h-4 w-4 text-fw-success" />
            <span className="text-figma-sm text-fw-success">Active</span>
          </div>
          <div className="text-xl font-semibold text-fw-success">
            {activeUsers.length}
          </div>
          <div className="text-figma-sm text-fw-success">Users</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-figma-base text-fw-bodyLight">Recently Active</span>
          <span className="text-figma-base font-medium text-fw-heading">
            {recentlyActive.length} users
          </span>
        </div>
        <div className="space-y-2">
          {recentlyActive.slice(0, 3).map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2 bg-fw-wash rounded-lg">
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-fw-neutral flex items-center justify-center">
                  <span className="text-figma-sm font-medium text-fw-body">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="ml-2">
                  <div className="text-figma-base font-medium text-fw-heading">{user.name}</div>
                  <div className="text-figma-sm text-fw-bodyLight">{user.role}</div>
                </div>
              </div>
              <div className="flex items-center text-figma-sm text-fw-bodyLight">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(user.lastActive).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
          Add User
        </button>
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
          Manage Roles
        </button>
      </div>
    </div>
  );
}

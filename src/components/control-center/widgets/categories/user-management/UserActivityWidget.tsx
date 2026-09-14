import { History, User, Settings, Shield } from 'lucide-react';
import { useStore } from '../../../../../store/useStore';

export function UserActivityWidget() {
  const users = useStore(state => state.users);

  const recentActivity = [
    {
      id: '1',
      user: users[0],
      action: 'Updated connection settings',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
    },
    {
      id: '2',
      user: users[1],
      action: 'Modified security rules',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
    },
    {
      id: '3',
      user: users[2],
      action: 'Added new user',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
    }
  ];

  const getActionIcon = (action: string) => {
    if (action.includes('security')) return Shield;
    if (action.includes('settings')) return Settings;
    if (action.includes('user')) return User;
    return History;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-figma-base font-medium text-fw-heading">Recent Activity</span>
        <button className="text-figma-base text-fw-link hover:text-fw-linkHover">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {recentActivity.map((activity) => {
          const ActionIcon = getActionIcon(activity.action);
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-fw-neutral flex items-center justify-center">
                  <ActionIcon className="h-4 w-4 text-fw-bodyLight" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-figma-base font-medium text-fw-heading">
                  {activity.user.name}
                </div>
                <div className="text-figma-base text-fw-bodyLight">{activity.action}</div>
                <div className="text-figma-sm text-fw-bodyLight mt-0.5">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        Load More
      </button>
    </div>
  );
}

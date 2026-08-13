import { useState } from 'react';
import { Activity, Shield, Clock } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';

interface Notification {
  id: string;
  type: 'activity' | 'security' | 'system';
  title: string;
  message: string;
  timestamp: string;
}

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'activity',
      title: 'Connection Created',
      message: 'New AWS Interconnect – last mile connection has been created',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
    },
    {
      id: '2',
      type: 'security',
      title: 'Security Alert',
      message: 'Unusual traffic pattern detected on Azure ExpressRoute',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 mins ago
    },
    {
      id: '3',
      type: 'system',
      title: 'System Update',
      message: 'Scheduled maintenance in 48 hours',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    }
  ]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'activity':
        return Activity;
      case 'security':
        return Shield;
      case 'system':
        return Clock;
      default:
        return Bell;
    }
  };

  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'activity':
        return {
          bg: 'bg-fw-accent',
          text: 'text-brand-accent',
          icon: 'text-brand-accent',
          hover: 'hover:bg-fw-accent'
        };
      case 'security':
        return {
          bg: 'bg-fw-error/15',
          text: 'text-fw-error',
          icon: 'text-fw-error',
          hover: 'hover:bg-fw-error/10'
        };
      case 'system':
        return {
          bg: 'bg-fw-neutral',
          text: 'text-fw-body',
          icon: 'text-fw-body',
          hover: 'hover:bg-fw-wash'
        };
      default:
        return {
          bg: 'bg-fw-wash',
          text: 'text-fw-body',
          icon: 'text-fw-bodyLight',
          hover: 'hover:bg-fw-neutral'
        };
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications: ${notifications.length}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-fw-body transition-colors hover:bg-fw-wash hover:text-fw-heading"
      >
        <AttIcon name="bell" className="h-[18px] w-[18px]" />
        {/* Matches TasksButton: a dot, not a crammed numeral. The count is
            in the accessible name and in the panel this opens. */}
        {notifications.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-fw-error ring-2 ring-fw-base"
          />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-96 bg-fw-base rounded-lg shadow-lg border border-fw-secondary z-50">
            <div className="p-4 border-b border-fw-secondary">
              <h3 className="text-lg font-semibold text-fw-heading tracking-[-0.03em]">Notifications</h3>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const styles = getTypeStyles(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-fw-secondary transition-colors cursor-pointer ${styles.hover}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${styles.bg}`}>
                        <Icon className={`h-4 w-4 ${styles.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-figma-base font-medium ${styles.text}`}>
                          {notification.title}
                        </p>
                        <p className="text-figma-base text-fw-bodyLight mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-figma-sm text-fw-bodyLight mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
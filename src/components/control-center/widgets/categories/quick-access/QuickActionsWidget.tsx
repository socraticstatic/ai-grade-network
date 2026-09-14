import { Plus, Network, Shield, Bell, Settings, ChevronRight } from 'lucide-react';

export function QuickActionsWidget() {
  const actions = [
    {
      id: 'create-connection',
      label: 'Create Connection',
      icon: Plus,
      primary: true
    },
    {
      id: 'network-test',
      label: 'Network Test',
      icon: Network,
      primary: false
    },
    {
      id: 'security-scan',
      label: 'Security Scan',
      icon: Shield,
      primary: false
    },
    {
      id: 'view-alerts',
      label: 'View Alerts',
      icon: Bell,
      primary: false
    }
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`
              quick-action-btn p-3 text-left transition-colors rounded-lg
              ${action.primary
                ? 'bg-fw-accent border border-fw-link/20 hover:bg-fw-accent/70'
                : 'bg-fw-wash border border-transparent hover:bg-fw-neutral'
              }
            `}
          >
            <action.icon className={`h-4 w-4 mb-2 ${action.primary ? 'text-fw-link' : 'text-fw-bodyLight'}`} />
            <div className={`text-figma-sm font-medium ${action.primary ? 'text-fw-linkHover' : 'text-fw-body'}`}>
              {action.label}
            </div>
          </button>
        ))}
      </div>

      <button className="quick-action-btn w-full flex items-center justify-between px-3 py-2 rounded-lg text-figma-sm text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash transition-colors">
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          <span>Configure Quick Actions</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

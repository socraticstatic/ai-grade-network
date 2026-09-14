import { AlertTriangle, Bell, Settings } from 'lucide-react';
import { Connection } from '../../../../../types';
import { formatCurrency } from '../../../../../utils/connections';

interface BillingAlertsWidgetProps {
  connections: Connection[];
}

export function BillingAlertsWidget({ connections }: BillingAlertsWidgetProps) {
  const alerts = [
    {
      id: '1',
      type: 'warning',
      message: 'Approaching monthly budget limit',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      type: 'info',
      message: 'Usage increased by 20% this week',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '3',
      type: 'success',
      message: 'Cost optimization savings applied',
      timestamp: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="h-5 w-5 text-fw-bodyLight mr-2" />
          <span className="text-figma-base font-medium text-fw-heading">Billing Alerts</span>
        </div>
        <button className="p-1 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-2 rounded-lg ${
              alert.type === 'warning' ? 'bg-fw-wash' :
              alert.type === 'info' ? 'bg-fw-accent' :
              'bg-fw-successLight'
            }`}
          >
            <div className="flex items-start">
              <AlertTriangle className={`h-4 w-4 mt-0.5 mr-2 ${
                alert.type === 'warning' ? 'text-fw-bodyLight' :
                alert.type === 'info' ? 'text-fw-link' :
                'text-fw-success'
              }`} />
              <div>
                <p className={`text-figma-base ${
                  alert.type === 'warning' ? 'text-fw-bodyLight' :
                  alert.type === 'info' ? 'text-fw-linkHover' :
                  'text-fw-success'
                }`}>
                  {alert.message}
                </p>
                <p className="text-figma-sm text-fw-bodyLight mt-0.5">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        Configure Alerts
      </button>
    </div>
  );
}

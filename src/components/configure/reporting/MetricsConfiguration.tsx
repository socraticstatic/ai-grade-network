import { useState } from 'react';
import { BarChart2, Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '../../common/Button';

interface Metric {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'security' | 'usage';
  enabled: boolean;
  threshold?: number;
  unit?: string;
  status: 'active' | 'critical' | 'normal';
}

export function MetricsConfiguration() {
  const [metrics] = useState<Metric[]>([
    {
      id: '1',
      name: 'Connection Latency',
      description: 'Average network latency across all connections',
      type: 'performance',
      enabled: true,
      threshold: 10,
      unit: 'ms',
      status: 'active'
    },
    {
      id: '2',
      name: 'Bandwidth Utilization',
      description: 'Total bandwidth usage across all connections',
      type: 'usage',
      enabled: true,
      threshold: 80,
      unit: '%',
      status: 'critical'
    },
    {
      id: '3',
      name: 'Security Events',
      description: 'Number of security-related events and alerts',
      type: 'security',
      enabled: true,
      threshold: 100,
      unit: 'events',
      status: 'active'
    }
  ]);

  const getStatusBadge = (status: Metric['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-successLight text-fw-success">Active</span>;
      case 'critical':
        return <span className="px-2 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-errorLight text-fw-error">Critical</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-figma-sm font-medium bg-fw-neutral text-fw-bodyLight">Normal</span>;
    }
  };

  const getTypeColor = (type: Metric['type']) => {
    switch (type) {
      case 'performance':
        return 'bg-fw-accent text-fw-link';
      case 'security':
        return 'bg-fw-successLight text-fw-success';
      case 'usage':
        return 'bg-fw-successLight text-fw-success';
      default:
        return 'bg-fw-neutral text-fw-body';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div />
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            window.addToast({
              type: 'info',
              title: 'Add Metric',
              message: 'Metric creation coming soon',
              duration: 3000
            });
          }}
        >
          Add Metric
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-fw-base rounded-2xl border border-fw-secondary p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <BarChart2 className="h-6 w-6 text-fw-bodyLight" />
                </div>
                <div>
                  <h4 className="text-figma-lg font-medium text-fw-heading tracking-[-0.03em]">{metric.name}</h4>
                  <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em] mt-1">{metric.description}</p>
                  <div className="flex items-center space-x-3 mt-3">
                    {getStatusBadge(metric.status)}
                    <span className={`px-2 py-0.5 rounded-lg text-figma-sm font-medium ${getTypeColor(metric.type)}`}>
                      {metric.type.charAt(0).toUpperCase() + metric.type.slice(1)}
                    </span>
                    {metric.threshold && (
                      <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">
                        Threshold: {metric.threshold} {metric.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-2 text-fw-bodyLight hover:text-fw-link rounded-lg hover:bg-fw-accent transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
                <button className="p-2 text-fw-bodyLight hover:text-fw-error rounded-lg hover:bg-fw-errorLight transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Activity, Network, History } from 'lucide-react';
import { LineChart } from '../../monitoring/charts/LineChart';
import { chartColors } from '../../../utils/chartColors';

export function UsageMetrics() {
  const [timeRange, setTimeRange] = useState('30d');

  const bandwidthData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Usage (GB)',
        data: [1250, 850, 2100],
        borderColor: chartColors.primary,
        fill: false,
      }
    ]
  };

  const connectionsData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Provisioned Hours',
        data: [672, 672, 672],
        borderColor: chartColors.success,
        fill: false,
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">Usage Metrics</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="form-control"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-figma-base font-medium text-fw-heading">Data Transfer</h4>
            <Activity className="h-5 w-5 text-fw-link" />
          </div>
          <LineChart data={bandwidthData} />
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-figma-base font-medium text-fw-heading">Provisioned Hours</h4>
            <Network className="h-5 w-5 text-fw-success" />
          </div>
          <LineChart data={connectionsData} />
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-fw-wash">
          <h4 className="text-figma-base font-medium text-fw-heading">Usage Summary</h4>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-figma-base text-fw-bodyLight">Total Data Transferred</div>
              <div className="mt-1">
                <div className="text-2xl font-semibold text-fw-heading">4,200 GB</div>
                <div className="text-figma-base text-fw-success">Across all connections</div>
              </div>
            </div>
            <div>
              <div className="text-figma-base text-fw-bodyLight">Average Monthly Usage</div>
              <div className="mt-1">
                <div className="text-2xl font-semibold text-fw-heading">1,400 GB</div>
                <div className="text-figma-base text-fw-success">Per connection</div>
              </div>
            </div>
            <div>
              <div className="text-figma-base text-fw-bodyLight">Total Hours</div>
              <div className="mt-1">
                <div className="text-2xl font-semibold text-fw-heading">2,016</div>
                <div className="text-figma-base text-fw-body">Provisioned this month</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

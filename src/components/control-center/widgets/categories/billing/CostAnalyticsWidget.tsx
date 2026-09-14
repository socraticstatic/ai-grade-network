import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Connection } from '../../../../../types';
import { formatCurrency } from '../../../../../utils/connections';
import { LineChart } from '../../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../../utils/chartColors';

interface CostAnalyticsWidgetProps {
  connections: Connection[];
}

export function CostAnalyticsWidget({ connections }: CostAnalyticsWidgetProps) {
  const costData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Total Cost',
        data: [12500, 13200, 14100, 13800, 14500, 15200],
        borderColor: chartColors.success,
        fill: false
      },
      {
        label: 'Projected Cost',
        data: [15200, 15800, 16400, 17000, 17600, 18200],
        borderColor: chartColors.purple,
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  const costByProvider = {
    AWS: 45,
    Azure: 35,
    'Google Cloud': 20
  };

  const costByType = {
    'Direct Connect': 40,
    'ExpressRoute': 30,
    'Cloud Interconnect': 20,
    'Internet Direct': 10
  };

  return (
    <div className="space-y-6">
      {/* Cost Trends */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">Cost Trends</h3>
          <select className="text-figma-base border-fw-secondary rounded-md">
            <option>Last 6 Months</option>
            <option>Last 12 Months</option>
            <option>Year to Date</option>
          </select>
        </div>
        <div className="h-48">
          <LineChart data={costData} />
        </div>
      </div>

      {/* Cost Distribution */}
      <div className="grid grid-cols-2 gap-6">
        {/* By Provider */}
        <div>
          <h4 className="text-figma-base font-medium text-fw-heading mb-3 tracking-[-0.03em]">Cost by Provider</h4>
          <div className="space-y-3">
            {Object.entries(costByProvider).map(([provider, percentage]) => (
              <div key={provider}>
                <div className="flex items-center justify-between text-figma-base mb-1">
                  <span className="text-fw-body">{provider}</span>
                  <span className="font-medium text-fw-heading">{percentage}%</span>
                </div>
                <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fw-cobalt-600 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Type */}
        <div>
          <h4 className="text-figma-base font-medium text-fw-heading mb-3 tracking-[-0.03em]">Cost by Type</h4>
          <div className="space-y-3">
            {Object.entries(costByType).map(([type, percentage]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-figma-base mb-1">
                  <span className="text-fw-body">{type}</span>
                  <span className="font-medium text-fw-heading">{percentage}%</span>
                </div>
                <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fw-wash rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-fw-successLight rounded-lg">
          <div className="flex items-center text-fw-success mb-1">
            <ArrowDownRight className="h-4 w-4 mr-1" />
            <span className="text-figma-sm font-medium">Cost Optimization</span>
          </div>
          <p className="text-figma-base text-fw-success">
            Potential savings of {formatCurrency(1234)} identified
          </p>
        </div>
        <div className="p-3 bg-fw-accent rounded-lg">
          <div className="flex items-center text-fw-link mb-1">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            <span className="text-figma-sm font-medium">Usage Forecast</span>
          </div>
          <p className="text-figma-base text-fw-linkHover">
            15% increase expected next month
          </p>
        </div>
      </div>
    </div>
  );
}

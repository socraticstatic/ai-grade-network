import { TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart } from '../../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../../utils/chartColors';

export function CapacityPlanningWidget() {
  const capacityData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Current Usage',
        data: [65, 72, 78, 82, 85, 88],
        borderColor: chartColors.primary,
        fill: false
      },
      {
        label: 'Projected Usage',
        data: [65, 72, 78, 82, 85, 92],
        borderColor: chartColors.purple,
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  const resourceForecasts = [
    {
      name: 'Network Bandwidth',
      current: '85%',
      projected: '92%',
      trend: 'up',
      threshold: '95%',
      timeToThreshold: '45 days'
    },
    {
      name: 'Storage Capacity',
      current: '72%',
      projected: '78%',
      trend: 'up',
      threshold: '85%',
      timeToThreshold: '60 days'
    },
    {
      name: 'Compute Resources',
      current: '65%',
      projected: '68%',
      trend: 'up',
      threshold: '80%',
      timeToThreshold: '90 days'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Capacity Trends */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">Capacity Trends</h3>
          <select className="text-figma-base border-fw-secondary rounded-md">
            <option>Last 6 Months</option>
            <option>Last 12 Months</option>
            <option>Year to Date</option>
          </select>
        </div>
        <div className="h-48">
          <LineChart data={capacityData} />
        </div>
      </div>

      {/* Resource Forecasts */}
      <div className="space-y-4">
        <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">Resource Forecasts</h3>
        {resourceForecasts.map((resource) => (
          <div key={resource.name} className="p-4 bg-fw-base rounded-lg border border-fw-secondary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-heading">{resource.name}</span>
              <div className="flex items-center">
                {resource.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-fw-error" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-fw-success" />
                )}
                <span className="ml-1 text-figma-base text-fw-body">{resource.projected}</span>
              </div>
            </div>
            <div className="relative h-2 bg-fw-neutral rounded-full overflow-hidden mb-2">
              <div
                className="absolute h-full bg-fw-cobalt-600 transition-all duration-300"
                style={{ width: resource.current }}
              />
              <div
                className="absolute h-full border-r-2 border-fw-secondary"
                style={{ left: resource.projected }}
              />
            </div>
            <div className="flex items-center justify-between text-figma-sm">
              <span className="text-fw-bodyLight">Current: {resource.current}</span>
              <div className="flex items-center text-fw-bodyLight">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Threshold in {resource.timeToThreshold}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="p-4 bg-fw-wash rounded-lg">
        <div className="flex items-center mb-2">
          <AlertTriangle className="h-5 w-5 text-fw-bodyLight mr-2" />
          <h3 className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em]">Capacity Recommendations</h3>
        </div>
        <ul className="space-y-2 text-figma-sm text-fw-bodyLight">
          <li>- Consider bandwidth upgrade within 45 days</li>
          <li>- Plan storage expansion for Q3 2024</li>
          <li>- Review compute resource allocation</li>
        </ul>
      </div>
    </div>
  );
}

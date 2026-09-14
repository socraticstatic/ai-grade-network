import { Activity, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function ResourceUtilizationWidget() {
  const resources = [
    {
      name: 'Network Bandwidth',
      current: 85,
      previous: 78,
      threshold: 90,
      unit: '%'
    },
    {
      name: 'CPU Usage',
      current: 65,
      previous: 70,
      threshold: 80,
      unit: '%'
    },
    {
      name: 'Memory Usage',
      current: 72,
      previous: 68,
      threshold: 85,
      unit: '%'
    },
    {
      name: 'Storage Usage',
      current: 78,
      previous: 72,
      threshold: 85,
      unit: '%'
    }
  ];

  const getUtilizationColor = (current: number, threshold: number) => {
    const percentage = (current / threshold) * 100;
    if (percentage > 90) return 'bg-fw-error';
    if (percentage > 75) return 'bg-fw-secondary';
    return 'bg-fw-success';
  };

  return (
    <div className="space-y-4">
      {resources.map((resource) => {
        const trend = resource.current - resource.previous;
        const utilizationColor = getUtilizationColor(resource.current, resource.threshold);

        return (
          <div key={resource.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base font-medium text-fw-heading">{resource.name}</span>
              </div>
              <div className="flex items-center">
                {trend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-fw-error" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-fw-success" />
                )}
                <span className="ml-1 text-figma-base text-fw-body">
                  {resource.current}{resource.unit}
                </span>
              </div>
            </div>

            <div className="relative h-2 bg-fw-neutral rounded-full overflow-hidden">
              <div
                className={`absolute h-full ${utilizationColor} transition-all duration-300`}
                style={{ width: `${(resource.current / resource.threshold) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-figma-sm text-fw-bodyLight">
              <span>Current: {resource.current}{resource.unit}</span>
              <span>Threshold: {resource.threshold}{resource.unit}</span>
            </div>
          </div>
        );
      })}

      <div className="p-3 bg-fw-accent rounded-lg">
        <div className="flex items-center">
          <TrendingUp className="h-4 w-4 text-fw-link mr-2" />
          <span className="text-figma-base text-fw-linkHover">Overall Efficiency: 82%</span>
        </div>
      </div>
    </div>
  );
}

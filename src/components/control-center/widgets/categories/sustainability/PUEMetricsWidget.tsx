import { Zap, TrendingDown, Server, ThermometerSun } from 'lucide-react';
import { Connection } from '../../../../../types';

interface PUEMetricsWidgetProps {
  connections: Connection[];
}

export function PUEMetricsWidget({ connections }: PUEMetricsWidgetProps) {
  // PUE (Power Usage Effectiveness) = Total Facility Power / IT Equipment Power
  // Ideal PUE is 1.0, industry average is ~1.58
  const currentPUE = 1.42;
  const targetPUE = 1.30;
  const industryAverage = 1.58;
  const improvement = ((industryAverage - currentPUE) / industryAverage * 100).toFixed(1);

  // Calculate energy metrics
  const totalPower = connections.length * 0.5; // kW per connection
  const coolingPower = totalPower * (currentPUE - 1);
  const carbonSaved = ((industryAverage - currentPUE) * totalPower * 0.4).toFixed(1); // kg CO2

  return (
    <div className="space-y-4">
      {/* Current PUE Score */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {currentPUE.toFixed(2)}
          </div>
          <div className="flex items-center mt-1">
            <TrendingDown className="h-4 w-4 text-fw-success mr-1" />
            <span className="text-figma-base text-fw-success">{improvement}%</span>
            <span className="text-figma-base text-fw-bodyLight ml-1">better than average</span>
          </div>
        </div>
        <Zap className="h-8 w-8 text-fw-success" />
      </div>

      {/* PUE Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight mb-2">
          <span>Current vs Target</span>
          <span>Target: {targetPUE.toFixed(2)}</span>
        </div>
        <div className="relative w-full h-2 bg-fw-neutral rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-fw-success rounded-full transition-all duration-500"
            style={{ width: `${(targetPUE / currentPUE) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight mt-1">
          <span>Efficient</span>
          <span>Industry: {industryAverage}</span>
        </div>
      </div>

      {/* Energy Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-fw-wash rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-figma-sm text-fw-bodyLight">IT Load</span>
            <Server className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-figma-base font-semibold text-fw-heading">
            {totalPower.toFixed(1)} kW
          </div>
        </div>
        <div className="p-3 bg-fw-wash rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-figma-sm text-fw-bodyLight">Cooling</span>
            <ThermometerSun className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-figma-base font-semibold text-fw-heading">
            {coolingPower.toFixed(1)} kW
          </div>
        </div>
      </div>

      {/* Carbon Impact */}
      <div className="flex items-center justify-between p-3 bg-fw-successLight rounded-lg">
        <div className="flex items-center">
          <TrendingDown className="h-4 w-4 text-fw-success mr-2" />
          <span className="text-figma-base text-fw-success">CO2 Saved (vs avg)</span>
        </div>
        <span className="text-figma-base font-medium text-fw-success">
          {carbonSaved} kg/month
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-success hover:bg-fw-successLight rounded-lg transition-colors">
          View Trends
        </button>
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-success hover:bg-fw-successLight rounded-lg transition-colors">
          Set Goals
        </button>
      </div>
    </div>
  );
}

import { Leaf, TrendingDown, Cloud, TreePine } from 'lucide-react';
import { Connection } from '../../../../../types';

interface CarbonFootprintWidgetProps {
  connections: Connection[];
}

export function CarbonFootprintWidget({ connections }: CarbonFootprintWidgetProps) {
  // Calculate carbon footprint based on connections
  const monthlyEmissions = connections.length * 12.5; // kg CO2 per connection per month
  const annualEmissions = monthlyEmissions * 12 / 1000; // Convert to tonnes
  const offsetPercentage = 65;
  const netEmissions = monthlyEmissions * (1 - offsetPercentage / 100);
  const treesEquivalent = Math.floor(annualEmissions * 48); // Trees needed to offset annually

  return (
    <div className="space-y-4">
      {/* Carbon Emissions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {monthlyEmissions.toFixed(1)} kg
          </div>
          <div className="flex items-center mt-1">
            <TrendingDown className="h-4 w-4 text-fw-success mr-1" />
            <span className="text-figma-base text-fw-success">-12%</span>
            <span className="text-figma-base text-fw-bodyLight ml-1">vs last month</span>
          </div>
        </div>
        <Cloud className="h-8 w-8 text-fw-success" />
      </div>

      {/* Offset Progress */}
      <div>
        <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight mb-2">
          <span>Carbon Offset</span>
          <span>{offsetPercentage}% Neutralized</span>
        </div>
        <div className="relative w-full h-2 bg-fw-neutral rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-fw-success rounded-full transition-all duration-500"
            style={{ width: `${offsetPercentage}%` }}
          />
        </div>
      </div>

      {/* Emissions Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-fw-wash rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-figma-sm text-fw-bodyLight">Gross Emissions</span>
            <Cloud className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-figma-base font-semibold text-fw-heading">
            {monthlyEmissions.toFixed(1)} kg
          </div>
        </div>
        <div className="p-3 bg-fw-wash rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-figma-sm text-fw-bodyLight">Net Emissions</span>
            <Leaf className="h-4 w-4 text-fw-success" />
          </div>
          <div className="text-figma-base font-semibold text-fw-heading">
            {netEmissions.toFixed(1)} kg
          </div>
        </div>
      </div>

      {/* Tree Equivalent */}
      <div className="flex items-center justify-between p-3 bg-fw-successLight rounded-lg">
        <div className="flex items-center">
          <TreePine className="h-4 w-4 text-fw-success mr-2" />
          <span className="text-figma-base text-fw-success">Trees to Offset</span>
        </div>
        <span className="text-figma-base font-medium text-fw-success">
          {treesEquivalent} annually
        </span>
      </div>

      {/* Annual Impact */}
      <div className="p-3 border border-fw-success rounded-lg">
        <div className="text-figma-sm text-fw-bodyLight mb-1">Annual CO2 Emissions</div>
        <div className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">{annualEmissions.toFixed(2)} tonnes</div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-success hover:bg-fw-successLight rounded-lg transition-colors">
          Offset More
        </button>
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-success hover:bg-fw-successLight rounded-lg transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
}

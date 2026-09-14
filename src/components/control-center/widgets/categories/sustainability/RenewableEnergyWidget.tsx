import { Zap, Sun, Wind, Battery } from 'lucide-react';
import { Connection } from '../../../../../types';

interface RenewableEnergyWidgetProps {
  connections: Connection[];
}

export function RenewableEnergyWidget({ connections }: RenewableEnergyWidgetProps) {
  // Calculate renewable energy usage
  const renewablePercentage = 73;
  const totalEnergy = connections.length * 1.2; // kWh
  const renewableEnergy = totalEnergy * (renewablePercentage / 100);
  const gridEnergy = totalEnergy - renewableEnergy;

  // Energy sources breakdown
  const energySources = [
    { name: 'Solar', percentage: 42, icon: Sun, color: 'text-fw-bodyLight' },
    { name: 'Wind', percentage: 28, icon: Wind, color: 'text-fw-link' },
    { name: 'Hydro', percentage: 3, icon: Battery, color: 'text-fw-info' }
  ];

  return (
    <div className="space-y-4">
      {/* Renewable Percentage */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {renewablePercentage}%
          </div>
          <div className="flex items-center mt-1">
            <Zap className="h-4 w-4 text-fw-success mr-1" />
            <span className="text-figma-base text-fw-bodyLight">Renewable Energy</span>
          </div>
        </div>
        <Sun className="h-8 w-8 text-fw-bodyLight" />
      </div>

      {/* Renewable Progress */}
      <div>
        <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight mb-2">
          <span>Clean Energy Mix</span>
          <span>{renewableEnergy.toFixed(1)} kWh</span>
        </div>
        <div className="relative w-full h-2 bg-fw-neutral rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-fw-success rounded-full transition-all duration-500"
            style={{ width: `${renewablePercentage}%` }}
          />
        </div>
      </div>

      {/* Energy Sources */}
      <div className="space-y-2">
        {energySources.map((source) => {
          const SourceIcon = source.icon;
          const energy = totalEnergy * (source.percentage / 100);

          return (
            <div key={source.name} className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <SourceIcon className={`h-4 w-4 ${source.color} mr-2 flex-shrink-0`} />
                <span className="text-figma-base text-fw-body truncate">{source.name}</span>
              </div>
              <div className="flex items-center ml-3">
                <div className="w-20 h-1.5 bg-fw-neutral rounded-full overflow-hidden mr-2">
                  <div
                    className="h-full bg-fw-success rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
                <span className="text-figma-sm font-medium text-fw-body w-12 text-right">
                  {source.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Energy Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-fw-successLight rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-figma-sm text-fw-success">Renewable</span>
            <Zap className="h-4 w-4 text-fw-success" />
          </div>
          <div className="text-figma-base font-semibold text-fw-success">
            {renewableEnergy.toFixed(1)} kWh
          </div>
        </div>
        <div className="p-3 bg-fw-wash rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-figma-sm text-fw-body">Grid</span>
            <Zap className="h-4 w-4 text-fw-bodyLight" />
          </div>
          <div className="text-figma-base font-semibold text-fw-heading">
            {gridEnergy.toFixed(1)} kWh
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-success hover:bg-fw-successLight rounded-lg transition-colors">
          Energy Report
        </button>
        <button className="flex-1 px-3 py-2 text-figma-base text-fw-success hover:bg-fw-successLight rounded-lg transition-colors">
          Add Sources
        </button>
      </div>
    </div>
  );
}

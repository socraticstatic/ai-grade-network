import { Server, Activity, Thermometer, Power } from 'lucide-react';

export function DataCenterWidget() {
  const dataCenters = [
    {
      name: 'US East',
      status: 'Operational' as const,
      capacity: 85,
      temperature: '22°C',
      power: '3.2 MW'
    },
    {
      name: 'US West',
      status: 'Operational' as const,
      capacity: 72,
      temperature: '21°C',
      power: '2.8 MW'
    }
  ];

  return (
    <div className="divide-y divide-fw-secondary">
      {dataCenters.map((dc) => (
        <div key={dc.name} className="py-3.5 first:pt-0 last:pb-0">
          {/* DC name + status */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-fw-bodyLight" />
              <span className="text-figma-sm font-semibold text-fw-heading">{dc.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-fw-success" />
              <span className="text-figma-xs text-fw-success">{dc.status}</span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-fw-bodyLight">
                <Activity className="h-3 w-3" />
                <span className="text-figma-xs">Capacity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-fw-neutral rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dc.capacity > 90 ? 'bg-fw-error' : dc.capacity > 75 ? 'bg-fw-heading' : 'bg-fw-success'}`}
                    style={{ width: `${dc.capacity}%` }}
                  />
                </div>
                <span className="text-figma-xs font-medium text-fw-heading tabular-nums w-7 text-right">{dc.capacity}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-fw-bodyLight">
                <Thermometer className="h-3 w-3" />
                <span className="text-figma-xs">Temperature</span>
              </div>
              <span className="text-figma-xs font-medium text-fw-heading">{dc.temperature}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-fw-bodyLight">
                <Power className="h-3 w-3" />
                <span className="text-figma-xs">Power</span>
              </div>
              <span className="text-figma-xs font-medium text-fw-heading">{dc.power}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

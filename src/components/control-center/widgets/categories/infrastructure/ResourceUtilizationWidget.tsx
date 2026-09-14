import { Cpu, MemoryStick as Memory, HardDrive, Database } from 'lucide-react';

export function ResourceUtilizationWidget() {
  const resources = [
    { name: 'CPU', icon: Cpu, usage: 65, total: '32 cores' },
    { name: 'Memory', icon: Memory, usage: 78, total: '128 GB' },
    { name: 'Storage', icon: HardDrive, usage: 82, total: '2 TB' },
    { name: 'Database', icon: Database, usage: 45, total: '500 GB' },
  ];

  const getBarColor = (usage: number) => {
    if (usage > 90) return 'bg-fw-error';
    if (usage > 75) return 'bg-fw-heading';
    return 'bg-fw-success';
  };

  const getValueColor = (usage: number) => {
    if (usage > 90) return 'text-fw-error';
    if (usage > 75) return 'text-fw-heading';
    return 'text-fw-bodyLight';
  };

  return (
    <div className="space-y-3.5">
      {resources.map((resource) => (
        <div key={resource.name}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <resource.icon className="h-3.5 w-3.5 text-fw-bodyLight" />
              <span className="text-figma-sm font-medium text-fw-heading">{resource.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-figma-xs font-semibold tabular-nums ${getValueColor(resource.usage)}`}>
                {resource.usage}%
              </span>
              <span className="text-figma-xs text-fw-bodyLight">{resource.total}</span>
            </div>
          </div>

          {/* Progress bar with threshold marker at 75% */}
          <div className="relative h-1.5 bg-fw-neutral rounded-full overflow-hidden">
            <div
              className={`absolute h-full rounded-full transition-all duration-500 ${getBarColor(resource.usage)}`}
              style={{ width: `${resource.usage}%` }}
            />
            {/* 75% threshold tick */}
            <div className="absolute top-0 h-full w-px bg-fw-secondary" style={{ left: '75%' }} />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-1 pt-1">
        <div className="h-px w-px bg-fw-secondary flex-shrink-0" />
        <span className="text-figma-xs text-fw-bodyLight">75% threshold shown</span>
      </div>
    </div>
  );
}

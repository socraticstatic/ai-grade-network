// src/components/monitoring/metrics/VNFFleetView.tsx
import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Power, LucideIcon } from 'lucide-react';
import { useMonitoring } from '../context/MonitoringContext';
import { getVNFTypeInfo } from '../../../utils/vnfTypes';
import { deriveHealth, HealthState } from './vnfHealthUtils';

function UtilizationBar({
  value,
  warning,
  critical,
}: {
  value: number;
  warning: number;
  critical: number;
}) {
  const color =
    value >= critical ? 'bg-fw-error' :
    value >= warning  ? 'bg-fw-warn' :
                        'bg-fw-success';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-fw-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-figma-xs text-fw-body w-9 text-right tabular-nums">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

const healthConfig: Record<HealthState, {
  icon: LucideIcon;
  label: string;
  cls: string;
}> = {
  healthy:  { icon: CheckCircle2,  label: 'Healthy',  cls: 'text-fw-success' },
  warning:  { icon: AlertTriangle, label: 'Warning',  cls: 'text-fw-warn'    },
  critical: { icon: XCircle,       label: 'Critical', cls: 'text-fw-error'   },
};

export function VNFFleetView() {
  const { filteredVNFs, setSelectedVNF } = useMonitoring();

  const vnfMetrics = useMemo(() => {
    return filteredVNFs.map(vnf => {
      // Stable seed from VNF id so values don't jump on re-render
      const seed = vnf.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const cpu     = vnf.performance?.cpuUsage    ?? (30 + (seed % 55));
      const memory  = vnf.performance?.memoryUsage ?? (45 + ((seed * 3) % 45));
      const storage = 30 + ((seed * 7) % 55);
      return { vnf, cpu, memory, storage };
    });
  }, [filteredVNFs]);

  if (filteredVNFs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-figma-base font-medium text-fw-heading">No VNFs found</p>
        <p className="text-figma-sm text-fw-bodyLight mt-1">Select a connection with VNFs to view fleet health</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">
          VNF Fleet Health
        </h2>
        <p className="text-figma-sm text-fw-bodyLight mt-0.5">
          {filteredVNFs.length} virtual network function{filteredVNFs.length !== 1 ? 's' : ''} — click a row to drill in
        </p>
      </div>

      <div className="bg-fw-base rounded-xl border border-fw-secondary overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_2fr] gap-4 px-4 py-2 border-b border-fw-secondary bg-fw-wash">
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">VNF</span>
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">State</span>
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">Health</span>
          <span className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-wider">CPU / Memory / Storage</span>
        </div>

        {vnfMetrics.map(({ vnf, cpu, memory, storage }, i) => {
          const isRunning = vnf.status === 'active';
          const health = isRunning ? deriveHealth(cpu, memory, storage) : 'critical';
          const { icon: HealthIcon, label: healthLabel, cls: healthCls } = healthConfig[health];
          const typeInfo = getVNFTypeInfo(vnf.type);

          return (
            <button
              key={vnf.id}
              onClick={() => setSelectedVNF(vnf.id)}
              className={`w-full grid grid-cols-[1fr_auto_auto_2fr] gap-4 px-4 py-3 text-left hover:bg-fw-wash transition-colors ${
                i < vnfMetrics.length - 1 ? 'border-b border-fw-secondary' : ''
              }`}
            >
              {/* Name + type */}
              <div className="min-w-0">
                <p className="text-figma-sm font-medium text-fw-heading truncate">{vnf.name}</p>
                <p className="text-figma-xs text-fw-bodyLight">
                  {typeInfo?.label ?? vnf.type} · {vnf.vendor}
                </p>
              </div>

              {/* VM state */}
              <div className="flex items-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-figma-xs font-medium border ${
                  isRunning
                    ? 'bg-fw-success/10 border-fw-success/30 text-fw-success'
                    : 'bg-fw-error/10 border-fw-error/30 text-fw-error'
                }`}>
                  <Power className="h-3 w-3" />
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>

              {/* Health */}
              <div className="flex items-center">
                <span className={`inline-flex items-center gap-1 text-figma-xs font-medium ${healthCls}`}>
                  <HealthIcon className="h-3.5 w-3.5" />
                  {healthLabel}
                </span>
              </div>

              {/* Utilization bars */}
              <div className="flex flex-col gap-1.5 justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight w-14">CPU</span>
                  <UtilizationBar value={cpu} warning={70} critical={85} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight w-14">Memory</span>
                  <UtilizationBar value={memory} warning={75} critical={90} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight w-14">Storage</span>
                  <UtilizationBar value={storage} warning={80} critical={90} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

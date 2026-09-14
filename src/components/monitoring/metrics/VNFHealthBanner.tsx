// src/components/monitoring/metrics/VNFHealthBanner.tsx
import { CheckCircle2, AlertTriangle, XCircle, Power, type LucideIcon } from 'lucide-react';
import { VNF } from '../../../types/vnf';
import { deriveHealth, HealthState } from './vnfHealthUtils';

interface VNFHealthBannerProps {
  vnf: VNF;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  lastUpdate?: Date;
}

const healthConfig: Record<HealthState, {
  icon: LucideIcon;
  label: string;
  cls: string;
}> = {
  healthy:  { icon: CheckCircle2,  label: 'Healthy',  cls: 'bg-fw-success/10 border-fw-success/30 text-fw-success' },
  warning:  { icon: AlertTriangle, label: 'Warning',  cls: 'bg-fw-warn/10 border-fw-warn/30 text-fw-warn'         },
  critical: { icon: XCircle,       label: 'Critical', cls: 'bg-fw-error/10 border-fw-error/30 text-fw-error'       },
};

export function VNFHealthBanner({
  vnf,
  cpuUsage,
  memoryUsage,
  storageUsage,
  lastUpdate,
}: VNFHealthBannerProps) {
  const isRunning = vnf.status === 'active';
  const health = isRunning ? deriveHealth(cpuUsage, memoryUsage, storageUsage) : 'critical';
  const { icon: HealthIcon, label: healthLabel, cls: healthCls } = healthConfig[health];

  const vmCls = isRunning
    ? 'bg-fw-success/10 border-fw-success/30 text-fw-success'
    : 'bg-fw-error/10 border-fw-error/30 text-fw-error';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-figma-sm font-medium border ${vmCls}`}>
        <Power className="h-3.5 w-3.5" />
        {isRunning ? 'Running' : 'Stopped'}
      </span>

      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-figma-sm font-medium border ${healthCls}`}>
        <HealthIcon className="h-3.5 w-3.5" />
        {healthLabel}
      </span>

      {lastUpdate && (
        <span className="text-figma-xs text-fw-bodyLight ml-auto">
          Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  );
}

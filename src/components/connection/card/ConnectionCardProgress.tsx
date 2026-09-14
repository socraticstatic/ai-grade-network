import { motion } from 'framer-motion';

interface ConnectionCardProgressProps {
  performance?: {
    bandwidthUtilization: number;
  };
  bandwidth: string;
}

/**
 * Progress bar component for the connection card
 * Displays bandwidth utilization
 */
export function ConnectionCardProgress({
  performance,
  bandwidth
}: ConnectionCardProgressProps) {
  const bandwidthUtil = performance?.bandwidthUtilization || 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-figma-base">
        <span className="font-medium text-fw-body">Bandwidth Utilization</span>
        <span className="font-medium text-fw-heading">{bandwidthUtil}%</span>
      </div>
      <div className="h-2 bg-fw-wash rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            bandwidthUtil > 90 ? 'bg-fw-errorLight0' :
            bandwidthUtil > 80 ? 'bg-fw-link' :
            bandwidthUtil > 60 ? 'bg-brand-blue' :
            'bg-fw-success'
          }`}
          style={{ width: `${bandwidthUtil}%` }}
        />
      </div>
      <div className="flex justify-between text-figma-sm font-medium text-fw-bodyLight">
        <span>0</span>
        <span>{bandwidth}</span>
      </div>
    </div>
  );
}
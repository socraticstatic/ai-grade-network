// src/components/monitoring/metrics/vnfHealthUtils.ts

export type HealthState = 'healthy' | 'warning' | 'critical';

export function deriveHealth(
  cpuUsage: number,
  memoryUsage: number,
  storageUsage: number
): HealthState {
  if (cpuUsage >= 85 || memoryUsage >= 90 || storageUsage >= 90) return 'critical';
  if (cpuUsage >= 70 || memoryUsage >= 75 || storageUsage >= 80) return 'warning';
  return 'healthy';
}

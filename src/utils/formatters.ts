// Utility functions for formatting data display

export function formatBandwidth(value: number, unit: 'mbps' | 'gbps' = 'gbps'): string {
  if (unit === 'gbps') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} Tbps`;
    }
    return `${value} Gbps`;
  } else {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} Gbps`;
    }
    return `${value} Mbps`;
  }
}

export function formatLatency(value: number): string {
  return `${value.toFixed(1)}ms`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(0)}%`;
}

export function formatUtilization(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
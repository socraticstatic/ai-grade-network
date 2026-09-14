export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  connectionId: string;
}

interface AlertFilters {
  connectionId?: string;
  type?: Alert['type'];
  timeRange?: string;
}
import { Connection, ConnectionSummary, ConnectionType, CloudProvider, BandwidthOption } from '../types';

export function calculateConnectionSummary(connections: Connection[]): ConnectionSummary {
  const summary: ConnectionSummary = {
    total: connections.length,
    byStatus: {
      active: 0,
      inactive: 0,
      pending: 0
    },
    byType: {} as Record<ConnectionType, number>,
    byLocation: {},
    byProvider: {} as Record<CloudProvider, number>,
    byBandwidth: {} as Record<BandwidthOption, number>,
    totalLinks: 0,
    totalBilling: 0,
    averageUtilization: 0,
    totalDowntime: 0
  };

  let totalUtilization = 0;

  connections.forEach(connection => {
    // Status counts
    const status = connection.status.toLowerCase() as keyof typeof summary.byStatus;
    summary.byStatus[status]++;

    // Type counts
    const type = connection.type as ConnectionType;
    summary.byType[type] = (summary.byType[type] || 0) + 1;

    // Location counts
    summary.byLocation[connection.location] = (summary.byLocation[connection.location] || 0) + 1;

    // Provider counts
    if (connection.provider) {
      summary.byProvider[connection.provider] = (summary.byProvider[connection.provider] || 0) + 1;
    }

    // Bandwidth counts
    const bandwidth = connection.bandwidth as BandwidthOption;
    summary.byBandwidth[bandwidth] = (summary.byBandwidth[bandwidth] || 0) + 1;

    // Links
    summary.totalLinks += connection.links?.length || 0;

    // Billing
    if (connection.billing) {
      summary.totalBilling += connection.billing.total;
    }

    // Utilization
    if (connection.performance?.bandwidthUtilization) {
      totalUtilization += connection.performance.bandwidthUtilization;
    }

    // Downtime
    summary.totalDowntime += connection.totalDowntime || 0;
  });

  // Calculate average utilization
  summary.averageUtilization = connections.length > 0 
    ? totalUtilization / connections.length 
    : 0;

  return summary;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function isConnectionEditable(connection: Connection): boolean {
  return connection.status !== 'Active';
}

export function getConnectionEditRestrictionReason(connection: Connection): string | null {
  if (connection.status === 'Active') {
    return 'Connection must be deactivated before making changes';
  }
  return null;
}
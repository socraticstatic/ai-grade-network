import { Connection, Group } from '../types';
import { formatCurrency } from './connections';

/**
 * Calculate the aggregate performance metrics for a group based on its connections
 */
export function calculateGroupPerformance(connections: Connection[], group: Group): any {
  // Default values if no connections
  const defaults = {
    aggregatedMetrics: {
      averageLatency: 'N/A',
      averagePacketLoss: 'N/A',
      averageUptime: 'N/A',
      totalBandwidth: '0 Gbps',
      bandwidthUtilization: 0,
      totalTraffic: '0 GB'
    },
    historicalData: []
  };

  // If no connections or empty array, return defaults
  if (!connections || connections.length === 0) {
    return defaults;
  }

  // Filter out connections that are in this group
  const groupConnections = connections.filter(conn => 
    group.connectionIds.includes(conn.id.toString())
  );

  if (groupConnections.length === 0) {
    return defaults;
  }

  // Calculate average metrics
  let totalLatency = 0;
  let latencyCount = 0;
  let totalPacketLoss = 0;
  let packetLossCount = 0;
  let totalUptime = 0;
  let uptimeCount = 0;
  let totalBandwidth = 0;
  let totalUtilization = 0;
  let utilizationCount = 0;

  // Process each connection's performance data
  groupConnections.forEach(conn => {
    if (conn.performance) {
      // Extract numeric value from latency string (e.g. "4.2ms" -> 4.2)
      if (conn.performance.latency) {
        const latencyValue = parseFloat(conn.performance.latency);
        if (!isNaN(latencyValue)) {
          totalLatency += latencyValue;
          latencyCount++;
        }
      }

      // Extract numeric value from packet loss string (e.g. "0.01%" -> 0.01)
      if (conn.performance.packetLoss) {
        const packetLossValue = parseFloat(conn.performance.packetLoss);
        if (!isNaN(packetLossValue)) {
          totalPacketLoss += packetLossValue;
          packetLossCount++;
        }
      }

      // Extract numeric value from uptime string (e.g. "99.99%" -> 99.99)
      if (conn.performance.uptime) {
        const uptimeValue = parseFloat(conn.performance.uptime);
        if (!isNaN(uptimeValue)) {
          totalUptime += uptimeValue;
          uptimeCount++;
        }
      }

      // Extract bandwidth value
      // This is more complex as it needs to parse different formats (e.g. "10 Gbps", "500 Mbps")
      if (conn.bandwidth) {
        const bandwidthMatch = conn.bandwidth.match(/(\d+)\s*(\w+)/i);
        if (bandwidthMatch) {
          const value = parseFloat(bandwidthMatch[1]);
          const unit = bandwidthMatch[2].toLowerCase();

          let valueInGbps = 0;
          if (unit.includes('gbps')) {
            valueInGbps = value;
          } else if (unit.includes('mbps')) {
            valueInGbps = value / 1000;
          } else if (unit.includes('tbps')) {
            valueInGbps = value * 1000;
          }

          totalBandwidth += valueInGbps;
        }
      }

      // Bandwidth utilization
      if (conn.performance.bandwidthUtilization !== undefined) {
        totalUtilization += conn.performance.bandwidthUtilization;
        utilizationCount++;
      }
    }
  });

  // Calculate averages
  const averageLatency = latencyCount > 0 ? `${(totalLatency / latencyCount).toFixed(2)}ms` : 'N/A';
  const averagePacketLoss = packetLossCount > 0 ? `${(totalPacketLoss / packetLossCount).toFixed(4)}%` : 'N/A';
  const averageUptime = uptimeCount > 0 ? `${(totalUptime / uptimeCount).toFixed(2)}%` : 'N/A';
  const totalBandwidthFormatted = `${totalBandwidth.toFixed(2)} Gbps`;
  const averageUtilization = utilizationCount > 0 ? totalUtilization / utilizationCount : 0;

  // Generate historical data (placeholder - in a real app this would come from backend)
  const historicalData = [];
  const now = new Date();
  
  // Generate data points for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setDate(now.getDate() - i);
    
    // Randomize metrics a bit around the average
    const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    
    historicalData.push({
      timestamp: timestamp.toISOString(),
      metrics: {
        latency: latencyCount > 0 ? (totalLatency / latencyCount) * randomFactor : 0,
        packetLoss: packetLossCount > 0 ? (totalPacketLoss / packetLossCount) * randomFactor : 0,
        uptime: uptimeCount > 0 ? (totalUptime / uptimeCount) * randomFactor : 0,
        bandwidthUtilization: utilizationCount > 0 ? averageUtilization * randomFactor : 0
      }
    });
  }

  return {
    aggregatedMetrics: {
      averageLatency,
      averagePacketLoss,
      averageUptime,
      totalBandwidth: totalBandwidthFormatted,
      bandwidthUtilization: averageUtilization,
      totalTraffic: '2.5 TB' // Placeholder - would calculate from real data
    },
    historicalData
  };
}

/**
 * Calculate the billing information for a group based on its connections
 */
export function calculateGroupBilling(connections: Connection[], group: Group): any {
  // Default values
  const defaults = {
    billingId: `bill-${group.id}`,
    planName: 'Standard Enterprise',
    monthlyRate: 0,
    annualDiscount: 10, // 10% discount on annual billing
    currency: 'USD',
    billingCycle: 'monthly',
    paymentMethod: 'credit_card',
    nextInvoiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  };

  // If no connections or empty array, return defaults with $0
  if (!connections || connections.length === 0) {
    return defaults;
  }

  // Filter out connections that are in this group
  const groupConnections = connections.filter(conn => 
    group.connectionIds.includes(conn.id.toString())
  );

  if (groupConnections.length === 0) {
    return defaults;
  }

  // Calculate total billing
  let totalMonthlyRate = 0;

  // Sum up all connection billing
  groupConnections.forEach(conn => {
    if (conn.billing) {
      totalMonthlyRate += conn.billing.total || 0;
    }
  });

  // Generate sample invoice history
  const invoiceHistory = [];
  const now = new Date();
  
  // Generate 3 past invoices
  for (let i = 3; i >= 1; i--) {
    const invoiceDate = new Date(now);
    invoiceDate.setMonth(now.getMonth() - i);
    
    // Slight variation in amounts for realistic history
    const variationFactor = 0.95 + Math.random() * 0.1; // 0.95 to 1.05
    
    // Random status with bias towards paid for older invoices
    let status: 'paid' | 'unpaid' | 'overdue' | 'processing';
    const rand = Math.random();
    if (i >= 3) {
      status = 'paid'; // Oldest invoice is always paid
    } else if (i === 2) {
      status = rand < 0.9 ? 'paid' : 'overdue'; // 90% chance of being paid
    } else {
      status = rand < 0.6 ? 'paid' : (rand < 0.9 ? 'processing' : 'unpaid');
    }
    
    const amount = totalMonthlyRate * variationFactor;
    
    invoiceHistory.push({
      id: `INV-${invoiceDate.getFullYear()}${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}-${group.id.slice(-4)}`,
      date: invoiceDate.toISOString(),
      amount,
      status,
      items: [
        {
          description: 'Cloud Connectivity Services',
          quantity: groupConnections.length,
          unitPrice: amount / groupConnections.length,
          amount
        }
      ]
    });
  }

  return {
    ...defaults,
    monthlyRate: totalMonthlyRate,
    invoiceHistory,
    spendingLimit: totalMonthlyRate * 1.5, // 50% buffer over monthly rate
    costAllocation: {
      'IT': totalMonthlyRate * 0.7,
      'Operations': totalMonthlyRate * 0.3
    }
  };
}

/**
 * Find groups that a connection belongs to
 */
export function getGroupsForConnection(groups: Group[], connectionId: string): Group[] {
  if (!groups || !connectionId) {
    return [];
  }
  
  return groups.filter(group => {
    // Ensure connectionIds is an array before filtering
    if (!Array.isArray(group.connectionIds)) {
      return false;
    }
    
    // Check if the connection ID exists in the group's connectionIds
    // Handle both string and number ID formats
    return group.connectionIds.some(id => 
      id === connectionId || id === connectionId.toString()
    );
  });
}

/**
 * Find groups that a user belongs to
 */
function getGroupsForUser(groups: Group[], userId: string): Group[] {
  return groups.filter(group => 
    group.userIds?.includes(userId) || 
    group.ownerId === userId ||
    group.permissions?.read?.includes(userId) ||
    group.permissions?.write?.includes(userId) ||
    group.permissions?.admin?.includes(userId)
  );
}

/**
 * Check if a user has admin permissions for a group
 */
function isGroupAdmin(group: Group, userId: string): boolean {
  return group.ownerId === userId || (group.permissions?.admin || []).includes(userId);
}

/**
 * Format address as a string
 */
export function formatAddress(address: Group['addresses'][0]): string {
  if (!address) return '';
  
  return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
}

/**
 * Get primary contact for a group
 */
export function getPrimaryContact(group: Group): Group['contacts'][0] | undefined {
  return group.contacts?.find(contact => contact.isPrimary);
}

/**
 * Get primary address for a group
 */
export function getPrimaryAddress(group: Group): Group['addresses'][0] | undefined {
  return group.addresses?.find(address => address.isPrimary);
}
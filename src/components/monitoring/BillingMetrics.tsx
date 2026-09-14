import { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { Connection } from '../../types';
import { Card } from '../common/Card';
import { LineChart } from '../charts/LazyCharts';
import { chartColors } from '../../utils/chartColors';
import { formatCurrency } from '../../utils/connections';
import { Button } from '../common/Button';

interface BillingMetricsProps {
  connections: Connection[];
}

export function BillingMetrics({ connections }: BillingMetricsProps) {
  const [timeRange, setTimeRange] = useState('30d');

  // Calculate billing metrics
  const totalBilling = connections.reduce((sum, conn) => 
    sum + (conn.billing?.total || 0), 0
  );

  const billingByProvider = connections.reduce((acc, conn) => {
    if (conn.provider && conn.billing) {
      acc[conn.provider] = (acc[conn.provider] || 0) + conn.billing.total;
    }
    return acc;
  }, {} as Record<string, number>);

  const billingByLocation = connections.reduce((acc, conn) => {
    if (conn.billing) {
      acc[conn.location] = (acc[conn.location] || 0) + conn.billing.total;
    }
    return acc;
  }, {} as Record<string, number>);

  // Sample data for billing trends
  const billingTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Monthly Billing',
      data: [12500, 13200, 14100, 13800, 14500, 15200],
      borderColor: chartColors.success,
      fill: false
    }]
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-figma-base text-fw-bodyLight">Total Monthly Cost</p>
                <p className="mt-1 text-3xl font-semibold text-fw-heading">
                  {formatCurrency(totalBilling)}
                </p>
              </div>
              <div className="p-3 bg-fw-successLight rounded-full">
                <DollarSign className="h-6 w-6 text-fw-success" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-figma-base">
              <TrendingUp className="h-4 w-4 text-fw-success mr-1" />
              <span className="text-fw-success">+8.2%</span>
              <span className="text-fw-bodyLight ml-1">vs last month</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-figma-base text-fw-bodyLight">Average Per Connection</p>
                <p className="mt-1 text-3xl font-semibold text-fw-heading">
                  {formatCurrency(totalBilling / connections.length)}
                </p>
              </div>
              <div className="p-3 bg-fw-accent rounded-full">
                <CreditCard className="h-6 w-6 text-fw-link" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-figma-base">
              <TrendingUp className="h-4 w-4 text-fw-link mr-1" />
              <span className="text-fw-link">+3.5%</span>
              <span className="text-fw-bodyLight ml-1">vs last month</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-figma-base text-fw-bodyLight">Projected Next Month</p>
                <p className="mt-1 text-3xl font-semibold text-fw-heading">
                  {formatCurrency(totalBilling * 1.082)}
                </p>
              </div>
              <div className="p-3 bg-fw-wash rounded-full">
                <TrendingUp className="h-6 w-6 text-fw-bodyLight" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-figma-base">
              <Calendar className="h-4 w-4 text-fw-bodyLight mr-1" />
              <span className="text-fw-bodyLight">Based on current usage</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-figma-base text-fw-bodyLight">Additional Services</p>
                <p className="mt-1 text-3xl font-semibold text-fw-heading">
                  {formatCurrency(2499.99)}
                </p>
              </div>
              <div className="p-3 bg-fw-infoLight rounded-full">
                <CreditCard className="h-6 w-6 text-fw-info" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-figma-base">
              <span className="text-fw-bodyLight">DDoS Protection, Monitoring</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Billing Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="card-body">
            <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-4">Cost by Provider</h3>
            <div className="space-y-4">
              {Object.entries(billingByProvider).map(([provider, amount]) => (
                <div key={provider}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-figma-base text-fw-body">{provider}</span>
                    <span className="text-figma-base font-medium text-fw-heading">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fw-primary rounded-full"
                      style={{ width: `${(amount / totalBilling) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-body">
            <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-4">Cost by Location</h3>
            <div className="space-y-4">
              {Object.entries(billingByLocation).map(([location, amount]) => (
                <div key={location}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-figma-base text-fw-body">{location}</span>
                    <span className="text-figma-base font-medium text-fw-heading">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fw-success rounded-full"
                      style={{ width: `${(amount / totalBilling) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Billing Trends */}
      <Card>
        <div className="card-body">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">Billing Trends</h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-control text-figma-base"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="180d">Last 180 days</option>
            </select>
          </div>
          <div className="h-80">
            <LineChart data={billingTrendData} />
          </div>
        </div>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <div className="card-body">
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-4">Cost Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-fw-secondary">
              <thead className="bg-fw-wash">
                <tr>
                  <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                    Connection
                  </th>
                  <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                    Base Fee
                  </th>
                  <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                    Usage
                  </th>
                  <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                    Additional Services
                  </th>
                  <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-fw-base divide-y divide-fw-secondary">
                {connections.map((connection) => (
                  <tr key={connection.id} className="hover:bg-fw-wash transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-figma-base font-medium text-fw-heading">{connection.name}</div>
                      <div className="text-figma-base text-fw-bodyLight">{connection.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-figma-base text-fw-heading">
                      {formatCurrency(connection.billing?.baseFee || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-figma-base text-fw-heading">
                      {formatCurrency(connection.billing?.usage || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-figma-base text-fw-heading">
                      {formatCurrency(
                        (connection.billing?.additionalServices || [])
                          .reduce((sum, service) => sum + service.cost, 0)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-figma-base font-medium text-fw-heading">
                      {formatCurrency(connection.billing?.total || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
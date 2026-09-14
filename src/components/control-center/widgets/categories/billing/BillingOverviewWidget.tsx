import { TrendingUp, TrendingDown } from 'lucide-react';
import { Connection } from '../../../../../types';
import { formatCurrency } from '../../../../../utils/connections';

interface BillingOverviewWidgetProps {
  connections: Connection[];
}

export function BillingOverviewWidget({ connections }: BillingOverviewWidgetProps) {
  const totalBilling = connections.reduce((sum, conn) =>
    sum + (conn.billing?.total || 0), 0
  );

  const monthlyTrend = 8.5;
  const trendUp = monthlyTrend > 0;

  const nextBillingDate = new Date();
  nextBillingDate.setDate(1);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  // Per-connection breakdown — real data, sorted by cost
  const topConnections = [...connections]
    .sort((a, b) => (b.billing?.total || 0) - (a.billing?.total || 0))
    .slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Primary total + trend */}
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {formatCurrency(totalBilling)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {trendUp
              ? <TrendingUp className="h-3 w-3 text-fw-bodyLight" />
              : <TrendingDown className="h-3 w-3 text-fw-success" />
            }
            <span className="text-figma-xs font-medium text-fw-body">
              {trendUp ? '+' : ''}{monthlyTrend}%
            </span>
            <span className="text-figma-xs text-fw-bodyLight">vs last month</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-figma-xs text-fw-bodyLight">Next billing</div>
          <div className="text-figma-sm font-semibold text-fw-heading">
            {nextBillingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Per-connection cost breakdown */}
      {topConnections.length > 0 ? (
        <div className="space-y-2">
          {topConnections.map(connection => {
            const cost = connection.billing?.total || 0;
            const pct = totalBilling > 0 ? (cost / totalBilling) * 100 : 0;
            return (
              <div key={connection.id} className="flex items-center gap-3">
                <span className="text-figma-xs text-fw-bodyLight w-20 truncate flex-shrink-0">
                  {connection.name}
                </span>
                <div className="flex-1 h-1 bg-fw-neutral rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fw-primary/40 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-figma-xs font-medium text-fw-heading w-14 text-right flex-shrink-0">
                  {formatCurrency(cost)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-figma-sm text-fw-bodyLight">No billing data available</p>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1 border-t border-fw-secondary">
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          View details
        </button>
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          Download invoice
        </button>
      </div>
    </div>
  );
}

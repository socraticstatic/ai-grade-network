import { AlertTriangle } from 'lucide-react';
import { Connection } from '../../../../../types';
import { formatCurrency } from '../../../../../utils/connections';

interface BudgetTrackerWidgetProps {
  connections: Connection[];
}

export function BudgetTrackerWidget({ connections }: BudgetTrackerWidgetProps) {
  const totalBilling = connections.reduce((sum, conn) =>
    sum + (conn.billing?.total || 0), 0
  );

  const budget = 20000;
  const usagePercentage = (totalBilling / budget) * 100;
  const isOverBudget = usagePercentage > 100;
  const isNearBudget = usagePercentage > 80;
  const remaining = budget - totalBilling;

  return (
    <div className="space-y-4">
      {/* Headline */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
            {formatCurrency(totalBilling)}
          </span>
          <span className="text-figma-sm text-fw-bodyLight ml-1.5">of {formatCurrency(budget)}</span>
        </div>
        <div className="text-right">
          <div className={`text-figma-sm font-semibold ${isOverBudget ? 'text-fw-error' : 'text-fw-success'}`}>
            {isOverBudget ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
          </div>
          <div className="text-figma-xs text-fw-bodyLight">{usagePercentage.toFixed(1)}% used</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverBudget ? 'bg-fw-error' : isNearBudget ? 'bg-fw-heading' : 'bg-fw-success'
          }`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>

      {/* Alert — only when needed */}
      {(isOverBudget || isNearBudget) && (
        <div className={`flex items-center gap-2 text-figma-sm ${isOverBudget ? 'text-fw-error' : 'text-fw-bodyLight'}`}>
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {isOverBudget ? 'Budget exceeded — review cost allocation' : 'Approaching budget limit'}
          </span>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1 border-t border-fw-secondary">
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          Adjust budget
        </button>
        <button className="text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
          Cost alerts
        </button>
      </div>
    </div>
  );
}

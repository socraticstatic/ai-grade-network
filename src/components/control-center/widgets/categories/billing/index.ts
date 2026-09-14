import { DollarSign, CreditCard, TrendingUp, Receipt, Clock, AlertTriangle } from 'lucide-react';
import { BillingOverviewWidget } from './BillingOverviewWidget';
import { CostAnalyticsWidget } from './CostAnalyticsWidget';
import { BudgetTrackerWidget } from './BudgetTrackerWidget';
import { BillingAlertsWidget } from './BillingAlertsWidget';
import { InvoiceHistoryWidget } from './InvoiceHistoryWidget';
import { WidgetDefinition } from '../../../types';

export const billingWidgets: WidgetDefinition[] = [
  {
    id: 'billing-overview',
    title: 'Billing Overview',
    description: 'Summary of current billing period and trends',
    icon: DollarSign,
    color: 'green',
    defaultW: 2,
    defaultH: 1,
    component: BillingOverviewWidget
  },
  {
    id: 'cost-analytics',
    title: 'Cost Analytics',
    description: 'Detailed cost breakdown and analysis',
    icon: TrendingUp,
    color: 'blue',
    defaultW: 2,
    defaultH: 2,
    component: CostAnalyticsWidget
  },
  {
    id: 'budget-tracker',
    title: 'Budget Tracker',
    description: 'Track spending against budgets',
    icon: CreditCard,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: BudgetTrackerWidget
  },
  {
    id: 'billing-alerts',
    title: 'Billing Alerts',
    description: 'Cost and usage alerts',
    icon: AlertTriangle,
    color: 'gray',
    defaultW: 1,
    defaultH: 1,
    component: BillingAlertsWidget
  },
  {
    id: 'invoice-history',
    title: 'Invoice History',
    description: 'Recent invoices and payment history',
    icon: Receipt,
    color: 'blue',
    defaultW: 2,
    defaultH: 1,
    component: InvoiceHistoryWidget
  }
];

export * from './BillingOverviewWidget';
export * from './CostAnalyticsWidget';
export * from './BudgetTrackerWidget';
export * from './BillingAlertsWidget';
export * from './InvoiceHistoryWidget';
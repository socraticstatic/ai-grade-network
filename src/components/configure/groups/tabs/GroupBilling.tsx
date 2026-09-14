import { CreditCard, Download, DollarSign, Calendar, Receipt, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Group } from '../../../../types/group';
import { Connection } from '../../../../types';
import { Button } from '../../../common/Button';
import { LineChart } from '../../../monitoring/charts/LineChart';
import { chartColors } from '../../../../utils/chartColors';

interface GroupBillingProps {
  group: Group;
  connections: Connection[];
}

export function GroupBilling({ group, connections }: GroupBillingProps) {
  if (!group.billing) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-2">No Billing Information</h3>
          <p className="text-fw-bodyLight">This group doesn't have any billing information yet.</p>
        </div>
      </div>
    );
  }

  // Sample billing trend data
  const billingTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Monthly Billing',
      data: [2700, 2850, 2750, 2900, 3100, 2950],
      borderColor: chartColors.success,
      fill: false
    }]
  };

  return (
    <div className="p-6 space-y-6">
      {/* Billing Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-figma-base font-medium text-fw-bodyLight">Monthly Cost</h4>
              <div className="mt-2 flex items-baseline">
                <p className="text-2xl font-bold text-fw-heading">${group.billing.monthlyRate.toFixed(2)}</p>
              </div>
              <div className="mt-2 flex items-center text-figma-base">
                <TrendingUp className="h-4 w-4 text-fw-success mr-1" />
                <span className="text-fw-success">+5.2%</span>
                <span className="text-fw-bodyLight ml-1">vs. last month</span>
              </div>
            </div>
            <div className="p-2 bg-fw-successLight rounded-lg">
              <DollarSign className="h-5 w-5 text-fw-success" />
            </div>
          </div>
        </div>

        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-figma-base font-medium text-fw-bodyLight">Annual Discount</h4>
              <div className="mt-2 flex items-baseline">
                <p className="text-2xl font-bold text-fw-heading">{group.billing.annualDiscount || 0}%</p>
                <p className="ml-2 text-figma-base text-fw-bodyLight">per year</p>
              </div>
              <div className="mt-2 text-figma-base text-fw-bodyLight">
                Save ${((group.billing.monthlyRate * 12) * (group.billing.annualDiscount || 0) / 100).toFixed(2)} annually
              </div>
            </div>
            <div className="p-2 bg-fw-accent rounded-lg">
              <Calendar className="h-5 w-5 text-fw-link" />
            </div>
          </div>
        </div>

        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-figma-base font-medium text-fw-bodyLight">Next Invoice</h4>
              <div className="mt-2 flex items-baseline">
                <p className="text-2xl font-bold text-fw-heading">
                  {group.billing.nextInvoiceDate 
                    ? new Date(group.billing.nextInvoiceDate).toLocaleDateString() 
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="mt-2 text-figma-base text-fw-bodyLight">
                {group.billing.billingCycle.charAt(0).toUpperCase() + group.billing.billingCycle.slice(1)} billing cycle
              </div>
            </div>
            <div className="p-2 bg-fw-purpleLight rounded-lg">
              <Receipt className="h-5 w-5 text-fw-purple" />
            </div>
          </div>
        </div>

        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-figma-base font-medium text-fw-bodyLight">Payment Method</h4>
              <div className="mt-2 flex items-baseline">
                <p className="text-2xl font-bold text-fw-heading capitalize">
                  {group.billing.paymentMethod.replace('_', ' ')}
                </p>
              </div>
              <div className="mt-2 text-figma-base text-fw-bodyLight">
                {group.billing.paymentMethod === 'credit_card' ? 'Card ending in •••• 4242' : 'Net 30 terms'}
              </div>
            </div>
            <div className="p-2 bg-fw-infoLight rounded-lg">
              <CreditCard className="h-5 w-5 text-fw-link" />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Trend Chart */}
      <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <TrendingUp className="h-5 w-5 text-fw-link mr-2" />
            Billing Trends
          </h3>
          <select
            className="form-control"
            defaultValue="6m"
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
        <div className="h-64">
          <LineChart data={billingTrendData} />
        </div>
      </div>
      
      {/* Invoice History */}
      <div className="bg-fw-base rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-fw-secondary flex justify-between items-center">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <Receipt className="h-5 w-5 text-fw-link mr-2" />
            Invoice History
          </h3>
          <Button
            variant="outline"
            icon={Download}
          >
            Export All
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-fw-secondary">
            <thead className="bg-fw-wash">
              <tr>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Invoice
                </th>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Date
                </th>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Amount
                </th>
                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                  Status
                </th>
                <th scope="col" className="relative px-6 h-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-fw-base divide-y divide-fw-secondary">
              {group.billing.invoiceHistory ? (
                group.billing.invoiceHistory.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-fw-wash transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-fw-bodyLight mr-2" />
                        <div className="text-figma-base font-medium text-fw-heading">{invoice.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-figma-base text-fw-heading">
                        {new Date(invoice.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-figma-base text-fw-heading">${invoice.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-figma-sm leading-5 font-semibold rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-fw-successLight text-fw-success'
                          : invoice.status === 'unpaid'
                            ? 'bg-fw-warnLight text-fw-warn'
                            : invoice.status === 'overdue'
                              ? 'bg-fw-errorLight text-fw-error'
                              : 'bg-fw-accent text-fw-link'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-figma-base font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button className="text-fw-link hover:text-fw-linkHover">
                          View
                        </button>
                        <button className="text-fw-bodyLight hover:text-fw-body">
                          <FileText className="h-5 w-5" />
                        </button>
                        <button className="text-fw-bodyLight hover:text-fw-body">
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-figma-base text-fw-bodyLight">
                    No invoices available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Cost Allocation */}
      {group.billing.costAllocation && (
        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-fw-heading flex items-center">
              <DollarSign className="h-5 w-5 text-fw-link mr-2" />
              Cost Allocation
            </h3>
          </div>
          
          <div className="space-y-4">
            {Object.entries(group.billing.costAllocation).map(([category, amount]) => (
              <div key={category}>
                <div className="flex justify-between mb-1">
                  <span className="text-figma-base text-fw-body">{category}</span>
                  <span className="text-figma-base font-medium text-fw-heading">${amount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-fw-neutral rounded-full h-2">
                  <div
                    className="bg-fw-cobalt-600 h-2 rounded-full"
                    style={{ width: `${(amount / group.billing.monthlyRate) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-fw-wash rounded-xl">
              <h4 className="text-figma-base font-medium text-fw-body mb-2">Billing Breakdown</h4>
              {connections.map(conn => (
                <div key={conn.id} className="flex justify-between text-figma-base mb-2">
                  <span className="text-fw-body">{conn.name}</span>
                  <span className="font-medium text-fw-heading">
                    ${conn.billing?.total.toFixed(2) || '0.00'}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-figma-base font-medium pt-2 border-t border-fw-secondary mt-2">
                <span>Total</span>
                <span>${group.billing.monthlyRate.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="p-4 bg-fw-wash rounded-xl">
              <h4 className="text-figma-base font-medium text-fw-body mb-2">Payment Schedule</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-figma-base">
                  <span className="text-fw-body">Billing Cycle:</span>
                  <span className="font-medium text-fw-heading capitalize">
                    {group.billing.billingCycle}
                  </span>
                </div>
                
                <div className="flex justify-between text-figma-base">
                  <span className="text-fw-body">Payment Method:</span>
                  <span className="font-medium text-fw-heading capitalize">
                    {group.billing.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                
                {group.billing.nextInvoiceDate && (
                  <div className="flex justify-between text-figma-base">
                    <span className="text-fw-body">Next Invoice:</span>
                    <span className="font-medium text-fw-heading">
                      {new Date(group.billing.nextInvoiceDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {group.billing.lastInvoiceDate && (
                  <div className="flex justify-between text-figma-base">
                    <span className="text-fw-body">Last Invoice:</span>
                    <span className="font-medium text-fw-heading">
                      {new Date(group.billing.lastInvoiceDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
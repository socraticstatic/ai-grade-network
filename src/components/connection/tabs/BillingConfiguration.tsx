import { useState } from 'react';
import { 
  DollarSign, CreditCard, Receipt, Clock, TrendingUp, 
  Download, FileText, AlertTriangle, Percent, ArrowUpDown,
  Calendar, RefreshCw
} from 'lucide-react';

interface BillingConfigurationProps {
  isEditing?: boolean;
}

export function BillingConfiguration({ isEditing }: BillingConfigurationProps) {
  const [config] = useState({
    // Base Plan Configuration
    plan: {
      name: 'Enterprise',
      basePrice: 999.99,
      billingCycle: 'monthly',
      autoRenew: true,
      startDate: '2024-01-01',
      nextBillingDate: '2024-04-01',
      status: 'active'
    },

    // Usage-based Pricing
    usage: {
      bandwidth: {
        included: '10TB',
        overage: '$0.08/GB',
        current: '8.5TB',
        forecast: '9.2TB'
      },
      ports: {
        included: 4,
        overage: '$99/port',
        current: 3
      }
    },

    // Add-ons and Features
    addons: [
      {
        name: 'DDoS Protection',
        price: 299.99,
        status: 'active',
        details: 'Advanced DDoS mitigation up to 10Tbps'
      },
      {
        name: 'Redundant Path',
        price: 199.99,
        status: 'active',
        details: 'Automatic failover with secondary connection'
      }
    ],

    // Billing History
    history: [
      {
        id: 'INV-2024-003',
        date: '2024-03-01',
        amount: 1499.97,
        status: 'paid',
        items: [
          { description: 'Base Plan', amount: 999.99 },
          { description: 'DDoS Protection', amount: 299.99 },
          { description: 'Redundant Path', amount: 199.99 }
        ]
      },
      {
        id: 'INV-2024-002',
        date: '2024-02-01',
        amount: 1499.97,
        status: 'paid',
        items: [
          { description: 'Base Plan', amount: 999.99 },
          { description: 'DDoS Protection', amount: 299.99 },
          { description: 'Redundant Path', amount: 199.99 }
        ]
      }
    ],

    // Payment Configuration
    payment: {
      method: 'credit_card',
      card: {
        brand: 'visa',
        last4: '4242',
        expiry: '12/25'
      },
      autopay: true,
      billingEmail: 'billing@example.com'
    },

    // Cost Allocation
    costAllocation: {
      department: 'IT Infrastructure',
      costCenter: 'CC-123456',
      projectCode: 'PROJ-789',
      tags: {
        environment: 'production',
        business_unit: 'cloud_services'
      }
    },

    // Alerts and Notifications
    alerts: {
      usageThreshold: 80,
      budgetThreshold: 90,
      recipients: ['admin@example.com', 'finance@example.com'],
      channels: ['email', 'slack']
    }
  });

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">Current Plan</h3>
          <span className={`px-2 py-1 text-figma-sm rounded-lg ${
            config.plan.status === 'active'
              ? 'bg-fw-successLight text-fw-success'
              : 'bg-fw-warn/10 text-fw-warn'
          }`}>
            {config.plan.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <span className="text-figma-sm text-fw-bodyLight">Base Plan</span>
            <div className="mt-1">
              <span className="text-figma-xl font-bold text-fw-heading">${config.plan.basePrice}</span>
              <span className="text-fw-bodyLight">/{config.plan.billingCycle}</span>
            </div>
          </div>
          <div>
            <span className="text-figma-sm text-fw-bodyLight">Billing Cycle</span>
            <div className="mt-1 flex items-center">
              <Calendar className="h-5 w-5 text-fw-bodyLight mr-2" />
              <span className="text-fw-heading">Monthly</span>
            </div>
          </div>
          <div>
            <span className="text-figma-sm text-fw-bodyLight">Next Billing Date</span>
            <div className="mt-1 flex items-center">
              <Clock className="h-5 w-5 text-fw-bodyLight mr-2" />
              <span className="text-fw-heading">{new Date(config.plan.nextBillingDate).toLocaleDateString()}</span>
            </div>
          </div>
          <div>
            <span className="text-figma-sm text-fw-bodyLight">Auto-Renew</span>
            <div className="mt-1 flex items-center">
              <RefreshCw className="h-5 w-5 text-fw-bodyLight mr-2" />
              <span className="text-fw-heading">{config.plan.autoRenew ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage & Metering */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-6">Usage & Metering</h3>

        {/* Bandwidth Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-figma-sm font-medium text-fw-body">Bandwidth Usage</span>
            <span className="text-figma-sm text-fw-bodyLight">
              {config.usage.bandwidth.current} of {config.usage.bandwidth.included} included
            </span>
          </div>
          <div className="relative">
            <div className="h-2 bg-fw-neutral rounded-full">
              <div
                className="h-2 bg-fw-cobalt-600 rounded-full"
                style={{ width: `${(parseFloat(config.usage.bandwidth.current) / parseFloat(config.usage.bandwidth.included.replace('TB', ''))) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-figma-sm text-fw-bodyLight">
            <span>Forecast: {config.usage.bandwidth.forecast}</span>
            <span>Overage Rate: {config.usage.bandwidth.overage}</span>
          </div>
        </div>

        {/* Port Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-figma-sm font-medium text-fw-body">Port Usage</span>
            <span className="text-figma-sm text-fw-bodyLight">
              {config.usage.ports.current} of {config.usage.ports.included} included
            </span>
          </div>
          <div className="relative">
            <div className="h-2 bg-fw-neutral rounded-full">
              <div
                className="h-2 bg-fw-cobalt-600 rounded-full"
                style={{ width: `${(config.usage.ports.current / config.usage.ports.included) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-figma-sm text-fw-bodyLight">
            <span>Additional Ports: {config.usage.ports.overage}</span>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-6">Add-ons & Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.addons.map((addon) => (
            <div key={addon.name} className="p-4 bg-fw-wash rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-fw-heading">{addon.name}</span>
                <span className="text-fw-link">${addon.price}/mo</span>
              </div>
              <p className="text-figma-sm text-fw-bodyLight mb-3">{addon.details}</p>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 text-figma-sm rounded-lg ${
                  addon.status === 'active'
                    ? 'bg-fw-successLight text-fw-success'
                    : 'bg-fw-neutral text-fw-heading'
                }`}>
                  {addon.status.toUpperCase()}
                </span>
                <button className="text-figma-base text-fw-error hover:text-fw-error">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">Payment Information</h3>
          <button className="text-figma-base text-fw-link hover:text-fw-linkHover">
            Update Payment Method
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-fw-wash rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-fw-bodyLight" />
              <div>
                <div className="text-figma-base font-medium text-fw-heading">
                  {config.payment.card.brand.toUpperCase()} ending in {config.payment.card.last4}
                </div>
                <div className="text-figma-sm text-fw-bodyLight">
                  Expires {config.payment.card.expiry}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-fw-wash rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-heading">Auto-Pay</span>
              <span className={`px-2 py-1 text-figma-sm rounded-lg ${
                config.payment.autopay
                  ? 'bg-fw-successLight text-fw-success'
                  : 'bg-fw-neutral text-fw-heading'
              }`}>
                {config.payment.autopay ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="text-figma-sm text-fw-bodyLight">
              Billing Email: {config.payment.billingEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-fw-base rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">Billing History</h3>
          <button className="text-figma-base text-fw-link hover:text-fw-linkHover flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Export All
          </button>
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
              {config.history.map((invoice) => (
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
                    <span className={`px-2 py-1 inline-flex text-figma-sm leading-5 font-semibold rounded-lg ${
                      invoice.status === 'paid'
                        ? 'bg-fw-successLight text-fw-success'
                        : 'bg-fw-warn/10 text-fw-warn'
                    }`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-figma-base font-medium">
                    <button className="text-fw-link hover:text-fw-linkHover">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Allocation */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-6">Cost Allocation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div>
                <label className="fw-label">Department</label>
                <input
                  type="text"
                  value={config.costAllocation.department}
                  disabled={!isEditing}
                  className="fw-input disabled:bg-fw-wash disabled:text-fw-bodyLight"
                />
              </div>
              <div>
                <label className="fw-label">Cost Center</label>
                <input
                  type="text"
                  value={config.costAllocation.costCenter}
                  disabled={!isEditing}
                  className="fw-input disabled:bg-fw-wash disabled:text-fw-bodyLight"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="fw-label">Tags</label>
            <div className="space-y-2">
              {Object.entries(config.costAllocation.tags).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <span className="text-figma-sm text-fw-bodyLight">{key}:</span>
                  <span className="text-figma-base text-fw-heading">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Alerts */}
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-6">Billing Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="fw-label">Usage Threshold</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={config.alerts.usageThreshold}
                  disabled={!isEditing}
                  className="fw-input disabled:bg-fw-wash disabled:text-fw-bodyLight"
                />
                <span className="ml-2">%</span>
              </div>
            </div>
            <div>
              <label className="fw-label">Budget Threshold</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={config.alerts.budgetThreshold}
                  disabled={!isEditing}
                  className="fw-input disabled:bg-fw-wash disabled:text-fw-bodyLight"
                />
                <span className="ml-2">%</span>
              </div>
            </div>
          </div>
          <div>
            <label className="fw-label">Alert Recipients</label>
            <div className="space-y-2">
              {config.alerts.recipients.map((recipient) => (
                <div key={recipient} className="flex items-center justify-between">
                  <span className="text-figma-base text-fw-heading">{recipient}</span>
                  {isEditing && (
                    <button className="text-figma-base text-fw-error hover:text-fw-error">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
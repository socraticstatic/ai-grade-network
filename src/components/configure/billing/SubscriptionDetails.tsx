import { useState } from 'react';
import { Package, TrendingUp, AlertTriangle, Shield, Info } from 'lucide-react';
import { PricingPlanModal } from './PricingPlanModal';
import { Button } from '../../common/Button';

export function SubscriptionDetails() {
  const [subscription] = useState({
    plan: 'Pay as you go',
    status: 'Active',
    billingCycle: 'Monthly',
    nextBilling: '2024-04-01',
    features: [
      'Up to 5 concurrent connections',
      'Basic monitoring and alerts',
      'Standard support (business hours)',
      'Core security features',
      'Basic reporting'
    ],
    usage: {
      connections: { used: 3, limit: 5 },
      bandwidth: { used: 8.5, limit: 10 },
      storage: { used: 750, limit: 1000 }
    }
  });

  const [showPricingModal, setShowPricingModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* AWS Max Billing Model */}
      <div className="card border-fw-active/30">
        <div className="card-header bg-fw-accent">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-fw-link" />
            <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">AWS Max Billing Model</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#0057b8', backgroundColor: 'rgba(0,87,184,0.16)' }}>AWS Interconnect – last mile</span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-figma-xs text-fw-bodyLight">Billing Trigger</p>
              <p className="text-figma-sm font-semibold text-fw-heading">BGP Established</p>
              <p className="text-figma-xs text-fw-bodyLight mt-0.5">Revenue starts when BGP reaches Established state</p>
            </div>
            <div>
              <p className="text-figma-xs text-fw-bodyLight">Preview Model</p>
              <p className="text-figma-sm font-semibold text-fw-heading">Fixed Rate</p>
              <p className="text-figma-xs text-fw-bodyLight mt-0.5">Fixed cost per contract term</p>
            </div>
            <div>
              <p className="text-figma-xs text-fw-bodyLight">GA Model</p>
              <p className="text-figma-sm font-semibold text-fw-heading">95th Percentile Burstable</p>
              <p className="text-figma-xs text-fw-bodyLight mt-0.5">Measured from hosted connection sub-interfaces</p>
            </div>
            <div>
              <p className="text-figma-xs text-fw-bodyLight">Contract Mapping</p>
              <p className="text-figma-sm font-semibold text-fw-heading">1 Contract : 4 AWS IDs</p>
              <p className="text-figma-xs text-fw-bodyLight mt-0.5">Single contract maps to 4 hosted connections</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
              <p className="text-figma-xs text-fw-bodyLight">Early Termination</p>
              <p className="text-figma-sm font-medium text-fw-heading">Trial: $0 / Fixed: ETF applies</p>
            </div>
            <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
              <p className="text-figma-xs text-fw-bodyLight">M2M Disconnect</p>
              <p className="text-figma-sm font-medium text-fw-heading">Immediate delete, pro-rated final invoice</p>
            </div>
            <div className="p-3 rounded-lg bg-fw-wash border border-fw-secondary">
              <p className="text-figma-xs text-fw-bodyLight">Speed Change</p>
              <p className="text-figma-sm font-medium text-fw-heading">Provision new 4, delete old 4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="card">
        <div className="card-header bg-fw-wash">
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">Current Plan</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-2xl font-bold text-fw-heading">{subscription.plan}</h4>
              <p className="text-figma-base text-fw-bodyLight">Billed {subscription.billingCycle.toLowerCase()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-figma-base font-medium ${
              subscription.status === 'Active'
                ? 'bg-fw-successLight text-fw-success'
                : 'bg-fw-warnLight text-fw-warn'
            }`}>
              {subscription.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {Object.entries(subscription.usage).map(([resource, { used, limit }]) => {
              const percentage = (used / limit) * 100;
              const isWarning = percentage > 80;

              return (
                <div key={resource} className="space-y-2">
                  <div className="flex items-center justify-between text-figma-base">
                    <span className="font-medium text-fw-body capitalize">{resource}</span>
                    <span className="text-fw-bodyLight">
                      {used} / {limit} {resource === 'bandwidth' ? 'Gbps' : resource === 'storage' ? 'GB' : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isWarning ? 'bg-fw-warnLight0' : 'bg-fw-cobalt-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {isWarning && (
                    <p className="flex items-center text-figma-sm text-fw-warn">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Approaching limit
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <h5 className="text-figma-base font-medium text-fw-body">Plan Features</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subscription.features.map((feature, index) => (
                <div key={index} className="flex items-center text-figma-base text-fw-body">
                  <Package className="h-4 w-4 text-fw-link mr-2" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Actions */}
      <div className="flex space-x-4">
        <Button
          variant="primary"
          onClick={() => setShowPricingModal(true)}
          className="flex-1"
        >
          Upgrade Plan
        </Button>
        <Button
          variant="outline"
          onClick={() => window.addToast?.({ type: 'info', title: 'Cancel Subscription', message: 'Subscription changes are handled by your AT&T account team.', duration: 3000 })}
          className="flex-1"
        >
          Cancel Subscription
        </Button>
      </div>

      {/* Pricing Plan Modal */}
      <PricingPlanModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentPlan={subscription.plan}
      />
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { CloudProvider, ConnectionType, BandwidthOption } from '../../types/connection';
import { DollarSign, CreditCard, Receipt, Clock, ChevronDown } from 'lucide-react';

interface BillingPreviewProps {
  provider?: CloudProvider;
  type?: ConnectionType;
  bandwidth?: BandwidthOption;
  redundancy?: boolean;
  configuration?: {
    bfdEnabled?: boolean;
    ddosProtection?: boolean;
    advancedMonitoring?: boolean;
    lmccContractTerm?: string;
  };
  location?: string;
  selectedPlanId?: string;
  onPlanChange?: (planId: string) => void;
  resiliencyLevel?: string;
  lmccBandwidth?: number;
}

export function BillingPreview({
  provider,
  type,
  bandwidth,
  redundancy,
  configuration,
  location,
  selectedPlanId = 'pay-as-you-go',
  onPlanChange,
  resiliencyLevel,
  lmccBandwidth,
}: BillingPreviewProps) {
  // AWS Last Mile is its own type since the GA promotion; the old Internet-to-Cloud
  // signature is kept for anything mid-flight that still carries it.
  const isLmcc = (configuration as any)?.isLmcc === true
    || type === 'AWS Last Mile'
    || (provider === 'AWS' && resiliencyLevel === 'maximum' && type === 'Internet to Cloud');
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Payment plans - filter by AWS Max phase when applicable
  const allPaymentPlans = [
    {
      id: 'trial',
      name: 'Trial',
      description: '30-day trial period',
      discount: 1.0,
      badge: '30 Days Free',
      color: 'green'
    },
    {
      id: 'pay-as-you-go',
      name: 'Pay as you go',
      description: 'Monthly billing',
      discount: 1.0,
      badge: 'Monthly',
      color: 'blue'
    },
    {
      id: '12-months',
      name: '12 Months',
      description: 'Save 15% with yearly billing',
      discount: 0.85,
      badge: 'Save 15%',
      color: 'blue'
    },
    {
      id: '24-months',
      name: '24 Months',
      description: 'Save 20% with 2-year plan',
      discount: 0.80,
      badge: 'Save 20%',
      color: 'blue'
    },
    {
      id: '36-months',
      name: '36 Months',
      description: 'Save 25% with 3-year plan',
      discount: 0.75,
      badge: 'Save 25%',
      color: 'purple'
    }
  ];

  // AWS Max Preview: only Trial available
  const paymentPlans = isLmcc
    ? allPaymentPlans.map(p => p.id === 'trial' ? p : { ...p, disabled: true, description: p.description + ' (GA - November 2026)' })
    : allPaymentPlans;

  const selectedPlan = paymentPlans.find(plan => plan.id === selectedPlanId) || paymentPlans[isLmcc ? 0 : 1];

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(event.target as Node)) {
        setShowPlanSelector(false);
      }
    };

    if (showPlanSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlanSelector]);

  // Position dropdown
  useEffect(() => {
    if (showPlanSelector && dropdownRef.current && hubRef.current) {
      const hubRect = hubRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = dropdownRef.current.offsetHeight;
      
      // Check if dropdown would go below viewport
      if (hubRect.bottom + dropdownHeight > viewportHeight) {
        dropdownRef.current.style.bottom = '100%';
        dropdownRef.current.style.top = 'auto';
      } else {
        dropdownRef.current.style.top = '100%';
        dropdownRef.current.style.bottom = 'auto';
      }
    }
  }, [showPlanSelector]);

  // Base pricing tiers
  const basePricing = {
    '100 Mbps': 199,
    '500 Mbps': 499,
    '1 Gbps': 999,
    '10 Gbps': 2499,
    '100 Gbps': 9999
  };

  // Provider multipliers
  const providerMultiplier = {
    'AWS': 1.0,
    'Azure': 1.1,
    'Google': 1.2,
    'Oracle': 1.15,
    'Equinix': 1.05
  };

  // AWS Max estimated pricing (placeholder - actual pricing via AT&T sales)
  const lmccPricing: Record<number, number> = {
    1000: 1249,   // 1 Gbps - estimated
    50: 299,
    100: 399,
    200: 499,
    300: 599,
    400: 699,
    500: 849,
    2000: 1999,
    5000: 3499,
    10000: 5999,
    20000: 10999,
    50000: 22999,
    100000: 39999,
  };

  // Calculate line items
  const lineItems: Array<{ description: string; amount: number; note?: string }> = [];

  if (isLmcc) {
    // LMCC-specific pricing
    const bw = lmccBandwidth || 1000;
    const perPathCost = lmccPricing[bw] || 1249;
    const bwLabel = bw >= 1000 ? `${bw / 1000} Gbps` : `${bw} Mbps`;

    lineItems.push({
      description: 'AWS Max Connection (4 paths)',
      amount: 0,
      note: 'Maximum Resiliency'
    });

    lineItems.push({
      description: `${bwLabel} x 4 paths`,
      amount: perPathCost * 4,
    });

    lineItems.push({
      description: 'Transport (MPLS + Internet)',
      amount: 0,
      note: 'Included'
    });

    const contractTerm = configuration?.lmccContractTerm || 'trial';
    if (contractTerm === 'trial') {
      lineItems.push({
        description: 'Trial Contract',
        amount: 0,
        note: 'Zero-penalty disconnect'
      });
    }
  } else {
    // Standard pricing
    // Connection type line item
    if (type) {
      lineItems.push({
        description: `${type} Connection`,
        amount: 0
      });
    }

    // Region line item
    if (location) {
      lineItems.push({
        description: `${location} Region`,
        amount: 0
      });
    }

    // Base connection cost
    if (bandwidth) {
      const baseAmount = basePricing[bandwidth];
      lineItems.push({
        description: `${bandwidth} Base Connection`,
        amount: baseAmount
      });

      // Provider adjustment
      if (provider) {
        const multiplier = providerMultiplier[provider];
        const adjustment = baseAmount * (multiplier - 1);
        if (adjustment !== 0) {
          lineItems.push({
            description: `Platform Fee`,
            amount: adjustment
          });
        }
      }
    } else {
      lineItems.push({
        description: 'Base Connection',
        amount: 999
      });
    }

    // Redundancy cost
    if (redundancy) {
      lineItems.push({
        description: 'Redundant Path',
        amount: bandwidth ? basePricing[bandwidth] * 0.5 : 499
      });
    }

    // Additional features
    if (configuration?.bfdEnabled) {
      lineItems.push({
        description: 'BFD Monitoring',
        amount: 99
      });
    }

    if (configuration?.ddosProtection) {
      lineItems.push({
        description: 'DDoS Protection',
        amount: 299
      });
    }

    if (configuration?.advancedMonitoring) {
      lineItems.push({
        description: 'Advanced Monitoring',
        amount: 199
      });
    }
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const planDiscount = subtotal * (1 - selectedPlan.discount);
  const estimatedTax = (subtotal - planDiscount) * 0.1; // 10% tax after discount
  const total = subtotal - planDiscount + estimatedTax;

  // Get color classes based on plan
  const getPlanColorClasses = (plan: typeof selectedPlan) => {
    if (plan.id === 'trial') {
      return {
        bg: 'bg-fw-successLight',
        border: 'border-fw-success',
        text: 'text-fw-success',
        badgeBg: 'bg-fw-successLight',
        badgeText: 'text-fw-success'
      };
    } else if (plan.id === '36-months') {
      return {
        bg: 'bg-fw-purpleLight',
        border: 'border-fw-purpleLight',
        text: 'text-fw-purple',
        badgeBg: 'bg-fw-purpleLight',
        badgeText: 'text-fw-purple'
      };
    } else {
      return {
        bg: 'bg-brand-lightBlue',
        border: 'border-brand-blue/20',
        text: 'text-brand-blue',
        badgeBg: 'bg-brand-blue/10',
        badgeText: 'text-brand-blue'
      };
    }
  };

  const selectedPlanColors = getPlanColorClasses(selectedPlan);

  return (
    <div ref={hubRef} className="bg-fw-base rounded-xl border border-fw-secondary">
      <div className="p-4 border-b border-fw-secondary bg-fw-wash">
        <div className="flex items-center">
          <Receipt className="h-5 w-5 text-brand-blue mr-2" />
          <h3 className="text-figma-lg font-medium text-fw-heading tracking-[-0.03em]">Cost Summary</h3>
        </div>
      </div>

      <div className="p-4">
        {/* The total leads — one number understood at a glance; details on demand. */}
        <div className="mb-4">
          <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-widest mb-1">Estimated monthly</p>
          <p className="text-[28px] leading-none font-bold text-fw-heading tracking-[-0.03em] tabular-nums">
            ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            <span className="text-figma-sm font-medium text-fw-bodyLight tracking-normal ml-1">/mo</span>
          </p>
          {planDiscount > 0 && (
            <p className="text-figma-xs text-fw-success mt-1.5">
              Saving ${planDiscount.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo with the {selectedPlan.name.toLowerCase()} commitment.
            </p>
          )}
          {isLmcc && (
            <p className="text-figma-xs text-fw-bodyLight mt-1">
              Billing starts when the connection goes Live — never at key creation.
            </p>
          )}
        </div>

        <div className="mb-4 relative">
          <button
            onClick={() => setShowPlanSelector(!showPlanSelector)}
            className={`
              relative w-full inline-flex items-center justify-between px-3 py-2 text-figma-base font-medium rounded-lg
              transition-colors duration-200 border
              ${selectedPlanColors.bg} ${selectedPlanColors.border} ${selectedPlanColors.text}
            `}
          >
            {selectedPlan.name}
            <ChevronDown className={`h-4 w-4 ml-1.5 transition-transform duration-200 ${showPlanSelector ? 'rotate-180' : ''}`} />
          </button>

          {showPlanSelector && (
            <div 
              ref={dropdownRef}
              className="absolute left-0 right-0 mt-1 bg-fw-base rounded-lg shadow-lg border border-fw-secondary z-50"
            >
              {paymentPlans.map(plan => {
                const planColors = getPlanColorClasses(plan);
                return (
                  <button
                    key={plan.id}
                    disabled={(plan as any).disabled}
                    onClick={() => {
                      if ((plan as any).disabled) return;
                      onPlanChange?.(plan.id);
                      setShowPlanSelector(false);
                    }}
                    className={`
                      w-full px-4 py-2 text-left first:rounded-t-lg last:rounded-b-lg
                      ${(plan as any).disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-fw-wash'}
                      ${selectedPlanId === plan.id ? 'bg-fw-wash' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-figma-sm text-fw-heading">{plan.name}</span>
                      <span className={`
                        px-2 py-0.5 text-figma-sm rounded-full
                        ${planColors.badgeBg} ${planColors.badgeText}
                      `}>
                        {plan.badge}
                      </span>
                    </div>
                    <p className="text-figma-xs text-fw-bodyLight mt-0.5">{plan.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between py-1.5 text-figma-xs font-medium text-fw-link hover:underline no-rounded"
          aria-expanded={showDetails}
        >
          {showDetails ? 'Hide details' : 'See all details'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        {showDetails && (<>
        {/* Ledger - stacked layout for narrow sidebar */}
        <div className="space-y-0">
          {/* Charges */}
          {lineItems.filter(i => i.amount > 0).map((item, idx) => (
            <div key={`chg-${idx}`} className="flex items-baseline justify-between py-1.5 border-b border-fw-secondary">
              <span className="text-figma-xs text-fw-body pr-2">{item.description}</span>
              <span className="text-figma-xs font-semibold text-fw-heading whitespace-nowrap">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}

          {/* Included items */}
          {lineItems.filter(i => i.amount === 0).map((item, idx) => (
            <div key={`inc-${idx}`} className="flex items-baseline justify-between py-1">
              <span className="text-figma-xs text-fw-bodyLight pr-2">{item.description}</span>
              <span className="text-figma-xs text-fw-bodyLight whitespace-nowrap">{item.note || 'Included'}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-fw-secondary my-2" />

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-figma-xs text-fw-bodyLight">Subtotal</span>
            <span className="text-figma-xs font-medium text-fw-heading">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {planDiscount > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-figma-xs text-complementary-green">Discount</span>
              <span className="text-figma-xs font-medium text-complementary-green">-${planDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-figma-xs text-fw-bodyLight">Tax (10%)</span>
            <span className="text-figma-xs font-medium text-fw-heading">${estimatedTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t-2 border-fw-heading mt-2 pt-2 flex items-baseline justify-between">
          <span className="text-figma-sm font-bold text-fw-heading">Total</span>
          <span className="text-figma-sm font-bold text-brand-blue">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        </>)}

        {/* Notes */}
        {isLmcc && (
          <p className="text-[10px] text-fw-bodyLight mt-2 leading-tight">
            Estimated pricing — real amounts come from the billing system of record. Submitting is a provisioning request, never a charge.
          </p>
        )}

        {selectedPlan.id === 'trial' && (
          <div className="mt-2 flex items-center justify-between text-figma-xs text-complementary-green pt-2 border-t border-fw-secondary">
            <span className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Trial
            </span>
            <span className="font-medium">30 days free</span>
          </div>
        )}
      </div>
    </div>
  );
}
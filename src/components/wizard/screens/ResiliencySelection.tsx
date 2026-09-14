import { useMemo } from 'react';
import { Shield, ShieldCheck, Globe } from 'lucide-react';
import { getResiliencyConfig, Tier, getAvailableTiers } from '../../../data/providerResiliency';

export type ResiliencyLevel = Tier | '';

interface ResiliencySelectionProps {
  resiliencyLevel: ResiliencyLevel;
  onSelect: (level: ResiliencyLevel) => void;
  provider?: string;
  providers?: string[];
  type?: string;
}

const TIER_META = {
  // Honest protection copy (GA fork rule): say what each tier protects against, in customer terms.
  standard: { title: 'Standard', icon: Shield, subtitle: 'Default. Protects against a single device failing at one site.' },
  maximum: { title: 'Maximum', icon: ShieldCheck, subtitle: 'Survives the loss of paths, devices, and an entire datacenter in the metro.' },
  geodiversity: { title: 'Geodiversity', icon: Globe, subtitle: 'Survives the loss of an entire metro — paths land in different regions.' },
} as const;

export function ResiliencySelection({ resiliencyLevel, onSelect, provider, providers, type }: ResiliencySelectionProps) {
  const primaryProvider = provider || (providers && providers[0]) || '';

  const options = useMemo(() => {
    const tiers = getAvailableTiers();
    return tiers.map(tier => {
      const config = getResiliencyConfig(primaryProvider, tier);
      const meta = TIER_META[tier];
      return {
        id: tier,
        title: meta.title,
        subtitle: meta.subtitle,
        icon: meta.icon,
        providerTierName: config.providerName,
        sla: config.sla,
        description: config.architecture,
        details: config.details,
        uiLabel: config.uiLabel,
      };
    });
  }, [primaryProvider]);

  return (
    <div className="space-y-6">
      <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] text-center mb-2">
        Choose Your Resiliency Level
      </h3>
      {primaryProvider && (
        <p className="text-figma-base text-fw-bodyLight text-center mb-6">
          {primaryProvider} maps these to: {options.map(o => o.providerTierName).join(' / ')}
        </p>
      )}

          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {options.map((option) => {
              const isSelected = resiliencyLevel === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  data-testid={`resiliency-option-${option.id}`}
                  onClick={() => onSelect(option.id)}
                  className={`
                    p-6 border-2 rounded-2xl text-left transition-all duration-200
                    ${isSelected
                      ? 'border-fw-active bg-fw-primary shadow-lg transform scale-[1.02]'
                      : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50 hover:bg-fw-base'
                    }
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-4
                    ${isSelected ? 'bg-white/20' : 'bg-fw-wash border border-fw-secondary'}
                  `}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-fw-body'}`} />
                  </div>

                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`text-figma-base font-bold ${isSelected ? 'text-white' : 'text-fw-heading'}`}>
                      {option.title}
                    </h4>
                    {option.id === 'maximum' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase" style={{ backgroundColor: '#009fdb', color: '#fff' }}>
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className={`text-figma-xs font-medium mb-2 ${isSelected ? 'text-white/80' : 'text-fw-bodyLight'}`}>
                    {option.subtitle}
                  </p>

                  {primaryProvider && (
                    <p className={`text-figma-xs font-medium mb-2 ${isSelected ? 'text-white/90' : 'text-fw-link'}`}>
                      {primaryProvider}: {option.providerTierName}
                      {option.sla !== 'None' && option.sla !== 'No SLA' && ` - ${option.sla} SLA`}
                    </p>
                  )}

                  <p className={`text-figma-xs mb-3 ${isSelected ? 'text-white/70' : 'text-fw-bodyLight'}`}>
                    {option.description}
                  </p>

                  <ul className="space-y-1.5">
                    {option.details.map((detail, i) => (
                      <li key={i} className={`text-figma-xs flex items-center gap-2 ${isSelected ? 'text-white/60' : 'text-fw-bodyLight'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white/50' : 'bg-fw-bodyLight'}`} />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* AWS Max swivel-chair notice */}
          {primaryProvider === 'AWS' && resiliencyLevel === 'maximum' && type === 'Internet to Cloud' && (
            <div className="max-w-4xl mx-auto mt-6 flex items-start gap-3 p-4 rounded-xl bg-fw-accent border border-fw-active/20">
              <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-8 h-5 object-contain shrink-0 mt-0.5" />
              <div>
                <p className="text-figma-sm font-semibold text-fw-heading">You'll need to visit the AWS Console after this wizard</p>
                <p className="text-figma-xs text-fw-bodyLight mt-0.5">
                  AWS Max creates your order here in NetBond and generates an activation key. After submitting, you'll take that key to the AWS Interconnect Console to accept 4 hosted connections and create Virtual Interfaces. We'll walk you through it.
                </p>
              </div>
            </div>
          )}
    </div>
  );
}

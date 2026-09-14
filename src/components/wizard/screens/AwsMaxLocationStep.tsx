import { MapPin, Zap, Lock } from 'lucide-react';
import { getAllMetrosForPhase } from '../../../data/lmccService';

interface AwsMaxLocationStepProps {
  selectedMetroId: string | undefined;
  onSelect: (metroId: string) => void;
}

export function AwsMaxLocationStep({ selectedMetroId, onSelect }: AwsMaxLocationStepProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">
          Select your AWS Interconnect – last mile metro
        </h3>
        <p className="text-figma-base text-fw-bodyLight">
          AT&T AI-grade network connects via 4 hosted connections per metro.
        </p>
      </div>

      {/* Cobalt info card */}
      <div className="flex items-start gap-3 p-4 rounded-xl text-white" style={{ backgroundColor: '#0057b8' }}>
        <Zap className="w-4 h-4 shrink-0 mt-0.5 opacity-90" />
        <p className="text-figma-sm leading-relaxed">
          AWS Max uses 4 hosted connections per metro for Maximum Resiliency. AT&T auto-negotiates all BGP, VLAN, and IP parameters — no manual configuration required.
        </p>
      </div>

      {/* Metro grid */}
      <div className="grid grid-cols-2 gap-3">
        {getAllMetrosForPhase().map(metro => {
          const isSelected = selectedMetroId === metro.id;
          const isDisabled = !metro.available;

          return (
            <button
              key={metro.id}
              onClick={() => !isDisabled && onSelect(metro.id)}
              disabled={isDisabled}
              className={`
                relative w-full h-full text-left p-4 rounded-xl border-2 transition-all duration-150
                ${isDisabled
                  ? 'border-fw-secondary bg-fw-wash opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'border-fw-active bg-fw-primary text-white shadow-lg'
                  : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50 hover:bg-fw-base cursor-pointer'
                }
              `}
            >
              {isDisabled && (
                <Lock className="absolute top-3 right-3 w-3.5 h-3.5 text-fw-bodyLight" />
              )}

              <div className="flex items-start gap-2.5 mb-2">
                <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-white' : 'text-fw-link'}`} />
                <div>
                  <p className={`text-figma-sm font-semibold ${isSelected ? 'text-white' : 'text-fw-heading'}`}>
                    {metro.name}
                  </p>
                  <p className={`text-figma-xs font-medium ${isSelected ? 'text-white/70' : 'text-fw-bodyLight'}`}>
                    {metro.awsRegionLabel}
                  </p>
                </div>
              </div>

              {metro.available ? (
                <p className={`text-figma-xs ${isSelected ? 'text-white/80' : 'text-fw-bodyLight'}`}>
                  4 hosted connections · Auto-provisioned
                </p>
              ) : (
                <p className="text-figma-xs text-fw-bodyLight">
                  {metro.unavailableReason}
                </p>
              )}

            </button>
          );
        })}
      </div>
    </div>
  );
}

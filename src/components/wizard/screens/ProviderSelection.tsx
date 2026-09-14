import { CheckCircle2 } from 'lucide-react';
import { CloudProvider } from '../../../types/connection';
import { getAvailableProviders } from '../../../data/providerConnectionTypes';

interface ProviderSelectionProps {
  selectedProviders: CloudProvider[];
  onToggle: (provider: CloudProvider) => void;
  selectedType?: string;
}

const CLOUD_PROVIDERS: { id: CloudProvider; name: string; logo: string }[] = [
  {
    id: 'AWS',
    name: 'AWS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
  },
  {
    id: 'Azure',
    name: 'Microsoft Azure',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg',
  },
  {
    id: 'Google',
    name: 'Google Cloud',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
  },
  {
    id: 'Oracle',
    name: 'Oracle Cloud',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg',
  },
  {
    id: 'IBM',
    name: 'IBM Cloud',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
  },
  {
    id: 'Equinix',
    name: 'Equinix',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Equinix_logo.svg',
  },
  {
    id: 'Digital Realty',
    name: 'Digital Realty',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Digital_Realty_TM_Brandmark_RGB_Black.svg',
  },
  {
    id: 'Centersquare',
    name: 'Centersquare',
    logo: 'https://centersquaredc.com/hs-fs/hubfs/Center-Square-Primary-Wordmark-Black-RGB.png?width=2338&height=2339&name=Center-Square-Primary-Wordmark-Black-RGB.png',
  },
  {
    id: 'CoreSite',
    name: 'CoreSite',
    logo: 'https://www.coresite.com/hubfs/CoreSite-AMT-Logo-1.svg',
  },
  {
    id: 'DataBank',
    name: 'DataBank',
    logo: 'https://www.databank.com/wp-content/themes/databank/assets/images/content/DB-logo-dark.svg',
  },
  {
    id: 'Cisco Jasper',
    name: 'Cisco Jasper',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg',
  },
];

export function ProviderSelection({
  selectedProviders,
  onToggle,
  selectedType,
}: ProviderSelectionProps) {
  const availableProviders = getAvailableProviders(selectedType);
  return (
    <div className="space-y-6">
      <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] text-center mb-8">
        Select Your Cloud Providers
      </h3>

          <div className="text-center mb-8">
            <p className="text-figma-sm text-fw-bodyLight mt-2">
              {selectedType === 'Cloud to Cloud'
                ? 'Select two or more clouds to link through one Hub'
                : selectedType ? `Providers that support ${selectedType}` : 'Choose one or more providers for your connection'}
            </p>
            {selectedProviders.length > 0 && (
              <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-fw-primary text-white text-figma-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selectedProviders.length} selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {CLOUD_PROVIDERS.map((provider) => {
              const isSelected = selectedProviders.includes(provider.id);
              const isDisabled = !availableProviders.includes(provider.id);
              return (
                <div key={provider.id} className="relative flex">
                  <button
                    onClick={() => !isDisabled && onToggle(provider.id)}
                    disabled={isDisabled}
                    className={`
                      w-full py-12 px-8 border-2 rounded-2xl wizard-card network-option transition-all duration-200
                      ${isDisabled
                        ? 'border-fw-secondary bg-fw-wash opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'border-fw-active bg-fw-primary shadow-lg transform scale-[1.02]'
                        : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50 hover:bg-fw-base'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center">
                      <img
                        src={provider.logo}
                        alt={provider.name}
                        onError={(e) => {
                          // Replace broken image with text fallback
                          const target = e.currentTarget;
                          const parent = target.parentElement;
                          if (parent) {
                            const span = document.createElement('span');
                            span.className = `text-figma-lg font-bold tracking-tight ${isSelected && !isDisabled ? 'text-white' : 'text-fw-heading'}`;
                            span.textContent = provider.name.toUpperCase();
                            target.replaceWith(span);
                          }
                        }}
                        className={`
                          h-12 object-contain transition-all duration-300
                          ${isSelected && !isDisabled
                            ? 'brightness-0 invert'
                            : 'filter grayscale hover:filter-none'
                          }
                        `}
                      />
                    </div>
                  </button>

                  {isDisabled && (
                    <span
                      className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium"
                      style={{ color: '#686e74', backgroundColor: 'rgba(104,110,116,0.16)' }}
                    >
                      Not available for this type
                    </span>
                  )}

                  {isSelected && !isDisabled && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-6 w-6 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
    </div>
  );
}

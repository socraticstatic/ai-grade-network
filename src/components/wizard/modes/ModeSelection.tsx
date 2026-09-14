import { ChevronRight, X, Info } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';

interface ModeSelectionProps {
  onModeSelect: (mode: 'step-by-step' | 'visual') => void;
  onCancel: () => void;
}

export function ModeSelection({ onModeSelect, onCancel }: ModeSelectionProps) {
  const modes = [
    {
      id: 'step-by-step' as const,
      name: 'Guided Setup',
      description: 'Guided connection setup with detailed configuration options',
      attIcon: 'checklist' as const,
      iconBg: 'bg-[#0057B8]',
      ctaColor: 'text-[#0057B8]',
      disabled: false
    },
    {
      id: 'visual' as const,
      name: 'Network Designer',
      description: 'Design your network topology using an interactive canvas',
      attIcon: 'hub' as const,
      iconBg: 'bg-[#009FDB]',
      ctaColor: 'text-[#009FDB]',
      disabled: false
    }
  ];

  return (
    <div className="min-h-[600px] flex items-center justify-center p-8 bg-gradient-to-b from-[#dce9f5] via-[#e8f0f8] to-fw-wash rounded-2xl">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em]">Create New Connection</h1>
          <p className="mt-3 text-figma-base font-medium text-fw-body">
            Choose your preferred method to create and configure your network connection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modes.map((mode) => {
            return (
              <button
                key={mode.id}
                onClick={() => !mode.disabled && onModeSelect(mode.id)}
                disabled={mode.disabled}
                className={`
                  relative group bg-fw-base p-8 mode-selection-card shadow-sm border
                  ${mode.disabled ? 'border-fw-secondary opacity-60 cursor-not-allowed' : 'border-fw-secondary hover:shadow-lg hover:border-fw-active'}
                  transition-all duration-300 ease-in-out rounded-2xl text-center
                `}
              >
                <div className="flex flex-col items-center">
                  <div className={`
                    inline-flex items-center justify-center w-12 h-12 rounded-lg
                    ${mode.disabled ? 'bg-fw-neutral text-fw-disabled' : mode.iconBg}
                    mb-4 ${!mode.disabled && 'group-hover:scale-110 transition-transform duration-300'}
                  `}>
                    <AttIcon name={mode.attIcon} className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">
                    {mode.name}
                  </h3>

                  <p className="text-figma-base font-medium text-fw-body leading-relaxed">
                    {mode.description}
                  </p>

                  {!mode.disabled && (
                    <div className={`mt-6 inline-flex items-center text-figma-base font-medium ${mode.ctaColor}`}>
                      <ChevronRight className="mr-1 h-5 w-5" />
                      Get Started
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="inline-flex items-center h-9 px-5 text-figma-base font-medium text-fw-link bg-fw-base border border-fw-secondary rounded-full hover:bg-fw-wash transition-colors"
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancel
          </button>
          <p className="text-figma-base text-fw-bodyLight flex items-center">
            <Info className="h-4 w-4 mr-1.5" />
            Need help choosing? Check out our{' '}
            <a
              href="/glossary"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fw-link hover:text-fw-linkHover font-medium ml-1"
            >
              connection creation guide
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

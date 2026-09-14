import { Check } from 'lucide-react';

interface WizardStepProps {
  title: string;
  description: string;
  number: number;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
  /** When provided, the step circle becomes a button to jump back to this step. */
  onClick?: () => void;
}

export function WizardStep({
  title,
  number,
  isActive,
  isCompleted,
  isLast = false,
  onClick,
}: WizardStepProps) {
  const circleClasses = `
    relative flex items-center justify-center w-8 h-8 rounded-full shrink-0
    transition-colors duration-300 ease-in-out
    ${isCompleted
      ? 'bg-fw-primary text-white'
      : isActive
        ? 'bg-fw-primary text-white ring-4 ring-fw-primary/20'
        : 'bg-fw-disabled text-white'
    }
  `;
  const circleInner = isCompleted ? (
    <Check className="w-3.5 h-3.5" />
  ) : (
    <span className="text-[11px] font-bold leading-none tabular-nums">{number}</span>
  );
  return (
    <div className={isLast ? 'shrink-0' : 'flex-1'}>
      <div className="flex items-center">
        {/* Step circle with centered label */}
        <div className="relative flex-shrink-0">
          {/* Gentle breathing ring for steps 7 and 8 when active */}
          {isActive && (number === 7 || number === 8) && (
            <span
              className="animate-pulse absolute inset-[-5px] rounded-full ring-2 ring-fw-primary/30 pointer-events-none"
              style={{ animationDuration: '2.8s' }}
            />
          )}
          {onClick ? (
            <button
              type="button"
              onClick={onClick}
              title={`Go to ${title}`}
              aria-label={`Go to ${title}`}
              className={`${circleClasses} cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-fw-primary`}
            >
              {circleInner}
            </button>
          ) : (
            <div title={title} className={circleClasses}>
              {circleInner}
            </div>
          )}
          {/* Label centered under circle */}
          {isActive && (
            <p className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-figma-xs font-semibold text-fw-primary whitespace-nowrap">{title}</p>
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className="flex-1 h-0.5 mx-1.5 bg-fw-secondary rounded-full overflow-hidden">
            <div className={`
              h-full origin-left
              transition-all duration-500 ease-in-out
              ${isCompleted ? 'bg-fw-primary scale-x-100' : 'scale-x-0'}
            `} />
          </div>
        )}
      </div>
      {/* Spacer for label height */}
      <div className="h-7" />
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { getTermById, GlossaryTerm } from '../../data/glossary';
import { useNavigate } from 'react-router-dom';

interface TerminologyTooltipProps {
  termId: string;
  children?: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  className?: string;
  iconClassName?: string;
  variant?: 'default' | 'inline' | 'minimal';
}

export function TerminologyTooltip({
  termId,
  children,
  placement = 'top',
  showIcon = true,
  className = '',
  iconClassName = '',
  variant = 'default'
}: TerminologyTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const term = getTermById(termId);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = triggerRect.top + scrollY - tooltipRect.height - 8;
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + scrollY + 8;
          left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left + scrollX - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + scrollX + 8;
          break;
      }

      left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));
      top = Math.max(16, top);

      setPosition({ top, left });
    }
  }, [isVisible, placement]);

  if (!term) {
    return children ? <>{children}</> : null;
  }

  const Icon = term.icon;

  const handleLearnMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    navigate('/glossary', { state: { termId } });
  };

  const renderTrigger = () => {
    if (children) {
      return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
          {children}
          {showIcon && (
            <HelpCircle className={`h-3.5 w-3.5 text-fw-link hover:text-fw-linkHover transition-colors cursor-help ${iconClassName}`} />
          )}
        </span>
      );
    }

    if (variant === 'minimal') {
      return (
        <HelpCircle className={`h-4 w-4 text-fw-bodyLight hover:text-fw-link transition-colors cursor-help ${iconClassName}`} />
      );
    }

    return (
      <div className={`inline-flex items-center gap-1.5 group cursor-help ${className}`}>
        <span className="text-figma-base font-medium text-fw-body group-hover:text-fw-link transition-colors">
          {term.term}
        </span>
        <HelpCircle className={`h-3.5 w-3.5 text-fw-link group-hover:text-fw-linkHover transition-colors ${iconClassName}`} />
      </div>
    );
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {renderTrigger()}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-80 bg-fw-base rounded-lg shadow-2xl border border-fw-secondary overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className="p-4">
            <div className="flex items-start gap-3 mb-3">
              {Icon && (
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-fw-accent flex items-center justify-center">
                  <Icon className="h-5 w-5 text-fw-link" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-fw-heading mb-1 tracking-[-0.03em]">
                  {term.term}
                </h4>
                <p className="text-figma-sm text-fw-link font-medium uppercase tracking-wide">
                  {term.category}
                </p>
              </div>
            </div>

            <p className="text-figma-base text-fw-body leading-relaxed mb-3">
              {term.detailedDefinition}
            </p>

            {term.example && (
              <div className="p-3 bg-fw-accent rounded-lg border border-fw-active mb-3">
                <p className="text-figma-sm font-medium text-fw-heading mb-1">Example</p>
                <p className="text-figma-sm text-fw-body leading-relaxed italic">
                  {term.example}
                </p>
              </div>
            )}

            {term.relatedTerms && term.relatedTerms.length > 0 && (
              <div className="mb-3">
                <p className="text-figma-sm font-medium text-fw-body mb-2">Related Terms</p>
                <div className="flex flex-wrap gap-1.5">
                  {term.relatedTerms.map(relatedId => {
                    const relatedTerm = getTermById(relatedId);
                    return relatedTerm ? (
                      <TerminologyTooltip
                        key={relatedId}
                        termId={relatedId}
                        variant="minimal"
                      >
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-fw-neutral hover:bg-fw-accent text-figma-sm text-fw-body hover:text-fw-link rounded-full transition-colors cursor-pointer">
                          {relatedTerm.term}
                        </span>
                      </TerminologyTooltip>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleLearnMore}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-fw-cobalt-600 hover:bg-fw-ctaPrimaryHover text-white text-figma-base font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
            >
              <span>Learn More</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Tooltip Arrow */}
          <div
            className={`absolute w-3 h-3 bg-fw-base border transform rotate-45 ${
              placement === 'top'
                ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b border-fw-secondary'
                : placement === 'bottom'
                ? 'top-[-6px] left-1/2 -translate-x-1/2 border-l border-t border-fw-secondary'
                : placement === 'left'
                ? 'right-[-6px] top-1/2 -translate-y-1/2 border-t border-r border-fw-secondary'
                : 'left-[-6px] top-1/2 -translate-y-1/2 border-b border-l border-fw-secondary'
            }`}
          />
        </div>
      )}
    </>
  );
}

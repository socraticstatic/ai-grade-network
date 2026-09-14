import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const element = elementRef.current;
    if (!element) return;

    // Get all focusable elements
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element when trap is activated
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // If shift + tab on first element, move to last
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
      // If tab on last element, move to first
      else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return elementRef;
}
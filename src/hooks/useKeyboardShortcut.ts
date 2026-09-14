import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description?: string;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 * @param shortcuts Array of keyboard shortcut configurations
 * @param enabled Whether the shortcuts are active (default: true)
 */
export function useKeyboardShortcut(
  shortcuts: KeyboardShortcut | KeyboardShortcut[],
  enabled: boolean = true
): void {
  const shortcutsArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
  const handlersRef = useRef<KeyboardShortcut[]>(shortcutsArray);

  // Update ref when shortcuts change
  useEffect(() => {
    handlersRef.current = shortcutsArray;
  }, [shortcutsArray]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    const active = document.activeElement as HTMLElement | null;
    const isInput = (el: HTMLElement | null) =>
      el && (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable ||
        el.getAttribute('role') === 'textbox' ||
        el.getAttribute('role') === 'searchbox' ||
        el.closest('input, textarea, select, [contenteditable="true"]')
      );
    if (isInput(target) || isInput(active)) {
      return;
    }

    handlersRef.current.forEach((shortcut) => {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler(event);
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  // Detect OS for proper modifier key labels
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.meta) parts.push('⌘');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}

/**
 * Check if user is on Mac
 */
export function isMacOS(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

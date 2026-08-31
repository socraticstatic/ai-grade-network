import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

/**
 * Appearance control — lives in the UtilityOverflow menu, NOT the bar
 * itself: the 24 frozen light-mode Figma boards are pixel ground truth, so
 * dark mode must add zero pixels to any captured light screen. A menu row is
 * still one click away, which is the overflow's contract for occasional
 * controls.
 *
 * stopPropagation keeps the menu open across segment clicks so the theme
 * change is watchable in place (the menu container closes on any click).
 */
const MODES = [
  { key: 'light', label: 'Light', Icon: Sun },
  { key: 'dark', label: 'Dark', Icon: Moon },
  { key: 'system', label: 'Match system', Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { mode, setMode, isDark } = useTheme();
  const Current = isDark ? Moon : Sun;

  return (
    <div
      data-testid="theme-toggle"
      onClick={e => e.stopPropagation()}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2"
    >
      <Current className="h-4 w-4 shrink-0 text-fw-body" aria-hidden="true" />
      <span className="flex-1 text-left text-figma-sm text-fw-body">Appearance</span>
      <span
        role="radiogroup"
        aria-label="Appearance"
        className="flex items-center gap-0.5 rounded-full bg-fw-neutral p-0.5"
      >
        {MODES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={mode === key}
            aria-label={label}
            title={label}
            data-testid={`theme-mode-${key}`}
            onClick={() => setMode(key)}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              mode === key
                ? 'bg-fw-base text-fw-heading shadow-sm'
                : 'text-fw-bodyLight hover:text-fw-heading'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ))}
      </span>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Globe, Clock } from 'lucide-react';

/**
 * Neutral "attention" pill — the de-amber replacement for every
 * public / uncommitted / exposed / pending state.
 *
 * Meaning is carried by a small leading icon (globe = internet-exposed,
 * clock = pending) and the copy, never by a warm color. The neutral text
 * token on the page-wash fill reads at AA+ without hue — fw-bodyLight was
 * darkened to #5c6167 specifically to clear 4.5:1 on fw-wash, which the
 * Tailwind-default slate this used to hard-code never accounted for.
 */
const ICONS = { globe: Globe, clock: Clock } as const;

export function AttentionTag({ icon, children }: { icon?: 'globe' | 'clock'; children: ReactNode }) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-fw-secondary bg-fw-wash px-2 py-0.5 text-[11px] font-medium tabular-nums text-fw-bodyLight">
      {Icon && <Icon size={13} className="text-fw-bodyLight" aria-hidden="true" />}
      {children}
    </span>
  );
}

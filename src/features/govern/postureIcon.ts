import { AttIconName } from '../../components/icons/att-icons';

/**
 * Maps postureCatalog iconKeys (defined in src/engine/state-actions.ts) to
 * real AT&T icon names. postureCatalog iconKeys are domain-shorthand
 * ('net', 'shield', 'tag', 'cost', 'gauge') — none of them are valid
 * AttIcon registry keys on their own, so cards rendered with the raw
 * iconKey come out blank. This is the single translation point.
 */
const POSTURE_ICON_MAP: Record<string, AttIconName> = {
  net: 'ethernet',
  shield: 'check-shield',
  tag: 'checklist',
  cost: 'bill',
  gauge: 'high-meter',
};

const FALLBACK: AttIconName = 'question-circle';

export function postureIcon(iconKey: string): AttIconName {
  return POSTURE_ICON_MAP[iconKey] ?? FALLBACK;
}

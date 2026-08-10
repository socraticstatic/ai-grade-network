import { ReactNode } from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: LucideIcon;
  subItems?: NavigationItem[];
}

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  /** Accessible name/title for the count badge, when a bare number would
   *  inherit the tab's own label and read as the wrong noun (e.g. a
   *  violations count on a "Policies" tab). Falls back to no explicit name
   *  when omitted — copy-only addition, no visible text change. */
  countLabel?: string;
  disabled?: boolean;
  category?: string;
}
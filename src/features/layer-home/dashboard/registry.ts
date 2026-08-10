import { createContext, useContext, type ComponentType } from 'react';
import { Gauge, Target, ClipboardCheck, PiggyBank, Coins, type LucideIcon } from 'lucide-react';
import { EstateFiguresWidget } from './widgets/EstateFiguresWidget';
import { StandingIntentsWidget } from './widgets/StandingIntentsWidget';
import { AssessmentFindingsWidget } from './widgets/AssessmentFindingsWidget';
import { MoneyOnTheTableWidget } from './widgets/MoneyOnTheTableWidget';
import { TokenBudgetsWidget } from './widgets/TokenBudgetsWidget';

export type Surface = 'naas' | 'ai';

export interface LayerWidgetProps { editing?: boolean }

export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  surface: Surface | 'both';
  defaultSize: { w: 1 | 2; h: 1 | 2 };
  component: ComponentType<LayerWidgetProps>;
}

// Widgets self-register by being spread in here as they are built (Task 8
// assembles the final object). Kept as a plain object so the registry is a
// single, greppable source of truth.
export const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  'standing-intents': {
    id: 'standing-intents', title: 'Standing intents',
    description: 'Each declared intent, whether it is holding, and the one-click fix.',
    icon: Target, category: 'Govern', surface: 'both', defaultSize: { w: 2, h: 2 },
    component: StandingIntentsWidget,
  },
  'estate-figures': {
    id: 'estate-figures', title: 'Estate at a glance',
    description: 'The live figures for this layer.',
    /* w:1. This card used to hold four figures and earned a w:2, two-up
       layout for them. The phase-0 metric audit's cuts (rows 4-7 on NaaS,
       14-16 on AI) took that down to one figure on NaaS and one-or-two on
       AI, and a w:2 card holding one figure left half the card empty
       (fix-wave review finding 2). w:1 matches the smaller content; the
       widget's own inner grid still goes two-up on the rare render with two
       figures (see EstateFiguresWidget.tsx). */
    icon: Gauge, category: 'Overview', surface: 'both', defaultSize: { w: 1, h: 1 },
    component: EstateFiguresWidget,
  },
  'assessment-findings': {
    id: 'assessment-findings', title: 'What the assessment found',
    description: 'Recoverable spend, security events, invisible share.',
    icon: ClipboardCheck, category: 'Overview', surface: 'both', defaultSize: { w: 1, h: 1 },
    component: AssessmentFindingsWidget,
  },
  'money-on-the-table': {
    id: 'money-on-the-table', title: 'Money on the table',
    description: 'Savings still available, ranked, with a one-click review.',
    icon: PiggyBank, category: 'Cost', surface: 'naas', defaultSize: { w: 1, h: 1 },
    component: MoneyOnTheTableWidget,
  },
  'token-budgets': {
    id: 'token-budgets', title: 'Token budgets',
    description: 'Per-policy token budgets, with Enforce on any draft.',
    icon: Coins, category: 'Govern', surface: 'ai', defaultSize: { w: 1, h: 1 },
    component: TokenBudgetsWidget,
  },
};

/** Widgets valid on `surface`: those tagged for it plus the shared ('both').
 *  The `reg` arg defaults to the real registry; tests pass their own. */
export function widgetsForSurface(
  surface: Surface,
  reg: Record<string, WidgetDef> = WIDGET_REGISTRY,
): WidgetDef[] {
  return Object.values(reg).filter(w => w.surface === surface || w.surface === 'both');
}

/**
 * The default board per surface, as an ordered list of widget ids.
 *
 * The layer's own ACTIONABLE widget leads; Standing intents follows it. Standing
 * intents is the most important idea on this product and its weakest opener: on
 * an estate where nobody has declared one, it renders its empty state, so
 * leading with it opens the home page on a blank slate and four setup buttons
 * while every widget below is already stating figures. Money on the table and
 * Token budgets each open with a number and a one-click reviewable draft, which
 * is the product showing it already read the estate. The ask for a declaration
 * then lands after the payoff instead of before it.
 *
 * Seeding intents so the flagship is never empty was the other way to fix this,
 * and is deliberately not done: a pre-declared standing intent is a promise the
 * user never made, and this product's whole posture is that a human commits.
 */
export const DEFAULT_LAYOUT: Record<Surface, string[]> = {
  naas: ['money-on-the-table', 'standing-intents', 'estate-figures', 'assessment-findings'],
  ai:   ['token-budgets', 'standing-intents', 'estate-figures', 'assessment-findings'],
};

// The active layer, provided by LayerDashboard so surface-aware widgets can read
// it without a data prop.
export const LayerContext = createContext<Surface>('naas');
export const useLayer = (): Surface => useContext(LayerContext);

import type { AttIconName } from '../icons/att-icons';

export interface CuratedNavItem {
  label: string;
  to: string;
  icon: AttIconName;
  description: string;
}

/** A titled group of rail items (e.g. the AI Gateway's "Governance"). An
 *  untitled group renders as bare items. */
export interface RailSection {
  title?: string;
  items: CuratedNavItem[];
}

export interface NavLayer {
  key: 'naas' | 'ai';
  label: string;
  /** What this layer is, in the customer's words. */
  blurb: string;
  /** One-breath name for the rail and the stack visuals. */
  tagline: string;
  /** The layer's overview — first in the left rail, the landing when you pick
   *  the layer up top. A layer opens onto its Home, never onto a verb. */
  home: CuratedNavItem;
  items: CuratedNavItem[];
  /**
   * A bespoke rail for the layer, adopted from the AI Gateway design
   * (spec: 2026-07-24-ai-gateway-figma-integration.md). When present it
   * REPLACES the generic Home+verbs rail; `home` and `items` stay authoritative
   * for the top tabs, the drawer, the palette and the stack surfaces.
   */
  railSections?: RailSection[];
}

const DISCOVER: CuratedNavItem = {
  label: 'Discover', to: '/discover', icon: 'search',
  description: 'One scan — network, cloud and AI workflows',
};

/** The estate-level office: every task in one queue, every promise managed.
 *  NOT a top-bar place - tasks are state that follows you, so the bar's
 *  utility cluster carries them as a badge (MainNav) and the drawer as an
 *  item. Places stay few; state stays glanceable. */
const TASKS: CuratedNavItem = {
  label: 'Tasks', to: '/tasks', icon: 'checklist',
  description: 'Every task by lifecycle stage, every standing intent',
};

/**
 * NaaS and the AI Fabric each carry the full verb set. The verbs are the same
 * four everywhere — connect, govern, observe, control cost — because that is
 * the promise; what differs is what they act on.
 *
 * These are the two LIVE rows of the lifecycle × layer table (see
 * docs/superpowers/specs/2026-07-23-layer-first-ia-design.md). Users enter
 * through a layer; the verbs live inside it. A verb is never a top-level
 * destination.
 */
export const NAV_LAYERS: NavLayer[] = [
  {
    key: 'naas',
    label: 'NaaS',
    blurb: 'Network as a service — the paths, the policy on them, and what they cost.',
    tagline: 'The network layer',
    home: { label: 'Home', to: '/naas/home', icon: 'home', description: 'The network layer at a glance' },
    items: [
      { label: 'Connect', to: '/naas/connect', icon: 'cloud', description: 'Attach clouds and sites to the fabric' },
      { label: 'Govern', to: '/naas/govern', icon: 'check-shield', description: 'Policy on network paths' },
      { label: 'Observe', to: '/naas/observe', icon: 'high-meter', description: 'Path health and performance' },
      { label: 'Cost', to: '/naas/cost', icon: 'bill', description: 'Transport and egress cost control' },
    ],
  },
  {
    key: 'ai',
    label: 'AI Fabric',
    blurb: 'The token layer — model endpoints, the agents calling them, and their budgets.',
    tagline: 'The token layer',
    home: { label: 'Home', to: '/ai/home', icon: 'home', description: 'The token layer at a glance' },
    /* The AI rail speaks the SAME lifecycle as NaaS - four verb groups -
       with the gateway nouns nested at the stage they belong to. Attaching
       endpoints and issuing identities is Connect-stage work wherever the
       Figma's grouping filed it; Insights IS this layer's Observe; the
       Savings view is its Cost. One vocabulary, so a viewer's knowledge
       transfers across layers (task-lifecycle org spec, move 1). */
    railSections: [
      {
        items: [
          { label: 'AI Fabric', to: '/ai/home', icon: 'home', description: 'The token layer at a glance' },
        ],
      },
      {
        title: 'Connect',
        items: [
          { label: 'Providers', to: '/ai/providers', icon: 'apis', description: 'Model endpoints and neoclouds' },
          { label: 'Virtual keys', to: '/ai/keys', icon: 'lock', description: 'Agent identities and scopes' },
        ],
      },
      {
        title: 'Govern',
        items: [
          { label: 'Policies', to: '/ai/govern', icon: 'check-shield', description: 'Token policy and guardrails' },
          { label: 'Teams & limits', to: '/ai/teams', icon: 'person-group', description: 'Budgets and limits by team' },
        ],
      },
      {
        title: 'Observe',
        items: [
          { label: 'Insights', to: '/ai/observe', icon: 'high-meter', description: 'Traffic, savings and requests' },
        ],
      },
      {
        title: 'Cost',
        items: [
          { label: 'Savings', to: '/ai/cost', icon: 'bill', description: 'What routing and caching hold back' },
        ],
      },
    ],
    items: [
      { label: 'Connect', to: '/ai/connect', icon: 'apis', description: 'Attach model endpoints and neoclouds' },
      { label: 'Govern', to: '/ai/govern', icon: 'check-shield', description: 'Token policy and guardrails' },
      { label: 'Observe', to: '/ai/observe', icon: 'high-meter', description: 'Prompt traces and agent decisions' },
      { label: 'Cost', to: '/ai/cost', icon: 'bill', description: 'Token budgets and spend' },
    ],
  },
];

/**
 * Flat list, in render order. Discover first, then every verb of every layer.
 * Single source of truth for the curated AI-grade network nav — consumed by
 * MainNav.tsx, NavigationContext.tsx and MobileMenu.tsx. Do not duplicate it,
 * import it. Consumers that need the grouping read NAV_LAYERS instead.
 */
export const NAV_ITEMS: CuratedNavItem[] = [DISCOVER, ...NAV_LAYERS.flatMap(d => d.items)];

/**
 * The live layers in elevation order — AI Fabric rides on the network, so it
 * draws on top. The stack rail and the Discover stack read this, never
 * NAV_LAYERS, whose order is the bar's reading order.
 */
export const STACK_LAYERS: NavLayer[] = (['ai', 'naas'] as const).map(
  key => NAV_LAYERS.find(l => l.key === key)!,
);

/**
 * Same verb, other layer: /ai/cost ↔ /naas/cost. The stack rail's whole
 * promise — move vertically, keep your place in the lifecycle. Falls back to
 * the target layer's first item when the current path carries no verb (or a
 * verb the target does not offer), so the hop never 404s.
 */
export function counterpartPath(pathname: string, target: NavLayer['key']): string {
  const layer = NAV_LAYERS.find(l => l.key === target);
  if (!layer) return '/discover';
  const verb = pathname.match(/^\/(?:ai|naas)\/([^/]+)/)?.[1];
  const candidate = verb && layer.items.find(i => i.to === `/${target}/${verb}`);
  return candidate ? candidate.to : layer.items[0].to;
}

/** Discover, alone above both domains. */
export const NAV_DISCOVER: CuratedNavItem = DISCOVER;

/** Tasks: the queue and the intent office. Utility-cluster state, not a place. */
export const NAV_TASKS: CuratedNavItem = TASKS;

/**
 * The left rail for a layer: Home first, then the four verbs. The rail is the
 * lifecycle switch inside a layer — persistent, one click, no menu — while the
 * top tabs switch layers. Home leads because a layer opens onto its overview.
 */
export function layerRail(layer: NavLayer): CuratedNavItem[] {
  return [layer.home, ...layer.items];
}

/** The rail as sections: a layer's bespoke rail when it has one, else the
 *  generic Home+verbs as a single untitled section. */
export function railSectionsFor(layer: NavLayer): RailSection[] {
  return layer.railSections ?? [{ items: layerRail(layer) }];
}

/** Every distinct destination the layer's rail reaches — the drawer and the
 *  command palette read this so no rail-only route is unreachable elsewhere. */
export function layerDestinations(layer: NavLayer): CuratedNavItem[] {
  const seen = new Set<string>();
  const out: CuratedNavItem[] = [];
  for (const item of railSectionsFor(layer).flatMap(s => s.items)) {
    if (!seen.has(item.to)) {
      seen.add(item.to);
      out.push(item);
    }
  }
  return out;
}

/** The layer a path belongs to (/naas/* → naas), or null for global routes
 *  like /discover. Drives the active top tab and whether the rail shows. */
export function layerForPath(pathname: string): NavLayer | null {
  const key = pathname.match(/^\/(ai|naas)(?:\/|$)/)?.[1] as NavLayer['key'] | undefined;
  return key ? NAV_LAYERS.find(l => l.key === key) ?? null : null;
}

/**
 * Is `href` the destination the viewer is currently on?
 *
 * Exact, or a parent of the current path. `/naas/connect` and `/ai/connect`
 * are different destinations sharing a label, so a bare `startsWith` on the
 * href is not enough — it would also light `/ai` for `/ai-fabric` if that
 * path ever came back.
 *
 * Lives here rather than in either nav because the desktop bar and the mobile
 * drawer are the same navigation seen at two widths. They disagreed: the bar
 * matched exact-or-parent, the drawer matched `pathname === item.to`, so a
 * deep link under a section highlighted nothing in the drawer and its parent
 * in the bar. One rule, one place.
 */
export function isNavRouteActive(pathname: string, href: string): boolean {
  // /manage owns the groups screens too; they are one destination in the nav.
  if (href === '/manage') {
    return pathname.startsWith('/manage') || pathname.startsWith('/groups');
  }
  return pathname === href || pathname.startsWith(href + '/');
}

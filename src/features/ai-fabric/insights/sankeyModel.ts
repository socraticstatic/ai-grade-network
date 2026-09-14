import type { CloudControl } from '../../../engine/types';
import { aiSpendRows, routeLabel, type AiSpendRow } from '../aiSpend';

/**
 * The Traffic-flow Sankey's data model: Identity → Source → Fabric route →
 * Provider/model, one path per metered identity, every value an
 * `aiSpendRows()` figure taken at call time.
 *
 * The Figma comp draws per-user rows over ingress sites and geographic
 * routes. Our estate has none of those facts — what it has is which identity
 * spent, at which model endpoint, over which egress path, to which provider.
 * Same anatomy, our nouns; inventing site or geography nodes would break
 * engine honesty.
 */

export type SankeyBasis = 'spend' | 'tokens' | 'budget';

export interface SankeyNode {
  id: string;
  col: 0 | 1 | 2 | 3;
  label: string;
  /** Sum of the paths through this node, in the graph's basis unit. */
  value: number;
  color: string;
}

export interface SankeyPath {
  /** The identity tag — one path per identity. */
  id: string;
  /** Node ids hop by hop: identity, source, route, destination. */
  nodes: [string, string, string, string];
  /** Ribbon thickness, in the graph's basis unit. */
  value: number;
  /** $ spendToday, regardless of basis. Meaningful only when basis is spend. */
  cost: number;
  /** $ held back vs routing everything external, floored at 0. */
  saved: number;
  hops: { identity: string; source: string; route: string; provider: string };
}

export interface SankeyGraph {
  nodes: SankeyNode[];
  paths: SankeyPath[];
  columns: { title: string; subtitle: string }[];
  totalValue: number;
  /**
   * Which unit `value` carries. Spend when any identity has metered money
   * today; otherwise token volume; otherwise budget ceilings, so the seeded
   * estate still draws its shape. The UI must title values accordingly —
   * dollars only when the basis is spend.
   */
  basis: SankeyBasis;
}

/** Cols 0-2 are structure, not series: all info blue. */
const NODE_BLUE = '#0074b3';

/** `modelCatalog().cloud` → the provider name the screens use. */
const PROVIDER_BY_CLOUD: Record<string, string> = { cw: 'CoreWeave', neb: 'Nebius' };
const EXTERNAL_PROVIDER = 'OpenAI (external)';

/** Col-3 series colors, per the pixel spec's data-viz ramp. */
const PROVIDER_COLORS: Record<string, string> = {
  CoreWeave: '#009fdb',
  Nebius: '#00388f',
  [EXTERNAL_PROVIDER]: '#00c9ff',
};
const EXTRA_PROVIDER_COLORS = ['#49eedc', '#5b3bee'];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

interface CatalogEntry {
  id: string;
  name: string;
  cloud: string | null;
  endpoint: string;
}
interface Route {
  tag: string;
  endpoint: string;
}

export function sankeyGraph(cc: CloudControl): SankeyGraph {
  const rows = aiSpendRows(cc);
  const routes = cc.modelRoutes() as Route[];
  const catalog = (cc.modelCatalog?.() ?? []) as CatalogEntry[];

  /* Basis fallback chain: spend, else tokens, else budget. Prices are all
     non-zero in this catalog, so tokens-without-spend is a defensive rung,
     not a reachable estate — but the chain is stated once, here, either way. */
  let basis: SankeyBasis = 'spend';
  let valueOf = (r: AiSpendRow) => r.spendToday;
  if (rows.every(r => r.spendToday === 0)) {
    if (rows.some(r => r.tokensToday > 0)) {
      basis = 'tokens';
      valueOf = r => r.tokensToday;
    } else {
      basis = 'budget';
      valueOf = r => r.budgetTokens;
    }
  }

  const nodes: SankeyNode[] = [];
  const byId = new Map<string, SankeyNode>();
  const touch = (id: string, col: 0 | 1 | 2 | 3, label: string, color: string, v: number) => {
    const found = byId.get(id);
    if (found) {
      found.value += v;
      return found;
    }
    const node: SankeyNode = { id, col, label, value: v, color };
    byId.set(id, node);
    nodes.push(node);
    return node;
  };

  /* Providers beyond the named three take the ramp's tail colors in order of
     first appearance, cycling if the estate ever outgrows the ramp. */
  const extraColors = new Map<string, string>();
  const colorFor = (provider: string) =>
    PROVIDER_COLORS[provider] ??
    (extraColors.get(provider) ??
      (() => {
        const c = EXTRA_PROVIDER_COLORS[extraColors.size % EXTRA_PROVIDER_COLORS.length];
        extraColors.set(provider, c);
        return c;
      })());

  const paths: SankeyPath[] = rows.map(r => {
    const route = routes.find(x => x.tag === r.tag);
    if (!route) {
      // aiSpendRows() already threw for this; kept for the type narrowing.
      throw new Error(`sankeyModel: no route for metered identity "${r.tag}"`);
    }
    const cloud = catalog.find(m => m.id === r.modelId)?.cloud ?? null;
    const provider =
      cloud === null ? EXTERNAL_PROVIDER : PROVIDER_BY_CLOUD[cloud] ?? cloud;
    const routeWord = routeLabel(r.routePath);
    const v = valueOf(r);

    const identityNode = touch(`id-${slug(r.tag)}`, 0, r.tag, NODE_BLUE, v);
    const sourceNode = touch(`src-${slug(route.endpoint)}`, 1, route.endpoint, NODE_BLUE, v);
    const routeNode = touch(`route-${slug(routeWord)}`, 2, routeWord, NODE_BLUE, v);
    const dstNode = touch(
      `dst-${slug(r.modelId)}`,
      3,
      `${provider}/${r.modelName}`,
      colorFor(provider),
      v,
    );

    return {
      id: r.tag,
      nodes: [identityNode.id, sourceNode.id, routeNode.id, dstNode.id] as [
        string,
        string,
        string,
        string,
      ],
      value: v,
      cost: r.spendToday,
      saved: Math.max(0, r.spendIfExternal - r.spendToday),
      hops: { identity: r.tag, source: route.endpoint, route: routeWord, provider },
    };
  });

  nodes.sort((a, b) => a.col - b.col);

  return {
    nodes,
    paths,
    columns: [
      { title: 'Identity', subtitle: 'User / Agent' },
      { title: 'Source', subtitle: 'Model endpoint' },
      { title: 'Fabric route', subtitle: 'Egress path' },
      { title: 'Provider / model', subtitle: 'Destination' },
    ],
    totalValue: paths.reduce((s, p) => s + p.value, 0),
    basis,
  };
}

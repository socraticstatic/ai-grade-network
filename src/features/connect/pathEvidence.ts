import type { CloudControl } from '../../engine/types';

/**
 * The two connectivity options AT&T offers into a cloud region. This is the
 * COMMERCIAL choice, one level above `attachCatalog.ts` — that file lists the
 * five transport mechanisms (IP / IPSec / PrivateLink / cloud-native /
 * dedicated) a path can ride. A customer picks a path here; the mechanism
 * follows from it.
 *
 * Every field on PathEvidence is read from the engine — `cc.fabricModel()`
 * for the shaped region (latency, which on-ramps reach it) and the on-ramp
 * seeds for the facility evidence (`site`, `sub`, `planned`). Nothing here is
 * asserted by copy alone, and nothing is asserted that the engine does not
 * carry: the whole point of the surface is that the decision is driven by
 * portal data. What is constant per path rather than derived per region —
 * the isolation posture — lives on `ConnectivityPath`, not on `PathEvidence`,
 * so the evidence list contains only figures that move with the estate.
 *
 * Named `pathEvidence.ts` (not `pathChoice.ts`) for the same reason
 * `attachCatalog.ts` is: data files are named after their content, and a
 * `pathChoice.ts` next to `PathChoice.tsx` collides on a case-insensitive
 * filesystem — `import from './PathChoice'` silently resolves to the `.ts`.
 */
export type ConnectivityPathId = 'managed-direct' | 'tenanted';

export interface ConnectivityPath {
  id: ConnectivityPathId;
  label: string;
  /** The one-line promise. Names control, security, observability or cost. */
  promise: string;
  /**
   * How the path is isolated. Constant per path — it is what the two options
   * ARE, not something the engine measures per region, so it belongs here as
   * part of the path's description and NOT in the evidence list beside
   * latency and hand-off, all of which move with the estate.
   *
   * Deliberately says nothing about what physically carries the path. The
   * engine carries no underlay field, and the hand-off the evidence displays
   * ("Equinix DC2 · Ashburn", from an on-ramp named "Direct Connect · Equinix
   * DC2") would contradict any specific claim made here.
   */
  isolation: string;
}

export const CONNECTIVITY_PATHS: ConnectivityPath[] = [
  {
    id: 'managed-direct',
    label: 'Direct cloud connect',
    promise: 'Attach your VPCs in-region. AT&T carries and observes everything past the hand-off.',
    isolation: 'Shared — this path also carries traffic from other customers.',
  },
  {
    id: 'tenanted',
    label: 'Dedicated tenant',
    promise: 'A private, tenanted path with committed performance and a reliability floor you control.',
    isolation: 'Per tenant — this path carries only your traffic.',
  },
];

/**
 * The three states the engine already distinguishes for a path into a region.
 * There is no fourth: an on-ramp either carries this region today (`active`),
 * exists but does not (`active:false` — planned, or a facility with unused
 * capacity), or does not reach the region at all.
 */
export type PathAvailability = 'live' | 'provisionable' | 'none';

export const AVAILABILITY_LABEL: Record<PathAvailability, string> = {
  live: 'Live here',
  provisionable: 'Provisionable here',
  none: 'Not available here',
};

export interface PathEvidence {
  pathId: ConnectivityPathId;
  availability: PathAvailability;
  /**
   * `fabricModel()` latency for this region, in ms — the figure the panel's
   * Performance tile shows.
   *
   * `null` when `availability === 'none'`. `_regionShape` derives the region's
   * latency from the nearest CAPTURING on-ramp site, which is a region-level
   * fact: it is blind to which of the two paths you are reading. On a region
   * where only one path has an on-ramp, that figure belongs to the OTHER
   * card, and rendering it here would put a latency on a card that has just
   * said the path does not exist. Each seeded region has exactly one
   * capturing on-ramp (the four on-ramps have zero target overlap), so
   * wherever a path IS available the region figure is that path's own
   * on-ramp's figure and stands.
   */
  latencyMs: number | null;
  onrampName: string | null;
  /** Where traffic physically hands off — the on-ramp's `site.name`. */
  handoffSite: string | null;
  /**
   * The on-ramp's own capacity/state line (`sub`), minus the facility name
   * when `handoffSite` already states it. Nothing is parsed out of the
   * remainder and nothing is added — see `withoutFacilityPrefix`.
   */
  capacityNote: string | null;
  /** Everything true about this path here that a buyer must read before choosing. */
  caveats: string[];
}

/** Only the seed fields `fabricModel()` does not project through. */
interface SeedOnramp {
  id: string;
  sub?: string;
  planned?: boolean;
}

type ModelOnramp = ReturnType<CloudControl['fabricModel']>['onramps'][number];

/** Exported so tests can group on-ramps by path family without duplicating
 * the regex — the tenanted/direct split IS this predicate, nothing more. */
export const isTenanted = (type: string) => /netbond/i.test(type);

/**
 * The on-ramp's own `sub` line with its leading facility segment dropped when
 * the Hand-off row directly above already carries that facility name — so the
 * pair reads "Equinix DC2 · Ashburn" / "10Gbps · unused capacity" rather than
 * saying "Equinix DC2" twice, 40px apart.
 *
 * Splits only on the seeds' own ' · ' separator (the same thing
 * `RegionPanel.tsx` does to on-ramp names) and only ever REMOVES a segment
 * that is already on screen. No number is parsed out, no word is substituted,
 * and a `sub` that does not start with the facility — `nb2`'s "not yet
 * provisioned", or the "provisioned this session" that `activateOnramp`
 * writes — passes through untouched.
 */
function withoutFacilityPrefix(sub: string, site: string): string {
  const facility = site.split(' · ')[0];
  const parts = sub.split(' · ');
  return parts.length > 1 && parts[0] === facility ? parts.slice(1).join(' · ') : sub;
}

/**
 * Evidence for both paths into one region, in catalog order.
 * Returns [] for a cloud/region pair the engine does not carry.
 */
export function pathEvidence(cc: CloudControl, cloudId: string, regionId: string): PathEvidence[] {
  const model = cc.fabricModel();
  const region = model.regions.find(r => r.cloudId === cloudId && r.regionId === regionId);
  if (!region) return [];

  // `sub` and `planned` live only on the seeds; everything else comes off the
  // shaped model, so the figures agree with the rest of Connect by construction.
  const seedById = new Map<string, SeedOnramp>(
    ((cc as unknown as { onramps?: SeedOnramp[] }).onramps ?? []).map(o => [o.id, o]),
  );

  const ramps = region.onrampIds
    .map(id => model.onramps.find(o => o.id === id))
    .filter((o): o is ModelOnramp => Boolean(o));

  // NOTE: there is deliberately no reliability caveat here. `RegionPanel.tsx`
  // already renders the region's reliability as a pill directly above these
  // cards, off the same `fabricModel()` shape. A caveat repeating it would be
  // unconditional boilerplate — no seeded region can reach `'dual'`, since
  // that needs two ACTIVE on-ramps capturing one region and the four seeded
  // on-ramps have zero overlapping targets — so it printed on 18 of 18 cards
  // and no action in the app could clear it. Caveats are reserved for what
  // actually differentiates the two paths in THIS region.

  const row = (pathId: ConnectivityPathId, mine: ModelOnramp[], whyNone: string): PathEvidence => {
    // A live on-ramp wins; otherwise the first one that reaches this region
    // is the one a customer would provision.
    const chosen = mine.find(o => o.active) ?? mine[0] ?? null;
    const availability: PathAvailability = !chosen ? 'none' : chosen.active ? 'live' : 'provisionable';
    const seed = chosen ? seedById.get(chosen.id) : undefined;

    const caveats: string[] = [];
    if (availability === 'none') {
      caveats.push(whyNone);
    } else if (availability === 'provisionable') {
      caveats.push(
        seed?.planned
          ? 'Not live here yet — this on-ramp is planned for this region.'
          : 'Not live here yet — the facility is in place but is not carrying this region today.',
      );
    }

    const handoffSite = chosen?.site ?? null;
    const sub = seed?.sub ?? null;

    return {
      pathId,
      availability,
      // A path that does not reach this region has no latency to report; the
      // region figure belongs to the on-ramp serving the OTHER card.
      //
      // Both cards describe an AT&T path, so both state `privateMs` — the RTT
      // to the on-ramp serving this region — whether or not the region is
      // attached yet. `region.latencyMs` is the figure for the path the region
      // is on TODAY, which for an unattached region is the public one: stating
      // it on a card whose own `promise` is the private path would relabel the
      // public internet as managed connectivity.
      latencyMs: availability === 'none' ? null : region.privateMs,
      onrampName: chosen?.name ?? null,
      handoffSite,
      capacityNote: sub === null ? null : handoffSite ? withoutFacilityPrefix(sub, handoffSite) : sub,
      caveats,
    };
  };

  return [
    row(
      'managed-direct',
      ramps.filter(o => !isTenanted(o.type)),
      // Names no on-ramp product: which types exist is a seed fact that grows
      // (RegionPanel already anticipates a third), and this sentence must stay
      // true when it does.
      'No direct on-ramp reaches this region — order one, or take the dedicated tenant path.',
    ),
    row(
      'tenanted',
      ramps.filter(o => isTenanted(o.type)),
      // "NetBond" here is definitional, not a seed enumeration: `isTenanted`
      // IS `/netbond/i`, so a tenanted on-ramp is a NetBond one by construction.
      'No NetBond on-ramp targets this region — order one, or take the direct path.',
    ),
  ];
}

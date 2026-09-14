/**
 * On-ramp → region latency model.
 *
 * Today the number is a distance-based ESTIMATE: great-circle air miles between
 * the on-ramp PoP and the cloud region, inflated by a fiber-route factor and a
 * small equipment base. This is the standard first-order model (≈ within 15-20%
 * of measured), and — crucially — it is transparent and free, unlike CSP
 * point-to-point APIs which are coarse/best-effort.
 *
 * The `source` field is the seam for making it real: active probes between
 * vRouter interfaces (across the AT&T mid-mile AND across the CSP backbone) drop
 * measured RTTs into `PROBED`, and the same UI flips the tag to "probed" with no
 * other change. A CSP-API feed would land the same way as `csp-api`.
 */

export type LatencySource = 'estimated' | 'csp-api' | 'probed';

export type Coord = readonly [number, number]; // [lat, lon]

const EARTH_RADIUS_MI = 3958.8;

/** Great-circle distance in miles (haversine). */
export function airMiles(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Light in fiber ≈ 0.66c ≈ 124 miles/ms one-way. Round-trip over a real (not
// straight-line) fiber route: RTT ms ≈ base + miles × 1.4 × 2 / 124 = base + miles × 1.4/62.
const FIBER_ROUTE_FACTOR = 1.4;
const MILES_PER_MS_ONE_WAY = 124;
const BASE_MS = 3; // PoP switch + cloud edge + region-internal floor

/** Estimated round-trip latency (ms) between two coordinates over fiber. */
export function estimateRttMs(from: Coord, to: Coord): number {
  return Math.round(BASE_MS + (airMiles(from, to) * FIBER_ROUTE_FACTOR * 2) / MILES_PER_MS_ONE_WAY);
}

/**
 * Measured round-trip latencies from the probe mesh, keyed `${onrampId}:${cloudId}/${regionId}`.
 * Empty today → everything is `estimated`. Populate from the vRouter probes (or a
 * CSP API) and the affected rows report the measured value + a "probed" source.
 */
export const PROBED: Record<string, number> = {};

export function fabricLatency(key: string, from: Coord, to: Coord): { ms: number; source: LatencySource } {
  if (key in PROBED) return { ms: PROBED[key], source: 'probed' };
  return { ms: estimateRttMs(from, to), source: 'estimated' };
}

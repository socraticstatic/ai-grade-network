/**
 * Colour-vision-deficiency simulation and perceptual distance, for tests that
 * need to prove a categorical palette stays readable rather than assert that
 * somebody remembered to pick nice hexes.
 *
 * Dichromat simulation is Viénot–Brettel–Mollon (1999): convert sRGB to
 * linear, linear to LMS, collapse the missing cone's response onto the plane
 * spanned by the other two, convert back. Distance is CIE76 ΔE*ab in CIELAB
 * (D65) — coarse next to CIEDE2000, but this is a "can a person tell these
 * three bars apart" question, not a print-proofing one, and CIE76 does not
 * flatter the answer.
 *
 * Test support only; nothing in the app imports it.
 */

export type Vision = 'normal' | 'protan' | 'deutan' | 'tritan';

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

const srgbToLinear = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const linearToSrgb = (c: number): number => {
  const v = Math.max(0, Math.min(1, c));
  return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
};

export function hexToRgb(hex: string): Vec3 {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** `rgb(0, 168, 98)` / `rgb(0 168 98)` / `#00a862` -> [0,168,98]. */
export function parseColor(value: string): Vec3 {
  const v = value.trim();
  if (v.startsWith('#')) return hexToRgb(v);
  const nums = v.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 3) throw new Error(`unparseable colour: ${value}`);
  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
}

const mul = (m: Mat3, v: Vec3): Vec3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];

const RGB_TO_LMS: Mat3 = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];

const LMS_TO_RGB: Mat3 = [
  [0.0809444479, -0.130504409, 0.116721066],
  [-0.0102485335, 0.0540193266, -0.113614708],
  [-0.000365296938, -0.00412161469, 0.693511405],
];

const COLLAPSE: Record<Exclude<Vision, 'normal'>, Mat3> = {
  protan: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]],
  deutan: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]],
  tritan: [[1, 0, 0], [0, 1, 0], [-0.395913, 0.801109, 0]],
};

/** The colour as seen with `vision`, in sRGB 0-255. */
export function simulate(color: string, vision: Vision): Vec3 {
  const rgb = parseColor(color);
  if (vision === 'normal') return rgb;
  const lms = mul(RGB_TO_LMS, rgb.map(srgbToLinear) as Vec3);
  return mul(LMS_TO_RGB, mul(COLLAPSE[vision], lms)).map(linearToSrgb) as Vec3;
}

function toLab(rgb: Vec3): Vec3 {
  const [r, g, b] = rgb.map(v => srgbToLinear(Math.max(0, Math.min(255, v)))) as Vec3;
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, z] = [f(x), f(z)];
  const fy = f(y);
  return [116 * fy - 16, 500 * (x - fy), 200 * (fy - z)];
}

/** CIE76 ΔE*ab. ~2.3 is a just-noticeable difference. */
export function deltaE(a: Vec3 | string, b: Vec3 | string): number {
  const la = toLab(typeof a === 'string' ? parseColor(a) : a);
  const lb = toLab(typeof b === 'string' ? parseColor(b) : b);
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

/** The closest any two colours in `colors` get, under `vision`. */
export function minPairDistance(colors: string[], vision: Vision): number {
  const sims = colors.map(c => simulate(c, vision));
  let min = Infinity;
  for (let i = 0; i < sims.length; i++) {
    for (let j = i + 1; j < sims.length; j++) {
      min = Math.min(min, deltaE(sims[i], sims[j]));
    }
  }
  return min;
}

export const VISIONS: Vision[] = ['normal', 'protan', 'deutan', 'tritan'];

/** The closest any two colours get across normal AND all three dichromacies —
 *  the number that decides whether a categorical series is readable. */
export function worstCaseSeparation(colors: string[]): number {
  return Math.min(...VISIONS.map(v => minPairDistance(colors, v)));
}

/** Hue in degrees, 0-360, from sRGB. */
export function hue(color: string): number {
  const [r, g, b] = parseColor(color).map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** HSL saturation, 0-1. */
export function saturation(color: string): number {
  const [r, g, b] = parseColor(color).map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const l = (max + min) / 2;
  return d / (1 - Math.abs(2 * l - 1));
}

/**
 * Is this an amber/orange/gold?
 *
 * Stated as a property of the colour rather than a blocklist of one hex, so
 * trading #E69F00 for #F59E0B or #ea712f does not slip through. Everything
 * with a saturated hue between yellow-orange and gold counts; unsaturated
 * greys have no hue to judge and are exempt.
 */
export function isAmber(color: string): boolean {
  return saturation(color) > 0.25 && hue(color) >= 20 && hue(color) <= 70;
}

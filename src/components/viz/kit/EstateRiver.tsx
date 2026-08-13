import { useId } from 'react';
import { VIZ_HEX } from './palette';
import { ribbonPath } from './ribbon';

/**
 * The estate as a river: what the customer owns, on the left; the two paths
 * their traffic can take, in the middle; where it lands, on the right.
 *
 * This is the product's own picture, so the board leads with it rather than
 * with another rectangle of numbers. Ribbon thickness is traffic, and the
 * dashes move ALONG the ribbon in the direction the traffic flows - a still
 * diagram of a live network is a diagram that argues against its own claim.
 *
 * Hand-rolled SVG on the Flywheel palette: cobalt is on the AT&T fabric,
 * slate is the public internet, and that is the whole colour argument. No
 * chart library, no third axis, no legend a viewer has to decode.
 */

export interface RiverBand {
  key: string;
  label: string;
  /** Relative weight - ribbon thickness and node height come from this. */
  value: number;
  /** Optional second line under the label. */
  sub?: string;
}

const PAD_Y = 20;

/** Height a two-line label needs before it collides with its neighbour. */
const MIN_BAND = 30;

/**
 * Stack bands into [y, height] slots.
 *
 * Heights use a SQUARE-ROOT scale, not a linear one. A bank's estate spans
 * three orders of magnitude in one column - 3 data centers beside 2,840
 * branches - and linear sizing gives the data centers a 0.2px sliver whose
 * label then prints on top of its neighbour's. Compressing the ratio keeps
 * the ordering honest (bigger is still bigger, visibly) while leaving every
 * band tall enough to be read and clicked. The exact counts are in the
 * labels, which is where precision belongs.
 */
function stack(bands: RiverBand[], h: number, gap: number) {
  const weight = (v: number) => Math.sqrt(Math.max(v, 0));
  const total = bands.reduce((s, b) => s + weight(b.value), 0) || 1;
  const usable = h - PAD_Y * 2 - gap * Math.max(bands.length - 1, 0);
  const raw = bands.map(b => Math.max(MIN_BAND, (weight(b.value) / total) * usable));
  // Minimums can overflow the box; scale the whole column back to fit.
  const sum = raw.reduce((s, x) => s + x, 0);
  const fit = sum > usable ? usable / sum : 1;
  let y = PAD_Y;
  return bands.map((b, i) => {
    const hh = raw[i] * fit;
    const slot = { ...b, y, h: hh };
    y += hh + gap;
    return slot;
  });
}

export function EstateRiver({
  sources,
  dests,
  privateShare,
  w = 640,
  h = 230,
}: {
  /** What the customer owns - site classes, or agent identities. */
  sources: RiverBand[];
  /** Where their traffic lands - clouds, or model providers. */
  dests: RiverBand[];
  /** 0..1 of traffic already on the AT&T fabric. The rest is public. */
  privateShare: number;
  w?: number;
  h?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const srcX = 8;
  const midX = w / 2 - 26;
  const dstX = w - 60;
  const barW = 10;

  const src = stack(sources, h, 10);
  const dst = stack(dests, h, 10);
  const share = Math.max(0, Math.min(1, privateShare));

  // The two path nodes, sized by the share of traffic each carries.
  const pathH = h - PAD_Y * 2 - 12;
  const privH = Math.max(6, pathH * share);
  const pubH = Math.max(6, pathH - privH);
  const privY = PAD_Y;
  const pubY = privY + privH + 12;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label={`Estate traffic: ${sources.map(s => s.label).join(', ')} reaching ${dests
        .map(d => d.label)
        .join(', ')}; ${Math.round(share * 100)} percent on the AT&T fabric`}
    >
      <defs>
        {/* Ribbons fade along their length so the eye reads direction. */}
        <linearGradient id={`${uid}-priv`} x1="0" x2="1">
          <stop offset="0" stopColor={VIZ_HEX.cobalt} stopOpacity="0.10" />
          <stop offset="1" stopColor={VIZ_HEX.cobalt} stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={`${uid}-pub`} x1="0" x2="1">
          <stop offset="0" stopColor={VIZ_HEX.slate} stopOpacity="0.10" />
          <stop offset="1" stopColor={VIZ_HEX.slate} stopOpacity="0.38" />
        </linearGradient>
      </defs>

      {/* Left -> the two paths. Each source band splits by the same share
          the estate actually runs, and both the source edge and the path
          edge advance a cursor so ribbons stack instead of overlapping. */}
      {(() => {
        let privCur = privY;
        let pubCur = pubY;
        return src.map(s2 => {
          const privT = s2.h * share;
          const pubT = s2.h - privT;
          const parts: JSX.Element[] = [];
          if (privT > 0.5) {
            parts.push(
              <path
                key={`p-${s2.key}`}
                d={ribbonPath(srcX + barW, s2.y, midX, privCur, privT, privT)}
                fill={`url(#${uid}-priv)`}
              />,
            );
            privCur += privT;
          }
          if (pubT > 0.5) {
            parts.push(
              <path
                key={`u-${s2.key}`}
                d={ribbonPath(srcX + barW, s2.y + privT, midX, pubCur, pubT, pubT)}
                fill={`url(#${uid}-pub)`}
              />,
            );
            pubCur += pubT;
          }
          return <g key={s2.key}>{parts}</g>;
        });
      })()}

      {/* The two paths -> where the traffic lands. */}
      {(() => {
        let privCur = privY;
        let pubCur = pubY;
        return dst.map(d => {
          const privT = d.h * share;
          const pubT = d.h - privT;
          const parts: JSX.Element[] = [];
          if (privT > 0.5) {
            parts.push(
              <path
                key={`dp-${d.key}`}
                d={ribbonPath(midX + barW, privCur, dstX, d.y, privT, privT)}
                fill={`url(#${uid}-priv)`}
              />,
            );
            privCur += privT;
          }
          if (pubT > 0.5) {
            parts.push(
              <path
                key={`du-${d.key}`}
                d={ribbonPath(midX + barW, pubCur, dstX, d.y + privT, pubT, pubT)}
                fill={`url(#${uid}-pub)`}
              />,
            );
            pubCur += pubT;
          }
          return <g key={d.key}>{parts}</g>;
        });
      })()}

      {/* Motion: dashes travelling the length of each path, so the picture
          reads as traffic rather than as an org chart. Paused for anyone
          who asked the OS for reduced motion. */}
      <style>{`
        @keyframes ${uid}-flow { to { stroke-dashoffset: -48; } }
        .${uid}-dash { animation: ${uid}-flow 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .${uid}-dash { animation: none; } }
      `}</style>
      {share > 0 && (
        <line
          x1={midX + barW}
          y1={privY + privH / 2}
          x2={dstX}
          y2={privY + privH / 2}
          stroke={VIZ_HEX.cobalt}
          strokeWidth={2}
          strokeDasharray="6 18"
          strokeLinecap="round"
          className={`${uid}-dash`}
          opacity={0.85}
        />
      )}
      {share < 1 && (
        <line
          x1={midX + barW}
          y1={pubY + pubH / 2}
          x2={dstX}
          y2={pubY + pubH / 2}
          stroke={VIZ_HEX.slate}
          strokeWidth={2}
          strokeDasharray="6 18"
          strokeLinecap="round"
          className={`${uid}-dash`}
          opacity={0.9}
        />
      )}

      {/* Nodes last, so ribbons pass behind them. */}
      {src.map(s => (
        <g key={`n-${s.key}`}>
          <rect x={srcX} y={s.y} width={barW} height={s.h} rx={5} fill={VIZ_HEX.ink} opacity={0.82} />
          <text x={srcX + barW + 8} y={s.y + s.h / 2 - 1} fill={VIZ_HEX.ink} className="text-[11px] font-semibold">
            {s.label}
          </text>
          {s.sub && (
            <text x={srcX + barW + 8} y={s.y + s.h / 2 + 11} fill={VIZ_HEX.slateInk} className="text-[10px]">
              {s.sub}
            </text>
          )}
        </g>
      ))}

      {/* The two paths, named. An unlabelled bar in the middle of a flow
          diagram is the one place a viewer cannot guess the meaning. */}
      <rect x={midX} y={privY} width={barW} height={privH} rx={5} fill={VIZ_HEX.cobalt} />
      <text
        x={midX + barW / 2}
        y={privY - 4}
        textAnchor="middle"
        fill={VIZ_HEX.cobalt}
        className="text-[10px] font-bold uppercase tracking-[0.06em]"
      >
        AT&amp;T fabric
      </text>
      <rect x={midX} y={pubY} width={barW} height={pubH} rx={5} fill={VIZ_HEX.slate} />
      <text
        x={midX + barW / 2}
        y={pubY + pubH + 12}
        textAnchor="middle"
        fill={VIZ_HEX.slateInk}
        className="text-[10px] font-bold uppercase tracking-[0.06em]"
      >
        Public internet
      </text>

      {dst.map(d => (
        <g key={`d-${d.key}`}>
          <rect x={dstX} y={d.y} width={barW} height={d.h} rx={5} fill={VIZ_HEX.ink} opacity={0.82} />
          <text
            x={dstX - 8}
            y={d.y + d.h / 2 + 3}
            textAnchor="end"
            fill={VIZ_HEX.ink}
            className="text-[11px] font-semibold"
          >
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

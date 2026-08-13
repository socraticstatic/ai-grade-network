import { VIZ_HEX } from './palette';
import { arcPath } from './gauge';

/**
 * One figure against its whole, as a ring.
 *
 * The board's stage cards state fractions constantly - regions attached of
 * regions total, tokens governed of tokens spent - and a bare "1 of 8"
 * makes a viewer do the division. The ring does it for them at a glance
 * while the number underneath stays exact.
 *
 * Color carries the kit's one meaning: cobalt is on the AT&T fabric,
 * amber-free. A share that is BAD news (mostly unattached, mostly
 * ungoverned) is the caller's judgement, passed as `tone`.
 */
export function ShareRing({
  share,
  label,
  tone = 'good',
  size = 52,
}: {
  /** 0..1. Values outside are clamped by arcPath. */
  share: number;
  /** Rendered inside the ring - keep it to a few characters. */
  label: string;
  tone?: 'good' | 'warn';
  size?: number;
}) {
  const r = size / 2 - 5;
  const c = size / 2;
  const d = arcPath(c, c, r, share);
  const stroke = tone === 'warn' ? '#b3541e' : VIZ_HEX.cobalt;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(Math.max(0, Math.min(1, share)) * 100)} percent`}
      className="shrink-0"
    >
      <circle cx={c} cy={c} r={r} fill="none" stroke={VIZ_HEX.line} strokeWidth={5} />
      {/* No arc at zero: a zero-length stroke still paints its round cap,
          which reads as progress that has not happened. */}
      {d && <path d={d} fill="none" stroke={stroke} strokeWidth={5} strokeLinecap="round" />}
      <text
        x={c}
        y={c}
        textAnchor="middle"
        dominantBaseline="central"
        fill={VIZ_HEX.ink}
        className="text-[11px] font-bold tabular-nums"
      >
        {label}
      </text>
    </svg>
  );
}

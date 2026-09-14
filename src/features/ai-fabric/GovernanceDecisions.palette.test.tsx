import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CC } from '../../engine';
import { GovernanceDecisions, DECISION_COLORS } from './GovernanceDecisions';
import { isAmber, minPairDistance, worstCaseSeparation, VISIONS } from '../../test/cvd';

/* The project palette. Cobalt, green and slate carry everything; red is
   reserved for a TRUE policy violation, which is exactly what a denied
   request is. Amber is not in it — and this panel used to paint its middle
   series #E69F00, which the AI Fabric route split promoted from behind a
   "Trace" tab onto the permanent /ai/observe screen. */
const PALETTE = {
  cobalt: '#0057b8',
  green: '#00a862',
  slateInk: '#475569',
  slateLine: '#cbd5e1',
  slateWash: '#f8fafc',
  violation: '#dc2626',
};

const IN_PALETTE = Object.values(PALETTE).map(h => h.toLowerCase());

/* The trio this replaced: Okabe-Ito bluish green / orange / vermillion. It is
   the baseline the repaint must not regress against — the whole reason the
   amber was there in the first place was that Okabe-Ito is colourblind-safe,
   so "we removed the amber" is only half an answer. */
const OKABE_ITO_TRIO = ['#009E73', '#E69F00', '#D55E00'];

const rgbToHex = (value: string): string => {
  const n = value.match(/-?\d+(?:\.\d+)?/g);
  if (!n) throw new Error(`unparseable colour: ${value}`);
  return '#' + n.slice(0, 3).map(v => Number(v).toString(16).padStart(2, '0')).join('');
};

describe('GovernanceDecisions palette', () => {
  beforeAll(() => {
    // Populate the decision log so the chart branch renders too, not just the
    // empty-state copy. Denied and allowed both, through the real engine.
    CC.promptTrace('classified-helion', 'gpt-class', 'a classified prompt');
    CC.promptTrace('classified-helion', 'helion-70b', 'a self-hosted prompt');
  });

  it('paints no amber anywhere in the series', () => {
    const { container } = render(<GovernanceDecisions />);

    const painted: string[] = [];
    container.querySelectorAll<HTMLElement>('*').forEach(el => {
      const bg = el.style.backgroundColor;
      const fill = el.getAttribute('fill');
      const stroke = el.getAttribute('stroke');
      for (const v of [bg, fill, stroke]) {
        if (v && v !== 'none' && v !== 'transparent') painted.push(v);
      }
    });

    expect(painted.length, 'nothing painted — the panel did not render').toBeGreaterThan(0);

    const ambers = painted.filter(c => {
      try { return isAmber(c); } catch { return false; }
    });
    expect(ambers, 'amber is not in this palette').toEqual([]);
  });

  it('every decision colour is a palette colour', () => {
    for (const [outcome, hex] of Object.entries(DECISION_COLORS)) {
      expect(IN_PALETTE, `${outcome} is painted ${hex}, which is off-palette`)
        .toContain(hex.toLowerCase());
    }
  });

  it('red is spent only on the true policy violation', () => {
    // A denied request IS the violation; nothing else in this panel may take
    // the reserved colour.
    const red = Object.entries(DECISION_COLORS).filter(([, h]) => h.toLowerCase() === PALETTE.violation);
    expect(red.map(([k]) => k)).toEqual(['Denied']);
  });

  it('the legend dots paint exactly the decision colours', () => {
    render(<GovernanceDecisions />);

    const legend = screen.getByRole('list', { name: /decision outcomes/i });
    const dots = [...legend.querySelectorAll<HTMLElement>('li > span')];
    const byOutcome = Object.fromEntries(
      [...legend.querySelectorAll('li')].map(li => {
        const dot = li.querySelector<HTMLElement>('span')!;
        const label = (li.textContent ?? '').split('·')[0].trim();
        return [label, rgbToHex(dot.style.backgroundColor)];
      })
    );

    expect(dots.length).toBe(Object.keys(DECISION_COLORS).length);
    for (const [outcome, hex] of Object.entries(DECISION_COLORS)) {
      expect(byOutcome[outcome], `${outcome}'s legend dot`).toBe(hex.toLowerCase());
    }
  });

  /* The point of the Okabe-Ito set was colourblind safety, so a repaint that
     drops the amber and quietly makes the series harder to read is not a fix.
     Measured as CIE76 ΔE between every pair, under normal vision and all
     three dichromacies — the worst pair, in the worst vision, is the number
     that decides whether a viewer can read the chart. */
  it('stays readable with colour-vision deficiency, and beats the set it replaced', () => {
    const series = Object.values(DECISION_COLORS);
    expect(series).toHaveLength(3);

    const baseline = worstCaseSeparation(OKABE_ITO_TRIO);
    const actual = worstCaseSeparation(series);

    expect(
      actual,
      `worst-case separation is ΔE ${actual.toFixed(1)} against the old set's ${baseline.toFixed(1)}`,
    ).toBeGreaterThanOrEqual(baseline);

    // …and clears an absolute floor, not just a relative one. ΔE 2.3 is a
    // just-noticeable difference; 20 is "obviously a different bar".
    for (const vision of VISIONS) {
      const d = minPairDistance(series, vision);
      expect(d, `closest pair under ${vision} is ΔE ${d.toFixed(1)}`).toBeGreaterThan(20);
    }
  });

  /* Colour is never the only channel here — a reader who cannot separate two
     hues at all still gets the outcome in words. This is what actually makes
     the panel accessible; the ΔE numbers above are the supporting evidence. */
  it('names every outcome in text, so colour is redundant', () => {
    render(<GovernanceDecisions />);
    const legend = screen.getByRole('list', { name: /decision outcomes/i });
    for (const outcome of Object.keys(DECISION_COLORS)) {
      expect(legend).toHaveTextContent(outcome);
    }
  });
});

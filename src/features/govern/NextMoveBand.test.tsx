import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextMoveBand } from './NextMoveBand';
import { rankMoves } from './nextMove';
import { CC } from '../../engine';

/** The band's enforcer is REQUIRED (see NextMoveBandProps): RulesPanel hands
 *  it the measured enforcer so the band's button and the row menu produce the
 *  same consequence panel. Tests stub it — a stub is exactly the point: the
 *  band routes, it does not enforce. */
const noEnforce = () => {};

describe('NextMoveBand · rankMoves call count', () => {
  it('ranks the estate once per render, not twice', () => {
    // `rankMoves` calls `cc.previewFix` once per fix-bound unenforced rule —
    // a full snapshot/restore of the estate each time. The band used to call
    // `nextMove(cc)` (which ranks internally) AND `rankMoves(cc).length`
    // separately in the same selector, doubling every one of those
    // clone/restore cycles per render. A single `rankMoves(cc)` pass is the
    // baseline this asserts against, so the count moves with the estate
    // instead of being pinned to a rule count that could drift.
    const spy = vi.spyOn(CC, 'previewFix');
    render(<NextMoveBand onEnforce={noEnforce} />);
    const renderCallCount = spy.mock.calls.length;
    spy.mockClear();

    rankMoves(CC);
    const singlePassCallCount = spy.mock.calls.length;

    spy.mockRestore();
    expect(renderCallCount).toBe(singlePassCallCount);
  });
});

describe('NextMoveBand · enforcement is injected, never a fallback', () => {
  it('routes its button through the provided enforcer and mutates nothing itself', () => {
    // The old optional prop fell back to a bare `actions.enforceAny` — an
    // enforce with no consequence panel, a silent third path no viewer was
    // meant to get. The prop is required now; this pins the wiring: the
    // button hands the TOP-RANKED rule id to the injected enforcer, and the
    // band itself leaves the engine untouched.
    const topRule = rankMoves(CC)[0];
    const enforcedBefore = (CC.ruleList() as { id: string }[]).filter(r => CC.ruleEnforced(r)).length;

    const onEnforce = vi.fn();
    render(<NextMoveBand onEnforce={onEnforce} />);
    fireEvent.click(screen.getByRole('button', { name: /enforce this rule/i }));

    expect(onEnforce).toHaveBeenCalledTimes(1);
    expect(onEnforce).toHaveBeenCalledWith(topRule.ruleId);
    const enforcedAfter = (CC.ruleList() as { id: string }[]).filter(r => CC.ruleEnforced(r)).length;
    expect(enforcedAfter).toBe(enforcedBefore);
  });
});

/**
 * The fifth Govern-band state: every open violation is cleared but rules
 * remain unenforced, so the best available move clears ZERO of ZERO open
 * violations. The recommendation template (used for states 1-4) would print
 * "START HERE ... it clears 0 of the 0 open violations" — a heading
 * commanding the viewer to press a button the same sentence says
 * accomplishes nothing. This band state needs its own voice instead.
 *
 * The walk below drives the SHARED engine singleton (this file's copy of it)
 * forward exactly the way a real session would: enforce whatever the ranking
 * currently recommends until the best remaining move clears nothing. On the
 * seeded estate that lands with 2 of 8 rules still unenforced (pol-dns,
 * pol-perimeter) — the exact shape from the field report.
 */
function walkToZeroClearState() {
  let ranked = rankMoves(CC);
  // Safety cap: the seeded estate resolves in well under 8 iterations.
  let guard = 0;
  while (ranked.length > 0 && ranked[0].cleared > 0 && guard < 20) {
    CC.enforceAny(ranked[0].ruleId);
    ranked = rankMoves(CC);
    guard++;
  }
  return ranked;
}

/** Walks the estate forward, enforcing the current top move, until the
 *  recommendation lands on a rule with no bound remediation (`projected ===
 *  false`) that still clears something — the state that used to render
 *  "no bound remediation", which is engine vocabulary a viewer can't act on. */
function walkToUnprojectedState() {
  let ranked = rankMoves(CC);
  let guard = 0;
  while (ranked.length > 0 && ranked[0].projected && guard < 20) {
    CC.enforceAny(ranked[0].ruleId);
    ranked = rankMoves(CC);
    guard++;
  }
  return ranked;
}

describe('NextMoveBand · unprojectable rule copy', () => {
  it('never surfaces engine vocabulary ("no bound remediation") to the viewer', () => {
    const ranked = walkToUnprojectedState();
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].projected).toBe(false);

    render(<NextMoveBand onEnforce={noEnforce} />);
    const band = screen.getByTestId('govern-next-move');
    expect(band.textContent).not.toMatch(/bound remediation/i);
    expect(band.textContent).toMatch(/can't be previewed/i);
  });
});

describe('NextMoveBand · zero-clear state', () => {
  it('walks the estate to a point where the best move clears 0 of 0, with rules still unenforced', () => {
    const ranked = walkToZeroClearState();
    // Precondition for the rest of this suite to mean anything: we actually
    // reached the state under test, not "everything got enforced".
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].cleared).toBe(0);
    expect(CC.violations().length).toBe(0);
  });

  it('never tells the viewer a rule "clears 0 of the 0 open violations"', () => {
    walkToZeroClearState();
    render(<NextMoveBand onEnforce={noEnforce} />);
    const band = screen.getByTestId('govern-next-move');
    expect(band.textContent).not.toMatch(/clears\s*0\s*of the\s*0\s*open violation/i);
    expect(band.textContent).not.toMatch(/0 of the 0/);
  });

  it('does not command "Start here" over an action with no effect', () => {
    walkToZeroClearState();
    render(<NextMoveBand onEnforce={noEnforce} />);
    const band = screen.getByTestId('govern-next-move');
    expect(band.textContent).not.toMatch(/start here/i);
  });

  it('gives the zero-clear state its own honest copy: no violations left, still names the rule', () => {
    const ranked = walkToZeroClearState();
    const expectedRule = ranked[0].ruleName;
    render(<NextMoveBand onEnforce={noEnforce} />);
    const band = screen.getByTestId('govern-next-move');
    expect(band.textContent).toMatch(/no open violations left/i);
    expect(screen.getByTestId('govern-next-move-rule')).toHaveTextContent(expectedRule);
    // Still says how many rules remain, in the same currency as every other
    // state on this band.
    expect(band.textContent).toContain(String(ranked.length));
  });

  it('carries a live-region role so a screen reader hears the recommendation change', () => {
    walkToZeroClearState();
    render(<NextMoveBand onEnforce={noEnforce} />);
    const band = screen.getByTestId('govern-next-move');
    expect(band).toHaveAttribute('aria-live', 'polite');
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { StackPanel } from './StackPanel';
import { CC } from '../../engine';
import { attachOpportunities, steerOpportunities } from './stackFigures';

/**
 * Finding 1 (CRITICAL), continued: the previous fix made the commit banner
 * honest for 'policy' moves specifically, because CC.setTokenPolicy pushes
 * no undo entry. But CC.steerFlow (src/engine/state-routing.ts) pushes no
 * undo entry either - verified by reading state-routing.ts end to end: no
 * `pushUndo` call anywhere in the file, and the module-level `steered`
 * object it mutates is not part of state.ts's snapshot()/restore() pair.
 *
 * Before this fix: staging a single steer opportunity and committing it
 * printed "1 move committed to the estate. Undo reverts them." while
 * CC.canUndo() returned null - the exact lie the policy fix removed, still
 * told for steer moves, because the banner hardcoded `kind === 'policy'`
 * instead of asking what committing actually covers.
 *
 * The banner now keys off `isUndoCovered` (stackFigures.ts), which encodes
 * the per-kind truth table in one place. These three tests pin the wording
 * for the three shapes a commit can take: every staged move undo-covered,
 * none of them, and a genuine mix - against the real seeded engine, no
 * mocks.
 */

const renderPanel = () => render(<MemoryRouter><StackPanel /></MemoryRouter>);

describe('StackPanel — the commit banner is honest about undo coverage, per move kind', () => {
  test('all-covered commit (attach): the banner promises undo, and undo actually delivers', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('design-toggle'));
    const opp = attachOpportunities(CC)[0];
    expect(opp).toBeDefined();
    fireEvent.click(screen.getByTestId(`move-attach-${opp.regionId}`));
    fireEvent.click(screen.getByTestId('design-commit'));

    const tray = screen.getByTestId('design-tray');
    expect(tray.textContent).toMatch(/undo reverts them/i);
    expect(tray.textContent).not.toMatch(/will not revert/i);

    // Ground the copy: an undo entry really exists and really reverts.
    expect(CC.canUndo()).not.toBeNull();
    expect(CC.undo()).toBeTruthy();
  });

  test("all-uncovered commit (steer): the banner does not promise an undo the engine can't deliver", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('design-toggle'));
    const opp = steerOpportunities(CC)[0];
    expect(opp).toBeDefined();
    fireEvent.click(screen.getByTestId(`move-steer-${opp.flowId}`));
    fireEvent.click(screen.getByTestId('design-commit'));

    const tray = screen.getByTestId('design-tray');
    // The lying claim this finding is about.
    expect(tray.textContent).not.toMatch(/undo reverts them/i);
    // It must say something true instead - nothing here reverts on Undo.
    expect(tray.textContent).toMatch(/will not revert/i);
    expect(tray.textContent?.toLowerCase()).toContain('re-edit');

    // Ground it: steerFlow pushed no undo entry.
    expect(CC.canUndo()).toBeNull();

    // steerFlow is reverted by clearSteer, never by undo - restore
    // explicitly (same idiom the engine's own steer tests use).
    CC.clearSteer(opp.flowId);
  });

  test('mixed commit (attach + steer): the banner is true about both halves, overclaiming and hiding nothing', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('design-toggle'));
    const attach = attachOpportunities(CC)[0];
    const steer = steerOpportunities(CC)[0];
    expect(attach).toBeDefined();
    expect(steer).toBeDefined();
    fireEvent.click(screen.getByTestId(`move-attach-${attach.regionId}`));
    fireEvent.click(screen.getByTestId(`move-steer-${steer.flowId}`));
    fireEvent.click(screen.getByTestId('design-commit'));

    const tray = screen.getByTestId('design-tray');
    // Must not overclaim: this is not an all-covered commit, so the blanket
    // promise is never made.
    expect(tray.textContent).not.toMatch(/undo reverts them\./i);
    // Must not underclaim either: the attach half DOES revert, and the
    // banner must say so rather than reading as a blanket denial.
    expect(tray.textContent).not.toMatch(/^\d+ moves committed to the estate\. Undo will not revert this/i);
    expect(tray.textContent?.toLowerCase()).toContain('re-edit');

    // Ground it: exactly one undo entry exists (the attach's) and it
    // reverts only that half; the steer half needs its own explicit undo.
    expect(CC.canUndo()).not.toBeNull();
    expect(CC.undo()).toBeTruthy();
    CC.clearSteer(steer.flowId);
  });
});

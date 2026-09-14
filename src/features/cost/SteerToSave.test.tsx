import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { CC } from '../../engine';
import { SteerToSave } from './SteerToSave';

/**
 * "Captured this session" must equal the ACTUAL realized bill delta the engine
 * produces — the drop in egress().total — not a divergent re-normalized
 * estimate. Fresh window.CC per file; revert steers after each test.
 */
const steered = new Set<string>();
afterEach(() => {
  steered.forEach(id => CC.clearSteer(id));
  steered.clear();
});

describe('SteerToSave', () => {
  it('captured equals the realized drop in egress().total from the steer', async () => {
    const rec = CC.routeAdvisor().recommendations.find(r => r.action === 'steer');
    if (!rec) return; // seed already fully steered
    steered.add(rec.flowId);

    const beforeTotal = CC.egress().total;
    render(<SteerToSave />);
    fireEvent.click(screen.getAllByRole('button', { name: /steer to save/i })[0]);

    const realized = beforeTotal - CC.egress().total;
    expect(realized).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getByText(/captured so far/i)).toBeInTheDocument());
    // The headline shows exactly the realized delta (rounded, with thousands separators).
    expect(
      screen.getByText(new RegExp(`\\$${Math.round(realized).toLocaleString()}/mo captured`, 'i')),
    ).toBeInTheDocument();
  });

  /* The empty state used to read "Every flow is on its optimal path. Nothing
     left on the table." directly under the arbitrage hero's "$11.9k/mo more on
     the table — attach the paths below". Two opposite readings of one idiom on
     the money screen. This list is about STEERING; the hero is about
     ATTACHING. Reached by actually exhausting the recommendations, not by
     asserting against a string the component might never render. */
  it('states its empty case without borrowing the hero\'s "on the table" idiom', () => {
    for (let i = 0; i < 30; i++) {
      const rec = CC.routeAdvisor().recommendations.find(r => r.action === 'steer');
      if (!rec || steered.has(rec.flowId)) break;
      CC.steerFlow(rec.flowId, rec.pathId!);
      steered.add(rec.flowId);
    }
    expect(
      CC.routeAdvisor().recommendations.filter(r => r.action === 'steer').length,
      'the empty state must actually be reachable, or this asserts nothing',
    ).toBe(0);

    render(<SteerToSave />);
    const empty = screen.getByText(/nothing left to steer/i);
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).not.toMatch(/on the table/i);
  });

  it('never captures more than the public exposure it was carved from', () => {
    const publicBefore = CC.egress().pub;
    let captured = 0;
    for (let i = 0; i < 20; i++) {
      const rec = CC.routeAdvisor().recommendations.find(r => r.action === 'steer');
      if (!rec || steered.has(rec.flowId)) break;
      const before = CC.egress().total;
      CC.steerFlow(rec.flowId, rec.pathId);
      captured += before - CC.egress().total;
      steered.add(rec.flowId);
    }
    expect(captured).toBeLessThanOrEqual(publicBefore);
  });
});

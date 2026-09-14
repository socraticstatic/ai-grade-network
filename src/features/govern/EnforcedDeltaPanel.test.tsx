import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnforcedDeltaPanel } from './EnforcedDeltaPanel';
import type { EnforcementDelta } from './enforcementDelta';

function delta(over: Partial<EnforcementDelta> = {}): EnforcementDelta {
  return {
    ruleId: 'pol-dns',
    ruleName: 'Resolve DNS centrally',
    before: { posture: 60, violations: 3, enforced: 2, total: 8 },
    after: { posture: 64, violations: 1, enforced: 3, total: 8 },
    ...over,
  };
}

/** A delta where nothing but the enforcement count moved — the state that
 *  renders the "held" sentence. */
function heldDelta(): EnforcementDelta {
  return delta({
    before: { posture: 72, violations: 0, enforced: 6, total: 8 },
    after: { posture: 72, violations: 0, enforced: 7, total: 8 },
  });
}

describe('EnforcedDeltaPanel · live region lifecycle', () => {
  /* Screen readers commonly fail to announce a live region that is INSERTED
     already populated — aria-live announces changes to an existing region.
     So the region must be in the accessibility tree from first render,
     empty, and only its CONTENTS may change when an enforce lands. */

  it('mounts the live region empty, before any enforce', () => {
    render(<EnforcedDeltaPanel delta={null} />);
    const region = screen.getByTestId('govern-enforced-delta');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('announces into the SAME node — content appears without the region remounting', () => {
    const { rerender } = render(<EnforcedDeltaPanel delta={null} />);
    const regionBefore = screen.getByTestId('govern-enforced-delta');

    rerender(<EnforcedDeltaPanel delta={delta()} />);
    const regionAfter = screen.getByTestId('govern-enforced-delta');

    // Reference equality: the very node that existed empty now carries the
    // announcement. A remount (new node) is exactly the defect under test.
    expect(regionAfter).toBe(regionBefore);
    expect(regionAfter).not.toBeEmptyDOMElement();
    expect(regionAfter.textContent).toContain('Resolve DNS centrally');
  });

  it('a second enforce swaps contents inside the same region node', () => {
    const { rerender } = render(<EnforcedDeltaPanel delta={delta()} />);
    const region = screen.getByTestId('govern-enforced-delta');

    rerender(
      <EnforcedDeltaPanel delta={delta({ ruleId: 'pol-perimeter', ruleName: 'Harden the perimeter' })} />,
    );
    expect(screen.getByTestId('govern-enforced-delta')).toBe(region);
    expect(region.textContent).toContain('Harden the perimeter');
    expect(region.textContent).not.toContain('Resolve DNS centrally');
  });
});

describe('EnforcedDeltaPanel · held sentence names its rule', () => {
  /* The recommendation band directly beneath this panel says "Enforcing
     <next rule> guards against future drift" about a DIFFERENT rule. A
     bare "this rule" here would bind, visually, to whichever rule the eye
     lands on. The panel must name the rule it means. */

  it('says which rule guards against drift, never "this rule"', () => {
    render(<EnforcedDeltaPanel delta={heldDelta()} />);
    const held = screen.getByTestId('govern-enforced-held');
    expect(held.textContent).not.toMatch(/this rule/i);
    expect(held.textContent).toContain('Resolve DNS centrally');
    expect(held.textContent).toMatch(/guards against future drift/i);
  });

  it('does not phrase the guarantee as the band phrases its recommendation', () => {
    // The band says "Enforcing X guards…" (future act). The panel reports a
    // completed act, so it must not open with the same "Enforcing" claim —
    // stacked, the two would read as one sentence about two rules.
    render(<EnforcedDeltaPanel delta={heldDelta()} />);
    const held = screen.getByTestId('govern-enforced-held');
    expect(held.textContent).not.toMatch(/Enforcing\s/);
  });
});

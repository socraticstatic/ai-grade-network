import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupBuilder } from './GroupBuilder';
import { CC } from '../../engine';
import { applyEstateProfile } from '../../engine/estateProfile';
import { ROLLUP_THRESHOLD } from '../discover/discoveryModel';

/* Fix-wave review Finding 4 — GroupBuilder rendered one checkbox row per
 * pickable branch/VPC (4,213 rows under meridian's mixed kind), violating
 * the plan's Global Constraint: no component renders a per-entity row for
 * a collection larger than ROLLUP_THRESHOLD (50). The engine is a shared
 * singleton — every meridian test restores acme in `finally`. */
const renderBuilder = () => render(<GroupBuilder open onOpenChange={() => {}} />);

function chooseMixedKind() {
  fireEvent.change(screen.getByLabelText('This group contains'), { target: { value: 'mixed' } });
}

describe('GroupBuilder member picker row cap', () => {
  afterEach(() => {
    applyEstateProfile(CC as never, 'acme');
  });

  it('under meridian, renders at most ROLLUP_THRESHOLD member rows plus one overflow row', () => {
    applyEstateProfile(CC as never, 'meridian');
    try {
      renderBuilder();
      chooseMixedKind();
      const rows = screen.getAllByTestId('member-row');
      expect(rows.length).toBeLessThanOrEqual(ROLLUP_THRESHOLD);
      expect(rows.length).toBe(ROLLUP_THRESHOLD); // meridian's estate is well past threshold
      const more = screen.getByTestId('member-row-more');
      expect(more).toBeInTheDocument();
      expect(more.textContent).toMatch(/more.*narrow by class or region/i);
    } finally {
      applyEstateProfile(CC as never, 'acme');
    }
  });

  it('under acme, renders all 6 sites/vpcs unchanged with no overflow row (byte-equivalence)', () => {
    renderBuilder();
    chooseMixedKind();
    const rows = screen.getAllByTestId('member-row');
    // acme seed: 6 branches (state.ts) — the site kind alone
    fireEvent.change(screen.getByLabelText('This group contains'), { target: { value: 'site' } });
    const siteRows = screen.getAllByTestId('member-row');
    expect(siteRows).toHaveLength(6);
    expect(screen.queryByTestId('member-row-more')).not.toBeInTheDocument();
    expect(rows.length).toBeLessThanOrEqual(ROLLUP_THRESHOLD);
  });
});

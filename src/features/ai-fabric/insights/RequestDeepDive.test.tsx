import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CC } from '../../../engine';
import { requestRows, EMPTY_FILTERS } from './insightsFigures';
import { requestVerdict, requestFacets } from './requestAnalysis';
import { RequestDeepDive } from './RequestDeepDive';

/* The decision log starts empty under test (state-console.ts only starts the
   agents that would otherwise drive it outside `underTest`) - so this suite
   drives a handful of real traces itself, the same way insightsFigures.test.ts
   does, to give `rows` the identities/models/outcomes the facets and verdict
   are meant to describe. */
CC.promptTrace!('rd-helion', 'helion-70b', 'request deep dive test · rd-helion 1');
CC.promptTrace!('rd-helion', 'helion-70b', 'request deep dive test · rd-helion 2');
CC.promptTrace!('shared-services', 'gpt-class', 'request deep dive test · shared-services');
/* classified-helion's token policy carries guardrail:true and scope
   'no-external'. scopeDenies only ever denies modelId 'gpt-class', so
   routing it to helion-70b instead clears the gate and lands on
   recordDecision(true, true, ...) - a genuine ok:true, guarded:true row,
   the same shape GovernanceDecisions.tsx counts as its Guardrail bar. */
CC.promptTrace!('classified-helion', 'helion-70b', 'request deep dive test · classified-helion guarded');
CC.promptTrace!('classified-helion', 'gpt-class', 'request deep dive test · classified-helion denied');

const rows = requestRows(CC);

describe('RequestDeepDive', () => {
  it('opens with the requests verdict', () => {
    render(<RequestDeepDive rows={rows} filters={EMPTY_FILTERS} onFiltersChange={() => {}} />);
    expect(screen.getByTestId('requests-verdict').textContent).toBe(requestVerdict(rows));
  });
  it('clicking a facet bucket applies that filter; clicking it again clears it', () => {
    const spy = vi.fn();
    const model = requestFacets(rows).find(f => f.id === 'model')!.buckets[0];
    const { rerender } = render(<RequestDeepDive rows={rows} filters={EMPTY_FILTERS} onFiltersChange={spy} />);
    fireEvent.click(screen.getByTestId(`facet-model-${model.filterValue}`));
    expect(spy).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, model: model.filterValue });
    rerender(<RequestDeepDive rows={rows} filters={{ ...EMPTY_FILTERS, model: model.filterValue }} onFiltersChange={spy} />);
    const active = screen.getByTestId(`facet-model-${model.filterValue}`);
    expect(active).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(active);
    expect(spy).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, model: 'all' });
  });
  it('outlier lists render at most five rows each and open the drawer', () => {
    render(<RequestDeepDive rows={rows} filters={EMPTY_FILTERS} onFiltersChange={() => {}} />);
    const cost = screen.getByTestId('outliers-cost');
    expect(cost.querySelectorAll('[data-testid^="outlier-row-"]').length).toBeLessThanOrEqual(5);
    fireEvent.click(cost.querySelector('[data-testid^="outlier-row-"]')!);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

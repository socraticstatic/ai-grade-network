import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CC } from '../../../engine';
import { KpiStrip } from './KpiStrip';
import { RequestsFilterBar } from './RequestsFilterBar';
import { RequestsTable } from './RequestsTable';
import {
  insightKpis,
  requestRows,
  applyFilters,
  sortRows,
  windowRows,
  EMPTY_FILTERS,
  type InsightRequestRow,
  type RequestFilters,
} from './insightsFigures';
import { fmtUsd } from '../aiSpend';

/* The three request-panel pieces, wired the way InsightsPage wires them:
   filter state above, derivation between, table below. The engine is driven
   (promptTrace) rather than mocked - these are the rows a user would see. */

function Harness() {
  const [filters, setFilters] = useState<RequestFilters>(EMPTY_FILTERS);
  const rows = requestRows(CC);
  const visible = applyFilters(rows, filters);
  return (
    <div>
      <RequestsFilterBar rows={rows} filters={filters} onChange={setFilters} />
      <RequestsTable rows={visible} />
    </div>
  );
}

describe('KpiStrip', () => {
  /* Row 80 of the phase-0 metric audit: "Requests" cut — four KPIs, not
     five. */
  it('renders the four engine KPIs', () => {
    render(<KpiStrip kpis={insightKpis(CC)} />);
    ['tokens', 'cost', 'ttft', 'blocked'].forEach(key => {
      expect(screen.getByTestId(`kpi-${key}`)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('kpi-requests')).not.toBeInTheDocument();
    expect(screen.getByTestId('kpi-ttft')).toHaveTextContent('ms');
  });
});

describe('Requests panel', () => {
  it('a driven allowed trace renders 200 with green savings; a denial renders 403 with its reason', () => {
    CC.promptTrace!('rd-helion', 'helion-70b', 'requests panel test');
    CC.promptTrace!('classified-helion', 'gpt-class', 'requests panel test');
    render(<Harness />);
    const table = screen.getByTestId('requests-table');
    const denied = within(table).getAllByText('403');
    expect(denied.length).toBeGreaterThan(0);
    expect(within(table).getAllByText('200').length).toBeGreaterThan(0);
    expect(within(table).getAllByText(/no external models/i).length).toBeGreaterThan(0);
    // The allowed helion row carries a green savings cell with a percent line.
    const row = within(table).getAllByTestId(/^req-row-/).find(r =>
      r.textContent?.includes('rd-helion'),
    )!;
    expect(within(row).getByText(/%$/)).toBeInTheDocument();
  });

  it('search narrows, chips appear and clear, Clear all restores', () => {
    render(<Harness />);
    const countBefore = screen.getAllByTestId(/^req-row-/).length;
    expect(countBefore).toBeGreaterThanOrEqual(2);

    fireEvent.change(screen.getByTestId('req-search'), { target: { value: 'helion-70b' } });
    const narrowed = screen.getAllByTestId(/^req-row-/);
    expect(narrowed.length).toBeLessThan(countBefore);
    expect(screen.getByTestId('req-chip-q')).toHaveTextContent('helion-70b');

    fireEvent.change(screen.getByTestId('req-filter-status'), { target: { value: '403' } });
    expect(screen.getByTestId('req-chip-status')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('req-clear-all'));
    expect(screen.queryByTestId('req-chip-q')).toBeNull();
    expect(screen.getAllByTestId(/^req-row-/).length).toBe(countBefore);
  });

  it('a single chip × clears only its own key', () => {
    render(<Harness />);
    fireEvent.change(screen.getByTestId('req-filter-identity'), { target: { value: 'rd-helion' } });
    fireEvent.change(screen.getByTestId('req-search'), { target: { value: 'helion' } });
    expect(screen.getByTestId('req-chip-identity')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Clear Identity filter'));
    expect(screen.queryByTestId('req-chip-identity')).toBeNull();
    expect(screen.getByTestId('req-chip-q')).toBeInTheDocument();
  });
});

const mkRow = (
  over: Partial<InsightRequestRow> & { id: string },
): InsightRequestRow => ({
  ts: 0,
  time: '00:00:00',
  status: 200,
  ok: true,
  guarded: false,
  identity: 'agent',
  model: 'model',
  provider: 'provider',
  route: 'route',
  tokens: 0,
  cost: 0,
  costSaved: 0,
  savedPct: 0,
  ttftMs: 0,
  reason: null,
  ...over,
});

describe('sortRows', () => {
  it('orders by the sort key in both directions without mutating input', () => {
    const rows = [
      mkRow({ id: 'a', tokens: 300 }),
      mkRow({ id: 'b', tokens: 100 }),
      mkRow({ id: 'c', tokens: 200 }),
    ];
    const asc = sortRows(rows, { key: 'tokens', dir: 'asc' });
    expect(asc.map(r => r.id)).toEqual(['b', 'c', 'a']);
    const desc = sortRows(rows, { key: 'tokens', dir: 'desc' });
    expect(desc.map(r => r.id)).toEqual(['a', 'c', 'b']);
    // Non-mutating: the input keeps its original order.
    expect(rows.map(r => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts time on the raw timestamp, not the formatted string', () => {
    const rows = [
      mkRow({ id: 'late', ts: 2000 }),
      mkRow({ id: 'early', ts: 1000 }),
    ];
    expect(sortRows(rows, { key: 'time', dir: 'asc' }).map(r => r.id)).toEqual([
      'early',
      'late',
    ]);
  });

  it('is stable: equal values keep their incoming order', () => {
    const rows = [
      mkRow({ id: 'x', cost: 1, tokens: 5 }),
      mkRow({ id: 'y', cost: 1, tokens: 3 }),
      mkRow({ id: 'z', cost: 1, tokens: 4 }),
    ];
    expect(sortRows(rows, { key: 'cost', dir: 'desc' }).map(r => r.id)).toEqual([
      'x',
      'y',
      'z',
    ]);
    expect(sortRows(rows, { key: 'cost', dir: 'asc' }).map(r => r.id)).toEqual([
      'x',
      'y',
      'z',
    ]);
  });
});

describe('windowRows', () => {
  const sixty = Array.from({ length: 60 }, (_, i) => mkRow({ id: `r${i}` }));

  it('slices 25-row pages and reports page/pages/total', () => {
    const w1 = windowRows(sixty, 1);
    expect(w1.rows).toHaveLength(25);
    expect(w1.rows[0].id).toBe('r0');
    expect(w1).toMatchObject({ page: 1, pages: 3, total: 60 });

    const w3 = windowRows(sixty, 3);
    expect(w3.rows).toHaveLength(10);
    expect(w3.rows[0].id).toBe('r50');
  });

  it('clamps out-of-bounds pages instead of returning a blank page', () => {
    expect(windowRows(sixty, 99).page).toBe(3);
    expect(windowRows(sixty, 0).page).toBe(1);
    expect(windowRows(sixty, -5).rows[0].id).toBe('r0');
  });

  it('an empty set is one empty page', () => {
    expect(windowRows([], 1)).toMatchObject({ rows: [], page: 1, pages: 1, total: 0 });
  });

  it('honors a custom page size', () => {
    const w = windowRows(sixty, 2, 10);
    expect(w.rows[0].id).toBe('r10');
    expect(w.pages).toBe(6);
  });
});

describe('Requests table sorting', () => {
  it('clicking the Tokens header re-orders the rendered rows and sets aria-sort', () => {
    CC.promptTrace!('rd-helion', 'helion-70b', 'sort test');
    const rows = requestRows(CC);
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /Tokens/ }));
    const expectedDesc = windowRows(sortRows(rows, { key: 'tokens', dir: 'desc' }), 1);
    expect(
      screen.getAllByTestId(/^req-row-/).map(el => el.getAttribute('data-testid')),
    ).toEqual(expectedDesc.rows.map(r => `req-row-${r.id}`));
    expect(screen.getByRole('button', { name: /Tokens/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    fireEvent.click(screen.getByRole('button', { name: /Tokens/ }));
    const expectedAsc = windowRows(sortRows(rows, { key: 'tokens', dir: 'asc' }), 1);
    expect(
      screen.getAllByTestId(/^req-row-/).map(el => el.getAttribute('data-testid')),
    ).toEqual(expectedAsc.rows.map(r => `req-row-${r.id}`));
    expect(screen.getByRole('button', { name: /Tokens/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('defaults to newest-first: rendered order matches time desc', () => {
    const rows = requestRows(CC);
    render(<Harness />);
    const expected = windowRows(sortRows(rows, { key: 'time', dir: 'desc' }), 1);
    expect(
      screen.getAllByTestId(/^req-row-/).map(el => el.getAttribute('data-testid')),
    ).toEqual(expected.rows.map(r => `req-row-${r.id}`));
  });
});

describe('Request drawer', () => {
  it('clicking a row opens the drawer with that row identity and cost; Escape closes it', () => {
    CC.promptTrace!('rd-helion', 'helion-70b', 'drawer test');
    const row = sortRows(requestRows(CC), { key: 'time', dir: 'desc' }).find(
      r => r.ok && r.identity === 'rd-helion',
    )!;
    render(<Harness />);
    expect(screen.queryByTestId('request-drawer')).toBeNull();

    fireEvent.click(screen.getByTestId(`req-row-${row.id}`));
    const drawer = screen.getByTestId('request-drawer');
    expect(drawer).toHaveAttribute('role', 'dialog');
    expect(within(drawer).getByText('rd-helion')).toBeInTheDocument();
    expect(within(drawer).getAllByText(fmtUsd(row.cost)).length).toBeGreaterThan(0);
    expect(drawer).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('request-drawer')).toBeNull();
  });

  it('the X closes the drawer', () => {
    const row = sortRows(requestRows(CC), { key: 'time', dir: 'desc' })[0];
    render(<Harness />);
    fireEvent.click(screen.getByTestId(`req-row-${row.id}`));
    fireEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('request-drawer')).toBeNull();
  });

  it('a denial row opens with the 403 banner, its reason, and the nothing-metered note', () => {
    CC.promptTrace!('classified-helion', 'gpt-class', 'drawer denial test');
    const denial = sortRows(requestRows(CC), { key: 'time', dir: 'desc' }).find(
      r => !r.ok,
    )!;
    render(<Harness />);
    fireEvent.click(screen.getByTestId(`req-row-${denial.id}`));

    const drawer = screen.getByTestId('request-drawer');
    expect(within(drawer).getByText(/403/)).toBeInTheDocument();
    expect(within(drawer).getByText(denial.reason as string)).toBeInTheDocument();
    expect(within(drawer).getAllByText(fmtUsd(0)).length).toBeGreaterThan(0);
    expect(within(drawer).getByText(/Nothing was metered/)).toBeInTheDocument();
  });
});

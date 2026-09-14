import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RulesPanel } from './RulesPanel';
import { CC } from '../../engine';

/* RulesPanel now mounts ProposalBand above the table, and ProposalBand's
   actions are react-router <Link>s - rendering RulesPanel outside a Router
   throws ("Cannot destructure property 'basename' ..."). These tests exercise
   the rules table itself, not routing, so a MemoryRouter wrapper is enough. */
const renderPanel = () => render(<MemoryRouter><RulesPanel /></MemoryRouter>);

/* A group rule is stored with a structured src ({group}) and a structured dst
   ({group}). Both cells in the rules table used to read only src.tag and
   interpolate rule.dst directly, which rendered "any / allow → [object
   Object]" — a policy a person cannot read is a policy a person cannot
   trust. These assertions are the readability floor. */
describe('RulesPanel · group rules', () => {
  beforeAll(() => {
    CC.addRule({
      name: 'west branch access',
      src: { group: 'west-branches' },
      dst: { group: 'west-workloads' },
      ports: 'any',
      action: 'allow',
      chain: [],
    });
  });

  function groupRow() {
    return screen.getByText('west branch access').closest('tr') as HTMLTableRowElement;
  }

  it('names both groups in plain language rather than rendering [object Object]', () => {
    renderPanel();
    const row = groupRow();
    expect(row.textContent).not.toContain('[object Object]');
    expect(row.textContent).not.toContain('undefined');
    expect(row).toHaveTextContent('West branches');
    expect(row).toHaveTextContent('West workloads');
  });

  it('does not let "any" stand in for a named source group', () => {
    renderPanel();
    // The Match cell is the second column.
    const matchCell = groupRow().querySelectorAll('td')[1];
    expect(matchCell.textContent).not.toMatch(/\bany\b/);
    expect(matchCell.textContent).toContain('West branches');
  });

  it('still renders legacy tag rules exactly as before', () => {
    renderPanel();
    const row = screen.getByText('Block finance direct internet').closest('tr') as HTMLTableRowElement;
    const cells = row.querySelectorAll('td');
    expect(cells[1].textContent).toContain('finance-invoices');
    expect(cells[2].textContent).toContain('deny → internet');
  });

  it('renders intra-group / not-intra-group destinations as readable phrases', () => {
    CC.addRule({
      name: 'keep west traffic inside west',
      src: { group: 'west-branches' },
      dst: 'not-intra-group',
      ports: 'any',
      action: 'deny',
      chain: [],
    });
    renderPanel();
    const row = screen.getByText('keep west traffic inside west').closest('tr') as HTMLTableRowElement;
    expect(row.textContent).toContain('outside the group');
    expect(row.textContent).not.toContain('not-intra-group');
  });
});

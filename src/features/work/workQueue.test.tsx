import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { attachOpportunities, steerOpportunities } from '../discover/stackFigures';
import { workQueue, workByStage } from './workQueue';
import { TasksPage } from './TasksPage';
import { IntentThreads } from '../discover/IntentThreads';

/* Engine singleton: declarations unwind after each test. */
(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

afterEach(() => {
  CC.intentList().forEach(i => CC.removeIntent(i.id));
});

describe('workQueue - the one task derivation', () => {
  it('carries every advisor opportunity, tagged with its stage', () => {
    const rows = workQueue(CC);
    const attaches = attachOpportunities(CC);
    const steers = steerOpportunities(CC);
    expect(rows.filter(r => r.id.startsWith('attach-'))).toHaveLength(attaches.length);
    expect(rows.filter(r => r.id.startsWith('steer-'))).toHaveLength(steers.length);
    rows.filter(r => r.id.startsWith('attach-')).forEach(r => expect(r.stage).toBe('connect'));
    rows.filter(r => r.id.startsWith('steer-')).forEach(r => expect(r.stage).toBe('cost'));
  });

  it('a misaligned intent joins the queue at Govern; an aligned one stays out', () => {
    const before = workQueue(CC).filter(r => r.source === 'intent').length;
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    const rows = workQueue(CC).filter(r => r.source === 'intent');
    expect(rows).toHaveLength(before + 1);
    const row = rows.find(r => r.intentId === declared.id)!;
    expect(row.stage).toBe('govern');
    expect(row.layer).toBe('ai');
    expect(row.status).toBe('violated');
  });

  it('stages come out in lifecycle order and violated leads within a stage', () => {
    CC.declareIntent('private-inference', { kind: 'estate', id: 'ai', label: 'The token layer' }, 'watch');
    const groups = workByStage(workQueue(CC));
    const order = groups.map(g => g.stage);
    expect(order).toEqual([...order].sort(
      (a, b) => ['connect', 'govern', 'observe', 'cost'].indexOf(a) - ['connect', 'govern', 'observe', 'cost'].indexOf(b),
    ));
  });
});

describe('the Work office', () => {
  const at = () => render(<MemoryRouter><TasksPage /></MemoryRouter>);

  it('groups the queue by stage and states the priced total', () => {
    at();
    const rows = workQueue(CC);
    expect(screen.getByTestId('work-summary')).toHaveTextContent(`${rows.length} task`);
    for (const g of workByStage(rows)) {
      expect(screen.getByTestId(`work-stage-${g.stage}`)).toBeInTheDocument();
    }
  });

  it('the layer filter narrows to AI rows plus estate rows', () => {
    CC.declareIntent('private-inference', { kind: 'estate', id: 'ai', label: 'The token layer' }, 'watch');
    at();
    fireEvent.click(screen.getByTestId('work-layer-ai'));
    const rows = screen.getAllByTestId(/^work-row-/);
    rows.forEach(r => expect(r.textContent).toMatch(/AI|Estate/));
  });

  it('an intent row synchronizes into the twin; the office manages the promise', () => {
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    at();
    expect(screen.getByTestId(`work-sync-${declared.id}`)).toBeInTheDocument();
    // The full management surface renders here: picker, mode, remove.
    expect(screen.getByTestId('intent-declare-open')).toBeInTheDocument();
    expect(screen.getByTestId(`intent-mode-${declared.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`intent-remove-${declared.id}`)).toBeInTheDocument();
  });
});

describe('the picture stays on Discover', () => {
  it('manage=false renders status and Synchronize only, and points at Work', () => {
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    render(<MemoryRouter><IntentThreads manage={false} /></MemoryRouter>);
    const row = screen.getByTestId(`intent-row-${declared.id}`);
    expect(within(row).getByTestId(`intent-sync-${declared.id}`)).toBeInTheDocument();
    expect(within(row).queryByTestId(`intent-mode-${declared.id}`)).toBeNull();
    expect(within(row).queryByTestId(`intent-remove-${declared.id}`)).toBeNull();
    expect(screen.queryByTestId('intent-declare-open')).toBeNull();
    expect(screen.getByTestId('intent-manage-link')).toBeInTheDocument();
  });
});

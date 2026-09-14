import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useFlowProgress } from './useFlowProgress';
import { CC } from '../../engine';

// Render the hook on a non-Govern route so Govern's status comes purely from
// the doneByStage derivation (not from being the "current" route).
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/discover']}>{children}</MemoryRouter>
);
const governStatus = () => renderHook(() => useFlowProgress(), { wrapper }).result.current.find(s => s.stage === 'govern')!.status;

// Status of a given stage, rendered on an arbitrary route (default /discover so
// no stage is the "current" one unless we say so).
const statusOn = (stage: string, route = '/discover') => {
  const w = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
  return renderHook(() => useFlowProgress(), { wrapper: w }).result.current.find(s => s.stage === stage)!.status;
};

const FIX_KEYS = ['isolateFinance', 'fwInspection', 'segmentHelion', 'dnsFirewall', 'dataPerimeter', 'shiftAws', 'renumbered'];

describe('useFlowProgress — Govern completion is rule-linked, not any-fix', () => {
  beforeEach(() => {
    for (const k of FIX_KEYS) CC.fixes[k] = false;
  });

  it('applying the non-rule posture fix shiftAws alone does NOT mark Govern done', () => {
    CC.fixes.shiftAws = true;
    expect(governStatus()).toBe('upcoming');
  });

  it('applying the non-rule fix renumbered alone does NOT mark Govern done', () => {
    CC.fixes.renumbered = true;
    expect(governStatus()).toBe('upcoming');
  });

  it('applying a rule-linked fix (isolateFinance) DOES mark Govern done', () => {
    CC.fixes.isolateFinance = true;
    expect(governStatus()).toBe('done');
  });
});

describe('useFlowProgress — Connect/Observe/Cost boundaries + current-wins', () => {
  beforeEach(() => {
    for (const k of FIX_KEYS) CC.fixes[k] = false;
  });

  it('Connect: seed (attached == baseline, single on-ramp) is upcoming — a > → >= slip on attached would fail this', () => {
    // Seed has exactly one active on-ramp and no extra attach, so neither
    // `attached > BASELINE` nor `activeOnramps >= 2` holds.
    expect(statusOn('connect')).toBe('upcoming');
  });

  it('Connect: attaching a second on-ramp (attached > baseline, activeOnramps >= 2) marks it done', () => {
    expect(CC.activateOnramp('nb2')).toBe(true);
    expect(statusOn('connect')).toBe('done');
    CC.undo();
    expect(statusOn('connect')).toBe('upcoming'); // cleanly reverts
  });

  it('Cost: seed is upcoming; steering a flow beyond the baseline count marks it done (strict > boundary)', () => {
    expect(statusOn('cost')).toBe('upcoming');
    const rec = CC.routeAdvisor().recommendations.find(r => r.action === 'steer');
    expect(rec).toBeTruthy();
    CC.steerFlow(rec!.flowId, rec!.pathId);
    expect(statusOn('cost')).toBe('done');
    CC.clearSteer(rec!.flowId);
    expect(statusOn('cost')).toBe('upcoming');
  });

  it('Observe: soft-derives from Govern — done once a rule/fix is enforced', () => {
    expect(statusOn('observe')).toBe('upcoming');
    CC.fixes.isolateFinance = true;
    expect(statusOn('observe')).toBe('done');
  });

  it('current route wins over a done derivation: on /govern, Govern renders current even when enforced', () => {
    CC.fixes.isolateFinance = true;
    // Off-route it would be "done"; on its own route it must be "current".
    expect(statusOn('govern')).toBe('done');
    expect(statusOn('govern', '/naas/govern')).toBe('current');
  });
});

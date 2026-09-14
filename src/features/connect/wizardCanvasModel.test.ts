import { describe, it, expect } from 'vitest';
import { computeWizardCanvas, type WizardCanvasSpec } from './wizardCanvasModel';

const spec = (over: Partial<WizardCanvasSpec> = {}): WizardCanvasSpec => ({
  left: { label: 'Equinix DC2', sub: 'Direct Connect' },
  right: { label: 'us-west-2', sub: 'AWS' },
  thickness: 'medium',
  dual: false,
  edgeAnswered: true,
  leftAnswered: true,
  rightAnswered: true,
  ...over,
});

describe('computeWizardCanvas', () => {
  it('lays the three stations left to right on one axis', () => {
    const g = computeWizardCanvas(spec());
    expect(g.leftNode.x).toBeLessThan(g.band.x);
    expect(g.band.x + g.band.w).toBeLessThan(g.rightNode.x);
    expect(g.viewW).toBe(460);
    expect(g.viewH).toBe(120);
  });
  it('edges connect node edge to band edge', () => {
    const g = computeWizardCanvas(spec());
    expect(g.leftEdge.startsWith(`M ${g.leftNode.x + g.leftNode.w}`)).toBe(true);
    expect(g.rightEdge.startsWith(`M ${g.band.x + g.band.w}`)).toBe(true);
  });
  it('thickness maps thin/medium/thick to 1.5/2.5/4', () => {
    expect(computeWizardCanvas(spec({ thickness: 'thin' })).strokeWidth).toBe(1.5);
    expect(computeWizardCanvas(spec({ thickness: 'medium' })).strokeWidth).toBe(2.5);
    expect(computeWizardCanvas(spec({ thickness: 'thick' })).strokeWidth).toBe(4);
  });
  it('is deterministic', () => {
    expect(computeWizardCanvas(spec())).toEqual(computeWizardCanvas(spec()));
  });
});

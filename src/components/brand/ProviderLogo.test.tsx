import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProviderLogo } from './ProviderLogo';
import { COLOR } from './providerMarks';

describe('ProviderLogo', () => {
  it('renders an svg brand path for a mark provider (aws)', () => {
    const { container } = render(<ProviderLogo id="aws" size={28} />);
    const path = container.querySelector('svg path');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('d')?.length ?? 0).toBeGreaterThan(20);
  });

  it('renders a monogram (not an svg path) for a neocloud provider (cw)', () => {
    const { container } = render(<ProviderLogo id="cw" />);
    expect(container.querySelector('svg path')).toBeNull();
    expect(screen.getByText('CW')).toBeInTheDocument();
  });

  it('exposes a human-readable aria-label per provider', () => {
    render(<ProviderLogo id="gcp" />);
    expect(screen.getByLabelText('Google Cloud')).toBeInTheDocument();
  });

  it('applies the brand color to the mark fill', () => {
    const { container } = render(<ProviderLogo id="aws" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('fill')).toBe(COLOR.aws);
  });

  it('darkens the monogram text below the pale brand hue so it clears WCAG AA on the faint wash', () => {
    render(<ProviderLogo id="neb" />);
    const mono = screen.getByText('NB');
    // Not the raw pale brand color (#42d6c8 fails 4.5:1 on the wash) — a darker,
    // same-hue variant. Assert it is darker than the brand color on every channel.
    const raw = COLOR.neb.replace('#', '');
    const [br, bg, bb] = [0, 2, 4].map(i => parseInt(raw.slice(i, i + 2), 16));
    const style = getComputedStyle(mono).color; // rgb(r, g, b)
    const [mr, mg, mb] = style.match(/\d+/g)!.map(Number);
    expect(mr).toBeLessThan(br);
    expect(mg).toBeLessThan(bg);
    expect(mb).toBeLessThan(bb);
    // And genuinely dark (each channel well under mid) so contrast holds.
    expect(Math.max(mr, mg, mb)).toBeLessThan(128);
  });
});

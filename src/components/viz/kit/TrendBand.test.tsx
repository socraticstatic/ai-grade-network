import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendBand } from './TrendBand';

const series = [{ t: '10:00', v: 1 }, { t: '10:01', v: 4 }, { t: '10:02', v: 2 }];

describe('TrendBand', () => {
  it('renders the band without a cursor by default', () => {
    render(<TrendBand series={series} />);
    expect(screen.getByTestId('trend-band')).toBeInTheDocument();
    expect(screen.queryByTestId('trend-cursor')).not.toBeInTheDocument();
  });
  it('marks the reviewed instant when a cursor is set', () => {
    render(<TrendBand series={series} cursor={1} reviewing />);
    expect(screen.getByTestId('trend-cursor')).toBeInTheDocument();
  });
});

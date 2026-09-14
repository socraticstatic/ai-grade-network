import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderLogo, providerLogoUrl } from './ProviderLogo';

describe('providerLogoUrl', () => {
  it('maps known cloud providers to a bundled brand logo (case-insensitive)', () => {
    expect(providerLogoUrl('AWS')).toMatch(/aws/i);
    expect(providerLogoUrl('azure')).toMatch(/azure/i);
    expect(providerLogoUrl('Google')).toMatch(/google/i);
    expect(providerLogoUrl('Oracle')).toMatch(/oracle/i);
  });

  it('returns null for an unknown provider', () => {
    expect(providerLogoUrl('Snowflake')).toBeNull();
  });
});

describe('ProviderLogo', () => {
  it('renders a brand logo image labelled with the provider', () => {
    render(<ProviderLogo provider="AWS" />);
    const img = screen.getByAltText(/AWS/i);
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toMatch(/aws/i);
  });

  it('falls back to a branded monogram for unknown providers', () => {
    render(<ProviderLogo provider="Snowflake" />);
    expect(screen.queryByAltText(/Snowflake/i)).toBeNull();
    expect(screen.getByText('S')).toBeTruthy();
  });
});

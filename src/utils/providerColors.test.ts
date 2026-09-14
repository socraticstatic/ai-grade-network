import { describe, it, expect } from 'vitest';
import { providerColor } from './providerColors';

describe('providerColor', () => {
  it('returns the brand color for a known provider', () => {
    expect(providerColor('AWS')).toBe('#ff9900');
    expect(providerColor('Azure')).toBe('#0089d6');
  });

  it('is case-insensitive (handles lowercase topology keys)', () => {
    expect(providerColor('aws')).toBe('#ff9900');
    expect(providerColor('azure')).toBe('#0089d6');
  });

  it('returns a neutral fallback for unknown or missing providers', () => {
    expect(providerColor('Snowflake')).toBe('#94a3b8');
    expect(providerColor(undefined)).toBe('#94a3b8');
  });
});

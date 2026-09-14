import { describe, it, expect } from 'vitest';
import { getLegProviderContext } from './legProviderContext';

describe('getLegProviderContext', () => {
  it('maps AWS to Direct Connect with the AWS-side ASN', () => {
    const c = getLegProviderContext('AWS');
    expect(c.nativeObject).toMatch(/Direct Connect/i);
    expect(c.asn).toBe(7224);
  });

  it('maps Azure to ExpressRoute with the Microsoft-side ASN', () => {
    const c = getLegProviderContext('Azure');
    expect(c.nativeObject).toMatch(/ExpressRoute/i);
    expect(c.asn).toBe(12076);
  });

  it('maps Google to Cloud Interconnect with the Google-side ASN', () => {
    const c = getLegProviderContext('Google');
    expect(c.nativeObject).toMatch(/Interconnect/i);
    expect(c.asn).toBe(16550);
  });

  it('maps Oracle to FastConnect with the Oracle-side ASN', () => {
    const c = getLegProviderContext('Oracle');
    expect(c.nativeObject).toMatch(/FastConnect/i);
    expect(c.asn).toBe(31898);
  });

  it('returns a safe fallback for an unknown provider', () => {
    const c = getLegProviderContext('IBM');
    expect(c.nativeObject).toBeTruthy();
    expect(c.transport).toBeTruthy();
  });
});

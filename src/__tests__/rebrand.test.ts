import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

describe('rebrand', () => {
  // UserProfile.tsx links to real, unrenamed external GitHub release assets
  // (e.g. github.com/.../NetBond_Advanced/releases/.../AT.T.NetBond.Advanced...).
  // Those are link targets, not display copy — rewriting them would point to a
  // non-existent file, so this file is intentionally excluded from the scan.
  //
  // mockTenants.ts and mockTenantData.ts intentionally give the "Acme Corp" /
  // "AcmeCloud Networks" demo tenants a productName of "AcmeCloud Connect" —
  // that is THAT fictional customer's own white-label brand (used to
  // demonstrate multi-tenant branding), not a reference to our portal's old
  // "AT&T Cloud Connect" name. Renaming it would break the multi-tenancy demo
  // and is excluded from the scan.
  //
  // pathEvidence.ts / PathChoice.test.tsx: the "Direct cloud connect" path
  // label is generic descriptive copy for a connectivity path type (verb
  // "connect", not the proper-noun brand) — it predates and is unrelated to
  // the old "Cloud Connect" portal name.
  //
  // ArbitrageHero.tsx and CostPage.test.tsx: the local variable / test
  // description shorthand `cloudConnect` (short for the `cloudConnectBill`
  // code identifier defined in engine/types.ts) is a code identifier, not
  // display copy — identifiers are out of scope for this rebrand.
  const excluded = [
    'src/components/profile/UserProfile.tsx',
    'src/data/mockTenants.ts',
    'src/data/mockTenantData.ts',
    'src/features/connect/pathEvidence.ts',
    'src/features/connect/PathChoice.test.tsx',
    'src/features/cost/ArbitrageHero.tsx',
    'src/features/cost/CostPage.test.tsx',
  ];

  const getTrackedFiles = () => {
    const tracked = execSync('git ls-files', { cwd: process.cwd(), encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

    return tracked.filter(f =>
      !f.endsWith('rebrand.test.ts') &&
      !excluded.some(e => f.endsWith(e)) &&
      (
        /^src\/.*\.(ts|tsx|html)$/.test(f) ||
        f === 'package.json' ||
        /^electron\/.*\.cjs$/.test(f) ||
        f === 'index.html'
      )
    );
  };

  it('has no old-brand strings in tracked shipped files (markup/®-tolerant, excluding this test file)', () => {
    const files = getTrackedFiles();

    const oldBrandPattern = /NetBond[\s\S]{0,60}Advanced/i;
    const hits = files.filter(f => oldBrandPattern.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('has no "Cloud Connect" brand references in tracked shipped files (the portal is AT&T AI-grade network)', () => {
    const files = getTrackedFiles();

    // \b after "Connect" so generic phrases like "cloud connectivity" or
    // "direct cloud connection" (real, non-brand English) don't false-positive —
    // only the exact old brand token "Cloud Connect" is rejected.
    const oldBrandPattern = /Cloud\s*Connect\b/i;
    const hits = files.filter(f => oldBrandPattern.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('document title is AT&T AI-grade network', () => {
    expect(readFileSync('index.html', 'utf8')).toMatch(/<title>[^<]*AT&T AI-grade network/);
  });
});

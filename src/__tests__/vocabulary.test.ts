import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** Phase-1 vocabulary rules for the demo spine (see
 *  docs/superpowers/specs/2026-08-07-conversational-cloud-connect-design.md).
 *  Scan style mirrors rebrand.test.ts: tracked files, whole-file regex. */

const SPINE_DIRS = [
  'src/features/discover/',
  'src/features/connect/',
  'src/features/observe/',
  'src/features/_shared/',
];

// Comment-or-code-only acronym use, no rendered copy - glossing a code
// comment would be noise. Display copy in these areas renders elsewhere
// (e.g. attachmentModel's ASN values render in ChainDrawer, which IS scanned).
const excluded = [
  'src/features/discover/attachmentModel.ts',
  'src/features/connect/attachCatalog.ts',
];

const spineFiles = () =>
  execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .filter(f => SPINE_DIRS.some(d => f.startsWith(d)))
    .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
    .filter(f => !excluded.some(e => f === e));

describe('spine vocabulary', () => {
  it('every acronym on the spine is glossed at least once per file', () => {
    const ACRONYMS = ['SDCI', 'EVC', 'LMCC', 'VRF', 'BGP', 'MPLS', 'ASN'];
    const offenders: string[] = [];
    for (const f of spineFiles()) {
      const src = readFileSync(f, 'utf8');
      for (const a of ACRONYMS) {
        const used = new RegExp(`\\b${a}\\b`).test(src);
        // glossed = "BGP (route exchange)" or "... (BGP)" somewhere in the file
        const glossed = new RegExp(`${a}\\s*\\(|\\(${a}\\b`).test(src);
        if (used && !glossed) offenders.push(`${f}: ${a}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no bare "Cost" display label on the spine - savings-first framing', () => {
    const costLabel = />\s*Cost\s*<|label:\s*['"]Cost['"]/;
    const offenders = spineFiles().filter(f => costLabel.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** Owner rule (2026-08-07): spine visuals scale to their container - they
 *  never scroll sideways. SVGs with a viewBox already scale; a min-width
 *  plus overflow-x-auto forces a horizontal scrollbar instead. */
describe('no horizontal scroll on the spine', () => {
  it('no overflow-x-auto in spine feature code', () => {
    const files = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter(f => /^src\/features\/(discover|connect|observe)\//.test(f) && /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f));
    const hits = files.filter(f => /overflow-x-auto/.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

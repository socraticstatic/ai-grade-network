import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/** VizKit dependency guard: feature code draws with the kit, never with a
 *  chart library. Legacy monitoring widgets under src/components keep their
 *  imports until touched (they are unreachable from routed pages). */
describe('vizkit dependency guard', () => {
  it('no chart-library import under src/features/', () => {
    const files = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.startsWith('src/features/') && /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
    const banned = /from\s+['"](recharts|chart\.js|react-chartjs-2)['"]|import\(['"](recharts|chart\.js|react-chartjs-2)/;
    const hits = files.filter(f => banned.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

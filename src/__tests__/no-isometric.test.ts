import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('no isometric routing', () => {
  it('has no three.js dependency', () => {
    const pkg = JSON.parse(execSync('cat package.json', { encoding: 'utf8' }));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain('three');
  });

  it('has no isometric/three source files', () => {
    const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
    expect(tracked.filter(f => /routing-iso|three\.module|OrbitControls|RoundedBoxGeometry/i.test(f))).toEqual([]);
  });
});

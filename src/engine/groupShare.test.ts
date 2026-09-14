// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { CC } from './index';

describe('group session plumbing', () => {
  // On a pristine engine serialize() returns '' (nothing to carry), so the
  // "custom group present" mutation has to land first - only then does the
  // payload have content, and only then is checking "seeded groups absent"
  // meaningful rather than a degenerate empty-string decode.
  it('carries custom groups through serialize', () => {
    CC.addGroup({ id: 'share-grp', label: 'Share', kind: 'workload', members: ['vpcbak'], predicates: [] });
    const payload = CC.serialize();
    const decoded = JSON.parse(atob(payload));
    const ids = (decoded.groups || []).map((g: { id: string }) => g.id);
    expect(ids).toContain('share-grp');
  });

  it('does not serialize the built-in groups twice', () => {
    const decoded = JSON.parse(atob(CC.serialize()));
    const ids = (decoded.groups || []).map((g: { id: string }) => g.id);
    expect(ids).not.toContain('west-branches');
  });

  it('wires undo through addGroup (already implemented - confirming, not redoing)', () => {
    CC.addGroup({ id: 'undo-check-grp', label: 'Undo check', kind: 'workload', members: [], predicates: [] });
    expect(CC.canUndo()).toBeTruthy();
  });
});

/* hydrate() guards itself with a module-level `hydrated` flag so a real
   payload can only ever be applied once per engine instance. To exercise it
   more than once we need a fresh engine per test: reset the module registry
   and re-import './index', which re-runs window.CC = (function(){...})()
   from scratch (state.ts) - a brand new `groups` store and a fresh
   `hydrated` flag, isolated from the describe block above. */
async function freshCC() {
  vi.resetModules();
  const mod = await import('./index');
  return mod.CC;
}
function toShareParam(obj: unknown) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('group session plumbing - hydrate', () => {
  it('restores custom groups from a share payload via hydrate()', async () => {
    const CC2 = await freshCC();
    const payload = toShareParam({ groups: [{ id: 'hydrate-grp', label: 'Hydrated', kind: 'workload', members: [], predicates: [], desc: 'from link' }] });
    window.history.replaceState(null, '', '?s=' + payload);
    const ok = CC2.hydrate();
    expect(ok).toBe(true);
    const ids = CC2.groupList().map((g: { id: string }) => g.id);
    expect(ids).toContain('hydrate-grp');
  });

  it('hydrates cleanly when the payload has no groups key at all (backward compatibility)', async () => {
    const CC2 = await freshCC();
    const before = CC2.groupList().length;
    const payload = toShareParam({ o: [], f: [] });
    window.history.replaceState(null, '', '?s=' + payload);
    // "cleanly" means a real success, not a caught-and-swallowed failure -
    // applyShareData's own try/catch would hide a thrown error behind a
    // `false` return, so assert true here rather than just "did not throw".
    const ok = CC2.hydrate();
    expect(ok).toBe(true);
    expect(CC2.groupList().length).toBe(before);
  });

  it('is safe to hydrate a group id that already exists - no throw, no half-restored state', async () => {
    const CC2 = await freshCC();
    // No `custom` marker on this hand-built payload - real serialize() output
    // always carries one (see below), so this simulates a stray/adversarial
    // payload that merely happens to name an existing seed id. That must
    // stay inert: no throw, no overwrite.
    const payload = toShareParam({ groups: [{ id: 'west-branches', label: 'clobber via hydrate', kind: 'workload', members: [], predicates: [] }] });
    window.history.replaceState(null, '', '?s=' + payload);
    const ok = CC2.hydrate();
    expect(ok).toBe(true);
    const after = CC2.groupList().find((g: { id: string }) => g.id === 'west-branches');
    expect(after.label).toBe('West branches');
    expect(after.custom).toBeFalsy();
  });

  // Finding: updateGroup() on a seeded group used to leave `custom` unset,
  // so serialize() (which only ever carries custom:true groups) silently
  // dropped the edit - the recipient replayed the pristine seed and the
  // edit vanished with no error. Proves the whole round trip: edit the
  // seed, serialize it, hydrate into a receiver that already has the seed,
  // and confirm the edited definition - not the original - wins.
  it('carries an edited seed through serialize+hydrate so the edit wins on a receiver that already has the seed', async () => {
    const edited = CC.updateGroup('west-workloads', {
      predicates: [{ source: 'cloudTag', key: 'Project', values: ['edited-only'] }],
    });
    expect(edited.custom).toBe(true);

    const payload = CC.serialize();
    const decoded = JSON.parse(atob(payload));
    const wired = (decoded.groups || []).find((g: { id: string }) => g.id === 'west-workloads');
    expect(wired).toBeTruthy(); // the edit actually made it onto the wire

    const CC2 = await freshCC();
    const before = CC2.groupList().find((g: { id: string }) => g.id === 'west-workloads');
    expect(before.predicates).toEqual([{ source: 'cloudTag', key: 'Region', values: ['west'] }]);

    window.history.replaceState(null, '', '?s=' + payload);
    const ok = CC2.hydrate();
    expect(ok).toBe(true);

    const after = CC2.groupList().find((g: { id: string }) => g.id === 'west-workloads');
    expect(after.predicates).toEqual([{ source: 'cloudTag', key: 'Project', values: ['edited-only'] }]);
    expect(after.custom).toBe(true);
  });
});

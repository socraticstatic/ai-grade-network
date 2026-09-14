import { describe, it, expect, vi } from 'vitest';
import { CC } from './index';

/* F5. serialize() base64-encoded with btoa(), which throws
   "InvalidCharacterError" on any code point above U+00FF. Two live sources of
   such characters reach the payload: a group's desc/label (free text the user
   edits) and addRule()'s generated fallback name, which is built as
   `${action} ${src} → ${dst}` with U+2192. Authoring a rule without naming it
   and then hitting Share threw and produced no link at all. */
async function freshCC() {
  vi.resetModules();
  const mod = await import('./index');
  return mod.CC;
}

describe('share payload encoding', () => {
  it('round-trips a group description containing non-Latin1 text', () => {
    CC.addGroup({
      id: 'em-dash-grp', label: 'Em dash — group', kind: 'workload',
      members: ['vpcbak'], predicates: [], desc: 'R&D · Project Helion — 東京 — ✅',
    });
    let payload = '';
    expect(() => { payload = CC.serialize(); }).not.toThrow();
    expect(payload).toBeTruthy();

    const decoded = JSON.parse(CC.b64decode(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const g = (decoded.groups || []).find((x: { id: string }) => x.id === 'em-dash-grp');
    expect(g.desc).toBe('R&D · Project Helion — 東京 — ✅');
    expect(g.label).toBe('Em dash — group');
  });

  it("round-trips addRule()'s generated name, which contains U+2192", () => {
    const r = CC.addRule({ src: { tag: 'rd-helion', cloud: 'any' }, dst: 'internet', action: 'deny' });
    expect(r.name).toContain('→'); // the arrow really is in the seeded name shape

    let payload = '';
    expect(() => { payload = CC.serialize(); }).not.toThrow();
    const decoded = JSON.parse(CC.b64decode(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const wired = (decoded.r || []).find((x: { n: string }) => x.n === r.name);
    expect(wired).toBeTruthy();
  });

  it('hydrates a legacy link produced by the old Latin-1 btoa() encoder', async () => {
    const CC2 = await freshCC();
    // Exactly what the old encoder emitted: btoa() over a JSON string whose
    // only non-ASCII character is Latin-1 (U+00B7), written as a raw 0xB7
    // byte - which is NOT valid UTF-8 and must not be decoded as such.
    const legacy = btoa(JSON.stringify({
      groups: [{ id: 'legacy-grp', label: 'Legacy · group', kind: 'workload', members: [], predicates: [], custom: true }],
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.replaceState(null, '', '?s=' + legacy);

    expect(CC2.hydrate()).toBe(true);
    const g = CC2.groupList().find((x: { id: string }) => x.id === 'legacy-grp');
    expect(g).toBeTruthy();
    expect(g.label).toBe('Legacy · group');
  });

  it('hydrates a link produced by the current encoder, non-Latin1 intact', async () => {
    const CC2 = await freshCC();
    const payload = CC.b64encode(JSON.stringify({
      groups: [{ id: 'utf8-grp', label: 'UTF-8 — group ✅', kind: 'workload', members: [], predicates: [], custom: true }],
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.replaceState(null, '', '?s=' + payload);

    expect(CC2.hydrate()).toBe(true);
    const g = CC2.groupList().find((x: { id: string }) => x.id === 'utf8-grp');
    expect(g.label).toBe('UTF-8 — group ✅');
  });
});

/* serialize()'s emptiness check omitted d.tp, so a session whose ONLY delta
   was a token-policy change minted an empty share link and the change
   silently didn't travel. The check can't simply add d.tp either: the tp
   filter passed every seeded policy (they all define `scope`), so tp must be
   delta-only or a pristine engine would start minting non-empty links. */
describe('token-policy deltas travel', () => {
  it('a token-policy-only session round-trips through shareUrl()/hydrate', async () => {
    const CC1 = await freshCC();
    window.history.replaceState(null, '', '/');
    CC1.setTokenPolicy('rd-helion', { enforced: true, budget: 500000 });

    const s = new URL(CC1.shareUrl()).searchParams.get('s');
    expect(s).toBeTruthy(); // was null: the emptiness check ignored d.tp

    const CC2 = await freshCC();
    window.history.replaceState(null, '', '?s=' + s);
    expect(CC2.hydrate()).toBe(true);
    const p = CC2.tokenPolicy('rd-helion');
    expect(p.enforced).toBe(true);
    expect(p.budget).toBe(500000);
  });

  it('a pristine session still mints an empty payload - unchanged seeds do not ride the wire', async () => {
    const CC1 = await freshCC();
    expect(CC1.serialize()).toBe('');
  });
});

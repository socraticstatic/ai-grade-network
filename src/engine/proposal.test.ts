import { describe, it, expect } from 'vitest';
import { CC } from './index';

/* The engine is a shared singleton — every test restores what it moves. */

const extractPayload = (url: string) => new URL(url).searchParams.get('s')!;

describe('proposalUrl / takeProposal', () => {
  it('round-trips: the link carries intentions, applyShareData surfaces them once', () => {
    const moves = [
      { kind: 'attach' as const, regionId: 'usw2' },
      { kind: 'steer' as const, flowId: 'f1', pathId: 'p1' },
    ];
    const raw = extractPayload(CC.proposalUrl(moves));
    expect(CC.applyShareData(raw)).toBe(true);
    expect(CC.takeProposal()).toEqual(moves);
    // Read-once: a remount cannot re-stage.
    expect(CC.takeProposal()).toBeNull();
  });

  it('a proposal link is never empty, even on a pristine session', () => {
    const url = CC.proposalUrl([{ kind: 'attach', regionId: 'usw2' }]);
    expect(extractPayload(url)).toBeTruthy();
  });

  it('malformed pr entries are dropped, never guessed', () => {
    const d = JSON.parse(CC.b64decode(extractPayload(CC.proposalUrl([]))
      .replace(/-/g, '+').replace(/_/g, '/')));
    d.pr = [['a'], ['x', 'usw2'], 'garbage', ['s', 'f1'], ['a', 'usw2']];
    const raw = CC.b64encode(JSON.stringify(d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(CC.applyShareData(raw)).toBe(true);
    expect(CC.takeProposal()).toEqual([{ kind: 'attach', regionId: 'usw2' }]);
  });

  it('a payload without pr leaves no pending proposal', () => {
    const plain = CC.serialize();
    if (plain) CC.applyShareData(plain);
    expect(CC.takeProposal()).toBeNull();
  });

  it('applyShareData never applies a proposal move to the estate', () => {
    const before = CC.fabricModel().regions.filter(r => r.attached).length;
    const raw = extractPayload(CC.proposalUrl([{ kind: 'attach', regionId: 'usw2' }]));
    CC.applyShareData(raw);
    expect(CC.fabricModel().regions.filter(r => r.attached).length).toBe(before);
    CC.takeProposal(); // clear
  });
});

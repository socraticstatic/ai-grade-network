import { describe, it, expect, afterEach } from 'vitest';
import { CC } from '../../engine';
import { parseIntent } from '../command/commandRegistry';
import { andiAnswer, andiResolveCards } from './andiBrain';

/**
 * Andi's declare grammar and drift queue, against the live engine. Every
 * phrase must resolve to an engine-known scope or parse to nothing - free
 * text never reaches a mutation. Mutating tests clean up what they declare.
 */

(CC.agentList() as { id: string; enabled: boolean }[])
  .filter(a => a.enabled)
  .forEach(a => CC.toggleAgent(a.id));

afterEach(() => {
  CC.intentList().forEach(i => CC.removeIntent(i.id));
});

describe('the declare grammar', () => {
  it('keep <sensitivity-tag> private declares data-sensitivity for that tag', () => {
    const cmds = parseIntent('keep classified-helion private', CC);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].kind).toBe('declare');
    expect(cmds[0].label).toMatch(/watch mode/);
    cmds[0].run();
    const declared = CC.intentList();
    expect(declared).toHaveLength(1);
    expect(declared[0].key).toBe('data-sensitivity');
    expect(declared[0].scope.id).toBe('classified-helion');
    expect(declared[0].mode).toBe('watch');
  });

  it('keep ai private declares the token-layer estate intent', () => {
    const cmds = parseIntent('keep ai private', CC);
    expect(cmds).toHaveLength(1);
    cmds[0].run();
    expect(CC.intentList()[0].key).toBe('private-inference');
  });

  it('diversify <flow> resolves only a unique flow label', () => {
    const flows = CC.routeFlows() as { label: string }[];
    const target = flows[0].label;
    const cmds = parseIntent(`diversify ${target}`, CC);
    expect(cmds).toHaveLength(1);
    cmds[0].run();
    expect(CC.intentList()[0].key).toBe('path-diversity');
  });

  it('an unknown name parses to nothing - free text never mutates', () => {
    expect(parseIntent('keep unicorns private', CC)).toEqual([]);
    expect(parseIntent('diversify everything ever', CC)).toEqual([]);
    expect(parseIntent('minimize latency for narnia', CC)).toEqual([]);
    expect(CC.intentList()).toHaveLength(0);
  });

  it('the cap grammar still parses beside the new ones', () => {
    const cmds = parseIntent('cap shared-services 1m', CC);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].kind).toBe('cap');
  });
});

describe('andiAnswer on a declaration', () => {
  it('states watch-mode semantics and returns the confirm-to-run action', () => {
    const a = andiAnswer(CC, 'keep ai private', 'ai');
    expect(a.text).toMatch(/watch mode/i);
    expect(a.text).toMatch(/changes nothing/i);
    expect(a.actions).toHaveLength(1);
    expect(a.actions[0].kind).toBe('run');
  });
});

describe('the drift queue', () => {
  it('a violated intent leads the Resolve cards with Synchronize material', () => {
    const scope = { kind: 'estate' as const, id: 'ai', label: 'The token layer' };
    const declared = CC.declareIntent('private-inference', scope, 'watch')!;
    // The seeded estate violates it (public routes exist).
    const reading = CC.intentList()[0].reading;
    expect(reading.status).toBe('violated');

    // Proposal cards (live findings joined to their preventive rule) lead
    // the whole list ahead of every other family - see andiProposals.test.tsx.
    // Within what remains, the violated intent still leads.
    const cards = andiResolveCards(CC).filter(c => c.move !== 'proposal');
    expect(cards[0].move).toBe('intent');
    expect(cards[0].intentId).toBe(declared.id);
    expect(cards[0].status).toBe('violated');
    expect(cards[0].hasMoves).toBe(reading.moves.length > 0);
    // The advisor draft cards still follow.
    expect(cards.some(c => c.move === 'draft')).toBe(true);
  });

  it('an aligned intent stays out of the queue', () => {
    const meter = (CC.tokenMeterList() as { tag: string; pct: number }[]).find(m => m.pct < 80)!;
    CC.declareIntent('cap-token-spend', { kind: 'identity', id: meter.tag, label: meter.tag }, 'watch');
    expect(andiResolveCards(CC).filter(c => c.move === 'intent')).toHaveLength(0);
  });
});

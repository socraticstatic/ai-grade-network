import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { spineAnswer } from './andiSpine';
import { discoverVerdict } from '../discover/verdict';
import { connectVerdict } from '../connect/verdict';
import { buildVerdict } from '../observe/networkBinding';
import type { FabricModel } from '../connect/FabricHero';

const model = () => CC.fabricModel() as FabricModel;
const nav = (a: ReturnType<typeof spineAnswer>) => a!.actions!.find(x => x.kind === 'navigate')!.to;

describe('spineAnswer navigation', () => {
  it('estate phrases speak the Discover verdict and offer /discover', () => {
    for (const q of ['show me the estate', 'take me to discover', 'what do I have']) {
      const a = spineAnswer(CC, q);
      expect(a!.text).toBe(discoverVerdict(model()));
      expect(nav(a)).toBe('/discover');
    }
  });
  it('fabric phrases speak the Connect verdict and offer /naas/connect', () => {
    for (const q of ['show my connections', 'show me the fabric']) {
      const a = spineAnswer(CC, q);
      expect(a!.text).toBe(connectVerdict(model()));
      expect(nav(a)).toBe('/naas/connect');
    }
  });
  it('traffic phrases speak the Observe verdict and offer /naas/observe', () => {
    for (const q of ['how is my traffic', 'show observability']) {
      const a = spineAnswer(CC, q);
      expect(a!.text).toBe(buildVerdict(CC));
      expect(nav(a)).toBe('/naas/observe');
    }
  });
  it('savings phrases speak the Observe verdict and offer /naas/cost', () => {
    const a = spineAnswer(CC, 'what am I saving');
    expect(a!.text).toBe(buildVerdict(CC));
    expect(nav(a)).toBe('/naas/cost');
  });
  it('non-spine phrases return null so the brain falls through', () => {
    expect(spineAnswer(CC, 'cap shared-services 1m')).toBeNull();
    expect(spineAnswer(CC, 'what is my p95 latency')).toBeNull();
  });
  it('analytic phrasing of a spine keyword falls through to the engine, not a generic verdict', () => {
    // These name a spine keyword (cost/attach/fabric) but ask WHY or WHAT
    // TO DO, not "take me there" - the engine's answerFor has a specific,
    // grounded answer for each; the spine must not intercept it.
    expect(spineAnswer(CC, 'show me why egress cost is up')).toBeNull();
    expect(spineAnswer(CC, 'what should the attach order be')).toBeNull();
    expect(spineAnswer(CC, 'where is my attach order plan')).toBeNull();
    expect(spineAnswer(CC, 'show the attach order plan')).toBeNull();
  });
  it('a spine-shaped query the engine can ground specifically defers to that answer', () => {
    // "egress cost" carries no why/order/plan/up/down marker, so ANALYTIC
    // does not catch it - the answerFor collision check must.
    expect(spineAnswer(CC, 'show me egress cost')).toBeNull();
  });
  it('andiSuggestions analytic prompts stay ungrounded by the spine', () => {
    // The exact prompts andiBrain.andiSuggestions offers the user under
    // the naas layer - none should be swallowed by spine navigation.
    expect(spineAnswer(CC, 'Why is egress cost up?')).toBeNull();
    expect(spineAnswer(CC, 'What is the 90-day forecast?')).toBeNull();
    expect(spineAnswer(CC, 'What should the attach order be?')).toBeNull();
  });
});

describe('spineAnswer wizard answers', () => {
  it('connect <public region> offers the pre-filled wizard, dual when asked', () => {
    const a = spineAnswer(CC, 'connect us-west-2 with dual paths');
    expect(nav(a)).toBe('/naas/connect?provision=usw2&dual=1');
    expect(a!.text).toMatch(/us-west-2/);
    const b = spineAnswer(CC, 'connect eu-west-1');
    expect(nav(b)).toBe('/naas/connect?provision=euw1&dual=0');
  });
  it('connect <attached region> answers with the connect verdict instead of a wizard', () => {
    const attached = model().regions.find(r => r.path === 'private')!;
    const a = spineAnswer(CC, `connect ${attached.name}`);
    expect(a!.text).toBe(connectVerdict(model()));
    expect(a!.actions!.every(x => !/provision=/.test(x.to ?? ''))).toBe(true);
  });
  it('connect <unknown region> answers honestly with no action', () => {
    const a = spineAnswer(CC, 'connect atlantis-east-1');
    expect(a!.text).toMatch(/public/i);
    expect(a!.actions ?? []).toHaveLength(0);
  });
});

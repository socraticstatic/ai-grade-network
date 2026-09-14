import { describe, it, expect } from 'vitest';
import { DEMO_BEATS } from './demoScript';

/* The arc now crosses two domains: Discover is unified, the four NaaS verbs
   are scoped under /naas, and the closing AI beat lands on the AI Fabric's own
   Govern (where the token-policy table lives). */
const NAV_ROUTES = ['/discover', '/naas/connect', '/naas/govern', '/naas/observe', '/naas/cost', '/ai/govern'];

// Each beat's copy must actually be ABOUT its stage — a length check alone would
// pass on lorem ipsum. Assert the narration/title mentions the stage's subject.
const STAGE_SUBJECT: Record<string, RegExp> = {
  '/discover': /discover|estate|public internet/i,
  '/naas/connect': /attach|steer|on-?ramp|IP(Sec)?|PrivateLink/i,
  '/naas/govern': /tag|polic|firewall|segment|rout/i,
  '/naas/observe': /latency|egress|telemetry|event|loss/i,
  '/naas/cost': /invoice|egress|save|cost|arbitrage/i,
  '/ai/govern': /token|model|AI|fabric/i,
};

describe('DEMO_BEATS', () => {
  it('has exactly six beats, one per nav route, in demo-arc order', () => {
    expect(DEMO_BEATS.map(b => b.route)).toEqual(
      NAV_ROUTES);
  });

  /* The AI beat used to narrate "Every AI route governed" over a screen the
     demo reaches in its cold-start state, where agents have already metered
     real tokens over the public internet and the AI Fabric screens say so.
     Narration that the product denies on screen is the worst kind of copy
     defect: the presenter reads it aloud while the audience reads the
     contradiction. The beat states the split instead. */
  it('does not narrate a blanket "every AI route governed" claim the screens deny', () => {
    const ai = DEMO_BEATS.find(b => b.route === '/ai/govern')!;
    expect(ai.narration).not.toMatch(/every AI route governed/i);
    expect(`${ai.narration} ${ai.hero}`.toLowerCase()).toContain('ungoverned');
  });

  it('every beat has real, stage-relevant copy (not just non-empty strings)', () => {
    for (const b of DEMO_BEATS) {
      expect(NAV_ROUTES).toContain(b.route);
      const subject = STAGE_SUBJECT[b.route];
      // Title + narration together must speak to the stage's actual subject.
      expect(`${b.title} ${b.narration}`).toMatch(subject);
      expect(b.narration.length).toBeGreaterThan(20);
      expect(b.hero.trim()).not.toBe('');
    }
  });
});

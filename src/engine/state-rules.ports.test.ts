import { describe, test, expect } from 'vitest';
import { CC } from '../engine';

describe('port matching', () => {
  test('a port rule matches only a flow that really carries that port', () => {
    const flows = CC.flows() as { ports: string }[];
    const multi = flows.find(f => f.ports.includes(',') && f.ports.includes('8443'));
    expect(multi, 'the seeded estate should carry a multi-port flow').toBeTruthy();
    // '443' must NOT match '5432, 8443' - it is a substring, not a port.
    const dry = CC.dryRun({
      name: 'port probe', src: { tag: 'any', cloud: 'any' },
      dst: 'any', ports: '443', action: 'deny', chain: [],
    }) as { matched: { flow: { ports: string } }[] };
    expect(dry.matched.length).toBeGreaterThan(0);
    for (const m of dry.matched) {
      const ports = m.flow.ports.split(',').map(s => s.trim());
      expect(ports).toContain('443');
    }
  });

  // The seeded estate emits a 'dns-exfil' flow with ports:'53' for every
  // classified-helion workload, as long as the dnsFirewall fix hasn't been
  // applied yet (state.ts defaults it to false) - see state-rules.ts's
  // flows(). A rule targeting port 53 with dst:'any' must match at least
  // that flow, and genuinely carry port 53 - not merely return an array.
  test('port 53 can be targeted', () => {
    const dry = CC.dryRun({
      name: 'dns probe', src: { tag: 'any', cloud: 'any' },
      dst: 'any', ports: '53', action: 'deny', chain: [],
    }) as { matched: { flow: { ports: string } }[] };
    expect(dry.matched.length).toBeGreaterThan(0);
    for (const m of dry.matched) {
      const ports = m.flow.ports.split(',').map(s => s.trim());
      expect(ports).toContain('53');
    }
  });
});

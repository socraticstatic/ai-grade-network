import { describe, it, expect, vi } from 'vitest';
import { CC } from '../../engine';
import { commandRegistry, parseIntent } from './commandRegistry';
import { NAV_LAYERS } from '../../components/navigation/navItems';
import { attachOpportunities, steerOpportunities } from '../discover/stackFigures';
import { fmtTokens } from '../ai-fabric/aiSpend';
describe('command registry', () => {
  it('includes nav to the six sections and executable engine actions', () => {
    const navigate = vi.fn();
    const cmds = commandRegistry(CC, navigate);
    const labels = cmds.map(c => c.label);
    ['Discover','Connect','Govern','Observe','Cost','AI Fabric']
      .forEach(s => expect(labels.some(l => l.includes(s))).toBe(true));
    // a nav command navigates
    cmds.find(c => c.label.includes('Discover'))!.run();
    expect(navigate).toHaveBeenCalledWith('/discover');
    // an attach command is a real mutation
    const attach = cmds.find(c => /attach/i.test(c.label));
    if (attach) { const before = CC.counts().attached; attach.run(); expect(CC.counts().attached).toBeGreaterThan(before); }
  });

  /* NaaS and the AI Fabric ship the same four verb labels. A palette listing
     "Go to Connect" twice, pointing at two different screens, is the failure
     this catches: every command label must be unique, and every verb command
     must say which domain it belongs to. */
  it('never offers two commands with the same label and different destinations', () => {
    const cmds = commandRegistry(CC, vi.fn());
    const navLabels = cmds.filter(c => c.kind === 'nav').map(c => c.label);
    expect(new Set(navLabels).size).toBe(navLabels.length);

    for (const domain of NAV_LAYERS) {
      for (const item of domain.items) {
        const label = `Go to ${domain.label} \u00b7 ${item.label}`;
        const cmd = cmds.find(c => c.label === label);
        expect(cmd, `no command labelled "${label}"`).toBeTruthy();

        const navigate = vi.fn();
        commandRegistry(CC, navigate).find(c => c.label === label)!.run();
        expect(navigate).toHaveBeenCalledWith(item.to);
      }
    }
  });

  /* Priced intents may only restate stackFigures — the arithmetic the
     cross-section and /naas/cost already state. A label that re-derives a
     latency or a dollar is the drift these two tests catch. */
  it('prices every attach-region intent with attachOpportunities figures verbatim', () => {
    const cmds = commandRegistry(CC, vi.fn());
    const opps = attachOpportunities(CC);
    expect(cmds.filter(c => c.kind === 'attach-region').length).toBe(opps.length);
    for (const opp of opps) {
      const cmd = cmds.find(c => c.id === `attach-region:${opp.regionId}`);
      expect(cmd, `no intent for region ${opp.regionId}`).toBeTruthy();
      let expected = `Attach ${opp.label} · ${opp.publicMs}→${opp.privateMs} ms on the fabric`;
      if (opp.bucketSavingMo !== null) expected += ` · $${opp.bucketSavingMo.toLocaleString()}/mo`;
      expect(cmd!.label).toBe(expected);
      expect(cmd!.kind).toBe('attach-region');
    }
  });

  it('prices every steer intent with steerOpportunities figures verbatim', () => {
    const cmds = commandRegistry(CC, vi.fn());
    const opps = steerOpportunities(CC);
    expect(cmds.filter(c => c.kind === 'steer').length).toBe(opps.length);
    for (const opp of opps) {
      const cmd = cmds.find(c => c.id === `steer:${opp.flowId}`);
      expect(cmd, `no intent for flow ${opp.flowId}`).toBeTruthy();
      let expected = `Steer ${opp.label} onto the fabric`;
      if (opp.egressSavingMo !== null) expected += ` · $${opp.egressSavingMo.toLocaleString()}/mo`;
      expect(cmd!.label).toBe(expected);
      expect(cmd!.kind).toBe('steer');
    }
  });

  it('parseIntent accepts the cap grammar against engine-known tags', () => {
    const one = parseIntent('cap shared-services 1m', CC);
    expect(one).toHaveLength(1);
    expect(one[0].id).toBe('cap:shared-services:1000000');
    expect(one[0].kind).toBe('cap');
    expect(one[0].label).toBe(
      `Cap shared-services at ${fmtTokens(1_000_000)} tokens/day · token policy`,
    );

    const oneFive = parseIntent('Cap shared-services at 1.5M tokens/day', CC);
    expect(oneFive).toHaveLength(1);
    expect(oneFive[0].id).toBe('cap:shared-services:1500000');
    expect(oneFive[0].label).toBe(
      `Cap shared-services at ${fmtTokens(1_500_000)} tokens/day · token policy`,
    );
  });

  it('parseIntent yields nothing for unknown tags, non-positive budgets, or free text', () => {
    expect(parseIntent('cap not-a-real-tag 1m', CC)).toHaveLength(0);
    expect(parseIntent('cap shared-services -5', CC)).toHaveLength(0);
    expect(parseIntent('cap shared-services 0', CC)).toHaveLength(0);
    expect(parseIntent('go to connect', CC)).toHaveLength(0);
    expect(parseIntent('', CC)).toHaveLength(0);
  });

  it('running a cap command moves the engine budget', () => {
    const prior = CC.tokenBudgetOf('shared-services');
    try {
      const [cmd] = parseIntent('cap shared-services 250k', CC);
      cmd.run();
      expect(CC.tokenBudgetOf('shared-services')).toBe(250_000);
    } finally {
      // Shared engine singleton — put the budget back for whoever runs next.
      CC.setTokenPolicy('shared-services', { budget: prior });
    }
  });
});

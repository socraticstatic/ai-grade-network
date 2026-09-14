import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import { AiTeamsPage, AiProvidersPage, AiKeysPage } from './GatewayGovernancePages';
import { CC } from '../../engine';

const wrap = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>);

describe('AI Gateway governance pages', () => {
  /* Phase 3 folded the retired /ai/cost budgets block (TokenBudgets) here
     whole. It lists METERED identities as rows; a policy without a meter
     (the group-scoped west-workloads) is accounted for in the note instead —
     the same reconciliation aiFabricSplit.test.tsx pins. */
  test('Teams & limits accounts for every token policy: metered rows, unmetered named', () => {
    wrap(<AiTeamsPage />);
    const policies = CC.tokenPolicyList() as { tag: string; budget: number }[];
    const metered = new Set((CC.tokenMeterList() as { tag: string }[]).map(m => m.tag));
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) {
      if (metered.has(p.tag)) {
        const row = screen.getByRole('row', { name: new RegExp(p.tag) });
        expect(row.textContent).toContain(p.budget.toLocaleString());
      } else {
        expect(
          screen.getByText(/scopes? a group rather than a metered identity/i),
        ).toHaveTextContent(p.tag);
      }
    }
  });

  /* Phase 3 folded the retired /ai/connect catalog (ModelCatalog) here whole. */
  test('Providers lists the model catalog with readiness from the engine', () => {
    wrap(<AiProvidersPage />);
    const catalog = CC.modelCatalog() as { name: string; ready: boolean }[];
    expect(catalog.length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        `${catalog.filter(m => m.ready).length} / ${catalog.length} governed & ready`,
      ),
    ).toBeInTheDocument();
    for (const m of catalog) {
      const row = screen.getByText(m.name).closest('tr')!;
      expect(row.textContent).toContain(m.ready ? 'Governed · ready' : 'Not attached');
    }
  });

  test('Virtual keys lists agents with scopes; suspend toggles through the engine', () => {
    wrap(<AiKeysPage />);
    const table = screen.getByTestId('keys-table');
    const agents = CC.agentList() as { id: string; name: string; scopes: string[]; enabled: boolean }[];
    expect(agents.length).toBeGreaterThan(0);
    const first = agents[0];
    const row = within(table).getByText(first.name).closest('tr')!;
    for (const scope of first.scopes) {
      expect(row.textContent).toContain(scope);
    }
    // Toggle is the real engine mutation — flip it, verify, flip it back.
    // agentList() hands back the same objects, so capture the primitive
    // BEFORE mutating or the expectation chases its own tail.
    const before = first.enabled;
    fireEvent.click(screen.getByTestId(`key-toggle-${first.id}`));
    expect((CC.agentList() as typeof agents).find(a => a.id === first.id)!.enabled).toBe(!before);
    fireEvent.click(screen.getByTestId(`key-toggle-${first.id}`));
    expect((CC.agentList() as typeof agents).find(a => a.id === first.id)!.enabled).toBe(before);
  });
});

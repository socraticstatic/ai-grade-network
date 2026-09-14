import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { LayerContext } from '../registry';
import { StandingIntentsWidget } from './StandingIntentsWidget';
import { CC } from '../../../../engine';

/* Navigation is asserted by destination, not by router internals — same
   pattern IntentThreads.tsx's own tests use. */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

const declaredIds: string[] = [];
afterEach(() => {
  declaredIds.splice(0).forEach(id => CC.removeIntent(id));
  mockNavigate.mockClear();
});

const renderIn = (surface: 'naas' | 'ai') =>
  render(
    <MemoryRouter>
      <LayerContext.Provider value={surface}><StandingIntentsWidget /></LayerContext.Provider>
    </MemoryRouter>,
  );

describe('StandingIntentsWidget', () => {
  test('with no intents for the layer, offers to declare one from the catalog', () => {
    // Guard: only meaningful if this layer currently has none. Remove any AI
    // intents so the AI board is genuinely empty for the assertion.
    CC.intentList().filter(i => ['private-inference', 'cap-token-spend', 'optimize-data-gravity', 'ai-flow-prediction'].includes(i.key))
      .forEach(i => CC.removeIntent(i.id));
    renderIn('ai');
    // The AI catalog has four entries, so the copy "Declare an intent: ..."
    // renders on every offer button — getByText's single-match contract
    // doesn't fit a repeated affordance, hence getAllByTestId here.
    expect(screen.getAllByTestId('declare-intent').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/declare an intent/i).length).toBeGreaterThan(0);
  });

  test('renders a declared intent with its status and evidence', () => {
    const cat = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const declared = CC.declareIntent('cap-token-spend', cat.scopes()[0], 'watch');
    expect(declared).not.toBeNull();
    declaredIds.push(declared!.id);
    renderIn('ai');
    const reading = CC.intentList().find(i => i.id === declared!.id)!.reading;
    expect(screen.getByText(reading.evidence)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(reading.status, 'i'))).toBeInTheDocument();
  });

  test('follows a layer switch immediately, with no engine event in between', () => {
    // Guard against leftovers from the seeded engine or earlier suites so
    // each layer starts genuinely empty for these two keys.
    CC.intentList()
      .filter(i => i.key === 'cap-token-spend' || i.key === 'minimize-latency')
      .forEach(i => CC.removeIntent(i.id));

    const aiCat = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    const aiDeclared = CC.declareIntent('cap-token-spend', aiCat.scopes()[0], 'watch');
    expect(aiDeclared).not.toBeNull();
    declaredIds.push(aiDeclared!.id);

    const naasCat = CC.intentCatalog().find(c => c.key === 'minimize-latency')!;
    const naasDeclared = CC.declareIntent('minimize-latency', naasCat.scopes()[0], 'watch');
    expect(naasDeclared).not.toBeNull();
    declaredIds.push(naasDeclared!.id);

    const aiEvidence = CC.intentList().find(i => i.id === aiDeclared!.id)!.reading.evidence;
    const naasEvidence = CC.intentList().find(i => i.id === naasDeclared!.id)!.reading.evidence;

    const { rerender } = render(
      <MemoryRouter>
        <LayerContext.Provider value="naas"><StandingIntentsWidget /></LayerContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByText(naasEvidence)).toBeInTheDocument();
    expect(screen.queryByText(aiEvidence)).not.toBeInTheDocument();

    // Layer switch alone, no engine mutation in between.
    rerender(
      <MemoryRouter>
        <LayerContext.Provider value="ai"><StandingIntentsWidget /></LayerContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.queryByText(naasEvidence)).not.toBeInTheDocument();
    expect(screen.getByText(aiEvidence)).toBeInTheDocument();
  });

  test('tracks an engine mutation (declaring, then removing an intent) with no surface change', () => {
    CC.intentList().filter(i => i.key === 'cap-token-spend').forEach(i => CC.removeIntent(i.id));

    renderIn('ai');
    expect(screen.getAllByTestId('declare-intent').length).toBeGreaterThan(0);

    const cat = CC.intentCatalog().find(c => c.key === 'cap-token-spend')!;
    let declared: ReturnType<typeof CC.declareIntent>;
    act(() => {
      declared = CC.declareIntent('cap-token-spend', cat.scopes()[0], 'watch');
    });
    expect(declared!).not.toBeNull();
    // Belt-and-suspenders: this test removes it below, but if an assertion
    // throws first, afterEach must still not leave it on the shared engine.
    declaredIds.push(declared!.id);

    const reading = CC.intentList().find(i => i.id === declared!.id)!.reading;
    expect(screen.getByText(reading.evidence)).toBeInTheDocument();
    expect(screen.queryByTestId('intent-row')).toBeInTheDocument();
    expect(screen.queryByTestId('declare-intent')).not.toBeInTheDocument();

    act(() => {
      CC.removeIntent(declared!.id);
    });

    expect(screen.queryByText(reading.evidence)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('declare-intent').length).toBeGreaterThan(0);
  });

  test('Synchronize stages the intent draft into the review tray, not the estate', () => {
    // The seeded engine declares no intents (CC.intentList() is []), and the
    // AI board only renders private-inference among the four AI keys with a
    // repair on this seed (see intentThreads.test.tsx), so declare it first.
    CC.intentList().filter(i => i.key === 'private-inference').forEach(i => CC.removeIntent(i.id));
    const declared = CC.declareIntent(
      'private-inference',
      { kind: 'estate', id: 'ai', label: 'The token layer' },
      'watch',
    )!;
    expect(declared).not.toBeNull();
    declaredIds.push(declared.id);

    const reading = CC.intentList().find(i => i.id === declared.id)!.reading;
    // Guard: this test only means something if the intent actually offers a
    // repair - otherwise the Synchronize button never renders at all.
    expect(reading.moves.length).toBeGreaterThan(0);

    renderIn('ai');
    fireEvent.click(screen.getByTestId('intent-synchronize'));

    // Fails against a no-op onClick: an unwired handler never calls navigate.
    expect(mockNavigate).toHaveBeenCalledWith(`/discover?draft=intent-${declared.id}`);
    // The click must not have committed anything to the estate.
    expect(CC.intentList().find(i => i.id === declared.id)!.reading.status).toBe(reading.status);
  });
});

import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, test, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CC } from '../../engine';
import { NetOpsPage } from './NetOpsPage';

// This test mutates global engine state (activates an on-ramp, injects a sim
// incident). Clear it after every test so it doesn't leak into other suites
// that import the same shared `window.CC` singleton.
afterEach(() => {
  CC.clearSim();
});

test('a live incident arms Act, and Act clears the incident in the engine', () => {
  act(() => {
    if (!CC.onramps.find(o => o.id === 'nb2')?.active) CC.activateOnramp('nb2');
    CC.simulateFailure('nb2');
  });

  render(
    <MemoryRouter>
      <NetOpsPage />
    </MemoryRouter>
  );

  expect(!!CC.simImpact()).toBe(true);

  const act1 = screen.getByRole('button', { name: /restore|act/i });
  expect(act1).toBeInTheDocument();

  fireEvent.click(act1);

  expect(!!CC.simImpact()).toBe(false); // Act cleared the incident
});

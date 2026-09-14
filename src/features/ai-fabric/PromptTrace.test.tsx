import { render, screen, fireEvent } from '@testing-library/react';
import { CC } from '../../engine';
import { PromptTrace } from './PromptTrace';

test('a classified request to an external model is denied at the token layer', () => {
  render(<PromptTrace />);
  // component defaults to classified-helion tag + gpt-class (external) model
  fireEvent.click(screen.getByRole('button', { name: /trace|send/i }));
  // the trace shows a DENIED step (engine promptTrace blocks it) — the UI
  // surfaces the denial in more than one place (banner, hop badge, detail
  // copy), so assert at least one match rather than a single unique node.
  expect(screen.getAllByText(/denied/i).length).toBeGreaterThan(0);
});

test('engine sanity check: classified tag to external model is blocked', () => {
  const result = CC.promptTrace('classified-helion', 'gpt-class', 'anything');
  expect(result.blocked).toBe(true);
  expect(result.steps.some(s => !s.ok)).toBe(true);
});

import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { Activity } from 'lucide-react';
import { WidgetFrame } from './WidgetFrame';

describe('WidgetFrame', () => {
  test('renders the title, an action slot, and its children', () => {
    render(
      <WidgetFrame title="Standing intents" icon={Activity} action={<button>Do</button>}>
        <p>body</p>
      </WidgetFrame>,
    );
    expect(screen.getByText('Standing intents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Do' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByTestId('widget-frame')).toHaveAttribute('data-widget-title', 'Standing intents');
  });
});

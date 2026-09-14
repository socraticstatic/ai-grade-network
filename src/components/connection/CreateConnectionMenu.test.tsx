import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateConnectionMenu } from './CreateConnectionMenu';

function open() {
  render(
    <MemoryRouter>
      <CreateConnectionMenu />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /create connection/i }));
}

describe('CreateConnectionMenu', () => {
  it('opens to a menu of connection types including Cloud to Cloud and AWS Interconnect - Last Mile', () => {
    open();
    expect(screen.getByRole('menuitem', { name: /cloud to cloud/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /aws interconnect.*last mile/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /internet to cloud/i })).toBeTruthy();
  });

  it('is collapsed by default', () => {
    render(
      <MemoryRouter>
        <CreateConnectionMenu />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('menuitem', { name: /cloud to cloud/i })).toBeNull();
  });
});

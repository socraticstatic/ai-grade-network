import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';
import { HandoffGallery } from './HandoffGallery';

// Same framer-motion mock as MainNav.test.tsx — MobileMenu's panel list only
// renders once onAnimationComplete fires.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onAnimationComplete, ...props }: any) => {
      useEffect(() => {
        onAnimationComplete?.();
      }, []);
      return <div {...props}>{children}</div>;
    }
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

const renderGallery = () =>
  render(
    <MemoryRouter initialEntries={['/naas/__gallery']}>
      <HandoffGallery />
    </MemoryRouter>
  );

describe('HandoffGallery', () => {
  test('renders every shared element in a labeled data-handoff section', () => {
    renderGallery();
    // Section labels are the component names the Figma components take.
    expect(screen.getByText('MainNav')).toBeInTheDocument();
    expect(screen.getByText('LeftRail')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-handoff]').length).toBeGreaterThanOrEqual(10);
  });

  test('the rail actually renders inside its section (path is a NaaS path)', () => {
    renderGallery();
    expect(
      document.querySelector('[data-handoff="LeftRail"] [data-testid="left-rail"]')
    ).not.toBeNull();
  });
});

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConnectionTypeIcon } from './ConnectionTypeIcon';

describe('ConnectionTypeIcon', () => {
  it('renders the two-cloud icon for Cloud to Cloud', () => {
    const { container } = render(<ConnectionTypeIcon type="Cloud to Cloud" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('data-icon')).toBe('cloud-to-cloud');
  });

  it('renders the globe icon for Internet to Cloud', () => {
    const { container } = render(<ConnectionTypeIcon type="Internet to Cloud" />);
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('internet-to-cloud');
  });

  it('renders the server icon for DataCenter/CoLocation to Cloud', () => {
    const { container } = render(<ConnectionTypeIcon type="DataCenter/CoLocation to Cloud" />);
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('datacenter-to-cloud');
  });

  it('renders the site icon for Site to Cloud', () => {
    const { container } = render(<ConnectionTypeIcon type="Site to Cloud" />);
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('site-to-cloud');
  });

  it('renders the location-pins icon for AWS Last Mile', () => {
    const { container } = render(<ConnectionTypeIcon type="AWS Last Mile" />);
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('aws-last-mile');
  });

  it('renders the padlock-globe icon for VPN to Cloud', () => {
    const { container } = render(<ConnectionTypeIcon type="VPN to Cloud" />);
    expect(container.querySelector('svg')?.getAttribute('data-icon')).toBe('vpn-to-cloud');
  });

  it('uses currentColor so it inherits text color', () => {
    const { container } = render(<ConnectionTypeIcon type="Cloud to Cloud" />);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
  });

  it('sizes by the size prop, preserving aspect ratio', () => {
    const { container } = render(<ConnectionTypeIcon type="Internet to Cloud" size={48} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('height')).toBe('48');
    // 77x67 viewBox → width rounds to 55 at height 48
    expect(svg?.getAttribute('width')).toBe('55');
  });

  it('exposes an accessible label', () => {
    const { container } = render(<ConnectionTypeIcon type="Cloud to Cloud" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Cloud to Cloud');
  });

  it('returns null for a type without a dedicated icon', () => {
    const { container } = render(<ConnectionTypeIcon type="Hub Test" />);
    expect(container.querySelector('svg')).toBeNull();
  });
});

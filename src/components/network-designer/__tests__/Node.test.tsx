import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import { Node } from '../Node';
import type { NetworkNode } from '../types/designer';

// Mock Zustand store
vi.mock('../store/useDesignerStore', () => ({
  useDesignerStore: (selector: any) => selector({ zoomLevel: 1 }),
}));

function makeNode(overrides: Partial<NetworkNode> = {}): NetworkNode {
  return {
    id: 'test-node',
    type: 'function',
    functionType: 'router',
    x: 100,
    y: 100,
    name: 'Hub',
    icon: 'hub',
    status: 'unconfigured',
    config: {},
    ...overrides,
  };
}

const defaultProps = {
  isSelected: false,
  isEdgeTarget: false,
  hasValidationError: false,
  isCreatingEdge: false,
  onSelect: vi.fn(),
  onDrag: vi.fn(),
  onDragEnd: vi.fn(),
  onEdgeClick: vi.fn(),
  onRename: vi.fn(),
};

describe('Node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('status-based rendering', () => {
    it('renders unconfigured node with dashed border and gray dot', () => {
      const node = makeNode({ status: 'unconfigured' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);

      const wrapper = hub.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ borderStyle: 'dashed' });
      expect(wrapper).toHaveStyle({ borderColor: '#d1d5db' });
      expect(wrapper).toHaveStyle({ backgroundColor: 'var(--nd-bg-default, #ffffff)' });
      expect(wrapper.dataset.status).toBe('unconfigured');

      const dot = screen.getByTestId('status-dot');
      expect(dot).toHaveStyle({ backgroundColor: 'var(--nd-dot-unconfigured, #d1d5db)' });
    });

    it('renders configured-inactive node with solid type-colored border and gray dot', () => {
      const node = makeNode({ status: 'configured-inactive' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);

      const wrapper = hub.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ borderStyle: 'solid' });
      expect(wrapper).toHaveStyle({ borderColor: '#d946ef' });
      expect(wrapper).toHaveStyle({ backgroundColor: 'var(--nd-bg-default, #ffffff)' });

      const dot = screen.getByTestId('status-dot');
      expect(dot).toHaveStyle({ backgroundColor: 'var(--nd-dot-inactive, #9ca3af)' });
    });

    it('renders active node with colored background and green dot', () => {
      const node = makeNode({ status: 'active' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);

      const wrapper = hub.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ borderStyle: 'solid' });
      expect(wrapper).toHaveStyle({ borderColor: '#d946ef' });
      expect(wrapper).toHaveStyle({ backgroundColor: 'var(--nd-bg-fuchsia, #fdf4ff)' });

      const dot = screen.getByTestId('status-dot');
      expect(dot).toHaveStyle({ backgroundColor: '#22c55e' });
    });

    it('renders active-down node with colored background and red dot', () => {
      const node = makeNode({ status: 'active-down' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);

      const wrapper = hub.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ backgroundColor: 'var(--nd-bg-fuchsia, #fdf4ff)' });

      const dot = screen.getByTestId('status-dot');
      expect(dot).toHaveStyle({ backgroundColor: '#ef4444' });
    });
  });

  describe('node type colors', () => {
    it('uses blue border for cloud destination nodes', () => {
      const node = makeNode({ type: 'destination', functionType: 'aws', status: 'configured-inactive' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.firstElementChild).toHaveStyle({ borderColor: '#3b82f6' });
    });

    it('uses gray border for datacenter nodes', () => {
      const node = makeNode({ type: 'datacenter', functionType: 'equinix', status: 'configured-inactive' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.firstElementChild).toHaveStyle({ borderColor: '#6b7280' });
    });

    it('uses purple border for AT&T Core (ipe) network nodes', () => {
      const node = makeNode({ type: 'network', functionType: 'ipe', status: 'configured-inactive', icon: 'CircleDot' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.firstElementChild).toHaveStyle({ borderColor: '#7c3aed' });
    });
  });

  describe('interaction state overrides', () => {
    it('overrides border color when selected', () => {
      const node = makeNode({ status: 'active' });
      const { container: hub } = render(<Node node={node} {...defaultProps} isSelected={true} />);
      expect(hub.firstElementChild).toHaveStyle({ borderColor: '#3b82f6' });
    });

    it('overrides border color for validation error', () => {
      const node = makeNode({ status: 'active' });
      const { container: hub } = render(<Node node={node} {...defaultProps} hasValidationError={true} />);
      expect(hub.firstElementChild).toHaveStyle({ borderColor: '#ef4444' });
    });
  });

  describe('label and icon', () => {
    it('renders node name label', () => {
      const node = makeNode({ name: 'My Router' });
      render(<Node node={node} {...defaultProps} />);
      expect(screen.getByText('My Router')).toBeInTheDocument();
    });

    it('renders AT&T icon for hub', () => {
      const node = makeNode({ icon: 'hub' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Lucide icon for non-AT&T icons', () => {
      const node = makeNode({ icon: 'Cloud' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('data attributes', () => {
    it('sets data-status attribute', () => {
      const node = makeNode({ status: 'active' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.firstElementChild).toHaveAttribute('data-status', 'active');
    });

    it('sets data-node-type attribute', () => {
      const node = makeNode({ functionType: 'router' });
      const { container: hub } = render(<Node node={node} {...defaultProps} />);
      expect(hub.firstElementChild).toHaveAttribute('data-node-type', 'router');
    });
  });
});

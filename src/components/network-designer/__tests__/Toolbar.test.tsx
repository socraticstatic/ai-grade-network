import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import { Toolbar } from '../Toolbar';

// Mock useMobileDetection with controllable screenWidth
let mockScreenWidth = 1280;
vi.mock('../../../hooks/useMobileDetection', () => ({
  useMobileDetection: () => ({
    isMobile: mockScreenWidth < 768,
    isTablet: mockScreenWidth >= 768 && mockScreenWidth < 1024,
    isDesktop: mockScreenWidth >= 1024,
    screenWidth: mockScreenWidth,
  }),
}));

const defaultProps = {
  onAddNode: vi.fn(),
  onToggleEdgeCreation: vi.fn(),
  isCreatingEdge: false,
  onUndo: vi.fn(),
  canUndo: false,
  onClearCanvas: vi.fn(),
  onToggleMaximize: vi.fn(),
  isMaximized: false,
  onCreateConnections: vi.fn(),
  hasConnections: false,
  onOpenTemplates: vi.fn(),
  onOpenSaveTemplate: vi.fn(),
  onExportPDF: vi.fn(),
};

describe('Toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScreenWidth = 1280;
  });

  describe('responsive labels', () => {
    it('shows text labels at wide viewport (>= 1200px)', () => {
      mockScreenWidth = 1280;
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByText('Hub')).toBeInTheDocument();
      expect(screen.getByText('Function')).toBeInTheDocument();
      expect(screen.getByText('Cloud')).toBeInTheDocument();
      expect(screen.getByText('Datacenter')).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('Choose')).toBeInTheDocument();
    });

    it('hides text labels at narrow viewport (< 1200px)', () => {
      mockScreenWidth = 1024;
      render(<Toolbar {...defaultProps} />);
      expect(screen.queryByText('Hub')).not.toBeInTheDocument();
      expect(screen.queryByText('Function')).not.toBeInTheDocument();
      expect(screen.queryByText('Cloud')).not.toBeInTheDocument();
      expect(screen.queryByText('Datacenter')).not.toBeInTheDocument();
      expect(screen.queryByText('Network')).not.toBeInTheDocument();
      expect(screen.queryByText('Choose')).not.toBeInTheDocument();
    });
  });

  describe('button accessibility', () => {
    it('all buttons have title attributes for tooltips', () => {
      mockScreenWidth = 800;
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByTitle('Templates')).toBeInTheDocument();
      expect(screen.getByTitle('Add Hub')).toBeInTheDocument();
      expect(screen.getByTitle('Add network function')).toBeInTheDocument();
      expect(screen.getByTitle('Add cloud destination')).toBeInTheDocument();
      expect(screen.getByTitle('Add datacenter')).toBeInTheDocument();
      expect(screen.getByTitle('Add network type')).toBeInTheDocument();
      expect(screen.getByTitle('Connect nodes')).toBeInTheDocument();
      expect(screen.getByTitle('Undo')).toBeInTheDocument();
      expect(screen.getByTitle('Clear canvas')).toBeInTheDocument();
      expect(screen.getByTitle('Export PDF')).toBeInTheDocument();
      expect(screen.getByTitle('Maximize')).toBeInTheDocument();
      expect(screen.getByTitle('Create connections')).toBeInTheDocument();
    });
  });

  describe('max-width constraint', () => {
    it('toolbar hub has max-width class', () => {
      render(<Toolbar {...defaultProps} />);
      const toolbar = document.querySelector('[class*="max-w-"]');
      expect(toolbar).toBeInTheDocument();
    });

  });

  describe('icon-only buttons always present', () => {
    it('renders all icon buttons at any width', () => {
      mockScreenWidth = 375;
      render(<Toolbar {...defaultProps} />);
      expect(screen.getByTitle('Templates')).toBeInTheDocument();
      expect(screen.getByTitle('Add Hub')).toBeInTheDocument();
      expect(screen.getByTitle('Maximize')).toBeInTheDocument();
      expect(screen.getByTitle('Create connections')).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('shows "Save updates" title when editMode is true', () => {
      render(<Toolbar {...defaultProps} editMode={true} />);
      expect(screen.getByTitle('Save updates')).toBeInTheDocument();
    });

    it('shows "Create connections" title when editMode is false', () => {
      render(<Toolbar {...defaultProps} editMode={false} />);
      expect(screen.getByTitle('Create connections')).toBeInTheDocument();
    });

    it('shows "Save updates" label text at wide viewport in edit mode', () => {
      mockScreenWidth = 1280;
      render(<Toolbar {...defaultProps} editMode={true} />);
      expect(screen.getByText('Save updates')).toBeInTheDocument();
    });

    it('shows "Create" label text at wide viewport in create mode', () => {
      mockScreenWidth = 1280;
      render(<Toolbar {...defaultProps} editMode={false} />);
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('applies primary button style in edit mode', () => {
      render(<Toolbar {...defaultProps} editMode={true} hasConnections={true} />);
      const btn = screen.getByTitle('Save updates');
      expect(btn.className).toContain('bg-fw-primary');
    });
  });

  describe('read-only mode', () => {
    const switchToEdit = vi.fn();

    it('hides add-node buttons in read-only mode', () => {
      render(<Toolbar {...defaultProps} readOnly={true} onSwitchToEdit={switchToEdit} />);
      expect(screen.queryByTitle('Add Hub')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Add network function')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Add cloud destination')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Connect nodes')).not.toBeInTheDocument();
    });

    it('shows Edit button in read-only mode', () => {
      render(<Toolbar {...defaultProps} readOnly={true} onSwitchToEdit={switchToEdit} />);
      expect(screen.getByTitle('Switch to edit mode')).toBeInTheDocument();
    });

    it('keeps Export PDF in read-only mode', () => {
      render(<Toolbar {...defaultProps} readOnly={true} onSwitchToEdit={switchToEdit} />);
      expect(screen.getByTitle('Export PDF')).toBeInTheDocument();
    });

    it('shows full toolbar when not read-only', () => {
      render(<Toolbar {...defaultProps} readOnly={false} />);
      expect(screen.getByTitle('Add Hub')).toBeInTheDocument();
      expect(screen.queryByTitle('Switch to edit mode')).not.toBeInTheDocument();
    });
  });

  describe('simulation button', () => {
    it('calls onRunSimulation when Play is clicked', () => {
      const onRunSimulation = vi.fn();
      render(<Toolbar {...defaultProps} hasConnections={true} onRunSimulation={onRunSimulation} />);
      const playBtn = screen.getByTitle('Simulate');
      playBtn.click();
      expect(onRunSimulation).toHaveBeenCalledOnce();
    });

    it('disables Play when no connections', () => {
      render(<Toolbar {...defaultProps} hasConnections={false} />);
      const playBtn = screen.getByTitle('Simulate');
      expect(playBtn).toBeDisabled();
    });

    it('shows running state when simulation is active', () => {
      render(<Toolbar {...defaultProps} hasConnections={true} isSimulationRunning={true} />);
      expect(screen.getByTitle('Simulation running')).toBeTruthy();
    });
  });
});

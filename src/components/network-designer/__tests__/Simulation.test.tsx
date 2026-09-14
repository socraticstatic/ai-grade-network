import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkSimulation } from '../simulation/NetworkSimulation';
import { useDesignerStore } from '../store/useDesignerStore';

function setSimRunning() {
  useDesignerStore.setState({
    isSimulationRunning: true,
    simulationPhase: 'running',
    simulationProgress: 50,
    simulationMetrics: {
      bandwidth: { current: 60, max: 100 },
      latency: { current: 35, max: 100 },
      packets: { sent: 2000, received: 1960, errors: 40 },
    },
    simulationScores: {
      resiliency: 55, redundancy: 40, disaster: 85, security: 72, performance: 96,
    },
  });
}

describe('NetworkSimulation', () => {
  beforeEach(() => {
    useDesignerStore.setState({
      isSimulationRunning: false,
      simulationPhase: 'idle',
      simulationProgress: 0,
      simulationMetrics: {
        bandwidth: { current: 0, max: 100 },
        latency: { current: 0, max: 100 },
        packets: { sent: 0, received: 0, errors: 0 },
      },
      simulationScores: { resiliency: 0, redundancy: 0, disaster: 0, security: 0, performance: 0 },
    });
  });

  it('does not render when simulation is idle', () => {
    const { container: hub } = render(<NetworkSimulation />);
    expect(hub.innerHTML).toBe('');
  });

  it('renders modal when simulation is running', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    expect(screen.getByText('Network Performance Simulation')).toBeTruthy();
  });

  it('defaults to Network Metrics tab', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    expect(screen.getByText('Latency')).toBeTruthy();
    expect(screen.getByText('Packet Success')).toBeTruthy();
    expect(screen.getByText('Bandwidth')).toBeTruthy();
  });

  it('switches to Test Controls tab', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    fireEvent.click(screen.getByText('Test Controls'));
    expect(screen.getByText('Inject Latency')).toBeTruthy();
    expect(screen.getByText('Packet Loss')).toBeTruthy();
    expect(screen.getByText('Bandwidth Limit')).toBeTruthy();
  });

  it('switches to Pricing Comparison tab', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    fireEvent.click(screen.getByText('Pricing Comparison'));
    expect(screen.getByText('Business Value Analysis')).toBeTruthy();
  });

  it('renders 5 score bars on Network Metrics tab', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    expect(screen.getByText('Resiliency')).toBeTruthy();
    expect(screen.getByText('Redundancy')).toBeTruthy();
    expect(screen.getByText('Disaster')).toBeTruthy();
    expect(screen.getByText('Security')).toBeTruthy();
    expect(screen.getByText('Performance')).toBeTruthy();
  });

  it('shows pause button when running', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    expect(screen.getByTitle('Pause')).toBeTruthy();
  });

  it('shows resume button when paused', () => {
    useDesignerStore.setState({
      isSimulationRunning: true,
      simulationPhase: 'paused',
      simulationProgress: 50,
      simulationMetrics: {
        bandwidth: { current: 60, max: 100 },
        latency: { current: 35, max: 100 },
        packets: { sent: 2000, received: 1960, errors: 40 },
      },
      simulationScores: {
        resiliency: 55, redundancy: 40, disaster: 85, security: 72, performance: 96,
      },
    });
    render(<NetworkSimulation />);
    expect(screen.getByTitle('Resume')).toBeTruthy();
  });

  it('has a close button', () => {
    setSimRunning();
    render(<NetworkSimulation />);
    expect(screen.getByTitle('Close')).toBeTruthy();
  });
});

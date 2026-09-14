import { useDesignerStore } from '../store/useDesignerStore';
import type { SimulationScores } from '../types/designer';

// Module-level control variables
let simulationPaused = false;
let simulationCancelled = false;
let latencyInjection = 0;
let packetLossInjection = 0;
let bandwidthLimitInjection = 100;

export function pauseSimulation() { simulationPaused = true; }
export function resumeSimulation() { simulationPaused = false; }
export function cancelSimulation() { simulationCancelled = true; }
export function injectLatency(amount: number) { latencyInjection = amount; }
export function injectPacketLoss(amount: number) { packetLossInjection = amount; }
export function injectBandwidthLimit(percent: number) { bandwidthLimitInjection = percent; }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitWhilePaused() {
  while (simulationPaused) {
    useDesignerStore.getState().setSimulationData({ simulationPhase: 'paused' });
    await sleep(500);
    if (simulationCancelled) return;
  }
}

export async function runSimulation() {
  const store = useDesignerStore.getState();
  const { nodes, edges } = store;
  if (!edges.length) return false;

  // Reset controls
  simulationPaused = false;
  simulationCancelled = false;
  latencyInjection = 0;
  packetLossInjection = 0;
  bandwidthLimitInjection = 100;

  store.startSimulation();

  try {
    // Phase 1: Initialize - activate nodes one by one
    useDesignerStore.getState().setSimulationData({
      simulationPhase: 'initializing',
      simulationProgress: 10,
    });

    for (const node of nodes) {
      if (simulationCancelled) throw new Error('cancelled');
      await waitWhilePaused();
      if (simulationCancelled) throw new Error('cancelled');

      await sleep(300);
      useDesignerStore.getState().updateNode(node.id, { status: 'active' });
      const progress = 10 + (20 / nodes.length);
      useDesignerStore.getState().setSimulationData({
        simulationPhase: 'initializing',
        simulationProgress: Math.min(30, progress),
      });
    }

    // Phase 2: Activate edges
    useDesignerStore.getState().setSimulationData({ simulationPhase: 'running' });

    for (let i = 0; i < edges.length; i++) {
      if (simulationCancelled) throw new Error('cancelled');
      await waitWhilePaused();
      if (simulationCancelled) throw new Error('cancelled');

      const edge = edges[i];
      await sleep(700);
      useDesignerStore.getState().updateEdge(edge.id, {
        status: 'active',
        metrics: { latency: '10ms', throughput: '1 Gbps', packetLoss: '0.1%', bandwidthUtilization: 10 },
      });

      const prevMetrics = useDesignerStore.getState().simulationMetrics;
      useDesignerStore.getState().setSimulationData({
        simulationProgress: 30 + (i * (30 / edges.length)),
        simulationMetrics: {
          ...prevMetrics,
          packets: { ...prevMetrics.packets, sent: prevMetrics.packets.sent + 100 },
        },
      });
    }

    // Phase 3: Dynamic traffic ramp (20 steps)
    for (let step = 0; step < 20; step++) {
      if (simulationCancelled) throw new Error('cancelled');
      await waitWhilePaused();
      if (simulationCancelled) throw new Error('cancelled');

      useDesignerStore.getState().setSimulationData({ simulationPhase: 'running' });
      await sleep(500);

      // Update edge metrics with realistic fluctuations
      const currentEdges = useDesignerStore.getState().edges;
      for (const e of currentEdges) {
        if (e.status !== 'active') continue;
        const baseUtil = Math.min(95, step * 4 + Math.random() * 10 - 5);
        const utilization = Math.min(baseUtil, bandwidthLimitInjection);
        const latency = 5 + (utilization / 10) + (Math.random() * 2) + latencyInjection;
        const basePacketLoss = utilization > 80 ? 0.01 + ((utilization - 80) * 0.01) : 0.01;
        const packetLoss = basePacketLoss + (packetLossInjection / 100);
        const burstFactor = step % 5 === 0 ? 1.5 : 1;

        useDesignerStore.getState().updateEdge(e.id, {
          metrics: {
            latency: `${latency.toFixed(1)}ms`,
            throughput: `${(utilization * burstFactor / 10).toFixed(1)} Gbps`,
            packetLoss: `${(packetLoss * 100).toFixed(2)}%`,
            bandwidthUtilization: Math.round(utilization * burstFactor),
          },
        });
      }

      // Update simulation metrics
      const prev = useDesignerStore.getState().simulationMetrics;
      const bandwidth = Math.min(100, Math.min(prev.bandwidth.current + 5 + (Math.random() * 2 - 1), bandwidthLimitInjection));
      const latency = Math.min(100, (step * 2 + (step % 3 === 0 ? 5 : 0)) + (latencyInjection / 2));
      const lossRate = packetLossInjection / 100;
      const sentPackets = prev.packets.sent + 200;
      const receivedPackets = sentPackets * (1 - lossRate) * 0.98;

      useDesignerStore.getState().setSimulationData({
        simulationProgress: 60 + (step * 2),
        simulationMetrics: {
          bandwidth: { ...prev.bandwidth, current: bandwidth },
          latency: { ...prev.latency, current: latency },
          packets: { sent: sentPackets, received: receivedPackets, errors: sentPackets - receivedPackets },
        },
      });

      // Update scores gradually
      const scores: SimulationScores = {
        resiliency: Math.min(100, 11 + step * 4 + Math.random() * 3),
        redundancy: Math.min(100, 8 + step * 4 + Math.random() * 3),
        disaster: Math.min(100, 80 + step * 1),
        security: Math.min(100, 56 + step * 2),
        performance: Math.min(100, 96 + step * 0.2),
      };
      useDesignerStore.getState().setSimulationData({ simulationScores: scores });
    }

    // Phase 4: Completion
    useDesignerStore.getState().setSimulationData({
      simulationPhase: 'completed',
      simulationProgress: 100,
    });

    window.addToast?.({
      type: 'success',
      title: 'Simulation Complete',
      message: 'Network performance simulation finished successfully.',
      duration: 4000,
    });

    await sleep(5000);

    // Gradual fadeout
    for (let step = 0; step < 5; step++) {
      if (simulationCancelled) break;
      await sleep(300);
      const fadeEdges = useDesignerStore.getState().edges;
      for (const e of fadeEdges) {
        if (e.status !== 'active') continue;
        const currentUtil = e.metrics?.bandwidthUtilization || 0;
        useDesignerStore.getState().updateEdge(e.id, {
          metrics: { ...e.metrics, bandwidthUtilization: Math.round(currentUtil * 0.8) },
        });
      }
    }

    // Reset node/edge statuses
    const finalNodes = useDesignerStore.getState().nodes;
    for (const n of finalNodes) {
      useDesignerStore.getState().updateNode(n.id, { status: 'configured-inactive' });
    }
    const finalEdges = useDesignerStore.getState().edges;
    for (const e of finalEdges) {
      useDesignerStore.getState().updateEdge(e.id, { status: 'inactive' });
    }

    useDesignerStore.getState().stopSimulation();
    resetControls();
    return true;
  } catch {
    useDesignerStore.getState().setSimulationData({ simulationPhase: 'error' });
    useDesignerStore.getState().stopSimulation();
    resetControls();
    return false;
  }
}

function resetControls() {
  simulationPaused = false;
  simulationCancelled = false;
  latencyInjection = 0;
  packetLossInjection = 0;
  bandwidthLimitInjection = 100;
}

import { useState, useEffect } from 'react';
import { AgenticAssistantModal } from '../common/AgenticAssistantModal';
import { useStore } from '../../store/useStore';

export function AgenticAssistantDemo() {
  const [showModal, setShowModal] = useState(false);
  const { agenticSettings, enableAgentic, addAlert } = useStore();

  const sampleIssue = {
    id: 'issue-001',
    severity: 'warning' as const,
    title: 'High Latency Detected on Connection ATT-NYC-001',
    description: 'The connection to AWS US-East-1 is experiencing latency above threshold (current: 45ms, threshold: 30ms). This may impact application performance.',
    affectedResources: [
      'Connection: ATT-NYC-001',
      'Endpoint: AWS US-East-1',
      'VLAN: 100'
    ],
    suggestedAction: 'I can reroute traffic through an alternate path with lower latency, or adjust the QoS settings to prioritize critical traffic.',
    canAutoResolve: true
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateTicket = (issue: typeof sampleIssue) => {
    addAlert({
      id: `ticket-${Date.now()}`,
      type: 'info',
      message: `Support ticket created for: ${issue.title}`,
      timestamp: new Date().toISOString(),
      connectionId: 'ATT-NYC-001'
    });
    setShowModal(false);
  };

  const handleEnableAgentic = () => {
    enableAgentic();
    addAlert({
      id: `agentic-enabled-${Date.now()}`,
      type: 'info',
      message: 'Agentic AI has been enabled. The assistant will now proactively monitor and resolve issues.',
      timestamp: new Date().toISOString()
    });
  };

  const handleResolveIssue = (issueId: string) => {
    addAlert({
      id: `resolved-${Date.now()}`,
      type: 'info',
      message: 'Issue resolved: Traffic rerouted through alternate path. Latency reduced to 18ms.',
      timestamp: new Date().toISOString(),
      connectionId: 'ATT-NYC-001'
    });
  };

  return (
    <AgenticAssistantModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      issue={sampleIssue}
      onCreateTicket={handleCreateTicket}
      onEnableAgentic={handleEnableAgentic}
      onResolveIssue={handleResolveIssue}
      agenticEnabled={agenticSettings.enabled}
    />
  );
}

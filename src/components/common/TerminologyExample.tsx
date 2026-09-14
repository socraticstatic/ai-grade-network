import { TerminologyTooltip } from './TerminologyTooltip';

export function TerminologyExample() {
  return (
    <div className="p-6 bg-fw-accent rounded-xl border border-fw-active">
      <h3 className="text-lg font-semibold text-fw-heading mb-4 tracking-[-0.03em]">
        Understanding Network Architecture
      </h3>

      <div className="space-y-3 text-figma-base text-fw-body leading-relaxed">
        <p>
          When you create a{' '}
          <TerminologyTooltip termId="connection">
            <span className="font-medium text-fw-linkHover border-b border-fw-active border-dotted cursor-help">
              Connection
            </span>
          </TerminologyTooltip>
          , you establish a dedicated network path to cloud providers. Each connection can have multiple{' '}
          <TerminologyTooltip termId="hub">
            <span className="font-medium text-fw-success border-b border-fw-success border-dotted cursor-help">
              Hubs
            </span>
          </TerminologyTooltip>
          {' '}that handle routing and traffic management.
        </p>

        <p>
          Within each Hub, you can create{' '}
          <TerminologyTooltip termId="link">
            <span className="font-medium text-fw-purple border-b border-fw-purple border-dotted cursor-help">
              Links (VLANs)
            </span>
          </TerminologyTooltip>
          {' '}to segment your traffic. Each Link can have its own{' '}
          <TerminologyTooltip termId="routing">
            <span className="font-medium text-fw-body border-b border-fw-secondary border-dotted cursor-help">
              routing settings
            </span>
          </TerminologyTooltip>
          {' '}and attached{' '}
          <TerminologyTooltip termId="vnf">
            <span className="font-medium text-fw-warn border-b border-fw-warn border-dotted cursor-help">
              VNFs
            </span>
          </TerminologyTooltip>
          {' '}for security and network functions.
        </p>

        <p>
          All of this virtual infrastructure runs on physical{' '}
          <TerminologyTooltip termId="ipe">
            <span className="font-medium text-fw-heading border-b border-fw-secondary border-dotted cursor-help">
              IPE routers
            </span>
          </TerminologyTooltip>
          {' '}located at data center facilities, which provide the actual{' '}
          <TerminologyTooltip termId="bandwidth">
            <span className="font-medium text-fw-linkHover border-b border-fw-active border-dotted cursor-help">
              bandwidth
            </span>
          </TerminologyTooltip>
          {' '}capacity and connectivity to{' '}
          <TerminologyTooltip termId="cloud-provider">
            <span className="font-medium text-fw-info border-b border-fw-infoLight border-dotted cursor-help">
              cloud providers
            </span>
          </TerminologyTooltip>
          .
        </p>
      </div>

      <div className="mt-4 p-3 bg-fw-base rounded-lg border border-fw-active">
        <p className="text-figma-sm text-fw-linkHover">
          <strong className="font-semibold">Tip:</strong> Hover over any underlined term to see its definition, examples, and related concepts. Click "Learn More" to view the full glossary entry.
        </p>
      </div>
    </div>
  );
}

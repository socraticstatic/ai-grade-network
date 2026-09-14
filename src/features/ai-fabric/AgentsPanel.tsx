import { AttIcon } from '../../components/icons/AttIcon';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';

interface AgentInfo {
  id: string;
  name: string;
  app: string;
  scopes: string[];
  enabled: boolean;
}

export function AgentsPanel() {
  const agents = useCloudControl(cc => cc.agentList()) as AgentInfo[];
  const actions = useCloudControlActions();

  return (
    <div className="rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-fw-secondary bg-fw-wash">
        <AttIcon name="apps" className="h-5 w-5 text-fw-body" />
        <span className="font-medium text-fw-heading">Agents</span>
        <span className="text-figma-xs text-fw-bodyLight">
          {agents.filter(a => a.enabled).length} / {agents.length} enabled
        </span>
      </div>

      <table className="w-full text-figma-sm">
        <thead>
          <tr className="text-left text-figma-xs uppercase tracking-wide text-fw-bodyLight bg-fw-wash/60">
            <th className="px-5 py-2 font-medium">Agent</th>
            <th className="px-5 py-2 font-medium">App</th>
            <th className="px-5 py-2 font-medium">Scopes</th>
            <th className="px-5 py-2 font-medium text-center">Status</th>
            <th className="px-5 py-2 font-medium text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fw-secondary">
          {agents.map(a => (
            <tr key={a.id} className="align-top">
              <td className="px-5 py-3">
                <div className="font-medium text-fw-heading">{a.name}</div>
              </td>
              <td className="px-5 py-3 text-fw-body">{a.app}</td>
              <td className="px-5 py-3 text-fw-body">
                <span className="text-figma-xs text-fw-bodyLight">{a.scopes.join(', ')}</span>
              </td>
              <td className="px-5 py-3 text-center">
                <span
                  className={`inline-flex items-center h-6 px-2.5 rounded-full text-figma-xs font-medium whitespace-nowrap ${
                    a.enabled
                      ? 'bg-fw-successLight text-fw-success'
                      : 'bg-fw-errorLight text-fw-error'
                  }`}
                >
                  {a.enabled ? 'Enabled' : 'Suspended'}
                </span>
              </td>
              <td className="px-5 py-3 text-center">
                <button
                  type="button"
                  onClick={() => actions.toggleAgent(a.id)}
                  className={`inline-flex items-center h-8 px-3 rounded-full text-figma-xs font-medium transition-colors ${
                    a.enabled
                      ? 'border border-fw-secondary text-fw-body hover:bg-fw-wash'
                      : 'bg-fw-active text-white hover:bg-fw-linkHover'
                  }`}
                >
                  {a.enabled ? 'Suspend' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { Zap, CheckCircle, AlertTriangle, Bell, Ticket } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Toggle } from '../common/Toggle';

export function AgenticAISettings() {
  const { agenticSettings, updateAgenticSettings } = useStore();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleToggleAgentic = () => {
    if (!agenticSettings.enabled) {
      setShowConfirmation(true);
    } else {
      updateAgenticSettings({ enabled: false });
    }
  };

  const confirmEnable = () => {
    updateAgenticSettings({ enabled: true });
    setShowConfirmation(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">Agentic AI Settings</h2>
        <p className="text-fw-body">
          Configure how the AI assistant monitors and responds to issues in your network.
        </p>
      </div>

      <div className="bg-fw-base rounded-2xl border border-fw-secondary divide-y divide-fw-secondary">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${agenticSettings.enabled ? 'bg-fw-accent' : 'bg-fw-neutral'}`}>
                <Zap className={`h-6 w-6 ${agenticSettings.enabled ? 'text-fw-link' : 'text-fw-bodyLight'}`} />
              </div>
              <div>
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-1">
                  Enable Agentic AI
                </h3>
                <p className="text-figma-base font-medium text-fw-body">
                  Allow the AI assistant to proactively monitor your network, detect issues,
                  and take action on your behalf. The AI will alert you before taking any
                  significant actions.
                </p>
                {agenticSettings.enabled && (
                  <div className="mt-2 flex items-center text-figma-sm font-medium text-fw-success">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Agentic AI is active
                  </div>
                )}
              </div>
            </div>
            <Toggle
              checked={agenticSettings.enabled}
              onChange={handleToggleAgentic}
            />
          </div>
        </div>

        {agenticSettings.enabled && (
          <>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-fw-neutral">
                    <CheckCircle className="h-6 w-6 text-fw-body" />
                  </div>
                  <div>
                    <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-1">
                      Auto-Resolve Issues
                    </h3>
                    <p className="text-figma-base font-medium text-fw-body">
                      Allow the AI to automatically resolve detected issues when safe to do so.
                      You'll receive notifications about all actions taken.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={agenticSettings.autoResolve}
                  onChange={(checked) => updateAgenticSettings({ autoResolve: checked })}
                />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-fw-neutral">
                    <Ticket className="h-6 w-6 text-fw-body" />
                  </div>
                  <div>
                    <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-1">
                      Automatic Ticket Creation
                    </h3>
                    <p className="text-figma-base font-medium text-fw-body">
                      Automatically create support tickets for issues that require human intervention.
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={agenticSettings.autoTicketCreation}
                  onChange={(checked) => updateAgenticSettings({ autoTicketCreation: checked })}
                />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg bg-fw-neutral">
                  <Bell className="h-6 w-6 text-fw-body" />
                </div>
                <div className="flex-1">
                  <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-1">
                    Notification Preferences
                  </h3>
                  <p className="text-figma-base font-medium text-fw-body mb-4">
                    Choose which types of issues trigger notifications.
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="notifications"
                        checked={agenticSettings.notificationPreference === 'all'}
                        onChange={() => updateAgenticSettings({ notificationPreference: 'all' })}
                        className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary"
                      />
                      <span className="ml-3 text-figma-base font-medium text-fw-body">All Issues</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="notifications"
                        checked={agenticSettings.notificationPreference === 'critical'}
                        onChange={() => updateAgenticSettings({ notificationPreference: 'critical' })}
                        className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary"
                      />
                      <span className="ml-3 text-figma-base font-medium text-fw-body">Critical Only</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="notifications"
                        checked={agenticSettings.notificationPreference === 'none'}
                        onChange={() => updateAgenticSettings({ notificationPreference: 'none' })}
                        className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary"
                      />
                      <span className="ml-3 text-figma-base font-medium text-fw-body">None (Silent Mode)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-fw-base rounded-2xl p-6 max-w-md mx-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-fw-accent">
                <AlertTriangle className="h-6 w-6 text-fw-link" />
              </div>
              <div className="flex-1">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-2">
                  Enable Agentic AI?
                </h3>
                <p className="text-figma-base font-medium text-fw-body mb-4">
                  This will allow the AI assistant to proactively monitor your network and take
                  actions on your behalf. You can customize the specific permissions and
                  notification settings after enabling.
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={confirmEnable}
                    className="rounded-full px-4 py-2 bg-fw-primary text-white text-figma-sm font-medium hover:bg-brand-darkBlue transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="rounded-full px-4 py-2 bg-fw-base text-fw-body text-figma-sm font-medium border border-fw-secondary hover:bg-fw-wash transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

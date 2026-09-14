import { useState } from 'react';
import { Edit, Trash2, Bell, Mail, MessageSquare, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Button } from '../../../common/Button';
import { useStore } from '../../../../store/useStore';
import { AlertRule } from '../../../../types/rule';
import { CreateAlertRuleModal } from '../../alerts/CreateAlertRuleModal';

interface AlertRulesProps {
  selectedConnection: string;
}

export function AlertRules({ selectedConnection }: AlertRulesProps) {
  const { rules, toggleRule, deleteRule } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | undefined>();

  const alertRules = rules.filter(rule => rule.type === 'alert') as AlertRule[];

  const getPriorityColor = (priority: AlertRule['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-fw-errorLight text-fw-error border-fw-error';
      case 'high':
        return 'bg-fw-wash text-fw-bodyLight border-fw-secondary';
      case 'medium':
        return 'bg-fw-wash text-fw-bodyLight border-fw-secondary';
      case 'low':
        return 'bg-fw-accent text-fw-linkHover border-fw-active';
      default:
        return 'bg-fw-neutral text-fw-body border-fw-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em]">Alert Rules</h3>
          <p className="text-figma-base text-fw-bodyLight mt-1">
            Create rules to automatically generate alerts based on log patterns
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setEditingRule(undefined);
            setShowCreateModal(true);
          }}
          className="whitespace-nowrap shrink-0"
        >
          Create Alert Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alertRules.length === 0 ? (
          <div className="text-center py-12 text-fw-bodyLight card">
            <Bell className="h-12 w-12 mx-auto mb-4 text-fw-bodyLight" />
            <p className="text-lg font-medium mb-2">No Alert Rules</p>
            <p className="text-figma-base">Create your first alert rule to start monitoring</p>
          </div>
        ) : (
          alertRules.map((rule) => (
            <div
              key={rule.id}
              className={`card p-6 hover:shadow-md transition-shadow ${
                !rule.enabled ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Bell className={`h-5 w-5 ${rule.enabled ? 'text-fw-link' : 'text-fw-bodyLight'}`} />
                    <h4 className="text-base font-semibold text-fw-heading">{rule.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-figma-sm font-medium border ${getPriorityColor(rule.priority)}`}>
                      {rule.priority.toUpperCase()}
                    </span>
                    {rule.enabled ? (
                      <CheckCircle className="h-4 w-4 text-fw-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-fw-bodyLight" />
                    )}
                  </div>

                  <p className="text-figma-base text-fw-body mb-3">{rule.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-figma-base">
                    <div>
                      <span className="text-fw-bodyLight">Conditions:</span>
                      <span className="ml-2 text-fw-heading font-medium">
                        {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-fw-bodyLight">Actions:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        {rule.actions.email && <Mail className="h-4 w-4 text-fw-body" />}
                        {rule.actions.slack && <MessageSquare className="h-4 w-4 text-fw-body" />}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-4 text-figma-sm text-fw-bodyLight">
                    <span>Triggered: {rule.triggerCount} times</span>
                    {rule.lastTriggered && (
                      <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                    )}
                    <span>Cooldown: {rule.cooldownMinutes}m</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-fw-neutral peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fw-active rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-fw-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fw-cobalt-600"></div>
                  </label>

                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setShowCreateModal(true);
                    }}
                    className="p-2 text-fw-bodyLight hover:text-fw-body rounded-lg hover:bg-fw-neutral"
                  >
                    <Edit className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 text-fw-error hover:text-fw-error rounded-lg hover:bg-fw-errorLight"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateAlertRuleModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingRule(undefined);
          }}
          editRule={editingRule}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../common/Button';
import { AlertRule, RuleCondition, RulePriority } from '../../../types/rule';
import { useStore } from '../../../store/useStore';

interface CreateAlertRuleModalProps {
  onClose: () => void;
  editRule?: AlertRule;
}

export function CreateAlertRuleModal({ onClose, editRule }: CreateAlertRuleModalProps) {
  const { addRule, updateRule } = useStore();

  const [formData, setFormData] = useState({
    name: editRule?.name || '',
    description: editRule?.description || '',
    priority: (editRule?.priority || 'medium') as RulePriority,
    cooldownMinutes: editRule?.cooldownMinutes || 15,
    emailEnabled: editRule?.actions?.email || false,
    slackEnabled: editRule?.actions?.slack || false,
    webhookEnabled: editRule?.actions?.webhook || false
  });

  const [conditions, setConditions] = useState<RuleCondition[]>(
    editRule?.conditions || [
      {
        type: 'severity',
        field: 'severity',
        operator: 'equals',
        value: ''
      }
    ]
  );

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        type: 'severity',
        field: '',
        operator: 'equals',
        value: ''
      }
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof RuleCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = {
      ...newConditions[index],
      [field]: value
    };
    setConditions(newConditions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || conditions.some(c => !c.field || !c.value)) {
      window.addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        duration: 3000
      });
      return;
    }

    const rule: AlertRule = {
      id: editRule?.id || `alert-${Date.now()}`,
      type: 'alert',
      name: formData.name,
      description: formData.description,
      enabled: editRule?.enabled ?? true,
      status: 'active',
      priority: formData.priority,
      createdAt: editRule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user',
      triggerCount: editRule?.triggerCount || 0,
      lastTriggered: editRule?.lastTriggered,
      conditions,
      actions: {
        email: formData.emailEnabled,
        slack: formData.slackEnabled,
        webhook: formData.webhookEnabled
      },
      cooldownMinutes: formData.cooldownMinutes
    };

    if (editRule) {
      updateRule(rule);
    } else {
      addRule(rule);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-fw-base rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-fw-base border-b border-fw-secondary px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-fw-heading tracking-[-0.03em]">
            {editRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-fw-bodyLight hover:text-fw-body transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-figma-base font-medium text-fw-body mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                placeholder="e.g., High Latency Detection"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-figma-base font-medium text-fw-body mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                rows={2}
                placeholder="Describe when this rule should trigger"
              />
            </div>

            <div>
              <label className="block text-figma-base font-medium text-fw-body mb-1">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as RulePriority })}
                className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-figma-base font-medium text-fw-body mb-1">
                Cooldown (minutes)
              </label>
              <input
                type="number"
                value={formData.cooldownMinutes}
                onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) })}
                className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                min="0"
              />
              <p className="text-figma-sm text-fw-bodyLight mt-1">Time before rule can trigger again</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-figma-base font-medium text-fw-body">
                Conditions *
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={handleAddCondition}
              >
                Add Condition
              </Button>
            </div>

            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-fw-wash rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <select
                      value={condition.type}
                      onChange={(e) => handleConditionChange(index, 'type', e.target.value)}
                      className="rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                    >
                      <option value="severity">Severity</option>
                      <option value="keyword">Keyword</option>
                      <option value="pattern">Pattern</option>
                      <option value="threshold">Threshold</option>
                    </select>

                    <input
                      type="text"
                      value={condition.field}
                      onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                      placeholder="Field name"
                      className="rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                    />

                    <select
                      value={condition.operator}
                      onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                      className="rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="not_contains">Not Contains</option>
                      <option value="matches">Matches</option>
                      <option value="exceeds">Exceeds</option>
                      <option value="below">Below</option>
                    </select>

                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                    />
                  </div>

                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="p-2 text-fw-error hover:bg-fw-errorLight rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-figma-base font-medium text-fw-body mb-3">
              Notification Channels
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.emailEnabled}
                  onChange={(e) => setFormData({ ...formData, emailEnabled: e.target.checked })}
                  className="h-4 w-4 text-brand-blue rounded border-fw-secondary focus:ring-fw-active"
                />
                <span className="ml-2 text-figma-base text-fw-body">Email</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.slackEnabled}
                  onChange={(e) => setFormData({ ...formData, slackEnabled: e.target.checked })}
                  className="h-4 w-4 text-brand-blue rounded border-fw-secondary focus:ring-fw-active"
                />
                <span className="ml-2 text-figma-base text-fw-body">Teams</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.webhookEnabled}
                  onChange={(e) => setFormData({ ...formData, webhookEnabled: e.target.checked })}
                  className="h-4 w-4 text-brand-blue rounded border-fw-secondary focus:ring-fw-active"
                />
                <span className="ml-2 text-figma-base text-fw-body">Webhook</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-fw-secondary">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {editRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

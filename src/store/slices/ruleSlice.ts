import { StateCreator } from 'zustand';
import { Rule, RuleEvaluationResult } from '../../types/rule';
import { globalRuleEngine } from '../../utils/ruleEngine';

export interface RuleState {
  rules: Rule[];
  evaluationResults: RuleEvaluationResult[];
  isEvaluating: boolean;
  lastEvaluationTime?: string;
}

export interface RuleActions {
  addRule: (rule: Rule) => void;
  updateRule: (rule: Rule) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;
  getRulesByType: (type: Rule['type']) => Rule[];
  getRulesByConnection: (connectionId: string) => Rule[];
  evaluateRulesForContext: (context: any) => void;
  clearEvaluationResults: () => void;
  loadSampleRules: () => void;
}

export type RuleSlice = RuleState & RuleActions;

export const createRuleSlice: StateCreator<RuleSlice> = (set, get) => ({
  rules: [],
  evaluationResults: [],
  isEvaluating: false,
  lastEvaluationTime: undefined,

  addRule: (rule) => {
    globalRuleEngine.addRule(rule);
    set((state) => ({
      rules: [...state.rules, rule]
    }));

    window.addToast?.({
      type: 'success',
      title: 'Rule Created',
      message: `Rule "${rule.name}" has been created successfully`,
      duration: 3000
    });
  },

  updateRule: (rule) => {
    globalRuleEngine.updateRule(rule);
    set((state) => ({
      rules: state.rules.map((r) => (r.id === rule.id ? rule : r))
    }));

    window.addToast?.({
      type: 'success',
      title: 'Rule Updated',
      message: `Rule "${rule.name}" has been updated`,
      duration: 3000
    });
  },

  deleteRule: (ruleId) => {
    const rule = get().rules.find((r) => r.id === ruleId);
    globalRuleEngine.removeRule(ruleId);
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== ruleId)
    }));

    window.addToast?.({
      type: 'success',
      title: 'Rule Deleted',
      message: `Rule "${rule?.name}" has been deleted`,
      duration: 3000
    });
  },

  toggleRule: (ruleId) => {
    const rule = get().rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const updatedRule = { ...rule, enabled: !rule.enabled };
    get().updateRule(updatedRule);

    window.addToast?.({
      type: 'success',
      title: 'Rule Updated',
      message: `Rule "${rule.name}" ${updatedRule.enabled ? 'enabled' : 'disabled'}`,
      duration: 3000
    });
  },

  getRulesByType: (type) => {
    return get().rules.filter((rule) => rule.type === type);
  },

  getRulesByConnection: (connectionId) => {
    return get().rules.filter(
      (rule) => !rule.connectionId || rule.connectionId === connectionId
    );
  },

  evaluateRulesForContext: (context) => {
    set({ isEvaluating: true });

    try {
      const results = globalRuleEngine.evaluateRules(context);

      set({
        evaluationResults: results,
        isEvaluating: false,
        lastEvaluationTime: new Date().toISOString()
      });

      results.forEach((result) => {
        if (result.triggered) {
          const rule = get().rules.find((r) => r.id === result.ruleId);
          if (rule) {
            const updatedRule = {
              ...rule,
              triggerCount: rule.triggerCount + 1,
              lastTriggered: result.timestamp
            };
            get().updateRule(updatedRule);
          }
        }
      });

      if (results.length > 0) {
        const triggeredCount = results.filter((r) => r.triggered).length;
        if (triggeredCount > 0) {
          window.addToast?.({
            type: 'info',
            title: 'Rules Triggered',
            message: `${triggeredCount} rule${triggeredCount > 1 ? 's' : ''} triggered`,
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error('Error evaluating rules:', error);
      set({ isEvaluating: false });

      window.addToast?.({
        type: 'error',
        title: 'Evaluation Error',
        message: 'Failed to evaluate rules',
        duration: 3000
      });
    }
  },

  clearEvaluationResults: () => {
    set({ evaluationResults: [] });
  },

  loadSampleRules: () => {
    const sampleRules: Rule[] = [
      {
        id: 'alert-1',
        type: 'alert',
        name: 'Critical Error Detection',
        description: 'Alert when critical errors are logged',
        enabled: true,
        status: 'active',
        priority: 'critical',
        createdAt: '2024-03-11T10:00:00Z',
        updatedAt: '2024-03-11T10:00:00Z',
        createdBy: 'admin',
        triggerCount: 12,
        lastTriggered: '2024-03-11T15:30:00Z',
        conditions: [
          {
            type: 'severity',
            field: 'severity',
            operator: 'equals',
            value: 'error'
          }
        ],
        actions: {
          email: true,
          slack: true,
          webhook: false
        },
        cooldownMinutes: 15
      },
      {
        id: 'notification-1',
        type: 'notification',
        name: 'High Latency Alert',
        description: 'Notify when latency exceeds 100ms',
        enabled: true,
        status: 'active',
        priority: 'high',
        createdAt: '2024-03-11T10:00:00Z',
        updatedAt: '2024-03-11T10:00:00Z',
        createdBy: 'admin',
        triggerCount: 25,
        lastTriggered: '2024-03-11T14:20:00Z',
        metricId: 'latency',
        threshold: {
          operator: 'exceeds',
          value: 100
        },
        channels: {
          email: true,
          slack: false,
          webhook: false
        },
        escalationLevel: 1
      },
      {
        id: 'automation-1',
        type: 'automation',
        name: 'Auto-restart on Critical Error',
        description: 'Automatically restart service when critical errors detected',
        enabled: false,
        status: 'active',
        priority: 'high',
        createdAt: '2024-03-11T10:00:00Z',
        updatedAt: '2024-03-11T10:00:00Z',
        createdBy: 'admin',
        triggerCount: 5,
        lastTriggered: '2024-03-11T12:00:00Z',
        trigger: {
          type: 'severity',
          condition: 'error|critical'
        },
        action: {
          type: 'restart_service',
          details: 'Restart connection service',
          config: {
            serviceName: 'connection-service',
            gracefulShutdown: true
          }
        },
        executionCount: 5,
        successRate: 100,
        lastExecuted: '2024-03-11T12:00:00Z',
        maxExecutionsPerHour: 3
      },
      // LMCC-specific alert rules
      {
        id: 'alert-lmcc-bgp',
        type: 'alert',
        name: 'AWS Max BGP Path Down',
        description: 'Alert when any AWS Max BGP session drops from Established. Warning at 1 path, Critical at 2+ paths.',
        enabled: true,
        status: 'active',
        priority: 'critical',
        createdAt: '2026-07-01T14:00:00Z',
        updatedAt: '2026-07-01T14:00:00Z',
        createdBy: 'admin',
        triggerCount: 0,
        lastTriggered: undefined,
        conditions: [
          {
            type: 'pattern',
            field: 'message',
            operator: 'contains',
            value: 'AWS Max BGP'
          }
        ],
        actions: {
          email: true,
          slack: true,
          webhook: true
        },
        cooldownMinutes: 5
      },
      {
        id: 'alert-lmcc-bfd',
        type: 'alert',
        name: 'AWS Max BFD Failover Triggered',
        description: 'Alert when BFD detects path failure and triggers sub-second failover on any AWS Max path.',
        enabled: true,
        status: 'active',
        priority: 'high',
        createdAt: '2026-07-01T14:00:00Z',
        updatedAt: '2026-07-01T14:00:00Z',
        createdBy: 'admin',
        triggerCount: 0,
        lastTriggered: undefined,
        conditions: [
          {
            type: 'pattern',
            field: 'message',
            operator: 'contains',
            value: 'BFD failure'
          }
        ],
        actions: {
          email: true,
          slack: true,
          webhook: false
        },
        cooldownMinutes: 1
      },
      {
        id: 'notification-lmcc-contract',
        type: 'notification',
        name: 'AWS Max Contract Expiration Warning',
        description: 'Notify 30/60/90 days before fixed-term AWS Max contract expires.',
        enabled: true,
        status: 'active',
        priority: 'medium',
        createdAt: '2026-07-01T14:00:00Z',
        updatedAt: '2026-07-01T14:00:00Z',
        createdBy: 'admin',
        triggerCount: 0,
        lastTriggered: undefined,
        metricId: 'contract_expiry',
        threshold: {
          operator: 'less_than',
          value: 90
        },
        channels: {
          email: true,
          slack: false,
          webhook: false
        },
        escalationLevel: 1
      }
    ];

    sampleRules.forEach((rule) => {
      globalRuleEngine.addRule(rule);
    });

    set({ rules: sampleRules });
  }
});

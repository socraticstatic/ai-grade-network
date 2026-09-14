export type RuleConditionType = 'severity' | 'keyword' | 'pattern' | 'frequency' | 'threshold' | 'status';
export type RuleOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches' | 'exceeds' | 'below' | 'between';
export type RulePriority = 'low' | 'medium' | 'high' | 'critical';
export type RuleStatus = 'active' | 'inactive' | 'paused';
export type RuleActionType = 'alert' | 'email' | 'slack' | 'webhook' | 'restart_service' | 'scale_resources' | 'create_ticket';

export interface RuleCondition {
  type: RuleConditionType;
  field: string;
  operator: RuleOperator;
  value: string | number;
  secondaryValue?: string | number;
}

export interface RuleAction {
  type: RuleActionType;
  config: Record<string, any>;
}

export interface BaseRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: RuleStatus;
  priority: RulePriority;
  connectionId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertRule extends BaseRule {
  type: 'alert';
  conditions: RuleCondition[];
  actions: {
    email?: boolean;
    slack?: boolean;
    webhook?: boolean;
  };
  cooldownMinutes: number;
}

export interface NotificationRule extends BaseRule {
  type: 'notification';
  metricId: string;
  threshold: {
    operator: RuleOperator;
    value: number;
    secondaryValue?: number;
  };
  channels: {
    email?: boolean;
    slack?: boolean;
    webhook?: boolean;
  };
  escalationLevel: number;
}

export interface AutomationRule extends BaseRule {
  type: 'automation';
  trigger: {
    type: RuleConditionType;
    condition: string;
  };
  action: {
    type: RuleActionType;
    details: string;
    config: Record<string, any>;
  };
  executionCount: number;
  successRate: number;
  lastExecuted?: string;
  maxExecutionsPerHour?: number;
}

export interface FilterRule extends BaseRule {
  type: 'filter';
  filters: {
    severity?: string[];
    types?: string[];
    keywords?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  isDefault: boolean;
  usageCount: number;
  lastUsed?: string;
}

export type Rule = AlertRule | NotificationRule | AutomationRule | FilterRule;

export interface RuleEvaluationContext {
  connectionId: string;
  timestamp: string;
  data: Record<string, any>;
  previousData?: Record<string, any>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  timestamp: string;
  context: RuleEvaluationContext;
  actions: RuleAction[];
  metadata?: Record<string, any>;
}

import { Rule, RuleEvaluationContext, RuleEvaluationResult, RuleCondition, RuleOperator, AlertRule, NotificationRule, AutomationRule } from '../types/rule';

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();

  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  updateRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRulesByType(type: Rule['type']): Rule[] {
    return this.getAllRules().filter(rule => rule.type === type);
  }

  getRulesByConnection(connectionId: string): Rule[] {
    return this.getAllRules().filter(
      rule => !rule.connectionId || rule.connectionId === connectionId
    );
  }

  evaluateRules(context: RuleEvaluationContext): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const activeRules = this.getAllRules().filter(
      rule => rule.enabled && rule.status === 'active'
    );

    for (const rule of activeRules) {
      if (rule.connectionId && rule.connectionId !== context.connectionId) {
        continue;
      }

      const result = this.evaluateRule(rule, context);
      if (result.triggered) {
        results.push(result);
      }
    }

    return results;
  }

  private evaluateRule(rule: Rule, context: RuleEvaluationContext): RuleEvaluationResult {
    let triggered = false;
    const actions: any[] = [];

    switch (rule.type) {
      case 'alert':
        triggered = this.evaluateAlertRule(rule, context);
        if (triggered && rule.actions) {
          if (rule.actions.email) actions.push({ type: 'email', config: {} });
          if (rule.actions.slack) actions.push({ type: 'slack', config: {} });
          if (rule.actions.webhook) actions.push({ type: 'webhook', config: {} });
        }
        break;

      case 'notification':
        triggered = this.evaluateNotificationRule(rule, context);
        if (triggered && rule.channels) {
          if (rule.channels.email) actions.push({ type: 'email', config: {} });
          if (rule.channels.slack) actions.push({ type: 'slack', config: {} });
          if (rule.channels.webhook) actions.push({ type: 'webhook', config: {} });
        }
        break;

      case 'automation':
        triggered = this.evaluateAutomationRule(rule, context);
        if (triggered) {
          actions.push({
            type: rule.action.type,
            config: rule.action.config
          });
        }
        break;

      case 'filter':
        triggered = false;
        break;
    }

    return {
      ruleId: rule.id,
      triggered,
      timestamp: context.timestamp,
      context,
      actions,
      metadata: {
        ruleName: rule.name,
        priority: rule.priority
      }
    };
  }

  private evaluateAlertRule(rule: AlertRule, context: RuleEvaluationContext): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return false;
    }

    return rule.conditions.every(condition =>
      this.evaluateCondition(condition, context)
    );
  }

  private evaluateNotificationRule(rule: NotificationRule, context: RuleEvaluationContext): boolean {
    const metricValue = context.data[rule.metricId];
    if (metricValue === undefined || metricValue === null) {
      return false;
    }

    return this.compareValues(
      metricValue,
      rule.threshold.value,
      rule.threshold.operator,
      rule.threshold.secondaryValue
    );
  }

  private evaluateAutomationRule(rule: AutomationRule, context: RuleEvaluationContext): boolean {
    if (rule.maxExecutionsPerHour) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      if (rule.lastExecuted && rule.lastExecuted > oneHourAgo) {
        const recentExecutions = rule.executionCount;
        if (recentExecutions >= rule.maxExecutionsPerHour) {
          return false;
        }
      }
    }

    const triggerField = context.data[rule.trigger.type];
    if (!triggerField) {
      return false;
    }

    return this.matchesPattern(triggerField, rule.trigger.condition);
  }

  private evaluateCondition(condition: RuleCondition, context: RuleEvaluationContext): boolean {
    const fieldValue = context.data[condition.field];

    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    return this.compareValues(
      fieldValue,
      condition.value,
      condition.operator,
      condition.secondaryValue
    );
  }

  private compareValues(
    actual: any,
    expected: any,
    operator: RuleOperator,
    secondaryValue?: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'not_equals':
        return actual !== expected;

      case 'contains':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());

      case 'not_contains':
        return !String(actual).toLowerCase().includes(String(expected).toLowerCase());

      case 'matches':
        try {
          const regex = new RegExp(String(expected));
          return regex.test(String(actual));
        } catch {
          return false;
        }

      case 'exceeds':
        return Number(actual) > Number(expected);

      case 'below':
        return Number(actual) < Number(expected);

      case 'between':
        if (secondaryValue === undefined) return false;
        return Number(actual) >= Number(expected) && Number(actual) <= Number(secondaryValue);

      default:
        return false;
    }
  }

  private matchesPattern(value: any, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(String(value));
    } catch {
      return String(value).toLowerCase().includes(pattern.toLowerCase());
    }
  }

  getCooldownStatus(rule: AlertRule): { inCooldown: boolean; remainingMinutes?: number } {
    if (!rule.lastTriggered || rule.cooldownMinutes === 0) {
      return { inCooldown: false };
    }

    const lastTriggered = new Date(rule.lastTriggered);
    const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldownMinutes * 60000);
    const now = new Date();

    if (now < cooldownEnd) {
      const remainingMs = cooldownEnd.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return { inCooldown: true, remainingMinutes };
    }

    return { inCooldown: false };
  }

  getActiveRulesCount(): number {
    return this.getAllRules().filter(rule => rule.enabled && rule.status === 'active').length;
  }

  getRuleStats(ruleId: string): {
    totalTriggers: number;
    lastTriggered?: string;
    successRate?: number;
  } | null {
    const rule = this.getRule(ruleId);
    if (!rule) return null;

    const stats: any = {
      totalTriggers: rule.triggerCount,
      lastTriggered: rule.lastTriggered
    };

    if (rule.type === 'automation') {
      stats.successRate = rule.successRate;
    }

    return stats;
  }
}

export const globalRuleEngine = new RuleEngine();

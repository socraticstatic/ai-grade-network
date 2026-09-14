// src/components/pages/NotificationsShowcasePage.tsx
import { useStore } from '../../store/useStore';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';

interface WcagInfo {
  ratio: string;
  label: string;
}

interface TriggerCardProps {
  icon: React.ReactNode;
  label: string;
  severity: string;
  severityColor: string;
  description: string;
  wcag: WcagInfo;
  importance: string;
  urgency: string;
  onTrigger: () => void;
}

function TriggerCard({ icon, label, severity, severityColor, description, wcag, importance, urgency, onTrigger }: TriggerCardProps) {
  return (
    <div className="bg-fw-base border border-fw-secondary rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{label}</span>
        </div>
        <span className={`text-figma-xs font-medium uppercase tracking-[0.04em] px-2 py-0.5 rounded-full ${severityColor}`}>
          {severity}
        </span>
      </div>
      <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">{description}</p>
      <div className="flex gap-3 pt-1 border-t border-fw-secondary">
        <div>
          <p className="text-figma-xs text-fw-bodyLight tracking-[-0.03em] uppercase font-medium">Importance</p>
          <p className="text-figma-xs text-fw-heading tracking-[-0.03em]">{importance}</p>
        </div>
        <div>
          <p className="text-figma-xs text-fw-bodyLight tracking-[-0.03em] uppercase font-medium">Urgency</p>
          <p className="text-figma-xs text-fw-heading tracking-[-0.03em]">{urgency}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-figma-xs font-medium text-fw-success tracking-[-0.03em]">✓ WCAG AA</p>
          <p className="text-figma-xs font-mono text-fw-heading">{wcag.ratio}</p>
        </div>
      </div>
      <button
        onClick={onTrigger}
        className="mt-auto self-start text-figma-sm font-medium text-fw-link border border-fw-active rounded-full px-4 py-1.5 hover:bg-fw-active/5 transition-colors tracking-[-0.03em]"
      >
        Trigger
      </button>
    </div>
  );
}

export function NotificationsShowcasePage() {
  const { showAlert, showWarning, addToast, showBanner, showConfirm } = useStore();

  const triggers = [
    {
      icon: <AlertCircle className="h-4 w-4 text-fw-error" />,
      label: 'Alert',
      severity: 'Critical',
      severityColor: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
      description: 'Fires when a system action fails and requires user acknowledgement before continuing.',
      wcag: { ratio: '6.04:1', label: '#c70032 on white' },
      importance: 'Critical',
      urgency: 'Immediate — blocks workflow',
      onTrigger: () => showAlert({
        title: 'Unable to connect to your account',
        reassurance: 'Your changes were saved,',
        reason: 'but we could not connect to your account due to a technical issue on our end.',
        fix: 'Please try connecting again.',
        escalation: 'contact your support team',
        supportId: '1430987843e',
        actionLabel: 'Try Again',
      }),
    },
    {
      icon: <AlertTriangle className="h-4 w-4 text-fw-warn" />,
      label: 'Warning',
      severity: 'Warning',
      severityColor: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
      description: 'Fires when an action will have consequences the user should understand before proceeding.',
      wcag: { ratio: '6.87:1', label: 'white on #0057b8' },
      importance: 'High',
      urgency: 'Before action — not blocking',
      onTrigger: () => showWarning({
        title: 'Active traffic will be interrupted',
        reassurance: 'Your connection settings are intact,',
        reason: 'but editing bandwidth will interrupt active traffic on 3 links.',
        fix: 'Schedule this change during a maintenance window to avoid disruption.',
        escalation: 'contact your support team',
        supportId: 'warn-7f2a1',
        actionLabel: 'I Understand',
      }),
    },
    {
      icon: <Info className="h-4 w-4 text-fw-info" />,
      label: 'Info Toast',
      severity: 'Info',
      severityColor: 'bg-fw-accent text-fw-info',
      description: 'Non-blocking status update. Auto-dismisses after 5 seconds.',
      wcag: { ratio: '5.07:1', label: '#0074b3 on white' },
      importance: 'Low',
      urgency: 'Passive — auto-dismisses',
      onTrigger: () => addToast({
        type: 'info',
        title: 'Bandwidth updated',
        message: 'Connection speed set to 500 Mbps.',
        duration: 5000,
      }),
    },
    {
      icon: <CheckCircle className="h-4 w-4 text-fw-success" />,
      label: 'Success Toast',
      severity: 'Success',
      severityColor: 'bg-[var(--status-active-bg)] text-[var(--status-active-text)]',
      description: 'Confirms a completed action. Auto-dismisses after 4 seconds.',
      wcag: { ratio: '5.09:1', label: '#2d7e24 on white' },
      importance: 'Low',
      urgency: 'Passive — auto-dismisses',
      onTrigger: () => addToast({
        type: 'success',
        title: 'Group policy applied',
        message: '4 connections updated successfully.',
        duration: 4000,
      }),
    },
    {
      icon: <AlertCircle className="h-4 w-4 text-fw-error" />,
      label: 'Error Toast',
      severity: 'Error',
      severityColor: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
      description: 'Reports a failed action. Persists until manually dismissed.',
      wcag: { ratio: '6.04:1', label: '#c70032 on white' },
      importance: 'Medium',
      urgency: 'Persistent — user must dismiss',
      onTrigger: () => addToast({
        type: 'error',
        title: 'Export failed',
        message: 'Could not generate CSV. Please try again.',
        duration: null,
      }),
    },
    {
      icon: <AttIcon name="bell" className="h-4 w-4 text-fw-info" />,
      label: 'Announcement',
      severity: 'System',
      severityColor: 'bg-fw-accent text-fw-info',
      description: 'System-wide message persisted at the top of the page until dismissed.',
      wcag: { ratio: '4.58:1', label: '#0074b3 on #e6f6fd' },
      importance: 'Medium',
      urgency: 'Ambient — read when convenient',
      onTrigger: () => showBanner({
        title: 'Scheduled Maintenance',
        message: 'June 5, 2026 02:00–06:00 AM EST. Portal is read-only.',
        ctaLabel: 'View details',
        ctaHref: '/support',
      }),
    },
    {
      icon: <AttIcon name="question-circle" className="h-4 w-4 text-fw-bodyLight" />,
      label: 'Confirm — Standard',
      severity: 'Neutral',
      severityColor: 'bg-fw-neutral text-fw-bodyLight',
      description: '"Are you sure?" for actions with recoverable consequences.',
      wcag: { ratio: '6.87:1', label: 'white on #0057b8' },
      importance: 'Medium',
      urgency: 'User-initiated — gate before action',
      onTrigger: () => showConfirm({
        title: 'Apply policy to all connections?',
        message: 'This will update bandwidth limits on 12 active connections in the EMEA group.',
        variant: 'standard',
        confirmLabel: 'Apply Policy',
        onConfirm: () => addToast({ type: 'success', title: 'Policy applied', message: '12 connections updated.', duration: 4000 }),
      }),
    },
    {
      icon: <AttIcon name="question-circle" className="h-4 w-4 text-fw-error" />,
      label: 'Confirm — Destructive',
      severity: 'Danger',
      severityColor: 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]',
      description: '"Are you sure?" for irreversible actions like deleting or removing.',
      wcag: { ratio: '6.04:1', label: '#c70032 on white' },
      importance: 'High',
      urgency: 'User-initiated — irreversible action',
      onTrigger: () => showConfirm({
        title: 'Delete this connection?',
        message: 'Azure ITC — San Jose will be permanently removed. Active traffic will be terminated immediately. This cannot be undone.',
        variant: 'destructive',
        confirmLabel: 'Delete Connection',
        onConfirm: () => addToast({ type: 'info', title: 'Connection deleted', message: 'Azure ITC removed.', duration: 5000 }),
      }),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <AttIcon name="bell" className="h-5 w-5 text-fw-bodyLight" />
          <span className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Design System</span>
        </div>
        <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">
          Notification System
        </h1>
        <p className="text-figma-base text-fw-bodyLight mt-1 tracking-[-0.03em]">
          AT&T AI-grade network — FLYWHEEL-compliant notification patterns. Trigger each type to preview behavior.
        </p>
      </div>

      {/* Trigger grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {triggers.map((t) => (
          <TriggerCard key={t.label} {...t} />
        ))}
      </div>

      {/* Color legend */}
      <div className="mt-10 pt-6 border-t border-fw-secondary">
        <p className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em] mb-3">Color System</p>
        <div className="flex flex-wrap gap-6">
          {[
            { label: 'Alert / Error Toast', color: 'bg-fw-error', token: '#c70032 · 6.04:1' },
            { label: 'Warning', color: 'bg-fw-warn', token: '#ea712f · bar only' },
            { label: 'Success Toast', color: 'bg-fw-success', token: '#2d7e24 · 5.09:1' },
            { label: 'Info Toast / Announcement', color: 'bg-att-blue', token: '#009fdb · bar · icon #0074b3' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-sm ring-1 ring-fw-secondary ${item.color}`} />
              <div>
                <p className="text-figma-xs font-medium text-fw-heading">{item.label}</p>
                <p className="text-figma-xs text-fw-bodyLight font-mono">{item.token}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

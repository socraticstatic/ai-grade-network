import { useState } from 'react';
import { Send, Clock, CheckCircle, XCircle, AlertCircle, User, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { PermissionRequirement, PERMISSION_LABELS } from '../../types/permissions';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: PermissionRequirement;
  resourceName?: string;
}

export function PermissionRequestModal({ isOpen, onClose, requirement, resourceName }: PermissionRequestModalProps) {
  const [justification, setJustification] = useState('');
  const [duration, setDuration] = useState('1-day');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      window.addToast({
        type: 'success',
        title: 'Access Request Submitted',
        message: 'Your request has been sent to your manager for approval',
        duration: 5000
      });
      onClose();
      setSubmitted(false);
      setJustification('');
    }, 1500);
  };

  const approvalChain = [
    { role: 'You', status: 'current', icon: User },
    { role: 'Department Manager', status: 'pending', icon: User },
    { role: 'System Admin', status: 'pending', icon: User }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Access" size="medium">
      {!submitted ? (
        <div className="space-y-6">
          {/* What you're requesting */}
          <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
            <h4 className="text-figma-base font-semibold text-fw-heading mb-2 tracking-[-0.03em]">Access Request</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-figma-sm">
                <span className="text-fw-link">Permission:</span>
                <span className="font-semibold text-fw-heading">{PERMISSION_LABELS[requirement.permission]}</span>
              </div>
              {resourceName && (
                <div className="flex justify-between text-figma-sm">
                  <span className="text-fw-link">Resource:</span>
                  <span className="font-semibold text-fw-heading">{resourceName}</span>
                </div>
              )}
              {requirement.role && (
                <div className="flex justify-between text-figma-sm">
                  <span className="text-fw-link">Required Role:</span>
                  <span className="font-semibold text-fw-heading capitalize">{requirement.role}</span>
                </div>
              )}
              {requirement.scope && (
                <div className="flex justify-between text-figma-sm">
                  <span className="text-fw-link">Scope:</span>
                  <span className="font-semibold text-fw-heading capitalize">{requirement.scope}</span>
                </div>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-figma-base font-medium text-fw-body mb-2">
              Access Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-fw-active"
            >
              <option value="1-hour">1 Hour</option>
              <option value="4-hours">4 Hours</option>
              <option value="1-day">1 Day (8 hours)</option>
              <option value="3-days">3 Days</option>
              <option value="1-week">1 Week</option>
              <option value="permanent">Permanent</option>
            </select>
            <p className="text-figma-sm text-fw-bodyLight mt-1">Temporary access is recommended for security best practices</p>
          </div>

          {/* Justification */}
          <div>
            <label className="block text-figma-base font-medium text-fw-body mb-2">
              Business Justification <span className="text-fw-error">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              placeholder="Explain why you need this access and what you plan to do with it..."
              className="w-full px-4 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active resize-none"
            />
            <p className="text-figma-sm text-fw-bodyLight mt-1">This will be reviewed by your manager</p>
          </div>

          {/* Approval Chain */}
          <div>
            <h4 className="text-figma-base font-semibold text-fw-heading mb-3 tracking-[-0.03em]">Approval Chain</h4>
            <div className="flex items-center justify-between">
              {approvalChain.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step.status === 'current' ? 'bg-fw-accent' :
                      step.status === 'approved' ? 'bg-fw-successLight' :
                      'bg-fw-neutral'
                    }`}>
                      <step.icon className={`h-5 w-5 ${
                        step.status === 'current' ? 'text-fw-link' :
                        step.status === 'approved' ? 'text-fw-success' :
                        'text-fw-bodyLight'
                      }`} />
                    </div>
                    <span className="text-figma-sm text-fw-bodyLight mt-2 text-center">{step.role}</span>
                    <span className={`text-figma-sm font-medium mt-1 ${
                      step.status === 'current' ? 'text-fw-link' :
                      step.status === 'approved' ? 'text-fw-success' :
                      'text-fw-bodyLight'
                    }`}>
                      {step.status === 'current' ? 'Requesting' :
                       step.status === 'approved' ? 'Approved' :
                       'Pending'}
                    </span>
                  </div>
                  {index < approvalChain.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-fw-bodyLight mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-fw-warnLight border border-fw-warn rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-fw-warn mt-0.5 flex-shrink-0" />
              <p className="text-figma-sm text-fw-warn">
                Your manager will be notified immediately. Most requests are reviewed within 2 business hours.
                {requirement.requiresMFA && ' This permission also requires MFA verification.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!justification.trim()}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-16 h-16 bg-fw-successLight rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-fw-success" />
          </div>
          <h3 className="text-lg font-semibold text-fw-heading mb-2 tracking-[-0.03em]">Request Submitted</h3>
          <p className="text-figma-base text-fw-bodyLight">
            Your access request is being processed...
          </p>
        </div>
      )}
    </Modal>
  );
}

interface PendingAccessRequestProps {
  requestId: string;
  permission: string;
  resourceName: string;
  requestedBy: string;
  justification: string;
  requestedAt: Date;
  duration: string;
  onApprove: () => void;
  onDeny: () => void;
}

export function PendingAccessRequest({
  requestId,
  permission,
  resourceName,
  requestedBy,
  justification,
  requestedAt,
  duration,
  onApprove,
  onDeny
}: PendingAccessRequestProps) {
  return (
    <div className="bg-fw-base border border-fw-secondary rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-fw-accent rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-fw-link" />
          </div>
          <div>
            <h4 className="text-figma-base font-semibold text-fw-heading">{requestedBy}</h4>
            <p className="text-figma-sm text-fw-bodyLight">
              {requestedAt.toLocaleDateString()} at {requestedAt.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-fw-warnLight text-fw-warn text-figma-sm font-medium rounded">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-figma-sm">
          <span className="text-fw-bodyLight">Permission:</span>
          <span className="font-semibold text-fw-heading">{permission}</span>
        </div>
        <div className="flex justify-between text-figma-sm">
          <span className="text-fw-bodyLight">Resource:</span>
          <span className="font-semibold text-fw-heading">{resourceName}</span>
        </div>
        <div className="flex justify-between text-figma-sm">
          <span className="text-fw-bodyLight">Duration:</span>
          <span className="font-semibold text-fw-heading">{duration}</span>
        </div>
      </div>

      <div className="bg-fw-wash rounded p-3 mb-4">
        <p className="text-figma-sm text-fw-body font-medium mb-1">Justification:</p>
        <p className="text-figma-sm text-fw-bodyLight">{justification}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDeny}
          className="flex-1 px-3 py-2 border border-fw-error text-fw-error hover:bg-fw-errorLight rounded-lg text-figma-base font-medium transition-colors"
        >
          <XCircle className="h-4 w-4 inline mr-1" />
          Deny
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-3 py-2 bg-fw-success hover:bg-fw-success text-white rounded-lg text-figma-base font-medium transition-colors"
        >
          <CheckCircle className="h-4 w-4 inline mr-1" />
          Approve
        </button>
      </div>
    </div>
  );
}

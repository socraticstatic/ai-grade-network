import { useState } from 'react';
import { Calendar, Clock, Mail, Users, Play, Pause, Edit, Trash2, Plus, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { ScheduleForm, ScheduleFormData } from './ScheduleForm';
import { ConfirmDialog } from '../../common/ConfirmDialog';

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule: {
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  format: 'PDF' | 'CSV' | 'Excel';
  recipients: string[];
  status: 'active' | 'paused';
  lastRun: string | null;
  nextRun: string;
  totalRuns: number;
  successRate: number;
  includeConnectionIds?: string[];
}

const scheduledReports: ScheduledReport[] = [
  {
    id: '1',
    name: 'Daily Performance Summary',
    reportType: 'Connection Utilization Analysis',
    frequency: 'daily',
    schedule: { time: '08:00' },
    format: 'PDF',
    recipients: ['operations@company.com', 'netops@company.com'],
    status: 'active',
    lastRun: '2024-03-10T08:00:00Z',
    nextRun: '2024-03-11T08:00:00Z',
    totalRuns: 87,
    successRate: 98.9
  },
  {
    id: '2',
    name: 'Weekly Security Audit',
    reportType: 'NetBond Security & Access Report',
    frequency: 'weekly',
    schedule: { time: '23:00', dayOfWeek: 0 },
    format: 'PDF',
    recipients: ['security@company.com', 'compliance@company.com', 'ciso@company.com'],
    status: 'active',
    lastRun: '2024-03-03T23:00:00Z',
    nextRun: '2024-03-10T23:00:00Z',
    totalRuns: 52,
    successRate: 100
  },
  {
    id: '3',
    name: 'Monthly Billing Summary',
    reportType: 'Revenue & Financial Metrics',
    frequency: 'monthly',
    schedule: { time: '00:00', dayOfMonth: 1 },
    format: 'Excel',
    recipients: ['finance@company.com', 'billing@company.com'],
    status: 'active',
    lastRun: '2024-03-01T00:00:00Z',
    nextRun: '2024-04-01T00:00:00Z',
    totalRuns: 12,
    successRate: 100
  },
  {
    id: '4',
    name: 'Weekly Bandwidth Analysis',
    reportType: 'IPE Capacity & Provider Coverage',
    frequency: 'weekly',
    schedule: { time: '06:00', dayOfWeek: 1 },
    format: 'Excel',
    recipients: ['capacity@company.com', 'netops@company.com'],
    status: 'active',
    lastRun: '2024-03-04T06:00:00Z',
    nextRun: '2024-03-11T06:00:00Z',
    totalRuns: 48,
    successRate: 97.9
  },
  {
    id: '5',
    name: 'Quarterly SLA Report',
    reportType: 'Service Reliability & Link Status',
    frequency: 'quarterly',
    schedule: { time: '09:00', dayOfMonth: 1 },
    format: 'PDF',
    recipients: ['executives@company.com', 'operations@company.com'],
    status: 'paused',
    lastRun: '2024-01-01T09:00:00Z',
    nextRun: '2024-04-01T09:00:00Z',
    totalRuns: 4,
    successRate: 100
  }
];

const availableReportTypes = [
  { id: 'report-1', name: 'Connection Inventory & Segmentation' },
  { id: 'report-2', name: 'IPE Capacity & Data Center Analysis' },
  { id: 'report-3', name: 'Connection & Hub Utilization Analysis' },
  { id: 'report-4', name: 'Weekly Connection Trends' },
  { id: 'report-5', name: 'Service Reliability & Link Status' },
  { id: 'report-6', name: 'NetBond Security & Access Report' },
  { id: 'report-7', name: 'Customer & Connection Growth' },
  { id: 'report-8', name: 'Revenue & Financial Metrics' },
  { id: 'report-9', name: 'Cloud Provider Distribution' },
  { id: 'report-10', name: 'Regional & Geographic Analysis' },
  { id: 'report-11', name: 'MBC Utilization & Optimization' },
  { id: 'report-12', name: 'Customer Churn & Retention' },
  { id: 'report-13', name: 'Provider Performance Comparison' },
  { id: 'report-14', name: 'Link Cost & Economics Analysis' },
  { id: 'report-15', name: 'Data Center Provider Analysis' },
  { id: 'report-16', name: 'Hub Aggregation & Link Analysis' },
  { id: 'report-17', name: 'Connection Hierarchy & Resource Analysis' }
];

export function ScheduledReports() {
  const [reports, setReports] = useState(scheduledReports);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateNextRun = (schedule: ScheduleFormData): string => {
    const now = new Date();
    const [hours, minutes] = schedule.schedule.time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = schedule.schedule.dayOfWeek ?? 0;
        const currentDay = nextRun.getDay();
        let daysUntilNext = (targetDay - currentDay + 7) % 7;
        if (daysUntilNext === 0 && nextRun <= now) {
          daysUntilNext = 7;
        }
        nextRun.setDate(nextRun.getDate() + daysUntilNext);
        break;

      case 'monthly':
        const targetDayOfMonth = schedule.schedule.dayOfMonth ?? 1;
        nextRun.setDate(targetDayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;

      case 'quarterly':
        const targetQuarterDay = schedule.schedule.dayOfMonth ?? 1;
        nextRun.setDate(targetQuarterDay);
        const currentQuarter = Math.floor(nextRun.getMonth() / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        nextRun.setMonth(nextQuarterMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextQuarterMonth + 3);
        }
        break;
    }

    return nextRun.toISOString();
  };

  const handleCreateSchedule = (formData: ScheduleFormData) => {
    setIsProcessing(true);

    try {
      const newSchedule: ScheduledReport = {
        id: `schedule-${Date.now()}`,
        name: formData.name,
        reportType: formData.reportType,
        frequency: formData.frequency,
        schedule: formData.schedule,
        format: formData.format,
        recipients: formData.recipients,
        status: formData.status,
        lastRun: null,
        nextRun: calculateNextRun(formData),
        totalRuns: 0,
        successRate: 100,
        includeConnectionIds: formData.includeConnectionIds
      };

      setReports(prev => [...prev, newSchedule]);
      setShowCreateModal(false);

      window.addToast?.({
        type: 'success',
        title: 'Schedule Created',
        message: `"${formData.name}" has been scheduled successfully`,
        duration: 3000
      });
    } catch (error) {
      window.addToast?.({
        type: 'error',
        title: 'Error Creating Schedule',
        message: 'Failed to create schedule. Please try again.',
        duration: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSchedule = (formData: ScheduleFormData) => {
    if (!selectedReport) return;

    setIsProcessing(true);

    try {
      setReports(prev => prev.map(report =>
        report.id === selectedReport.id
          ? {
              ...report,
              name: formData.name,
              reportType: formData.reportType,
              frequency: formData.frequency,
              schedule: formData.schedule,
              format: formData.format,
              recipients: formData.recipients,
              status: formData.status,
              nextRun: calculateNextRun(formData),
              includeConnectionIds: formData.includeConnectionIds
            }
          : report
      ));

      setShowEditModal(false);
      setSelectedReport(null);

      window.addToast?.({
        type: 'success',
        title: 'Schedule Updated',
        message: `"${formData.name}" has been updated successfully`,
        duration: 3000
      });
    } catch (error) {
      window.addToast?.({
        type: 'error',
        title: 'Error Updating Schedule',
        message: 'Failed to update schedule. Please try again.',
        duration: 4000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleReportStatus = (id: string) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    setReports(prev => prev.map(r =>
      r.id === id
        ? { ...r, status: r.status === 'active' ? 'paused' : 'active' }
        : r
    ));

    window.addToast?.({
      type: 'success',
      title: report.status === 'active' ? 'Schedule Paused' : 'Schedule Activated',
      message: `"${report.name}" has been ${report.status === 'active' ? 'paused' : 'activated'}`,
      duration: 3000
    });
  };

  const handleDeleteConfirm = () => {
    if (!reportToDelete) return;

    try {
      setReports(prev => prev.filter(r => r.id !== reportToDelete.id));

      window.addToast?.({
        type: 'success',
        title: 'Schedule Deleted',
        message: `"${reportToDelete.name}" has been removed`,
        duration: 3000
      });
    } catch (error) {
      window.addToast?.({
        type: 'error',
        title: 'Error Deleting Schedule',
        message: 'Failed to delete schedule. Please try again.',
        duration: 4000
      });
    } finally {
      setReportToDelete(null);
    }
  };

  const getFrequencyLabel = (frequency: ScheduledReport['frequency']) => {
    switch (frequency) {
      case 'daily': return 'Every Day';
      case 'weekly': return 'Every Week';
      case 'monthly': return 'Every Month';
      case 'quarterly': return 'Every Quarter';
    }
  };

  const getScheduleDetails = (report: ScheduledReport) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let details = `${report.schedule.time}`;

    if (report.frequency === 'weekly' && report.schedule.dayOfWeek !== undefined) {
      details += ` on ${days[report.schedule.dayOfWeek]}s`;
    } else if (report.frequency === 'monthly' && report.schedule.dayOfMonth) {
      details += ` on day ${report.schedule.dayOfMonth}`;
    }

    return details;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-figma-lg font-medium text-fw-heading">Scheduled Reports</h3>
          <p className="text-figma-base font-medium text-fw-body mt-1">
            Automatically generate and deliver reports on a recurring schedule
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-fw-base border border-fw-secondary rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-body">Total Schedules</p>
              <p className="text-figma-xl font-medium text-fw-heading mt-1">
                {reports.length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-brand-blue" />
          </div>
        </div>

        <div className="bg-fw-base border border-fw-secondary rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-body">Active</p>
              <p className="text-figma-xl font-medium text-fw-success mt-1">
                {reports.filter(r => r.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-fw-success" />
          </div>
        </div>

        <div className="bg-fw-base border border-fw-secondary rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-body">Paused</p>
              <p className="text-figma-xl font-medium text-fw-body mt-1">
                {reports.filter(r => r.status === 'paused').length}
              </p>
            </div>
            <Pause className="h-8 w-8 text-fw-bodyLight" />
          </div>
        </div>

        <div className="bg-fw-base border border-fw-secondary rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-figma-base font-medium text-fw-body">Avg Success Rate</p>
              <p className="text-figma-xl font-medium text-fw-heading mt-1">
                {(reports.reduce((sum, r) => sum + r.successRate, 0) / reports.length).toFixed(1)}%
              </p>
            </div>
            <FileText className="h-8 w-8 text-fw-bodyLight" />
          </div>
        </div>
      </div>

      {/* Scheduled Reports List */}
      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`bg-fw-base border border-fw-secondary rounded-3xl p-6 transition-all ${
              report.status === 'paused' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-figma-lg font-medium text-fw-heading">
                    {report.name}
                  </h4>
                  <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${
                    report.status === 'active'
                      ? 'bg-fw-successLight text-fw-success'
                      : 'bg-fw-neutral text-fw-body'
                  }`}>
                    {report.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  <span className="px-2 py-1 text-figma-sm font-medium bg-fw-neutral text-fw-body rounded-lg">
                    {report.format}
                  </span>
                </div>
                <p className="text-figma-base font-medium text-fw-body mb-3">
                  {report.reportType}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-figma-base">
                  <div className="flex items-center text-fw-body">
                    <Clock className="h-4 w-4 mr-2 text-fw-bodyLight" />
                    <div>
                      <div className="font-medium text-fw-heading">{getFrequencyLabel(report.frequency)}</div>
                      <div className="text-figma-sm">{getScheduleDetails(report)}</div>
                    </div>
                  </div>

                  <div className="flex items-center text-fw-body">
                    <Calendar className="h-4 w-4 mr-2 text-fw-bodyLight" />
                    <div>
                      <div className="font-medium text-fw-heading">Next Run</div>
                      <div className="text-figma-sm">
                        {new Date(report.nextRun).toLocaleDateString()} at{' '}
                        {new Date(report.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-fw-body">
                    <FileText className="h-4 w-4 mr-2 text-fw-bodyLight" />
                    <div>
                      <div className="font-medium text-fw-heading">{report.totalRuns} Runs</div>
                      <div className="text-figma-sm">{report.successRate}% success rate</div>
                    </div>
                  </div>

                  <div className="flex items-center text-fw-body">
                    <Mail className="h-4 w-4 mr-2 text-fw-bodyLight" />
                    <div>
                      <div className="font-medium text-fw-heading">{report.recipients.length} Recipients</div>
                      <div className="text-figma-sm truncate">{report.recipients[0]}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => toggleReportStatus(report.id)}
                  className="p-2 text-fw-body hover:text-fw-heading hover:bg-fw-neutral rounded-lg transition-colors"
                  title={report.status === 'active' ? 'Pause schedule' : 'Activate schedule'}
                >
                  {report.status === 'active' ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setShowEditModal(true);
                  }}
                  className="p-2 text-fw-body hover:text-fw-heading hover:bg-fw-neutral rounded-lg transition-colors"
                  title="Edit schedule"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setReportToDelete(report)}
                  className="p-2 text-fw-error hover:text-fw-error hover:bg-fw-errorLight rounded-lg transition-colors"
                  title="Delete schedule"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {report.lastRun && (
              <div className="pt-3 border-t border-fw-secondary">
                <div className="flex items-center text-figma-sm text-fw-bodyLight">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-fw-success" />
                  Last run: {new Date(report.lastRun).toLocaleDateString()} at{' '}
                  {new Date(report.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12 bg-fw-wash rounded-lg">
          <Calendar className="h-12 w-12 mx-auto text-fw-bodyLight mb-4" />
          <h3 className="text-figma-lg font-medium text-fw-heading mb-2">No scheduled reports</h3>
          <p className="text-figma-base font-medium text-fw-body mb-4">
            Create a schedule to automatically generate and deliver reports
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => !isProcessing && setShowCreateModal(false)}
          title="Create Scheduled Report"
          size="large"
        >
          <div className="p-6">
            <ScheduleForm
              onSubmit={handleCreateSchedule}
              onCancel={() => setShowCreateModal(false)}
              availableReports={availableReportTypes}
            />
          </div>
        </Modal>
      )}

      {/* Edit Schedule Modal */}
      {showEditModal && selectedReport && (
        <Modal
          isOpen={showEditModal}
          onClose={() => !isProcessing && setShowEditModal(false)}
          title="Edit Scheduled Report"
          size="large"
        >
          <div className="p-6">
            <ScheduleForm
              onSubmit={handleUpdateSchedule}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedReport(null);
              }}
              availableReports={availableReportTypes}
              initialData={{
                id: selectedReport.id,
                name: selectedReport.name,
                reportType: selectedReport.reportType,
                frequency: selectedReport.frequency,
                schedule: selectedReport.schedule,
                format: selectedReport.format,
                recipients: selectedReport.recipients,
                status: selectedReport.status,
                includeConnectionIds: selectedReport.includeConnectionIds
              }}
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {reportToDelete && (
        <ConfirmDialog
          isOpen={!!reportToDelete}
          onClose={() => setReportToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Scheduled Report"
          message={`Are you sure you want to delete "${reportToDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete Schedule"
          variant="danger"
        />
      )}
    </div>
  );
}

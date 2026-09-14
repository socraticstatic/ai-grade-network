import { useState } from 'react';
import { Calendar, Clock, Mail, Users, Plus } from 'lucide-react';
import { Button } from '../../common/Button';

interface Schedule {
  id: string;
  reportName: string;
  description: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  time: string;
  recipients: string[];
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused';
}

export function ScheduleSettings() {
  const [schedules] = useState<Schedule[]>([
    {
      id: '1',
      reportName: 'Monthly Performance Report',
      description: 'Comprehensive performance analysis',
      frequency: 'Monthly',
      time: '09:00',
      recipients: ['team@example.com', 'manager@example.com'],
      lastRun: '2024-03-01T09:00:00Z',
      nextRun: '2024-04-01T09:00:00Z',
      status: 'active'
    },
    {
      id: '2',
      reportName: 'Weekly Security Summary',
      description: 'Security events and compliance status',
      frequency: 'Weekly',
      time: '23:00',
      recipients: ['security@example.com'],
      lastRun: '2024-03-10T23:00:00Z',
      nextRun: '2024-03-17T23:00:00Z',
      status: 'active'
    },
    {
      id: '3',
      reportName: 'Daily Operations Report',
      description: 'Daily operational metrics and alerts',
      frequency: 'Daily',
      time: '00:00',
      recipients: ['operations@example.com'],
      lastRun: '2024-03-10T00:00:00Z',
      nextRun: '2024-03-11T00:00:00Z',
      status: 'paused'
    }
  ]);

  const getFrequencyColor = (frequency: Schedule['frequency']) => {
    switch (frequency) {
      case 'Daily':
        return 'bg-fw-successLight text-fw-success';
      case 'Weekly':
        return 'bg-fw-accent text-fw-link';
      case 'Monthly':
        return 'bg-fw-purpleLight text-fw-purple';
      default:
        return 'bg-fw-neutral text-fw-body';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div />
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            window.addToast({
              type: 'info',
              title: 'Add Schedule',
              message: 'Schedule creation form coming soon',
              duration: 3000
            });
          }}
        >
          Add Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-fw-base rounded-2xl border border-fw-secondary p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Calendar className="h-6 w-6 text-fw-bodyLight" />
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-figma-lg font-medium text-fw-heading tracking-[-0.03em]">{schedule.reportName}</h4>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-figma-sm font-medium ${getFrequencyColor(schedule.frequency)}`}>
                      {schedule.frequency}
                    </span>
                    <span className="text-fw-secondary">|</span>
                    <div className="flex items-center space-x-1.5 text-figma-base font-medium text-fw-body tracking-[-0.03em]">
                      <Clock className="h-4 w-4 text-fw-bodyLight" />
                      <span>{schedule.time}</span>
                    </div>
                    <span className="text-fw-secondary">|</span>
                    <div className="flex items-center space-x-1.5 text-figma-base font-medium text-fw-body tracking-[-0.03em]">
                      <Calendar className="h-4 w-4 text-fw-bodyLight" />
                      <span>Next: {new Date(schedule.nextRun).toLocaleDateString()}</span>
                    </div>
                    <span className="text-fw-secondary">|</span>
                    <div className="flex items-center space-x-1.5 text-figma-base font-medium text-fw-body tracking-[-0.03em]">
                      <Mail className="h-4 w-4 text-fw-bodyLight" />
                      <span>{schedule.recipients[0]}{schedule.recipients.length > 1 ? ` +${schedule.recipients.length - 1} more` : ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  {schedule.status === 'active' ? 'Pause' : 'Activate'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, FileText, AlertCircle, Plus, X } from 'lucide-react';
import { Button } from '../../common/Button';

interface ScheduleFormProps {
  onSubmit: (schedule: ScheduleFormData) => void;
  onCancel: () => void;
  initialData?: ScheduleFormData;
  availableReports: { id: string; name: string }[];
}

export interface ScheduleFormData {
  id?: string;
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
  includeConnectionIds?: string[];
}

interface ValidationErrors {
  name?: string;
  reportType?: string;
  time?: string;
  dayOfWeek?: string;
  dayOfMonth?: string;
  recipients?: string;
  format?: string;
}

export function ScheduleForm({ onSubmit, onCancel, initialData, availableReports }: ScheduleFormProps) {
  const [formData, setFormData] = useState<ScheduleFormData>(initialData || {
    name: '',
    reportType: '',
    frequency: 'daily',
    schedule: { time: '08:00' },
    format: 'PDF',
    recipients: [],
    status: 'active'
  });

  const [recipientInput, setRecipientInput] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: keyof ScheduleFormData, value: any): string | undefined => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) {
          return 'Schedule name is required';
        }
        if (value.length < 3) {
          return 'Schedule name must be at least 3 characters';
        }
        if (value.length > 100) {
          return 'Schedule name must be less than 100 characters';
        }
        break;

      case 'reportType':
        if (!value) {
          return 'Report type is required';
        }
        break;

      case 'recipients':
        if (!formData.recipients || formData.recipients.length === 0) {
          return 'At least one recipient is required';
        }
        break;
    }
    return undefined;
  };

  const validateSchedule = (): boolean => {
    const newErrors: ValidationErrors = {};

    newErrors.name = validateField('name', formData.name);
    newErrors.reportType = validateField('reportType', formData.reportType);
    newErrors.recipients = validateField('recipients', formData.recipients);

    if (!formData.schedule.time) {
      newErrors.time = 'Time is required';
    }

    if (formData.frequency === 'weekly' && formData.schedule.dayOfWeek === undefined) {
      newErrors.dayOfWeek = 'Day of week is required for weekly schedules';
    }

    if ((formData.frequency === 'monthly' || formData.frequency === 'quarterly') && !formData.schedule.dayOfMonth) {
      newErrors.dayOfMonth = 'Day of month is required';
    } else if (formData.schedule.dayOfMonth) {
      const day = formData.schedule.dayOfMonth;
      if (day < 1 || day > 31) {
        newErrors.dayOfMonth = 'Day must be between 1 and 31';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).every(key => !newErrors[key as keyof ValidationErrors]);
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      reportType: true,
      time: true,
      recipients: true
    });

    if (validateSchedule()) {
      onSubmit(formData);
    }
  };

  const addRecipient = () => {
    const email = recipientInput.trim();

    if (!email) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, recipients: 'Invalid email address' }));
      return;
    }

    if (formData.recipients.includes(email)) {
      setErrors(prev => ({ ...prev, recipients: 'Recipient already added' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, email]
    }));
    setRecipientInput('');
    setErrors(prev => ({ ...prev, recipients: undefined }));
  };

  const removeRecipient = (email: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  useEffect(() => {
    if (touched.name) {
      const error = validateField('name', formData.name);
      setErrors(prev => ({ ...prev, name: error }));
    }
  }, [formData.name, touched.name]);

  useEffect(() => {
    if (touched.reportType) {
      const error = validateField('reportType', formData.reportType);
      setErrors(prev => ({ ...prev, reportType: error }));
    }
  }, [formData.reportType, touched.reportType]);

  useEffect(() => {
    if (touched.recipients) {
      const error = validateField('recipients', formData.recipients);
      setErrors(prev => ({ ...prev, recipients: error }));
    }
  }, [formData.recipients, touched.recipients]);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-figma-base font-medium text-fw-body mb-1">
          Schedule Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          onBlur={() => handleBlur('name')}
          className={`w-full px-3 h-9 border rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-transparent ${
            touched.name && errors.name ? 'border-fw-error' : 'border-fw-secondary'
          }`}
          placeholder="e.g., Daily Performance Summary"
        />
        {touched.name && errors.name && (
          <p className="mt-1 text-figma-base text-fw-error flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reportType" className="block text-figma-base font-medium text-fw-body mb-1">
          Report Type *
        </label>
        <select
          id="reportType"
          value={formData.reportType}
          onChange={(e) => setFormData(prev => ({ ...prev, reportType: e.target.value }))}
          onBlur={() => handleBlur('reportType')}
          className={`w-full px-3 h-9 border rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-transparent ${
            touched.reportType && errors.reportType ? 'border-fw-error' : 'border-fw-secondary'
          }`}
        >
          <option value="">Select a report type</option>
          {availableReports.map((report) => (
            <option key={report.id} value={report.name}>
              {report.name}
            </option>
          ))}
        </select>
        {touched.reportType && errors.reportType && (
          <p className="mt-1 text-figma-base text-fw-error flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.reportType}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="frequency" className="block text-figma-base font-medium text-fw-body mb-1">
            Frequency *
          </label>
          <select
            id="frequency"
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              frequency: e.target.value as ScheduleFormData['frequency'],
              schedule: { time: prev.schedule.time }
            }))}
            className="w-full px-3 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-transparent"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>

        <div>
          <label htmlFor="format" className="block text-figma-base font-medium text-fw-body mb-1">
            Format *
          </label>
          <select
            id="format"
            value={formData.format}
            onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as ScheduleFormData['format'] }))}
            className="w-full px-3 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-transparent"
          >
            <option value="PDF">PDF</option>
            <option value="Excel">Excel</option>
            <option value="CSV">CSV</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="time" className="block text-figma-base font-medium text-fw-body mb-1">
            Time *
          </label>
          <input
            type="time"
            id="time"
            value={formData.schedule.time}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              schedule: { ...prev.schedule, time: e.target.value }
            }))}
            onBlur={() => handleBlur('time')}
            className={`w-full px-3 h-9 border rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-transparent ${
              touched.time && errors.time ? 'border-fw-error' : 'border-fw-secondary'
            }`}
          />
          {touched.time && errors.time && (
            <p className="mt-1 text-figma-base text-fw-error flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.time}
            </p>
          )}
        </div>

        {formData.frequency === 'weekly' && (
          <div>
            <label htmlFor="dayOfWeek" className="block text-figma-base font-medium text-fw-body mb-1">
              Day of Week *
            </label>
            <select
              id="dayOfWeek"
              value={formData.schedule.dayOfWeek ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                schedule: { ...prev.schedule, dayOfWeek: parseInt(e.target.value) }
              }))}
              className={`w-full px-3 h-9 border rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-transparent ${
                errors.dayOfWeek ? 'border-fw-error' : 'border-fw-secondary'
              }`}
            >
              <option value="">Select a day</option>
              {days.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
            {errors.dayOfWeek && (
              <p className="mt-1 text-figma-base text-fw-error flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dayOfWeek}
              </p>
            )}
          </div>
        )}

        {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
          <div>
            <label htmlFor="dayOfMonth" className="block text-figma-base font-medium text-fw-body mb-1">
              Day of Month *
            </label>
            <input
              type="number"
              id="dayOfMonth"
              min="1"
              max="31"
              value={formData.schedule.dayOfMonth ?? ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                schedule: { ...prev.schedule, dayOfMonth: parseInt(e.target.value) }
              }))}
              className={`w-full px-3 h-9 border rounded-lg text-figma-base focus:ring-2 focus:ring-fw-active focus:border-transparent ${
                errors.dayOfMonth ? 'border-fw-error' : 'border-fw-secondary'
              }`}
              placeholder="1-31"
            />
            {errors.dayOfMonth && (
              <p className="mt-1 text-figma-base text-fw-error flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dayOfMonth}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-figma-base font-medium text-fw-body mb-1">
          Recipients *
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="email"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRecipient();
              }
            }}
            className="flex-1 px-3 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-transparent"
            placeholder="email@example.com"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addRecipient}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {formData.recipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.recipients.map((email) => (
              <div
                key={email}
                className="flex items-center space-x-2 px-3 py-1 bg-brand-lightBlue text-brand-blue rounded-full text-figma-base"
              >
                <Mail className="h-3 w-3" />
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="text-brand-blue hover:text-brand-darkBlue"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {touched.recipients && errors.recipients && (
          <p className="mt-1 text-figma-base text-fw-error flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.recipients}
          </p>
        )}
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.status === 'active'}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              status: e.target.checked ? 'active' : 'paused'
            }))}
            className="rounded border-fw-secondary text-brand-blue focus:ring-fw-active"
          />
          <span className="text-figma-base text-fw-body">Activate schedule immediately</span>
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-fw-secondary">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          {initialData ? 'Update Schedule' : 'Create Schedule'}
        </Button>
      </div>
    </form>
  );
}

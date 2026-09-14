import { useState, useEffect } from 'react';
import { Wrench, Clock, AlertTriangle, Server } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface MaintenanceSchedule {
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  affectedServices: string[];
  description: string;
}

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: MaintenanceSchedule;
  variant?: 'modal' | 'fullscreen';
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      {[
        { value: timeLeft.hours, label: 'HRS' },
        { value: timeLeft.minutes, label: 'MIN' },
        { value: timeLeft.seconds, label: 'SEC' },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-2xl font-bold text-fw-bodyLight">:</span>}
          <div className="text-center">
            <div className="bg-fw-wash rounded-lg px-4 py-3 min-w-[72px]">
              <span className="text-[32px] font-bold text-fw-heading tracking-[-0.04em] font-mono">
                {pad(unit.value)}
              </span>
            </div>
            <span className="text-figma-sm text-fw-bodyLight tracking-[-0.03em] mt-1 block">
              {unit.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaintenanceModal({ isOpen, onClose, schedule, variant = 'modal' }: MaintenanceModalProps) {
  if (!isOpen) return null;

  // Full-screen blocking variant
  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-[9999] bg-fw-wash flex items-center justify-center p-4">
        <div className="max-w-[612px] w-full text-center space-y-8">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-fw-warnLight flex items-center justify-center mx-auto">
            <Wrench className="w-10 h-10 text-fw-warn" />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-[32px] font-bold text-fw-heading tracking-[-0.04em] mb-3">
              Scheduled Maintenance in Progress
            </h1>
            <p className="text-figma-base text-fw-body tracking-[-0.03em] leading-relaxed">
              {schedule.description}
            </p>
          </div>

          {/* Countdown */}
          <div>
            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-4 uppercase">
              Estimated time remaining
            </p>
            <div className="flex justify-center">
              <CountdownTimer targetDate={schedule.endTime} />
            </div>
          </div>

          {/* Schedule Details */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6 text-left space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Date</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                  {schedule.date}
                </p>
              </div>
              <div>
                <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Duration</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                  {schedule.duration}
                </p>
              </div>
              <div>
                <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Start Time</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                  {schedule.startTime}
                </p>
              </div>
              <div>
                <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">End Time</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                  {schedule.endTime}
                </p>
              </div>
            </div>

            <div>
              <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em] mb-2">Affected Services</p>
              <div className="flex flex-wrap gap-2">
                {schedule.affectedServices.map(service => (
                  <span
                    key={service}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fw-wash text-figma-sm font-medium text-fw-heading tracking-[-0.03em]"
                  >
                    <Server className="w-3 h-3 text-fw-bodyLight" />
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">
            We apologize for the inconvenience. The platform will be available once maintenance is complete.
          </p>
        </div>
      </div>
    );
  }

  // Standard modal variant
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scheduled Maintenance" size="md">
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-fw-warnLight/30 border border-fw-warn/30">
          <AlertTriangle className="w-5 h-5 text-fw-warn shrink-0 mt-0.5" />
          <div>
            <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
              Upcoming Maintenance Window
            </p>
            <p className="text-figma-sm text-fw-body tracking-[-0.03em] mt-1">
              {schedule.description}
            </p>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-fw-wash rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-fw-bodyLight" />
              <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Date</p>
            </div>
            <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
              {schedule.date}
            </p>
          </div>
          <div className="bg-fw-wash rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-fw-bodyLight" />
              <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Duration</p>
            </div>
            <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
              {schedule.duration}
            </p>
          </div>
          <div className="bg-fw-wash rounded-xl p-4">
            <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Start Time</p>
            <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
              {schedule.startTime}
            </p>
          </div>
          <div className="bg-fw-wash rounded-xl p-4">
            <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">End Time</p>
            <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
              {schedule.endTime}
            </p>
          </div>
        </div>

        {/* Affected Services */}
        <div>
          <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em] mb-3">
            Affected Services
          </p>
          <div className="flex flex-wrap gap-2">
            {schedule.affectedServices.map(service => (
              <span
                key={service}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fw-wash border border-fw-secondary text-figma-sm font-medium text-fw-heading tracking-[-0.03em]"
              >
                <Server className="w-3.5 h-3.5 text-fw-bodyLight" />
                {service}
              </span>
            ))}
          </div>
        </div>

        {/* Action */}
        <Button variant="primary" fullWidth onClick={onClose}>
          I Understand
        </Button>
      </div>
    </Modal>
  );
}
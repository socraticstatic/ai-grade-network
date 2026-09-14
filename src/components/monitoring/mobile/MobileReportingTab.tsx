import { useState } from 'react';
import { FileText, Download, Eye, Calendar, Clock, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileReportingTabProps {
  selectedConnection: string;
  timeRange: string;
}

export function MobileReportingTab({ selectedConnection, timeRange }: MobileReportingTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    standard: true,
    scheduled: false,
    custom: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const standardReports = [
    {
      id: 'connection-summary',
      name: 'Connection Summary Report',
      description: 'Overview of all network connections',
      lastGenerated: '2024-03-10T15:30:00Z'
    },
    {
      id: 'performance-metrics',
      name: 'Performance Metrics Report',
      description: 'Detailed performance analysis',
      lastGenerated: '2024-03-10T14:45:00Z'
    },
    {
      id: 'billing-analysis',
      name: 'Billing Analysis Report',
      description: 'Comprehensive billing and cost analysis',
      lastGenerated: '2024-03-10T12:00:00Z'
    }
  ];

  const scheduledReports = [
    {
      id: '1',
      name: 'Monthly Performance Report',
      frequency: 'Monthly',
      nextRun: '2024-04-01T09:00:00Z',
      status: 'active'
    },
    {
      id: '2',
      name: 'Weekly Security Summary',
      frequency: 'Weekly',
      nextRun: '2024-03-17T23:00:00Z',
      status: 'active'
    },
    {
      id: '3',
      name: 'Daily Operations Report',
      frequency: 'Daily',
      nextRun: '2024-03-11T00:00:00Z',
      status: 'paused'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Standard Reports Section */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('standard')}
        >
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-base font-medium text-fw-heading">Standard Reports</h3>
          </div>
          {expandedSections.standard ? (
            <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
        
        <AnimatePresence>
          {expandedSections.standard && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4 space-y-3">
                {standardReports.map((report) => (
                  <div key={report.id} className="bg-fw-wash rounded-lg p-3">
                    <div className="flex flex-col">
                      <h4 className="text-figma-base font-medium text-fw-heading">{report.name}</h4>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">{report.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center text-figma-sm text-fw-bodyLight">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>
                            {new Date(report.lastGenerated).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.addToast({
                                type: 'info',
                                title: 'Preview',
                                message: `Previewing ${report.name}`,
                                duration: 3000
                              });
                            }}
                            className="p-1.5 bg-fw-neutral text-fw-body rounded-md hover:bg-fw-neutral"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.addToast({
                                type: 'success',
                                title: 'Report Generated',
                                message: `${report.name} has been generated and downloaded`,
                                duration: 3000
                              });
                            }}
                            className="p-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-darkBlue"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scheduled Reports Section */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('scheduled')}
        >
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-base font-medium text-fw-heading">Scheduled Reports</h3>
          </div>
          {expandedSections.scheduled ? (
            <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
        
        <AnimatePresence>
          {expandedSections.scheduled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4 space-y-3">
                {scheduledReports.map((schedule) => (
                  <div key={schedule.id} className="bg-fw-wash rounded-lg p-3">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <h4 className="text-figma-base font-medium text-fw-heading">{schedule.name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-figma-sm font-medium ${
                          schedule.status === 'active'
                            ? 'bg-fw-successLight text-fw-success'
                            : 'bg-fw-neutral text-fw-body'
                        }`}>
                          {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center mt-2 text-figma-sm text-fw-bodyLight">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{schedule.frequency}</span>
                      </div>
                      <div className="flex items-center mt-1 text-figma-sm text-fw-bodyLight">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          Next run: {new Date(schedule.nextRun).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Report Builder */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('custom')}
        >
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-base font-medium text-fw-heading">Custom Report Builder</h3>
          </div>
          {expandedSections.custom ? (
            <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
        
        <AnimatePresence>
          {expandedSections.custom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4">
                <div className="bg-brand-lightBlue border border-brand-blue/20 rounded-lg p-3 mb-3">
                  <p className="text-figma-base text-brand-blue">
                    Create custom reports by selecting metrics, time ranges, and visualization options.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    window.addToast({
                      type: 'info',
                      title: 'Custom Report',
                      message: 'Opening custom report builder',
                      duration: 3000
                    });
                  }}
                  className="w-full flex items-center justify-center p-3 bg-brand-blue text-white rounded-lg hover:bg-brand-darkBlue transition-colors"
                >
                  <span className="font-medium">Create Custom Report</span>
                  <ChevronRight className="h-5 w-5 ml-1" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate Report Button */}
      <div className="pt-2 pb-8">
        <button
          onClick={() => {
            window.addToast({
              type: 'success',
              title: 'Report Generated',
              message: 'Your report has been generated and is ready to download',
              duration: 3000
            });
          }}
          className="w-full flex items-center justify-center p-3 bg-brand-blue text-white rounded-lg hover:bg-brand-darkBlue transition-colors"
        >
          <Download className="h-5 w-5 mr-2" />
          <span className="font-medium">Generate Full Report</span>
        </button>
      </div>
    </div>
  );
}

// Import at the top was missing these components
import { Settings } from 'lucide-react';
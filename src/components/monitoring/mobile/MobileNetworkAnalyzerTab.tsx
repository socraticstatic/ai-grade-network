import { useState } from 'react';
import { Activity, Settings, Network, Shield, ChevronDown, ChevronUp, Play, CheckCircle, XCircle } from 'lucide-react';
import { Connection } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNetworkAnalyzerTabProps {
  selectedConnection: string;
  connections: Connection[];
}

export function MobileNetworkAnalyzerTab({ selectedConnection, connections }: MobileNetworkAnalyzerTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    performance: true,
    path: false,
    security: false,
    routing: false
  });
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'running' | 'pending'>>({
    dns: 'pending',
    port: 'pending',
    latency: 'pending',
    bandwidth: 'pending',
    security: 'pending'
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const runTest = async () => {
    setIsRunningTest(true);
    
    // Reset test results
    setTestResults({
      dns: 'pending',
      port: 'pending',
      latency: 'pending',
      bandwidth: 'pending',
      security: 'pending'
    });
    
    // Simulate test running with sequential updates
    setTestResults(prev => ({ ...prev, dns: 'running' }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResults(prev => ({ ...prev, dns: 'success' }));
    
    setTestResults(prev => ({ ...prev, port: 'running' }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResults(prev => ({ ...prev, port: 'success' }));
    
    setTestResults(prev => ({ ...prev, latency: 'running' }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResults(prev => ({ ...prev, latency: 'success' }));
    
    setTestResults(prev => ({ ...prev, bandwidth: 'running' }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResults(prev => ({ ...prev, bandwidth: 'success' }));
    
    setTestResults(prev => ({ ...prev, security: 'running' }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResults(prev => ({ ...prev, security: Math.random() > 0.7 ? 'error' : 'success' }));
    
    setIsRunningTest(false);
  };

  // Calculate performance metrics once
  const activeConnections = connections.filter(c => c.status === 'Active');
  const avgLatency = activeConnections.reduce((sum, conn) => {
    const latency = parseFloat(conn.performance?.latency || '0');
    return sum + latency;
  }, 0) / activeConnections.length || 0;

  const avgBandwidth = activeConnections.reduce((sum, conn) => {
    const utilization = conn.performance?.bandwidthUtilization || 0;
    return sum + utilization;
  }, 0) / activeConnections.length || 0;

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('performance')}
        >
          <div className="flex items-center">
            <Activity className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-base font-medium text-fw-heading">Performance Metrics</h3>
          </div>
          {expandedSections.performance ? (
            <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
        
        <AnimatePresence>
          {expandedSections.performance && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-fw-wash p-3 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="text-figma-sm text-fw-bodyLight mb-1">Avg Latency</div>
                      <div className="text-lg font-semibold text-fw-heading">{avgLatency.toFixed(1)}ms</div>
                    </div>
                  </div>
                  <div className="bg-fw-wash p-3 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="text-figma-sm text-fw-bodyLight mb-1">Bandwidth</div>
                      <div className="text-lg font-semibold text-fw-heading">{avgBandwidth.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {[
                    { protocol: 'TCP', percentage: 65, color: 'bg-brand-blue' },
                    { protocol: 'UDP', percentage: 25, color: 'bg-fw-successLight0' },
                    { protocol: 'ICMP', percentage: 8, color: 'bg-fw-wash' },
                    { protocol: 'Other', percentage: 2, color: 'bg-fw-bodyLight' }
                  ].map((item) => (
                    <div key={item.protocol}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-figma-base text-fw-body">{item.protocol}</span>
                        <span className="text-figma-base font-medium text-fw-heading">{item.percentage}%</span>
                      </div>
                      <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-300`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Path Analysis */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('path')}
        >
          <div className="flex items-center">
            <Network className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-base font-medium text-fw-heading">Path Analysis</h3>
          </div>
          {expandedSections.path ? (
            <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
        
        <AnimatePresence>
          {expandedSections.path && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {[
                    { name: 'Customer Hub', status: 'healthy', latency: '1.2ms' },
                    { name: 'VPN Tunnel', status: 'healthy', latency: '1.5ms' },
                    { name: 'Virtual Private Hub', status: 'healthy', latency: '1.5ms' }
                  ].map((hop, index) => (
                    <div key={index} className="flex items-center p-3 bg-fw-wash rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        hop.status === 'healthy' ? 'bg-fw-success' : 'bg-fw-wash0'
                      }`} />
                      <div className="ml-3 flex-1">
                        <div className="text-figma-base text-fw-heading">{hop.name}</div>
                        <div className="text-figma-sm text-fw-bodyLight">{hop.latency} latency</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security Analysis */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('security')}
        >
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-base font-medium text-fw-heading">Security Analysis</h3>
          </div>
          {expandedSections.security ? (
            <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
          )}
        </div>
        
        <AnimatePresence>
          {expandedSections.security && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {[
                    { name: 'Encryption', status: 'compliant', details: 'AES-256 encryption enabled' },
                    { name: 'Firewall Rules', status: 'warning', details: 'Some rules need review' },
                    { name: 'DDoS Protection', status: 'compliant', details: 'Protection active' }
                  ].map((item, index) => (
                    <div key={index} className="p-3 bg-fw-wash rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-figma-base font-medium text-fw-heading">{item.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-figma-sm font-medium ${
                          item.status === 'compliant'
                            ? 'bg-fw-successLight text-fw-success'
                            : 'bg-fw-wash text-fw-bodyLight'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-figma-sm text-fw-bodyLight">{item.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Connection Test */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium text-fw-heading">Connection Test</h3>
          <button
            onClick={runTest}
            disabled={isRunningTest}
            className={`
              inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-figma-base font-medium text-white
              ${isRunningTest
                ? 'bg-fw-bodyLight cursor-not-allowed'
                : 'bg-brand-blue hover:bg-brand-darkBlue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue'
              }
            `}
          >
            {isRunningTest ? (
              <RefreshCw className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunningTest ? 'Running...' : 'Run Tests'}
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(testResults).map(([test, status]) => {
            const testName = {
              dns: 'DNS Resolution',
              port: 'Port Availability',
              latency: 'Latency Check',
              bandwidth: 'Bandwidth Test',
              security: 'Security Verification'
            }[test];
            
            return (
              <div
                key={test}
                className={`
                  p-3 rounded-lg border
                  ${status === 'success' ? 'border-fw-success bg-fw-successLight' :
                    status === 'error' ? 'border-fw-error bg-fw-errorLight' :
                    status === 'running' ? 'border-brand-blue/20 bg-brand-lightBlue' :
                    'border-fw-secondary bg-fw-wash'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {status === 'success' && <CheckCircle className="h-5 w-5 text-fw-success mr-2" />}
                    {status === 'error' && <XCircle className="h-5 w-5 text-fw-error mr-2" />}
                    {status === 'running' && <RefreshCw className="h-5 w-5 text-brand-blue mr-2 animate-spin" />}
                    {status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-fw-secondary mr-2" />}
                    <span className="font-medium text-fw-heading">{testName}</span>
                  </div>
                  {status === 'success' && (
                    <span className="text-figma-sm text-fw-bodyLight">
                      {Math.floor(Math.random() * 1000)}ms
                    </span>
                  )}
                </div>
                {status === 'error' && (
                  <p className="mt-1 text-figma-sm text-fw-error ml-7">
                    Failed to complete test. Please try again.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Import at the top was missing this component
import { RefreshCw } from 'lucide-react';
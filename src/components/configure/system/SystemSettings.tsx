import { useState } from 'react';
import { Settings, Shield, Database, Clock, FileText, GitBranch, HardDrive, Cloud, Lock, Eye, AlertCircle } from 'lucide-react';
import { VerticalTabGroup } from '../../navigation/VerticalTabGroup';
import { TabItem } from '../../../types/navigation';
import { Button } from '../../common/Button';
import { PermissionBadge, PermissionLockOverlay } from '../../common/PermissionBadge';
import { useStore } from '../../../store/useStore';
import { permissionChecker } from '../../../utils/permissionChecker';

export function SystemSettings() {
  const [activeView, setActiveView] = useState<'general' | 'security' | 'backup' | 'versioning' | 'data' | 'maintenance'>('general');
  const { currentRole } = useStore();

  // Permission checks for different system areas
  const canViewSystem = permissionChecker.hasPermission(currentRole, { permission: 'view', resource: 'system' });
  const canManageSystem = permissionChecker.hasPermission(currentRole, { permission: 'manage_system', resource: 'system' });
  const canManageSecurity = permissionChecker.hasPermission(currentRole, { permission: 'manage_security', resource: 'security' });

  const [general, setGeneral] = useState({
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    language: 'en',
    theme: 'light' as 'light' | 'dark' | 'system',
    sessionTimeout: 30,
    apiRateLimit: 1000
  });

  const [security, setSecurity] = useState({
    mfaRequired: true,
    passwordMinLength: 12,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordExpiryDays: 90,
    ipWhitelistEnabled: false,
    ipWhitelist: '',
    ssoEnabled: false,
    auditLoggingEnabled: true,
    failedLoginLockout: 5
  });

  const [backup, setBackup] = useState({
    autoBackupEnabled: true,
    backupFrequency: 'daily' as 'hourly' | 'daily' | 'weekly',
    backupTime: '02:00',
    retentionDays: 90,
    encryptBackups: true,
    storageProvider: 'aws-s3' as 'aws-s3' | 'azure-blob' | 'gcp-storage' | 'local',
    storageLocation: 's3://company-backups/netbond',
    includeConfigurations: true,
    includeConnectionData: true,
    includeUserData: true,
    includeLogs: false,
    compressBackups: true
  });

  const [versioning, setVersioning] = useState({
    enableVersionControl: true,
    maxVersionsPerResource: 50,
    versionRetentionDays: 365,
    autoVersionOnChange: true,
    requireChangeComments: true,
    enableRollback: true,
    versioningScope: 'all' as 'all' | 'connections-only' | 'configs-only',
    snapshotBeforeMajorChanges: true,
    notifyOnVersionChange: false
  });

  const [data, setData] = useState({
    dataRetentionDays: 730,
    logRetentionDays: 90,
    metricsRetentionDays: 180,
    auditLogRetentionDays: 2555,
    deleteOldDataAutomatically: true,
    archiveBeforeDelete: true,
    archiveLocation: 's3://company-archives/netbond',
    gdprCompliant: true,
    anonymizeOldData: false
  });

  const [maintenance, setMaintenance] = useState({
    maintenanceDay: 'Sunday',
    maintenanceTime: '00:00',
    maintenanceDuration: 120,
    autoUpdate: true,
    updateChannel: 'stable' as 'stable' | 'beta',
    notifyUsersBeforeMaintenance: true,
    notifyHoursBefore: 24
  });

  const handleSaveSettings = () => {
    window.addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'System configuration updated successfully',
      duration: 3000
    });
  };

  const tabs: TabItem[] = [
    { id: 'general', label: 'General', icon: <Settings className="h-5 w-5 mr-2" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-5 w-5 mr-2" /> },
    { id: 'backup', label: 'Backup & Recovery', icon: <Database className="h-5 w-5 mr-2" /> },
    { id: 'versioning', label: 'Versioning', icon: <GitBranch className="h-5 w-5 mr-2" /> },
    { id: 'data', label: 'Data Retention', icon: <HardDrive className="h-5 w-5 mr-2" /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Clock className="h-5 w-5 mr-2" /> }
  ];

  const getTabPermissionBadge = (tab: string) => {
    if (tab === 'security' && !canManageSecurity.allowed) {
      return <Lock className="h-4 w-4 text-fw-error ml-2" />;
    }
    if (['backup', 'versioning', 'data', 'maintenance'].includes(tab) && !canManageSystem.allowed) {
      return <Lock className="h-4 w-4 text-fw-warn ml-2" />;
    }
    return null;
  };

  return (
    <div className="p-6">
      {/* Permission Status Banner */}
      {currentRole !== 'super-admin' && (
        <div className="mb-6 bg-fw-accent border border-fw-active rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-fw-link mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-1">System Settings Access</h3>
              <div className="space-y-1 text-figma-sm font-medium text-fw-body tracking-[-0.03em]">
                <div className="flex items-center gap-2">
                  <span>General Settings:</span>
                  {canManageSystem.allowed ? (
                    <span className="text-fw-success font-medium">Full Access</span>
                  ) : (
                    <span className="text-fw-warn font-medium">View Only</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>Security Settings:</span>
                  {canManageSecurity.allowed ? (
                    <span className="text-fw-success font-medium">Full Access</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-fw-error" />
                      <span className="text-fw-error font-medium">Restricted (Security Admin Required)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Banner */}
      <div className="mb-6 bg-gradient-to-r from-fw-wash to-fw-base border border-fw-secondary rounded-xl p-4">
        <div className="flex items-start">
          <Settings className="h-6 w-6 text-fw-link mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">System Configuration</h3>
            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">
              Configure global system settings including security, backup policies, versioning, data retention, and maintenance windows.
            </p>
          </div>
        </div>
      </div>

      <div className="flex">
        <VerticalTabGroup
          tabs={tabs}
          activeTab={activeView}
          onChange={(tab) => setActiveView(tab as typeof activeView)}
        />

        <div className="flex-1 pl-6">
          {/* General Settings */}
          {activeView === 'general' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">General System Settings</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure basic system preferences that apply across the entire platform.
                </p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">System Timezone</label>
                      <select
                        value={general.timezone}
                        onChange={(e) => setGeneral({...general, timezone: e.target.value})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      </select>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Default timezone for all system operations</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Date Format</label>
                      <select
                        value={general.dateFormat}
                        onChange={(e) => setGeneral({...general, dateFormat: e.target.value})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2025-11-03)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (11/03/2025)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (03/11/2025)</option>
                      </select>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Date display format</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={general.sessionTimeout}
                        onChange={(e) => setGeneral({...general, sessionTimeout: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Inactive session timeout</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">API Rate Limit (requests/min)</label>
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        value={general.apiRateLimit}
                        onChange={(e) => setGeneral({...general, apiRateLimit: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Maximum API requests per minute per user</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default Theme</label>
                      <select
                        value={general.theme}
                        onChange={(e) => setGeneral({...general, theme: e.target.value as typeof general.theme})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Default UI theme for new users</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Language</label>
                      <select
                        value={general.language}
                        onChange={(e) => setGeneral({...general, language: e.target.value})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Default system language</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save General Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeView === 'security' && (
            <div className="space-y-6">
              {!canManageSecurity.allowed ? (
                <PermissionLockOverlay
                  requirement={{ permission: 'manage_security', resource: 'security', role: 'super-admin' }}
                  reason="Security settings require Security Admin or Super Admin role"
                  onRequestAccess={() => {
                    window.addToast({
                      type: 'info',
                      title: 'Access Request',
                      message: 'Contact your Security Administrator to request access to security settings',
                      duration: 5000
                    });
                  }}
                >
                  <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                    <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Security Configuration</h3>
                    <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                      Configure system-wide security policies and authentication requirements.
                    </p>
                    <div className="space-y-4">
                      <div className="h-20 bg-fw-neutral rounded animate-pulse"></div>
                      <div className="h-20 bg-fw-neutral rounded animate-pulse"></div>
                      <div className="h-20 bg-fw-neutral rounded animate-pulse"></div>
                    </div>
                  </div>
                </PermissionLockOverlay>
              ) : (
                <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Security Configuration</h3>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">
                        Configure system-wide security policies and authentication requirements.
                      </p>
                    </div>
                    <PermissionBadge requirement={{ permission: 'manage_security', resource: 'security' }} />
                  </div>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={security.mfaRequired}
                      onChange={(e) => setSecurity({...security, mfaRequired: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Multi-Factor Authentication</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">All users must enable MFA to access the system</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={security.ssoEnabled}
                      onChange={(e) => setSecurity({...security, ssoEnabled: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Single Sign-On (SSO)</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Allow authentication via SAML/OAuth providers</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={security.auditLoggingEnabled}
                      onChange={(e) => setSecurity({...security, auditLoggingEnabled: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Audit Logging</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Log all user actions and system changes for compliance</p>
                    </div>
                  </label>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-4">Password Policy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Minimum Password Length</label>
                        <input
                          type="number"
                          min="8"
                          max="32"
                          value={security.passwordMinLength}
                          onChange={(e) => setSecurity({...security, passwordMinLength: parseInt(e.target.value)})}
                          className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                      </div>

                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Password Expiry (days)</label>
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={security.passwordExpiryDays}
                          onChange={(e) => setSecurity({...security, passwordExpiryDays: parseInt(e.target.value)})}
                          className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">0 = never expires</p>
                      </div>

                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Failed Login Lockout</label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          value={security.failedLoginLockout}
                          onChange={(e) => setSecurity({...security, failedLoginLockout: parseInt(e.target.value)})}
                          className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Lock account after this many failed attempts</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={security.passwordRequireSpecialChars}
                          onChange={(e) => setSecurity({...security, passwordRequireSpecialChars: e.target.checked})}
                          className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require special characters</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={security.passwordRequireNumbers}
                          onChange={(e) => setSecurity({...security, passwordRequireNumbers: e.target.checked})}
                          className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require numbers</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-4">IP Whitelisting</h4>
                    <label className="flex items-start space-x-3 mb-3">
                      <input
                        type="checkbox"
                        checked={security.ipWhitelistEnabled}
                        onChange={(e) => setSecurity({...security, ipWhitelistEnabled: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable IP Whitelisting</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Only allow access from approved IP addresses</p>
                      </div>
                    </label>

                    {security.ipWhitelistEnabled && (
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Whitelisted IPs (one per line)</label>
                        <textarea
                          value={security.ipWhitelist}
                          onChange={(e) => setSecurity({...security, ipWhitelist: e.target.value})}
                          rows={5}
                          placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                          className="w-full px-4 h-10 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-link focus:border-fw-link font-mono text-figma-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                  <div className="mt-6 flex justify-end">
                    <Button variant="primary" onClick={handleSaveSettings}>
                      Save Security Settings
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backup & Recovery */}
          {activeView === 'backup' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Backup & Recovery Configuration</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure automated backup policies, storage locations, and data recovery options.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={backup.autoBackupEnabled}
                      onChange={(e) => setBackup({...backup, autoBackupEnabled: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Automatic Backups</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Automatically backup system data on a schedule</p>
                    </div>
                  </label>

                  {backup.autoBackupEnabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Backup Frequency</label>
                          <select
                            value={backup.backupFrequency}
                            onChange={(e) => setBackup({...backup, backupFrequency: e.target.value as typeof backup.backupFrequency})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Backup Time</label>
                          <input
                            type="time"
                            value={backup.backupTime}
                            onChange={(e) => setBackup({...backup, backupTime: e.target.value})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          />
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Time to run daily/weekly backups</p>
                        </div>

                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Retention Period (days)</label>
                          <input
                            type="number"
                            min="7"
                            max="3650"
                            value={backup.retentionDays}
                            onChange={(e) => setBackup({...backup, retentionDays: parseInt(e.target.value)})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          />
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">How long to keep backup files</p>
                        </div>

                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Storage Provider</label>
                          <select
                            value={backup.storageProvider}
                            onChange={(e) => setBackup({...backup, storageProvider: e.target.value as typeof backup.storageProvider})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          >
                            <option value="aws-s3">AWS S3</option>
                            <option value="azure-blob">Azure Blob Storage</option>
                            <option value="gcp-storage">Google Cloud Storage</option>
                            <option value="local">Local Storage</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Storage Location</label>
                        <input
                          type="text"
                          value={backup.storageLocation}
                          onChange={(e) => setBackup({...backup, storageLocation: e.target.value})}
                          placeholder="s3://bucket-name/path or /local/path"
                          className="w-full px-4 h-10 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-link focus:border-fw-link font-mono text-figma-sm"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Full path to backup storage location</p>
                      </div>

                      <div className="pt-4 border-t border-fw-secondary">
                        <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Backup Content</h4>
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={backup.includeConfigurations}
                              onChange={(e) => setBackup({...backup, includeConfigurations: e.target.checked})}
                              className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                            />
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Include system configurations</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={backup.includeConnectionData}
                              onChange={(e) => setBackup({...backup, includeConnectionData: e.target.checked})}
                              className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                            />
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Include connection data</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={backup.includeUserData}
                              onChange={(e) => setBackup({...backup, includeUserData: e.target.checked})}
                              className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                            />
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Include user data</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={backup.includeLogs}
                              onChange={(e) => setBackup({...backup, includeLogs: e.target.checked})}
                              className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                            />
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Include system logs</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-fw-secondary space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={backup.encryptBackups}
                            onChange={(e) => setBackup({...backup, encryptBackups: e.target.checked})}
                            className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Encrypt backup files (AES-256)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={backup.compressBackups}
                            onChange={(e) => setBackup({...backup, compressBackups: e.target.checked})}
                            className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Compress backup files</span>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-fw-secondary">
                        <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Backup Actions</h4>
                        <div className="flex gap-3">
                          <Button variant="outline">Run Backup Now</Button>
                          <Button variant="outline">View Backup History</Button>
                          <Button variant="outline">Test Restore</Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Backup Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Versioning */}
          {activeView === 'versioning' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Version Control Configuration</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure automatic versioning of configurations, connections, and system changes. Track modifications and enable rollback capabilities.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={versioning.enableVersionControl}
                      onChange={(e) => setVersioning({...versioning, enableVersionControl: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Version Control</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Automatically track all configuration changes with version history</p>
                    </div>
                  </label>

                  {versioning.enableVersionControl && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Versioning Scope</label>
                          <select
                            value={versioning.versioningScope}
                            onChange={(e) => setVersioning({...versioning, versioningScope: e.target.value as typeof versioning.versioningScope})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          >
                            <option value="all">All Resources</option>
                            <option value="connections-only">Connections Only</option>
                            <option value="configs-only">Configurations Only</option>
                          </select>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">What to version automatically</p>
                        </div>

                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Max Versions Per Resource</label>
                          <input
                            type="number"
                            min="10"
                            max="500"
                            value={versioning.maxVersionsPerResource}
                            onChange={(e) => setVersioning({...versioning, maxVersionsPerResource: parseInt(e.target.value)})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          />
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Maximum version history to keep</p>
                        </div>

                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Version Retention (days)</label>
                          <input
                            type="number"
                            min="30"
                            max="3650"
                            value={versioning.versionRetentionDays}
                            onChange={(e) => setVersioning({...versioning, versionRetentionDays: parseInt(e.target.value)})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          />
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">How long to keep version history</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-fw-secondary space-y-3">
                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={versioning.autoVersionOnChange}
                            onChange={(e) => setVersioning({...versioning, autoVersionOnChange: e.target.checked})}
                            className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <div>
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Auto-Version on Change</span>
                            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Create new version automatically whenever a resource is modified</p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={versioning.requireChangeComments}
                            onChange={(e) => setVersioning({...versioning, requireChangeComments: e.target.checked})}
                            className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <div>
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Change Comments</span>
                            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Users must provide a comment describing their changes</p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={versioning.enableRollback}
                            onChange={(e) => setVersioning({...versioning, enableRollback: e.target.checked})}
                            className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <div>
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Rollback</span>
                            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Allow reverting to previous versions of configurations</p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={versioning.snapshotBeforeMajorChanges}
                            onChange={(e) => setVersioning({...versioning, snapshotBeforeMajorChanges: e.target.checked})}
                            className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <div>
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Snapshot Before Major Changes</span>
                            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Create full system snapshot before major updates or migrations</p>
                          </div>
                        </label>

                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={versioning.notifyOnVersionChange}
                            onChange={(e) => setVersioning({...versioning, notifyOnVersionChange: e.target.checked})}
                            className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                          />
                          <div>
                            <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Notify on Version Changes</span>
                            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Send notifications when resources are versioned</p>
                          </div>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-fw-secondary">
                        <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Version Management</h4>
                        <div className="bg-fw-wash p-4 rounded-lg space-y-2 text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">
                          <p>• Each change creates a new version with timestamp and user information</p>
                          <p>• Version diffs show exactly what changed between versions</p>
                          <p>• Rollback restores the resource to its previous state</p>
                          <p>• Major version snapshots include full system state for disaster recovery</p>
                          <p>• Version pruning removes old versions based on retention policy</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Versioning Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Data Retention */}
          {activeView === 'data' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Data Retention Policies</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure how long different types of data are retained in the system.
                </p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Data Retention (days)</label>
                      <input
                        type="number"
                        min="30"
                        max="3650"
                        value={data.dataRetentionDays}
                        onChange={(e) => setData({...data, dataRetentionDays: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">General operational data retention</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Log Retention (days)</label>
                      <input
                        type="number"
                        min="7"
                        max="365"
                        value={data.logRetentionDays}
                        onChange={(e) => setData({...data, logRetentionDays: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">System and application logs</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Metrics Retention (days)</label>
                      <input
                        type="number"
                        min="30"
                        max="1095"
                        value={data.metricsRetentionDays}
                        onChange={(e) => setData({...data, metricsRetentionDays: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Performance and monitoring metrics</p>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Audit Log Retention (days)</label>
                      <input
                        type="number"
                        min="365"
                        max="3650"
                        value={data.auditLogRetentionDays}
                        onChange={(e) => setData({...data, auditLogRetentionDays: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Compliance and audit logs (min 1 year)</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={data.deleteOldDataAutomatically}
                        onChange={(e) => setData({...data, deleteOldDataAutomatically: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Automatically Delete Old Data</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Remove data that exceeds retention period</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={data.archiveBeforeDelete}
                        onChange={(e) => setData({...data, archiveBeforeDelete: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Archive Before Delete</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Move data to archive storage before permanent deletion</p>
                      </div>
                    </label>

                    {data.archiveBeforeDelete && (
                      <div className="ml-7">
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Archive Location</label>
                        <input
                          type="text"
                          value={data.archiveLocation}
                          onChange={(e) => setData({...data, archiveLocation: e.target.value})}
                          placeholder="s3://bucket-name/archives or /local/archives"
                          className="w-full px-4 h-10 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-link focus:border-fw-link font-mono text-figma-sm"
                        />
                      </div>
                    )}

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={data.gdprCompliant}
                        onChange={(e) => setData({...data, gdprCompliant: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">GDPR Compliant Mode</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Enable data subject rights and privacy controls</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={data.anonymizeOldData}
                        onChange={(e) => setData({...data, anonymizeOldData: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Anonymize Old Data</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Remove PII from aged data for privacy compliance</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Retention Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance */}
          {activeView === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Maintenance Configuration</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure maintenance windows and system update policies.
                </p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Maintenance Day</label>
                      <select
                        value={maintenance.maintenanceDay}
                        onChange={(e) => setMaintenance({...maintenance, maintenanceDay: e.target.value})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="Sunday">Sunday</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Maintenance Time</label>
                      <input
                        type="time"
                        value={maintenance.maintenanceTime}
                        onChange={(e) => setMaintenance({...maintenance, maintenanceTime: e.target.value})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Maintenance Duration (minutes)</label>
                      <input
                        type="number"
                        min="30"
                        max="480"
                        value={maintenance.maintenanceDuration}
                        onChange={(e) => setMaintenance({...maintenance, maintenanceDuration: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Update Channel</label>
                      <select
                        value={maintenance.updateChannel}
                        onChange={(e) => setMaintenance({...maintenance, updateChannel: e.target.value as typeof maintenance.updateChannel})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="stable">Stable (Recommended)</option>
                        <option value="beta">Beta (Early Access)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={maintenance.autoUpdate}
                        onChange={(e) => setMaintenance({...maintenance, autoUpdate: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Automatic Updates</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Apply system updates automatically during maintenance window</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={maintenance.notifyUsersBeforeMaintenance}
                        onChange={(e) => setMaintenance({...maintenance, notifyUsersBeforeMaintenance: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Notify Users Before Maintenance</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Send advance notification about upcoming maintenance</p>
                      </div>
                    </label>

                    {maintenance.notifyUsersBeforeMaintenance && (
                      <div className="ml-7">
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Notification Lead Time (hours)</label>
                        <input
                          type="number"
                          min="1"
                          max="168"
                          value={maintenance.notifyHoursBefore}
                          onChange={(e) => setMaintenance({...maintenance, notifyHoursBefore: parseInt(e.target.value)})}
                          className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Maintenance Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

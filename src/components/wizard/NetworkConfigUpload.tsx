import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, X, Eye } from 'lucide-react';
import { CloudProvider } from '../../types/connection';

interface ParsedConfig {
  connections?: number;
  bandwidth?: string;
  regions?: string[];
  vpcs?: string[];
  subscriptions?: string[];
  [key: string]: any;
}

interface UploadedConfig {
  fileName: string;
  parsed: ParsedConfig;
}

interface NetworkConfigUploadProps {
  providers: CloudProvider[];
  uploadedConfigs: Record<string, UploadedConfig>;
  onConfigUploaded: (providerId: string, config: UploadedConfig) => void;
  onConfigRemoved: (providerId: string) => void;
}

function parseProviderConfig(data: any, providerId: string): ParsedConfig {
  const parsed: ParsedConfig = {};
  try {
    switch (providerId) {
      case 'AWS':
        parsed.regions = data.Vpcs?.map((vpc: any) => vpc.Region) || [];
        parsed.vpcs = data.Vpcs?.map((vpc: any) => vpc.VpcId) || [];
        parsed.connections = data.DirectConnectConnections?.length || 0;
        parsed.bandwidth = data.DirectConnectConnections?.[0]?.Bandwidth || 'Unknown';
        break;
      case 'Azure':
        parsed.subscriptions = data.subscriptions?.map((sub: any) => sub.displayName) || [];
        parsed.regions = data.locations?.map((loc: any) => loc.displayName) || [];
        parsed.connections = data.expressRouteCircuits?.length || 0;
        parsed.bandwidth = data.expressRouteCircuits?.[0]?.properties?.bandwidthInMbps || 'Unknown';
        break;
      case 'Google':
        parsed.regions = data.regions?.map((r: any) => r.name) || [];
        parsed.connections = data.interconnectConnections?.length || 0;
        parsed.bandwidth = data.interconnectConnections?.[0]?.bandwidth || 'Unknown';
        parsed.vpcs = data.networks?.map((net: any) => net.name) || [];
        break;
      default:
        if (data.connections) parsed.connections = data.connections.length || data.connections;
        if (data.regions) parsed.regions = data.regions;
        if (data.bandwidth) parsed.bandwidth = data.bandwidth;
        break;
    }
  } catch {
    // Graceful fallback for unparseable configs
  }
  return parsed;
}

export function NetworkConfigUpload({ providers, uploadedConfigs, onConfigUploaded, onConfigRemoved }: NetworkConfigUploadProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewingConfig, setViewingConfig] = useState<string | null>(null);

  const handleFile = useCallback((providerId: string, file: File) => {
    setProcessing(providerId);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const parsed = parseProviderConfig(data, providerId);
        onConfigUploaded(providerId, { fileName: file.name, parsed });
      } catch {
        window.addToast?.({
          type: 'error',
          title: 'Invalid JSON',
          message: `Could not parse ${file.name}. Ensure it is valid JSON.`,
          duration: 4000,
        });
      }
      setProcessing(null);
    };
    reader.readAsText(file);
  }, [onConfigUploaded]);

  const handleDrop = useCallback((providerId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(providerId, file);
  }, [handleFile]);

  if (providers.length === 0) return null;

  return (
    <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-fw-accent rounded-lg">
          <Upload className="h-5 w-5 text-brand-blue" />
        </div>
        <div>
          <h4 className="text-figma-lg font-semibold text-fw-heading tracking-[-0.03em]">Network Configuration Upload</h4>
          <p className="text-figma-sm text-fw-bodyLight">Upload provider configuration files for auto-detection</p>
        </div>
      </div>

      <div className="space-y-4">
        {providers.map((providerId) => {
          const config = uploadedConfigs[providerId];
          const isProcessing = processing === providerId;
          const isDragTarget = dragOver === providerId;

          if (config) {
            return (
              <div key={providerId} className="bg-fw-successLight border border-fw-success/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-fw-success" />
                    <span className="text-figma-base font-semibold text-fw-heading">{providerId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingConfig(viewingConfig === providerId ? null : providerId)}
                      className="text-figma-xs text-fw-link hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5 inline mr-1" />
                      {viewingConfig === providerId ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => onConfigRemoved(providerId)}
                      className="text-figma-xs text-fw-error hover:underline"
                    >
                      <X className="h-3.5 w-3.5 inline mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-figma-sm text-fw-body">{config.fileName}</p>
                {config.parsed.connections !== undefined && (
                  <div className="flex gap-4 mt-2 text-figma-xs text-fw-bodyLight">
                    <span>{config.parsed.connections} connections</span>
                    {config.parsed.bandwidth && <span>{config.parsed.bandwidth} bandwidth</span>}
                    {config.parsed.regions && <span>{config.parsed.regions.length} regions</span>}
                  </div>
                )}
                {viewingConfig === providerId && (
                  <pre className="mt-3 p-3 bg-fw-base rounded-lg text-figma-xs font-mono text-fw-body overflow-auto max-h-40 border border-fw-secondary">
                    {JSON.stringify(config.parsed, null, 2)}
                  </pre>
                )}
              </div>
            );
          }

          return (
            <div
              key={providerId}
              onDrop={(e) => handleDrop(providerId, e)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(providerId); }}
              onDragLeave={() => setDragOver(null)}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragTarget ? 'border-fw-link bg-fw-accent' : 'border-fw-secondary hover:border-fw-bodyLight'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-fw-link border-t-transparent rounded-full animate-spin" />
                  <span className="text-figma-sm text-fw-bodyLight">Processing {providerId} configuration...</span>
                </div>
              ) : (
                <>
                  <FileText className="h-8 w-8 text-fw-bodyLight mx-auto mb-2" />
                  <p className="text-figma-sm font-medium text-fw-heading mb-1">{providerId} Configuration</p>
                  <p className="text-figma-xs text-fw-bodyLight mb-3">Drag & drop JSON file or click to browse</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-fw-wash text-fw-link rounded-lg hover:bg-fw-accent cursor-pointer text-figma-sm font-medium">
                    <Upload className="h-4 w-4" />
                    Browse Files
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(providerId, file);
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

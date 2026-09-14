import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Globe, Server, Cloud, X, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Shield } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { PhaseIndicator } from './PhaseIndicator';
import { LmccPasteKeyFlow, PasteStage } from './screens/LmccPasteKeyFlow';
import { CloudProvider, ConnectionType, BandwidthOption, LocationOption, ConnectionConfig, ConnectionStatus } from '../../types/connection';
import { deriveC2CFields } from '../../utils/wizardConnection';
import { getConnectionLegs } from '../../utils/connectionLegs';
import { ProviderSelection } from './screens/ProviderSelection';
import { ConnectionTypeSelection } from './screens/ConnectionTypeSelection';
import { getAvailableProviders } from '../../data/providerConnectionTypes';
import { ConnectionConfiguration } from './screens/ConnectionConfiguration';
import { AdvancedSettings } from './screens/AdvancedSettings';
import { ReviewConfiguration } from './screens/ReviewConfiguration';
import { ResiliencySelection, ResiliencyLevel } from './screens/ResiliencySelection';
import { getMinLocations } from '../../data/providerResiliency';
import { BandwidthConfiguration } from './screens/BandwidthConfiguration';
import { BillingPreview } from './BillingPreview';
import { AwsAccountIdStep } from './screens/AwsAccountIdStep';
import { AwsMaxLocationStep } from './screens/AwsMaxLocationStep';
import { isValidAwsAccountId, getMetroById, CURRENT_PHASE } from '../../data/lmccService';
import { keyExpiryInfo } from '../../utils/lmccDisplay';
import { ModeSelection } from './modes';
import { useStore } from '../../store/useStore';
import { Button } from '../common/Button';
import { VNF, VNFSize, VNF_SIZE_TIERS } from '../../types/vnf';
import { VNF_TEMPLATES } from '../connection/modals/VNFModal';
import { getVNFTypeIcon } from '../../utils/vnfTypes';
import { WizardTopology } from './WizardTopology';
// Toggle removed - Niva panel has its own minimize control
import { NetworkAI } from './NetworkAI';
import { Connection, NetworkNode, NetworkEdge } from '../../types';
import { AsyncBoundary } from '../common/AsyncBoundary';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { tryCatch, handleApiError } from '../../utils/errorHandling';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Lazy load the NetworkDesigner component with improved error handling and loading states
const LazyNetworkDesigner = lazy(() => 
  import('../network-designer/LazyNetworkDesigner')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load NetworkDesigner component:', error);
      // Re-throw to be caught by error boundary
      throw error;
    })
);

// Hubs are never chosen or named in the wizard — they derive automatically from the
// connection's location and route domain (GA ruling 2026-07-10).
type StepKey = 'type' | 'provider' | 'resiliency' | 'locations' | 'bandwidth' | 'advanced' | 'vnf' | 'review';
const STEP_KEYS: StepKey[] = ['type', 'provider', 'resiliency', 'locations', 'bandwidth', 'advanced', 'vnf', 'review'];
const STEP_META: Record<StepKey, { title: string; description: string }> = {
  type:       { title: 'Connection Type', description: 'Select how you want to connect' },
  provider:   { title: 'Choose Provider',  description: 'Select your cloud service provider' },
  resiliency: { title: 'Resiliency',       description: 'Choose your resiliency level' },
  locations:  { title: 'Locations',        description: 'Select datacenter locations' },
  bandwidth:  { title: 'Bandwidth',        description: 'Configure bandwidth per connection' },
  advanced:   { title: 'Advanced Settings',description: 'Configure network settings' },
  vnf:        { title: 'Network Function', description: 'Optionally attach a VNF' },
  review:     { title: 'Review',           description: 'Review your selections' },
};
const STEPS = STEP_KEYS.map(k => STEP_META[k]);

type WizardMode = 'step-by-step' | 'visual';

interface ConnectionWizardProps {
  onComplete: (config: ConnectionConfig) => void;
  onCancel: () => void;
  initialConnection?: Connection;
  editMode?: boolean;
}

interface BillingChoice {
  planId: string;
  term: string;
  addons: string[];
}

export function ConnectionWizard({ onComplete, onCancel, initialConnection, editMode = false }: ConnectionWizardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const addConnection = useStore(state => state.addConnection);
  const updateConnection = useStore(state => state.updateConnection);
  const addVNF = useStore(state => state.addVNF);
  const connections = useStore(state => state.connections);
  const hubs = useStore(state => state.hubs);
  // Optional VNF chosen in the guided setup, persisted to the store on create.
  // VNFs are opt-in: the step stays compact until the user chooses to add one.
  const [addVnf, setAddVnf] = useState(false);
  const [selectedVnfTemplateId, setSelectedVnfTemplateId] = useState<string>('');
  const [selectedVnfSize, setSelectedVnfSize] = useState<VNFSize>('m');
  // Where the VNF sits: 'inline' (in the connection path, hub → VNF → cloud) or 'hub' (shared).
  const [selectedVnfPlacement, setSelectedVnfPlacement] = useState<'inline' | 'hub'>('inline');
  // AWS Max: the last-mile ActivationKey handoff shown as the guided-setup completion.
  const [lastMile, setLastMile] = useState<{ connId: string; activationKey: string } | null>(null);
  const [lastMileCopied, setLastMileCopied] = useState(false);
  
  // Check for state passed via router navigation
  const locationState = location.state as any;

  // Check if there's a template from the application solution zone
  const template = locationState?.template;

  // Show mode selection screen on Create, skip to visual on edit
  const initialMode: WizardMode | null = editMode || (locationState?.editMode) ? 'visual' :
                     locationState?.mode ? locationState.mode as WizardMode :
                     template ? 'step-by-step' :
                     null;

  // Get initialConnection from props or location state
  const connectionToEdit = initialConnection || locationState?.initialConnection;
  const isEditMode = editMode || locationState?.editMode || false;

  // Initialize with mode from navigation state or props
  const [mode, setMode] = useState<WizardMode | null>(initialMode);
  const [step, setStep] = useState(
    locationState?.initialStep ??
      (locationState?.selectedConnectionType === 'AWS Last Mile'
        // AWS Last Mile preset (Create dropdown / Marketplace): provider and resiliency
        // are fixed by the product — start at the metro choice.
        ? STEP_KEYS.indexOf('locations')
        : template ? STEP_KEYS.indexOf('resiliency') : 0)
  );
  const [connectionName, setConnectionName] = useState(() => {
    if (locationState?.cloudRouterName || locationState?.connectionName) {
      return locationState.connectionName ?? locationState.cloudRouterName;
    }
    if (
      locationState?.selectedProviders?.includes('AWS') &&
      locationState?.resiliencyLevel === 'maximum'
    ) {
      const metroId = (locationState?.selectedLocations?.AWS || [])[0];
      const metro = metroId ? getMetroById(metroId) : null;
      const city = metro?.name?.split(',')[0] || 'San Jose';
      return `NetBond Max - ${city}`;
    }
    return '';
  });
  const [awsAccountId, setAwsAccountId] = useState(locationState?.awsAccountId ?? '');
  const [config, setConfig] = useState<Partial<ConnectionConfig>>(
    template ? {
      provider: template.provider as CloudProvider,
      connectionType: template.connectionType as ConnectionType,
      bandwidth: template.bandwidth as BandwidthOption,
      name: template.name
    } : {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(true);

  // Persistent state for all selections
  const [selectedProviders, setSelectedProviders] = useState<CloudProvider[]>(locationState?.selectedProviders || []);

  const toggleProvider = (provider: CloudProvider) => {
    setSelectedProviders(prev =>
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  // Legacy single-provider accessor for downstream components that haven't been updated yet
  const selectedProvider = selectedProviders[0] as CloudProvider | undefined;
  // Standard is the DEFAULT tier (GA fork rule); Maximum enters the LMCC experience.
  const [resiliencyLevel, setResiliencyLevel] = useState<ResiliencyLevel>(locationState?.resiliencyLevel || 'standard');
  const [selectedLocations, setSelectedLocations] = useState<Record<string, string[]>>(locationState?.selectedLocations || {});

  const [bandwidthSettings, setBandwidthSettings] = useState<Record<string, number>>(locationState?.bandwidthSettings || {});

  const updateBandwidth = (key: string, value: number) => {
    setBandwidthSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleLocation = (providerId: string, location: string) => {
    setSelectedLocations(prev => {
      const current = prev[providerId] || [];
      const updated = current.includes(location)
        ? current.filter(l => l !== location)
        : [...current, location];
      return { ...prev, [providerId]: updated };
    });
  };
  const [selectedType, setSelectedType] = useState<ConnectionType>(locationState?.selectedConnectionType as ConnectionType);
  const [selectedBandwidth, setSelectedBandwidth] = useState<BandwidthOption>();

  // AWS Max = AWS + Maximum Resiliency + Internet to Cloud
  const isAwsMax = selectedType === 'AWS Last Mile';
  const isPasteKey = locationState?.mode === 'paste-key';
  const [pasteStage, setPasteStage] = useState<PasteStage>('paste');
  const [pasteKeyValid, setPasteKeyValid] = useState(false);
  const [pasteHasInput, setPasteHasInput] = useState(false);
  const pasteActionRef = useRef<{ advance: () => void; back: () => void } | null>(null);

  // GA flag: navigation state can override, otherwise follow the product phase
  const isGa = locationState?.isGa ?? (CURRENT_PHASE === 'ga');

  // Dynamic steps: advanced step title changes for AWS Max; GA gets a different label
  const advancedIdx = STEP_KEYS.indexOf('advanced');
  const EFFECTIVE_STEPS = STEPS.map((s, i) =>
    i === advancedIdx && isAwsMax
      ? isGa
        ? { ...s, title: 'Configure connection', description: 'Choose metro, bandwidth, and AWS account' }
        : { ...s, title: 'AWS Account ID', description: 'Your 12-digit AWS account number' }
      : s
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>();

  // Convention-based default name derived from the choices made — used when the user
  // leaves the (optional) name blank on the Review step.
  const defaultName = (() => {
    const provs = selectedProviders.length ? selectedProviders : (selectedProvider ? [selectedProvider as string] : []);
    const loc = (selectedLocation as string) || Object.values(selectedLocations).flat()[0] || '';
    if (selectedType === 'Cloud to Cloud' && provs.length >= 2) return `${provs.join(' ⇄ ')} Cloud to Cloud`;
    const base = `${provs[0] ?? 'New'} ${selectedType || 'Connection'}`.trim();
    return loc ? `${base} · ${loc}` : base;
  })();

  const [billingChoice, setBillingChoice] = useState<BillingChoice>({
    planId: 'pay-as-you-go',
    term: 'monthly',
    addons: []
  });

  // Cost sidebar visible on desktop via aside element in flex layout

  // For visual editor, convert connection to nodes and edges
  const [initialNodes, setInitialNodes] = useState<NetworkNode[]>([]);
  const [initialEdges, setInitialEdges] = useState<NetworkEdge[]>([]);
  const [designerKey, setDesignerKey] = useState(0);

  // Initialize from existing connection if provided
  useEffect(() => {
    if (connectionToEdit) {
      // Log initialization information
      console.log("Initializing connection wizard with connection:", connectionToEdit);
      
      // Set basic config values safely
      tryCatch(() => {
        if (connectionToEdit.provider) {
          setSelectedProviders([connectionToEdit.provider as CloudProvider]);
        }
        setSelectedType(connectionToEdit.type as ConnectionType);
        setSelectedBandwidth(connectionToEdit.bandwidth as BandwidthOption);
        setSelectedLocation(connectionToEdit.location as LocationOption);
        
        if (connectionToEdit.billing) {
          setBillingChoice({
            planId: connectionToEdit.billing.planId || 'pay-as-you-go',
            term: connectionToEdit.billing.term || 'monthly',
            addons: connectionToEdit.billing.addons || []
          });
        }
        
        // For visual mode, set up initial nodes and edges
        if (mode === 'visual') {
          console.log("Setting up visual editor with connection data:", connectionToEdit);
          
          // Use initialNodes/initialEdges from location state if available
          if (locationState?.initialNodes && locationState?.initialEdges) {
            console.log("Using provided initial nodes and edges from location state");
            setInitialNodes(locationState.initialNodes);
            setInitialEdges(locationState.initialEdges);
          } else {
            // Source node (represents customer side)
            const sourceNode: NetworkNode = {
              id: 'source-1',
              type: 'source',
              x: 100,
              y: 200,
              name: 'Your Network',
              status: connectionToEdit.status === 'Active' ? 'active' : 'inactive',
              config: {
                location: connectionToEdit.location,
                connectionType: connectionToEdit.type // Add this to help determine icon
              }
            };
            
            // Target node (represents cloud provider)
            const targetNode: NetworkNode = {
              id: 'destination-1',
              type: 'destination',
              x: 500,
              y: 200,
              name: connectionToEdit.provider || 'Cloud Provider',
              status: connectionToEdit.status === 'Active' ? 'active' : 'inactive',
              config: {
                provider: connectionToEdit.provider,
                region: connectionToEdit.location
              }
            };
            
            // Create edge between nodes
            const edge: NetworkEdge = {
              id: 'edge-1',
              source: 'source-1',
              target: 'destination-1',
              type: connectionToEdit.type,
              bandwidth: connectionToEdit.bandwidth,
              status: connectionToEdit.status === 'Active' ? 'active' : 'inactive'
            };
            
            console.log("Created default nodes and edges:", [sourceNode, targetNode], [edge]);
            setInitialNodes([sourceNode, targetNode]);
            setInitialEdges([edge]);
          }
        }
      }, () => {
        console.error('Error initializing connection data');
      });
    }
  }, [connectionToEdit, mode, locationState]);

  // Update config when selections change
  useEffect(() => {
    setConfig({
      provider: selectedProvider,
      type: selectedType,
      bandwidth: selectedBandwidth,
      location: selectedLocation
    });
  }, [selectedProviders, selectedType, selectedBandwidth, selectedLocation]);

  const handleCancel = () => {
    const connId = connectionToEdit?.id || locationState?.connectionId;
    if (isEditMode && connId) {
      navigate(`/connections/${connId}`);
    } else {
      navigate('/manage');
    }
  };

  const handleModeChange = (newMode: WizardMode) => {
    setMode(newMode);
    setStep(0);
    setConfig({});
    setConnectionName('');
    setBillingChoice({
      planId: 'pay-as-you-go',
      term: 'monthly',
      addons: []
    });
    setError(null);
  };

  const updateConfig = (updates: Partial<ConnectionConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const PLAN_TO_TERM: Record<string, string> = {
    'pay-as-you-go': 'monthly', '12-months': 'fixed-12', '24-months': 'fixed-24', '36-months': 'fixed-36', trial: 'trial',
  };
  const TERM_TO_PLAN: Record<string, string> = {
    monthly: 'pay-as-you-go', 'fixed-12': '12-months', 'fixed-24': '24-months', 'fixed-36': '36-months', trial: 'trial',
  };

  const updateBillingChoice = (updates: Partial<BillingChoice>) => {
    setBillingChoice(prev => ({ ...prev, ...updates }));
    // AWS Max: the plan chosen in the Cost Summary IS the contract term — one truth.
    if (updates.planId && PLAN_TO_TERM[updates.planId]) {
      setConfig(prev => ({
        ...prev,
        configuration: { ...(prev.configuration as any), lmccContractTerm: PLAN_TO_TERM[updates.planId!] } as any,
      }));
    }
  };

  // Reverse sync: a term picked in Advanced settings shows up in the Cost Summary plan.
  useEffect(() => {
    const term = (config.configuration as any)?.lmccContractTerm;
    const plan = term && TERM_TO_PLAN[term];
    if (plan && billingChoice.planId !== plan) {
      setBillingChoice(prev => ({ ...prev, planId: plan }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(config.configuration as any)?.lmccContractTerm]);

  const canProceed = () => {
    if (isPasteKey) {
      // Always allow the attempt once something is pasted: a bad key must produce a
      // legible, recoverable error (PRD) — not a silently dead button.
      if (pasteStage === 'paste') return pasteKeyValid || pasteHasInput;
      return true; // confirm stage: always enabled
    }
    const stepKey = STEP_KEYS[step];
    switch (stepKey) {
      // Hub step: always valid — new hub (default) or an existing hub is always selectable.
      // VNF step: optional — skipping or choosing both proceed.
      case 'vnf': return true;
      case 'type': return !!selectedType;
      // Cloud to Cloud links two or more clouds through one Hub, so it needs at least two providers.
      case 'provider':
        return selectedType === 'Cloud to Cloud'
          ? selectedProviders.length >= 2
          : selectedProviders.length > 0;
      case 'resiliency': return resiliencyLevel !== '';
      case 'locations': {
        if (selectedProviders.length > 0) {
          return selectedProviders.every(p => {
            const locs = (selectedLocations[p] || []).length;
            if (p === 'AWS' && resiliencyLevel === 'maximum' && selectedType === 'Internet to Cloud') return locs >= 1;
            const tier = (resiliencyLevel || 'standard') as 'standard' | 'maximum' | 'geodiversity';
            return locs >= getMinLocations(p, tier);
          });
        }
        return !!selectedLocation;
      }
      case 'bandwidth': return true;
      case 'advanced': return isAwsMax ? isValidAwsAccountId(awsAccountId) : true;
      case 'review': return true;
      default: return false;
    }
  };

  const handleComplete = async (config: ConnectionConfig | Connection[]) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Handle visual designer output (array of connections)
      if (Array.isArray(config)) {
        if (config.length === 0) {
          throw new Error('No connections created. Please design your network first.');
        }
        
        // If we're editing an existing connection
        if (isEditMode && connectionToEdit) {
          // Take the first connection from the visual designer
          const designerConnection = config[0];
          
          // Update the existing connection with the designer changes
          await updateConnection(connectionToEdit.id.toString(), {
            type: designerConnection.type,
            bandwidth: designerConnection.bandwidth,
            location: designerConnection.location,
            provider: designerConnection.provider,
            features: designerConnection.features,
            security: designerConnection.security
          });
          
          window.addToast?.({
            type: 'success',
            title: 'Connection Updated',
            message: 'Connection topology has been updated successfully',
            duration: 3000
          });
          
          // Navigate back to connection details
          navigate(`/connections/${connectionToEdit.id}`);
          return;
        }
        
        // Otherwise add the new connection(s)
        for (const connection of config) {
          await addConnection(connection);
        }
        
        navigate('/manage', { state: { activeTab: 'connections' } });
        return;
      }

      // Standard wizard flow - create a single connection
      
      // Use connectionName if provided, otherwise generate one
      const baseName = connectionName.trim() || defaultName;
      let finalName = baseName;
      let counter = 1;

      // Check for duplicate names and append a number if needed
      while (connections.some(conn => conn.name.toLowerCase() === finalName.toLowerCase())) {
        finalName = `${baseName} (${counter})`;
        counter++;
      }

      // AWS Max (AT&T-first): the key is generated but not yet uploaded in AWS, so the
      // connection sits at Pending — the 7-day expiry stage. Provisioning begins only
      // when the customer uploads the key (the PendingLmccScreen's demo button here).
      // Standard wizard: Inactive until manually activated.
      const newId = `conn-${Date.now()}`;
      const initialStatus: ConnectionStatus = isAwsMax ? 'Pending' : 'Inactive';

      // Cloud to Cloud links two or more clouds through one Hub, so persist it as a
      // single 'Cloud to Cloud' connection with one leg per selected cloud.
      const derived = deriveC2CFields({
        selectedType,
        selectedProviders,
        selectedLocations,
        fallbackLocation: config.location,
        bandwidth: config.bandwidth as string,
        status: initialStatus,
      });

      // Hubs derive automatically in the store (location + route domain) — no wizard choice.
      const newConnection = {
        id: newId,
        name: finalName,
        type: derived.type,
        status: initialStatus,
        bandwidth: config.bandwidth,
        location: config.location || derived.legs?.[0]?.location || '',
        provider: config.provider,
        ...(derived.legs
          ? { providers: derived.providers, locations: derived.locations, legs: derived.legs }
          : {}),
        features: {
          dedicatedConnection: true,
          redundantPath: config.redundancy || false,
          autoScaling: false,
          loadBalancing: false
        },
        security: {
          encryption: 'AES-256',
          firewall: true,
          ddosProtection: true,
          ipSecEnabled: true
        },
        performance: {
          latency: '<10ms',
          packetLoss: '<0.1%',
          jitter: '<2ms',
          uptime: '99.9%',
          throughput: '0%',
          tunnels: 'Inactive',
          bandwidthUtilization: 0,
          currentUsage: '0 Gbps',
          utilizationTrend: [0, 0, 0, 0, 0, 0, 0]
        },
        configuration: isAwsMax
          ? {
              ...(config.configuration || {}),
              isLmcc: true,
              lmccPending: true,
              lmccKeyCreatedAt: new Date().toISOString(),
            }
          : (config.configuration || {}),
        billing: {
          planId: billingChoice.planId,
          term: billingChoice.term,
          addons: billingChoice.addons,
          baseFee: billingChoice.planId === '36-months' ? 1999.99 : 999.99,
          usage: 0,
          total: billingChoice.planId === '36-months' ? 1999.99 : 999.99,
          currency: 'USD'
        }
      };

      // Add to local store - handle potential network errors
      try {
        await addConnection(newConnection);
        // The store auto-grouped the connection into its location hub — the VNF attaches there.
        const parentHubId = useStore.getState().hubs.find(h => h.connectionIds.includes(newId))?.id ?? '';

        // Persist an optional VNF chosen in the guided setup, attached to this connection + hub.
        if (addVnf && selectedVnfTemplateId) {
          const tmpl = VNF_TEMPLATES.find(t => t.id === selectedVnfTemplateId);
          if (tmpl) {
            addVNF({
              id: `vnf-${Date.now()}`,
              name: `${tmpl.name} — ${finalName}`,
              type: tmpl.type,
              vendor: tmpl.vendor,
              model: tmpl.model,
              status: initialStatus === 'Provisioning' ? 'provisioning' : 'active',
              size: selectedVnfSize,
              throughput: tmpl.throughput,
              connectionId: newId,
              hubIds: parentHubId ? [parentHubId] : [],
              linkIds: [],
              createdAt: new Date().toISOString(),
              description: tmpl.recommendedUseCase,
              configuration: { ...tmpl.defaultConfiguration, placement: selectedVnfPlacement },
            } as VNF);
          }
        }

        // AWS Max: complete the guided setup with the last-mile ActivationKey handoff.
        if (isAwsMax) {
          const metro = (config.location as string) || 'Unknown';
          const bw = (config.bandwidth as string) || '1 Gbps';
          const keyData = {
            sharedConnectionUuid: `lmcc-${newId.replace('conn-', '')}`,
            connectionSizeMbps: bw.includes('Gbps') ? parseInt(bw) * 1000 : parseInt(bw),
            destinationAccountId: awsAccountId || '—',
            destinationEnvironmentUri: `att://environments/${metro.toLowerCase().replace(/[^a-z]/g, '-')}`,
            version: 1,
          };
          setLastMile({ connId: newId, activationKey: btoa(JSON.stringify(keyData)) });
          useStore.getState().logActivity({
            type: 'key-generated',
            connectionId: newId,
            message: `ActivationKey generated for ${metro} — valid 7 days. Billing starts at Live, never at key creation.`,
          });
          setIsSubmitting(false);
          return;
        }

        // Navigate to Manage page — new row highlighted in list view
        setTimeout(() => {
          navigate('/manage', { state: { highlightedConnectionId: newId, activeTab: 'connections', viewMode: 'list' } });
        }, 500);
      } catch (error) {
        console.error('Error creating connection:', error);
        setError('Failed to create connection. Please try again.');
        setIsSubmitting(false);
      }

    } catch (error) {
      console.error('Error creating connection:', error);
      setError(handleApiError(error, 'Failed to create connection'));
      setIsSubmitting(false);
    }
  };

  // Apply AI suggestion
  const handleAISuggestion = (suggestion: any) => {
    try {
      if (suggestion.provider) {
        setSelectedProviders([suggestion.provider]);
      }
      if (suggestion.type) {
        setSelectedType(suggestion.type);
      }
      if (suggestion.bandwidth) {
        setSelectedBandwidth(suggestion.bandwidth);
      }
      if (suggestion.location) {
        setSelectedLocation(suggestion.location);
      }
    } catch (error) {
      console.error('Error applying AI suggestion:', error);
    }
  };

  // AWS Max: guided-setup completion — the "last mile" ActivationKey handoff to AWS.
  if (lastMile) {
    const steps = [
      'Copy the ActivationKey above',
      'Open the AWS Direct Connect console → Connections',
      'Find the 4 pending AT&T hosted connections',
      'Accept each one and paste the key when prompted',
      'Once 3 of 4 are accepted, AT&T begins BGP provisioning automatically',
    ];
    return (
      <div className="bg-fw-base rounded-3xl">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-fw-successLight text-fw-success">
              <Check className="h-5 w-5" />
            </span>
            <h2 className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em]">Connection created — one last mile</h2>
          </div>
          <p className="text-figma-base text-fw-body mb-8">
            AT&T generated your <span className="font-semibold">ActivationKey</span>. Carry it to AWS to accept the four hosted connections and complete the interconnect.
          </p>

          <div className="bg-fw-wash rounded-2xl border border-fw-secondary p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-figma-xs font-semibold text-fw-bodyLight uppercase tracking-widest">Your ActivationKey</p>
                <span className="inline-flex items-center gap-1.5 text-figma-xs font-medium text-fw-warn">
                  <span className="w-1.5 h-1.5 rounded-full bg-fw-warn inline-block" />
                  {keyExpiryInfo(connections.find(c => c.id === lastMile.connId)?.configuration?.lmccKeyCreatedAt ?? new Date().toISOString()).label}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-1 min-w-0 text-figma-xs font-mono text-fw-heading bg-fw-base border border-fw-secondary rounded-xl p-3 break-all leading-relaxed">
                  {lastMile.activationKey}
                </code>
                <button
                  onClick={() => { navigator.clipboard?.writeText(lastMile.activationKey); setLastMileCopied(true); setTimeout(() => setLastMileCopied(false), 2000); }}
                  className={`shrink-0 p-2.5 rounded-xl border transition-all ${lastMileCopied ? 'border-fw-active bg-fw-accent text-fw-link' : 'border-fw-secondary hover:border-fw-active text-fw-bodyLight hover:text-fw-heading'}`}
                  title="Copy key"
                >
                  {lastMileCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {lastMileCopied && <p className="text-figma-xs text-fw-link mt-1.5">Copied to clipboard</p>}
              <p className="text-figma-xs text-fw-bodyLight mt-2">
                Keys expire 7 days after creation. An unused key simply reads Expired — nothing is billed, nothing is lost.
              </p>
            </div>

            <div className="rounded-xl bg-fw-base border border-fw-secondary p-4 space-y-2">
              <p className="text-figma-xs font-semibold text-fw-heading mb-3">Finish in the AWS console</p>
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-fw-accent border border-fw-link/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-fw-link">{i + 1}</span>
                  </div>
                  <p className="text-figma-xs text-fw-body leading-relaxed">{s}</p>
                </div>
              ))}
            </div>

            <a
              href="https://console.aws.amazon.com/directconnect/v2/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-fw-link text-white rounded-xl hover:bg-fw-linkHover transition-colors font-semibold text-figma-sm"
            >
              Open AWS Direct Connect Console
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => navigate(`/connections/${lastMile.connId}`)}
              className="text-figma-sm font-medium text-fw-link hover:underline"
            >
              View the connection
            </button>
            <Button
              variant="primary"
              onClick={() => navigate('/manage', { state: { highlightedConnectionId: lastMile.connId, activeTab: 'connections', viewMode: 'list' } })}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If no mode is selected, show the mode selection screen
  if (!mode) {
    return (
      <div className="bg-fw-base rounded-3xl">
        <ModeSelection onModeSelect={handleModeChange} onCancel={handleCancel} />
      </div>
    );
  }

  const renderContent = () => {
    switch (mode) {
      case 'visual':
        return (
          <div>
            <AsyncBoundary
              fallback={
                <div className="min-h-[800px] flex items-center justify-center bg-fw-wash rounded-xl border border-fw-secondary">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-fw-bodyLight">Loading Network Designer...</p>
                  </div>
                </div>
              }
              errorFallback={
                <div className="min-h-[800px] flex items-center justify-center bg-fw-wash rounded-xl border border-fw-secondary">
                  <div className="text-center max-w-md p-8">
                    <h3 className="text-figma-xl font-bold text-fw-error mb-4 tracking-[-0.03em]">Unable to load Network Designer</h3>
                    <p className="text-fw-bodyLight mb-6">We encountered an error loading the network designer component. This might be due to browser compatibility issues or network problems.</p>
                    <div className="space-y-4">
                      <button
                        onClick={() => setMode('step-by-step')}
                        className="w-full px-6 py-3 bg-fw-ctaPrimary text-white rounded-full hover:bg-fw-ctaPrimaryHover"
                      >
                        Switch to Guided Setup
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="w-full px-6 py-3 bg-fw-neutral text-fw-body rounded-full hover:bg-fw-neutral"
                      >
                        Refresh Page
                      </button>
                    </div>
                  </div>
                </div>
              }
              retryOnError={false}
            >
              <Suspense fallback={
                <div className="min-h-[800px] flex items-center justify-center bg-fw-wash rounded-xl border border-fw-secondary">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-fw-bodyLight">Loading Network Designer...</p>
                  </div>
                </div>
              }>
                <LazyNetworkDesigner
                  key={designerKey}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                  initialNodes={initialNodes}
                  initialEdges={initialEdges}
                  editMode={isEditMode}
                  connectionId={connectionToEdit?.id || locationState?.connectionId}
                  connectionStatus={connectionToEdit?.status || locationState?.connectionStatus}
                  resiliencyLevel={resiliencyLevel}
                  selectedProviders={selectedProviders as string[]}
                  selectedConnectionType={selectedType}
                />
              </Suspense>
            </AsyncBoundary>
          </div>
        );

      default: {
        const stepKey = STEP_KEYS[step];
        // Live inputs for the "what you're building" topology strip.
        const wizVnfTmpl = addVnf && selectedVnfTemplateId ? VNF_TEMPLATES.find(t => t.id === selectedVnfTemplateId) : undefined;
        const wizFriendlyLocs = Object.fromEntries(
          Object.entries(selectedLocations).map(([p, locs]) => [
            p,
            (locs as string[]).map(l => (l.startsWith('metro-') ? (getMetroById(l)?.name ?? l) : l)),
          ]),
        );
        const friendlyLoc = (l?: string) => (l && l.startsWith('metro-') ? (getMetroById(l)?.name ?? l) : l);
        // The hub derives from the first chosen location; show what's already grouped there.
        const wizFirstLoc = friendlyLoc(Object.values(selectedLocations).flat()[0] as string | undefined);
        const wizDerivedHub = wizFirstLoc ? hubs.find(h => h.location === wizFirstLoc && (h.routeDomain ?? 'internet') === (String(selectedType ?? '').toUpperCase().includes('VPN') ? 'vpn' : 'internet')) : undefined;
        const wizExistingClouds = wizDerivedHub
          ? connections
              .filter(c => wizDerivedHub.connectionIds?.includes(c.id))
              .flatMap(c => getConnectionLegs(c).map(l => ({ provider: l.provider, location: friendlyLoc(l.location) })))
          : [];
        const wizTopo = {
          connectionType: selectedType,
          providers: selectedProviders as string[],
          locationsByProvider: wizFriendlyLocs,
          bandwidthSettings,
          resiliencyLevel,
          hubName: wizDerivedHub?.name ?? (wizFirstLoc ? `${wizFirstLoc}` : 'Location hub'),
          isExistingHub: !!wizDerivedHub,
          // The hub node lights up once a location is chosen — grouping is automatic.
          hubDecided: !!wizFirstLoc,
          vnf: wizVnfTmpl ? { label: wizVnfTmpl.name, vnfType: wizVnfTmpl.type } : null,
          vnfPlacement: selectedVnfPlacement,
          // Only surface the VNF (ghost or set) once the user opts in — no phantom node otherwise.
          vnfStepReached: addVnf,
          isAwsMax,
          existingClouds: wizExistingClouds,
        };
        return (
          <>
            {!isAwsMax && !isPasteKey && (
              <div className="max-w-4xl mx-auto mb-6">
                <PhaseIndicator
                  phases={EFFECTIVE_STEPS}
                  currentPhase={step}
                  className="w-full"
                  onStepClick={(i) => setStep(i)}
                />
              </div>
            )}
            {isAwsMax && !isPasteKey && (
              <div className="max-w-sm mx-auto mb-12">
                <PhaseIndicator
                  phases={[
                    { title: 'AWS Account', description: 'Enter your AWS account number' },
                    { title: 'Review', description: 'Review and activate' },
                  ]}
                  currentPhase={stepKey === 'review' ? 1 : 0}
                  className="w-full"
                />
              </div>
            )}
            {isPasteKey && (
              <div className="max-w-sm mx-auto mb-12">
                <PhaseIndicator
                  phases={[
                    { title: 'Activation Key', description: 'Paste your AWS key' },
                    { title: 'Review', description: 'Confirm and activate' },
                  ]}
                  currentPhase={pasteStage === 'paste' ? 0 : 1}
                  className="w-full"
                />
              </div>
            )}

            {/* AI Assistant — constrained to the same 4xl column as the stepper/steps/strip. */}
            {showAI && (
              <div className="max-w-4xl mx-auto w-full">
                <NetworkAI
                  provider={selectedProvider}
                  type={selectedType}
                  bandwidth={selectedBandwidth}
                  location={selectedLocation}
                  step={step}
                  onNextStep={() => setStep(s => Math.min(s + 1, EFFECTIVE_STEPS.length - 1))}
                  onSuggestion={handleAISuggestion}
                />
              </div>
            )}

            {/* Paste Key wizard mode */}
            {isPasteKey && (
              <LmccPasteKeyFlow
                onStageChange={setPasteStage}
                onValidityChange={setPasteKeyValid}
                  onInputChange={setPasteHasInput}
                actionRef={pasteActionRef}
                onCancel={onCancel}
                awsHandoff={!!(locationState as any)?.awsHandoff}
              />
            )}

            {/* AWS Max Account ID: full-width centered, no sidebar */}
            {stepKey === 'advanced' && isAwsMax && !isPasteKey && (() => {
              const metroId = (selectedLocations['AWS'] || [])[0];
              const metro = metroId ? getMetroById(metroId) : null;
              return (
                <div className="max-w-4xl mx-auto w-full">
                  <AwsAccountIdStep
                    value={awsAccountId}
                    onChange={setAwsAccountId}
                    connectionName={connectionName}
                    onNameChange={setConnectionName}
                    metroName={metro?.name}
                    awsRegionLabel={metro?.awsRegionLabel}
                    bandwidth={bandwidthSettings['AWS-lmcc'] ?? 1000}
                    isGa={isGa}
                    selectedMetroId={metroId}
                    onMetroChange={(id) => setSelectedLocations(prev => ({ ...prev, AWS: [id] }))}
                    onBandwidthChange={(mbps) => updateBandwidth('AWS-lmcc', mbps)}
                  />
                </div>
              );
            })()}

            {/* AWS Max Location: centered single-metro selector */}
            {isAwsMax && stepKey === 'locations' && (
              <AwsMaxLocationStep
                selectedMetroId={(selectedLocations['AWS'] || [])[0]}
                onSelect={(metroId) =>
                  setSelectedLocations(prev => ({ ...prev, AWS: [metroId] }))
                }
              />
            )}

            {/* AWS Max Bandwidth: full-width centered, no sidebar */}
            {isAwsMax && stepKey === 'bandwidth' && (
              <div className="max-w-2xl mx-auto w-full">
                <BandwidthConfiguration
                  selectedProviders={selectedProviders}
                  selectedLocations={selectedLocations}
                  bandwidthSettings={bandwidthSettings}
                  onBandwidthChange={updateBandwidth}
                  type={selectedType}
                  resiliencyLevel={resiliencyLevel}
                />
              </div>
            )}

            {/* Content + sidebar layout (not review/hub/vnf, not AWS Max location/bandwidth/advanced) */}
            {stepKey !== 'review' && stepKey !== 'vnf' && !isPasteKey && !(isAwsMax && (stepKey === 'locations' || stepKey === 'bandwidth' || stepKey === 'advanced')) && (
            <div className="flex gap-8">
            <div className="flex-1 min-w-0 max-w-3xl relative">

              {stepKey === 'type' && (
                <ConnectionTypeSelection
                  selectedType={selectedType}
                  provider={selectedProvider}
                  providers={selectedProviders}
                  onSelect={(type) => {
                    setSelectedType(type);
                    if (type === 'AWS Last Mile') {
                      // Its own product: AWS-only and Maximum by definition — skip both steps.
                      setSelectedProviders(['AWS' as CloudProvider]);
                      setResiliencyLevel('maximum');
                      setStep(STEP_KEYS.indexOf('locations'));
                      return;
                    }
                    const allowed = getAvailableProviders(type);
                    setSelectedProviders(prev => prev.filter(p => allowed.includes(p)));
                    setStep(STEP_KEYS.indexOf('provider'));
                  }}
                />
              )}

              {stepKey === 'provider' && (
                <ProviderSelection
                  selectedProviders={selectedProviders}
                  onToggle={toggleProvider}
                  selectedType={selectedType}
                />
              )}

              {stepKey === 'resiliency' && (
                <ResiliencySelection
                  resiliencyLevel={resiliencyLevel}
                  onSelect={setResiliencyLevel}
                  provider={selectedProvider}
                  providers={selectedProviders}
                  type={selectedType}
                />
              )}

              {stepKey === 'locations' && (
                <ConnectionConfiguration
                  selectedLocation={selectedLocation}
                  selectedBandwidth={selectedBandwidth}
                  provider={selectedProvider}
                  type={selectedType}
                  onLocationSelect={setSelectedLocation}
                  onBandwidthSelect={setSelectedBandwidth}
                  selectedProviders={selectedProviders}
                  selectedLocations={selectedLocations}
                  onToggleLocation={toggleLocation}
                  resiliencyLevel={resiliencyLevel}
                />
              )}

              {stepKey === 'bandwidth' && (
                <BandwidthConfiguration
                  selectedProviders={selectedProviders}
                  selectedLocations={selectedLocations}
                  bandwidthSettings={bandwidthSettings}
                  onBandwidthChange={updateBandwidth}
                  type={selectedType}
                  resiliencyLevel={resiliencyLevel}
                />
              )}

              {stepKey === 'advanced' && (
                isAwsMax
                  ? null
                  : <AdvancedSettings
                      config={{
                        ...config,
                        provider: selectedProvider,
                        providers: selectedProviders,
                        type: selectedType,
                        bandwidth: selectedBandwidth,
                        location: selectedLocation,
                      }}
                      onConfigChange={updateConfig}
                      resiliencyLevel={resiliencyLevel}
                    />
              )}

            </div>

            {/* Cost Summary - hidden for AWS Max (manual billing in Preview) */}
            {!isAwsMax && (
            <aside className="hidden lg:block w-[280px] shrink-0 self-start sticky top-24">
              <BillingPreview
                provider={(selectedProvider || selectedProviders[0]) as any}
                type={selectedType as any}
                bandwidth={(() => {
                  const firstKey = Object.keys(bandwidthSettings)[0];
                  if (firstKey) {
                    const bw = bandwidthSettings[firstKey];
                    if (bw >= 1000) return `${bw / 1000} Gbps` as any;
                    return `${bw} Mbps` as any;
                  }
                  return selectedBandwidth as any;
                })()}
                redundancy={resiliencyLevel === 'maximum' || resiliencyLevel === 'geodiversity'}
                configuration={config.configuration}
                selectedPlanId={billingChoice.planId}
                onPlanChange={(planId) => updateBillingChoice({ planId })}
                resiliencyLevel={resiliencyLevel}
                lmccBandwidth={bandwidthSettings['AWS-lmcc']}
              />
            </aside>
            )}
            </div>
            )}

            {/* VNF step — opt-in. Compact "not now / add" prompt; the catalog only expands
                when the user chooses to add one, so skipping takes almost no space. */}
            {stepKey === 'vnf' && (
              <div className="max-w-4xl mx-auto w-full">
                <div className="mb-5">
                  <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-1">Add a Virtual Network Function? <span className="text-figma-base font-normal text-fw-bodyLight">(optional)</span></h3>
                  <p className="text-figma-base text-fw-bodyLight">A <span className="font-semibold text-fw-body">VNF</span> is a firewall, SD-WAN, router, or load balancer on your connection. Most connections don’t need one at setup — you can always add one later.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setAddVnf(false); setSelectedVnfTemplateId(''); }}
                    className={`choice-card p-4 rounded-xl border-2 text-left transition-all ${!addVnf ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary bg-fw-base hover:border-fw-active/50'}`}
                  >
                    <p className={`text-figma-sm font-bold ${!addVnf ? 'text-fw-link' : 'text-fw-heading'}`}>Not now</p>
                    <p className="text-figma-xs text-fw-bodyLight mt-0.5">No network function — add one anytime from the connection.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddVnf(true)}
                    className={`choice-card p-4 rounded-xl border-2 text-left transition-all ${addVnf ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary bg-fw-base hover:border-fw-active/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-fw-link shrink-0" />
                      <p className={`text-figma-sm font-bold ${addVnf ? 'text-fw-link' : 'text-fw-heading'}`}>Add a VNF</p>
                    </div>
                    <p className="text-figma-xs text-fw-bodyLight mt-0.5">Pick from the catalog and choose where it sits.</p>
                  </button>
                </div>

                {addVnf && (
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {VNF_TEMPLATES.filter(t => t.id !== 'template-ubuntu').map((t) => {
                    const Icon = getVNFTypeIcon(t.type);
                    const active = selectedVnfTemplateId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedVnfTemplateId(t.id)}
                        className={`choice-card p-4 rounded-xl border-2 text-left transition-all ${active ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary bg-fw-base hover:border-fw-active/50'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-fw-link shrink-0"><Icon className="h-4 w-4" /></span>
                          <p className={`text-figma-sm font-bold truncate ${active ? 'text-fw-link' : 'text-fw-heading'}`}>{t.name}</p>
                        </div>
                        <p className="text-figma-xs text-fw-bodyLight truncate">{t.vendor}{t.model ? ` · ${t.model}` : ''}</p>
                        {t.recommendedUseCase && <p className="text-[11px] text-fw-bodyLight mt-1">{t.recommendedUseCase}</p>}
                      </button>
                    );
                  })}
                </div>
                )}
                {addVnf && selectedVnfTemplateId && (
                  <div className="mt-5 space-y-4">
                    {/* Placement — where the VNF sits. Reflected live in the topology below. */}
                    <div className="bg-fw-base p-5 rounded-xl border border-fw-secondary">
                      <h4 className="text-figma-sm font-bold text-fw-heading mb-1">Where should it sit?</h4>
                      <p className="text-figma-xs text-fw-bodyLight mb-3">See it update in the topology preview below.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {([
                          { id: 'inline' as const, title: 'In the connection path', desc: 'Inline between the hub and the cloud — inspects this connection’s traffic.' },
                          { id: 'hub' as const, title: 'On the hub', desc: 'A shared service on the hub, across all its connections.' },
                        ]).map((p) => {
                          const active = selectedVnfPlacement === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedVnfPlacement(p.id)}
                              className={`choice-card p-4 rounded-xl border-2 text-left transition-all ${active ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50'}`}
                            >
                              <p className={`text-figma-sm font-bold ${active ? 'text-fw-link' : 'text-fw-heading'}`}>{p.title}</p>
                              <p className="text-[11px] text-fw-bodyLight mt-0.5">{p.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Instance size */}
                    <div className="bg-fw-base p-5 rounded-xl border border-fw-secondary">
                      <h4 className="text-figma-sm font-bold text-fw-heading mb-3">Instance size</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {VNF_SIZE_TIERS.map((s) => {
                          const active = selectedVnfSize === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedVnfSize(s.id)}
                              className={`choice-card p-3 rounded-lg border-2 text-left transition-all ${active ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50'}`}
                            >
                              <p className={`text-figma-sm font-bold ${active ? 'text-fw-link' : 'text-fw-heading'}`}>{s.label}</p>
                              <p className="text-[11px] text-fw-bodyLight mt-0.5">{s.vcpuRange} vCPU · {s.ramRange}</p>
                              <p className="text-[11px] font-semibold text-fw-body mt-0.5 tabular-nums">${s.monthlyPrice}/mo</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Review - max-w-4xl to align with PhaseIndicator dots */}
            {stepKey === 'review' && (
              <div className="max-w-4xl mx-auto w-full">
              {/* Name — optional; defaults to a convention from the choices made */}
              <div className="mb-6 bg-fw-base p-5 rounded-xl border border-fw-secondary">
                <label htmlFor="conn-name" className="block text-figma-base font-bold text-fw-heading tracking-[-0.02em] mb-1">Connection name <span className="text-figma-xs font-normal text-fw-bodyLight">(optional)</span></label>
                <input
                  id="conn-name"
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder={defaultName}
                  className="w-full h-10 px-3 rounded-lg border border-fw-primary text-figma-base focus:border-fw-active focus:ring-fw-active"
                />
                <p className="text-figma-xs text-fw-bodyLight mt-1.5">Leave blank to use <span className="font-medium text-fw-body">“{defaultName}”</span>.</p>
              </div>
              {/* Connection Hub — chosen up front on the Hub step; summarized here, editable via Back. */}
              <div className="mb-6 bg-fw-base p-5 rounded-xl border border-fw-secondary flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AttIcon name="hub" className="h-5 w-5 text-fw-link shrink-0" />
                  <div className="min-w-0">
                    <p className="text-figma-xs font-semibold uppercase tracking-[0.06em] text-fw-bodyLight">Connection Hub</p>
                    <p className="text-figma-base font-bold text-fw-heading truncate">
                      {targetHubId
                        ? hubs.find(g => g.id === targetHubId)?.name ?? 'Existing hub'
                        : `${newHubName.trim() || connectionName.trim() || defaultName} (new)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(STEP_KEYS.indexOf('hub'))}
                  className="text-figma-sm font-medium text-fw-link hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
              <ReviewConfiguration
                connectionName={connectionName}
                config={{
                  ...config,
                  provider: selectedProvider,
                  providers: selectedProviders,
                  type: selectedType,
                  bandwidth: selectedBandwidth,
                  location: selectedLocation,
                  resiliencyLevel: resiliencyLevel,
                }}
                selectedLocations={selectedLocations}
                bandwidthSettings={bandwidthSettings}
                billingChoice={billingChoice}
                onBillingChange={updateBillingChoice}
                onEditStep={(s) => setStep(s)}
                awsAccountId={isAwsMax ? awsAccountId : undefined}
                onSwitchToVisual={!isAwsMax ? (nodes, edges) => {
                  setInitialNodes(nodes);
                  setInitialEdges(edges);
                  setDesignerKey(k => k + 1);
                  setMode('visual');
                } : undefined}
              />
              </div>
            )}

            {/* "What you're building" — read-only topology, BELOW the choices so it stays a
                reference and never pushes the step's inputs down. Fills in step by step. */}
            {!isPasteKey && (
              <div className="max-w-4xl mx-auto mt-6">
                <WizardTopology {...wizTopo} />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-6 p-4 bg-fw-errorLight border border-fw-error rounded-xl">
                <p className="text-figma-base text-fw-error">{error}</p>
              </div>
            )}

            {/* Spacer — keeps last content row clear of sticky nav */}
            <div className="h-20" />

            {/* Footer buttons - sticky bottom, always in view */}
            <div className="sticky bottom-0 -mx-8 px-8 py-4 flex items-center justify-between bg-fw-base border-t border-fw-secondary z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center text-figma-base font-medium text-fw-link hover:text-fw-linkHover"
                >
                  <X className="h-5 w-5 mr-1" />
                  Cancel
                </button>
                {!isPasteKey && (
                  <button className="text-figma-base font-medium text-fw-link hover:text-fw-linkHover">
                    Save draft
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Back button */}
                {(isPasteKey ? pasteStage === 'confirm' : step > 0) && (
                  <button
                    onClick={() => isPasteKey ? pasteActionRef.current?.back() : setStep(step - 1)}
                    className="inline-flex items-center h-9 px-5 border border-fw-active text-figma-base font-medium text-fw-link rounded-full hover:bg-fw-primary/5 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 mr-1.5" />
                    Back
                  </button>
                )}
                {/* Next / Submit button */}
                {isPasteKey ? (
                  <button
                    onClick={() => pasteActionRef.current?.advance()}
                    disabled={!canProceed()}
                    className={`inline-flex items-center h-9 px-5 text-figma-base font-medium rounded-full transition-colors ${
                      !canProceed()
                        ? 'bg-fw-disabled text-fw-disabled cursor-not-allowed'
                        : 'bg-fw-primary text-white hover:bg-fw-primaryHover'
                    }`}
                  >
                    {pasteStage === 'confirm' ? 'Confirm' : 'Continue'}
                    <ArrowRight className="h-5 w-5 ml-1.5" />
                  </button>
                ) : stepKey === 'review' ? (
                  <button
                    onClick={() => {
                      if (isAwsMax) {
                        const metroId = (selectedLocations['AWS'] || [])[0] || '';
                        const bwMbps = bandwidthSettings['AWS-lmcc'] || 1000;
                        const bwLabel = bwMbps >= 1000 ? `${bwMbps / 1000} Gbps` : `${bwMbps} Mbps`;
                        handleComplete({
                          provider: 'AWS' as any,
                          type: 'AWS Last Mile' as any,
                          bandwidth: bwLabel as any,
                          location: metroId as any,
                          configuration: { ...(config.configuration as any), awsAccountId, lmccMetro: metroId, isLmcc: true, lmccKeyCreatedAt: new Date().toISOString() } as any,
                        });
                      } else if (selectedProviders.length > 0 && selectedType) {
                        // Multi-provider / Cloud to Cloud flows set per-provider bandwidth and
                        // locations rather than the singular fields, so derive values when those
                        // are absent (otherwise the connection would never be created).
                        const firstProvider = (selectedProvider || selectedProviders[0]) as CloudProvider;
                        const bwKey = Object.keys(bandwidthSettings)[0];
                        const bwMbps = bwKey ? bandwidthSettings[bwKey] : undefined;
                        const derivedBandwidth = selectedBandwidth
                          || (bwMbps ? (bwMbps >= 1000 ? `${bwMbps / 1000} Gbps` : `${bwMbps} Mbps`) : '1 Gbps');
                        const derivedLocation = selectedLocation || (selectedLocations[firstProvider] || [])[0] || '';
                        handleComplete({
                          ...config,
                          provider: firstProvider,
                          type: selectedType,
                          bandwidth: derivedBandwidth as any,
                          location: derivedLocation as any,
                        });
                      } else {
                        setError('Please complete all required fields before creating the connection.');
                      }
                    }}
                    disabled={isSubmitting}
                    className={`inline-flex items-center h-9 px-5 text-figma-base font-medium rounded-full transition-colors ${
                      isSubmitting
                        ? 'bg-fw-disabled text-fw-disabled cursor-not-allowed'
                        : 'bg-fw-primary text-white hover:bg-fw-primaryHover'
                    }`}
                  >
                    {isSubmitting
                      ? (isAwsMax ? 'Activating...' : 'Creating...')
                      : (isAwsMax ? 'Save & Monitor' : 'Create Connection')}
                    <ArrowRight className="h-5 w-5 ml-1.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // AWS Last Mile is AWS-only + Maximum by definition — provider and
                      // resiliency steps carry no choice, so skip them.
                      if (STEP_KEYS[step] === 'type' && selectedType === 'AWS Last Mile') {
                        setSelectedProviders(['AWS' as CloudProvider]);
                        setResiliencyLevel('maximum');
                        setStep(STEP_KEYS.indexOf('locations'));
                        return;
                      }
                      setStep(step + 1);
                    }}
                    disabled={!canProceed()}
                    className={`inline-flex items-center h-9 px-5 text-figma-base font-medium rounded-full transition-colors ${
                      !canProceed()
                        ? 'bg-fw-disabled text-fw-disabled cursor-not-allowed'
                        : 'bg-fw-primary text-white hover:bg-fw-primaryHover'
                    }`}
                  >
                    Next
                    <ArrowRight className="h-5 w-5 ml-1.5" />
                  </button>
                )}
              </div>
            </div>
          </>
        );
      }
    }
  };

  return (
    <div className="bg-fw-base rounded-3xl p-8">
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            <h3 className="text-figma-xl font-bold text-fw-error mb-4 tracking-[-0.03em]">Something went wrong</h3>
            <p className="text-fw-bodyLight mb-6">We encountered an error while setting up your connection wizard.</p>
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-fw-ctaPrimary text-white rounded-full hover:bg-fw-ctaPrimaryHover"
              >
                Reload Page
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-fw-neutral text-fw-body rounded-full hover:bg-fw-neutral"
              >
                Back to Connections
              </button>
            </div>
          </div>
        }
      >
        {renderContent()}
      </ErrorBoundary>
    </div>
  );
}
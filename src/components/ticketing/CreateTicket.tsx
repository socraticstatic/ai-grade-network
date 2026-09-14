import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Check, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';

interface AttachmentFile {
  name: string;
  size: string;
  type: string;
}

interface MockConnection {
  id: string;
  name: string;
  provider: string;
  vnfs: { id: string; name: string; hostname: string }[];
}

const MOCK_CONNECTIONS: MockConnection[] = [
  {
    id: 'conn-1',
    name: 'AWS Interconnect – last mile - US East',
    provider: 'AWS',
    vnfs: [
      { id: 'vnf-1', name: 'Palo Alto Firewall', hostname: 'PALO-MACD-TEST1' },
      { id: 'vnf-2', name: 'SD-WAN Edge', hostname: 'SDWAN-EDGE-01' },
    ],
  },
  {
    id: 'conn-2',
    name: 'Azure ExpressRoute - West Europe',
    provider: 'Azure',
    vnfs: [
      { id: 'vnf-3', name: 'Fortinet Firewall', hostname: 'FGT-ALP-FW01' },
    ],
  },
  {
    id: 'conn-3',
    name: 'Google Cloud Interconnect - US Central',
    provider: 'Google Cloud',
    vnfs: [
      { id: 'vnf-4', name: 'Router', hostname: 'RTR-GCP-01' },
      { id: 'vnf-5', name: 'Enterprise LMCC', hostname: 'LMCC-GCP-01' },
    ],
  },
  {
    id: 'conn-4',
    name: 'Oracle FastConnect - US Phoenix',
    provider: 'Oracle',
    vnfs: [],
  },
];

const ALL_PROVIDERS = ['AWS', 'Azure', 'Google Cloud', 'Oracle', 'IBM', 'Equinix'];

const TROUBLE_TYPES = [
  { value: 'info', label: 'Information Request' },
  { value: 'trouble', label: 'Trouble Report' },
  { value: 'configuration', label: 'Configuration Change' },
];

const INPUT_CLASS = 'w-full h-10 px-3 rounded-lg border bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active';
const SELECT_CLASS = 'w-full h-10 px-3 rounded-lg border bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active appearance-none cursor-pointer';
const LABEL_CLASS = 'block text-figma-base font-medium text-fw-heading mb-2';
const HELPER_CLASS = 'mt-1 text-figma-sm text-fw-bodyLight';
const ERROR_CLASS = 'mt-1 text-figma-sm text-fw-error';
const RADIO_CLASS = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-figma-sm font-medium transition-colors';

export function CreateTicket() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedConnectionId = searchParams.get('connectionId') || '';
  const preselectedAsset = searchParams.get('asset') || '';

  // Form state - existing
  const [connectionId, setConnectionId] = useState(preselectedConnectionId);
  const [cspName, setCspName] = useState('');
  const [vnfId, setVnfId] = useState('');
  const [troubleType, setTroubleType] = useState('');
  const [description, setDescription] = useState(preselectedAsset ? `Issue with: ${preselectedAsset}` : '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form state - new SD3 fields
  const [assetType, setAssetType] = useState<'vnf' | 'connection'>('connection');
  const [billingAssetId, setBillingAssetId] = useState('');
  const [bcOrgId, setBcOrgId] = useState('');
  const [ubSubaccountId, setUbSubaccountId] = useState('');
  const [externalTicketId, setExternalTicketId] = useState('');
  const [preferredContact, setPreferredContact] = useState<'phone' | 'email' | 'address'>('email');
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [ipeHostname, setIpeHostname] = useState('');
  const [taoLocationId, setTaoLocationId] = useState('');
  const [ipeLogicPort, setIpeLogicPort] = useState('');
  const [equinixCircuitId, setEquinixCircuitId] = useState('');

  // Derived data
  const selectedConnection = useMemo(
    () => MOCK_CONNECTIONS.find(c => c.id === connectionId),
    [connectionId]
  );

  const availableProviders = useMemo(() => {
    if (selectedConnection) return [selectedConnection.provider];
    return ALL_PROVIDERS;
  }, [selectedConnection]);

  const availableVnfs = useMemo(() => {
    if (selectedConnection) return selectedConnection.vnfs;
    return MOCK_CONNECTIONS.flatMap(c => c.vnfs);
  }, [selectedConnection]);

  const handleConnectionChange = (id: string) => {
    setConnectionId(id);
    const conn = MOCK_CONNECTIONS.find(c => c.id === id);
    if (conn) {
      setCspName(conn.provider);
      setVnfId('');
    } else {
      setCspName('');
      setVnfId('');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!troubleType) newErrors.troubleType = 'Trouble type is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!bcOrgId.trim()) newErrors.bcOrgId = 'BC Org ID is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      setSubmitted(true);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: AttachmentFile[] = Array.from(files).map(f => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    const newAttachments: AttachmentFile[] = Array.from(files).map(f => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSubmitted(false);
    setConnectionId('');
    setCspName('');
    setVnfId('');
    setTroubleType('');
    setDescription('');
    setPhone('');
    setEmail('');
    setAddress('');
    setAttachments([]);
    setErrors({});
    setBcOrgId('');
    setUbSubaccountId('');
    setBillingAssetId('');
    setExternalTicketId('');
    setAssetType('connection');
    setPreferredContact('email');
    setIpeHostname('');
    setTaoLocationId('');
    setIpeLogicPort('');
    setEquinixCircuitId('');
    setShowNetworkInfo(false);
  };

  if (submitted) {
    const selectedVnf = availableVnfs.find(v => v.id === vnfId);
    return (
      <div className="max-w-md mx-auto py-16 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-fw-success/10 mb-6 flex items-center justify-center">
          <Check className="h-10 w-10 text-fw-success" />
        </div>
        <h2 className="text-figma-xl font-medium text-fw-heading mb-2">
          Ticket created successfully
        </h2>
        <p className="text-figma-base text-fw-body mb-2">
          {selectedConnection ? `Connection: ${selectedConnection.name}` : 'General support request'}
        </p>
        {selectedVnf && (
          <p className="text-figma-sm text-fw-bodyLight mb-6">
            Asset: {selectedVnf.hostname}
          </p>
        )}
        <p className="text-figma-sm text-fw-bodyLight mb-8">
          Our support team will respond within 4 business hours.
        </p>
        <div className="flex gap-3 w-full max-w-[317px]">
          <Button variant="outline" onClick={() => navigate('/tickets')} className="flex-1">
            View tickets
          </Button>
          <Button variant="primary" onClick={resetForm} className="flex-1">
            Create another
          </Button>
        </div>
      </div>
    );
  }

  const borderClass = (field: string) =>
    errors[field] ? 'border-fw-error' : 'border-fw-secondary';

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/tickets')}
        className="inline-flex items-center gap-1 text-figma-base font-medium text-fw-link mb-6 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 max-w-[560px]">
          <div className="space-y-6">
            {/* Section 1: Asset Identification */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Asset Identification</h3>
              <div className="space-y-4">
                {/* Network Asset Type */}
                <div>
                  <label className={LABEL_CLASS}>Network Asset Type</label>
                  <div className="flex gap-2">
                    {(['connection', 'vnf'] as const).map(t => (
                      <label
                        key={t}
                        className={`${RADIO_CLASS} ${assetType === t
                          ? 'border-fw-active bg-fw-active/5 text-fw-link'
                          : 'border-fw-secondary text-fw-body hover:border-fw-active/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="assetType"
                          value={t}
                          checked={assetType === t}
                          onChange={() => setAssetType(t)}
                          className="sr-only"
                        />
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          assetType === t ? 'border-fw-active' : 'border-fw-secondary'
                        }`}>
                          {assetType === t && <span className="w-1.5 h-1.5 rounded-full bg-fw-active" />}
                        </span>
                        {t === 'connection' ? 'Connection' : 'VNF'}
                      </label>
                    ))}
                  </div>
                  <p className={HELPER_CLASS}>Select whether you are reporting against a connection or a VNF</p>
                </div>

                {/* Connection Name */}
                <div>
                  <label className={LABEL_CLASS}>Connection Name</label>
                  <select
                    value={connectionId}
                    onChange={e => handleConnectionChange(e.target.value)}
                    className={`${SELECT_CLASS} border-fw-secondary`}
                  >
                    <option value="">Select a connection (optional)</option>
                    {MOCK_CONNECTIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className={HELPER_CLASS}>Link this ticket to a specific connection</p>
                </div>

                {/* CSP Name */}
                <div>
                  <label className={LABEL_CLASS}>CSP Name</label>
                  <select
                    value={cspName}
                    onChange={e => setCspName(e.target.value)}
                    disabled={!!selectedConnection}
                    className={`${SELECT_CLASS} border-fw-secondary ${selectedConnection ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select provider (optional)</option>
                    {availableProviders.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {selectedConnection && (
                    <p className={HELPER_CLASS}>Auto-filled from connection</p>
                  )}
                </div>

                {/* VNF Name */}
                <div>
                  <label className={LABEL_CLASS}>VNF Name</label>
                  <select
                    value={vnfId}
                    onChange={e => setVnfId(e.target.value)}
                    className={`${SELECT_CLASS} border-fw-secondary`}
                    disabled={availableVnfs.length === 0}
                  >
                    <option value="">Select VNF (optional)</option>
                    {availableVnfs.map(v => (
                      <option key={v.id} value={v.id}>{v.name} - {v.hostname}</option>
                    ))}
                  </select>
                  {availableVnfs.length === 0 && (
                    <p className={HELPER_CLASS}>No VNFs available for this connection</p>
                  )}
                </div>

                {/* Billing Asset ID */}
                <div>
                  <label className={LABEL_CLASS}>Billing Asset ID</label>
                  <input
                    type="text"
                    value={billingAssetId}
                    onChange={e => setBillingAssetId(e.target.value)}
                    className={`${INPUT_CLASS} border-fw-secondary`}
                    placeholder="e.g., BILL-AST-00123"
                  />
                  <p className={HELPER_CLASS}>Customer asset reference from billing system</p>
                </div>
              </div>
            </div>

            {/* Section 2: Customer Service */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Customer Service</h3>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLASS}>
                    BC Org ID <span className="text-fw-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={bcOrgId}
                    onChange={e => { setBcOrgId(e.target.value); setErrors(prev => ({ ...prev, bcOrgId: '' })); }}
                    className={`${INPUT_CLASS} ${borderClass('bcOrgId')}`}
                    placeholder="e.g., BC-ORG-12345"
                  />
                  {errors.bcOrgId ? (
                    <p className={ERROR_CLASS}>{errors.bcOrgId}</p>
                  ) : (
                    <p className={HELPER_CLASS}>Business Customer organization identifier</p>
                  )}
                </div>
                <div>
                  <label className={LABEL_CLASS}>UB Subaccount ID</label>
                  <input
                    type="text"
                    value={ubSubaccountId}
                    onChange={e => setUbSubaccountId(e.target.value)}
                    className={`${INPUT_CLASS} border-fw-secondary`}
                    placeholder="e.g., UB-SUB-98765"
                  />
                  <p className={HELPER_CLASS}>Universal Billing subaccount identifier</p>
                </div>
              </div>
            </div>

            {/* Section 3: Issue Details */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Issue Details</h3>
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLASS}>
                    Trouble Type <span className="text-fw-error">*</span>
                  </label>
                  <select
                    value={troubleType}
                    onChange={e => { setTroubleType(e.target.value); setErrors(prev => ({ ...prev, troubleType: '' })); }}
                    className={`${SELECT_CLASS} ${borderClass('troubleType')}`}
                  >
                    <option value="">Select trouble type</option>
                    {TROUBLE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.troubleType && <p className={ERROR_CLASS}>{errors.troubleType}</p>}
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    Trouble Description <span className="text-fw-error">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })); }}
                    rows={5}
                    className={`w-full px-3 py-2 rounded-lg border bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active resize-none ${borderClass('description')}`}
                    placeholder="Describe the issue in detail"
                  />
                  {errors.description && <p className={ERROR_CLASS}>{errors.description}</p>}
                </div>

                <div>
                  <label className={LABEL_CLASS}>External Ticket ID (AOTS)</label>
                  <input
                    type="text"
                    value={externalTicketId}
                    onChange={e => setExternalTicketId(e.target.value)}
                    className={`${INPUT_CLASS} border-fw-secondary`}
                    placeholder="e.g., AOTS-TKT-00456"
                  />
                  <p className={HELPER_CLASS}>Reference to an external AOTS ticket for log correlation</p>
                </div>
              </div>
            </div>

            {/* Section 4: Customer Contact */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Customer Contact</h3>
              <div className="space-y-4">
                {/* Preferred Contact Method */}
                <div>
                  <label className={LABEL_CLASS}>Preferred Contact Method</label>
                  <div className="flex gap-2">
                    {(['phone', 'email', 'address'] as const).map(m => (
                      <label
                        key={m}
                        className={`${RADIO_CLASS} ${preferredContact === m
                          ? 'border-fw-active bg-fw-active/5 text-fw-link'
                          : 'border-fw-secondary text-fw-body hover:border-fw-active/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="preferredContact"
                          value={m}
                          checked={preferredContact === m}
                          onChange={() => setPreferredContact(m)}
                          className="sr-only"
                        />
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          preferredContact === m ? 'border-fw-active' : 'border-fw-secondary'
                        }`}>
                          {preferredContact === m && <span className="w-1.5 h-1.5 rounded-full bg-fw-active" />}
                        </span>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>
                      Phone {preferredContact === 'phone' && <span className="text-fw-link text-figma-xs">(preferred)</span>}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={`${INPUT_CLASS} ${preferredContact === 'phone' ? 'border-fw-active' : 'border-fw-secondary'}`}
                      placeholder="+1 555 123-4567"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>
                      Email {preferredContact === 'email' && <span className="text-fw-link text-figma-xs">(preferred)</span>}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`${INPUT_CLASS} ${preferredContact === 'email' ? 'border-fw-active' : 'border-fw-secondary'}`}
                      placeholder="user@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>
                    Street Address {preferredContact === 'address' && <span className="text-fw-link text-figma-xs">(preferred)</span>}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className={`${INPUT_CLASS} ${preferredContact === 'address' ? 'border-fw-active' : 'border-fw-secondary'}`}
                    placeholder="123 Main St, Suite 100, Dallas, TX 75201"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Network Information (collapsible) */}
            <div>
              <button
                onClick={() => setShowNetworkInfo(!showNetworkInfo)}
                className="flex items-center gap-2 text-figma-base font-semibold text-fw-heading mb-4 hover:text-fw-link transition-colors"
              >
                {showNetworkInfo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Network Information
                <span className="text-figma-xs font-normal text-fw-bodyLight">(optional)</span>
              </button>
              {showNetworkInfo && (
                <div className="space-y-4 pl-6 border-l-2 border-fw-secondary">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>IPE Hostname</label>
                      <input
                        type="text"
                        value={ipeHostname}
                        onChange={e => setIpeHostname(e.target.value)}
                        className={`${INPUT_CLASS} border-fw-secondary`}
                        placeholder="e.g., MX304-SV1-A"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>TAO Location ID</label>
                      <input
                        type="text"
                        value={taoLocationId}
                        onChange={e => setTaoLocationId(e.target.value)}
                        className={`${INPUT_CLASS} border-fw-secondary`}
                        placeholder="e.g., TAO-SJC-01"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>IPE Logic Port (CSP/TAO)</label>
                      <input
                        type="text"
                        value={ipeLogicPort}
                        onChange={e => setIpeLogicPort(e.target.value)}
                        className={`${INPUT_CLASS} border-fw-secondary`}
                        placeholder="e.g., 100GE-0/0/0"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Equinix Circuit ID</label>
                      <input
                        type="text"
                        value={equinixCircuitId}
                        onChange={e => setEquinixCircuitId(e.target.value)}
                        className={`${INPUT_CLASS} border-fw-secondary`}
                        placeholder="e.g., EQX-CKT-12345"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 6: Attachments */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Attachment (AOTS TM Log)</h3>
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging ? 'border-fw-active bg-fw-active/5' : 'border-fw-secondary bg-fw-wash'
                }`}
              >
                <Upload className="h-6 w-6 text-fw-bodyLight mx-auto mb-2" />
                <p className="text-figma-sm font-medium text-fw-body mb-1">
                  Drag and drop files here
                </p>
                <p className="text-figma-sm text-fw-bodyLight mb-3">or</p>
                <label className="inline-flex items-center justify-center h-8 px-4 rounded-full border border-fw-active text-figma-sm font-medium text-fw-link cursor-pointer hover:bg-fw-active/5 transition-colors">
                  Browse files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-fw-base border border-fw-secondary"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-fw-wash">
                          <span className="text-figma-sm font-bold text-fw-heading">{file.type}</span>
                        </div>
                        <div>
                          <p className="text-figma-base font-medium text-fw-heading">{file.name}</p>
                          <p className="text-figma-sm text-fw-bodyLight">{file.size}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="p-1.5 rounded hover:bg-fw-wash text-fw-body hover:text-fw-error transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                icon={Check}
                onClick={handleSubmit}
              >
                Create ticket
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Summary sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4">
            <h3 className="text-figma-base font-semibold text-fw-heading">Ticket Summary</h3>
            <div className="space-y-3 text-figma-sm">
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Service Line</span>
                <span className="text-fw-heading font-medium">NBAdvanced</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Asset Type</span>
                <span className="text-fw-heading font-medium">{assetType === 'vnf' ? 'VNF' : 'Connection'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Connection</span>
                <span className="text-fw-heading font-medium truncate ml-4 max-w-[160px]">
                  {selectedConnection?.name || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Provider</span>
                <span className="text-fw-heading font-medium">{cspName || 'None'}</span>
              </div>
              {vnfId && (
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">VNF Asset</span>
                  <span className="text-fw-heading font-medium">
                    {availableVnfs.find(v => v.id === vnfId)?.hostname || '-'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-fw-bodyLight">Trouble Type</span>
                <span className="text-fw-heading font-medium">
                  {TROUBLE_TYPES.find(t => t.value === troubleType)?.label || 'Not selected'}
                </span>
              </div>
              <div className="border-t border-fw-secondary pt-3 space-y-3">
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Reported Product</span>
                  <span className="text-fw-heading font-medium">AI-grade network</span>
                </div>
                {bcOrgId && (
                  <div className="flex justify-between">
                    <span className="text-fw-bodyLight">BC Org ID</span>
                    <span className="text-fw-heading font-medium">{bcOrgId}</span>
                  </div>
                )}
                {ubSubaccountId && (
                  <div className="flex justify-between">
                    <span className="text-fw-bodyLight">UB Subaccount</span>
                    <span className="text-fw-heading font-medium">{ubSubaccountId}</span>
                  </div>
                )}
                {externalTicketId && (
                  <div className="flex justify-between">
                    <span className="text-fw-bodyLight">AOTS Ref</span>
                    <span className="text-fw-heading font-medium">{externalTicketId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

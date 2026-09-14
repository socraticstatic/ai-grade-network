import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, Clock, User, Paperclip, FileText, Search, Edit2, Save, X, MessageSquare, ArrowUpDown, Ticket, Send } from 'lucide-react';
import { Button } from '../common/Button';

type StageStep = {
  label: string;
  completed: boolean;
  active: boolean;
};

interface ConversationMessage {
  id: string;
  author: string;
  role: 'customer' | 'support';
  timestamp: string;
  body: string;
  attachments?: string[];
}

interface TicketData {
  id: string;
  ticketNumber: string;
  troubleType: 'info' | 'trouble' | 'configuration';
  status: 'open' | 'in-progress' | 'pending' | 'closed';
  connection: string;
  vnf: string;
  csp: string;
  description: string;
  opened: string;
  lastUpdate: string;
  requestorName: string;
  authorName: string;
  email: string;
  startDate: string;
  endDate: string;
  phone: string;
  attachment: string;
  // SD3 fields
  assetType: 'vnf' | 'connection';
  bcOrgId: string;
  ubSubaccountId: string;
  billingAssetId: string;
  externalTicketId: string;
  preferredContact: 'phone' | 'email' | 'address';
  ipeHostname: string;
  taoLocationId: string;
  ipeLogicPort: string;
  equinixCircuitId: string;
  steps: StageStep[];
  activityLog: ActivityEntry[];
  conversation: ConversationMessage[];
}

interface ActivityEntry {
  date: string;
  topic: string;
  user: string;
  message: string;
}

const TROUBLE_TYPE_LABELS: Record<string, string> = {
  info: 'Information',
  trouble: 'Trouble',
  configuration: 'Configuration',
};

const TROUBLE_TYPE_STYLES: Record<string, string> = {
  info: 'bg-fw-wash text-fw-bodyLight',
  trouble: 'bg-fw-error/10 text-fw-error',
  configuration: 'bg-fw-active/10 text-fw-link',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  pending: 'Pending',
  closed: 'Closed',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-fw-active/10 text-fw-link',
  'in-progress': 'bg-fw-warn/10 text-fw-warn',
  pending: 'bg-fw-neutral text-fw-bodyLight',
  closed: 'bg-fw-success/10 text-fw-success',
};

const MOCK_TICKET: TicketData = {
  id: '1',
  ticketNumber: 'SDNTCK0006232',
  troubleType: 'trouble',
  status: 'open',
  connection: 'AWS Interconnect – last mile - US East',
  vnf: 'PALO-MACD-TEST1',
  csp: 'AWS',
  description: `SYSLOG: tunnel-status-down

Tunnel between PALO-MACD-TEST1 and AWS us-east-1 is reporting down status since 06:55 PM.

Affected VNF: Palo Alto Firewall (PALO-MACD-TEST1)
Connection: AWS Interconnect – last mile - US East
Impact: Traffic failover to secondary path active.

Requesting investigation and restoration of primary tunnel.`,
  opened: '2024/10/13, 06:55 PM',
  lastUpdate: '2024/10/13, 12:04 AM',
  requestorName: 'Alpha Corp',
  authorName: 'John Martinez',
  email: 'j.martinez@alphacorp.com',
  startDate: '2024/10/13, 2:00 PM',
  endDate: '2024/10/13, 3:00 PM',
  phone: '+1 973 1234567',
  attachment: 'tunnel-status-log.txt',
  assetType: 'vnf',
  bcOrgId: 'BC-ORG-44821',
  ubSubaccountId: 'UB-SUB-90112',
  billingAssetId: 'BILL-AST-00789',
  externalTicketId: 'AOTS-TKT-88432',
  preferredContact: 'email',
  ipeHostname: 'MX304-DC2-A',
  taoLocationId: 'TAO-ASH-01',
  ipeLogicPort: '100GE-0/0/0',
  equinixCircuitId: 'EQX-CKT-55901',
  steps: [
    { label: 'Submitted', completed: true, active: false },
    { label: 'Acknowledged', completed: false, active: true },
    { label: 'In progress', completed: false, active: false },
    { label: 'Completed', completed: false, active: false },
  ],
  activityLog: [
    { date: '2024/10/13 8:50', topic: 'General', user: 'system', message: 'action selected : Closed' },
    { date: '2024/10/13 8:50', topic: 'General', user: 'system', message: 'Change state moved to Closed' },
    { date: '2024/10/13 8:50', topic: 'MFGLVT14F,CTA...', user: 'system', message: 'Now really closed.' },
    { date: '2024/10/13 8:50', topic: 'General', user: 'system', message: 'Automation job group 4044 has been successfuly completed.' },
  ],
  conversation: [
    {
      id: 'msg-1',
      author: 'John Martinez',
      role: 'customer',
      timestamp: '2024/10/13, 06:55 PM',
      body: 'We are seeing tunnel-status-down alerts on PALO-MACD-TEST1. Traffic has failed over to secondary but we need the primary tunnel restored ASAP. This is impacting production workloads on AWS us-east-1.',
      attachments: ['tunnel-status-log.txt'],
    },
    {
      id: 'msg-2',
      author: 'Sarah Patel',
      role: 'support',
      timestamp: '2024/10/13, 07:12 PM',
      body: 'Thank you for reporting this, John. I can see the tunnel down event in our monitoring. I\'m initiating diagnostics on the IPE side now. Can you confirm whether you\'re seeing any BGP session flaps on your end?',
    },
    {
      id: 'msg-3',
      author: 'John Martinez',
      role: 'customer',
      timestamp: '2024/10/13, 07:25 PM',
      body: 'Confirmed. BGP session to 169.254.10.1 dropped at 18:53 UTC and has not re-established. The secondary path via us-west-2 is holding but we\'re seeing 12ms additional latency.',
    },
    {
      id: 'msg-4',
      author: 'Sarah Patel',
      role: 'support',
      timestamp: '2024/10/13, 07:45 PM',
      body: 'Found the issue. There was a fiber cut on the cross-connect at the Ashburn facility. Our NOC has dispatched a technician. ETA for repair is 90 minutes. I\'ll update you as soon as the physical layer is restored and we can bring the BGP session back up.',
    },
    {
      id: 'msg-5',
      author: 'John Martinez',
      role: 'customer',
      timestamp: '2024/10/13, 08:00 PM',
      body: 'Understood. We can tolerate the secondary path for that window. Please notify us before you bring the primary back so we can monitor the failback.',
    },
  ],
};

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'communication' | 'activity'>('communication');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [resolutionCode, setResolutionCode] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [tags, setTags] = useState<string[]>(['tunnel-down', 'fiber-cut']);
  const [tagInput, setTagInput] = useState('');
  const TAG_SUGGESTIONS = ['bgp', 'latency', 'packet-loss', 'fiber-cut', 'tunnel-down', 'config-error', 'capacity', 'failover', 'maintenance', 'dns', 'routing', 'hardware', 'software', 'security', 'billing'];
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const t = tag.toLowerCase().trim().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const filteredSuggestions = TAG_SUGGESTIONS.filter(s => !tags.includes(s) && s.includes(tagInput.toLowerCase()));

  const [messages, setMessages] = useState<ConversationMessage[]>(MOCK_TICKET.conversation);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'communication') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const newMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      author: 'John Martinez',
      role: 'customer',
      timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      body: replyText.trim(),
    };
    setMessages(prev => [...prev, newMsg]);
    setReplyText('');
    // Simulate support reply after 2 seconds
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        author: 'Sarah Patel',
        role: 'support',
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        body: 'Thank you for the update. I\'m looking into this now and will follow up shortly.',
      }]);
    }, 2000);
  };

  const [editData, setEditData] = useState({
    description: MOCK_TICKET.description,
    troubleType: MOCK_TICKET.troubleType,
    status: MOCK_TICKET.status,
    connection: MOCK_TICKET.connection,
    csp: MOCK_TICKET.csp,
    vnf: MOCK_TICKET.vnf,
    requestorName: MOCK_TICKET.requestorName,
    authorName: MOCK_TICKET.authorName,
    email: MOCK_TICKET.email,
    phone: MOCK_TICKET.phone,
    startDate: MOCK_TICKET.startDate,
    endDate: MOCK_TICKET.endDate,
    bcOrgId: MOCK_TICKET.bcOrgId,
    ubSubaccountId: MOCK_TICKET.ubSubaccountId,
    billingAssetId: MOCK_TICKET.billingAssetId,
    externalTicketId: MOCK_TICKET.externalTicketId,
    ipeHostname: MOCK_TICKET.ipeHostname,
    taoLocationId: MOCK_TICKET.taoLocationId,
    ipeLogicPort: MOCK_TICKET.ipeLogicPort,
    equinixCircuitId: MOCK_TICKET.equinixCircuitId,
  });

  const ticket = MOCK_TICKET;

  const handleSave = () => {
    setIsEditing(false);
    window.addToast?.({ type: 'success', title: 'Ticket Updated', message: 'Changes saved successfully', duration: 3000 });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/tickets')}>
            Back
          </Button>
          <Button variant="ghost" size="md" icon={RefreshCw} onClick={() => window.addToast?.({ type: 'success', title: 'Refreshed', message: 'Ticket is up to date.', duration: 2000 })}>
            Refresh
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>
                Save
              </Button>
              <Button variant="outline" size="sm" icon={X} onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon={Edit2} onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCloseModal(true)} disabled={isClosed}>
                {isClosed ? 'Closed' : 'Close Ticket'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.addToast?.({ type: 'info', title: 'Return to customer', message: 'Returning the ticket to the customer is available in the full product.', duration: 3000 })}>
                Return to customer
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/tickets')}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Ticket header */}
      <div className="mb-6">
        <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">
          {ticket.ticketNumber}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-figma-sm font-medium ${TROUBLE_TYPE_STYLES[ticket.troubleType]}`}>
            {TROUBLE_TYPE_LABELS[ticket.troubleType]}
          </span>
          <div className="w-px h-4 bg-fw-secondary" />
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-figma-sm font-medium ${STATUS_STYLES[isClosed ? 'closed' : editData.status]}`}>
            {isClosed ? 'Closed' : STATUS_LABELS[editData.status]}
          </span>
          <div className="w-px h-4 bg-fw-secondary" />
          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">
            {ticket.connection}
          </span>
          {ticket.vnf !== '-' && (
            <>
              <div className="w-px h-4 bg-fw-secondary" />
              <span className="text-figma-base font-mono text-figma-sm text-fw-bodyLight">
                {ticket.vnf}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress stepper - matches Figma ticket-detail.png */}
      <div className="flex items-center justify-between mb-8">
        {ticket.steps.map((step, index) => (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              {step.completed ? (
                <div className="h-8 w-8 rounded-full bg-fw-link flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              ) : step.active ? (
                <div className="h-8 w-8 rounded-full border-2 border-fw-link flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-fw-link" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full border-2 border-fw-secondary flex items-center justify-center">
                  <span className="text-figma-sm font-medium text-fw-bodyLight">{index + 1}</span>
                </div>
              )}
              <span className={`mt-2 text-figma-base font-medium tracking-[-0.03em] whitespace-nowrap ${
                step.completed || step.active ? 'text-fw-heading' : 'text-fw-bodyLight'
              }`}>
                {step.label}
              </span>
            </div>
            {index < ticket.steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                step.completed ? 'bg-fw-link' : 'bg-fw-secondary'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* EDIT MODE: full SD3 form */}
      {isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 max-w-[560px] space-y-6">
            {/* Asset Identification */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Asset Identification</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-figma-base font-medium text-fw-heading mb-2">Connection Name</label>
                  <select value={editData.connection} onChange={e => setEditData({ ...editData, connection: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active">
                    <option value="">None</option>
                    <option value="AWS Interconnect – last mile - US East">AWS Interconnect – last mile - US East</option>
                    <option value="Azure ExpressRoute - West Europe">Azure ExpressRoute - West Europe</option>
                    <option value="Google Cloud Interconnect - US Central">Google Cloud Interconnect - US Central</option>
                    <option value="Oracle FastConnect - US Phoenix">Oracle FastConnect - US Phoenix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-figma-base font-medium text-fw-heading mb-2">CSP Name</label>
                  <select value={editData.csp} onChange={e => setEditData({ ...editData, csp: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active">
                    <option value="">None</option>
                    <option value="AWS">AWS</option>
                    <option value="Azure">Azure</option>
                    <option value="Google Cloud">Google Cloud</option>
                    <option value="Oracle">Oracle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-figma-base font-medium text-fw-heading mb-2">VNF / Asset</label>
                  <input type="text" value={editData.vnf} onChange={e => setEditData({ ...editData, vnf: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active" placeholder="VNF hostname" />
                </div>
              </div>
            </div>

            {/* Issue Details */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Issue Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-figma-base font-medium text-fw-heading mb-2">Trouble Type <span className="text-fw-error">*</span></label>
                  <select value={editData.troubleType} onChange={e => setEditData({ ...editData, troubleType: e.target.value as 'info' | 'trouble' | 'configuration' })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active">
                    <option value="info">Information Request</option>
                    <option value="trouble">Trouble Report</option>
                    <option value="configuration">Configuration Change</option>
                  </select>
                </div>
                <div>
                  <label className="block text-figma-base font-medium text-fw-heading mb-2">Trouble Description <span className="text-fw-error">*</span></label>
                  <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} rows={6} className="w-full px-3 py-2 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active resize-none" />
                </div>
                <div>
                  <label className="block text-figma-base font-medium text-fw-heading mb-2">Status</label>
                  <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active">
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Contact */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-4">Customer Contact</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-figma-base font-medium text-fw-heading mb-2">Organization</label>
                    <input type="text" value={editData.requestorName} onChange={e => setEditData({ ...editData, requestorName: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active" />
                  </div>
                  <div>
                    <label className="block text-figma-base font-medium text-fw-heading mb-2">Author</label>
                    <input type="text" value={editData.authorName} onChange={e => setEditData({ ...editData, authorName: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-figma-base font-medium text-fw-heading mb-2">Phone</label>
                    <input type="tel" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active" placeholder="+1 555 123-4567" />
                  </div>
                  <div>
                    <label className="block text-figma-base font-medium text-fw-heading mb-2">Email</label>
                    <input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary sidebar in edit mode */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-fw-secondary bg-fw-base p-5 space-y-4">
              <h3 className="text-figma-base font-semibold text-fw-heading">Ticket Summary</h3>
              <div className="space-y-3 text-figma-sm">
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Ticket</span>
                  <span className="text-fw-heading font-medium">{ticket.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Service Line</span>
                  <span className="text-fw-heading font-medium">NBAdvanced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Connection</span>
                  <span className="text-fw-heading font-medium truncate ml-4 max-w-[160px]">{editData.connection || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Trouble Type</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-figma-sm font-medium ${TROUBLE_TYPE_STYLES[editData.troubleType]}`}>
                    {TROUBLE_TYPE_LABELS[editData.troubleType]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-figma-sm font-medium ${STATUS_STYLES[editData.status]}`}>
                    {STATUS_LABELS[editData.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* READ MODE: detail cards */}
      {!isEditing && (
      <div className="grid grid-cols-12 gap-6">
        {/* Main content - left side */}
        <div className="col-span-8 space-y-6">
          {/* Description card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
            <h3 className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-3">
              Trouble Description
            </h3>
            <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em] whitespace-pre-line">
              {editData.description}
            </p>
          </div>

          {/* Activity / Communication tabs */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-4 pb-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('communication')}
                  className={`inline-flex items-center gap-2 pb-3 text-figma-base font-medium tracking-[-0.03em] no-rounded border-b-2 transition-colors ${
                    activeTab === 'communication'
                      ? 'text-fw-heading border-fw-active'
                      : 'text-fw-bodyLight border-transparent hover:text-fw-heading'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Communication
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`inline-flex items-center gap-2 pb-3 text-figma-base font-medium tracking-[-0.03em] no-rounded border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'text-fw-heading border-fw-active'
                      : 'text-fw-bodyLight border-transparent hover:text-fw-heading'
                  }`}
                >
                  Activity log
                </button>
              </div>
              <div className="relative pb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] h-4 w-4 text-fw-link" />
                <input
                  type="text"
                  placeholder="Search keyword ..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  className="h-9 w-[280px] pl-9 pr-4 rounded-full border border-fw-secondary bg-fw-base text-figma-base text-fw-heading placeholder:text-fw-bodyLight focus:outline-none focus:ring-1 focus:ring-fw-active tracking-[-0.03em]"
                />
              </div>
            </div>

            {/* Communication tab - threaded conversation */}
            {activeTab === 'communication' && (
              <div className="flex flex-col">
                {/* Messages */}
                <div className="px-6 py-4 space-y-4 max-h-[480px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${msg.role === 'customer' ? 'order-2' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-figma-xs font-medium ${
                            msg.role === 'support' ? 'bg-fw-link' : 'bg-fw-heading'
                          }`}>
                            {msg.author.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-figma-sm font-medium text-fw-heading">{msg.author}</span>
                          {msg.role === 'support' && (
                            <span className="text-figma-xs px-1.5 py-0.5 rounded bg-fw-link/10 text-fw-link font-medium">Support</span>
                          )}
                          <span className="text-figma-xs text-fw-bodyLight">{msg.timestamp}</span>
                        </div>
                        <div className={`rounded-2xl px-4 py-3 text-figma-base leading-relaxed ${
                          msg.role === 'customer'
                            ? 'bg-fw-link text-white rounded-tr-sm'
                            : 'bg-fw-wash text-fw-heading rounded-tl-sm'
                        }`}>
                          {msg.body}
                        </div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-1.5 flex gap-2">
                            {msg.attachments.map((file, i) => (
                              <button key={i} className="inline-flex items-center gap-1.5 text-figma-xs text-fw-link hover:underline">
                                <Paperclip className="h-3 w-3" />
                                {file}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                <div className="border-t border-fw-secondary px-6 py-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                        placeholder="Type your reply..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-fw-secondary bg-fw-base text-figma-base text-fw-heading placeholder:text-fw-bodyLight focus:outline-none focus:ring-1 focus:ring-fw-active resize-none"
                      />
                      <button className="absolute right-3 bottom-3 text-fw-bodyLight hover:text-fw-link transition-colors">
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="h-10 w-10 rounded-xl bg-fw-link text-white flex items-center justify-center hover:bg-fw-linkHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-figma-xs text-fw-bodyLight mt-2">Press Enter to send, Shift+Enter for new line</p>
                </div>
              </div>
            )}

            {/* Activity log tab */}
            {activeTab === 'activity' && (
            <table className="w-full">
              <thead>
                <tr className="bg-fw-wash border-y border-fw-secondary">
                  <th className="px-6 py-3 text-left text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                    <span className="inline-flex items-center gap-1">
                      Date
                      <ArrowUpDown className="h-3.5 w-3.5 text-fw-bodyLight" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                    <span className="inline-flex items-center gap-1">
                      Topic
                      <ArrowUpDown className="h-3.5 w-3.5 text-fw-bodyLight" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                    <span className="inline-flex items-center gap-1">
                      User
                      <ArrowUpDown className="h-3.5 w-3.5 text-fw-bodyLight" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                    <span className="inline-flex items-center gap-1">
                      Message
                      <ArrowUpDown className="h-3.5 w-3.5 text-fw-bodyLight" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ticket.activityLog.map((entry, index) => (
                  <tr key={index} className="border-b border-fw-secondary last:border-b-0 hover:bg-fw-wash transition-colors">
                    <td className="px-6 py-3 text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                      {entry.date}
                    </td>
                    <td className="px-6 py-3 text-figma-base font-medium text-fw-body tracking-[-0.03em]">
                      {entry.topic}
                    </td>
                    <td className="px-6 py-3 text-figma-base font-medium text-fw-body tracking-[-0.03em]">
                      {entry.user}
                    </td>
                    <td className="px-6 py-3 text-figma-base font-medium text-fw-heading tracking-[-0.03em]">
                      {entry.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Ticket Details card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-fw-heading" />
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Ticket Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Service Line</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">NBAdvanced</p>
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Trouble Type</p>
                {isEditing ? (
                  <select value={editData.troubleType} onChange={(e) => setEditData({ ...editData, troubleType: e.target.value as 'info' | 'trouble' | 'configuration' })} className="fw-select">
                    <option value="info">Information Request</option>
                    <option value="trouble">Trouble Report</option>
                    <option value="configuration">Configuration Change</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-figma-sm font-medium ${TROUBLE_TYPE_STYLES[editData.troubleType]}`}>
                    {TROUBLE_TYPE_LABELS[editData.troubleType]}
                  </span>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Connection</p>
                {isEditing ? (
                  <select value={editData.connection} onChange={(e) => setEditData({ ...editData, connection: e.target.value })} className="fw-select">
                    <option value="">None</option>
                    <option value="AWS Interconnect – last mile - US East">AWS Interconnect – last mile - US East</option>
                    <option value="Azure ExpressRoute - West Europe">Azure ExpressRoute - West Europe</option>
                    <option value="Google Cloud Interconnect - US Central">Google Cloud Interconnect - US Central</option>
                    <option value="Oracle FastConnect - US Phoenix">Oracle FastConnect - US Phoenix</option>
                  </select>
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.connection || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">CSP</p>
                {isEditing ? (
                  <select value={editData.csp} onChange={(e) => setEditData({ ...editData, csp: e.target.value })} className="fw-select">
                    <option value="">None</option>
                    <option value="AWS">AWS</option>
                    <option value="Azure">Azure</option>
                    <option value="Google Cloud">Google Cloud</option>
                    <option value="Oracle">Oracle</option>
                  </select>
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.csp || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">VNF / Asset</p>
                {isEditing ? (
                  <input type="text" value={editData.vnf} onChange={(e) => setEditData({ ...editData, vnf: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-mono text-figma-sm text-fw-heading tracking-[-0.03em]">{editData.vnf || '-'}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Billing Asset ID</p>
                {isEditing ? (
                  <input type="text" value={editData.billingAssetId} onChange={(e) => setEditData({ ...editData, billingAssetId: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.billingAssetId || '-'}</p>
                )}
              </div>
              {ticket.externalTicketId && (
                <div>
                  <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">AOTS Reference</p>
                  {isEditing ? (
                    <input type="text" value={editData.externalTicketId} onChange={(e) => setEditData({ ...editData, externalTicketId: e.target.value })} className="fw-input" />
                  ) : (
                    <p className="text-figma-base font-mono text-figma-sm text-fw-link tracking-[-0.03em]">{ticket.externalTicketId}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Service card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-fw-heading" />
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Customer Service</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">BC Org ID</p>
                {isEditing ? (
                  <input type="text" value={editData.bcOrgId} onChange={(e) => setEditData({ ...editData, bcOrgId: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.bcOrgId}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">UB Subaccount ID</p>
                {isEditing ? (
                  <input type="text" value={editData.ubSubaccountId} onChange={(e) => setEditData({ ...editData, ubSubaccountId: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.ubSubaccountId || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Network Information card */}
          {(ticket.ipeHostname || ticket.taoLocationId || ticket.ipeLogicPort || ticket.equinixCircuitId || isEditing) && (
            <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown className="h-5 w-5 text-fw-heading" />
                <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Network Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">IPE Hostname</p>
                  {isEditing ? (
                    <input type="text" value={editData.ipeHostname} onChange={(e) => setEditData({ ...editData, ipeHostname: e.target.value })} className="fw-input" />
                  ) : (
                    <p className="text-figma-base font-mono text-figma-sm text-fw-heading tracking-[-0.03em]">{ticket.ipeHostname || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">TAO Location ID</p>
                  {isEditing ? (
                    <input type="text" value={editData.taoLocationId} onChange={(e) => setEditData({ ...editData, taoLocationId: e.target.value })} className="fw-input" />
                  ) : (
                    <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.taoLocationId || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">IPE Logic Port (CSP/TAO)</p>
                  {isEditing ? (
                    <input type="text" value={editData.ipeLogicPort} onChange={(e) => setEditData({ ...editData, ipeLogicPort: e.target.value })} className="fw-input" />
                  ) : (
                    <p className="text-figma-base font-mono text-figma-sm text-fw-heading tracking-[-0.03em]">{ticket.ipeLogicPort || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Equinix Circuit ID</p>
                  {isEditing ? (
                    <input type="text" value={editData.equinixCircuitId} onChange={(e) => setEditData({ ...editData, equinixCircuitId: e.target.value })} className="fw-input" />
                  ) : (
                    <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.equinixCircuitId || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Time info card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-fw-heading" />
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Time</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Opened</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.opened}</p>
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Last update</p>
                <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{ticket.lastUpdate}</p>
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Start date</p>
                {isEditing ? (
                  <input type="text" value={editData.startDate} onChange={(e) => setEditData({ ...editData, startDate: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.startDate}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">End date</p>
                {isEditing ? (
                  <input type="text" value={editData.endDate} onChange={(e) => setEditData({ ...editData, endDate: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.endDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Category Tags card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Category Tags</h3>
              <span className="text-figma-xs text-fw-bodyLight">{tags.length} tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fw-link/10 text-fw-link text-figma-sm font-medium">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-fw-error transition-colors ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <span className="text-figma-sm text-fw-bodyLight italic">No tags added</span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                onFocus={() => setShowTagSuggestions(true)}
                onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Add tag..."
                className="w-full h-9 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-sm text-fw-heading placeholder:text-fw-bodyLight focus:outline-none focus:ring-1 focus:ring-fw-active"
              />
              {showTagSuggestions && tagInput && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-10 z-20 bg-fw-base border border-fw-secondary rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {filteredSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => addTag(s)}
                      className="w-full px-3 py-2 text-left text-figma-sm text-fw-heading hover:bg-fw-wash transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Requestor card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-fw-heading" />
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Requestor</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Organization</p>
                {isEditing ? (
                  <input type="text" value={editData.requestorName} onChange={(e) => setEditData({ ...editData, requestorName: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.requestorName}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Author</p>
                {isEditing ? (
                  <input type="text" value={editData.authorName} onChange={(e) => setEditData({ ...editData, authorName: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.authorName}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Email</p>
                {isEditing ? (
                  <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-link tracking-[-0.03em]">{editData.email}</p>
                )}
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Phone</p>
                {isEditing ? (
                  <input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="fw-input" />
                ) : (
                  <p className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{editData.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center justify-between">
              <span className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em]">Status</span>
              {isEditing ? (
                <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="fw-select" style={{ width: 'auto', paddingRight: '2.5rem' }}>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-figma-sm font-medium ${STATUS_STYLES[isClosed ? 'closed' : editData.status]}`}>
                  {isClosed ? 'Closed' : STATUS_LABELS[editData.status]}
                </span>
              )}
            </div>
          </div>

          {/* Attachments card */}
          <div className="bg-fw-base rounded-2xl border border-fw-secondary p-5">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-5 w-5 text-fw-heading" />
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Attachments</h3>
            </div>
            <button className="inline-flex items-center gap-2 py-2 text-figma-base font-medium text-fw-body tracking-[-0.03em] hover:text-fw-link transition-colors">
              <FileText className="h-5 w-5" />
              {ticket.attachment}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Close Ticket Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-fw-base rounded-2xl shadow-xl border border-fw-secondary w-full max-w-md p-6">
            <h3 className="text-figma-lg font-semibold text-fw-heading mb-4">Close Ticket</h3>
            <p className="text-figma-sm text-fw-bodyLight mb-4">
              Select a resolution code and add notes before closing this ticket.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-figma-sm font-medium text-fw-heading mb-1">
                  Resolution Code <span className="text-fw-error">*</span>
                </label>
                <select
                  value={resolutionCode}
                  onChange={e => setResolutionCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active"
                >
                  <option value="">Select resolution</option>
                  <option value="resolved-customer">Resolved by Customer</option>
                  <option value="resolved-support">Resolved by Support</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="cannot-reproduce">Cannot Reproduce</option>
                  <option value="configuration-applied">Configuration Applied</option>
                </select>
              </div>
              <div>
                <label className="block text-figma-sm font-medium text-fw-heading mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-fw-secondary bg-fw-base text-figma-base text-fw-heading focus:outline-none focus:ring-1 focus:ring-fw-active resize-none"
                  placeholder="Add resolution details..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowCloseModal(false); setResolutionCode(''); setResolutionNotes(''); }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={!resolutionCode}
                onClick={() => {
                  setIsClosed(true);
                  setShowCloseModal(false);
                  window.addToast?.({ type: 'success', title: 'Ticket Closed', message: `Resolution: ${resolutionCode}`, duration: 3000 });
                }}
              >
                Close Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

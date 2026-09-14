import { useState } from 'react';
import { Plus, Percent, RefreshCw, Calendar, DollarSign, X, Check, AlertCircle, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { TermDiscount, RenewalPolicy } from '../../../store/slices/billingSlice';

type TabView = 'discounts' | 'policies' | 'agreements';

export function TermDiscountsManager() {
  const [activeTab, setActiveTab] = useState<TabView>('discounts');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<TermDiscount | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<RenewalPolicy | null>(null);

  const {
    termDiscounts,
    renewalPolicies,
    connectionTermAgreements,
    addTermDiscount,
    updateTermDiscount,
    deleteTermDiscount,
    addRenewalPolicy,
    updateRenewalPolicy,
    deleteRenewalPolicy,
  } = useStore();

  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setShowDiscountModal(true);
  };

  const handleEditDiscount = (discount: TermDiscount) => {
    setEditingDiscount(discount);
    setShowDiscountModal(true);
  };

  const handleAddPolicy = () => {
    setEditingPolicy(null);
    setShowPolicyModal(true);
  };

  const handleEditPolicy = (policy: RenewalPolicy) => {
    setEditingPolicy(policy);
    setShowPolicyModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-fw-heading">Terms & Discount Management</h3>
            <p className="text-sm text-fw-bodyLight mt-1">
              Configure term commitment discounts, renewal policies, and manage active agreements
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-fw-secondary mb-6">
          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'discounts'
                ? 'border-fw-link text-fw-link'
                : 'border-transparent text-fw-bodyLight hover:text-fw-body'
            }`}
          >
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Term Discounts
            </div>
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'policies'
                ? 'border-fw-link text-fw-link'
                : 'border-transparent text-fw-bodyLight hover:text-fw-body'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Renewal Policies
            </div>
          </button>
          <button
            onClick={() => setActiveTab('agreements')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'agreements'
                ? 'border-fw-link text-fw-link'
                : 'border-transparent text-fw-bodyLight hover:text-fw-body'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Active Agreements ({connectionTermAgreements.length})
            </div>
          </button>
        </div>

        {/* Term Discounts Tab */}
        {activeTab === 'discounts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-fw-bodyLight">
                {termDiscounts.length} term discount{termDiscounts.length !== 1 ? 's' : ''} configured
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={handleAddDiscount}
              >
                Add Term Discount
              </Button>
            </div>

            <div className="space-y-3">
              {termDiscounts.map((discount) => (
                <div
                  key={discount.id}
                  className="bg-fw-wash border border-fw-secondary rounded-lg p-4 hover:border-fw-link transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-fw-body">{discount.name}</h4>
                        {discount.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-fw-bodyLight mb-3">{discount.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-fw-bodyLight">Term Length:</span>
                          <p className="font-medium text-fw-body">
                            {discount.termLength} {discount.termUnit}
                          </p>
                        </div>
                        <div>
                          <span className="text-fw-bodyLight">Discount:</span>
                          <p className="font-medium text-fw-body">{discount.discountPercentage}%</p>
                        </div>
                        <div>
                          <span className="text-fw-bodyLight">Min Spend:</span>
                          <p className="font-medium text-fw-body">
                            {discount.minimumSpend ? `$${discount.minimumSpend.toLocaleString()}` : 'None'}
                          </p>
                        </div>
                        <div>
                          <span className="text-fw-bodyLight">Applicable Types:</span>
                          <p className="font-medium text-fw-body">{discount.applicableConnectionTypes.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditDiscount(discount)}
                        className="p-2 text-fw-bodyLight hover:text-fw-link transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this term discount?')) {
                            deleteTermDiscount(discount.id);
                            window.addToast({
                              type: 'success',
                              title: 'Deleted',
                              message: 'Term discount deleted successfully',
                              duration: 3000
                            });
                          }
                        }}
                        className="p-2 text-fw-bodyLight hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Renewal Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-fw-bodyLight">
                {renewalPolicies.length} renewal polic{renewalPolicies.length !== 1 ? 'ies' : 'y'} configured
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={handleAddPolicy}
              >
                Add Renewal Policy
              </Button>
            </div>

            <div className="space-y-3">
              {renewalPolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="bg-fw-wash border border-fw-secondary rounded-lg p-4 hover:border-fw-link transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-fw-body">{policy.name}</h4>
                        {policy.isDefault && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                        {policy.autoRenew ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Auto-Renew
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Manual Renewal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-fw-bodyLight mb-3">{policy.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-fw-bodyLight">Notification:</span>
                          <p className="font-medium text-fw-body">{policy.renewalNotificationDays} days</p>
                        </div>
                        <div>
                          <span className="text-fw-bodyLight">Grace Period:</span>
                          <p className="font-medium text-fw-body">{policy.gracePeriodDays} days</p>
                        </div>
                        {policy.allowEarlyRenewal && (
                          <div>
                            <span className="text-fw-bodyLight">Early Renewal:</span>
                            <p className="font-medium text-fw-body">{policy.earlyRenewalDays} days</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditPolicy(policy)}
                        className="p-2 text-fw-bodyLight hover:text-fw-link transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (policy.isDefault) {
                            window.addToast({
                              type: 'error',
                              title: 'Cannot Delete',
                              message: 'Cannot delete the default renewal policy',
                              duration: 3000
                            });
                            return;
                          }
                          if (confirm('Delete this renewal policy?')) {
                            deleteRenewalPolicy(policy.id);
                            window.addToast({
                              type: 'success',
                              title: 'Deleted',
                              message: 'Renewal policy deleted successfully',
                              duration: 3000
                            });
                          }
                        }}
                        className="p-2 text-fw-bodyLight hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Agreements Tab */}
        {activeTab === 'agreements' && (
          <div className="space-y-4">
            <p className="text-sm text-fw-bodyLight">
              {connectionTermAgreements.length} active term agreement{connectionTermAgreements.length !== 1 ? 's' : ''}
            </p>

            {connectionTermAgreements.length === 0 ? (
              <div className="text-center py-12 bg-fw-wash rounded-lg border border-fw-secondary">
                <Calendar className="h-12 w-12 text-fw-bodyLight mx-auto mb-3" />
                <p className="text-fw-bodyLight mb-1">No active term agreements</p>
                <p className="text-sm text-fw-bodyLight">
                  Apply term discounts to connections to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectionTermAgreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    className="bg-fw-wash border border-fw-secondary rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-fw-body mb-1">{agreement.connectionName}</h4>
                        <p className="text-sm text-fw-bodyLight">{agreement.termDiscountName}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          agreement.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : agreement.status === 'expiring_soon'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {agreement.status === 'active'
                          ? 'Active'
                          : agreement.status === 'expiring_soon'
                          ? 'Expiring Soon'
                          : 'Expired'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-fw-bodyLight">Discount:</span>
                        <p className="font-medium text-fw-body">{agreement.discountPercentage}%</p>
                      </div>
                      <div>
                        <span className="text-fw-bodyLight">Monthly Savings:</span>
                        <p className="font-medium text-fw-body">${agreement.estimatedMonthlySavings.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-fw-bodyLight">Start Date:</span>
                        <p className="font-medium text-fw-body">
                          {new Date(agreement.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-fw-bodyLight">End Date:</span>
                        <p className="font-medium text-fw-body">
                          {new Date(agreement.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {agreement.autoRenew && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                        <Check className="h-4 w-4" />
                        Auto-renewal enabled
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Term Discount Modal */}
      {showDiscountModal && (
        <TermDiscountModal
          discount={editingDiscount}
          onClose={() => {
            setShowDiscountModal(false);
            setEditingDiscount(null);
          }}
          onSave={(discount) => {
            if (editingDiscount) {
              updateTermDiscount(editingDiscount.id, discount);
              window.addToast({
                type: 'success',
                title: 'Updated',
                message: 'Term discount updated successfully',
                duration: 3000
              });
            } else {
              addTermDiscount(discount);
              window.addToast({
                type: 'success',
                title: 'Created',
                message: 'Term discount created successfully',
                duration: 3000
              });
            }
            setShowDiscountModal(false);
            setEditingDiscount(null);
          }}
        />
      )}

      {/* Renewal Policy Modal */}
      {showPolicyModal && (
        <RenewalPolicyModal
          policy={editingPolicy}
          onClose={() => {
            setShowPolicyModal(false);
            setEditingPolicy(null);
          }}
          onSave={(policy) => {
            if (editingPolicy) {
              updateRenewalPolicy(editingPolicy.id, policy);
              window.addToast({
                type: 'success',
                title: 'Updated',
                message: 'Renewal policy updated successfully',
                duration: 3000
              });
            } else {
              addRenewalPolicy(policy);
              window.addToast({
                type: 'success',
                title: 'Created',
                message: 'Renewal policy created successfully',
                duration: 3000
              });
            }
            setShowPolicyModal(false);
            setEditingPolicy(null);
          }}
        />
      )}
    </div>
  );
}

interface TermDiscountModalProps {
  discount: TermDiscount | null;
  onClose: () => void;
  onSave: (discount: Omit<TermDiscount, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

function TermDiscountModal({ discount, onClose, onSave }: TermDiscountModalProps) {
  const [formData, setFormData] = useState({
    name: discount?.name || '',
    termLength: discount?.termLength || 12,
    termUnit: discount?.termUnit || 'months' as 'months' | 'years',
    discountPercentage: discount?.discountPercentage || 10,
    description: discount?.description || '',
    isActive: discount?.isActive ?? true,
    applicableConnectionTypes: discount?.applicableConnectionTypes || ['Dedicated'],
    minimumSpend: discount?.minimumSpend || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen onClose={onClose} title={discount ? 'Edit Term Discount' : 'Add Term Discount'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fw-body mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fw-body mb-2">Term Length</label>
            <input
              type="number"
              value={formData.termLength}
              onChange={(e) => setFormData({ ...formData, termLength: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
              required
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fw-body mb-2">Unit</label>
            <select
              value={formData.termUnit}
              onChange={(e) => setFormData({ ...formData, termUnit: e.target.value as 'months' | 'years' })}
              className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            >
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fw-body mb-2">Discount Percentage</label>
          <input
            type="number"
            value={formData.discountPercentage}
            onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            required
            min="0"
            max="100"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fw-body mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fw-body mb-2">Minimum Spend ($)</label>
          <input
            type="number"
            value={formData.minimumSpend}
            onChange={(e) => setFormData({ ...formData, minimumSpend: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            min="0"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-fw-link"
            />
            <span className="text-sm font-medium text-fw-body">Active</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-fw-secondary">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {discount ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface RenewalPolicyModalProps {
  policy: RenewalPolicy | null;
  onClose: () => void;
  onSave: (policy: Omit<RenewalPolicy, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

function RenewalPolicyModal({ policy, onClose, onSave }: RenewalPolicyModalProps) {
  const [formData, setFormData] = useState({
    name: policy?.name || '',
    autoRenew: policy?.autoRenew ?? true,
    renewalNotificationDays: policy?.renewalNotificationDays || 30,
    allowEarlyRenewal: policy?.allowEarlyRenewal ?? true,
    earlyRenewalDays: policy?.earlyRenewalDays || 60,
    gracePeriodDays: policy?.gracePeriodDays || 15,
    description: policy?.description || '',
    isDefault: policy?.isDefault ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen onClose={onClose} title={policy ? 'Edit Renewal Policy' : 'Add Renewal Policy'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fw-body mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fw-body mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.autoRenew}
              onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
              className="h-4 w-4 text-fw-link"
            />
            <span className="text-sm font-medium text-fw-body">Enable Auto-Renewal</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fw-body mb-2">Notification (days)</label>
            <input
              type="number"
              value={formData.renewalNotificationDays}
              onChange={(e) => setFormData({ ...formData, renewalNotificationDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
              required
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fw-body mb-2">Grace Period (days)</label>
            <input
              type="number"
              value={formData.gracePeriodDays}
              onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
              required
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowEarlyRenewal}
              onChange={(e) => setFormData({ ...formData, allowEarlyRenewal: e.target.checked })}
              className="h-4 w-4 text-fw-link"
            />
            <span className="text-sm font-medium text-fw-body">Allow Early Renewal</span>
          </label>
        </div>

        {formData.allowEarlyRenewal && (
          <div>
            <label className="block text-sm font-medium text-fw-body mb-2">Early Renewal Period (days)</label>
            <input
              type="number"
              value={formData.earlyRenewalDays}
              onChange={(e) => setFormData({ ...formData, earlyRenewalDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-fw-secondary rounded-lg"
              required
              min="1"
            />
          </div>
        )}

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 text-fw-link"
            />
            <span className="text-sm font-medium text-fw-body">Set as Default Policy</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-fw-secondary">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {policy ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

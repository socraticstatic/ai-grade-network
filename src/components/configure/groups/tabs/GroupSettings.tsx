import { useState } from 'react';
import { Settings, Save, Plus, Building, Mail, Phone, User, X, Tag } from 'lucide-react';
import { Group, GroupAddress, GroupContact } from '../../../../types/group';
import { Button } from '../../../common/Button';
import { useStore } from '../../../../store/useStore';

interface GroupSettingsProps {
  group: Group;
}

export function GroupSettings({ group }: GroupSettingsProps) {
  const updateGroup = useStore(state => state.updateGroup);
  const addAddressToGroup = useStore(state => state.addAddressToGroup);
  const removeAddressFromGroup = useStore(state => state.removeAddressFromGroup);

  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description,
    type: group.type,
    status: group.status,
  });

  const [newAddress, setNewAddress] = useState<Partial<GroupAddress>>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    isPrimary: false
  });

  const [newContact, setNewContact] = useState<Partial<GroupContact>>({
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: false
  });

  const [newTag, setNewTag] = useState<{key: string, value: string}>({
    key: '',
    value: ''
  });

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNewAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewAddress({
      ...newAddress,
      [e.target.name]: e.target.name === 'isPrimary' 
        ? (e.target as HTMLInputElement).checked
        : e.target.value
    });
  };

  const handleNewContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewContact({
      ...newContact,
      [e.target.name]: e.target.name === 'isPrimary' 
        ? (e.target as HTMLInputElement).checked
        : e.target.value
    });
  };

  const handleAddAddress = () => {
    if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode || !newAddress.country) {
      window.addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all address fields',
        duration: 3000
      });
      return;
    }

    const address = newAddress as GroupAddress;
    addAddressToGroup(group.id, address);
    setNewAddress({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      isPrimary: false
    });
    setShowAddAddress(false);
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email || !newContact.role) {
      window.addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required contact fields',
        duration: 3000
      });
      return;
    }

    const contact = newContact as GroupContact;
    
    // Update the group with the new contact
    updateGroup(group.id, {
      contacts: [...(group.contacts || []), contact]
    });
    
    setNewContact({
      name: '',
      email: '',
      phone: '',
      role: '',
      isPrimary: false
    });
    setShowAddContact(false);
  };

  const handleAddTag = () => {
    if (!newTag.key || !newTag.value) {
      window.addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide both tag key and value',
        duration: 3000
      });
      return;
    }

    // Update the group with the new tag
    updateGroup(group.id, {
      tags: {
        ...(group.tags || {}),
        [newTag.key]: newTag.value
      }
    });
    
    setNewTag({ key: '', value: '' });
    setShowAddTag(false);
  };

  const handleRemoveTag = (key: string) => {
    if (!group.tags) return;
    
    const newTags = { ...group.tags };
    delete newTags[key];
    
    updateGroup(group.id, { tags: newTags });
  };

  const handleSaveSettings = async () => {
    try {
      await updateGroup(group.id, formData);
      
      window.addToast({
        type: 'success',
        title: 'Settings Updated',
        message: 'Group settings have been updated successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-fw-base p-6 rounded-lg border border-fw-secondary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <Settings className="h-5 w-5 text-fw-link mr-2" />
            General Settings
          </h3>
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSaveSettings}
          >
            Save Changes
          </Button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-figma-base font-medium text-fw-body">Group Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
            />
          </div>
          
          <div>
            <label className="block text-figma-base font-medium text-fw-body">Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleFormChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-figma-base font-medium text-fw-body">Group Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
              >
                <option value="business">Business Unit</option>
                <option value="department">Department</option>
                <option value="project">Project</option>
                <option value="team">Team</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-figma-base font-medium text-fw-body">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses Section */}
      <div className="bg-fw-base p-6 rounded-lg border border-fw-secondary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <Building className="h-5 w-5 text-fw-link mr-2" />
            Addresses
          </h3>
          <Button
            variant="outline"
            icon={Plus}
            onClick={() => setShowAddAddress(!showAddAddress)}
          >
            Add Address
          </Button>
        </div>
        
        {showAddAddress && (
          <div className="mb-6 p-4 border border-fw-secondary rounded-lg bg-fw-wash">
            <h4 className="text-figma-base font-medium text-fw-heading mb-4">New Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Street</label>
                <input
                  type="text"
                  name="street"
                  value={newAddress.street || ''}
                  onChange={handleNewAddressChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={newAddress.city || ''}
                  onChange={handleNewAddressChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={newAddress.state || ''}
                  onChange={handleNewAddressChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Zip/Postal Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={newAddress.zipCode || ''}
                  onChange={handleNewAddressChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={newAddress.country || ''}
                  onChange={handleNewAddressChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    checked={newAddress.isPrimary || false}
                    onChange={(e) => setNewAddress({ ...newAddress, isPrimary: e.target.checked })}
                    className="rounded border-fw-secondary text-fw-cobalt-600 focus:ring-fw-active h-4 w-4"
                  />
                  <span className="ml-2 text-figma-base text-fw-body">Set as primary address</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAddAddress(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddAddress}
              >
                Add Address
              </Button>
            </div>
          </div>
        )}
        
        {group.addresses && group.addresses.length > 0 ? (
          <div className="space-y-4">
            {group.addresses.map((address, index) => (
              <div key={index} className={`p-4 rounded-lg ${
                address.isPrimary ? 'bg-fw-accent border border-fw-active' : 'bg-fw-wash border border-fw-secondary'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center mb-2">
                      <Building className={`h-5 w-5 ${address.isPrimary ? 'text-fw-link' : 'text-fw-bodyLight'} mr-2`} />
                      <h4 className="text-figma-base font-medium text-fw-heading">
                        {address.isPrimary ? 'Primary Address' : `Address ${index + 1}`}
                      </h4>
                      {address.isPrimary && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-figma-sm font-medium bg-fw-accent text-fw-link">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-figma-base text-fw-body">{address.street}</p>
                    <p className="text-figma-base text-fw-body">{address.city}, {address.state} {address.zipCode}</p>
                    <p className="text-figma-base text-fw-body">{address.country}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={X}
                    onClick={() => removeAddressFromGroup(group.id, index)}
                    className="text-fw-bodyLight hover:text-fw-body"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Building className="h-12 w-12 text-fw-bodyLight mx-auto mb-3" />
            <p className="text-fw-bodyLight">No addresses added yet</p>
          </div>
        )}
      </div>

      {/* Contacts Section */}
      <div className="bg-fw-base p-6 rounded-lg border border-fw-secondary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <User className="h-5 w-5 text-fw-link mr-2" />
            Contacts
          </h3>
          <Button
            variant="outline"
            icon={Plus}
            onClick={() => setShowAddContact(!showAddContact)}
          >
            Add Contact
          </Button>
        </div>
        
        {showAddContact && (
          <div className="mb-6 p-4 border border-fw-secondary rounded-lg bg-fw-wash">
            <h4 className="text-figma-base font-medium text-fw-heading mb-4">New Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={newContact.name || ''}
                  onChange={handleNewContactChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newContact.email || ''}
                  onChange={handleNewContactChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newContact.phone || ''}
                  onChange={handleNewContactChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Role</label>
                <input
                  type="text"
                  name="role"
                  value={newContact.role || ''}
                  onChange={handleNewContactChange}
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div className="md:col-span-2 flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    checked={newContact.isPrimary || false}
                    onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                    className="rounded border-fw-secondary text-fw-cobalt-600 focus:ring-fw-active h-4 w-4"
                  />
                  <span className="ml-2 text-figma-base text-fw-body">Set as primary contact</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAddContact(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddContact}
              >
                Add Contact
              </Button>
            </div>
          </div>
        )}
        
        {group.contacts && group.contacts.length > 0 ? (
          <div className="space-y-4">
            {group.contacts.map((contact, index) => (
              <div key={index} className={`p-4 rounded-lg ${
                contact.isPrimary ? 'bg-fw-accent border border-fw-active' : 'bg-fw-wash border border-fw-secondary'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center mb-2">
                      <User className={`h-5 w-5 ${contact.isPrimary ? 'text-fw-link' : 'text-fw-bodyLight'} mr-2`} />
                      <h4 className="text-figma-base font-medium text-fw-heading">{contact.name}</h4>
                      {contact.isPrimary && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-figma-sm font-medium bg-fw-accent text-fw-link">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-figma-base text-fw-body">{contact.role}</p>
                    <div className="mt-2 flex items-center">
                      <Mail className="h-4 w-4 text-fw-bodyLight mr-2" />
                      <a href={`mailto:${contact.email}`} className="text-figma-base text-fw-link hover:text-fw-linkHover">
                        {contact.email}
                      </a>
                    </div>
                    {contact.phone && (
                      <div className="mt-1 flex items-center">
                        <Phone className="h-4 w-4 text-fw-bodyLight mr-2" />
                        <span className="text-figma-base text-fw-body">{contact.phone}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={X}
                    onClick={() => {
                      if (group.contacts) {
                        const newContacts = [...group.contacts];
                        newContacts.splice(index, 1);
                        updateGroup(group.id, { contacts: newContacts });
                      }
                    }}
                    className="text-fw-bodyLight hover:text-fw-body"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <User className="h-12 w-12 text-fw-bodyLight mx-auto mb-3" />
            <p className="text-fw-bodyLight">No contacts added yet</p>
          </div>
        )}
      </div>

      {/* Tags Section */}
      <div className="bg-fw-base p-6 rounded-lg border border-fw-secondary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-fw-heading flex items-center">
            <Tag className="h-5 w-5 text-fw-link mr-2" />
            Tags
          </h3>
          <Button
            variant="outline"
            icon={Plus}
            onClick={() => setShowAddTag(!showAddTag)}
          >
            Add Tag
          </Button>
        </div>
        
        {showAddTag && (
          <div className="mb-6 p-4 border border-fw-secondary rounded-lg bg-fw-wash">
            <h4 className="text-figma-base font-medium text-fw-heading mb-4">New Tag</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Key</label>
                <input
                  type="text"
                  value={newTag.key}
                  onChange={(e) => setNewTag({ ...newTag, key: e.target.value })}
                  placeholder="e.g., department"
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">Value</label>
                <input
                  type="text"
                  value={newTag.value}
                  onChange={(e) => setNewTag({ ...newTag, value: e.target.value })}
                  placeholder="e.g., engineering"
                  className="block w-full rounded-md border-fw-secondary shadow-sm focus:ring-fw-active focus:border-fw-active"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4 space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAddTag(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTag}
              >
                Add Tag
              </Button>
            </div>
          </div>
        )}
        
        {group.tags && Object.keys(group.tags).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(group.tags).map(([key, value]) => (
              <div key={key} className="inline-flex items-center px-3 py-1 rounded-full text-figma-base bg-fw-neutral text-fw-body">
                <span className="font-medium">{key}:</span>
                <span className="ml-1">{value}</span>
                <button 
                  onClick={() => handleRemoveTag(key)}
                  className="ml-2 text-fw-bodyLight hover:text-fw-body"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Tag className="h-12 w-12 text-fw-bodyLight mx-auto mb-3" />
            <p className="text-fw-bodyLight">No tags added yet</p>
            <p className="text-figma-base text-fw-bodyLight mt-1">Tags help with cost allocation and organization</p>
          </div>
        )}
      </div>
    </div>
  );
}
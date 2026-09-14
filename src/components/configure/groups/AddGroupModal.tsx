import React, { useState } from 'react';
import { X, Users, Building, Tag, Plus, Check } from 'lucide-react';
import { Group, GroupAddress, GroupContact } from '../../../types/group';
import { Connection, User } from '../../../types';
import { Button } from '../../common/Button';
import { chartColors } from '../../../utils/chartColors';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: Omit<Group, 'id' | 'createdAt'>) => void;
  users: User[];
  connections: Connection[];
}

export function AddGroupModal({ isOpen, onClose, onSave, users, connections }: AddGroupModalProps) {
  const [step, setStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupType, setGroupType] = useState<Group['type']>('business');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [address, setAddress] = useState<GroupAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    isPrimary: true
  });
  const [contact, setContact] = useState<GroupContact>({
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: true
  });
  const [tags, setTags] = useState<Record<string, string>>({});
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');

  const steps = [
    { title: 'Basic Info', description: 'Name and type' },
    { title: 'Members', description: 'Add users' },
    { title: 'Connections', description: 'Add connections' },
    { title: 'Details', description: 'Address and contact' },
    { title: 'Review', description: 'Confirm details' }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleAddTag = () => {
    if (tagKey && tagValue) {
      setTags(prev => ({
        ...prev,
        [tagKey]: tagValue
      }));
      setTagKey('');
      setTagValue('');
    }
  };

  const handleRemoveTag = (key: string) => {
    const newTags = { ...tags };
    delete newTags[key];
    setTags(newTags);
  };

  const handleSave = () => {
    const newGroup: Omit<Group, 'id' | 'createdAt'> = {
      name: groupName,
      description: groupDescription,
      type: groupType,
      status: 'active',
      addresses: address.street ? [address] : [],
      contacts: contact.name ? [contact] : [],
      connectionIds: selectedConnections,
      userIds: selectedUsers,
      ownerId: selectedUsers[0] || '',
      permissions: {
        read: selectedUsers,
        write: selectedUsers,
        admin: selectedUsers.slice(0, 1)
      },
      tags: Object.keys(tags).length > 0 ? tags : undefined
    };

    onSave(newGroup);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(27,27,29,0.56)' }}>
      <div className="bg-fw-base shadow-xl w-full h-full flex flex-col sm:max-w-[1056px] sm:h-[636px] sm:rounded-[24px] rounded-none mx-auto">
        {/* Header - inline title with close button */}
        <div className="px-8 pt-6 pb-4 flex items-center justify-between">
          <h3 className="text-[24px] font-bold text-fw-heading tracking-[-0.03em]">
            Create New Pool
          </h3>
          <button
            onClick={onClose}
            className="text-fw-bodyLight hover:text-fw-body"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-8 pb-6">
          <div className="flex items-start">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center" style={{ minWidth: '80px' }}>
                  <div className={`
                    flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-medium text-white
                    ${step === i
                      ? 'bg-[#0057b8]'
                      : step > i
                        ? 'bg-[#2d7e24]'
                        : 'bg-[#d9d9d9]'
                    }
                  `}>
                    {step > i ? <Check className="h-4 w-4" /> : (i + 1)}
                  </div>
                  <p className="text-[16px] font-medium text-[#1d2329] mt-1.5">{s.title}</p>
                  <p className="text-[14px] font-medium text-[#454b52]">{s.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 mt-3.5 mx-2">
                    <div
                      className={`h-0.5 w-full ${step > i ? 'bg-fw-success' : 'bg-fw-neutral'}`}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 flex-1 overflow-y-auto">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="group-name" className="fw-label fw-label-required">
                  Pool Name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="fw-input"
                  placeholder="Enter pool name"
                  required
                />
              </div>

              <div>
                <label htmlFor="group-type" className="fw-label fw-label-required">
                  Pool Type
                </label>
                <select
                  id="group-type"
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as Group['type'])}
                  className="fw-select"
                  required
                >
                  <option value="business">Business</option>
                  <option value="department">Department</option>
                  <option value="project">Project</option>
                  <option value="team">Team</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label htmlFor="group-description" className="fw-label">
                  Description
                </label>
                <textarea
                  id="group-description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="fw-textarea"
                  style={{ height: '76px' }}
                  placeholder="Enter pool description"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-bold text-fw-heading">Select Users</span>
                <span
                  className="text-[13px] font-medium text-[#0057b8] px-2.5 py-0.5 rounded-[800px] bg-fw-active/[0.16]"
                >
                  {selectedUsers.length} users selected
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-fw-secondary">
                    <thead className="bg-fw-wash">
                      <tr>
                        <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(users.map(user => user.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                            checked={selectedUsers.length === users.length && users.length > 0}
                          />
                        </th>
                        <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                          Name
                        </th>
                        <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                          Role
                        </th>
                        <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-fw-base divide-y divide-fw-secondary">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-fw-wash transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                              onChange={() => {
                                if (selectedUsers.includes(user.id)) {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                } else {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                }
                              }}
                              checked={selectedUsers.includes(user.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-[14px] font-medium text-fw-heading">{user.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-[14px] text-fw-bodyLight">{user.role}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-[14px] text-fw-bodyLight">{user.email}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-fw-heading mb-2">
                  Select Connections
                </label>
                <div className="rounded-2xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-fw-secondary">
                      <thead className="bg-fw-wash">
                        <tr>
                          <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedConnections(connections.map(conn => conn.id.toString()));
                                } else {
                                  setSelectedConnections([]);
                                }
                              }}
                              checked={selectedConnections.length === connections.length && connections.length > 0}
                            />
                          </th>
                          <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                            Name
                          </th>
                          <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                            Type
                          </th>
                          <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-fw-base divide-y divide-fw-secondary">
                        {connections.map((connection) => (
                          <tr key={connection.id} className="hover:bg-fw-wash transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                                onChange={() => {
                                  const connId = connection.id.toString();
                                  if (selectedConnections.includes(connId)) {
                                    setSelectedConnections(selectedConnections.filter(id => id !== connId));
                                  } else {
                                    setSelectedConnections([...selectedConnections, connId]);
                                  }
                                }}
                                checked={selectedConnections.includes(connection.id.toString())}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-[14px] font-medium text-fw-heading">{connection.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-[14px] text-fw-bodyLight">{connection.type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-[13px] leading-5 font-semibold rounded-[4px]`}
                                style={
                                  connection.status === 'Active'
                                    ? { backgroundColor: chartColors.successLight, color: chartColors.success }
                                    : { backgroundColor: chartColors.bodyLightAlpha, color: chartColors.bodyLight }
                                }
                              >
                                {connection.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="mt-2 text-[14px] text-fw-bodyLight">
                  {selectedConnections.length} connections selected
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-base font-medium text-fw-heading mb-4 flex items-center">
                  <Building className="h-5 w-5 text-fw-bodyLight mr-2" />
                  Address Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="street" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Street Address
                    </label>
                    <input
                      id="street"
                      type="text"
                      value={address.street}
                      onChange={(e) => setAddress({...address, street: e.target.value})}
                      className="fw-input"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({...address, city: e.target.value})}
                      className="fw-input"
                      placeholder="Anytown"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      State/Province
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress({...address, state: e.target.value})}
                      className="fw-input"
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Zip/Postal Code
                    </label>
                    <input
                      id="zipCode"
                      type="text"
                      value={address.zipCode}
                      onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                      className="fw-input"
                      placeholder="12345"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="country" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Country
                    </label>
                    <input
                      id="country"
                      type="text"
                      value={address.country}
                      onChange={(e) => setAddress({...address, country: e.target.value})}
                      className="fw-input"
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-base font-medium text-fw-heading mb-4 flex items-center">
                  <Users className="h-5 w-5 text-fw-bodyLight mr-2" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactName" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Contact Name
                    </label>
                    <input
                      id="contactName"
                      type="text"
                      value={contact.name}
                      onChange={(e) => setContact({...contact, name: e.target.value})}
                      className="fw-input"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactEmail" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Email
                    </label>
                    <input
                      id="contactEmail"
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact({...contact, email: e.target.value})}
                      className="fw-input"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactPhone" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Phone
                    </label>
                    <input
                      id="contactPhone"
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => setContact({...contact, phone: e.target.value})}
                      className="fw-input"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactRole" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Role
                    </label>
                    <input
                      id="contactRole"
                      type="text"
                      value={contact.role}
                      onChange={(e) => setContact({...contact, role: e.target.value})}
                      className="fw-input"
                      placeholder="IT Manager"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-base font-medium text-fw-heading mb-4 flex items-center">
                  <Tag className="h-5 w-5 text-fw-bodyLight mr-2" />
                  Tags
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="tagKey" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Tag Key
                    </label>
                    <input
                      id="tagKey"
                      type="text"
                      value={tagKey}
                      onChange={(e) => setTagKey(e.target.value)}
                      className="fw-input"
                      placeholder="e.g., department"
                    />
                  </div>
                  <div>
                    <label htmlFor="tagValue" className="block text-[14px] font-medium text-fw-heading mb-1.5">
                      Tag Value
                    </label>
                    <div className="flex">
                      <input
                        id="tagValue"
                        type="text"
                        value={tagValue}
                        onChange={(e) => setTagValue(e.target.value)}
                        className="fw-input rounded-r-none"
                        placeholder="e.g., IT"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!tagKey || !tagValue}
                        className="px-3 h-9 bg-fw-cobalt-600 text-white rounded-r-lg disabled:bg-fw-neutral disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tags Display */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(tags).map(([key, value]) => (
                    <div key={key} className="flex items-center bg-fw-neutral px-3 py-1 rounded-full">
                      <span className="text-[14px] text-fw-body">
                        <span className="font-medium">{key}:</span> {value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(key)}
                        className="ml-2 text-fw-bodyLight hover:text-fw-body"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-fw-wash p-4 rounded-lg">
                <h4 className="text-base font-medium text-fw-heading mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[14px] text-fw-bodyLight">Name</p>
                    <p className="text-base font-medium text-fw-heading">{groupName}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-fw-bodyLight">Type</p>
                    <p className="text-base font-medium text-fw-heading capitalize">{groupType}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[14px] text-fw-bodyLight">Description</p>
                    <p className="text-base text-fw-heading">{groupDescription || 'No description provided'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-fw-wash p-4 rounded-lg">
                <h4 className="text-base font-medium text-fw-heading mb-4">Members</h4>
                <p className="text-base text-fw-heading">
                  {selectedUsers.length} users selected
                </p>
                {selectedUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUsers.map((userId) => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <div key={userId} className="bg-fw-accent text-fw-link px-3 py-1 rounded-full text-[14px]">
                          {user.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="bg-fw-wash p-4 rounded-lg">
                <h4 className="text-base font-medium text-fw-heading mb-4">Connections</h4>
                <p className="text-base text-fw-heading">
                  {selectedConnections.length} connections selected
                </p>
                {selectedConnections.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedConnections.map((connId) => {
                      const connection = connections.find(c => c.id.toString() === connId);
                      return connection ? (
                        <div key={connId} className="bg-fw-accent text-fw-link px-3 py-1 rounded-full text-[14px]">
                          {connection.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {(address.street || contact.name || Object.keys(tags).length > 0) && (
                <div className="bg-fw-wash p-4 rounded-lg">
                  <h4 className="text-base font-medium text-fw-heading mb-4">Additional Details</h4>

                  {address.street && (
                    <div className="mb-4">
                      <p className="text-[14px] font-medium text-fw-body">Address</p>
                      <p className="text-[14px] text-fw-heading">
                        {address.street}, {address.city}, {address.state} {address.zipCode}, {address.country}
                      </p>
                    </div>
                  )}

                  {contact.name && (
                    <div className="mb-4">
                      <p className="text-[14px] font-medium text-fw-body">Contact</p>
                      <p className="text-[14px] text-fw-heading">
                        {contact.name} ({contact.role}) - {contact.email} - {contact.phone}
                      </p>
                    </div>
                  )}

                  {Object.keys(tags).length > 0 && (
                    <div>
                      <p className="text-[14px] font-medium text-fw-body mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(tags).map(([key, value]) => (
                          <div key={key} className="bg-fw-neutral px-3 py-1 rounded-full text-[14px] text-fw-body">
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 flex justify-end gap-2">
          {step > 0 ? (
            <Button variant="outline" onClick={handleBack} size="md">
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose} size="md">
              Cancel
            </Button>
          )}

          {step < steps.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={step === 0 && !groupName}
              size="md"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!groupName}
              size="md"
            >
              Create Pool
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

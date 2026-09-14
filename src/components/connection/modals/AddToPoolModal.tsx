import { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Group } from '../../../types/group';

interface AddToPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (poolIds: string[]) => void;
  currentPoolIds?: string[];
  availablePools: Group[];
  connectionName: string;
}

export function AddToPoolModal({
  isOpen,
  onClose,
  onSave,
  currentPoolIds = [],
  availablePools,
  connectionName
}: AddToPoolModalProps) {
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>(currentPoolIds);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPools = availablePools.filter(pool =>
    pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTogglePool = (poolId: string) => {
    if (selectedPoolIds.includes(poolId)) {
      setSelectedPoolIds(selectedPoolIds.filter(id => id !== poolId));
    } else {
      setSelectedPoolIds([...selectedPoolIds, poolId]);
    }
  };

  const handleSave = () => {
    onSave(selectedPoolIds);
    onClose();
  };

  const handleCancel = () => {
    setSelectedPoolIds(currentPoolIds);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Assign to Pools">
      <div className="space-y-4">
        <div>
          <p className="text-figma-base text-fw-bodyLight">
            Assign <span className="font-medium text-fw-heading">{connectionName}</span> to one or more pools
          </p>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search pools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
          />
        </div>

        {/* Pool List */}
        <div className="max-h-96 overflow-y-auto border border-fw-secondary rounded-lg divide-y divide-fw-secondary">
          {filteredPools.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-fw-bodyLight mx-auto mb-2" />
              <p className="text-fw-bodyLight">No pools found</p>
            </div>
          ) : (
            filteredPools.map(pool => {
              const isSelected = selectedPoolIds.includes(pool.id);
              const isCurrentlyAssigned = currentPoolIds.includes(pool.id);

              return (
                <label
                  key={pool.id}
                  className={`flex items-center p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-fw-accent' : 'hover:bg-fw-wash'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTogglePool(pool.id)}
                    className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-fw-secondary rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-figma-base font-medium text-fw-heading">{pool.name}</p>
                        <p className="text-figma-sm text-fw-bodyLight">{pool.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-figma-sm px-2 py-1 rounded-full ${
                          pool.type === 'business' ? 'bg-fw-accent text-fw-linkHover' :
                          pool.type === 'department' ? 'bg-fw-purpleLight text-fw-purple' :
                          pool.type === 'project' ? 'bg-fw-successLight text-fw-success' :
                          pool.type === 'team' ? 'bg-fw-warn/10 text-fw-warn' :
                          'bg-fw-neutral text-fw-heading'
                        }`}>
                          {pool.type}
                        </span>
                        {isCurrentlyAssigned && (
                          <span className="text-figma-sm text-fw-success flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-figma-sm text-fw-bodyLight">
                      <span>{pool.connectionIds.length} connections</span>
                      <span>{pool.userIds.length} members</span>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="bg-fw-wash rounded-lg p-3">
          <p className="text-figma-base text-fw-body">
            <span className="font-medium">{selectedPoolIds.length}</span> pool{selectedPoolIds.length !== 1 ? 's' : ''} selected
            {selectedPoolIds.length !== currentPoolIds.length && (
              <span className="text-fw-warn ml-2">
                ({Math.abs(selectedPoolIds.length - currentPoolIds.length)} change{Math.abs(selectedPoolIds.length - currentPoolIds.length) !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-fw-secondary">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={selectedPoolIds.length === 0}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

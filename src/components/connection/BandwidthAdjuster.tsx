import { useState } from 'react';
import { ArrowUpDown, Check, X, Zap, AlertCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BandwidthAdjusterProps {
  currentBandwidth: string;
  onBandwidthChange: (newBandwidth: string) => void;
  connectionId: string;
  connectionName: string;
  connectionStatus: 'Active' | 'Inactive' | 'Pending';
}

const BANDWIDTH_OPTIONS = [
  { value: '50 Mbps', label: '50', unit: 'Mbps', price: 199, tier: 'basic' },
  { value: '100 Mbps', label: '100', unit: 'Mbps', price: 299, tier: 'basic' },
  { value: '200 Mbps', label: '200', unit: 'Mbps', price: 449, tier: 'standard' },
  { value: '500 Mbps', label: '500', unit: 'Mbps', price: 799, tier: 'standard' },
  { value: '1 Gbps', label: '1', unit: 'Gbps', price: 1299, tier: 'premium', recommended: true },
  { value: '2 Gbps', label: '2', unit: 'Gbps', price: 2199, tier: 'premium' },
  { value: '5 Gbps', label: '5', unit: 'Gbps', price: 4499, tier: 'enterprise' },
  { value: '10 Gbps', label: '10', unit: 'Gbps', price: 7999, tier: 'enterprise' },
  { value: '100 Gbps', label: '100', unit: 'Gbps', price: 49999, tier: 'enterprise' },
];

export function BandwidthAdjuster({ currentBandwidth, onBandwidthChange, connectionStatus }: BandwidthAdjusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBandwidth, setSelectedBandwidth] = useState(currentBandwidth);
  const [isConfirming, setIsConfirming] = useState(false);

  const currentOption = BANDWIDTH_OPTIONS.find(opt => opt.value === currentBandwidth);
  const selectedOption = BANDWIDTH_OPTIONS.find(opt => opt.value === selectedBandwidth);
  const isConnectionActive = connectionStatus === 'Active';

  const handleSave = () => {
    if (selectedBandwidth === currentBandwidth) {
      setIsEditing(false);
      return;
    }

    setIsConfirming(true);

    setTimeout(() => {
      onBandwidthChange(selectedBandwidth);
      setIsConfirming(false);
      setIsEditing(false);

      window.addToast({
        type: 'success',
        title: 'Bandwidth Updated',
        message: `Successfully changed bandwidth to ${selectedBandwidth}`,
        duration: 4000
      });
    }, 1500);
  };

  const handleCancel = () => {
    setSelectedBandwidth(currentBandwidth);
    setIsEditing(false);
  };

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div
          key="collapsed"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden"
        >
        <div className="flex items-center justify-between p-6">
          <motion.div
            className="flex-1"
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-baseline space-x-3 mb-1">
              <span className="text-4xl font-bold text-fw-heading tracking-tight">
                {currentOption?.label}
              </span>
              <span className="text-2xl font-medium text-fw-bodyLight">
                {currentOption?.unit}
              </span>
              <span className="text-figma-base font-medium text-fw-bodyLight ml-2">
                ${currentOption?.price.toLocaleString()}/mo
              </span>
            </div>
            <p className="text-figma-base text-fw-bodyLight">Current bandwidth allocation</p>
          </motion.div>

          <motion.button
            onClick={() => !isConnectionActive && setIsEditing(true)}
            whileHover={!isConnectionActive ? { scale: 1.02 } : {}}
            whileTap={!isConnectionActive ? { scale: 0.98 } : {}}
            disabled={isConnectionActive}
            title={isConnectionActive ? 'Connection must be deactivated before changing bandwidth' : undefined}
            className={`ml-6 px-6 py-3 border-2 rounded-lg transition-all font-medium text-figma-base flex items-center space-x-2 group ${
              isConnectionActive
                ? 'bg-fw-disabled border-fw-secondary text-fw-bodyLight cursor-not-allowed'
                : 'bg-fw-base border-fw-secondary text-fw-body hover:border-fw-active hover:bg-fw-wash'
            }`}
          >
            <span>Change</span>
            {!isConnectionActive && <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
          </motion.button>
        </div>
        {isConnectionActive && (
          <div className="px-6 pb-4 pt-0">
            <div className="flex items-start space-x-2 text-figma-sm text-fw-warn bg-fw-warn/10 border border-fw-warn/30 rounded p-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Bandwidth cannot be changed while connection is active. Please deactivate the connection first.</span>
            </div>
          </div>
        )}
      </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden"
        >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-fw-secondary bg-fw-wash">
        <div>
          <h3 className="text-base font-semibold text-fw-heading">Select Bandwidth</h3>
          <p className="text-figma-sm text-fw-bodyLight mt-0.5">Choose your bandwidth allocation</p>
        </div>
        <button
          onClick={handleCancel}
          className="p-1.5 text-fw-bodyLight hover:text-fw-body hover:bg-fw-base rounded transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Change Preview */}
      <AnimatePresence>
        {selectedOption && selectedBandwidth !== currentBandwidth && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-fw-secondary bg-gradient-to-r from-fw-blue-light to-white"
          >
            <div className="px-6 py-3 flex items-center justify-between text-figma-base">
              <div className="flex items-center space-x-2">
                <span className="text-fw-body font-medium">{currentBandwidth}</span>
                <ChevronRight className="h-4 w-4 text-fw-bodyLight" />
                <span className="text-fw-heading font-semibold">{selectedBandwidth}</span>
              </div>
              <div className="flex items-center space-x-2 text-fw-bodyLight">
                <span>${currentOption?.price.toLocaleString()}</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-fw-heading">${selectedOption.price.toLocaleString()}/mo</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options */}
      <div className="p-6">
        <div className="space-y-2">
          {BANDWIDTH_OPTIONS.map((option) => {
            const isSelected = selectedBandwidth === option.value;
            const isCurrent = currentBandwidth === option.value;

            return (
              <motion.button
                key={option.value}
                onClick={() => setSelectedBandwidth(option.value)}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={`
                  w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? 'border-fw-active bg-fw-blue-light shadow-sm'
                    : 'border-fw-secondary bg-fw-base hover:border-fw-bodyLight hover:bg-fw-wash'
                  }
                `}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Selection Indicator */}
                  <div className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all
                    ${isSelected
                      ? 'border-fw-active bg-fw-active'
                      : 'border-fw-secondary bg-fw-base'
                    }
                    flex items-center justify-center
                  `}>
                    {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>

                  {/* Bandwidth Display */}
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-fw-heading tracking-tight">
                      {option.label}
                    </span>
                    <span className="text-lg font-medium text-fw-bodyLight">
                      {option.unit}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center space-x-2">
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-fw-cobalt-700 text-white text-figma-sm font-medium rounded">
                        Current
                      </span>
                    )}
                    {option.recommended && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-complementary-orange to-fw-orange-600 text-white text-figma-sm font-medium rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right ml-4">
                  <div className={`text-lg font-semibold ${isSelected ? 'text-fw-heading' : 'text-fw-body'}`}>
                    ${option.price.toLocaleString()}
                  </div>
                  <div className="text-figma-sm text-fw-bodyLight">per month</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Info Notice */}
        <div className="mt-4 flex items-start space-x-3 p-3 bg-fw-wash rounded-lg">
          <AlertCircle className="h-4 w-4 text-fw-info flex-shrink-0 mt-0.5" />
          <p className="text-figma-sm text-fw-body leading-relaxed">
            Bandwidth changes take effect within 2-3 minutes. Billing is prorated from the date of change.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-fw-wash border-t border-fw-secondary">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 text-fw-body hover:text-fw-heading font-medium text-figma-base transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isConfirming || selectedBandwidth === currentBandwidth}
          className={`
            px-6 py-2.5 rounded-lg font-medium text-figma-base transition-all flex items-center space-x-2
            ${isConfirming
              ? 'bg-fw-gray-400 text-white cursor-wait'
              : selectedBandwidth === currentBandwidth
                ? 'bg-fw-disabled text-fw-disabled cursor-not-allowed'
                : 'bg-fw-ctaPrimary hover:bg-fw-ctaPrimaryHover text-fw-linkPrimary shadow-sm hover:shadow'
            }
          `}
        >
          {isConfirming ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Zap className="h-4 w-4" />
              </motion.div>
              <span>Updating...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>Confirm Change</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

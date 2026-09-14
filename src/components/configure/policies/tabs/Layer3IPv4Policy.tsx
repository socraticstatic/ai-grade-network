import { useState } from 'react';
import { Button } from '../../../common/Button';

interface PolicyToggle {
  id: string;
  label: string;
  onPremiseToPartner: boolean;
  partnerToOnPremise: boolean;
  hideOnPremiseToPartner?: boolean;
}

export function Layer3IPv4Policy() {
  const [denyActions, setDenyActions] = useState<PolicyToggle[]>([
    {
      id: 'matching-routes',
      label: 'Matching Routes',
      onPremiseToPartner: true,
      partnerToOnPremise: true
    },
    {
      id: 'block-default-routes',
      label: 'Block Default Routes',
      onPremiseToPartner: true,
      partnerToOnPremise: false
    },
    {
      id: 'community-value-filter-customer',
      label: 'Community Value Filter with Customer-Provided BGP CVs',
      onPremiseToPartner: true,
      partnerToOnPremise: true
    },
    {
      id: 'community-value-filter-att',
      label: 'Community Value Filter with AT&T-Provided BGP CVs',
      onPremiseToPartner: false,
      partnerToOnPremise: true,
      hideOnPremiseToPartner: true
    }
  ]);

  const [manipulations, setManipulations] = useState<PolicyToggle[]>([
    {
      id: 'prepend-advertisements',
      label: 'Prepend Advertisements With Extra BGP ASNs',
      onPremiseToPartner: true,
      partnerToOnPremise: true
    },
    {
      id: 'selective-cv-tagging',
      label: 'Selective CV Tagging to Routes/Prefixes',
      onPremiseToPartner: true,
      partnerToOnPremise: false
    },
    {
      id: 'community-value-tag',
      label: 'Community Value to Tag Routes',
      onPremiseToPartner: false,
      partnerToOnPremise: true,
      hideOnPremiseToPartner: true
    }
  ]);

  const [allowActions, setAllowActions] = useState<PolicyToggle[]>([
    {
      id: 'matching-routes-allow',
      label: 'Matching routes',
      onPremiseToPartner: true,
      partnerToOnPremise: true
    },
    {
      id: 'community-value-filter-customer-allow',
      label: 'Community Value Filter with Customer-Provided BGP CVs',
      onPremiseToPartner: true,
      partnerToOnPremise: true
    },
    {
      id: 'community-value-filter-att-allow',
      label: 'Community Value Filter with AT&T-Provided BGP CVs',
      onPremiseToPartner: false,
      partnerToOnPremise: true,
      hideOnPremiseToPartner: true
    }
  ]);

  const [advanced, setAdvanced] = useState<PolicyToggle[]>([
    {
      id: 'advertise-static-routes',
      label: 'Advertise Static Routes',
      onPremiseToPartner: true,
      partnerToOnPremise: true
    }
  ]);

  const handleToggle = (
    section: 'deny' | 'manipulations' | 'allow' | 'advanced',
    id: string,
    direction: 'onPremiseToPartner' | 'partnerToOnPremise'
  ) => {
    const setterMap = {
      deny: setDenyActions,
      manipulations: setManipulations,
      allow: setAllowActions,
      advanced: setAdvanced
    };

    const setter = setterMap[section];
    const stateMap = {
      deny: denyActions,
      manipulations: manipulations,
      allow: allowActions,
      advanced: advanced
    };

    setter(
      stateMap[section].map(item =>
        item.id === id
          ? { ...item, [direction]: !item[direction] }
          : item
      )
    );
  };

  const renderToggles = (items: PolicyToggle[], section: 'deny' | 'manipulations' | 'allow' | 'advanced') => (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.id} className="flex items-center bg-fw-wash p-4 rounded-xl">
          <div className="flex-1">
            <div className="text-figma-base font-medium text-fw-heading tracking-[-0.03em] mb-2">{item.label}</div>
            <div className="flex items-center space-x-8">
              {/* On Premise to Partner Toggle */}
              {!item.hideOnPremiseToPartner && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggle(section, item.id, 'onPremiseToPartner')}
                    className={`
                      toggle-switch relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer border-2 border-transparent
                      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fw-active focus:ring-offset-2
                      ${item.onPremiseToPartner ? 'bg-fw-cobalt-600' : 'bg-fw-neutral'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-4 w-4 transform bg-white shadow ring-0
                        transition duration-200 ease-in-out
                        ${item.onPremiseToPartner ? 'translate-x-4' : 'translate-x-0'}
                      `}
                    />
                  </button>
                  <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">On Premise → Partner</span>
                </div>
              )}

              {/* Partner to On Premise Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggle(section, item.id, 'partnerToOnPremise')}
                  className={`
                    toggle-switch relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer border-2 border-transparent
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fw-active focus:ring-offset-2
                    ${item.partnerToOnPremise ? 'bg-fw-cobalt-600' : 'bg-fw-neutral'}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-4 w-4 transform bg-white shadow ring-0
                      transition duration-200 ease-in-out
                      ${item.partnerToOnPremise ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </button>
                <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Partner → On Premise</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="card">
        <div className="card-header bg-fw-wash">
          <h2 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] tracking-[-0.03em]">Layer 3 IPV4 Configuration</h2>
        </div>
        
        <div className="p-6">
          <div className="space-y-8">
            {/* Deny Actions */}
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Deny Actions</h3>
              {renderToggles(denyActions, 'deny')}
            </div>

            {/* Manipulations */}
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Manipulations</h3>
              {renderToggles(manipulations, 'manipulations')}
            </div>

            {/* Allow Actions */}
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Allow Actions</h3>
              {renderToggles(allowActions, 'allow')}
            </div>

            {/* Advanced */}
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Advanced</h3>
              {renderToggles(advanced, 'advanced')}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 mt-6">
            <Button
              variant="outline"
            >
              Reset
            </Button>
            <Button
              variant="primary"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { Mail, Phone, User, Building, Edit2 } from 'lucide-react';
import { Group } from '../../types/group';
import { Button } from '../common/Button';
import { formatAddress, getPrimaryContact, getPrimaryAddress } from '../../utils/groups';

interface GroupContactsSectionProps {
  group: Group;
}

export function GroupContactsSection({ group }: GroupContactsSectionProps) {
  const primaryContact = getPrimaryContact(group);
  const primaryAddress = getPrimaryAddress(group);

  if (!primaryContact && !primaryAddress) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Primary Contact */}
      {primaryContact && (
        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Primary Contact</h3>
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
            >
              Edit
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start">
              <User className="h-5 w-5 text-fw-bodyLight mt-0.5 mr-3" />
              <div>
                <div className="text-figma-base font-medium text-fw-heading">{primaryContact.name}</div>
                <div className="text-figma-base text-fw-bodyLight">{primaryContact.role}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-fw-bodyLight mr-3" />
              <a href={`mailto:${primaryContact.email}`} className="text-figma-base text-fw-link hover:text-fw-linkHover">
                {primaryContact.email}
              </a>
            </div>
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-fw-bodyLight mr-3" />
              <span className="text-figma-base text-fw-body">{primaryContact.phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Address */}
      {primaryAddress && (
        <div className="bg-fw-base p-6 rounded-xl border border-fw-secondary shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Primary Address</h3>
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
            >
              Edit
            </Button>
          </div>
          <div className="flex items-start">
            <Building className="h-5 w-5 text-fw-bodyLight mt-0.5 mr-3" />
            <div>
              <p className="text-figma-base text-fw-body">{primaryAddress.street}</p>
              <p className="text-figma-base text-fw-body">{primaryAddress.city}, {primaryAddress.state} {primaryAddress.zipCode}</p>
              <p className="text-figma-base text-fw-body">{primaryAddress.country}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
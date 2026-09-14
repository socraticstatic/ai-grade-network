import { ArrowRight, Network, Lock, Globe } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';

export function RoutingTab() {
  const sections = [
    {
      title: 'Restricted VPN - ATMCSPU - IPV4 Configuration',
      subsections: [
        {
          title: 'On Premise to Partner',
          icon: Network,
          status: 'Coming Soon'
        },
        {
          title: 'Partner to On Premise',
          icon: Network,
          status: 'Coming Soon'
        }
      ]
    },
    {
      title: 'Unrestricted - Layer 3 VPN - IPV4 Configuration',
      subsections: [
        {
          title: 'Partner to On Premise',
          icon: Lock,
          status: 'Coming Soon'
        },
        {
          title: 'On Premise to Partner',
          icon: Lock,
          status: 'Coming Soon'
        }
      ]
    },
    {
      title: 'Unrestricted - Layer 3 VPN - IPV6 Configuration',
      subsections: [
        {
          title: 'On Premise to Partner',
          icon: Globe,
          status: 'Coming Soon'
        },
        {
          title: 'Partner to On Premise',
          icon: Globe,
          status: 'Coming Soon'
        }
      ]
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-fw-base rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-fw-secondary bg-fw-wash">
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] flex items-center">
              <AttIcon name="hub" className="h-6 w-6 text-fw-link mr-2" />
              {section.title}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            {section.subsections.map((subsection, subIndex) => {
              const Icon = subsection.icon;
              return (
                <div
                  key={subIndex}
                  className="p-4 bg-fw-wash rounded-lg border border-fw-secondary hover:border-fw-active transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-fw-base rounded-lg">
                        <Icon className="h-5 w-5 text-fw-bodyLight" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-figma-base font-medium text-fw-heading">{subsection.title}</h4>
                      </div>
                    </div>
                    <button 
                      className="text-figma-base text-fw-link hover:text-fw-linkHover flex items-center"
                      onClick={() => {
                        window.addToast({
                          type: 'info',
                          title: 'Coming Soon',
                          message: 'This feature will be available soon',
                          duration: 3000
                        });
                      }}
                    >
                      Configure
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
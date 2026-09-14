import { Network, Cable, Shield, Server, ArrowDown } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';

function HubIcon({ className }: { className?: string }) {
  return <AttIcon name="hub" className={className} />;
}

interface ConceptNode {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  examples?: string[];
}

const conceptHierarchy: ConceptNode[] = [
  {
    id: 'connection',
    title: 'Connection',
    description: 'Top-level network infrastructure connecting to cloud providers',
    icon: Network,
    color: 'blue',
    examples: ['Internet to Cloud', 'Cloud to Cloud', 'CoLocation to Cloud']
  },
  {
    id: 'hub',
    title: 'Hub',
    description: 'Virtual routing node that manages traffic and routing',
    icon: HubIcon,
    color: 'green',
    examples: ['BGP routing', 'Traffic management', 'Multiple links']
  },
  {
    id: 'link',
    title: 'Link (VLAN)',
    description: 'Virtual network segment with isolated traffic',
    icon: Cable,
    color: 'purple',
    examples: ['VLAN 100: Production', 'VLAN 200: Backup', 'VLAN 300: Management']
  },
  {
    id: 'vnf',
    title: 'VNF',
    description: 'Software-based network services and functions',
    icon: Shield,
    color: 'orange',
    examples: ['Firewall', 'SD-WAN', 'Virtual Router', 'NAT Service']
  }
];

const ipeNode: ConceptNode = {
  id: 'ipe',
  title: 'IPE (Infrastructure Provider Edge)',
  description: 'Physical router hardware providing actual bandwidth capacity',
  icon: Server,
  color: 'gray',
  examples: ['Data center routers', 'Cloud provider on-ramps', 'Physical infrastructure']
};

export function ConceptHierarchyDiagram() {
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fw-heading mb-2 tracking-[-0.03em]">
          Network Architecture Hierarchy
        </h2>
        <p className="text-fw-bodyLight">
          Understanding how network components relate to each other
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-green-200 via-purple-200 to-orange-200 -translate-x-1/2 hidden lg:block" />

        <div className="space-y-8">
          {conceptHierarchy.map((concept, index) => {
            const Icon = concept.icon;
            const isEven = index % 2 === 0;

            const colorClasses = {
              blue: {
                bg: 'from-blue-500 to-blue-600',
                border: 'border-fw-active',
                text: 'text-fw-linkHover',
                bgLight: 'bg-fw-accent',
                dot: 'bg-fw-link'
              },
              green: {
                bg: 'from-green-500 to-green-600',
                border: 'border-fw-success',
                text: 'text-fw-success',
                bgLight: 'bg-fw-successLight',
                dot: 'bg-fw-successLight0'
              },
              purple: {
                bg: 'from-purple-500 to-purple-600',
                border: 'border-fw-purple',
                text: 'text-fw-purple',
                bgLight: 'bg-fw-purpleLight',
                dot: 'bg-fw-purpleLight0'
              },
              orange: {
                bg: 'from-orange-500 to-orange-600',
                border: 'border-fw-warn',
                text: 'text-fw-warn',
                bgLight: 'bg-fw-warnLight',
                dot: 'bg-fw-warnLight0'
              }
            };

            const colors = colorClasses[concept.color as keyof typeof colorClasses];

            return (
              <div key={concept.id} className="relative">
                <div className="absolute left-1/2 top-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 hidden lg:block z-10">
                  <div className={`w-6 h-6 ${colors.dot} rounded-full border-4 border-white shadow-lg`} />
                </div>

                <div className={`lg:grid lg:grid-cols-2 lg:gap-8 ${isEven ? '' : 'lg:grid-flow-dense'}`}>
                  <div className={`${isEven ? 'lg:col-start-1 lg:text-right' : 'lg:col-start-2'} lg:pr-12 ${!isEven && 'lg:pl-12 lg:pr-0'}`}>
                    <div className={`bg-fw-base rounded-xl border-2 ${colors.border} shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                      <div className={`bg-gradient-to-r ${colors.bg} p-4`}>
                        <div className="flex items-center gap-3 text-white">
                          <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold">{concept.title}</h3>
                            <p className="text-figma-base text-white text-opacity-90">Level {index + 1}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <p className="text-figma-base text-fw-body leading-relaxed mb-4">
                          {concept.description}
                        </p>

                        {concept.examples && concept.examples.length > 0 && (
                          <div className={`${colors.bgLight} rounded-lg p-3 border ${colors.border}`}>
                            <p className={`text-figma-sm font-semibold ${colors.text} mb-2`}>Examples:</p>
                            <ul className="space-y-1">
                              {concept.examples.map((example, i) => (
                                <li key={i} className="flex items-start gap-2 text-figma-sm text-fw-body">
                                  <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full mt-1.5 flex-shrink-0`} />
                                  <span>{example}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`hidden lg:block ${isEven ? 'lg:col-start-2' : 'lg:col-start-1'}`} />
                </div>

                {index < conceptHierarchy.length - 1 && (
                  <div className="flex justify-center my-4 lg:hidden">
                    <ArrowDown className="h-6 w-6 text-fw-bodyLight animate-bounce" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 p-6 bg-fw-wash rounded-xl border-2 border-fw-secondary shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 bg-fw-base rounded-xl shadow-sm">
            <ipeNode.icon className="h-8 w-8 text-fw-bodyLight" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-fw-heading mb-2 tracking-[-0.03em]">{ipeNode.title}</h3>
            <p className="text-figma-base text-fw-body mb-3">{ipeNode.description}</p>
            <div className="bg-fw-base rounded-lg p-3 border border-fw-secondary">
              <p className="text-figma-sm font-semibold text-fw-body mb-2">Physical Layer:</p>
              <ul className="space-y-1">
                {ipeNode.examples?.map((example, i) => (
                  <li key={i} className="flex items-start gap-2 text-figma-sm text-fw-bodyLight">
                    <div className="w-1.5 h-1.5 bg-fw-bodyLight rounded-full mt-1.5 flex-shrink-0" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-fw-accent rounded-lg border border-fw-active">
          <p className="text-figma-sm text-fw-linkHover italic">
            <strong>Important:</strong> All virtual components (Connection, Hub, Links, VNFs) run on physical IPE infrastructure. The IPE provides the actual hardware and bandwidth that makes everything else possible.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-fw-accent rounded-lg border border-fw-active">
          <h4 className="text-figma-base font-semibold text-fw-linkHover mb-2 tracking-[-0.03em]">Containment Hierarchy</h4>
          <p className="text-figma-sm text-fw-body leading-relaxed">
            Each level contains the levels below it: A Connection contains Hubs, which contain Links, which can have VNFs attached. Think of it as nested layers, each building on the previous one.
          </p>
        </div>

        <div className="p-4 bg-fw-purpleLight rounded-lg border border-fw-purpleLight">
          <h4 className="text-figma-base font-semibold text-fw-purple mb-2 tracking-[-0.03em]">Traffic Flow</h4>
          <p className="text-figma-sm text-fw-body leading-relaxed">
            Data flows from top to bottom through each layer. A packet entering your Connection is routed by a Hub, sent through a specific Link (VLAN), and potentially processed by VNFs before reaching its destination.
          </p>
        </div>
      </div>
    </div>
  );
}

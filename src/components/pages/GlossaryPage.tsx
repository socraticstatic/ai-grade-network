import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, BookOpen, Network, Cable, Shield, Layers, Eye } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { glossaryTerms, glossaryCategories, searchTerms, getTermsByCategory, getTermById } from '../../data/glossary';
import { Button } from '../common/Button';
import { ConceptHierarchyDiagram } from '../common/ConceptHierarchyDiagram';
import { TerminologyExample } from '../common/TerminologyExample';

export function GlossaryPage() {
  const location = useLocation();
  const initialTermId = (location.state as any)?.termId;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(initialTermId || 'bandwidth');
  const [showDiagram, setShowDiagram] = useState(false);

  const filteredTerms = useMemo(() => {
    let terms = searchQuery ? searchTerms(searchQuery) : glossaryTerms;

    if (selectedCategory) {
      terms = terms.filter(term => term.category === selectedCategory);
    }

    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  const selectedTermData = selectedTerm ? getTermById(selectedTerm) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-fw-wash via-fw-blue-light to-fw-wash">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-fw-cobalt-700 to-fw-blue-700 rounded-2xl">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">Network Glossary</h1>
              <p className="text-figma-base text-fw-body mt-1 tracking-[-0.03em]">Understanding key networking concepts and terminology</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-fw-bodyLight" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms, definitions, and examples..."
                className="w-full pl-12 pr-4 h-9 bg-fw-base border border-fw-secondary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-transparent text-figma-base"
              />
            </div>
            <Button
              variant={showDiagram ? 'primary' : 'secondary'}
              onClick={() => setShowDiagram(!showDiagram)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Eye className="h-4 w-4" />
              {showDiagram ? 'Hide' : 'View'} Hierarchy
            </Button>
          </div>
        </div>

        {showDiagram && (
          <div className="mb-8 bg-fw-base rounded-2xl border border-fw-secondary p-6">
            <ConceptHierarchyDiagram />
          </div>
        )}

        <div className="mb-8">
          <TerminologyExample />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-200 ${
              selectedCategory === null
                ? 'border-fw-active bg-fw-accent text-fw-link'
                : 'border-fw-secondary bg-fw-base text-fw-heading hover:border-fw-active'
            }`}
          >
            <BookOpen className={`h-4 w-4 ${selectedCategory === null ? 'text-fw-link' : 'text-fw-bodyLight'}`} />
            <span className="text-figma-base font-medium tracking-[-0.03em]">All Terms</span>
            <span className={`text-figma-sm font-medium ${selectedCategory === null ? 'text-fw-link' : 'text-fw-bodyLight'}`}>
              {glossaryTerms.length}
            </span>
          </button>

          {Object.entries(glossaryCategories).map(([key, category]) => {
            const Icon = category.icon;
            const categoryTerms = getTermsByCategory(key);
            const isSelected = selectedCategory === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(isSelected ? null : key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-fw-active bg-fw-accent text-fw-link'
                    : 'border-fw-secondary bg-fw-base text-fw-heading hover:border-fw-active'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-fw-link' : 'text-fw-bodyLight'}`} />
                <span className="text-figma-base font-medium tracking-[-0.03em]">{category.name}</span>
                <span className={`text-figma-sm font-medium ${isSelected ? 'text-fw-link' : 'text-fw-bodyLight'}`}>
                  {categoryTerms.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-6">
          {/* Vertical Sidebar Nav - matches marketplace/reporting/alerts standard */}
          <div className="w-[186px] shrink-0 border-r border-fw-secondary pr-4">
            <nav className="space-y-1" aria-label="Glossary Terms">
              {filteredTerms.map((term) => {
                const Icon = term.icon;
                const isSelected = selectedTerm === term.id;

                return (
                  <button
                    key={term.id}
                    onClick={() => setSelectedTerm(term.id)}
                    className={`
                      w-full flex items-center text-left gap-2 px-4 py-3 text-figma-base font-medium no-rounded
                      transition-colors duration-200 border-l-2 tracking-[-0.03em]
                      ${isSelected
                        ? 'border-fw-active text-fw-link'
                        : 'border-transparent text-fw-heading hover:text-fw-link hover:border-fw-secondary'
                      }
                    `}
                  >
                    {Icon && (
                      <Icon className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-fw-link' : 'text-fw-heading'}`} />
                    )}
                    <span className="truncate">{term.term}</span>
                  </button>
                );
              })}

              {filteredTerms.length === 0 && (
                <div className="text-center py-8 px-4">
                  <Search className="h-8 w-8 text-fw-bodyLight mx-auto mb-2" />
                  <p className="text-fw-bodyLight text-figma-sm">No terms found</p>
                </div>
              )}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {selectedTermData ? (
              <div className="bg-fw-base rounded-2xl border border-fw-secondary overflow-hidden">
                <div className="bg-gradient-to-r from-fw-cobalt-600 to-fw-cobalt-700 p-6 text-white">
                  <div className="flex items-start gap-4">
                    {selectedTermData.icon && (
                      <div className="flex-shrink-0 p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                        <selectedTermData.icon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-figma-xl font-bold mb-2 tracking-[-0.03em]">{selectedTermData.term}</h2>
                      <p className="text-white/80 text-figma-sm uppercase tracking-wide font-medium">
                        {selectedTermData.category}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-figma-sm font-semibold text-fw-heading mb-2 tracking-[-0.03em]">
                      Quick Definition
                    </h3>
                    <p className="text-figma-base text-fw-body leading-relaxed">
                      {selectedTermData.shortDefinition}
                    </p>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-fw-secondary to-transparent" />

                  <div>
                    <h3 className="text-figma-sm font-semibold text-fw-heading mb-2 tracking-[-0.03em]">
                      Detailed Explanation
                    </h3>
                    <p className="text-figma-base font-medium text-fw-body leading-relaxed">
                      {selectedTermData.detailedDefinition}
                    </p>
                  </div>

                  {selectedTermData.example && (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-fw-secondary to-transparent" />

                      <div className="bg-fw-accent rounded-2xl p-5 border border-fw-active">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 p-2 bg-fw-base rounded-lg shadow-sm">
                            <Network className="h-5 w-5 text-fw-link" />
                          </div>
                          <div>
                            <h3 className="text-figma-sm font-semibold text-fw-heading mb-2">
                              Real-World Example
                            </h3>
                            <p className="text-figma-base font-medium text-fw-linkHover leading-relaxed italic">
                              {selectedTermData.example}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedTermData.visualAid === 'hierarchy' && (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-fw-secondary to-transparent" />

                      <div>
                        <h3 className="text-figma-sm font-semibold text-fw-heading mb-4 tracking-[-0.03em]">
                          Visual Hierarchy
                        </h3>
                        <div className="bg-fw-wash rounded-2xl p-6 border border-fw-secondary">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-fw-base rounded-lg border-2 border-fw-active shadow-sm">
                              <Network className="h-6 w-6 text-fw-link flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-figma-base text-fw-heading tracking-[-0.03em]">Connection</div>
                                <div className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Top-level network infrastructure</div>
                              </div>
                            </div>

                            <div className="ml-8 flex items-center gap-2">
                              <div className="w-px h-8 bg-gradient-to-b from-fw-cobalt-400 to-transparent" />
                            </div>

                            <div className="ml-8 flex items-center gap-3 p-4 bg-fw-base rounded-lg border-2 border-fw-success shadow-sm">
                              <AttIcon name="hub" className="h-6 w-6 text-fw-success flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-figma-base text-fw-heading tracking-[-0.03em]">Hub</div>
                                <div className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Virtual routing node</div>
                              </div>
                            </div>

                            <div className="ml-16 flex items-center gap-2">
                              <div className="w-px h-8 bg-gradient-to-b from-fw-green-400 to-transparent" />
                            </div>

                            <div className="ml-16 flex items-center gap-3 p-4 bg-fw-base rounded-lg border-2 border-fw-purple shadow-sm">
                              <Cable className="h-6 w-6 text-fw-purple flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-figma-base text-fw-heading tracking-[-0.03em]">Link (VLAN)</div>
                                <div className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">Virtual network segment</div>
                              </div>
                            </div>

                            <div className="ml-24 flex items-center gap-2">
                              <div className="w-px h-8 bg-gradient-to-b from-fw-purple to-transparent" />
                            </div>

                            <div className="ml-24 flex items-center gap-3 p-4 bg-fw-base rounded-lg border-2 border-fw-warn shadow-sm">
                              <Shield className="h-6 w-6 text-fw-warn flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-figma-base text-fw-heading">VNF (Virtual Network Function)</div>
                                <div className="text-figma-sm text-fw-bodyLight">Network services (firewall, SD-WAN, etc.)</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedTermData.relatedTerms && selectedTermData.relatedTerms.length > 0 && (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-fw-secondary to-transparent" />

                      <div>
                        <h3 className="text-figma-sm font-semibold text-fw-heading mb-3 tracking-[-0.03em]">
                          Related Terms
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedTermData.relatedTerms.map(relatedId => {
                            const relatedTerm = getTermById(relatedId);
                            return relatedTerm ? (
                              <button
                                key={relatedId}
                                onClick={() => setSelectedTerm(relatedId)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-fw-wash hover:bg-fw-accent border border-fw-secondary hover:border-fw-active rounded-lg transition-all duration-200 group"
                              >
                                {relatedTerm.icon && (
                                  <relatedTerm.icon className="h-4 w-4 text-fw-bodyLight group-hover:text-fw-link" />
                                )}
                                <span className="text-figma-base font-medium text-fw-body group-hover:text-fw-linkHover">
                                  {relatedTerm.term}
                                </span>
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-fw-base rounded-2xl border border-dashed border-fw-secondary h-full flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-fw-accent rounded-full mb-4">
                    <BookOpen className="h-12 w-12 text-fw-link" />
                  </div>
                  <h3 className="text-figma-lg font-bold text-fw-heading mb-2 tracking-[-0.03em]">
                    Select a term to learn more
                  </h3>
                  <p className="text-figma-base font-medium text-fw-bodyLight max-w-xs mx-auto">
                    Click on any term from the list to view its detailed explanation, examples, and related concepts
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

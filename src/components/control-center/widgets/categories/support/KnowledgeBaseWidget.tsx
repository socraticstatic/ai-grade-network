import { Book, Search, ChevronRight } from 'lucide-react';

export function KnowledgeBaseWidget() {
  const articles = [
    {
      id: '1',
      title: 'Getting Started with AWS Interconnect – last mile',
      category: 'Guides',
      views: 1234
    },
    {
      id: '2',
      title: 'Troubleshooting Connection Issues',
      category: 'Troubleshooting',
      views: 856
    },
    {
      id: '3',
      title: 'Security Best Practices',
      category: 'Security',
      views: 567
    }
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight h-4 w-4" />
        <input
          type="text"
          placeholder="Search knowledge base..."
          className="w-full pl-9 pr-4 h-9 text-figma-base border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active"
        />
      </div>

      <div className="space-y-2">
        {articles.map((article) => (
          <button
            key={article.id}
            className="w-full flex items-center justify-between p-2 bg-fw-wash rounded-lg hover:bg-fw-neutral transition-colors group"
          >
            <div className="flex items-center">
              <Book className="h-4 w-4 text-fw-bodyLight mr-2" />
              <div className="text-left">
                <div className="text-figma-base font-medium text-fw-heading group-hover:text-fw-link">
                  {article.title}
                </div>
                <div className="text-figma-sm text-fw-bodyLight">
                  {article.category} - {article.views.toLocaleString()} views
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-fw-bodyLight group-hover:text-fw-link" />
          </button>
        ))}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        Browse All Articles
      </button>
    </div>
  );
}

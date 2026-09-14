import { Search, X } from 'lucide-react';

interface LinkSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function LinkSearchBar({ searchQuery, setSearchQuery }: LinkSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight h-4 w-4" />
      <input
        type="text"
        placeholder="Search links..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 pr-4 py-2 border border-fw-secondary rounded-full focus:ring-2 focus:ring-brand-blue focus:border-brand-blue text-figma-base"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight hover:text-fw-body"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
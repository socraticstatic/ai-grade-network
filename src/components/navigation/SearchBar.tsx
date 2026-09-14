import { useState } from 'react';
import { X } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch?.('');
  };

  return (
    <div className="relative">
      {showSearch ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full md:w-[560px] animate-in slide-in-from-right-5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search connections, settings, documentation..."
              className="w-full pl-11 pr-10 h-10 text-figma-base font-medium bg-fw-base rounded-full
                focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-transparent
                placeholder:text-fw-bodyLight"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onBlur={() => !searchQuery && setShowSearch(false)}
              autoFocus
            />
            <AttIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-fw-link" />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-fw-neutral transition-colors"
              >
                <X className="h-4 w-4 text-fw-bodyLight" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="p-2 text-fw-heading hover:text-fw-body hover:bg-fw-wash rounded-lg transition-colors duration-200"
        >
          <AttIcon name="search" className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
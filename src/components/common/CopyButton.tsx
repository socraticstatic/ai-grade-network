import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      onClick={handleCopy}
      className={`relative p-1 text-fw-disabled hover:text-fw-link rounded transition-colors ${className}`}
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-fw-success" /> : <Copy className="h-3 w-3" />}
      {copied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-fw-heading text-white whitespace-nowrap">
          Copied
        </span>
      )}
    </button>
  );
}

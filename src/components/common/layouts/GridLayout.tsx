import { ReactNode } from 'react';

interface GridLayoutProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6;
  gap?: 2 | 4 | 6 | 8;
  className?: string;
}

function GridLayout({
  children,
  cols = 3,
  gap = 6,
  className = ''
}: GridLayoutProps) {
  return (
    <div className={`
      grid grid-cols-1
      ${cols === 2 ? 'md:grid-cols-2' :
        cols === 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
        cols === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
        cols === 6 ? 'md:grid-cols-3 lg:grid-cols-6' :
        ''}
      gap-${gap}
      ${className}
    `}>
      {children}
    </div>
  );
}
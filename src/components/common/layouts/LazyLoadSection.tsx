import { useRef, useEffect, useState, ReactNode } from 'react';

interface LazyLoadSectionProps {
  children: ReactNode;
  placeholder?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

export function LazyLoadSection({
  children,
  placeholder,
  threshold = 0.1,
  rootMargin = '200px 0px',
  className = ''
}: LazyLoadSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder}
    </div>
  );
}
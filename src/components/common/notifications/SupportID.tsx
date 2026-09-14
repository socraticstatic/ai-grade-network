import { Link } from 'react-router-dom';

interface SupportIDProps {
  id: string;
}

export function SupportID({ id }: SupportIDProps) {
  return (
    <span className="text-figma-sm text-fw-bodyLight">
      Support ID:{' '}
      <Link
        to={`/support/tickets/${id}`}
        className="font-mono text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors"
      >
        {id}
      </Link>
    </span>
  );
}

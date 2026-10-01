import type { ReactNode } from 'react';
import { Link } from 'react-router';

import {
  SectionActions,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from '@rfdtech/components';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  title,
  description,
  actions,
  meta,
  backTo,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  backTo?: { to: string; label: string };
}) {
  return (
    <SectionHeader>
      <div className="min-w-0 space-y-1">
        {backTo ? (
          <Link
            to={backTo.to}
            className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-foreground-muted hover:text-foreground"
          >
            <ChevronLeft size={16} />
            {backTo.label}
          </Link>
        ) : null}
        <SectionTitle>{title}</SectionTitle>
        {description ? <SectionDescription>{description}</SectionDescription> : null}
        {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
      </div>
      {actions ? <SectionActions>{actions}</SectionActions> : null}
    </SectionHeader>
  );
}

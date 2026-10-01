import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { SectionActions, SectionDescription, SectionHeader } from '@rfdtech/components';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Renders a back link above the title. Detail pages should always set this. */
  backTo?: { to: string; label: string };
  /** Status chips or metadata shown under the description. */
  meta?: ReactNode;
}

/**
 * The single page-title block. Every page uses it so the title, description and
 * action buttons land in the same place and at the same size throughout.
 */
export function PageHeader({ title, description, actions, backTo, meta }: PageHeaderProps) {
  return (
    <SectionHeader>
      <div className="min-w-0 space-y-1">
        {backTo ? (
          <Link
            to={backTo.to}
            className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-foreground-muted hover:text-foreground"
          >
            <ChevronLeft size={16} aria-hidden />
            {backTo.label}
          </Link>
        ) : null}
        {/* The starter's page title: 24px Lato. The library's `SectionTitle`
            is a 40px serif display heading, too loud for working screens. */}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <SectionDescription>{description}</SectionDescription> : null}
        {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
      </div>
      {actions ? <SectionActions>{actions}</SectionActions> : null}
    </SectionHeader>
  );
}

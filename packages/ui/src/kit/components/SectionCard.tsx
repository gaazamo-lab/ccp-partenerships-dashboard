import type { ReactNode } from 'react';

import { Card, CardActions, CardHeader, CardTitle } from '@rfdtech/components';

interface SectionCardProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * `Card` + header composition used by every page section. The library ships the
 * parts separately (no `header` prop), so this wrapper keeps call sites short
 * and the header spacing identical everywhere.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="min-w-0 space-y-0.5">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <div className="text-sm text-foreground-muted">{description}</div>
          ) : null}
        </div>
        {actions ? <CardActions>{actions}</CardActions> : null}
      </CardHeader>
      {children}
    </Card>
  );
}

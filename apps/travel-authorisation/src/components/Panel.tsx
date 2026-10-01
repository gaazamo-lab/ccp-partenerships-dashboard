import type { ReactNode } from 'react';

import { Card, CardActions, CardHeader, CardTitle } from '@rfdtech/components';

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="min-w-0 space-y-0.5">
          <CardTitle>{title}</CardTitle>
          {description ? <p className="text-sm text-foreground-muted">{description}</p> : null}
        </div>
        {actions ? <CardActions>{actions}</CardActions> : null}
      </CardHeader>
      {children}
    </Card>
  );
}

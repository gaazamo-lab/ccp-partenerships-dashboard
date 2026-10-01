import type { ReactNode } from 'react';

import { Button, Card, Notice } from '@rfdtech/components';
import { Loader2, RotateCcw } from 'lucide-react';

import { useMicrosites } from '@/features/microsites/state/useMicrosites';

/**
 * Holds a page back until the first load finishes, and offers a retry when it
 * fails — so no screen renders an empty list that is really an outage.
 */
export function LoadGate({ children }: { children: ReactNode }) {
  const { loading, error, sites, reload } = useMicrosites();

  if (error && sites.length === 0) {
    return (
      <Notice variant="error" title="Microsites could not be loaded" leftBorder>
        <div className="flex flex-wrap items-center gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            <RotateCcw size={15} aria-hidden /> Try again
          </Button>
        </div>
      </Notice>
    );
  }

  if (loading && sites.length === 0) {
    return (
      <Card bordered>
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-foreground-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden /> Loading microsites…
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}

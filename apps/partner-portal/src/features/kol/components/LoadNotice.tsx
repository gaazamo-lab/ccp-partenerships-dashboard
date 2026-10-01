import { Button, Notice } from '@rfdtech/components';
import { RotateCcw } from 'lucide-react';

import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import { useKol } from '@/features/kol/state/useKol';

/** Shows the load failure with a retry, and the read-only banner for viewer roles. */
export function LoadNotice({ canManage }: { canManage: boolean }) {
  const { error, reload, loading } = useKol();
  return (
    <>
      {error ? (
        <Notice variant="error" title="KOL records could not be loaded" leftBorder>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void reload()}>
              <RotateCcw size={14} aria-hidden /> Try again
            </Button>
          </div>
        </Notice>
      ) : null}
      {!canManage ? (
        <Notice variant="info" title="Read-only access" leftBorder>
          {MANAGE_DENIED_REASON} Exports remain available where your role allows them.
        </Notice>
      ) : null}
    </>
  );
}

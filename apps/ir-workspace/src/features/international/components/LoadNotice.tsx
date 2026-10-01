import { Button, Notice } from '@rfdtech/components';

import { useIr } from '../state/useIr';

/** Shows a load failure with a retry, so an empty list is never mistaken for no data. */
export function LoadNotice() {
  const { error, reload } = useIr();
  if (!error) return null;
  return (
    <Notice variant="error" title="S083 records could not be loaded" leftBorder>
      <div className="flex flex-wrap items-center gap-3">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    </Notice>
  );
}

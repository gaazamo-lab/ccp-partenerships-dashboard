import { useState } from 'react';

import { Badge, Button } from '@rfdtech/components';
import { Monitor, Smartphone } from 'lucide-react';

import type { PublicMicrosite } from '@partner-crm/types';

import { MicrositeRenderer } from '@/components/MicrositeRenderer';

type Width = 'desktop' | 'mobile';

/** Live preview through the same renderer the public viewer uses. */
export function PreviewTab({ site, dirty }: { site: PublicMicrosite; dirty: boolean }) {
  const [width, setWidth] = useState<Width>('desktop');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          {dirty ? <Badge variant="warning">Unsaved changes</Badge> : <Badge variant="outline">Saved version</Badge>}
          <span>This is exactly what visitors will see once published.</span>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Preview width">
          <Button size="sm" variant={width === 'desktop' ? 'secondary' : 'ghost'} aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}>
            <Monitor size={15} aria-hidden /> Desktop
          </Button>
          <Button size="sm" variant={width === 'mobile' ? 'secondary' : 'ghost'} aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}>
            <Smartphone size={15} aria-hidden /> Mobile
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-subtle p-3 sm:p-5">
        <div
          className={`mx-auto overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-[max-width] ${
            width === 'mobile' ? 'max-w-[390px]' : 'max-w-full'
          }`}
        >
          <MicrositeRenderer site={site} showEmptyBlocks />
        </div>
      </div>
    </div>
  );
}

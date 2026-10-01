import type { ReactNode } from 'react';

import { Badge } from '@rfdtech/components';
import { CheckCircle2 } from 'lucide-react';

import type { MicrositeTemplate } from '@partner-crm/types';

import { BLOCK_LABELS, PURPOSE_LABELS } from '@/features/microsites/labels';

interface TemplateCardProps {
  template: MicrositeTemplate;
  /** Selectable mode (create flow): the whole card is a toggle. */
  selected?: boolean;
  onSelect?: () => void;
  footer?: ReactNode;
}

/** One template: purpose, what it is for, and the blocks it starts with. */
export function TemplateCard({ template, selected, onSelect, footer }: TemplateCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Badge variant="outline" size="sm">
            {PURPOSE_LABELS[template.purpose]}
          </Badge>
          <h3 className="pt-1 text-base font-semibold text-foreground">{template.name}</h3>
        </div>
        {onSelect ? (
          <CheckCircle2
            size={20}
            aria-hidden
            className={selected ? 'shrink-0 text-primary' : 'shrink-0 text-border'}
          />
        ) : null}
      </div>
      <p className="text-sm leading-6 text-foreground-muted">{template.description}</p>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {template.blockTypes.length} starting blocks
        </p>
        <ol className="flex flex-wrap gap-1.5">
          {template.blockTypes.map((type, index) => (
            <li key={`${type}-${index}`}>
              <Badge variant="default" size="sm">
                {BLOCK_LABELS[type]}
              </Badge>
            </li>
          ))}
        </ol>
      </div>
      {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
    </>
  );

  const frame = `flex h-full flex-col gap-3 rounded-xl border p-5 text-left transition-colors ${
    selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-surface'
  }`;

  if (onSelect) {
    return (
      <button type="button" aria-pressed={selected} onClick={onSelect} className={`${frame} hover:border-primary/50`}>
        {body}
      </button>
    );
  }
  return <div className={frame}>{body}</div>;
}

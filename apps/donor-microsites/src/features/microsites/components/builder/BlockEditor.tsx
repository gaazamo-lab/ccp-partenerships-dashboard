import { Notice } from '@rfdtech/components';

import type { MicrositeBlock } from '@partner-crm/types';
import { FormGrid, TextField, TextareaField } from '@partner-crm/ui';

import { BLOCK_DESCRIPTIONS, BLOCK_LABELS } from '@/features/microsites/labels';

import { AllocationsEditor, AssetRefsEditor, LinksEditor, MetricsEditor } from './RowEditors';

interface BlockEditorProps {
  block: MicrositeBlock;
  onChange: (block: MicrositeBlock) => void;
  /** Problems from the last save attempt, as one sentence list. */
  error?: string;
  disabled?: boolean;
}

/** Copy for the heading/body fields, per block type. */
const COPY: Record<MicrositeBlock['type'], { heading: string; body: string; bodyHint?: string; rows?: number }> = {
  HERO: { heading: 'Headline', body: 'Introduction', bodyHint: 'Leave the headline empty to use the microsite title.', rows: 3 },
  RICH_TEXT: { heading: 'Heading', body: 'Text', bodyHint: 'Separate paragraphs with a blank line.', rows: 8 },
  METRICS: { heading: 'Heading', body: 'Introduction (optional)', rows: 2 },
  FUND_UTILISATION: { heading: 'Heading', body: 'Introduction (optional)', rows: 2 },
  STORY: { heading: 'Story title', body: 'Story', bodyHint: 'Separate paragraphs with a blank line.', rows: 6 },
  QUOTE: { heading: 'Eyebrow (optional)', body: 'Quote', rows: 3 },
  GALLERY: { heading: 'Heading', body: 'Caption (optional)', rows: 2 },
  CALL_TO_ACTION: { heading: 'Heading', body: 'Message', rows: 3 },
  DOWNLOADS: { heading: 'Heading', body: 'Introduction (optional)', rows: 2 },
};

export function BlockEditor({ block, onChange, error, disabled }: BlockEditorProps) {
  const copy = COPY[block.type];
  const set = (patch: Partial<MicrositeBlock>) => onChange({ ...block, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">{BLOCK_LABELS[block.type]}</h3>
        <p className="text-sm text-foreground-muted">{BLOCK_DESCRIPTIONS[block.type]}</p>
      </div>

      {error ? (
        <Notice variant="error" title="Fix this block before saving" leftBorder>
          {error}
        </Notice>
      ) : null}

      <TextField label={copy.heading} value={block.heading} onChange={(heading) => set({ heading })} disabled={disabled} />
      <TextareaField
        label={copy.body}
        rows={copy.rows}
        value={block.body}
        onChange={(body) => set({ body })}
        // description={copy.bodyHint}
        disabled={disabled}
      />

      {block.type === 'QUOTE' ? (
        <TextField
          label="Attribution"
          value={block.attribution}
          onChange={(attribution) => set({ attribution })}
          placeholder="Name, role"
          disabled={disabled}
        />
      ) : null}

      {block.type === 'HERO' || block.type === 'STORY' || block.type === 'GALLERY' ? (
        <AssetRefsEditor
          refs={block.assetRefs}
          onChange={(assetRefs) => set({ assetRefs })}
          single={block.type !== 'GALLERY'}
          disabled={disabled}
        />
      ) : null}

      {block.type === 'METRICS' ? (
        <MetricsEditor rows={block.metrics} onChange={(metrics) => set({ metrics })} disabled={disabled} />
      ) : null}

      {block.type === 'FUND_UTILISATION' ? (
        <>
          <FormGrid>
            <TextField
              label="Currency"
              value={block.currency}
              onChange={(currency) => set({ currency })}
              transform={(value) => value.toUpperCase().slice(0, 3)}
              // description="ISO code; GHS for Ghana cedis."
              disabled={disabled}
            />
          </FormGrid>
          <AllocationsEditor
            rows={block.allocations}
            currency={block.currency}
            onChange={(allocations) => set({ allocations })}
            disabled={disabled}
          />
        </>
      ) : null}

      {block.type === 'CALL_TO_ACTION' || block.type === 'DOWNLOADS' ? (
        <LinksEditor
          title={block.type === 'DOWNLOADS' ? 'Documents' : 'Buttons'}
          rows={block.links}
          onChange={(links) => set({ links })}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

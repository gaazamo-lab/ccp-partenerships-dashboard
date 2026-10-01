import { useState } from 'react';

import { Badge, Button, Notice, Popover, PopoverContent, PopoverTrigger } from '@rfdtech/components';
import { ArrowDown, ArrowUp, LayoutList, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

import type { MicrositeBlockType, UpdateMicrositeInput } from '@partner-crm/types';
import { EmptyState, FormGrid, SectionCard, TextField, TextareaField } from '@partner-crm/ui';

import { BLOCK_TYPES, type FieldErrors, SLUG_MAX, createBlock, moveBlock } from '@/features/microsites/domain';
import { BLOCK_DESCRIPTIONS, BLOCK_LABELS } from '@/features/microsites/labels';

import { BlockEditor } from './BlockEditor';

interface ContentTabProps {
  draft: UpdateMicrositeInput;
  onDraftChange: (draft: UpdateMicrositeInput) => void;
  errors: FieldErrors;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Why editing is unavailable (status or role); `null` when it is allowed. */
  lockedReason: string | null;
  /** Saving an approved site returns it to draft. */
  approved: boolean;
}

function AddBlockMenu({ onAdd, disabled }: { onAdd: (type: MicrositeBlockType) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus size={15} aria-hidden /> Add block
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1">
        <div className="flex max-h-96 flex-col overflow-y-auto">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-subtle"
            >
              <span className="block text-sm font-medium text-foreground">{BLOCK_LABELS[type]}</span>
              <span className="mt-0.5 block text-xs text-foreground-muted">{BLOCK_DESCRIPTIONS[type]}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ContentTab({
  draft,
  onDraftChange,
  errors,
  dirty,
  saving,
  onSave,
  onDiscard,
  lockedReason,
  approved,
}: ContentTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(draft.blocks[0]?.id ?? null);
  const locked = lockedReason !== null;
  const selected = draft.blocks.find((block) => block.id === selectedId) ?? draft.blocks[0] ?? null;

  const set = (patch: Partial<UpdateMicrositeInput>) => onDraftChange({ ...draft, ...patch });

  const addBlock = (type: MicrositeBlockType) => {
    const block = createBlock(type, `blk-${crypto.randomUUID()}`);
    const at = selected ? draft.blocks.findIndex((item) => item.id === selected.id) + 1 : draft.blocks.length;
    set({ blocks: [...draft.blocks.slice(0, at), block, ...draft.blocks.slice(at)] });
    setSelectedId(block.id);
  };

  const removeBlock = (id: string) => {
    const index = draft.blocks.findIndex((block) => block.id === id);
    const blocks = draft.blocks.filter((block) => block.id !== id);
    set({ blocks });
    if (selected?.id === id) setSelectedId(blocks[Math.min(index, blocks.length - 1)]?.id ?? null);
  };

  const blockErrors = Object.keys(errors).filter((key) => key.startsWith('blocks.')).length;

  return (
    <div className="flex flex-col gap-6">
      {lockedReason ? (
        <Notice variant="warning" title="Content is read-only" leftBorder>
          {lockedReason}
        </Notice>
      ) : approved ? (
        <Notice variant="info" title="This version is approved" leftBorder>
          Saving changes creates a new version and returns the microsite to draft; it will need review again.
        </Notice>
      ) : null}

      {blockErrors > 0 ? (
        <Notice variant="error" title="Some blocks need attention" leftBorder>
          {blockErrors} block{blockErrors === 1 ? ' has' : 's have'} problems. They are marked in the block list.
        </Notice>
      ) : null}

      <SectionCard
        title="Site details"
        // description="Shown in the hero band, the public listing and the browser tab."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={onDiscard}>
              <RotateCcw size={15} aria-hidden /> Discard
            </Button>
            <Button size="sm" disabled={locked || !dirty || saving} loading={saving} onClick={onSave}>
              <Save size={15} aria-hidden /> Save changes
            </Button>
          </div>
        }
      >
        <FormGrid>
          <TextField label="Title" required value={draft.title} onChange={(title) => set({ title })} error={errors.title} disabled={locked} />
          <TextField
            label="Slug"
            required
            value={draft.slug}
            onChange={(slug) => set({ slug })}
            transform={(value) => value.toLowerCase().replace(/\s+/g, '-')}
            maxLength={SLUG_MAX}
            // description={`Public address: /sites/${draft.slug || 'your-slug'}`}
            error={errors.slug}
            disabled={locked}
          />
          <TextField
            label="Accent colour"
            value={draft.accentColor}
            onChange={(accentColor) => set({ accentColor })}
            placeholder="#0F766E"
            // description="Hex colour for the hero and highlights. Leave empty to inherit the CLET brand colour from S080."
            error={errors.accentColor}
            disabled={locked}
          />
        </FormGrid>
        <div className="mt-4">
          <TextareaField label="Tagline" rows={2} value={draft.tagline} onChange={(tagline) => set({ tagline })} disabled={locked} />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <SectionCard
          title={`Blocks (${draft.blocks.length})`}
          // description="Visitors see them top to bottom."
          actions={<AddBlockMenu onAdd={addBlock} disabled={locked} />}
        >
          {draft.blocks.length === 0 ? (
            <EmptyState
              message="No blocks yet"
              hint="Add a hero banner first, then metrics, stories and a call to action."
              icon={<LayoutList size={22} aria-hidden />}
            />
          ) : (
            <ol className="space-y-2">
              {draft.blocks.map((block, index) => {
                const active = selected?.id === block.id;
                const invalid = Boolean(errors[`blocks.${block.id}`]);
                return (
                  <li
                    key={block.id}
                    className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                      active ? 'border-primary bg-primary/5' : invalid ? 'border-error' : 'border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(block.id)}
                      aria-current={active ? 'true' : undefined}
                      className="min-w-0 flex-1 px-1 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-foreground-muted">{index + 1}</span>
                        <span className="truncate text-sm font-semibold text-foreground">{BLOCK_LABELS[block.type]}</span>
                        {invalid ? (
                          <Badge variant="error" size="sm">
                            Fix
                          </Badge>
                        ) : null}
                      </span>
                      <span className="block truncate pl-5 text-xs text-foreground-muted">
                        {block.heading.trim() || 'No heading'}
                      </span>
                    </button>
                    <div className="flex shrink-0">
                      <Button size="sm" variant="ghost" aria-label={`Move block ${index + 1} up`} disabled={locked || index === 0}
                        onClick={() => set({ blocks: moveBlock(draft.blocks, index, -1) })}>
                        <ArrowUp size={14} aria-hidden />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Move block ${index + 1} down`}
                        disabled={locked || index === draft.blocks.length - 1}
                        onClick={() => set({ blocks: moveBlock(draft.blocks, index, 1) })}>
                        <ArrowDown size={14} aria-hidden />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Remove block ${index + 1}`} disabled={locked}
                        onClick={() => removeBlock(block.id)}>
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>

        <SectionCard title="Block editor">
          {selected ? (
            <BlockEditor
              key={selected.id}
              block={selected}
              error={errors[`blocks.${selected.id}`]}
              disabled={locked}
              onChange={(next) => set({ blocks: draft.blocks.map((block) => (block.id === next.id ? next : block)) })}
            />
          ) : (
            <EmptyState
              message="Select a block to edit it"
              hint="Or add one with the Add block menu."
              icon={<LayoutList size={22} aria-hidden />}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

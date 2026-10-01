import { type ReactNode, useState } from 'react';

import { Button, Input } from '@rfdtech/components';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';

import type { MicrositeAllocation, MicrositeLink, MicrositeMetric } from '@partner-crm/types';

import { formatMoney, isImageUrl, moveBlock } from '@/features/microsites/domain';

import { MediaSelectorModal } from './MediaSelectorModal';

/* Compact repeating-row editors used inside the block editor. */

function RowShell({
  title,
  hint,
  onAdd,
  addLabel,
  disabled,
  children,
  empty,
}: {
  title: string;
  hint?: string;
  onAdd: () => void;
  addLabel: string;
  disabled?: boolean;
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <legend className="text-sm font-semibold text-foreground">{title}</legend>
          {hint ? <p className="text-xs text-foreground-muted">{hint}</p> : null}
        </div>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onAdd}>
          <Plus size={14} aria-hidden /> {addLabel}
        </Button>
      </div>
      {empty ? <p className="text-sm text-foreground-muted">Nothing added yet.</p> : children}
    </fieldset>
  );
}

function RowActions({
  index,
  count,
  label,
  disabled,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  label: string;
  disabled?: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button type="button" size="sm" variant="ghost" aria-label={`Move ${label} up`} disabled={disabled || index === 0} onClick={() => onMove(-1)}>
        <ArrowUp size={14} aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Move ${label} down`}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={14} aria-hidden />
      </Button>
      <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${label}`} disabled={disabled} onClick={onRemove}>
        <Trash2 size={14} aria-hidden />
      </Button>
    </div>
  );
}

function update<T>(rows: T[], index: number, patch: Partial<T>): T[] {
  return rows.map((row, position) => (position === index ? { ...row, ...patch } : row));
}

export function MetricsEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: MicrositeMetric[];
  onChange: (rows: MicrositeMetric[]) => void;
  disabled?: boolean;
}) {
  return (
    <RowShell
      title="Metrics"
      hint="Each figure must cite where it came from: S225 reporting or S150 examinations, e.g. S225:bar-call-2025."
      addLabel="Add metric"
      disabled={disabled}
      empty={rows.length === 0}
      onAdd={() => onChange([...rows, { label: '', value: '', sourceRef: 'S225:' }])}
    >
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-md bg-surface-subtle p-2 lg:flex-row lg:items-center">
            <Input aria-label={`Metric ${index + 1} value`} placeholder="Value, e.g. 1,086" value={row.value} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { value: event.target.value }))} className="lg:w-32" />
            <Input aria-label={`Metric ${index + 1} label`} placeholder="Label" value={row.label} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { label: event.target.value }))} className="lg:flex-1" />
            <Input aria-label={`Metric ${index + 1} source reference`} placeholder="S225:reference" value={row.sourceRef} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { sourceRef: event.target.value }))} className="font-mono lg:w-56" />
            <RowActions index={index} count={rows.length} label={`metric ${index + 1}`} disabled={disabled}
              onMove={(direction) => onChange(moveBlock(rows, index, direction))}
              onRemove={() => onChange(rows.filter((_, position) => position !== index))} />
          </li>
        ))}
      </ul>
    </RowShell>
  );
}

export function AllocationsEditor({
  rows,
  currency,
  onChange,
  disabled,
}: {
  rows: MicrositeAllocation[];
  currency: string;
  onChange: (rows: MicrositeAllocation[]) => void;
  disabled?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0);
  return (
    <RowShell
      title="Allocations"
      hint={`Amounts in ${currency || 'the block currency'}. Total: ${formatMoney(total, currency)}.`}
      addLabel="Add line"
      disabled={disabled}
      empty={rows.length === 0}
      onAdd={() => onChange([...rows, { label: '', amount: 0 }])}
    >
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-md bg-surface-subtle p-2 sm:flex-row sm:items-center">
            <Input aria-label={`Allocation ${index + 1} label`} placeholder="What the money funded" value={row.label} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { label: event.target.value }))} className="sm:flex-1" />
            <Input aria-label={`Allocation ${index + 1} amount`} type="number" min={0} step={1000} inputMode="numeric"
              value={Number.isFinite(row.amount) ? String(row.amount) : ''} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { amount: event.target.value === '' ? 0 : Number(event.target.value) }))}
              className="tabular-nums sm:w-40" />
            <RowActions index={index} count={rows.length} label={`allocation ${index + 1}`} disabled={disabled}
              onMove={(direction) => onChange(moveBlock(rows, index, direction))}
              onRemove={() => onChange(rows.filter((_, position) => position !== index))} />
          </li>
        ))}
      </ul>
    </RowShell>
  );
}

export function LinksEditor({
  rows,
  onChange,
  disabled,
  title = 'Links',
}: {
  rows: MicrositeLink[];
  onChange: (rows: MicrositeLink[]) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <RowShell
      title={title}
      hint="Use https://, mailto: or a path on this site such as /sites/2026-annual-report."
      addLabel="Add link"
      disabled={disabled}
      empty={rows.length === 0}
      onAdd={() => onChange([...rows, { label: '', url: 'https://' }])}
    >
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-md bg-surface-subtle p-2 sm:flex-row sm:items-center">
            <Input aria-label={`Link ${index + 1} label`} placeholder="Label" value={row.label} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { label: event.target.value }))} className="sm:w-56" />
            <Input aria-label={`Link ${index + 1} address`} placeholder="https://" value={row.url} disabled={disabled}
              onChange={(event) => onChange(update(rows, index, { url: event.target.value }))} className="font-mono sm:flex-1" />
            <RowActions index={index} count={rows.length} label={`link ${index + 1}`} disabled={disabled}
              onMove={(direction) => onChange(moveBlock(rows, index, direction))}
              onRemove={() => onChange(rows.filter((_, position) => position !== index))} />
          </li>
        ))}
      </ul>
    </RowShell>
  );
}

export function AssetRefsEditor({
  refs,
  onChange,
  disabled,
  single,
}: {
  refs: string[];
  onChange: (refs: string[]) => void;
  disabled?: boolean;
  /** Hero and story blocks show only their first asset. */
  single?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
    <RowShell
      title="Media"
      hint={single ? 'The first asset is shown. S080 asset IDs, or https:// images.' : 'S080 asset IDs, or https:// images, shown in order.'}
      addLabel="Select media"
      disabled={disabled}
      empty={refs.length === 0}
      onAdd={() => setOpen(true)}
    >
      <ul className="space-y-2">
        {refs.map((ref, index) => (
          <li key={`${ref}-${index}`} className="flex items-center gap-3 rounded-md bg-surface-subtle p-2">
            <ImagePlus size={16} aria-hidden className="shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{ref}</span>
            <span className="hidden text-xs text-foreground-muted sm:inline">
              {isImageUrl(ref) ? 'Image address' : 'S080 asset'}
              {single && index > 0 ? ' · not shown' : ''}
            </span>
            <RowActions index={index} count={refs.length} label={`media ${index + 1}`} disabled={disabled}
              onMove={(direction) => onChange(moveBlock(refs, index, direction))}
              onRemove={() => onChange(refs.filter((_, position) => position !== index))} />
          </li>
        ))}
      </ul>
    </RowShell>
    <MediaSelectorModal
      open={open}
      onOpenChange={setOpen}
      current={refs}
      onAdd={(added) =>
        onChange(
          single
            ? [...added, ...refs.filter((ref) => !added.includes(ref))]
            : [...refs, ...added.filter((ref) => !refs.includes(ref))],
        )
      }
    />
    </>
  );
}

import { type FormEvent, useMemo, useState } from 'react';

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@rfdtech/components';
import { Check, ImageIcon, Search } from 'lucide-react';

import { TextField } from '@partner-crm/ui';

import { S080_ASSETS } from '@/features/microsites/data/assetCatalogue';

interface MediaSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already on the block, shown as selected. */
  current: string[];
  onAdd: (refs: string[]) => void;
}

/**
 * Picks S080 DAM assets for a block. Browsing uses the reference catalogue;
 * any asset ID or https:// image address can also be added by hand.
 */
export function MediaSelectorModal({ open, onOpenChange, current, onAdd }: MediaSelectorModalProps) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return S080_ASSETS;
    return S080_ASSETS.filter((asset) =>
      [asset.id, asset.title, asset.collection].some((field) => field.toLowerCase().includes(term)),
    );
  }, [query]);

  const toggle = (id: string) =>
    setPicked((selection) => (selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id]));

  const addManual = (event: FormEvent) => {
    event.preventDefault();
    const ref = manual.trim();
    if (!ref) {
      setManualError('Enter an S080 asset ID or an https:// image address.');
      return;
    }
    if (ref.startsWith('http') && !ref.startsWith('https://')) {
      setManualError('Only secure https:// image addresses are allowed.');
      return;
    }
    setPicked((selection) => (selection.includes(ref) ? selection : [...selection, ref]));
    setManual('');
    setManualError(null);
  };

  const close = (next: boolean) => {
    if (!next) {
      setPicked([]);
      setQuery('');
      setManual('');
      setManualError(null);
    }
    onOpenChange(next);
  };

  return (
    <Modal open={open} onOpenChange={close}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Select media from S080</ModalTitle>
          <ModalDescription>
            Microsites reference DAM assets by ID, so brand-approved media stays in one place.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <Input
              aria-label="Search assets"
              placeholder="Search by title, collection or asset ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          <ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {matches.length === 0 ? (
              <li className="col-span-full py-6 text-center text-sm text-foreground-muted">
                No catalogue asset matches “{query}”. Add the asset ID by hand below.
              </li>
            ) : null}
            {matches.map((asset) => {
              const selected = picked.includes(asset.id);
              const already = current.includes(asset.id);
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(asset.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-subtle text-primary">
                      {selected ? <Check size={16} aria-hidden /> : <ImageIcon size={16} aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{asset.title}</span>
                      <span className="block font-mono text-xs text-foreground-muted">{asset.id}</span>
                      <span className="block text-xs text-foreground-muted">
                        {asset.collection}
                        {already ? ' · already on this block' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <form onSubmit={addManual} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <TextField
              label="Asset ID or image address"
              value={manual}
              onChange={(value) => {
                setManual(value);
                setManualError(null);
              }}
              placeholder="S080-AST-2026-0300 or https://…"
              error={manualError ?? undefined}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="sm:mt-6">
              Add
            </Button>
          </form>

          {picked.length > 0 ? (
            <p className="text-sm text-foreground-muted">
              {picked.length} selected: <span className="font-mono text-xs">{picked.join(', ')}</span>
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(picked);
              close(false);
            }}
          >
            Add {picked.length > 0 ? picked.length : ''} to block
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

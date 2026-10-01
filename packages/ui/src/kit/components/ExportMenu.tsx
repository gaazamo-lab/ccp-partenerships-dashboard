import { useState } from 'react';

import { Button, Popover, PopoverContent, PopoverTrigger } from '@rfdtech/components';
import { ChevronDown, Download } from 'lucide-react';

export interface ExportOption {
  id: string;
  label: string;
  /** One line on what the file contains, shown under the label. */
  description?: string;
  onSelect: () => void;
  disabled?: boolean;
}

interface ExportMenuProps {
  options: ExportOption[];
  label?: string;
  disabled?: boolean;
}

/**
 * Groups a page's downloads behind one control.
 *
 * A page with four export buttons in its header spends its most prominent row
 * on something a user does occasionally, and makes the action they came for
 * compete for attention. One button, four choices, each with a line saying what
 * it contains.
 */
export function ExportMenu({ options, label = 'Export', disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download size={16} aria-hidden /> {label}
          <ChevronDown size={14} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        <div className="flex flex-col">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                option.onSelect();
                setOpen(false);
              }}
              className="rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-foreground-muted">
                  {option.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

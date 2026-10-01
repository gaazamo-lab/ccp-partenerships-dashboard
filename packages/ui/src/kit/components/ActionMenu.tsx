import { type ReactNode, useState } from 'react';

import { Button, Popover, PopoverContent, PopoverTrigger } from '@rfdtech/components';
import { MoreHorizontal } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Reason the item is unavailable, shown under the label. */
  disabledReason?: string;
  /** Renders in the error tone. Use for terminating, deleting and the like. */
  destructive?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

/**
 * Secondary actions, behind one control.
 *
 * A header with five buttons gives none of them any weight, and the rare
 * destructive one sits at the same size as the action the user came to do.
 * The primary action stays a button; everything else belongs here.
 */
export function ActionMenu({ items, label = 'More actions' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={label}>
          <MoreHorizontal size={16} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="flex flex-col">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60 ${
                item.destructive ? 'text-error' : 'text-foreground'
              }`}
            >
              {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                {item.disabled && item.disabledReason ? (
                  <span className="mt-0.5 block text-xs text-foreground-muted">
                    {item.disabledReason}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

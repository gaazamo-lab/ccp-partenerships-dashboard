import { type KeyboardEvent, useState } from 'react';

import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from '@rfdtech/components';
import { X } from 'lucide-react';

import { normaliseTags } from '@/features/kol/domain';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** Adds a muted "(Optional)" after the label, like the kit's fields. */
  optional?: boolean;
}

/**
 * Free-text tag entry: type a tag and press Enter or comma to add it; pasted
 * comma-separated lists are split. Tags are de-duplicated case-insensitively.
 */
export function TagInput({
  label,
  value,
  onChange,
  placeholder = 'Type and press Enter',
  description,
  error,
  disabled,
  className,
  optional,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (text: string) => {
    const parts = text.split(',');
    const next = normaliseTags([...value, ...parts]);
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Field invalid={Boolean(error)} className={className}>
      {/* Field wires the label to the control; FieldControl sets the id. */}
      <FieldLabel>
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-foreground-muted">(Optional)</span>
        ) : null}
      </FieldLabel>
      <FieldControl>
        <Input
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          invalid={Boolean(error)}
          onChange={(event) => {
            const next = event.target.value;
            if (next.includes(',')) commit(next);
            else setDraft(next);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
        />
      </FieldControl>
      {value.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${label} tags`}>
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
            >
              {tag}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="grid size-4 place-items-center rounded-full text-foreground-muted hover:bg-border hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X size={11} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

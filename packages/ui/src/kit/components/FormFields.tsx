import type { ReactNode } from 'react';

import {
  Checkbox,
  Combobox,
  Dropdown,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Textarea,
} from '@rfdtech/components';

/**
 * Controlled field wrappers over the library's `Field` parts.
 *
 * Every form in the portal repeats the same stack (`Field` -> `FieldLabel` ->
 * `FieldControl` -> control -> `FieldDescription` -> `FieldError`). Going
 * through these wrappers keeps the required marker, the error copy and the
 * label/control association identical on every screen, and it is why a field
 * here can never ship with its label unwired from its input.
 */

interface BaseFieldProps {
  label: string;
  /** Adds the red marker and the `required` attribute. */
  required?: boolean;
  /** Adds a muted "(Optional)" after the label. Ignored when `required`. */
  optional?: boolean;
  /** Helper text under the control. Say what a good value looks like. */
  description?: ReactNode;
  /** Message to show; its presence is what puts the field in the invalid state. */
  error?: string | false;
  className?: string;
}

/**
 * `FieldLabel` and `FieldControl` share the enclosing `Field`'s generated id,
 * so the label is wired to its control without passing `htmlFor`/`id` here —
 * `FieldControl` overwrites a control's own `id`, which is why passing one
 * used to leave every label pointing at nothing.
 */
function Label({
  label,
  required,
  optional,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <FieldLabel>
      {label}
      {required ? <span className="text-error"> *</span> : null}
      {!required && optional ? (
        <span className="ml-1 font-normal text-foreground-muted">(Optional)</span>
      ) : null}
    </FieldLabel>
  );
}

interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'number' | 'date' | 'datetime-local' | 'password';
  /** Browser autofill hint, e.g. `email` or `current-password`. */
  autoComplete?: string;
  name?: string;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Applied on every keystroke, e.g. uppercasing a short code. */
  transform?: (value: string) => string;
}

export function TextField({
  label,
  required,
  optional,
  description,
  error,
  className,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  min,
  max,
  autoFocus,
  disabled,
  transform,
  autoComplete,
  name,
}: TextFieldProps) {
  return (
    <Field invalid={Boolean(error)} className={className}>
      <Label label={label} required={required} optional={optional} />
      <FieldControl>
        <Input
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
          autoFocus={autoFocus}
          disabled={disabled}
          invalid={Boolean(error)}
          onChange={(event) =>
            onChange(transform ? transform(event.target.value) : event.target.value)
          }
        />
      </FieldControl>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

interface TextareaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
}

export function TextareaField({
  label,
  required,
  optional,
  description,
  error,
  className,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  disabled,
}: TextareaFieldProps) {
  return (
    <Field invalid={Boolean(error)} className={className}>
      <Label label={label} required={required} optional={optional} />
      <div className="relative">
        <FieldControl>
          <Textarea
            value={value}
            rows={rows}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            invalid={Boolean(error)}
            onChange={(event) => onChange(event.target.value)}
          />
        </FieldControl>
        {maxLength ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 bottom-2.5 text-xs text-foreground-muted tabular-nums"
          >
            {value.length}/{maxLength}
          </span>
        ) : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  /** Shown but unselectable — use it to explain why, not to hide the option. */
  disabled?: boolean;
};

function normalizeOptions(options: readonly string[] | readonly SelectOption[]): SelectOption[] {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : { ...option },
  );
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | readonly SelectOption[];
  placeholder?: string;
  /** Allows clearing back to an unset value. Off by default. */
  clearable?: boolean;
  disabled?: boolean;
  /** Renders a searchable `Combobox` instead of a `Dropdown`. Use past ~8 options. */
  searchable?: boolean;
  /** Placeholder for the search box, when `searchable`. */
  searchPlaceholder?: string;
}

export function SelectField({
  label,
  required,
  optional,
  description,
  error,
  className,
  value,
  onChange,
  options,
  placeholder,
  clearable = false,
  disabled,
  searchable,
  searchPlaceholder,
}: SelectFieldProps) {
  const resolved = normalizeOptions(options);
  const control = searchable ? (
    <Combobox
      aria-label={label}
      value={value || null}
      onValueChange={(next) => onChange(next ?? '')}
      options={resolved}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      clearable={clearable}
      disabled={disabled}
      invalid={Boolean(error)}
    />
  ) : (
    <Dropdown
      aria-label={label}
      value={value || null}
      onValueChange={(next) => onChange(next ?? '')}
      options={resolved}
      placeholder={placeholder}
      clearable={clearable}
      disabled={disabled}
      invalid={Boolean(error)}
    />
  );

  return (
    <Field invalid={Boolean(error)} className={className}>
      <Label label={label} required={required} optional={optional} />
      <FieldControl>{control}</FieldControl>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

interface MultiSelectFieldProps extends BaseFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly string[] | readonly SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

/**
 * Searchable multi-select bound to a `string[]`. Prefer this over free text
 * whenever the value is matched literally against a registered identifier — a
 * typo there produces a record that looks right and matches nothing.
 */
export function MultiSelectField({
  label,
  required,
  optional,
  description,
  error,
  className,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
}: MultiSelectFieldProps) {
  return (
    <Field invalid={Boolean(error)} className={className}>
      <Label label={label} required={required} optional={optional} />
      <FieldControl>
        <Combobox
          multiple
          aria-label={label}
          value={value}
          onValueChange={(next) => onChange(next)}
          options={normalizeOptions(options)}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          disabled={disabled}
          invalid={Boolean(error)}
        />
      </FieldControl>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function CheckboxField({
  label,
  checked,
  onChange,
  description,
  disabled,
  className,
}: CheckboxFieldProps) {
  return (
    <Field className={className}>
      <Checkbox
        label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(Boolean(next))}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

interface FormGridProps {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}

/** Standard field spacing: two columns on a wide screen, one on a phone. */
export function FormGrid({ children, columns = 2, className }: FormGridProps) {
  return (
    <div
      className={['grid gap-x-6 gap-y-5', columns === 2 ? 'sm:grid-cols-2' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

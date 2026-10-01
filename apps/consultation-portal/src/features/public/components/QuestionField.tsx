import { Input, Textarea } from '@rfdtech/components';

import type { ConsultationAnswer, ConsultationQuestion } from '@partner-crm/types';

import { scalePoints } from '@/features/consultations/analytics';
import type { LocalizedQuestion } from '@/features/consultations/translation';

import type { FormStrings } from '../i18n';

interface QuestionFieldProps {
  question: ConsultationQuestion;
  text: LocalizedQuestion;
  value: ConsultationAnswer | undefined;
  error?: string;
  strings: FormStrings;
  onChange: (value: ConsultationAnswer | undefined) => void;
}

function Label({ text, required, htmlFor }: { text: LocalizedQuestion; required: boolean; htmlFor?: string }) {
  const content = (
    <>
      <span>{text.prompt}</span>
      {required ? <span className="ms-1 text-error" aria-hidden>*</span> : null}
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="block font-medium">{content}</label>
  ) : (
    <legend className="font-medium">{content}</legend>
  );
}

const optionClass = 'flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary';

/** One public-form question, rendered for its type in the respondent's language. */
export function QuestionField({ question, text, value, error, strings, onChange }: QuestionFieldProps) {
  const id = `q-${question.id}`;
  const describedBy = [text.description ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const help = text.description ? <p id={`${id}-help`} className="text-sm text-foreground-muted">{text.description}</p> : null;
  const errorText = error ? <p id={`${id}-error`} className="text-sm text-error" role="alert">{error}</p> : null;

  if (question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT' || question.type === 'NUMBER' || question.type === 'DATE') {
    const stringValue = value === undefined ? '' : String(value);
    return (
      <div className="space-y-2">
        <Label text={text} required={question.required} htmlFor={id} />
        {help}
        {question.type === 'LONG_TEXT' ? (
          <Textarea id={id} rows={5} value={stringValue} invalid={Boolean(error)} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <Input
            id={id}
            type={question.type === 'NUMBER' ? 'number' : question.type === 'DATE' ? 'date' : 'text'}
            min={question.type === 'NUMBER' ? question.min : undefined}
            max={question.type === 'NUMBER' ? question.max : undefined}
            value={stringValue}
            invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(event) => {
              const next = event.target.value;
              if (question.type === 'NUMBER') onChange(next === '' ? undefined : Number(next));
              else onChange(next);
            }}
          />
        )}
        {errorText}
      </div>
    );
  }

  if (question.type === 'DROPDOWN') {
    return (
      <div className="space-y-2">
        <Label text={text} required={question.required} htmlFor={id} />
        {help}
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value || undefined)}
          className={`h-10 w-full rounded-md border bg-background px-3 ${error ? 'border-error' : 'border-border'}`}
        >
          <option value="">{strings.choose}</option>
          {text.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {errorText}
      </div>
    );
  }

  if (question.type === 'RATING' || question.type === 'NPS') {
    const points = scalePoints(question);
    return (
      <fieldset className="space-y-3" aria-describedby={describedBy}>
        <Label text={text} required={question.required} />
        {help}
        <div className="flex flex-wrap gap-2">
          {points.map((point) => (
            <label key={point} className={`${optionClass} min-w-12 justify-center px-3 py-2`}>
              <input type="radio" name={id} value={point} checked={value === point} onChange={() => onChange(point)} className="sr-only" />
              <span className="font-medium tabular-nums">{point}</span>
            </label>
          ))}
        </div>
        {text.minLabel || text.maxLabel ? (
          <div className="flex justify-between text-xs text-foreground-muted">
            <span>{points[0]} = {text.minLabel}</span>
            <span>{points[points.length - 1]} = {text.maxLabel}</span>
          </div>
        ) : null}
        {errorText}
      </fieldset>
    );
  }

  const multiple = question.type === 'MULTI_CHOICE';
  const selected = Array.isArray(value) ? value : [];
  return (
    <fieldset className="space-y-3" aria-describedby={describedBy}>
      <Label text={text} required={question.required} />
      {help}
      <div className="grid gap-2 sm:grid-cols-2">
        {text.options.map((option) => (
          <label key={option.value} className={optionClass}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={id}
              value={option.value}
              checked={multiple ? selected.includes(option.value) : value === option.value}
              onChange={(event) => {
                if (!multiple) onChange(option.value);
                else {
                  const next = event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value);
                  onChange(next.length ? next : undefined);
                }
              }}
              className="size-4 accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {errorText}
    </fieldset>
  );
}

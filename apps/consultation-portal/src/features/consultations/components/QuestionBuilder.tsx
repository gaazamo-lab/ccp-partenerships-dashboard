import {
  Badge,
  Button,
  Notice,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@rfdtech/components';
import { ArrowDown, ArrowUp, Copy, GitBranch, Heading, Plus, Trash2, X } from 'lucide-react';

import type {
  ConsultationCondition,
  ConsultationConditionOperator,
  ConsultationQuestion,
  ConsultationQuestionTranslation,
  ConsultationQuestionType,
} from '@partner-crm/types';
import {
  CheckboxField,
  EmptyState,
  FormGrid,
  SelectField,
  TextField,
  TextareaField,
} from '@partner-crm/ui';

import {
  blankQuestion,
  duplicateQuestion,
  moveQuestion,
  removeQuestion,
  withType,
} from '../builder';
import {
  ANSWER_TYPES,
  CHOICE_TYPES,
  NUMERIC_TYPES,
  OPERATOR_LABELS,
  QUESTION_TYPE_LABELS,
  isRtl,
  languageLabel,
} from '../constants';
import { conditionSources, operatorsFor } from '../logic';
import { missingTranslations } from '../translation';

interface QuestionBuilderProps {
  questions: ConsultationQuestion[];
  onChange: (questions: ConsultationQuestion[]) => void;
  /** Consultation languages; the first is the primary (authoring) language. */
  languages: string[];
  errors?: Record<string, string[]>;
  showErrors?: boolean;
  disabled?: boolean;
}

const TYPE_OPTIONS = ANSWER_TYPES.map((type) => ({
  value: type,
  label: QUESTION_TYPE_LABELS[type],
}));

function parseNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Reusable consultation question builder (create and edit pages). Authoring
 * happens in the primary language; every additional language gets its own tab
 * with the source text alongside the translation fields.
 */
export function QuestionBuilder({
  questions,
  onChange,
  languages,
  errors = {},
  showErrors = false,
  disabled,
}: QuestionBuilderProps) {
  const [primary = 'en', ...others] = languages;
  const update = (id: string, change: Partial<ConsultationQuestion>) =>
    onChange(
      questions.map((question) => (question.id === id ? { ...question, ...change } : question)),
    );
  const replace = (next: ConsultationQuestion) =>
    onChange(questions.map((question) => (question.id === next.id ? next : question)));

  const authoring = (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            message="No questions yet"
            hint="Add a question to start building the form. Use section breaks to split long consultations into pages."
          />
        </div>
      ) : null}
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          questions={questions}
          number={questions.slice(0, index + 1).filter((item) => item.type !== 'SECTION').length}
          errors={showErrors ? errors[question.id] : undefined}
          disabled={disabled}
          onUpdate={(change) => update(question.id, change)}
          onReplace={replace}
          onMove={(direction) => onChange(moveQuestion(questions, question.id, direction))}
          onDuplicate={() => onChange(duplicateQuestion(questions, question.id))}
          onRemove={() => onChange(removeQuestion(questions, question.id))}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...questions, blankQuestion()])}
        >
          <Plus size={16} aria-hidden /> Add question
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChange([...questions, blankQuestion('SECTION')])}
        >
          <Heading size={16} aria-hidden /> Add section break
        </Button>
      </div>
    </div>
  );

  if (!others.length) return authoring;

  return (
    <Tabs defaultValue={primary} variant="line">
      <TabsList>
        <TabsTrigger value={primary}>{languageLabel(primary)} (primary)</TabsTrigger>
        {others.map((code) => {
          const missing = missingTranslations(questions, code).length;
          return (
            <TabsTrigger key={code} value={code}>
              {languageLabel(code)}
              {missing ? (
                <span className="ml-1.5 text-xs text-warning">({missing} to translate)</span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value={primary} className="pt-5">
        {authoring}
      </TabsContent>
      {others.map((code) => (
        <TabsContent key={code} value={code} className="space-y-4 pt-5">
          <Notice variant="info" leftBorder>
            Respondents choosing {languageLabel(code)} see these texts. Anything left blank falls
            back to {languageLabel(primary)}. Answers are always stored against the{' '}
            {languageLabel(primary)} options, so results combine across languages.
          </Notice>
          {questions.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              Add questions in the primary language first.
            </p>
          ) : null}
          {questions.map((question, index) => (
            <TranslationCard
              key={question.id}
              question={question}
              label={
                question.type === 'SECTION'
                  ? 'Section'
                  : `Question ${questions.slice(0, index + 1).filter((item) => item.type !== 'SECTION').length}`
              }
              language={code}
              disabled={disabled}
              onChange={(translation) =>
                update(question.id, {
                  translations: { ...question.translations, [code]: translation },
                })
              }
            />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface QuestionCardProps {
  question: ConsultationQuestion;
  questions: ConsultationQuestion[];
  index: number;
  number: number;
  errors?: string[];
  disabled?: boolean;
  onUpdate: (change: Partial<ConsultationQuestion>) => void;
  onReplace: (question: ConsultationQuestion) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function QuestionCard({
  question,
  questions,
  index,
  number,
  errors,
  disabled,
  onUpdate,
  onReplace,
  onMove,
  onDuplicate,
  onRemove,
}: QuestionCardProps) {
  const isSection = question.type === 'SECTION';
  const isChoice = CHOICE_TYPES.includes(question.type);
  const hasErrors = Boolean(errors?.length);

  return (
    <article
      className={`rounded-2xl border p-5 sm:p-6 ${isSection ? 'border-primary/40 bg-surface-subtle' : 'border-border'} ${hasErrors ? 'border-error' : ''}`}
      aria-label={isSection ? `Section: ${question.prompt || 'untitled'}` : `Question ${number}`}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{isSection ? 'Section break' : `Question ${number}`}</h3>
          {!isSection ? (
            <Badge variant="outline">{QUESTION_TYPE_LABELS[question.type]}</Badge>
          ) : null}
          {question.required ? <Badge variant="primary">Required</Badge> : null}
          {question.visibleIf?.length ? (
            <Badge variant="warning">
              <GitBranch size={12} aria-hidden className="mr-1 inline" />
              Conditional
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Move up"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Move down"
            disabled={disabled || index === questions.length - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Duplicate"
            disabled={disabled}
            onClick={onDuplicate}
          >
            <Copy size={16} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Delete"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden />
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        {isSection ? (
          <FormGrid>
            <TextField
              label="Section heading"
              required
              value={question.prompt}
              disabled={disabled}
              onChange={(prompt) => onUpdate({ prompt })}
            />
            <TextField
              label="Intro text"
              optional
              value={question.description ?? ''}
              disabled={disabled}
              onChange={(description) =>
                onUpdate({ description })
              } /* description="Shown at the top of this page." */
            />
          </FormGrid>
        ) : (
          <>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-[1fr_240px]">
              <TextField
                label="Question text"
                required
                value={question.prompt}
                disabled={disabled}
                onChange={(prompt) => onUpdate({ prompt })}
              />
              <SelectField
                label="Answer type"
                value={question.type}
                options={TYPE_OPTIONS}
                disabled={disabled}
                onChange={(type) => onReplace(withType(question, type as ConsultationQuestionType))}
              />
            </div>
            <TextField
              label="Help text"
              optional
              value={question.description ?? ''}
              disabled={disabled}
              onChange={(description) =>
                onUpdate({ description })
              } /* description="Guidance shown under the question." */
            />
            {isChoice ? (
              <TextareaField
                label="Options, one per line"
                required
                rows={Math.max(3, (question.options?.length ?? 2) + 1)}
                value={(question.options ?? []).join('\n')}
                disabled={disabled}
                onChange={(value) => onUpdate({ options: value.split('\n') })}
              />
            ) : null}
            {question.type === 'RATING' ? (
              <FormGrid>
                <TextField
                  label="Lowest value"
                  type="number"
                  min={0}
                  max={10}
                  value={String(question.min ?? 1)}
                  disabled={disabled}
                  onChange={(value) => onUpdate({ min: parseNumber(value) ?? 1 })}
                />
                <TextField
                  label="Highest value"
                  type="number"
                  min={1}
                  max={11}
                  value={String(question.max ?? 5)}
                  disabled={disabled}
                  onChange={(value) => onUpdate({ max: parseNumber(value) ?? 5 })}
                />
              </FormGrid>
            ) : null}
            {question.type === 'RATING' || question.type === 'NPS' ? (
              <FormGrid>
                <TextField
                  label="Low-end label"
                  optional
                  value={question.minLabel ?? ''}
                  placeholder="e.g. Not at all"
                  disabled={disabled}
                  onChange={(minLabel) => onUpdate({ minLabel: minLabel || undefined })}
                />
                <TextField
                  label="High-end label"
                  optional
                  value={question.maxLabel ?? ''}
                  placeholder="e.g. Extremely"
                  disabled={disabled}
                  onChange={(maxLabel) => onUpdate({ maxLabel: maxLabel || undefined })}
                />
              </FormGrid>
            ) : null}
            {question.type === 'NUMBER' ? (
              <FormGrid>
                <TextField
                  label="Minimum"
                  optional
                  type="number"
                  value={question.min === undefined ? '' : String(question.min)}
                  disabled={disabled}
                  onChange={(value) => onUpdate({ min: parseNumber(value) })}
                />
                <TextField
                  label="Maximum"
                  optional
                  type="number"
                  value={question.max === undefined ? '' : String(question.max)}
                  disabled={disabled}
                  onChange={(value) => onUpdate({ max: parseNumber(value) })}
                />
              </FormGrid>
            ) : null}
            <CheckboxField
              label="Required question"
              checked={question.required}
              disabled={disabled}
              onChange={(required) =>
                onUpdate({ required })
              } /* description="Required questions are only enforced when they are shown." */
            />
          </>
        )}

        <ConditionEditor
          question={question}
          questions={questions}
          index={index}
          disabled={disabled}
          onChange={(visibleIf) => onUpdate({ visibleIf })}
        />

        {hasErrors ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-error" role="alert">
            {errors?.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

interface ConditionEditorProps {
  question: ConsultationQuestion;
  questions: ConsultationQuestion[];
  index: number;
  disabled?: boolean;
  onChange: (conditions: ConsultationCondition[] | undefined) => void;
}

function ConditionEditor({ question, questions, index, disabled, onChange }: ConditionEditorProps) {
  const sources = conditionSources(questions, index);
  const conditions = question.visibleIf ?? [];
  const subject = question.type === 'SECTION' ? 'this section' : 'this question';

  const setCondition = (position: number, next: ConsultationCondition) =>
    onChange(conditions.map((condition, current) => (current === position ? next : condition)));

  const addCondition = () => {
    const source = sources[sources.length - 1];
    if (!source) return;
    const operator = operatorsFor(source.type)[0] ?? 'ANSWERED';
    onChange([
      ...conditions,
      {
        questionId: source.id,
        operator,
        value: CHOICE_TYPES.includes(source.type) ? (source.options?.[0] ?? '') : undefined,
      },
    ]);
  };

  return (
    <div className="rounded-lg bg-surface-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          <GitBranch size={14} aria-hidden className="mr-1.5 inline" />
          {conditions.length
            ? `Show ${subject} only when all of these are true`
            : `Always show ${subject}`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !sources.length}
          onClick={addCondition}
          title={sources.length ? undefined : 'Conditions can only refer to earlier questions.'}
        >
          <Plus size={14} aria-hidden /> Add condition
        </Button>
      </div>
      {!sources.length && !conditions.length ? (
        <p className="mt-1 text-xs text-foreground-muted">
          Skip logic can refer to questions above this one.
        </p>
      ) : null}
      {conditions.length ? (
        <div className="mt-3 space-y-3">
          {conditions.map((condition, position) => {
            const source = sources.find((item) => item.id === condition.questionId);
            const operators = source
              ? operatorsFor(source.type)
              : (['ANSWERED'] as ConsultationConditionOperator[]);
            return (
              <div
                key={`${condition.questionId}-${position}`}
                className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
              >
                <SelectField
                  label="When"
                  value={source ? condition.questionId : ''}
                  placeholder="Choose an earlier question"
                  options={sources.map((item) => ({
                    value: item.id,
                    label: item.prompt || '(untitled question)',
                  }))}
                  disabled={disabled}
                  onChange={(questionId) => {
                    const next = sources.find((item) => item.id === questionId);
                    if (!next) return;
                    const operator = operatorsFor(next.type)[0] ?? 'ANSWERED';
                    setCondition(position, {
                      questionId,
                      operator,
                      value: CHOICE_TYPES.includes(next.type)
                        ? (next.options?.[0] ?? '')
                        : undefined,
                    });
                  }}
                />
                <SelectField
                  label="Operator"
                  value={condition.operator}
                  options={operators.map((operator) => ({
                    value: operator,
                    label: OPERATOR_LABELS[operator],
                  }))}
                  disabled={disabled}
                  onChange={(operator) =>
                    setCondition(position, {
                      ...condition,
                      operator: operator as ConsultationConditionOperator,
                      value: operator === 'ANSWERED' ? undefined : condition.value,
                    })
                  }
                />
                {condition.operator === 'ANSWERED' ? (
                  <div className="hidden sm:block" />
                ) : source && CHOICE_TYPES.includes(source.type) ? (
                  <SelectField
                    label="Value"
                    value={String(condition.value ?? '')}
                    options={(source.options ?? []).filter((option) => option.trim())}
                    disabled={disabled}
                    onChange={(value) => setCondition(position, { ...condition, value })}
                  />
                ) : source && NUMERIC_TYPES.includes(source.type) ? (
                  <TextField
                    label="Value"
                    type="number"
                    value={condition.value === undefined ? '' : String(condition.value)}
                    disabled={disabled}
                    onChange={(value) =>
                      setCondition(position, { ...condition, value: parseNumber(value) })
                    }
                  />
                ) : (
                  <TextField
                    label="Value"
                    value={String(condition.value ?? '')}
                    disabled={disabled}
                    onChange={(value) => setCondition(position, { ...condition, value })}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove condition"
                  disabled={disabled}
                  onClick={() => {
                    const next = conditions.filter((_, current) => current !== position);
                    onChange(next.length ? next : undefined);
                  }}
                >
                  <X size={16} aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface TranslationCardProps {
  question: ConsultationQuestion;
  label: string;
  language: string;
  disabled?: boolean;
  onChange: (translation: ConsultationQuestionTranslation) => void;
}

function TranslationCard({ question, label, language, disabled, onChange }: TranslationCardProps) {
  const translation: ConsultationQuestionTranslation = question.translations?.[language] ?? {
    prompt: '',
  };
  const isChoice = CHOICE_TYPES.includes(question.type);
  return (
    <article className="rounded-xl border border-border p-5">
      <header className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {label}
        </p>
        <p className="mt-1 font-medium">{question.prompt || '(untitled)'}</p>
        {question.description ? (
          <p className="text-sm text-foreground-muted">{question.description}</p>
        ) : null}
      </header>
      <div className="space-y-4" dir={isRtl(language) ? 'rtl' : undefined} lang={language}>
        <TextField
          label={`${question.type === 'SECTION' ? 'Heading' : 'Question'} in ${languageLabel(language)}`}
          value={translation.prompt}
          disabled={disabled}
          onChange={(prompt) => onChange({ ...translation, prompt })}
        />
        {question.description ? (
          <TextField
            label={`Help text in ${languageLabel(language)}`}
            value={translation.description ?? ''}
            disabled={disabled}
            onChange={(description) => onChange({ ...translation, description })}
          />
        ) : null}
        {isChoice ? (
          <FormGrid>
            {(question.options ?? []).map((option, position) =>
              option.trim() ? (
                <TextField
                  key={`${option}-${position}`}
                  label={option}
                  value={translation.options?.[position] ?? ''}
                  disabled={disabled}
                  onChange={(value) => {
                    const options = [
                      ...(question.options ?? []).map(
                        (_, current) => translation.options?.[current] ?? '',
                      ),
                    ];
                    options[position] = value;
                    onChange({ ...translation, options });
                  }}
                />
              ) : null,
            )}
          </FormGrid>
        ) : null}
      </div>
    </article>
  );
}

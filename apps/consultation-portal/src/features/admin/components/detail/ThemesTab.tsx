import { type FormEvent, useState } from 'react';

import { Badge, Button, ProgressBar, useToast } from '@rfdtech/components';
import { MessageSquareText, Plus } from 'lucide-react';

import type { Consultation, ConsultationResponse } from '@partner-crm/types';
import {
  CheckboxField,
  EmptyState,
  SectionCard,
  SelectField,
  TextField,
  formatDate,
} from '@partner-crm/ui';

import {
  codingProgress,
  openTextAnswers,
  themeFrequency,
} from '@/features/consultations/analytics';
import { BarRows } from '@/features/consultations/components/BarRows';
import { languageLabel } from '@/features/consultations/constants';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

interface ThemesTabProps {
  consultation: Consultation;
  responses: ConsultationResponse[];
  denied?: string;
}

const PAGE = 15;

/** Qualitative coding: a codebook of themes applied to open-text answers. */
export function ThemesTab({ consultation, responses, denied }: ThemesTabProps) {
  const { addTheme, tagResponse } = useConsultations();
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [labelError, setLabelError] = useState('');
  const [saving, setSaving] = useState(false);
  const [questionFilter, setQuestionFilter] = useState('');
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const textQuestions = consultation.questions.filter(
    (question) => question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT',
  );
  const allAnswers = openTextAnswers(consultation, responses);
  const answers = allAnswers.filter(
    (answer) =>
      (!questionFilter || answer.questionId === questionFilter) &&
      (!untaggedOnly || !answer.themeIds.length),
  );
  const frequency = themeFrequency(consultation, responses);
  const progress = codingProgress(allAnswers);

  const submitTheme = async (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) {
      setLabelError('Give the theme a label.');
      return;
    }
    setSaving(true);
    try {
      const theme = await addTheme(consultation.id, { label, description });
      toast({
        title: 'Theme added',
        description: `“${theme.label}” is now in the codebook.`,
        variant: 'success',
      });
      setLabel('');
      setDescription('');
    } catch {
      // Toasted by the provider.
    } finally {
      setSaving(false);
    }
  };

  const toggle = (responseId: string, questionId: string, current: string[], themeId: string) => {
    const themeIds = current.includes(themeId)
      ? current.filter((id) => id !== themeId)
      : [...current, themeId];
    void tagResponse(responseId, { questionId, themeIds }).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-body">
      <div className="grid gap-body lg:grid-cols-2">
        <SectionCard title="Codebook" /* description="Themes used to code open-text answers." */>
          {consultation.themes.length ? (
            <ul className="mb-5 space-y-2">
              {consultation.themes.map((theme) => (
                <li key={theme.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-sm font-medium">{theme.label}</p>
                  {theme.description ? (
                    <p className="text-xs text-foreground-muted">{theme.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-5 text-sm text-foreground-muted">
              No themes yet. Add the first theme below.
            </p>
          )}
          <form onSubmit={(event) => void submitTheme(event)} className="space-y-3" noValidate>
            <TextField
              label="New theme"
              required
              value={label}
              disabled={Boolean(denied)}
              error={labelError}
              onChange={(value) => {
                setLabel(value);
                setLabelError('');
              }}
            />
            <TextField
              label="Description"
              value={description}
              disabled={Boolean(denied)}
              onChange={setDescription}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={Boolean(denied) || saving}
              loading={saving}
              title={denied}
            >
              <Plus size={15} aria-hidden /> Add theme
            </Button>
          </form>
        </SectionCard>

        <SectionCard
          title="Theme frequency" /* description={`${progress}% of open-text answers coded.`} */
        >
          <div className="mb-4">
            <ProgressBar value={progress} aria-label="Coding progress" />
          </div>
          <BarRows
            rows={frequency.map((item) => ({
              label: item.label,
              count: item.count,
              share: item.share,
            }))}
            unit="coded answers"
            emptyText="Tag answers below to see how often each theme occurs."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Open-text answers"
        // description="Select the themes that apply to each answer. Changes save immediately."
        actions={
          <span className="text-sm text-foreground-muted">
            {answers.length} of {allAnswers.length}
          </span>
        }
      >
        {textQuestions.length ? (
          <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <SelectField
              label="Question"
              value={questionFilter}
              clearable
              placeholder="All open-text questions"
              options={textQuestions.map((question) => ({
                value: question.id,
                label: question.prompt,
              }))}
              onChange={setQuestionFilter}
            />
            <CheckboxField label="Uncoded only" checked={untaggedOnly} onChange={setUntaggedOnly} />
          </div>
        ) : null}
        {answers.length ? (
          <ul className="divide-y divide-border">
            {answers.slice(0, limit).map((answer) => (
              <li key={`${answer.responseId}-${answer.questionId}`} className="py-3">
                <p className="text-sm">{answer.text}</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {answer.responseId} · {formatDate(answer.submittedAt)} ·{' '}
                  {languageLabel(answer.language)} ·{' '}
                  {textQuestions.find((question) => question.id === answer.questionId)?.prompt}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {consultation.themes.map((theme) => {
                    const active = answer.themeIds.includes(theme.id);
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={active}
                        disabled={Boolean(denied)}
                        title={denied}
                        onClick={() =>
                          toggle(answer.responseId, answer.questionId, answer.themeIds, theme.id)
                        }
                        className="rounded-full disabled:cursor-not-allowed"
                      >
                        <Badge variant={active ? 'primary' : 'outline'} size="sm">
                          {theme.label}
                        </Badge>
                      </button>
                    );
                  })}
                  {!consultation.themes.length ? (
                    <span className="text-xs text-foreground-muted">
                      Add themes to start coding.
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<MessageSquareText size={20} aria-hidden />}
            message={
              allAnswers.length ? 'No answers match these filters' : 'No open-text answers yet'
            }
            hint={
              allAnswers.length
                ? 'Clear the filters to see every answer.'
                : 'Answers to short and long text questions appear here.'
            }
          />
        )}
        {answers.length > limit ? (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit((current) => current + PAGE)}
            >
              Show more ({answers.length - limit} remaining)
            </Button>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

import type { ConsultationQuestion, ConsultationResponse } from '@partner-crm/types';
import { formatCount } from '@partner-crm/ui';

import {
  answeredCount,
  meanScore,
  npsScore,
  numberSummary,
  questionDistribution,
} from '../analytics';
import { CHOICE_TYPES, QUESTION_TYPE_LABELS } from '../constants';
import { BarRows } from './BarRows';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-surface-subtle px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-foreground-muted">{hint}</p> : null}
    </div>
  );
}

interface QuestionAnalyticsProps {
  question: ConsultationQuestion;
  number: number;
  responses: ConsultationResponse[];
}

/** One question's result block: headline figure(s) plus its distribution. */
export function QuestionAnalytics({ question, number, responses }: QuestionAnalyticsProps) {
  const answered = answeredCount(question, responses);
  const isChoice = CHOICE_TYPES.includes(question.type);

  return (
    <article className="break-inside-avoid rounded-xl border border-border p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Question {number} · {QUESTION_TYPE_LABELS[question.type]}
          </p>
          <h3 className="mt-1 font-semibold">{question.prompt}</h3>
        </div>
        <span className="text-sm text-foreground-muted">
          {formatCount(answered)} answered
          {question.visibleIf?.length ? ' (conditional)' : ''}
        </span>
      </header>

      {isChoice ? (
        <>
          <BarRows rows={questionDistribution(question, responses)} unit="respondents" />
          {question.type === 'MULTI_CHOICE' ? (
            <p className="mt-3 text-xs text-foreground-muted">Respondents could choose several options, so shares can add up to more than 100%.</p>
          ) : null}
        </>
      ) : null}

      {question.type === 'RATING' ? (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Stat
            label="Mean rating"
            value={meanScore(question, responses)?.toFixed(2) ?? '—'}
            hint={`Scale ${question.min ?? 1}–${question.max ?? 5}${question.minLabel ? ` (${question.minLabel} → ${question.maxLabel ?? ''})` : ''}`}
          />
          <BarRows rows={questionDistribution(question, responses)} unit="respondents" />
        </div>
      ) : null}

      {question.type === 'NPS' ? <NpsBlock question={question} responses={responses} /> : null}

      {question.type === 'NUMBER' ? <NumberBlock question={question} responses={responses} /> : null}

      {question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT' || question.type === 'DATE' ? (
        <p className="text-sm text-foreground-muted">
          {question.type === 'DATE'
            ? 'Date answers are available in the Responses tab and the CSV export.'
            : 'Open-text answers are coded in the Themes tab.'}
        </p>
      ) : null}
    </article>
  );
}

function NpsBlock({ question, responses }: { question: ConsultationQuestion; responses: ConsultationResponse[] }) {
  const nps = npsScore(question, responses);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="NPS" value={nps.score === null ? '—' : String(nps.score)} hint="% promoters − % detractors" />
        <Stat label="Promoters (9–10)" value={formatCount(nps.promoters)} />
        <Stat label="Passives (7–8)" value={formatCount(nps.passives)} />
        <Stat label="Detractors (0–6)" value={formatCount(nps.detractors)} />
      </div>
      <BarRows rows={questionDistribution(question, responses)} unit="respondents" />
    </div>
  );
}

function NumberBlock({ question, responses }: { question: ConsultationQuestion; responses: ConsultationResponse[] }) {
  const summary = numberSummary(question, responses);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Mean" value={summary.mean === null ? '—' : String(summary.mean)} />
      <Stat label="Lowest" value={summary.min === null ? '—' : String(summary.min)} />
      <Stat label="Highest" value={summary.max === null ? '—' : String(summary.max)} />
    </div>
  );
}

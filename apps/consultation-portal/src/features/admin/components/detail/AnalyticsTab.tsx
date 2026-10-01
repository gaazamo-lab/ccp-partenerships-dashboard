import { BarChart3 } from 'lucide-react';

import type { Consultation, ConsultationResponse } from '@partner-crm/types';
import { EmptyState, SectionCard, formatDate } from '@partner-crm/ui';

import {
  languageBreakdown,
  responsesPerDay,
  stakeholderGroupBreakdown,
} from '@/features/consultations/analytics';
import { BarRows } from '@/features/consultations/components/BarRows';
import { QuestionAnalytics } from '@/features/consultations/components/QuestionAnalytics';

interface AnalyticsTabProps {
  consultation: Consultation;
  responses: ConsultationResponse[];
}

export function AnalyticsTab({ consultation, responses }: AnalyticsTabProps) {
  if (!responses.length) {
    return (
      <SectionCard title="Analytics">
        <EmptyState
          icon={<BarChart3 size={20} aria-hidden />}
          message="No responses to analyse yet"
          hint="Distributions, ratings and NPS appear here once responses arrive."
        />
      </SectionCard>
    );
  }

  const daily = responsesPerDay(responses);
  const peak = Math.max(...daily.map((day) => day.count), 1);
  const answerable = consultation.questions.filter((question) => question.type !== 'SECTION');

  return (
    <div className="flex flex-col gap-body">
      <SectionCard
        title="Responses per day" /* description={`${formatCount(responses.length)} responses from ${formatDate(daily[0]?.date)} to ${formatDate(daily[daily.length - 1]?.date)}.`} */
      >
        <div className="flex h-36 items-end gap-[2px]" role="img" aria-label="Responses per day">
          {daily.map((day) => (
            <div
              key={day.date}
              className="group relative flex h-full min-w-[4px] flex-1 items-end"
              title={`${formatDate(day.date)}: ${day.count} responses`}
            >
              <div
                className="w-full rounded-t-[4px] bg-primary"
                style={{ height: `${(day.count / peak) * 100}%`, minHeight: day.count ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-foreground-muted">
          <span>{formatDate(daily[0]?.date)}</span>
          <span>Peak {peak} per day</span>
          <span>{formatDate(daily[daily.length - 1]?.date)}</span>
        </div>
      </SectionCard>

      <div className="grid gap-body lg:grid-cols-2">
        <SectionCard
          title="By stakeholder group" /* description="Known only for respondents who consented to link their identity." */
        >
          <BarRows rows={stakeholderGroupBreakdown(responses)} />
        </SectionCard>
        <SectionCard
          title="By language" /* description="Language each response was submitted in." */
        >
          <BarRows rows={languageBreakdown(responses)} />
        </SectionCard>
      </div>

      <SectionCard
        title="Question results" /* description="Hidden (skipped) questions count only respondents who saw them." */
      >
        <div className="space-y-4">
          {answerable.map((question, index) => (
            <QuestionAnalytics
              key={question.id}
              question={question}
              number={index + 1}
              responses={responses}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

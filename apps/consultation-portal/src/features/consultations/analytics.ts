import type {
  Consultation,
  ConsultationAnswer,
  ConsultationQuestion,
  ConsultationResponse,
} from '@partner-crm/types';

import { CHOICE_TYPES, languageLabel } from './constants';
import { isAnswered } from './logic';

/**
 * Quantitative analytics over loaded responses. Pure functions so the numbers
 * on screen, in the printed summary and in tests all come from one place.
 */

export interface DistributionRow {
  label: string;
  count: number;
  /** Share of respondents who answered the question, 0–100 (one decimal). */
  share: number;
}

function share(count: number, total: number) {
  return total ? Number(((count / total) * 100).toFixed(1)) : 0;
}

function answersFor(question: ConsultationQuestion, responses: ConsultationResponse[]) {
  return responses
    .map((response) => response.answers[question.id])
    .filter((answer): answer is ConsultationAnswer => answer !== undefined && isAnswered(answer));
}

function numeric(answer: ConsultationAnswer): number | null {
  if (Array.isArray(answer)) return null;
  const value = typeof answer === 'number' ? answer : Number(answer);
  return Number.isNaN(value) ? null : value;
}

export function answeredCount(question: ConsultationQuestion, responses: ConsultationResponse[]) {
  return answersFor(question, responses).length;
}

/** Scale points for RATING (min..max) and NPS (0..10). */
export function scalePoints(question: ConsultationQuestion): number[] {
  const min = question.type === 'NPS' ? 0 : (question.min ?? 1);
  const max = question.type === 'NPS' ? 10 : (question.max ?? 5);
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
}

/**
 * Count per option (choice questions) or per scale point (rating, NPS). For
 * multiple choice the shares are of respondents, so they can sum past 100%.
 * Answers that no longer match an option are grouped under "Other".
 */
export function questionDistribution(
  question: ConsultationQuestion,
  responses: ConsultationResponse[],
): DistributionRow[] {
  const answers = answersFor(question, responses);
  const total = answers.length;
  if (CHOICE_TYPES.includes(question.type)) {
    const options = question.options ?? [];
    const counts = new Map(options.map((option) => [option, 0]));
    let other = 0;
    for (const answer of answers) {
      const picked = Array.isArray(answer) ? answer : [String(answer)];
      for (const value of picked) {
        if (counts.has(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
        else other += 1;
      }
    }
    const rows = options.map((option) => ({ label: option, count: counts.get(option) ?? 0, share: share(counts.get(option) ?? 0, total) }));
    return other ? [...rows, { label: 'Other', count: other, share: share(other, total) }] : rows;
  }
  if (question.type === 'RATING' || question.type === 'NPS') {
    const values = answers.map(numeric).filter((value): value is number => value !== null);
    return scalePoints(question).map((point) => {
      const count = values.filter((value) => value === point).length;
      return { label: String(point), count, share: share(count, total) };
    });
  }
  return [];
}

export function meanScore(question: ConsultationQuestion, responses: ConsultationResponse[]): number | null {
  const values = answersFor(question, responses).map(numeric).filter((value): value is number => value !== null);
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export interface NpsResult {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  /** % promoters − % detractors, −100 to 100. */
  score: number | null;
}

export function npsScore(question: ConsultationQuestion, responses: ConsultationResponse[]): NpsResult {
  const values = answersFor(question, responses).map(numeric).filter((value): value is number => value !== null);
  const promoters = values.filter((value) => value >= 9).length;
  const detractors = values.filter((value) => value <= 6).length;
  const passives = values.length - promoters - detractors;
  return {
    promoters,
    passives,
    detractors,
    total: values.length,
    score: values.length ? Math.round(((promoters - detractors) / values.length) * 100) : null,
  };
}

export interface NumberSummary {
  count: number;
  mean: number | null;
  min: number | null;
  max: number | null;
}

export function numberSummary(question: ConsultationQuestion, responses: ConsultationResponse[]): NumberSummary {
  const values = answersFor(question, responses).map(numeric).filter((value): value is number => value !== null);
  if (!values.length) return { count: 0, mean: null, min: null, max: null };
  return {
    count: values.length,
    mean: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export interface DailyCount {
  date: string;
  count: number;
}

/** Responses per calendar day (UTC), oldest first, with empty days filled in. */
export function responsesPerDay(responses: ConsultationResponse[]): DailyCount[] {
  if (!responses.length) return [];
  const counts = new Map<string, number>();
  for (const response of responses) {
    const day = response.submittedAt.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const days = [...counts.keys()].sort();
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return [];
  const series: DailyCount[] = [];
  for (let cursor = new Date(`${first}T00:00:00Z`); cursor <= new Date(`${last}T00:00:00Z`); cursor = new Date(cursor.getTime() + 86_400_000)) {
    const day = cursor.toISOString().slice(0, 10);
    series.push({ date: day, count: counts.get(day) ?? 0 });
  }
  return series;
}

function groupBy(responses: ConsultationResponse[], key: (response: ConsultationResponse) => string): DistributionRow[] {
  const counts = new Map<string, number>();
  for (const response of responses) counts.set(key(response), (counts.get(key(response)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: share(count, responses.length) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

/**
 * Breakdown by stakeholder group. The group is only known for identity-linked
 * responses (explicit consent); everything else is reported as "Not linked"
 * rather than guessed.
 */
export function stakeholderGroupBreakdown(responses: ConsultationResponse[]): DistributionRow[] {
  return groupBy(responses, (response) =>
    response.consentToIdentityLink && response.respondent?.stakeholderGroup.trim()
      ? response.respondent.stakeholderGroup.trim()
      : 'Not linked (anonymous)',
  );
}

export function languageBreakdown(responses: ConsultationResponse[]): DistributionRow[] {
  return groupBy(responses, (response) => languageLabel(response.language));
}

export interface ThemeFrequency {
  themeId: string;
  label: string;
  count: number;
  share: number;
}

/** How many coded answers carry each theme, most frequent first. */
export function themeFrequency(consultation: Consultation, responses: ConsultationResponse[]): ThemeFrequency[] {
  const coded = responses.filter((response) => Object.values(response.themes).some((ids) => ids.length));
  return consultation.themes
    .map((theme) => {
      const count = responses.reduce(
        (sum, response) => sum + Object.values(response.themes).filter((ids) => ids.includes(theme.id)).length,
        0,
      );
      return { themeId: theme.id, label: theme.label, count, share: share(count, coded.length) };
    })
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export interface OpenTextAnswer {
  responseId: string;
  questionId: string;
  submittedAt: string;
  language: string;
  text: string;
  themeIds: string[];
}

/** Every non-empty text answer, newest first, with the themes applied to it. */
export function openTextAnswers(consultation: Consultation, responses: ConsultationResponse[]): OpenTextAnswer[] {
  const textQuestions = consultation.questions.filter((question) => question.type === 'SHORT_TEXT' || question.type === 'LONG_TEXT');
  return responses
    .flatMap((response) =>
      textQuestions.flatMap((question) => {
        const answer = response.answers[question.id];
        if (typeof answer !== 'string' || !answer.trim()) return [];
        return [{
          responseId: response.id,
          questionId: question.id,
          submittedAt: response.submittedAt,
          language: response.language,
          text: answer.trim(),
          themeIds: response.themes[question.id] ?? [],
        }];
      }),
    )
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

/** Coded share of open-text answers (0–100). */
export function codingProgress(answers: OpenTextAnswer[]) {
  if (!answers.length) return 0;
  return Math.round((answers.filter((answer) => answer.themeIds.length).length / answers.length) * 100);
}

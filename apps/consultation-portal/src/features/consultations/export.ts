import type { Consultation, ConsultationResponse } from '@partner-crm/types';

import { formatAnswer } from './domain';

function escapeCsv(value: unknown) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

/**
 * Response export (PRD AC-15). Answers, language, themes and the consent flag
 * only — respondent names and emails never leave the consent-controlled record,
 * even for responses that consented to the link.
 */
export function consultationResponsesCsv(consultation: Consultation, responses: ConsultationResponse[]) {
  const questions = consultation.questions.filter((question) => question.type !== 'SECTION');
  const themeLabel = (id: string) => consultation.themes.find((theme) => theme.id === id)?.label ?? id;
  const headers = [
    'response_id',
    'submitted_at',
    'language',
    'identity_link_consent',
    ...questions.map((question) => question.prompt),
    'themes',
  ];
  const rows = responses.map((response) => [
    response.id,
    response.submittedAt,
    response.language,
    response.consentToIdentityLink ? 'yes' : 'no',
    ...questions.map((question) => formatAnswer(response.answers[question.id])),
    [...new Set(Object.values(response.themes).flat())].map(themeLabel).join('; '),
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function downloadCsv(filename: string, value: string) {
  // BOM so Excel opens accented and Arabic text correctly.
  const url = URL.createObjectURL(new Blob(['﻿', value], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

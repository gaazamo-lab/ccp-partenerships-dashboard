import { describe, expect, it } from 'vitest';

import { initialConsultations, initialResponses } from './mockData';
import { consultationResponsesCsv } from './export';

describe('consultation CSV export', () => {
  it('exports answers and consent without respondent PII', () => {
    const consultation = initialConsultations[0];
    if (!consultation) throw new Error('Expected consultation fixture.');
    const csv = consultationResponsesCsv(consultation, initialResponses);
    expect(csv).toContain('identity_link_consent');
    expect(csv).toContain('Writing and professional judgement');
    expect(csv).not.toContain('Ama Mensah');
    expect(csv).not.toContain('ama@example.com');
  });
});

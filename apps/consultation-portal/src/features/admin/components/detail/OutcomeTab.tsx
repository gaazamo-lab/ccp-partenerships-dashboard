import { useState } from 'react';

import { Button, Notice, useToast } from '@rfdtech/components';

import type { Consultation } from '@partner-crm/types';
import { SectionCard, TextareaField } from '@partner-crm/ui';

import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

interface OutcomeTabProps {
  consultation: Consultation;
  denied?: string;
}

/** "What we heard": the published summary shown on the public page once closed (§88). */
export function OutcomeTab({ consultation, denied }: OutcomeTabProps) {
  const { publishOutcome } = useConsultations();
  const { toast } = useToast();
  const [summary, setSummary] = useState(consultation.outcomeSummary ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const closed = consultation.status === 'CLOSED';

  const publish = async () => {
    if (!summary.trim()) {
      setError('Write the summary before publishing.');
      return;
    }
    setSaving(true);
    try {
      await publishOutcome(consultation.id, summary);
      toast({
        title: 'Outcome published',
        description: 'The summary now appears on the public consultation page.',
        variant: 'success',
      });
    } catch {
      // Toasted by the provider.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-body">
      {!closed && consultation.status !== 'ARCHIVED' ? (
        <Notice variant="info" title="Available after closing" leftBorder>
          Publish what you heard once the consultation has closed. Respondents and the public will
          see it on the consultation page.
        </Notice>
      ) : null}
      {closed ? (
        <SectionCard
          title="What we heard" /* description="Summarise the main findings and what CLET will do in response. Plain language; no personal data." */
        >
          <div className="space-y-4">
            <TextareaField
              label="Outcome summary"
              required
              rows={8}
              value={summary}
              disabled={Boolean(denied)}
              error={error}
              onChange={(value) => {
                setSummary(value);
                setError('');
              }}
              // description="Separate paragraphs with a blank line."
            />
            <Button
              onClick={() => void publish()}
              disabled={Boolean(denied) || saving}
              loading={saving}
              title={denied}
            >
              {consultation.outcomeSummary ? 'Update published outcome' : 'Publish outcome'}
            </Button>
          </div>
        </SectionCard>
      ) : null}
      {consultation.outcomeSummary ? (
        <SectionCard
          title="Published summary" /* description="As it appears on the public site." */
        >
          <div className="space-y-3 text-sm leading-6">
            {consultation.outcomeSummary.split(/\n{2,}/).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

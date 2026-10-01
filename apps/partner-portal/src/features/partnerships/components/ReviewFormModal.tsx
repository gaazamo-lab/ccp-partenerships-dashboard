import { type FormEvent, useState } from 'react';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  useToast,
} from '@rfdtech/components';

import type { PartnershipReview, UpdatePartnershipReviewInput } from '@partner-crm/types';

import { validatePartnershipReview } from '@/features/partnerships/reviewValidation';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import {
  FormGrid,
  SelectField,
  type SelectOption,
  TextField,
  TextareaField,
} from '@/features/shared';

type ReviewField =
  | 'reviewDate'
  | 'reviewer'
  | 'periodStart'
  | 'periodEnd'
  | 'summary'
  | 'outputs'
  | 'recommendations'
  | 'nextReviewDate'
  | 'strategicScore';

/**
 * `validatePartnershipReview` is the shared rule set and returns plain
 * sentences. This maps each one onto the field it is about, so a rejected
 * submit points at the control to fix instead of failing silently.
 */
const MESSAGE_FIELDS: Array<[RegExp, ReviewField]> = [
  [/^Review date/, 'reviewDate'],
  [/^Reviewer/, 'reviewer'],
  [/^Review period/, 'periodStart'],
  [/^Period end/, 'periodEnd'],
  [/^Executive summary/, 'summary'],
  [/realised output/, 'outputs'],
  [/recommendation is required/, 'recommendations'],
  [/^Next review/, 'nextReviewDate'],
  [/^Strategic score/, 'strategicScore'],
];

type ReviewErrors = Partial<Record<ReviewField, string>> & { other?: string[] };

function toFieldErrors(messages: string[]): ReviewErrors {
  const errors: ReviewErrors = {};
  const other: string[] = [];
  for (const message of messages) {
    const match = MESSAGE_FIELDS.find(([pattern]) => pattern.test(message));
    if (!match) {
      other.push(message);
      continue;
    }
    const [, field] = match;
    errors[field] ??= message;
  }
  // A rule with no field of its own still has to reach the user somehow.
  if (other.length > 0) errors.other = other;
  return errors;
}

const OUTCOMES: SelectOption[] = [
  { value: 'EXCEEDS_EXPECTATIONS', label: 'Exceeds expectations' },
  { value: 'ON_TRACK', label: 'On track' },
  { value: 'NEEDS_ATTENTION', label: 'Needs attention' },
  { value: 'NO_LONGER_STRATEGIC', label: 'No longer strategic' },
];

const RENEWAL_RECOMMENDATIONS: SelectOption[] = [
  { value: 'RENEW', label: 'Renew' },
  { value: 'RENEW_WITH_CHANGES', label: 'Renew with changes' },
  { value: 'TERMINATE', label: 'Terminate' },
  { value: 'DEFER', label: 'Defer decision' },
];

const SCORES: SelectOption[] = [1, 2, 3, 4, 5].map((score) => ({
  value: String(score),
  label: `${score} / 5`,
}));

const lines = (value: string) => [
  ...new Set(
    value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export function ReviewFormModal({
  open,
  onOpenChange,
  agreementId,
  actor,
  review,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementId: string;
  actor: string;
  review?: PartnershipReview;
}) {
  const { createReview, updateReview } = usePartnerships();
  const { toast } = useToast();

  const [form, setForm] = useState<UpdatePartnershipReviewInput>(() => ({
    reviewDate: review?.reviewDate ?? new Date().toISOString().slice(0, 10),
    reviewer: review?.reviewer ?? actor,
    outcome: review?.outcome ?? 'ON_TRACK',
    summary: review?.summary ?? '',
    periodStart: review?.periodStart ?? '',
    periodEnd: review?.periodEnd ?? '',
    outputs: review?.outputs ?? [],
    strategicScore: review?.strategicScore ?? 3,
    issues: review?.issues ?? [],
    recommendations: review?.recommendations ?? [],
    renewalRecommendation: review?.renewalRecommendation ?? 'DEFER',
    nextReviewDate: review?.nextReviewDate ?? '',
  }));
  const [outputsText, setOutputsText] = useState(() => (review?.outputs ?? []).join('\n'));
  const [issuesText, setIssuesText] = useState(() => (review?.issues ?? []).join('\n'));
  const [recommendationsText, setRecommendationsText] = useState(() =>
    (review?.recommendations ?? []).join('\n'),
  );
  const [errors, setErrors] = useState<ReviewErrors>({});

  const setField = <K extends keyof UpdatePartnershipReviewInput>(
    field: K,
    value: UpdatePartnershipReviewInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      ...form,
      reviewer: form.reviewer.trim(),
      summary: form.summary.trim(),
      outputs: lines(outputsText),
      issues: lines(issuesText),
      recommendations: lines(recommendationsText),
    };

    const messages = validatePartnershipReview(input);
    setErrors(toFieldErrors(messages));
    if (messages.length > 0) return;

    if (review) updateReview(review.id, input, actor);
    else createReview({ agreementId, ...input }, actor);

    toast({
      title: review ? 'Review updated' : 'Review recorded',
      description: 'The value assessment and renewal recommendation were saved.',
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader>
            <ModalTitle>{review ? 'Edit value review' : 'Record value review'}</ModalTitle>
            <ModalDescription>
              Capture realised outputs, strategic value, issues, and a renewal recommendation.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {errors.other?.length ? (
              <Notice variant="error" title="This review can't be saved yet" leftBorder>
                <ul className="space-y-1">
                  {errors.other.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}

            <FormGrid>
              <TextField
                label="Period start"
                type="date"
                required
                value={form.periodStart}
                onChange={(value) => setField('periodStart', value)}
                error={errors.periodStart}
              />
              <TextField
                label="Period end"
                type="date"
                required
                value={form.periodEnd}
                onChange={(value) => setField('periodEnd', value)}
                min={form.periodStart || undefined}
                error={errors.periodEnd}
              />
              <TextField
                label="Review date"
                type="date"
                required
                value={form.reviewDate}
                onChange={(value) => setField('reviewDate', value)}
                error={errors.reviewDate}
              />
              <TextField
                label="Reviewer"
                required
                value={form.reviewer}
                onChange={(value) => setField('reviewer', value)}
                error={errors.reviewer}
              />
              <SelectField
                label="Outcome"
                value={form.outcome}
                onChange={(value) => setField('outcome', value as PartnershipReview['outcome'])}
                options={OUTCOMES}
              />
              <SelectField
                label="Strategic score"
                value={String(form.strategicScore)}
                onChange={(value) => setField('strategicScore', Number(value) as 1 | 2 | 3 | 4 | 5)}
                options={SCORES}
                error={errors.strategicScore}
              />
            </FormGrid>

            <TextareaField
              label="Executive summary"
              required
              rows={3}
              value={form.summary}
              onChange={(value) => setField('summary', value)}
              error={errors.summary}
            />
            <TextareaField
              label="Realised outputs"
              required
              rows={3}
              value={outputsText}
              onChange={(value) => {
                setOutputsText(value);
                setErrors((current) =>
                  current.outputs ? { ...current, outputs: undefined } : current,
                );
              }}
              // description="One measurable output per line."
              error={errors.outputs}
            />
            <TextareaField
              label="Issues and risks"
              rows={3}
              value={issuesText}
              onChange={setIssuesText}
              // description="One issue per line; leave blank when none are open."
            />
            <TextareaField
              label="Recommendations"
              required
              rows={3}
              value={recommendationsText}
              onChange={(value) => {
                setRecommendationsText(value);
                setErrors((current) =>
                  current.recommendations ? { ...current, recommendations: undefined } : current,
                );
              }}
              // description="One action per line."
              error={errors.recommendations}
            />

            <FormGrid>
              <SelectField
                label="Renewal recommendation"
                value={form.renewalRecommendation}
                onChange={(value) =>
                  setField(
                    'renewalRecommendation',
                    value as PartnershipReview['renewalRecommendation'],
                  )
                }
                options={RENEWAL_RECOMMENDATIONS}
              />
              <TextField
                label="Next review date"
                type="date"
                required
                value={form.nextReviewDate}
                onChange={(value) => setField('nextReviewDate', value)}
                min={form.reviewDate || undefined}
                error={errors.nextReviewDate}
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{review ? 'Save changes' : 'Record review'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

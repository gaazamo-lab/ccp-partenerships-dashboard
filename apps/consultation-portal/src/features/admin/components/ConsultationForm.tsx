import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Notice } from '@rfdtech/components';

import type {
  ConsultationAudienceSource,
  CreateConsultationInput,
  Segment,
} from '@partner-crm/types';
import {
  CheckboxField,
  FormActions,
  FormGrid,
  FormSection,
  MultiSelectField,
  SelectField,
  TextField,
  TextareaField,
  formatCount,
} from '@partner-crm/ui';

import { cleanQuestions } from '@/features/consultations/builder';
import { QuestionBuilder } from '@/features/consultations/components/QuestionBuilder';
import { AUDIENCE_LABELS, CATEGORIES, LANGUAGES } from '@/features/consultations/constants';
import {
  type ConsultationFormValues,
  hasFormErrors,
  slugify,
  toConsultationInput,
  validateConsultationForm,
} from '@/features/consultations/domain';
import { audienceReach } from '@/features/consultations/invitations';

interface ConsultationFormProps {
  initialValues: ConsultationFormValues;
  submitLabel: string;
  savingLabel: string;
  cancelTo: string;
  takenSlugs: string[];
  segments: Segment[];
  onSubmit: (input: CreateConsultationInput) => Promise<void>;
}

const AUDIENCE_OPTIONS = (Object.keys(AUDIENCE_LABELS) as ConsultationAudienceSource[]).map(
  (value) => ({
    value,
    label: AUDIENCE_LABELS[value],
  }),
);

const LANGUAGE_OPTIONS = LANGUAGES.map((language) => ({
  value: language.code,
  label: language.label,
}));

/** Create/edit form: details, audience and privacy, languages and the question builder. */
export function ConsultationForm({
  initialValues,
  submitLabel,
  savingLabel,
  cancelTo,
  takenSlugs,
  segments,
  onSubmit,
}: ConsultationFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues.slug));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = validateConsultationForm(values, takenSlugs);
  const show = (message: string | undefined) => (submitted ? message : undefined);
  const setField = <K extends keyof ConsultationFormValues>(
    key: K,
    value: ConsultationFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const [primary = 'en', ...additional] = values.languages;
  const reach = audienceReach(values.audienceSegmentIds, segments);
  const categoryOptions =
    CATEGORIES.includes(values.category) || !values.category
      ? CATEGORIES
      : [values.category, ...CATEGORIES];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasFormErrors(errors)) return;
    setSaving(true);
    try {
      await onSubmit(toConsultationInput(values, cleanQuestions(values.questions)));
    } catch {
      // The provider has already explained the failure; keep the form as entered.
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex  flex-col gap-body"
      noValidate
    >
      <FormSection
        title="Consultation details" /* description="Shown on the public consultation page." */
      >
        <FormGrid>
          <TextField
            label="Title"
            required
            value={values.title}
            placeholder="e.g. Draft Legal Education Bill 2026"
            error={show(errors.title)}
            onChange={(title) =>
              setValues((current) => ({
                ...current,
                title,
                slug: slugTouched ? current.slug : slugify(title),
              }))
            }
          />
          <SelectField
            label="Category"
            required
            value={values.category}
            options={categoryOptions}
            placeholder="Choose a category"
            error={show(errors.category)}
            onChange={(category) => setField('category', category)}
          />
          <TextField
            label="Public URL slug"
            required
            value={values.slug}
            placeholder="e.g. draft-legal-education-bill"
            error={show(errors.slug)}
            // description={`/consultations/${values.slug || slugify(values.title) || '…'}`}
            onChange={(slug) => {
              setSlugTouched(true);
              setField('slug', slugify(slug));
            }}
          />
          <TextField
            label="Estimated minutes"
            type="number"
            min={1}
            max={120}
            value={String(values.estimatedMinutes)}
            error={show(errors.estimatedMinutes)}
            onChange={(minutes) => setField('estimatedMinutes', Number(minutes))}
          />
          <TextareaField
            className="sm:col-span-2"
            label="Card summary"
            required
            rows={3}
            value={values.summary}
            placeholder="One or two sentences for the consultation list."
            error={show(errors.summary)}
            onChange={(summary) => setField('summary', summary)}
          />
          <TextareaField
            className="sm:col-span-2"
            label="Public introduction"
            required
            rows={3}
            value={values.description}
            placeholder="Purpose, who should respond and how responses will be used."
            error={show(errors.description)}
            onChange={(description) => setField('description', description)}
          />
          <TextField
            label="Opens"
            type="date"
            required
            value={values.opensAt}
            error={show(errors.opensAt)}
            onChange={(opensAt) => setField('opensAt', opensAt)}
          />
          <TextField
            label="Closes"
            type="date"
            required
            value={values.closesAt}
            error={show(errors.closesAt)}
            onChange={(closesAt) => setField('closesAt', closesAt)}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Languages" /* description="Respondents can switch between these languages on the public form." */
      >
        <FormGrid>
          <SelectField
            label="Primary language"
            required
            value={primary}
            options={LANGUAGE_OPTIONS}
            error={show(errors.languages)}
            onChange={(code) =>
              setField('languages', [code, ...additional.filter((item) => item !== code)])
            }
          />
          <MultiSelectField
            label="Additional languages"
            optional
            value={additional}
            options={LANGUAGE_OPTIONS.filter((option) => option.value !== primary)}
            placeholder="None"
            searchPlaceholder="Search languages"
            // description="Each additional language gets a translation tab in the question builder."
            onChange={(codes) =>
              setField('languages', [primary, ...codes.filter((code) => code !== primary)])
            }
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Audience and privacy" /* description="Targeted audiences are resolved from S081 segments; only contacts with S188 consent are invited." */
      >
        <div className="space-y-4">
          <FormGrid>
            <SelectField
              label="Audience source"
              required
              value={values.audienceSource}
              options={AUDIENCE_OPTIONS}
              onChange={(source) =>
                setField('audienceSource', source as ConsultationAudienceSource)
              }
            />
            {values.audienceSource !== 'PUBLIC' ? (
              <MultiSelectField
                label="Audience segments (S081)"
                required
                value={values.audienceSegmentIds}
                options={segments.map((segment) => ({
                  value: segment.id,
                  label: `${segment.name} (${formatCount(segment.consented)} consented)`,
                }))}
                placeholder={segments.length ? 'Choose segments' : 'No segments available'}
                searchPlaceholder="Search segments"
                emptyMessage="No matching segments"
                error={show(errors.audienceSegmentIds)}
                onChange={(ids) => setField('audienceSegmentIds', ids)}
              />
            ) : null}
          </FormGrid>
          {values.audienceSource !== 'PUBLIC' && values.audienceSegmentIds.length ? (
            <Notice
              variant="info"
              leftBorder
              title={`${formatCount(reach.consented)} consent-verified recipients`}
            >
              {formatCount(reach.members)} contacts across {values.audienceSegmentIds.length}{' '}
              segment
              {values.audienceSegmentIds.length === 1 ? '' : 's'}; {formatCount(reach.excluded)}{' '}
              will be excluded because they have no recorded S188 communication consent. Counts are
              refreshed when invitations are sent.
            </Notice>
          ) : null}
          {values.audienceSource !== 'PUBLIC' && !segments.length ? (
            <Notice variant="warning" leftBorder>
              Segments could not be loaded from the Partner CRM. Create or check segments in S081,
              then reload this page.
            </Notice>
          ) : null}
          <FormGrid>
            <CheckboxField
              label="Allow anonymous responses"
              checked={values.anonymousAllowed}
              onChange={(anonymousAllowed) =>
                setValues((current) => ({
                  ...current,
                  anonymousAllowed,
                  collectIdentity: anonymousAllowed ? current.collectIdentity : true,
                }))
              }
              // description="Required for open public consultations unless identity is legally necessary."
            />
            <CheckboxField
              label="Offer optional identity linking"
              checked={values.anonymousAllowed ? values.collectIdentity : true}
              disabled={!values.anonymousAllowed}
              onChange={(collectIdentity) => setField('collectIdentity', collectIdentity)}
              // description="Identity is stored against a response only after explicit consent."
            />
          </FormGrid>
          {!values.anonymousAllowed ? (
            <Notice variant="warning" leftBorder title="Identified responses only">
              Every respondent must give their name and email and explicitly consent to linking them
              to their answers before they can submit.
            </Notice>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Questions" /* description="Build the form. Section breaks split it into pages; conditions hide questions that do not apply." */
      >
        {submitted && errors.questionsForm ? (
          <div className="mb-4">
            <Notice variant="error" leftBorder>
              {errors.questionsForm}
            </Notice>
          </div>
        ) : null}
        <QuestionBuilder
          questions={values.questions}
          languages={values.languages}
          errors={errors.questionErrors}
          showErrors={submitted}
          disabled={saving}
          onChange={(questions) => setField('questions', questions)}
        />
      </FormSection>

      {submitted && hasFormErrors(errors) ? (
        <Notice variant="error" title="Check the form" leftBorder>
          Complete the highlighted fields. Your entries have been kept.
        </Notice>
      ) : null}
      <FormActions>
        <Button type="button" variant="ghost" onClick={() => void navigate(cancelTo)}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} loadingLabel={savingLabel} disabled={saving}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}

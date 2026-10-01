import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Card, Notice, ProgressBar } from '@rfdtech/components';

import type { Consultation, ConsultationAnswer } from '@partner-crm/types';

import { thankYouRoute } from '@/constants/routes';
import { type IdentityState, answerErrors, identityErrors } from '@/features/consultations/domain';
import { pruneHiddenAnswers, visiblePages } from '@/features/consultations/logic';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';
import { localizeQuestion } from '@/features/consultations/translation';

import { formStrings } from '../i18n';
import { IdentitySection } from './IdentitySection';
import { QuestionField } from './QuestionField';

interface SurveyFormProps {
  consultation: Consultation;
  language: string;
}

/** Paged public form: one page per section, skip logic applied live. */
export function SurveyForm({ consultation, language }: SurveyFormProps) {
  const navigate = useNavigate();
  const { submitResponse } = useConsultations();
  const strings = formStrings(language);
  const primary = consultation.languages[0] ?? 'en';
  const [answers, setAnswers] = useState<Record<string, ConsultationAnswer | undefined>>({});
  const [step, setStep] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [identity, setIdentity] = useState<IdentityState>({ consent: false, respondent: { name: '', email: '', stakeholderGroup: '' } });
  const [identityChecked, setIdentityChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pages = visiblePages(consultation.questions, answers);
  const current = Math.min(step, Math.max(0, pages.length - 1));
  const page = pages[current];
  const isLast = current >= pages.length - 1;
  const showIdentity = consultation.collectIdentity || !consultation.anonymousAllowed;
  const errors = answerErrors(consultation.questions, answers);
  const pageErrors = (index: number) => (pages[index]?.questions ?? []).filter((question) => errors[question.id]);
  const idErrors = showIdentity ? identityErrors(consultation, identity) : {};

  const messageFor = (questionId: string) => {
    const code = errors[questionId];
    if (!code) return undefined;
    const question = consultation.questions.find((item) => item.id === questionId);
    if (code === 'required') return question && ['SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE'].includes(question.type) ? strings.required : strings.chooseOne;
    return strings.numberRange(question?.min, question?.max);
  };

  const goNext = () => {
    setCheckedSteps((items) => [...items, current]);
    if (pageErrors(current).length) return;
    setStep(current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLast) {
      goNext();
      return;
    }
    setCheckedSteps(pages.map((_, index) => index));
    setIdentityChecked(true);
    const firstInvalid = pages.findIndex((_, index) => pageErrors(index).length);
    if (firstInvalid >= 0) {
      setStep(firstInvalid);
      return;
    }
    if (Object.keys(idErrors).length) return;
    setSubmitting(true);
    try {
      const withIdentity = showIdentity && identity.consent;
      await submitResponse(consultation.slug, {
        language,
        answers: pruneHiddenAnswers(consultation.questions, answers),
        consentToIdentityLink: withIdentity,
        respondent: withIdentity ? { ...identity.respondent, name: identity.respondent.name.trim(), email: identity.respondent.email.trim() } : undefined,
      });
      void navigate(thankYouRoute(consultation.slug), { state: { title: consultation.title }, replace: true });
    } catch {
      // Toasted by the provider; answers stay in place.
      setSubmitting(false);
    }
  };

  if (!page) {
    return <Notice variant="info" leftBorder>This consultation has no questions yet.</Notice>;
  }

  const sectionText = page.section ? localizeQuestion(page.section, language, primary) : null;
  const showPageErrors = checkedSteps.includes(current);

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-foreground-muted">
          <span>{strings.step(current + 1, pages.length)}</span>
          <span>{Math.round(((current + 1) / pages.length) * 100)}%</span>
        </div>
        <ProgressBar value={((current + 1) / pages.length) * 100} aria-label={strings.step(current + 1, pages.length)} />
      </div>

      <Card bordered>
        {sectionText ? (
          <header className="mb-6 border-b border-border pb-4">
            <h2 className="text-xl font-semibold">{sectionText.prompt}</h2>
            {sectionText.description ? <p className="mt-1 text-sm text-foreground-muted">{sectionText.description}</p> : null}
          </header>
        ) : null}
        <div className="space-y-7">
          {page.questions.map((question, index) => (
            <div key={question.id} className={index ? 'border-t border-border pt-7' : ''}>
              <QuestionField
                question={question}
                text={localizeQuestion(question, language, primary)}
                value={answers[question.id]}
                strings={strings}
                error={showPageErrors ? messageFor(question.id) : undefined}
                onChange={(value) => setAnswers((items) => ({ ...items, [question.id]: value }))}
              />
            </div>
          ))}
        </div>
      </Card>

      {isLast && showIdentity ? (
        <IdentitySection consultation={consultation} identity={identity} errors={identityChecked ? idErrors : {}} onChange={setIdentity} />
      ) : null}

      {showPageErrors && pageErrors(current).length ? <Notice variant="error" leftBorder>{strings.fixErrors}</Notice> : null}

      <div className="flex justify-between gap-3">
        {current > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep(current - 1)}>
            {strings.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" loading={submitting} loadingLabel={strings.submitting} disabled={submitting}>
          {isLast ? strings.submit : strings.next}
        </Button>
      </div>
    </form>
  );
}

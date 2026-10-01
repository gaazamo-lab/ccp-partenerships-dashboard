import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Notice } from '@rfdtech/components';
import { ArrowLeft, CalendarDays, Clock3, Languages } from 'lucide-react';

import { formatDate } from '@partner-crm/ui';

import { ROUTES } from '@/constants/routes';
import { StatusBadge } from '@/features/consultations/components/StatusBadge';
import { isRtl, languageCode, languageNativeLabel } from '@/features/consultations/constants';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';
import { OutcomeCard } from '@/features/public/components/OutcomeCard';
import { SurveyForm } from '@/features/public/components/SurveyForm';
import { formStrings } from '@/features/public/i18n';

export function Component() {
  const { slug = '' } = useParams();
  const { publicConsultations, publicLoading, loadPublicConsultation } = useConsultations();
  const consultation = publicConsultations.find((item) => item.slug === slug);
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null);

  useEffect(() => {
    void loadPublicConsultation(slug);
  }, [loadPublicConsultation, slug]);

  if (!consultation) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        {publicLoading ? (
          <p className="text-foreground-muted">Loading consultation…</p>
        ) : (
          <Notice variant="error" title="Consultation not found" leftBorder>
            This consultation may have moved or is no longer available.{' '}
            <Link to={ROUTES.PUBLIC_HOME} className="font-medium text-primary hover:underline">See all consultations</Link>.
          </Notice>
        )}
      </main>
    );
  }

  const languages = consultation.languages.map(languageCode);
  const language = chosenLanguage && languages.includes(chosenLanguage) ? chosenLanguage : (languages[0] ?? 'en');
  const rtl = isRtl(language);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10" lang={language} dir={rtl ? 'rtl' : 'ltr'}>
      <Link to={ROUTES.PUBLIC_HOME} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden className={rtl ? 'rotate-180' : undefined} />
        All consultations
      </Link>
      <header className="mt-7 border-b border-border pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={consultation.status} />
          {languages.length > 1 ? (
            <label className="flex items-center gap-2 text-sm">
              <Languages size={16} aria-hidden className="text-foreground-muted" />
              <span className="sr-only">{formStrings(language).language}</span>
              <select
                value={language}
                onChange={(event) => setChosenLanguage(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2"
                aria-label={formStrings(language).language}
              >
                {languages.map((code) => (
                  <option key={code} value={code} lang={code}>{languageNativeLabel(code)}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{consultation.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-foreground-muted">{consultation.description}</p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm text-foreground-muted">
          <span className="flex items-center gap-2"><Clock3 size={16} aria-hidden />About {consultation.estimatedMinutes} minutes</span>
          <span className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />Closes {formatDate(consultation.closesAt)}</span>
        </div>
      </header>

      <div className="mt-8 space-y-6">
        {consultation.status === 'OPEN' ? (
          <>
            <Notice variant="info" title="Before you begin" leftBorder>
              Required questions are marked with an asterisk. Some questions appear only when they apply to you. Answers are
              analysed and reported in aggregate.
            </Notice>
            <SurveyForm key={consultation.id} consultation={consultation} language={language} />
          </>
        ) : consultation.status === 'SCHEDULED' ? (
          <Notice variant="info" title="Not open yet" leftBorder>
            This consultation opens on {formatDate(consultation.opensAt)}. Come back then to take part.
          </Notice>
        ) : (
          <OutcomeCard consultation={consultation} />
        )}
      </div>
    </main>
  );
}

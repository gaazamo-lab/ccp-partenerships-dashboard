import { Link, useParams } from 'react-router';

import { Button, Notice } from '@rfdtech/components';
import { ChevronLeft, Printer } from 'lucide-react';

import { formatCount, formatDate, formatDateTime, useNow } from '@partner-crm/ui';

import { ROUTES, adminConsultationRoute } from '@/constants/routes';
import { stakeholderGroupBreakdown, themeFrequency } from '@/features/consultations/analytics';
import { BarRows } from '@/features/consultations/components/BarRows';
import { QuestionAnalytics } from '@/features/consultations/components/QuestionAnalytics';
import { AUDIENCE_LABELS, STATUS_LABELS, languageLabel } from '@/features/consultations/constants';
import { consultationProgress } from '@/features/consultations/domain';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

/**
 * Printable results summary. Excel export is not available in this app, so the
 * PDF route is the browser's "Save as PDF" on this page. No personal data.
 */
export function Component() {
  const { consultationId = '' } = useParams();
  const { consultations, responses } = useConsultations();
  const now = useNow();
  const consultation = consultations.find((item) => item.id === consultationId);

  if (!consultation) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Notice variant="error" leftBorder>
          Consultation not found. <Link to={ROUTES.ADMIN_CONSULTATIONS}>Return to consultations</Link>.
        </Notice>
      </main>
    );
  }

  const own = responses.filter((item) => item.consultationId === consultation.id);
  const progress = consultationProgress(consultation);
  const themes = themeFrequency(consultation, own);
  const questions = consultation.questions.filter((question) => question.type !== 'SECTION');

  return (
    <main className="mx-auto max-w-4xl space-y-8 bg-background px-6 py-8 text-foreground print:max-w-none print:px-0 print:py-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to={adminConsultationRoute(consultation.id)} className="inline-flex items-center gap-1 text-sm font-medium text-foreground-muted hover:text-foreground">
          <ChevronLeft size={16} aria-hidden /> Back to consultation
        </Link>
        <Button onClick={() => window.print()}>
          <Printer size={16} aria-hidden /> Print / Save as PDF
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <img src="/clet-logo.png" alt="" width={40} height={40} />
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">CLET · S088 consultation summary</p>
        </div>
        <h1 className="mt-4 text-3xl font-semibold">{consultation.title}</h1>
        <p className="mt-2 text-foreground-muted">{consultation.summary}</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-foreground-muted">Status</dt><dd className="font-medium">{STATUS_LABELS[consultation.status]}</dd></div>
          <div><dt className="text-foreground-muted">Period</dt><dd className="font-medium">{formatDate(consultation.opensAt)} – {formatDate(consultation.closesAt)}</dd></div>
          <div><dt className="text-foreground-muted">Audience</dt><dd className="font-medium">{AUDIENCE_LABELS[consultation.audienceSource]}</dd></div>
          <div><dt className="text-foreground-muted">Responses analysed</dt><dd className="font-medium">{formatCount(own.length)} of {formatCount(consultation.responseCount)}</dd></div>
          <div><dt className="text-foreground-muted">Response rate</dt><dd className="font-medium">{progress === null ? 'Open public' : `${progress}%`}</dd></div>
          <div><dt className="text-foreground-muted">Languages</dt><dd className="font-medium">{consultation.languages.map(languageLabel).join(', ')}</dd></div>
        </dl>
      </header>

      {consultation.outcomeSummary ? (
        <section className="break-inside-avoid">
          <h2 className="mb-3 text-xl font-semibold">What we heard</h2>
          <div className="space-y-3 leading-7">
            {consultation.outcomeSummary.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">By stakeholder group</h2>
          <BarRows rows={stakeholderGroupBreakdown(own)} />
        </div>
        <div className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">Themes in open-text answers</h2>
          <BarRows rows={themes.map((item) => ({ label: item.label, count: item.count, share: item.share }))} unit="coded answers" emptyText="No answers coded yet." />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Question results</h2>
        {questions.map((question, index) => (
          <QuestionAnalytics key={question.id} question={question} number={index + 1} responses={own} />
        ))}
      </section>

      <footer className="border-t border-border pt-4 text-xs text-foreground-muted">
        Generated {formatDateTime(now)}. Aggregate results only; respondent identities are never included. Ghana Data Protection Act, 2012 (Act 843).
      </footer>
    </main>
  );
}

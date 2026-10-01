import type { IrLanguage } from '@partner-crm/types';

import { letterDirection } from '../domain';
import { CLET_SENDER } from '../labels';

interface LetterPreviewProps {
  reference: string;
  language: IrLanguage;
  subject: string;
  body: string;
  classification: string;
}

const SUBJECT_LABEL: Record<IrLanguage, string> = { EN: 'Subject', FR: 'Objet', AR: 'الموضوع' };
const REF_LABEL: Record<IrLanguage, string> = { EN: 'Our ref.', FR: 'Réf.', AR: 'المرجع' };

/** The letter as it will print, on the CLET letterhead. Arabic renders right-to-left. */
export function LetterPreview({ reference, language, subject, body, classification }: LetterPreviewProps) {
  const dir = letterDirection(language);
  return (
    <article
      dir={dir}
      lang={language.toLowerCase()}
      className="mx-auto w-full max-w-[42rem] rounded-xl border border-border bg-surface p-6 text-foreground shadow-sm sm:p-10"
      aria-label="Letter preview"
    >
      <header className="flex items-center gap-4 border-b-2 border-primary pb-4">
        <img src="/clet-logo.png" alt="" width={48} height={48} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-lg font-semibold text-primary">{CLET_SENDER[language]}</p>
          <p className="text-xs text-foreground-muted" dir="ltr">
            International Relations &amp; Protocols · Accra, Ghana
          </p>
        </div>
      </header>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-foreground-muted">
        <span>
          {REF_LABEL[language]}: <span dir="ltr" className="font-mono">{reference}</span>
        </span>
        <span className="uppercase tracking-wide">{classification}</span>
      </div>
      <p className="mt-6 text-sm font-semibold">
        {SUBJECT_LABEL[language]}: {subject || '—'}
      </p>
      <div className="mt-4 whitespace-pre-wrap font-serif text-[15px] leading-7">
        {body || <span className="text-foreground-muted">The letter body will appear here.</span>}
      </div>
    </article>
  );
}

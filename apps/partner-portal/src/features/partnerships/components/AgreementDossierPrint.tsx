import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { AgreementDossier } from '@/features/partnerships/dataPortability';
import { effectiveObligationStatus } from '@/features/partnerships/obligations';
import { effectiveRenewalAlertStatus } from '@/features/partnerships/renewalAlerts';
import { formatDate, formatDateTime, titleCase } from '@/features/shared';

/**
 * Print rules scoped to the dossier. The dossier is portalled straight under
 * `<body>`, so hiding every other body child leaves only the dossier on paper
 * — the app shell, sidebar and toasts never print — and on screen it is never
 * shown at all.
 */
const PRINT_CSS = `
@media screen { .s082-dossier-print { display: none !important; } }
@media print {
  @page { margin: 16mm; }
  body > *:not(.s082-dossier-print) { display: none !important; }
  .s082-dossier-print { display: block !important; }
  .s082-dossier-print section { break-inside: avoid-page; }
  .s082-dossier-print table { width: 100%; border-collapse: collapse; }
  .s082-dossier-print th, .s082-dossier-print td {
    border: 1px solid currentColor; padding: 4px 6px; text-align: left; vertical-align: top;
  }
}
`;

function DossierSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function DossierTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <p className="text-sm">None recorded.</p>;
  return (
    <table className="text-xs">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The print-friendly agreement dossier. Mounting it opens the browser print
 * dialog; `onDone` fires once printing finishes or is cancelled.
 */
export function AgreementDossierPrint({
  dossier,
  stakeholderName,
  printedBy,
  onDone,
}: {
  dossier: AgreementDossier;
  stakeholderName: (id: string) => string;
  printedBy: string;
  onDone: () => void;
}) {
  const { agreement } = dossier;

  useEffect(() => {
    const finish = () => onDone();
    window.addEventListener('afterprint', finish);
    // Let the portal paint before the (blocking) print dialog snapshots the page.
    const timer = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finish);
    };
  }, [onDone]);

  const fields: Array<[string, React.ReactNode]> = [
    ['Reference', agreement.reference],
    ['Type', titleCase(agreement.agreementType)],
    ['Status', titleCase(agreement.status)],
    ['Primary stakeholder', stakeholderName(agreement.stakeholderId)],
    ['Parties', agreement.partyStakeholderIds.map(stakeholderName).join(', ') || 'None'],
    ['CCP owner', agreement.owner],
    ['Effective', formatDate(agreement.effectiveDate)],
    ['Expires', formatDate(agreement.expiryDate)],
    ['S136 legal record', agreement.legalContractRef ?? 'Not linked'],
    ['S003 signed document', agreement.signedDocumentRef ?? 'Pending signature'],
    ['Renewals completed', agreement.renewalCount],
    ['Value commitment', agreement.valueCommitment],
    ['Deliverables', agreement.deliverables.join('; ')],
  ];
  if (agreement.termination) {
    fields.push([
      'Termination',
      `${formatDate(agreement.termination.terminatedAt)} — ${agreement.termination.reason} (approved by ${agreement.termination.approvedBy})`,
    ]);
  }

  return createPortal(
    <div className="s082-dossier-print bg-surface p-2 text-sm text-foreground">
      <style>{PRINT_CSS}</style>
      <header className="border-b border-border pb-3">
        <p className="text-xs uppercase tracking-wide">CLET · S082 agreement dossier</p>
        <h1 className="mt-1 text-xl font-bold">{agreement.title}</h1>
        <p className="mt-1 text-xs">
          Printed {formatDateTime(new Date())} by {printedBy}
        </p>
      </header>

      <DossierSection title="Agreement record">
        <table className="text-xs">
          <tbody>
            {fields.map(([label, value]) => (
              <tr key={label}>
                <th className="w-48">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DossierSection>

      <DossierSection title={`Obligations (${dossier.obligations.length})`}>
        <DossierTable
          headers={['Obligation', 'Owner', 'Due', 'Status', 'Evidence']}
          rows={dossier.obligations.map((item) => [
            item.title,
            item.owner,
            formatDate(item.dueDate),
            titleCase(effectiveObligationStatus(item)),
            item.evidenceReferences.join(', ') || '—',
          ])}
        />
      </DossierSection>

      <DossierSection title={`Value-realisation reviews (${dossier.reviews.length})`}>
        <DossierTable
          headers={[
            'Review date',
            'Reviewer',
            'Outcome',
            'Score',
            'Realised outputs',
            'Recommendation',
            'Next review',
          ]}
          rows={[...dossier.reviews]
            .sort((left, right) => right.reviewDate.localeCompare(left.reviewDate))
            .map((item) => [
              formatDate(item.reviewDate),
              item.reviewer,
              titleCase(item.outcome),
              `${item.strategicScore} / 5`,
              item.outputs.join('; ') || '—',
              titleCase(item.renewalRecommendation),
              formatDate(item.nextReviewDate),
            ])}
        />
      </DossierSection>

      <DossierSection title="Renewals and alert schedule">
        <DossierTable
          headers={['Record', 'Date', 'Detail', 'Status']}
          rows={[
            ...dossier.renewals.map((item) => [
              'Renewal',
              formatDate(item.renewedAt),
              `${formatDate(item.effectiveDate)} – ${formatDate(item.expiryDate)}: ${item.termsSummary}`,
              `Recorded by ${item.renewedBy}`,
            ]),
            ...dossier.renewalAlerts.map((item) => [
              `${item.milestoneDays}-day renewal alert`,
              formatDate(item.scheduledFor),
              `${item.recipients.length} recipient${item.recipients.length === 1 ? '' : 's'}`,
              titleCase(effectiveRenewalAlertStatus(item)),
            ]),
          ]}
        />
      </DossierSection>

      <DossierSection title={`History (${dossier.history.length})`}>
        <DossierTable
          headers={['Occurred', 'Event', 'Summary', 'Actor']}
          rows={[...dossier.history]
            .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
            .map((item) => [
              formatDateTime(item.occurredAt),
              titleCase(item.action),
              item.summary,
              item.actor,
            ])}
        />
      </DossierSection>
    </div>,
    document.body,
  );
}

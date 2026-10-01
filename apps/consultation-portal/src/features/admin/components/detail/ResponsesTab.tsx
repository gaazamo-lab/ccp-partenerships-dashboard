import { useState } from 'react';

import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  type TableColumn,
} from '@rfdtech/components';
import { Inbox, LockKeyhole } from 'lucide-react';

import type { Consultation, ConsultationResponse } from '@partner-crm/types';
import { DataTable, type DataTableFilter, DetailGrid, DetailItem, formatDateTime } from '@partner-crm/ui';

import { languageLabel } from '@/features/consultations/constants';
import { formatAnswer } from '@/features/consultations/domain';
import { visibleQuestionIds } from '@/features/consultations/logic';

interface ResponsesTabProps {
  consultation: Consultation;
  responses: ConsultationResponse[];
  canViewIdentity: boolean;
}

export function ResponsesTab({ consultation, responses, canViewIdentity }: ResponsesTabProps) {
  const [selected, setSelected] = useState<ConsultationResponse | null>(null);
  const themeLabel = (id: string) => consultation.themes.find((theme) => theme.id === id)?.label ?? id;
  const rows = [...responses].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

  const columns: TableColumn<ConsultationResponse>[] = [
    { id: 'id', header: 'Response', accessorKey: 'id', sortable: true, cell: ({ row }) => <span className="font-mono text-xs">{row.id}</span> },
    { id: 'submittedAt', header: 'Submitted', accessorKey: 'submittedAt', sortable: true, cell: ({ row }) => formatDateTime(row.submittedAt) },
    { id: 'language', header: 'Language', accessorFn: (row) => languageLabel(row.language), sortable: true },
    {
      id: 'identity',
      header: 'Identity',
      accessorFn: (row) => (row.consentToIdentityLink ? 'Linked' : 'Anonymous'),
      cell: ({ row }) =>
        row.consentToIdentityLink ? <Badge variant="primary">Linked (consented)</Badge> : <Badge variant="outline">Anonymous</Badge>,
    },
    {
      id: 'group',
      header: 'Stakeholder group',
      accessorFn: (row) => (row.consentToIdentityLink ? (row.respondent?.stakeholderGroup ?? '') : ''),
      cell: ({ row }) =>
        row.consentToIdentityLink && row.respondent?.stakeholderGroup ? row.respondent.stakeholderGroup : <span className="text-foreground-muted">—</span>,
    },
    {
      id: 'themes',
      header: 'Themes',
      accessorFn: (row) => [...new Set(Object.values(row.themes).flat())].length,
      cell: ({ row }) => {
        const ids = [...new Set(Object.values(row.themes).flat())];
        return ids.length ? ids.map(themeLabel).join(', ') : <span className="text-foreground-muted">Not coded</span>;
      },
    },
  ];

  const filters: DataTableFilter<ConsultationResponse>[] = [
    { key: 'language', label: 'Language', options: consultation.languages.map((code) => ({ value: code, label: languageLabel(code) })), value: (row) => row.language },
    { key: 'identity', label: 'Identity', options: [{ value: 'linked', label: 'Linked' }, { value: 'anonymous', label: 'Anonymous' }], value: (row) => (row.consentToIdentityLink ? 'linked' : 'anonymous') },
  ];

  return (
    <>
      {responses.length < consultation.responseCount ? (
        <div className="mb-4">
          <Notice variant="info" leftBorder>
            Showing {responses.length} of {consultation.responseCount} responses loaded for this workspace.
          </Notice>
        </div>
      ) : null}
      <DataTable
        paramPrefix="responses"
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        pageSize={20}
        searchFields={(row) => [row.id, languageLabel(row.language), ...Object.values(row.answers).map(formatAnswer)]}
        searchPlaceholder="Search answers or response ID"
        filters={filters}
        onRowClick={setSelected}
        empty={{
          message: 'No responses yet',
          hint: consultation.status === 'OPEN' ? 'Responses appear here as soon as they are submitted.' : 'Open the consultation to start collecting responses.',
          icon: <Inbox size={20} aria-hidden />,
        }}
      />
      {selected ? (
        <ResponseDetailModal consultation={consultation} response={selected} canViewIdentity={canViewIdentity} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}

interface ResponseDetailModalProps {
  consultation: Consultation;
  response: ConsultationResponse;
  canViewIdentity: boolean;
  onClose: () => void;
}

function ResponseDetailModal({ consultation, response, canViewIdentity, onClose }: ResponseDetailModalProps) {
  const shown = visibleQuestionIds(consultation.questions, response.answers);
  const themeLabel = (id: string) => consultation.themes.find((theme) => theme.id === id)?.label ?? id;

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Response {response.id}</ModalTitle>
          <ModalDescription>
            Submitted {formatDateTime(response.submittedAt)} in {languageLabel(response.language)}.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-5">
          {response.consentToIdentityLink && response.respondent ? (
            canViewIdentity ? (
              <DetailGrid columns={3}>
                <DetailItem label="Name" value={response.respondent.name} />
                <DetailItem label="Email" value={response.respondent.email} />
                <DetailItem label="Stakeholder group" value={response.respondent.stakeholderGroup || 'Not given'} />
              </DetailGrid>
            ) : (
              <Notice variant="info" leftBorder icon={<LockKeyhole size={16} aria-hidden />}>
                The respondent consented to linking their identity, but only consultation managers can view it.
              </Notice>
            )
          ) : (
            <Notice variant="default" leftBorder icon={<LockKeyhole size={16} aria-hidden />}>
              Anonymous response — no personal data is held against these answers.
            </Notice>
          )}
          <dl className="space-y-3">
            {consultation.questions.map((question) => {
              if (question.type === 'SECTION') {
                return shown.has(question.id) ? (
                  <dt key={question.id} className="pt-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    {question.prompt}
                  </dt>
                ) : null;
              }
              if (!shown.has(question.id)) return null;
              const themes = response.themes[question.id] ?? [];
              return (
                <div key={question.id} className="rounded-lg border border-border px-3 py-2">
                  <dt className="text-sm font-medium">{question.prompt}</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-foreground-muted">
                    {formatAnswer(response.answers[question.id]) || 'No answer'}
                  </dd>
                  {themes.length ? (
                    <dd className="mt-2 flex flex-wrap gap-1.5">
                      {themes.map((id) => (
                        <Badge key={id} variant="primary" size="sm">
                          {themeLabel(id)}
                        </Badge>
                      ))}
                    </dd>
                  ) : null}
                </div>
              );
            })}
          </dl>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

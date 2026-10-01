import { Badge, Button, ProgressBar } from '@rfdtech/components';
import { GitBranch } from 'lucide-react';

import type { Consultation } from '@partner-crm/types';
import { DetailGrid, DetailItem, SectionCard, formatCount, formatDate } from '@partner-crm/ui';

import {
  AUDIENCE_LABELS,
  QUESTION_TYPE_LABELS,
  STATUS_LABELS,
  languageLabel,
} from '@/features/consultations/constants';
import { consultationProgress } from '@/features/consultations/domain';
import { type LifecycleAction, actionsFor } from '@/features/consultations/lifecycle';
import { deniedReason } from '@/features/consultations/permissions';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

import { InvitationsCard } from './InvitationsCard';

// const STATUS_GUIDANCE: Record<Consultation['status'], string> = {
  // DRAFT: 'Being prepared. Submit it for AQAI/CDT review when the questions and audience are ready.',
  // REVIEW: 'Waiting for an AQAI/CDT reviewer to approve it or return it with comments.',
  // SCHEDULED: 'Approved. It opens to respondents on its start date, or a manager can open it now.',
  // OPEN: 'Accepting responses. Close it early or extend the close date if needed.',
  // CLOSED: 'No longer accepting responses. Code the open-text answers and publish what you heard.',
  // ARCHIVED: 'Removed from the public site. Results remain available to staff.',
// };

interface SummaryTabProps {
  consultation: Consultation;
  role: string | undefined;
  onAction: (action: LifecycleAction) => void;
}

export function SummaryTab({ consultation, role, onAction }: SummaryTabProps) {
  const { segments } = useConsultations();
  const progress = consultationProgress(consultation);
  const actions = actionsFor(consultation.status);
  const segmentNames = consultation.audienceSegmentIds.map(
    (id) => segments.find((segment) => segment.id === id)?.name ?? id,
  );
  const numbers = new Map(
    consultation.questions
      .filter((question) => question.type !== 'SECTION')
      .map((question, index) => [question.id, index + 1]),
  );

  return (
    <div className="flex flex-col gap-body">
      <SectionCard title="Lifecycle" /* description={STATUS_GUIDANCE[consultation.status]} */>
        {actions.length ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const denied = deniedReason(role, action.permission);
              return (
                <Button
                  key={action.id}
                  variant={
                    action.destructive ? 'outline' : action.id === 'return' ? 'outline' : 'primary'
                  }
                  disabled={Boolean(denied)}
                  title={denied ?? action.description}
                  onClick={() => onAction(action)}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">
            No further lifecycle actions are available.
          </p>
        )}
        {actions.some((action) => deniedReason(role, action.permission)) ? (
          <p className="mt-3 text-xs text-foreground-muted">
            Some actions are unavailable to your role ({role ?? 'unknown'}). Hover a disabled button
            for the reason.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Details">
        <DetailGrid columns={3}>
          <DetailItem label="Status" value={STATUS_LABELS[consultation.status]} />
          <DetailItem label="Category" value={consultation.category} />
          <DetailItem
            label="Public URL"
            value={
              <span className="break-all font-mono text-xs">
                /consultations/{consultation.slug}
              </span>
            }
          />
          <DetailItem label="Opens" value={formatDate(consultation.opensAt)} />
          <DetailItem label="Closes" value={formatDate(consultation.closesAt)} />
          <DetailItem label="Estimated time" value={`${consultation.estimatedMinutes} minutes`} />
          <DetailItem
            label="Languages"
            value={consultation.languages.map(languageLabel).join(', ')}
            hint="First listed is primary"
          />
          <DetailItem
            label="Audience"
            value={AUDIENCE_LABELS[consultation.audienceSource]}
            hint={segmentNames.length ? segmentNames.join(', ') : undefined}
          />
          <DetailItem
            label="Identity"
            value={
              consultation.anonymousAllowed
                ? consultation.collectIdentity
                  ? 'Anonymous, optional link'
                  : 'Anonymous only'
                : 'Identified responses only'
            }
            hint="PII is linked only with explicit consent"
          />
          <DetailItem label="Approved by" value={consultation.approvedBy ?? 'Not yet approved'} />
          <DetailItem label="Created" value={formatDate(consultation.createdAt)} />
          <DetailItem label="Last updated" value={formatDate(consultation.updatedAt)} />
        </DetailGrid>
      </SectionCard>

      {progress !== null ? (
        <SectionCard
          title="Audience response" /* description="Responses against consent-verified invitations." */
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ProgressBar value={progress} aria-label="Response rate" />
            </div>
            <span className="font-semibold tabular-nums">{progress}%</span>
          </div>
          <p className="mt-3 text-sm text-foreground-muted">
            {formatCount(consultation.responseCount)} responses from{' '}
            {formatCount(consultation.invitedCount ?? 0)} invited contacts.
          </p>
        </SectionCard>
      ) : null}

      <InvitationsCard consultation={consultation} denied={deniedReason(role, 'manage')} />

      <SectionCard
        title="Questions" /* description={`${consultation.questions.filter((item) => item.type !== 'SECTION').length} questions across ${Math.max(1, consultation.questions.filter((item) => item.type === 'SECTION').length)} page(s).`} */
      >
        {consultation.questions.length ? (
          <ol className="space-y-2">
            {consultation.questions.map((question) => {
              if (question.type === 'SECTION') {
                return (
                  <li
                    key={question.id}
                    className="pt-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted first:pt-0"
                  >
                    {question.prompt}
                  </li>
                );
              }
              return (
                <li
                  key={question.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span className="min-w-0 text-sm">
                    <span className="mr-2 font-medium text-foreground-muted">
                      {numbers.get(question.id)}.
                    </span>
                    {question.prompt}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                    {question.required ? <Badge variant="primary">Required</Badge> : null}
                    {question.visibleIf?.length ? (
                      <Badge variant="warning">
                        <GitBranch size={12} aria-hidden className="mr-1 inline" />
                        Conditional
                      </Badge>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-foreground-muted">
            No questions yet. Edit the draft to add them.
          </p>
        )}
      </SectionCard>
    </div>
  );
}

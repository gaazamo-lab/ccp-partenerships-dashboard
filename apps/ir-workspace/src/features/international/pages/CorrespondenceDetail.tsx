import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Badge, Button, Notice } from '@rfdtech/components';
import { Pencil, SearchX } from 'lucide-react';

import {
  DetailGrid,
  DetailItem,
  EmptyState,
  PageHeader,
  SectionCard,
  formatDateTime,
  useNow,
} from '@partner-crm/ui';

import { ROUTES, engagementRoute } from '@/constants/routes';

import { CorrespondenceStatusBadge, DeadlineBadge, LanguageBadge } from '../components/Badges';
import { CorrespondenceActions } from '../components/CorrespondenceActions';
import { CorrespondenceDetailsModal } from '../components/CorrespondenceDetailsModal';
import { LetterEditor } from '../components/LetterEditor';
import { LetterPreview } from '../components/LetterPreview';
import { LoadNotice } from '../components/LoadNotice';
import { contentEditable, correspondenceDeadlineState } from '../domain';
import { CLASSIFICATION_LABEL, DIRECTION_LABEL } from '../labels';
import { canIr } from '../permissions';
import { useIr } from '../state/useIr';

export function Component() {
  const { correspondenceId = '' } = useParams();
  const { correspondence, engagements, loading, role } = useIr();
  const now = useNow();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const item = correspondence.find((entry) => entry.id === correspondenceId);

  if (!item) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Correspondence"
          backTo={{ to: ROUTES.CORRESPONDENCE, label: 'Back to register' }}
        />
        <LoadNotice />
        {loading ? (
          <p className="text-sm text-foreground-muted">Loading letter…</p>
        ) : (
          <SectionCard title="Letter not found">
            <EmptyState
              message="This item does not exist or you cannot access it"
              hint="Return to the register and choose another letter."
              icon={<SearchX size={22} aria-hidden />}
            />
          </SectionCard>
        )}
      </section>
    );
  }

  const canManage = canIr(role, 'correspondence.manage');
  const engagement = engagements.find((entry) => entry.id === item.engagementId);
  const deadline = correspondenceDeadlineState(item, now);
  const outbound = item.direction === 'OUTBOUND';
  const approvedCurrent = item.approvedVersion !== null && item.approvedVersion === item.version;

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={item.subject}
        // description={`${DIRECTION_LABEL[item.direction]} · ${item.sender} → ${item.recipient}`}
        backTo={{ to: ROUTES.CORRESPONDENCE, label: 'Back to register' }}
        meta={
          <>
            <span className="font-mono text-xs font-bold text-primary">{item.reference}</span>
            <CorrespondenceStatusBadge status={item.status} />
            <LanguageBadge language={item.language} />
            <DeadlineBadge state={deadline} />
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              disabled={!canManage || item.status === 'CLOSED'}
              onClick={() => setDetailsOpen(true)}
            >
              <Pencil size={16} aria-hidden /> Register details
            </Button>
            <CorrespondenceActions item={item} />
          </>
        }
      />
      <LoadNotice />

      {deadline === 'OVERDUE' ? (
        <Notice variant="error" title="Response overdue" leftBorder>
          The response deadline passed on {formatDateTime(item.responseDeadline)}. Escalate to{' '}
          {item.owner}’s manager or record the response.
        </Notice>
      ) : null}
      {outbound && item.approvedVersion !== null && !approvedCurrent ? (
        <Notice variant="warning" title="Current text is not approved" leftBorder>
          Version {item.version} is current; version {item.approvedVersion} was approved. The
          current text cannot be dispatched until it is reviewed and approved again.
        </Notice>
      ) : null}

      <SectionCard title="Register record">
        <DetailGrid columns={4}>
          <DetailItem label="Current version" value={`v${item.version}`} />
          <DetailItem
            label="Approved version"
            value={item.approvedVersion ? `v${item.approvedVersion}` : 'Not approved'}
            hint={
              outbound
                ? approvedCurrent
                  ? 'Matches the current text'
                  : 'Differs from the current text'
                : undefined
            }
          />
          <DetailItem
            label="Template version"
            value={item.templateVersion ? `v${item.templateVersion}` : 'No template'}
          />
          <DetailItem label="Classification" value={CLASSIFICATION_LABEL[item.classification]} />
          <DetailItem label="Owner" value={item.owner} />
          <DetailItem
            label={outbound ? 'Sent' : 'Received'}
            value={formatDateTime(outbound ? item.sentAt : item.receivedAt)}
          />
          <DetailItem label="Response deadline" value={formatDateTime(item.responseDeadline)} />
          <DetailItem
            label="Engagement"
            value={
              engagement ? (
                <Link to={engagementRoute(engagement.id)} className="text-primary hover:underline">
                  {engagement.reference}
                </Link>
              ) : (
                'Not linked'
              )
            }
          />
          <DetailItem
            label="S003 document"
            value={<span className="font-mono">{item.documentRef ?? 'Not linked'}</span>}
          />
          <DetailItem
            label="S074 dispatch"
            value={<span className="font-mono">{item.dispatchRef ?? 'Not dispatched'}</span>}
          />
          <DetailItem label="Translation" value={item.translationRef ?? 'None recorded'} />
          <DetailItem
            label="Direction"
            value={<Badge variant="outline">{DIRECTION_LABEL[item.direction]}</Badge>}
          />
        </DetailGrid>
      </SectionCard>

      {outbound ? (
        <LetterEditor
          key={`${item.id}-${item.version}-${item.status}`}
          item={item}
          editable={canManage && contentEditable(item)}
          now={now}
        />
      ) : (
        <SectionCard
          title="Letter received" /* description="Summary or transcription of the inbound letter" */
        >
          <LetterPreview
            reference={item.reference}
            language={item.language}
            subject={item.subject}
            body={item.body}
            classification={CLASSIFICATION_LABEL[item.classification]}
          />
        </SectionCard>
      )}

      {detailsOpen ? (
        <CorrespondenceDetailsModal item={item} onOpenChange={setDetailsOpen} />
      ) : null}
    </section>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Badge, Button, Notice, Tabs, TabsContent, TabsList, TabsTrigger } from '@rfdtech/components';
import { Gift, SearchX } from 'lucide-react';

import { EmptyState, PageHeader, SectionCard } from '@partner-crm/ui';

import { ROUTES, engagementRoute } from '@/constants/routes';

import { EngagementStatusBadge } from '../components/Badges';
import { EngagementActions } from '../components/EngagementActions';
import { GiftFormModal } from '../components/GiftFormModal';
import { GiftsTable } from '../components/GiftsTable';
import { LoadNotice } from '../components/LoadNotice';
import { DelegationTab } from '../components/tabs/DelegationTab';
import { HistoryTab } from '../components/tabs/HistoryTab';
import { MinutesTab } from '../components/tabs/MinutesTab';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { ProtocolTab } from '../components/tabs/ProtocolTab';
import { SupportTab } from '../components/tabs/SupportTab';
import {
  clashSummary,
  clashesFor,
  closureBlockers,
  engagementEditable,
  readinessBlockers,
  submissionErrors,
} from '../domain';
import { ENGAGEMENT_TYPE_LABEL } from '../labels';
import { canIr } from '../permissions';
import { useIr } from '../state/useIr';

function StatusGuidance({ blockers, title }: { blockers: string[]; title: string }) {
  if (blockers.length === 0) return null;
  return (
    <Notice variant="warning" title={title} leftBorder>
      <ul className="list-disc space-y-1 pl-5">
        {blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
    </Notice>
  );
}

export function Component() {
  const { engagementId = '' } = useParams();
  const { engagements, gifts, loading, role } = useIr();
  const [giftOpen, setGiftOpen] = useState(false);
  const engagement = engagements.find((item) => item.id === engagementId);

  if (!engagement) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader title="Engagement" backTo={{ to: ROUTES.ENGAGEMENTS, label: 'Back to engagements' }} />
        <LoadNotice />
        {loading ? (
          <p className="text-sm text-foreground-muted">Loading engagement…</p>
        ) : (
          <SectionCard title="Engagement not found">
            <EmptyState
              message="This engagement does not exist or you cannot access it"
              hint="Return to the register and choose another engagement."
              icon={<SearchX size={22} aria-hidden />}
              action={
                <Link to={ROUTES.ENGAGEMENTS}>
                  <Button variant="outline">Open the register</Button>
                </Link>
              }
            />
          </SectionCard>
        )}
      </section>
    );
  }

  const open = engagementEditable(engagement.status);
  const canEdit = open && canIr(role, 'engagement.edit');
  const canManage = open && canIr(role, 'protocol.manage');
  const linkedGifts = gifts.filter((gift) => gift.engagementId === engagement.id);
  const clashes = clashesFor(engagement, engagements);

  const guidance =
    engagement.status === 'DRAFT' || engagement.status === 'RETURNED'
      ? { title: 'Complete before submitting', blockers: Object.values(submissionErrors(engagement)) as string[] }
      : engagement.status === 'APPROVED'
        ? { title: 'Not ready to schedule', blockers: readinessBlockers(engagement) }
        : engagement.status === 'COMPLETED'
          ? { title: 'Closure is blocked', blockers: closureBlockers(engagement) }
          : { title: '', blockers: [] as string[] };
  const lastReturn = [...engagement.approvals].reverse().find((entry) => entry.decision === 'RETURNED');

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={engagement.title}
        // description={`${engagement.partnerName || 'No partner linked'} · ${formatRange(engagement.startAt, engagement.endAt, engagement.timeZone)}`}
        backTo={{ to: ROUTES.ENGAGEMENTS, label: 'Back to engagements' }}
        meta={
          <>
            <span className="font-mono text-xs font-bold text-primary">{engagement.reference}</span>
            <EngagementStatusBadge status={engagement.status} />
            <Badge variant="outline">{ENGAGEMENT_TYPE_LABEL[engagement.type]}</Badge>
            <Badge variant="outline">Owner: {engagement.owner}</Badge>
          </>
        }
        actions={<EngagementActions engagement={engagement} />}
      />
      <LoadNotice />

      {engagement.status === 'RETURNED' && lastReturn ? (
        <Notice variant="error" title={`Returned by ${lastReturn.actor}`} leftBorder>
          {lastReturn.comment}
        </Notice>
      ) : null}
      <StatusGuidance title={guidance.title} blockers={guidance.blockers} />
      {clashes.length > 0 ? (
        <Notice variant="warning" title="Calendar clash" leftBorder>
          <ul className="list-disc space-y-1 pl-5">
            {clashes.map((clash) => {
              const other = clash.first.id === engagement.id ? clash.second : clash.first;
              return (
                <li key={other.id}>
                  <Link to={engagementRoute(other.id)} className="text-primary hover:underline">
                    {clashSummary(clash, engagement.id)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Notice>
      ) : null}

      <Tabs defaultValue="overview" variant="line">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delegation">Delegation ({engagement.delegation.length})</TabsTrigger>
          <TabsTrigger value="protocol">Protocol ({engagement.protocolTasks.length})</TabsTrigger>
          <TabsTrigger value="support">Support ({engagement.supportRequests.length})</TabsTrigger>
          <TabsTrigger value="minutes">Minutes & follow-ups ({engagement.followUps.length})</TabsTrigger>
          <TabsTrigger value="gifts">Gifts ({linkedGifts.length})</TabsTrigger>
          <TabsTrigger value="history">History ({engagement.approvals.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-6">
          <OverviewTab engagement={engagement} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="delegation" className="pt-6">
          <DelegationTab engagement={engagement} canManage={canManage} />
        </TabsContent>
        <TabsContent value="protocol" className="pt-6">
          <ProtocolTab engagement={engagement} canManage={canManage} />
        </TabsContent>
        <TabsContent value="support" className="pt-6">
          <SupportTab engagement={engagement} canManage={canManage} />
        </TabsContent>
        <TabsContent value="minutes" className="pt-6">
          <MinutesTab engagement={engagement} canManage={canManage} />
        </TabsContent>
        <TabsContent value="gifts" className="pt-6">
          <SectionCard
            title="Official gifts"
            // description="Gifts given or received during this engagement. Received gifts are cross-flagged to S011."
            actions={
              <Button size="sm" disabled={!canIr(role, 'gift.manage')} onClick={() => setGiftOpen(true)}>
                <Gift size={15} aria-hidden /> Record gift
              </Button>
            }
          >
            <GiftsTable gifts={linkedGifts} paramPrefix="engagement-gifts" />
          </SectionCard>
        </TabsContent>
        <TabsContent value="history" className="pt-6">
          <HistoryTab engagement={engagement} />
        </TabsContent>
      </Tabs>

      {giftOpen ? <GiftFormModal engagementId={engagement.id} onOpenChange={setGiftOpen} /> : null}
    </section>
  );
}

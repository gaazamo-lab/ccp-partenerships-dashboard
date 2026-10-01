import { Badge, Button, exportToCsv } from '@rfdtech/components';
import { Download, Printer } from 'lucide-react';

import { DetailGrid, DetailItem, PageHeader, SectionCard, useNow } from '@partner-crm/ui';

import { LoadNotice } from '../components/LoadNotice';
import { correspondenceDeadlineState, followUpColumn } from '../domain';
import { formatMoney } from '../format';
import {
  CORRESPONDENCE_STATUS_LABEL,
  DIRECTION_LABEL,
  ENGAGEMENT_STATUS_LABEL,
  ENGAGEMENT_TYPE_LABEL,
  FLAG_STATUS_LABEL,
} from '../labels';
import { canIr } from '../permissions';
import { useIr } from '../state/useIr';

function ExportButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" disabled={disabled} onClick={onClick} className="print:hidden">
      <Download size={15} aria-hidden /> Export CSV
    </Button>
  );
}

export function Component() {
  const { engagements, correspondence, gifts, role } = useIr();
  const now = useNow();
  const canExport = canIr(role, 'export');
  const engagementRef = (id: string | null) => engagements.find((item) => item.id === id)?.reference ?? '';

  const visits = engagements.filter((item) => item.status !== 'CANCELLED');
  const backlog = correspondence.filter((item) => correspondenceDeadlineState(item, now) !== 'NONE');
  const overdue = backlog.filter((item) => correspondenceDeadlineState(item, now) === 'OVERDUE');
  const followUps = engagements.flatMap((engagement) =>
    engagement.followUps.map((followUp) => ({ ...followUp, engagement, column: followUpColumn(followUp, now) })),
  );
  const count = (column: string) => followUps.filter((item) => item.column === column).length;

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Reports"
        // description="Visit, correspondence backlog, gifts and follow-up reports with CSV export."
        meta={<Badge variant="outline">System S083</Badge>}
        actions={
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer size={16} aria-hidden /> Print
          </Button>
        }
      />
      <LoadNotice />

      <SectionCard
        title="Visit report"
        // description="Engagements with delegation size, readiness, minutes and final report references."
        actions={
          <ExportButton
            disabled={!canExport || visits.length === 0}
            onClick={() =>
              exportToCsv(
                visits,
                [
                  { header: 'Reference', accessor: (row) => row.reference },
                  { header: 'Title', accessor: (row) => row.title },
                  { header: 'Type', accessor: (row) => ENGAGEMENT_TYPE_LABEL[row.type] },
                  { header: 'Direction', accessor: (row) => DIRECTION_LABEL[row.direction] },
                  { header: 'Partner', accessor: (row) => row.partnerName },
                  { header: 'Starts', accessor: (row) => row.startAt },
                  { header: 'Time zone', accessor: (row) => row.timeZone },
                  { header: 'Status', accessor: (row) => ENGAGEMENT_STATUS_LABEL[row.status] },
                  { header: 'Delegates', accessor: (row) => row.delegation.length },
                  { header: 'Open mandatory tasks', accessor: (row) => row.protocolTasks.filter((task) => task.mandatory && task.status === 'OPEN').length },
                  { header: 'Support handoffs completed', accessor: (row) => `${row.supportRequests.filter((request) => request.status === 'COMPLETED').length}/${row.supportRequests.length}` },
                  { header: 'Minutes (S003)', accessor: (row) => row.minutesRef },
                  { header: 'Final report (S003)', accessor: (row) => row.finalReportRef },
                  { header: 'Gifts', accessor: (row) => gifts.filter((gift) => gift.engagementId === row.id).length },
                ],
                's083-visit-report.csv',
              )
            }
          />
        }
      >
        <DetailGrid columns={4}>
          <DetailItem label="Engagements" value={visits.length} hint="Excluding cancelled" />
          <DetailItem label="Inbound / outbound" value={`${visits.filter((item) => item.direction === 'INBOUND').length} / ${visits.filter((item) => item.direction === 'OUTBOUND').length}`} />
          <DetailItem label="Closed" value={visits.filter((item) => item.status === 'CLOSED').length} />
          <DetailItem label="Delegates hosted" value={visits.reduce((sum, item) => sum + item.delegation.length, 0)} />
        </DetailGrid>
      </SectionCard>

      <SectionCard
        title="Correspondence backlog"
        // description="Letters still owed a response, by deadline."
        actions={
          <ExportButton
            disabled={!canExport || backlog.length === 0}
            onClick={() =>
              exportToCsv(
                backlog,
                [
                  { header: 'Reference', accessor: (row) => row.reference },
                  { header: 'Subject', accessor: (row) => row.subject },
                  { header: 'Sender', accessor: (row) => row.sender },
                  { header: 'Language', accessor: (row) => row.language },
                  { header: 'Owner', accessor: (row) => row.owner },
                  { header: 'Deadline', accessor: (row) => row.responseDeadline },
                  { header: 'Status', accessor: (row) => CORRESPONDENCE_STATUS_LABEL[row.status] },
                  { header: 'Overdue', accessor: (row) => (correspondenceDeadlineState(row, now) === 'OVERDUE' ? 'Yes' : 'No') },
                ],
                's083-correspondence-backlog.csv',
              )
            }
          />
        }
      >
        <DetailGrid columns={4}>
          <DetailItem label="Awaiting response" value={backlog.length} />
          <DetailItem label="Overdue" value={overdue.length} />
          <DetailItem label="Due within 7 days" value={backlog.filter((item) => correspondenceDeadlineState(item, now) === 'DUE_SOON').length} />
          <DetailItem label="Outbound awaiting approval" value={correspondence.filter((item) => item.status === 'IN_REVIEW').length} />
        </DetailGrid>
      </SectionCard>

      <SectionCard
        title="Gifts register"
        // description="Official gifts and S011 acknowledgement."
        actions={
          <ExportButton
            disabled={!canExport || gifts.length === 0}
            onClick={() =>
              exportToCsv(
                gifts,
                [
                  { header: 'Direction', accessor: (row) => row.direction },
                  { header: 'Date', accessor: (row) => row.giftDate },
                  { header: 'Giver', accessor: (row) => row.giver },
                  { header: 'Recipient', accessor: (row) => row.recipient },
                  { header: 'Description', accessor: (row) => row.description },
                  { header: 'Value', accessor: (row) => formatMoney(row.value, row.currency) },
                  { header: 'Engagement', accessor: (row) => engagementRef(row.engagementId) },
                  { header: 'S011 status', accessor: (row) => FLAG_STATUS_LABEL[row.s011Status] },
                  { header: 'S011 reference', accessor: (row) => row.s011Ref },
                ],
                's083-gifts-report.csv',
              )
            }
          />
        }
      >
        <DetailGrid columns={4}>
          <DetailItem label="Received" value={gifts.filter((gift) => gift.direction === 'RECEIVED').length} />
          <DetailItem label="Given" value={gifts.filter((gift) => gift.direction === 'GIVEN').length} />
          <DetailItem label="S011 acknowledged" value={gifts.filter((gift) => gift.s011Status === 'ACKNOWLEDGED').length} />
          <DetailItem label="S011 pending or failed" value={gifts.filter((gift) => gift.s011Status === 'PENDING' || gift.s011Status === 'FAILED').length} />
        </DetailGrid>
      </SectionCard>

      <SectionCard
        title="Follow-up status"
        // description="Actions agreed during engagements."
        actions={
          <ExportButton
            disabled={!canExport || followUps.length === 0}
            onClick={() =>
              exportToCsv(
                followUps,
                [
                  { header: 'Engagement', accessor: (row) => row.engagement.reference },
                  { header: 'Follow-up', accessor: (row) => row.title },
                  { header: 'Owner', accessor: (row) => row.owner },
                  { header: 'Due', accessor: (row) => row.dueDate },
                  { header: 'Mandatory', accessor: (row) => (row.mandatory ? 'Yes' : 'No') },
                  { header: 'Board column', accessor: (row) => row.column },
                  { header: 'Exception reason', accessor: (row) => row.exceptionReason },
                ],
                's083-follow-up-status.csv',
              )
            }
          />
        }
      >
        <DetailGrid columns={4}>
          <DetailItem label="Open" value={count('OPEN')} />
          <DetailItem label="Overdue" value={count('OVERDUE')} />
          <DetailItem label="Done" value={count('DONE')} />
          <DetailItem label="Exception" value={count('EXCEPTION')} />
        </DetailGrid>
      </SectionCard>
    </section>
  );
}

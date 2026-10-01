import * as XLSX from 'xlsx';

import {
  describeCriteria,
  resolveSegmentMembers,
  segmentCounts,
  segmentCriteria,
} from '@/features/segments/resolution';
import { PIPELINE_STAGES } from '@/features/stakeholders/constants';
import { displayDate, sortEngagements } from '@/features/stakeholders/engagements';
import { pipelineMatrix } from '@/features/stakeholders/pipeline';
import type { Segment, Stakeholder } from '@/features/stakeholders/types';

type Row = Record<string, string | number>;

export function stakeholderRows(stakeholders: Stakeholder[]): Row[] {
  return stakeholders.map((item) => ({
    Reference: item.id,
    Organisation: item.name,
    'Short name': item.shortName,
    Category: item.category,
    'Relationship owner': item.owner,
    Status: item.status,
    'Pipeline stage': item.pipelineStage,
    Health: item.health,
    Location: item.location,
    Website: item.website,
    'Active contacts': item.contacts.filter((contact) => contact.active).length,
    Engagements: item.engagements.length,
    'Last engagement': displayDate(item.lastEngagement),
  }));
}

export function contactRows(stakeholders: Stakeholder[]): Row[] {
  return stakeholders.flatMap((item) =>
    item.contacts.map((contact) => ({
      Organisation: item.name,
      Contact: contact.name,
      Role: contact.role,
      Email: contact.email,
      Phone: contact.phone,
      Active: contact.active ? 'Yes' : 'No',
      Consent: contact.consent,
      'Consent date': contact.consentDate ?? '',
      'Consent channel': contact.consentChannel ?? '',
      Screening: contact.screening,
      'Screening reviewer': contact.screeningRecord?.reviewer ?? '',
      'Screening decided': contact.screeningRecord?.reviewedAt ?? '',
      'S203 case': contact.screeningRecord?.caseRef ?? '',
    })),
  );
}

export function engagementRows(stakeholders: Stakeholder[]): Row[] {
  return stakeholders.flatMap((item) =>
    sortEngagements(item.engagements).map((engagement) => ({
      Organisation: item.name,
      Date: displayDate(engagement.date),
      Type: engagement.type,
      Title: engagement.title,
      Summary: engagement.summary,
      Source: engagement.source,
    })),
  );
}

/** Membership is resolved at export time, so the sheet matches what S075 would send now. */
export function segmentRows(segments: Segment[], stakeholders: Stakeholder[]): Row[] {
  return segments.map((segment) => {
    const criteria = segmentCriteria(segment);
    const counts = segmentCounts(resolveSegmentMembers(criteria, stakeholders));
    return {
      Segment: segment.name,
      Rules: describeCriteria(criteria),
      Members: counts.members,
      Consented: counts.consented,
      Organisations: counts.organisations,
      'Used by': segment.usedBy.join(', '),
    };
  });
}

export function pipelineRows(stakeholders: Stakeholder[]): Row[] {
  const matrix = pipelineMatrix(stakeholders);
  const rows: Row[] = matrix.rows.map((row) => ({
    Category: row.category,
    ...row.counts,
    Total: row.total,
  }));
  rows.push({ Category: 'All categories', ...matrix.totals, Total: matrix.total });
  return rows;
}

export function createStakeholderWorkbook(stakeholders: Stakeholder[], segments: Segment[]) {
  const workbook = XLSX.utils.book_new();
  const sheet = (rows: Row[], header?: string[]) =>
    XLSX.utils.json_to_sheet(rows, header ? { header } : undefined);
  XLSX.utils.book_append_sheet(workbook, sheet(stakeholderRows(stakeholders)), 'Stakeholders');
  XLSX.utils.book_append_sheet(workbook, sheet(contactRows(stakeholders)), 'Contacts');
  XLSX.utils.book_append_sheet(workbook, sheet(engagementRows(stakeholders)), 'Engagements');
  XLSX.utils.book_append_sheet(workbook, sheet(segmentRows(segments, stakeholders)), 'Segments');
  XLSX.utils.book_append_sheet(
    workbook,
    sheet(pipelineRows(stakeholders), ['Category', ...PIPELINE_STAGES, 'Total']),
    'Pipeline',
  );
  return workbook;
}

export function exportStakeholderWorkbook(stakeholders: Stakeholder[], segments: Segment[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(createStakeholderWorkbook(stakeholders, segments), `s081-crm-report-${stamp}.xlsx`);
}

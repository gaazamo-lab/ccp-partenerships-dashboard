import { BLOCKING_SCREENING } from '@/features/stakeholders/constants';
import type {
  ConsentStatus,
  Segment,
  SegmentCriteria,
  Stakeholder,
  StakeholderCategory,
} from '@/features/stakeholders/types';

export const EMPTY_CRITERIA: SegmentCriteria = {
  categories: [],
  statuses: [],
  owners: [],
  consentedOnly: false,
};

/**
 * The rules a segment resolves against. Segments saved before criteria
 * existed only carry `categories`; they resolve as "these categories, any
 * status, any owner".
 */
export function segmentCriteria(segment: Pick<Segment, 'criteria' | 'categories'>): SegmentCriteria {
  if (segment.criteria) return segment.criteria;
  return { ...EMPTY_CRITERIA, categories: segment.categories ?? [] };
}

export interface ResolvedMember {
  stakeholderId: string;
  stakeholderName: string;
  category: StakeholderCategory;
  owner: string;
  contactId: string;
  contactName: string;
  role: string;
  email: string;
  consent: ConsentStatus;
}

/**
 * SRS-S081-B-03 / NFR-I2: membership is computed from the register at the
 * moment it is read, never stored. A contact is a member when its organisation
 * matches the criteria and is not Inactive (status matrix row 6), the contact
 * itself is active, it is not held by S203 (pending, under review or
 * rejected), and it has not withdrawn S188 consent. `consentedOnly` narrows
 * that to contacts with recorded consent.
 */
export function resolveSegmentMembers(
  criteria: SegmentCriteria,
  stakeholders: Stakeholder[],
): ResolvedMember[] {
  const members: ResolvedMember[] = [];
  for (const stakeholder of stakeholders) {
    if (stakeholder.status === 'Inactive') continue;
    if (criteria.categories.length > 0 && !criteria.categories.includes(stakeholder.category)) {
      continue;
    }
    if (criteria.statuses.length > 0 && !criteria.statuses.includes(stakeholder.status)) continue;
    if (criteria.owners.length > 0 && !criteria.owners.includes(stakeholder.owner)) continue;

    for (const contact of stakeholder.contacts) {
      if (!contact.active) continue;
      if (BLOCKING_SCREENING.includes(contact.screening)) continue;
      if (contact.consent === 'Withdrawn') continue;
      if (criteria.consentedOnly && contact.consent !== 'Consented') continue;
      members.push({
        stakeholderId: stakeholder.id,
        stakeholderName: stakeholder.name,
        category: stakeholder.category,
        owner: stakeholder.owner,
        contactId: contact.id,
        contactName: contact.name,
        role: contact.role,
        email: contact.email,
        consent: contact.consent,
      });
    }
  }
  return members;
}

export interface SegmentCounts {
  members: number;
  consented: number;
  organisations: number;
}

export function segmentCounts(members: ResolvedMember[]): SegmentCounts {
  return {
    members: members.length,
    consented: members.filter((member) => member.consent === 'Consented').length,
    organisations: new Set(members.map((member) => member.stakeholderId)).size,
  };
}

/** Plain-language summary of a segment's rules, for cards and reports. */
export function describeCriteria(criteria: SegmentCriteria): string {
  const parts = [
    criteria.categories.length > 0 ? criteria.categories.join(', ') : 'All categories',
    criteria.statuses.length > 0 ? `status ${criteria.statuses.join(' / ')}` : null,
    criteria.owners.length > 0 ? `owned by ${criteria.owners.join(', ')}` : null,
    criteria.consentedOnly ? 'consented contacts only' : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

/** Segment members by stakeholder category, for the composition report. */
export function compositionByCategory(members: ResolvedMember[]) {
  const counts = new Map<StakeholderCategory, number>();
  for (const member of members) counts.set(member.category, (counts.get(member.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count);
}

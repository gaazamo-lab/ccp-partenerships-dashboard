import { BLOCKING_SCREENING } from '@/features/stakeholders/constants';
import type {
  RelationshipStatus,
  ScreeningDecisionInput,
  Stakeholder,
  StakeholderContact,
} from '@/features/stakeholders/types';

/**
 * S081-B-01 / NFR-C1: no engagement proceeds while an active contact is
 * awaiting S203, needs review, or was rejected. Deactivating a rejected contact
 * is how the relationship is unblocked — the rejection itself never clears.
 */
export function blockingContacts(stakeholder: Stakeholder): StakeholderContact[] {
  return stakeholder.contacts.filter(
    (contact) => contact.active && BLOCKING_SCREENING.includes(contact.screening),
  );
}

export function isEngagementBlocked(stakeholder: Stakeholder): boolean {
  return blockingContacts(stakeholder).length > 0;
}

/** The SRS error-state copy, specialised to why engagement is blocked. */
export function engagementBlockReason(stakeholder: Stakeholder): string | null {
  const blocked = blockingContacts(stakeholder);
  if (blocked.length === 0) return null;
  if (blocked.some((contact) => contact.screening === 'Rejected')) {
    const names = blocked
      .filter((contact) => contact.screening === 'Rejected')
      .map((contact) => contact.name)
      .join(', ');
    return `S203 screening rejected ${names}. Deactivate the contact before engaging this stakeholder.`;
  }
  return 'This contact cannot be engaged until Sanctions/PEP screening (S203) is complete.';
}

/**
 * Status after a contact or screening change: blocked organisations read
 * "Screening pending"; once clear they return to Active. Inactive and MOU
 * linked are deliberate states and are left alone.
 */
export function deriveRelationshipStatus(stakeholder: Stakeholder): RelationshipStatus {
  if (stakeholder.status === 'Inactive') return 'Inactive';
  if (isEngagementBlocked(stakeholder)) return 'Screening pending';
  return stakeholder.status === 'Screening pending' ? 'Active' : stakeholder.status;
}

export function applyScreeningDecision(
  contact: StakeholderContact,
  input: ScreeningDecisionInput,
  reviewer: string,
  reviewedAt: string,
): StakeholderContact {
  return {
    ...contact,
    screening: input.outcome,
    screeningRecord: {
      outcome: input.outcome,
      reviewer,
      reviewedAt,
      notes: input.notes.trim(),
      caseRef: input.caseRef?.trim() || null,
    },
  };
}

export type ScreeningDecisionErrors = Partial<Record<'notes' | 'caseRef', string>>;

/** S203 case references look like `S203-2026-00123`. */
export const CASE_REF_PATTERN = /^S203-\d{4}-\d{3,6}$/i;

export function validateScreeningDecision(input: ScreeningDecisionInput): ScreeningDecisionErrors {
  const errors: ScreeningDecisionErrors = {};
  if (input.outcome !== 'Cleared' && !input.notes.trim()) {
    errors.notes = 'Explain the finding — reviewers and auditors rely on it.';
  }
  if (input.caseRef && input.caseRef.trim() && !CASE_REF_PATTERN.test(input.caseRef.trim())) {
    errors.caseRef = 'Use the S203 case format, e.g. S203-2026-00123.';
  }
  if (input.outcome === 'Rejected' && !input.caseRef?.trim()) {
    errors.caseRef = 'A rejection must cite the S203 case reference.';
  }
  return errors;
}

import { describe, expect, it } from 'vitest';

import {
  applyScreeningDecision,
  deriveRelationshipStatus,
  engagementBlockReason,
  isEngagementBlocked,
  validateScreeningDecision,
} from '@/features/stakeholders/screening';
import { makeContact, makeStakeholder } from '@/features/stakeholders/testFixtures';

describe('S203 engagement gate', () => {
  it.each(['Pending', 'Review required', 'Rejected'] as const)(
    'blocks engagement while an active contact is %s',
    (screening) => {
      const stakeholder = makeStakeholder({ contacts: [makeContact({ screening })] });
      expect(isEngagementBlocked(stakeholder)).toBe(true);
    },
  );

  it.each(['Cleared', 'Not required'] as const)('allows engagement when %s', (screening) => {
    const stakeholder = makeStakeholder({ contacts: [makeContact({ screening })] });
    expect(isEngagementBlocked(stakeholder)).toBe(false);
  });

  it('ignores deactivated contacts, which is how a rejection is unblocked', () => {
    const stakeholder = makeStakeholder({
      contacts: [makeContact({ screening: 'Rejected', active: false })],
    });
    expect(isEngagementBlocked(stakeholder)).toBe(false);
  });

  it('uses the SRS error copy while pending and names rejected contacts', () => {
    const pending = makeStakeholder({ contacts: [makeContact({ screening: 'Pending' })] });
    expect(engagementBlockReason(pending)).toBe(
      'This contact cannot be engaged until Sanctions/PEP screening (S203) is complete.',
    );
    const rejected = makeStakeholder({
      contacts: [makeContact({ screening: 'Rejected', name: 'Bisi Adeyemi' })],
    });
    expect(engagementBlockReason(rejected)).toMatch(/rejected Bisi Adeyemi/);
    expect(engagementBlockReason(makeStakeholder())).toBeNull();
  });
});

describe('deriveRelationshipStatus', () => {
  it('moves to Screening pending while blocked and back to Active once clear', () => {
    const blocked = makeStakeholder({ contacts: [makeContact({ screening: 'Pending' })] });
    expect(deriveRelationshipStatus(blocked)).toBe('Screening pending');
    const cleared = makeStakeholder({
      status: 'Screening pending',
      contacts: [makeContact({ screening: 'Cleared' })],
    });
    expect(deriveRelationshipStatus(cleared)).toBe('Active');
  });

  it('keeps Rejected blocked and leaves deliberate states alone', () => {
    const rejected = makeStakeholder({
      status: 'Screening pending',
      contacts: [makeContact({ screening: 'Rejected' })],
    });
    expect(deriveRelationshipStatus(rejected)).toBe('Screening pending');
    expect(deriveRelationshipStatus(makeStakeholder({ status: 'MOU linked' }))).toBe('MOU linked');
    const inactive = makeStakeholder({
      status: 'Inactive',
      contacts: [makeContact({ screening: 'Pending' })],
    });
    expect(deriveRelationshipStatus(inactive)).toBe('Inactive');
  });
});

describe('applyScreeningDecision', () => {
  it('stores the outcome with reviewer, time, trimmed notes and case reference', () => {
    const contact = applyScreeningDecision(
      makeContact({ screening: 'Review required' }),
      { outcome: 'Rejected', notes: '  Confirmed PEP match ', caseRef: ' S203-2026-00123 ' },
      'Efua Kwarteng',
      '2026-09-26T10:00:00.000Z',
    );
    expect(contact.screening).toBe('Rejected');
    expect(contact.screeningRecord).toEqual({
      outcome: 'Rejected',
      reviewer: 'Efua Kwarteng',
      reviewedAt: '2026-09-26T10:00:00.000Z',
      notes: 'Confirmed PEP match',
      caseRef: 'S203-2026-00123',
    });
  });
});

describe('validateScreeningDecision', () => {
  it('accepts a bare clearance', () => {
    expect(validateScreeningDecision({ outcome: 'Cleared', notes: '', caseRef: null })).toEqual({});
  });

  it('requires notes for adverse outcomes and a case reference for rejection', () => {
    const rejected = validateScreeningDecision({ outcome: 'Rejected', notes: '', caseRef: '' });
    expect(rejected.notes).toBeTruthy();
    expect(rejected.caseRef).toBeTruthy();
    const badRef = validateScreeningDecision({
      outcome: 'Review required',
      notes: 'Name match',
      caseRef: 'bad',
    });
    expect(badRef.caseRef).toMatch(/S203-2026-00123/);
  });
});

import { describe, expect, it } from 'vitest';

import {
  EMPTY_CRITERIA,
  compositionByCategory,
  describeCriteria,
  resolveSegmentMembers,
  segmentCounts,
  segmentCriteria,
} from '@/features/segments/resolution';
import { makeContact, makeStakeholder } from '@/features/stakeholders/testFixtures';

const register = [
  makeStakeholder({
    id: 'gba',
    category: 'Professional body',
    owner: 'Nana Asante',
    contacts: [
      makeContact({ id: 'c1', consent: 'Consented' }),
      makeContact({ id: 'c2', consent: 'Not recorded' }),
      makeContact({ id: 'c3', consent: 'Withdrawn' }),
      makeContact({ id: 'c4', active: false }),
    ],
  }),
  makeStakeholder({
    id: 'ford',
    category: 'Donor',
    owner: 'Akua Boateng',
    status: 'Screening pending',
    contacts: [
      makeContact({ id: 'c5', screening: 'Pending' }),
      makeContact({ id: 'c6', screening: 'Review required' }),
      makeContact({ id: 'c7', screening: 'Rejected' }),
      makeContact({ id: 'c8', screening: 'Cleared' }),
    ],
  }),
  makeStakeholder({
    id: 'dormant',
    category: 'Media',
    status: 'Inactive',
    contacts: [makeContact({ id: 'c9' })],
  }),
];

const ids = (criteria = EMPTY_CRITERIA) =>
  resolveSegmentMembers(criteria, register).map((member) => member.contactId);

describe('resolveSegmentMembers', () => {
  it('excludes inactive organisations and contacts, S203 holds and withdrawn consent', () => {
    expect(ids()).toEqual(['c1', 'c2', 'c8']);
  });

  it('narrows by category, status and owner', () => {
    expect(ids({ ...EMPTY_CRITERIA, categories: ['Donor'] })).toEqual(['c8']);
    expect(ids({ ...EMPTY_CRITERIA, statuses: ['Active'] })).toEqual(['c1', 'c2']);
    expect(ids({ ...EMPTY_CRITERIA, owners: ['Akua Boateng'] })).toEqual(['c8']);
  });

  it('keeps only consented contacts when asked', () => {
    expect(ids({ ...EMPTY_CRITERIA, consentedOnly: true })).toEqual(['c1', 'c8']);
  });

  it('never resolves Inactive organisations, even when the criteria name that status', () => {
    expect(ids({ ...EMPTY_CRITERIA, statuses: ['Inactive'] })).toEqual([]);
  });
});

describe('segment helpers', () => {
  it('falls back to legacy categories when a segment has no criteria', () => {
    expect(segmentCriteria({ categories: ['Media'] })).toEqual({
      ...EMPTY_CRITERIA,
      categories: ['Media'],
    });
  });

  it('counts members, consent and organisations', () => {
    expect(segmentCounts(resolveSegmentMembers(EMPTY_CRITERIA, register))).toEqual({
      members: 3,
      consented: 2,
      organisations: 2,
    });
  });

  it('groups composition by category, largest first', () => {
    expect(compositionByCategory(resolveSegmentMembers(EMPTY_CRITERIA, register))).toEqual([
      { category: 'Professional body', count: 2 },
      { category: 'Donor', count: 1 },
    ]);
  });

  it('describes criteria in plain language', () => {
    expect(
      describeCriteria({ categories: ['Donor'], statuses: [], owners: ['Akua'], consentedOnly: true }),
    ).toBe('Donor · owned by Akua · consented contacts only');
  });
});

import { describe, expect, it } from 'vitest';

import {
  canSubmit,
  estimateTotal,
  evidenceReady,
  nextWorkflowAction,
  validateRequest,
} from './domain';
import type { TravelRequest } from './types';

describe('travel request rules', () => {
  it('rejects reversed dates and missing inbound nationality', () => {
    const errors = validateRequest({
      direction: 'Inbound',
      category: 'Visa support',
      traveller: 'A',
      purpose: 'Examiner visit',
      destination: 'Accra',
      startDate: '2026-10-10',
      endDate: '2026-10-01',
    });
    expect(errors.endDate).toBeTruthy();
    expect(errors.nationality).toBeTruthy();
  });

  it('accepts evidence exceptions as ready', () => {
    const request = {
      status: 'Draft',
      direction: 'Inbound',
      evidence: [{ label: 'Passport', required: true, status: 'Exception' }],
    } as TravelRequest;
    expect(evidenceReady(request)).toBe(true);
    expect(canSubmit(request)).toBe(true);
    expect(nextWorkflowAction(request)).toBe('Submit for screening');
  });

  it('calculates every estimate component', () => {
    const request = {
      estimate: { currency: 'GHS', perDiem: 100, transport: 200, accommodation: 300, other: 50 },
    } as TravelRequest;
    expect(estimateTotal(request)).toBe(650);
  });

  it('blocks a draft with required evidence missing but ignores optional evidence', () => {
    const blocked = {
      status: 'Draft',
      evidence: [
        { label: 'Passport', required: true, status: 'Missing' },
        { label: 'Optional note', required: false, status: 'Missing' },
      ],
    } as TravelRequest;
    expect(evidenceReady(blocked)).toBe(false);
    expect(canSubmit(blocked)).toBe(false);
    blocked.evidence[0]!.status = 'Received';
    expect(canSubmit(blocked)).toBe(true);
  });

  it('exposes issuance and closure as the next valid actions', () => {
    expect(nextWorkflowAction({ status: 'Approved', direction: 'Outbound' } as TravelRequest)).toBe(
      'Issue travel authorisation',
    );
    expect(nextWorkflowAction({ status: 'Completed' } as TravelRequest)).toBe('Close request');
  });
});

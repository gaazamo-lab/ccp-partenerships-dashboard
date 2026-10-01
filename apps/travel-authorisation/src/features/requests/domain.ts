import type { NewTravelRequest, TravelRequest } from './types';

export function validateRequest(input: NewTravelRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.traveller.trim()) errors.traveller = 'Enter the traveller name.';
  if (!input.purpose.trim()) errors.purpose = 'Enter the purpose of travel.';
  if (!input.destination.trim()) errors.destination = 'Enter a destination.';
  if (!input.startDate) errors.startDate = 'Select a start date.';
  if (!input.endDate) errors.endDate = 'Select an end date.';
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = 'End date cannot be earlier than start date.';
  }
  if (input.direction === 'Inbound' && !input.nationality?.trim()) {
    errors.nationality = 'Nationality is required for inbound support.';
  }
  return errors;
}

export function estimateTotal(request: TravelRequest): number {
  if (!request.estimate) return 0;
  return (
    request.estimate.perDiem +
    request.estimate.transport +
    request.estimate.accommodation +
    (request.estimate.other ?? 0)
  );
}

export function evidenceReady(request: TravelRequest): boolean {
  return request.evidence.every((item) => !(item.required ?? true) || item.status !== 'Missing');
}

export function canSubmit(request: TravelRequest): boolean {
  return ['Draft', 'Returned'].includes(request.status) && evidenceReady(request);
}

export function nextWorkflowAction(request: TravelRequest): string {
  if (request.status === 'Draft' || request.status === 'Returned') return 'Submit for screening';
  if (request.status === 'Submitted') return 'Start screening';
  if (request.status === 'Screening') return 'Route for approval';
  if (request.status === 'Approved')
    return request.direction === 'Inbound' ? 'Issue support letter' : 'Issue travel authorisation';
  if (request.status === 'Support issued' || request.status === 'Travel authorised')
    return 'Complete request';
  if (request.status === 'Completed') return 'Close request';
  return request.nextAction;
}

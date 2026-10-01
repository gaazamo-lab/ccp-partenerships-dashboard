import type { IrEngagement, IrEngagementInput } from '@partner-crm/types';

import { draftErrors, engagementToInput } from './domain';
import { fromLocalInput, toLocalInput } from './format';

/** Form values: the contract input, with dates as `datetime-local` strings. */
export type EngagementFormValues = IrEngagementInput;

export type EngagementFormErrors = Partial<Record<keyof IrEngagementInput, string>>;

export function emptyEngagementValues(owner: string): EngagementFormValues {
  return {
    type: 'VIP_VISIT',
    direction: 'INBOUND',
    title: '',
    purpose: '',
    partnerStakeholderId: null,
    partnerName: '',
    owner,
    host: '',
    venue: '',
    startAt: '',
    endAt: '',
    timeZone: 'Africa/Accra',
    classification: 'INTERNAL',
    agendaRef: null,
    briefingPackRef: null,
    minutesRef: null,
  };
}

export function engagementValues(engagement: IrEngagement): EngagementFormValues {
  const input = engagementToInput(engagement);
  return { ...input, startAt: toLocalInput(input.startAt), endAt: toLocalInput(input.endAt) };
}

export function valuesToInput(values: EngagementFormValues): IrEngagementInput {
  return { ...values, startAt: fromLocalInput(values.startAt), endAt: fromLocalInput(values.endAt) };
}

export function validateEngagementValues(values: EngagementFormValues): EngagementFormErrors {
  return draftErrors(valuesToInput(values));
}

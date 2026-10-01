import type { ConsentInput } from '@/features/stakeholders/types';

export type ConsentErrors = Partial<Record<'consentDate' | 'consentChannel', string>>;

/**
 * S188 consent records carry a date and a channel (SRS §4.1). Recording or
 * withdrawing consent without them leaves nothing to show the DPO.
 */
export function validateConsent(input: ConsentInput, today: string): ConsentErrors {
  const errors: ConsentErrors = {};
  const needsRecord = input.consent === 'Consented' || input.consent === 'Withdrawn';
  if (needsRecord && !input.consentDate) {
    errors.consentDate = 'Enter the date consent was given or withdrawn.';
  } else if (input.consentDate && input.consentDate > today) {
    errors.consentDate = 'The date cannot be in the future.';
  }
  if (needsRecord && !input.consentChannel) {
    errors.consentChannel = 'Select how the decision was received.';
  }
  return errors;
}

/** Communication consent that S075 / S088 may rely on. */
export function hasUsableConsent(consent: ConsentInput['consent']): boolean {
  return consent === 'Consented';
}

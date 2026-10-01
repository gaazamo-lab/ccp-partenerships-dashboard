import { type FormEvent, useState } from 'react';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  useToast,
} from '@rfdtech/components';

import type { PartnershipAgreement, PartnershipRenewalAlert } from '@partner-crm/types';

import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { TextareaField, formatDate } from '@/features/shared';

/** Internal notice addresses only; S074 delivers to these directly. */
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function RenewalAlertsModal({
  agreement,
  alerts,
  actor,
  open,
  onOpenChange,
}: {
  agreement: PartnershipAgreement;
  alerts: PartnershipRenewalAlert[];
  actor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { configureRenewalAlerts } = usePartnerships();
  const { toast } = useToast();
  const existingRecipients = Array.from(new Set(alerts.flatMap((item) => item.recipients)));
  const [recipientText, setRecipientText] = useState(existingRecipients.join('\n'));
  const [error, setError] = useState('');
  const recipients = Array.from(
    new Set(
      recipientText
        .split('\n')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const invalid = recipients.filter((value) => !EMAIL_PATTERN.test(value));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (recipients.length === 0) {
      setError('At least one recipient is required.');
      return;
    }
    if (invalid.length > 0) {
      // Naming the offending line beats "one or more addresses is invalid"
      // against a five-line textarea.
      setError(`Not a valid email address: ${invalid.join(', ')}`);
      return;
    }
    if (!agreement.expiryDate) return;
    configureRenewalAlerts({ agreementId: agreement.id, recipients }, actor);
    toast({
      title: 'Renewal alerts configured',
      description:
        'The 180, 90, and 30-day milestones were calculated from the current expiry date.',
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={submit} noValidate>
          <ModalHeader>
            <ModalTitle>Configure renewal alerts</ModalTitle>
            <ModalDescription>
              Set the internal recipients for the 180, 90, and 30-day S074 notices.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <Notice
              variant={agreement.expiryDate ? 'info' : 'warning'}
              title={agreement.expiryDate ? 'Expiry-driven schedule' : 'Expiry date required'}
              leftBorder
            >
              {agreement.expiryDate
                ? `Milestones will be calculated from ${formatDate(agreement.expiryDate)}. Existing unsent milestones will be cancelled and replaced.`
                : 'Edit the agreement and set an expiry date before configuring alerts.'}
            </Notice>
            <TextareaField
              label="Recipients"
              required
              rows={5}
              value={recipientText}
              onChange={(value) => {
                setRecipientText(value);
                setError('');
              }}
              placeholder={'partnerships@clet.gov.gh\nregistrar@clet.gov.gh'}
              // description={
                // recipients.length > 0
                  // ? `One internal email address per line — ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}.`
                  // : 'Enter one internal email address per line.'
              // }
              error={error}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!agreement.expiryDate}>
              Save alert schedule
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

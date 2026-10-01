import { type FormEvent, useState } from 'react';

import {
  Badge,
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
import { BellRing, Send } from 'lucide-react';

import type { Consultation, ConsultationInvitationKind } from '@partner-crm/types';
import { EmptyState, MultiSelectField, SectionCard, formatCount, formatDateTime } from '@partner-crm/ui';

import { audienceReach, invitationBlockers } from '@/features/consultations/invitations';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

interface InvitationsCardProps {
  consultation: Consultation;
  /** Reason the viewer cannot send, when gated. */
  denied?: string;
}

/** Consent-verified invitations and reminders, sent through S074. */
export function InvitationsCard({ consultation, denied }: InvitationsCardProps) {
  const { invitations, segments } = useConsultations();
  const [kind, setKind] = useState<ConsultationInvitationKind | null>(null);
  const history = invitations
    .filter((item) => item.consultationId === consultation.id)
    .sort((left, right) => right.sentAt.localeCompare(left.sentAt));
  const segmentName = (id: string) => segments.find((segment) => segment.id === id)?.name ?? id;
  const isPublic = consultation.audienceSource === 'PUBLIC';
  const inviteBlock = invitationBlockers(consultation, { kind: 'INVITATION', segmentIds: consultation.audienceSegmentIds })[0];
  const reminderBlock = invitationBlockers(consultation, { kind: 'REMINDER', segmentIds: consultation.audienceSegmentIds })[0];

  return (
    <SectionCard
      title="Invitations"
      // description="Sent through the Comms System (S074) to consent-verified contacts in the chosen S081 segments."
      actions={
        isPublic ? undefined : (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(denied ?? reminderBlock)}
              title={denied ?? reminderBlock}
              onClick={() => setKind('REMINDER')}
            >
              <BellRing size={15} aria-hidden /> Send reminder
            </Button>
            <Button
              size="sm"
              disabled={Boolean(denied ?? inviteBlock)}
              title={denied ?? inviteBlock}
              onClick={() => setKind('INVITATION')}
            >
              <Send size={15} aria-hidden /> Send invitation
            </Button>
          </>
        )
      }
    >
      {isPublic ? (
        <p className="text-sm text-foreground-muted">
          This is an open public consultation: it is promoted on the website and anyone can respond without an invitation.
        </p>
      ) : history.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">Sent</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Segments</th>
                <th className="py-2 pr-4 text-right font-medium">Recipients</th>
                <th className="py-2 pr-4 text-right font-medium">Excluded</th>
                <th className="py-2 font-medium">S074 reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pr-4">
                    {formatDateTime(item.sentAt)}
                    <span className="block text-xs text-foreground-muted">by {item.sentBy}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={item.kind === 'INVITATION' ? 'primary' : 'default'}>
                      {item.kind === 'INVITATION' ? 'Invitation' : 'Reminder'}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-foreground-muted">{item.segmentIds.map(segmentName).join(', ')}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatCount(item.recipientCount)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatCount(item.excludedCount)}</td>
                  <td className="py-2.5 font-mono text-xs">{item.communicationRef ?? 'Queued'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-foreground-muted">
            Excluded contacts have no recorded S188 communication consent; reminders also skip the estimated number who
            already responded.
          </p>
        </div>
      ) : (
        <EmptyState
          message="No invitations sent yet"
          hint={inviteBlock ?? 'Send the invitation to start collecting responses from the targeted audience.'}
        />
      )}
      {kind ? <InviteModal consultation={consultation} kind={kind} onClose={() => setKind(null)} /> : null}
    </SectionCard>
  );
}

interface InviteModalProps {
  consultation: Consultation;
  kind: ConsultationInvitationKind;
  onClose: () => void;
}

function InviteModal({ consultation, kind, onClose }: InviteModalProps) {
  const { segments, sendInvitations } = useConsultations();
  const { toast } = useToast();
  const [segmentIds, setSegmentIds] = useState(consultation.audienceSegmentIds);
  const [saving, setSaving] = useState(false);
  const reach = audienceReach(segmentIds, segments);
  const blockers = invitationBlockers(consultation, { kind, segmentIds });
  const estimated = kind === 'INVITATION' ? reach.consented : Math.max(0, reach.consented - consultation.responseCount);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (blockers.length) return;
    setSaving(true);
    try {
      const sent = await sendInvitations(consultation.id, { kind, segmentIds });
      toast({
        title: kind === 'INVITATION' ? 'Invitations queued' : 'Reminders queued',
        description: `${formatCount(sent.recipientCount)} recipients via S074 (${sent.communicationRef ?? 'reference pending'}); ${formatCount(sent.excludedCount)} excluded.`,
        variant: 'success',
      });
      onClose();
    } catch {
      // Toasted by the provider.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent size="md">
        <form onSubmit={(event) => void submit(event)}>
          <ModalHeader>
            <ModalTitle>{kind === 'INVITATION' ? 'Send invitation' : 'Send reminder'}</ModalTitle>
            <ModalDescription>
              Only contacts with S188 communication consent are messaged. Identities are never linked to answers unless
              the respondent consents on the form.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <MultiSelectField
              label="Segments"
              required
              value={segmentIds}
              options={segments.map((segment) => ({ value: segment.id, label: segment.name }))}
              searchPlaceholder="Search segments"
              onChange={setSegmentIds}
            />
            {blockers.length ? (
              <Notice variant="warning" leftBorder>
                {blockers[0]}
              </Notice>
            ) : (
              <Notice variant="info" leftBorder title={`About ${formatCount(estimated)} recipients`}>
                {formatCount(reach.members)} contacts in the selected segments; {formatCount(reach.excluded)} without
                consent will be excluded
                {kind === 'REMINDER' ? ', as will an estimated number who already responded' : ''}.
              </Notice>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={blockers.length > 0 || saving} loading={saving}>
              {kind === 'INVITATION' ? 'Queue invitations' : 'Queue reminders'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

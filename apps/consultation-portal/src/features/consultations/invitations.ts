import type {
  Consultation,
  ConsultationInvitation,
  ConsultationInvitationInput,
  Segment,
} from '@partner-crm/types';

export interface AudienceReach {
  members: number;
  /** Contacts with S188 communication consent: the only ones who can be invited. */
  consented: number;
  excluded: number;
  unknownSegments: string[];
}

/** Consent-verified reach of a set of S081 segments. */
export function audienceReach(segmentIds: string[], segments: Segment[]): AudienceReach {
  const reach: AudienceReach = { members: 0, consented: 0, excluded: 0, unknownSegments: [] };
  for (const id of segmentIds) {
    const segment = segments.find((item) => item.id === id);
    if (!segment) {
      reach.unknownSegments.push(id);
      continue;
    }
    reach.members += segment.members;
    reach.consented += Math.min(segment.consented, segment.members);
  }
  reach.excluded = reach.members - reach.consented;
  return reach;
}

/** Why an invitation or reminder cannot be sent right now. */
export function invitationBlockers(
  consultation: Consultation,
  input: ConsultationInvitationInput,
): string[] {
  const blockers: string[] = [];
  if (consultation.audienceSource === 'PUBLIC') {
    blockers.push('Open public consultations are promoted on the website, not by invitation.');
  }
  if (input.kind === 'INVITATION' && !['SCHEDULED', 'OPEN'].includes(consultation.status)) {
    blockers.push('Invitations can be sent once the consultation is approved (scheduled or open).');
  }
  if (input.kind === 'REMINDER' && consultation.status !== 'OPEN') {
    blockers.push('Reminders can only be sent while the consultation is open.');
  }
  if (!input.segmentIds.length) blockers.push('Choose at least one audience segment.');
  return blockers;
}

/**
 * The local (mock) record of a send. Counts are derived deterministically from
 * the segments: invitations go to every consented contact; reminders go to the
 * consented contacts who have not yet responded (estimated from the response
 * count, since responses are not linked to contacts without consent).
 */
export function buildInvitation(
  consultation: Consultation,
  input: ConsultationInvitationInput,
  segments: Segment[],
  previous: ConsultationInvitation[],
  actor: string,
  now = new Date(),
  id: string = crypto.randomUUID(),
): ConsultationInvitation {
  const reach = audienceReach(input.segmentIds, segments);
  const recipientCount =
    input.kind === 'INVITATION' ? reach.consented : Math.max(0, reach.consented - consultation.responseCount);
  const excludedCount =
    input.kind === 'INVITATION' ? reach.excluded : reach.excluded + (reach.consented - recipientCount);
  const sequence = previous.filter((item) => item.consultationId === consultation.id).length + 1;
  return {
    id,
    consultationId: consultation.id,
    kind: input.kind,
    segmentIds: [...input.segmentIds],
    recipientCount,
    excludedCount,
    communicationRef: `S074-${consultation.id}-${String(sequence).padStart(3, '0')}`,
    sentBy: actor,
    sentAt: now.toISOString(),
  };
}

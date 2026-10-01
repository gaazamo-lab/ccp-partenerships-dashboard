import type { InternationalRepository } from '@partner-crm/api-client';
import type {
  ApiEnvelope,
  IrCorrespondence,
  IrCorrespondenceInput,
  IrEngagement,
  IrEngagementInput,
  IrGift,
  IrLetterTemplate,
  IrLetterTemplateInput,
} from '@partner-crm/types';

import {
  approvalDecisionFor,
  contentEditable,
  correspondenceErrors,
  correspondenceTransitionBlockers,
  draftErrors,
  engagementEditable,
  engagementToInput,
  engagementTransitionBlockers,
  flagRetryBlocker,
  giftErrors,
  initialFlagStatus,
  isContentChange,
  isMaterialEngagementChange,
  nextReference,
  statusAfterEdit,
  supportUpdateBlockers,
  taskUpdateBlockers,
} from '../domain';
import { type IrSeed, buildSeed } from './seed';

/** A rejected command, carrying the HTTP status the backend would return. */
export class IrRuleError extends Error {
  readonly status: 404 | 409 | 422;

  constructor(message: string, status: 404 | 409 | 422 = 409) {
    super(message);
    this.name = 'IrRuleError';
    this.status = status;
  }
}

export interface MemoryRepositoryOptions {
  /** Clock; tests pin it. */
  now?: () => Date;
  /** Current user's display name, as the backend would read it from the session. */
  actor?: () => string;
  /** Starting data. Defaults to the seeded CLET register; pass an empty seed for tests. */
  seed?: IrSeed;
}

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}-${counter}`;
}

function blank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

function trimOrNull(value: string | null | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data: structuredClone(data) };
}

function firstError(errors: Partial<Record<string, string>>): string | null {
  const messages = Object.values(errors).filter(Boolean);
  return messages.length ? messages.join(' ') : null;
}

/**
 * Mock-mode implementation of the S083 contract. It enforces the rules in
 * `docs/architecture/new-module-rules.md` exactly as the backend would, so the
 * UI's blocked states are real and not merely cosmetic.
 */
export function createMemoryInternationalRepository(
  options: MemoryRepositoryOptions = {},
): InternationalRepository & { s011FlagCount(): number } {
  const clock = options.now ?? (() => new Date());
  const actorName = options.actor ?? (() => 'Unknown user');
  const seed = structuredClone(options.seed ?? buildSeed(clock()));

  let engagements = seed.engagements;
  let correspondence = seed.correspondence;
  let templates = seed.templates;
  let gifts = seed.gifts;
  /** Gift ID → S011 flag reference: one flag per gift, however often it is retried. */
  const s011Flags = new Map<string, string>(
    gifts.filter((gift) => gift.s011Ref).map((gift) => [gift.id, gift.s011Ref as string]),
  );

  let dispatchCount = 0;

  const nowIso = () => clock().toISOString();
  const year = () => clock().getFullYear();

  function findEngagement(id: string): IrEngagement {
    const engagement = engagements.find((item) => item.id === id);
    if (!engagement) throw new IrRuleError('Engagement not found.', 404);
    return engagement;
  }

  function saveEngagement(next: IrEngagement): ApiEnvelope<IrEngagement> {
    engagements = engagements.map((item) => (item.id === next.id ? next : item));
    return ok(next);
  }

  function assertOpen(engagement: IrEngagement, what: string) {
    if (!engagementEditable(engagement.status)) {
      throw new IrRuleError(`${what} cannot change on a ${engagement.status.toLowerCase()} engagement.`);
    }
  }

  function findCorrespondence(id: string): IrCorrespondence {
    const item = correspondence.find((entry) => entry.id === id);
    if (!item) throw new IrRuleError('Correspondence item not found.', 404);
    return item;
  }

  function saveCorrespondence(next: IrCorrespondence): ApiEnvelope<IrCorrespondence> {
    correspondence = correspondence.map((item) => (item.id === next.id ? next : item));
    return ok(next);
  }

  /** The template version a letter records, checking it is usable for that language. */
  function templateVersionFor(
    templateId: string | null,
    language: IrCorrespondenceInput['language'],
    current: IrCorrespondence | null,
  ): number | null {
    if (!templateId) return null;
    if (current && current.templateId === templateId) return current.templateVersion;
    const template = templates.find((item) => item.id === templateId);
    if (!template) throw new IrRuleError('The selected template no longer exists.', 422);
    if (!template.active) {
      throw new IrRuleError('Draft from the active version of the template.', 422);
    }
    if (template.language !== language) {
      throw new IrRuleError(
        `The template is in ${template.language} but the letter is in ${language}. Choose a template in the letter's language.`,
        422,
      );
    }
    return template.version;
  }

  function validateTemplate(input: IrLetterTemplateInput) {
    const errors: string[] = [];
    if (blank(input.name)) errors.push('Enter a template name.');
    if (blank(input.subject)) errors.push('Enter a subject line.');
    if (blank(input.body)) errors.push('Write the template body.');
    if (errors.length) throw new IrRuleError(errors.join(' '), 422);
  }

  return {
    async listEngagements() {
      return ok(engagements);
    },

    async getEngagement(id) {
      return ok(findEngagement(id));
    },

    async createEngagement(input) {
      const error = firstError(draftErrors(input));
      if (error) throw new IrRuleError(error, 422);
      const timestamp = nowIso();
      const engagement: IrEngagement = {
        ...normaliseEngagementInput(input),
        id: newId('ire'),
        reference: nextReference(
          'IR',
          year(),
          engagements.map((item) => item.reference),
        ),
        status: 'DRAFT',
        checklistVersion: 1,
        finalReportRef: null,
        delegation: [],
        protocolTasks: [],
        followUps: [],
        supportRequests: [],
        approvals: [],
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      engagements = [engagement, ...engagements];
      return ok(engagement);
    },

    async updateEngagement(id, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'Details');
      const error = firstError(draftErrors(input));
      if (error) throw new IrRuleError(error, 422);
      const normalised = normaliseEngagementInput(input);
      const material = isMaterialEngagementChange(engagementToInput(engagement), normalised);
      const version = engagement.version + 1;
      const status = statusAfterEdit(engagement.status, material);
      const approvals =
        status !== engagement.status
          ? [
              ...engagement.approvals,
              {
                id: newId('ira'),
                decision: 'SUBMITTED' as const,
                comment: `Approval invalidated by a material change; resubmitted as version ${version}.`,
                actor: actorName(),
                version,
                occurredAt: nowIso(),
              },
            ]
          : engagement.approvals;
      return saveEngagement({
        ...engagement,
        ...normalised,
        status,
        approvals,
        version,
        updatedAt: nowIso(),
      });
    },

    async transitionEngagement(id, input) {
      const engagement = findEngagement(id);
      const actor = actorName();
      const comment = input.comment?.trim() ?? '';
      const blockers = engagementTransitionBlockers(engagement, input.status, { actor, comment });
      if (blockers.length) {
        const validation = input.status === 'SUBMITTED' && engagement.status !== input.status;
        throw new IrRuleError(blockers.join(' '), validation ? 422 : 409);
      }
      const decision = approvalDecisionFor(engagement.status, input.status);
      const timestamp = nowIso();
      return saveEngagement({
        ...engagement,
        status: input.status,
        approvals: decision
          ? [
              ...engagement.approvals,
              {
                id: newId('ira'),
                decision,
                comment,
                actor,
                version: engagement.version,
                occurredAt: timestamp,
              },
            ]
          : engagement.approvals,
        updatedAt: timestamp,
      });
    },

    async addDelegate(id, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'The delegation');
      if (blank(input.name) || blank(input.role) || blank(input.organisation)) {
        throw new IrRuleError('Name, delegation role and organisation are required.', 422);
      }
      return saveEngagement({
        ...engagement,
        delegation: [
          ...engagement.delegation,
          {
            id: newId('ird'),
            name: input.name.trim(),
            role: input.role.trim(),
            organisation: input.organisation.trim(),
            nationality: input.nationality.trim(),
            contactRef: trimOrNull(input.contactRef),
            travelRequestRef: trimOrNull(input.travelRequestRef),
          },
        ],
        updatedAt: nowIso(),
      });
    },

    async removeDelegate(id, memberId) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'The delegation');
      if (!engagement.delegation.some((member) => member.id === memberId)) {
        throw new IrRuleError('Delegation member not found.', 404);
      }
      return saveEngagement({
        ...engagement,
        delegation: engagement.delegation.filter((member) => member.id !== memberId),
        updatedAt: nowIso(),
      });
    },

    async addProtocolTask(id, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'The protocol checklist');
      if (blank(input.title) || blank(input.assignee)) {
        throw new IrRuleError('A task needs a title and an assignee.', 422);
      }
      return saveEngagement({
        ...engagement,
        // Every checklist change is a new checklist version (FR-03).
        checklistVersion: engagement.checklistVersion + 1,
        protocolTasks: [
          ...engagement.protocolTasks,
          {
            id: newId('irt'),
            title: input.title.trim(),
            mandatory: input.mandatory,
            assignee: input.assignee.trim(),
            dueDate: trimOrNull(input.dueDate),
            status: 'OPEN',
            evidenceRef: trimOrNull(input.evidenceRef),
            exceptionReason: null,
          },
        ],
        updatedAt: nowIso(),
      });
    },

    async updateProtocolTask(id, taskId, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'The protocol checklist');
      const task = engagement.protocolTasks.find((item) => item.id === taskId);
      if (!task) throw new IrRuleError('Protocol task not found.', 404);
      const blockers = taskUpdateBlockers(task, input, 'protocol');
      if (blockers.length) throw new IrRuleError(blockers.join(' '), 422);
      return saveEngagement({
        ...engagement,
        protocolTasks: engagement.protocolTasks.map((item) =>
          item.id === taskId
            ? {
                ...item,
                status: input.status,
                evidenceRef: trimOrNull(input.evidenceRef) ?? item.evidenceRef,
                exceptionReason: input.status === 'EXCEPTION' ? trimOrNull(input.exceptionReason) : null,
              }
            : item,
        ),
        updatedAt: nowIso(),
      });
    },

    async addFollowUp(id, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'Follow-ups');
      if (blank(input.title) || blank(input.owner) || blank(input.dueDate)) {
        throw new IrRuleError('A follow-up needs a title, an owner and a due date.', 422);
      }
      return saveEngagement({
        ...engagement,
        followUps: [
          ...engagement.followUps,
          {
            id: newId('irf'),
            title: input.title.trim(),
            owner: input.owner.trim(),
            dueDate: input.dueDate,
            mandatory: input.mandatory,
            status: 'OPEN',
            exceptionReason: null,
          },
        ],
        updatedAt: nowIso(),
      });
    },

    async updateFollowUp(id, followUpId, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'Follow-ups');
      const followUp = engagement.followUps.find((item) => item.id === followUpId);
      if (!followUp) throw new IrRuleError('Follow-up not found.', 404);
      const blockers = taskUpdateBlockers(followUp, input, 'followUp');
      if (blockers.length) throw new IrRuleError(blockers.join(' '), 422);
      return saveEngagement({
        ...engagement,
        followUps: engagement.followUps.map((item) =>
          item.id === followUpId
            ? {
                ...item,
                status: input.status,
                exceptionReason: input.status === 'EXCEPTION' ? trimOrNull(input.exceptionReason) : null,
              }
            : item,
        ),
        updatedAt: nowIso(),
      });
    },

    async requestSupport(id, input) {
      const engagement = findEngagement(id);
      assertOpen(engagement, 'Support requests');
      if (blank(input.description)) throw new IrRuleError('Describe what is being requested.', 422);
      const timestamp = nowIso();
      return saveEngagement({
        ...engagement,
        supportRequests: [
          ...engagement.supportRequests,
          {
            id: newId('irs'),
            system: input.system,
            description: input.description.trim(),
            externalRef: null,
            status: 'REQUESTED',
            requestedAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        updatedAt: timestamp,
      });
    },

    async updateSupport(id, requestId, input) {
      const engagement = findEngagement(id);
      const request = engagement.supportRequests.find((item) => item.id === requestId);
      if (!request) throw new IrRuleError('Support request not found.', 404);
      const blockers = supportUpdateBlockers(request, input, engagement.supportRequests);
      if (blockers.length) throw new IrRuleError(blockers.join(' '), 422);
      const timestamp = nowIso();
      return saveEngagement({
        ...engagement,
        supportRequests: engagement.supportRequests.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: input.status,
                externalRef: trimOrNull(input.externalRef) ?? item.externalRef,
                updatedAt: timestamp,
              }
            : item,
        ),
        updatedAt: timestamp,
      });
    },

    async listCorrespondence() {
      return ok(correspondence);
    },

    async createCorrespondence(input) {
      const error = firstError(correspondenceErrors(input));
      if (error) throw new IrRuleError(error, 422);
      if (input.engagementId) findEngagement(input.engagementId);
      const timestamp = nowIso();
      const item: IrCorrespondence = {
        ...normaliseCorrespondenceInput(input),
        id: newId('irc'),
        reference: nextReference(
          'COR',
          year(),
          correspondence.map((entry) => entry.reference),
        ),
        receivedAt: input.direction === 'INBOUND' ? input.receivedAt : null,
        sentAt: null,
        status: input.direction === 'INBOUND' ? 'RECEIVED' : 'DRAFT',
        templateVersion: templateVersionFor(input.templateId, input.language, null),
        dispatchRef: null,
        approvedVersion: null,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      correspondence = [item, ...correspondence];
      return ok(item);
    },

    async updateCorrespondence(id, input) {
      const item = findCorrespondence(id);
      if (item.status === 'CLOSED') throw new IrRuleError('A closed item cannot be edited.');
      if (input.direction !== item.direction) {
        throw new IrRuleError('The direction of a registered item cannot change.', 422);
      }
      const error = firstError(correspondenceErrors(input));
      if (error) throw new IrRuleError(error, 422);
      if (input.engagementId) findEngagement(input.engagementId);
      const normalised = normaliseCorrespondenceInput(input);
      const changed = isContentChange(item, normalised);
      if (changed && !contentEditable(item)) {
        throw new IrRuleError(
          `The letter text cannot change while the item is ${item.status.toLowerCase().replaceAll('_', ' ')}.`,
        );
      }
      return saveCorrespondence({
        ...item,
        ...normalised,
        templateVersion: templateVersionFor(normalised.templateId, normalised.language, item),
        // Approval is for a specific version: changing the text invalidates it.
        version: changed ? item.version + 1 : item.version,
        status: changed && item.status === 'APPROVED' ? 'DRAFT' : item.status,
        updatedAt: nowIso(),
      });
    },

    async transitionCorrespondence(id, input) {
      const item = findCorrespondence(id);
      const blockers = correspondenceTransitionBlockers(item, input.status, input.comment ?? '');
      if (blockers.length) {
        throw new IrRuleError(blockers.join(' '), input.status === 'IN_REVIEW' ? 422 : 409);
      }
      const timestamp = nowIso();
      const next: IrCorrespondence = { ...item, status: input.status, updatedAt: timestamp };
      if (input.status === 'APPROVED') next.approvedVersion = item.version;
      if (input.status === 'DISPATCHED') {
        next.sentAt = timestamp;
        dispatchCount += 1;
        next.dispatchRef = `S074-MSG-${year()}-${String(9_000 + dispatchCount).padStart(5, '0')}`;
      }
      return saveCorrespondence(next);
    },

    async listTemplates() {
      return ok(templates);
    },

    async createTemplate(input) {
      validateTemplate(input);
      const clash = templates.find(
        (item) =>
          item.active &&
          item.language === input.language &&
          item.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
      );
      if (clash) {
        throw new IrRuleError(
          `An active "${clash.name}" template already exists in ${clash.language}. Save a new version of it instead.`,
        );
      }
      const template: IrLetterTemplate = {
        id: newId('irl'),
        name: input.name.trim(),
        language: input.language,
        subject: input.subject.trim(),
        body: input.body,
        version: 1,
        active: true,
        updatedAt: nowIso(),
      };
      templates = [...templates, template];
      return ok(template);
    },

    async updateTemplate(id, input) {
      validateTemplate(input);
      const current = templates.find((item) => item.id === id);
      if (!current) throw new IrRuleError('Template not found.', 404);
      if (!current.active) throw new IrRuleError('Only the active version of a template can be revised.');
      if (
        current.language !== input.language ||
        current.name.trim().toLowerCase() !== input.name.trim().toLowerCase()
      ) {
        throw new IrRuleError(
          'A new version keeps the template name and language. Create a new template instead.',
          422,
        );
      }
      const next: IrLetterTemplate = {
        id: newId('irl'),
        name: current.name,
        language: current.language,
        subject: input.subject.trim(),
        body: input.body,
        version: current.version + 1,
        active: true,
        updatedAt: nowIso(),
      };
      templates = [...templates.map((item) => (item.id === id ? { ...item, active: false } : item)), next];
      return ok(next);
    },

    async listGifts() {
      return ok(gifts);
    },

    async createGift(input) {
      const normalised = {
        direction: input.direction,
        engagementId: input.engagementId || null,
        giftDate: input.giftDate,
        valueKnown: input.valueKnown,
        giver: input.giver.trim(),
        recipient: input.recipient.trim(),
        description: input.description.trim(),
        currency: input.valueKnown ? (input.currency?.trim().toUpperCase() ?? null) : null,
        value: input.valueKnown ? input.value : null,
      };
      const error = firstError(giftErrors({ ...normalised, value: input.value }));
      if (error) throw new IrRuleError(error, 422);
      if (input.engagementId) findEngagement(input.engagementId);
      const status = initialFlagStatus(input.direction);
      const gift: IrGift = {
        ...normalised,
        id: newId('irg'),
        s011Status: status,
        s011Ref: null,
        // The first attempt goes out through the outbox; mock S011 is "down",
        // so it stays pending until an operator retries.
        flagAttempts: status === 'PENDING' ? 1 : 0,
        createdAt: nowIso(),
      };
      gifts = [gift, ...gifts];
      return ok(gift);
    },

    async retryGiftFlag(id) {
      const gift = gifts.find((item) => item.id === id);
      if (!gift) throw new IrRuleError('Gift not found.', 404);
      const blocker = flagRetryBlocker(gift.s011Status);
      if (blocker) throw new IrRuleError(blocker);
      // Idempotent: the flag reference is minted once per gift and reused.
      let ref = s011Flags.get(gift.id);
      if (!ref) {
        ref = `S011-GF-${year()}-${String(800 + s011Flags.size).padStart(5, '0')}`;
        s011Flags.set(gift.id, ref);
      }
      const next: IrGift = {
        ...gift,
        s011Status: 'ACKNOWLEDGED',
        s011Ref: ref,
        flagAttempts: gift.flagAttempts + 1,
      };
      gifts = gifts.map((item) => (item.id === id ? next : item));
      return ok(next);
    },

    s011FlagCount() {
      return s011Flags.size;
    },
  };
}

/** Picks only the contract's input fields, as the backend's schema would. */
function normaliseEngagementInput(input: IrEngagementInput): IrEngagementInput {
  return {
    type: input.type,
    direction: input.direction,
    title: input.title.trim(),
    purpose: (input.purpose ?? '').trim(),
    partnerStakeholderId: trimOrNull(input.partnerStakeholderId),
    partnerName: (input.partnerName ?? '').trim(),
    owner: input.owner.trim(),
    host: (input.host ?? '').trim(),
    venue: (input.venue ?? '').trim(),
    startAt: input.startAt ?? '',
    endAt: input.endAt ?? '',
    timeZone: input.timeZone ?? '',
    classification: input.classification ?? 'INTERNAL',
    agendaRef: trimOrNull(input.agendaRef),
    briefingPackRef: trimOrNull(input.briefingPackRef),
    minutesRef: trimOrNull(input.minutesRef),
  };
}

function normaliseCorrespondenceInput(input: IrCorrespondenceInput): IrCorrespondenceInput {
  return {
    direction: input.direction,
    engagementId: input.engagementId || null,
    sender: input.sender.trim(),
    recipient: input.recipient.trim(),
    subject: input.subject.trim(),
    classification: input.classification,
    language: input.language,
    owner: input.owner.trim(),
    receivedAt: trimOrNull(input.receivedAt),
    responseDeadline: trimOrNull(input.responseDeadline),
    body: input.body ?? '',
    templateId: input.templateId || null,
    translationRef: trimOrNull(input.translationRef),
    documentRef: trimOrNull(input.documentRef),
  };
}

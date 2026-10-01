import { describe, expect, it } from 'vitest';

import type { IrEngagementInput } from '@partner-crm/types';

import { findClashes, renderTemplate } from '../domain';
import { createMemoryInternationalRepository } from './memoryRepository';
import { buildSeed } from './seed';

const NOW = new Date('2026-09-26T09:00:00.000Z');

function setup(actor = 'Akosua Mensah') {
  let current = actor;
  const repo = createMemoryInternationalRepository({ now: () => NOW, actor: () => current });
  return { repo, as: (name: string) => (current = name) };
}

const visitInput: IrEngagementInput = {
  type: 'VIP_VISIT',
  direction: 'INBOUND',
  title: 'Visit by the Gambia Law School',
  purpose: '',
  partnerStakeholderId: 'stk-040',
  partnerName: 'Gambia Law School',
  owner: 'Akosua Mensah',
  host: 'Director-General, CLET',
  venue: 'Makola campus',
  startAt: '',
  endAt: '',
  timeZone: 'Africa/Accra',
  classification: 'INTERNAL',
  agendaRef: null,
  briefingPackRef: null,
  minutesRef: null,
};

describe('seed data', () => {
  it('covers the scenarios the screens need', () => {
    const seed = buildSeed(NOW);
    expect(seed.engagements.length).toBeGreaterThanOrEqual(6);
    expect(seed.correspondence.map((item) => item.language)).toEqual(expect.arrayContaining(['EN', 'FR', 'AR']));
    expect(seed.templates.filter((item) => item.active).map((item) => item.language).sort()).toEqual(['AR', 'EN', 'FR']);
    expect(seed.gifts.some((gift) => gift.s011Status === 'FAILED')).toBe(true);
    expect(findClashes(seed.engagements).length).toBeGreaterThan(0);
  });
});

describe('T083-01 visit with delegation and a conflicting host booking', () => {
  it('blocks submission without purpose, shows the clash and keeps IDs distinct', async () => {
    const { repo } = setup();
    const created = (await repo.createEngagement(visitInput)).data;
    expect(created.reference).toBe('CLET/IR/2026/008');
    expect(created.status).toBe('DRAFT');

    // Delegation with S081 contact and S084 travel references.
    const withMember = (
      await repo.addDelegate(created.id, {
        name: 'Hon. Awa Jallow',
        contactRef: 'con-090',
        role: 'Head of delegation',
        organisation: 'Gambia Law School',
        nationality: 'Gambian',
        travelRequestRef: 'S084-TR-2026-0500',
      })
    ).data;
    expect(withMember.delegation[0]).toMatchObject({ contactRef: 'con-090', travelRequestRef: 'S084-TR-2026-0500' });

    // Missing purpose blocks submission.
    await expect(repo.transitionEngagement(created.id, { status: 'SUBMITTED', comment: '' })).rejects.toThrow(/purpose/);

    // Book the same host at the same time as the seeded ECOWAS visit.
    const ecowas = (await repo.listEngagements()).data.find((item) => item.id === 'ire-001')!;
    const updated = (
      await repo.updateEngagement(created.id, {
        ...visitInput,
        purpose: 'Peer exchange on bar examinations',
        startAt: ecowas.startAt,
        endAt: ecowas.endAt,
      })
    ).data;
    expect(updated.version).toBe(2);
    const clashes = findClashes((await repo.listEngagements()).data).filter(
      (clash) => clash.first.id === created.id || clash.second.id === created.id,
    );
    expect(clashes.some((clash) => clash.sharedHost)).toBe(true);
    // Clashes are displayed, not blocked.
    expect((await repo.transitionEngagement(created.id, { status: 'SUBMITTED', comment: '' })).data.status).toBe('SUBMITTED');

    // S078 event and S084 travel handoffs keep their own external IDs.
    await repo.requestSupport(created.id, { system: 'S084', description: 'Visas' });
    const both = (await repo.requestSupport(created.id, { system: 'S078', description: 'Reception' })).data;
    const [travel, event] = both.supportRequests;
    expect(travel!.status).toBe('REQUESTED');
    await repo.updateSupport(created.id, travel!.id, { status: 'ACKNOWLEDGED', externalRef: 'S084-TR-2026-0500' });
    await expect(
      repo.updateSupport(created.id, event!.id, { status: 'ACKNOWLEDGED', externalRef: 'S084-TR-2026-0500' }),
    ).rejects.toThrow(/own external ID/);
    const final = (
      await repo.updateSupport(created.id, event!.id, { status: 'ACKNOWLEDGED', externalRef: 'S078-EV-2026-0301' })
    ).data;
    expect(final.partnerStakeholderId).toBe('stk-040');
    expect(new Set([final.partnerStakeholderId, ...final.supportRequests.map((item) => item.externalRef)]).size).toBe(3);
  });

  it('enforces four-eyes approval and returns with a comment', async () => {
    const { repo, as } = setup('Yaw Darko');
    await expect(repo.transitionEngagement('ire-002', { status: 'APPROVED', comment: '' })).rejects.toThrow(/Four-eyes/);
    as('Nana Yaw Boateng');
    await expect(repo.transitionEngagement('ire-002', { status: 'RETURNED', comment: ' ' })).rejects.toThrow(/comment/);
    const returned = (await repo.transitionEngagement('ire-002', { status: 'RETURNED', comment: 'Add agenda' })).data;
    expect(returned.approvals.at(-1)).toMatchObject({ decision: 'RETURNED', actor: 'Nana Yaw Boateng', comment: 'Add agenda' });
  });

  it('blocks scheduling on open mandatory tasks and invalidates approval on a material edit', async () => {
    const { repo } = setup();
    await expect(repo.transitionEngagement('ire-001', { status: 'SCHEDULED', comment: '' })).rejects.toThrow(/mandatory protocol task/);
    await expect(repo.updateProtocolTask('ire-001', 'irt-002', { status: 'DONE' })).rejects.toThrow(/evidence/);
    await repo.updateProtocolTask('ire-001', 'irt-002', { status: 'DONE', evidenceRef: 'S003-DOC-1' });
    await repo.updateProtocolTask('ire-001', 'irt-003', { status: 'EXCEPTION', exceptionReason: 'ECOWAS brings interpreters' });
    const scheduled = (await repo.transitionEngagement('ire-001', { status: 'SCHEDULED', comment: '' })).data;
    expect(scheduled.status).toBe('SCHEDULED');

    const current = (await repo.getEngagement('ire-001')).data;
    const moved = (await repo.updateEngagement('ire-001', { ...current, venue: 'Boardroom B', finalReportRef: undefined } as IrEngagementInput)).data;
    expect(moved.status).toBe('SUBMITTED');
    expect(moved.approvals.at(-1)?.decision).toBe('SUBMITTED');

    const tasked = (await repo.addProtocolTask('ire-001', { title: 'Flags', mandatory: true, assignee: 'K', dueDate: null, evidenceRef: null })).data;
    expect(tasked.checklistVersion).toBe(current.checklistVersion + 1);
  });
});

describe('T083-02 Arabic letter returned and revised', () => {
  it('retains the template version and never dispatches unapproved text', async () => {
    const { repo } = setup('Efua Asante');
    const template = (await repo.listTemplates()).data.find((item) => item.language === 'AR' && item.active)!;
    const values = { recipient: 'سفير جمهورية مصر العربية', sender: 'مجلس التعليم والتدريب القانوني', date: '٢٦ سبتمبر ٢٠٢٦', subject: 'منح تدريبية', engagement: 'زيارة المجاملة' };
    const draft = (
      await repo.createCorrespondence({
        direction: 'OUTBOUND', engagementId: null, sender: values.sender, recipient: values.recipient,
        subject: renderTemplate(template.subject, values), classification: 'INTERNAL', language: 'AR',
        owner: 'Efua Asante', receivedAt: null, responseDeadline: null,
        body: renderTemplate(template.body, values), templateId: template.id, translationRef: 'TRN-MAN-1', documentRef: null,
      })
    ).data;
    expect(draft).toMatchObject({ status: 'DRAFT', templateVersion: template.version, version: 1 });

    // A template in another language is rejected.
    const english = (await repo.listTemplates()).data.find((item) => item.language === 'EN' && item.active)!;
    await expect(repo.updateCorrespondence(draft.id, { ...draft, templateId: english.id })).rejects.toThrow(/Choose a template/);

    await repo.transitionCorrespondence(draft.id, { status: 'IN_REVIEW', comment: '' });
    await expect(repo.transitionCorrespondence(draft.id, { status: 'RETURNED', comment: '' })).rejects.toThrow();
    await repo.transitionCorrespondence(draft.id, { status: 'RETURNED', comment: 'Use the full title' });

    const revised = (await repo.updateCorrespondence(draft.id, { ...draft, body: `${draft.body}\nمع خالص التحية` })).data;
    expect(revised.version).toBe(2);
    expect(revised.templateVersion).toBe(template.version);

    // A new template version does not change the letter's recorded version.
    await repo.updateTemplate(template.id, { name: template.name, language: 'AR', subject: template.subject, body: `${template.body}\n` });

    await repo.transitionCorrespondence(draft.id, { status: 'IN_REVIEW', comment: '' });
    const approved = (await repo.transitionCorrespondence(draft.id, { status: 'APPROVED', comment: '' })).data;
    expect(approved.approvedVersion).toBe(2);

    // Material revision after approval invalidates it.
    const edited = (await repo.updateCorrespondence(draft.id, { ...approved, subject: 'تعديل' })).data;
    expect(edited).toMatchObject({ status: 'DRAFT', version: 3, approvedVersion: 2, templateVersion: template.version });
    await expect(repo.transitionCorrespondence(draft.id, { status: 'DISPATCHED', comment: '' })).rejects.toThrow();

    await repo.transitionCorrespondence(draft.id, { status: 'IN_REVIEW', comment: '' });
    await repo.transitionCorrespondence(draft.id, { status: 'APPROVED', comment: '' });
    const sent = (await repo.transitionCorrespondence(draft.id, { status: 'DISPATCHED', comment: '' })).data;
    expect(sent.approvedVersion).toBe(sent.version);
    expect(sent.dispatchRef).toMatch(/^S074-MSG-/);
    expect(sent.sentAt).toBe(NOW.toISOString());
    await expect(repo.updateCorrespondence(draft.id, { ...sent, body: 'x' })).rejects.toThrow(/cannot change/);
  });

  it('versions templates and keeps one active per name and language', async () => {
    const { repo } = setup();
    await expect(
      repo.createTemplate({ name: 'visit confirmation', language: 'FR', subject: 's', body: 'b' }),
    ).rejects.toThrow(/already exists/);
    const created = (await repo.createTemplate({ name: 'Visit confirmation', language: 'EN', subject: 's', body: 'b' }).catch(() => null));
    expect(created).toBeNull();
    const next = (await repo.updateTemplate('irl-002', { name: 'Visit confirmation', language: 'EN', subject: 'S', body: 'B' })).data;
    expect(next.version).toBe(3);
    const all = (await repo.listTemplates()).data.filter((item) => item.language === 'EN' && item.name === 'Visit confirmation');
    expect(all.filter((item) => item.active)).toHaveLength(1);
    await expect(repo.updateTemplate('irl-002', { name: 'Visit confirmation', language: 'EN', subject: 'S', body: 'B' })).rejects.toThrow(/active version/);
  });

  it('registers inbound letters as received', async () => {
    const { repo } = setup();
    const base = {
      direction: 'INBOUND' as const, engagementId: null, sender: 'Embassy of France', recipient: 'DG',
      subject: 'Invitation', classification: 'PUBLIC' as const, language: 'FR' as const, owner: 'Yaw Darko',
      receivedAt: null, responseDeadline: null, body: '', templateId: null, translationRef: null, documentRef: 'S003-1',
    };
    await expect(repo.createCorrespondence(base)).rejects.toThrow(/date received/);
    const item = (await repo.createCorrespondence({ ...base, receivedAt: NOW.toISOString() })).data;
    expect(item).toMatchObject({ status: 'RECEIVED', reference: 'CLET/COR/2026/009' });
  });
});

describe('T083-03 gift during an S011 outage, then closure', () => {
  it('creates one S011 flag after retry and blocks closure on an open mandatory follow-up', async () => {
    const { repo } = setup();
    const gift = (
      await repo.createGift({
        direction: 'RECEIVED', engagementId: 'ire-005', giver: 'Kenya School of Law', recipient: 'Registrar, CLET',
        description: 'Commemorative gavel', giftDate: '2026-09-14', valueKnown: false, value: null, currency: null,
      })
    ).data;
    expect(gift).toMatchObject({ s011Status: 'PENDING', flagAttempts: 1, s011Ref: null });

    const before = repo.s011FlagCount();
    const acknowledged = (await repo.retryGiftFlag(gift.id)).data;
    expect(acknowledged).toMatchObject({ s011Status: 'ACKNOWLEDGED', flagAttempts: 2 });
    await expect(repo.retryGiftFlag(gift.id)).rejects.toThrow(/already acknowledged/);
    expect(repo.s011FlagCount()).toBe(before + 1);

    const given = (
      await repo.createGift({
        direction: 'GIVEN', engagementId: 'ire-005', giver: 'CLET', recipient: 'KSL', description: 'Kente',
        giftDate: '2026-09-14', valueKnown: true, value: 850, currency: 'ghs',
      })
    ).data;
    expect(given).toMatchObject({ s011Status: 'NOT_REQUIRED', currency: 'GHS' });
    await expect(repo.retryGiftFlag(given.id)).rejects.toThrow(/Only received/);

    // Closure: minutes missing and a mandatory follow-up still open.
    await expect(repo.transitionEngagement('ire-005', { status: 'CLOSED', comment: '' })).rejects.toThrow(/minutes/);
    const engagement = (await repo.getEngagement('ire-005')).data;
    await repo.updateEngagement('ire-005', { ...engagement, minutesRef: 'S003-DOC-2026-12001' });
    await expect(repo.transitionEngagement('ire-005', { status: 'CLOSED', comment: '' })).rejects.toThrow(/mandatory follow-up/);
    await repo.updateFollowUp('ire-005', 'irf-030', { status: 'DONE' });
    await expect(repo.updateFollowUp('ire-005', 'irf-031', { status: 'EXCEPTION' })).rejects.toThrow(/reason/);
    await repo.updateFollowUp('ire-005', 'irf-031', { status: 'EXCEPTION', exceptionReason: 'MOU deferred by the Director-General' });
    const closed = (await repo.transitionEngagement('ire-005', { status: 'CLOSED', comment: '' })).data;
    expect(closed.status).toBe('CLOSED');
    await expect(repo.addFollowUp('ire-005', { title: 'x', owner: 'y', dueDate: '2026-10-01', mandatory: false })).rejects.toThrow();

    const reopened = (await repo.transitionEngagement('ire-005', { status: 'IN_PROGRESS', comment: 'Report correction' })).data;
    expect(reopened.approvals.at(-1)?.decision).toBe('REOPENED');
  });

  it('retries a failed flag once and reuses the same reference', async () => {
    const { repo } = setup();
    const retried = (await repo.retryGiftFlag('irg-001')).data;
    expect(retried).toMatchObject({ s011Status: 'ACKNOWLEDGED', flagAttempts: 3 });
    expect(retried.s011Ref).toMatch(/^S011-GF-2026-/);
  });
});

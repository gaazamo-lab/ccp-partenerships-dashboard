import { describe, expect, it } from 'vitest';

import type { KolInput } from '@partner-crm/types';

import { createMemoryKolRepository } from './memoryRepository';
import { seedContent, seedEngagements, seedMentions, seedProfiles } from './seedData';

const repo = () =>
  createMemoryKolRepository({
    stakeholderExists: (id) => ['stk-001', 'stk-003', 'stk-004', 'stk-006'].includes(id),
    currentUser: () => 'Test Officer',
    now: () => new Date('2026-09-26T10:00:00Z'),
  });

const input = (overrides: Partial<KolInput> = {}): KolInput => ({
  fullName: 'Ama Kyerewaa Boakye',
  honorific: 'Dr.',
  category: 'ACADEMIC',
  organisation: 'GIMPA Law School',
  position: 'Lecturer',
  stakeholderId: null,
  alumniRef: null,
  email: 'ama.boakye@gimpa.edu.gh',
  phone: '',
  expertise: ['Tax law', ' tax law '],
  influenceAreas: [],
  influenceLevel: 'EMERGING',
  availability: 'AVAILABLE',
  relationshipOwner: 'Akosua Mensah',
  status: 'PROSPECT',
  riskLevel: 'NONE',
  riskNotes: '',
  bio: '',
  ...overrides,
});

describe('seed data', () => {
  it('links to real S081 seed stakeholders and covers every content stage', () => {
    const linked = seedProfiles.filter((item) => item.stakeholderId);
    expect(linked.length).toBeGreaterThan(3);
    expect(new Set(seedContent.map((item) => item.stage)).size).toBe(7);
    expect(seedMentions.length).toBeGreaterThanOrEqual(15);
    expect(seedEngagements.some((item) => item.stage === 'COMPLETED' && item.participation)).toBe(true);
    const ids = new Set(seedProfiles.map((item) => item.id));
    for (const row of [...seedEngagements, ...seedContent, ...seedMentions]) {
      expect(ids.has(row.kolId)).toBe(true);
    }
  });
});

describe('memory KOL repository', () => {
  it('creates a profile with normalised tags and rejects duplicate emails', async () => {
    const repository = repo();
    const created = await repository.create(input());
    expect(created.data.expertise).toEqual(['Tax law']);
    await expect(repository.create(input({ email: 'AMA.BOAKYE@gimpa.edu.gh' }))).rejects.toThrow(
      /already uses/,
    );
  });

  it('rejects missing risk notes and unknown stakeholders', async () => {
    const repository = repo();
    await expect(repository.create(input({ riskLevel: 'HIGH' }))).rejects.toThrow(/Risk notes/);
    await expect(repository.create(input({ stakeholderId: 'stk-404' }))).rejects.toThrow(/S081/);
    await expect(repository.create(input({ stakeholderId: 'stk-001' }))).resolves.toBeTruthy();
  });

  it('filters the list', async () => {
    const repository = repo();
    const { data } = await repository.list({ category: 'ACADEMIC' });
    expect(data.every((item) => item.category === 'ACADEMIC')).toBe(true);
    const bySearch = await repository.list({ search: 'arbitration' });
    expect(bySearch.data.map((item) => item.id)).toContain('kol-001');
  });

  it('refuses engagements for archived KOLs', async () => {
    const repository = repo();
    await expect(
      repository.createEngagement('kol-011', {
        type: 'PANEL',
        title: 'Panel',
        scheduledFor: null,
        owner: 'Yaw Darko',
        externalRef: null,
        notes: '',
      }),
    ).rejects.toThrow(/archived/);
  });

  it('runs an engagement through its stages and completes it via participation', async () => {
    const repository = repo();
    const { data: created } = await repository.createEngagement('kol-009', {
      type: 'CONSULTATION',
      title: 'Needs assessment',
      scheduledFor: '2026-10-30',
      owner: 'Esi Quaye',
      externalRef: null,
      notes: '',
    });
    expect(created.stage).toBe('PLANNED');
    await expect(
      repository.recordParticipation(created.id, {
        attended: true,
        outputs: '',
        feedback: '',
        contributionScore: 4,
      }),
    ).rejects.toThrow(/completed engagement/);
    await expect(
      repository.moveEngagement(created.id, { stage: 'CONFIRMED', note: '' }),
    ).rejects.toThrow(/cannot move/);
    await repository.moveEngagement(created.id, { stage: 'INVITED', note: 'Letter sent' });
    await repository.moveEngagement(created.id, { stage: 'CONFIRMED', note: '' });
    const { data: completed } = await repository.recordParticipation(created.id, {
      attended: true,
      outputs: 'Report',
      feedback: 'Useful',
      contributionScore: 4,
    });
    expect(completed.stage).toBe('COMPLETED');
    expect(completed.participation?.recordedBy).toBe('Test Officer');
    expect(completed.notes).toContain('invited: Letter sent');
    await expect(
      repository.moveEngagement(created.id, { stage: 'CANCELLED', note: '' }),
    ).rejects.toThrow(/closed/);
  });

  it('enforces content requirements and sets publishedAt', async () => {
    const repository = repo();
    const { data: content } = await repository.createContent('kol-007', {
      title: 'Alumni story',
      contentType: 'BLOG_POST',
      dueDate: null,
    });
    await expect(
      repository.moveContent(content.id, { stage: 'DRAFT_SUBMITTED' }),
    ).rejects.toThrow(/S003/);
    await repository.moveContent(content.id, { stage: 'DRAFT_SUBMITTED', draftRef: 'S003-1' });
    await repository.moveContent(content.id, { stage: 'IN_REVIEW' });
    await expect(
      repository.moveContent(content.id, { stage: 'CHANGES_REQUESTED' }),
    ).rejects.toThrow(/change/);
    await repository.moveContent(content.id, { stage: 'APPROVED' });
    const { data: published } = await repository.moveContent(content.id, {
      stage: 'PUBLISHED',
      publishedUrl: 'https://clet.edu.gh/insights/alumni-story',
      cmsRef: 'S076-CMS-9001',
    });
    expect(published.publishedAt).toBe('2026-09-26T10:00:00.000Z');
    expect(published.reviewer).toBe('Test Officer');
    await expect(repository.moveContent(content.id, { stage: 'WITHDRAWN' })).rejects.toThrow(
      /closed/,
    );
  });

  it('adds manual mentions and validates the content link', async () => {
    const repository = repo();
    const base = {
      contentId: null,
      outlet: 'Citi FM',
      headline: 'Interview',
      url: '',
      publishedAt: '2026-09-20',
      reach: 12_000,
      sentiment: 'POSITIVE' as const,
    };
    const { data } = await repository.addMention('kol-001', base);
    expect(data.source).toBe('MANUAL');
    await expect(repository.addMention('kol-001', { ...base, reach: -5 })).rejects.toThrow(/Reach/);
    await expect(
      repository.addMention('kol-001', { ...base, contentId: 'kcnt-002' }),
    ).rejects.toThrow(/does not belong/);
  });
});

import { describe, expect, it } from 'vitest';

import type {
  KolContent,
  KolEngagement,
  KolInput,
  KolMediaMention,
  KolParticipation,
} from '@partner-crm/types';

import {
  contentStepValue,
  engagementCreationError,
  engagementTransitionError,
  impactScore,
  impactSummary,
  isEmailTaken,
  kolImpact,
  meanContributionScore,
  mentionsWithin,
  normaliseTags,
  participationError,
  totalReach,
  validateContentMove,
  validateEngagementInput,
  validateKolInput,
  validateMentionInput,
} from './domain';

const kolInput = (overrides: Partial<KolInput> = {}): KolInput => ({
  fullName: 'Efua Asante-Darko',
  honorific: 'Mrs.',
  category: 'SENIOR_ADVOCATE',
  organisation: 'Asante-Darko & Partners',
  position: 'Managing Partner',
  stakeholderId: null,
  alumniRef: null,
  email: 'efua@example.com',
  phone: '',
  expertise: [],
  influenceAreas: [],
  influenceLevel: 'NATIONAL',
  availability: 'AVAILABLE',
  relationshipOwner: 'Akosua Mensah',
  status: 'ACTIVE',
  riskLevel: 'NONE',
  riskNotes: '',
  bio: '',
  ...overrides,
});

const participation = (score: KolParticipation['contributionScore']): KolParticipation => ({
  attended: true,
  outputs: '',
  feedback: '',
  contributionScore: score,
  recordedAt: '2026-06-01T00:00:00Z',
  recordedBy: 'Akosua Mensah',
});

const engagement = (overrides: Partial<KolEngagement> = {}): KolEngagement => ({
  id: 'eng-1',
  kolId: 'kol-1',
  type: 'PANEL',
  title: 'Panel',
  stage: 'PLANNED',
  scheduledFor: null,
  owner: 'Akosua Mensah',
  externalRef: null,
  notes: '',
  participation: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const content = (overrides: Partial<KolContent> = {}): KolContent => ({
  id: 'cnt-1',
  kolId: 'kol-1',
  title: 'Op-ed',
  contentType: 'OP_ED',
  stage: 'COMMISSIONED',
  dueDate: null,
  draftRef: null,
  reviewer: null,
  reviewNotes: '',
  cmsRef: null,
  publishedUrl: null,
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const mention = (overrides: Partial<KolMediaMention> = {}): KolMediaMention => ({
  id: 'men-1',
  kolId: 'kol-1',
  contentId: null,
  outlet: 'Daily Graphic',
  headline: 'Headline',
  url: '',
  publishedAt: '2026-09-01T00:00:00Z',
  reach: 1000,
  sentiment: 'POSITIVE',
  source: 'S085',
  ...overrides,
});

describe('engagement stage machine', () => {
  it('allows the happy path and the documented side exits', () => {
    expect(engagementTransitionError('PLANNED', 'INVITED')).toBeNull();
    expect(engagementTransitionError('INVITED', 'CONFIRMED')).toBeNull();
    expect(engagementTransitionError('CONFIRMED', 'COMPLETED')).toBeNull();
    expect(engagementTransitionError('INVITED', 'DECLINED')).toBeNull();
    expect(engagementTransitionError('PLANNED', 'CANCELLED')).toBeNull();
    expect(engagementTransitionError('INVITED', 'CANCELLED')).toBeNull();
    expect(engagementTransitionError('CONFIRMED', 'CANCELLED')).toBeNull();
  });

  it('rejects skipped stages, decline outside INVITED, and moves out of terminal stages', () => {
    expect(engagementTransitionError('PLANNED', 'CONFIRMED')).toMatch(/cannot move/);
    expect(engagementTransitionError('PLANNED', 'DECLINED')).toMatch(/cannot move/);
    expect(engagementTransitionError('CONFIRMED', 'DECLINED')).toMatch(/cannot move/);
    expect(engagementTransitionError('COMPLETED', 'CANCELLED')).toMatch(/closed/);
    expect(engagementTransitionError('DECLINED', 'INVITED')).toMatch(/closed/);
    expect(engagementTransitionError('CANCELLED', 'PLANNED')).toMatch(/closed/);
    expect(engagementTransitionError('INVITED', 'INVITED')).toMatch(/already/);
  });

  it('records participation only on confirmed or completed engagements with a 1–5 score', () => {
    const input = { attended: true, outputs: '', feedback: '', contributionScore: 4 as const };
    expect(participationError({ stage: 'COMPLETED' }, input)).toBeNull();
    expect(participationError({ stage: 'CONFIRMED' }, input)).toBeNull();
    expect(participationError({ stage: 'INVITED' }, input)).toMatch(/completed engagement/);
    expect(participationError({ stage: 'CANCELLED' }, input)).toMatch(/completed engagement/);
    expect(
      participationError({ stage: 'COMPLETED' }, { ...input, contributionScore: 7 as never }),
    ).toMatch(/1 to 5/);
  });

  it('rejects engagements for archived KOLs', () => {
    expect(engagementCreationError({ status: 'ARCHIVED', fullName: 'X' })).toMatch(/archived/);
    expect(engagementCreationError({ status: 'DORMANT', fullName: 'X' })).toBeNull();
  });

  it('validates engagement input', () => {
    expect(
      validateEngagementInput({
        type: 'PANEL',
        title: ' ',
        owner: '',
        scheduledFor: 'not a date',
        externalRef: null,
        notes: '',
      }),
    ).toEqual({
      title: expect.any(String),
      owner: expect.any(String),
      scheduledFor: expect.any(String),
    });
  });
});

describe('content stage machine', () => {
  it('requires a draft reference to submit or resubmit', () => {
    expect(validateContentMove(content(), { stage: 'DRAFT_SUBMITTED' })).toHaveProperty('draftRef');
    expect(
      validateContentMove(content(), { stage: 'DRAFT_SUBMITTED', draftRef: 'S003-DOC-1' }),
    ).toEqual({});
    expect(
      validateContentMove(content({ stage: 'CHANGES_REQUESTED' }), {
        stage: 'DRAFT_SUBMITTED',
        draftRef: 'S003-DOC-2',
      }),
    ).toEqual({});
  });

  it('requires review notes to request changes', () => {
    const inReview = content({ stage: 'IN_REVIEW' });
    expect(validateContentMove(inReview, { stage: 'CHANGES_REQUESTED' })).toHaveProperty(
      'reviewNotes',
    );
    expect(
      validateContentMove(inReview, { stage: 'CHANGES_REQUESTED', reviewNotes: 'Tighten intro' }),
    ).toEqual({});
    expect(validateContentMove(inReview, { stage: 'APPROVED' })).toEqual({});
  });

  it('requires a valid published URL to publish', () => {
    const approved = content({ stage: 'APPROVED' });
    expect(validateContentMove(approved, { stage: 'PUBLISHED' })).toHaveProperty('publishedUrl');
    expect(
      validateContentMove(approved, { stage: 'PUBLISHED', publishedUrl: 'clet.edu.gh' }),
    ).toHaveProperty('publishedUrl');
    expect(
      validateContentMove(approved, {
        stage: 'PUBLISHED',
        publishedUrl: 'https://clet.edu.gh/insights/x',
      }),
    ).toEqual({});
  });

  it('allows withdrawal from any open stage but nothing out of a terminal one', () => {
    for (const stage of ['COMMISSIONED', 'DRAFT_SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'] as const) {
      expect(validateContentMove(content({ stage }), { stage: 'WITHDRAWN' })).toEqual({});
    }
    expect(validateContentMove(content({ stage: 'PUBLISHED' }), { stage: 'WITHDRAWN' })).toHaveProperty('stage');
    expect(validateContentMove(content({ stage: 'WITHDRAWN' }), { stage: 'DRAFT_SUBMITTED', draftRef: 'x' })).toHaveProperty('stage');
  });

  it('rejects skipping review', () => {
    expect(
      validateContentMove(content({ stage: 'DRAFT_SUBMITTED' }), {
        stage: 'PUBLISHED',
        publishedUrl: 'https://x.org',
      }),
    ).toHaveProperty('stage');
    expect(validateContentMove(content(), { stage: 'APPROVED' })).toHaveProperty('stage');
  });

  it('maps stages onto the stepper', () => {
    expect(contentStepValue('COMMISSIONED')).toBe(1);
    expect(contentStepValue('CHANGES_REQUESTED')).toBe(contentStepValue('IN_REVIEW'));
    expect(contentStepValue('PUBLISHED')).toBe(6);
    expect(contentStepValue('WITHDRAWN')).toBe(0);
  });
});

describe('profile validation', () => {
  it('requires name, category and owner', () => {
    const errors = validateKolInput(kolInput({ fullName: ' ', relationshipOwner: '' }), {
      profiles: [],
    });
    expect(errors).toHaveProperty('fullName');
    expect(errors).toHaveProperty('relationshipOwner');
    expect(validateKolInput(kolInput(), { profiles: [] })).toEqual({});
  });

  it('requires risk notes for MEDIUM and HIGH risk only', () => {
    expect(validateKolInput(kolInput({ riskLevel: 'MEDIUM' }), { profiles: [] })).toHaveProperty(
      'riskNotes',
    );
    expect(validateKolInput(kolInput({ riskLevel: 'HIGH' }), { profiles: [] })).toHaveProperty(
      'riskNotes',
    );
    expect(validateKolInput(kolInput({ riskLevel: 'LOW' }), { profiles: [] })).toEqual({});
    expect(
      validateKolInput(kolInput({ riskLevel: 'HIGH', riskNotes: 'Brief carefully' }), {
        profiles: [],
      }),
    ).toEqual({});
  });

  it('checks email format and case-insensitive uniqueness', () => {
    const profiles = [{ id: 'kol-9', email: 'EFUA@example.com' }];
    expect(validateKolInput(kolInput({ email: 'not-an-email' }), { profiles })).toHaveProperty(
      'email',
    );
    expect(validateKolInput(kolInput(), { profiles }).email).toMatch(/already uses/);
    expect(validateKolInput(kolInput(), { profiles, excludeId: 'kol-9' })).toEqual({});
    expect(validateKolInput(kolInput({ email: '' }), { profiles })).toEqual({});
    expect(isEmailTaken(' efua@EXAMPLE.com ', profiles)).toBe(true);
    expect(isEmailTaken('', profiles)).toBe(false);
  });

  it('rejects an unknown S081 stakeholder link', () => {
    const context = { profiles: [], stakeholderExists: (id: string) => id === 'stk-001' };
    expect(validateKolInput(kolInput({ stakeholderId: 'stk-001' }), context)).toEqual({});
    expect(validateKolInput(kolInput({ stakeholderId: 'stk-999' }), context)).toHaveProperty(
      'stakeholderId',
    );
  });

  it('normalises tags', () => {
    expect(normaliseTags([' Arbitration ', 'arbitration', '', 'Legal  ethics'])).toEqual([
      'Arbitration',
      'Legal ethics',
    ]);
  });
});

describe('media mentions', () => {
  it('requires outlet, headline, date and non-negative whole reach', () => {
    const base = {
      contentId: null,
      outlet: 'JoyNews',
      headline: 'Headline',
      url: '',
      publishedAt: '2026-09-01',
      reach: 0,
      sentiment: 'NEUTRAL' as const,
    };
    expect(validateMentionInput(base)).toEqual({});
    expect(validateMentionInput({ ...base, reach: -1 })).toHaveProperty('reach');
    expect(validateMentionInput({ ...base, reach: 1.5 })).toHaveProperty('reach');
    expect(validateMentionInput({ ...base, outlet: '', url: 'bad' })).toEqual({
      outlet: expect.any(String),
      url: expect.any(String),
    });
  });
});

describe('impact calculations', () => {
  const now = Date.parse('2026-09-26T12:00:00Z');
  const engagements = [
    engagement({ id: 'e1', stage: 'COMPLETED', participation: participation(5) }),
    engagement({ id: 'e2', stage: 'COMPLETED', participation: participation(4) }),
    engagement({ id: 'e3', stage: 'COMPLETED' }),
    engagement({ id: 'e4', stage: 'INVITED' }),
    engagement({ id: 'e5', kolId: 'kol-2', stage: 'COMPLETED', participation: participation(1) }),
  ];
  const contentItems = [
    content({ id: 'c1', stage: 'PUBLISHED' }),
    content({ id: 'c2', stage: 'IN_REVIEW' }),
    content({ id: 'c3', kolId: 'kol-2', stage: 'PUBLISHED' }),
  ];
  const mentions = [
    mention({ id: 'm1', reach: 120_000, publishedAt: '2026-09-20T00:00:00Z' }),
    mention({ id: 'm2', reach: 30_000, publishedAt: '2026-05-01T00:00:00Z', sentiment: 'NEGATIVE' }),
    mention({ id: 'm3', kolId: 'kol-2', reach: 5_000, publishedAt: '2026-08-01T00:00:00Z' }),
  ];

  it('totals reach and filters the recent window', () => {
    expect(totalReach(mentions)).toBe(155_000);
    expect(mentionsWithin(mentions, 90, now).map((item) => item.id)).toEqual(['m1', 'm3']);
  });

  it('averages recorded contribution scores', () => {
    expect(meanContributionScore(engagements.slice(0, 3))).toBe(4.5);
    expect(meanContributionScore([engagement()])).toBeNull();
  });

  it('computes per-KOL impact', () => {
    const impact = kolImpact('kol-1', { engagements, content: contentItems, mentions });
    expect(impact).toMatchObject({
      reach: 150_000,
      completed: 3,
      published: 1,
      meanScore: 4.5,
      mentionCount: 2,
      negativeMentions: 1,
    });
    // 40*0.3 + 25*0.75 + 20/3 + 15*0.9 = 12 + 18.75 + 6.67 + 13.5
    expect(impact.score).toBe(51);
  });

  it('bounds the impact score between 0 and 100', () => {
    expect(impactScore({ reach: 0, completed: 0, published: 0, meanScore: null })).toBe(0);
    expect(impactScore({ reach: 5_000_000, completed: 20, published: 10, meanScore: 5 })).toBe(100);
  });

  it('summarises the portfolio', () => {
    expect(impactSummary({ engagements, content: contentItems, mentions }, now)).toEqual({
      reach: 155_000,
      recentReach: 125_000,
      mentionCount: 3,
      completed: 4,
      openEngagements: 1,
      published: 2,
      meanScore: 3.3,
    });
  });
});

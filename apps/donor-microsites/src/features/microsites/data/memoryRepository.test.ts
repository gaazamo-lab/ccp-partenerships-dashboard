import { describe, expect, it } from 'vitest';

import { ApiError } from '@partner-crm/api-client';

import { createMemoryMicrositesRepository } from './memoryRepository';

function repo(actor = 'Officer') {
  let who = actor;
  const repository = createMemoryMicrositesRepository({ actor: () => who });
  return { repository, as: (name: string) => (who = name) };
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the call to be rejected.');
}

describe('memory microsites repository', () => {
  it('seeds templates and sites covering every lifecycle stage', async () => {
    const { repository } = repo();
    const templates = (await repository.listTemplates()).data;
    expect(new Set(templates.map((template) => template.purpose)).size).toBe(5);
    const statuses = (await repository.list()).data.map((site) => site.status);
    expect(statuses).toEqual(expect.arrayContaining(['PUBLISHED', 'IN_REVIEW', 'DRAFT', 'ARCHIVED']));
  });

  it('creates a draft seeded from the template and rejects duplicate slugs', async () => {
    const { repository } = repo();
    const input = {
      title: 'Alumni Giving Day',
      slug: 'alumni-giving-day',
      tagline: '',
      purpose: 'CAMPAIGN' as const,
      templateId: 'tpl-campaign',
      owner: 'Officer',
    };
    const site = (await repository.create(input)).data;
    expect(site).toMatchObject({ status: 'DRAFT', version: 1, access: 'PUBLIC' });
    expect(site.blocks.map((block) => block.type)).toEqual(['HERO', 'RICH_TEXT', 'METRICS', 'STORY', 'CALL_TO_ACTION']);

    const error = await rejection(repository.create(input));
    expect(error.status).toBe(422);
    expect((error.body as { fieldErrors: Record<string, string> }).fieldErrors.slug).toMatch(/already/);
  });

  it('runs the full workflow with four-eyes approval', async () => {
    const { repository, as } = repo('Officer');
    const id = 'ms-kumasi-library';

    const submitted = (await repository.review(id, { decision: 'SUBMITTED', comment: '' })).data;
    expect(submitted.status).toBe('IN_REVIEW');

    const selfApproval = await rejection(repository.review(id, { decision: 'APPROVED', comment: '' }));
    expect(selfApproval.status).toBe(409);

    const editWhileInReview = await rejection(
      repository.update(id, { title: 'x', slug: submitted.slug, tagline: '', accentColor: '', blocks: submitted.blocks }),
    );
    expect(editWhileInReview.status).toBe(409);

    as('Kofi Boateng');
    const approved = (await repository.review(id, { decision: 'APPROVED', comment: 'Good' })).data;
    expect(approved.status).toBe('APPROVED');

    const published = (await repository.publish(id)).data;
    expect(published).toMatchObject({ status: 'PUBLISHED', publishedVersion: approved.version });
    expect(published.publishedAt).not.toBeNull();

    const unpublished = (await repository.unpublish(id)).data;
    expect(unpublished.status).toBe('APPROVED');

    const edited = (
      await repository.update(id, {
        title: 'Build the Kumasi Law Library',
        slug: unpublished.slug,
        tagline: 'Updated',
        accentColor: '#B45309',
        blocks: unpublished.blocks,
      })
    ).data;
    expect(edited).toMatchObject({ status: 'DRAFT', version: unpublished.version + 1 });

    const history = (await repository.listReviews(id)).data;
    expect(history.map((review) => review.decision)).toEqual(['APPROVED', 'SUBMITTED']);
  });

  it('lets a different person approve the seeded site in review', async () => {
    const { repository } = repo('Officer');
    const site = (await repository.review('ms-a2j-lectures', { decision: 'APPROVED', comment: '' })).data;
    expect(site.status).toBe('APPROVED');
  });

  it('requires a comment to request changes', async () => {
    const { repository } = repo('Officer');
    const error = await rejection(repository.review('ms-a2j-lectures', { decision: 'CHANGES_REQUESTED', comment: '' }));
    expect(error.status).toBe(409);
  });

  it('refuses to publish a site that is not approved', async () => {
    const { repository } = repo();
    const error = await rejection(repository.publish('ms-kumasi-library'));
    expect(error.status).toBe(409);
  });

  it('archives with an S003 reference only, and archived is terminal', async () => {
    const { repository } = repo();
    expect((await rejection(repository.archive('ms-kumasi-library', { archiveRef: ' ' }))).status).toBe(422);
    const archived = (await repository.archive('ms-kumasi-library', { archiveRef: 'S003/ARC/2026/0500' })).data;
    expect(archived).toMatchObject({ status: 'ARCHIVED', archiveRef: 'S003/ARC/2026/0500' });
    expect((await rejection(repository.archive('ms-kumasi-library', { archiveRef: 'S003/X' }))).status).toBe(409);
    expect((await rejection(repository.setAccess('ms-kumasi-library', { access: 'PUBLIC', audienceStakeholderIds: [] }))).status).toBe(409);
  });

  it('validates access settings', async () => {
    const { repository } = repo();
    const id = 'ms-kumasi-library';
    expect((await rejection(repository.setAccess(id, { access: 'PASSWORD', accessCode: 'short', audienceStakeholderIds: [] }))).status).toBe(422);
    expect((await rejection(repository.setAccess(id, { access: 'NAMED_AUDIENCE', audienceStakeholderIds: [] }))).status).toBe(422);
    const site = (await repository.setAccess(id, { access: 'PASSWORD', accessCode: 'campaign-2026', audienceStakeholderIds: ['stk-9'] })).data;
    expect(site.access).toBe('PASSWORD');
    expect(site.audienceStakeholderIds).toEqual([]);
    expect(JSON.stringify(site)).not.toContain('campaign-2026');
    expect(repository.hasAccessCode(id)).toBe(true);
  });

  describe('public viewer', () => {
    it('lists only published public sites', async () => {
      const { repository } = repo();
      const slugs = (await repository.listPublic()).data.map((site) => site.slug);
      expect(slugs).toEqual(['2026-annual-report']);
    });

    it('returns 404 for unpublished or unknown slugs', async () => {
      const { repository } = repo();
      expect((await rejection(repository.getPublic('build-the-kumasi-law-library'))).status).toBe(404);
      expect((await rejection(repository.getPublic('nope'))).status).toBe(404);
    });

    it('locks password sites until unlocked, without exposing the code', async () => {
      const { repository } = repo();
      const slug = 'scholarship-fund-impact-2026';
      const locked = await rejection(repository.getPublic(slug));
      expect(locked.status).toBe(401);
      expect((locked.body as { code: string }).code).toBe('MICROSITE_LOCKED');
      expect(JSON.stringify(locked.body)).not.toContain('donor-2026');

      expect((await rejection(repository.unlock(slug, { accessCode: 'wrong-code' }))).status).toBe(401);
      const unlocked = (await repository.unlock(slug, { accessCode: 'donor-2026' })).data;
      expect(JSON.stringify(unlocked)).not.toContain('donor-2026');
      expect((await repository.getPublic(slug)).data.slug).toBe(slug);
    });

    it('rate-limits repeated wrong codes', async () => {
      const repository = createMemoryMicrositesRepository({ maxUnlockAttempts: 2 });
      const slug = 'scholarship-fund-impact-2026';
      await rejection(repository.unlock(slug, { accessCode: 'a' }));
      await rejection(repository.unlock(slug, { accessCode: 'b' }));
      expect((await rejection(repository.unlock(slug, { accessCode: 'donor-2026' }))).status).toBe(429);
    });

    it('records views and unique visitors', async () => {
      const { repository } = repo();
      const before = (await repository.get('ms-annual-2026')).data.analytics;
      await repository.recordView('2026-annual-report');
      await repository.recordView('2026-annual-report');
      const after = (await repository.get('ms-annual-2026')).data.analytics;
      expect(after.views).toBe(before.views + 2);
      expect(after.uniqueVisitors).toBe(before.uniqueVisitors + 1);
      expect(after.lastViewedAt).not.toBeNull();
    });
  });

  it('returns copies, so callers cannot mutate the store', async () => {
    const { repository } = repo();
    const site = (await repository.get('ms-annual-2026')).data;
    site.title = 'Changed';
    expect((await repository.get('ms-annual-2026')).data.title).toBe('2026 Annual Report');
  });
});

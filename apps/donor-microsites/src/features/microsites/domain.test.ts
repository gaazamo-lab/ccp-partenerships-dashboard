import { describe, expect, it } from 'vitest';

import type { Microsite, MicrositeBlock, MicrositeReview } from '@partner-crm/types';

import {
  BLOCK_TYPES,
  accentOf,
  allocationShares,
  archiveBlockers,
  canTransition,
  createBlock,
  editBlocker,
  formatDuration,
  formatMoney,
  isEditable,
  isImageUrl,
  moveBlock,
  parseStakeholderIds,
  publishBlockers,
  publishChecks,
  reviewBlockers,
  safeHref,
  seedBlocks,
  slugError,
  slugify,
  statusAfterEdit,
  statusAfterReview,
  submitterOf,
  unpublishBlocker,
  validateAccess,
  validateBlocks,
  validateCreate,
  validateUpdate,
} from './domain';

const scriptUrl = ['javascript', 'alert(1)'].join(':');

const site = (overrides: Partial<Microsite> = {}): Pick<
  Microsite,
  'id' | 'version' | 'status' | 'blocks' | 'access' | 'audienceStakeholderIds'
> => ({
  id: 'ms-1',
  version: 2,
  status: 'DRAFT',
  blocks: [createBlock('HERO', 'b1')],
  access: 'PUBLIC',
  audienceStakeholderIds: [],
  ...overrides,
});

const submission = (actor: string, version = 2): MicrositeReview => ({
  id: `r-${actor}-${version}`,
  micrositeId: 'ms-1',
  version,
  decision: 'SUBMITTED',
  comment: '',
  actor,
  occurredAt: '2026-09-20T10:00:00.000Z',
});

describe('status machine', () => {
  it('allows only the documented transitions', () => {
    expect(canTransition('DRAFT', 'IN_REVIEW')).toBe(true);
    expect(canTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'PUBLISHED')).toBe(true);
    expect(canTransition('PUBLISHED', 'APPROVED')).toBe(true);
    expect(canTransition('DRAFT', 'PUBLISHED')).toBe(false);
    expect(canTransition('ARCHIVED', 'DRAFT')).toBe(false);
  });

  it('edits only DRAFT, CHANGES_REQUESTED and APPROVED', () => {
    expect(isEditable('DRAFT')).toBe(true);
    expect(isEditable('CHANGES_REQUESTED')).toBe(true);
    expect(isEditable('APPROVED')).toBe(true);
    expect(isEditable('IN_REVIEW')).toBe(false);
    expect(isEditable('PUBLISHED')).toBe(false);
    expect(isEditable('ARCHIVED')).toBe(false);
    expect(editBlocker('PUBLISHED')).toMatch(/Unpublish/);
    expect(editBlocker('DRAFT')).toBeNull();
  });

  it('sends an approved or sent-back site to draft on edit', () => {
    expect(statusAfterEdit('APPROVED')).toBe('DRAFT');
    expect(statusAfterEdit('CHANGES_REQUESTED')).toBe('DRAFT');
    expect(statusAfterEdit('DRAFT')).toBe('DRAFT');
  });

  it('maps review decisions to statuses', () => {
    expect(statusAfterReview('SUBMITTED')).toBe('IN_REVIEW');
    expect(statusAfterReview('APPROVED')).toBe('APPROVED');
    expect(statusAfterReview('CHANGES_REQUESTED')).toBe('CHANGES_REQUESTED');
  });
});

describe('slugs', () => {
  it('slugifies titles', () => {
    expect(slugify('2026 Annual Report')).toBe('2026-annual-report');
    expect(slugify('  Côte d’Ivoire — Donors!! ')).toBe('cote-d-ivoire-donors');
    expect(slugify('a'.repeat(80))).toHaveLength(60);
    expect(slugify(`${'a'.repeat(59)} b`)).toBe('a'.repeat(59));
  });

  it('validates charset and length', () => {
    expect(slugError('ok-slug-1')).toBeNull();
    expect(slugError('ab')).toMatch(/3–60/);
    expect(slugError('a'.repeat(61))).toMatch(/3–60/);
    expect(slugError('Has Caps')).toMatch(/lowercase/);
    expect(slugError('')).toMatch(/required/);
  });

  it('rejects a duplicate slug on create and update, but not the site itself', () => {
    const existing = [{ id: 'ms-1', slug: 'taken' }];
    const templates = [{ id: 'tpl' }];
    const input = { title: 'T', slug: 'taken', tagline: '', purpose: 'CAMPAIGN' as const, templateId: 'tpl', owner: 'A' };
    expect(validateCreate(input, existing, templates).slug).toMatch(/already/);
    expect(validateCreate({ ...input, slug: 'free', templateId: 'x' }, existing, templates).templateId).toBeDefined();
    const update = { title: 'T', slug: 'taken', tagline: '', accentColor: '', blocks: [] };
    expect(validateUpdate('ms-1', update, existing)).toEqual({});
    expect(validateUpdate('ms-2', update, existing).slug).toMatch(/already/);
    expect(validateUpdate('ms-1', { ...update, title: ' ', accentColor: 'red' }, existing)).toMatchObject({
      title: expect.any(String),
      accentColor: expect.any(String),
    });
  });
});

describe('blocks', () => {
  it('creates a default block for every type', () => {
    for (const type of BLOCK_TYPES) {
      const block = createBlock(type, `id-${type}`);
      expect(block).toMatchObject({ id: `id-${type}`, type, currency: 'GHS', assetRefs: [], metrics: [] });
    }
  });

  it('seeds one empty block per template entry, in order', () => {
    let n = 0;
    const blocks = seedBlocks({ blockTypes: ['HERO', 'METRICS', 'METRICS'] }, () => `b${++n}`);
    expect(blocks.map((block) => [block.id, block.type])).toEqual([
      ['b1', 'HERO'],
      ['b2', 'METRICS'],
      ['b3', 'METRICS'],
    ]);
  });

  it('moves blocks and ignores moves off either end', () => {
    expect(moveBlock(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveBlock(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveBlock(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveBlock(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('requires S225/S150 sources, safe links and a currency code', () => {
    const block: MicrositeBlock = {
      ...createBlock('METRICS', 'm'),
      metrics: [
        { label: 'Students', value: '10', sourceRef: 'S225:intake' },
        { label: 'Grads', value: '5', sourceRef: 'spreadsheet' },
      ],
      links: [{ label: 'Bad', url: scriptUrl }],
      currency: 'cedi',
      type: 'FUND_UTILISATION',
      allocations: [{ label: 'Fees', amount: -1 }],
    };
    const problems = validateBlocks([block]).m ?? [];
    expect(problems.some((p) => p.startsWith('Metric 2'))).toBe(true);
    expect(problems.some((p) => p.startsWith('Metric 1'))).toBe(false);
    expect(problems.some((p) => p.startsWith('Link 1'))).toBe(true);
    expect(problems.some((p) => p.includes('Currency'))).toBe(true);
    expect(problems.some((p) => p.startsWith('Allocation 1'))).toBe(true);
    expect(validateBlocks([createBlock('HERO', 'h')])).toEqual({});
  });

  it('only renders safe hrefs', () => {
    expect(safeHref('https://clet.gov.gh/a.pdf')).toBe('https://clet.gov.gh/a.pdf');
    expect(safeHref('mailto:giving@clet.gov.gh')).toBe('mailto:giving@clet.gov.gh');
    expect(safeHref('/sites/x')).toBe('/sites/x');
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref(scriptUrl)).toBeNull();
  });
});

describe('access', () => {
  it('requires a code of at least 8 characters when switching to PASSWORD', () => {
    const current = { access: 'PUBLIC' as const, hasStoredCode: false };
    expect(validateAccess({ access: 'PASSWORD', audienceStakeholderIds: [] }, current).accessCode).toBeDefined();
    expect(validateAccess({ access: 'PASSWORD', accessCode: 'short', audienceStakeholderIds: [] }, current).accessCode).toMatch(/8/);
    expect(validateAccess({ access: 'PASSWORD', accessCode: 'donor-2026', audienceStakeholderIds: [] }, current)).toEqual({});
  });

  it('keeps an existing code when none is supplied', () => {
    expect(
      validateAccess({ access: 'PASSWORD', audienceStakeholderIds: [] }, { access: 'PASSWORD', hasStoredCode: true }),
    ).toEqual({});
  });

  it('needs at least one stakeholder for a named audience', () => {
    const current = { access: 'PUBLIC' as const, hasStoredCode: false };
    expect(validateAccess({ access: 'NAMED_AUDIENCE', audienceStakeholderIds: [' '] }, current).audienceStakeholderIds).toBeDefined();
    expect(validateAccess({ access: 'NAMED_AUDIENCE', audienceStakeholderIds: ['stk-001'] }, current)).toEqual({});
    expect(validateAccess({ access: 'PUBLIC', audienceStakeholderIds: [] }, current)).toEqual({});
  });

  it('parses and de-duplicates stakeholder IDs', () => {
    expect(parseStakeholderIds('stk-001, stk-002\nSTK-001  stk-003')).toEqual(['stk-001', 'stk-002', 'stk-003']);
  });
});

describe('four-eyes review', () => {
  it('blocks the submitter of the current version from approving it', () => {
    const inReview = site({ status: 'IN_REVIEW' });
    const history = [submission('Akosua Mensah')];
    expect(submitterOf(inReview, history)).toBe('Akosua Mensah');
    expect(reviewBlockers(inReview, { decision: 'APPROVED', comment: '' }, 'akosua mensah', history)).toHaveLength(1);
    expect(reviewBlockers(inReview, { decision: 'APPROVED', comment: '' }, 'Kofi Boateng', history)).toEqual([]);
  });

  it('ignores submissions of earlier versions', () => {
    const inReview = site({ status: 'IN_REVIEW', version: 3 });
    expect(submitterOf(inReview, [submission('Akosua Mensah', 2)])).toBeNull();
  });

  it('requires a comment to request changes', () => {
    const inReview = site({ status: 'IN_REVIEW' });
    expect(reviewBlockers(inReview, { decision: 'CHANGES_REQUESTED', comment: ' ' }, 'Kofi', [])).toHaveLength(1);
    expect(reviewBlockers(inReview, { decision: 'CHANGES_REQUESTED', comment: 'Fix figures' }, 'Kofi', [])).toEqual([]);
  });

  it('submits only drafts, and decides only sites in review', () => {
    expect(reviewBlockers(site({ status: 'DRAFT' }), { decision: 'SUBMITTED', comment: '' }, 'A', [])).toEqual([]);
    expect(reviewBlockers(site({ status: 'CHANGES_REQUESTED' }), { decision: 'SUBMITTED', comment: '' }, 'A', [])).toHaveLength(1);
    expect(reviewBlockers(site({ status: 'DRAFT' }), { decision: 'APPROVED', comment: '' }, 'A', [])).toHaveLength(1);
  });
});

describe('publish, unpublish and archive', () => {
  it('requires approval, at least one block and valid access', () => {
    expect(publishBlockers(site({ status: 'APPROVED' }), false)).toEqual([]);
    expect(publishBlockers(site({ status: 'DRAFT' }), false)).toHaveLength(1);
    expect(publishBlockers(site({ status: 'APPROVED', blocks: [] }), false)).toHaveLength(1);
    expect(publishBlockers(site({ status: 'APPROVED', access: 'PASSWORD' }), false)).toHaveLength(1);
    expect(publishBlockers(site({ status: 'APPROVED', access: 'PASSWORD' }), true)).toEqual([]);
    expect(publishBlockers(site({ status: 'APPROVED', access: 'NAMED_AUDIENCE' }), false)).toHaveLength(1);
    expect(publishChecks(site({ status: 'APPROVED' }), false).every((check) => check.passed)).toBe(true);
  });

  it('unpublishes only published sites', () => {
    expect(unpublishBlocker('PUBLISHED')).toBeNull();
    expect(unpublishBlocker('APPROVED')).not.toBeNull();
  });

  it('archives any non-archived site with an S003 reference', () => {
    expect(archiveBlockers('PUBLISHED', 'S003/ARC/2026/1')).toEqual([]);
    expect(archiveBlockers('DRAFT', '')).toHaveLength(1);
    expect(archiveBlockers('ARCHIVED', 'S003/ARC/2026/1')).toHaveLength(1);
  });
});

describe('presentation helpers', () => {
  it('computes allocation shares', () => {
    const { total, rows } = allocationShares({
      allocations: [
        { label: 'A', amount: 750 },
        { label: 'B', amount: 250 },
      ],
    });
    expect(total).toBe(1000);
    expect(rows.map((row) => row.percent)).toEqual([75, 25]);
    expect(allocationShares({ allocations: [{ label: 'A', amount: 0 }] }).rows[0]?.percent).toBe(0);
  });

  it('formats money, durations and accents', () => {
    expect(formatMoney(4_200_000, 'GHS')).toMatch(/GHS\s?4,200,000/);
    expect(formatMoney(10, '??')).toBe('?? 10');
    expect(formatDuration(184)).toBe('3m 04s');
    expect(formatDuration(42)).toBe('42s');
    expect(accentOf({ accentColor: '#0F766E' })).toBe('#0F766E');
    expect(accentOf({ accentColor: 'url(x)' })).toBe('var(--clet-primary)');
    expect(isImageUrl('https://cdn.example/a.jpg')).toBe(true);
    expect(isImageUrl('S080-AST-1')).toBe(false);
  });
});

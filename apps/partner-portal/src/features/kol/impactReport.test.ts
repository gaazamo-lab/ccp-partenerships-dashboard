import { describe, expect, it } from 'vitest';

import { seedContent, seedEngagements, seedMentions, seedProfiles } from './data/seedData';
import { categoryMix, engagementTypeBreakdown, impactRows } from './impactReport';

const data = { engagements: seedEngagements, content: seedContent, mentions: seedMentions };

describe('impact report', () => {
  it('builds one row per KOL with bounded scores', () => {
    const rows = impactRows(seedProfiles, data);
    expect(rows).toHaveLength(seedProfiles.length);
    expect(rows.every((row) => row.score >= 0 && row.score <= 100)).toBe(true);
    const total = rows.reduce((sum, row) => sum + row.reach, 0);
    expect(total).toBe(seedMentions.reduce((sum, item) => sum + item.reach, 0));
  });

  it('groups every KOL into exactly one category band', () => {
    const mix = categoryMix(seedProfiles);
    expect(mix.reduce((sum, slice) => sum + slice.count, 0)).toBe(seedProfiles.length);
    expect(mix.every((slice) => slice.health >= 0 && slice.health <= 100)).toBe(true);
  });

  it('breaks engagements down by type', () => {
    const rows = engagementTypeBreakdown(data);
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(seedEngagements.length);
    expect(rows.every((row) => row.completed + row.open <= row.total)).toBe(true);
  });
});

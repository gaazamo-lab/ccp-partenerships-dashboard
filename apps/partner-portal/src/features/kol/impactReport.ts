import type { KolCategory, KolEngagementType, KolProfile } from '@partner-crm/types';

import {
  CATEGORY_LABELS,
  displayName,
  ENGAGEMENT_TYPES,
  type KolDataset,
  type KolImpact,
  kolImpact,
  meanContributionScore,
} from '@/features/kol/domain';
import type { PortfolioSlice } from '@partner-crm/ui';

export interface KolImpactRow extends KolImpact {
  name: string;
  category: string;
  owner: string;
  profile: KolProfile;
}

export function impactRows(profiles: readonly KolProfile[], data: KolDataset): KolImpactRow[] {
  return profiles.map((profile) => ({
    ...kolImpact(profile.id, data),
    name: displayName(profile),
    category: CATEGORY_LABELS[profile.category],
    owner: profile.relationshipOwner,
    profile,
  }));
}

/**
 * Category bands for the donut. Eight categories would need eight colours;
 * grouping by the audience they speak to keeps it to the validated six.
 */
const BANDS: Array<{ label: string; categories: KolCategory[]; color: string }> = [
  { label: 'Bar & practice', categories: ['SENIOR_ADVOCATE', 'PRACTITIONER'], color: '#2a78d6' },
  { label: 'Bench', categories: ['JUDGE', 'RETIRED_JUDGE'], color: '#eb6834' },
  { label: 'Academia', categories: ['ACADEMIC'], color: '#1baf7a' },
  { label: 'Policy', categories: ['POLICY_INFLUENCER'], color: '#eda100' },
  { label: 'Media', categories: ['MEDIA_PERSONALITY'], color: '#e87ba4' },
  { label: 'Alumni', categories: ['ALUMNUS'], color: '#008300' },
];

/** Category mix; `health` is the share of the band's KOLs that are active. */
export function categoryMix(profiles: readonly KolProfile[]): PortfolioSlice[] {
  return BANDS.map((band) => {
    const members = profiles.filter((item) => band.categories.includes(item.category));
    const active = members.filter((item) => item.status === 'ACTIVE').length;
    return {
      label: band.label,
      count: members.length,
      health: members.length ? Math.round((active / members.length) * 100) : 0,
      color: band.color,
    };
  }).filter((slice) => slice.count > 0);
}

export interface TypeBreakdownRow {
  type: KolEngagementType;
  total: number;
  completed: number;
  open: number;
  meanScore: number | null;
}

export function engagementTypeBreakdown(data: Pick<KolDataset, 'engagements'>): TypeBreakdownRow[] {
  return ENGAGEMENT_TYPES.map((type) => {
    const rows = data.engagements.filter((item) => item.type === type);
    return {
      type,
      total: rows.length,
      completed: rows.filter((item) => item.stage === 'COMPLETED').length,
      open: rows.filter((item) => ['PLANNED', 'INVITED', 'CONFIRMED'].includes(item.stage)).length,
      meanScore: meanContributionScore(rows),
    };
  }).filter((row) => row.total > 0);
}

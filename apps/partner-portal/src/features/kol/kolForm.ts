import type { KolInput, KolProfile } from '@partner-crm/types';

import {
  AVAILABILITY_LEVELS,
  CATEGORY_LABELS,
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  ENGAGEMENT_TYPES,
  ENGAGEMENT_TYPE_LABELS,
  INFLUENCE_LEVELS,
  KOL_CATEGORIES,
  KOL_STATUSES,
  RISK_LEVELS,
  SENTIMENTS,
} from '@/features/kol/domain';
import { type SelectOption, titleCase } from '@/features/shared';

export function emptyKolInput(owner: string): KolInput {
  return {
    fullName: '',
    honorific: '',
    category: 'SENIOR_ADVOCATE',
    organisation: '',
    position: '',
    stakeholderId: null,
    alumniRef: null,
    email: '',
    phone: '',
    expertise: [],
    influenceAreas: [],
    influenceLevel: 'ESTABLISHED',
    availability: 'AVAILABLE',
    relationshipOwner: owner,
    status: 'PROSPECT',
    riskLevel: 'NONE',
    riskNotes: '',
    bio: '',
  };
}

export function toKolInput(profile: KolProfile): KolInput {
  return {
    fullName: profile.fullName,
    honorific: profile.honorific,
    category: profile.category,
    organisation: profile.organisation,
    position: profile.position,
    stakeholderId: profile.stakeholderId,
    alumniRef: profile.alumniRef,
    email: profile.email,
    phone: profile.phone,
    expertise: [...profile.expertise],
    influenceAreas: [...profile.influenceAreas],
    influenceLevel: profile.influenceLevel,
    availability: profile.availability,
    relationshipOwner: profile.relationshipOwner,
    status: profile.status,
    riskLevel: profile.riskLevel,
    riskNotes: profile.riskNotes,
    bio: profile.bio,
  };
}

const titled = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: titleCase(value) }));

export const CATEGORY_OPTIONS: SelectOption[] = KOL_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));
export const STATUS_OPTIONS = titled(KOL_STATUSES);
export const INFLUENCE_OPTIONS = titled(INFLUENCE_LEVELS);
export const AVAILABILITY_OPTIONS = titled(AVAILABILITY_LEVELS);
export const RISK_OPTIONS = titled(RISK_LEVELS);
export const SENTIMENT_OPTIONS = titled(SENTIMENTS);
export const ENGAGEMENT_TYPE_OPTIONS: SelectOption[] = ENGAGEMENT_TYPES.map((value) => ({
  value,
  label: ENGAGEMENT_TYPE_LABELS[value],
}));
export const CONTENT_TYPE_OPTIONS: SelectOption[] = CONTENT_TYPES.map((value) => ({
  value,
  label: CONTENT_TYPE_LABELS[value],
}));

/** `2026-10-14T09:00:00Z` → `2026-10-14` for a date input. */
export function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

/** A date input's `YYYY-MM-DD` → ISO midnight UTC, or `null` when empty. */
export function fromDateInput(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null;
}

export { displayName } from '@/features/kol/domain';

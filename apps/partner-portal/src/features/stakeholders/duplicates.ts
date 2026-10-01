import { detectIndividualRecord } from '@/features/stakeholders/boundary';
import { STAKEHOLDER_CATEGORIES } from '@/features/stakeholders/constants';
import type {
  ContactInput,
  Stakeholder,
  StakeholderCategory,
  StakeholderContact,
  StakeholderImportResult,
  StakeholderInput,
} from '@/features/stakeholders/types';

/** Case, spacing and punctuation-insensitive key for names. */
export function nameKey(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** `https://www.ghanabar.org/` and `ghanabar.org` compare equal. */
export function websiteKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

export function emailKey(value: string): string {
  return value.trim().toLowerCase();
}

export interface StakeholderMatch {
  stakeholder: Stakeholder;
  field: 'name' | 'website';
}

/** SRS-S081-A-04: the existing organisation a new or edited record would duplicate. */
export function findDuplicateStakeholder(
  stakeholders: Stakeholder[],
  input: Pick<StakeholderInput, 'name' | 'website'>,
  exceptId?: string,
): StakeholderMatch | null {
  const name = nameKey(input.name);
  const website = websiteKey(input.website);
  for (const stakeholder of stakeholders) {
    if (stakeholder.id === exceptId) continue;
    if (name && nameKey(stakeholder.name) === name) return { stakeholder, field: 'name' };
    if (website && websiteKey(stakeholder.website) === website) {
      return { stakeholder, field: 'website' };
    }
  }
  return null;
}

export interface ContactMatch {
  contact: StakeholderContact;
  stakeholder: Stakeholder;
  field: 'email' | 'name';
}

/**
 * A contact duplicates another when its email is already on the register
 * (anywhere — one person, one record) or when the same organisation already
 * lists someone with the same name.
 */
export function findDuplicateContact(
  stakeholders: Stakeholder[],
  stakeholderId: string,
  input: Pick<ContactInput, 'name' | 'email'>,
  exceptContactId?: string,
): ContactMatch | null {
  const email = emailKey(input.email);
  const name = nameKey(input.name);
  for (const stakeholder of stakeholders) {
    for (const contact of stakeholder.contacts) {
      if (contact.id === exceptContactId) continue;
      if (email && emailKey(contact.email) === email) return { contact, stakeholder, field: 'email' };
      if (stakeholder.id === stakeholderId && name && nameKey(contact.name) === name) {
        return { contact, stakeholder, field: 'name' };
      }
    }
  }
  return null;
}

export function contactDuplicateMessage(match: ContactMatch): string {
  return match.field === 'email'
    ? `${match.contact.email} already belongs to ${match.contact.name} at ${match.stakeholder.name}.`
    : `${match.stakeholder.name} already has a contact named ${match.contact.name}. Edit that contact instead.`;
}

/** An import row before its category has been checked against the closed list. */
export type StakeholderImportRow = Omit<StakeholderInput, 'category'> & { category: string };

export interface ImportPlan {
  accepted: StakeholderInput[];
  result: StakeholderImportResult;
}

function matchCategory(value: string): StakeholderCategory | null {
  const key = nameKey(value);
  return STAKEHOLDER_CATEGORIES.find((category) => nameKey(category) === key) ?? null;
}

/**
 * Runs every bulk-import row through the same checks as manual entry before
 * anything is committed: required fields, a known category, the A-02 boundary
 * guard, and duplicates against both the register and earlier rows in the
 * same file. `firstRowNumber` is the spreadsheet row of `rows[0]` (row 1 is
 * the header), so the review list points at the line the user will open.
 */
export function planStakeholderImport(
  existing: Stakeholder[],
  rows: StakeholderImportRow[],
  firstRowNumber = 2,
): ImportPlan {
  const accepted: StakeholderInput[] = [];
  const skipped: StakeholderImportResult['skipped'] = [];
  let duplicates = 0;
  const seenNames = new Map<string, number>();
  const seenWebsites = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = firstRowNumber + index;
    const name = row.name.trim();
    const skip = (reason: string) => skipped.push({ row: rowNumber, name: name || '(no name)', reason });

    const missing = (['name', 'owner', 'location'] as const).filter((field) => !row[field].trim());
    if (missing.length > 0) {
      skip(`Missing ${missing.join(', ')}.`);
      return;
    }

    const boundary = detectIndividualRecord(row);
    if (boundary) {
      skip(boundary.message);
      return;
    }

    const category = matchCategory(row.category);
    if (!category) {
      skip(`"${row.category || 'blank'}" is not an S081 stakeholder category.`);
      return;
    }

    const match = findDuplicateStakeholder(existing, row);
    if (match) {
      duplicates += 1;
      skip(`Duplicate of ${match.stakeholder.name} (same ${match.field}).`);
      return;
    }

    const key = nameKey(name);
    const website = websiteKey(row.website);
    const earlier = seenNames.get(key) ?? (website ? seenWebsites.get(website) : undefined);
    if (earlier !== undefined) {
      duplicates += 1;
      skip(`Repeats row ${earlier} in this file.`);
      return;
    }
    seenNames.set(key, rowNumber);
    if (website) seenWebsites.set(website, rowNumber);

    accepted.push({ ...row, name, category });
  });

  return { accepted, result: { created: accepted.length, duplicates, skipped } };
}

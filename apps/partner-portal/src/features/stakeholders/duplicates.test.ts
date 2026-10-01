import { describe, expect, it } from 'vitest';

import {
  type StakeholderImportRow,
  findDuplicateContact,
  findDuplicateStakeholder,
  planStakeholderImport,
} from '@/features/stakeholders/duplicates';
import { makeContact, makeStakeholder } from '@/features/stakeholders/testFixtures';

const register = [
  makeStakeholder({
    contacts: [makeContact({ id: 'con-1', name: 'Ama Owusu', email: 'ama@ghanabar.org' })],
  }),
  makeStakeholder({
    id: 'stk-2',
    name: 'Judicial Service of Ghana',
    website: 'https://www.judicial.gov.gh/',
    contacts: [makeContact({ id: 'con-2', name: 'Kofi Mensah', email: 'kofi@judicial.gov.gh' })],
  }),
];

function row(overrides: Partial<StakeholderImportRow> = {}): StakeholderImportRow {
  return {
    name: 'Ghana Law Reform Commission',
    shortName: '',
    category: 'Government',
    owner: 'Efua Kwarteng',
    location: 'Accra, Ghana',
    website: 'lawreform.gov.gh',
    description: '',
    ...overrides,
  };
}

describe('findDuplicateStakeholder', () => {
  it('matches names regardless of case, spacing and punctuation', () => {
    expect(
      findDuplicateStakeholder(register, { name: '  ghana bar  association. ', website: '' }),
    ).toMatchObject({ stakeholder: { id: 'stk-1' }, field: 'name' });
  });

  it('matches websites regardless of scheme, www and trailing slash', () => {
    expect(
      findDuplicateStakeholder(register, { name: 'JSG', website: 'judicial.gov.gh' }),
    ).toMatchObject({ stakeholder: { id: 'stk-2' }, field: 'website' });
  });

  it('ignores the record being edited and blank websites', () => {
    expect(
      findDuplicateStakeholder(register, { name: 'Ghana Bar Association', website: '' }, 'stk-1'),
    ).toBeNull();
    expect(findDuplicateStakeholder(register, { name: 'New body', website: '' })).toBeNull();
  });
});

describe('findDuplicateContact', () => {
  it('flags an email already used anywhere on the register', () => {
    expect(
      findDuplicateContact(register, 'stk-1', { name: 'Someone Else', email: 'KOFI@judicial.gov.gh' }),
    ).toMatchObject({ field: 'email', stakeholder: { id: 'stk-2' } });
  });

  it('flags the same name within the same organisation only', () => {
    expect(
      findDuplicateContact(register, 'stk-1', { name: 'ama owusu', email: 'new@ghanabar.org' }),
    ).toMatchObject({ field: 'name' });
    expect(
      findDuplicateContact(register, 'stk-2', { name: 'Ama Owusu', email: 'ama2@judicial.gov.gh' }),
    ).toBeNull();
  });

  it('lets a contact keep its own email when edited', () => {
    expect(
      findDuplicateContact(register, 'stk-1', { name: 'Ama Owusu', email: 'ama@ghanabar.org' }, 'con-1'),
    ).toBeNull();
  });
});

describe('planStakeholderImport', () => {
  it('commits clean rows and reports each skipped row with its spreadsheet row number', () => {
    const plan = planStakeholderImport(register, [
      row(),
      row({ name: 'Ghana Bar Association' }),
      row({ name: 'Ghana Law Reform Commission ', website: '' }),
      row({ name: 'Faculty Board', category: 'Alumni' }),
      row({ name: 'Kwame Mensah', website: 'kwame.mensah@gsl.edu.gh' }),
      row({ name: 'Unknown category body', category: 'Charity' }),
      row({ name: 'Nameless', owner: ' ' }),
    ]);

    expect(plan.accepted.map((item) => item.name)).toEqual(['Ghana Law Reform Commission']);
    expect(plan.result.created).toBe(1);
    expect(plan.result.duplicates).toBe(2);
    expect(plan.result.skipped.map((item) => item.row)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(plan.result.skipped[0]!.reason).toMatch(/Duplicate of Ghana Bar Association/);
    expect(plan.result.skipped[1]!.reason).toMatch(/Repeats row 2/);
    expect(plan.result.skipped[2]!.reason).toMatch(/S034/);
    expect(plan.result.skipped[3]!.reason).toMatch(/gsl\.edu\.gh/);
    expect(plan.result.skipped[4]!.reason).toMatch(/not an S081 stakeholder category/);
    expect(plan.result.skipped[5]!.reason).toMatch(/Missing owner/);
  });

  it('normalises category text to the closed list', () => {
    const plan = planStakeholderImport([], [row({ category: 'peer institution' })]);
    expect(plan.accepted[0]!.category).toBe('Peer institution');
  });
});

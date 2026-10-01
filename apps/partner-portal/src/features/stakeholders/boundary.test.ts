import { describe, expect, it } from 'vitest';

import { detectIndividualRecord } from '@/features/stakeholders/boundary';

describe('A-02 boundary guard', () => {
  it.each([
    { name: 'Kwame Mensah', website: 'kmensah@clet.gov.gh', field: 'website' },
    { name: 'Esi Darko', website: 'https://portal.gsl.edu.gh', field: 'website' },
    { name: 'Abena Boateng', website: 'abena@gmail.com', field: 'website' },
    { name: 'Faculty Board', category: 'Students', field: 'category' },
    { name: 'Dr. Yaw Frimpong', field: 'name' },
    { name: 'Student index number 20231', field: 'name' },
    { name: 'Kofi Asare (alumnus)', field: 'name' },
  ])('rejects $name ($field)', ({ field, ...candidate }) => {
    expect(detectIndividualRecord(candidate)).toMatchObject({ field });
  });

  it.each([
    { name: 'Ghana Bar Association', website: 'ghanabar.org', category: 'Professional body' },
    { name: 'National Union of Ghana Students', website: 'nugs.org.gh' },
    { name: 'Ghana Armed Forces Command and Staff College' },
    { name: 'University of Ghana School of Law', website: 'law.ug.edu.gh' },
  ])('accepts $name', (candidate) => {
    expect(detectIndividualRecord(candidate)).toBeNull();
  });

  it('points users to the authoritative systems', () => {
    expect(detectIndividualRecord({ name: 'Mr Kojo Addo' })?.message).toMatch(/S027.*S140.*S034/);
  });
});

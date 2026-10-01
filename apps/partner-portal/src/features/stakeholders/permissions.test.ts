import { describe, expect, it } from 'vitest';

import {
  ALL_STAKEHOLDER_PERMISSIONS,
  canManageStakeholders,
  permissionHint,
} from '@/features/stakeholders/permissions';

describe('S081 permission matrix', () => {
  it.each(['CRM Administrator', 'CCP Partnerships Manager', 'System Administrator'])(
    '%s has every permission',
    (role) => {
      for (const permission of ALL_STAKEHOLDER_PERMISSIONS) {
        expect(canManageStakeholders(role, permission)).toBe(true);
      }
    },
  );

  it('lets a Partnerships Officer run the register but not decide screening', () => {
    const role = 'Partnerships Officer';
    for (const permission of [
      'create',
      'edit',
      'engage',
      'manage_contacts',
      'manage_segments',
      'import',
    ] as const) {
      expect(canManageStakeholders(role, permission)).toBe(true);
    }
    expect(canManageStakeholders(role, 'screen')).toBe(false);
  });

  it('limits an IR Officer to logging engagements', () => {
    const allowed = ALL_STAKEHOLDER_PERMISSIONS.filter((permission) =>
      canManageStakeholders('IR Officer', permission),
    );
    expect(allowed).toEqual(['engage']);
  });

  it.each(['Executive Viewer', 'Auditor'])('%s is read and export only', (role) => {
    const allowed = ALL_STAKEHOLDER_PERMISSIONS.filter((permission) =>
      canManageStakeholders(role, permission),
    );
    expect(allowed).toEqual(['export']);
  });

  it('denies unknown and missing roles', () => {
    expect(canManageStakeholders('Registrar', 'create')).toBe(false);
    expect(canManageStakeholders(undefined, 'export')).toBe(false);
    expect(canManageStakeholders(null, 'engage')).toBe(false);
  });

  it('explains a denial and stays silent when allowed', () => {
    expect(permissionHint('Auditor', 'create')).toMatch(/cannot add/);
    expect(permissionHint('CRM Administrator', 'create')).toBeUndefined();
  });
});

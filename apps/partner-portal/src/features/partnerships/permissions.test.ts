import { describe, expect, it } from 'vitest';

import { type PartnershipPermission, canManagePartnership } from './permissions';

const allPermissions: PartnershipPermission[] = [
  'create',
  'edit',
  'manage_obligations',
  'manage_reviews',
  'manage_lifecycle',
  'import',
  'export',
];

describe('partnership permissions', () => {
  it.each(['CRM Administrator', 'CCP Partnerships Manager'])(
    'grants full management to %s',
    (role) => {
      expect(allPermissions.every((permission) => canManagePartnership(role, permission))).toBe(
        true,
      );
    },
  );

  it('restricts the Registrar to metadata, reviews, lifecycle, and export', () => {
    expect(canManagePartnership('Registrar', 'edit')).toBe(true);
    expect(canManagePartnership('Registrar', 'manage_lifecycle')).toBe(true);
    expect(canManagePartnership('Registrar', 'manage_obligations')).toBe(false);
    expect(canManagePartnership('Registrar', 'import')).toBe(false);
  });

  it.each(['Executive Viewer', 'Auditor'])('makes %s export-only', (role) => {
    expect(canManagePartnership(role, 'export')).toBe(true);
    expect(canManagePartnership(role, 'edit')).toBe(false);
  });

  it('denies unknown and unauthenticated roles', () => {
    expect(canManagePartnership('Unknown role', 'export')).toBe(false);
    expect(canManagePartnership(undefined, 'export')).toBe(false);
  });
});

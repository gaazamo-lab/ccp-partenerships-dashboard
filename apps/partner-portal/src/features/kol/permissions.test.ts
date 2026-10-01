import { describe, expect, it } from 'vitest';

import { canKol } from './permissions';

describe('S092 permissions', () => {
  it.each(['CRM Administrator', 'CCP Partnerships Manager', 'Partnerships Officer', 'System Administrator'])(
    '%s can manage and export',
    (role) => {
      expect(canKol(role, 'manage')).toBe(true);
      expect(canKol(role, 'export')).toBe(true);
    },
  );

  it.each(['Executive Viewer', 'Auditor'])('%s can export but not manage', (role) => {
    expect(canKol(role, 'manage')).toBe(false);
    expect(canKol(role, 'export')).toBe(true);
  });

  it('grants nothing to other or missing roles', () => {
    expect(canKol('Registrar', 'manage')).toBe(false);
    expect(canKol('Registrar', 'export')).toBe(false);
    expect(canKol(undefined, 'manage')).toBe(false);
  });
});
